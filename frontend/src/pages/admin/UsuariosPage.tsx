import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
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
  IconButton,
  InputLabel,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState, type MouseEvent, type ReactNode, type SyntheticEvent } from 'react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { userHasAdminAccess, userIsSuperAdmin } from '../../auth/role-utils';
import { AccessMatrix } from '../../components/admin/AccessMatrix';
import { AdditionalPermissionsSection } from '../../components/admin/AdditionalPermissionsSection';
import { RolePermissionsPanel } from '../../components/admin/RolePermissionsPanel';
import { UserAccessDrawer } from '../../components/admin/UserAccessDrawer';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { ListPanel } from '../../components/ListPanel';
import { listSurfaceSx, listTableContainerSx } from '../../components/listSurfaces';
import {
  FILTER_ROLE_OPTIONS,
  composeRoleCodes,
  isPrimaryRoleCode,
  isRoleCode,
  parseRoleCodes,
  PRIMARY_ROLE_HELP,
  PRIMARY_ROLE_OPTIONS,
  ROLE_DISPLAY_NAME,
  type PrimaryRoleCode,
  userIsSuperAdminAccount,
} from '../../constants/role-display';
import {
  buildLocalAccessMatrixFallback,
  type AccessMatrixReferencia,
} from '../../constants/roles-access-matrix';
import { formatUltimoIngreso } from '../../utils/formatUltimoIngreso';
import { getApiErrorMessage } from '../../utils/api-error-message';
import { administrativeInputOnChange } from '../../utils/form-text';

const paperCardSx = {
  ...listSurfaceSx,
} as const;

type TabPanelProps = { children?: ReactNode; index: number; value: number };

function TabPanel({ children, value, index }: TabPanelProps) {
  if (value !== index) return null;
  return <Box role="tabpanel" sx={{ pt: { xs: 2, md: 2.5 } }}>{children}</Box>;
}

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

function mensajeErrorApi(err: unknown, fallback: string): string {
  return getApiErrorMessage(err, fallback);
}

function displayUsuario(u: Usuario) {
  const n = `${u.nombres ?? ''} ${u.apellidos ?? ''}`.trim();
  return n || u.email;
}

function roleChipLabel(r: { codigo: string; nombre: string }) {
  if (r.codigo === 'SUPERADMIN') return 'Super Administrador';
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
  const isSuper = userIsSuperAdminAccount(u.roles);

  return (
    <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
      {isSuper ? (
        <Tooltip title="Cuenta protegida del sistema.">
          <Chip
            size="small"
            icon={<ShieldOutlinedIcon />}
            label="Super Administrador"
            color="primary"
            sx={{ fontWeight: 700 }}
          />
        </Tooltip>
      ) : null}
      {u.roles
        .filter((r) => r.codigo !== 'SUPERADMIN')
        .map((r) => (
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
  disabled,
}: {
  idPrefix: string;
  primaryRole: PrimaryRoleCode;
  onPrimaryRoleChange: (codigo: PrimaryRoleCode) => void;
  editorDocComplement: boolean;
  onEditorDocChange: (checked: boolean) => void;
  extrasDropped?: string[];
  disabled?: boolean;
}) {
  const editorDisabled = primaryRole === 'ADMIN' || disabled;
  const labelId = `${idPrefix}-rol-principal-label`;
  return (
    <Box sx={{ mt: 1.5 }}>
      {extrasDropped && extrasDropped.length > 0 ? (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          Esta cuenta tenía varios roles institucionales (
          {extrasDropped.map((c) => (isRoleCode(c) ? ROLE_DISPLAY_NAME[c] : c)).join(', ')}
          ). Elija <strong>un rol</strong> abajo. Al guardar se reemplazarán los demás.
        </Alert>
      ) : null}
      <FormControl component="fieldset" fullWidth disabled={disabled}>
        <FormLabel id={labelId} sx={{ fontWeight: 800, color: 'text.primary', mb: 0.75 }}>
          Rol institucional
        </FormLabel>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          El rol define el conjunto principal de capacidades de la cuenta.
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
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35 }}>
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
          disabled={editorDisabled}
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
                {ROLE_DISPLAY_NAME.EDITOR_DOC}
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                  · Permiso adicional
                </Typography>
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35 }}>
                {editorDisabled
                  ? 'No aplica: el administrador ya incluye estas capacidades.'
                  : 'Permite crear y modificar documentos y archivos.'}
              </Typography>
            </Box>
          }
        />
      </FormGroup>
    </Box>
  );
}

export function UsuariosPage() {
  const { user } = useAuth();
  const isAdmin = userHasAdminAccess(user?.roles);
  const isSuperAdmin = userIsSuperAdmin(user?.roles);
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

  const [mainTab, setMainTab] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterRol, setFilterRol] = useState('');
  const [accessDrawerOpen, setAccessDrawerOpen] = useState(false);
  const [accessUsuario, setAccessUsuario] = useState<Usuario | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [dependenciaId, setDependenciaId] = useState<string>('');
  const [cargoId, setCargoId] = useState<string>('');
  const [primaryRole, setPrimaryRole] = useState<PrimaryRoleCode>('USUARIO');
  const [editorDocComplement, setEditorDocComplement] = useState(false);
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

  const resetIdentityForm = () => {
    setEmail('');
    setPassword('');
    setNombres('');
    setApellidos('');
    setDependenciaId('');
    setCargoId('');
    setPrimaryRole('USUARIO');
    setEditorDocComplement(false);
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

  const openAccessDrawer = (u: Usuario) => {
    setAccessUsuario(u);
    setAccessDrawerOpen(true);
  };

  const handleAccessUpdated = (updated: Usuario) => {
    setAccessUsuario(updated);
    setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
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

  const openActionsMenu = (e: MouseEvent<HTMLElement>, u: Usuario) => {
    setActionsAnchor(e.currentTarget);
    setActionsUsuario(u);
  };

  const closeActionsMenu = () => {
    setActionsAnchor(null);
    setActionsUsuario(null);
  };

  const usuariosActivos = useMemo(() => items.filter((u) => u.activo).length, [items]);

  const filteredItems = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return items.filter((u) => {
      if (filterEstado === 'active' && !u.activo) return false;
      if (filterEstado === 'inactive' && u.activo) return false;
      if (filterRol) {
        const codes = u.roles.map((r) => r.codigo);
        if (filterRol === 'EDITOR_DOC') {
          if (!codes.includes('EDITOR_DOC')) return false;
        } else if (!codes.includes(filterRol)) {
          return false;
        }
      }
      if (!q) return true;
      const name = displayUsuario(u).toLowerCase();
      return name.includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [items, userSearch, filterEstado, filterRol]);

  const selectedIsSuperAdmin = selected ? userIsSuperAdminAccount(selected.roles) : false;
  const actionsTargetIsSuper = actionsUsuario ? userIsSuperAdminAccount(actionsUsuario.roles) : false;
  const canMutateTarget =
    isAdmin && actionsUsuario && (!actionsTargetIsSuper || isSuperAdmin);

  const handleMainTabChange = (_: SyntheticEvent, next: number) => {
    setMainTab(next);
  };

  return (
    <Box sx={{ width: '100%', pb: { xs: 4, md: 5 } }}>
      <PageHeader
        title="Administración de identidades"
        description="Administre usuarios, roles y niveles de acceso del sistema."
        actions={
          <Tooltip title="Recargar datos">
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

      {inviteNotice ? (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setInviteNotice(null)}>
          {inviteNotice}
        </Alert>
      ) : null}

      {rbacNotice ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setRbacNotice(null)}>
          {rbacNotice}
        </Alert>
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Paper elevation={0} sx={{ ...paperCardSx, mb: 2 }}>
        <Tabs
          value={mainTab}
          onChange={handleMainTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Administración de identidades"
        >
          <Tab icon={<PeopleOutlinedIcon />} iconPosition="start" label="Usuarios" />
          {isAdmin ? (
            <Tab icon={<VpnKeyOutlinedIcon />} iconPosition="start" label="Roles y permisos" />
          ) : null}
          <Tab icon={<TableChartOutlinedIcon />} iconPosition="start" label="Matriz de acceso" />
        </Tabs>
      </Paper>

      <TabPanel value={mainTab} index={0}>
        <ListPanel
          badge={<PeopleOutlinedIcon fontSize="small" />}
          title="Usuarios institucionales"
          subtitle="Administre las cuentas, roles y estado de los usuarios del sistema."
          meta={
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Chip label={`Activos · ${usuariosActivos}`} size="small" color="success" sx={{ fontWeight: 700 }} />
              <Chip label={`Total · ${items.length}`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
              <Chip
                label={`Mostrando · ${filteredItems.length}`}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 700 }}
              />
            </Stack>
          }
          footer={
            isAdmin ? (
              <Button
                variant="contained"
                color="secondary"
                fullWidth
                sx={{ textTransform: 'none', fontWeight: 800, py: 1.15 }}
                onClick={() => {
                  setInviteNotice(null);
                  resetIdentityForm();
                  setOpen(true);
                }}
              >
                + Crear usuario
              </Button>
            ) : null
          }
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            sx={{ mb: 2, alignItems: { md: 'flex-end' } }}
          >
            <TextField
              size="small"
              label="Buscar usuario"
              placeholder="Nombre o correo…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              fullWidth
              sx={{ maxWidth: { md: 360 } }}
            />
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 160 } }}>
              <InputLabel id="filter-estado">Estado</InputLabel>
              <Select
                labelId="filter-estado"
                label="Estado"
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value as typeof filterEstado)}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="active">Activos</MenuItem>
                <MenuItem value="inactive">Inactivos</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }}>
              <InputLabel id="filter-rol">Rol</InputLabel>
              <Select
                labelId="filter-rol"
                label="Rol"
                value={filterRol}
                onChange={(e) => setFilterRol(String(e.target.value))}
              >
                {FILTER_ROLE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {loading ? (
            <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress aria-label="Cargando usuarios" />
            </Box>
          ) : (
            <TableContainer sx={{ ...listTableContainerSx, maxHeight: { xs: 480, md: 620 }, overflow: 'auto' }}>
              <Table size="medium" stickyHeader sx={{ minWidth: 860 }} aria-label="Usuarios institucionales">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 800, minWidth: 200 }}>Usuario</TableCell>
                    <TableCell sx={{ fontWeight: 800, minWidth: 140 }}>Rol</TableCell>
                    <TableCell sx={{ fontWeight: 800, minWidth: 160 }}>Área / Dependencia</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Estado</TableCell>
                    <TableCell sx={{ fontWeight: 800, minWidth: 140 }}>Último acceso</TableCell>
                    <TableCell sx={{ fontWeight: 800, width: 72 }} align="right">
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <EmptyState
                          dense
                          title={items.length === 0 ? 'Sin usuarios' : 'Sin coincidencias'}
                          description={
                            items.length === 0
                              ? 'Cree cuentas con el botón Crear usuario.'
                              : 'Ajuste la búsqueda o los filtros.'
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((u) => {
                      const fmt = formatUltimoIngreso(u.ultimoLoginAt ?? null);
                      const dn = u.dependenciaId ? departamentoPorId.get(u.dependenciaId) : null;
                      const cn = u.cargoId ? cargoPorId.get(u.cargoId) : null;
                      const extraCount = u.directPermissionCodes?.length ?? 0;
                      return (
                        <TableRow key={u.id} hover>
                          <TableCell>
                            <Typography sx={{ fontWeight: 700 }}>{displayUsuario(u)}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {u.email}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <RoleChips u={u} />
                            {extraCount > 0 ? (
                              <Chip
                                size="small"
                                variant="outlined"
                                label={`${extraCount} permiso${extraCount === 1 ? '' : 's'} adicional${extraCount === 1 ? '' : 'es'}`}
                                sx={{ mt: 0.5, fontWeight: 600 }}
                              />
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {dn ?? '—'}
                            </Typography>
                            {cn ? (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {cn}
                              </Typography>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={u.activo ? 'Activo' : 'Inactivo'}
                              color={u.activo ? 'success' : 'default'}
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title={fmt.absoluto}>
                              <Typography variant="body2" sx={{ fontWeight: 600, cursor: 'default' }}>
                                {fmt.relativo}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell align="right">
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
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </ListPanel>
      </TabPanel>

      {isAdmin ? (
        <TabPanel value={mainTab} index={1}>
          <RolePermissionsPanel
            catalog={rbacPermissionCatalog}
            rolesCatalog={rbacRolesCatalog}
            onSaved={setRbacNotice}
            onError={setError}
          />
        </TabPanel>
      ) : null}

      <TabPanel value={mainTab} index={isAdmin ? 2 : 1}>
        <AccessMatrix matrizReferencia={matrizReferencia} />
      </TabPanel>

      <Accordion
        defaultExpanded={false}
        elevation={0}
        sx={{ mt: 3, ...paperCardSx, '&:before': { display: 'none' } }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="tech-usuarios" id="tech-usuarios-header">
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <InfoOutlinedIcon color="primary" sx={{ opacity: 0.85 }} fontSize="small" />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Información técnica
            </Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.65 }}>
            Directorio: <strong>GET /usuarios</strong>. Matriz referencia:{' '}
            <strong>GET /usuarios/matriz-acceso-referencia</strong>. Permisos por rol:{' '}
            <strong>GET/PUT /rbac/roles/:codigo/permissions</strong> (<code>role_permissions</code>,{' '}
            <code>PermissionsGuard</code>).
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
            <strong>ISO/IEC 27001 A.5.16/A.5.18</strong> — ciclo de vida de identidades.{' '}
            <strong>ISO 15489</strong> — trazabilidad institucional. Último acceso: campo{' '}
            <strong>ultimoLoginAt</strong> tras login con credenciales (no refresh silencioso).
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Menu
        anchorEl={actionsAnchor}
        open={Boolean(actionsAnchor)}
        onClose={closeActionsMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: { sx: { minWidth: 240, mt: 0.5 } },
        }}
      >
        {canMutateTarget ? (
          <>
            <MenuItem
              dense
              onClick={() => {
                if (!actionsUsuario) return;
                const u = actionsUsuario;
                closeActionsMenu();
                openAccessDrawer(u);
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <VpnKeyOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Gestionar acceso"
                secondary="Roles, permisos efectivos y adicionales"
              />
            </MenuItem>
            <MenuItem
              dense
              onClick={() => {
                if (!actionsUsuario) return;
                const u = actionsUsuario;
                closeActionsMenu();
                openEdit(u);
              }}
            >
              <ListItemText primary="Editar datos" secondary="Correo, nombres, dependencia y cargo" />
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
            {!actionsTargetIsSuper || isSuperAdmin ? (
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
                  primary={actionsUsuario?.activo ? 'Desactivar' : 'Activar'}
                  secondary={actionsUsuario?.activo ? 'Suspender acceso' : 'Rehabilitar cuenta'}
                  slotProps={{
                    primary: {
                      sx: {
                        fontWeight: 600,
                        ...(actionsUsuario?.activo ? { color: 'warning.main' } : { color: 'success.main' }),
                      },
                    },
                  }}
                />
              </MenuItem>
            ) : null}
          </>
        ) : actionsTargetIsSuper ? (
          <MenuItem dense disabled>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <ShieldOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Cuenta protegida"
              secondary="Super Administrador — no modificable"
            />
          </MenuItem>
        ) : (
          <MenuItem dense disabled>
            <ListItemText primary="Acciones restringidas" secondary="Requiere permisos de administración" />
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
            onChange={administrativeInputOnChange(setNombres)}
          />
          <TextField
            label="Apellidos"
            fullWidth
            margin="normal"
            value={apellidos}
            onChange={administrativeInputOnChange(setApellidos)}
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
          <AdditionalPermissionsSection
            catalog={sortedPermCatalog}
            value={directPermCodes}
            onChange={setDirectPermCodes}
            roleCodes={composeRoleCodes(primaryRole, editorDocComplement)}
            restrictCriticalForAdmin={!isSuperAdmin}
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
        }}
        fullWidth
        maxWidth="md"
        scroll="paper"
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack spacing={0.5}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {selected ? displayUsuario(selected) : 'Editar usuario'}
            </Typography>
            {selected ? (
              <Typography variant="body2" color="text.secondary">
                {selected.email}
              </Typography>
            ) : null}
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {selected ? (
            <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Estado
                  </Typography>
                  <Box>
                    <Chip
                      size="small"
                      label={selected.activo ? 'Activo' : 'Inactivo'}
                      color={selected.activo ? 'success' : 'default'}
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Roles
                  </Typography>
                  <Box sx={{ mt: 0.25 }}>
                    <RoleChips u={selected} />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Dependencia
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {selected.dependenciaId
                      ? (departamentoPorId.get(selected.dependenciaId) ?? '—')
                      : '—'}
                  </Typography>
                </Box>
              </Stack>
              {selectedIsSuperAdmin ? (
                <Alert severity="info" icon={<ShieldOutlinedIcon />} sx={{ mt: 1.5 }}>
                  <strong>Super Administrador</strong> — Cuenta protegida del sistema.
                </Alert>
              ) : (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<VpnKeyOutlinedIcon />}
                  sx={{ mt: 1.5, textTransform: 'none', fontWeight: 700 }}
                  onClick={() => {
                    setEditOpen(false);
                    openAccessDrawer(selected);
                  }}
                >
                  Gestionar acceso
                </Button>
              )}
            </Paper>
          ) : null}

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
            onChange={administrativeInputOnChange(setNombres)}
          />
          <TextField
            label="Apellidos"
            fullWidth
            margin="normal"
            value={apellidos}
            onChange={administrativeInputOnChange(setApellidos)}
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

      <UserAccessDrawer
        open={accessDrawerOpen}
        usuario={accessUsuario}
        catalog={sortedPermCatalog}
        isSuperAdmin={isSuperAdmin}
        onClose={() => {
          setAccessDrawerOpen(false);
          setAccessUsuario(null);
        }}
        onUpdated={handleAccessUpdated}
        onError={setError}
      />
    </Box>
  );
}
