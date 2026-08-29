import { fillDocumentosPorEstadoCounts } from './documentos-por-estado.util';

describe('fillDocumentosPorEstadoCounts', () => {
  it('pone cero en estados ausentes y suma el total', () => {
    const r = fillDocumentosPorEstadoCounts([
      { estado: 'REGISTRADO', count: 3 },
      { estado: 'EN_REVISION', count: 2 },
    ]);
    expect(r).toEqual({
      total: 5,
      registrados: 3,
      borradores: 0,
      enRevision: 2,
      aprobados: 0,
      rechazados: 0,
    });
  });

  it('cuenta todos los estados del ciclo de vida', () => {
    const r = fillDocumentosPorEstadoCounts([
      { estado: 'BORRADOR', count: 1 },
      { estado: 'REGISTRADO', count: 2 },
      { estado: 'EN_REVISION', count: 3 },
      { estado: 'APROBADO', count: 4 },
      { estado: 'RECHAZADO', count: 5 },
    ]);
    expect(r.total).toBe(15);
    expect(r.aprobados).toBe(4);
    expect(r.rechazados).toBe(5);
  });
});
