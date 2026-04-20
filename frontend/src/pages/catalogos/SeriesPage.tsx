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
  FormControlLabel,
  Paper,
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
import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/useAuth';

export type SerieRow = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

const createSchema = z.object({
  codigo: z.string().min(2, 'Mínimo 2 caracteres').max(32),
  nombre: z.string().min(2).max(200),
  descripcion: z.string().max(500).optional(),
});
type CreateForm = z.infer<typeof createSchema>;

const editSchema = z.object({
  nombre: z.string().min(2).max(200),
  descripcion: z.string().max(500).optional(),
  activo: z.boolean(),
});
type EditForm = z.infer<typeof editSchema>;

export function SeriesPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles.some((r) => r.codigo === 'ADMIN') ?? false;

  const [rows, setRows] = useState<SerieRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incluirInactivos, setIncluirInactivos] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SerieRow | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await apiClient.get<SerieRow[]>('/series', {
        params: { incluirInactivos: incluirInactivos ? 'true' : 'false' },
      });
      setRows(data);
    } catch {
      setError('No se pudieron cargar las series.');
    } finally {
      setLoading(false);
    }
  }, [incluirInactivos]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sincroniza lista con incluirInactivos
    void load();
  }, [load]);

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { codigo: '', nombre: '', descripcion: '' },
  });
  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { nombre: '', descripcion: '', activo: true },
  });

  const openEdit = (row: SerieRow) => {
    setEditTarget(row);
    editForm.reset({
      nombre: row.nombre,
      descripcion: row.descripcion ?? '',
      activo: row.activo,
    });
  };

  const onCreate = createForm.handleSubmit(async (data) => {
    setError(null);
    try {
      await apiClient.post('/series', {
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
      await apiClient.patch(`/series/${editTarget.id}`, {
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
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Series
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Catálogo del cuadro de clasificación. Alta y edición requieren rol{' '}
        <strong>ADMIN</strong>.
      </Typography>

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
        {isAdmin && (
          <Button variant="contained" onClick={() => setCreateOpen(true)}>
            Nueva serie
          </Button>
        )}
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
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
                <TableCell colSpan={isAdmin ? 5 : 4}>Cargando…</TableCell>
              </TableRow>
            )}
            {!loading &&
              rows.map((row) => (
                <TableRow key={row.id} hover>
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
                <TableCell colSpan={isAdmin ? 5 : 4}>No hay registros.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Nueva serie</DialogTitle>
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
              label="Nombre"
              {...createForm.register('nombre')}
              error={!!createForm.formState.errors.nombre}
              helperText={createForm.formState.errors.nombre?.message}
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

      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Editar {editTarget?.codigo}</DialogTitle>
        <Box component="form" onSubmit={onEdit} noValidate>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Nombre"
              {...editForm.register('nombre')}
              error={!!editForm.formState.errors.nombre}
              helperText={editForm.formState.errors.nombre?.message}
              required
            />
            <TextField
              label="Descripción"
              {...editForm.register('descripcion')}
              multiline
              minRows={2}
            />
            <Controller
              name="activo"
              control={editForm.control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={field.value}
                      onChange={(_, c) => field.onChange(c)}
                    />
                  }
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
    </Box>
  );
}

