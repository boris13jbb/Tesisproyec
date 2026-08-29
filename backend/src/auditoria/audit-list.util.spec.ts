import { buildAuditWhere } from './audit-list.util';

describe('buildAuditWhere', () => {
  it('filtra DOC_DEACTIVATED por igualdad exacta (no contains)', () => {
    const where = buildAuditWhere({ action: 'DOC_DEACTIVATED' });
    expect(where.action).toBe('DOC_DEACTIVATED');
  });

  it('aplica paginación lógica de rango de fechas cuando hay from/to', () => {
    const from = new Date('2026-08-01T00:00:00.000Z');
    const to = new Date('2026-08-31T23:59:59.000Z');
    const where = buildAuditWhere({ from, to });
    expect(where.createdAt).toEqual({ gte: from, lte: to });
  });
});
