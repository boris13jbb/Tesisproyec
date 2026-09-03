import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DesbloquearDocumentoDto } from './desbloquear-documento.dto';

describe('DesbloquearDocumentoDto', () => {
  it('rechaza motivo vacío', async () => {
    const dto = plainToInstance(DesbloquearDocumentoDto, { motivo: '' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'motivo')).toBe(true);
  });

  it('rechaza motivo solo espacios', async () => {
    const dto = plainToInstance(DesbloquearDocumentoDto, { motivo: '   ' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'motivo')).toBe(true);
  });

  it('acepta motivo válido', async () => {
    const dto = plainToInstance(DesbloquearDocumentoDto, {
      motivo: '  Corrección formal de expediente  ',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.motivo).toBe('Corrección formal de expediente');
  });
});
