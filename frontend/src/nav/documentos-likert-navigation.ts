/** Rutas de listado documental filtradas por nivel Likert del dashboard. */

export type LikertNivelCodigoUi = 'OPTIMO' | 'MODERADO' | 'CRITICO';

const LIKERT_LABELS: Record<LikertNivelCodigoUi, string> = {
  OPTIMO: 'Óptimo (Nivel 5)',
  MODERADO: 'Moderado (Nivel 3)',
  CRITICO: 'Crítico (Nivel 1)',
};

export function labelLikertNivel(codigo: string): string {
  return LIKERT_LABELS[codigo as LikertNivelCodigoUi] ?? codigo;
}

export function parseLikertNivelUi(
  raw: string | null | undefined,
): LikertNivelCodigoUi | null {
  const u = raw?.trim().toUpperCase();
  if (u === 'OPTIMO' || u === 'MODERADO' || u === 'CRITICO') return u;
  return null;
}

/** Path a Documentos con el mismo criterio que la evaluación del panel. */
export function documentosPathForLikert(codigo: LikertNivelCodigoUi): string {
  const p = new URLSearchParams();
  p.set('likert', codigo);
  if (codigo === 'CRITICO') {
    p.set('incluirInactivos', 'true');
  }
  return `/documentos?${p.toString()}`;
}
