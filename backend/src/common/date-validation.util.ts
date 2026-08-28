import { BadRequestException } from '@nestjs/common';

function calendarDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function todayCalendarDate(): Date {
  return calendarDateOnly(new Date());
}

/**
 * Fecha de emisión del documento: hoy o anterior (no futura).
 */
export function assertFechaEmisionNoFutura(fecha: Date): void {
  if (Number.isNaN(fecha.getTime())) {
    throw new BadRequestException('Fecha del documento inválida');
  }
  if (calendarDateOnly(fecha).getTime() > todayCalendarDate().getTime()) {
    throw new BadRequestException(
      'La fecha de emisión no puede ser posterior al día actual',
    );
  }
}

/** Fecha de vencimiento: puede ser futura; solo valida que sea parseable. */
export function parseFechaVencimientoOptional(
  raw: string | null | undefined,
): Date | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || raw.trim() === '') return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException('Fecha de vencimiento inválida');
  }
  return d;
}
