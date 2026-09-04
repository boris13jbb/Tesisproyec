import { BadRequestException, NotFoundException } from '@nestjs/common';
import path from 'path';

/** Límite de subida documental (Multer + servicio). Alineado con UI 50 MB. */
export const DOCUMENTO_ARCHIVO_MAX_BYTES = 50 * 1024 * 1024;

export const DOCUMENTO_ARCHIVO_MIME_PDF = 'application/pdf';

const EXT_PELIGROSA =
  /\.(exe|bat|cmd|com|msi|scr|js|mjs|cjs|html?|svg|php|phtml|ps1|sh|dll|jar)(\.|$)/i;

/**
 * Nombre original para UX/BD: no es ruta. Nunca se usa como path físico.
 */
export function sanitizeOriginalName(name: string): string {
  const stripped = name
    .replace(/\0/g, '')
    .replace(/[\r\n]+/g, ' ')
    .trim();
  const base = stripped.replace(/[/\\?%*:|"<>]/g, '_').replace(/\.\./g, '_');
  const safe = base.replace(/[^\w.\- ()]/g, '_');
  const clipped = safe.length > 120 ? safe.slice(-120) : safe;
  const out = clipped.replace(/^\.+/, '') || 'archivo.pdf';
  return out.toLowerCase().endsWith('.pdf') ? out : `${out}.pdf`;
}

export function assertPdfFilenameAndMime(
  originalname: string | undefined,
  mimetype: string | undefined,
): void {
  const original = (originalname || '').trim().toLowerCase();
  if (!original.endsWith('.pdf')) {
    throw new BadRequestException('Solo se permiten archivos PDF (.pdf)');
  }
  if (original.includes('\0') || original.includes('..')) {
    throw new BadRequestException('Nombre de archivo no válido');
  }
  if (EXT_PELIGROSA.test(original.slice(0, -4))) {
    throw new BadRequestException('Nombre de archivo no válido');
  }
  const mime = (mimetype || '').trim().toLowerCase();
  if (mime !== DOCUMENTO_ARCHIVO_MIME_PDF) {
    throw new BadRequestException(
      'Tipo de archivo no permitido. Solo PDF (application/pdf).',
    );
  }
}

export function assertPdfMagicBytes(buffer: Buffer | undefined): void {
  const head = buffer?.subarray(0, 5)?.toString('latin1') ?? '';
  if (!head.startsWith('%PDF')) {
    throw new BadRequestException(
      'El contenido no corresponde a un PDF válido',
    );
  }
}

/** Nombre físico: UUID + extensión validada. Independiente de originalname. */
export function buildStoredPdfName(archivoId: string): string {
  return `${archivoId}.pdf`;
}

export function buildDocumentoArchivoPathRel(
  documentoId: string,
  storedName: string,
): string {
  return path.posix.join('documentos', documentoId, storedName);
}

/**
 * Resuelve pathRel bajo storageRoot y rechaza traversal (absolutos, `..`, NUL).
 */
export function resolveStoragePathOrThrow(
  storageRoot: string,
  pathRel: string,
): string {
  const root = path.resolve(storageRoot);
  if (!pathRel?.trim() || pathRel.includes('\0')) {
    throw new NotFoundException('Archivo físico no disponible');
  }
  if (path.win32.isAbsolute(pathRel) || path.posix.isAbsolute(pathRel)) {
    throw new NotFoundException('Archivo físico no disponible');
  }
  const rawParts = pathRel.split(/[/\\]+/).filter((s) => s.length > 0);
  if (
    !rawParts.length ||
    rawParts.some(
      (s) =>
        s === '..' || s === '.' || /^[a-zA-Z]:$/.test(s) || s.includes(':'),
    )
  ) {
    throw new NotFoundException('Archivo físico no disponible');
  }
  const absPath = path.resolve(root, ...rawParts);
  const rel = path.relative(root, absPath);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new NotFoundException('Archivo físico no disponible');
  }
  return absPath;
}

/**
 * Filename ASCII para Content-Disposition (evita CRLF / comillas).
 */
export function safeContentDispositionFilename(originalName: string): string {
  const sanitized = sanitizeOriginalName(originalName)
    .replace(/["\\]/g, '_')
    .replace(/[^\x20-\x7E]/g, '_');
  return sanitized.length ? sanitized : 'documento.pdf';
}

export function downloadContentType(storedMime: string): string {
  const mime = (storedMime || '').trim().toLowerCase();
  if (mime === DOCUMENTO_ARCHIVO_MIME_PDF) {
    return DOCUMENTO_ARCHIVO_MIME_PDF;
  }
  return 'application/octet-stream';
}
