import { BadRequestException } from '@nestjs/common';
import {
  assertAuditDateRange,
  buildAuditWhere,
  parseOptionalAuditIsoDate,
  resolveAuditPaging,
} from './audit-list.util';

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

describe('parseOptionalAuditIsoDate / assertAuditDateRange', () => {
  it('rechaza fechas inválidas', () => {
    expect(() => parseOptionalAuditIsoDate('not-a-date')).toThrow(
      BadRequestException,
    );
  });

  it('rechaza from posterior a to', () => {
    const from = new Date('2026-09-02T00:00:00.000Z');
    const to = new Date('2026-09-01T00:00:00.000Z');
    expect(() => assertAuditDateRange(from, to)).toThrow(BadRequestException);
  });

  it('acepta rango válido o fecha vacía', () => {
    expect(parseOptionalAuditIsoDate(undefined)).toBeUndefined();
    expect(parseOptionalAuditIsoDate('')).toBeUndefined();
    const from = new Date('2026-09-01T00:00:00.000Z');
    const to = new Date('2026-09-02T00:00:00.000Z');
    expect(() => assertAuditDateRange(from, to)).not.toThrow();
  });
});

describe('resolveAuditPaging', () => {
  it('clampa pageSize enorme y corrige page negativa/NaN', () => {
    expect(resolveAuditPaging('-3', '99999')).toEqual({
      page: 1,
      pageSize: 100,
      skip: 0,
    });
    expect(resolveAuditPaging('abc', 'xyz')).toEqual({
      page: 1,
      pageSize: 10,
      skip: 0,
    });
    expect(resolveAuditPaging('0', '0')).toEqual({
      page: 1,
      pageSize: 5,
      skip: 0,
    });
    expect(resolveAuditPaging('2', '20')).toEqual({
      page: 2,
      pageSize: 20,
      skip: 20,
    });
  });
});
