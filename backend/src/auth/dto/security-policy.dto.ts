import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * Política institucional persistida (gobierno/ISO 15489).
 * No contiene secretos; se audita al actualizar.
 */
export class UpdateSecurityPolicyDto {
  @IsInt()
  @Min(8)
  @Max(128)
  desiredPasswordMinLength!: number;

  @IsBoolean()
  desiredLockoutEnabled!: boolean;

  @IsInt()
  @Min(1)
  @Max(50)
  desiredLockoutMaxAttempts!: number;

  @IsInt()
  @Min(1)
  @Max(1440)
  desiredLockoutMinutes!: number;

  /** Formato corto (p. ej. 15m, 1h). No se valida semántica completa aquí. */
  @IsString()
  desiredJwtAccessExpiresIn!: string;

  @IsInt()
  @Min(1)
  @Max(365)
  desiredRefreshSessionDays!: number;

  @IsInt()
  @Min(0)
  @Max(24)
  desiredPasswordHistoryCount!: number;

  @IsBoolean()
  desiredAdminStepUpAuth!: boolean;

  @IsOptional()
  @IsString()
  @Max(800)
  notes?: string;
}
