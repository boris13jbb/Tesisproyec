import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import RuleOutlinedIcon from '@mui/icons-material/RuleOutlined';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { isAxiosError } from 'axios';
import type { ChangeEvent, FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { listSurfaceSx } from '../../components/listSurfaces';
import { PageHeader } from '../../components/PageHeader';
import { SectionHeader } from '../../components/SectionHeader';
import { fechaDocumentoEmisionSchema } from '../../utils/documento-fecha.schema';
import {
  type PartyCatalogRow,
  partySelectLabel,
} from '../../utils/party-label';

type TipoOption = { id: string; codigo: string; nombre: string };
type SerieOption = { id: string; codigo: string; nombre: string };
type SubserieOption = {
  id: string;
  codigo: string;
  nombre: string;
  serieId: string;
  serie: SerieOption;
};

type DependenciaOption = { id: string; codigo: string; nombre: string };

const MAX_FILE_BYTES = 50 * 1024 * 1024; // Backend: multer limits.fileSize = 50MB
// Debe reflejar DocumentosService (solo PDF).
const ALLOWED_EXTS = ['pdf'] as const;
const ALLOWED_MIMES = ['application/pdf'] as const;

const createSchema = z.object({
  codigo: z
    .string()
    .max(64)
    .transform((s) => s.trim())
    .refine((s) => s.length === 0 || s.length >= 2, {
      message: 'Si indica código, mínimo 2 caracteres.',
    }),
  asunto: z.string().min(3, 'Asunto requerido').max(250),
  descripcion: z.string().max(1000).optional(),
  fechaDocumento: fechaDocumentoEmisionSchema,
  tipoDocumentalId: z.string().min(1, 'Tipo requerido'),
  subserieId: z.string().min(1, 'Clasificación requerida'),
  dependenciaId: z.string().optional(),
  contraparteId: z.string().optional(),
  beneficiarioId: z.string().optional(),
  responsableInstitucional: z.string().max(250).optional(),
  fechaVencimiento: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), {
      message: 'Fecha de vencimiento inválida',
    }),
  nivelConfidencialidad: z.enum(['PUBLICO', 'INTERNO', 'RESERVADO', 'CONFIDENCIAL']),
  estado: z.enum(['BORRADOR', 'REGISTRADO']),
});

type CreateForm = z.infer<typeof createSchema>;

function fileExt(name: string): string {
  const idx = name.lastIndexOf('.');
  if (idx < 0) return '';
  return name.slice(idx + 1).toLowerCase();
}

function isFilenameSafe(name: string): boolean {
  if (!name || name.trim() !== name) return false;
  if (/[\\/]/.test(name)) return false;
  // Evita caracteres típicamente peligrosos; el backend sanitiza adicionalmente.
  if (/[?%*:|"<>]/.test(name)) return false;
  return true;
}

export function NuevoDocumentoPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tipos, setTipos] = useState<TipoOption[]>([]);
  const [subseries, setSubseries] = useState<SubserieOption[]>([]);
  const [dependencias, setDependencias] = useState<DependenciaOption[]>([]);
  const [contrapartes, setContrapartes] = useState<PartyCatalogRow[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<PartyCatalogRow[]>([]);
  const [serieId, setSerieId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [catalogosLoaded, setCatalogosLoaded] = useState(false);
  const [codigoSugeridoBusy, setCodigoSugeridoBusy] = useState(false);
  const [codigoSugeridoErr, setCodigoSugeridoErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  /** Si el usuario editó el código manualmente, no sobrescribimos con sugerencias silenciosas. */
  const codigoUsuarioRef = useRef(false);
  /** Evita pisar Dependencia si el usuario la vacía después de cargar la pantalla */
  const defaultDependenciaAplicado = useRef(false);
  const tipoUnicoAuto = useRef(false);
  const serieUnicaAuto = useRef(false);

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    mode: 'onChange',
    defaultValues: {
      codigo: '',
      asunto: '',
      descripcion: '',
      fechaDocumento: new Date().toISOString().slice(0, 10),
      tipoDocumentalId: '',
      subserieId: '',
      dependenciaId: '',
      contraparteId: '',
      beneficiarioId: '',
      responsableInstitucional: '',
      fechaVencimiento: '',
      nivelConfidencialidad: 'INTERNO',
      estado: 'REGISTRADO',
    },
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiClient.get<TipoOption[]>('/tipos-documentales'),
      apiClient.get<SubserieOption[]>('/subseries'),
      apiClient.get<DependenciaOption[]>('/dependencias'),
      apiClient.get<PartyCatalogRow[]>('/contrapartes'),
      apiClient.get<PartyCatalogRow[]>('/beneficiarios'),
    ])
      .then(([tiposRes, subsRes, depsRes, contrapartesRes, beneficiariosRes]) => {
        if (cancelled) return;
        setTipos(tiposRes.data);
        setSubseries(subsRes.data);
        setDependencias(depsRes.data);
        setContrapartes(contrapartesRes.data);
        setBeneficiarios(beneficiariosRes.data);
      })
      .catch(() => {
        if (cancelled) return;
        setTipos([]);
        setSubseries([]);
        setDependencias([]);
        setContrapartes([]);
        setBeneficiarios([]);
      })
      .finally(() => {
        if (!cancelled) setCatalogosLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const aplicarCodigoSugerido = useCallback(
    async (opts?: { forzar?: boolean }) => {
      const forzar = opts?.forzar === true;
      const actual = form.getValues('codigo')?.trim();
      if (!forzar && codigoUsuarioRef.current && actual) return;

      setCodigoSugeridoErr(null);
      setCodigoSugeridoBusy(true);
      try {
        const fecha = form.getValues('fechaDocumento');
        const anioStr = fecha?.slice(0, 4);
        const params: { anio?: number } = {};
        if (/^\d{4}$/.test(anioStr ?? '')) {
          params.anio = Number(anioStr);
        }
        const { data } = await apiClient.get<{
          codigo: string;
          prefijo: string;
          anio?: number;
          secuencia?: number;
        }>('/documentos/next-codigo', { params });
        form.setValue('codigo', data.codigo, {
          shouldValidate: true,
          shouldDirty: forzar,
        });
        if (forzar) {
          codigoUsuarioRef.current = false;
        }
      } catch (e: unknown) {
        let msg = 'No se pudo obtener un correlativo desde el servidor.';
        if (isAxiosError(e) && e.response?.data) {
          const d = e.response.data as { message?: string | string[] };
          const m = d.message;
          if (Array.isArray(m)) msg = m.join(' ');
          else if (typeof m === 'string' && m.trim()) msg = m.trim();
        }
        setCodigoSugeridoErr(msg);
      } finally {
        setCodigoSugeridoBusy(false);
      }
    },
    [form],
  );

  useEffect(() => {
    if (!catalogosLoaded) return;
    let cancelled = false;
    void (async () => {
      if (cancelled || codigoUsuarioRef.current) return;
      if (form.getValues('codigo')?.trim()) return;
      await aplicarCodigoSugerido({ forzar: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [catalogosLoaded, aplicarCodigoSugerido, form]);

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

  useEffect(() => {
    if (defaultDependenciaAplicado.current) return;
    const did = user?.dependenciaId?.trim();
    if (!did || dependencias.length === 0) return;
    if (!dependencias.some((d) => d.id === did)) return;
    defaultDependenciaAplicado.current = true;
    form.setValue('dependenciaId', did, { shouldValidate: true });
  }, [user?.dependenciaId, dependencias, form]);

  useEffect(() => {
    if (tipoUnicoAuto.current || tipos.length !== 1) return;
    tipoUnicoAuto.current = true;
    form.setValue('tipoDocumentalId', tipos[0].id, { shouldValidate: true });
  }, [tipos, form]);

  useEffect(() => {
    if (serieUnicaAuto.current || serieId || series.length !== 1) return;
    serieUnicaAuto.current = true;
    setSerieId(series[0].id);
  }, [series, serieId]);

  /** Si solo existe una subserie bajo la serie elegida, alinea la clasificación con el catálogo real. */
  useEffect(() => {
    if (!serieId || subseriesFiltered.length !== 1) return;
    const onlyId = subseriesFiltered[0].id;
    if (form.getValues('subserieId') === onlyId) return;
    form.setValue('subserieId', onlyId, { shouldValidate: true });
  }, [serieId, subseriesFiltered, form]);

  const tipoLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tipos) {
      map.set(t.id, `${t.codigo} — ${t.nombre}`);
    }
    return map;
  }, [tipos]);

  const subserieLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of subseries) {
      map.set(s.id, `${s.serie.codigo} > ${s.nombre}`);
    }
    return map;
  }, [subseries]);

  const selectedExt = file ? fileExt(file.name) : '';
  const extPermitted =
    !!file && (ALLOWED_EXTS as readonly string[]).includes(selectedExt);
  // Algunos navegadores envían type vacío; en ese caso basta la extensión .pdf (el backend valida firma %PDF).
  const mimePermitted =
    !!file &&
    (file.type === '' || (ALLOWED_MIMES as readonly string[]).includes(file.type));
  const sizeOk = !!file && file.size > 0 && file.size <= MAX_FILE_BYTES;
  const nameSafe = !!file && isFilenameSafe(file.name);

  const metadataComplete = form.formState.isValid;
  const watchedSubserieId = useWatch({ control: form.control, name: 'subserieId' });
  const clasificacionAssigned = !!watchedSubserieId;

  const registradoPorLabel = useMemo(() => {
    const joined = `${user?.nombres ?? ''} ${user?.apellidos ?? ''}`.trim();
    if (joined && user?.email) return `${joined} (${user.email})`;
    return joined || user?.email || '—';
  }, [user?.nombres, user?.apellidos, user?.email]);

  const fechaRegistroHoy = useMemo(
    () =>
      new Intl.DateTimeFormat('es-EC', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date()),
    [],
  );

  const onPickFile = () => {
    fileInputRef.current?.click();
  };

  const onFileSelected = (f: File | null) => {
    setSubmitError(null);
    setFile(f);
  };

  const validations = [
    {
      label: 'Extensión permitida',
      ok: extPermitted && mimePermitted,
      pending: !file,
    },
    {
      label: 'Nombre sanitizado',
      ok: nameSafe,
      pending: !file,
    },
    {
      label: 'Metadatos completos',
      ok: metadataComplete,
      pending: !metadataComplete,
    },
    {
      label: 'Clasificación asignada',
      ok: !!clasificacionAssigned,
      pending: !clasificacionAssigned,
    },
  ] as const;

  const statusChip = (ok: boolean, pending: boolean) => {
    if (pending) return <Chip label="Por completar" size="small" color="warning" />;
    if (ok) return <Chip label="Correcto" size="small" color="success" />;
    return <Chip label="Incorrecto" size="small" color="error" />;
  };

  const onSubmit = async (data: CreateForm) => {
    setSubmitError(null);
    if (!file) {
      setSubmitError('Seleccione un archivo para continuar.');
      return;
    }
    if (!extPermitted || !mimePermitted) {
      setSubmitError(
        'Tipo de archivo no permitido. Solo se admite PDF (.pdf).',
      );
      return;
    }
    if (!sizeOk) {
      setSubmitError('El archivo excede el tamaño permitido (máx 50 MB) o está vacío.');
      return;
    }
    if (!nameSafe) {
      setSubmitError('Nombre de archivo no válido. Renómbrelo y vuelva a intentar.');
      return;
    }

    setSaving(true);
    try {
      const trimmedCodigo = data.codigo.trim();
      const created = await apiClient.post<{ id: string }>('/documentos', {
        ...(codigoUsuarioRef.current && trimmedCodigo ? { codigo: trimmedCodigo } : {}),
        asunto: data.asunto.trim(),
        descripcion: data.descripcion?.trim() || undefined,
        fechaDocumento: new Date(data.fechaDocumento).toISOString(),
        tipoDocumentalId: data.tipoDocumentalId,
        subserieId: data.subserieId,
        dependenciaId: data.dependenciaId?.trim() ? data.dependenciaId : undefined,
        contraparteId: data.contraparteId?.trim() ? data.contraparteId : undefined,
        beneficiarioId: data.beneficiarioId?.trim() ? data.beneficiarioId : undefined,
        responsableInstitucional: data.responsableInstitucional?.trim() || undefined,
        fechaVencimiento: data.fechaVencimiento?.trim()
          ? new Date(data.fechaVencimiento).toISOString()
          : undefined,
        nivelConfidencialidad: data.nivelConfidencialidad,
        estado: data.estado,
      });

      const formData = new FormData();
      formData.append('file', file);
      await apiClient.post(`/documentos/${created.data.id}/archivos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await navigate(`/documentos/${created.data.id}`, { replace: true });
    } catch (e) {
      if (isAxiosError(e)) {
        const msg =
          typeof e.response?.data === 'object' && e.response?.data && 'message' in e.response.data
            ? String((e.response.data as { message?: unknown }).message)
            : null;
        setSubmitError(msg || 'No fue posible guardar el documento. Revise los datos e intente nuevamente.');
      } else {
        setSubmitError('No fue posible guardar el documento. Intente más tarde.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    void form.handleSubmit(onSubmit)(event);
  };

  return (
    <Box sx={{ width: '100%', pb: { xs: 4, md: 5 } }}>
      <PageHeader
        title="Nuevo documento digitalizado"
        description="Carga de archivo, metadatos, clasificación y validación de seguridad."
        backTo={{ to: '/documentos', label: 'Volver a Documentos' }}
      />

      {submitError ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>
          {submitError}
        </Alert>
      ) : null}

      <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
        <Typography variant="body2">
          Los desplegables provienen del catálogo activo. Cuando solo existe un tipo documental, una serie o una
          clasificación compatible con la serie elegida, pueden preseleccionarse: conviene revisar antes de guardar.
          El <strong>código</strong> lo asigna el servidor si no lo edita: serie simple <strong>PREFIJO-0001</strong>{' '}
          cuando ya hay documentos en ese formato, o correlativo anual <strong>PREFIJO-AÑO-00001</strong> cuando
          aplique. Use <strong>Correlativo servidor</strong> como vista previa (prefijo <code>DOCUMENTO_CODIGO_PREFIX</code>, por
          defecto <code>DOC</code>).
        </Typography>
      </Alert>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper elevation={0} sx={{ ...listSurfaceSx, p: 2.5 }}>
            <Box sx={{ mb: 2 }}>
              <SectionHeader
                icon={<DescriptionOutlinedIcon fontSize="small" />}
                title="Datos del documento"
                subtitle="Metadatos obligatorios"
              />
            </Box>

            <Box component="form" onSubmit={handleFormSubmit} noValidate>
              <Stack spacing={2}>
                <TextField
                  label="Registrado por"
                  value={registradoPorLabel}
                  slotProps={{ input: { readOnly: true } }}
                  helperText="Usuario autenticado; el servidor asigna el creador al guardar."
                />
                <TextField
                  label="Fecha de registro"
                  value={fechaRegistroHoy}
                  slotProps={{ input: { readOnly: true } }}
                  helperText="Se genera automáticamente al guardar (no editable)."
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'flex-start' } }}>
                  <TextField
                    label="Código"
                    sx={{ flex: 1, minWidth: 0 }}
                    {...(() => {
                      const r = form.register('codigo');
                      return {
                        ...r,
                        onChange: (e: ChangeEvent<HTMLInputElement>) => {
                          codigoUsuarioRef.current = true;
                          setCodigoSugeridoErr(null);
                          void r.onChange(e);
                        },
                      };
                    })()}
                    error={!!form.formState.errors.codigo}
                    helperText={
                      form.formState.errors.codigo?.message ??
                      'Vista previa: si no modifica el campo, el servidor asignará el siguiente código al guardar.'
                    }
                  />
                  <Button
                    type="button"
                    variant="outlined"
                    disabled={codigoSugeridoBusy}
                    onClick={() => void aplicarCodigoSugerido({ forzar: true })}
                    sx={{ mt: { xs: 0, sm: 0.5 }, flexShrink: 0 }}
                  >
                    {codigoSugeridoBusy ? 'Obteniendo…' : 'Correlativo servidor'}
                  </Button>
                </Stack>
                {codigoSugeridoErr && !form.formState.errors.codigo ? (
                  <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: -1 }}>
                    {codigoSugeridoErr}
                  </Typography>
                ) : null}
                <TextField
                  label="Asunto del documento"
                  {...form.register('asunto')}
                  error={!!form.formState.errors.asunto}
                  helperText={
                    form.formState.errors.asunto?.message ??
                    'Descripción breve del contenido (mínimo 3 caracteres).'
                  }
                  required
                />

                <Controller
                  name="tipoDocumentalId"
                  control={form.control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!form.formState.errors.tipoDocumentalId}>
                      <InputLabel id="tipo-label">Tipo documental</InputLabel>
                      <Select {...field} labelId="tipo-label" label="Tipo documental" value={field.value || ''}>
                        <MenuItem value="">Seleccione…</MenuItem>
                        {tipos.map((t) => (
                          <MenuItem key={t.id} value={t.id}>
                            {tipoLabel.get(t.id)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />

                <FormControl fullWidth>
                  <InputLabel id="serie-label">Serie documental</InputLabel>
                  <Select
                    labelId="serie-label"
                    label="Serie documental"
                    value={serieId}
                    onChange={(e) => {
                      setSerieId(e.target.value);
                      form.setValue('subserieId', '', { shouldValidate: true });
                    }}
                  >
                    <MenuItem value="">Seleccione…</MenuItem>
                    {series.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.codigo} — {s.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                    Clasificación archivística (cuadro de clasificación); seleccione la serie y luego la subserie.
                  </Typography>
                </FormControl>

                <Controller
                  name="subserieId"
                  control={form.control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!form.formState.errors.subserieId}>
                      <InputLabel id="subserie-label">Clasificación</InputLabel>
                      <Select {...field} labelId="subserie-label" label="Clasificación" value={field.value || ''}>
                        <MenuItem value="">Seleccione…</MenuItem>
                        {subseriesFiltered.map((s) => (
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
                  control={form.control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel id="dep-label">Dependencia responsable</InputLabel>
                      <Select {...field} labelId="dep-label" label="Dependencia responsable" value={field.value || ''}>
                        <MenuItem value="">(Sin asignar)</MenuItem>
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
                  name="contraparteId"
                  control={form.control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel id="contraparte-label">Contraparte (opcional)</InputLabel>
                      <Select
                        {...field}
                        labelId="contraparte-label"
                        label="Contraparte (opcional)"
                        value={field.value || ''}
                      >
                        <MenuItem value="">(Sin contraparte)</MenuItem>
                        {contrapartes.map((c) => (
                          <MenuItem key={c.id} value={c.id}>
                            {partySelectLabel(c)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />

                <Controller
                  name="beneficiarioId"
                  control={form.control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel id="beneficiario-label">Beneficiario (opcional)</InputLabel>
                      <Select
                        {...field}
                        labelId="beneficiario-label"
                        label="Beneficiario (opcional)"
                        value={field.value || ''}
                      >
                        <MenuItem value="">(Sin beneficiario)</MenuItem>
                        {beneficiarios.map((b) => (
                          <MenuItem key={b.id} value={b.id}>
                            {partySelectLabel(b)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />

                <TextField
                  label="Responsable institucional (opcional)"
                  {...form.register('responsableInstitucional')}
                  error={!!form.formState.errors.responsableInstitucional}
                  helperText={
                    form.formState.errors.responsableInstitucional?.message ??
                    'Nombre o cargo de referencia (texto libre). No sustituye al usuario que registra, la dependencia, la contraparte ni el beneficiario. Se guarda en mayúsculas.'
                  }
                />

                <TextField
                  label="Fecha de vencimiento (opcional)"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  {...form.register('fechaVencimiento')}
                  error={!!form.formState.errors.fechaVencimiento}
                  helperText={
                    form.formState.errors.fechaVencimiento?.message ??
                    'Puede ser una fecha futura si aplica al documento.'
                  }
                />

                <Controller
                  name="nivelConfidencialidad"
                  control={form.control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel id="conf-label">Nivel de confidencialidad</InputLabel>
                      <Select {...field} labelId="conf-label" label="Nivel de confidencialidad" value={field.value}>
                        <MenuItem value="PUBLICO">Público</MenuItem>
                        <MenuItem value="INTERNO">Interno</MenuItem>
                        <MenuItem value="RESERVADO">Reservado</MenuItem>
                        <MenuItem value="CONFIDENCIAL">Confidencial</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />

                <Controller
                  name="estado"
                  control={form.control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel id="estado-label">Estado inicial</InputLabel>
                      <Select {...field} labelId="estado-label" label="Estado inicial" value={field.value}>
                        <MenuItem value="REGISTRADO">Registrado</MenuItem>
                        <MenuItem value="BORRADOR">Borrador</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />

                <TextField
                  label="Fecha de emisión del documento"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: new Date().toISOString().slice(0, 10) } }}
                  {...form.register('fechaDocumento')}
                  error={!!form.formState.errors.fechaDocumento}
                  helperText={form.formState.errors.fechaDocumento?.message}
                  required
                />

                <TextField
                  label="Descripción"
                  multiline
                  minRows={3}
                  {...form.register('descripcion')}
                  error={!!form.formState.errors.descripcion}
                  helperText={
                    form.formState.errors.descripcion?.message ??
                    'Opcional. Contexto o finalidad complementaria del documento.'
                  }
                />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ pt: 0.5 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="secondary"
                    disabled={saving}
                    sx={{ borderRadius: 3, px: 3 }}
                  >
                    {saving ? 'Guardando…' : 'Guardar documento'}
                  </Button>
                  <Button
                    type="button"
                    variant="text"
                    onClick={() => navigate('/documentos')}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={2}>
            <Paper elevation={0} sx={{ ...listSurfaceSx, p: 2.5 }}>
              <Box sx={{ mb: 2 }}>
                <SectionHeader
                  icon={<CloudUploadOutlinedIcon fontSize="small" />}
                  title="Archivo digital"
                  subtitle="Solo PDF (.pdf), máx. 50 MB"
                />
              </Box>

              <Box
                role="button"
                tabIndex={0}
                onClick={onPickFile}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onPickFile();
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.item(0) ?? null;
                  onFileSelected(f);
                }}
                sx={{
                  borderRadius: 3,
                  border: '1px dashed',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                  px: 2,
                  py: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                  outline: 'none',
                  '&:focus-visible': {
                    boxShadow: (t) => `0 0 0 3px ${alpha(t.palette.secondary.main, 0.25)}`,
                  },
                }}
              >
                <CloudUploadOutlinedIcon sx={{ fontSize: 44, color: 'secondary.main' }} aria-hidden />
                <Typography sx={{ mt: 1.5, fontWeight: 900, color: 'secondary.main' }}>
                  Arrastre el archivo aquí o seleccione
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Tamaño máximo: 50 MB · Solo PDF · Validación automática
                </Typography>
                {file ? (
                  <Typography variant="body2" sx={{ mt: 1.5 }}>
                    <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
                  </Typography>
                ) : null}
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept=".pdf,application/pdf"
                  onChange={(e) => onFileSelected(e.target.files?.item(0) ?? null)}
                />
              </Box>
            </Paper>

            <Paper elevation={0} sx={{ ...listSurfaceSx, p: 2.5 }}>
              <Box sx={{ mb: 1.5 }}>
                <SectionHeader
                  icon={<RuleOutlinedIcon fontSize="small" />}
                  title="Validaciones automáticas"
                  subtitle="Comprobaciones antes de guardar"
                />
              </Box>

              <Stack spacing={1}>
                {validations.map((v) => (
                  <Stack
                    key={v.label}
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      {v.pending ? (
                        <ErrorOutlineRoundedIcon fontSize="small" color="warning" />
                      ) : v.ok ? (
                        <CheckCircleRoundedIcon fontSize="small" color="success" />
                      ) : (
                        <ErrorOutlineRoundedIcon fontSize="small" color="error" />
                      )}
                      <Typography variant="body2" color="text.secondary">
                        {v.label}
                      </Typography>
                    </Stack>
                    {statusChip(v.ok, v.pending)}
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}

