/**
 * Textos de UI alineados a controles reales y verificables (ISO 27001, ISO 15489, OWASP ASVS).
 * No presentar certificación ni políticas que el servidor no ejecuta.
 */

export const STANDARDS_PROJECT_NOTE =
  'El sistema aplica controles técnicos verificables; la alineación a marcos ISO/OWASP se documenta en el proyecto, no implica certificación externa.';

export const SPLASH_TRUST_ITEMS = [
  'Gestión documental con control de acceso',
  'Trazabilidad en auditoría',
  'Protección de sesión y datos',
] as const;

export type ComplianceMetricKey =
  | 'access_control'
  | 'identity_management'
  | 'authentication_information'
  | 'document_traceability'
  | 'input_validation';

/** Subtítulo bajo cada barra: qué mide el porcentaje (datos de los últimos 30 días). */
export function complianceMetricEvidenceLabel(
  key: ComplianceMetricKey,
  evidence: Record<string, number | string | null>,
): string {
  switch (key) {
    case 'access_control':
      return `30 días: ${evidence.audit_total_30d ?? 0} eventos en auditoría; ${evidence.authz_forbidden_30d ?? 0} accesos denegados por permiso.`;
    case 'identity_management':
      return `Usuarios activos con rol asignado: ${evidence.users_active_with_role ?? 0} de ${evidence.users_active ?? 0}.`;
    case 'authentication_information':
      return `Inicios de sesión exitosos: ${evidence.auth_login_ok_30d ?? 0}; fallidos: ${evidence.auth_login_fail_30d ?? 0} (30 días).`;
    case 'document_traceability':
      return `Documentos con actividad registrada en 30 días: ${evidence.documentos_con_eventos_30d ?? 0} de ${evidence.documentos_total ?? 0}.`;
    case 'input_validation':
      return `Operaciones documentales correctas: ${evidence.doc_actions_ok_30d ?? 0}; rechazadas por validación: ${evidence.doc_actions_fail_30d ?? 0}.`;
    default:
      return 'Indicador calculado desde auditoría y datos del sistema (últimos 30 días).';
  }
}
