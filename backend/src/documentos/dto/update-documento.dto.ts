import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

import { NIVELES_CONFIDENCIALIDAD } from './create-documento.dto';

export class UpdateDocumentoDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(250)
  asunto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descripcion?: string | null;

  @IsOptional()
  @IsDateString()
  fechaDocumento?: string;

  @IsOptional()
  @IsUUID()
  tipoDocumentalId?: string;

  @IsOptional()
  @IsUUID()
  subserieId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  estado?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @ValidateIf((_: unknown, v: unknown) => v != null && v !== '')
  @IsUUID()
  dependenciaId?: string | null;

  @IsOptional()
  @IsIn(NIVELES_CONFIDENCIALIDAD as unknown as string[])
  nivelConfidencialidad?: (typeof NIVELES_CONFIDENCIALIDAD)[number];
}
