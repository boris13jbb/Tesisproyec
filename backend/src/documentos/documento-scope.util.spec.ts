import { documentoVisibilityWhere } from './documento-scope.util';
import type { JwtRequestUser } from '../auth/request-user';

describe('documentoVisibilityWhere', () => {
  const user: JwtRequestUser = {
    id: 'user-a',
    email: 'a@local.test',
    nombres: 'A',
    apellidos: 'User',
    roles: [{ codigo: 'USUARIO', nombre: 'Usuario' }],
    dependenciaId: 'dep-1',
  };

  it('ADMIN/SUPERADMIN no aplican filtro (alcance global)', () => {
    const admin: JwtRequestUser = {
      ...user,
      id: 'admin-1',
      roles: [{ codigo: 'ADMIN', nombre: 'Administrador' }],
    };
    expect(documentoVisibilityWhere(admin)).toBeUndefined();
  });

  it('USER incluye propiedad, público y misma dependencia INTERNO/RESERVADO', () => {
    const where = documentoVisibilityWhere(user);
    expect(where).toBeDefined();
    expect(JSON.stringify(where)).toContain('user-a');
    expect(JSON.stringify(where)).toContain('dep-1');
    expect(JSON.stringify(where)).toContain('PUBLICO');
    expect(JSON.stringify(where)).toContain('RESTRICTED');
  });

  it('USER sin dependencia no filtra por dependenciaId ajena', () => {
    const solo: JwtRequestUser = { ...user, dependenciaId: null };
    const where = documentoVisibilityWhere(solo);
    expect(JSON.stringify(where)).not.toContain('INTERNO');
  });
});
