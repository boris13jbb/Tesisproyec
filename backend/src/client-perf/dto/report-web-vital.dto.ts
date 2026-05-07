import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Evento RUM mínimo: solo LCP del panel (sin PII en payload). */
export class ReportWebVitalDto {
  @IsIn(['LCP'])
  metric!: 'LCP';

  @IsNumber()
  @Min(0)
  @Max(120_000)
  valueMs!: number;

  @IsIn(['good', 'needs-improvement', 'poor'])
  rating!: 'good' | 'needs-improvement' | 'poor';

  @IsOptional()
  @IsString()
  @MaxLength(512)
  pathname?: string;

  /**
   * `navigate` | `reload` | `back-forward` | `prerender` | etc. (Navigation Timing).
   * Sin validación estricta: solo recortamos longitud en meta.
   */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  navigationType?: string;

  /** ID de instancia de `web-vitals` (deduplicación en analítica). */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  metricId?: string;
}
