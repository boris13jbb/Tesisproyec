import { BadRequestException } from '@nestjs/common';
import {
  assertEstadoNoResuelveRevisionViaPatch,
  assertTransicionEstado,
  normalizeDocumentoEstado,
} from './documento-estado.util';

describe('documento-estado.util', () => {
  it('normaliza estados conocidos', () => {
    expect(normalizeDocumentoEstado(' registrado ')).toBe('REGISTRADO');
  });

  it('permite REGISTRADO → EN_REVISION', () => {
    expect(() =>
      assertTransicionEstado('REGISTRADO', 'EN_REVISION'),
    ).not.toThrow();
  });

  it('permite EN_REVISION → APROBADO en la máquina de estados', () => {
    expect(() =>
      assertTransicionEstado('EN_REVISION', 'APROBADO'),
    ).not.toThrow();
  });

  it('bloquea PATCH que resuelve a APROBADO', () => {
    expect(() =>
      assertEstadoNoResuelveRevisionViaPatch('EN_REVISION', 'APROBADO'),
    ).toThrow(BadRequestException);
  });

  it('bloquea PATCH que resuelve a RECHAZADO', () => {
    expect(() =>
      assertEstadoNoResuelveRevisionViaPatch('EN_REVISION', 'RECHAZADO'),
    ).toThrow(BadRequestException);
  });

  it('permite PATCH con el mismo estado APROBADO (sin cambio)', () => {
    expect(() =>
      assertEstadoNoResuelveRevisionViaPatch('APROBADO', 'APROBADO'),
    ).not.toThrow();
  });

  it('permite PATCH REGISTRADO → ARCHIVADO', () => {
    expect(() =>
      assertEstadoNoResuelveRevisionViaPatch('REGISTRADO', 'ARCHIVADO'),
    ).not.toThrow();
    expect(() =>
      assertTransicionEstado('REGISTRADO', 'ARCHIVADO'),
    ).not.toThrow();
  });
});
