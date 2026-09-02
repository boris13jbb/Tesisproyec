import { PERM } from '../auth/permission-codes';
import {
  jwtUserIsAdmin,
  jwtUserIsRevisor,
  type JwtRequestUser,
} from '../auth/request-user';

/** Reglas de visibilidad del payload de GET /dashboard/summary (mínimo privilegio). */
export type DashboardSummaryVisibility = {
  isAdmin: boolean;
  /** Bloque «Mi actividad» (documentos propios). */
  includeMiActividad: boolean;
  /** Matriz actividad documental por usuario. */
  includeActividadPorUsuario: boolean;
  /** Resumen usuarios activos/inactivos. */
  includeUsuariosResumen: boolean;
  /** Conteos de auditoría del día. */
  includeAuditResumen: boolean;
  /** Semáforo documental Likert. */
  includeLikert: boolean;
  /** Indicadores ISO/ASVS de cumplimiento. */
  includeCompliance: boolean;
  /** Señales operativas (último audit/login/backup). */
  includeLastSignals: boolean;
  /** Alertas de seguridad/operación (403, login fail, backup). */
  includeAdminSecurityAlerts: boolean;
  /** Consultas globales a audit_logs para métricas institucionales. */
  includeGlobalAuditQueries: boolean;
  /** Lista de documentos EN_REVISION visibles. */
  canSeePendientesList: boolean;
};

export function resolveDashboardSummaryVisibility(
  viewer: JwtRequestUser,
  permCodes: ReadonlySet<string>,
): DashboardSummaryVisibility {
  const isAdmin = jwtUserIsAdmin(viewer);
  const has = (code: string) => isAdmin || permCodes.has(code);

  const includeActividadPorUsuario = isAdmin || has(PERM.USERS_READ);
  const includeUsuariosResumen = isAdmin || has(PERM.USERS_READ);
  const includeAuditResumen = isAdmin || has(PERM.AUDIT_READ);
  const includeLikert =
    isAdmin || has(PERM.DASHBOARD_ADMIN_READ) || has(PERM.AUDIT_READ);
  const includeCompliance = includeLikert;
  const includeLastSignals = isAdmin || has(PERM.DASHBOARD_ADMIN_READ);
  const includeAdminSecurityAlerts = isAdmin;
  const includeGlobalAuditQueries =
    includeCompliance ||
    includeLastSignals ||
    includeAuditResumen ||
    includeAdminSecurityAlerts;

  return {
    isAdmin,
    includeMiActividad: !isAdmin,
    includeActividadPorUsuario,
    includeUsuariosResumen,
    includeAuditResumen,
    includeLikert,
    includeCompliance,
    includeLastSignals,
    includeAdminSecurityAlerts,
    includeGlobalAuditQueries,
    canSeePendientesList:
      isAdmin || jwtUserIsRevisor(viewer) || has(PERM.DOC_REVISION_RESOLVE),
  };
}
