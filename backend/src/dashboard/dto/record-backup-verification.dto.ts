import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/** Registry manual de que se verificó un respaldo (auditoría `BACKUP_VERIFIED`). */
export class RecordBackupVerificationDto {
  @IsOptional()
  @IsIn(['OK', 'FAIL'])
  result?: 'OK' | 'FAIL';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  /** Libre p. ej. «Completo», «Incremental», «MySQL+storage». */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  tipoRespaldo?: string;

  /** Tamaño aproximado en bytes (opcional; p. ej. del .sql o .zip). */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === '' || value === undefined || value === null
      ? undefined
      : Number(value),
  )
  @IsInt()
  @Min(0)
  tamanoBytes?: number;

  /** Etiqueta humana alternativa (p. ej. «1,8 GB») si no usa `tamanoBytes`. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  tamanoLabel?: string;
}
