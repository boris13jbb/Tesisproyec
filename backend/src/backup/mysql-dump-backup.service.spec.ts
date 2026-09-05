import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { AuditService } from '../auditoria/audit.service';
import { MysqlDumpBackupService } from './mysql-dump-backup.service';

type DumpPriv = {
  runMysqldumpToFile: (
    dumpExe: string,
    cnfPath: string,
    database: string,
    outFile: string,
  ) => Promise<void>;
};

type AuditCall = {
  action?: string;
  result?: string;
  context?: { actorEmail?: string; actorUserId?: string | null };
  meta?: { notes?: string; dumpFile?: string };
};

describe('MysqlDumpBackupService', () => {
  let tmpDir: string;
  const auditLog = jest.fn();

  function firstAuditCall(): AuditCall {
    const calls = auditLog.mock.calls as Array<[AuditCall]>;
    const payload = calls[0]?.[0];
    if (!payload) {
      throw new Error('audit.log no llamado');
    }
    return payload;
  }

  function buildService(
    extra: Record<string, string> = {},
  ): MysqlDumpBackupService {
    const values: Record<string, string> = {
      BACKUP_MYSQLDUMP_PATH: path.join(tmpDir, 'mysqldump-fake.exe'),
      DATABASE_URL:
        'mysql://app:secret@127.0.0.1:3306/gestion_documental_gadpr_lm',
      BACKUP_OUTPUT_DIR: tmpDir,
      BACKUP_INCLUDE_STORAGE_ZIP: 'false',
      BACKUP_KEEP_COUNT: '14',
      ...extra,
    };
    const config = {
      get: (key: string) => values[key],
    } as unknown as ConfigService;
    const audit = { log: auditLog } as unknown as AuditService;
    return new MysqlDumpBackupService(config, audit);
  }

  beforeEach(async () => {
    auditLog.mockReset();
    auditLog.mockResolvedValue(undefined);
    tmpDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'sgd-backup-svc-'),
    );
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  function spyDump(
    service: MysqlDumpBackupService,
    impl: DumpPriv['runMysqldumpToFile'],
  ) {
    return jest
      .spyOn(service as unknown as DumpPriv, 'runMysqldumpToFile')
      .mockImplementation(impl);
  }

  it('USER-facing: dump vacío no deja .sql válido y audita FAIL DUMP_EMPTY', async () => {
    const service = buildService();
    spyDump(service, async (_e, _c, _d, outFile) => {
      await fs.promises.writeFile(outFile, '');
    });
    const res = await service.runAutomatedBackup('cron');
    expect(res).toEqual({ ok: false });
    const sqls = (await fs.promises.readdir(tmpDir)).filter((f) =>
      f.endsWith('.sql'),
    );
    expect(sqls).toEqual([]);
    const failCall = firstAuditCall();
    expect(failCall.action).toBe('BACKUP_VERIFIED');
    expect(failCall.result).toBe('FAIL');
    expect(failCall.meta?.notes).toBe('DUMP_EMPTY');
  });

  it('dump OK usa basename en meta, actor de sistema en cron, y no incluye password', async () => {
    const service = buildService();
    spyDump(service, async (_e, _c, _d, outFile) => {
      await fs.promises.writeFile(outFile, '-- mysql dump\n');
    });
    const res = await service.runAutomatedBackup('cron');
    expect(res).toEqual({ ok: true });
    const payload = firstAuditCall();
    expect(payload.context?.actorEmail).toBe('system-scheduled-backup');
    expect(payload.context?.actorUserId).toBeNull();
    expect(payload.meta?.dumpFile).toMatch(/^backup-auto-.*\.sql$/);
    expect(payload.meta?.dumpFile).not.toContain(path.sep);
    expect(JSON.stringify(payload)).not.toMatch(/password|secret@127/i);
    const sqls = (await fs.promises.readdir(tmpDir)).filter((f) =>
      f.endsWith('.sql'),
    );
    expect(sqls).toHaveLength(1);
    expect(sqls[0]).not.toBe(sqls[0].replace(/\.sql$/, '.sql.tmp'));
  });

  it('trigger manual persiste actor JWT', async () => {
    const service = buildService();
    spyDump(service, async (_e, _c, _d, outFile) => {
      await fs.promises.writeFile(outFile, '-- dump\n');
    });
    await service.runAutomatedBackup('manual', {
      userId: 'admin-1',
      email: 'admin@local.test',
    });
    const payload = firstAuditCall();
    expect(payload.result).toBe('OK');
    expect(payload.context?.actorUserId).toBe('admin-1');
    expect(payload.context?.actorEmail).toBe('admin@local.test');
  });

  it('nombre de base con flag no se pasa a spawn (FAIL DATABASE_NAME_UNSAFE)', async () => {
    const service = buildService({
      DATABASE_URL: 'mysql://app:secret@127.0.0.1:3306/--help',
    });
    const spy = spyDump(service, () =>
      Promise.reject(new Error('no debe ejecutarse')),
    );
    const res = await service.runAutomatedBackup('cron');
    expect(res.ok).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    expect(firstAuditCall().result).toBe('FAIL');
    expect(firstAuditCall().meta?.notes).toBe('DATABASE_NAME_UNSAFE');
  });

  it('solape: segunda ejecución skipped y no escribe otro archivo', async () => {
    const service = buildService();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const spy = spyDump(service, async (_e, _c, _d, outFile) => {
      await gate;
      await fs.promises.writeFile(outFile, '-- dump\n');
    });
    const first = service.runAutomatedBackup('cron');
    await new Promise<void>((resolve, reject) => {
      const started = Date.now();
      const t = setInterval(() => {
        if (spy.mock.calls.length > 0) {
          clearInterval(t);
          resolve();
        } else if (Date.now() - started > 3000) {
          clearInterval(t);
          reject(new Error('dump no inició'));
        }
      }, 5);
    });
    const second = await service.runAutomatedBackup('cron');
    expect(second).toEqual({ ok: false, skipped: true });
    release();
    await first;
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('si audit.log lanza tras OK, libera el lock para un segundo intento', async () => {
    const service = buildService();
    spyDump(service, async (_e, _c, _d, outFile) => {
      await fs.promises.writeFile(outFile, '-- dump\n');
    });
    auditLog.mockRejectedValueOnce(new Error('audit down'));
    await expect(service.runAutomatedBackup('cron')).rejects.toThrow(
      'audit down',
    );
    auditLog.mockResolvedValue(undefined);
    const second = await service.runAutomatedBackup('cron');
    expect(second).toEqual({ ok: true });
  });

  it('rotación no sigue nombres fuera del root (basename only)', async () => {
    const service = buildService({ BACKUP_KEEP_COUNT: '1' });
    spyDump(service, async (_e, _c, _d, outFile) => {
      await fs.promises.writeFile(outFile, '-- dump\n');
    });
    await service.runAutomatedBackup('cron');
    await new Promise((r) => setTimeout(r, 20));
    await service.runAutomatedBackup('cron');
    const sqls = (await fs.promises.readdir(tmpDir)).filter((f) =>
      f.endsWith('.sql'),
    );
    expect(sqls).toHaveLength(1);
    expect(sqls.every((n) => n === path.basename(n))).toBe(true);
  });

  it('FAIL no persiste password de DATABASE_URL en notes', async () => {
    const service = buildService({
      DATABASE_URL:
        'mysql://app:SuperSecret99@127.0.0.1:3306/gestion_documental_gadpr_lm',
    });
    spyDump(service, () =>
      Promise.reject(
        new Error(
          'Access denied password=SuperSecret99 mysql://app:SuperSecret99@127.0.0.1:3306/db',
        ),
      ),
    );
    await service.runAutomatedBackup('cron');
    const payload = JSON.stringify(firstAuditCall());
    expect(payload.toLowerCase()).not.toContain('supersecret99');
    expect(payload).toContain('password=[redacted]');
  });

  function fsPathString(p: fs.PathLike | fs.PathOrFileDescriptor): string {
    return typeof p === 'string' ? p : '';
  }

  function trackCnfWrite(): {
    pathOf: () => string;
    restore: () => void;
  } {
    let captured = '';
    const orig = fs.promises.writeFile.bind(fs.promises);
    const spy = jest
      .spyOn(fs.promises, 'writeFile')
      .mockImplementation((p, data, options) => {
        const s = fsPathString(p);
        if (s.includes('sgd-mysqldump-') && s.endsWith('.cnf')) {
          captured = s;
        }
        return orig(
          p as fs.PathLike,
          data as NodeJS.ArrayBufferView,
          options as fs.WriteFileOptions,
        );
      });
    return {
      pathOf: () => captured,
      restore: () => {
        spy.mockRestore();
      },
    };
  }

  async function expectCnfGone(cnfPath: string): Promise<void> {
    expect(cnfPath.length).toBeGreaterThan(0);
    await expect(fs.promises.access(cnfPath)).rejects.toBeDefined();
  }

  it('CNF se elimina tras éxito', async () => {
    const service = buildService();
    const cnf = trackCnfWrite();
    spyDump(service, async (_e, _c, _d, outFile) => {
      await fs.promises.writeFile(outFile, '-- dump\n');
    });
    await service.runAutomatedBackup('cron');
    const cnfPath = cnf.pathOf();
    cnf.restore();
    await expectCnfGone(cnfPath);
    expect(firstAuditCall().result).toBe('OK');
  });

  it('CNF se elimina si writeFile falla tras crear el archivo', async () => {
    const service = buildService();
    let captured = '';
    const orig = fs.promises.writeFile.bind(fs.promises);
    const spy = jest
      .spyOn(fs.promises, 'writeFile')
      .mockImplementation(async (p, data, options) => {
        const s = fsPathString(p);
        if (s.includes('sgd-mysqldump-') && s.endsWith('.cnf')) {
          captured = s;
          await orig(
            p as fs.PathLike,
            data as NodeJS.ArrayBufferView,
            options as fs.WriteFileOptions,
          );
          throw new Error('EACCES after write');
        }
        return orig(
          p as fs.PathLike,
          data as NodeJS.ArrayBufferView,
          options as fs.WriteFileOptions,
        );
      });
    const res = await service.runAutomatedBackup('cron');
    spy.mockRestore();
    expect(res.ok).toBe(false);
    await expectCnfGone(captured);
  });

  it('CNF se elimina si el ejecutable no existe (spawn error; sin secretos en resultado)', async () => {
    const service = buildService({
      BACKUP_MYSQLDUMP_PATH: path.join(tmpDir, 'mysqldump-inexistente.exe'),
    });
    const cnf = trackCnfWrite();
    const res = await service.runAutomatedBackup('cron');
    const cnfPath = cnf.pathOf();
    cnf.restore();
    expect(res).toEqual({ ok: false });
    expect(JSON.stringify(res)).not.toMatch(
      /password|DATABASE_URL|C:\\|\/etc\//i,
    );
    await expectCnfGone(cnfPath);
    expect(firstAuditCall().result).toBe('FAIL');
    const notes = firstAuditCall().meta?.notes ?? '';
    expect(notes.toLowerCase()).not.toContain('secret');
  });

  it('CNF se elimina si el dump rechaza (exit != 0); sin .sql final ni password', async () => {
    const service = buildService();
    const cnf = trackCnfWrite();
    spyDump(service, () =>
      Promise.reject(
        new Error(
          'Access denied password=SuperSecret99 mysql://app:x@127.0.0.1/db',
        ),
      ),
    );
    const res = await service.runAutomatedBackup('cron');
    const cnfPath = cnf.pathOf();
    cnf.restore();
    expect(res.ok).toBe(false);
    await expectCnfGone(cnfPath);
    const sqls = (await fs.promises.readdir(tmpDir)).filter((f) =>
      f.endsWith('.sql'),
    );
    expect(sqls).toEqual([]);
    const payload = JSON.stringify(firstAuditCall());
    expect(payload.toLowerCase()).not.toContain('supersecret99');
  });

  it('CNF se elimina si dump vacío (exit 0 + size 0); no rename final; no OK', async () => {
    const service = buildService();
    const cnf = trackCnfWrite();
    spyDump(service, async (_e, _c, _d, outFile) => {
      await fs.promises.writeFile(outFile, '');
    });
    const res = await service.runAutomatedBackup('cron');
    const cnfPath = cnf.pathOf();
    cnf.restore();
    expect(res).toEqual({ ok: false });
    await expectCnfGone(cnfPath);
    expect(firstAuditCall().result).toBe('FAIL');
    expect(firstAuditCall().meta?.notes).toBe('DUMP_EMPTY');
    const sqls = (await fs.promises.readdir(tmpDir)).filter((f) =>
      f.endsWith('.sql'),
    );
    expect(sqls).toEqual([]);
  });

  it('CNF se elimina si rename falla; no queda .sql válido', async () => {
    const service = buildService();
    const cnf = trackCnfWrite();
    spyDump(service, async (_e, _c, _d, outFile) => {
      await fs.promises.writeFile(outFile, '-- dump\n');
    });
    const origRename = fs.promises.rename.bind(fs.promises);
    const renameSpy = jest
      .spyOn(fs.promises, 'rename')
      .mockImplementation(async (a, b) => {
        if (String(b).endsWith('.sql')) {
          throw new Error('EXDEV rename');
        }
        return origRename(a, b);
      });
    const res = await service.runAutomatedBackup('cron');
    renameSpy.mockRestore();
    const cnfPath = cnf.pathOf();
    cnf.restore();
    expect(res.ok).toBe(false);
    await expectCnfGone(cnfPath);
    const sqls = (await fs.promises.readdir(tmpDir)).filter((f) =>
      f.endsWith('.sql'),
    );
    expect(sqls).toEqual([]);
  });

  it('CNF se elimina si ZIP falla (criterio de éxito incluye ZIP cuando está activo)', async () => {
    const service = buildService({ BACKUP_INCLUDE_STORAGE_ZIP: 'true' });
    const cnf = trackCnfWrite();
    spyDump(service, async (_e, _c, _d, outFile) => {
      await fs.promises.writeFile(outFile, '-- dump\n');
    });
    type ZipPriv = {
      zipDirectoryToFile: (src: string, out: string) => Promise<void>;
    };
    jest
      .spyOn(service as unknown as ZipPriv, 'zipDirectoryToFile')
      .mockRejectedValue(new Error('zip boom'));
    const res = await service.runAutomatedBackup('cron');
    const cnfPath = cnf.pathOf();
    cnf.restore();
    expect(res.ok).toBe(false);
    await expectCnfGone(cnfPath);
    const sqls = (await fs.promises.readdir(tmpDir)).filter((f) =>
      f.endsWith('.sql'),
    );
    expect(sqls).toEqual([]);
    expect(firstAuditCall().result).toBe('FAIL');
  });

  it('excepción de auditoría tras OK libera lock y ya no deja CNF', async () => {
    const service = buildService();
    const cnf = trackCnfWrite();
    spyDump(service, async (_e, _c, _d, outFile) => {
      await fs.promises.writeFile(outFile, '-- dump\n');
    });
    auditLog.mockRejectedValueOnce(new Error('audit down'));
    await expect(service.runAutomatedBackup('cron')).rejects.toThrow(
      'audit down',
    );
    const cnfPath = cnf.pathOf();
    cnf.restore();
    await expectCnfGone(cnfPath);
    auditLog.mockResolvedValue(undefined);
    const second = await service.runAutomatedBackup('cron');
    expect(second).toEqual({ ok: true });
  });

  it('prune posterior al backup válido no toca README/.gitkeep/ajenos/.tmp', async () => {
    await fs.promises.writeFile(path.join(tmpDir, 'README.md'), 'keep');
    await fs.promises.writeFile(path.join(tmpDir, '.gitkeep'), '');
    await fs.promises.writeFile(path.join(tmpDir, 'archivo-ajeno.txt'), 'x');
    await fs.promises.writeFile(path.join(tmpDir, 'residual.tmp'), 'tmp');
    const oldSql = path.join(tmpDir, 'backup-auto-old.sql');
    await fs.promises.writeFile(oldSql, '-- old\n');
    const past = new Date(Date.now() - 120_000);
    await fs.promises.utimes(oldSql, past, past);
    const service = buildService({ BACKUP_KEEP_COUNT: '1' });
    spyDump(service, async (_e, _c, _d, outFile) => {
      await fs.promises.writeFile(outFile, '-- dump\n');
    });
    await service.runAutomatedBackup('cron');
    const names = await fs.promises.readdir(tmpDir);
    expect(names).toContain('README.md');
    expect(names).toContain('.gitkeep');
    expect(names).toContain('archivo-ajeno.txt');
    expect(names).toContain('residual.tmp');
    const sqls = names.filter(
      (n) => n.startsWith('backup-auto-') && n.endsWith('.sql'),
    );
    expect(sqls).toHaveLength(1);
    expect(sqls[0]).not.toBe('backup-auto-old.sql');
  });
});
