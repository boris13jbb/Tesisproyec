import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { useDashboardLcpReporting } from '../perf/useDashboardLcpReporting';
import { PageHeader } from '../components/PageHeader';
import { labelDocumentoEstado } from '../constants/documento-estado';
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
  documentosRecientes: DocumentoRecentRow[];
  compliance: ComplianceMetric[];
  lastSignals: {
    lastAuditAt: string | null;
    lastLoginOkAt: string | null;
    lastBackupVerifiedAt: string | null;
  };
};

const INTRANET_CHIP_SX = {
  bgcolor: 'rgba(30, 58, 95, 0.08)',
  color: '#1E3A5F',
  fontWeight: 800,
  letterSpacing: 0.4,
} as const;

const KPI_TEAL = '#2D8A99';

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

function KpiCard({
  iconLetter,
  title,
  subtitle,
  value,
  accentColor,
  footnote,
  detailLines,
  interactive,
  interactiveLabel,
  onInteractiveAction,
}: {
  iconLetter: string;
  title: string;
  subtitle: string;
  value: string;
  accentColor: string;
  footnote?: string;
  /** Viñetas breves bajo el valor (p. ej. desglose de alertas). */
  detailLines?: string[];
  /** Tarjeta pulsable (Enter/Espacio/clic) con estilo de botón. */
  interactive?: boolean;
  interactiveLabel?: string;
  onInteractiveAction?: () => void;
}) {
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
        border: '1px solid rgba(15, 23, 42, 0.08)',
        boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
        p: 2,
        height: '100%',
        ...(interactive
          ? {
              cursor: 'pointer',
              transition: 'box-shadow 120ms ease, transform 120ms ease',
              '&:hover': { boxShadow: '0 16px 38px rgba(15, 23, 42, 0.12)' },
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: 2,
              },
            }
          : {}),
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Box
          aria-hidden
          sx={{
            width: 34,
            height: 34,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'rgba(30, 124, 137, 0.12)',
            color: '#0F4C55',
            fontWeight: 900,
          }}
        >
          {iconLetter}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
      </Stack>
      <Typography
        variant="h4"
        sx={{
          mt: 1.5,
          fontWeight: 900,
          letterSpacing: 0.2,
          color: accentColor,
        }}
      >
        {value}
      </Typography>
      {footnote ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 0.75, display: 'block', fontWeight: 700 }}
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
          height: 10,
          borderRadius: 999,
          bgcolor: 'rgba(15, 23, 42, 0.06)',
        }}
      />
    </Box>
  );
}

export function DashboardPage() {
  useDashboardLcpReporting();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
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

  const isAdmin = user?.roles.some((r) => r.codigo === 'ADMIN') ?? false;

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

  const docDeltaEsteMes = useMemo(() => {
    if (!summary?.kpis) return '';
    const n = summary.kpis.documentosCreadosEsteMes ?? 0;
    const formatted = new Intl.NumberFormat('es-EC').format(n);
    const sign = n > 0 ? '+' : '';
    return `${sign}${formatted} este mes`;
  }, [summary?.kpis]);

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
          'No se pudo verificar el permiso de administrador (falló GET /admin/ping; token o red).',
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
    user?.roles.find((r) => r.codigo === 'ADMIN')?.nombre ?? user?.roles[0]?.nombre ?? 'Usuario';

  const generatedAt = summary?.generatedAt;
  const updatedAtLabel = useMemo(() => {
    if (!generatedAt) return null;
    return `Actualizado: ${formatTimeEc(generatedAt)}`;
  }, [generatedAt]);

  return (
    <Container maxWidth="lg">
      <PageHeader
        title="Panel principal"
        description="GADPR-LM · Sistema de Gestión Documental · Indicadores en tiempo real desde la base de datos."
        actions={
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
          >
            <Chip size="small" label="INTRANET" sx={INTRANET_CHIP_SX} />
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
                  bgcolor: KPI_TEAL,
                  color: '#fff',
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

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 6, md: isAdmin ? 3 : 6 }}>
          <KpiCard
            iconLetter="D"
            title="Documentos"
            subtitle="total"
            value={summaryLoading ? '…' : formattedNumber(summary?.kpis.documentosTotal ?? null)}
            accentColor="#1E3A5F"
            footnote={
              summaryLoading || summary == null ? undefined : docDeltaEsteMes
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: isAdmin ? 3 : 6 }}>
          <KpiCard
            iconLetter="P"
            title="Pendientes"
            subtitle="por revisar"
            value={
              summaryLoading ? '…' : formattedNumber(summary?.kpis.pendientesRevision ?? null)
            }
            accentColor="#B45309"
          />
        </Grid>
        {isAdmin ? (
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              iconLetter="U"
              title="Usuarios"
              subtitle="activos"
              value={summaryLoading ? '…' : formattedNumber(summary?.kpis.usuariosActivos ?? null)}
              accentColor="#0F766E"
            />
          </Grid>
        ) : null}
        {isAdmin ? (
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              iconLetter="A"
              title="Alertas"
              subtitle="señales operativas"
              value={summaryLoading || healthLoading ? '…' : String(alertsCount)}
              accentColor="#B91C1C"
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

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: isAdmin ? 7 : 12 }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid rgba(15, 23, 42, 0.08)',
              boxShadow: '0 14px 46px rgba(15, 23, 42, 0.08)',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ px: 2.5, pt: 2.25, pb: 1.5 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
                <Box
                  aria-hidden
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 2,
                    bgcolor: 'rgba(30, 124, 137, 0.12)',
                    color: '#0F4C55',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 900,
                  }}
                >
                  G
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                    Documentos recientes
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Ordenados por última actualización del expediente en el sistema
                  </Typography>
                </Box>
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
                <Table size="small" aria-label="Tabla de documentos recientes">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>
                        Código
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>
                        Documento
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>
                        Estado
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>
                        Última actividad
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summary?.documentosRecientes.map((d) => (
                      <TableRow
                        key={d.id}
                        hover
                        tabIndex={0}
                        onClick={() => navigate(`/documentos/${d.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/documentos/${d.id}`);
                          }
                        }}
                        sx={{
                          cursor: 'pointer',
                          '&:focus-visible': {
                            outline: '2px solid rgba(45, 138, 153, 0.6)',
                            outlineOffset: 2,
                            borderRadius: 8,
                          },
                          '&:last-child td': { borderBottom: 0 },
                        }}
                      >
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                          {d.codigo}
                        </TableCell>
                        <TableCell>{d.asunto}</TableCell>
                        <TableCell>{labelDocumentoEstado(d.estado)}</TableCell>
                        <TableCell title={`Fecha del documento: ${formatShortDateEc(d.fechaDocumento)}`}>
                          {formatShortDateEc(d.ultimaActividadAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
            <Box sx={{ px: 2.5, pb: 2 }}>
              <Button component={RouterLink} to="/documentos" variant="text" size="small">
                Ver documentos
              </Button>
            </Box>
          </Paper>
        </Grid>

        {isAdmin ? (
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                border: '1px solid rgba(15, 23, 42, 0.08)',
                boxShadow: '0 14px 46px rgba(15, 23, 42, 0.08)',
                p: 2.5,
                height: '100%',
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', mb: 1.5 }}>
                <Box
                  aria-hidden
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 2,
                    bgcolor: 'rgba(30, 124, 137, 0.12)',
                    color: '#0F4C55',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 900,
                  }}
                >
                  S
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                    Cumplimiento de seguridad
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Porcentajes calculados con métricas reales de los últimos 30 días (ver evidencia en
                    API)
                  </Typography>
                </Box>
              </Stack>

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

              <Paper
                elevation={0}
                sx={{
                  mt: 1,
                  px: 2,
                  py: 1.2,
                  borderRadius: 3,
                  bgcolor: 'rgba(30, 124, 137, 0.10)',
                  border: '1px solid rgba(30, 124, 137, 0.16)',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 800, color: '#0F4C55', display: 'block', mb: 0.75 }}
                >
                  {formatUltimoRespaldoVerificado(summary?.lastSignals.lastBackupVerifiedAt ?? null)}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#0F4C55', opacity: 0.9 }}>
                  Última línea auditada en el sistema:{' '}
                  {summary?.lastSignals.lastAuditAt
                    ? new Intl.DateTimeFormat('es-EC', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(new Date(summary.lastSignals.lastAuditAt))
                    : '—'}
                </Typography>
              </Paper>
            </Paper>
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
              Ruta protegida en backend: <code>GET /api/v1/admin/ping</code> (JWT + rol ADMIN).
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
    </Container>
  );
}
