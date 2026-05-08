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
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  ListItemText,
  MenuItem,
  Menu,
  Paper,
  Select,
  type SelectChangeEvent,
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
import { isAxiosError } from 'axios';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import {
  buildLocalAccessMatrixFallback,
  type AccessMatrixReferencia,
} from '../../constants/roles-access-matrix';
import { formatUltimoIngreso } from '../../utils/formatUltimoIngreso';

const INSTITUTIONAL_TEAL = '#2D8A99';
const INSTITUTIONAL_TEAL_SOFT = 'rgba(45, 138, 153, 0.14)';
const INSTITUTIONAL_NAVY = '#1A2B3C';

const paperCardSx = {
  borderRadius: 3,
  border: '1px solid rgba(15, 23, 42, 0.08)',
  boxShadow: '0 14px 46px rgba(15, 23, 42, 0.08)',
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

function mensajeErrorApi(err: unknown, fallback: string): string {
  if (isAxiosError(err) && err.response?.data) {
    const d = err.response.data as { message?: string | string[] };
    const m = d.message;
    if (Array.isArray(m)) return m.join(' ');
    if (typeof m === 'string' && m.trim()) return m;
  }
  return fallback;
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

function formatRoles(u: Usuario) {
  if (!u.roles.length) return '—';
  return u.roles.map((r) => r.nombre || r.codigo).join(', ');
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
  const [roles, setRoles] = useState<(typeof ROLE_OPTIONS)[number][]>(['USUARIO']);
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
        roles,
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
      setEmail('');
      setPassword('');
      setNombres('');
      setApellidos('');
      setDependenciaId('');
      setCargoId('');
      setRoles(['USUARIO']);
      setDirectPermCodes([]);
      setInvitarPorCorreo(true);
      await load();
    } catch (err: unknown) {
      setError(
        mensajeErrorApi(err, 'No se pudo crear el usuario (correo duplicado o datos inválidos).'),
      );
    }
  };

  const handleDirectPermChange = (e: SelectChangeEvent<string[]>) => {
    const value = e.target.value as string[];
    setDirectPermCodes([...new Set(value)].sort((a, b) => a.localeCompare(b)));
  };

  const openEdit = (u: Usuario) => {
    setSelected(u);
    setEmail(u.email);
    setNombres(u.nombres ?? '');
    setApellidos(u.apellidos ?? '');
    setDependenciaId(u.dependenciaId ?? '');
    setCargoId(u.cargoId ?? '');
    setRoles(
      (u.roles.map((r) => r.codigo).filter((c): c is (typeof ROLE_OPTIONS)[number] =>
        (ROLE_OPTIONS as readonly string[]).includes(c),
      ) as (typeof ROLE_OPTIONS)[number][]) || ['USUARIO'],
    );
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
        roles,
        directPermissionCodes: directPermCodes,
      });
      setEditOpen(false);
      setSelected(null);
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

  const handleRolesChange = (e: SelectChangeEvent<string[]>) => {
    const value = e.target.value as string[];
    const next = value.filter((v): v is (typeof ROLE_OPTIONS)[number] =>
      (ROLE_OPTIONS as readonly string[]).includes(v),
    );
    setRoles(next.length ? next : ['USUARIO']);
  };

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
    <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 4, md: 5 } }}>
      <PageHeader
        title="Administración de identidades"
        description={
          <Stack spacing={0.75}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Usuarios y roles · GADPR-LM · Sistema de Gestión Documental
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ciclo de vida de cuentas y matriz RBAC de referencia, con alcance institucional (ISO/IEC 27001, gestión de
              registros, OWASP ASVS).
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
              subtitle="Identidades institucionales · roles RBAC · estado activo/inactivo"
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
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
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
                          <TableCell sx={{ maxWidth: 200 }}>
                            <Typography variant="body2">{formatRoles(u)}</Typography>
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
                  fullWidth
                  sx={{
                    textTransform: 'none',
                    fontWeight: 800,
                    bgcolor: INSTITUTIONAL_TEAL,
                    py: 1.15,
                    '&:hover': { bgcolor: '#257a87' },
                  }}
                  onClick={() => {
                    setInviteNotice(null);
                    setDirectPermCodes([]);
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
          <FormControl fullWidth margin="normal">
            <InputLabel id="roles-label">Roles</InputLabel>
            <Select
              labelId="roles-label"
              multiple
              value={roles}
              label="Roles"
              onChange={handleRolesChange}
            >
              {ROLE_OPTIONS.map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel id="direct-perms-create-label">Permisos directos (solo esta cuenta)</InputLabel>
            <Select
              labelId="direct-perms-create-label"
              multiple
              value={directPermCodes}
              label="Permisos directos (solo esta cuenta)"
              onChange={handleDirectPermChange}
              disabled={sortedPermCatalog.length === 0}
              renderValue={(selected) =>
                (selected as string[]).length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Ninguno — solo hereda del rol
                  </Typography>
                ) : (
                  <Typography variant="body2" sx={{ whiteSpace: 'normal' }}>
                    {(selected as string[]).join(', ')}
                  </Typography>
                )
              }
            >
              {sortedPermCatalog.map((p) => (
                <MenuItem key={p.codigo} value={p.codigo}>
                  <ListItemText primary={p.codigo} secondary={p.descripcion ?? undefined} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Editar usuario</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mt: 1, mb: 1 }}>
            Puede asignar <strong>permisos directos</strong> a esta persona (p. ej.{' '}
            <code>DOC_FILES_UPLOAD</code>) además de los que aporten sus roles. El efecto se nota al
            iniciar sesión de nuevo o al renovar el token.
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
          <FormControl fullWidth margin="normal">
            <InputLabel id="roles2-label">Roles</InputLabel>
            <Select
              labelId="roles2-label"
              multiple
              value={roles}
              label="Roles"
              onChange={handleRolesChange}
            >
              {ROLE_OPTIONS.map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel id="direct-perms-edit-label">Permisos directos (solo esta cuenta)</InputLabel>
            <Select
              labelId="direct-perms-edit-label"
              multiple
              value={directPermCodes}
              label="Permisos directos (solo esta cuenta)"
              onChange={handleDirectPermChange}
              disabled={sortedPermCatalog.length === 0}
              renderValue={(selected) =>
                (selected as string[]).length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Ninguno — solo hereda del rol
                  </Typography>
                ) : (
                  <Typography variant="body2" sx={{ whiteSpace: 'normal' }}>
                    {(selected as string[]).join(', ')}
                  </Typography>
                )
              }
            >
              {sortedPermCatalog.map((p) => (
                <MenuItem key={p.codigo} value={p.codigo}>
                  <ListItemText primary={p.codigo} secondary={p.descripcion ?? undefined} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditOpen(false);
              setSelected(null);
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
    </Container>
  );
}
