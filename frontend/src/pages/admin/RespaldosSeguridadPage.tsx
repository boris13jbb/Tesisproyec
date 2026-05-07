import RefreshIcon from '@mui/icons-material/Refresh';
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
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
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
import { apiClient } from '../../api/client';
import { PageHeader } from '../../components/PageHeader';

const INSTITUTIONAL_TEAL = '#2D8A99';

type DashboardBackupVerificationRow = {
  id: string;
  createdAt: string;
  result: string;
  actorEmail: string | null;
  notes: string | null;
  tipoRespaldo: string | null;
  tamanoLabel: string | null;
  tamanoBytes: number | null;
};

type DashboardBackupOverview = {
  schemaVersion: 1;
  lastVerifiedAt: string | null;
  siguienteCopiaEtiqueta: string | null;
  verificaciones90d: { ok: number; fail: number };
  historial: DashboardBackupVerificationRow[];
};

const paperCardSx = {
  bgcolor: '#fff',
  borderRadius: 3,
  p: { xs: 2, md: 2.75 },
  border: '1px solid rgba(15, 23, 42, 0.08)',
  boxShadow: '0 14px 46px rgba(15, 23, 42, 0.08)',
};

function formatLastVerificationHeadline(iso: string | null): {
  headline: string;
  detail: string;
} {
  if (!iso) {
    return {
      headline: 'Sin registro OK',
      detail:
        'Aún no hay un evento BACKUP_VERIFIED con resultado OK en auditoría. Use “Registrar verificación” tras el procedimiento.',
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
    return { headline: `Hoy ${time}`, detail: 'Último BACKUP_VERIFIED OK en auditoría.' };
  }
  if (d >= yod) {
    return { headline: `Ayer ${time}`, detail: 'Último BACKUP_VERIFIED OK en auditoría.' };
  }
  return { headline: `${date} · ${time}`, detail: 'Último BACKUP_VERIFIED OK en auditoría.' };
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

function LetterTile({
  letter,
  bgTint,
}: {
  letter: string;
  bgTint: string;
}) {
  return (
    <Box
      sx={{
        width: 42,
        height: 42,
        borderRadius: 1.25,
        bgcolor: bgTint,
        color: INSTITUTIONAL_TEAL,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        flexShrink: 0,
      }}
      aria-hidden
    >
      {letter}
    </Box>
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
        detail: 'Sin eventos BACKUP_VERIFIED en los últimos 90 días.',
        color: '#64748b' as const,
      };
    }
    const pct = Math.round((100 * ok) / total);
    const color =
      fail === 0 ? ('#1b5e20' as const) : pct >= 80 ? ('#bf360c' as const) : ('#b71c1c' as const);
    return {
      headline: `${pct}%`,
      detail: `${ok} verificaciones OK · ${fail} fallidas en 90 días (auditoría).`,
      color,
    };
  }, [overview?.verificaciones90d]);

  const siguienteCard = useMemo(() => {
    const hint = overview?.siguienteCopiaEtiqueta?.trim();
    if (hint) {
      return {
        headline: hint,
        detail:
          'Texto de referencia (`BACKUP_EXPECTED_SCHEDULE_HINT` en servidor). La aplicación no programa copias.',
      };
    }
    return {
      headline: 'No definido aquí',
      detail:
        'La aplicación no calcula próximos respaldos. Opcional: defina BACKUP_EXPECTED_SCHEDULE_HINT en el backend para una ventana horaria institucional.',
    };
  }, [overview?.siguienteCopiaEtiqueta]);

  const restorationSteps = [
    'Seleccionar punto de respaldo',
    'Validar hash de integridad',
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
    try {
      await apiClient.post('/dashboard/admin/backup-verification', {
        ...(trimmedNotes.length > 0 ? { notes: trimmedNotes } : {}),
        ...(trimmedTipo.length > 0 ? { tipoRespaldo: trimmedTipo } : {}),
        ...(trimmedLabel.length > 0 ? { tamanoLabel: trimmedLabel } : {}),
        ...(tamanoBytes !== undefined ? { tamanoBytes } : {}),
      });
      setBackupRegMsg({
        severity: 'success',
        text: 'Verificación registrada (`BACKUP_VERIFIED`). La tabla y las tarjetas se actualizarán desde auditoría.',
      });
      setRegNotes('');
      setRegTamLabel('');
      setRegTamBytes('');
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
              Verificación documentada en auditoría; copias físicas según procedimiento institucional.
            </Typography>
          </Stack>
        }
      />

      <Alert severity="info" sx={{ mb: { xs: 2, md: 2.25 }, borderRadius: 2 }}>
        <Typography variant="body2">
          Esta aplicación <strong>no ejecuta respaldos ni restauraciones automáticas</strong>. Las copias de MySQL/MariaDB y de{' '}
          <code style={{ wordBreak: 'break-all' }}>storage/</code> se hacen fuera del SGD web; guía:{' '}
          <strong>scripts/README-backups-mysql-xampp.md</strong>.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Las tarjetas y la tabla de esta pantalla muestran <strong>datos reales</strong> leídos de{' '}
          <code>audit_logs</code> (acción <code>BACKUP_VERIFIED</code>) cuando un administrador registra la verificación.
          La fila &quot;próximo respaldo&quot; solo aparece si el servidor define la variable opcional{' '}
          <code>BACKUP_EXPECTED_SCHEDULE_HINT</code>.
        </Typography>
      </Alert>

      <Paper elevation={0} sx={{ ...paperCardSx, mb: { xs: 2, md: 2.25 } }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
          Registro electrónico de verificación
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.65 }}>
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
            disabled={backupRegBusy}
            onClick={() => void submitVerification()}
            sx={{ bgcolor: INSTITUTIONAL_TEAL, fontWeight: 800, '&:hover': { bgcolor: '#257a86' } }}
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
          <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
            <LetterTile letter="R" bgTint={`${INSTITUTIONAL_TEAL}29`} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Último respaldo verificado
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {overviewError
                  ? 'No se pudo leer `GET /dashboard/admin/backup-overview`.'
                  : overviewLoading
                    ? 'Cargando…'
                    : lastCard.detail}
              </Typography>
            </Box>
          </Stack>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1b5e20' }}>
            {overviewError ? '—' : overviewLoading ? '…' : lastCard.headline}
          </Typography>
        </Paper>

        <Paper elevation={1} sx={{ ...paperCardSx, mb: 0 }}>
          <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
            <LetterTile letter="P" bgTint={`${INSTITUTIONAL_TEAL}29`} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Próximo respaldo (referencia)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {overviewError
                  ? 'Sin datos.'
                  : overviewLoading
                    ? 'Cargando…'
                    : siguienteCard.detail}
              </Typography>
            </Box>
          </Stack>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1565c0' }}>
            {overviewError ? '—' : overviewLoading ? '…' : siguienteCard.headline}
          </Typography>
        </Paper>

        <Paper elevation={1} sx={{ ...paperCardSx, mb: 0, gridColumn: { xs: '1', sm: '1 / -1', md: 'auto' } }}>
          <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
            <LetterTile letter="I" bgTint={`${INSTITUTIONAL_TEAL}29`} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Integridad (90 días)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {overviewError
                  ? 'Sin datos.'
                  : overviewLoading
                    ? 'Cargando…'
                    : integrityCard.detail}
              </Typography>
            </Box>
          </Stack>
          <Typography variant="h5" sx={{ fontWeight: 800, color: integrityCard.color }}>
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
        <Paper elevation={1} sx={paperCardSx}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
            Historial de respaldos
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Eventos <code>BACKUP_VERIFIED</code> en auditoría (hasta 50 más recientes)
          </Typography>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 480 }}>
              <TableHead sx={{ '& th': { fontWeight: 800, bgcolor: '#f9fafc' } }}>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Tamaño</TableCell>
                  <TableCell align="center">Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {overviewError ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="error">
                        No se pudo cargar el historial.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : overviewLoading ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={20} />
                        <Typography variant="body2">Cargando auditoría…</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (overview?.historial?.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="text.secondary">
                        Sin registros. Use “Registrar verificación” tras una copia verificada.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  overview!.historial.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{formatTableDate(row.createdAt)}</TableCell>
                      <TableCell>{row.tipoRespaldo?.trim() || '—'}</TableCell>
                      <TableCell>{formatTamanoDisplay(row)}</TableCell>
                      <TableCell align="center">
                        {row.result === 'OK' ? (
                          <Chip
                            size="small"
                            label="Verificado"
                            sx={{
                              bgcolor: '#e8f5e9',
                              color: '#1b5e20',
                              fontWeight: 700,
                              '& .MuiChip-label': { px: 1.25 },
                            }}
                          />
                        ) : row.result === 'FAIL' ? (
                          <Chip
                            size="small"
                            label="Fallido"
                            sx={{
                              bgcolor: '#ffebee',
                              color: '#b71c1c',
                              fontWeight: 700,
                              '& .MuiChip-label': { px: 1.25 },
                            }}
                          />
                        ) : (
                          <Chip size="small" label={row.result || '—'} variant="outlined" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Paper elevation={1} sx={paperCardSx}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
            Restauración controlada
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Solo administradores autorizados · no se ejecuta desde la interfaz web
          </Typography>

          <Stack spacing={2} sx={{ mb: 2.5 }}>
            {restorationSteps.map((step, idx) => (
              <Stack key={step} direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    bgcolor: INSTITUTIONAL_TEAL,
                    color: '#fff',
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
              variant="contained"
              color="error"
              onClick={() => setRestoreOpen(true)}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
            >
              Restaurar copia
            </Button>
            <Button
              variant="outlined"
              onClick={() => setTestOpen(true)}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
            >
              Probar respaldo
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
