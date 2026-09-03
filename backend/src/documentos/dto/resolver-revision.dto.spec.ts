import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ResolverRevisionDto } from './resolver-revision.dto';

describe('ResolverRevisionDto', () => {
  it('rechaza RECHAZADO sin motivo', async () => {
    const dto = plainToInstance(ResolverRevisionDto, { decision: 'RECHAZADO' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'motivo')).toBe(true);
  });

  it('acepta RECHAZADO con motivo', async () => {
    const dto = plainToInstance(ResolverRevisionDto, {
      decision: 'RECHAZADO',
      motivo: 'Falta anexo obligatorio',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('acepta APROBADO sin motivo', async () => {
    const dto = plainToInstance(ResolverRevisionDto, { decision: 'APROBADO' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rechaza RECHAZADO con motivo solo espacios', async () => {
    const dto = plainToInstance(ResolverRevisionDto, {
      decision: 'RECHAZADO',
      motivo: '   ',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'motivo')).toBe(true);
  });
});
