import { BadRequestException } from '@nestjs/common';
import { assertFechaEmisionNoFutura } from './date-validation.util';

function localDate(offsetDays: number): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate() + offsetDays);
}

describe('assertFechaEmisionNoFutura', () => {
  it('acepta ayer', () => {
    expect(() => assertFechaEmisionNoFutura(localDate(-1))).not.toThrow();
  });

  it('acepta hoy', () => {
    expect(() => assertFechaEmisionNoFutura(localDate(0))).not.toThrow();
  });

  it('rechaza mañana', () => {
    expect(() => assertFechaEmisionNoFutura(localDate(1))).toThrow(
      BadRequestException,
    );
  });
});
