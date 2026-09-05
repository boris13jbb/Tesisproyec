import * as path from 'path';

/**
 * Helpers de filesystem / CNF / errores para el dump MySQL existente.
 * No introducen restore, listado ni descarga.
 */

/** Identificador de base aceptable como argumento posicional de mysqldump (sin flags). */
export function isSafeMysqlDatabaseName(name: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9_$-]{0,63}$/.test(name);
}

export function isSafeMysqlPort(port: string): boolean {
  if (!/^\d{1,5}$/.test(port)) return false;
  const n = Number(port);
  return n >= 1 && n <= 65535;
}

/** Binario configurado por entorno; spawn sin shell. Rechaza control chars. */
export function isSafeExternalExecutablePath(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  return !/[\0\r\n]/.test(s);
}

/**
 * Valor para my.cnf `[client]`. Rechaza NUL/CR/LF (romperían el archivo e inyectarían claves).
 * El resto se cita y se escapa `"` y `\`.
 */
export function quoteMysqlCnfValue(value: string): string {
  if (/[\0\r\n]/.test(value)) {
    throw new Error('CNF_UNSAFE_VALUE');
  }
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function isPathInsideRoot(
  rootAbs: string,
  candidateAbs: string,
): boolean {
  const root = path.resolve(rootAbs);
  const candidate = path.resolve(candidateAbs);
  const rel = path.relative(root, candidate);
  if (rel === '') return true;
  return !rel.startsWith('..') && !path.isAbsolute(rel);
}

/**
 * Une un nombre de archivo (basename) al root. Rechaza traversal, UNC, absolutos y `..`.
 */
export function safeJoinUnderRoot(
  rootAbs: string,
  fileName: string,
): string | null {
  if (!fileName || fileName.includes('\0')) return null;
  if (fileName !== path.basename(fileName)) return null;
  if (fileName.includes('..')) return null;
  const joined = path.resolve(rootAbs, fileName);
  if (!isPathInsideRoot(rootAbs, joined)) return null;
  return joined;
}

/** Rotación técnica local (no es retención institucional). Default 14; inválido → 14; techo 500. */
export function resolveBackupKeepCount(raw: unknown): number {
  const n = Number(raw ?? 14);
  if (!Number.isFinite(n) || n < 1) return 14;
  return Math.min(500, Math.floor(n));
}

export const AUTOMATED_SQL_BACKUP_NAME = /^backup-auto-.*\.sql$/;
export const AUTOMATED_STORAGE_ZIP_NAME = /^backup-auto-.*-storage\.zip$/;

/** Solo artefactos reconocidos del job; README/.gitkeep/.tmp/ajenos no son candidatos. */
export function isRecognizedBackupArtifactName(
  name: string,
  pattern: RegExp,
): boolean {
  if (!name || name !== path.basename(name)) return false;
  if (name.endsWith('.tmp')) return false;
  if (name === 'README.md' || name === '.gitkeep') return false;
  return pattern.test(name);
}

/**
 * Args de mysqldump: `--defaults-extra-file` DEBE ir primero (requisito de option-files).
 * Sin host/user/password en argv.
 */
export function buildMysqldumpArgs(
  cnfPath: string,
  database: string,
): string[] {
  return [
    `--defaults-extra-file=${cnfPath}`,
    '--single-transaction',
    '--routines',
    '--events',
    '--default-character-set=utf8mb4',
    database,
  ];
}

export function defaultsExtraFileArgIndex(args: readonly string[]): number {
  return args.findIndex((a) => a.startsWith('--defaults-extra-file='));
}

/**
 * Resume errores de CLI/FS para logs y auditoría: sin password, URL mysql, ni rutas largas.
 */
export function sanitizeBackupErrorMessage(raw: string): string {
  let s = raw.replace(/\s+/g, ' ').trim();
  if (!s) return 'error';
  s = s.replace(/password\s*=\s*\S+/gi, 'password=[redacted]');
  s = s.replace(/mysql:\/\/[^\s]+/gi, 'mysql://[redacted]');
  s = s.replace(/sgd-mysqldump-[0-9a-f-]+\.cnf/gi, 'sgd-mysqldump-[id].cnf');
  s = s.replace(/[A-Za-z]:\\[^\s"'<>|]+/g, '[path]');
  s = s.replace(/\\\\[^\s"'<>|]+/g, '[unc]');
  s = s.replace(/\/(?:tmp|var|home|Users|etc)\/[^\s"'<>|]+/g, '[path]');
  return s.slice(0, 400);
}
