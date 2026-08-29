import {
  aggregateCreatedAtByMonth,
  buildUltimos12MesesRanges,
  fillDocumentosPorMesSeries,
  monthKey,
} from './documentos-por-mes.util';

describe('documentos-por-mes.util', () => {
  it('construye 12 meses cronológicos incluyendo el actual', () => {
    const now = new Date(2026, 7, 15);
    const ranges = buildUltimos12MesesRanges(now);
    expect(ranges).toHaveLength(12);
    expect(ranges[0]).toMatchObject({ anio: 2025, mes: 9 });
    expect(ranges[11]).toMatchObject({ anio: 2026, mes: 8 });
  });

  it('rellena ceros cuando no hay documentos en un mes', () => {
    const now = new Date(2026, 2, 10);
    const ranges = buildUltimos12MesesRanges(now);
    const counts = new Map<string, number>([[monthKey(2026, 3), 4]]);
    const filled = fillDocumentosPorMesSeries(ranges, counts, (m) => `m${m}`);
    expect(filled).toHaveLength(12);
    const marzo = filled.find((x) => x.anio === 2026 && x.mes === 3);
    expect(marzo?.cantidad).toBe(4);
    expect(filled.filter((x) => x.cantidad === 0).length).toBe(11);
  });

  it('agrega createdAt por mes local', () => {
    const map = aggregateCreatedAtByMonth([
      new Date(2026, 0, 2),
      new Date(2026, 0, 20),
      new Date(2026, 1, 1),
    ]);
    expect(map.get(monthKey(2026, 1))).toBe(2);
    expect(map.get(monthKey(2026, 2))).toBe(1);
  });
});
