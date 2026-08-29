export const ROLE_SUPERADMIN = 'SUPERADMIN';
export const ROLE_ADMIN = 'ADMIN';
export const ROLE_REVISOR = 'REVISOR';

export function userHasAdminAccess(
  roles: { codigo: string }[] | undefined,
): boolean {
  return (
    roles?.some(
      (r) => r.codigo === ROLE_ADMIN || r.codigo === ROLE_SUPERADMIN,
    ) ?? false
  );
}

export function userIsSuperAdmin(
  roles: { codigo: string }[] | undefined,
): boolean {
  return roles?.some((r) => r.codigo === ROLE_SUPERADMIN) ?? false;
}

export function userIsRevisorOrAdmin(
  roles: { codigo: string }[] | undefined,
): boolean {
  return (
    userHasAdminAccess(roles) ||
    (roles?.some((r) => r.codigo === ROLE_REVISOR) ?? false)
  );
}

export function primaryAdminRoleName(
  roles: { codigo: string; nombre: string }[] | undefined,
): string | undefined {
  return roles?.find(
    (r) => r.codigo === ROLE_ADMIN || r.codigo === ROLE_SUPERADMIN,
  )?.nombre;
}
