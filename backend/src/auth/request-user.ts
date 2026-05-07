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

/** Revisor documental (flujo R-28); puede resolver EN_REVISION → APROBADO/RECHAZADO. */
export function jwtUserIsRevisor(u: JwtRequestUser): boolean {
  return u.roles.some((r) => r.codigo === 'REVISOR');
}
