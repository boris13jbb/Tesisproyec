import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class AuditQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  action?: string;

  @IsOptional()
  @IsIn(['OK', 'FAIL'])
  result?: 'OK' | 'FAIL';

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
