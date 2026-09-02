/** Utilidades compartidas del dashboard (fechas, saludo, formato). */

export function formatDashboardNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('es-EC').format(n);
}

export function formatPercentOfTotal(value: number, total: number): string | undefined {
  if (total <= 0) return undefined;
  const pct = Math.round((value / total) * 100);
  return `${pct} % del total`;
}

export function greetingForHour(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function formatLongDateEc(date = new Date()): string {
  return new Intl.DateTimeFormat('es-EC', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatTimeEc(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(d);
}

export function formatShortDateEc(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatRelativeEs(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return formatShortDateEc(iso);
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'Hace un momento';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `Hace ${days} d`;
  return formatShortDateEc(iso);
}

export function displayUserFirstName(
  nombres?: string | null,
  apellidos?: string | null,
  email?: string | null,
): string {
  const joined = `${nombres ?? ''} ${apellidos ?? ''}`.trim();
  if (joined) {
    return joined.split(/\s+/)[0] ?? joined;
  }
  return email?.split('@')[0] ?? 'usuario';
}
