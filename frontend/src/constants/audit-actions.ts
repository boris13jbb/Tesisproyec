/**
 * Etiquetas legibles para acciones de auditoría (`audit_logs.action`).
 * Usar en toda la UI; no mostrar códigos técnicos al usuario final salvo en tooltips de soporte.
 */

export const AUDIT_ACTION_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todas las acciones' },
  { value: 'AUTH_LOGIN_OK', label: 'Inicio de sesión exitoso' },
  { value: 'AUTH_LOGIN_FAIL', label: 'Intento fallido de inicio de sesión' },
  { value: 'AUTH_LOGOUT', label: 'Cierre de sesión' },
  { value: 'AUTH_REFRESH_OK', label: 'Renovación automática de sesión' },
  { value: 'AUTH_REFRESH_FAIL', label: 'Renovación de sesión rechazada' },
  { value: 'AUTH_RATE_LIMITED', label: 'Demasiados intentos (límite temporal)' },
  { value: 'AUTH_PASSWORD_RESET_REQUEST', label: 'Solicitud de recuperación de contraseña' },
  { value: 'AUTH_PASSWORD_RESET_CONFIRM_OK', label: 'Contraseña restablecida por el usuario' },
  { value: 'AUTH_PASSWORD_RESET_CONFIRM_FAIL', label: 'Fallo al restablecer contraseña' },
  { value: 'AUTHZ_FORBIDDEN', label: 'Acceso denegado por permisos' },
  { value: 'AUTH_MFA_CHALLENGE_ISSUED', label: 'Solicitud de desafío MFA (TOTP)' },
  { value: 'AUTH_MFA_VERIFY_OK', label: 'Verificación MFA (TOTP) OK' },
  { value: 'AUTH_MFA_VERIFY_FAIL', label: 'Verificación MFA (TOTP) fallida' },
  { value: 'AUTH_MFA_ENABLED', label: 'Habilitó MFA (TOTP)' },
  { value: 'AUTH_MFA_DISABLED', label: 'Deshabilitó MFA (TOTP)' },
  { value: 'DASHBOARD_ALERT_ACK', label: 'Alerta del panel marcada como revisada' },
  { value: 'CLIENT_WEB_VITAL_LCP', label: 'Métrica de rendimiento del panel (técnico)' },
  { value: 'DOC_FILE_UPLOADED', label: 'Carga de archivo en documento' },
  { value: 'DOC_FILE_DOWNLOADED', label: 'Descarga o visualización de archivo' },
  { value: 'DOC_FILE_DELETED', label: 'Eliminación de archivo documental' },
  { value: 'DOC_CREATED', label: 'Documento creado' },
  { value: 'DOC_DEACTIVATED', label: 'Documento desactivado' },
  { value: 'DOC_STATE_CHANGED', label: 'Cambio de estado del documento' },
  { value: 'DOC_SUBMITTED_FOR_REVIEW', label: 'Documento enviado a revisión' },
  { value: 'DOC_REVIEW_RESOLVED', label: 'Revisión resuelta (aprobar o rechazar)' },
  { value: 'DOC_UNLOCKED', label: 'Documento desbloqueado para corrección' },
  { value: 'DOC_ACCESS_UPDATED', label: 'Cambio de acceso al documento' },
  { value: 'ROLE_ASSIGNED', label: 'Rol asignado a usuario' },
  { value: 'ROLE_REVOKED', label: 'Rol revocado a usuario' },
  { value: 'DEPENDENCIA_CREATED', label: 'Dependencia creada' },
  { value: 'DEPENDENCIA_UPDATED', label: 'Dependencia actualizada' },
  { value: 'DEPENDENCIA_ACTIVATED', label: 'Dependencia activada' },
  { value: 'DEPENDENCIA_DEACTIVATED', label: 'Dependencia desactivada' },
  { value: 'CARGO_CREATED', label: 'Cargo creado' },
  { value: 'CARGO_UPDATED', label: 'Cargo actualizado' },
  { value: 'CARGO_ACTIVATED', label: 'Cargo activado' },
  { value: 'CARGO_DEACTIVATED', label: 'Cargo desactivado' },
  { value: 'TIPO_DOCUMENTAL_CREATED', label: 'Tipo documental creado' },
  { value: 'TIPO_DOCUMENTAL_UPDATED', label: 'Tipo documental actualizado' },
  { value: 'TIPO_DOCUMENTAL_ACTIVATED', label: 'Tipo documental activado' },
  { value: 'TIPO_DOCUMENTAL_DEACTIVATED', label: 'Tipo documental desactivado' },
  { value: 'USER_CREATED', label: 'Usuario creado' },
  { value: 'USER_UPDATED', label: 'Usuario actualizado' },
  { value: 'USER_PASSWORD_RESET', label: 'Contraseña restablecida por administración' },
  { value: 'USER_DIRECT_PERMISSIONS_UPDATED', label: 'Permisos directos de usuario actualizados' },
  { value: 'USER_INVITE_MAIL_SENT', label: 'Invitación por correo enviada' },
  { value: 'USER_INVITE_MAIL_SKIP', label: 'Invitación por correo omitida' },
  { value: 'USER_INVITE_MAIL_FAIL', label: 'Fallo al enviar invitación por correo' },
  { value: 'ROLE_PERMISSIONS_UPDATED', label: 'Permisos de rol actualizados' },
  { value: 'SECURITY_POLICY_UPDATED', label: 'Política de seguridad actualizada' },
  { value: 'REPORT_EXPORTED', label: 'Exportación de informe' },
  {
    value: 'BACKUP_VERIFIED',
    label: 'Verificación de respaldo registrada',
  },
];

export const AUDIT_ACTION_LABEL_LOOKUP: Record<string, string> = Object.fromEntries(
  AUDIT_ACTION_FILTER_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label]),
);

/** Acciones que no deben mostrarse en el perfil del usuario (solo operación / técnico). */
export const PROFILE_AUDIT_HIDDEN_ACTIONS = new Set<string>([
  'AUTH_REFRESH_OK',
  'AUTH_REFRESH_FAIL',
  'AUTH_RATE_LIMITED',
  'AUTHZ_FORBIDDEN',
  'CLIENT_WEB_VITAL_LCP',
  'DASHBOARD_ALERT_ACK',
  'SECURITY_POLICY_UPDATED',
  'ROLE_PERMISSIONS_UPDATED',
  'USER_INVITE_MAIL_SENT',
  'USER_INVITE_MAIL_SKIP',
  'USER_INVITE_MAIL_FAIL',
  'USER_DIRECT_PERMISSIONS_UPDATED',
  'AUTH_PASSWORD_RESET_MAIL_FAIL',
  'AUTH_PASSWORD_RESET_MAIL_SKIP',
  'AUTH_PASSWORD_RESET_CONFIRM_FAIL',
]);

/**
 * Etiqueta principal para una acción de auditoría (tablas, filtros, perfil).
 * Nunca devuelve el código crudo si parece técnico.
 */
export function formatAuditActionLabel(code: string | null | undefined): string {
  const key = String(code ?? '').trim();
  if (!key) return '—';
  const known = AUDIT_ACTION_LABEL_LOOKUP[key];
  if (known) return known;
  if (/^[A-Z][A-Z0-9_]+$/.test(key)) {
    return 'Registro del sistema';
  }
  return key;
}

/** Etiqueta de resultado en auditoría y listados. */
export function formatAuditResultLabel(
  result: string | null | undefined,
  metaReason?: string | null,
): string {
  const res = String(result ?? '').toUpperCase();
  const reason = metaReason?.trim().toUpperCase();
  if (res === 'OK') return 'Correcto';
  if (res === 'FAIL' && reason === 'ACCOUNT_LOCKED') return 'Cuenta bloqueada';
  if (res === 'FAIL') return 'No completado';
  if (res) return res;
  return '—';
}

/** Color de Chip MUI para resultado de auditoría (claro/oscuro). */
export function auditResultChipColor(
  result: string | null | undefined,
): 'success' | 'error' | 'default' {
  switch (String(result ?? '').toUpperCase()) {
    case 'OK':
      return 'success';
    case 'FAIL':
      return 'error';
    default:
      return 'default';
  }
}

/**
 * Texto de actividad en perfil: prioriza `label` del API (frase contextual) y cae a catálogo.
 */
export function formatUserActivityLabel(
  label: string | null | undefined,
  action: string,
): string {
  const trimmed = String(label ?? '').trim();
  if (trimmed && trimmed !== action) return trimmed;
  if (PROFILE_AUDIT_HIDDEN_ACTIONS.has(action)) {
    return '';
  }
  return formatAuditActionLabel(action);
}
