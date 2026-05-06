export type JwtRequestUser = {
  id: string;
  email: string;
  nombres: string | null;
  apellidos: string | null;
  roles: { codigo: string; nombre: string }[];
  dependenciaId: string | null;
};

export function jwtUserIsAdmin(u: JwtRequestUser): boolean {
  return u.roles.some((r) => r.codigo === 'ADMIN');
}
