import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import archiver from 'archiver';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { AuditService } from '../auditoria/audit.service';
import {
  AUDIT_ACTION_BACKUP_VERIFIED,
  BACKUP_META_SOURCE_SCHEDULED,
} from './backup.constants';
import { parseMysqlDatabaseUrl } from './mysql-url.util';

@Injectable()
export class MysqlDumpBackupService {
  private readonly log = new Logger(MysqlDumpBackupService.name);
  private running = false;

  constructor(
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  private storageRootAbs(): string {
    const override = this.config.get<string>('BACKUP_STORAGE_ROOT')?.trim();
    if (override && override.length > 0) {
      return path.resolve(override);
    }
    return path.resolve(process.cwd(), '..', 'storage');
  }

  private outputDirAbs(): string {
    const d = this.config.get<string>('BACKUP_OUTPUT_DIR')?.trim();
    if (d && d.length > 0) {
      return path.resolve(d);
    }
    return path.resolve(process.cwd(), '..', 'backups', 'automated');
  }

  private mysqldumpPath(): string {
    return this.config.get<string>('BACKUP_MYSQLDUMP_PATH')?.trim() ?? '';
  }

  private keepCount(): number {
    const n = Number(this.config.get('BACKUP_KEEP_COUNT') ?? 14);
    if (!Number.isFinite(n) || n < 1) return 14;
    return Math.min(500, Math.floor(n));
  }

  private includeStorageZip(): boolean {
    return (
      this.config.get<string>('BACKUP_INCLUDE_STORAGE_ZIP')?.toLowerCase() ===
      'true'
    );
  }

  /**
   * Ejecuta mysqldump + ZIP opcional de `storage/`, rota archivos viejos y audita un único `BACKUP_VERIFIED` OK/FAIL.
   * Idempotente ante solapamiento: ignora si ya hay una ejecución en curso.
   */
  async runAutomatedBackup(trigger: 'cron' | 'manual' = 'cron'): Promise<{
    ok: boolean;
    skipped?: boolean;
  }> {
    if (this.running) {
      this.log.warn(
        'Respaldo automático omitido: ejecución previa aún en curso.',
      );
      return { ok: false, skipped: true };
    }
    this.running = true;
    const correlationId = randomUUID();
    const dumpExe = this.mysqldumpPath();
    const databaseUrl = this.config.get<string>('DATABASE_URL')?.trim() ?? '';

    if (!dumpExe) {
      this.log.error(
        'BACKUP_MYSQLDUMP_PATH no definido; no se puede ejecutar mysqldump.',
      );
      await this.auditFail(
        correlationId,
        trigger,
        'BACKUP_MYSQLDUMP_PATH no configurado',
      );
      this.running = false;
      return { ok: false };
    }

    let conn: ReturnType<typeof parseMysqlDatabaseUrl>;
    try {
      conn = parseMysqlDatabaseUrl(databaseUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'DATABASE_URL inválido';
      this.log.error(msg);
      await this.auditFail(correlationId, trigger, msg);
      this.running = false;
      return { ok: false };
    }

    const outDir = this.outputDirAbs();
    await fs.promises.mkdir(outDir, { recursive: true });

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const base = `backup-auto-${ts}`;
    const sqlPath = path.join(outDir, `${base}.sql`);
    const zipPath = this.includeStorageZip()
      ? path.join(outDir, `${base}-storage.zip`)
      : null;

    const cnfPath = path.join(
      os.tmpdir(),
      `sgd-mysqldump-${correlationId}.cnf`,
    );
    const cnfBody =
      '[client]\n' +
      `host=${conn.host}\n` +
      `port=${conn.port}\n` +
      `user=${conn.user}\n` +
      `password=${conn.password}\n`;

    try {
      await fs.promises.writeFile(cnfPath, cnfBody, { encoding: 'utf8' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo escribir .cnf';
      await this.auditFail(correlationId, trigger, msg);
      this.running = false;
      return { ok: false };
    }

    try {
      await this.runMysqldumpToFile(dumpExe, cnfPath, conn.database, sqlPath);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'mysqldump falló';
      this.log.error(`mysqldump: ${msg}`);
      await this.auditFail(correlationId, trigger, msg);
      try {
        await fs.promises.unlink(sqlPath);
      } catch {
        /* ignore */
      }
      this.running = false;
      return { ok: false };
    } finally {
      try {
        await fs.promises.unlink(cnfPath);
      } catch {
        /* ignore */
      }
    }

    let zipBytes = 0;
    if (zipPath) {
      const storageRoot = this.storageRootAbs();
      try {
        await this.zipDirectoryToFile(storageRoot, zipPath);
        zipBytes = (await fs.promises.stat(zipPath)).size;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'ZIP storage falló';
        this.log.error(msg);
        try {
          await fs.promises.unlink(sqlPath);
        } catch {
          /* ignore */
        }
        try {
          await fs.promises.unlink(zipPath);
        } catch {
          /* ignore */
        }
        await this.auditFail(correlationId, trigger, msg);
        this.running = false;
        return { ok: false };
      }
    }

    const sqlBytes = (await fs.promises.stat(sqlPath)).size;
    const totalBytes = sqlBytes + zipBytes;

    this.pruneOldFiles(outDir, /^backup-auto-.*\.sql$/);
    if (this.includeStorageZip()) {
      this.pruneOldFiles(outDir, /^backup-auto-.*-storage\.zip$/);
    }

    const tipo = zipPath
      ? 'Automático (MySQL + storage)'
      : 'Automático (MySQL)';
    await this.audit.log({
      action: AUDIT_ACTION_BACKUP_VERIFIED,
      result: 'OK',
      context: {
        actorUserId: null,
        actorEmail: 'system-scheduled-backup',
        correlationId,
      },
      meta: {
        source: BACKUP_META_SOURCE_SCHEDULED,
        trigger,
        tipoRespaldo: tipo,
        tamanoBytes: totalBytes,
        dumpFile: path.basename(sqlPath),
        zipFile: zipPath ? path.basename(zipPath) : undefined,
        notes: `sql_bytes=${sqlBytes}${zipPath ? `;zip_bytes=${zipBytes}` : ''}`,
      },
    });

    this.log.log(
      `Respaldo automático OK (${tipo}, ${totalBytes} bytes, trigger=${trigger}).`,
    );
    this.running = false;
    return { ok: true };
  }

  private async auditFail(
    correlationId: string,
    trigger: string,
    message: string,
  ): Promise<void> {
    const safe = message.slice(0, 500);
    await this.audit.log({
      action: AUDIT_ACTION_BACKUP_VERIFIED,
      result: 'FAIL',
      context: {
        actorUserId: null,
        actorEmail: 'system-scheduled-backup',
        correlationId,
      },
      meta: {
        source: BACKUP_META_SOURCE_SCHEDULED,
        trigger,
        notes: safe,
      },
    });
  }

  private async runMysqldumpToFile(
    dumpExe: string,
    cnfPath: string,
    database: string,
    outFile: string,
  ): Promise<void> {
    const args = [
      `--defaults-extra-file=${cnfPath}`,
      '--single-transaction',
      '--routines',
      '--events',
      '--default-character-set=utf8mb4',
      database,
    ];

    const ws = fs.createWriteStream(outFile);
    await new Promise<void>((resolve, reject) => {
      const child = spawn(dumpExe, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
      let stderr = '';
      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
        if (stderr.length > 8000) {
          stderr = stderr.slice(-4000);
        }
      });
      child.on('error', reject);
      const stdout = child.stdout;
      if (!stdout) {
        reject(new Error('mysqldump sin stdout'));
        return;
      }

      const closeP = new Promise<void>((res, rej) => {
        child.once('close', (code) => {
          if (code === 0) res();
          else
            rej(
              new Error(
                stderr.trim().slice(0, 500) ||
                  `mysqldump salió con código ${code}`,
              ),
            );
        });
      });

      pipeline(stdout, ws)
        .then(() => closeP)
        .then(() => resolve())
        .catch(reject);
    });
  }

  private async zipDirectoryToFile(
    srcDir: string,
    outZip: string,
  ): Promise<void> {
    await fs.promises.mkdir(path.dirname(outZip), { recursive: true });
    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(outZip);
      const archive = archiver('zip', { zlib: { level: 6 } });
      output.on('close', () => resolve());
      output.on('error', reject);
      archive.on('error', reject);
      archive.pipe(output);
      if (!fs.existsSync(srcDir)) {
        archive.append('', { name: '_storage_missing.txt' });
      } else {
        archive.directory(srcDir, false);
      }
      void archive.finalize();
    });
  }

  private pruneOldFiles(dir: string, pattern: RegExp): void {
    const keep = this.keepCount();
    let rows: { name: string; mtime: number }[];
    try {
      rows = fs
        .readdirSync(dir)
        .filter((f) => pattern.test(f))
        .map((name) => ({
          name,
          mtime: fs.statSync(path.join(dir, name)).mtimeMs,
        }))
        .sort((a, b) => b.mtime - a.mtime);
    } catch {
      return;
    }
    for (const row of rows.slice(keep)) {
      try {
        fs.unlinkSync(path.join(dir, row.name));
        this.log.log(`Rotación: eliminado respaldo antiguo ${row.name}`);
      } catch {
        /* ignore */
      }
    }
  }
}
