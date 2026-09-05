import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ToSafeBoolean } from '../../common/strict-boolean.util';

export class UpdateCargoDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string | null;

  @IsOptional()
  @IsUUID()
  dependenciaId?: string | null;

  @IsOptional()
  @ToSafeBoolean()
  @IsBoolean()
  activo?: boolean;
}
