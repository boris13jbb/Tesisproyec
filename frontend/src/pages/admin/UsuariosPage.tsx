import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  InputLabel,
  ListItemText,
  MenuItem,
  Menu,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  IconButton,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { listSurfaceSx, listTableContainerSx } from '../../components/listSurfaces';
import {
  buildLocalAccessMatrixFallback,
  type AccessMatrixReferencia,
} from '../../constants/roles-access-matrix';
import { formatUltimoIngreso } from '../../utils/formatUltimoIngreso';
import { getApiErrorMessage } from '../../utils/api-error-message';

const INSTITUTIONAL_TEAL = '#2D8A99';
const INSTITUTIONAL_TEAL_SOFT = 'rgba(45, 138, 153, 0.14)';
const INSTITUTIONAL_NAVY = '#1A2B3C';

const paperCardSx = {
  ...listSurfaceSx,
} as const;

type Dependencia = { id: string; codigo: string; nombre: string; activo: boolean };
type Cargo = { id: string; codigo: string; nombre: string; activo: boolean; dependenciaId: string | null };

type Usuario = {
  id: string;
  email: string;
  nombres: string | null;
  apellidos: string | null;
  dependenciaId: string | null;
  cargoId: string | null;
  activo: boolean;
  ultimoLoginAt?: string | null;
  roles: { codigo: string; nombre: string }[];
  /** Permisos adicionales otorgados solo a esta cuenta (además de los del rol). */
  directPermissionCodes?: string[];
};

type InvitacionCorreoInfo = {
  solicitada: boolean;
  enviada: boolean;
  motivoOmitido?: string;
};

type UsuarioCreateResponse = Usuario & {
  createdAt?: string;
  updatedAt?: string;
  invitacionCorreo: InvitacionCorreoInfo;
};

type RbacPermRow = { id: string; codigo: string; descripcion: string | null };
type RbacRoleRow = { id: string; codigo: string; nombre: string };

const ROLE_OPTIONS = [
  'ADMIN',
  'USUARIO',
  'EDITOR_DOC',
  'REVISOR',
  'AUDITOR',
  'CONSULTA',
] as const;

type RoleCode = (typeof ROLE_OPTIONS)[number];

/** Roles institucionales (uno por cuenta). EDITOR_DOC es complemento, no rol principal. */
const PRIMARY_ROLE_OPTIONS = ['USUARIO', 'REVISOR', 'AUDITOR', 'CONSULTA', 'ADMIN'] as const;
type PrimaryRoleCode = (typeof PRIMARY_ROLE_OPTIONS)[number];

const PRIMARY_ROLE_PRECEDENCE: readonly PrimaryRoleCode[] = [
  'ADMIN',
  'REVISOR',
  'AUDITOR',
  'CONSULTA',
  'USUARIO',
];

const ROLE_DISPLAY_NAME: Record<RoleCode, string> = {
  ADMIN: 'Administrador',
  USUARIO: 'Usuario',
  EDITOR_DOC: 'Editor documental',
  REVISOR: 'Revisor',
  AUDITOR: 'Auditor',
  CONSULTA: 'Consulta',
};

const PRIMARY_ROLE_HELP: Record<PrimaryRoleCode, string> = {
  USUARIO: 'Operación diaria: consulta y trámites según los permisos del rol.',
  REVISOR: 'Aprueba o rechaza documentos enviados a revisión.',
  AUDITOR: 'Consulta y trazabilidad; no edita expedientes.',
  CONSULTA: 'Solo lectura institucional.',
  ADMIN: 'Administración del sistema, usuarios, catálogos y seguridad.',
};

function isPrimaryRoleCode(value: string): value is PrimaryRoleCode {
  return (PRIMARY_ROLE_OPTIONS as readonly string[]).includes(value);
}

function isRoleCode(value: string): value is RoleCode {
  return (ROLE_OPTIONS as readonly string[]).includes(value);
}

function composeRoleCodes(primary: PrimaryRoleCode, editorDoc: boolean): RoleCode[] {
  if (primary === 'ADMIN') return ['ADMIN'];
  return editorDoc ? [primary, 'EDITOR_DOC'] : [primary];
}

function parseRoleCodes(codes: string[]): {
  primary: PrimaryRoleCode;
  editorDoc: boolean;
  extrasDropped: string[];
} {
  const set = new Set(codes.map((c) => c.trim().toUpperCase()).filter(Boolean));
  const primary = PRIMARY_ROLE_PRECEDENCE.find((c) => set.has(c)) ?? 'USUARIO';
  const editorDoc = set.has('EDITOR_DOC') && primary !== 'ADMIN';
  const extrasDropped = [...set].filter((c) => c !== primary && c !== 'EDITOR_DOC');
  return { primary, editorDoc, extrasDropped };
}

function mensajeErrorApi(err: unknown, fallback: string): string {
  return getApiErrorMessage(err, fallback);
}

/** Encabezado corto matriz — códigos reales igual que en JWT/RBAC. */
const ROL_COLUMNA_ETIQUETA: Record<string, string> = {
  ADMIN: 'Administración',
  REVISOR: 'Revisor',
  USUARIO: 'Usuario',
  EDITOR_DOC: 'Editor documental',
  AUDITOR: 'Auditor',
  CONSULTA: 'Consulta',
};

function SectionLetterHeader({
  letter,
  accent = 'teal',
  title,
  subtitle,
}: {
  letter: string;
  accent?: 'teal' | 'blue';
  title: string;
  subtitle: string;
}) {
  const badgeBg =
    accent === 'blue' ? 'rgba(37, 99, 235, 0.14)' : INSTITUTIONAL_TEAL_SOFT;
  const badgeFg = accent === 'blue' ? '#1d4ed8' : INSTITUTIONAL_TEAL;
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Box
        aria-hidden
        sx={{
          width: 34,
          height: 34,
          borderRadius: 2,
          bgcolor: badgeBg,
          color: badgeFg,
          display: 'grid',
          placeItems: 'center',
          fontWeight: 900,
          flexShrink: 0,
        }}
      >
        {letter}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.15, color: INSTITUTIONAL_NAVY }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      </Box>
    </Stack>
  );
}

function displayUsuario(u: Usuario) {
  const n = `${u.nombres ?? ''} ${u.apellidos ?? ''}`.trim();
  return n || u.email;
}

function roleChipLabel(r: { codigo: string; nombre: string }) {
  if (r.nombre?.trim()) return r.nombre;
  return isRoleCode(r.codigo) ? ROLE_DISPLAY_NAME[r.codigo] : r.codigo;
}

function RoleChips({ u }: { u: Usuario }) {
  if (!u.roles.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    );
  }
  return (
    <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
      {u.roles.map((r) => (
        <Chip
          key={r.codigo}
          size="small"
          label={roleChipLabel(r)}
          color={r.codigo === 'ADMIN' ? 'primary' : 'default'}
          variant={r.codigo === 'EDITOR_DOC' ? 'outlined' : 'filled'}
          sx={{ fontWeight: 700 }}
        />
      ))}
    </Stack>
  );
}

function RoleAssignmentFields({
  idPrefix,
  primaryRole,
  onPrimaryRoleChange,
  editorDocComplement,
  onEditorDocChange,
  extrasDropped,
}: {
  idPrefix: string;
  primaryRole: PrimaryRoleCode;
  onPrimaryRoleChange: (codigo: PrimaryRoleCode) => void;
  editorDocComplement: boolean;
  onEditorDocChange: (checked: boolean) => void;
  extrasDropped?: string[];
}) {
  const editorDisabled = primaryRole === 'ADMIN';
  const labelId = `${idPrefix}-rol-principal-label`;
  return (
    <Box sx={{ mt: 1.5 }}>
      {extrasDropped && extrasDropped.length > 0 ? (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          Esta cuenta tenía varios roles institucionales (
          {extrasDropped.map((c) => (isRoleCode(c) ? ROLE_DISPLAY_NAME[c] : c)).join(', ')}
          ). Elija <strong>un rol</strong> abajo. Al guardar se reemplazarán los demás para evitar
          acumulación de privilegios. El complemento de editor documental se conserva si lo deja
          marcado.
        </Alert>
      ) : null}
      <FormControl component="fieldset" fullWidth>
        <FormLabel
          id={labelId}
          sx={{ fontWeight: 800, color: INSTITUTIONAL_NAVY, mb: 0.75 }}
        >
          Rol institucional
        </FormLabel>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          Elija el rol que debe tener esta persona. Lo habitual es uno solo; el acceso real lo dan
          los permisos de ese rol.
        </Typography>
        <RadioGroup
          aria-labelledby={labelId}
          name={`${idPrefix}-rol-institucional`}
          value={primaryRole}
          onChange={(e) => {
            if (isPrimaryRoleCode(e.target.value)) onPrimaryRoleChange(e.target.value);
          }}
        >
          {PRIMARY_ROLE_OPTIONS.map((codigo) => (
            <FormControlLabel
              key={codigo}
              value={codigo}
              control={<Radio size="small" />}
              sx={{ alignItems: 'flex-start', ml: 0, mb: 0.5 }}
              label={
                <Box sx={{ pt: 0.35 }}>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    {ROLE_DISPLAY_NAME[codigo]}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', lineHeight: 1.35 }}
                  >
                    {PRIMARY_ROLE_HELP[codigo]}
                  </Typography>
                </Box>
              }
            />
          ))}
        </RadioGroup>
      </FormControl>
      <FormGroup sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <FormControlLabel
          sx={{ alignItems: 'flex-start', ml: 0 }}
          control={
            <Checkbox
              checked={editorDocComplement && !editorDisabled}
              disabled={editorDisabled}
              onChange={(_, checked) => onEditorDocChange(checked)}
            />
          }
          label={
            <Box sx={{ pt: 0.35 }}>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                {ROLE_DISPLAY_NAME.EDITOR_DOC} (complemento)
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', lineHeight: 1.35 }}
              >
                {editorDisabled
                  ? 'No aplica: el administrador ya incluye estas capacidades.'
                  : 'Márquelo si esta persona debe crear o editar documentos y adjuntos sin ser administrador.'}
              </Typography>
            </Box>
          }
        />
      </FormGroup>
    </Box>
  );
}

function PermissionCodesPicker({
  catalog,
  value,
  onChange,
}: {
  catalog: RbacPermRow[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [q, setQ] = useState('');
  const selected = useMemo(() => new Set(value), [value]);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return catalog;
    return catalog.filter(
      (p) =>
        p.codigo.toLowerCase().includes(t) ||
        (p.descripcion ?? '').toLowerCase().includes(t),
    );
  }, [catalog, q]);

  return (
    <FormControl fullWidth margin="normal" component="fieldset">
      <FormLabel sx={{ fontWeight: 800, color: INSTITUTIONAL_NAVY, mb: 0.5 }}>
        Permisos directos (solo esta cuenta)
      </FormLabel>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Opcional. Se suman a los del rol. Vacío = solo hereda del rol. El efecto completo requiere
        nueva sesión o renovación del token.
      </Typography>
      {catalog.length === 0 ? (
        <Alert severity="warning">No hay catálogo de permisos. Ejecute el seed del servidor.</Alert>
      ) : (
        <>
          <TextField
            size="small"
            label="Buscar permiso"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            margin="dense"
          />
          {value.length > 0 ? (
            <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', my: 1 }}>
              {value.map((c) => (
                <Chip
                  key={c}
                  size="small"
                  label={c}
                  onDelete={() => onChange(value.filter((x) => x !== c))}
                />
              ))}
            </Stack>
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', my: 0.75 }}>
              Ninguno seleccionado.
            </Typography>
          )}
          <Box
            sx={{
              maxHeight: 220,
              overflow: 'auto',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              p: 1,
              bgcolor: 'grey.50',
            }}
          >
            {filtered.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Sin coincidencias.
              </Typography>
            ) : (
              filtered.map((p) => (
                <FormControlLabel
                  key={p.codigo}
                  sx={{ display: 'flex', alignItems: 'flex-start', ml: 0, mb: 0.25 }}
                  control={
                    <Checkbox
                      size="small"
                      checked={selected.has(p.codigo)}
                      onChange={() => {
                        const next = new Set(selected);
                        if (next.has(p.codigo)) next.delete(p.codigo);
                        else next.add(p.codigo);
                        onChange([...next].sort((a, b) => a.localeCompare(b)));
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {p.codigo}
                      </Typography>
                      {p.descripcion ? (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {p.descripcion}
                        </Typography>
                      ) : null}
                    </Box>
                  }
                />
              ))
            )}
          </Box>
        </>
      )}
    </FormControl>
  );
}

/** Primera celda sticky en matriz RBAC horizontal (solo scroll X). */
const matrixStickyModuleSx = {
  position: 'sticky',
  left: 0,
  zIndex: 2,
  bgcolor: '#fff',
  boxShadow: '4px 0 12px rgba(15, 23, 42, 0.06)',
  minWidth: { xs: 200, md: 240 },
  maxWidth: { xs: 280, md: 320 },
} as const;

const matrixStickyModuleHeadSx = {
  ...matrixStickyModuleSx,
  zIndex: 3,
  bgcolor: 'grey.50',
} as const;

function MatrixCell({ allowed }: { allowed: boolean }) {
  return (
    <TableCell align="center" sx={{ px: 0.5 }}>
      {allowed ? (
        <CheckCircleRoundedIcon sx={{ color: 'success.main', fontSize: 22 }} aria-label="Permitido" />
      ) : (
        <CancelRoundedIcon sx={{ color: 'error.main', fontSize: 22 }} aria-label="No permitido" />
      )}
    </TableCell>
  );
}

export function UsuariosPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles.some((r) => r.codigo === 'ADMIN') ?? false;
  const [items, setItems] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matrizReferencia, setMatrizReferencia] = useState<AccessMatrixReferencia>(() =>
    buildLocalAccessMatrixFallback(),
  );

  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [selected, setSelected] = useState<Usuario | null>(null);
  const [actionsAnchor, setActionsAnchor] = useState<null | HTMLElement>(null);
  const [actionsUsuario, setActionsUsuario] = useState<Usuario | null>(null);

  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [rbacNotice, setRbacNotice] = useState<string | null>(null);
  const [rbacPermissionCatalog, setRbacPermissionCatalog] = useState<RbacPermRow[]>([]);
  const [rbacRolesCatalog, setRbacRolesCatalog] = useState<RbacRoleRow[]>([]);
  const [rbacRoleCodigo, setRbacRoleCodigo] = useState('USUARIO');
  const [rbacSelectedCodes, setRbacSelectedCodes] = useState<Set<string>>(new Set());
  const [rbacRolePermsLoading, setRbacRolePermsLoading] = useState(false);
  const [rbacMatrixSaving, setRbacMatrixSaving] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [dependenciaId, setDependenciaId] = useState<string>('');
  const [cargoId, setCargoId] = useState<string>('');
  const [primaryRole, setPrimaryRole] = useState<PrimaryRoleCode>('USUARIO');
  const [editorDocComplement, setEditorDocComplement] = useState(false);
  const [extrasDropped, setExtrasDropped] = useState<string[]>([]);
  /** Códigos de `Permission`; se aplican solo a ese usuario (`user_permissions`). */
  const [directPermCodes, setDirectPermCodes] = useState<string[]>([]);
  const [invitarPorCorreo, setInvitarPorCorreo] = useState(true);

  const [newPassword, setNewPassword] = useState('');

  const sortedPermCatalog = useMemo(
    () => [...rbacPermissionCatalog].sort((a, b) => a.codigo.localeCompare(b.codigo)),
    [rbacPermissionCatalog],
  );

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && password.length >= 8;
  }, [email, password]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [usersRes, depsRes, cargosRes, rbacPermRes, rbacRolesRes] = await Promise.all([
        apiClient.get<Usuario[]>('/usuarios'),
        apiClient.get<Dependencia[]>('/dependencias'),
        apiClient.get<Cargo[]>('/cargos'),
        isAdmin
          ? apiClient.get<RbacPermRow[]>('/rbac/permissions').catch(() => ({ data: [] as RbacPermRow[] }))
          : Promise.resolve({ data: [] as RbacPermRow[] }),
        isAdmin
          ? apiClient.get<RbacRoleRow[]>('/rbac/roles').catch(() => ({ data: [] as RbacRoleRow[] }))
          : Promise.resolve({ data: [] as RbacRoleRow[] }),
      ]);
      setItems(usersRes.data);
      setDependencias(depsRes.data.filter((d) => d.activo));
      setCargos(cargosRes.data.filter((c) => c.activo));
      setRbacPermissionCatalog(Array.isArray(rbacPermRes.data) ? rbacPermRes.data : []);
      setRbacRolesCatalog(Array.isArray(rbacRolesRes.data) ? rbacRolesRes.data : []);

      try {
        const { data } = await apiClient.get<AccessMatrixReferencia>(
          '/usuarios/matriz-acceso-referencia',
        );
        setMatrizReferencia(data);
      } catch {
        setMatrizReferencia(buildLocalAccessMatrixFallback());
      }
    } catch {
      setError('No se pudo cargar el listado de usuarios.');
      setMatrizReferencia(buildLocalAccessMatrixFallback());
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sincroniza tabla con API
    void load();
  }, [load]);

  useEffect(() => {
    if (!rbacRoleCodigo || rbacPermissionCatalog.length === 0) return;
    let cancelled = false;
    void (async () => {
      setRbacRolePermsLoading(true);
      try {
        const res = await apiClient.get<{ codigos: string[] }>(
          `/rbac/roles/${encodeURIComponent(rbacRoleCodigo)}/permissions`,
        );
        if (!cancelled) setRbacSelectedCodes(new Set(res.data.codigos ?? []));
      } catch {
        if (!cancelled) setRbacSelectedCodes(new Set());
      } finally {
        if (!cancelled) setRbacRolePermsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rbacRoleCodigo, rbacPermissionCatalog]);

  const toggleRbacPermission = (codigo: string) => {
    setRbacSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(codigo)) next.delete(codigo);
      else next.add(codigo);
      return next;
    });
  };

  const saveRbacMatrix = async () => {
    setRbacNotice(null);
    setRbacMatrixSaving(true);
    try {
      await apiClient.put(`/rbac/roles/${encodeURIComponent(rbacRoleCodigo)}/permissions`, {
        permissionCodes: [...rbacSelectedCodes].sort(),
      });
      setRbacNotice(
        'Matriz de permisos guardada en base de datos. Los usuarios con este rol heredan los cambios en el próximo token (o al refrescar sesión).',
      );
    } catch (err: unknown) {
      setError(
        mensajeErrorApi(
          err,
          'No se pudo guardar la matriz de permisos (revise que ejecutó el seed y que su rol tiene permisos).',
        ),
      );
    } finally {
      setRbacMatrixSaving(false);
    }
  };

  const resetIdentityForm = () => {
    setEmail('');
    setPassword('');
    setNombres('');
    setApellidos('');
    setDependenciaId('');
    setCargoId('');
    setPrimaryRole('USUARIO');
    setEditorDocComplement(false);
    setExtrasDropped([]);
    setDirectPermCodes([]);
    setInvitarPorCorreo(true);
  };

  const onPrimaryRoleChange = (codigo: PrimaryRoleCode) => {
    setPrimaryRole(codigo);
    if (codigo === 'ADMIN') setEditorDocComplement(false);
  };

  const onCreate = async () => {
    setError(null);
    setInviteNotice(null);
    try {
      const res = await apiClient.post<UsuarioCreateResponse>('/usuarios', {
        email,
        password,
        nombres: nombres.trim() || undefined,
        apellidos: apellidos.trim() || undefined,
        dependenciaId: dependenciaId || undefined,
        cargoId: cargoId || undefined,
        roles: composeRoleCodes(primaryRole, editorDocComplement),
        directPermissionCodes: directPermCodes,
        invitarPorCorreo,
      });

      const inv = res.data.invitacionCorreo;
      if (inv?.solicitada && inv.enviada) {
        setInviteNotice(
          'Usuario creado. Se envió un correo con el enlace para que defina su contraseña e inicie sesión.',
        );
      } else if (inv?.solicitada && !inv.enviada) {
        const m =
          inv.motivoOmitido === 'SMTP_NOT_CONFIGURED'
            ? 'Usuario creado, pero no hay SMTP configurado en el servidor: no se envió correo de invitación.'
            : 'Usuario creado, pero falló el envío del correo de invitación. Revise auditoría/SMTP.';
        setInviteNotice(m);
      }

      setOpen(false);
      resetIdentityForm();
      await load();
    } catch (err: unknown) {
      setError(
        mensajeErrorApi(err, 'No se pudo crear el usuario (correo duplicado o datos inválidos).'),
      );
    }
  };

  const openEdit = (u: Usuario) => {
    setSelected(u);
    setEmail(u.email);
    setNombres(u.nombres ?? '');
    setApellidos(u.apellidos ?? '');
    setDependenciaId(u.dependenciaId ?? '');
    setCargoId(u.cargoId ?? '');
    const parsed = parseRoleCodes(u.roles.map((r) => r.codigo));
    setPrimaryRole(parsed.primary);
    setEditorDocComplement(parsed.editorDoc);
    setExtrasDropped(parsed.extrasDropped);
    setDirectPermCodes([...(u.directPermissionCodes ?? [])].sort((a, b) => a.localeCompare(b)));
    setEditOpen(true);
  };

  const onUpdate = async () => {
    if (!selected) return;
    setError(null);
    try {
      await apiClient.patch(`/usuarios/${selected.id}`, {
        email,
        nombres: nombres.trim() || null,
        apellidos: apellidos.trim() || null,
        dependenciaId: dependenciaId || null,
        cargoId: cargoId || null,
        roles: composeRoleCodes(primaryRole, editorDocComplement),
        directPermissionCodes: directPermCodes,
      });
      setEditOpen(false);
      setSelected(null);
      setExtrasDropped([]);
      await load();
    } catch (err: unknown) {
      setError(
        mensajeErrorApi(
          err,
          'No se pudo actualizar el usuario. Si asignó un rol nuevo (p. ej. EDITOR_DOC), ejecute migraciones o `npx prisma db seed` en el backend.',
        ),
      );
    }
  };

  const onToggleActivo = async (u: Usuario) => {
    setError(null);
    try {
      await apiClient.patch(`/usuarios/${u.id}`, { activo: !u.activo });
      await load();
    } catch (err: unknown) {
      setError(mensajeErrorApi(err, 'No se pudo actualizar el estado del usuario.'));
    }
  };

  const openReset = (u: Usuario) => {
    setSelected(u);
    setNewPassword('');
    setResetOpen(true);
  };

  const onResetPassword = async () => {
    if (!selected) return;
    setError(null);
    try {
      await apiClient.post(`/usuarios/${selected.id}/reset-password`, {
        newPassword,
      });
      setResetOpen(false);
      setSelected(null);
    } catch (err: unknown) {
      setError(
        mensajeErrorApi(
          err,
          'No se pudo restablecer la contraseña (usuario inactivo o datos inválidos).',
        ),
      );
    }
  };

  const cargosFiltrados = useMemo(() => {
    if (!dependenciaId) return cargos;
    return cargos.filter((c) => c.dependenciaId === dependenciaId || c.dependenciaId === null);
  }, [cargos, dependenciaId]);

  const departamentoPorId = useMemo(
    () => new Map(dependencias.map((d) => [d.id, d.nombre])),
    [dependencias],
  );
  const cargoPorId = useMemo(() => new Map(cargos.map((c) => [c.id, c.nombre])), [cargos]);

  const openActionsMenu = (e: MouseEvent<HTMLElement>, u: Usuario) => {
    setActionsAnchor(e.currentTarget);
    setActionsUsuario(u);
  };

  const closeActionsMenu = () => {
    setActionsAnchor(null);
    setActionsUsuario(null);
  };

  const usuariosActivos = useMemo(() => items.filter((u) => u.activo).length, [items]);

  return (
    <Box sx={{ width: '100%', pb: { xs: 4, md: 5 } }}>
      <PageHeader
        title="Administración de identidades"
        description={
          <Stack spacing={0.75}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Usuarios y roles · GADPR-LM · Sistema de Gestión Documental
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ciclo de vida de cuentas, roles y permisos efectivos en el sistema. La matriz muestra qué puede
              hacer cada rol según las reglas actuales del servidor.
            </Typography>
          </Stack>
        }
        actions={
          <Tooltip title="Recargar usuarios y matriz de referencia">
            <IconButton
              aria-label="Actualizar administración de identidades"
              onClick={() => void load()}
              disabled={loading}
              color="primary"
              size="small"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        }
      />

      {inviteNotice && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setInviteNotice(null)}>
          {inviteNotice}
        </Alert>
      )}

      {rbacNotice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setRbacNotice(null)}>
          {rbacNotice}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Accordion
        defaultExpanded={false}
        elevation={0}
        sx={{
          mb: { xs: 2, md: 2.5 },
          ...paperCardSx,
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="tech-usuarios" id="tech-usuarios-header">
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <InfoOutlinedIcon color="primary" sx={{ opacity: 0.85 }} fontSize="small" />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Evidencia técnica y normativa (API, último ingreso)
            </Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.65 }}>
            El directorio se obtiene desde <strong>GET /usuarios</strong> (ADMIN). Referencia RBAC desde{' '}
            <strong>GET /usuarios/matriz-acceso-referencia</strong>. La matriz persistida usa{' '}
            <strong>GET/PUT /rbac/roles/:codigo/permissions</strong> (tablas <code>permissions</code> y{' '}
            <code>role_permissions</code>), aplicada por <code>@Permissions</code> +{' '}
            <code>PermissionsGuard</code> en rutas seleccionadas.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
            <strong>ISO/IEC 27001 A.5.16/A.5.18</strong> — gestión segura del ciclo de vida de identidades.{' '}
            <strong>ISO 15489</strong> — trazabilidad de decisiones institucionalizadas. La columna{' '}
            <strong>Último ingreso</strong> muestra el campo servidor <strong>ultimoLoginAt</strong> tras login con
            credenciales exitoso (no se actualiza sólo por refresh silencioso). Autorización:{' '}
            <code>@Roles</code> (menú/UI) más <code>@Permissions</code> (capacidades en BD por rol).
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Stack spacing={{ xs: 2.25, md: 3 }}>
        <Paper
          id="tabla-usuarios-institucionales"
          elevation={0}
          sx={{
            ...paperCardSx,
            p: { xs: 2.25, sm: 3, md: 3.25 },
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ mb: { xs: 1.75, md: 2 }, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
          >
            <SectionLetterHeader
              letter="U"
              title="Usuarios institucionales"
              subtitle="Identidades institucionales · roles · estado activo/inactivo"
            />
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Chip
                label={`Activos · ${usuariosActivos}`}
                size="small"
                sx={{ bgcolor: `${INSTITUTIONAL_TEAL}18`, fontWeight: 700, color: INSTITUTIONAL_NAVY }}
              />
              <Chip label={`Total · ${items.length}`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
            </Stack>
          </Stack>

          {loading ? (
            <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress aria-label="Cargando usuarios" />
            </Box>
          ) : (
            <TableContainer
              sx={{
                ...listTableContainerSx,
                maxHeight: { xs: 420, md: 560 },
                overflow: 'auto',
              }}
            >
              <Table
                size="medium"
                stickyHeader
                sx={{ tableLayout: { md: 'auto' }, minWidth: 720 }}
                aria-label="Usuarios institucionales"
              >
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 800, minWidth: 220 }}>Usuario</TableCell>
                    <TableCell sx={{ fontWeight: 800, minWidth: 120 }}>Rol</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Estado</TableCell>
                    <TableCell sx={{ fontWeight: 800, minWidth: 160 }}>Último ingreso</TableCell>
                    <TableCell sx={{ fontWeight: 800, width: 72, pr: 1 }} align="right">
                      <Typography component="span" variant="caption" sx={{ fontWeight: 800 }}>
                        Acciones
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <EmptyState
                            dense
                            title="Sin usuarios"
                            description="Cree cuentas con el botón inferior."
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((u) => (
                        <TableRow key={u.id} hover>
                          <TableCell>
                            <Typography sx={{ fontWeight: 700 }}>{displayUsuario(u)}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {u.email}
                            </Typography>
                            {(() => {
                              const dn = u.dependenciaId
                                ? departamentoPorId.get(u.dependenciaId)
                                : null;
                              const cn = u.cargoId ? cargoPorId.get(u.cargoId) : null;
                              const org = [cn, dn].filter(Boolean).join(' · ');
                              return org ? (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  {org}
                                </Typography>
                              ) : null;
                            })()}
                          </TableCell>
                          <TableCell sx={{ maxWidth: 280 }}>
                            <RoleChips u={u} />
                            {(u.directPermissionCodes?.length ?? 0) > 0 ? (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', mt: 0.35, lineHeight: 1.25 }}
                              >
                                Directos:{' '}
                                {u.directPermissionCodes!
                                  .slice(0, 5)
                                  .join(', ')}
                                {u.directPermissionCodes!.length > 5 ? '…' : ''}
                              </Typography>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={u.activo ? 'Activo' : 'Suspendido'}
                              color={u.activo ? 'success' : 'error'}
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 160 }}>
                            {(() => {
                              const fmt = formatUltimoIngreso(u.ultimoLoginAt ?? null);
                              return (
                                <Stack spacing={0.25}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {fmt.relativo}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                                    {fmt.absoluto}
                                  </Typography>
                                </Stack>
                              );
                            })()}
                          </TableCell>
                          <TableCell align="right" sx={{ pr: 0.5, whiteSpace: 'nowrap' }}>
                            <Tooltip title="Acciones del usuario">
                              <IconButton
                                size="small"
                                aria-label={`Acciones para ${displayUsuario(u)}`}
                                onClick={(e) => openActionsMenu(e, u)}
                              >
                                <MoreHorizRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2.5 }}>
              {isAdmin ? (
                <Button
                  variant="contained"
                  color="secondary"
                  fullWidth
                  sx={{
                    textTransform: 'none',
                    fontWeight: 800,
                    py: 1.15,
                  }}
                  onClick={() => {
                    setInviteNotice(null);
                    resetIdentityForm();
                    setOpen(true);
                  }}
                >
                  Crear usuario
                </Button>
              ) : null}
              <Button
                fullWidth
                variant="outlined"
                href="#matriz-rbac"
                sx={{ textTransform: 'none', fontWeight: 700, py: 1.15 }}
              >
                Ver matriz RBAC
              </Button>
              {isAdmin ? (
                <Button
                  fullWidth
                  variant="outlined"
                  href="#matriz-role-permissions-bd"
                  sx={{ textTransform: 'none', fontWeight: 700, py: 1.15 }}
                >
                  Permisos por rol (BD)
                </Button>
              ) : null}
            </Stack>
          </Paper>

          {isAdmin ? (
            <Paper
              id="matriz-role-permissions-bd"
              elevation={0}
              sx={{ ...paperCardSx, p: { xs: 2.25, sm: 3, md: 3.25 } }}
            >
              <SectionLetterHeader
                letter="P"
                accent="teal"
                title="Matriz rol ↔ permiso (base de datos)"
                subtitle="Asignación persistida · `role_permissions` · fuente de verdad para `PermissionsGuard`"
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2, lineHeight: 1.6 }}>
                Aquí concede o revoca <strong>códigos de permiso</strong> por <strong>rol institucional</strong>. Si la
                lista aparece vacía, ejecute <code>npx prisma db seed</code> en el servidor (crea permisos y valores por
                defecto).
              </Typography>
              {rbacPermissionCatalog.length === 0 ? (
                <Alert severity="warning">
                  No hay permisos en catálogo. Verifique backend actualizado y seed ejecutado.
                </Alert>
              ) : (
                <>
                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel id="rbac-role-label">Rol a editar</InputLabel>
                    <Select<RbacRoleRow['codigo']>
                      labelId="rbac-role-label"
                      label="Rol a editar"
                      value={
                        rbacRolesCatalog.some((r) => r.codigo === rbacRoleCodigo) ? rbacRoleCodigo : ''
                      }
                      onChange={(e) => setRbacRoleCodigo(String(e.target.value))}
                    >
                      {rbacRolesCatalog.map((r) => (
                        <MenuItem key={r.id} value={r.codigo}>
                          {r.nombre} ({r.codigo})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {rbacRoleCodigo === 'ADMIN' ? (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      Modificar los permisos del rol ADMIN puede impedir operaciones administrativas. Mantenga todos los
                      códigos a menos que tenga un plan explícito de segregación de funciones.
                    </Alert>
                  ) : null}
                  <Box
                    sx={{
                      maxHeight: 420,
                      overflow: 'auto',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: 1.5,
                      bgcolor: 'grey.50',
                    }}
                    aria-busy={rbacRolePermsLoading || rbacMatrixSaving}
                  >
                    {rbacRolePermsLoading ? (
                      <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                        <CircularProgress size={32} aria-label="Cargando permisos del rol" />
                      </Box>
                    ) : (
                      rbacPermissionCatalog
                        .slice()
                        .sort((a, b) => a.codigo.localeCompare(b.codigo))
                        .map((p) => (
                          <FormControlLabel
                            key={p.id}
                            sx={{ display: 'flex', alignItems: 'flex-start', ml: 0, mb: 0.5 }}
                            control={
                              <Checkbox
                                size="small"
                                checked={rbacSelectedCodes.has(p.codigo)}
                                onChange={() => toggleRbacPermission(p.codigo)}
                              />
                            }
                            label={
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                  {p.codigo}
                                </Typography>
                                {p.descripcion ? (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    {p.descripcion}
                                  </Typography>
                                ) : null}
                              </Box>
                            }
                          />
                        ))
                    )}
                  </Box>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      disabled={rbacMatrixSaving || rbacRolePermsLoading || !rbacRoleCodigo}
                      onClick={() => void saveRbacMatrix()}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 800,
                        bgcolor: INSTITUTIONAL_NAVY,
                        '&:hover': { bgcolor: '#132030' },
                      }}
                    >
                      {rbacMatrixSaving ? 'Guardando…' : 'Guardar permisos del rol'}
                    </Button>
                    <Button
                      variant="outlined"
                      href="#matriz-rbac"
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      Ver matriz de referencia (rutas)
                    </Button>
                  </Stack>
                </>
              )}
            </Paper>
          ) : null}

        <Paper
          id="matriz-rbac"
          elevation={0}
          sx={{ ...paperCardSx, p: { xs: 2.25, sm: 3, md: 3.25 } }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ mb: 2, alignItems: { md: 'flex-start' }, justifyContent: 'space-between' }}
          >
            <SectionLetterHeader
              letter="M"
              accent="blue"
              title="Matriz de permisos (referencia)"
              subtitle="Lectura · comparación por rol · desplazamiento horizontal si aplica"
            />
            <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 520, lineHeight: 1.55 }}>
              Para otorgar o quitar acceso a una persona use <strong>Editar</strong> en el directorio. Detalle de fuentes
              API y normativa en el acordeón superior.
            </Typography>
          </Stack>

            <TableContainer
              sx={{
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                overflowX: 'auto',
                overflowY: 'hidden',
                bgcolor: 'rgba(248, 250, 252, 0.6)',
                maxWidth: '100%',
              }}
            >
              <Table size="small" sx={{ minWidth: 720 }} aria-label="Matriz de permisos por rol">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ ...matrixStickyModuleHeadSx, fontWeight: 800 }}>Módulo</TableCell>
                    {matrizReferencia.columnas.map((c) => (
                      <TableCell key={c} align="center" sx={{ fontWeight: 700, px: 0.5 }}>
                        <Tooltip title={`Código rol: ${c}`}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', lineHeight: 1.1 }}>
                              {ROL_COLUMNA_ETIQUETA[c] ?? c}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block', fontSize: '0.65rem' }}
                            >
                              {c}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {matrizReferencia.filas.map((row) => (
                    <TableRow key={row.modulo} hover>
                      <TableCell sx={matrixStickyModuleSx}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {row.modulo}
                        </Typography>
                        {row.ayuda ? (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35 }}>
                            {row.ayuda}
                          </Typography>
                        ) : null}
                      </TableCell>
                      {matrizReferencia.columnas.map((c) => (
                        <MatrixCell key={c} allowed={Boolean(row.porRol[c])} />
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Stack spacing={0.75} sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5 }}>
                {matrizReferencia.nota}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Generado:{' '}
                <time dateTime={matrizReferencia.generadoEn}>
                  {new Date(matrizReferencia.generadoEn).toLocaleString('es-EC')}
                </time>
              </Typography>
            </Stack>

            <Button
              fullWidth
              component="a"
              href="#tabla-usuarios-institucionales"
              variant="outlined"
              color="primary"
              sx={{ mt: 2, textTransform: 'none', fontWeight: 700, py: 1 }}
            >
              Volver al directorio de usuarios
            </Button>
          </Paper>
      </Stack>

      <Menu
        anchorEl={actionsAnchor}
        open={Boolean(actionsAnchor)}
        onClose={closeActionsMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: { sx: { minWidth: 200, mt: 0.5 } },
        }}
      >
        {isAdmin ? (
          <>
            <MenuItem
              dense
              onClick={() => {
                if (!actionsUsuario) return;
                const u = actionsUsuario;
                closeActionsMenu();
                openEdit(u);
              }}
            >
              <ListItemText primary="Editar usuario" secondary="Roles, dependencia, cargo" />
            </MenuItem>
            <MenuItem
              dense
              onClick={() => {
                if (!actionsUsuario) return;
                const u = actionsUsuario;
                closeActionsMenu();
                openReset(u);
              }}
            >
              <ListItemText primary="Restablecer contraseña" />
            </MenuItem>
            <MenuItem
              dense
              sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 0.5 }}
              onClick={() => {
                if (!actionsUsuario) return;
                const u = actionsUsuario;
                closeActionsMenu();
                void onToggleActivo(u);
              }}
            >
              <ListItemText
                primary={actionsUsuario?.activo ? 'Desactivar cuenta' : 'Activar cuenta'}
                slotProps={{
                  primary: {
                    sx: {
                      fontWeight: 600,
                      ...(actionsUsuario?.activo ? { color: 'warning.main' } : {}),
                    },
                  },
                }}
              />
            </MenuItem>
          </>
        ) : (
          <MenuItem dense disabled>
            <ListItemText primary="Acciones restringidas" secondary="Solo ADMIN" />
          </MenuItem>
        )}
      </Menu>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Crear usuario</DialogTitle>
        <DialogContent>
          <TextField
            label="Correo"
            type="email"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <TextField
            label="Contraseña temporal"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helperText={
              invitarPorCorreo
                ? 'Temporal hasta que el usuario defina contraseña con el enlace del correo. Mínimo 8 caracteres.'
                : 'Mínimo 8 caracteres; el usuario deberá usar esta contraseña para iniciar sesión.'
            }
            autoComplete="new-password"
          />
          <FormControlLabel
            sx={{ mt: 1 }}
            control={
              <Checkbox
                checked={invitarPorCorreo}
                onChange={(_, checked) => setInvitarPorCorreo(checked)}
              />
            }
            label="Enviar al correo un enlace para que defina su contraseña (recomendado)"
          />
          <TextField
            label="Nombres"
            fullWidth
            margin="normal"
            value={nombres}
            onChange={(e) => setNombres(e.target.value)}
          />
          <TextField
            label="Apellidos"
            fullWidth
            margin="normal"
            value={apellidos}
            onChange={(e) => setApellidos(e.target.value)}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel id="dep-label">Dependencia</InputLabel>
            <Select
              labelId="dep-label"
              value={dependenciaId}
              label="Dependencia"
              onChange={(e) => setDependenciaId(e.target.value)}
            >
              <MenuItem value="">
                <em>—</em>
              </MenuItem>
              {dependencias.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.codigo} — {d.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel id="cargo-label">Cargo</InputLabel>
            <Select
              labelId="cargo-label"
              value={cargoId}
              label="Cargo"
              onChange={(e) => setCargoId(e.target.value)}
            >
              <MenuItem value="">
                <em>—</em>
              </MenuItem>
              {cargosFiltrados.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.codigo} — {c.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <RoleAssignmentFields
            idPrefix="crear"
            primaryRole={primaryRole}
            onPrimaryRoleChange={onPrimaryRoleChange}
            editorDocComplement={editorDocComplement}
            onEditorDocChange={setEditorDocComplement}
          />
          <PermissionCodesPicker
            catalog={sortedPermCatalog}
            value={directPermCodes}
            onChange={setDirectPermCodes}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} variant="text">
            Cancelar
          </Button>
          <Button onClick={() => void onCreate()} variant="contained" disabled={!canSubmit}>
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelected(null);
          setExtrasDropped([]);
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Editar usuario</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mt: 1, mb: 1 }}>
            Elija <strong>un rol institucional</strong> (el que debe tener esta persona). El
            complemento <strong>Editor documental</strong> es opcional. Los permisos directos se
            suman al rol; el efecto completo se nota al iniciar sesión de nuevo o al renovar el
            token.
          </Alert>
          <TextField
            label="Correo"
            type="email"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <TextField
            label="Nombres"
            fullWidth
            margin="normal"
            value={nombres}
            onChange={(e) => setNombres(e.target.value)}
          />
          <TextField
            label="Apellidos"
            fullWidth
            margin="normal"
            value={apellidos}
            onChange={(e) => setApellidos(e.target.value)}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel id="dep2-label">Dependencia</InputLabel>
            <Select
              labelId="dep2-label"
              value={dependenciaId}
              label="Dependencia"
              onChange={(e) => setDependenciaId(e.target.value)}
            >
              <MenuItem value="">
                <em>—</em>
              </MenuItem>
              {dependencias.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.codigo} — {d.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel id="cargo2-label">Cargo</InputLabel>
            <Select
              labelId="cargo2-label"
              value={cargoId}
              label="Cargo"
              onChange={(e) => setCargoId(e.target.value)}
            >
              <MenuItem value="">
                <em>—</em>
              </MenuItem>
              {cargosFiltrados.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.codigo} — {c.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <RoleAssignmentFields
            idPrefix="editar"
            primaryRole={primaryRole}
            onPrimaryRoleChange={onPrimaryRoleChange}
            editorDocComplement={editorDocComplement}
            onEditorDocChange={setEditorDocComplement}
            extrasDropped={extrasDropped}
          />
          <PermissionCodesPicker
            catalog={sortedPermCatalog}
            value={directPermCodes}
            onChange={setDirectPermCodes}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditOpen(false);
              setSelected(null);
              setExtrasDropped([]);
            }}
            variant="text"
          >
            Cancelar
          </Button>
          <Button onClick={() => void onUpdate()} variant="contained" disabled={!selected}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Restablecer contraseña</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Se invalidarán las sesiones activas del usuario.
          </Typography>
          <TextField
            label="Nueva contraseña"
            type="password"
            fullWidth
            margin="normal"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText="Mínimo 8 caracteres."
            autoComplete="new-password"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setResetOpen(false);
              setSelected(null);
            }}
            variant="text"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => void onResetPassword()}
            variant="contained"
            disabled={!selected || newPassword.length < 8}
          >
            Restablecer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
