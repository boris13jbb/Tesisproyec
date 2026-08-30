import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { userHasAdminAccess } from '../../auth/role-utils';
import { listSurfaceSx } from '../../components/listSurfaces';
import { PageHeader } from '../../components/PageHeader';
import { SectionHeader } from '../../components/SectionHeader';
import { getApiErrorMessage } from '../../utils/api-error-message';
import { fechaDocumentoEmisionSchema } from '../../utils/documento-fecha.schema';
import { formatFileSize, formatMimeType } from '../../utils/file-meta-format';
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

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTS = ['pdf'] as const;
const ALLOWED_MIMES = ['application/pdf'] as const;

const WIZARD_STEPS = ['Archivo', 'Información', 'Listo'] as const;

type WizardPhase = 'idle' | 'creating' | 'uploading' | 'upload_failed' | 'success';

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
  if (/[?%*:|"<>]/.test(name)) return false;
  return true;
}

/** Sugiere asunto desde el nombre de archivo solo si el campo está vacío. */
function suggestAsuntoFromFilename(name: string): string {
  const base = name
    .replace(/\.[^.]+$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (base.length < 3) return '';
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function validateSelectedFile(f: File | null): string | null {
  if (!f) return 'Seleccione un archivo para continuar.';
  const ext = fileExt(f.name);
  const extOk = (ALLOWED_EXTS as readonly string[]).includes(ext);
  const mimeOk = f.type === '' || (ALLOWED_MIMES as readonly string[]).includes(f.type);
  if (!extOk || !mimeOk) {
    return 'El tipo de archivo seleccionado no está permitido. Solo se admite PDF.';
  }
  if (f.size <= 0) return 'El archivo está vacío.';
  if (f.size > MAX_FILE_BYTES) {
    return 'El archivo supera el límite máximo permitido de 50 MB.';
  }
  if (!isFilenameSafe(f.name)) {
    return 'Nombre de archivo no válido. Renómbrelo y vuelva a intentar.';
  }
  return null;
}

export function NuevoDocumentoPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmDown = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const isAdmin = userHasAdminAccess(user?.roles);

  const [myPermissionCodes, setMyPermissionCodes] = useState<string[] | null>(null);
  const permissionsLoaded = myPermissionCodes !== null;
  const canCreate = isAdmin || (myPermissionCodes?.includes('DOC_CREATE') ?? false);
  const canUpload = isAdmin || (myPermissionCodes?.includes('DOC_FILES_UPLOAD') ?? false);
  const canUseWizard = canCreate && canUpload;

  const [activeStep, setActiveStep] = useState(0);
  const [phase, setPhase] = useState<WizardPhase>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdDocumentId, setCreatedDocumentId] = useState<string | null>(null);
  const [createdCodigo, setCreatedCodigo] = useState<string | null>(null);

  const [tipos, setTipos] = useState<TipoOption[]>([]);
  const [subseries, setSubseries] = useState<SubserieOption[]>([]);
  const [dependencias, setDependencias] = useState<DependenciaOption[]>([]);
  const [contrapartes, setContrapartes] = useState<PartyCatalogRow[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<PartyCatalogRow[]>([]);
  const [serieId, setSerieId] = useState('');
  const [catalogosLoaded, setCatalogosLoaded] = useState(false);
  const [codigoSugeridoBusy, setCodigoSugeridoBusy] = useState(false);
  const [codigoSugeridoErr, setCodigoSugeridoErr] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const codigoUsuarioRef = useRef(false);
  const defaultDependenciaAplicado = useRef(false);
  const tipoUnicoAuto = useRef(false);
  const serieUnicaAuto = useRef(false);
  const submittingRef = useRef(false);

  const busy = phase === 'creating' || phase === 'uploading';

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
    void (async () => {
      try {
        if (!user?.id) {
          if (!cancelled) setMyPermissionCodes(null);
          return;
        }
        const res = await apiClient.get<{ codigos: string[] }>('/rbac/me/permissions');
        if (cancelled) return;
        setMyPermissionCodes(Array.isArray(res.data?.codigos) ? res.data.codigos : []);
      } catch {
        if (!cancelled) setMyPermissionCodes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!canUseWizard) return;
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
  }, [canUseWizard]);

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
        const { data } = await apiClient.get<{ codigo: string }>('/documentos/next-codigo', {
          params,
        });
        form.setValue('codigo', data.codigo, {
          shouldValidate: true,
          shouldDirty: forzar,
        });
        if (forzar) codigoUsuarioRef.current = false;
      } catch (e: unknown) {
        setCodigoSugeridoErr(
          getApiErrorMessage(e, 'No se pudo obtener un correlativo desde el servidor.'),
        );
      } finally {
        setCodigoSugeridoBusy(false);
      }
    },
    [form],
  );

  useEffect(() => {
    if (!catalogosLoaded || !canUseWizard) return;
    let cancelled = false;
    void (async () => {
      if (cancelled || codigoUsuarioRef.current) return;
      if (form.getValues('codigo')?.trim()) return;
      await aplicarCodigoSugerido({ forzar: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [catalogosLoaded, canUseWizard, aplicarCodigoSugerido, form]);

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

  useEffect(() => {
    if (!serieId || subseriesFiltered.length !== 1) return;
    const onlyId = subseriesFiltered[0].id;
    if (form.getValues('subserieId') === onlyId) return;
    form.setValue('subserieId', onlyId, { shouldValidate: true });
  }, [serieId, subseriesFiltered, form]);

  useEffect(() => {
    if (!busy) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [busy]);

  const tipoLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tipos) map.set(t.id, `${t.codigo} — ${t.nombre}`);
    return map;
  }, [tipos]);

  const subserieLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of subseries) map.set(s.id, `${s.serie.codigo} > ${s.nombre}`);
    return map;
  }, [subseries]);

  const registradoPorLabel = useMemo(() => {
    const joined = `${user?.nombres ?? ''} ${user?.apellidos ?? ''}`.trim();
    if (joined && user?.email) return `${joined} (${user.email})`;
    return joined || user?.email || '—';
  }, [user]);

  const fechaRegistroHoy = useMemo(
    () =>
      new Intl.DateTimeFormat('es-EC', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date()),
    [],
  );

  const fileValid = validateSelectedFile(file) === null;

  const onPickFile = () => {
    if (busy) return;
    fileInputRef.current?.click();
  };

  const applySelectedFile = (f: File | null) => {
    setSubmitError(null);
    const err = validateSelectedFile(f);
    setFileError(err);
    setFile(f);
    if (f && !err) {
      const currentAsunto = form.getValues('asunto')?.trim() ?? '';
      if (!currentAsunto) {
        const suggested = suggestAsuntoFromFilename(f.name);
        if (suggested) {
          form.setValue('asunto', suggested.slice(0, 250), { shouldValidate: true });
        }
      }
    }
  };

  const clearFile = () => {
    setFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const goToStepInfo = () => {
    const err = validateSelectedFile(file);
    setFileError(err);
    if (err) return;
    setActiveStep(1);
  };

  const uploadFileToDocument = async (documentoId: string, selected: File) => {
    const formData = new FormData();
    formData.append('file', selected);
    await apiClient.post(`/documentos/${documentoId}/archivos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  };

  const finishSuccess = (documentoId: string, codigo?: string | null) => {
    setPhase('success');
    setActiveStep(2);
    setCreatedDocumentId(documentoId);
    if (codigo) setCreatedCodigo(codigo);
    window.setTimeout(() => {
      void navigate(`/documentos/${documentoId}`, { replace: true });
    }, 1200);
  };

  const onRegister = async (data: CreateForm) => {
    if (submittingRef.current || busy) return;
    const fileErr = validateSelectedFile(file);
    if (fileErr || !file) {
      setFileError(fileErr ?? 'Seleccione un archivo para continuar.');
      setActiveStep(0);
      return;
    }

    submittingRef.current = true;
    setSubmitError(null);

    /** Variable local: el estado React puede no actualizarse a tiempo en el catch. */
    let documentoId: string | null = createdDocumentId;
    let codigoLocal: string | null = createdCodigo;

    try {
      if (!documentoId) {
        setPhase('creating');
        const trimmedCodigo = data.codigo.trim();
        const created = await apiClient.post<{ id: string; codigo?: string }>('/documentos', {
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
        documentoId = created.data.id;
        codigoLocal = created.data.codigo ?? (trimmedCodigo || null);
        setCreatedDocumentId(documentoId);
        setCreatedCodigo(codigoLocal);
      }

      setPhase('uploading');
      await uploadFileToDocument(documentoId, file);
      finishSuccess(documentoId, codigoLocal ?? form.getValues('codigo'));
    } catch (e: unknown) {
      if (documentoId) {
        setCreatedDocumentId(documentoId);
        if (codigoLocal) setCreatedCodigo(codigoLocal);
        setPhase('upload_failed');
        setActiveStep(2);
        setSubmitError(
          getApiErrorMessage(
            e,
            'El registro documental fue creado, pero no se pudo cargar el archivo.',
          ),
        );
      } else {
        setPhase('idle');
        setSubmitError(getApiErrorMessage(e, 'No fue posible registrar el documento.'));
      }
    } finally {
      submittingRef.current = false;
    }
  };

  const retryUpload = async () => {
    if (!createdDocumentId || !file || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitError(null);
    setPhase('uploading');
    try {
      await uploadFileToDocument(createdDocumentId, file);
      finishSuccess(createdDocumentId, createdCodigo);
    } catch (e: unknown) {
      setPhase('upload_failed');
      setSubmitError(
        getApiErrorMessage(
          e,
          'El registro documental fue creado, pero no se pudo cargar el archivo.',
        ),
      );
    } finally {
      submittingRef.current = false;
    }
  };

  const handleRegisterClick = () => {
    void form.handleSubmit(onRegister)();
  };

  const cancelWizard = () => {
    if (busy) return;
    if (createdDocumentId && phase === 'upload_failed') {
      void navigate(`/documentos/${createdDocumentId}`);
      return;
    }
    void navigate('/documentos');
  };

  if (!permissionsLoaded) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={36} />
      </Box>
    );
  }

  if (!canUseWizard) {
    return (
      <Box sx={{ width: '100%', pb: { xs: 4, md: 5 } }}>
        <PageHeader
          title="Nuevo documento"
          description="Registro documental con archivo digital."
          backTo={{ to: '/documentos', label: 'Volver a Documentos' }}
        />
        <Alert severity="warning">
          {!canCreate
            ? 'No dispone de permiso para crear documentos (DOC_CREATE).'
            : 'No dispone de permisos para cargar archivos digitales (DOC_FILES_UPLOAD). El registro exige adjuntar el PDF en el mismo proceso.'}
        </Alert>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={() => void navigate('/documentos')}>
          Volver a Documentos
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', pb: { xs: 4, md: 5 } }}>
      <PageHeader
        title="Registrar nuevo documento"
        description="Seleccione el archivo, complete la información y registre el expediente en un solo proceso."
        backTo={busy ? undefined : { to: '/documentos', label: 'Volver a Documentos' }}
      />

      <Paper elevation={0} sx={{ ...listSurfaceSx, p: { xs: 2, sm: 2.5 }, mb: 2 }}>
        <Stepper
          activeStep={activeStep}
          alternativeLabel={!isSmDown}
          orientation={isSmDown ? 'vertical' : 'horizontal'}
        >
          {WIZARD_STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {submitError && phase !== 'upload_failed' ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>
          {submitError}
        </Alert>
      ) : null}

      {busy ? (
        <Alert severity="info" icon={<CircularProgress size={18} />} sx={{ mb: 2 }}>
          {phase === 'creating' ? 'Registrando documento…' : 'Subiendo archivo…'}
        </Alert>
      ) : null}

      {/* Paso 1 — Archivo */}
      {activeStep === 0 ? (
        <Paper elevation={0} sx={{ ...listSurfaceSx, p: { xs: 2, sm: 3 } }}>
          <SectionHeader
            icon={<CloudUploadOutlinedIcon fontSize="small" />}
            title="Seleccione el documento digital"
            subtitle="Adjunte el archivo que desea registrar en el Sistema de Gestión Documental."
          />

          {!file ? (
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
                applySelectedFile(e.dataTransfer.files?.item(0) ?? null);
              }}
              sx={{
                mt: 2,
                borderRadius: 3,
                border: '1px dashed',
                borderColor: 'divider',
                bgcolor: 'action.hover',
                px: 2,
                py: { xs: 4, sm: 5 },
                textAlign: 'center',
                cursor: 'pointer',
                outline: 'none',
                '&:focus-visible': {
                  boxShadow: (t) => `0 0 0 3px ${alpha(t.palette.secondary.main, 0.25)}`,
                },
              }}
            >
              <PictureAsPdfOutlinedIcon sx={{ fontSize: 48, color: 'secondary.main' }} aria-hidden />
              <Typography sx={{ mt: 1.5, fontWeight: 800 }}>Seleccione un documento</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                PDF · Máximo 50 MB
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                sx={{ mt: 2, textTransform: 'none' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onPickFile();
                }}
              >
                Seleccionar archivo
              </Button>
            </Box>
          ) : (
            <Paper
              elevation={0}
              sx={{
                mt: 2,
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
                  <PictureAsPdfOutlinedIcon color="secondary" sx={{ mt: 0.25 }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, wordBreak: 'break-word' }}>
                      {file.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatMimeType(file.type || 'application/pdf')} · {formatFileSize(file.size)}
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                  <Button variant="outlined" onClick={onPickFile} sx={{ textTransform: 'none' }}>
                    Cambiar archivo
                  </Button>
                  <Button color="error" onClick={clearFile} sx={{ textTransform: 'none' }}>
                    Eliminar
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          )}

          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept=".pdf,application/pdf"
            onChange={(e) => applySelectedFile(e.target.files?.item(0) ?? null)}
          />

          {fileError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {fileError}
            </Alert>
          ) : null}

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ mt: 3, justifyContent: 'flex-end' }}
          >
            <Button variant="text" onClick={cancelWizard} disabled={busy}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              color="secondary"
              disabled={!fileValid || busy}
              onClick={goToStepInfo}
            >
              Continuar
            </Button>
          </Stack>
        </Paper>
      ) : null}

      {/* Paso 2 — Información */}
      {activeStep === 1 ? (
        <Paper elevation={0} sx={{ ...listSurfaceSx, p: { xs: 2, sm: 2.5 } }}>
          <SectionHeader
            icon={<DescriptionOutlinedIcon fontSize="small" />}
            title="Información del documento"
            subtitle="Metadatos y clasificación archivística"
          />

          {file ? (
            <Alert severity="info" variant="outlined" sx={{ mt: 1.5, mb: 2 }}>
              Archivo listo: <strong>{file.name}</strong> ({formatFileSize(file.size)})
            </Alert>
          ) : null}

          <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
            El <strong>código</strong> lo asigna el servidor si no lo edita. Use{' '}
            <strong>Correlativo servidor</strong> para refrescar la vista previa.
          </Alert>

          <Stack spacing={2} sx={{ mt: 1 }}>
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
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ alignItems: { sm: 'flex-start' } }}
            >
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
                disabled={codigoSugeridoBusy || busy}
                onClick={() => void aplicarCodigoSugerido({ forzar: true })}
                sx={{ mt: { xs: 0, sm: 0.5 }, flexShrink: 0 }}
              >
                {codigoSugeridoBusy ? 'Obteniendo…' : 'Correlativo servidor'}
              </Button>
            </Stack>
            {codigoSugeridoErr && !form.formState.errors.codigo ? (
              <Typography variant="caption" color="warning.main">
                {codigoSugeridoErr}
              </Typography>
            ) : null}

            <TextField
              label="Asunto del documento"
              {...form.register('asunto')}
              error={!!form.formState.errors.asunto}
              helperText={form.formState.errors.asunto?.message}
              required
              disabled={busy}
            />

            <Controller
              name="tipoDocumentalId"
              control={form.control}
              render={({ field }) => (
                <FormControl fullWidth error={!!form.formState.errors.tipoDocumentalId} disabled={busy}>
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

            <FormControl fullWidth disabled={busy}>
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
            </FormControl>

            <Controller
              name="subserieId"
              control={form.control}
              render={({ field }) => (
                <FormControl fullWidth error={!!form.formState.errors.subserieId} disabled={busy}>
                  <InputLabel id="subserie-label">Clasificación (subserie)</InputLabel>
                  <Select {...field} labelId="subserie-label" label="Clasificación (subserie)" value={field.value || ''}>
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
                <FormControl fullWidth disabled={busy}>
                  <InputLabel id="dep-label">Dependencia propietaria</InputLabel>
                  <Select {...field} labelId="dep-label" label="Dependencia propietaria" value={field.value || ''}>
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

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="contraparteId"
                  control={form.control}
                  render={({ field }) => (
                    <FormControl fullWidth disabled={busy}>
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
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="beneficiarioId"
                  control={form.control}
                  render={({ field }) => (
                    <FormControl fullWidth disabled={busy}>
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
              </Grid>
            </Grid>

            <TextField
              label="Responsable institucional (opcional)"
              {...form.register('responsableInstitucional')}
              disabled={busy}
              helperText="Texto de referencia. El servidor lo guarda en mayúsculas."
            />

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="nivelConfidencialidad"
                  control={form.control}
                  render={({ field }) => (
                    <FormControl fullWidth disabled={busy}>
                      <InputLabel id="conf-label">Confidencialidad</InputLabel>
                      <Select {...field} labelId="conf-label" label="Confidencialidad" value={field.value}>
                        <MenuItem value="PUBLICO">Público</MenuItem>
                        <MenuItem value="INTERNO">Interno</MenuItem>
                        <MenuItem value="RESERVADO">Reservado</MenuItem>
                        <MenuItem value="CONFIDENCIAL">Confidencial</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="estado"
                  control={form.control}
                  render={({ field }) => (
                    <FormControl fullWidth disabled={busy}>
                      <InputLabel id="estado-label">Estado inicial</InputLabel>
                      <Select {...field} labelId="estado-label" label="Estado inicial" value={field.value}>
                        <MenuItem value="REGISTRADO">Registrado</MenuItem>
                        <MenuItem value="BORRADOR">Borrador</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Fecha del documento"
                  type="date"
                  fullWidth
                  slotProps={{
                    inputLabel: { shrink: true },
                    htmlInput: { max: new Date().toISOString().slice(0, 10) },
                  }}
                  {...form.register('fechaDocumento')}
                  error={!!form.formState.errors.fechaDocumento}
                  helperText={form.formState.errors.fechaDocumento?.message}
                  required
                  disabled={busy}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Fecha de vencimiento (opcional)"
                  type="date"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  {...form.register('fechaVencimiento')}
                  error={!!form.formState.errors.fechaVencimiento}
                  helperText={form.formState.errors.fechaVencimiento?.message}
                  disabled={busy}
                />
              </Grid>
            </Grid>

            <TextField
              label="Descripción"
              multiline
              minRows={3}
              {...form.register('descripcion')}
              error={!!form.formState.errors.descripcion}
              helperText={form.formState.errors.descripcion?.message}
              disabled={busy}
            />

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ pt: 1, justifyContent: 'space-between' }}
            >
              <Button
                variant="outlined"
                disabled={busy}
                onClick={() => {
                  setSubmitError(null);
                  setActiveStep(0);
                }}
              >
                Atrás
              </Button>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button variant="text" onClick={cancelWizard} disabled={busy}>
                  Cancelar
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  disabled={busy || !fileValid}
                  onClick={handleRegisterClick}
                >
                  {busy ? 'Procesando…' : 'Registrar documento'}
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </Paper>
      ) : null}

      {/* Paso 3 — Resultado */}
      {activeStep === 2 ? (
        <Paper elevation={0} sx={{ ...listSurfaceSx, p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
          {phase === 'success' ? (
            <>
              <CheckCircleRoundedIcon color="success" sx={{ fontSize: 56 }} />
              <Typography variant="h6" sx={{ mt: 1.5, fontWeight: 800 }}>
                Documento registrado correctamente
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {createdCodigo || form.getValues('codigo') || '—'}
              </Typography>
              {file ? (
                <Typography variant="body2" sx={{ mt: 0.5, wordBreak: 'break-word' }}>
                  {file.name}
                </Typography>
              ) : null}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Abriendo el detalle…
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                sx={{ mt: 3, justifyContent: 'center' }}
              >
                <Button
                  variant="contained"
                  color="secondary"
                  disabled={!createdDocumentId}
                  onClick={() => {
                    if (createdDocumentId) void navigate(`/documentos/${createdDocumentId}`, { replace: true });
                  }}
                >
                  Ver documento
                </Button>
                <Button variant="text" onClick={() => void navigate('/documentos', { replace: true })}>
                  Cerrar
                </Button>
              </Stack>
            </>
          ) : (
            <>
              <Alert severity="warning" sx={{ textAlign: 'left', mb: 2 }}>
                El registro documental fue creado, pero no se pudo cargar el archivo.
                {submitError ? (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {submitError}
                  </Typography>
                ) : null}
              </Alert>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                No se creará otro documento. Puede reintentar solo la carga del archivo.
              </Typography>
              {createdCodigo ? (
                <Typography sx={{ fontWeight: 700, mb: 1 }}>{createdCodigo}</Typography>
              ) : null}
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                sx={{ justifyContent: 'center' }}
              >
                <Button
                  variant="contained"
                  color="secondary"
                  disabled={busy || !file}
                  onClick={() => void retryUpload()}
                >
                  {phase === 'uploading' ? 'Subiendo…' : 'Reintentar carga'}
                </Button>
                <Button
                  variant="outlined"
                  disabled={!createdDocumentId}
                  onClick={() => {
                    if (createdDocumentId) void navigate(`/documentos/${createdDocumentId}`);
                  }}
                >
                  Ir al documento
                </Button>
              </Stack>
            </>
          )}
        </Paper>
      ) : null}
    </Box>
  );
}
