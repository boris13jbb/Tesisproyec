/**
 * Etiquetas y reglas de visibilidad para acciones de auditoría en UI de perfil.
 * Mantener alineado con `frontend/src/constants/audit-actions.ts`.
 */

export const PROFILE_AUDIT_SKIP = [
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
] as const;

export function parseAuditMetaJson(
  metaJson: string | null | undefined,
): Record<string, unknown> {
  if (!metaJson?.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(metaJson);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function profileDocumentoIdFromMeta(
  meta: Record<string, unknown>,
): string | null {
  const raw = meta.documentoId;
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

function profileReportKindLabel(kind: unknown): string {
  if (kind === 'documentos') return 'documentos';
  if (kind === 'auditoria') return 'auditoría';
  if (kind === 'pendientes_revision') return 'pendientes de revisión';
  return 'informe';
}

export function profileActivityLabel(
  row: {
    action: string;
    resourceType: string | null;
    resourceId: string | null;
    metaJson: string | null;
  },
  codigoById: Map<string, string>,
): string | null {
  const meta = parseAuditMetaJson(row.metaJson);
  const docIdDirect =
    profileDocumentoIdFromMeta(meta) ??
    (row.resourceType === 'Documento' && row.resourceId
      ? row.resourceId
      : null);
  const codigo = docIdDirect ? codigoById.get(docIdDirect) : undefined;

  switch (row.action) {
    case 'AUTH_LOGIN_OK':
      return 'Inició sesión correctamente';
    case 'AUTH_MFA_ENABLED':
      return 'Activó verificación en dos pasos';
    case 'AUTH_MFA_DISABLED':
      return 'Desactivó verificación en dos pasos';
    case 'AUTH_MFA_VERIFY_OK':
      return 'Completó verificación en dos pasos al ingresar';
    case 'AUTH_MFA_VERIFY_FAIL':
      return 'Código de verificación incorrecto';
    case 'AUTH_MFA_CHALLENGE_ISSUED':
      return 'Se solicitó código de verificación en dos pasos';
    case 'AUTH_LOGOUT':
      return 'Cerró sesión';
    case 'DOC_FILE_UPLOADED':
      return codigo
        ? `Cargó documento ${codigo}`
        : 'Cargó un archivo en un documento';
    case 'DOC_FILE_DOWNLOADED':
      return codigo
        ? `Consultó documento ${codigo}`
        : 'Consultó un documento (descarga o visualización)';
    case 'DOC_FILE_DELETED':
      return codigo
        ? `Eliminó un archivo del documento ${codigo}`
        : 'Eliminó un archivo documental';
    case 'DOC_STATE_CHANGED':
      return codigo
        ? `Actualizó documento ${codigo}`
        : 'Actualizó un documento';
    case 'DOC_SUBMITTED_FOR_REVIEW':
      return codigo
        ? `Envió a revisión el documento ${codigo}`
        : 'Envió un documento a revisión';
    case 'DOC_REVIEW_RESOLVED':
      return codigo
        ? `Resolvió la revisión del documento ${codigo}`
        : 'Resolvió una revisión documental';
    case 'REPORT_EXPORTED':
      return `Exportó un informe (${profileReportKindLabel(meta.kind)})`;
    case 'USER_UPDATED':
      return 'Su cuenta fue actualizada por un administrador';
    case 'USER_PASSWORD_RESET':
      return 'Un administrador restableció su contraseña';
    case 'AUTH_PASSWORD_RESET_CONFIRM_OK':
      return 'Restableció su contraseña';
    case 'AUTH_PASSWORD_RESET_REQUEST':
      return 'Solicitó restablecer su contraseña';
    case 'BACKUP_VERIFIED':
      return 'Registró verificación de respaldo institucional';
    case 'DOC_ACCESS_UPDATED':
      return codigo
        ? `Actualizó el acceso al documento ${codigo}`
        : 'Actualizó el acceso a un documento';
    case 'USER_CREATED':
      return 'Su cuenta fue creada en el sistema';
    default:
      return null;
  }
}
