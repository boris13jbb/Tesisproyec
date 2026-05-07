import { useEffect, useMemo, useState, useCallback } from 'react';
import { isAxiosError } from 'axios';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TablePagination from '@mui/material/TablePagination';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { AUDIT_ACTION_FILTER_OPTIONS, AUDIT_ACTION_LABEL_LOOKUP } from '../../constants/audit-actions';

type AuditRow = {
  id: string;
  createdAt?: string | null;
  actorUserId: string | null;
  actorEmail: string | null;
  action: string;
  metaJson?: string | null;
  ip: string | null;
  userAgent?: string | null;
  user_agent?: string | null;
  result: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  resourceCodigo?: string | null;
  correlationId?: string | null;
};

type UsuarioListItem = {
  id: string;
  email: string;
  nombres: string | null;
  apellidos: string | null;
};

type AuditoriaPagedResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: AuditRow[];
};

const INSTITUTIONAL_TEAL = '#2D8A99';

const paperCardSx = {
  bgcolor: '#fff',
  borderRadius: 3,
  p: { xs: 2, md: 2.75 },
  mb: { xs: 2, md: 2.25 },
  border: '1px solid rgba(15, 23, 42, 0.08)',
  boxShadow: '0 14px 46px rgba(15, 23, 42, 0.08)',
};

function todayIso(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function isoStartOfDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function formatAuditDateEc(iso: string | null | undefined): string {
  const s = iso?.trim();
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d);
}

function uaField(r: AuditRow): string | null {
  const u = r.userAgent ?? r.user_agent ?? null;
  return u?.trim() ? u.trim() : null;
}

function shortenUserAgent(ua: string | null | undefined): string {
  const t = ua?.trim() ?? '';
  if (!t) return '';
  const max = 48;
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function parseAuditMeta(metaJson?: string | null): { reason?: string } | null {
  try {
    if (!metaJson) return null;
    const parsed = JSON.parse(metaJson);
    return typeof parsed === 'object' && parsed !== null ? (parsed as { reason?: string }) : null;
  } catch {
    return null;
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function AuditResultChip({ row }: { row: AuditRow }) {
  const res = String(row.result ?? '').toUpperCase();
  const metaReason = parseAuditMeta(row.metaJson)?.reason;

  const chipLabelSx = { '& .MuiChip-label': { px: 1.25 } } as const;

  if (res === 'FAIL' && metaReason === 'ACCOUNT_LOCKED') {
    return (
      <Chip
        size="small"
        label="Bloqueado"
        sx={{ bgcolor: '#ffebee', color: '#b71c1c', fontWeight: 600, ...chipLabelSx }}
      />
    );
  }
  if (res === 'OK') {
    return (
      <Chip size="small" label="Correcto" sx={{ bgcolor: '#e8f5e9', color: '#1b5e20', fontWeight: 600, ...chipLabelSx }} />
    );
  }
  if (res === 'FAIL') {
    return (
      <Chip size="small" label="Fallido" sx={{ bgcolor: '#ffebee', color: '#b71c1c', fontWeight: 600, ...chipLabelSx }} />
    );
  }

  return (
    <Chip
      size="small"
      label={res || '—'}
      sx={{ bgcolor: 'rgba(15,39,108,0.06)', color: 'text.secondary', fontWeight: 600, ...chipLabelSx }}
    />
  );
}

export function AuditoriaPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [usuarios, setUsuarios] = useState<UsuarioListItem[]>([]);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | undefined>(undefined);
  const [exportError, setExportError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const [draftAction, setDraftAction] = useState('');
  const [draftUsuarioId, setDraftUsuarioId] = useState('');
  const [draftFrom, setDraftFrom] = useState(isoStartOfDaysAgo(4));
  const [draftTo, setDraftTo] = useState(todayIso());

  const [appliedAction, setAppliedAction] = useState('');
  const [appliedActorUserId, setAppliedActorUserId] = useState('');
  const [appliedFrom, setAppliedFrom] = useState(isoStartOfDaysAgo(4));
  const [appliedTo, setAppliedTo] = useState(todayIso());

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [reloadToken, setReloadToken] = useState(0);

  const usuarioById = useMemo(() => {
    const map = new Map<string, UsuarioListItem>();
    usuarios.forEach((u) => map.set(u.id, u));
    return map;
  }, [usuarios]);

  /** Acción válida en query `?action=` (prioridad sobre filtros aplicados en memoria). */
  const urlActionFilter = useMemo(() => {
    const raw = searchParams.get('action')?.trim() ?? '';
    if (raw.length < 2) return null as string | null;
    return AUDIT_ACTION_FILTER_OPTIONS.some((o) => o.value === raw) ? raw : null;
  }, [searchParams]);

  const draftActionMostrado = urlActionFilter ?? draftAction;
  const draftFromMostrado =
    urlActionFilter !== null ? isoStartOfDaysAgo(30) : draftFrom;

  const usuarioLabel = useCallback((r: AuditRow): string => {
    if (r.actorUserId && usuarioById.has(r.actorUserId)) {
      const u = usuarioById.get(r.actorUserId)!;
      const name = `${u.nombres ?? ''} ${u.apellidos ?? ''}`.trim();
      return name.length > 0 ? name : u.email;
    }
    if (r.actorEmail?.trim()) return r.actorEmail.trim();
    return '—';
  }, [usuarioById]);

  /** Parámetros de filtro coherentes con `AuditQueryDto` y exports de `/reportes/auditoria.*`. */
  const appliedFilterParams = useMemo(() => {
    const p: Record<string, string> = {};
    const act = (urlActionFilter ?? appliedAction).trim();
    if (act.length >= 2) p.action = act;

    const uid = appliedActorUserId.trim();
    if (uid.length > 0) p.actorUserId = uid;

    const fromCampo =
      urlActionFilter !== null ? isoStartOfDaysAgo(30) : appliedFrom.trim();
    if (fromCampo.length >= 10) {
      p.from = new Date(`${fromCampo}T00:00:00.000`).toISOString();
    }
    if (appliedTo.trim().length >= 10) {
      p.to = new Date(`${appliedTo}T23:59:59.999`).toISOString();
    }
    return p;
  }, [appliedAction, appliedActorUserId, appliedFrom, appliedTo, urlActionFilter]);

  const actionUiLabel = (code: string): string =>
    AUDIT_ACTION_LABEL_LOOKUP[code] ?? code;

  const documentUiLabel = useCallback((r: AuditRow): { text: string; title: string } => {
    const codigoInfra = String(r.resourceCodigo ?? '').trim();
    if (codigoInfra.length > 0) {
      const id = String(r.resourceId ?? '').trim();
      const typeRaw = String(r.resourceType ?? '').trim();
      return {
        text: codigoInfra,
        title: [typeRaw || 'Documento', id ? `uuid ${id}` : '']
          .filter(Boolean)
          .join(' · '),
      };
    }

    const id = String(r.resourceId ?? '').trim();
    if (!id) return { text: '—', title: '' };

    const typeRaw = String(r.resourceType ?? '').trim();
    const type = typeRaw.toLowerCase();
    const looksDoc =
      type.length > 0 &&
      (/document/i.test(type) || /^doc/i.test(type) || type.includes('documento'));

    const short =
      id.length > 12 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id;
    const titleParts = [typeRaw || (looksDoc ? 'Documento' : 'Recurso'), id].filter(Boolean);
    return {
      text: looksDoc ? short : '—',
      title: looksDoc ? titleParts.join(' · ') : [typeRaw || 'recurso', id].join(' · '),
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get<UsuarioListItem[]>('/usuarios');
        if (!cancelled) setUsuarios(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!cancelled) setUsuarios([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchRows() {
      setLoading(true);
      setError(undefined);
      try {
        const res = await apiClient.get<AuditoriaPagedResponse>('/auditoria', {
          params: {
            page: page + 1,
            pageSize,
            ...appliedFilterParams,
          },
        });
        if (cancelled) return;
        const body = res.data;
        const list = Array.isArray(body?.items) ? body.items : [];
        setRows(list);
        setTotal(typeof body?.total === 'number' ? body.total : list.length);
      } catch (e: unknown) {
        if (cancelled) return;
        let msg = 'No se pudo cargar la auditoría.';
        if (isAxiosError(e)) {
          const st = e.response?.status;
          if (st === 401) msg = 'Sesión no válida o expirada. Vuelve a iniciar sesión.';
          else if (st === 403) msg = 'Solo ADMINISTRADOR puede consultar auditoría.';
          else if (typeof e.message === 'string' && e.message.trim()) msg = e.message.trim();
        }
        setError(msg);
        setRows([]);
        setTotal(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchRows();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, appliedFilterParams, reloadToken]);

  function handleConsultar() {
    const usuarioIdSel = draftUsuarioId.trim();

    const actionVal = draftActionMostrado.trim();
    const fromVal = draftFromMostrado.trim();

    setAppliedAction(actionVal);
    setAppliedActorUserId(usuarioIdSel);
    setAppliedFrom(fromVal);
    setAppliedTo(draftTo.trim());
    setDraftAction(actionVal);
    setDraftFrom(fromVal);
    setPage(0);
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.delete('action');
        return n;
      },
      { replace: true },
    );
  }

  const handleUsuarioSelect = (event: SelectChangeEvent<string>) => {
    setDraftUsuarioId(event.target.value);
  };

  const handleActionSelect = (event: SelectChangeEvent<string>) => {
    setDraftAction(event.target.value);
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.delete('action');
        return n;
      },
      { replace: true },
    );
  };

  const onExportExcel = async () => {
    setExportError(undefined);
    try {
      const res = await apiClient.get('/reportes/auditoria.xlsx', {
        params: appliedFilterParams,
        responseType: 'blob',
      });
      downloadBlob(
        new Blob([res.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        `auditoria_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } catch {
      setExportError('No se pudo exportar a Excel.');
    }
  };

  const onExportPdf = async () => {
    setExportError(undefined);
    try {
      const res = await apiClient.get('/reportes/auditoria.pdf', {
        params: appliedFilterParams,
        responseType: 'blob',
      });
      downloadBlob(new Blob([res.data], { type: 'application/pdf' }), `auditoria_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      setExportError('No se pudo exportar a PDF.');
    }
  };

  return (
    <>
      <PageHeader
        title="Registro de auditoría"
        description={
          <Stack spacing={0.75}>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
              <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Auditoría y trazabilidad
              </Box>{' '}
              · GADPR-LM · Sistema de Gestión Documental
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
              Evidencia de acciones para trazabilidad, control y revisión de seguridad.
            </Typography>
          </Stack>
        }
        actions={
          <Tooltip title="Recargar con los mismos filtros y página actuales">
            <span>
              <IconButton
                aria-label="Actualizar auditoría"
                color="primary"
                size="small"
                disabled={loading}
                onClick={() => setReloadToken((n) => n + 1)}
              >
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        }
      />

      {error ? (
        <Alert severity="warning" sx={{ mb: { xs: 2, md: 2 }, borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}

      {exportError ? (
        <Alert severity="error" sx={{ mb: { xs: 2, md: 2 }, borderRadius: 2 }}>
          {exportError}
        </Alert>
      ) : null}

      {/* Filtros (diseño 10 · tarjeta superior) */}
      <Paper elevation={1} sx={paperCardSx}>
        <Typography variant="subtitle1" sx={{ mb: { xs: 1.75, md: 2 }, fontWeight: 700 }}>
          Criterios de consulta
        </Typography>

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: { xs: 'stretch', md: 'flex-end' },
            gap: { xs: 2, md: 2 },
          }}
        >
          <FormControl size="small" sx={{ flex: '1 1 200px', minWidth: { xs: '100%', sm: 200 } }}>
            <InputLabel id="auditoria-filter-usuario">Usuario</InputLabel>
            <Select<string>
              labelId="auditoria-filter-usuario"
              label="Usuario"
              value={draftUsuarioId}
              onChange={handleUsuarioSelect}
            >
              <MenuItem value="">
                <Typography variant="body2">Todos</Typography>
              </MenuItem>
              {usuarios.map((u) => {
                const name = `${u.nombres ?? ''} ${u.apellidos ?? ''}`.trim();
                const label = name.length > 0 ? name : u.email;
                return (
                  <MenuItem key={u.id} value={u.id}>
                    <Stack spacing={0.25}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {label}
                      </Typography>
                      {name.length > 0 ? (
                        <Typography variant="caption" color="text.secondary">
                          {u.email}
                        </Typography>
                      ) : null}
                    </Stack>
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ flex: '1 1 200px', minWidth: { xs: '100%', sm: 200 } }}>
            <InputLabel id="auditoria-filter-accion">Acción</InputLabel>
            <Select<string>
              labelId="auditoria-filter-accion"
              label="Acción"
              value={draftActionMostrado}
              onChange={handleActionSelect}
            >
              {AUDIT_ACTION_FILTER_OPTIONS.map((opt) => (
                <MenuItem key={opt.value || 'todas'} value={opt.value}>
                  <Typography variant="body2">{opt.label}</Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            label="Desde"
            type="date"
            value={draftFromMostrado}
            onChange={(ev) => {
              setDraftFrom(ev.target.value);
              setSearchParams(
                (prev) => {
                  const n = new URLSearchParams(prev);
                  n.delete('action');
                  return n;
                },
                { replace: true },
              );
            }}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ flex: '1 1 160px', minWidth: { xs: '100%', sm: 160 } }}
          />
          <TextField
            size="small"
            label="Hasta"
            type="date"
            value={draftTo}
            onChange={(ev) => setDraftTo(ev.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ flex: '1 1 160px', minWidth: { xs: '100%', sm: 160 } }}
          />

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{
              ml: { xs: 0, md: 'auto' },
              alignItems: { xs: 'stretch', sm: 'center' },
              flexShrink: 0,
            }}
          >
            <Button
              variant="contained"
              onClick={handleConsultar}
              sx={{
                whiteSpace: 'nowrap',
                fontWeight: 700,
                borderRadius: 999,
                px: 2.75,
                py: 1,
                textTransform: 'none',
                bgcolor: INSTITUTIONAL_TEAL,
                boxShadow: 'none',
                '&:hover': { bgcolor: INSTITUTIONAL_TEAL, filter: 'brightness(0.97)' },
              }}
            >
              Consultar
            </Button>
            <Button variant="outlined" size="small" onClick={() => void onExportExcel()}>
              Exportar Excel
            </Button>
            <Button variant="outlined" size="small" onClick={() => void onExportPdf()}>
              Exportar PDF
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Tabla */}
      <Paper elevation={1} sx={paperCardSx}>
        <Stack direction="row" spacing={1.5} sx={{ mb: 2, alignItems: 'flex-start' }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 1.25,
              bgcolor: `${INSTITUTIONAL_TEAL}29`,
              color: INSTITUTIONAL_TEAL,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
            }}
            aria-hidden
          >
            A
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Eventos registrados
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Registros desde <code>audit_logs</code>; el código de expediente se obtiene del catálogo de documentos cuando el evento está vinculado a un documento o incluye <code>documentoId</code> en metadatos.
            </Typography>
          </Box>
          {loading ? <CircularProgress size={22} aria-label="Cargando auditoría" /> : null}
        </Stack>

        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="medium" sx={{ minWidth: 920 }}>
            <TableHead sx={{ '& th': { fontWeight: 800, bgcolor: '#f9fafc' } }}>
              <TableRow>
                <TableCell sx={{ py: { xs: 1.05, md: 1 } }}>Fecha / hora</TableCell>
                <TableCell sx={{ py: { xs: 1.05, md: 1 } }}>Usuario</TableCell>
                <TableCell sx={{ py: { xs: 1.05, md: 1 } }}>Acción</TableCell>
                <TableCell sx={{ py: { xs: 1.05, md: 1 } }}>Documento / recurso</TableCell>
                <TableCell sx={{ py: { xs: 1.05, md: 1 } }}>IP / equipo</TableCell>
                <TableCell align="center" sx={{ py: { xs: 1.05, md: 1 } }}>
                  Resultado
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ borderBottom: 'none', py: 2 }}>
                    <EmptyState
                      dense
                      title="Sin eventos en este período"
                      description={
                        <>
                          Ajuste fechas o filtros y pulse <strong>Consultar</strong>. La exportación usa los filtros ya
                          aplicados (hasta 5000 filas recientes).
                        </>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : null}

              {rows.map((r) => {
                const doc = documentUiLabel(r);
                const uaRaw = uaField(r);
                const ua = shortenUserAgent(uaRaw);
                const ipPart = r.ip?.trim() ? r.ip.trim() : '—';
                const ipUaDisplay = ua ? `${ipPart}\n${ua}` : ipPart;
                const primaryName = usuarioLabel(r);
                const email = r.actorEmail?.trim() ?? '';
                const showEmailLine = email.length > 0 && primaryName !== email;

                return (
                  <TableRow key={r.id} sx={{ '&:last-of-type td': { borderBottom: 0 } }}>
                    <TableCell sx={{ verticalAlign: 'top' }}>
                      {formatAuditDateEc(r.createdAt ?? null)}
                    </TableCell>
                    <TableCell sx={{ verticalAlign: 'top' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {primaryName}
                      </Typography>
                      {showEmailLine ? (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35 }}>
                          {email}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell sx={{ verticalAlign: 'top' }}>
                      <Tooltip title={<Typography variant="caption">Código: {r.action}</Typography>}>
                        <Typography variant="body2" component="span" sx={{ cursor: 'help', borderBottom: '1px dashed rgba(0,0,0,0.2)' }}>
                          {actionUiLabel(String(r.action))}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ verticalAlign: 'top' }}>
                      <Typography variant="body2" title={doc.title || undefined}>
                        {doc.text}
                      </Typography>
                    </TableCell>
                    <TableCell
                      sx={{
                        verticalAlign: 'top',
                        maxWidth: 280,
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        typography: 'body2',
                      }}
                    >
                      {ipUaDisplay}
                    </TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'top' }}>
                      <AuditResultChip row={r} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="Filas"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`}
          page={page}
          onPageChange={(_e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setPage(0);
            setPageSize(parseInt(e.target.value, 10));
          }}
        />
      </Paper>
    </>
  );
}
