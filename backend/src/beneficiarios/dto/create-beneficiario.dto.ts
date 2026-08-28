import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateBeneficiarioDto {
  @IsIn(['NATURAL', 'JURIDICA'])
  tipo!: 'NATURAL' | 'JURIDICA';

  @IsOptional()
  @IsString()
  @MaxLength(10)
  cedula?: string;

  @IsOptional()
  @IsString()
  @MaxLength(13)
  ruc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombres?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  apellidos?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  razonSocial?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  correo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  direccion?: string;
}
