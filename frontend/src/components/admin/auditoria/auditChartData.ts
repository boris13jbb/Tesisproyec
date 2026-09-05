import type { TrafficLightLevel } from '../../../utils/traffic-light';
import { trafficLightLabel } from '../../../utils/traffic-light';
import type {
  AuditOutcomeDatum,
  AuditStatsResponse,
  AuditSummaryCardDatum,
  AuditUserActionDatum,
  SensitiveAuditDatum,
  SensitiveAuditLevel,
} from './audit-stats.types';

const TOP_USERS = 10;
const DEFAULT_LABEL_MAX = 18;

/** Normaliza a entero ≥ 0 (NaN / negativos / no numéricos → 0). */
export function safeNonNegativeCount(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export function truncateLabel(value: string | null | undefined, maxLength = DEFAULT_LABEL_MAX): string {
  const raw = (value ?? '').trim();
  if (!raw) return '—';
  if (raw.length <= maxLength) return raw;
  if (maxLength <= 3) return raw.slice(0, maxLength);
  return `${raw.slice(0, maxLength - 3)}...`;
}

export function actorDisplayName(
  actorEmail: string | null | undefined,
  actorUserId?: string | null,
): string {
  const email = actorEmail?.trim();
  if (email) return email;
  const id = actorUserId?.trim();
  if (id) return `Usuario ${id.slice(0, 8)}`;
  return 'Sin usuario';
}

export function trafficLevelToSensitive(level: TrafficLightLevel | null | undefined): SensitiveAuditLevel {
  switch (level) {
    case 'red':
      return 'high';
    case 'yellow':
      return 'medium';
    case 'green':
    default:
      return 'low';
  }
}

export function sensitiveLevelLabel(level: SensitiveAuditLevel): string {
  switch (level) {
    case 'high':
      return 'Actividad alta';
    case 'medium':
      return 'Actividad media';
    case 'low':
      return 'Actividad baja';
    default:
      return trafficLightLabel('green');
  }
}

export function percentOfTotal(part: number, total: number): number {
  const p = safeNonNegativeCount(part);
  const t = safeNonNegativeCount(total);
  if (t === 0) return 0;
  return (p / t) * 100;
}

export function formatPercent(part: number, total: number, digits = 1): string {
  const pct = percentOfTotal(part, total);
  return `${pct.toFixed(digits)}%`;
}

export function buildAuditSummaryCards(
  stats: AuditStatsResponse | null | undefined,
): AuditSummaryCardDatum[] {
  const totales = stats?.totales;
  const docs = stats?.documentos;
  return [
    {
      id: 'registros',
      label: 'Registros',
      value: safeNonNegativeCount(totales?.registros),
      accent: 'primary',
      icon: 'records',
    },
    {
      id: 'ok',
      label: 'OK',
      value: safeNonNegativeCount(totales?.ok),
      accent: 'success',
      icon: 'ok',
    },
    {
      id: 'fail',
      label: 'Fallo',
      value: safeNonNegativeCount(totales?.fail),
      accent: 'error',
      icon: 'fail',
    },
    {
      id: 'creados',
      label: 'Docs creados',
      value: safeNonNegativeCount(docs?.creados),
      accent: 'default',
      icon: 'created',
    },
    {
      id: 'desactivados',
      label: 'Docs desactivados',
      value: safeNonNegativeCount(docs?.desactivados),
      accent: 'warning',
      icon: 'disabled',
    },
    {
      id: 'eliminados',
      label: 'Archivos eliminados',
      value: safeNonNegativeCount(docs?.archivosEliminados),
      accent: 'default',
      icon: 'deleted',
    },
  ];
}

export function buildAuditOutcomeData(
  stats: AuditStatsResponse | null | undefined,
): AuditOutcomeDatum[] {
  const ok = safeNonNegativeCount(stats?.totales?.ok);
  const fail = safeNonNegativeCount(stats?.totales?.fail);
  if (ok === 0 && fail === 0) return [];
  return [
    { name: 'OK', value: ok },
    { name: 'Fallo', value: fail },
  ];
}

export function buildActionsByUserData(
  stats: AuditStatsResponse | null | undefined,
  options?: { topN?: number; labelMax?: number },
): { items: AuditUserActionDatum[]; truncated: boolean; totalUsers: number } {
  const topN = options?.topN ?? TOP_USERS;
  const labelMax = options?.labelMax ?? DEFAULT_LABEL_MAX;
  const source = Array.isArray(stats?.porUsuario) ? stats!.porUsuario : [];

  const sorted = source
    .map((row) => {
      const fullLabel = actorDisplayName(row?.actorEmail, row?.actorUserId);
      return {
        label: truncateLabel(fullLabel, labelMax),
        fullLabel,
        value: safeNonNegativeCount(row?.count),
      } satisfies AuditUserActionDatum;
    })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  return {
    items: sorted.slice(0, topN),
    truncated: sorted.length > topN,
    totalUsers: sorted.length,
  };
}

export function buildSensitiveActionsData(
  stats: AuditStatsResponse | null | undefined,
  options?: { topN?: number; labelMax?: number },
): { items: SensitiveAuditDatum[]; truncated: boolean; totalUsers: number } {
  const topN = options?.topN ?? TOP_USERS;
  const labelMax = options?.labelMax ?? DEFAULT_LABEL_MAX;
  const source = Array.isArray(stats?.sensiblesPorUsuario) ? stats!.sensiblesPorUsuario : [];

  const sorted = source
    .map((row) => {
      const fullLabel = actorDisplayName(row?.actorEmail, row?.actorUserId);
      return {
        label: truncateLabel(fullLabel, labelMax),
        fullLabel,
        value: safeNonNegativeCount(row?.count),
        level: trafficLevelToSensitive(row?.nivel),
      } satisfies SensitiveAuditDatum;
    })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  return {
    items: sorted.slice(0, topN),
    truncated: sorted.length > topN,
    totalUsers: sorted.length,
  };
}

export function outcomeTotal(data: AuditOutcomeDatum[]): number {
  return data.reduce((acc, d) => acc + safeNonNegativeCount(d.value), 0);
}
