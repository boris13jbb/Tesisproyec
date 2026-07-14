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
  InputLabel,
  MenuItem,
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
import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { ActivoChip } from '../../components/ActivoChip';
import { EmptyState } from '../../components/EmptyState';
import { FilterPanel } from '../../components/FilterPanel';
import { ListPanel } from '../../components/ListPanel';
import { listTableContainerSx } from '../../components/listSurfaces';
import { PageHeader } from '../../components/PageHeader';

type DepOption = {
  id: string;
  codigo: string;
  nombre: string;
};

export type CargoRow = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  dependenciaId: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  dependencia: DepOption | null;
};

const createSchema = z.object({
  codigo: z.string().min(2, 'Mínimo 2 caracteres').max(32),
  nombre: z.string().min(2).max(200),
  descripcion: z.string().max(500).optional(),
  dependenciaId: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;

const editSchema = z.object({
  nombre: z.string().min(2).max(200),
  descripcion: z.string().max(500).optional(),
  activo: z.boolean(),
  dependenciaId: z.string().optional(),
});

type EditForm = z.infer<typeof editSchema>;

export function CargosPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles.some((r) => r.codigo === 'ADMIN') ?? false;

  const [rows, setRows] = useState<CargoRow[]>([]);
  const [deps, setDeps] = useState<DepOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incluirInactivos, setIncluirInactivos] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CargoRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<DepOption[]>('/dependencias')
      .then((res) => {
        if (!cancelled) {
          setDeps(res.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDeps([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await apiClient.get<CargoRow[]>('/cargos', {
        params: { incluirInactivos: incluirInactivos ? 'true' : 'false' },
      });
      setRows(data);
    } catch {
      setError('No se pudieron cargar los cargos.');
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
    defaultValues: {
      codigo: '',
      nombre: '',
      descripcion: '',
      dependenciaId: '',
    },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
      activo: true,
      dependenciaId: '',
    },
  });

  const openEdit = (row: CargoRow) => {
    setEditTarget(row);
    editForm.reset({
      nombre: row.nombre,
      descripcion: row.descripcion ?? '',
      activo: row.activo,
      dependenciaId: row.dependenciaId ?? '',
    });
  };

  const onCreate = createForm.handleSubmit(async (data) => {
    setError(null);
    try {
      await apiClient.post('/cargos', {
        codigo: data.codigo,
        nombre: data.nombre,
        descripcion: data.descripcion || undefined,
        dependenciaId: data.dependenciaId || undefined,
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
    if (!editTarget) {
      return;
    }
    setError(null);
    try {
      await apiClient.patch(`/cargos/${editTarget.id}`, {
        nombre: data.nombre,
        descripcion: data.descripcion === '' ? null : data.descripcion,
        activo: data.activo,
        dependenciaId:
          data.dependenciaId === '' ? null : data.dependenciaId,
      });
      setEditTarget(null);
      await load();
    } catch {
      setError('No se pudo guardar el cambio.');
    }
  });

  const colCount = isAdmin ? 6 : 5;

  return (
    <>
      <Box sx={{ width: '100%', pb: { xs: 4, md: 5 } }}>
        <PageHeader
          title="Cargos"
          description={
            <>
              Puestos o cargos; opcionalmente asociados a una dependencia. Alta y edición con rol{' '}
              <strong>ADMIN</strong>.
            </>
          }
          actions={
            isAdmin ? (
              <Button variant="contained" color="secondary" onClick={() => setCreateOpen(true)}>
                Nuevo cargo
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
            label="Incluir inactivos"
          />
        </FilterPanel>

        <ListPanel
          badge="C"
          title="Listado de cargos"
          subtitle={`${rows.length} registro${rows.length === 1 ? '' : 's'} según filtros`}
          loading={loading}
        >
          <TableContainer sx={{ ...listTableContainerSx, overflowX: 'auto' }}>
            <Table size="small" aria-label="Cargos">
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    Dependencia
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    Descripción
                  </TableCell>
                  <TableCell>Estado</TableCell>
                  {isAdmin && <TableCell align="right">Acciones</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={colCount}>Cargando…</TableCell>
                  </TableRow>
                )}
                {!loading &&
                  rows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{row.codigo}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{row.nombre}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        {row.dependencia
                          ? `${row.dependencia.codigo} — ${row.dependencia.nombre}`
                          : '—'}
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        {row.descripcion ?? '—'}
                      </TableCell>
                      <TableCell>
                        <ActivoChip activo={row.activo} />
                      </TableCell>
                      {isAdmin && (
                        <TableCell align="right">
                          <Button size="small" variant="outlined" onClick={() => openEdit(row)}>
                            Editar
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={colCount} sx={{ py: 0 }}>
                      <EmptyState dense title="No hay cargos en este listado." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </ListPanel>
      </Box>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Nuevo cargo</DialogTitle>
        <Box component="form" onSubmit={onCreate} noValidate>
          <DialogContent
            sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}
          >
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
            <Controller
              name="dependenciaId"
              control={createForm.control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel id="dep-create-label">
                    Dependencia (opcional)
                  </InputLabel>
                  <Select
                    {...field}
                    labelId="dep-create-label"
                    label="Dependencia (opcional)"
                    value={field.value || ''}
                  >
                    <MenuItem value="">
                      <em>Sin asignar</em>
                    </MenuItem>
                    {deps.map((d) => (
                      <MenuItem key={d.id} value={d.id}>
                        {d.codigo} — {d.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
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

      <Dialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Editar {editTarget?.codigo}</DialogTitle>
        <Box component="form" onSubmit={onEdit} noValidate>
          <DialogContent
            sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}
          >
            <TextField
              label="Nombre"
              {...editForm.register('nombre')}
              error={!!editForm.formState.errors.nombre}
              helperText={editForm.formState.errors.nombre?.message}
              required
            />
            <Controller
              name="dependenciaId"
              control={editForm.control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel id="dep-edit-label">
                    Dependencia (opcional)
                  </InputLabel>
                  <Select
                    {...field}
                    labelId="dep-edit-label"
                    label="Dependencia (opcional)"
                    value={field.value || ''}
                  >
                    <MenuItem value="">
                      <em>Sin asignar</em>
                    </MenuItem>
                    {deps.map((d) => (
                      <MenuItem key={d.id} value={d.id}>
                        {d.codigo} — {d.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
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
                  label="Activo"
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
