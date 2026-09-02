import { buildTiposPorMes } from './documentos-tipo-por-mes.util';
import { buildUltimos12MesesRanges } from './documentos-por-mes.util';

describe('buildTiposPorMes', () => {
  const now = new Date(2026, 8, 15); // Sep 2026
  const ranges = buildUltimos12MesesRanges(now);
  const mesNombre = (m: number) => `Mes${m}`;

  it('agrupa por mes y tipo con top 5 + Otros', () => {
    const rows = [
      {
        createdAt: new Date(2026, 7, 10),
        tipoCodigo: 'A',
        tipoNombre: 'Tipo A',
      },
      {
        createdAt: new Date(2026, 7, 12),
        tipoCodigo: 'B',
        tipoNombre: 'Tipo B',
      },
      {
        createdAt: new Date(2026, 7, 14),
        tipoCodigo: 'Z',
        tipoNombre: 'Tipo Z',
      },
    ];
    const { series, items } = buildTiposPorMes(ranges, rows, mesNombre, 2);
    expect(series.map((s) => s.codigo)).toEqual(['A', 'B', 'OTROS']);
    const agosto = items.find((i) => i.mes === 8 && i.anio === 2026);
    expect(agosto?.total).toBe(3);
    expect(agosto?.tipos.find((t) => t.codigo === 'OTROS')?.cantidad).toBe(1);
  });

  it('rellena meses sin actividad con ceros', () => {
    const { items } = buildTiposPorMes(ranges, [], mesNombre);
    expect(items.length).toBe(12);
    expect(items.every((i) => i.total === 0)).toBe(true);
  });
});
