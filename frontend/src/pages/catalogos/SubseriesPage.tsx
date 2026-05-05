import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
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
} from '@mui/material';
import { isAxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';

type SerieOption = { id: string; codigo: string; nombre: string };

export type SubserieRow = {
  id: string;
  serieId: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  serie: SerieOption;
};

const createSchema = z.object({
  serieId: z.string().min(1, 'Serie requerida'),
  codigo: z.string().min(2, 'Mínimo 2 caracteres').max(32),
  nombre: z.string().min(2).max(200),
  descripcion: z.string().max(500).optional(),
});
type CreateForm = z.infer<typeof createSchema>;

const editSchema = z.object({
  serieId: z.string().min(1, 'Serie requerida'),
  nombre: z.string().min(2).max(200),
  descripcion: z.string().max(500).optional(),
  activo: z.boolean(),
});
type EditForm = z.infer<typeof editSchema>;

export function SubseriesPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles.some((r) => r.codigo === 'ADMIN') ?? false;

  const [series, setSeries] = useState<SerieOption[]>([]);
  const [rows, setRows] = useState<SubserieRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incluirInactivos, setIncluirInactivos] = useState(false);
  const [serieFilter, setSerieFilter] = useState<string>('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SubserieRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<SerieOption[]>('/series')
      .then((res) => {
        if (!cancelled) setSeries(res.data);
      })
      .catch(() => {
        if (!cancelled) setSeries([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const params = useMemo(() => {
    const p: Record<string, string> = {
      incluirInactivos: incluirInactivos ? 'true' : 'false',
    };
    if (serieFilter) p.serieId = serieFilter;
    return p;
  }, [incluirInactivos, serieFilter]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await apiClient.get<SubserieRow[]>('/subseries', {
        params,
      });
      setRows(data);
    } catch {
      setError('No se pudieron cargar las subseries.');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sincroniza lista con filtros
    void load();
  }, [load]);

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { serieId: '', codigo: '', nombre: '', descripcion: '' },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { serieId: '', nombre: '', descripcion: '', activo: true },
  });

  const openEdit = (row: SubserieRow) => {
    setEditTarget(row);
    editForm.reset({
      serieId: row.serieId,
      nombre: row.nombre,
      descripcion: row.descripcion ?? '',
      activo: row.activo,
    });
  };

  const onCreate = createForm.handleSubmit(async (data) => {
    setError(null);
    try {
      await apiClient.post('/subseries', {
        serieId: data.serieId,
        codigo: data.codigo,
        nombre: data.nombre,
        descripcion: data.descripcion || undefined,
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

  const onEdit = editForm.handleSubmit(async (data) => {
    if (!editTarget) return;
    setError(null);
    try {
      await apiClient.patch(`/subseries/${editTarget.id}`, {
        serieId: data.serieId,
        nombre: data.nombre,
        descripcion: data.descripcion === '' ? null : data.descripcion,
        activo: data.activo,
      });
      setEditTarget(null);
      await load();
    } catch {
      setError('No se pudo guardar el cambio.');
    }
  });

  return (
    <>
      <Container maxWidth="lg">
        <PageHeader
          title="Subseries"
          description={
            <>
              Catálogo jerárquico bajo series. Alta y edición requieren rol <strong>ADMIN</strong>.
            </>
          }
        />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={incluirInactivos}
              onChange={(_, c) => setIncluirInactivos(c)}
            />
          }
          label="Incluir inactivas"
        />
        <FormControl sx={{ minWidth: 260 }}>
          <InputLabel id="serie-filter">Serie</InputLabel>
          <Select
            labelId="serie-filter"
            label="Serie"
            value={serieFilter}
            onChange={(e) => setSerieFilter(String(e.target.value))}
          >
            <MenuItem value="">
              <em>Todas</em>
            </MenuItem>
            {series.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.codigo} — {s.nombre}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {isAdmin && (
          <Button variant="contained" onClick={() => setCreateOpen(true)}>
            Nueva subserie
          </Button>
        )}
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Serie</TableCell>
              <TableCell>Código</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                Descripción
              </TableCell>
              <TableCell>Activa</TableCell>
              {isAdmin && <TableCell align="right">Acciones</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5}>Cargando…</TableCell>
              </TableRow>
            )}
            {!loading &&
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    {row.serie.codigo} — {row.serie.nombre}
                  </TableCell>
                  <TableCell>{row.codigo}</TableCell>
                  <TableCell>{row.nombre}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    {row.descripcion ?? '—'}
                  </TableCell>
                  <TableCell>{row.activo ? 'Sí' : 'No'}</TableCell>
                  {isAdmin && (
                    <TableCell align="right">
                      <Button size="small" onClick={() => openEdit(row)}>
                        Editar
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} sx={{ py: 0 }}>
                  <EmptyState dense title="No hay subseries en este listado." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      </Container>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Nueva subserie</DialogTitle>
        <Box component="form" onSubmit={onCreate} noValidate>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Controller
              name="serieId"
              control={createForm.control}
              render={({ field }) => (
                <FormControl fullWidth error={!!createForm.formState.errors.serieId}>
                  <InputLabel id="serie-create">Serie</InputLabel>
                  <Select {...field} labelId="serie-create" label="Serie" value={field.value || ''}>
                    {series.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.codigo} — {s.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
            <TextField
              label="Código"
              {...createForm.register('codigo')}
              error={!!createForm.formState.errors.codigo}
              helperText={createForm.formState.errors.codigo?.message}
              required
            />
            <TextField
              label="Nombre"
              {...createForm.register('nombre')}
              error={!!createForm.formState.errors.nombre}
              helperText={createForm.formState.errors.nombre?.message}
              required
            />
            <TextField label="Descripción" {...createForm.register('descripcion')} multiline minRows={2} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Guardar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Editar {editTarget?.codigo}</DialogTitle>
        <Box component="form" onSubmit={onEdit} noValidate>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Controller
              name="serieId"
              control={editForm.control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel id="serie-edit">Serie</InputLabel>
                  <Select {...field} labelId="serie-edit" label="Serie" value={field.value || ''}>
                    {series.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.codigo} — {s.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
            <TextField
              label="Nombre"
              {...editForm.register('nombre')}
              error={!!editForm.formState.errors.nombre}
              helperText={editForm.formState.errors.nombre?.message}
              required
            />
            <TextField label="Descripción" {...editForm.register('descripcion')} multiline minRows={2} />
            <Controller
              name="activo"
              control={editForm.control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox checked={field.value} onChange={(_, c) => field.onChange(c)} />}
                  label="Activa"
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Guardar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}

