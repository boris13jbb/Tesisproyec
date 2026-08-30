export const ADMINISTRATIVE_LOCALE = 'es-EC';

/** Mayúsculas mientras el usuario escribe (sin trim). */
export function toAdministrativeInputUppercase(value: string): string {
  return value.toLocaleUpperCase(ADMINISTRATIVE_LOCALE);
}

/** Normalización al guardar: trim + mayúsculas. */
export function normalizeAdministrativeText(value: string | null | undefined): string {
  return (value ?? '').trim().toLocaleUpperCase(ADMINISTRATIVE_LOCALE);
}

export function todayIsoDateLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isFechaEmisionValida(isoDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;
  return isoDate <= todayIsoDateLocal();
}

export function fechaEmisionErrorMessage(isoDate: string): string | null {
  if (!isoDate) return 'Fecha requerida';
  if (!isFechaEmisionValida(isoDate)) {
    return 'La fecha de emisión no puede ser posterior a hoy';
  }
  return null;
}
