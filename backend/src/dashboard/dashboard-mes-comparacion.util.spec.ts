import { computeActividadMes } from './dashboard-mes-comparacion.util';

describe('computeActividadMes', () => {
  const series = [
    { anio: 2026, mes: 7, cantidad: 10 },
    { anio: 2026, mes: 8, cantidad: 18 },
    { anio: 2026, mes: 9, cantidad: 0 },
  ];

  it('calcula variación positiva', () => {
    const now = new Date(2026, 7, 15); // agosto
    const r = computeActividadMes(series, now);
    expect(r.esteMes).toBe(18);
    expect(r.mesAnterior).toBe(10);
    expect(r.variacionPorcentaje).toBe(80);
    expect(r.mensaje).toContain('aumentó');
  });

  it('calcula variación negativa cuando el mes actual cae a cero', () => {
    const now = new Date(2026, 8, 1); // septiembre
    const r = computeActividadMes(series, now);
    expect(r.esteMes).toBe(0);
    expect(r.mesAnterior).toBe(18);
    expect(r.variacionPorcentaje).toBe(-100);
    expect(r.mensaje).toContain('disminuyó');
  });

  it('mensaje cuando mes anterior es cero y actual tiene datos', () => {
    const s = [
      { anio: 2026, mes: 8, cantidad: 0 },
      { anio: 2026, mes: 9, cantidad: 5 },
    ];
    const now = new Date(2026, 8, 10);
    const r = computeActividadMes(s, now);
    expect(r.variacionPorcentaje).toBeNull();
    expect(r.mensaje).toContain('mes anterior');
  });

  it('ambos meses en cero devuelve mensaje null', () => {
    const s = [
      { anio: 2026, mes: 8, cantidad: 0 },
      { anio: 2026, mes: 9, cantidad: 0 },
    ];
    const now = new Date(2026, 8, 10);
    const r = computeActividadMes(s, now);
    expect(r.mensaje).toBeNull();
  });
});
