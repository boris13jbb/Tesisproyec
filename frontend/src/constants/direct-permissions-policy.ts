/**
 * Alineado con `PERMISSIONS_NOT_ASSIGNABLE_AS_DIRECT_BY_ADMIN` del backend.
 * Un ADMIN operativo no debe poder marcarlos como permisos directos en UI.
 */
export const DIRECT_PERMISSIONS_BLOCKED_FOR_ADMIN = [
  'DOC_REVISION_RESOLVE',
  'DOC_UNLOCK',
  'USERS_CREATE',
  'USERS_UPDATE',
  'USERS_DISABLE',
  'USERS_RESET_PASSWORD',
  'SECURITY_POLICY_WRITE',
  'BACKUP_RUN',
] as const;

const BLOCKED = new Set<string>(DIRECT_PERMISSIONS_BLOCKED_FOR_ADMIN);

export function isDirectPermissionBlockedForAdmin(codigo: string): boolean {
  return BLOCKED.has(codigo);
}
