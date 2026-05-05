import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Checkbox,
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
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
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

type DocumentoRow = {
  id: string;
  codigo: string;
  asunto: string;
  descripcion: string | null;
  fechaDocumento: string;
  estado: string;
  activo: boolean;
  tipoDocumental: TipoOption;
  subserie: {
    id: string;
    codigo: string;
    nombre: string;
    serie: SerieOption;
  };
  createdBy: { id: string; email: string };
};

type DocumentosPaged = {
  page: number;
  pageSize: number;
  total: number;
  items: DocumentoRow[];
};

const createSchema = z.object({
  codigo: z.string().min(2).max(64),
  asunto: z.string().min(3).max(250),
  descripcion: z.string().max(1000).optional(),
  fechaDocumento: z.string().min(10, 'Fecha requerida'),
  tipoDocumentalId: z.string().min(1, 'Tipo requerido'),
  subserieId: z.string().min(1, 'Subserie requerida'),
});

type CreateForm = z.infer<typeof createSchema>;

export function DocumentosPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles.some((r) => r.codigo === 'ADMIN') ?? false;
  const navigate = useNavigate();

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

  const [createOpen, setCreateOpen] = useState(false);

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
          incluirInactivos: incluirInactivos ? 'true' : 'false',
          q: q || undefined,
          estado: estado || undefined,
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
    estado,
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
      estado: estado || undefined,
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
    estado,
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

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      codigo: '',
      asunto: '',
      descripcion: '',
      fechaDocumento: new Date().toISOString().slice(0, 10),
      tipoDocumentalId: '',
      subserieId: '',
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

  return (
    <>
      <Container maxWidth="lg">
        <PageHeader
          title="Documentos"
          description={
            <>
              Registro documental (MVP). Creación/edición está restringida a{' '}
              <strong>ADMIN</strong> por ahora.
            </>
          }
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
            Filtros y exportación
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={incluirInactivos}
              onChange={(_, c) => setIncluirInactivos(c)}
            />
          }
          label="Incluir inactivos"
        />
        <TextField
          label="Buscar (código/asunto/descr.)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          size="small"
          sx={{ minWidth: 260 }}
        />
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
        <TextField
          label="Estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          size="small"
          sx={{ minWidth: 140 }}
        />
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="tipo-filter-label">Tipo documental</InputLabel>
          <Select
            labelId="tipo-filter-label"
            label="Tipo documental"
            value={tipoDocumentalId}
            onChange={(e) => setTipoDocumentalId(e.target.value)}
          >
            <MenuItem value="">(Todos)</MenuItem>
            {tipos.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.codigo} — {t.nombre}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180 }}>
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
            <MenuItem value="">(Todas)</MenuItem>
            {series.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.codigo} — {s.nombre}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="subserie-filter-label">Subserie</InputLabel>
          <Select
            labelId="subserie-filter-label"
            label="Subserie"
            value={subserieId}
            onChange={(e) => setSubserieId(e.target.value)}
          >
            <MenuItem value="">(Todas)</MenuItem>
            {subseriesFiltered.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {subserieLabel.get(s.id)}
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
        />
        <TextField
          label="Hasta"
          type="date"
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
          value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
        />
        <Button variant="outlined" onClick={onApplyFilters}>
          Aplicar
        </Button>
        <Button variant="text" onClick={onClearFilters}>
          Limpiar
        </Button>
        {isAdmin && (
          <>
            <Button variant="outlined" onClick={() => void onExportExcel()}>
              Exportar Excel
            </Button>
            <Button variant="outlined" onClick={() => void onExportPdf()}>
              Exportar PDF
            </Button>
          </>
        )}
        {isAdmin && (
          <Button variant="contained" onClick={() => setCreateOpen(true)}>
            Registrar documento
          </Button>
        )}
          </Box>
        </Paper>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Resultados: <strong>{total}</strong> — Página <strong>{page}</strong>
      </Typography>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell
                onClick={() => toggleSort('codigo')}
                sx={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Código{sortLabel('codigo')}
              </TableCell>
              <TableCell>Asunto</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                Tipo
              </TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                Clasificación
              </TableCell>
              <TableCell
                onClick={() => toggleSort('fechaDocumento')}
                sx={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Fecha{sortLabel('fechaDocumento')}
              </TableCell>
              <TableCell
                onClick={() => toggleSort('estado')}
                sx={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Estado{sortLabel('estado')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6}>Cargando…</TableCell>
              </TableRow>
            )}
            {!loading &&
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  onClick={() => navigate(`/documentos/${row.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{row.codigo}</TableCell>
                  <TableCell>{row.asunto}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    {row.tipoDocumental.codigo}
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    {row.subserie.serie.codigo} / {row.subserie.codigo}
                  </TableCell>
                  <TableCell>
                    {new Date(row.fechaDocumento).toISOString().slice(0, 10)}
                  </TableCell>
                  <TableCell>{row.estado}</TableCell>
                </TableRow>
              ))}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} sx={{ py: 0 }}>
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

