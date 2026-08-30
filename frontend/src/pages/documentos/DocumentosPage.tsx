import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined';
import ViewAgendaOutlinedIcon from '@mui/icons-material/ViewAgendaOutlined';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { userHasAdminAccess } from '../../auth/role-utils';
import { EmptyState } from '../../components/EmptyState';
import { DocumentoListCard } from '../../components/DocumentoListCard';
import { FilterPanel } from '../../components/FilterPanel';
import { ListPanel } from '../../components/ListPanel';
import { listTableContainerSx } from '../../components/listSurfaces';
import { PageHeader } from '../../components/PageHeader';
import {
  labelLikertNivel,
  parseLikertNivelUi,
} from '../../nav/documentos-likert-navigation';
import {
  DOCUMENTO_ESTADOS,
  labelDocumentoEstado,
  documentoEstadoChipColor,
  documentoEstadoSchema,
} from '../../constants/documento-estado';

type TipoOption = { id: string; codigo: string; nombre: string };
type SerieOption = { id: string; codigo: string; nombre: string };
type SubserieOption = {
  id: string;
  codigo: string;
  nombre: string;
  serieId: string;
  serie: SerieOption;
};

type DependenciaOption = {
  id: string;
  codigo: string;
  nombre: string;
};

type DocumentoRow = {
  id: string;
  codigo: string;
  asunto: string;
  descripcion: string | null;
  fechaDocumento: string;
  estado: string;
  nivelConfidencialidad: string;
  activo: boolean;
  tipoDocumental: TipoOption;
  dependencia: DependenciaOption | null;
  subserie: {
    id: string;
    codigo: string;
    nombre: string;
    serie: SerieOption;
  };
  createdBy: { id: string; email: string; nombres: string | null; apellidos: string | null };
};

type DocumentosPaged = {
  page: number;
  pageSize: number;
  total: number;
  items: DocumentoRow[];
};

/** Textos de columnas coherentes con la BD (dependencia aplicada vs quien registra). */
function labelResponsableBandeja(row: DocumentoRow): { primary: string; title?: string } {
  const dep = row.dependencia?.nombre?.trim();
  const u = row.createdBy;
  const nombreUsuario = `${u.nombres ?? ''} ${u.apellidos ?? ''}`.trim();
  const email = u.email?.trim() ?? '';
  if (dep) {
    return {
      primary: dep,
      title:
        nombreUsuario.length > 0
          ? `${nombreUsuario} · ${email}`
          : email.length > 0
            ? email
            : undefined,
    };
  }
  if (nombreUsuario.length > 0) return { primary: nombreUsuario, title: email };
  return { primary: email.length > 0 ? email : '—' };
}

function labelClasificacionBandeja(row: DocumentoRow): { line: string; title: string } {
  const ser = row.subserie.serie;
  const ss = row.subserie;
  return {
    line: `${ser.nombre} · ${ss.nombre}`,
    title: `${ser.codigo} / ${ss.codigo} — ${ser.nombre} · ${ss.nombre}`,
  };
}

type DocumentosViewMode = 'cards' | 'table';
const DOCUMENTOS_VIEW_KEY = 'sgd.ui.documentosView';

function readDocumentosView(): DocumentosViewMode {
  try {
    const v = localStorage.getItem(DOCUMENTOS_VIEW_KEY);
    if (v === 'table' || v === 'cards') return v;
  } catch {
    /* ignore */
  }
  return 'cards';
}

function persistDocumentosView(mode: DocumentosViewMode) {
  try {
    localStorage.setItem(DOCUMENTOS_VIEW_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function DocumentosPage() {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const isAdmin = userHasAdminAccess(user?.roles);
  const esRevisor = user?.roles.some((r) => r.codigo === 'REVISOR') ?? false;
  const [myPermissionCodes, setMyPermissionCodes] = useState<string[] | null>(
    null,
  );
  const canCreateDocumento = useMemo(() => {
    if (isAdmin) return true;
    const codes = myPermissionCodes ?? [];
    return codes.includes('DOC_CREATE') && codes.includes('DOC_FILES_UPLOAD');
  }, [isAdmin, myPermissionCodes]);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tipos, setTipos] = useState<TipoOption[]>([]);
  const [subseries, setSubseries] = useState<SubserieOption[]>([]);

  const [rows, setRows] = useState<DocumentoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incluirInactivos, setIncluirInactivos] = useState(false);
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [tipoDocumentalId, setTipoDocumentalId] = useState('');
  const [serieId, setSerieId] = useState('');
  const [subserieId, setSubserieId] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [archivoNombre, setArchivoNombre] = useState('');
  const [archivoMime, setArchivoMime] = useState('');
  const [archivoSha256, setArchivoSha256] = useState('');
  const [sortBy, setSortBy] = useState<'codigo' | 'fechaDocumento' | 'estado'>(
    'fechaDocumento',
  );
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [viewMode, setViewMode] = useState<DocumentosViewMode>(readDocumentosView);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!user?.id) {
          if (!cancelled) setMyPermissionCodes(null);
          return;
        }
        const res = await apiClient.get<{ codigos: string[] }>(
          '/rbac/me/permissions',
        );
        if (cancelled) return;
        setMyPermissionCodes(Array.isArray(res.data?.codigos) ? res.data.codigos : []);
      } catch {
        if (cancelled) return;
        setMyPermissionCodes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const estadoDesdeUrl = useMemo(() => {
    const raw = searchParams.get('estado')?.trim() ?? '';
    if (!raw) return null;
    const parsed = documentoEstadoSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  }, [searchParams]);

  /** Filtro efectivo: la query `?estado=` tiene prioridad sobre el estado local del Select. */
  const estadoFiltrado = estadoDesdeUrl ?? estado;

  const likertFiltrado = useMemo(
    () => parseLikertNivelUi(searchParams.get('likert')),
    [searchParams],
  );

  /** URL o casilla local; Crítico del dashboard activa inactivos vía query. */
  const incluirInactivosEfectivo =
    incluirInactivos || searchParams.get('incluirInactivos') === 'true';

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<TipoOption[]>('/tipos-documentales')
      .then((res) => {
        if (!cancelled) setTipos(res.data);
      })
      .catch(() => {
        if (!cancelled) setTipos([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<SubserieOption[]>('/subseries')
      .then((res) => {
        if (!cancelled) setSubseries(res.data);
      })
      .catch(() => {
        if (!cancelled) setSubseries([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await apiClient.get<DocumentosPaged>('/documentos', {
        params: {
          incluirInactivos: incluirInactivosEfectivo ? 'true' : 'false',
          q: q || undefined,
          estado: estadoFiltrado || undefined,
          likert: likertFiltrado || undefined,
          tipoDocumentalId: tipoDocumentalId || undefined,
          serieId: serieId || undefined,
          subserieId: subserieId || undefined,
          fechaDesde: fechaDesde ? new Date(fechaDesde).toISOString() : undefined,
          fechaHasta: fechaHasta ? new Date(fechaHasta).toISOString() : undefined,
          archivoNombre: archivoNombre || undefined,
          archivoMime: archivoMime || undefined,
          archivoSha256: archivoSha256 || undefined,
          sortBy,
          sortDir,
          page: String(page),
          pageSize: String(pageSize),
        },
      });
      setRows(data.items);
      setTotal(data.total);
    } catch {
      setError('No se pudieron cargar los documentos.');
    } finally {
      setLoading(false);
    }
  }, [
    incluirInactivosEfectivo,
    q,
    archivoNombre,
    archivoMime,
    archivoSha256,
    estadoFiltrado,
    likertFiltrado,
    tipoDocumentalId,
    serieId,
    subserieId,
    fechaDesde,
    fechaHasta,
    sortBy,
    sortDir,
    page,
  ]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sincroniza lista con filtros/paginación
    void load();
  }, [load]);

  const series = useMemo(() => {
    const map = new Map<string, SerieOption>();
    for (const s of subseries) {
      map.set(s.serie.id, s.serie);
    }
    return Array.from(map.values()).sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [subseries]);

  const subseriesFiltered = useMemo(() => {
    if (!serieId) return subseries;
    return subseries.filter((s) => s.serie.id === serieId);
  }, [subseries, serieId]);

  const onApplyFilters = () => {
    setPage(1);
    void load();
  };

  const onClearFilters = () => {
    setQ('');
    setEstado('');
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.delete('estado');
        n.delete('likert');
        n.delete('incluirInactivos');
        return n;
      },
      { replace: true },
    );
    setIncluirInactivos(false);
    setTipoDocumentalId('');
    setSerieId('');
    setSubserieId('');
    setFechaDesde('');
    setFechaHasta('');
    setArchivoNombre('');
    setArchivoMime('');
    setArchivoSha256('');
    setPage(1);
  };

  const toggleSort = (next: 'codigo' | 'fechaDocumento' | 'estado') => {
    setPage(1);
    setSortBy((current) => {
      if (current !== next) {
        setSortDir('asc');
        return next;
      }
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return current;
    });
  };

  const sortLabel = (col: 'codigo' | 'fechaDocumento' | 'estado') => {
    if (sortBy !== col) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const exportParams = useMemo(() => {
    return {
      incluirInactivos: incluirInactivos ? 'true' : 'false',
      q: q || undefined,
      estado: estadoFiltrado || undefined,
      tipoDocumentalId: tipoDocumentalId || undefined,
      serieId: serieId || undefined,
      subserieId: subserieId || undefined,
      fechaDesde: fechaDesde ? new Date(fechaDesde).toISOString() : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta).toISOString() : undefined,
      archivoNombre: archivoNombre || undefined,
      archivoMime: archivoMime || undefined,
      archivoSha256: archivoSha256 || undefined,
      sortBy,
      sortDir,
    } as const;
  }, [
    incluirInactivos,
    q,
    estadoFiltrado,
    tipoDocumentalId,
    serieId,
    subserieId,
    fechaDesde,
    fechaHasta,
    archivoNombre,
    archivoMime,
    archivoSha256,
    sortBy,
    sortDir,
  ]);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onExportExcel = async () => {
    setError(null);
    try {
      const res = await apiClient.get('/reportes/documentos.xlsx', {
        params: exportParams,
        responseType: 'blob',
      });
      downloadBlob(
        new Blob([res.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        `documentos_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } catch {
      setError('No se pudo exportar a Excel.');
    }
  };

  const onExportPdf = async () => {
    setError(null);
    try {
      const res = await apiClient.get('/reportes/documentos.pdf', {
        params: exportParams,
        responseType: 'blob',
      });
      downloadBlob(
        new Blob([res.data], { type: 'application/pdf' }),
        `documentos_${new Date().toISOString().slice(0, 10)}.pdf`,
      );
    } catch {
      setError('No se pudo exportar a PDF.');
    }
  };

  const onExportPendientesRevisionExcel = async () => {
    setError(null);
    try {
      const res = await apiClient.get('/reportes/pendientes-revision.xlsx', {
        responseType: 'blob',
      });
      downloadBlob(
        new Blob([res.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        `pendientes_revision_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } catch {
      setError('No se pudo exportar pendientes de revisión a Excel.');
    }
  };

  const onExportPendientesRevisionPdf = async () => {
    setError(null);
    try {
      const res = await apiClient.get('/reportes/pendientes-revision.pdf', {
        responseType: 'blob',
      });
      downloadBlob(
        new Blob([res.data], { type: 'application/pdf' }),
        `pendientes_revision_${new Date().toISOString().slice(0, 10)}.pdf`,
      );
    } catch {
      setError('No se pudo exportar pendientes de revisión a PDF.');
    }
  };

  const subserieLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of subseries) {
      map.set(s.id, `${s.serie.codigo} / ${s.codigo} — ${s.nombre}`);
    }
    return map;
  }, [subseries]);

  return (
    <>
      <Box component="main" sx={{ width: '100%', pb: { xs: 4, md: 5 } }}>
        <PageHeader
          title="Bandeja documental"
          description={
            <>
              Busque, filtre, consulte y administre documentos digitalizados.
              {esRevisor && (
                <Box component="span" sx={{ display: 'block', mt: 1 }}>
                  <Typography variant="body2">
                    Rol <strong>REVISOR</strong>: usa el filtro{' '}
                    <strong>Estado → En revisión</strong> para ver pendientes y resuélvelos con{' '}
                    <strong>Aprobar</strong>/<strong>Rechazar</strong> en el detalle del documento.
                  </Typography>
                </Box>
              )}
            </>
          }
          actions={
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {isAdmin && (
                <>
                  <Button variant="outlined" size="small" onClick={() => void onExportExcel()}>
                    Excel
                  </Button>
                  <Button variant="outlined" size="small" onClick={() => void onExportPdf()}>
                    PDF
                  </Button>
                </>
              )}
              {canCreateDocumento && (
                <Button
                  variant="contained"
                  color="secondary"
                  size="small"
                  onClick={() => void navigate('/documentos/nuevo')}
                >
                  Nuevo documento
                </Button>
              )}
            </Stack>
          }
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {likertFiltrado ? (
          <Alert
            severity="info"
            sx={{ mb: 2 }}
            onClose={() => {
              setSearchParams(
                (prev) => {
                  const n = new URLSearchParams(prev);
                  n.delete('likert');
                  n.delete('incluirInactivos');
                  return n;
                },
                { replace: true },
              );
              setIncluirInactivos(false);
              setPage(1);
            }}
          >
            Filtro Likert activo: <strong>{labelLikertNivel(likertFiltrado)}</strong>. Se listan
            documentos del mismo criterio que el panel de evaluación. Pulse la X o «Limpiar» para
            quitarlo.
          </Alert>
        ) : null}

        <FilterPanel
          title="Filtros de búsqueda"
          description="Combine texto, tipo, estado, serie y rango de fechas. Use «Más filtros» para adjuntos y orden."
          actions={
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setShowAdvancedFilters((v) => !v)}
                >
                  {showAdvancedFilters ? 'Ocultar filtros' : 'Más filtros'}
                </Button>
                <Button variant="text" size="small" onClick={onClearFilters} disabled={loading}>
                  Limpiar
                </Button>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={incluirInactivosEfectivo}
                      onChange={(_, c) => {
                        setIncluirInactivos(c);
                        setSearchParams(
                          (prev) => {
                            const n = new URLSearchParams(prev);
                            if (c) n.set('incluirInactivos', 'true');
                            else n.delete('incluirInactivos');
                            return n;
                          },
                          { replace: true },
                        );
                      }}
                      size="small"
                    />
                  }
                  label="Incluir inactivos"
                />
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                {esRevisor && (
                  <>
                    <Button
                      variant="outlined"
                      size="small"
                      color="secondary"
                      onClick={() => void onExportPendientesRevisionExcel()}
                    >
                      Pendientes (Excel)
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="secondary"
                      onClick={() => void onExportPendientesRevisionPdf()}
                    >
                      Pendientes (PDF)
                    </Button>
                  </>
                )}
              </Stack>
            </Stack>
          }
        >
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              alignItems: 'flex-end',
              '& > *': { minWidth: 0 },
            }}
          >
            <TextField
              placeholder="Código, asunto o texto en responsable"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              size="small"
              fullWidth
              sx={{ flex: '1 1 100%', minWidth: { sm: 'min(100%, 280px)' } }}
              slotProps={{
                htmlInput: {
                  'aria-label': 'Buscar por código, asunto o responsable',
                },
              }}
            />

            <FormControl size="small" sx={{ flex: '1 1 160px', minWidth: { xs: '100%', sm: '160px' } }} fullWidth>
              <InputLabel id="tipo-filter-label">Tipo</InputLabel>
              <Select
                labelId="tipo-filter-label"
                label="Tipo"
                value={tipoDocumentalId}
                onChange={(e) => setTipoDocumentalId(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                {tipos.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.codigo}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ flex: '1 1 160px', minWidth: { xs: '100%', sm: '168px' } }} fullWidth>
              <InputLabel id="estado-filter-label">Estado</InputLabel>
              <Select
                labelId="estado-filter-label"
                label="Estado"
                value={estadoFiltrado}
                onChange={(e) => {
                  const v = e.target.value;
                  setEstado(v);
                  setSearchParams(
                    (prev) => {
                      const n = new URLSearchParams(prev);
                      if (v) n.set('estado', v);
                      else n.delete('estado');
                      return n;
                    },
                    { replace: true },
                  );
                }}
              >
                <MenuItem value="">Todos</MenuItem>
                {DOCUMENTO_ESTADOS.map((cod) => (
                  <MenuItem key={cod} value={cod}>
                    {labelDocumentoEstado(cod)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ flex: '1 1 160px', minWidth: { xs: '100%', sm: '160px' } }} fullWidth>
              <InputLabel id="serie-filter-label">Serie</InputLabel>
              <Select
                labelId="serie-filter-label"
                label="Serie"
                value={serieId}
                onChange={(e) => {
                  const v = e.target.value;
                  setSerieId(v);
                  setSubserieId('');
                }}
              >
                <MenuItem value="">Todas</MenuItem>
                {series.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.codigo}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Desde"
              type="date"
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              sx={{ flex: '1 1 150px', minWidth: { xs: 'calc(50% - 8px)', sm: '150px' } }}
            />
            <TextField
              label="Hasta"
              type="date"
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              sx={{ flex: '1 1 150px', minWidth: { xs: 'calc(50% - 8px)', sm: '150px' } }}
            />

            <Button
              variant="contained"
              color="secondary"
              onClick={onApplyFilters}
              disabled={loading}
              fullWidth={isXs}
              sx={{
                flex: { xs: '1 1 100%', sm: '0 0 auto' },
                minHeight: 40,
                px: { sm: 3 },
              }}
            >
              Aplicar filtros
            </Button>
          </Box>

          <Collapse in={showAdvancedFilters} unmountOnExit>
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>
                Filtros avanzados
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 2,
                  alignItems: 'flex-end',
                  '& > *': { minWidth: 0 },
                }}
              >
                <FormControl size="small" sx={{ flex: '1 1 220px', minWidth: { xs: '100%', sm: '200px' } }} fullWidth>
                  <InputLabel id="subserie-filter-label">Clasificación</InputLabel>
                  <Select
                    labelId="subserie-filter-label"
                    label="Clasificación"
                    value={subserieId}
                    onChange={(e) => setSubserieId(e.target.value)}
                  >
                    <MenuItem value="">Todas</MenuItem>
                    {subseriesFiltered.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {subserieLabel.get(s.id)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Adjunto: nombre"
                  value={archivoNombre}
                  onChange={(e) => setArchivoNombre(e.target.value)}
                  size="small"
                  fullWidth
                  sx={{ flex: '1 1 200px', minWidth: { xs: '100%', sm: '180px' } }}
                />
                <TextField
                  label="Adjunto: MIME"
                  value={archivoMime}
                  onChange={(e) => setArchivoMime(e.target.value)}
                  size="small"
                  fullWidth
                  sx={{ flex: '1 1 160px', minWidth: { xs: '100%', sm: '140px' } }}
                />
                <TextField
                  label="Adjunto: SHA-256"
                  value={archivoSha256}
                  onChange={(e) => setArchivoSha256(e.target.value)}
                  size="small"
                  fullWidth
                  sx={{ flex: '1 1 220px', minWidth: { xs: '100%', sm: '200px' } }}
                />

                <FormControl size="small" sx={{ flex: '1 1 160px', minWidth: { xs: 'calc(50% - 8px)', sm: '140px' } }} fullWidth>
                  <InputLabel id="sortby-label">Orden</InputLabel>
                  <Select
                    labelId="sortby-label"
                    label="Orden"
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(e.target.value as 'codigo' | 'fechaDocumento' | 'estado')
                    }
                  >
                    <MenuItem value="fechaDocumento">Fecha</MenuItem>
                    <MenuItem value="codigo">Código</MenuItem>
                    <MenuItem value="estado">Estado</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ flex: '1 1 140px', minWidth: { xs: 'calc(50% - 8px)', sm: '120px' } }} fullWidth>
                  <InputLabel id="sortdir-label">Dirección</InputLabel>
                  <Select
                    labelId="sortdir-label"
                    label="Dirección"
                    value={sortDir}
                    onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
                  >
                    <MenuItem value="asc">Asc</MenuItem>
                    <MenuItem value="desc">Desc</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </Collapse>
        </FilterPanel>

        <ListPanel
          badge={<DescriptionOutlinedIcon fontSize="small" />}
          title="Listado de documentos"
          subtitle={`${new Intl.NumberFormat('es-EC').format(total)} resultado${total === 1 ? '' : 's'} · datos del servidor según filtros y permisos`}
          loading={loading}
          meta={
            <ToggleButtonGroup
              exclusive
              size="small"
              value={viewMode}
              onChange={(_, next: DocumentosViewMode | null) => {
                if (!next) return;
                setViewMode(next);
                persistDocumentosView(next);
              }}
              aria-label="Vista del listado"
            >
              <ToggleButton value="cards" aria-label="Vista en tarjetas" title="Tarjetas">
                <ViewAgendaOutlinedIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="table" aria-label="Vista en tabla" title="Tabla">
                <TableRowsOutlinedIcon fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>
          }
          footer={
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{
                alignItems: { xs: 'stretch', sm: 'center' },
                justifyContent: 'space-between',
                pt: 0.5,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                Página <strong>{page}</strong>
                {' · '}Mostrando {rows.length === 0 ? 0 : (page - 1) * pageSize + 1}–
                {(page - 1) * pageSize + rows.length} de {total}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ justifyContent: { xs: 'center', sm: 'flex-end' } }}>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={page * pageSize >= total || loading || total === 0}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </Stack>
            </Stack>
          }
        >
          {loading && (
            <LinearProgress
              color="secondary"
              sx={{ height: 3, mb: 1.5, borderRadius: 1 }}
              aria-label="Cargando documentos"
            />
          )}

          {viewMode === 'cards' ? (
            <Box>
              {loading && rows.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  Cargando…
                </Typography>
              ) : null}
              {!loading && rows.length === 0 ? (
                <EmptyState
                  title="No hay documentos que coincidan con los criterios."
                  description="Pruebe a limpiar filtros o registre un nuevo documento si tiene permiso."
                />
              ) : (
                <Stack spacing={1.25} role="list" aria-label="Documentos en tarjetas">
                  {rows.map((row) => {
                    const cls = labelClasificacionBandeja(row);
                    const resp = labelResponsableBandeja(row);
                    return (
                      <DocumentoListCard
                        key={row.id}
                        codigo={row.codigo}
                        asunto={row.asunto}
                        estado={row.estado}
                        fechaLabel={new Date(row.fechaDocumento).toISOString().slice(0, 10)}
                        tipoNombre={row.tipoDocumental.nombre}
                        clasificacionLine={cls.line}
                        clasificacionTitle={cls.title}
                        responsablePrimary={resp.primary}
                        responsableTitle={resp.title}
                        activo={row.activo}
                        onOpen={() => navigate(`/documentos/${row.id}`)}
                      />
                    );
                  })}
                </Stack>
              )}
            </Box>
          ) : (
          <TableContainer
            sx={{
              ...listTableContainerSx,
              overflowX: 'auto',
              maxWidth: '100%',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <Table
              size="small"
              aria-label="Tabla de documentos"
              sx={{
                minWidth: { xs: 920, md: '100%' },
                tableLayout: 'fixed',
                '& .MuiTableCell-root': {
                  verticalAlign: 'middle',
                  py: 1.25,
                },
              }}
            >
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell
                    width="10%"
                    onClick={() => toggleSort('codigo')}
                    sx={{ cursor: 'pointer', userSelect: 'none', fontWeight: 700, color: 'text.secondary' }}
                  >
                    Código{sortLabel('codigo')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: '22%' }}>
                    Asunto
                  </TableCell>
                  <TableCell width="11%" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    Tipo
                  </TableCell>
                  <TableCell width="17%" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    Clasificación
                  </TableCell>
                  <TableCell width="14%" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    Responsable
                  </TableCell>
                  <TableCell
                    width="12%"
                    onClick={() => toggleSort('estado')}
                    sx={{ cursor: 'pointer', userSelect: 'none', fontWeight: 700, color: 'text.secondary' }}
                  >
                    Estado{sortLabel('estado')}
                  </TableCell>
                  <TableCell
                    width="10%"
                    onClick={() => toggleSort('fechaDocumento')}
                    sx={{ cursor: 'pointer', userSelect: 'none', fontWeight: 700, color: 'text.secondary' }}
                  >
                    Fecha{sortLabel('fechaDocumento')}
                  </TableCell>
                  <TableCell width="104px" align="right" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    Acción
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={8}>Cargando…</TableCell>
                  </TableRow>
                )}
                {!loading &&
                  rows.map((row) => {
                    const cls = labelClasificacionBandeja(row);
                    const resp = labelResponsableBandeja(row);
                    return (
                      <TableRow
                        key={row.id}
                        hover
                        onClick={() => navigate(`/documentos/${row.id}`)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                          {row.codigo}
                        </TableCell>
                        <TableCell
                          sx={{
                            overflow: 'hidden',
                            wordBreak: 'break-word',
                            whiteSpace: 'normal',
                          }}
                        >
                          {row.asunto}
                        </TableCell>
                        <TableCell>{row.tipoDocumental.nombre}</TableCell>
                        <TableCell
                          sx={{
                            maxWidth: 220,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={cls.title}
                        >
                          {cls.line}
                        </TableCell>
                        <TableCell
                          sx={{
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={resp.title ?? resp.primary}
                        >
                          {resp.primary}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Chip
                            label={labelDocumentoEstado(row.estado)}
                            size="small"
                            color={documentoEstadoChipColor(row.estado)}
                            variant="filled"
                            sx={{ fontWeight: 800 }}
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(row.fechaDocumento).toISOString().slice(0, 10)}
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <Button
                            variant="contained"
                            color="secondary"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              void navigate(`/documentos/${row.id}`);
                            }}
                          >
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ py: 0 }}>
                      <EmptyState
                        dense
                        title="No hay documentos que coincidan con los criterios."
                        description="Pruebe a limpiar filtros o registre un nuevo documento si tiene permiso."
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          )}
        </ListPanel>

      </Box>

    </>
  );
}

