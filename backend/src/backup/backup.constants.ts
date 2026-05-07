/** Acción unificada para verificaciones manuales y jobs automáticos de respaldo. */
export const AUDIT_ACTION_BACKUP_VERIFIED = 'BACKUP_VERIFIED' as const;

export const BACKUP_META_SOURCE_MANUAL = 'manual_registry' as const;
export const BACKUP_META_SOURCE_SCHEDULED = 'scheduled_mysqldump' as const;
