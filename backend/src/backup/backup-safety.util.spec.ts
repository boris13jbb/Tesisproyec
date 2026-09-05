import * as os from 'os';
import * as path from 'path';
import {
  AUTOMATED_SQL_BACKUP_NAME,
  buildMysqldumpArgs,
  defaultsExtraFileArgIndex,
  isPathInsideRoot,
  isRecognizedBackupArtifactName,
  isSafeExternalExecutablePath,
  isSafeMysqlDatabaseName,
  isSafeMysqlPort,
  quoteMysqlCnfValue,
  resolveBackupKeepCount,
  safeJoinUnderRoot,
  sanitizeBackupErrorMessage,
} from './backup-safety.util';

describe('backup-safety.util', () => {
  const root = path.join(os.tmpdir(), 'sgd-backup-qa-root');

  it('acepta nombres de base MySQL habituales y rechaza flags', () => {
    expect(isSafeMysqlDatabaseName('gestion_documental_gadpr_lm')).toBe(true);
    expect(isSafeMysqlDatabaseName('db$1')).toBe(true);
    expect(isSafeMysqlDatabaseName('--help')).toBe(false);
    expect(isSafeMysqlDatabaseName('--version')).toBe(false);
    expect(isSafeMysqlDatabaseName('--result-file=x')).toBe(false);
    expect(isSafeMysqlDatabaseName('-r')).toBe(false);
    expect(isSafeMysqlDatabaseName('-e')).toBe(false);
    expect(isSafeMysqlDatabaseName('ok;rm')).toBe(false);
    expect(isSafeMysqlDatabaseName('ok|cat')).toBe(false);
    expect(isSafeMysqlDatabaseName('')).toBe(false);
  });

  it('valida puerto MySQL', () => {
    expect(isSafeMysqlPort('3306')).toBe(true);
    expect(isSafeMysqlPort('0')).toBe(false);
    expect(isSafeMysqlPort('65536')).toBe(false);
    expect(isSafeMysqlPort('22abc')).toBe(false);
  });

  it('rechaza binario con control chars', () => {
    expect(
      isSafeExternalExecutablePath('C:\\xampp\\mysql\\bin\\mysqldump.exe'),
    ).toBe(true);
    expect(isSafeExternalExecutablePath('mysqldump\nwhoami')).toBe(false);
    expect(isSafeExternalExecutablePath('')).toBe(false);
  });

  it('cita valores CNF y rechaza saltos de línea', () => {
    expect(quoteMysqlCnfValue('abc"def')).toBe('"abc\\"def"');
    expect(quoteMysqlCnfValue('a\\b')).toBe('"a\\\\b"');
    expect(() => quoteMysqlCnfValue('p\nass')).toThrow('CNF_UNSAFE_VALUE');
    expect(() => quoteMysqlCnfValue('p\rass')).toThrow('CNF_UNSAFE_VALUE');
  });

  it('safeJoinUnderRoot bloquea traversal Unix, Windows, UNC y absolutos', () => {
    expect(safeJoinUnderRoot(root, '../../backup.sql')).toBeNull();
    expect(safeJoinUnderRoot(root, '..\\..\\backup.sql')).toBeNull();
    expect(safeJoinUnderRoot(root, '/etc/passwd')).toBeNull();
    expect(safeJoinUnderRoot(root, 'C:\\Windows\\system.ini')).toBeNull();
    expect(safeJoinUnderRoot(root, 'C:/Windows/system.ini')).toBeNull();
    expect(safeJoinUnderRoot(root, '\\\\server\\share\\backup.sql')).toBeNull();
    expect(safeJoinUnderRoot(root, '%2e%2e%2fbackup.sql')).not.toBeNull();
    const ok = safeJoinUnderRoot(root, 'backup-auto-x.sql');
    expect(ok).toBe(path.resolve(root, 'backup-auto-x.sql'));
    expect(isPathInsideRoot(root, ok as string)).toBe(true);
  });

  it('isPathInsideRoot no permite salir del root', () => {
    const inside = path.resolve(root, 'backup-auto-x.sql');
    const outside = path.resolve(root, '..', 'evil.sql');
    expect(isPathInsideRoot(root, inside)).toBe(true);
    expect(isPathInsideRoot(root, outside)).toBe(false);
  });

  it('sanitizeBackupErrorMessage no deja password ni URL mysql ni UNC', () => {
    const out = sanitizeBackupErrorMessage(
      'Access denied password=SuperSecret99 mysql://root:SuperSecret99@127.0.0.1:3306/db C:\\tmp\\sgd-mysqldump-aaaa.cnf \\\\server\\share\\x',
    );
    expect(out.toLowerCase()).not.toContain('supersecret99');
    expect(out).toContain('password=[redacted]');
    expect(out).toContain('mysql://[redacted]');
    expect(out).not.toContain('sgd-mysqldump-aaaa.cnf');
    expect(out).not.toMatch(/\\\\server/i);
  });

  it('KEEP_COUNT inválido no autoriza borrar todos (cae a 14)', () => {
    expect(resolveBackupKeepCount(14)).toBe(14);
    expect(resolveBackupKeepCount(0)).toBe(14);
    expect(resolveBackupKeepCount(-3)).toBe(14);
    expect(resolveBackupKeepCount(Number.NaN)).toBe(14);
    expect(resolveBackupKeepCount(Number.POSITIVE_INFINITY)).toBe(14);
    expect(resolveBackupKeepCount('nope')).toBe(14);
    expect(resolveBackupKeepCount(99999)).toBe(500);
    expect(resolveBackupKeepCount(undefined)).toBe(14);
  });

  it('prune solo admite artefactos reconocidos del job', () => {
    expect(
      isRecognizedBackupArtifactName(
        'backup-auto-valido.sql',
        AUTOMATED_SQL_BACKUP_NAME,
      ),
    ).toBe(true);
    expect(
      isRecognizedBackupArtifactName(
        'backup-auto-otro.sql',
        AUTOMATED_SQL_BACKUP_NAME,
      ),
    ).toBe(true);
    expect(
      isRecognizedBackupArtifactName('README.md', AUTOMATED_SQL_BACKUP_NAME),
    ).toBe(false);
    expect(
      isRecognizedBackupArtifactName('.gitkeep', AUTOMATED_SQL_BACKUP_NAME),
    ).toBe(false);
    expect(
      isRecognizedBackupArtifactName(
        'archivo-ajeno.txt',
        AUTOMATED_SQL_BACKUP_NAME,
      ),
    ).toBe(false);
    expect(
      isRecognizedBackupArtifactName('residual.tmp', AUTOMATED_SQL_BACKUP_NAME),
    ).toBe(false);
    expect(
      isRecognizedBackupArtifactName(
        'backup-auto-x.sql.tmp',
        AUTOMATED_SQL_BACKUP_NAME,
      ),
    ).toBe(false);
  });

  it('--defaults-extra-file es el primer argumento (antes de opciones ordinarias)', () => {
    const args = buildMysqldumpArgs(
      'C:\\tmp\\sgd-mysqldump-id.cnf',
      'gestion_documental_gadpr_lm',
    );
    expect(defaultsExtraFileArgIndex(args)).toBe(0);
    expect(args[0].startsWith('--defaults-extra-file=')).toBe(true);
    expect(args[args.length - 1]).toBe('gestion_documental_gadpr_lm');
    expect(args.some((a) => /password/i.test(a))).toBe(false);
    expect(args.some((a) => a.startsWith('--host') || a.startsWith('-p'))).toBe(
      false,
    );
  });
});
