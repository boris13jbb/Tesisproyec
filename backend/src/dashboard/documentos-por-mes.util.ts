export type DashboardMesRange = {
  anio: number;
  mes: number;
  desde: Date;
  hasta: Date;
};

export type DocumentoPorMesFilled = {
  anio: number;
  mes: number;
  nombreMes: string;
  cantidad: number;
};

export function monthKey(anio: number, mes: number): string {
  return `${anio}-${mes}`;
}

export function buildUltimos12MesesRanges(now: Date): DashboardMesRange[] {
  const ranges: DashboardMesRange[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const anio = d.getFullYear();
    const mes = d.getMonth() + 1;
    const desde = new Date(anio, mes - 1, 1, 0, 0, 0, 0);
    const hasta = new Date(anio, mes, 0, 23, 59, 59, 999);
    ranges.push({ anio, mes, desde, hasta });
  }
  return ranges;
}

/** Completa 12 meses en orden cronológico, incluyendo ceros. */
export function fillDocumentosPorMesSeries(
  ranges: DashboardMesRange[],
  countsByYearMonth: Map<string, number>,
  mesNombre: (mes: number) => string,
): DocumentoPorMesFilled[] {
  return ranges.map((r) => ({
    anio: r.anio,
    mes: r.mes,
    nombreMes: mesNombre(r.mes),
    cantidad: countsByYearMonth.get(monthKey(r.anio, r.mes)) ?? 0,
  }));
}

export function aggregateCreatedAtByMonth(
  createdAtList: Date[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const d of createdAtList) {
    const key = monthKey(d.getFullYear(), d.getMonth() + 1);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}
