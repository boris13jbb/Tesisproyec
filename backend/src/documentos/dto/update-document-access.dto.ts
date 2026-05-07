import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateDocumentAccessDto {
  /** INHERIT aplica reglas actuales; RESTRICTED requiere ACL explícita. */
  @IsIn(['INHERIT', 'RESTRICTED'])
  accessPolicy!: 'INHERIT' | 'RESTRICTED';

  /** Usuarios con acceso READ cuando el documento está en RESTRICTED. */
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  userIds!: string[];

  /** Roles con acceso READ cuando el documento está en RESTRICTED. */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  roleCodigos?: string[];
}
