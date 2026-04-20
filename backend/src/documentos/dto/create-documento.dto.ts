import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateDocumentoDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(64)
  codigo!: string;

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
}
