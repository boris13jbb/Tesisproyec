import {
  computeFechaLimiteSla,
  computeSlaEstado,
  diasEnRevision,
  slaDiasRevisionFromEnv,
} from './documento-sla.util';

describe('documento-sla.util', () => {
  it('slaDiasRevisionFromEnv clamp 1–90 y default 5', () => {
    expect(slaDiasRevisionFromEnv(undefined)).toBe(5);
    expect(slaDiasRevisionFromEnv('0')).toBe(5);
    expect(slaDiasRevisionFromEnv('90')).toBe(90);
    expect(slaDiasRevisionFromEnv('91')).toBe(90);
  });

  it('límites temporales: un segundo antes/después del deadline', () => {
    const limite = new Date('2026-01-10T12:00:00.000Z');
    expect(computeSlaEstado(limite, new Date('2026-01-10T11:59:59.000Z'))).toBe(
      'POR_VENCER',
    );
    expect(computeSlaEstado(limite, new Date('2026-01-10T12:00:00.000Z'))).toBe(
      'POR_VENCER',
    );
    expect(computeSlaEstado(limite, new Date('2026-01-10T12:00:01.000Z'))).toBe(
      'VENCIDO',
    );
    expect(computeSlaEstado(limite, new Date('2026-01-08T12:00:00.000Z'))).toBe(
      'EN_PLAZO',
    );
    expect(computeSlaEstado(null)).toBe('SIN_SLA');
  });

  it('fecha límite suma días calendario (no cambia arquitectura)', () => {
    const ingreso = new Date('2026-01-01T08:00:00.000Z');
    const limite = computeFechaLimiteSla(ingreso, 5);
    expect(limite.toISOString().slice(0, 10)).toBe('2026-01-06');
  });

  it('diasEnRevision no es negativo', () => {
    const ingreso = new Date('2026-01-10T00:00:00.000Z');
    expect(diasEnRevision(ingreso, new Date('2026-01-09T00:00:00.000Z'))).toBe(
      0,
    );
    expect(diasEnRevision(null)).toBeNull();
  });
});
