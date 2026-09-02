import {
  actividadUsuarioTiposConsistente,
  buildTiposActividadUsuario,
  buildTopActividadPorUsuario,
  displayUserName,
} from './documentos-por-usuario.util';

describe('documentos-por-usuario.util', () => {
  it('ordena usuarios por total DESC y limita top N', () => {
    const top = buildTopActividadPorUsuario(
      [
        {
          usuarioId: '1',
          nombre: 'Ana',
          email: 'a@test',
          rolNombre: 'Admin',
          documentosRegistrados: 2,
          tiposRaw: [
            { tipoId: 't1', codigo: 'MEMO', nombre: 'Memorando', cantidad: 2 },
          ],
        },
        {
          usuarioId: '2',
          nombre: 'Beto',
          email: 'b@test',
          rolNombre: 'User',
          documentosRegistrados: 9,
          tiposRaw: [
            { tipoId: 't2', codigo: 'OFI', nombre: 'Oficio', cantidad: 9 },
          ],
        },
      ],
      1,
    );
    expect(top.length).toBe(1);
    expect(top[0].usuarioId).toBe('2');
    expect(top[0].documentosRegistrados).toBe(9);
  });

  it('usuario único con 2 tipos: suma correcta', () => {
    const top = buildTopActividadPorUsuario([
      {
        usuarioId: '1',
        nombre: 'Juan',
        email: 'j@test',
        rolNombre: 'Administrador',
        documentosRegistrados: 8,
        tiposRaw: [
          { tipoId: 't1', codigo: 'MEMO', nombre: 'Memorando', cantidad: 5 },
          { tipoId: 't2', codigo: 'OFI', nombre: 'Oficio', cantidad: 3 },
        ],
      },
    ]);
    expect(top[0].tipos).toHaveLength(2);
    expect(actividadUsuarioTiposConsistente(top[0])).toBe(true);
    expect(top[0].tipos[0].cantidad).toBe(5);
    expect(top[0].tipos[1].cantidad).toBe(3);
  });

  it('ordena tipos por cantidad DESC dentro de cada usuario', () => {
    const tipos = buildTiposActividadUsuario([
      { tipoId: 'a', codigo: 'A', nombre: 'Alfa', cantidad: 1 },
      { tipoId: 'b', codigo: 'B', nombre: 'Beta', cantidad: 5 },
      { tipoId: 'c', codigo: 'C', nombre: 'Gamma', cantidad: 3 },
    ]);
    expect(tipos.map((t) => t.codigo)).toEqual(['B', 'C', 'A']);
  });

  it('agrupa tipos excedentes en Otros por usuario', () => {
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
    const sum = tipos.reduce((s, t) => s + t.cantidad, 0);
    expect(sum).toBe(raw.reduce((s, t) => s + t.cantidad, 0));
  });

  it('documento sin tipo conocido no se pierde (Sin clasificar)', () => {
    const top = buildTopActividadPorUsuario([
      {
        usuarioId: '1',
        nombre: 'X',
        email: 'x@test',
        rolNombre: 'Usuario',
        documentosRegistrados: 2,
        tiposRaw: [
          {
            tipoId: 'missing',
            codigo: 'SIN_TIPO',
            nombre: 'Sin clasificar',
            cantidad: 2,
          },
        ],
      },
    ]);
    expect(top[0].tipos[0].nombre).toBe('Sin clasificar');
    expect(actividadUsuarioTiposConsistente(top[0])).toBe(true);
  });

  it('excluye usuarios con 0 documentos', () => {
    const top = buildTopActividadPorUsuario([
      {
        usuarioId: '1',
        nombre: 'Vacío',
        email: 'v@test',
        rolNombre: 'Usuario',
        documentosRegistrados: 0,
        tiposRaw: [],
      },
      {
        usuarioId: '2',
        nombre: 'Activo',
        email: 'a@test',
        rolNombre: 'Usuario',
        documentosRegistrados: 1,
        tiposRaw: [
          { tipoId: 't1', codigo: 'MEMO', nombre: 'Memorando', cantidad: 1 },
        ],
      },
    ]);
    expect(top).toHaveLength(1);
    expect(top[0].usuarioId).toBe('2');
  });

  it('empate en total ordena por nombre estable', () => {
    const top = buildTopActividadPorUsuario([
      {
        usuarioId: '2',
        nombre: 'Zoe',
        email: 'z@test',
        rolNombre: 'Usuario',
        documentosRegistrados: 3,
        tiposRaw: [
          { tipoId: 't1', codigo: 'MEMO', nombre: 'Memorando', cantidad: 3 },
        ],
      },
      {
        usuarioId: '1',
        nombre: 'Ana',
        email: 'a@test',
        rolNombre: 'Usuario',
        documentosRegistrados: 3,
        tiposRaw: [
          { tipoId: 't1', codigo: 'MEMO', nombre: 'Memorando', cantidad: 3 },
        ],
      },
    ]);
    expect(top[0].nombre).toBe('Ana');
    expect(top[1].nombre).toBe('Zoe');
  });

  it('displayUserName prioriza nombre completo', () => {
    expect(displayUserName('Juan', 'Pérez', 'j@test')).toBe('Juan Pérez');
    expect(displayUserName(null, null, 'j@test')).toBe('j@test');
  });
});
