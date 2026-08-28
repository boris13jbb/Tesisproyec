import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Link,
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
import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link as RouterLink } from 'react-router-dom';
import { z } from 'zod';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { ActivoChip } from '../../components/ActivoChip';
import { EmptyState } from '../../components/EmptyState';
import { FilterPanel } from '../../components/FilterPanel';
import { ListPanel } from '../../components/ListPanel';
import { listTableContainerSx } from '../../components/listSurfaces';
import { PageHeader } from '../../components/PageHeader';

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
    <>
      <Box sx={{ width: '100%', pb: { xs: 4, md: 5 } }}>
        <PageHeader
          title="Series"
          description={
            <>
              Catálogo del cuadro de clasificación. Alta y edición requieren rol <strong>ADMIN</strong>
              . Relacionado:{' '}
              <Link component={RouterLink} to="/catalogos/subseries" underline="hover">
                Subseries
              </Link>
              {' · '}
              <Link component={RouterLink} to="/clasificacion" underline="hover">
                Clasificación
              </Link>
              .
            </>
          }
          actions={
            isAdmin ? (
              <Button variant="contained" color="secondary" onClick={() => setCreateOpen(true)}>
                Nueva serie
              </Button>
            ) : undefined
          }
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <FilterPanel title="Filtros" description="Controle la visibilidad de registros inactivos.">
          <FormControlLabel
            control={
              <Checkbox
                checked={incluirInactivos}
                onChange={(_, c) => setIncluirInactivos(c)}
                size="small"
              />
            }
            label="Incluir inactivas"
          />
        </FilterPanel>

        <ListPanel
          badge={<FolderOpenOutlinedIcon fontSize="small" />}
          title="Listado de series"
          subtitle={`${rows.length} registro${rows.length === 1 ? '' : 's'} según filtros`}
          loading={loading}
        >
          <TableContainer sx={{ ...listTableContainerSx, overflowX: 'auto' }}>
            <Table size="small" aria-label="Series">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 800 }}>Código</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Nombre</TableCell>
                  <TableCell sx={{ fontWeight: 800, display: { xs: 'none', md: 'table-cell' } }}>
                    Descripción
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Estado</TableCell>
                  {isAdmin && (
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      Acciones
                    </TableCell>
                  )}
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
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={row.codigo}
                          sx={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <FolderOpenOutlinedIcon
                            sx={{ fontSize: 18, color: 'secondary.main', flexShrink: 0 }}
                            aria-hidden
                          />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {row.nombre}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        {row.descripcion ?? '—'}
                      </TableCell>
                      <TableCell>
                        <ActivoChip activo={row.activo} />
                      </TableCell>
                      {isAdmin && (
                        <TableCell align="right">
                          <Button size="small" variant="outlined" color="secondary" onClick={() => openEdit(row)}>
                            Editar
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 5 : 4} sx={{ py: 0 }}>
                      <EmptyState dense title="No hay series en este listado." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </ListPanel>
      </Box>

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
            <Button type="submit" variant="contained" color="secondary">
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
            <Button type="submit" variant="contained" color="secondary">
              Guardar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}

