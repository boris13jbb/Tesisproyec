import { Transform } from 'class-transformer';
import {
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class ResolverRevisionDto {
  @IsIn(['APROBADO', 'RECHAZADO'])
  decision!: 'APROBADO' | 'RECHAZADO';

  /** Obligatorio si decision === RECHAZADO (trazabilidad ISO 15489 / revisión). */
  @ValidateIf((o: ResolverRevisionDto) => o.decision === 'RECHAZADO')
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  @IsString({ message: 'El motivo del rechazo debe ser texto' })
  @MinLength(3, {
    message: 'El motivo del rechazo es obligatorio (mínimo 3 caracteres)',
  })
  @MaxLength(2000)
  motivo?: string;
}
