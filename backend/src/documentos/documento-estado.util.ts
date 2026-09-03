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

/** Transiciones permitidas (solo validación servidor). */
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

/**
 * Destinos de workflow formal no permitidos en PATCH genérico:
 * - EN_REVISION → `POST .../enviar-revision` (SLA + auditoría DOC_SUBMITTED_FOR_REVIEW)
 * - APROBADO / RECHAZADO → `POST .../resolver-revision` (motivo de rechazo incluido)
 *
 * ARCHIVADO y BORRADOR→REGISTRADO siguen vía PATCH (sin endpoint especializado).
 */
export function assertEstadoNoResuelveRevisionViaPatch(
  estadoActualRaw: string,
  estadoNuevo: DocumentoEstado,
): void {
  const from = normalizeDocumentoEstado(estadoActualRaw);
  if (from === estadoNuevo) {
    return;
  }
  if (estadoNuevo === 'APROBADO' || estadoNuevo === 'RECHAZADO') {
    throw new BadRequestException(
      'Aprobar o rechazar un documento solo es posible mediante la operación formal de resolución de revisión',
    );
  }
  if (estadoNuevo === 'EN_REVISION') {
    throw new BadRequestException(
      'Enviar a revisión solo es posible mediante la operación formal de envío a revisión',
    );
  }
}
