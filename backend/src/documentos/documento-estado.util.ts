import { BadRequestException } from '@nestjs/common';

/** Catálogo formal de ciclo de vida (R-27 MVP ISO 15489). */
export const ESTADOS_DOCUMENTO = [
  'BORRADOR',
  'REGISTRADO',
  'EN_REVISION',
  'APROBADO',
  'RECHAZADO',
  'ARCHIVADO',
] as const;

export type DocumentoEstado = (typeof ESTADOS_DOCUMENTO)[number];

/** Transiciones permitidas (solo validación servidor; ADMIN aplica cambios hasta R-28). */
const TRANSICIONES: Record<DocumentoEstado, DocumentoEstado[]> = {
  BORRADOR: ['REGISTRADO', 'ARCHIVADO'],
  REGISTRADO: ['EN_REVISION', 'ARCHIVADO'],
  EN_REVISION: ['APROBADO', 'RECHAZADO'],
  RECHAZADO: ['EN_REVISION', 'ARCHIVADO'],
  APROBADO: ['ARCHIVADO'],
  ARCHIVADO: [],
};

export function normalizeDocumentoEstado(raw: string): DocumentoEstado {
  const u = raw.trim().toUpperCase();
  if ((ESTADOS_DOCUMENTO as readonly string[]).includes(u)) {
    return u as DocumentoEstado;
  }
  return 'REGISTRADO';
}

export function esEstadoDocumentoValido(raw: string): boolean {
  return (ESTADOS_DOCUMENTO as readonly string[]).includes(
    raw.trim().toUpperCase(),
  );
}

/** En alta solo BORRADOR o REGISTRADO (captura borrador institucional). */
export function assertEstadoCreacionPermitido(estado: DocumentoEstado): void {
  if (estado !== 'BORRADOR' && estado !== 'REGISTRADO') {
    throw new BadRequestException(
      `Estado inicial no válido: use BORRADOR o REGISTRADO (recibido: ${estado})`,
    );
  }
}

export function assertTransicionEstado(
  estadoActualRaw: string,
  estadoNuevo: DocumentoEstado,
): void {
  const from = normalizeDocumentoEstado(estadoActualRaw);
  if (from === estadoNuevo) {
    return;
  }
  const permitidos = TRANSICIONES[from];
  if (!permitidos.includes(estadoNuevo)) {
    throw new BadRequestException(
      `Transición de estado no permitida: ${from} → ${estadoNuevo}`,
    );
  }
}
