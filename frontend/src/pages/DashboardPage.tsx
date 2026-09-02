import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { isAxiosError } from 'axios';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../auth/useAuth';
import {
  primaryAdminRoleName,
  userHasAdminAccess,
  userIsRevisorOrAdmin,
} from '../auth/role-utils';
import { DocumentosMonthlyChart } from '../components/DocumentosMonthlyChart';
import { DashboardAlerts } from '../components/dashboard/DashboardAlerts';
import { DashboardAuditSummary } from '../components/dashboard/DashboardAuditSummary';
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
import { formatTimeEc } from '../components/dashboard/dashboard-utils';
import { DashboardTypeDistribution } from '../components/dashboard/DashboardTypeDistribution';
import { DashboardTypesByMonth } from '../components/dashboard/DashboardTypesByMonth';
import { DashboardUserActivity } from '../components/dashboard/DashboardUserActivity';
import { DashboardUsersSummary } from '../components/dashboard/DashboardUsersSummary';
import { EvaluacionLikertCharts } from '../components/EvaluacionLikertCharts';
import { listSurfaceSx } from '../components/listSurfaces';
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

function ComplianceBar({
  title,
  standard,
  value,
  color,
}: {
  title: string;
  standard: string;
  value: number;
  color: 'primary' | 'success' | 'warning';
}) {
  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {standard}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
          {value}%
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={value}
        color={color}
        sx={{ mt: 0.75, height: 8, borderRadius: 999, bgcolor: 'action.hover' }}
      />
    </Box>
  );
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

  const aliveRef = useRef(false);
  const isAdminRef = useRef(false);
  const healthInflightRef = useRef(false);
  const summaryInflightRef = useRef(false);
  const manualRefreshingLockRef = useRef(false);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useLayoutEffect(() => {
    isAdminRef.current = isAdmin;
  }, [isAdmin]);

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

  const reloadSummary = useCallback(async (opts?: { silent?: boolean }) => {
    if (summaryInflightRef.current) return;
    summaryInflightRef.current = true;
    const silent = opts?.silent ?? false;
    try {
      if (!silent && aliveRef.current) {
        setSummaryError(null);
        setSummaryLoading(true);
      }
      const { data } = await apiClient.get<DashboardSummary>('/dashboard/summary');
      if (!aliveRef.current) return;
      setSummary(data);
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

  const complianceColorForPercent = (p: number): 'success' | 'warning' | 'primary' => {
    if (p >= 85) return 'success';
    if (p >= 70) return 'primary';
    return 'warning';
  };

  const initialLoad = summaryLoading && !summary;
  const showPendingSection = isRevisorOrAdmin || canReview;

  if (initialLoad) {
    return (
      <Box>
        <DashboardSkeleton />
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ justifyContent: 'flex-end', mb: 1.5 }}
      >
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
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}
          >
            <NotificationsOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Button
          type="button"
          variant="outlined"
          size="small"
          onClick={() => void handleManualDashboardRefresh()}
          disabled={manualRefreshing}
          aria-busy={manualRefreshing}
          startIcon={
            manualRefreshing ? (
              <CircularProgress aria-hidden size={14} thickness={5} sx={{ color: 'primary.main' }} />
            ) : undefined
          }
          sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}
        >
          {manualRefreshing ? 'Actualizando…' : 'Actualizar ahora'}
        </Button>
        {summary?.generatedAt ? (
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', fontWeight: 700 }}>
            Actualizado: {formatTimeEc(summary.generatedAt)}
          </Typography>
        ) : null}
      </Stack>

      <DashboardHeader
        userNombres={user?.nombres}
        userApellidos={user?.apellidos}
        userEmail={user?.email}
        roleLabel={displayRole}
        dependenciaNombre={summary?.viewer?.dependenciaNombre}
        generatedAt={summary?.generatedAt}
        loading={summaryLoading && !summary}
      />

      {summaryError ? (
        <DashboardErrorState onRetry={() => void handleManualDashboardRefresh()} retrying={manualRefreshing} />
      ) : null}

      <Box sx={{ mb: 3 }}>
        <DashboardKpiGrid
          documentos={summary?.documentos}
          loading={summaryLoading}
          creadosEsteMes={summary?.kpis.documentosCreadosEsteMes}
        />
      </Box>

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <DashboardDocumentStatus documentos={summary?.documentos} loading={summaryLoading} />
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <DashboardTypeDistribution
            items={summary?.distribucionPorTipo ?? []}
            totalDocumentos={summary?.documentos?.total ?? 0}
            loading={summaryLoading}
          />
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ ...listSurfaceSx, mb: 2.5, p: { xs: 2, md: 2.5 } }}>
        <DocumentosMonthlyChart items={summary?.documentosPorMes ?? []} loading={summaryLoading} />
      </Paper>

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper elevation={0} sx={{ ...listSurfaceSx, p: { xs: 2, md: 2.5 }, height: '100%' }}>
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

      {!isAdmin && summary?.miActividadDocumental ? (
        <Box sx={{ mb: 2.5 }}>
          <DashboardMyActivity data={summary.miActividadDocumental} loading={summaryLoading} />
        </Box>
      ) : null}

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, md: 6 }} sx={{ order: { xs: 1, md: 1 } }}>
          <DashboardPendingReview
            items={summary?.documentosPendientes ?? []}
            totalPendientes={summary?.kpis.pendientesRevision ?? 0}
            loading={summaryLoading}
            visible={showPendingSection}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }} sx={{ order: { xs: 3, md: 2 } }}>
          <DashboardQuickActions actions={quickActions} loading={summaryLoading && !summary} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }} sx={{ order: { xs: 2, md: 3 } }}>
          {!isAdmin ? (
            <DashboardRecentActivity
              items={summary?.actividadReciente ?? []}
              loading={summaryLoading}
              showViewAll={false}
              viewAllTo="/perfil"
            />
          ) : null}
        </Grid>
        <Grid size={{ xs: 12, md: 6 }} sx={{ order: { xs: 4, md: 4 } }}>
          <DashboardAlerts
            items={alertasItemsMerged}
            loading={summaryLoading || (isAdmin && healthLoading)}
            isAdmin={isAdmin}
            serverItems={summary?.kpis.alertasItems ?? []}
            ackInFlight={ackInFlight}
            ackError={ackError}
            onAcknowledge={isAdmin ? (c) => void acknowledgeServerAlert(c) : undefined}
          />
        </Grid>
      </Grid>

      {isAdmin ? (
        <Box sx={{ mb: 2.5 }}>
          <DashboardUserActivity
            items={summary?.actividadPorUsuario ?? []}
            loading={summaryLoading}
            canViewMore={canManageUsers}
          />
        </Box>
      ) : null}

      {isAdmin ? (
        <>
          <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <DashboardRecentActivity
                items={summary?.actividadReciente ?? []}
                loading={summaryLoading}
                showViewAll={isAdmin}
                viewAllTo="/admin/auditoria"
              />
            </Grid>
          </Grid>
          <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <DashboardUsersSummary
                resumen={summary?.usuariosResumen}
                loading={summaryLoading}
                canManage={canManageUsers}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
            <DashboardAuditSummary
              resumen={summary?.auditResumen}
              loading={summaryLoading}
              canView={canAudit}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ ...listSurfaceSx, p: 2.5, height: '100%' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                Señales recientes
              </Typography>
              <Stack spacing={1.25}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Último respaldo verificado
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {formatUltimoRespaldoVerificado(summary?.lastSignals.lastBackupVerifiedAt ?? null)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Última línea auditada
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {summary?.lastSignals.lastAuditAt
                      ? new Intl.DateTimeFormat('es-EC', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        }).format(new Date(summary.lastSignals.lastAuditAt))
                      : '—'}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
        </>
      ) : null}

      <EvaluacionLikertCharts data={summary?.evaluacionLikert} loading={summaryLoading} />

      {isAdmin ? (
        <Paper elevation={0} sx={{ ...listSurfaceSx, mb: 2.5, p: 2.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
            Indicadores operativos
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Porcentajes desde auditoría y datos del sistema (últimos 30 días).
          </Typography>
          {summaryLoading ? (
            <CircularProgress size={22} aria-label="Cargando indicadores" />
          ) : (
            summary?.compliance.map((m) => (
              <ComplianceBar
                key={m.key}
                title={m.title}
                standard={m.standard}
                value={m.percent}
                color={complianceColorForPercent(m.percent)}
              />
            ))
          )}
        </Paper>
      ) : null}

      {isAdmin ? (
        <Card
          id="estado-servicio"
          variant="outlined"
          sx={{ mb: 2, borderRadius: 3, scrollMarginTop: { xs: 88, md: 96 } }}
        >
          <CardContent>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 800 }}>
              Estado del servicio
            </Typography>
            <Box sx={{ minHeight: 40, display: 'flex', alignItems: 'center' }}>
              {healthLoading && <CircularProgress size={28} aria-label="Comprobando salud del API" />}
              {!healthLoading && healthError && <Alert severity="warning">{healthError}</Alert>}
              {!healthLoading && health && !healthError && (
                <Alert severity={health.database === 'down' ? 'warning' : 'success'}>
                  API en línea: {health.service} — estado {health.status}
                  {health.database !== undefined &&
                    ` — base de datos: ${health.database === 'up' ? 'conectada' : 'sin conexión'}`}
                </Alert>
              )}
            </Box>
          </CardContent>
          <CardActions sx={{ pt: 0, pb: 2, px: 2 }}>
            <Button component={RouterLink} to="/documentos" size="small">
              Ir a documentos
            </Button>
          </CardActions>
        </Card>
      ) : null}

      {isAdmin ? (
        <Card
          id="comprobacion-administrador"
          variant="outlined"
          sx={{ borderRadius: 3, scrollMarginTop: { xs: 88, md: 96 } }}
        >
          <CardContent>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 800 }}>
              Comprobación de rol administrador
            </Typography>
            {adminOk === null && !adminError && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <CircularProgress size={22} />
                <Typography variant="body2" color="text.secondary">
                  Verificando permisos…
                </Typography>
              </Box>
            )}
            {adminOk === true && (
              <Alert severity="success" sx={{ mt: 1 }}>
                Acceso administrador confirmado.
              </Alert>
            )}
            {adminError && (
              <Alert severity="error" sx={{ mt: 1 }}>
                No se pudo verificar el ámbito administrador (token o red).
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : null}
    </Box>
  );
}
