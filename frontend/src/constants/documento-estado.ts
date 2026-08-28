import { z } from 'zod';

/** Catálogo alineado con backend (`documento-estado.util.ts`). */
export const DOCUMENTO_ESTADOS = [
  'BORRADOR',
  'REGISTRADO',
  'EN_REVISION',
  'APROBADO',
  'RECHAZADO',
  'ARCHIVADO',
] as const;

export type DocumentoEstadoCodigo = (typeof DOCUMENTO_ESTADOS)[number];

export const DOCUMENTO_ESTADOS_CREACION = ['BORRADOR', 'REGISTRADO'] as const;

export const documentoEstadoSchema = z.enum(DOCUMENTO_ESTADOS);

export const documentoEstadoCreacionSchema = z.enum(DOCUMENTO_ESTADOS_CREACION);

export const DOCUMENTO_ESTADO_LABELS: Record<DocumentoEstadoCodigo, string> = {
  BORRADOR: 'Borrador',
  REGISTRADO: 'Registrado',
  EN_REVISION: 'En revisión',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  ARCHIVADO: 'Archivado',
};

export function labelDocumentoEstado(codigo: string): string {
  return (
    DOCUMENTO_ESTADO_LABELS[codigo as DocumentoEstadoCodigo] ?? codigo
  );
}

/** Color de Chip MUI según estado documental. */
export function documentoEstadoChipColor(
  codigo: string,
): 'default' | 'success' | 'warning' | 'info' | 'error' {
  switch (codigo) {
    case 'APROBADO':
      return 'success';
    case 'EN_REVISION':
      return 'warning';
    case 'REGISTRADO':
      return 'info';
    case 'RECHAZADO':
      return 'error';
    case 'ARCHIVADO':
      return 'default';
    case 'BORRADOR':
      return 'info';
    default:
      return 'default';
  }
}

/**
 * Clave de paleta para fondos/iconos (dashboard y bandeja).
 * El color concreto se toma del tema (claro/oscuro).
 */
export function documentoEstadoTone(
  codigo: string,
): 'success' | 'warning' | 'error' | 'info' | 'secondary' {
  switch (codigo) {
    case 'APROBADO':
      return 'success';
    case 'EN_REVISION':
      return 'warning';
    case 'RECHAZADO':
      return 'error';
    case 'REGISTRADO':
      return 'info';
    default:
      return 'secondary';
  }
}
