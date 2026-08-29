import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ALL_PERMISSION_CODES, PERM } from './permission-codes';
import { ROLE_SUPERADMIN, ROLES_ASSIGNABLE_BY_ADMIN } from './role-constants';

/**
 * Permisos que un ADMIN operativo no puede otorgar como `user_permissions`.
 * Deben heredarse del rol (REVISOR/ADMIN/SUPERADMIN), no fabricarse por excepción.
 */
export const PERMISSIONS_NOT_ASSIGNABLE_AS_DIRECT_BY_ADMIN: readonly string[] =
  [
    PERM.DOC_REVISION_RESOLVE,
    PERM.USERS_CREATE,
    PERM.USERS_UPDATE,
    PERM.USERS_DISABLE,
    PERM.USERS_RESET_PASSWORD,
    PERM.SECURITY_POLICY_WRITE,
    PERM.BACKUP_RUN,
  ];

const BLOCKED_DIRECT_BY_ADMIN = new Set<string>(
  PERMISSIONS_NOT_ASSIGNABLE_AS_DIRECT_BY_ADMIN,
);

export function actorIsSuperAdmin(roleCodes: readonly string[]): boolean {
  return roleCodes.includes(ROLE_SUPERADMIN);
}

/**
 * Protección de la cuenta SUPERADMIN (degradar, desactivar, asignar el rol).
 * Usado por gestión de usuarios; no duplicar estas reglas en otro servicio.
 */
export function assertSuperadminUserMutationAllowed(input: {
  actorRoleCodes: string[];
  targetRoleCodes: string[];
  nextRoleCodes?: string[];
  nextActivo?: boolean;
}): void {
  const actorIsSuper = actorIsSuperAdmin(input.actorRoleCodes);
  const targetIsSuper = input.targetRoleCodes.includes(ROLE_SUPERADMIN);
  const nextRoles = input.nextRoleCodes;

  if (targetIsSuper && !actorIsSuper) {
    throw new ForbiddenException(
      'No puede modificar la cuenta de superadministrador',
    );
  }
  if (nextRoles?.includes(ROLE_SUPERADMIN) && !actorIsSuper) {
    throw new ForbiddenException(
      'Solo el superadministrador puede asignar el rol SUPERADMIN',
    );
  }
  if (targetIsSuper && input.nextActivo === false) {
    throw new ForbiddenException(
      'No se puede desactivar la cuenta de superadministrador',
    );
  }
  if (targetIsSuper && nextRoles && !nextRoles.includes(ROLE_SUPERADMIN)) {
    throw new ForbiddenException(
      'No se puede degradar la cuenta de superadministrador',
    );
  }
  if (!actorIsSuper && nextRoles) {
    const invalid = nextRoles.filter(
      (c) => !(ROLES_ASSIGNABLE_BY_ADMIN as readonly string[]).includes(c),
    );
    if (invalid.length) {
      throw new BadRequestException(
        `Roles no asignables por administrador operativo: ${invalid.join(', ')}`,
      );
    }
  }
}

/**
 * Un ADMIN no puede alterar la matriz de permisos del rol SUPERADMIN.
 * El SUPERADMIN sí puede administrarla.
 */
export function assertSuperadminRoleMatrixMutationAllowed(input: {
  actorRoleCodes: string[];
  roleCodigo: string;
}): void {
  const codigo = input.roleCodigo.trim().toUpperCase();
  if (codigo !== ROLE_SUPERADMIN) {
    return;
  }
  if (!actorIsSuperAdmin(input.actorRoleCodes)) {
    throw new ForbiddenException(
      'No puede modificar los permisos del rol SUPERADMIN',
    );
  }
}

/**
 * Impide que un ADMIN fabrique un perfil equivalente a SUPERADMIN vía permisos directos.
 */
export function assertDirectPermissionsAssignableByActor(input: {
  actorRoleCodes: string[];
  codes: string[];
}): void {
  if (actorIsSuperAdmin(input.actorRoleCodes)) {
    return;
  }
  const unique = Array.from(
    new Set(input.codes.map((c) => c.trim()).filter(Boolean)),
  );
  const blocked = unique.filter((c) => BLOCKED_DIRECT_BY_ADMIN.has(c));
  if (blocked.length) {
    throw new ForbiddenException(
      `Permisos directos no asignables por administrador operativo: ${blocked.join(', ')}`,
    );
  }
  if (unique.length >= ALL_PERMISSION_CODES.length) {
    throw new ForbiddenException(
      'No puede otorgar el catálogo completo de permisos como excepciones directas',
    );
  }
}
