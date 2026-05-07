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
