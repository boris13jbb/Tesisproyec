import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  assertContenidoMutable,
  assertEstadoDesbloqueable,
  assertEstadoNoResuelveRevisionViaPatch,
  assertPatchPermitidoEnEstadoProtegido,
  assertTransicionEstado,
  dtoTieneCambioDeContenido,
  esArchivadoStateOnlyDesdeAprobado,
  esEstadoContenidoProtegido,
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

  it('bloquea PATCH REGISTRADO → EN_REVISION (bypass de envío formal)', () => {
    expect(() =>
      assertEstadoNoResuelveRevisionViaPatch('REGISTRADO', 'EN_REVISION'),
    ).toThrow(BadRequestException);
  });

  it('bloquea PATCH RECHAZADO → EN_REVISION (debe usar enviar-revision)', () => {
    expect(() =>
      assertEstadoNoResuelveRevisionViaPatch('RECHAZADO', 'EN_REVISION'),
    ).toThrow(BadRequestException);
  });

  it('permite PATCH REGISTRADO → ARCHIVADO', () => {
    expect(() =>
      assertEstadoNoResuelveRevisionViaPatch('REGISTRADO', 'ARCHIVADO'),
    ).not.toThrow();
    expect(() =>
      assertTransicionEstado('REGISTRADO', 'ARCHIVADO'),
    ).not.toThrow();
  });

  it('permite PATCH BORRADOR → REGISTRADO', () => {
    expect(() =>
      assertEstadoNoResuelveRevisionViaPatch('BORRADOR', 'REGISTRADO'),
    ).not.toThrow();
  });

  it('bloquea PATCH APROBADO → REGISTRADO (bypass de desbloqueo)', () => {
    expect(() =>
      assertEstadoNoResuelveRevisionViaPatch('APROBADO', 'REGISTRADO'),
    ).toThrow(BadRequestException);
    expect(() => assertTransicionEstado('APROBADO', 'REGISTRADO')).toThrow(
      BadRequestException,
    );
  });

  it('bloquea PATCH EN_REVISION → REGISTRADO (bypass de desbloqueo)', () => {
    expect(() =>
      assertEstadoNoResuelveRevisionViaPatch('EN_REVISION', 'REGISTRADO'),
    ).toThrow(BadRequestException);
  });

  it('bloquea PATCH ARCHIVADO → REGISTRADO (bypass de desbloqueo)', () => {
    expect(() =>
      assertEstadoNoResuelveRevisionViaPatch('ARCHIVADO', 'REGISTRADO'),
    ).toThrow(BadRequestException);
  });

  it('marca estados protegidos', () => {
    expect(esEstadoContenidoProtegido('EN_REVISION')).toBe(true);
    expect(esEstadoContenidoProtegido('APROBADO')).toBe(true);
    expect(esEstadoContenidoProtegido('ARCHIVADO')).toBe(true);
    expect(esEstadoContenidoProtegido('REGISTRADO')).toBe(false);
    expect(esEstadoContenidoProtegido('RECHAZADO')).toBe(false);
    expect(esEstadoContenidoProtegido('BORRADOR')).toBe(false);
  });

  it('assertContenidoMutable bloquea EN_REVISION/APROBADO/ARCHIVADO', () => {
    expect(() => assertContenidoMutable('EN_REVISION')).toThrow(
      BadRequestException,
    );
    expect(() => assertContenidoMutable('APROBADO')).toThrow(
      BadRequestException,
    );
    expect(() => assertContenidoMutable('ARCHIVADO')).toThrow(
      BadRequestException,
    );
    expect(() => assertContenidoMutable('REGISTRADO')).not.toThrow();
  });

  it('assertEstadoDesbloqueable solo estados protegidos', () => {
    expect(assertEstadoDesbloqueable('APROBADO')).toBe('APROBADO');
    expect(assertEstadoDesbloqueable('EN_REVISION')).toBe('EN_REVISION');
    expect(assertEstadoDesbloqueable('ARCHIVADO')).toBe('ARCHIVADO');
    expect(() => assertEstadoDesbloqueable('REGISTRADO')).toThrow(
      ConflictException,
    );
    expect(() => assertEstadoDesbloqueable('BORRADOR')).toThrow(
      ConflictException,
    );
    expect(() => assertEstadoDesbloqueable('RECHAZADO')).toThrow(
      ConflictException,
    );
  });

  it('APROBADO → ARCHIVADO state-only es transición, no contenido', () => {
    expect(
      esArchivadoStateOnlyDesdeAprobado({
        estadoActual: 'APROBADO',
        estadoNuevo: 'ARCHIVADO',
        tieneCambioContenido: false,
      }),
    ).toBe(true);
    expect(() =>
      assertPatchPermitidoEnEstadoProtegido({
        estadoActual: 'APROBADO',
        estadoNuevo: 'ARCHIVADO',
        tieneCambioContenido: false,
      }),
    ).not.toThrow();
    expect(() => assertTransicionEstado('APROBADO', 'ARCHIVADO')).not.toThrow();
  });

  it('APROBADO → ARCHIVADO + metadata (descripción/tipo) bloqueado', () => {
    expect(dtoTieneCambioDeContenido({ descripcion: 'x' })).toBe(true);
    expect(dtoTieneCambioDeContenido({ tipoDocumentalId: 'id' })).toBe(true);
    expect(dtoTieneCambioDeContenido({ asunto: 'alterado' })).toBe(true);
    expect(dtoTieneCambioDeContenido({ dependenciaId: 'dep' })).toBe(true);
    expect(() =>
      assertPatchPermitidoEnEstadoProtegido({
        estadoActual: 'APROBADO',
        estadoNuevo: 'ARCHIVADO',
        tieneCambioContenido: true,
      }),
    ).toThrow(BadRequestException);
  });

  it('APROBADO → REGISTRADO/BORRADOR/EN_REVISION/RECHAZADO state-only bloqueado', () => {
    for (const dest of [
      'REGISTRADO',
      'BORRADOR',
      'EN_REVISION',
      'RECHAZADO',
    ] as const) {
      expect(() =>
        assertPatchPermitidoEnEstadoProtegido({
          estadoActual: 'APROBADO',
          estadoNuevo: dest,
          tieneCambioContenido: false,
        }),
      ).toThrow(BadRequestException);
    }
    expect(() =>
      assertEstadoNoResuelveRevisionViaPatch('APROBADO', 'REGISTRADO'),
    ).toThrow(BadRequestException);
  });

  it('ARCHIVADO/EN_REVISION → REGISTRADO por PATCH bloqueado', () => {
    expect(() =>
      assertPatchPermitidoEnEstadoProtegido({
        estadoActual: 'ARCHIVADO',
        estadoNuevo: 'REGISTRADO',
        tieneCambioContenido: false,
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      assertPatchPermitidoEnEstadoProtegido({
        estadoActual: 'EN_REVISION',
        estadoNuevo: 'REGISTRADO',
        tieneCambioContenido: false,
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      assertEstadoNoResuelveRevisionViaPatch('ARCHIVADO', 'REGISTRADO'),
    ).toThrow(BadRequestException);
    expect(() =>
      assertEstadoNoResuelveRevisionViaPatch('EN_REVISION', 'REGISTRADO'),
    ).toThrow(BadRequestException);
  });
});
