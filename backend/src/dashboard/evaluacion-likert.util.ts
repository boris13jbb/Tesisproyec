/**
 * Evaluación institucional tipo Likert / semáforo documental.
 * Niveles alineados a control de salud del expediente (no inventar datos).
 *
 * - Nivel 5 Óptimo (verde): activo, actualizado recientemente, sin alerta crítica.
 * - Nivel 3 Moderado (amarillo): activo con más de N días sin actualización.
 * - Nivel 1 Crítico (rojo): inactivo, rechazado o en revisión con SLA vencido.
 */

import type { Prisma } from '@prisma/client';

export const LIKERT_DIAS_UMBRAL_DEFAULT = 60;

export type LikertNivelCodigo = 'OPTIMO' | 'MODERADO' | 'CRITICO';

export type LikertNivelMeta = {
  codigo: LikertNivelCodigo;
  nivel: 5 | 3 | 1;
  etiqueta: string;
  colorTone: 'success' | 'warning' | 'error';
  descripcion: string;
};

export const LIKERT_NIVELES: Record<LikertNivelCodigo, LikertNivelMeta> = {
  OPTIMO: {
    codigo: 'OPTIMO',
    nivel: 5,
    etiqueta: 'Nivel 5: Óptimo (Verde)',
    colorTone: 'success',
    descripcion:
      'Documentos activos y actualizados recientemente (salud excelente).',
  },
  MODERADO: {
    codigo: 'MODERADO',
    nivel: 3,
    etiqueta: 'Nivel 3: Moderado (Amarillo)',
    colorTone: 'warning',
    descripcion:
      'Documentos activos con más de 60 días sin actualización (requieren revisión o archivo pasivo).',
  },
  CRITICO: {
    codigo: 'CRITICO',
    nivel: 1,
    etiqueta: 'Nivel 1: Crítico (Rojo)',
    colorTone: 'error',
    descripcion:
      'Documentos inactivos, rechazados o en revisión con alerta de atención (SLA vencido).',
  },
};

export type DocumentoLikertInput = {
  activo: boolean;
  estado: string;
  updatedAt: Date;
  fechaLimiteSla?: Date | null;
};

export type EvaluacionLikertSummary = {
  diasUmbral: number;
  total: number;
  optimo: number;
  moderado: number;
  critico: number;
  niveles: Array<LikertNivelMeta & { count: number; percent: number }>;
};

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export function parseLikertNivel(
  raw?: string | null,
): LikertNivelCodigo | undefined {
  const u = raw?.trim().toUpperCase();
  if (u === 'OPTIMO' || u === 'MODERADO' || u === 'CRITICO') return u;
  return undefined;
}

/** Condiciones Prisma equivalentes a `classifyDocumentoLikert` (para filtros de listado). */
export function documentoLikertWhere(
  nivel: LikertNivelCodigo,
  now: Date = new Date(),
  diasUmbral: number = LIKERT_DIAS_UMBRAL_DEFAULT,
): Prisma.DocumentoWhereInput {
  const umbral = new Date(now.getTime() - diasUmbral * 24 * 60 * 60 * 1000);
  const criticoOr: Prisma.DocumentoWhereInput[] = [
    { activo: false },
    { estado: 'RECHAZADO' },
    {
      AND: [{ estado: 'EN_REVISION' }, { fechaLimiteSla: { lt: now } }],
    },
  ];

  if (nivel === 'CRITICO') {
    return { OR: criticoOr };
  }

  const notCritico: Prisma.DocumentoWhereInput = {
    NOT: { OR: criticoOr },
  };

  if (nivel === 'MODERADO') {
    return {
      AND: [{ activo: true }, { updatedAt: { lt: umbral } }, notCritico],
    };
  }

  return {
    AND: [{ activo: true }, { updatedAt: { gte: umbral } }, notCritico],
  };
}

/** Clasifica un documento en la escala Likert institucional. */
export function classifyDocumentoLikert(
  doc: DocumentoLikertInput,
  now: Date = new Date(),
  diasUmbral: number = LIKERT_DIAS_UMBRAL_DEFAULT,
): LikertNivelCodigo {
  const estado = doc.estado.trim().toUpperCase();
  if (!doc.activo) return 'CRITICO';
  if (estado === 'RECHAZADO') return 'CRITICO';
  if (
    estado === 'EN_REVISION' &&
    doc.fechaLimiteSla != null &&
    doc.fechaLimiteSla.getTime() < now.getTime()
  ) {
    return 'CRITICO';
  }
  const ageDays = daysBetween(doc.updatedAt, now);
  if (ageDays > diasUmbral) return 'MODERADO';
  return 'OPTIMO';
}

export function emptyEvaluacionLikertSummary(
  diasUmbral: number = LIKERT_DIAS_UMBRAL_DEFAULT,
): EvaluacionLikertSummary {
  return {
    diasUmbral,
    total: 0,
    optimo: 0,
    moderado: 0,
    critico: 0,
    niveles: (['OPTIMO', 'MODERADO', 'CRITICO'] as const).map((codigo) => ({
      ...LIKERT_NIVELES[codigo],
      count: 0,
      percent: 0,
    })),
  };
}

/** Agrega conteos a partir de clasificaciones individuales. */
export function buildEvaluacionLikertSummary(
  docs: DocumentoLikertInput[],
  now: Date = new Date(),
  diasUmbral: number = LIKERT_DIAS_UMBRAL_DEFAULT,
): EvaluacionLikertSummary {
  let optimo = 0;
  let moderado = 0;
  let critico = 0;
  for (const d of docs) {
    const nivel = classifyDocumentoLikert(d, now, diasUmbral);
    if (nivel === 'OPTIMO') optimo += 1;
    else if (nivel === 'MODERADO') moderado += 1;
    else critico += 1;
  }
  const total = docs.length;
  const pct = (n: number) =>
    total === 0 ? 0 : Math.round((n / total) * 1000) / 10;

  return {
    diasUmbral,
    total,
    optimo,
    moderado,
    critico,
    niveles: [
      { ...LIKERT_NIVELES.OPTIMO, count: optimo, percent: pct(optimo) },
      { ...LIKERT_NIVELES.MODERADO, count: moderado, percent: pct(moderado) },
      { ...LIKERT_NIVELES.CRITICO, count: critico, percent: pct(critico) },
    ],
  };
}
