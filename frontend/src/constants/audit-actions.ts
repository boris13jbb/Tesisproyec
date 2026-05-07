/**
 * Etiquetas para UI de auditoría (valores enviados a filtro deben cuadrar con `audit_logs.action` del backend).
 */
export const AUDIT_ACTION_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'AUTH_LOGIN_OK', label: 'Inicio de sesión exitoso' },
  { value: 'AUTH_LOGIN_FAIL', label: 'Intento fallido de inicio de sesión' },
  { value: 'AUTH_LOGOUT', label: 'Cierre de sesión' },
  { value: 'AUTH_REFRESH_OK', label: 'Renovación de sesión OK' },
  { value: 'AUTH_REFRESH_FAIL', label: 'Renovación de sesión rechazada' },
  { value: 'AUTH_RATE_LIMITED', label: 'Límite de peticiones (HTTP 429)' },
  { value: 'AUTHZ_FORBIDDEN', label: 'Acceso prohibido (HTTP 403)' },
  { value: 'DOC_FILE_UPLOADED', label: 'Carga de archivo documental' },
  { value: 'DOC_FILE_DOWNLOADED', label: 'Descarga de archivo documental' },
  { value: 'DOC_FILE_DELETED', label: 'Eliminación lógica de archivo' },
  { value: 'DOC_STATE_CHANGED', label: 'Cambio de estado del documento' },
  { value: 'DOC_SUBMITTED_FOR_REVIEW', label: 'Documento enviado a revisión' },
  { value: 'DOC_REVIEW_RESOLVED', label: 'Revisión resuelta (aprobar/rechazar)' },
  { value: 'USER_CREATED', label: 'Usuario creado' },
  { value: 'USER_UPDATED', label: 'Usuario actualizado' },
  { value: 'USER_PASSWORD_RESET', label: 'Contraseña de usuario restablecida' },
  { value: 'REPORT_EXPORTED', label: 'Exportación de informe' },
  {
    value: 'BACKUP_VERIFIED',
    label: 'Verificación de respaldo MySQL/storage registrada',
  },
];

/** Mapa rápido para tabla (si la acción no está en lista, mostrar código crudo). */
export const AUDIT_ACTION_LABEL_LOOKUP: Record<string, string> = Object.fromEntries(
  AUDIT_ACTION_FILTER_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label]),
);
