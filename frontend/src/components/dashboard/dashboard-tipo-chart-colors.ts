import type { Theme } from '@mui/material/styles';

/** Paleta institucional reutilizable para tipos documentales en donut, barras y leyendas. */
const PALETTE_KEYS: Array<
  'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
> = ['primary', 'secondary', 'info', 'success', 'warning', 'error'];

export function colorForTipoCodigo(codigo: string, theme: Theme): string {
  const idx =
    codigo === 'OTROS'
      ? PALETTE_KEYS.length - 1
      : [...codigo].reduce((s, c) => s + c.charCodeAt(0), 0) % PALETTE_KEYS.length;
  const key = PALETTE_KEYS[idx];
  return theme.palette[key].main;
}

export function buildTipoColorMap(
  codigos: string[],
  theme: Theme,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of codigos) {
    map.set(c, colorForTipoCodigo(c, theme));
  }
  return map;
}
