import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

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
}
