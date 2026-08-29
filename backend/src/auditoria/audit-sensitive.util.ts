/** Acciones reales de AuditLog usadas en el semáforo (no inventar códigos). */
export const AUDIT_SENSITIVE_ACTIONS = [
  'DOC_FILE_DELETED',
  'DOC_DEACTIVATED',
  'DOC_STATE_CHANGED',
  'USER_UPDATED',
  'USER_DIRECT_PERMISSIONS_UPDATED',
  'ROLE_PERMISSIONS_UPDATED',
] as const;

export type AuditSensitiveAction = (typeof AUDIT_SENSITIVE_ACTIONS)[number];
