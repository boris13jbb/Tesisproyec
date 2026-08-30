/** Rol técnico de contingencia; no asignable por ADMIN operativo. */
export const ROLE_SUPERADMIN = 'SUPERADMIN' as const;

export const ROLE_ADMIN = 'ADMIN' as const;

/** Roles que un ADMIN operativo puede asignar en gestión cotidiana de usuarios. */
export const ROLES_ASSIGNABLE_BY_ADMIN = [
  'USUARIO',
  'REVISOR',
  'AUDITOR',
  'CONSULTA',
  'EDITOR_DOC',
] as const;

/** Rol privilegiado: solo SUPERADMIN puede asignarlo o revocarlo. */
export const ROLE_ASSIGNABLE_ONLY_BY_SUPERADMIN = ROLE_ADMIN;

/** Roles ocultos en UI de asignación para quien no es SUPERADMIN. */
export const ROLES_HIDDEN_FROM_ASSIGNMENT = [ROLE_SUPERADMIN] as const;
