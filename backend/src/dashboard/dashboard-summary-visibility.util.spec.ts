import { PERM } from '../auth/permission-codes';
import type { JwtRequestUser } from '../auth/request-user';
import { resolveDashboardSummaryVisibility } from './dashboard-summary-visibility.util';

function viewer(roles: string[]): JwtRequestUser {
  return {
    id: 'u1',
    email: 'test@local.test',
    nombres: 'Test',
    apellidos: 'User',
    roles: roles.map((codigo) => ({ codigo, nombre: codigo })),
    dependenciaId: null,
  };
}

describe('resolveDashboardSummaryVisibility', () => {
  it('SUPERADMIN recibe panel administrativo completo', () => {
    const v = resolveDashboardSummaryVisibility(
      viewer(['SUPERADMIN']),
      new Set(),
    );
    expect(v.isAdmin).toBe(true);
    expect(v.includeActividadPorUsuario).toBe(true);
    expect(v.includeLikert).toBe(true);
    expect(v.includeCompliance).toBe(true);
    expect(v.includeLastSignals).toBe(true);
    expect(v.includeMiActividad).toBe(false);
  });

  it('USER sin permisos extra solo recibe bloque propio', () => {
    const v = resolveDashboardSummaryVisibility(
      viewer(['USUARIO']),
      new Set([PERM.DASHBOARD_SUMMARY, PERM.DOC_READ]),
    );
    expect(v.isAdmin).toBe(false);
    expect(v.includeMiActividad).toBe(true);
    expect(v.includeActividadPorUsuario).toBe(false);
    expect(v.includeUsuariosResumen).toBe(false);
    expect(v.includeAuditResumen).toBe(false);
    expect(v.includeLikert).toBe(false);
    expect(v.includeCompliance).toBe(false);
    expect(v.includeLastSignals).toBe(false);
    expect(v.includeGlobalAuditQueries).toBe(false);
  });

  it('REVISOR ve pendientes con DOC_REVISION_RESOLVE', () => {
    const v = resolveDashboardSummaryVisibility(
      viewer(['REVISOR']),
      new Set([PERM.DOC_REVISION_RESOLVE]),
    );
    expect(v.canSeePendientesList).toBe(true);
    expect(v.includeActividadPorUsuario).toBe(false);
  });

  it('AUDITOR con AUDIT_READ recibe métricas de auditoría sin matriz de usuarios', () => {
    const v = resolveDashboardSummaryVisibility(
      viewer(['AUDITOR']),
      new Set([PERM.AUDIT_READ]),
    );
    expect(v.includeAuditResumen).toBe(true);
    expect(v.includeLikert).toBe(true);
    expect(v.includeActividadPorUsuario).toBe(false);
    expect(v.includeLastSignals).toBe(false);
  });

  it('permiso USERS_READ habilita actividad por usuario sin rol ADMIN', () => {
    const v = resolveDashboardSummaryVisibility(
      viewer(['USUARIO']),
      new Set([PERM.USERS_READ]),
    );
    expect(v.includeActividadPorUsuario).toBe(true);
    expect(v.includeUsuariosResumen).toBe(true);
    expect(v.isAdmin).toBe(false);
  });
});
