import { zodResolver } from '@hookform/resolvers/zod';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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
import { isAxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { z } from 'zod';
import {
  DOCUMENTO_ESTADOS,
  documentoEstadoSchema,
  labelDocumentoEstado,
} from '../../constants/documento-estado';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { useRegisterBreadcrumbDetail } from '../../layouts/useBreadcrumbDetail';

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
  tipoDocumentalId: string;
  subserieId: string;
  tipoDocumental: TipoOption;
  dependencia: DependenciaOption | null;
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

type UsuarioOption = { id: string; email: string; nombres: string | null; apellidos: string | null; activo: boolean };

type DocumentoAccessPayload = {
  documentoId: string;
  accessPolicy: 'INHERIT' | 'RESTRICTED';
  userIds: string[];
  roleCodigos: string[];
};

type RoleOption = { codigo: string; nombre: string };

const editSchema = z.object({
  asunto: z.string().min(3).max(250),
  descripcion: z.string().max(1000).optional(),
  fechaDocumento: z.string().min(10, 'Fecha requerida'),
  estado: documentoEstadoSchema,
  activo: z.boolean(),
  tipoDocumentalId: z.string().min(1, 'Tipo requerido'),
  subserieId: z.string().min(1, 'Subserie requerida'),
  dependenciaId: z.string().optional(),
  nivelConfidencialidad: z.enum(['PUBLICO', 'INTERNO', 'RESERVADO', 'CONFIDENCIAL']),
});
type EditForm = z.infer<typeof editSchema>;

function formatDateOnly(isoOrDate: string) {
  return new Date(isoOrDate).toISOString().slice(0, 10);
}

function formatValue(field: string | undefined, v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') {
    if (field === 'estado') {
      return labelDocumentoEstado(v);
    }
    // ISO date-ish → solo fecha
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
    return v;
  }
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

type DiffEntry = { field: string; from: unknown; to: unknown };

function parseCambiosJson(raw: string): DiffEntry[] {
  const parsed = JSON.parse(raw) as unknown;
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('diff' in parsed) ||
    typeof (parsed as { diff?: unknown }).diff !== 'object' ||
    (parsed as { diff?: unknown }).diff === null
  ) {
    return [];
  }
  const diff = (parsed as { diff: Record<string, { from: unknown; to: unknown }> })
    .diff;
  return Object.entries(diff).map(([field, val]) => ({
    field,
    from: val?.from,
    to: val?.to,
  }));
}

function fieldLabel(field: string): string {
  const map: Record<string, string> = {
    asunto: 'Asunto',
    descripcion: 'Descripción',
    fechaDocumento: 'Fecha del documento',
    estado: 'Estado',
    activo: 'Activo',
    tipoDocumentalId: 'Tipo documental',
    subserieId: 'Subserie',
    codigo: 'Código',
    dependenciaId: 'Dependencia',
    nivelConfidencialidad: 'Confidencialidad',
  };
  return map[field] ?? field;
}

/** Límite alineado con `FileInterceptor` del backend (~50 MiB). */
const MAX_FILE_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Vista previa embutida: no descargar a blob completo por encima de esto (RAM / estabilidad del navegador). La descarga sigue permitida hasta el tope de subida. */
const MAX_PREVIEW_BYTES = 20 * 1024 * 1024;

function formatDateTime(isoOrDate: string) {
  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(isoOrDate));
}

/** Vista integrada en el navegador (PDF / imágenes); Office y otros solo descarga. */
function tipoVistaPreviaMime(mime: string): 'pdf' | 'image' | null {
  const m = mime.toLowerCase().trim();
  if (m === 'application/pdf') return 'pdf';
  if (m === 'image/jpeg' || m === 'image/png' || m === 'image/webp') return 'image';
  return null;
}

function labelConfidencialidad(raw: string): string {
  const map: Record<string, string> = {
    PUBLICO: 'Público',
    INTERNO: 'Interno',
    RESERVADO: 'Reservado',
    CONFIDENCIAL: 'Confidencial',
  };
  return map[raw] ?? raw;
}

function estadoVisualizationColor(estado: string):
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'default' {
  switch (estado) {
    case 'APROBADO':
      return 'success';
    case 'EN_REVISION':
      return 'warning';
    case 'RECHAZADO':
      return 'error';
    case 'ARCHIVADO':
      return 'info';
    default:
      return 'default';
  }
}

const INSTITUTIONAL_TEAL = '#2D8A99';
const INSTITUTIONAL_TEAL_SOFT = 'rgba(45, 138, 153, 0.14)';
const INSTITUTIONAL_NAVY = '#1A2B3C';

const paperCardSx = {
  borderRadius: 3,
  border: '1px solid rgba(15, 23, 42, 0.08)',
  boxShadow: '0 14px 46px rgba(15, 23, 42, 0.08)',
} as const;

function SectionHeader({
  letter,
  title,
  subtitle,
}: {
  letter: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Box
        aria-hidden
        sx={{
          width: 34,
          height: 34,
          borderRadius: 2,
          bgcolor: INSTITUTIONAL_TEAL_SOFT,
          color: INSTITUTIONAL_TEAL,
          display: 'grid',
          placeItems: 'center',
          fontWeight: 900,
          flexShrink: 0,
        }}
      >
        {letter}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.15 }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      </Box>
    </Stack>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ py: 1, borderBottom: 1, borderColor: 'divider' }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 700, wordBreak: 'break-word' }}>{value}</Typography>
    </Box>
  );
}

type TimelineLine = {
  primary: string;
  secondary: string;
  expanded?: DiffEntry[] | null;
};

function buildTimelineLine(ev: DocumentoEventoRow): TimelineLine {
  const secondary = `${formatDateTime(ev.createdAt)} · ${ev.createdBy.email}`;
  if (ev.tipo === 'CREADO') {
    return { primary: 'Documento registrado', secondary };
  }
  if (ev.tipo !== 'ACTUALIZADO' || !ev.cambiosJson) {
    return { primary: ev.tipo, secondary };
  }
  try {
    const entries = parseCambiosJson(ev.cambiosJson);
    if (!entries.length) {
      return { primary: ev.tipo, secondary };
    }
    if (entries.length === 1 && entries[0].field === 'estado') {
      const e = entries[0];
      return {
        primary: `Estado: ${formatValue('estado', e.from)} → ${formatValue('estado', e.to)}`,
        secondary,
      };
    }
    if (entries.length === 1) {
      const e = entries[0];
      return {
        primary: `${fieldLabel(e.field)} modificado`,
        secondary,
        expanded: entries,
      };
    }
    return {
      primary: `Actualización registrada (${entries.length} campos)`,
      secondary,
      expanded: entries,
    };
  } catch {
    return { primary: ev.tipo, secondary };
  }
}

export function DocumentoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.roles.some((r) => r.codigo === 'ADMIN') ?? false;
  const [myPermissionCodes, setMyPermissionCodes] = useState<string[] | null>(null);
  const canManageDocAccess = useMemo(() => {
    if (isAdmin) return true;
    return myPermissionCodes?.includes('DOC_ACCESS_MANAGE') ?? false;
  }, [isAdmin, myPermissionCodes]);

  const [doc, setDoc] = useState<DocumentoRow | null>(null);

  const [tipos, setTipos] = useState<TipoOption[]>([]);
  const [subseries, setSubseries] = useState<SubserieOption[]>([]);
  const [dependencias, setDependencias] = useState<DependenciaOption[]>([]);

  const [eventos, setEventos] = useState<DocumentoEventoRow[]>([]);
  const [archivos, setArchivos] = useState<DocumentoArchivoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [rejectMotivoOpen, setRejectMotivoOpen] = useState(false);
  const [rejectMotivo, setRejectMotivo] = useState('');
  const [rejectMotivoError, setRejectMotivoError] = useState<string | null>(
    null,
  );
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [archivoEventosOpen, setArchivoEventosOpen] = useState(false);
  const [archivoEventosTitle, setArchivoEventosTitle] = useState<string>('');
  const [archivoEventos, setArchivoEventos] = useState<DocumentoArchivoEventoRow[]>([]);

  const [accessLoading, setAccessLoading] = useState(false);
  const [accessSaveLoading, setAccessSaveLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [accessOk, setAccessOk] = useState<string | null>(null);
  const [accessPolicy, setAccessPolicy] = useState<'INHERIT' | 'RESTRICTED'>('INHERIT');
  const [accessUsers, setAccessUsers] = useState<UsuarioOption[]>([]);
  const [accessUserIds, setAccessUserIds] = useState<string[]>([]);
  const [accessRoleCodigos, setAccessRoleCodigos] = useState<string[]>([]);
  const [accessRolesCatalog, setAccessRolesCatalog] = useState<RoleOption[]>([
    { codigo: 'ADMIN', nombre: 'Administrador' },
    { codigo: 'USUARIO', nombre: 'Usuario' },
    { codigo: 'REVISOR', nombre: 'Revisor' },
    { codigo: 'AUDITOR', nombre: 'Auditor' },
    { codigo: 'CONSULTA', nombre: 'Consulta' },
  ]);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<'pdf' | 'image' | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  /** Mensaje informativo (p. ej. archivo demasiado grande); no es fallo de red. */
  const [previewSkipInfo, setPreviewSkipInfo] = useState<string | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);

  const historiaRef = useRef<HTMLDivElement | null>(null);

  useRegisterBreadcrumbDetail(doc?.codigo);

  const subserieLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of subseries) {
      map.set(s.id, `${s.serie.codigo} / ${s.codigo} — ${s.nombre}`);
    }
    return map;
  }, [subseries]);

  const docArchivado = doc?.estado === 'ARCHIVADO';

  /** Mayor versión numérica (coherente con orden del API tras `orderBy version desc`). */
  const archivoUltimaVersion = useMemo(() => {
    if (!archivos.length) return null;
    return archivos.reduce((best, cur) => (cur.version > best.version ? cur : best));
  }, [archivos]);

  /** Solo campos usados en la descarga de vista previa — el async interno cierra sobre esto y `exhaustive-deps` queda alineado. */
  const previewFetchKey = useMemo(() => {
    if (!archivoUltimaVersion) return null;
    return {
      archivoId: archivoUltimaVersion.id,
      sizeBytes:
        typeof archivoUltimaVersion.sizeBytes === 'number'
          ? archivoUltimaVersion.sizeBytes
          : 0,
      mimeType: archivoUltimaVersion.mimeType ?? '',
    };
  }, [archivoUltimaVersion]);

  const esRevisorOAdmin =
    user?.roles.some((r) => r.codigo === 'ADMIN' || r.codigo === 'REVISOR') ??
    false;
  const puedeEnviarRevision = Boolean(
    doc &&
      doc.estado === 'REGISTRADO' &&
      (isAdmin || user?.id === doc.createdBy.id),
  );
  const puedeResolverRevision = Boolean(
    doc && doc.estado === 'EN_REVISION' && esRevisorOAdmin,
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!user?.id) {
          if (!cancelled) setMyPermissionCodes(null);
          return;
        }
        const res = await apiClient.get<string[]>('/rbac/me/permissions');
        if (cancelled) return;
        setMyPermissionCodes(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (cancelled) return;
        setMyPermissionCodes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

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
      dependenciaId: '',
      nivelConfidencialidad: 'INTERNO',
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

  const loadAccess = useCallback(async () => {
    if (!id || !canManageDocAccess) return;
    setAccessError(null);
    setAccessOk(null);
    setAccessLoading(true);
    try {
      const [accessRes, usersRes] = await Promise.all([
        apiClient.get<DocumentoAccessPayload>(`/documentos/${id}/access`),
        apiClient.get<UsuarioOption[]>('/usuarios'),
      ]);
      // Roles: cargar dinámico si el backend lo permite; fallback seguro si falla
      try {
        const rolesRes = await apiClient.get<RoleOption[]>('/rbac/roles');
        if (Array.isArray(rolesRes.data) && rolesRes.data.length) {
          setAccessRolesCatalog(
            rolesRes.data
              .filter((r) => typeof r?.codigo === 'string')
              .map((r) => ({ codigo: r.codigo, nombre: r.nombre ?? r.codigo })),
          );
        }
      } catch {
        // sin acción: mantenemos catálogo local
      }
      const payload = accessRes.data;
      setAccessPolicy(payload.accessPolicy);
      setAccessUserIds(payload.userIds ?? []);
      setAccessRoleCodigos(payload.roleCodigos ?? []);
      setAccessUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    } catch (e) {
      if (isAxiosError(e) && e.response?.status === 403) {
        setAccessError('No tiene permiso para administrar el acceso del documento (DOC_ACCESS_MANAGE).');
      } else {
        setAccessError('No se pudo cargar la configuración de acceso del documento.');
      }
      setAccessUsers([]);
    } finally {
      setAccessLoading(false);
    }
  }, [id, canManageDocAccess]);

  const saveAccess = useCallback(async () => {
    if (!id) return;
    if (!canManageDocAccess) {
      setAccessError('No tiene permiso para guardar el acceso del documento (DOC_ACCESS_MANAGE).');
      return;
    }
    setAccessError(null);
    setAccessOk(null);
    setAccessSaveLoading(true);
    try {
      const payload = {
        accessPolicy,
        userIds: accessUserIds,
        roleCodigos: accessRoleCodigos,
      };
      await apiClient.put(`/documentos/${id}/access`, payload);
      setAccessOk('Acceso actualizado. El cambio es efectivo inmediatamente en listados/detalle/archivos.');
    } catch (e) {
      if (isAxiosError(e) && e.response?.status === 403) {
        setAccessError('No tiene permiso para guardar el acceso del documento (DOC_ACCESS_MANAGE).');
      } else {
        setAccessError('No se pudo guardar el acceso del documento.');
      }
    } finally {
      setAccessSaveLoading(false);
    }
  }, [id, canManageDocAccess, accessPolicy, accessUserIds, accessRoleCodigos]);

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
    void loadAccess();
  }, [load, loadAccess]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- blobs y revocations se sincronizan con archivo visible */
    const ac = new AbortController();

    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    setPreviewUrl(null);
    setPreviewKind(null);
    setPreviewError(null);
    setPreviewSkipInfo(null);

    if (!id || !previewFetchKey) {
      setPreviewLoading(false);
      return () => {
        ac.abort();
      };
    }

    const bytes = previewFetchKey.sizeBytes;
    if (bytes > MAX_PREVIEW_BYTES) {
      const mbArch = (bytes / (1024 * 1024)).toFixed(1);
      const mbMax = (MAX_PREVIEW_BYTES / (1024 * 1024)).toFixed(0);
      setPreviewSkipInfo(
        `El archivo (${mbArch} MB) supera el límite de ${mbMax} MB para vista previa en el navegador (reduce uso de memoria).`,
      );
      setPreviewLoading(false);
      return () => {
        ac.abort();
      };
    }

    const kind = tipoVistaPreviaMime(previewFetchKey.mimeType);
    if (!kind) {
      setPreviewLoading(false);
      return () => {
        ac.abort();
      };
    }

    let cancelled = false;
    setPreviewLoading(true);

    void (async () => {
      try {
        const res = await apiClient.get(
          `/documentos/${id}/archivos/${previewFetchKey.archivoId}/download`,
          { responseType: 'blob', signal: ac.signal },
        );
        if (cancelled) return;

        const headerRaw =
          typeof res.headers['content-type'] === 'string'
            ? res.headers['content-type'].split(';')[0]?.trim()
            : '';
        const metaType = previewFetchKey.mimeType.trim();
        const blobMime =
          headerRaw &&
          headerRaw !== 'application/octet-stream' &&
          tipoVistaPreviaMime(headerRaw) === kind
            ? headerRaw
            : metaType ||
              (kind === 'pdf'
                ? 'application/pdf'
                : kind === 'image'
                  ? 'image/jpeg'
                  : 'application/octet-stream');

        const blob = new Blob([res.data], {
          type: blobMime || 'application/octet-stream',
        });
        const url = URL.createObjectURL(blob);
        previewObjectUrlRef.current = url;
        setPreviewUrl(url);
        setPreviewKind(kind);
      } catch (e: unknown) {
        if (cancelled || (isAxiosError(e) && e.code === 'ERR_CANCELED')) return;
        setPreviewError('No se pudo cargar la vista previa del archivo. Use Descargar si el problema continúa.');
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
    };
  }, [id, previewFetchKey]);

  const openEdit = () => {
    if (!doc) return;
    const parsedEstado = documentoEstadoSchema.safeParse(doc.estado);
    const estadoForm = parsedEstado.success
      ? parsedEstado.data
      : ('REGISTRADO' as const);
    editForm.reset({
      asunto: doc.asunto,
      descripcion: doc.descripcion ?? '',
      fechaDocumento: formatDateOnly(doc.fechaDocumento),
      estado: estadoForm,
      activo: doc.activo,
      tipoDocumentalId: doc.tipoDocumental.id,
      subserieId: doc.subserie.id,
      dependenciaId: doc.dependencia?.id ?? '',
      nivelConfidencialidad: doc.nivelConfidencialidad as EditForm['nivelConfidencialidad'],
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
        dependenciaId: data.dependenciaId?.trim()
          ? data.dependenciaId.trim()
          : null,
        nivelConfidencialidad: data.nivelConfidencialidad,
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

  const onEnviarRevision = async () => {
    if (!id) return;
    setError(null);
    setWorkflowLoading(true);
    try {
      await apiClient.post(`/documentos/${id}/enviar-revision`);
      await load();
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data) {
        const d = err.response.data as { message?: string | string[] };
        const m = d.message;
        setError(Array.isArray(m) ? m.join(' ') : (m ?? 'No se pudo enviar a revisión.'));
      } else {
        setError('No se pudo enviar a revisión.');
      }
    } finally {
      setWorkflowLoading(false);
    }
  };

  const onResolverRevision = async (
    decision: 'APROBADO' | 'RECHAZADO',
    motivo?: string,
  ) => {
    if (!id) return;
    setError(null);
    setWorkflowLoading(true);
    try {
      const body =
        decision === 'RECHAZADO'
          ? { decision, motivo: motivo?.trim() ?? '' }
          : { decision };
      await apiClient.post(`/documentos/${id}/resolver-revision`, body);
      await load();
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data) {
        const d = err.response.data as { message?: string | string[] };
        const m = d.message;
        setError(
          Array.isArray(m) ? m.join(' ') : (m ?? 'No se pudo resolver la revisión.'),
        );
      } else {
        setError('No se pudo resolver la revisión.');
      }
    } finally {
      setWorkflowLoading(false);
    }
  };

  const openRejectMotivoDialog = () => {
    setRejectMotivo('');
    setRejectMotivoError(null);
    setRejectMotivoOpen(true);
  };

  const confirmRejectConMotivo = async () => {
    const t = rejectMotivo.trim();
    if (t.length < 3) {
      setRejectMotivoError('Indique el motivo (mínimo 3 caracteres).');
      return;
    }
    if (t.length > 2000) {
      setRejectMotivoError('Máximo 2000 caracteres.');
      return;
    }
    setRejectMotivoOpen(false);
    await onResolverRevision('RECHAZADO', t);
  };

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
    <>
      <Container maxWidth="lg">
        <PageHeader
          title={doc ? `Documento ${doc.codigo}` : 'Documento'}
          description={
            doc ? (
              <Stack spacing={0.75}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Detalle documental · GADPR-LM · Sistema de Gestión Documental
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Consulta integral, historial de versiones y trazabilidad del documento.
                </Typography>
              </Stack>
            ) : (
              'Consulta integral, historial de versiones y trazabilidad del documento.'
            )
          }
          backTo={{ to: '/documentos', label: 'Volver al listado' }}
          actions={
            doc ? (
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Chip
                  size="small"
                  color={estadoVisualizationColor(doc.estado)}
                  label={labelDocumentoEstado(doc.estado)}
                />
                <Chip
                  size="small"
                  color={doc.activo ? 'success' : 'default'}
                  label={doc.activo ? 'Activo' : 'Inactivo'}
                  variant={doc.activo ? 'filled' : 'outlined'}
                />
              </Stack>
            ) : null
          }
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress aria-label="Cargando documento" />
          </Box>
        )}

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
            <Paper elevation={0} sx={{ ...paperCardSx, p: { xs: 1.5, sm: 2 } }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={{ xs: 1.5, sm: 2 }}
                sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                    Flujo documental
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>{doc.asunto}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Fecha doc. {formatDateOnly(doc.fechaDocumento)} · Registrado por{' '}
                    {doc.createdBy.email}
                  </Typography>
                </Box>
                <Stack
                  direction="row"
                  sx={{
                    flexWrap: 'wrap',
                    gap: 1,
                    justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                  }}
                >
                  {puedeEnviarRevision && (
                    <Button
                      variant="outlined"
                      disabled={workflowLoading}
                      onClick={() => void onEnviarRevision()}
                      sx={{ textTransform: 'none' }}
                    >
                      Enviar a revisión
                    </Button>
                  )}
                  {puedeResolverRevision && (
                    <>
                      <Button
                        color="success"
                        variant="outlined"
                        disabled={workflowLoading}
                        onClick={() => void onResolverRevision('APROBADO')}
                        sx={{ textTransform: 'none' }}
                      >
                        Aprobar
                      </Button>
                      <Button
                        color="warning"
                        variant="outlined"
                        disabled={workflowLoading}
                        onClick={() => openRejectMotivoDialog()}
                        sx={{ textTransform: 'none' }}
                      >
                        Rechazar
                      </Button>
                    </>
                  )}
                </Stack>
              </Stack>
            </Paper>

            <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
              <Grid size={{ xs: 12, md: 7 }}>
                <Paper
                  elevation={0}
                  sx={{
                    ...paperCardSx,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Box sx={{ px: 2.5, pt: 2.25 }}>
                    <SectionHeader
                      letter="D"
                      title="Vista previa"
                      subtitle={
                        archivoUltimaVersion
                          ? `Última versión v${archivoUltimaVersion.version} · ${archivoUltimaVersion.originalName}`
                          : doc.asunto.trim()
                            ? doc.asunto
                            : doc.tipoDocumental.nombre
                      }
                    />
                  </Box>
                  <Box sx={{ px: 2.5, pb: 2, pt: 0.5, flex: 1 }}>
                    <Box
                      sx={{
                        borderRadius: 2,
                        border: '1px solid rgba(15,23,42,0.08)',
                        bgcolor: '#f1f5f9',
                        minHeight: { xs: 260, sm: 400 },
                        maxHeight: '72vh',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {previewLoading ? (
                        <Box
                          sx={{
                            flex: 1,
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            py: 8,
                          }}
                        >
                          <CircularProgress size={36} aria-label="Cargando vista previa del archivo" />
                        </Box>
                      ) : null}

                      {!previewLoading && previewError ? (
                        <Alert severity="warning" sx={{ m: 2 }}>
                          {previewError}
                        </Alert>
                      ) : null}

                      {!previewLoading && previewSkipInfo ? (
                        <Alert severity="info" sx={{ m: 2 }}>
                          {previewSkipInfo}{' '}
                          Use la acción <strong>Descargar</strong> en la lista de versiones para abrir el archivo
                          completo.
                        </Alert>
                      ) : null}

                      {!previewLoading &&
                      !previewError &&
                      !previewSkipInfo &&
                      archivoUltimaVersion &&
                      tipoVistaPreviaMime(archivoUltimaVersion.mimeType) === null ? (
                        <Alert severity="info" sx={{ m: 2 }}>
                          Vista previa embebida no disponible para{' '}
                          <strong>{archivoUltimaVersion.mimeType}</strong>. Use <strong>Descargar</strong> para abrir el
                          archivo localmente (p. ej. documentos Office).
                        </Alert>
                      ) : null}

                      {!previewLoading && !previewError && previewUrl && previewKind === 'pdf' ? (
                        <Box
                          component="iframe"
                          title={`Vista previa PDF · ${doc.codigo}`}
                          src={previewUrl}
                          sx={{ flex: 1, width: '100%', minHeight: 360, border: 0, bgcolor: '#fff' }}
                        />
                      ) : null}

                      {!previewLoading && !previewError && previewUrl && previewKind === 'image' ? (
                        <Box
                          sx={{
                            flex: 1,
                            overflow: 'auto',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            p: 1,
                            bgcolor: '#fff',
                          }}
                        >
                          <Box
                            component="img"
                            src={previewUrl}
                            alt={archivoUltimaVersion?.originalName ?? `Adjunto · ${doc.codigo}`}
                            sx={{ maxWidth: '100%', maxHeight: 'min(62vh, 620px)', objectFit: 'contain' }}
                          />
                        </Box>
                      ) : null}

                      {!previewLoading && !previewError && !previewUrl && !archivoUltimaVersion ? (
                        <Box sx={{ p: 2.5 }}>
                          <EmptyState
                            dense
                            title="Sin archivos digitales"
                            description="Los adjuntos se listan más abajo. Al subir PDF o imagen (JPG/PNG/WebP), la vista previa mostrará el contenido real del último archivo."
                          />
                        </Box>
                      ) : null}

                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                          px: 1.5,
                          py: 1,
                          alignItems: 'center',
                          borderTop: '1px solid rgba(15,23,42,0.06)',
                          bgcolor: 'rgba(255,255,255,0.96)',
                          flexShrink: 0,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Typography variant="caption" sx={{ mr: 'auto', fontFamily: 'monospace', fontWeight: 700 }}>
                          {doc.codigo}
                        </Typography>
                        <Chip
                          size="small"
                          color={estadoVisualizationColor(doc.estado)}
                          label={labelDocumentoEstado(doc.estado)}
                          sx={{ fontWeight: 800 }}
                        />
                      </Stack>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Fecha del documento: {formatDateOnly(doc.fechaDocumento)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                      {doc.descripcion?.trim()
                        ? doc.descripcion
                        : 'Sin descripción registrada para este ítem documental.'}
                    </Typography>
                  </Box>

                  <Divider />

                  {canManageDocAccess ? (
                    <>
                      <Box sx={{ px: 2.5, py: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 0.5 }}>
                          Acceso al documento (ACL)
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                          Use <strong>RESTRICTED</strong> para que el documento sea visible solo para los usuarios/roles
                          listados aquí (además de ADMIN). En <strong>INHERIT</strong> aplica la política actual por
                          dependencia/confidencialidad.
                        </Typography>

                        {accessError ? (
                          <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setAccessError(null)}>
                            {accessError}
                          </Alert>
                        ) : null}
                        {accessOk ? (
                          <Alert severity="success" sx={{ mb: 1.5 }} onClose={() => setAccessOk(null)}>
                            {accessOk}
                          </Alert>
                        ) : null}

                        {accessLoading ? (
                          <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
                            <CircularProgress size={30} aria-label="Cargando acceso del documento" />
                          </Box>
                        ) : (
                          <Stack spacing={1.5}>
                            <FormControl fullWidth size="small">
                              <InputLabel id="doc-access-policy-label">Política de acceso</InputLabel>
                              <Select
                                labelId="doc-access-policy-label"
                                label="Política de acceso"
                                value={accessPolicy}
                                onChange={(e) =>
                                  setAccessPolicy(e.target.value as 'INHERIT' | 'RESTRICTED')
                                }
                              >
                                <MenuItem value="INHERIT">INHERIT (política actual)</MenuItem>
                                <MenuItem value="RESTRICTED">RESTRICTED (solo ACL)</MenuItem>
                              </Select>
                            </FormControl>

                            <FormControl fullWidth size="small" disabled={accessPolicy !== 'RESTRICTED'}>
                              <InputLabel id="doc-access-users-label">Usuarios con acceso</InputLabel>
                              <Select
                                multiple
                                labelId="doc-access-users-label"
                                label="Usuarios con acceso"
                                value={accessUserIds}
                                onChange={(e) => setAccessUserIds(e.target.value as string[])}
                                renderValue={(selected) => {
                                  const map = new Map(accessUsers.map((u) => [u.id, u]));
                                  const names = (selected as string[])
                                    .map((id) => map.get(id))
                                    .filter(Boolean)
                                    .map((u) => u!.email);
                                  return names.length ? names.join(', ') : '—';
                                }}
                              >
                                {accessUsers
                                  .filter((u) => u.activo)
                                  .slice()
                                  .sort((a, b) => a.email.localeCompare(b.email))
                                  .map((u) => (
                                    <MenuItem key={u.id} value={u.id}>
                                      {u.email}
                                    </MenuItem>
                                  ))}
                              </Select>
                            </FormControl>

                            <FormControl fullWidth size="small" disabled={accessPolicy !== 'RESTRICTED'}>
                              <InputLabel id="doc-access-roles-label">Roles con acceso</InputLabel>
                              <Select
                                multiple
                                labelId="doc-access-roles-label"
                                label="Roles con acceso"
                                value={accessRoleCodigos}
                                onChange={(e) => setAccessRoleCodigos(e.target.value as string[])}
                                renderValue={(selected) => ((selected as string[]).length ? (selected as string[]).join(', ') : '—')}
                              >
                                {accessRolesCatalog
                                  .slice()
                                  .sort((a, b) => a.codigo.localeCompare(b.codigo))
                                  .map((r) => (
                                    <MenuItem key={r.codigo} value={r.codigo}>
                                      {r.nombre} ({r.codigo})
                                    </MenuItem>
                                  ))}
                              </Select>
                            </FormControl>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                              <Button
                                variant="contained"
                                disabled={accessSaveLoading || accessLoading || !id}
                                onClick={() => void saveAccess()}
                                sx={{ textTransform: 'none', fontWeight: 800 }}
                              >
                                {accessSaveLoading ? 'Guardando…' : 'Guardar acceso'}
                              </Button>
                              <Button
                                variant="outlined"
                                disabled={accessLoading || !id}
                                onClick={() => void loadAccess()}
                                sx={{ textTransform: 'none', fontWeight: 700 }}
                              >
                                Recargar
                              </Button>
                            </Stack>
                          </Stack>
                        )}
                      </Box>
                      <Divider />
                    </>
                  ) : null}

                  <Box sx={{ px: 2.5, py: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 0.5 }}>
                      Archivos digitales
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Versiones activas registradas en el servidor; la vista previa usa la de mayor versión.
                    </Typography>

                    {isAdmin && (
                      <Box
                        sx={{
                          mb: 2,
                          display: 'flex',
                          gap: 2,
                          flexWrap: 'wrap',
                          alignItems: 'center',
                        }}
                      >
                        <Button
                          variant="contained"
                          component="label"
                          disabled={uploading || docArchivado}
                          sx={{
                            textTransform: 'none',
                            bgcolor: INSTITUTIONAL_TEAL,
                            '&:hover': { bgcolor: '#257a87' },
                          }}
                        >
                          {uploading ? 'Subiendo…' : 'Subir archivo'}
                          <input
                            type="file"
                            hidden
                            accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,application/pdf,image/*"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              e.currentTarget.value = '';
                              if (!f) return;
                              if (f.size <= 0) {
                                setError('El archivo está vacío o no es válido.');
                                return;
                              }
                              if (f.size > MAX_FILE_UPLOAD_BYTES) {
                                setError(
                                  `El archivo excede el tamaño permitido (máx ${Math.round(MAX_FILE_UPLOAD_BYTES / (1024 * 1024))} MB).`,
                                );
                                return;
                              }
                              void onUpload(f);
                            }}
                          />
                        </Button>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
                          Permitidos: PDF, JPG/PNG/WEBP, DOCX, XLSX · Máx{' '}
                          {Math.round(MAX_FILE_UPLOAD_BYTES / (1024 * 1024))} MB
                          {docArchivado &&
                            ' · Archivado: no cargas ni eliminaciones.'}
                        </Typography>
                      </Box>
                    )}

                    {archivos.length === 0 ? (
                      <EmptyState
                        dense
                        title="Sin archivos adjuntos"
                        description="Aún no se ha cargado un documento digital asociado a este registro."
                      />
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
                                <Button
                                  sx={{ textTransform: 'none' }}
                                  onClick={() => void openArchivoEventos(a)}
                                >
                                  Historial
                                </Button>
                                <Button
                                  sx={{ textTransform: 'none' }}
                                  onClick={() => void onDownload(a)}
                                >
                                  Descargar
                                </Button>
                                {isAdmin && (
                                  <Button
                                    sx={{ textTransform: 'none' }}
                                    color="error"
                                    disabled={docArchivado}
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
                  </Box>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 5 }}>
                <Stack spacing={2} sx={{ height: '100%' }}>
                  <Paper elevation={0} sx={{ ...paperCardSx, p: 2.5 }}>
                    <SectionHeader
                      letter="C"
                      title="Metadatos"
                      subtitle="Datos del registro en el SGD y del catálogo documental."
                    />
                    <Stack sx={{ mt: 2 }}>
                      <MetaRow
                        label="Tipo documental"
                        value={`${doc.tipoDocumental.codigo} — ${doc.tipoDocumental.nombre}`}
                      />
                      <MetaRow
                        label="Serie"
                        value={`${doc.subserie.serie.codigo} — ${doc.subserie.serie.nombre}`}
                      />
                      <MetaRow
                        label="Subserie"
                        value={`${doc.subserie.codigo} — ${doc.subserie.nombre}`}
                      />
                      <MetaRow
                        label="Confidencialidad"
                        value={labelConfidencialidad(doc.nivelConfidencialidad)}
                      />
                      <MetaRow
                        label="Responsable (dependencia)"
                        value={
                          doc.dependencia ? `${doc.dependencia.codigo} — ${doc.dependencia.nombre}` : '—'
                        }
                      />
                      <MetaRow
                        label="Conservación"
                        value="—"
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: -0.5, mb: 1 }}>
                        Plazo formal no modelado en el sistema.
                      </Typography>
                      <MetaRow label="Registrado por" value={doc.createdBy.email} />
                    </Stack>

                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      sx={{ mt: 2.25, flexWrap: 'wrap', gap: 1 }}
                    >
                      <Button
                        variant="contained"
                        disabled={!archivoUltimaVersion}
                        onClick={() => archivoUltimaVersion && void onDownload(archivoUltimaVersion)}
                        sx={{
                          textTransform: 'none',
                          bgcolor: INSTITUTIONAL_TEAL,
                          '&:hover': { bgcolor: '#257a87' },
                        }}
                      >
                        Descargar
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="contained"
                          onClick={openEdit}
                          sx={{
                            textTransform: 'none',
                            bgcolor: INSTITUTIONAL_NAVY,
                            '&:hover': { bgcolor: '#142030' },
                          }}
                        >
                          Editar
                        </Button>
                      )}
                      <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() =>
                          historiaRef.current?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                          })
                        }
                        sx={{ textTransform: 'none', borderColor: 'rgba(15,23,42,0.15)' }}
                      >
                        Ver historial
                      </Button>
                    </Stack>
                  </Paper>

                  <Paper ref={historiaRef} elevation={0} sx={{ ...paperCardSx, p: 2.5 }}>
                    <SectionHeader
                      letter="A"
                      title="Historial y trazabilidad"
                      subtitle="Últimos movimientos"
                    />

                    {eventos.length === 0 ? (
                      <Box sx={{ py: 2 }}>
                        <EmptyState
                          dense
                          title="Sin eventos en el documento"
                          description="Los cambios quedarán listados cuando existan cargas u actualizaciones."
                        />
                      </Box>
                    ) : (
                      <Stack spacing={0} sx={{ mt: 2 }}>
                        {eventos.map((ev, idx) => {
                          const line = buildTimelineLine(ev);
                          const isLast = idx === eventos.length - 1;
                          return (
                            <Stack
                              key={ev.id}
                              direction="row"
                              spacing={1.25}
                              sx={{
                                alignItems: 'flex-start',
                                pb: isLast ? 0 : 2.25,
                              }}
                            >
                              <Box
                                sx={{
                                  position: 'relative',
                                  width: 14,
                                  flexShrink: 0,
                                  display: 'flex',
                                  justifyContent: 'center',
                                }}
                              >
                                {!isLast && (
                                  <Box
                                    aria-hidden
                                    sx={{
                                      position: 'absolute',
                                      top: 14,
                                      bottom: -18,
                                      left: '50%',
                                      width: 2,
                                      transform: 'translateX(-50%)',
                                      bgcolor: 'rgba(45, 138, 153, 0.42)',
                                      borderRadius: 1,
                                    }}
                                  />
                                )}
                                <Box
                                  sx={{
                                    mt: '6px',
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    bgcolor: INSTITUTIONAL_TEAL,
                                    flexShrink: 0,
                                    zIndex: 1,
                                    boxShadow: '0 0 0 2px rgba(255,255,255,0.95)',
                                  }}
                                />
                              </Box>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 800, lineHeight: 1.3 }}>
                                  {line.primary}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {line.secondary}
                                </Typography>
                                {line.expanded && line.expanded.length > 0 && (
                                  <Accordion
                                    disableGutters
                                    elevation={0}
                                    sx={{
                                      '&:before': { display: 'none' },
                                      boxShadow: 'none',
                                      mt: 1,
                                      border: '1px solid',
                                      borderColor: 'divider',
                                      borderRadius: 1,
                                    }}
                                  >
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                        Detalle técnico de cambios
                                      </Typography>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ pt: 0 }}>
                                      <Box
                                        sx={{
                                          border: 1,
                                          borderColor: 'divider',
                                          borderRadius: 1,
                                          overflow: 'hidden',
                                        }}
                                      >
                                        {line.expanded.map((e, rowIdx) => (
                                          <Box
                                            key={`${e.field}-${rowIdx}`}
                                            sx={{
                                              display: 'grid',
                                              gridTemplateColumns: {
                                                xs: '1fr',
                                                sm: '160px 1fr 1fr',
                                              },
                                              gap: 1,
                                              px: 1.5,
                                              py: 1,
                                              bgcolor:
                                                rowIdx % 2 === 0 ? 'grey.50' : 'background.paper',
                                            }}
                                          >
                                            <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                              {fieldLabel(e.field)}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                              Antes: {formatValue(e.field, e.from)}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                              Después: {formatValue(e.field, e.to)}
                                            </Typography>
                                          </Box>
                                        ))}
                                      </Box>
                                    </AccordionDetails>
                                  </Accordion>
                                )}
                              </Box>
                            </Stack>
                          );
                        })}
                      </Stack>
                    )}
                  </Paper>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        )}
      </Container>

      <Dialog
        open={rejectMotivoOpen}
        onClose={() => !workflowLoading && setRejectMotivoOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Rechazar documento</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            El motivo es obligatorio y quedará registrado en auditoría.
          </Typography>
          <TextField
            label="Motivo del rechazo"
            fullWidth
            required
            multiline
            minRows={3}
            value={rejectMotivo}
            onChange={(e) => {
              setRejectMotivo(e.target.value);
              setRejectMotivoError(null);
            }}
            error={!!rejectMotivoError}
            helperText={rejectMotivoError ?? `${rejectMotivo.trim().length}/2000`}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setRejectMotivoOpen(false)}
            disabled={workflowLoading}
          >
            Cancelar
          </Button>
          <Button
            color="warning"
            variant="contained"
            disabled={workflowLoading}
            onClick={() => void confirmRejectConMotivo()}
          >
            Confirmar rechazo
          </Button>
        </DialogActions>
      </Dialog>

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

            <Controller
              name="estado"
              control={editForm.control}
              render={({ field }) => (
                <FormControl fullWidth required error={!!editForm.formState.errors.estado}>
                  <InputLabel id="edit-estado-label">Estado</InputLabel>
                  <Select
                    labelId="edit-estado-label"
                    label="Estado"
                    value={field.value}
                    onChange={field.onChange}
                  >
                    {DOCUMENTO_ESTADOS.map((cod) => (
                      <MenuItem key={cod} value={cod}>
                        {labelDocumentoEstado(cod)}
                      </MenuItem>
                    ))}
                  </Select>
                  {editForm.formState.errors.estado?.message ? (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                      {String(editForm.formState.errors.estado.message)}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.75 }}>
                      Solo transiciones válidas entre estados (el servidor rechaza saltos ilegales).
                    </Typography>
                  )}
                </FormControl>
              )}
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
              name="dependenciaId"
              control={editForm.control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel id="dep-edit-label">Dependencia propietaria</InputLabel>
                  <Select
                    labelId="dep-edit-label"
                    label="Dependencia propietaria"
                    value={field.value || ''}
                    onChange={field.onChange}
                  >
                    <MenuItem value="">(Sin dependencia)</MenuItem>
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
              control={editForm.control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel id="nivel-edit-label">Confidencialidad</InputLabel>
                  <Select
                    labelId="nivel-edit-label"
                    label="Confidencialidad"
                    value={field.value}
                    onChange={field.onChange}
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
            <EmptyState dense title="Sin eventos registrados para este archivo." />
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
    </>
  );
}

