import {
  userHasAdminAccess,
  userIsRevisorOrAdmin,
} from '../../auth/role-utils';

/**
 * Visibilidad de bloques del Dashboard según rol + permisos (espejo de backend).
 * La API también filtra el payload; esto solo controla render y layout.
 */
export type DashboardUiVisibility = {
  showMyActivity: boolean;
  showPendingSection: boolean;
  showUserActivity: boolean;
  showLikert: boolean;
  showAdminInsights: boolean;
  showServiceStatus: boolean;
  showAdminAlertsAck: boolean;
  showAdminBottomRow: boolean;
};

/** Acceso real a rutas del Dashboard (permiso + guard frontend en App.tsx). */
export type DashboardRouteAccess = {
  canOpenNewDocument: boolean;
  canOpenReview: boolean;
  canOpenUsers: boolean;
  canOpenAudit: boolean;
  canOpenReports: boolean;
};

/** Rutas bajo `RoleRoute roles={['ADMIN','SUPERADMIN']}` en App.tsx. */
export function userCanAccessAdminRoutes(
  roles: { codigo: string }[] | undefined,
): boolean {
  return userHasAdminAccess(roles);
}

/**
 * Una acción rápida solo debe mostrarse si el usuario puede completar la navegación.
 * Rutas /admin/* y /reportes exigen ADMIN o SUPERADMIN además del permiso granular.
 */
export function resolveDashboardRouteAccess(input: {
  roles: { codigo: string }[];
  permissionCodes: string[];
}): DashboardRouteAccess {
  const isAdmin = userHasAdminAccess(input.roles);
  const has = (code: string) =>
    isAdmin || input.permissionCodes.includes(code);
  const canAccessAdminRoutes = userCanAccessAdminRoutes(input.roles);

  const canOpenNewDocument =
    isAdmin ||
    (input.permissionCodes.includes('DOC_CREATE') &&
      input.permissionCodes.includes('DOC_FILES_UPLOAD'));

  const canOpenReview =
    userIsRevisorOrAdmin(input.roles) || has('DOC_REVISION_RESOLVE');

  return {
    canOpenNewDocument,
    canOpenReview,
    canOpenUsers: canAccessAdminRoutes && has('USERS_READ'),
    canOpenAudit: canAccessAdminRoutes && has('AUDIT_READ'),
    canOpenReports: canAccessAdminRoutes && has('REPORTS_EXPORT'),
  };
}

export function resolveDashboardUiVisibility(input: {
  isAdmin: boolean;
  permissionCodes: string[];
  canReview: boolean;
  canManageUsers: boolean;
  canAudit: boolean;
}): DashboardUiVisibility {
  const has = (code: string) =>
    input.isAdmin || input.permissionCodes.includes(code);

  const showLikert =
    input.isAdmin || input.canAudit || has('DASHBOARD_ADMIN_READ');
  const showUserActivity = input.isAdmin || input.canManageUsers;
  const showAdminInsights =
    input.isAdmin ||
    input.canManageUsers ||
    input.canAudit ||
    has('DASHBOARD_ADMIN_READ');
  const showServiceStatus = input.isAdmin;
  const showAdminBottomRow =
    input.isAdmin || showLikert || showAdminInsights || showServiceStatus;

  return {
    showMyActivity: !input.isAdmin,
    showPendingSection: input.canReview,
    showUserActivity,
    showLikert,
    showAdminInsights,
    showServiceStatus,
    showAdminAlertsAck: input.isAdmin,
    showAdminBottomRow,
  };
}
