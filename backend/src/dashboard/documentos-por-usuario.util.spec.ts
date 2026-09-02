import {
  buildTopActividadPorUsuario,
  displayUserName,
} from './documentos-por-usuario.util';

describe('documentos-por-usuario.util', () => {
  it('ordena y limita top usuarios', () => {
    const top = buildTopActividadPorUsuario(
      [
        {
          usuarioId: '1',
          nombre: 'A',
          email: 'a@test',
          rolNombre: 'Admin',
          documentosRegistrados: 2,
        },
        {
          usuarioId: '2',
          nombre: 'B',
          email: 'b@test',
          rolNombre: 'User',
          documentosRegistrados: 9,
        },
      ],
      1,
    );
    expect(top.length).toBe(1);
    expect(top[0].usuarioId).toBe('2');
  });

  it('displayUserName prioriza nombre', () => {
    expect(displayUserName('Juan', 'Pérez', 'j@test')).toBe('Juan Pérez');
    expect(displayUserName(null, null, 'j@test')).toBe('j@test');
  });
});
