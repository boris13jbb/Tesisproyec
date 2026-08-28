export const ROLE_SUPERADMIN = 'SUPERADMIN';
export const ROLE_ADMIN = 'ADMIN';

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
