import {
  ACTIVIDAD_DOCUMENTAL_PERIODO_DEFAULT,
  mergeDocumentoWhereWithActividadPeriodo,
  normalizeActividadPeriodo,
  resolveActividadPeriodoCreatedAtFilter,
} from './actividad-periodo.util';

describe('actividad-periodo.util', () => {
  const now = new Date(2026, 8, 15, 14, 30, 0, 0);

  it('default es histórico', () => {
    expect(normalizeActividadPeriodo(undefined)).toBe(
      ACTIVIDAD_DOCUMENTAL_PERIODO_DEFAULT,
    );
    expect(normalizeActividadPeriodo('invalid')).toBe('historico');
  });

  it('histórico no aplica filtro createdAt', () => {
    expect(resolveActividadPeriodoCreatedAtFilter('historico', now)).toBeNull();
    const where = mergeDocumentoWhereWithActividadPeriodo(
      { activo: true },
      'historico',
      now,
    );
    expect(where).toEqual({ activo: true });
  });

  it('este mes delimita inicio y fin de mes calendario', () => {
    const filter = resolveActividadPeriodoCreatedAtFilter('mes', now);
    expect(filter?.gte).toEqual(new Date(2026, 8, 1, 0, 0, 0, 0));
    expect(filter?.lt).toEqual(new Date(2026, 9, 1, 0, 0, 0, 0));
  });

  it('últimos 3 meses desde inicio del mes tres meses atrás', () => {
    const filter = resolveActividadPeriodoCreatedAtFilter('3m', now);
    expect(filter?.gte).toEqual(new Date(2026, 5, 1, 0, 0, 0, 0));
    expect(filter?.lt).toBeUndefined();
  });

  it('este año desde 1 de enero', () => {
    const filter = resolveActividadPeriodoCreatedAtFilter('anio', now);
    expect(filter?.gte).toEqual(new Date(2026, 0, 1, 0, 0, 0, 0));
  });

  it('mes en enero cruza año correctamente para 3m', () => {
    const jan = new Date(2026, 0, 10);
    const filter = resolveActividadPeriodoCreatedAtFilter('3m', jan);
    expect(filter?.gte).toEqual(new Date(2025, 9, 1, 0, 0, 0, 0));
  });
});
