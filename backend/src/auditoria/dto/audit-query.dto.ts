import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class AuditQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  action?: string;

  @IsOptional()
  @IsIn(['OK', 'FAIL'])
  result?: 'OK' | 'FAIL';

  /** Filtro exacto por actor (prioridad sobre `actorEmail`). */
  @IsOptional()
  @IsUUID('4')
  actorUserId?: string;

  @IsOptional()
  @IsString()
  actorEmail?: string;

  @IsOptional()
  @IsString()
  resourceType?: string;

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsOptional()
  @IsString()
  from?: string; // ISO date

  @IsOptional()
  @IsString()
  to?: string; // ISO date

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  pageSize?: string;
}
