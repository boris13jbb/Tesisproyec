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
  AUTOMATED_SQL_BACKUP_NAME,
  AUTOMATED_STORAGE_ZIP_NAME,
  buildMysqldumpArgs,
  isRecognizedBackupArtifactName,
  isSafeExternalExecutablePath,
  isSafeMysqlDatabaseName,
  isSafeMysqlPort,
  quoteMysqlCnfValue,
  resolveBackupKeepCount,
  safeJoinUnderRoot,
  sanitizeBackupErrorMessage,
} from './backup-safety.util';
import {
  AUDIT_ACTION_BACKUP_VERIFIED,
  BACKUP_META_SOURCE_SCHEDULED,
} from './backup.constants';
import { parseMysqlDatabaseUrl } from './mysql-url.util';

export type BackupRunActor = {
  userId: string;
  email: string;
};

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
    return resolveBackupKeepCount(this.config.get('BACKUP_KEEP_COUNT'));
  }

  private includeStorageZip(): boolean {
    return (
      this.config.get<string>('BACKUP_INCLUDE_STORAGE_ZIP')?.toLowerCase() ===
      'true'
    );
  }

  private resolveActor(
    trigger: 'cron' | 'manual',
    actor?: BackupRunActor,
  ): { actorUserId: string | null; actorEmail: string } {
    if (trigger === 'manual' && actor?.userId && actor.email) {
      return { actorUserId: actor.userId, actorEmail: actor.email };
    }
    return { actorUserId: null, actorEmail: 'system-scheduled-backup' };
  }

  /**
   * Ejecuta mysqldump + ZIP opcional de `storage/`, rota archivos viejos y audita un único `BACKUP_VERIFIED` OK/FAIL.
   * OK = proceso mysqldump código 0 y archivo SQL con tamaño > 0 (no es checksum SHA-256 ni prueba de restore).
   * Idempotente ante solapamiento: ignora si ya hay una ejecución en curso.
   */
  async runAutomatedBackup(
    trigger: 'cron' | 'manual' = 'cron',
    actor?: BackupRunActor,
  ): Promise<{
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
    const actorCtx = this.resolveActor(trigger, actor);
    try {
      return await this.executeDump(trigger, correlationId, actorCtx);
    } finally {
      this.running = false;
    }
  }

  private async executeDump(
    trigger: 'cron' | 'manual',
    correlationId: string,
    actorCtx: { actorUserId: string | null; actorEmail: string },
  ): Promise<{ ok: boolean; skipped?: boolean }> {
    const dumpExe = this.mysqldumpPath();
    const databaseUrl = this.config.get<string>('DATABASE_URL')?.trim() ?? '';

    if (!isSafeExternalExecutablePath(dumpExe)) {
      this.log.error(
        'BACKUP_MYSQLDUMP_PATH no definido o inválido; no se puede ejecutar mysqldump.',
      );
      await this.auditFail(
        correlationId,
        trigger,
        actorCtx,
        'BACKUP_MYSQLDUMP_PATH no configurado',
      );
      return { ok: false };
    }

    let conn: ReturnType<typeof parseMysqlDatabaseUrl>;
    try {
      conn = parseMysqlDatabaseUrl(databaseUrl);
      if (!isSafeMysqlDatabaseName(conn.database)) {
        throw new Error('DATABASE_NAME_UNSAFE');
      }
      if (!isSafeMysqlPort(conn.port)) {
        throw new Error('DATABASE_PORT_UNSAFE');
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'DATABASE_URL inválido';
      const msg = sanitizeBackupErrorMessage(raw);
      this.log.error(msg);
      await this.auditFail(correlationId, trigger, actorCtx, msg);
      return { ok: false };
    }

    const outDir = this.outputDirAbs();
    await fs.promises.mkdir(outDir, { recursive: true });

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const base = `backup-auto-${ts}-${correlationId.slice(0, 8)}`;
    const sqlPath = path.join(outDir, `${base}.sql`);
    const sqlTmp = `${sqlPath}.tmp`;
    const zipPath = this.includeStorageZip()
      ? path.join(outDir, `${base}-storage.zip`)
      : null;
    const zipTmp = zipPath ? `${zipPath}.tmp` : null;

    const cnfPath = path.join(
      os.tmpdir(),
      `sgd-mysqldump-${correlationId}.cnf`,
    );

    try {
      try {
        const cnfBody =
          '[client]\n' +
          `host=${quoteMysqlCnfValue(conn.host)}\n` +
          `port=${conn.port}\n` +
          `user=${quoteMysqlCnfValue(conn.user)}\n` +
          `password=${quoteMysqlCnfValue(conn.password)}\n`;
        await fs.promises.writeFile(cnfPath, cnfBody, {
          encoding: 'utf8',
          mode: 0o600,
        });
      } catch (e) {
        const raw = e instanceof Error ? e.message : 'No se pudo escribir .cnf';
        await this.auditFail(
          correlationId,
          trigger,
          actorCtx,
          sanitizeBackupErrorMessage(raw),
        );
        return { ok: false };
      }

      try {
        await this.runMysqldumpToFile(dumpExe, cnfPath, conn.database, sqlTmp);
        const tmpStat = await fs.promises.stat(sqlTmp);
        if (tmpStat.size <= 0) {
          await unlinkQuiet(sqlTmp);
          await this.auditFail(correlationId, trigger, actorCtx, 'DUMP_EMPTY');
          return { ok: false };
        }
        await fs.promises.rename(sqlTmp, sqlPath);
      } catch (e) {
        const raw = e instanceof Error ? e.message : 'mysqldump falló';
        const msg = sanitizeBackupErrorMessage(raw);
        this.log.error(`mysqldump: ${msg}`);
        await unlinkQuiet(sqlTmp);
        await unlinkQuiet(sqlPath);
        await this.auditFail(correlationId, trigger, actorCtx, msg);
        return { ok: false };
      }
    } finally {
      await unlinkQuiet(cnfPath);
    }

    let zipBytes = 0;
    if (zipPath && zipTmp) {
      const storageRoot = this.storageRootAbs();
      try {
        await this.zipDirectoryToFile(storageRoot, zipTmp);
        const zst = await fs.promises.stat(zipTmp);
        if (zst.size <= 0) {
          throw new Error('ZIP_EMPTY');
        }
        await fs.promises.rename(zipTmp, zipPath);
        zipBytes = (await fs.promises.stat(zipPath)).size;
      } catch (e) {
        const raw = e instanceof Error ? e.message : 'ZIP storage falló';
        const msg = sanitizeBackupErrorMessage(raw);
        this.log.error(msg);
        await unlinkQuiet(sqlPath);
        await unlinkQuiet(zipTmp);
        await unlinkQuiet(zipPath);
        await this.auditFail(correlationId, trigger, actorCtx, msg);
        return { ok: false };
      }
    }

    const sqlBytes = (await fs.promises.stat(sqlPath)).size;
    if (sqlBytes <= 0) {
      await unlinkQuiet(sqlPath);
      await unlinkQuiet(zipPath);
      await this.auditFail(correlationId, trigger, actorCtx, 'DUMP_EMPTY');
      return { ok: false };
    }
    const totalBytes = sqlBytes + zipBytes;

    this.pruneOldFiles(outDir, AUTOMATED_SQL_BACKUP_NAME);
    if (this.includeStorageZip()) {
      this.pruneOldFiles(outDir, AUTOMATED_STORAGE_ZIP_NAME);
    }

    const tipo = zipPath
      ? 'Automático (MySQL + storage)'
      : 'Automático (MySQL)';
    await this.audit.log({
      action: AUDIT_ACTION_BACKUP_VERIFIED,
      result: 'OK',
      context: {
        actorUserId: actorCtx.actorUserId,
        actorEmail: actorCtx.actorEmail,
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
    return { ok: true };
  }

  private async auditFail(
    correlationId: string,
    trigger: string,
    actorCtx: { actorUserId: string | null; actorEmail: string },
    message: string,
  ): Promise<void> {
    const safe = sanitizeBackupErrorMessage(message);
    await this.audit.log({
      action: AUDIT_ACTION_BACKUP_VERIFIED,
      result: 'FAIL',
      context: {
        actorUserId: actorCtx.actorUserId,
        actorEmail: actorCtx.actorEmail,
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
    const args = buildMysqldumpArgs(cnfPath, database);

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
                sanitizeBackupErrorMessage(
                  stderr.trim().slice(0, 500) ||
                    `mysqldump salió con código ${code}`,
                ),
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
        .filter((f) => isRecognizedBackupArtifactName(f, pattern))
        .map((name) => {
          const abs = safeJoinUnderRoot(dir, name);
          if (!abs) return null;
          try {
            const st = fs.lstatSync(abs);
            if (!st.isFile() && !st.isSymbolicLink()) return null;
            return { name, mtime: st.mtimeMs };
          } catch {
            return null;
          }
        })
        .filter((row): row is { name: string; mtime: number } => row !== null)
        .sort((a, b) => b.mtime - a.mtime);
    } catch {
      return;
    }
    for (const row of rows.slice(keep)) {
      const abs = safeJoinUnderRoot(dir, row.name);
      if (!abs) continue;
      try {
        fs.unlinkSync(abs);
        this.log.log(`Rotación: eliminado respaldo antiguo ${row.name}`);
      } catch {
        /* ignore */
      }
    }
  }
}

async function unlinkQuiet(filePath: string | null): Promise<void> {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch {
    /* ignore */
  }
}
