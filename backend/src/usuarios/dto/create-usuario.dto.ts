import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateUsuarioDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password!: string;

  @IsOptional()
  @IsString()
  nombres?: string;

  @IsOptional()
  @IsString()
  apellidos?: string;

  @IsOptional()
  @IsUUID()
  dependenciaId?: string;

  @IsOptional()
  @IsUUID()
  cargoId?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  /** Códigos de rol (`Role.codigo`). Si se omite, se asigna `USUARIO`. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  /**
   * Si es `true` (por defecto al omitir): tras crear la cuenta se envía un correo con enlace
   * para que el usuario defina su contraseña (misma mecánica que recuperación, token de un solo uso).
   */
  @IsOptional()
  @IsBoolean()
  invitarPorCorreo?: boolean;
}
