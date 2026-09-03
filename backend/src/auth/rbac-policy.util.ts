import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ALL_PERMISSION_CODES, PERM } from './permission-codes';
import {
  ROLE_ADMIN,
  ROLE_SUPERADMIN,
  ROLES_ASSIGNABLE_BY_ADMIN,
} from './role-constants';

/**
 * Permisos que un ADMIN operativo no puede otorgar ni revocar como `user_permissions`.
 * Deben heredarse del rol (REVISOR/ADMIN/SUPERADMIN) o delegarse solo por SUPERADMIN.
 */
export const PERMISSIONS_NOT_ASSIGNABLE_AS_DIRECT_BY_ADMIN: readonly string[] =
  [
    PERM.DOC_REVISION_RESOLVE,
    PERM.DOC_UNLOCK,
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
 * DOC_UNLOCK solo se asigna como permiso directo a cuentas con rol ADMIN
 * (nunca a USER/REVISOR/AUDITOR/CONSULTA/EDITOR_DOC ni vía edición común a SUPERADMIN).
 */
export function assertDocUnlockDirectTargetAllowed(input: {
  codes: readonly string[];
  targetRoleCodes: readonly string[];
}): void {
  const wantsUnlock = input.codes.some((c) => c.trim() === PERM.DOC_UNLOCK);
  if (!wantsUnlock) {
    return;
  }
  const roles = input.targetRoleCodes.map((r) => r.trim().toUpperCase());
  if (roles.includes(ROLE_SUPERADMIN)) {
    throw new BadRequestException(
      'DOC_UNLOCK no se asigna como permiso directo a SUPERADMIN (capacidad de rol)',
    );
  }
  if (!roles.includes(ROLE_ADMIN)) {
    throw new BadRequestException(
      'DOC_UNLOCK solo puede otorgarse a usuarios con rol ADMIN',
    );
  }
}

/**
 * DOC_UNLOCK no forma parte de matrices de rol operativas; solo SUPERADMIN lo hereda por rol.
 */
export function assertDocUnlockRoleMatrixAllowed(input: {
  roleCodigo: string;
  permissionCodes: readonly string[];
}): void {
  const role = input.roleCodigo.trim().toUpperCase();
  const wantsUnlock = input.permissionCodes.some(
    (c) => c.trim() === PERM.DOC_UNLOCK,
  );
  if (!wantsUnlock) {
    return;
  }
  if (role !== ROLE_SUPERADMIN) {
    throw new BadRequestException(
      'DOC_UNLOCK solo puede formar parte de la matriz del rol SUPERADMIN',
    );
  }
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
    const targetHadAdmin = input.targetRoleCodes.includes(ROLE_ADMIN);
    const nextHasAdmin = nextRoles.includes(ROLE_ADMIN);
    if (nextHasAdmin && !targetHadAdmin) {
      throw new ForbiddenException(
        'Solo el superadministrador puede asignar el rol Administrador.',
      );
    }
    if (targetHadAdmin && !nextHasAdmin) {
      throw new ForbiddenException(
        'Solo el superadministrador puede revocar el rol Administrador.',
      );
    }
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
 * Impide que un ADMIN fabrique un perfil privilegiado vía permisos directos.
 * Códigos bloqueados: no puede añadirlos ni retirarlos (solo SUPERADMIN).
 * DOC_UNLOCK: target debe ser ADMIN (no SUPERADMIN vía directo).
 */
export function assertDirectPermissionsAssignableByActor(input: {
  actorRoleCodes: string[];
  codes: string[];
  /** Permisos directos previos del target (para permitir preservar bloqueados). */
  previousCodes?: string[];
  /** Roles efectivos del target tras la mutación. */
  targetRoleCodes?: string[];
}): void {
  const unique = Array.from(
    new Set(input.codes.map((c) => c.trim()).filter(Boolean)),
  );
  const previous = new Set(
    (input.previousCodes ?? []).map((c) => c.trim()).filter(Boolean),
  );

  if (actorIsSuperAdmin(input.actorRoleCodes)) {
    if (input.targetRoleCodes) {
      assertDocUnlockDirectTargetAllowed({
        codes: unique,
        targetRoleCodes: input.targetRoleCodes,
      });
    }
    return;
  }

  const blockedInPayload = unique.filter((c) => BLOCKED_DIRECT_BY_ADMIN.has(c));
  const newlyAddedBlocked = blockedInPayload.filter((c) => !previous.has(c));
  if (newlyAddedBlocked.length) {
    throw new ForbiddenException(
      `Permisos directos no asignables por administrador operativo: ${newlyAddedBlocked.join(', ')}`,
    );
  }
  const removedBlocked = [...previous].filter(
    (c) => BLOCKED_DIRECT_BY_ADMIN.has(c) && !unique.includes(c),
  );
  if (removedBlocked.length) {
    throw new ForbiddenException(
      `Permisos directos no revocables por administrador operativo: ${removedBlocked.join(', ')}`,
    );
  }
  if (unique.length >= ALL_PERMISSION_CODES.length) {
    throw new ForbiddenException(
      'No puede otorgar el catálogo completo de permisos como excepciones directas',
    );
  }
}
