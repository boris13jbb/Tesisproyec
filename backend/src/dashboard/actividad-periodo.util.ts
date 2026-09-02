import type { Prisma } from '@prisma/client';

export const ACTIVIDAD_DOCUMENTAL_PERIODOS = [
  'historico',
  'mes',
  '3m',
  'anio',
] as const;

export type ActividadDocumentalPeriodo =
  (typeof ACTIVIDAD_DOCUMENTAL_PERIODOS)[number];

export const ACTIVIDAD_DOCUMENTAL_PERIODO_DEFAULT: ActividadDocumentalPeriodo =
  'historico';

export const USUARIO_NO_IDENTIFICADO_ID = '__sin_creador_identificado__';

export function normalizeActividadPeriodo(
  value: string | undefined | null,
): ActividadDocumentalPeriodo {
  if (
    value &&
    (ACTIVIDAD_DOCUMENTAL_PERIODOS as readonly string[]).includes(value)
  ) {
    return value as ActividadDocumentalPeriodo;
  }
  return ACTIVIDAD_DOCUMENTAL_PERIODO_DEFAULT;
}

/**
 * Filtro `createdAt` para actividad documental por usuario.
 * Histórico: sin filtro temporal (null).
 */
export function resolveActividadPeriodoCreatedAtFilter(
  periodo: ActividadDocumentalPeriodo,
  now: Date = new Date(),
): Prisma.DateTimeFilter | null {
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (periodo) {
    case 'historico':
      return null;
    case 'mes': {
      const desde = new Date(year, month, 1, 0, 0, 0, 0);
      const hasta = new Date(year, month + 1, 1, 0, 0, 0, 0);
      return { gte: desde, lt: hasta };
    }
    case '3m': {
      const desde = new Date(year, month - 3, 1, 0, 0, 0, 0);
      return { gte: desde };
    }
    case 'anio': {
      const desde = new Date(year, 0, 1, 0, 0, 0, 0);
      return { gte: desde };
    }
    default:
      return null;
  }
}

export function mergeDocumentoWhereWithActividadPeriodo(
  docWhere: Prisma.DocumentoWhereInput,
  periodo: ActividadDocumentalPeriodo,
  now: Date = new Date(),
): Prisma.DocumentoWhereInput {
  const createdAt = resolveActividadPeriodoCreatedAtFilter(periodo, now);
  if (!createdAt) {
    return docWhere;
  }
  return { ...docWhere, createdAt };
}
