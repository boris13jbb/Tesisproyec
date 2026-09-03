import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Desbloqueo administrativo controlado.
 * El estado destino (REGISTRADO), actor y timestamp los decide el servidor.
 */
export class DesbloquearDocumentoDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'El motivo del desbloqueo debe ser texto' })
  @MinLength(3, {
    message: 'El motivo del desbloqueo es obligatorio (mínimo 3 caracteres)',
  })
  @MaxLength(2000)
  motivo!: string;
}
