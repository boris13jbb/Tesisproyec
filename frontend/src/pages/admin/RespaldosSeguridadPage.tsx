import BackupOutlinedIcon from '@mui/icons-material/BackupOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import SettingsBackupRestoreOutlinedIcon from '@mui/icons-material/SettingsBackupRestoreOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { isAxiosError } from 'axios';
import { apiClient } from '../../api/client';
import { ListPanel } from '../../components/ListPanel';
import { SectionHeader } from '../../components/SectionHeader';
import { auditResultChipColor } from '../../constants/audit-actions';
import { listSurfaceSx, listTableContainerSx } from '../../components/listSurfaces';
import { PageHeader } from '../../components/PageHeader';

type DashboardBackupVerificationRow = {
  id: string;
  createdAt: string;
  result: string;
  actorEmail: string | null;
  source?: string | null;
  notes: string | null;
  tipoRespaldo: string | null;
  tamanoLabel: string | null;
  tamanoBytes: number | null;
};

type DashboardBackupOverview = {
  schemaVersion: 1 | 2;
  lastVerifiedAt: string | null;
  siguienteCopiaEtiqueta: string | null;
  verificaciones90d: { ok: number; fail: number };
  historial: DashboardBackupVerificationRow[];
  automatedBackup?: {
    enabled: boolean;
    cronExpression: string | null;
    includeStorageZip: boolean;
  };
};

const paperCardSx = {
  ...listSurfaceSx,
  p: { xs: 2, md: 2.75 },
};

function formatLastVerificationHeadline(iso: string | null): {
  headline: string;
  detail: string;
} {
  if (!iso) {
    return {
      headline: 'Sin registro OK',
      detail:
        'Aún no hay una verificación de respaldo exitosa en auditoría. Use “Registrar verificación” tras el procedimiento.',
    };
  }
  const d = new Date(iso);
  const time = new Intl.DateTimeFormat('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
  const date = new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
  const now = new Date();
  const sod = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yod = new Date(sod);
  yod.setDate(yod.getDate() - 1);
  if (d >= sod) {
    return { headline: `Hoy ${time}`, detail: 'Última verificación de respaldo exitosa registrada.' };
  }
  if (d >= yod) {
    return { headline: `Ayer ${time}`, detail: 'Última verificación de respaldo exitosa registrada.' };
  }
  return { headline: `${date} · ${time}`, detail: 'Última verificación de respaldo exitosa registrada.' };
}

function formatTableDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function formatTamanoDisplay(row: DashboardBackupVerificationRow): string {
  const label = row.tamanoLabel?.trim();
  if (label) return label;
  if (typeof row.tamanoBytes === 'number' && row.tamanoBytes >= 0) {
    if (row.tamanoBytes < 1024) return `${row.tamanoBytes} B`;
    const kb = row.tamanoBytes / 1024;
    if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(gb >= 10 ? 1 : 2)} GB`;
  }
  return '—';
}

function formatOrigenRow(source: string | null | undefined): string {
  if (!source?.trim()) return '—';
  if (source === 'scheduled_mysqldump') return 'Automático';
  if (source === 'manual_registry') return 'Manual';
  return source;
}

function BackupEstadoChip({ result }: { result: string }) {
  const res = String(result ?? '').toUpperCase();
  const label = res === 'OK' ? 'Verificado' : res === 'FAIL' ? 'Fallido' : result || '—';

  return (
    <Chip
      size="small"
      label={label}
      color={auditResultChipColor(result)}
      variant={res === 'OK' ? 'filled' : 'outlined'}
      sx={{ fontWeight: 800 }}
    />
  );
}

export function RespaldosSeguridadPage() {
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [overview, setOverview] = useState<DashboardBackupOverview | null>(null);
  const [overviewError, setOverviewError] = useState(false);
  /** Carga inicial true; recargas muestran spinner vía `manualReload`. */
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [backupRegBusy, setBackupRegBusy] = useState(false);
  const [backupRegMsg, setBackupRegMsg] = useState<{ severity: 'success' | 'error'; text: string } | null>(
    null,
  );
  const [regNotes, setRegNotes] = useState('');
  const [regTipo, setRegTipo] = useState('');
  const [regTamLabel, setRegTamLabel] = useState('');
  const [regTamBytes, setRegTamBytes] = useState('');
  const [regOutcome, setRegOutcome] = useState<'OK' | 'FAIL'>('OK');
  const [runNowBusy, setRunNowBusy] = useState(false);
  const [runNowBanner, setRunNowBanner] = useState<{ severity: 'success' | 'error' | 'info'; text: string } | null>(
    null,
  );

  const fetchOverview = useCallback(async (): Promise<DashboardBackupOverview> => {
    const { data } = await apiClient.get<DashboardBackupOverview>('/dashboard/admin/backup-overview');
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchOverview();
        if (!cancelled) {
          setOverview(data);
          setOverviewError(false);
        }
      } catch {
        if (!cancelled) {
          setOverviewError(true);
          setOverview(null);
        }
      } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchOverview]);

  async function manualReload(): Promise<void> {
    setOverviewLoading(true);
    setOverviewError(false);
    try {
      const data = await fetchOverview();
      setOverview(data);
    } catch {
      setOverviewError(true);
      setOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  }

  const lastCard = useMemo(
    () => formatLastVerificationHeadline(overview?.lastVerifiedAt ?? null),
    [overview?.lastVerifiedAt],
  );

  const integrityCard = useMemo(() => {
    const ok = overview?.verificaciones90d?.ok ?? 0;
    const fail = overview?.verificaciones90d?.fail ?? 0;
    const total = ok + fail;
    if (total === 0) {
      return {
        headline: 'N/D',
        detail: 'Sin verificaciones de respaldo registradas en los últimos 90 días.',
        color: 'text.secondary' as const,
      };
    }
    const pct = Math.round((100 * ok) / total);
    const color =
      fail === 0
        ? ('success.main' as const)
        : pct >= 80
          ? ('warning.main' as const)
          : ('error.main' as const);
    return {
      headline: `${pct}%`,
      detail: `${ok} verificaciones OK · ${fail} fallidas en 90 días (auditoría).`,
      color,
    };
  }, [overview?.verificaciones90d]);

  const siguienteCard = useMemo(() => {
    const hint = overview?.siguienteCopiaEtiqueta?.trim();
    const autoOn = overview?.automatedBackup?.enabled === true;
    if (hint) {
      return {
        headline: hint,
        detail: autoOn
          ? 'Incluye pista institucional y/o expresión cron configurada en el servidor (véase backend/.env.example).'
          : 'Textos de referencia definidos en el servidor (BACKUP_EXPECTED_SCHEDULE_HINT u otros).',
      };
    }
    return {
      headline: autoOn ? `Cron: ${overview?.automatedBackup?.cronExpression ?? '—'}` : 'Sin datos de programación',
      detail: autoOn
        ? 'Respaldo automático habilitado; la expresión debería mostrarse en la API.'
        : 'Defina BACKUP_AUTOMATED_ENABLED=true y MYSQLDUMP/mysqldump, o BACKUP_EXPECTED_SCHEDULE_HINT.',
    };
  }, [overview?.siguienteCopiaEtiqueta, overview?.automatedBackup]);

  const restorationSteps = [
    'Seleccionar punto de respaldo',
    'Comprobar el archivo (tamaño; hash SHA-256 solo si se calcula fuera del SGD)',
    'Confirmar autorización',
    'Ejecutar restauración',
  ];

  async function submitVerification(): Promise<void> {
    setBackupRegBusy(true);
    setBackupRegMsg(null);
    const trimmedNotes = regNotes.trim();
    const trimmedTipo = regTipo.trim();
    const trimmedLabel = regTamLabel.trim();
    const bytesParsed = regTamBytes.trim();
    let tamanoBytes: number | undefined;
    if (bytesParsed.length > 0) {
      const n = Number(bytesParsed);
      if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
        setBackupRegMsg({
          severity: 'error',
          text: 'Tamaño (bytes): use un número entero ≥ 0 o déjelo vacío.',
        });
        setBackupRegBusy(false);
        return;
      }
      tamanoBytes = n;
    }
    if (regOutcome === 'FAIL' && trimmedNotes.length === 0) {
      setBackupRegMsg({
        severity: 'error',
        text: 'Si el resultado es «Fallida», describa el motivo en Notas (obligatorio).',
      });
      setBackupRegBusy(false);
      return;
    }
    try {
      await apiClient.post('/dashboard/admin/backup-verification', {
        ...(regOutcome === 'FAIL' ? { result: 'FAIL' } : {}),
        ...(trimmedNotes.length > 0 ? { notes: trimmedNotes } : {}),
        ...(trimmedTipo.length > 0 ? { tipoRespaldo: trimmedTipo } : {}),
        ...(trimmedLabel.length > 0 ? { tamanoLabel: trimmedLabel } : {}),
        ...(tamanoBytes !== undefined ? { tamanoBytes } : {}),
      });
      setBackupRegMsg({
        severity: 'success',
        text:
          regOutcome === 'FAIL'
            ? 'Fallo registrado en auditoría.'
            : 'Verificación registrada en auditoría. El historial se actualiza automáticamente.',
      });
      setRegNotes('');
      setRegTamLabel('');
      setRegTamBytes('');
      setRegOutcome('OK');
      await manualReload();
    } catch {
      setBackupRegMsg({
        severity: 'error',
        text: 'No se pudo registrar (requiere sesión ADMIN y API disponible).',
      });
    } finally {
      setBackupRegBusy(false);
    }
  }

  async function runDumpNow(): Promise<void> {
    setRunNowBusy(true);
    setRunNowBanner(null);
    try {
      const { data } = await apiClient.post<{ ok: boolean; skipped?: boolean }>(
        '/backup/admin/run-now',
        {},
        {
          suppressGlobalNetworkErrorToast: true,
          timeout: 15 * 60 * 1000,
        },
      );
      if (data.skipped) {
        setRunNowBanner({
          severity: 'info',
          text: 'Omitido: ya había un respaldo en ejecución. Intente de nuevo en unos minutos.',
        });
      } else if (data.ok) {
        setRunNowBanner({
          severity: 'success',
          text: 'mysqldump finalizado. Revise el historial y la carpeta BACKUP_OUTPUT_DIR en el servidor.',
        });
        await manualReload();
      } else {
        setRunNowBanner({
          severity: 'error',
          text: 'El comando devolvió error; revise auditoría (FAIL) y logs del API.',
        });
        await manualReload();
      }
    } catch (err: unknown) {
      let text =
        'No se pudo ejecutar mysqldump. Revise BACKUP_MYSQLDUMP_PATH, DATABASE_URL, rol ADMIN en el servidor y reinicie la API tras cambiar .env.';
      if (isAxiosError(err)) {
        if (!err.response) {
          text =
            err.code === 'ECONNABORTED'
              ? 'Tiempo de espera agotado (mysqldump o ZIP muy lentos). Puede ejecutar por consola en el servidor o aumentar timeouts de proxy/API.'
              : 'Sin respuesta del servidor (¿API apagada, proxy/Vite cortado o entrada por LAN con VITE_API_URL apuntando a localhost del cliente?). Deje sin definir VITE_API_URL y use base relativa /api/v1 tras reiniciar Vite.';
        } else if (err.response.status === 403) {
          text = 'No autorizado: se requiere rol ADMIN para ejecutar mysqldump.';
        }
      }
      setRunNowBanner({
        severity: 'error',
        text,
      });
    } finally {
      setRunNowBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Respaldos de información"
        actions={
          <Tooltip title="Recargar datos desde auditoría">
            <span>
              <IconButton
                aria-label="Recargar resumen de respaldos"
                onClick={() => void manualReload()}
                disabled={overviewLoading}
                size="small"
              >
                {overviewLoading ? <CircularProgress size={22} /> : <RefreshIcon />}
              </IconButton>
            </span>
          </Tooltip>
        }
        description={
          <Stack spacing={0.75}>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
              <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Respaldos y seguridad
              </Box>{' '}
              · GADPR-LM · Sistema de Gestión Documental
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
              Evidencia en auditoría; copia MySQL puede ser automática en servidor; restauración sigue siendo manual.
            </Typography>
          </Stack>
        }
      />

      <Alert severity="info" sx={{ mb: { xs: 2, md: 2.25 }, borderRadius: 2 }}>
        <Typography variant="body2">
          El servidor puede ejecutar <strong>mysqldump programado</strong> (cron NestJS + <code>BACKUP_MYSQLDUMP_PATH</code>) y
          opcionalmente un ZIP de <code>storage/</code>. La <strong>restauración</strong> sigue siendo manual (MySQL + extracción
          de archivos); guía: <strong>scripts/README-backups-mysql-xampp.md</strong>.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Las tarjetas y el historial muestran <strong>verificaciones registradas en auditoría</strong> (éxito o fallo),
          ya sea por registro manual o por el proceso automático del servidor. Los archivos de copia (.sql / .zip) se
          guardan en el servidor, no dentro de esta pantalla.
        </Typography>
      </Alert>

      <Paper elevation={0} sx={{ ...paperCardSx, mb: { xs: 2, md: 2.25 } }}>
        <SectionHeader
          icon={<BackupOutlinedIcon fontSize="small" />}
          title="Copia automática MySQL (servidor)"
          subtitle="mysqldump programado o ejecución manual desde esta pantalla"
        />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1.5, lineHeight: 1.65 }}>
          Requiere <code>BACKUP_MYSQLDUMP_PATH</code> apuntando a <code>mysqldump</code> (p. ej. XAMPP).{' '}
          {overview?.automatedBackup?.enabled ? (
            <>
              Estado: <strong>programación activa</strong>
              {overview.automatedBackup.includeStorageZip ? ' (incluye ZIP de storage).' : '.'}
            </>
          ) : (
            <>Estado en este entorno: <strong>sin cron automático</strong> (puede activar con BACKUP_AUTOMATED_ENABLED).</>
          )}
        </Typography>
        {runNowBanner ? (
          <Alert severity={runNowBanner.severity} sx={{ mb: 1.5 }}>
            {runNowBanner.text}
          </Alert>
        ) : null}
        <Button
          variant="outlined"
          disabled={runNowBusy || overviewLoading}
          onClick={() => void runDumpNow()}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {runNowBusy ? 'Ejecutando mysqldump…' : 'Ejecutar mysqldump ahora (manual)'}
        </Button>
      </Paper>

      <Paper elevation={0} sx={{ ...paperCardSx, mb: { xs: 2, md: 2.25 } }}>
        <SectionHeader
          icon={<FactCheckOutlinedIcon fontSize="small" />}
          title="Registro electrónico de verificación"
          subtitle="Evidencia auditable tras validar mysqldump y/o storage"
        />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 2, lineHeight: 1.65 }}>
          Tras validar mysqldump y/o la copia de <code style={{ wordBreak: 'break-all' }}>storage/</code>, complete los
          campos opcionales y pulse <strong>Registrar verificación</strong>. Se crea un evento en auditoría que alimenta
          esta pantalla y el panel principal.
        </Typography>
        {backupRegMsg ? (
          <Alert severity={backupRegMsg.severity} sx={{ mb: 1.5 }}>
            {backupRegMsg.text}
          </Alert>
        ) : null}
        <Stack spacing={2} sx={{ mb: 2 }}>
          <FormControl>
            <FormLabel id="outcome-label">Resultado de la verificación</FormLabel>
            <RadioGroup
              row
              aria-labelledby="outcome-label"
              value={regOutcome}
              onChange={(_, v) => setRegOutcome(v as 'OK' | 'FAIL')}
            >
              <FormControlLabel value="OK" control={<Radio size="small" />} label="Verificación correcta (OK)" />
              <FormControlLabel value="FAIL" control={<Radio size="small" />} label="Verificación fallida (FAIL)" />
            </RadioGroup>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel id="tipo-respaldo-label">Tipo de copia (opcional)</InputLabel>
            <Select
              labelId="tipo-respaldo-label"
              label="Tipo de copia (opcional)"
              value={regTipo}
              onChange={(e) => setRegTipo(e.target.value)}
            >
              <MenuItem value="">
                <em>Sin especificar</em>
              </MenuItem>
              <MenuItem value="Completo">Completo</MenuItem>
              <MenuItem value="Incremental">Incremental</MenuItem>
              <MenuItem value="MySQL + storage">MySQL + storage</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Tamaño legible (opcional)"
            placeholder="p. ej. 1,8 GB"
            value={regTamLabel}
            onChange={(e) => setRegTamLabel(e.target.value.slice(0, 40))}
            size="small"
            fullWidth
          />
          <TextField
            label="Tamaño en bytes (opcional)"
            placeholder="Solo enteros ≥ 0"
            value={regTamBytes}
            onChange={(e) => setRegTamBytes(e.target.value.replace(/\D/g, ''))}
            size="small"
            fullWidth
          />
          <TextField
            label="Notas (opcional)"
            placeholder="Responsable, ruta del artefacto, hash, etc."
            value={regNotes}
            onChange={(e) => setRegNotes(e.target.value.slice(0, 500))}
            size="small"
            fullWidth
            multiline
            minRows={2}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            variant="contained"
            color="secondary"
            disabled={backupRegBusy}
            onClick={() => void submitVerification()}
            sx={{ fontWeight: 800 }}
          >
            {backupRegBusy ? 'Guardando…' : 'Registrar verificación en el sistema'}
          </Button>
          {backupRegMsg === null ? null : (
            <Button variant="outlined" onClick={() => setBackupRegMsg(null)} size="small">
              Ocultar mensaje
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Resumen */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: { xs: 2, md: 2.25 },
          mb: { xs: 2, md: 2.25 },
        }}
      >
        <Paper elevation={1} sx={{ ...paperCardSx, mb: 0 }}>
          <SectionHeader
            icon={<TaskAltOutlinedIcon fontSize="small" />}
            title="Último respaldo verificado"
            subtitle={
              overviewError
                ? 'No se pudo cargar el resumen de respaldos desde el servidor.'
                : overviewLoading
                  ? 'Cargando…'
                  : lastCard.detail
            }
          />
          <Typography
            variant="h5"
            sx={{
              mt: 1.5,
              fontWeight: 800,
              color: overviewError ? 'text.secondary' : 'success.main',
            }}
          >
            {overviewError ? '—' : overviewLoading ? '…' : lastCard.headline}
          </Typography>
        </Paper>

        <Paper elevation={1} sx={{ ...paperCardSx, mb: 0 }}>
          <SectionHeader
            icon={<ScheduleOutlinedIcon fontSize="small" />}
            title="Próximo respaldo (referencia)"
            subtitle={
              overviewError
                ? 'Sin datos.'
                : overviewLoading
                  ? 'Cargando…'
                  : siguienteCard.detail
            }
          />
          <Typography
            variant="subtitle1"
            sx={{
              mt: 1.5,
              fontWeight: 800,
              color: 'secondary.main',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {overviewError ? '—' : overviewLoading ? '…' : siguienteCard.headline}
          </Typography>
        </Paper>

        <Paper elevation={1} sx={{ ...paperCardSx, mb: 0, gridColumn: { xs: '1', sm: '1 / -1', md: 'auto' } }}>
          <SectionHeader
            icon={<FactCheckOutlinedIcon fontSize="small" />}
            title="Integridad (90 días)"
            subtitle={
              overviewError
                ? 'Sin datos.'
                : overviewLoading
                  ? 'Cargando…'
                  : integrityCard.detail
            }
          />
          <Typography variant="h5" sx={{ mt: 1.5, fontWeight: 800, color: integrityCard.color }}>
            {overviewError ? '—' : overviewLoading ? '…' : integrityCard.headline}
          </Typography>
        </Paper>
      </Box>

      {/* Historial + Restauración */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2fr) minmax(260px, 1fr)' },
          gap: { xs: 2, md: 2.25 },
          alignItems: 'flex-start',
        }}
      >
        <ListPanel
          badge={<BackupOutlinedIcon fontSize="small" />}
          title="Historial de respaldos"
          subtitle="Verificaciones registradas en auditoría (hasta 50 más recientes)"
          loading={overviewLoading && !overviewError}
        >
          <TableContainer sx={{ ...listTableContainerSx, overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 480 }} aria-label="Historial de verificaciones de respaldo">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 800 }}>Fecha</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Origen</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Tipo</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Tamaño</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>
                    Estado
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {overviewError ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography variant="body2" color="error">
                        No se pudo cargar el historial.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : overviewLoading ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={20} />
                        <Typography variant="body2">Cargando auditoría…</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (overview?.historial?.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography variant="body2" color="text.secondary">
                        Sin registros. Use “Registrar verificación” tras una copia verificada o habilite el respaldo automático.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  overview!.historial.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{formatTableDate(row.createdAt)}</TableCell>
                      <TableCell>{formatOrigenRow(row.source)}</TableCell>
                      <TableCell>{row.tipoRespaldo?.trim() || '—'}</TableCell>
                      <TableCell>{formatTamanoDisplay(row)}</TableCell>
                      <TableCell align="center">
                        <BackupEstadoChip result={row.result} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </ListPanel>

        <Paper elevation={1} sx={paperCardSx}>
          <SectionHeader
            icon={<SettingsBackupRestoreOutlinedIcon fontSize="small" />}
            title="Restauración controlada"
            subtitle="Solo administradores autorizados · no se ejecuta desde la interfaz web"
          />
          <Stack spacing={2} sx={{ mt: 2, mb: 2.5 }}>
            {restorationSteps.map((step, idx) => (
              <Stack key={step} direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    bgcolor: 'secondary.main',
                    color: 'secondary.contrastText',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </Box>
                <Typography variant="body2" sx={{ pt: 0.35 }}>
                  {step}
                </Typography>
              </Stack>
            ))}
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
          >
            <Button
              variant="outlined"
              onClick={() => setRestoreOpen(true)}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
            >
              Ver procedimiento de restauración
            </Button>
            <Button
              variant="outlined"
              onClick={() => setTestOpen(true)}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
            >
              Cómo probar un respaldo
            </Button>
          </Stack>
        </Paper>
      </Box>

      <Dialog open={restoreOpen} onClose={() => setRestoreOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Restauración de copia</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            La restauración afecta la base de datos y los adjuntos físicos en <strong>storage/</strong>. Ejecútela desde
            el entorno servidor (PowerShell/MySQL/XAMPP) con ventana acordada y respaldo válido revisado fuera del sistema web.
          </Typography>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Consulte pasos en <strong>scripts/README-backups-mysql-xampp.md</strong>, sección <em>Restauración</em>.
          </Typography>
          <Typography variant="body2" color="warning.main">
            Esta pantalla no dispara restores remotos; deje evidencia escrita del responsable y del punto de tiempo restaurado.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreOpen(false)} sx={{ textTransform: 'none' }}>
            Entendido, cerrar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={testOpen} onClose={() => setTestOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Verificación (“probar”) de respaldo</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            La prueba técnica correcta monta una base y carpeta temporal, importa el volcado y valida hashes o totales de
            filas. Tras una prueba exitosa puede usar <strong>Registrar verificación</strong> (arriba) con tipo y tamaño
            opcionales para dejar evidencia auditable en el sistema.
          </Typography>
          <Typography variant="body2">
            El botón “Probar respaldo” no ejecuta comandos en el servidor: solo orientación y trazabilidad manual vía auditoría.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestOpen(false)} sx={{ textTransform: 'none' }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
