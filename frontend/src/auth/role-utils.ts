export const ROLE_SUPERADMIN = 'SUPERADMIN';
export const ROLE_ADMIN = 'ADMIN';
export const ROLE_REVISOR = 'REVISOR';

/**
 * Acceso administrativo en UI: ADMIN y SUPERADMIN comparten capacidades de panel.
 * La autorización real sigue validándose en backend (PermissionsGuard / RolesGuard).
 */
export function userHasAdminAccess(
  roles: { codigo: string }[] | undefined,
): boolean {
  return (
    roles?.some(
      (r) => r.codigo === ROLE_ADMIN || r.codigo === ROLE_SUPERADMIN,
    ) ?? false
  );
}

/** Cuenta técnica protegida; no debe degradarse desde UI de ADMIN estándar. */
export function userIsSuperAdmin(
  roles: { codigo: string }[] | undefined,
): boolean {
  return roles?.some((r) => r.codigo === ROLE_SUPERADMIN) ?? false;
}

/** Revisor documental o perfiles con privilegios administrativos (flujo de revisión). */
export function userIsRevisorOrAdmin(
  roles: { codigo: string }[] | undefined,
): boolean {
  return (
    userHasAdminAccess(roles) ||
    (roles?.some((r) => r.codigo === ROLE_REVISOR) ?? false)
  );
}

/** Etiqueta legible del rol administrativo principal para saludos y encabezados. */
export function primaryAdminRoleName(
  roles: { codigo: string; nombre: string }[] | undefined,
): string | undefined {
  return roles?.find(
    (r) => r.codigo === ROLE_ADMIN || r.codigo === ROLE_SUPERADMIN,
  )?.nombre;
}
