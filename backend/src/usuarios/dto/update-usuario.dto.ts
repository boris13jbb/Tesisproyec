import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class UpdateUsuarioDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password?: string;

  @IsOptional()
  @IsString()
  nombres?: string;

  @IsOptional()
  @IsString()
  apellidos?: string;

  @IsOptional()
  @IsUUID()
  dependenciaId?: string | null;

  @IsOptional()
  @IsUUID()
  cargoId?: string | null;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  /** Códigos de rol (`Role.codigo`). Si se envía, reemplaza la asignación actual. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];
}
