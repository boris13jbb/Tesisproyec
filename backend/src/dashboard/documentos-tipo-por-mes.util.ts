import { monthKey, type DashboardMesRange } from './documentos-por-mes.util';
import type { TipoCountRaw } from './documentos-distribucion-tipo.util';

export type TipoDocumentalSerie = {
  codigo: string;
  nombre: string;
};

export type TipoPorMesSegmento = {
  codigo: string;
  nombre: string;
  cantidad: number;
};

export type TipoPorMesItem = {
  anio: number;
  mes: number;
  nombreMes: string;
  tipos: TipoPorMesSegmento[];
  total: number;
};

type DocRow = {
  createdAt: Date;
  tipoCodigo: string;
  tipoNombre: string;
};

/**
 * Agrupa documentos por mes y tipo documental (composición, no total duplicado).
 * Mantiene top N tipos globales del período; el resto se agrupa en «Otros».
 */
export function buildTiposPorMes(
  ranges: DashboardMesRange[],
  rows: DocRow[],
  mesNombre: (mes: number) => string,
  topN = 5,
): { series: TipoDocumentalSerie[]; items: TipoPorMesItem[] } {
  const globalTotals = new Map<string, TipoCountRaw>();
  for (const r of rows) {
    const prev = globalTotals.get(r.tipoCodigo);
    if (prev) {
      prev.cantidad += 1;
    } else {
      globalTotals.set(r.tipoCodigo, {
        codigo: r.tipoCodigo,
        nombre: r.tipoNombre,
        cantidad: 1,
      });
    }
  }

  const sortedGlobal = [...globalTotals.values()].sort(
    (a, b) => b.cantidad - a.cantidad,
  );
  const headCodes = sortedGlobal.slice(0, topN).map((t) => t.codigo);
  const headSet = new Set(headCodes);

  const series: TipoDocumentalSerie[] = sortedGlobal
    .filter((t) => headSet.has(t.codigo))
    .map((t) => ({ codigo: t.codigo, nombre: t.nombre }));

  const hasOtros = sortedGlobal.some((t) => !headSet.has(t.codigo));
  if (hasOtros) {
    series.push({ codigo: 'OTROS', nombre: 'Otros' });
  }

  const monthMap = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const mk = monthKey(r.createdAt.getFullYear(), r.createdAt.getMonth() + 1);
    const code = headSet.has(r.tipoCodigo) ? r.tipoCodigo : 'OTROS';
    const inner = monthMap.get(mk) ?? new Map<string, number>();
    inner.set(code, (inner.get(code) ?? 0) + 1);
    monthMap.set(mk, inner);
  }

  const items: TipoPorMesItem[] = ranges.map((range) => {
    const mk = monthKey(range.anio, range.mes);
    const inner = monthMap.get(mk) ?? new Map<string, number>();
    const tipos: TipoPorMesSegmento[] = series.map((s) => ({
      codigo: s.codigo,
      nombre: s.nombre,
      cantidad: inner.get(s.codigo) ?? 0,
    }));
    const total = tipos.reduce((s, t) => s + t.cantidad, 0);
    return {
      anio: range.anio,
      mes: range.mes,
      nombreMes: mesNombre(range.mes),
      tipos,
      total,
    };
  });

  return { series, items };
}
