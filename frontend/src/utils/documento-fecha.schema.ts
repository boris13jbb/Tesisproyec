import { z } from 'zod';
import { fechaEmisionErrorMessage } from './text-normalize';

/** Esquema único de fecha de emisión (ayer/hoy válidos; mañana inválido). */
export const fechaDocumentoEmisionSchema = z
  .string()
  .min(10, 'Fecha requerida')
  .refine((v) => fechaEmisionErrorMessage(v) === null, {
    message: 'La fecha de emisión no puede ser posterior a hoy',
  });
