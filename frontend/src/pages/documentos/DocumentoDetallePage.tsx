import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { isAxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/useAuth';

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
  tipoDocumentalId: string;
  subserieId: string;
  tipoDocumental: TipoOption;
  subserie: {
    id: string;
    codigo: string;
    nombre: string;
    serie: SerieOption;
  };
  createdBy: { id: string; email: string };
  createdAt: string;
  updatedAt: string;
};

type DocumentoEventoRow = {
  id: string;
  tipo: string;
  cambiosJson: string | null;
  createdAt: string;
  createdBy: { id: string; email: string };
};

type DocumentoArchivoRow = {
  id: string;
  version: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  createdAt: string;
  createdBy: { id: string; email: string };
};

type DocumentoArchivoEventoRow = {
  id: string;
  tipo: string;
  metaJson: string | null;
  createdAt: string;
  createdBy: { id: string; email: string };
};

const editSchema = z.object({
  asunto: z.string().min(3).max(250),
  descripcion: z.string().max(1000).optional(),
  fechaDocumento: z.string().min(10, 'Fecha requerida'),
  estado: z.string().min(1).max(32),
  activo: z.boolean(),
  tipoDocumentalId: z.string().min(1, 'Tipo requerido'),
  subserieId: z.string().min(1, 'Subserie requerida'),
});
type EditForm = z.infer<typeof editSchema>;

function formatDateOnly(isoOrDate: string) {
  return new Date(isoOrDate).toISOString().slice(0, 10);
}

export function DocumentoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.roles.some((r) => r.codigo === 'ADMIN') ?? false;

  const [tipos, setTipos] = useState<TipoOption[]>([]);
  const [subseries, setSubseries] = useState<SubserieOption[]>([]);

  const [doc, setDoc] = useState<DocumentoRow | null>(null);
  const [eventos, setEventos] = useState<DocumentoEventoRow[]>([]);
  const [archivos, setArchivos] = useState<DocumentoArchivoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [archivoEventosOpen, setArchivoEventosOpen] = useState(false);
  const [archivoEventosTitle, setArchivoEventosTitle] = useState<string>('');
  const [archivoEventos, setArchivoEventos] = useState<DocumentoArchivoEventoRow[]>([]);

  const subserieLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of subseries) {
      map.set(s.id, `${s.serie.codigo} / ${s.codigo} — ${s.nombre}`);
    }
    return map;
  }, [subseries]);

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      asunto: '',
      descripcion: '',
      fechaDocumento: new Date().toISOString().slice(0, 10),
      estado: 'REGISTRADO',
      activo: true,
      tipoDocumentalId: '',
      subserieId: '',
    },
  });

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    setLoading(true);
    try {
      const [docRes, evRes, arRes] = await Promise.all([
        apiClient.get<DocumentoRow>(`/documentos/${id}`),
        apiClient.get<DocumentoEventoRow[]>(`/documentos/${id}/eventos`),
        apiClient.get<DocumentoArchivoRow[]>(`/documentos/${id}/archivos`),
      ]);
      setDoc(docRes.data);
      setEventos(evRes.data);
      setArchivos(arRes.data);
    } catch {
      setError('No se pudo cargar el documento.');
      setDoc(null);
      setEventos([]);
      setArchivos([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sincroniza vista con :id
    void load();
  }, [load]);

  const openEdit = () => {
    if (!doc) return;
    editForm.reset({
      asunto: doc.asunto,
      descripcion: doc.descripcion ?? '',
      fechaDocumento: formatDateOnly(doc.fechaDocumento),
      estado: doc.estado,
      activo: doc.activo,
      tipoDocumentalId: doc.tipoDocumental.id,
      subserieId: doc.subserie.id,
    });
    setEditOpen(true);
  };

  const onEdit = editForm.handleSubmit(async (data) => {
    if (!id) return;
    setError(null);
    try {
      await apiClient.patch(`/documentos/${id}`, {
        asunto: data.asunto,
        descripcion: data.descripcion || null,
        fechaDocumento: new Date(data.fechaDocumento).toISOString(),
        estado: data.estado,
        activo: data.activo,
        tipoDocumentalId: data.tipoDocumentalId,
        subserieId: data.subserieId,
      });
      setEditOpen(false);
      await load();
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data) {
        const d = err.response.data as { message?: string | string[] };
        const m = d.message;
        setError(Array.isArray(m) ? m.join(' ') : (m ?? 'No se pudo actualizar.'));
      } else {
        setError('No se pudo actualizar.');
      }
    }
  });

  const onUpload = async (file: File) => {
    if (!id) return;
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await apiClient.post(`/documentos/${id}/archivos`, form);
      await load();
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data) {
        const d = err.response.data as { message?: string | string[] };
        const m = d.message;
        setError(Array.isArray(m) ? m.join(' ') : (m ?? 'No se pudo subir el archivo.'));
      } else {
        setError('No se pudo subir el archivo.');
      }
    } finally {
      setUploading(false);
    }
  };

  const onDownload = async (archivo: DocumentoArchivoRow) => {
    if (!id) return;
    setError(null);
    try {
      const res = await apiClient.get(
        `/documentos/${id}/archivos/${archivo.id}/download`,
        { responseType: 'blob' },
      );
      const blob = new Blob([res.data], { type: archivo.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = archivo.originalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('No se pudo descargar el archivo.');
    }
  };

  const onDeleteArchivo = async (archivo: DocumentoArchivoRow) => {
    if (!id) return;
    // confirmación simple (evita borrar accidentalmente)
    const ok = window.confirm(
      `¿Eliminar (lógicamente) el archivo v${archivo.version} "${archivo.originalName}"?`,
    );
    if (!ok) return;
    setError(null);
    try {
      await apiClient.delete(`/documentos/${id}/archivos/${archivo.id}`);
      await load();
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data) {
        const d = err.response.data as { message?: string | string[] };
        const m = d.message;
        setError(Array.isArray(m) ? m.join(' ') : (m ?? 'No se pudo eliminar el archivo.'));
      } else {
        setError('No se pudo eliminar el archivo.');
      }
    }
  };

  const openArchivoEventos = async (archivo: DocumentoArchivoRow) => {
    if (!id) return;
    setError(null);
    try {
      const { data } = await apiClient.get<DocumentoArchivoEventoRow[]>(
        `/documentos/${id}/archivos/${archivo.id}/eventos`,
      );
      setArchivoEventosTitle(`v${archivo.version} — ${archivo.originalName}`);
      setArchivoEventos(data);
      setArchivoEventosOpen(true);
    } catch {
      setError('No se pudo cargar el historial del archivo.');
    }
  };

  if (!id) {
    return (
      <Alert severity="error">
        Falta el parámetro <code>id</code> en la URL.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 1, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Documento
        </Typography>
        {doc && (
          <Chip
            size="small"
            color={doc.activo ? 'success' : 'default'}
            label={doc.activo ? 'Activo' : 'Inactivo'}
          />
        )}
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        <Button component={RouterLink} to="/documentos" size="small">
          Volver al listado
        </Button>
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && <Typography>Cargando…</Typography>}

      {!loading && !doc && (
        <Alert severity="warning">
          No hay información para mostrar.{' '}
          <Button onClick={() => navigate('/documentos')} size="small">
            Ir al listado
          </Button>
        </Alert>
      )}

      {!loading && doc && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
                justifyContent: 'space-between',
                alignItems: { xs: 'stretch', sm: 'center' },
              }}
            >
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Código
                </Typography>
                <Typography variant="h6">{doc.codigo}</Typography>
              </Box>
              {isAdmin && (
                <Button variant="contained" onClick={openEdit}>
                  Editar
                </Button>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 2,
                '& > *': { flex: 1 },
              }}
            >
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Asunto
                </Typography>
                <Typography>{doc.asunto}</Typography>
              </Box>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Fecha del documento
                </Typography>
                <Typography>{formatDateOnly(doc.fechaDocumento)}</Typography>
              </Box>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Estado
                </Typography>
                <Typography>{doc.estado}</Typography>
              </Box>
            </Box>

            <Box
              sx={{
                mt: 2,
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 2,
                '& > *': { flex: 1 },
              }}
            >
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Tipo documental
                </Typography>
                <Typography>
                  {doc.tipoDocumental.codigo} — {doc.tipoDocumental.nombre}
                </Typography>
              </Box>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Clasificación
                </Typography>
                <Typography>
                  {doc.subserie.serie.codigo} / {doc.subserie.codigo} —{' '}
                  {doc.subserie.nombre}
                </Typography>
              </Box>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Registrado por
                </Typography>
                <Typography>{doc.createdBy.email}</Typography>
              </Box>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography variant="overline" color="text.secondary">
                Descripción
              </Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                {doc.descripcion || '—'}
              </Typography>
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Archivos
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Adjuntos almacenados en <code>storage/</code>.
            </Typography>

            {isAdmin && (
              <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <Button variant="contained" component="label" disabled={uploading}>
                  {uploading ? 'Subiendo…' : 'Subir archivo'}
                  <input
                    type="file"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void onUpload(f);
                      e.currentTarget.value = '';
                    }}
                  />
                </Button>
                <Typography variant="body2" color="text.secondary">
                  Permitidos: PDF, JPG/PNG/WEBP, DOCX, XLSX. Máx 10MB.
                </Typography>
              </Box>
            )}

            {archivos.length === 0 ? (
              <Typography variant="body2">Sin adjuntos.</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {archivos.map((a) => (
                  <Paper key={a.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: 1,
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', sm: 'center' },
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontWeight: 600 }}>
                          v{a.version} — {a.originalName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatDateOnly(a.createdAt)} — {a.createdBy.email} —{' '}
                          {(a.sizeBytes / 1024).toFixed(1)} KB
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button onClick={() => void openArchivoEventos(a)}>
                          Historial
                        </Button>
                        <Button onClick={() => void onDownload(a)}>Descargar</Button>
                        {isAdmin && (
                          <Button
                            color="error"
                            onClick={() => void onDeleteArchivo(a)}
                          >
                            Eliminar
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Historial
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Trazabilidad por creación y actualizaciones.
            </Typography>

            {eventos.length === 0 ? (
              <Typography variant="body2">Sin eventos.</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {eventos.map((ev) => (
                  <Paper key={ev.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: 1,
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', sm: 'center' },
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip size="small" label={ev.tipo} />
                        <Typography variant="body2" color="text.secondary">
                          {formatDateOnly(ev.createdAt)} — {ev.createdBy.email}
                        </Typography>
                      </Box>
                    </Box>
                    {ev.cambiosJson && (
                      <Box
                        component="pre"
                        sx={{
                          mt: 1,
                          mb: 0,
                          overflow: 'auto',
                          bgcolor: 'grey.50',
                          p: 1,
                          borderRadius: 1,
                          fontSize: 12,
                        }}
                      >
                        {(() => {
                          try {
                            return JSON.stringify(JSON.parse(ev.cambiosJson), null, 2);
                          } catch {
                            return ev.cambiosJson;
                          }
                        })()}
                      </Box>
                    )}
                  </Paper>
                ))}
              </Box>
            )}
          </Paper>
        </Box>
      )}

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Editar documento</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Asunto"
              fullWidth
              required
              error={!!editForm.formState.errors.asunto}
              helperText={editForm.formState.errors.asunto?.message}
              {...editForm.register('asunto')}
            />

            <TextField
              label="Descripción"
              fullWidth
              multiline
              minRows={2}
              error={!!editForm.formState.errors.descripcion}
              helperText={editForm.formState.errors.descripcion?.message}
              {...editForm.register('descripcion')}
            />

            <TextField
              label="Fecha del documento"
              type="date"
              fullWidth
              required
              slotProps={{ inputLabel: { shrink: true } }}
              error={!!editForm.formState.errors.fechaDocumento}
              helperText={editForm.formState.errors.fechaDocumento?.message}
              {...editForm.register('fechaDocumento')}
            />

            <TextField
              label="Estado"
              fullWidth
              required
              error={!!editForm.formState.errors.estado}
              helperText={editForm.formState.errors.estado?.message}
              {...editForm.register('estado')}
            />

            <Controller
              name="tipoDocumentalId"
              control={editForm.control}
              render={({ field }) => (
                <FormControl fullWidth required>
                  <InputLabel id="tipo-doc-label">Tipo documental</InputLabel>
                  <Select
                    labelId="tipo-doc-label"
                    label="Tipo documental"
                    value={field.value}
                    onChange={field.onChange}
                    error={!!editForm.formState.errors.tipoDocumentalId}
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
              control={editForm.control}
              render={({ field }) => (
                <FormControl fullWidth required>
                  <InputLabel id="subserie-label">Subserie</InputLabel>
                  <Select
                    labelId="subserie-label"
                    label="Subserie"
                    value={field.value}
                    onChange={field.onChange}
                    error={!!editForm.formState.errors.subserieId}
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
              name="activo"
              control={editForm.control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel id="activo-label">Activo</InputLabel>
                  <Select
                    labelId="activo-label"
                    label="Activo"
                    value={field.value ? 'true' : 'false'}
                    onChange={(e) => field.onChange(e.target.value === 'true')}
                  >
                    <MenuItem value="true">Sí</MenuItem>
                    <MenuItem value="false">No</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void onEdit()}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={archivoEventosOpen}
        onClose={() => setArchivoEventosOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Historial del archivo — {archivoEventosTitle}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {archivoEventos.length === 0 ? (
            <Typography variant="body2">Sin eventos.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {archivoEventos.map((ev) => (
                <Paper key={ev.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      gap: 1,
                      justifyContent: 'space-between',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip size="small" label={ev.tipo} />
                      <Typography variant="body2" color="text.secondary">
                        {formatDateOnly(ev.createdAt)} — {ev.createdBy.email}
                      </Typography>
                    </Box>
                  </Box>
                  {ev.metaJson && (
                    <Box
                      component="pre"
                      sx={{
                        mt: 1,
                        mb: 0,
                        overflow: 'auto',
                        bgcolor: 'grey.50',
                        p: 1,
                        borderRadius: 1,
                        fontSize: 12,
                      }}
                    >
                      {(() => {
                        try {
                          return JSON.stringify(JSON.parse(ev.metaJson), null, 2);
                        } catch {
                          return ev.metaJson;
                        }
                      })()}
                    </Box>
                  )}
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchivoEventosOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

