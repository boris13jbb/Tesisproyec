import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { isAxiosError } from 'axios';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { primaryAdminRoleName, userHasAdminAccess } from '../auth/role-utils';
import { DocumentosMonthlyChart } from '../components/DocumentosMonthlyChart';
import { useDashboardLcpReporting } from '../perf/useDashboardLcpReporting';
import { listSurfaceSx } from '../components/listSurfaces';
import { PageHeader } from '../components/PageHeader';
import { labelDocumentoEstado, documentoEstadoTone } from '../constants/documento-estado';
import {
  pickFirstDashboardAlertDestination,
  type DashboardAlertItemClient,
} from '../nav/dashboard-alert-navigation';

type HealthResponse = {
  status: string;
  service: string;
  database?: 'up' | 'down';
};

type DocumentoRecentRow = {
  id: string;
  codigo: string;
  asunto: string;
  estado: string;
  fechaDocumento: string;
  ultimaActividadAt: string;
};

type ComplianceMetric = {
  key:
    | 'access_control'
    | 'identity_management'
    | 'authentication_information'
    | 'document_traceability'
    | 'input_validation';
  title: string;
  standard: string;
  percent: number;
  evidence: Record<string, number | string | null>;
};

type DashboardDocumentosBloque = {
  total: number;
  registrados: number;
  borradores: number;
  enRevision: number;
  aprobados: number;
  rechazados: number;
  creadosEsteMes: number;
  acumuladosAnteriores: number;
};

type DashboardDocumentoPorMesItem = {
  anio: number;
  mes: number;
  nombreMes: string;
  cantidad: number;
};

type DashboardSummary = {
  generatedAt: string;
  kpis: {
    documentosTotal: number;
    documentosCreadosEsteMes: number;
    pendientesRevision: number;
    usuariosActivos: number | null;
    alertas: number;
    alertasItems: { codigo: string; mensaje: string }[];
  };
  documentos: DashboardDocumentosBloque;
  documentosPorMes: DashboardDocumentoPorMesItem[];
  documentosRecientes: DocumentoRecentRow[];
  compliance: ComplianceMetric[];
  lastSignals: {
    lastAuditAt: string | null;
    lastLoginOkAt: string | null;
    lastBackupVerifiedAt: string | null;
  };
};

function initialsFromUser(email: string, nombres?: string | null, apellidos?: string | null): string {
  const joined = `${nombres ?? ''} ${apellidos ?? ''}`.trim();
  if (joined) {
    const parts = joined.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

/** Fecha tipo “última actividad” en formato local ecuatoriano DD/MM/AAAA. */
function formatShortDateEc(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

function formatTimeEc(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(d);
}

/** Texto del pie de cumplimiento: respaldo desde auditoría `BACKUP_VERIFIED`. */
function formatUltimoRespaldoVerificado(iso: string | null): string {
  if (!iso) {
    return 'Último respaldo verificado: sin registro en el sistema (regístrelo desde Respaldos tras la copia).';
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
  if (d >= sod) {
    return `Último respaldo verificado: hoy ${time}`;
  }
  if (d >= yod) {
    return `Último respaldo verificado: ayer ${time}`;
  }
  return `Último respaldo verificado: ${formatShortDateEc(iso)} ${time}`;
}

function formatRelativeEs(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return formatShortDateEc(iso);
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'Hace un momento';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `Hace ${days} d`;
  return formatShortDateEc(iso);
}

type KpiAccent = 'primary' | 'warning' | 'success' | 'error';

function KpiCard({
  icon,
  title,
  subtitle,
  value,
  accent = 'primary',
  footnote,
  footnotePositive,
  detailLines,
  interactive,
  interactiveLabel,
  onInteractiveAction,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  value: string;
  accent?: KpiAccent;
  footnote?: string;
  footnotePositive?: boolean;
  /** Viñetas breves bajo el valor (p. ej. desglose de alertas). */
  detailLines?: string[];
  /** Tarjeta pulsable (Enter/Espacio/clic) con estilo de botón. */
  interactive?: boolean;
  interactiveLabel?: string;
  onInteractiveAction?: () => void;
}) {
  const theme = useTheme();
  const accentColor = theme.palette[accent].main;
  const paperInteractiveProps =
    interactive && onInteractiveAction
      ? ({
          role: 'button' as const,
          tabIndex: 0,
          onClick: onInteractiveAction,
          onKeyDown: (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onInteractiveAction();
            }
          },
        } satisfies React.ComponentProps<typeof Paper>)
      : {};

  return (
    <Paper
      elevation={0}
      {...paperInteractiveProps}
      aria-label={interactive ? interactiveLabel : undefined}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: (t) =>
          t.palette.mode === 'dark'
            ? '0 8px 24px rgba(0, 0, 0, 0.28)'
            : '0 8px 24px rgba(15, 23, 42, 0.06)',
        p: 2.5,
        height: '100%',
        bgcolor: 'background.paper',
        transition: 'box-shadow 140ms ease, transform 140ms ease, border-color 140ms ease',
        ...(interactive
          ? {
              cursor: 'pointer',
              '&:hover': {
                boxShadow: (t) =>
                  t.palette.mode === 'dark'
                    ? '0 14px 32px rgba(0, 0, 0, 0.4)'
                    : '0 14px 32px rgba(15, 23, 42, 0.10)',
                transform: 'translateY(-1px)',
                borderColor: 'secondary.light',
              },
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'secondary.main',
                outlineOffset: 2,
              },
            }
          : {
              '&:hover': {
                boxShadow: (t) =>
                  t.palette.mode === 'dark'
                    ? '0 14px 32px rgba(0, 0, 0, 0.4)'
                    : '0 14px 32px rgba(15, 23, 42, 0.10)',
              },
            }),
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box
          aria-hidden
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: alpha(accentColor, 0.12),
            color: accentColor,
          }}
        >
          {icon}
        </Box>
        {footnotePositive ? (
          <TrendingUpIcon sx={{ fontSize: 18, color: 'success.main' }} aria-hidden />
        ) : null}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5 }}>
        {title}
        {subtitle ? (
          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
            · {subtitle}
          </Typography>
        ) : null}
      </Typography>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 800,
          letterSpacing: 0.2,
          color: 'text.primary',
        }}
      >
        {value}
      </Typography>
      {footnote ? (
        <Typography
          variant="caption"
          sx={{
            mt: 0.75,
            display: 'block',
            fontWeight: 700,
            color: footnotePositive ? 'success.main' : 'text.secondary',
          }}
        >
          {footnote}
        </Typography>
      ) : null}
      {detailLines?.length ? (
        <Box
          component="ul"
          sx={{
            m: 0,
            mt: 1,
            pl: 2,
            pr: 0,
            maxHeight: 112,
            overflow: 'auto',
          }}
        >
          {detailLines.map((line, i) => (
            <Typography
              key={`${i}-${line.slice(0, 24)}`}
              component="li"
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'list-item',
                lineHeight: 1.35,
                '&:not(:last-child)': { mb: 0.35 },
              }}
            >
              {line}
            </Typography>
          ))}
        </Box>
      ) : null}
    </Paper>
  );
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
        sx={{
          mt: 0.75,
          height: 8,
          borderRadius: 999,
          bgcolor: 'action.hover',
        }}
      />
    </Box>
  );
}

export function DashboardPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isAdminForLcp = userHasAdminAccess(user?.roles);
  useDashboardLcpReporting(isAdminForLcp);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [adminOk, setAdminOk] = useState<boolean | null>(null);
  const [adminError, setAdminError] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  /** Evita segundo clic mientras refresco manual paralelo está en curso. */
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [ackInFlight, setAckInFlight] = useState<string | null>(null);
  const [ackError, setAckError] = useState<string | null>(null);

  const isAdmin = userHasAdminAccess(user?.roles);

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

  /** Solo ADMIN: la UI de salud y las alertas enriquecidas con `API_SALUD_*` están ocultas al resto. */
  const reloadHealth = useCallback(async (opts?: { silent?: boolean }) => {
    if (!isAdminRef.current) return;
    if (healthInflightRef.current) return;
    healthInflightRef.current = true;
    const silent = opts?.silent ?? false;
    try {
      if (!silent && aliveRef.current) {
        setHealthLoading(true);
      }
      const res = await apiClient.get<HealthResponse>('/health');
      if (!aliveRef.current || !isAdminRef.current) return;
      setHealth(res.data);
      setHealthError(null);
    } catch {
      if (!aliveRef.current || !isAdminRef.current) return;
      setHealthError(
        'No se pudo contactar al API. Compruebe que el backend esté en marcha.',
      );
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
      setSummaryError('No se pudo cargar el resumen del dashboard.');
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

  /** Resumen del panel: todos los roles; sondeo silencioso cada 30s. */
  useEffect(() => {
    const bootstrap = window.setTimeout(() => {
      void reloadSummary({ silent: true });
    }, 0);
    const si = window.setInterval(() => void reloadSummary({ silent: true }), 30_000);
    return () => {
      window.clearTimeout(bootstrap);
      window.clearInterval(si);
    };
  }, [reloadSummary]);

  /** Salud del API: solo ADMIN (evita tráfico innecesario para usuarios operativos). */
  useEffect(() => {
    if (!isAdmin) return;
    const bootstrap = window.setTimeout(() => {
      void reloadHealth({ silent: true });
    }, 0);
    const hi = window.setInterval(() => void reloadHealth({ silent: true }), 30_000);
    return () => {
      window.clearTimeout(bootstrap);
      window.clearInterval(hi);
    };
  }, [isAdmin, reloadHealth]);

  /** Al no ser ADMIN, no conservar estado de `/health` ni dejar `healthLoading` colgado. */
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
      if (isAdmin) {
        tasks.push(reloadHealth({ silent: false }));
      }
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

  const docsLoading = summaryLoading;

  const formattedNumber = (n: number | null) =>
    n === null ? '—' : new Intl.NumberFormat('es-EC').format(n);

  const docFootnoteEsteMes = useMemo(() => {
    if (!summary?.documentos) return undefined;
    const n = summary.documentos.creadosEsteMes ?? 0;
    const formatted = new Intl.NumberFormat('es-EC').format(n);
    return `${formatted} documento(s) registrado(s) este mes`;
  }, [summary]);

  const docFootnoteAcumulado = useMemo(() => {
    if (!summary?.documentos) return undefined;
    const n = summary.documentos.acumuladosAnteriores ?? 0;
    const formatted = new Intl.NumberFormat('es-EC').format(n);
    return `${formatted} documento(s) acumulado(s) en meses anteriores`;
  }, [summary]);

  /** Ítems de alerta: API + comprobaciones locales (mismo shape que `alertasItems`). */
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

  const alertsCount = alertasItemsMerged.length;

  const alertsNavigateTarget = useMemo(
    () => pickFirstDashboardAlertDestination(alertasItemsMerged, isAdmin),
    [alertasItemsMerged, isAdmin],
  );

  const alertDetailLines = useMemo(
    () => alertasItemsMerged.map((i) => i.mensaje),
    [alertasItemsMerged],
  );

  const serverAlertItems = summary?.kpis.alertasItems ?? [];

  const alertsCardInteractive =
    !summaryLoading &&
    !healthLoading &&
    alertsCount > 0 &&
    Boolean(alertsNavigateTarget);

  const navigateToFirstAlert = () => {
    if (alertsNavigateTarget) {
      navigate(alertsNavigateTarget);
    }
  };

  const complianceColorForPercent = (p: number): 'success' | 'warning' | 'primary' => {
    if (p >= 85) return 'success';
    if (p >= 70) return 'primary';
    return 'warning';
  };

  const displayRole =
    primaryAdminRoleName(user?.roles) ?? user?.roles[0]?.nombre ?? 'Usuario';

  const greetingName = useMemo(() => {
    const joined = `${user?.nombres ?? ''} ${user?.apellidos ?? ''}`.trim();
    return joined || user?.email || 'usuario';
  }, [user?.nombres, user?.apellidos, user?.email]);

  const bellCount = isAdmin ? alertsCount : (summary?.kpis.pendientesRevision ?? 0);

  const handleBellClick = () => {
    if (isAdmin && alertsCount > 0) {
      const el = document.getElementById('alertas');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      navigateToFirstAlert();
      return;
    }
    if ((summary?.kpis.pendientesRevision ?? 0) > 0) {
      navigate('/documentos?estado=EN_REVISION');
    }
  };

  const generatedAt = summary?.generatedAt;
  const updatedAtLabel = useMemo(() => {
    if (!generatedAt) return null;
    return `Actualizado: ${formatTimeEc(generatedAt)}`;
  }, [generatedAt]);

  return (
    <Box>
      <PageHeader
        title="Panel principal"
        description={`Bienvenido de nuevo, ${greetingName}. Indicadores en tiempo real del SGD-GADPR-LM.`}
        actions={
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
          >
            <Tooltip
              title={
                isAdmin
                  ? alertsCount > 0
                    ? `${alertsCount} alerta(s) operativa(s)`
                    : 'Sin alertas activas'
                  : (summary?.kpis.pendientesRevision ?? 0) > 0
                    ? `${summary?.kpis.pendientesRevision} pendiente(s) de revisión`
                    : 'Sin pendientes de revisión'
              }
            >
              <IconButton
                aria-label="Ver alertas o pendientes"
                onClick={handleBellClick}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                }}
              >
                <Badge
                  color="error"
                  badgeContent={summaryLoading || healthLoading ? 0 : bellCount}
                  max={99}
                >
                  <NotificationsOutlinedIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>
            <Chip size="small" label="INTRANET" color="primary" variant="outlined" sx={{ fontWeight: 800 }} />
            <Chip
              size="small"
              variant="outlined"
              label={
                summaryLoading || healthLoading || manualRefreshing
                  ? 'Actualizando…'
                  : updatedAtLabel ?? 'Actualizado: —'
              }
              sx={{ fontWeight: 800 }}
            />
            <Button
              type="button"
              variant="outlined"
              size="small"
              onClick={() => void handleManualDashboardRefresh()}
              disabled={manualRefreshing}
              aria-busy={manualRefreshing}
              aria-label="Actualizar panel con datos en vivo del servidor"
              sx={{
                whiteSpace: 'nowrap',
                fontWeight: 800,
              }}
              startIcon={
                manualRefreshing ? (
                  <CircularProgress
                    aria-hidden
                    size={14}
                    thickness={5}
                    sx={{ color: 'primary.main' }}
                  />
                ) : undefined
              }
            >
              Actualizar ahora
            </Button>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
              <Avatar
                sx={{
                  bgcolor: 'secondary.main',
                  color: 'secondary.contrastText',
                  width: 40,
                  height: 40,
                  fontWeight: 800,
                }}
              >
                {user ? initialsFromUser(user.email, user.nombres, user.apellidos) : '—'}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                  {displayRole}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap title={user?.email ?? ''}>
                  {user?.email ?? ''}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        }
      />

      {summaryError ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {summaryError}
        </Alert>
      ) : null}

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, sm: 6, md: isAdmin ? 3 : 6 }}>
          <KpiCard
            icon={<DescriptionOutlinedIcon fontSize="small" />}
            title="Documentos"
            subtitle="total"
            value={summaryLoading ? '…' : formattedNumber(summary?.kpis.documentosTotal ?? null)}
            accent="primary"
            footnote={
              summaryLoading || summary == null
                ? undefined
                : [docFootnoteEsteMes, docFootnoteAcumulado].filter(Boolean).join(' · ')
            }
            footnotePositive={!summaryLoading && (summary?.documentos?.creadosEsteMes ?? 0) > 0}
            interactive
            interactiveLabel="Ir a bandeja de Documentos"
            onInteractiveAction={() => navigate('/documentos')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: isAdmin ? 3 : 6 }}>
          <KpiCard
            icon={<AssignmentOutlinedIcon fontSize="small" />}
            title="Pendientes"
            subtitle="por revisar"
            value={
              summaryLoading ? '…' : formattedNumber(summary?.kpis.pendientesRevision ?? null)
            }
            accent="warning"
            interactive
            interactiveLabel="Ver documentos pendientes de revisión"
            onInteractiveAction={() => navigate('/documentos?estado=EN_REVISION')}
          />
        </Grid>
        {isAdmin ? (
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              icon={<PeopleOutlinedIcon fontSize="small" />}
              title="Usuarios"
              subtitle="activos"
              value={summaryLoading ? '…' : formattedNumber(summary?.kpis.usuariosActivos ?? null)}
              accent="success"
              interactive
              interactiveLabel="Ir a Usuarios y roles"
              onInteractiveAction={() => navigate('/admin/usuarios')}
            />
          </Grid>
        ) : null}
        {isAdmin ? (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} id="alertas" sx={{ scrollMarginTop: { xs: 88, md: 96 } }}>
            <KpiCard
              icon={<NotificationsOutlinedIcon fontSize="small" />}
              title="Alertas"
              subtitle="señales operativas"
              value={summaryLoading || healthLoading ? '…' : String(alertsCount)}
              accent="error"
              footnote={
                summaryLoading || healthLoading
                  ? undefined
                  : alertsCount === 0
                    ? 'Ninguna señal activa.'
                    : alertsNavigateTarget
                      ? 'Pulse la tarjeta para ir a la primera acción sugerida según el orden del listado.'
                      : 'Revise el detalle. Parte de estas señales solo las atiende un usuario ADMIN (Auditoría / Respaldos).'
              }
              detailLines={
                summaryLoading || healthLoading || alertsCount === 0
                  ? undefined
                  : alertDetailLines
              }
              interactive={alertsCardInteractive}
              interactiveLabel="Abrir destino de la primera alerta navegable"
              onInteractiveAction={alertsCardInteractive ? navigateToFirstAlert : undefined}
            />
          </Grid>
        ) : null}
      </Grid>

      <Paper elevation={0} sx={{ ...listSurfaceSx, mb: 2.5, p: { xs: 2, md: 2.5 } }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
          Documentos
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Indicadores por estado y registros mensuales (datos reales del sistema).
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          {(
            [
              ['Total', summary?.documentos?.total, 'primary'],
              ['Registrados', summary?.documentos?.registrados, 'primary'],
              ['Borradores', summary?.documentos?.borradores, 'warning'],
              ['En revisión', summary?.documentos?.enRevision, 'warning'],
              ['Aprobados', summary?.documentos?.aprobados, 'success'],
              ['Rechazados', summary?.documentos?.rechazados, 'error'],
            ] as const
          ).map(([label, value, accent]) => (
            <Grid key={label} size={{ xs: 6, sm: 4, md: 2 }}>
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 1.5,
                  height: '100%',
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  {label}
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    color: `${accent}.main`,
                    mt: 0.5,
                  }}
                >
                  {summaryLoading ? '…' : formattedNumber(value ?? 0)}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
          Documentos registrados por mes
        </Typography>
        <DocumentosMonthlyChart
          items={summary?.documentosPorMes ?? []}
          loading={summaryLoading}
        />
      </Paper>

      {isAdmin && !summaryLoading && serverAlertItems.length > 0 ? (
        <Paper
          elevation={0}
          sx={{
            ...listSurfaceSx,
            mb: 2.5,
            p: 2,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
            Ocultar alertas del panel
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Si ya revisó una señal en Auditoría u otro módulo, puede ocultarla del panel. Volverá a
            mostrarse solo si hay actividad nueva (por ejemplo, otro 403 o login fallido después de
            ahora).
          </Typography>
          {ackError ? (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              {ackError}
            </Alert>
          ) : null}
          <Stack spacing={1.25}>
            {serverAlertItems.map((item) => (
              <Stack
                key={item.codigo}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{
                  alignItems: { xs: 'stretch', sm: 'center' },
                  justifyContent: 'space-between',
                  py: 0.75,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-of-type': { borderBottom: 0 },
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1, pr: 1 }}>
                  {item.mensaje}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={ackInFlight !== null}
                  onClick={() => void acknowledgeServerAlert(item.codigo)}
                >
                  {ackInFlight === item.codigo ? 'Guardando…' : 'Marcar como revisada'}
                </Button>
              </Stack>
            ))}
          </Stack>
        </Paper>
      ) : null}

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, lg: isAdmin ? 8 : 12 }}>
          <Paper
            elevation={0}
            sx={{
              ...listSurfaceSx,
              overflow: 'hidden',
            }}
          >
            <Box sx={{ px: 2.5, pt: 2.25, pb: 1.5 }}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                    Actividad reciente
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Expedientes ordenados por última actualización en el sistema
                  </Typography>
                </Box>
                <Button component={RouterLink} to="/documentos" variant="text" size="small" sx={{ fontWeight: 700 }}>
                  Ver todos
                </Button>
              </Stack>
            </Box>
            <Box sx={{ px: 1.5, pb: 1.5 }}>
              {docsLoading ? (
                <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress aria-label="Cargando documentos recientes" />
                </Box>
              ) : (summary?.documentosRecientes?.length ?? 0) === 0 ? (
                <Box sx={{ py: 3, px: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Aún no hay documentos para mostrar.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={0.5} role="list" aria-label="Documentos recientes">
                  {summary?.documentosRecientes.map((d) => {
                    const toneKey = documentoEstadoTone(d.estado);
                    const accent = theme.palette[toneKey].main;
                    return (
                      <Box
                        key={d.id}
                        role="listitem"
                        tabIndex={0}
                        onClick={() => navigate(`/documentos/${d.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/documentos/${d.id}`);
                          }
                        }}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          px: 1.25,
                          py: 1.25,
                          borderRadius: 2,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' },
                          '&:focus-visible': {
                            outline: '2px solid',
                            outlineColor: 'secondary.main',
                            outlineOffset: 2,
                          },
                        }}
                      >
                        <Box
                          aria-hidden
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 2,
                            display: 'grid',
                            placeItems: 'center',
                            bgcolor: alpha(accent, 0.14),
                            color: accent,
                            flexShrink: 0,
                          }}
                        >
                          <DescriptionOutlinedIcon sx={{ fontSize: 18 }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                            {d.asunto}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {d.codigo} · {labelDocumentoEstado(d.estado)}
                          </Typography>
                        </Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          title={`Fecha del documento: ${formatShortDateEc(d.fechaDocumento)} · Actualizado: ${formatShortDateEc(d.ultimaActividadAt)}`}
                          sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                        >
                          {formatRelativeEs(d.ultimaActividadAt)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Box>
          </Paper>
        </Grid>

        {isAdmin ? (
          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack spacing={2.5}>
            <Paper
              elevation={0}
              sx={{
                ...listSurfaceSx,
                p: 2.5,
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.1, mb: 0.5 }}>
                Indicadores operativos
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Porcentajes desde auditoría y datos del sistema (últimos 30 días). No sustituyen una
                certificación ISO ni una auditoría externa.
              </Typography>

              {summaryLoading ? (
                <Box sx={{ py: 2 }}>
                  <CircularProgress size={22} aria-label="Cargando indicadores" />
                </Box>
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

            <Paper
              elevation={0}
              sx={{
                ...listSurfaceSx,
                p: 2.5,
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
                Señales recientes
              </Typography>
              <Stack spacing={1.25}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Último respaldo verificado
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {formatUltimoRespaldoVerificado(summary?.lastSignals.lastBackupVerifiedAt ?? null).replace(
                      'Último respaldo verificado: ',
                      '',
                    )}
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
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Último ingreso correcto
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {summary?.lastSignals.lastLoginOkAt
                      ? new Intl.DateTimeFormat('es-EC', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        }).format(new Date(summary.lastSignals.lastLoginOkAt))
                      : '—'}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
            </Stack>
          </Grid>
        ) : null}
      </Grid>

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
              {healthLoading && (
                <CircularProgress size={28} aria-label="Comprobando salud del API" />
              )}
              {!healthLoading && healthError && (
                <Alert severity="warning">{healthError}</Alert>
              )}
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

      {isAdmin && (
        <Card
          id="comprobacion-administrador"
          variant="outlined"
          sx={{ borderRadius: 3, scrollMarginTop: { xs: 88, md: 96 } }}
        >
          <CardContent>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 800 }}>
              Comprobación de rol administrador
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              El sistema comprueba que su cuenta tiene permisos de administrador antes de mostrar funciones
              sensibles.
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
      )}
    </Box>
  );
}
