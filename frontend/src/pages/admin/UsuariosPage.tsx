import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
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
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState, type MouseEvent, type ReactNode, type SyntheticEvent } from 'react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { userHasAdminAccess, userIsSuperAdmin } from '../../auth/role-utils';
import { AccessMatrix } from '../../components/admin/AccessMatrix';
import { AdditionalPermissionsSection } from '../../components/admin/AdditionalPermissionsSection';
import { RolePermissionsPanel } from '../../components/admin/RolePermissionsPanel';
import { UserAccessDrawer } from '../../components/admin/UserAccessDrawer';
import { IdentityTabs } from '../../components/admin/users/IdentityTabs';
import { UsersFiltersBar } from '../../components/admin/users/UsersFiltersBar';
import { UsersMobileList } from '../../components/admin/users/UsersMobileList';
import { UsersSummaryStats } from '../../components/admin/users/UsersSummaryStats';
import { UsersTable } from '../../components/admin/users/UsersTable';
import { displayUsuario } from '../../components/admin/users/user-display';
import { UserRoleChips } from '../../components/admin/users/UserRoleChips';
import { UserStatusChip } from '../../components/admin/users/UserStatusChip';
import { PageHeader } from '../../components/PageHeader';
import { listSurfaceSx } from '../../components/listSurfaces';
import {
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
type Cargo = {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
  dependenciaId: string | null;
  dependencia?: { id: string; activo: boolean } | null;
};

function cargoEsAsignable(c: Cargo): boolean {
  if (!c.activo) return false;
  if (c.dependenciaId && c.dependencia && !c.dependencia.activo) return false;
  return true;
}

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const isAdmin = userHasAdminAccess(user?.roles);
  const isSuperAdmin = userIsSuperAdmin(user?.roles);
  const [myPerms, setMyPerms] = useState<string[]>([]);
  const canUsersCreate = isAdmin && myPerms.includes('USERS_CREATE');
  const canUsersUpdate = isAdmin && myPerms.includes('USERS_UPDATE');
  const canUsersDisable = isAdmin && myPerms.includes('USERS_DISABLE');
  const canUsersResetPassword = isAdmin && myPerms.includes('USERS_RESET_PASSWORD');
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
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
        apiClient.get<Cargo[]>('/cargos', { params: { incluirInactivos: true } }).catch(() =>
          apiClient.get<Cargo[]>('/cargos'),
        ),
        isAdmin
          ? apiClient.get<RbacPermRow[]>('/rbac/permissions').catch(() => ({ data: [] as RbacPermRow[] }))
          : Promise.resolve({ data: [] as RbacPermRow[] }),
        isAdmin
          ? apiClient.get<RbacRoleRow[]>('/rbac/roles').catch(() => ({ data: [] as RbacRoleRow[] }))
          : Promise.resolve({ data: [] as RbacRoleRow[] }),
      ]);
      setItems(usersRes.data);
      setDependencias(depsRes.data.filter((d) => d.activo));
      setCargos(Array.isArray(cargosRes.data) ? cargosRes.data : []);
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
    let cancelled = false;
    void (async () => {
      try {
        if (!user?.id) {
          if (!cancelled) setMyPerms([]);
          return;
        }
        const res = await apiClient.get<{ codigos: string[] }>('/rbac/me/permissions');
        if (cancelled) return;
        setMyPerms(Array.isArray(res.data?.codigos) ? res.data.codigos : []);
      } catch {
        if (!cancelled) setMyPerms([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

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
        getApiErrorMessage(err, 'No se pudo crear el usuario (correo duplicado o datos inválidos).'),
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
        getApiErrorMessage(
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
      setError(getApiErrorMessage(err, 'No se pudo actualizar el estado del usuario.'));
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
        getApiErrorMessage(
          err,
          'No se pudo restablecer la contraseña (usuario inactivo o datos inválidos).',
        ),
      );
    }
  };

  const cargosAsignables = useMemo(() => cargos.filter(cargoEsAsignable), [cargos]);

  const cargosFiltrados = useMemo(() => {
    if (!dependenciaId) return cargosAsignables;
    return cargosAsignables.filter(
      (c) => c.dependenciaId === dependenciaId || c.dependenciaId === null,
    );
  }, [cargosAsignables, dependenciaId]);

  const cargoHistorico = useMemo(() => {
    if (!cargoId || !editOpen) return null;
    if (cargosFiltrados.some((c) => c.id === cargoId)) return null;
    return cargos.find((c) => c.id === cargoId) ?? null;
  }, [cargoId, cargos, cargosFiltrados, editOpen]);

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

  const hasActiveFilters = userSearch.trim().length > 0 || filterEstado !== 'all' || filterRol !== '';

  const paginatedItems = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredItems.slice(start, start + rowsPerPage);
  }, [filteredItems, page, rowsPerPage]);

  const clearFilters = () => {
    setUserSearch('');
    setFilterEstado('all');
    setFilterRol('');
    setPage(0);
  };

  const openCreateDialog = () => {
    setInviteNotice(null);
    resetIdentityForm();
    setOpen(true);
  };

  const identityTabs = useMemo(() => {
    const tabs = [
      { id: 'usuarios', label: 'Usuarios', icon: <PeopleOutlinedIcon fontSize="small" /> },
    ];
    if (isAdmin) {
      tabs.push({ id: 'roles', label: 'Roles y permisos', icon: <VpnKeyOutlinedIcon fontSize="small" /> });
    }
    tabs.push({ id: 'matriz', label: 'Matriz de acceso', icon: <TableChartOutlinedIcon fontSize="small" /> });
    return tabs;
  }, [isAdmin]);

  const selectedIsSuperAdmin = selected ? userIsSuperAdminAccount(selected.roles) : false;
  const actionsTargetIsSuper = actionsUsuario ? userIsSuperAdminAccount(actionsUsuario.roles) : false;
  const canMutateTarget =
    canUsersUpdate && actionsUsuario && (!actionsTargetIsSuper || isSuperAdmin);

  const handleMainTabChange = (_: SyntheticEvent, next: number) => {
    setMainTab(next);
  };

  return (
    <Box sx={{ width: '100%', pb: { xs: 4, md: 5 } }}>
      <PageHeader
        title="Administración de identidades"
        description="Gestiona usuarios, roles y niveles de acceso del sistema."
        actions={
          <Tooltip title="Recargar datos">
            <span>
              <IconButton
                aria-label="Actualizar administración de identidades"
                onClick={() => void load()}
                disabled={loading}
                color="primary"
                size="medium"
                sx={{ border: '1px solid', borderColor: 'divider' }}
              >
                <RefreshIcon
                  sx={{
                    animation: loading ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
                  }}
                />
              </IconButton>
            </span>
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

      <IdentityTabs
        value={mainTab}
        onChange={handleMainTabChange}
        tabs={identityTabs}
        aria-label="Administración de identidades"
      />

      <TabPanel value={mainTab} index={0}>
        <Paper elevation={0} sx={{ ...paperCardSx, p: { xs: 2, sm: 2.5, md: 3 } }}>
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            spacing={2}
            sx={{ mb: 2.5, alignItems: { lg: 'flex-start' }, justifyContent: 'space-between' }}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
                Usuarios institucionales
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 520 }}>
                Gestiona las cuentas, roles y estado de los usuarios.
              </Typography>
              <Box sx={{ mt: 2, maxWidth: { lg: 480 } }}>
                <UsersSummaryStats
                  activos={usuariosActivos}
                  total={items.length}
                  visibles={filteredItems.length}
                  loading={loading}
                />
              </Box>
            </Box>
            {canUsersCreate ? (
              <Button
                variant="contained"
                color="primary"
                startIcon={<PersonAddOutlinedIcon />}
                onClick={openCreateDialog}
                sx={{
                  textTransform: 'none',
                  fontWeight: 800,
                  alignSelf: { xs: 'stretch', lg: 'flex-start' },
                  whiteSpace: 'nowrap',
                }}
              >
                Crear usuario
              </Button>
            ) : null}
          </Stack>

          <UsersFiltersBar
            search={userSearch}
            onSearchChange={(v) => {
              setUserSearch(v);
              setPage(0);
            }}
            estado={filterEstado}
            onEstadoChange={(v) => {
              setFilterEstado(v);
              setPage(0);
            }}
            rol={filterRol}
            onRolChange={(v) => {
              setFilterRol(v);
              setPage(0);
            }}
            onClear={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />

          {error && !loading && items.length === 0 ? (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              action={
                <Button color="inherit" size="small" onClick={() => void load()} sx={{ fontWeight: 700 }}>
                  Reintentar
                </Button>
              }
            >
              No fue posible cargar los usuarios.
            </Alert>
          ) : null}

          {isMobile ? (
            <UsersMobileList
              items={paginatedItems}
              totalFiltered={filteredItems.length}
              departamentoPorId={departamentoPorId}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={setPage}
              onRowsPerPageChange={setRowsPerPage}
              onOpenActions={openActionsMenu}
              loading={loading}
              emptyTotal={items.length}
              onClearFilters={clearFilters}
              onCreateFirst={openCreateDialog}
              canCreate={canUsersCreate}
            />
          ) : (
            <UsersTable
              items={paginatedItems}
              totalFiltered={filteredItems.length}
              departamentoPorId={departamentoPorId}
              cargoPorId={cargoPorId}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={setPage}
              onRowsPerPageChange={setRowsPerPage}
              onOpenActions={openActionsMenu}
              loading={loading}
              emptyTotal={items.length}
              onClearFilters={clearFilters}
              onCreateFirst={openCreateDialog}
              canCreate={canUsersCreate}
            />
          )}
        </Paper>
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
        sx={{
          mt: 3,
          ...paperCardSx,
          '&:before': { display: 'none' },
          bgcolor: 'action.hover',
        }}
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
            {canUsersResetPassword ? (
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
            ) : null}
            {canUsersDisable && (!actionsTargetIsSuper || isSuperAdmin) ? (
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
                  <Box sx={{ mt: 0.25 }}>
                    <UserStatusChip activo={selected.activo} />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Roles
                  </Typography>
                  <Box sx={{ mt: 0.25 }}>
                    <UserRoleChips usuario={selected} />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Dependencia
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {selected.dependenciaId
                      ? (departamentoPorId.get(selected.dependenciaId) ?? 'Sin asignar')
                      : 'Sin asignar'}
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
              {cargoHistorico && (
                <MenuItem value={cargoHistorico.id}>
                  {cargoHistorico.codigo} — {cargoHistorico.nombre}
                  {!cargoHistorico.activo
                    ? ' (inactivo)'
                    : ' (histórico / no asignable)'}
                </MenuItem>
              )}
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
