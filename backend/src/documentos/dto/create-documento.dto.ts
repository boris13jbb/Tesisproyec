import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

import type { DocumentoEstado } from '../documento-estado.util';

/** Solo estos estados se permiten al crear (captura borrador institucional). */
const ESTADOS_INICIALES: DocumentoEstado[] = ['BORRADOR', 'REGISTRADO'];

export const NIVELES_CONFIDENCIALIDAD = [
  'PUBLICO',
  'INTERNO',
  'RESERVADO',
  'CONFIDENCIAL',
] as const;

export class CreateDocumentoDto {
  /** Si se omite o llega vacío, el servidor asigna el siguiente correlativo único. */
  @IsOptional()
  @ValidateIf((o: CreateDocumentoDto) => typeof o.codigo === 'string' && o.codigo.trim() !== '')
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  codigo?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(250)
  asunto!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descripcion?: string;

  /** ISO date-time (ej. 2026-04-20T12:00:00.000Z) */
  @IsDateString()
  fechaDocumento!: string;

  @IsUUID()
  tipoDocumentalId!: string;

  @IsUUID()
  subserieId!: string;

  /** Área propietaria (si se omite se usa la dependencia del usuario ADMIN creador si existe). */
  @IsOptional()
  @IsUUID()
  dependenciaId?: string;

  @IsOptional()
  @IsIn(NIVELES_CONFIDENCIALIDAD as unknown as string[])
  nivelConfidencialidad?: (typeof NIVELES_CONFIDENCIALIDAD)[number];

  /** Por defecto en BD: REGISTRADO. */
  @IsOptional()
  @IsString()
  @IsIn(ESTADOS_INICIALES as unknown as string[])
  estado?: DocumentoEstado;
}
