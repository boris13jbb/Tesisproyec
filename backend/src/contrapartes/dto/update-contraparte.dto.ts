import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ToSafeBoolean } from '../../common/strict-boolean.util';

export class UpdateContraparteDto {
  @IsOptional()
  @IsIn(['NATURAL', 'JURIDICA'])
  tipo?: 'NATURAL' | 'JURIDICA';

  @IsOptional()
  @IsString()
  @MaxLength(10)
  cedula?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(13)
  ruc?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombres?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  apellidos?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  razonSocial?: string | null;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  correo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  telefono?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  direccion?: string | null;

  @IsOptional()
  @ToSafeBoolean()
  @IsBoolean()
  activo?: boolean;
}
