import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Container,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { isAxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import {
  DOCUMENTO_ESTADOS,
  labelDocumentoEstado,
  documentoEstadoCreacionSchema,
  documentoEstadoSchema,
} from '../../constants/documento-estado';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';

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

const createSchema = z.object({
  codigo: z.string().min(2).max(64),
  asunto: z.string().min(3).max(250),
  descripcion: z.string().max(1000).optional(),
  fechaDocumento: z.string().min(10, 'Fecha requerida'),
  tipoDocumentalId: z.string().min(1, 'Tipo requerido'),
  subserieId: z.string().min(1, 'Subserie requerida'),
  dependenciaId: z.string().optional(),
  nivelConfidencialidad: z.enum(['PUBLICO', 'INTERNO', 'RESERVADO', 'CONFIDENCIAL']),
  estado: documentoEstadoCreacionSchema,
});

type CreateForm = z.infer<typeof createSchema>;

export function DocumentosPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles.some((r) => r.codigo === 'ADMIN') ?? false;
  const esRevisor = user?.roles.some((r) => r.codigo === 'REVISOR') ?? false;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tipos, setTipos] = useState<TipoOption[]>([]);
  const [subseries, setSubseries] = useState<SubserieOption[]>([]);
  const [dependencias, setDependencias] = useState<DependenciaOption[]>([]);

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

  const [createOpen, setCreateOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const estadoDesdeUrl = useMemo(() => {
    const raw = searchParams.get('estado')?.trim() ?? '';
    if (!raw) return null;
    const parsed = documentoEstadoSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  }, [searchParams]);

  /** Filtro efectivo: la query `?estado=` tiene prioridad sobre el estado local del Select. */
  const estadoFiltrado = estadoDesdeUrl ?? estado;

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

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<DependenciaOption[]>('/dependencias')
      .then((res) => {
        if (!cancelled) setDependencias(res.data);
      })
      .catch(() => {
        if (!cancelled) setDependencias([]);
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
    incluirInactivos,
    q,
    archivoNombre,
    archivoMime,
    archivoSha256,
    estadoFiltrado,
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
        return n;
      },
      { replace: true },
    );
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

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      codigo: '',
      asunto: '',
      descripcion: '',
      fechaDocumento: new Date().toISOString().slice(0, 10),
      tipoDocumentalId: '',
      subserieId: '',
      dependenciaId: '',
      nivelConfidencialidad: 'INTERNO',
      estado: 'REGISTRADO',
    },
  });

  const onCreate = createForm.handleSubmit(async (data) => {
    setError(null);
    try {
      await apiClient.post('/documentos', {
        codigo: data.codigo,
        asunto: data.asunto,
        descripcion: data.descripcion || undefined,
        fechaDocumento: new Date(data.fechaDocumento).toISOString(),
        tipoDocumentalId: data.tipoDocumentalId,
        subserieId: data.subserieId,
        dependenciaId: data.dependenciaId?.trim() || undefined,
        nivelConfidencialidad: data.nivelConfidencialidad,
        estado: data.estado,
      });
      setCreateOpen(false);
      createForm.reset();
      await load();
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data) {
        const d = err.response.data as { message?: string | string[] };
        const m = d.message;
        setError(Array.isArray(m) ? m.join(' ') : (m ?? 'No se pudo crear.'));
      } else {
        setError('No se pudo crear.');
      }
    }
  });

  const subserieLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of subseries) {
      map.set(s.id, `${s.serie.codigo} / ${s.codigo} — ${s.nombre}`);
    }
    return map;
  }, [subseries]);

  const estadoChipColor = (codigo: string): 'default' | 'success' | 'warning' | 'info' | 'error' => {
    switch (codigo) {
      case 'APROBADO':
        return 'success';
      case 'EN_REVISION':
        return 'warning';
      case 'REGISTRADO':
        return 'info';
      case 'RECHAZADO':
        return 'error';
      case 'ARCHIVADO':
        return 'default';
      case 'BORRADOR':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <>
      <Container maxWidth="lg">
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
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid rgba(15, 23, 42, 0.08)',
            boxShadow: '0 14px 46px rgba(15, 23, 42, 0.08)',
            p: 2,
            mb: 2,
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            sx={{ alignItems: { xs: 'stretch', md: 'center' } }}
          >
            <TextField
              placeholder="Buscar por código, asunto o responsable"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              size="small"
              sx={{ flex: 1, minWidth: 260 }}
              slotProps={{
                htmlInput: {
                  'aria-label': 'Buscar por código, asunto o responsable',
                },
              }}
            />

            <FormControl size="small" sx={{ minWidth: 160 }}>
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

            <FormControl size="small" sx={{ minWidth: 170 }}>
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

            <FormControl size="small" sx={{ minWidth: 170 }}>
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
              slotProps={{ inputLabel: { shrink: true } }}
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              sx={{ minWidth: 150 }}
            />
            <TextField
              label="Hasta"
              type="date"
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              sx={{ minWidth: 150 }}
            />

            <Button
              variant="contained"
              onClick={onApplyFilters}
              disabled={loading}
              sx={{
                borderRadius: 3,
                px: 3,
                bgcolor: '#1E7C89',
                '&:hover': { bgcolor: '#196C77' },
              }}
            >
              Filtrar
            </Button>
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ mt: 1.5, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}
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
                    checked={incluirInactivos}
                    onChange={(_, c) => setIncluirInactivos(c)}
                    size="small"
                  />
                }
                label="Incluir inactivos"
              />
            </Stack>

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              {isAdmin && (
                <>
                  <Button variant="outlined" size="small" onClick={() => void onExportExcel()}>
                    Excel
                  </Button>
                  <Button variant="outlined" size="small" onClick={() => void onExportPdf()}>
                    PDF
                  </Button>
                  <Button variant="contained" size="small" onClick={() => setCreateOpen(true)}>
                    Nuevo documento
                  </Button>
                </>
              )}
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

          <Collapse in={showAdvancedFilters} unmountOnExit>
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Filtros avanzados
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 220 }}>
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
                  sx={{ minWidth: 200 }}
                />
                <TextField
                  label="Adjunto: MIME"
                  value={archivoMime}
                  onChange={(e) => setArchivoMime(e.target.value)}
                  size="small"
                  sx={{ minWidth: 160 }}
                />
                <TextField
                  label="Adjunto: SHA-256"
                  value={archivoSha256}
                  onChange={(e) => setArchivoSha256(e.target.value)}
                  size="small"
                  sx={{ minWidth: 220 }}
                />

                <FormControl size="small" sx={{ minWidth: 160 }}>
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
                <FormControl size="small" sx={{ minWidth: 140 }}>
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
        </Paper>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid rgba(15, 23, 42, 0.08)',
            boxShadow: '0 14px 46px rgba(15, 23, 42, 0.08)',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ px: 2.5, pt: 2.25, pb: 1.25 }}>
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
                  Listado de documentos
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Resultado: {new Intl.NumberFormat('es-EC').format(total)} documentos (datos del
                  servidor, según tus filtros y permisos)
                </Typography>
              </Box>
            </Stack>
          </Box>

          <TableContainer>
            <Table size="small" aria-label="Tabla de documentos">
              <TableHead>
                <TableRow>
                  <TableCell
                    onClick={() => toggleSort('codigo')}
                    sx={{ cursor: 'pointer', userSelect: 'none', fontWeight: 800, color: 'text.secondary' }}
                  >
                    Código{sortLabel('codigo')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Asunto</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Tipo</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>
                    Clasificación
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>
                    Responsable
                  </TableCell>
                  <TableCell
                    onClick={() => toggleSort('estado')}
                    sx={{ cursor: 'pointer', userSelect: 'none', fontWeight: 800, color: 'text.secondary' }}
                  >
                    Estado{sortLabel('estado')}
                  </TableCell>
                  <TableCell
                    onClick={() => toggleSort('fechaDocumento')}
                    sx={{ cursor: 'pointer', userSelect: 'none', fontWeight: 800, color: 'text.secondary' }}
                  >
                    Fecha{sortLabel('fechaDocumento')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Acción</TableCell>
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
                        <TableCell>{row.asunto}</TableCell>
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
                            color={estadoChipColor(row.estado)}
                            variant="filled"
                            sx={{ fontWeight: 800 }}
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(row.fechaDocumento).toISOString().slice(0, 10)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              void navigate(`/documentos/${row.id}`);
                            }}
                            sx={{
                              borderRadius: 999,
                              px: 2,
                              bgcolor: '#0D2C46',
                              '&:hover': { bgcolor: '#0B2438' },
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
        </Paper>

      <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Anterior
        </Button>
        <Button
          variant="outlined"
          disabled={page * pageSize >= total || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Siguiente
        </Button>
      </Box>
      </Container>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Registrar documento</DialogTitle>
        <Box component="form" onSubmit={onCreate} noValidate>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Código"
              {...createForm.register('codigo')}
              error={!!createForm.formState.errors.codigo}
              helperText={createForm.formState.errors.codigo?.message}
              required
            />
            <TextField
              label="Asunto"
              {...createForm.register('asunto')}
              error={!!createForm.formState.errors.asunto}
              helperText={createForm.formState.errors.asunto?.message}
              required
            />
            <Controller
              name="tipoDocumentalId"
              control={createForm.control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel id="tipo-label">Tipo documental</InputLabel>
                  <Select
                    {...field}
                    labelId="tipo-label"
                    label="Tipo documental"
                    value={field.value || ''}
                  >
                    {tipos.map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.codigo} — {t.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
            <Controller
              name="subserieId"
              control={createForm.control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel id="subserie-label">Subserie</InputLabel>
                  <Select
                    {...field}
                    labelId="subserie-label"
                    label="Subserie"
                    value={field.value || ''}
                  >
                    {subseries.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {subserieLabel.get(s.id)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
            <Controller
              name="dependenciaId"
              control={createForm.control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel id="dep-label">Dependencia propietaria</InputLabel>
                  <Select
                    {...field}
                    labelId="dep-label"
                    label="Dependencia propietaria"
                    value={field.value || ''}
                  >
                    <MenuItem value="">(Usar dependencia del ADMIN o sin asignar)</MenuItem>
                    {dependencias.map((d) => (
                      <MenuItem key={d.id} value={d.id}>
                        {d.codigo} — {d.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
            <Controller
              name="nivelConfidencialidad"
              control={createForm.control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel id="nivel-label">Confidencialidad</InputLabel>
                  <Select
                    {...field}
                    labelId="nivel-label"
                    label="Confidencialidad"
                    value={field.value}
                  >
                    <MenuItem value="INTERNO">Interno</MenuItem>
                    <MenuItem value="PUBLICO">Público</MenuItem>
                    <MenuItem value="RESERVADO">Reservado</MenuItem>
                    <MenuItem value="CONFIDENCIAL">Confidencial (solo ADMIN)</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
            <Controller
              name="estado"
              control={createForm.control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel id="estado-create-label">Estado inicial</InputLabel>
                  <Select
                    {...field}
                    labelId="estado-create-label"
                    label="Estado inicial"
                    value={field.value || 'REGISTRADO'}
                  >
                    <MenuItem value="REGISTRADO">{labelDocumentoEstado('REGISTRADO')}</MenuItem>
                    <MenuItem value="BORRADOR">{labelDocumentoEstado('BORRADOR')}</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
            <TextField
              label="Fecha del documento"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              {...createForm.register('fechaDocumento')}
              error={!!createForm.formState.errors.fechaDocumento}
              helperText={createForm.formState.errors.fechaDocumento?.message}
              required
            />
            <TextField
              label="Descripción"
              {...createForm.register('descripcion')}
              multiline
              minRows={2}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Guardar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}

