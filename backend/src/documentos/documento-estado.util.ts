import { BadRequestException, ConflictException } from '@nestjs/common';

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

/**
 * Estados con contenido/archivos congelados.
 * Requieren `POST .../desbloquear` (DOC_UNLOCK) antes de editar.
 */
export const ESTADOS_CONTENIDO_PROTEGIDO: readonly DocumentoEstado[] = [
  'EN_REVISION',
  'APROBADO',
  'ARCHIVADO',
] as const;

/** Transiciones permitidas vía workflow formal / PATCH (no incluye desbloqueo privilegiado). */
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

export function esEstadoContenidoProtegido(raw: string): boolean {
  const e = normalizeDocumentoEstado(raw);
  return (ESTADOS_CONTENIDO_PROTEGIDO as readonly string[]).includes(e);
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
 * - REGISTRADO desde estado protegido → `POST .../desbloquear`
 *
 * ARCHIVADO y BORRADOR→REGISTRADO siguen vía PATCH solo cuando el origen lo permite
 * en TRANSICIONES (p. ej. BORRADOR→REGISTRADO). El desbloqueo privilegiado NO está aquí.
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
  if (estadoNuevo === 'REGISTRADO' && esEstadoContenidoProtegido(from)) {
    throw new BadRequestException(
      'Reabrir un documento protegido solo es posible mediante la operación formal de desbloqueo',
    );
  }
}

/**
 * Metadatos y archivos inmutables en estados protegidos.
 * Incluso SUPERADMIN / DOC_UNLOCK deben usar primero el endpoint de desbloqueo.
 */
export function assertContenidoMutable(estadoActualRaw: string): void {
  if (esEstadoContenidoProtegido(estadoActualRaw)) {
    const e = normalizeDocumentoEstado(estadoActualRaw);
    throw new BadRequestException(
      `Documento en estado ${e}: el contenido está congelado. Use la operación formal de desbloqueo para corregir.`,
    );
  }
}

/** Campos de PATCH que mutan contenido (no incluye `estado`). */
export type PatchDocumentoCamposContenido = {
  asunto?: unknown;
  descripcion?: unknown;
  fechaDocumento?: unknown;
  fechaVencimiento?: unknown;
  responsableInstitucional?: unknown;
  contraparteId?: unknown;
  beneficiarioId?: unknown;
  tipoDocumentalId?: unknown;
  dependenciaId?: unknown;
  nivelConfidencialidad?: unknown;
  activo?: unknown;
};

export function dtoTieneCambioDeContenido(
  dto: PatchDocumentoCamposContenido,
): boolean {
  return (
    dto.asunto !== undefined ||
    dto.descripcion !== undefined ||
    dto.fechaDocumento !== undefined ||
    dto.fechaVencimiento !== undefined ||
    dto.responsableInstitucional !== undefined ||
    dto.contraparteId !== undefined ||
    dto.beneficiarioId !== undefined ||
    dto.tipoDocumentalId !== undefined ||
    dto.dependenciaId !== undefined ||
    dto.nivelConfidencialidad !== undefined ||
    dto.activo !== undefined
  );
}

/**
 * APROBADO → ARCHIVADO por PATCH es transición de ciclo de vida (DOC_UPDATE),
 * no desbloqueo ni edición de contenido. Payload mixto (estado + metadata) no aplica.
 */
export function esArchivadoStateOnlyDesdeAprobado(input: {
  estadoActual: string;
  estadoNuevo?: DocumentoEstado;
  tieneCambioContenido: boolean;
}): boolean {
  return (
    normalizeDocumentoEstado(input.estadoActual) === 'APROBADO' &&
    input.estadoNuevo === 'ARCHIVADO' &&
    !input.tieneCambioContenido
  );
}

/**
 * En estados protegidos, solo se exime el freeze para APROBADO→ARCHIVADO state-only.
 * Cualquier metadata o destino de estado distinto sigue congelado.
 */
export function assertPatchPermitidoEnEstadoProtegido(input: {
  estadoActual: string;
  estadoNuevo?: DocumentoEstado;
  tieneCambioContenido: boolean;
}): void {
  if (!esEstadoContenidoProtegido(input.estadoActual)) {
    return;
  }
  if (esArchivadoStateOnlyDesdeAprobado(input)) {
    return;
  }
  if (input.tieneCambioContenido || input.estadoNuevo !== undefined) {
    assertContenidoMutable(input.estadoActual);
  }
}

/**
 * Valida origen de desbloqueo administrativo.
 * Destino siempre REGISTRADO (decidido por el servidor).
 */
export function assertEstadoDesbloqueable(
  estadoActualRaw: string,
): DocumentoEstado {
  const from = normalizeDocumentoEstado(estadoActualRaw);
  if (!esEstadoContenidoProtegido(from)) {
    throw new ConflictException(
      'El documento ya se encuentra en un estado editable.',
    );
  }
  return from;
}
