import {
  actividadUsuarioEstadosConsistente,
  actividadUsuarioTiposConsistente,
  buildTiposActividadUsuario,
  buildTopActividadPorUsuario,
  displayUserName,
  extractEstadoCounts,
} from './documentos-por-usuario.util';

const baseEstados = {
  totalEnRevision: 0,
  totalAprobados: 0,
  totalRechazados: 0,
  totalBorradores: 0,
};

function row(
  partial: Partial<Parameters<typeof buildTopActividadPorUsuario>[0][number]> &
    Pick<
      Parameters<typeof buildTopActividadPorUsuario>[0][number],
      | 'usuarioId'
      | 'nombre'
      | 'email'
      | 'rolNombre'
      | 'totalRegistrados'
      | 'tiposRaw'
    >,
) {
  return {
    ...baseEstados,
    ...partial,
  };
}

describe('documentos-por-usuario.util', () => {
  it('ordena usuarios por total DESC y limita top N', () => {
    const top = buildTopActividadPorUsuario(
      [
        row({
          usuarioId: '1',
          nombre: 'Ana',
          email: 'a@test',
          rolNombre: 'Admin',
          totalRegistrados: 2,
          tiposRaw: [
            { tipoId: 't1', codigo: 'MEMO', nombre: 'Memorando', cantidad: 2 },
          ],
        }),
        row({
          usuarioId: '2',
          nombre: 'Beto',
          email: 'b@test',
          rolNombre: 'User',
          totalRegistrados: 9,
          tiposRaw: [
            { tipoId: 't2', codigo: 'OFI', nombre: 'Oficio', cantidad: 9 },
          ],
        }),
      ],
      1,
    );
    expect(top.length).toBe(1);
    expect(top[0].usuarioId).toBe('2');
    expect(top[0].totalRegistrados).toBe(9);
  });

  it('usuario único con 2 tipos: suma correcta', () => {
    const top = buildTopActividadPorUsuario([
      row({
        usuarioId: '1',
        nombre: 'Juan',
        email: 'j@test',
        rolNombre: 'Administrador',
        totalRegistrados: 8,
        tiposRaw: [
          { tipoId: 't1', codigo: 'MEMO', nombre: 'Memorando', cantidad: 5 },
          { tipoId: 't2', codigo: 'OFI', nombre: 'Oficio', cantidad: 3 },
        ],
      }),
    ]);
    expect(top[0].tipos).toHaveLength(2);
    expect(actividadUsuarioTiposConsistente(top[0])).toBe(true);
    expect(top[0].tipos[0].cantidad).toBe(5);
    expect(top[0].tipos[1].cantidad).toBe(3);
  });

  it('cuenta estados actuales por usuario (revisión, aprobado, rechazado)', () => {
    const top = buildTopActividadPorUsuario([
      row({
        usuarioId: '1',
        nombre: 'María',
        email: 'm@test',
        rolNombre: 'Usuario',
        totalRegistrados: 8,
        totalEnRevision: 2,
        totalAprobados: 5,
        totalRechazados: 1,
        totalBorradores: 0,
        tiposRaw: [
          { tipoId: 't1', codigo: 'CONT', nombre: 'Contrato', cantidad: 3 },
          { tipoId: 't2', codigo: 'MEMO', nombre: 'Memorando', cantidad: 2 },
          { tipoId: 't3', codigo: 'OFI', nombre: 'Oficio', cantidad: 3 },
        ],
      }),
    ]);
    expect(top[0].totalEnRevision).toBe(2);
    expect(top[0].totalAprobados).toBe(5);
    expect(top[0].totalRechazados).toBe(1);
    expect(top[0].totalRegistrados).toBe(8);
  });

  it('extractEstadoCounts mapea estados reales del dominio', () => {
    const counts = extractEstadoCounts({
      EN_REVISION: 2,
      APROBADO: 5,
      RECHAZADO: 1,
      BORRADOR: 0,
      REGISTRADO: 0,
    });
    expect(counts).toEqual({
      totalEnRevision: 2,
      totalAprobados: 5,
      totalRechazados: 1,
      totalBorradores: 0,
    });
  });

  it('actividadUsuarioEstadosConsistente valida suma de estados', () => {
    const estados = new Map<string, number>([
      ['EN_REVISION', 2],
      ['APROBADO', 5],
      ['RECHAZADO', 1],
    ]);
    expect(actividadUsuarioEstadosConsistente(8, estados)).toBe(true);
    expect(actividadUsuarioEstadosConsistente(7, estados)).toBe(false);
  });

  it('ordena tipos por cantidad DESC dentro de cada usuario', () => {
    const tipos = buildTiposActividadUsuario([
      { tipoId: 'a', codigo: 'A', nombre: 'Alfa', cantidad: 1 },
      { tipoId: 'b', codigo: 'B', nombre: 'Beta', cantidad: 5 },
      { tipoId: 'c', codigo: 'C', nombre: 'Gamma', cantidad: 3 },
    ]);
    expect(tipos.map((t) => t.codigo)).toEqual(['B', 'C', 'A']);
  });

  it('agrupa tipos excedentes en Otros (top 3 por defecto)', () => {
    const raw = Array.from({ length: 7 }, (_, i) => ({
      tipoId: `t${i}`,
      codigo: `T${i}`,
      nombre: `Tipo ${i}`,
      cantidad: 7 - i,
    }));
    const tipos = buildTiposActividadUsuario(raw);
    const otros = tipos.find((t) => t.codigo === 'OTROS');
    expect(tipos).toHaveLength(4);
    expect(otros?.cantidad).toBe(10);
    const sum = tipos.reduce((s, t) => s + t.cantidad, 0);
    expect(sum).toBe(raw.reduce((s, t) => s + t.cantidad, 0));
  });

  it('agrupa tipos excedentes en Otros con top N personalizado', () => {
    const raw = Array.from({ length: 7 }, (_, i) => ({
      tipoId: `t${i}`,
      codigo: `T${i}`,
      nombre: `Tipo ${i}`,
      cantidad: 7 - i,
    }));
    const tipos = buildTiposActividadUsuario(raw, 5);
    const otros = tipos.find((t) => t.codigo === 'OTROS');
    expect(tipos).toHaveLength(6);
    expect(otros?.cantidad).toBe(3);
  });

  it('documento sin tipo conocido no se pierde (Sin clasificar)', () => {
    const top = buildTopActividadPorUsuario([
      row({
        usuarioId: '1',
        nombre: 'X',
        email: 'x@test',
        rolNombre: 'Usuario',
        totalRegistrados: 2,
        tiposRaw: [
          {
            tipoId: 'missing',
            codigo: 'SIN_TIPO',
            nombre: 'Sin clasificar',
            cantidad: 2,
          },
        ],
      }),
    ]);
    expect(top[0].tipos[0].nombre).toBe('Sin clasificar');
    expect(actividadUsuarioTiposConsistente(top[0])).toBe(true);
  });

  it('excluye usuarios con 0 documentos', () => {
    const top = buildTopActividadPorUsuario([
      row({
        usuarioId: '1',
        nombre: 'Vacío',
        email: 'v@test',
        rolNombre: 'Usuario',
        totalRegistrados: 0,
        tiposRaw: [],
      }),
      row({
        usuarioId: '2',
        nombre: 'Activo',
        email: 'a@test',
        rolNombre: 'Usuario',
        totalRegistrados: 1,
        tiposRaw: [
          { tipoId: 't1', codigo: 'MEMO', nombre: 'Memorando', cantidad: 1 },
        ],
      }),
    ]);
    expect(top).toHaveLength(1);
    expect(top[0].usuarioId).toBe('2');
  });

  it('empate en total ordena por nombre estable', () => {
    const top = buildTopActividadPorUsuario([
      row({
        usuarioId: '2',
        nombre: 'Zoe',
        email: 'z@test',
        rolNombre: 'Usuario',
        totalRegistrados: 3,
        tiposRaw: [
          { tipoId: 't1', codigo: 'MEMO', nombre: 'Memorando', cantidad: 3 },
        ],
      }),
      row({
        usuarioId: '1',
        nombre: 'Ana',
        email: 'a@test',
        rolNombre: 'Usuario',
        totalRegistrados: 3,
        tiposRaw: [
          { tipoId: 't1', codigo: 'MEMO', nombre: 'Memorando', cantidad: 3 },
        ],
      }),
    ]);
    expect(top[0].nombre).toBe('Ana');
    expect(top[1].nombre).toBe('Zoe');
  });

  it('varios usuarios con distintos estados en el mismo período', () => {
    const top = buildTopActividadPorUsuario([
      row({
        usuarioId: '1',
        nombre: 'A',
        email: 'a@test',
        rolNombre: 'Usuario',
        totalRegistrados: 4,
        totalRechazados: 4,
        tiposRaw: [
          { tipoId: 't1', codigo: 'MEMO', nombre: 'Memorando', cantidad: 4 },
        ],
      }),
      row({
        usuarioId: '2',
        nombre: 'B',
        email: 'b@test',
        rolNombre: 'Usuario',
        totalRegistrados: 6,
        totalAprobados: 6,
        tiposRaw: [
          { tipoId: 't2', codigo: 'OFI', nombre: 'Oficio', cantidad: 6 },
        ],
      }),
    ]);
    expect(top[0].totalAprobados).toBe(6);
    expect(top[1].totalRechazados).toBe(4);
  });

  it('displayUserName prioriza nombre completo', () => {
    expect(displayUserName('Juan', 'Pérez', 'j@test')).toBe('Juan Pérez');
    expect(displayUserName(null, null, 'j@test')).toBe('j@test');
  });
});
