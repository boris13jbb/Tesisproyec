/** Estados operativos del SLA de revisión documental. */
export type DocumentoSlaEstado = 'EN_PLAZO' | 'POR_VENCER' | 'VENCIDO' | 'SIN_SLA';

const MS_PER_DAY = 86_400_000;

/** Días hábiles institucionales para resolver revisión (configurable vía env). */
export function slaDiasRevisionFromEnv(raw?: string): number {
  const n = Number.parseInt(String(raw ?? '5').trim(), 10);
  if (!Number.isFinite(n) || n < 1) return 5;
  return Math.min(n, 90);
}

/** Calcula la fecha límite sumando días calendario (MVP institucional). */
export function computeFechaLimiteSla(
  fechaIngreso: Date,
  diasSla: number,
): Date {
  const d = new Date(fechaIngreso.getTime());
  d.setDate(d.getDate() + diasSla);
  return d;
}

export function computeSlaEstado(
  fechaLimite: Date | null | undefined,
  now = new Date(),
): DocumentoSlaEstado {
  if (!fechaLimite) return 'SIN_SLA';
  const diffMs = fechaLimite.getTime() - now.getTime();
  if (diffMs < 0) return 'VENCIDO';
  if (diffMs <= MS_PER_DAY) return 'POR_VENCER';
  return 'EN_PLAZO';
}

export function diasEnRevision(
  fechaIngreso: Date | null | undefined,
  now = new Date(),
): number | null {
  if (!fechaIngreso) return null;
  const diff = now.getTime() - fechaIngreso.getTime();
  if (diff < 0) return 0;
  return Math.floor(diff / MS_PER_DAY);
}
