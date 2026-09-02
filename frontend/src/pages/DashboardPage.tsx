import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import {
  Box,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tooltip,
} from '@mui/material';
import { isAxiosError } from 'axios';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../auth/useAuth';
import {
  primaryAdminRoleName,
  userHasAdminAccess,
  userIsRevisorOrAdmin,
} from '../auth/role-utils';
import { DocumentosMonthlyChart } from '../components/DocumentosMonthlyChart';
import { DashboardAlerts } from '../components/dashboard/DashboardAlerts';
import { DashboardAdminInsights } from '../components/dashboard/DashboardAdminInsights';
import { DashboardDocumentStatus } from '../components/dashboard/DashboardDocumentStatus';
import { DashboardErrorState } from '../components/dashboard/DashboardErrorState';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { DashboardKpiGrid } from '../components/dashboard/DashboardKpiGrid';
import { DashboardMonthlyComparison } from '../components/dashboard/DashboardMonthlyComparison';
import { DashboardMyActivity } from '../components/dashboard/DashboardMyActivity';
import { DashboardPendingReview } from '../components/dashboard/DashboardPendingReview';
import { DashboardQuickActions } from '../components/dashboard/DashboardQuickActions';
import { buildQuickActions } from '../components/dashboard/dashboard-quick-actions';
import { DashboardRecentActivity } from '../components/dashboard/DashboardRecentActivity';
import { DashboardSkeleton } from '../components/dashboard/DashboardSkeleton';
import type { DashboardSummary } from '../components/dashboard/dashboard-types';
import { DashboardTypeDistribution } from '../components/dashboard/DashboardTypeDistribution';
import { DashboardTypesByMonth } from '../components/dashboard/DashboardTypesByMonth';
import { DashboardUserActivity } from '../components/dashboard/DashboardUserActivity';
import {
  ACTIVIDAD_DOCUMENTAL_PERIODO_DEFAULT,
  type ActividadDocumentalPeriodo,
} from '../components/dashboard/actividad-documental-periodo';
import { DashboardServiceStatus } from '../components/dashboard/DashboardServiceStatus';
import { DASHBOARD_SECTION_GAP } from '../components/dashboard/dashboard-surface';
import { dashboardCardPadding, dashboardSurfaceSx } from '../components/dashboard/dashboard-surface';
import { EvaluacionLikertCharts } from '../components/EvaluacionLikertCharts';
import {
  pickFirstDashboardAlertDestination,
  type DashboardAlertItemClient,
} from '../nav/dashboard-alert-navigation';
import { useDashboardLcpReporting } from '../perf/useDashboardLcpReporting';

type HealthResponse = {
  status: string;
  service: string;
  database?: 'up' | 'down';
};

function formatUltimoRespaldoVerificado(iso: string | null): string {
  if (!iso) {
    return 'Sin registro en el sistema (regístrelo desde Respaldos tras la copia).';
  }
  const d = new Date(iso);
  const now = new Date();
  const sod = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yod = new Date(sod);
  yod.setDate(yod.getDate() - 1);
  const time = new Intl.DateTimeFormat('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
  if (d >= sod) return `hoy ${time}`;
  if (d >= yod) return `ayer ${time}`;
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = userHasAdminAccess(user?.roles);
  const isRevisorOrAdmin = userIsRevisorOrAdmin(user?.roles);
  useDashboardLcpReporting(isAdmin);

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [adminOk, setAdminOk] = useState<boolean | null>(null);
  const [adminError, setAdminError] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [ackInFlight, setAckInFlight] = useState<string | null>(null);
  const [ackError, setAckError] = useState<string | null>(null);
  const [myPermissionCodes, setMyPermissionCodes] = useState<string[] | null>(null);
  const [actividadPeriodo, setActividadPeriodo] = useState<ActividadDocumentalPeriodo>(
    ACTIVIDAD_DOCUMENTAL_PERIODO_DEFAULT,
  );

  const aliveRef = useRef(false);
  const isAdminRef = useRef(false);
  const healthInflightRef = useRef(false);
  const summaryInflightRef = useRef(false);
  const manualRefreshingLockRef = useRef(false);
  const actividadPeriodoRef = useRef<ActividadDocumentalPeriodo>(
    ACTIVIDAD_DOCUMENTAL_PERIODO_DEFAULT,
  );

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useLayoutEffect(() => {
    isAdminRef.current = isAdmin;
  }, [isAdmin]);

  useLayoutEffect(() => {
    actividadPeriodoRef.current = actividadPeriodo;
  }, [actividadPeriodo]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!user?.id) {
          if (!cancelled) setMyPermissionCodes(null);
          return;
        }
        const res = await apiClient.get<{ codigos: string[] }>('/rbac/me/permissions');
        if (cancelled) return;
        setMyPermissionCodes(Array.isArray(res.data?.codigos) ? res.data.codigos : []);
      } catch {
        if (!cancelled) setMyPermissionCodes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const reloadHealth = useCallback(async (opts?: { silent?: boolean }) => {
    if (!isAdminRef.current) return;
    if (healthInflightRef.current) return;
    healthInflightRef.current = true;
    const silent = opts?.silent ?? false;
    try {
      if (!silent && aliveRef.current) setHealthLoading(true);
      const res = await apiClient.get<HealthResponse>('/health');
      if (!aliveRef.current || !isAdminRef.current) return;
      setHealth(res.data);
      setHealthError(null);
    } catch {
      if (!aliveRef.current || !isAdminRef.current) return;
      setHealthError('No se pudo contactar al API. Compruebe que el backend esté en marcha.');
    } finally {
      healthInflightRef.current = false;
      if (aliveRef.current && isAdminRef.current) setHealthLoading(false);
    }
  }, []);

  const reloadSummary = useCallback(async (opts?: {
    silent?: boolean;
    actividadPeriodo?: ActividadDocumentalPeriodo;
  }) => {
    if (summaryInflightRef.current) return;
    summaryInflightRef.current = true;
    const silent = opts?.silent ?? false;
    const period = opts?.actividadPeriodo ?? actividadPeriodoRef.current;
    try {
      if (!silent && aliveRef.current) {
        setSummaryError(null);
        setSummaryLoading(true);
      }
      const { data } = await apiClient.get<DashboardSummary>('/dashboard/summary', {
        params: { actividadPeriodo: period },
      });
      if (!aliveRef.current) return;
      setSummary(data);
      setActividadPeriodo(data.actividadPeriodo ?? period);
      setSummaryError(null);
    } catch {
      if (!aliveRef.current) return;
      setSummaryError('No fue posible cargar la información del Dashboard.');
      setSummary(null);
    } finally {
      summaryInflightRef.current = false;
      if (aliveRef.current) setSummaryLoading(false);
    }
  }, []);

  const handleActividadPeriodoChange = useCallback(
    (period: ActividadDocumentalPeriodo) => {
      setActividadPeriodo(period);
      void reloadSummary({ silent: false, actividadPeriodo: period });
    },
    [reloadSummary],
  );

  const acknowledgeServerAlert = useCallback(
    async (codigo: string) => {
      setAckError(null);
      setAckInFlight(codigo);
      try {
        await apiClient.post('/dashboard/admin/alerts/acknowledge', { codigo });
        await reloadSummary({ silent: true });
      } catch (e: unknown) {
        let msg = 'No se pudo marcar la alerta como revisada.';
        if (isAxiosError(e) && e.response?.status === 403) {
          msg = 'Solo un administrador puede descartar alertas del panel.';
        }
        setAckError(msg);
      } finally {
        setAckInFlight(null);
      }
    },
    [reloadSummary],
  );

  const reloadAdminPing = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await apiClient.get<{ ok: boolean; scope: string }>('/admin/ping');
      if (!aliveRef.current) return;
      setAdminOk(res.data.ok);
      setAdminError(false);
    } catch {
      if (!aliveRef.current) return;
      setAdminError(true);
      setAdminOk(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    const bootstrap = window.setTimeout(() => void reloadSummary({ silent: true }), 0);
    const si = window.setInterval(() => void reloadSummary({ silent: true }), 30_000);
    return () => {
      window.clearTimeout(bootstrap);
      window.clearInterval(si);
    };
  }, [reloadSummary]);

  useEffect(() => {
    if (!isAdmin) return;
    const bootstrap = window.setTimeout(() => void reloadHealth({ silent: true }), 0);
    const hi = window.setInterval(() => void reloadHealth({ silent: true }), 30_000);
    return () => {
      window.clearTimeout(bootstrap);
      window.clearInterval(hi);
    };
  }, [isAdmin, reloadHealth]);

  useEffect(() => {
    if (isAdmin) return;
    const t = window.setTimeout(() => {
      setHealth(null);
      setHealthError(null);
      setHealthLoading(false);
    }, 0);
    return () => window.clearTimeout(t);
  }, [isAdmin]);

  useEffect(() => {
    const t = window.setTimeout(() => void reloadAdminPing(), 0);
    return () => window.clearTimeout(t);
  }, [reloadAdminPing]);

  const handleManualDashboardRefresh = useCallback(async () => {
    if (manualRefreshingLockRef.current) return;
    manualRefreshingLockRef.current = true;
    setManualRefreshing(true);
    try {
      const tasks = [reloadSummary({ silent: false }), reloadAdminPing()];
      if (isAdmin) tasks.push(reloadHealth({ silent: false }));
      await Promise.all(tasks);
    } finally {
      manualRefreshingLockRef.current = false;
      if (aliveRef.current) setManualRefreshing(false);
    }
  }, [isAdmin, reloadAdminPing, reloadHealth, reloadSummary]);

  useEffect(() => {
    const raw = location.hash.replace(/^#/, '').trim();
    if (!raw) return;
    requestAnimationFrame(() => {
      document.getElementById(raw)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [location.pathname, location.hash]);

  const alertasItemsMerged = useMemo((): DashboardAlertItemClient[] => {
    const items: DashboardAlertItemClient[] = [...(summary?.kpis.alertasItems ?? [])];
    if (healthError) {
      items.push({
        codigo: 'API_SALUD_CLIENTE',
        mensaje:
          'Sin contacto con el API en la verificación de salud (compruebe que el backend esté en marcha).',
      });
    }
    if (health?.database === 'down') {
      items.push({
        codigo: 'DB_SIN_CONEXION',
        mensaje:
          'Salud del servicio: la base de datos figura como sin conexión; revise MySQL/MariaDB.',
      });
    }
    if (isAdmin && adminError) {
      items.push({
        codigo: 'ADMIN_PING_FALLIDO',
        mensaje:
          'No se pudo verificar el permiso de administrador (sesión o conexión con el servidor).',
      });
    }
    return items;
  }, [summary?.kpis.alertasItems, healthError, health?.database, isAdmin, adminError]);

  const displayRole =
    primaryAdminRoleName(user?.roles) ?? user?.roles[0]?.nombre ?? 'Usuario';

  const permissionCodes = myPermissionCodes ?? [];
  const canCreateDocumento =
    isAdmin ||
    (permissionCodes.includes('DOC_CREATE') && permissionCodes.includes('DOC_FILES_UPLOAD'));
  const canReview =
    isRevisorOrAdmin || permissionCodes.includes('DOC_REVISION_RESOLVE');
  const canManageUsers = isAdmin || permissionCodes.includes('USERS_READ');
  const canAudit = isAdmin || permissionCodes.includes('AUDIT_READ');
  const canReports = isAdmin || permissionCodes.includes('REPORTS_EXPORT');

  const quickActions = useMemo(
    () =>
      buildQuickActions({
        isAdmin,
        canCreateDocumento,
        canReview,
        canManageUsers,
        canAudit,
        canReports,
      }),
    [isAdmin, canCreateDocumento, canReview, canManageUsers, canAudit, canReports],
  );

  const handleBellClick = () => {
    if (isAdmin && alertasItemsMerged.length > 0) {
      const el = document.getElementById('alertas');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      const dest = pickFirstDashboardAlertDestination(alertasItemsMerged, isAdmin);
      if (dest) navigate(dest);
      return;
    }
    if ((summary?.kpis.pendientesRevision ?? 0) > 0) {
      navigate('/documentos?estado=EN_REVISION');
    }
  };

  const initialLoad = summaryLoading && !summary;
  const showPendingSection = isRevisorOrAdmin || canReview;
  const sectionMb = { mb: DASHBOARD_SECTION_GAP };

  if (initialLoad) {
    return (
      <Box>
        <DashboardSkeleton />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', mb: 1 }}>
        <Tooltip
          title={
            isAdmin
              ? alertasItemsMerged.length > 0
                ? `${alertasItemsMerged.length} alerta(s) operativa(s)`
                : 'Sin alertas activas'
              : (summary?.kpis.pendientesRevision ?? 0) > 0
                ? `${summary?.kpis.pendientesRevision} pendiente(s) de revisión`
                : 'Sin pendientes de revisión'
          }
        >
          <IconButton
            aria-label="Ver alertas o pendientes"
            onClick={handleBellClick}
            size="small"
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.paper' }}
          >
            <NotificationsOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <DashboardHeader
        userNombres={user?.nombres}
        userApellidos={user?.apellidos}
        userEmail={user?.email}
        roleLabel={displayRole}
        dependenciaNombre={summary?.viewer?.dependenciaNombre}
        generatedAt={summary?.generatedAt}
        loading={summaryLoading && !summary}
        refreshing={manualRefreshing}
        onRefresh={() => void handleManualDashboardRefresh()}
      />

      {summaryError ? (
        <DashboardErrorState onRetry={() => void handleManualDashboardRefresh()} retrying={manualRefreshing} />
      ) : null}

      <Box sx={sectionMb}>
        <DashboardKpiGrid
          documentos={summary?.documentos}
          loading={summaryLoading}
          creadosEsteMes={summary?.kpis.documentosCreadosEsteMes}
        />
      </Box>

      <Grid container spacing={2} sx={{ ...sectionMb, alignItems: 'flex-start' }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <DashboardDocumentStatus documentos={summary?.documentos} loading={summaryLoading} />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <DashboardTypeDistribution
            items={summary?.distribucionPorTipo ?? []}
            totalDocumentos={summary?.documentos?.total ?? 0}
            loading={summaryLoading}
          />
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ ...dashboardSurfaceSx, ...sectionMb, p: dashboardCardPadding }}>
        <DocumentosMonthlyChart items={summary?.documentosPorMes ?? []} loading={summaryLoading} />
      </Paper>

      <Grid container spacing={2} sx={{ ...sectionMb, alignItems: 'flex-start' }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper elevation={0} sx={{ ...dashboardSurfaceSx, p: dashboardCardPadding }}>
            <DashboardTypesByMonth
              series={summary?.tiposDocumentalesSeries ?? []}
              items={summary?.tiposPorMes ?? []}
              loading={summaryLoading}
            />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <DashboardMonthlyComparison actividad={summary?.actividadMes} loading={summaryLoading} />
        </Grid>
      </Grid>

      {!isAdmin ? (
        <Box sx={sectionMb}>
          <DashboardMyActivity
            data={summary?.miActividadDocumental}
            periodo={actividadPeriodo}
            onPeriodoChange={handleActividadPeriodoChange}
            loading={summaryLoading}
          />
        </Box>
      ) : null}

      <Grid container spacing={2} sx={{ ...sectionMb, alignItems: 'flex-start' }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <DashboardPendingReview
            items={summary?.documentosPendientes ?? []}
            totalPendientes={summary?.kpis.pendientesRevision ?? 0}
            loading={summaryLoading}
            visible={showPendingSection}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <DashboardQuickActions actions={quickActions} loading={summaryLoading && !summary} />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ ...sectionMb, alignItems: 'flex-start' }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <DashboardRecentActivity
            items={summary?.actividadReciente ?? []}
            loading={summaryLoading}
            showViewAll={isAdmin}
            viewAllTo={isAdmin ? '/admin/auditoria' : '/perfil'}
            viewAllLabel={isAdmin ? 'Ver toda la actividad' : 'Ver toda la actividad'}
          />
        </Grid>
        {isAdmin ? (
          <Grid size={{ xs: 12, md: 6 }}>
            <EvaluacionLikertCharts
              variant="compact"
              data={summary?.evaluacionLikert}
              loading={summaryLoading}
              compliance={summary?.compliance ?? []}
            />
          </Grid>
        ) : null}
      </Grid>

      {isAdmin ? (
        <Box sx={sectionMb}>
          <DashboardUserActivity
            items={summary?.actividadPorUsuario ?? []}
            meta={summary?.actividadPorUsuarioMeta}
            periodo={actividadPeriodo}
            onPeriodoChange={handleActividadPeriodoChange}
            loading={summaryLoading}
            canViewMore={canManageUsers}
          />
        </Box>
      ) : null}

      {isAdmin ? (
        <Grid container spacing={2} sx={{ alignItems: 'flex-start' }}>
          <Grid size={{ xs: 12, lg: 4 }}>
            <DashboardAlerts
              items={alertasItemsMerged}
              loading={summaryLoading || healthLoading}
              isAdmin={isAdmin}
              serverItems={summary?.kpis.alertasItems ?? []}
              ackInFlight={ackInFlight}
              ackError={ackError}
              onAcknowledge={(c) => void acknowledgeServerAlert(c)}
            />
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <DashboardAdminInsights
              usuarios={summary?.usuariosResumen}
              audit={summary?.auditResumen}
              lastBackupAt={summary?.lastSignals.lastBackupVerifiedAt ?? null}
              lastAuditAt={summary?.lastSignals.lastAuditAt ?? null}
              loading={summaryLoading}
              canManageUsers={canManageUsers}
              canViewAudit={canAudit}
              formatBackup={formatUltimoRespaldoVerificado}
            />
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Box id="estado-servicio" sx={{ scrollMarginTop: { xs: 88, md: 96 } }}>
              <DashboardServiceStatus
                health={health}
                healthLoading={healthLoading}
                healthError={healthError}
                adminOk={adminOk}
                adminError={adminError}
                adminLoading={adminOk === null && !adminError}
              />
            </Box>
          </Grid>
        </Grid>
      ) : (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <DashboardAlerts
              items={alertasItemsMerged}
              loading={summaryLoading}
              isAdmin={false}
              serverItems={summary?.kpis.alertasItems ?? []}
            />
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
