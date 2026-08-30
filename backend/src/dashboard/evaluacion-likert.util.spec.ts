import {
  buildEvaluacionLikertSummary,
  classifyDocumentoLikert,
  emptyEvaluacionLikertSummary,
  LIKERT_DIAS_UMBRAL_DEFAULT,
} from './evaluacion-likert.util';

describe('evaluacion-likert.util', () => {
  const now = new Date('2026-08-30T12:00:00.000Z');

  it('clasifica óptimo si está activo y actualizado recientemente', () => {
    expect(
      classifyDocumentoLikert(
        {
          activo: true,
          estado: 'APROBADO',
          updatedAt: new Date('2026-08-20T12:00:00.000Z'),
        },
        now,
      ),
    ).toBe('OPTIMO');
  });

  it('clasifica moderado si supera el umbral de días', () => {
    expect(
      classifyDocumentoLikert(
        {
          activo: true,
          estado: 'REGISTRADO',
          updatedAt: new Date('2026-06-01T12:00:00.000Z'),
        },
        now,
        LIKERT_DIAS_UMBRAL_DEFAULT,
      ),
    ).toBe('MODERADO');
  });

  it('clasifica crítico si está inactivo', () => {
    expect(
      classifyDocumentoLikert(
        {
          activo: false,
          estado: 'APROBADO',
          updatedAt: new Date('2026-08-20T12:00:00.000Z'),
        },
        now,
      ),
    ).toBe('CRITICO');
  });

  it('clasifica crítico si está rechazado', () => {
    expect(
      classifyDocumentoLikert(
        {
          activo: true,
          estado: 'RECHAZADO',
          updatedAt: new Date('2026-08-28T12:00:00.000Z'),
        },
        now,
      ),
    ).toBe('CRITICO');
  });

  it('clasifica crítico si EN_REVISION con SLA vencido', () => {
    expect(
      classifyDocumentoLikert(
        {
          activo: true,
          estado: 'EN_REVISION',
          updatedAt: new Date('2026-08-28T12:00:00.000Z'),
          fechaLimiteSla: new Date('2026-08-25T12:00:00.000Z'),
        },
        now,
      ),
    ).toBe('CRITICO');
  });

  it('EN_REVISION sin SLA vencido y reciente → óptimo', () => {
    expect(
      classifyDocumentoLikert(
        {
          activo: true,
          estado: 'EN_REVISION',
          updatedAt: new Date('2026-08-28T12:00:00.000Z'),
          fechaLimiteSla: new Date('2026-09-05T12:00:00.000Z'),
        },
        now,
      ),
    ).toBe('OPTIMO');
  });

  it('agrega resumen y porcentajes', () => {
    const summary = buildEvaluacionLikertSummary(
      [
        {
          activo: true,
          estado: 'APROBADO',
          updatedAt: new Date('2026-08-20T12:00:00.000Z'),
        },
        {
          activo: true,
          estado: 'APROBADO',
          updatedAt: new Date('2026-08-15T12:00:00.000Z'),
        },
        {
          activo: true,
          estado: 'REGISTRADO',
          updatedAt: new Date('2026-05-01T12:00:00.000Z'),
        },
        {
          activo: false,
          estado: 'BORRADOR',
          updatedAt: new Date('2026-08-01T12:00:00.000Z'),
        },
      ],
      now,
    );
    expect(summary.total).toBe(4);
    expect(summary.optimo).toBe(2);
    expect(summary.moderado).toBe(1);
    expect(summary.critico).toBe(1);
    expect(summary.niveles).toHaveLength(3);
    expect(summary.niveles[0].percent).toBe(50);
  });

  it('vacío → ceros', () => {
    expect(emptyEvaluacionLikertSummary().total).toBe(0);
    expect(buildEvaluacionLikertSummary([], now).critico).toBe(0);
  });
});
