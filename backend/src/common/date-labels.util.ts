const MESES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

export function mesNombreEc(mes1a12: number): string {
  const idx = Math.max(1, Math.min(12, mes1a12)) - 1;
  return MESES_ES[idx] ?? String(mes1a12);
}

export function mesCortoEc(mes1a12: number): string {
  return mesNombreEc(mes1a12).slice(0, 3);
}
