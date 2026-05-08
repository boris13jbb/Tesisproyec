import { zodResolver } from '@hookform/resolvers/zod';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
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
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  LinearProgress,
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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { isAxiosError } from 'axios';
import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  codigo: z
    .string()
    .max(64)
    .transform((s) => s.trim())
    .refine((s) => s.length === 0 || s.length >= 2, {
      message: 'Si indica código, mínimo 2 caracteres.',
    }),
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

const createFormDefaults: CreateForm = {
  codigo: '',
  asunto: '',
  descripcion: '',
  fechaDocumento: new Date().toISOString().slice(0, 10),
  tipoDocumentalId: '',
  subserieId: '',
  dependenciaId: '',
  nivelConfidencialidad: 'INTERNO',
  estado: 'REGISTRADO',
};

export function DocumentosPage() {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
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
  /** Solo si el usuario editó el campo código se envía en el POST; si no, el servidor asigna correlativo en la transacción. */
  const createCodigoUsuarioRef = useRef(false);
  const [createCodigoBusy, setCreateCodigoBusy] = useState(false);
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
    defaultValues: { ...createFormDefaults },
  });

  const prefetchCreateCodigo = useCallback(
    async (fechaYmd: string, resetUsuarioFlag: boolean) => {
      if (resetUsuarioFlag) {
        createCodigoUsuarioRef.current = false;
      }
      const anioStr = fechaYmd.slice(0, 4);
      const params = /^\d{4}$/.test(anioStr) ? { anio: Number(anioStr) } : {};
      setCreateCodigoBusy(true);
      try {
        const { data } = await apiClient.get<{ codigo: string }>(
          '/documentos/next-codigo',
          { params },
        );
        createForm.setValue('codigo', data.codigo, { shouldValidate: true });
      } finally {
        setCreateCodigoBusy(false);
      }
    },
    [createForm],
  );

  useEffect(() => {
    if (!createOpen || !isAdmin) return;
    const fecha = new Date().toISOString().slice(0, 10);
    createForm.reset({ ...createFormDefaults, fechaDocumento: fecha });
    void prefetchCreateCodigo(fecha, true).catch(() => {
      createForm.setValue('codigo', '', { shouldValidate: true });
    });
  }, [createOpen, isAdmin, createForm, prefetchCreateCodigo]);

  const onCreate = createForm.handleSubmit(async (data) => {
    setError(null);
    try {
      const trimmedCodigo = data.codigo.trim();
      const body: Record<string, unknown> = {
        asunto: data.asunto,
        descripcion: data.descripcion || undefined,
        fechaDocumento: new Date(data.fechaDocumento).toISOString(),
        tipoDocumentalId: data.tipoDocumentalId,
        subserieId: data.subserieId,
        dependenciaId: data.dependenciaId?.trim() || undefined,
        nivelConfidencialidad: data.nivelConfidencialidad,
        estado: data.estado,
      };
      if (createCodigoUsuarioRef.current && trimmedCodigo) {
        body.codigo = trimmedCodigo;
      }
      await apiClient.post('/documentos', body);
      setCreateOpen(false);
      createForm.reset({ ...createFormDefaults });
      createCodigoUsuarioRef.current = false;
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
      <Box
        component="main"
        sx={{
          width: '100%',
          maxWidth: 'min(100%, 1420px)',
          mx: 'auto',
          px: { xs: 1.5, sm: 2, md: 3 },
          py: { xs: 2, md: 2.5 },
          pb: { xs: 6, md: 8 },
        }}
      >
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
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
            p: { xs: 1.5, sm: 2 },
            mb: 2,
          }}
        >
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.08, fontWeight: 700 }}>
            Filtros de búsqueda
          </Typography>
          <Box
            sx={{
              mt: 1.5,
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
              color="primary"
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
        </Paper>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ px: { xs: 1.5, sm: 2 }, pt: 2, pb: 1.5 }}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
              <Box
                aria-hidden
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1.5,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <DescriptionOutlinedIcon fontSize="small" />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
                  Listado de documentos
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                  {new Intl.NumberFormat('es-EC').format(total)} resultado
                  {total === 1 ? '' : 's'} · datos del servidor según filtros y permisos
                </Typography>
              </Box>
            </Stack>
          </Box>

          {loading && (
            <LinearProgress
              color="primary"
              sx={{ height: 3 }}
              aria-label="Cargando documentos"
            />
          )}

          <TableContainer
            sx={{
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
                            color={estadoChipColor(row.estado)}
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
                            color="primary"
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

          <Box
            sx={{
              px: { xs: 1.5, sm: 2 },
              py: 1.5,
              borderTop: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
              Página <strong>{page}</strong>
              {' · '}Mostrando {rows.length === 0 ? 0 : (page - 1) * pageSize + 1}–
              {(page - 1) * pageSize + rows.length} de {total}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              sx={{ justifyContent: { xs: 'center', sm: 'flex-end' } }}
            >
              <Button
                variant="outlined"
                color="primary"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outlined"
                color="primary"
                disabled={page * pageSize >= total || loading || total === 0}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </Stack>
          </Box>
        </Paper>

      </Box>

      <Dialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          createCodigoUsuarioRef.current = false;
          createForm.reset({ ...createFormDefaults });
        }}
        fullWidth
        maxWidth="sm"
        fullScreen={isXs}
      >
        <DialogTitle>Registrar documento</DialogTitle>
        <Box component="form" onSubmit={onCreate} noValidate>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'flex-start' } }}>
              <TextField
                label="Código"
                sx={{ flex: 1, minWidth: 0 }}
                {...(() => {
                  const r = createForm.register('codigo');
                  return {
                    ...r,
                    onChange: (e: ChangeEvent<HTMLInputElement>) => {
                      createCodigoUsuarioRef.current = true;
                      void r.onChange(e);
                    },
                  };
                })()}
                error={!!createForm.formState.errors.codigo}
                helperText={
                  createForm.formState.errors.codigo?.message ??
                  'Vista previa del correlativo: si no modifica este campo, el servidor asignará el siguiente código al guardar.'
                }
              />
              <Button
                type="button"
                variant="outlined"
                disabled={createCodigoBusy}
                onClick={() => {
                  const f = createForm.getValues('fechaDocumento');
                  void prefetchCreateCodigo(f || new Date().toISOString().slice(0, 10), true);
                }}
                sx={{ mt: { xs: 0, sm: 0.5 }, flexShrink: 0 }}
              >
                {createCodigoBusy ? 'Obteniendo…' : 'Correlativo servidor'}
              </Button>
            </Stack>
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
            <Button
              onClick={() => {
                setCreateOpen(false);
                createCodigoUsuarioRef.current = false;
                createForm.reset({ ...createFormDefaults });
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="contained">
              Guardar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}

