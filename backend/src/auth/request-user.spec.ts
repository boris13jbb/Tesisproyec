import {
  jwtUserIsAdmin,
  jwtUserIsRevisor,
  type JwtRequestUser,
} from './request-user';

function user(roles: string[]): JwtRequestUser {
  return {
    id: 'u1',
    email: 'a@local.test',
    nombres: null,
    apellidos: null,
    dependenciaId: null,
    roles: roles.map((codigo) => ({ codigo, nombre: codigo })),
  };
}

describe('jwtUserIsAdmin / jwtUserIsRevisor', () => {
  it('USER no es admin ni revisor (no resuelve revisión)', () => {
    const u = user(['USUARIO']);
    expect(jwtUserIsAdmin(u)).toBe(false);
    expect(jwtUserIsRevisor(u)).toBe(false);
  });

  it('ADMIN y SUPERADMIN tienen acceso administrativo', () => {
    expect(jwtUserIsAdmin(user(['ADMIN']))).toBe(true);
    expect(jwtUserIsAdmin(user(['SUPERADMIN']))).toBe(true);
  });

  it('REVISOR puede resolver sin ser ADMIN', () => {
    expect(jwtUserIsRevisor(user(['REVISOR']))).toBe(true);
    expect(jwtUserIsAdmin(user(['REVISOR']))).toBe(false);
  });
});
