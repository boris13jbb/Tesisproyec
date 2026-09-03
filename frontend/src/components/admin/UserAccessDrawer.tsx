import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../api/client';
import { isDirectPermissionBlockedForAdmin } from '../../constants/direct-permissions-policy';
import {
  groupPermissionsByModule,
  permissionMatchesSearch,
  PERMISSION_MODULE_ORDER,
} from '../../constants/permission-display';
import {
  ASSIGNABLE_ROLE_SWITCHES,
  normalizeUserRoleCodes,
  ROLE_DISPLAY_NAME,
  roleHelpText,
  userHasAssignableRole,
  type AssignableRoleSwitch,
} from '../../constants/role-display';
import { useSerializedMutation } from '../../hooks/useSerializedMutation';
import { toggleRoleInList } from '../../utils/effective-permissions';
import { getApiErrorMessage } from '../../utils/api-error-message';
import { displayUsuario } from './users/user-display';
import { EffectivePermissionsPanel } from './EffectivePermissionsPanel';
import { PermissionRow } from './PermissionRow';

type Usuario = {
  id: string;
  email: string;
  nombres: string | null;
  apellidos: string | null;
  dependenciaId: string | null;
  cargoId: string | null;
  activo: boolean;
  roles: { codigo: string; nombre: string }[];
  directPermissionCodes?: string[];
};

type RbacPermRow = { id: string; codigo: string; descripcion: string | null };

type UserAccessDrawerProps = {
  open: boolean;
  usuario: Usuario | null;
  catalog: RbacPermRow[];
  isSuperAdmin: boolean;
  onClose: () => void;
  onUpdated: (usuario: Usuario) => void;
  onError: (message: string) => void;
};

type AdminConfirmState =
  | { mode: 'assign'; roleCode: 'ADMIN' }
  | { mode: 'revoke'; roleCode: 'ADMIN' }
  | null;

export function UserAccessDrawer({
  open,
  usuario,
  catalog,
  isSuperAdmin,
  onClose,
  onUpdated,
  onError,
}: UserAccessDrawerProps) {
  const [roleCodes, setRoleCodes] = useState<string[]>([]);
  const [directPermCodes, setDirectPermCodes] = useState<string[]>([]);
  const [rolePermissionMap, setRolePermissionMap] = useState<Map<string, string[]>>(new Map());
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [pendingRoles, setPendingRoles] = useState<Set<string>>(new Set());
  const [pendingDirect, setPendingDirect] = useState<Set<string>>(new Set());
  const [permSearch, setPermSearch] = useState('');
  const [adminConfirm, setAdminConfirm] = useState<AdminConfirmState>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const runSerialized = useSerializedMutation<Usuario>();

  const syncFromUsuario = useCallback((u: Usuario) => {
    setRoleCodes(normalizeUserRoleCodes(u.roles.map((r) => r.codigo)));
    setDirectPermCodes([...(u.directPermissionCodes ?? [])].sort());
    setLocalError(null);
    setPermSearch('');
  }, []);

  useEffect(() => {
    if (open && usuario) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza drawer con usuario seleccionado
      syncFromUsuario(usuario);
    }
  }, [open, usuario, syncFromUsuario]);

  const loadRolePermissions = useCallback(async (codes: string[]) => {
    setLoadingPerms(true);
    try {
      const entries = await Promise.all(
        codes.map(async (codigo) => {
          const res = await apiClient.get<{ codigos: string[] }>(
            `/rbac/roles/${encodeURIComponent(codigo)}/permissions`,
          );
          return [codigo, res.data.codigos ?? []] as const;
        }),
      );
      setRolePermissionMap(new Map(entries));
    } catch {
      setRolePermissionMap(new Map());
    } finally {
      setLoadingPerms(false);
    }
  }, []);

  useEffect(() => {
    if (!open || roleCodes.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpia mapa cuando no hay roles activos
      setRolePermissionMap(new Map());
      return;
    }
    void loadRolePermissions(roleCodes);
  }, [open, roleCodes, loadRolePermissions]);

  const persistRoles = useCallback(
    async (nextRoles: string[]) => {
      if (!usuario) return;
      setLocalError(null);
      await runSerialized(async () => {
        const res = await apiClient.patch<Usuario>(`/usuarios/${usuario.id}`, {
          roles: nextRoles,
        });
        setRoleCodes(normalizeUserRoleCodes(res.data.roles.map((r) => r.codigo)));
        setDirectPermCodes([...(res.data.directPermissionCodes ?? [])].sort());
        onUpdated(res.data);
        return res.data;
      }).catch((err: unknown) => {
        if (usuario) syncFromUsuario(usuario);
        const msg = getApiErrorMessage(err, 'No se pudo actualizar el rol.');
        setLocalError(msg);
        onError(msg);
        throw err;
      });
    },
    [usuario, runSerialized, onUpdated, onError, syncFromUsuario],
  );

  const persistDirectPermissions = useCallback(
    async (nextDirect: string[]) => {
      if (!usuario) return;
      setLocalError(null);
      await runSerialized(async () => {
        const res = await apiClient.patch<Usuario>(`/usuarios/${usuario.id}`, {
          directPermissionCodes: nextDirect,
        });
        setRoleCodes(normalizeUserRoleCodes(res.data.roles.map((r) => r.codigo)));
        setDirectPermCodes([...(res.data.directPermissionCodes ?? [])].sort());
        onUpdated(res.data);
        return res.data;
      }).catch((err: unknown) => {
        if (usuario) syncFromUsuario(usuario);
        const msg = getApiErrorMessage(err, 'No se pudo actualizar el permiso adicional.');
        setLocalError(msg);
        onError(msg);
        throw err;
      });
    },
    [usuario, runSerialized, onUpdated, onError, syncFromUsuario],
  );

  const applyRoleToggle = async (roleCode: AssignableRoleSwitch, enabled: boolean) => {
    if (!usuario) return;
    const next = toggleRoleInList(roleCodes, roleCode, enabled);
    if (!next) {
      setLocalError('Debe conservarse al menos un rol activo.');
      return;
    }
    setPendingRoles((prev) => new Set(prev).add(roleCode));
    try {
      await persistRoles(next);
    } finally {
      setPendingRoles((prev) => {
        const copy = new Set(prev);
        copy.delete(roleCode);
        return copy;
      });
    }
  };

  const handleRoleSwitch = (roleCode: AssignableRoleSwitch, enabled: boolean) => {
    if (!usuario) return;
    if (roleCode === 'ADMIN') {
      if (!isSuperAdmin) return;
      setAdminConfirm(enabled ? { mode: 'assign', roleCode: 'ADMIN' } : { mode: 'revoke', roleCode: 'ADMIN' });
      return;
    }
    void applyRoleToggle(roleCode, enabled);
  };

  const handleDirectToggle = (codigo: string, enabled: boolean) => {
    const inherited = new Set([...rolePermissionMap.values()].flat());
    if (inherited.has(codigo)) return;
    const next = enabled
      ? [...new Set([...directPermCodes, codigo])].sort()
      : directPermCodes.filter((c) => c !== codigo);
    setPendingDirect((prev) => new Set(prev).add(codigo));
    void persistDirectPermissions(next).finally(() => {
      setPendingDirect((prev) => {
        const copy = new Set(prev);
        copy.delete(codigo);
        return copy;
      });
    });
  };

  const inheritedSet = useMemo(
    () => new Set([...rolePermissionMap.values()].flat()),
    [rolePermissionMap],
  );

  const visibleDirectCatalog = useMemo(() => {
    let list = catalog;
    if (!isSuperAdmin) {
      list = list.filter((p) => !isDirectPermissionBlockedForAdmin(p.codigo));
    }
    const canReceiveDocUnlock =
      roleCodes.includes('ADMIN') && !roleCodes.includes('SUPERADMIN');
    if (!canReceiveDocUnlock) {
      list = list.filter((p) => p.codigo !== 'DOC_UNLOCK');
    }
    return list.filter((p) => permissionMatchesSearch(p.codigo, permSearch, p.descripcion));
  }, [catalog, isSuperAdmin, permSearch, roleCodes]);

  const groupedDirect = useMemo(
    () => groupPermissionsByModule(visibleDirectCatalog.map((p) => p.codigo)),
    [visibleDirectCatalog],
  );

  if (!usuario) return null;

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100%', sm: 480, md: 560 },
              maxWidth: '100vw',
              p: { xs: 2, sm: 3 },
            },
          },
        }}
      >
        <Stack direction="row" sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ minWidth: 0, pr: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>
              {displayUsuario(usuario)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {usuario.email}
            </Typography>
            <Chip
              size="small"
              label={usuario.activo ? 'Activo' : 'Inactivo'}
              color={usuario.activo ? 'success' : 'default'}
              sx={{ mt: 1, fontWeight: 700 }}
            />
          </Box>
          <IconButton aria-label="Cerrar gestión de acceso" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>

        {localError ? (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLocalError(null)}>
            {localError}
          </Alert>
        ) : null}

        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
          Roles asignados
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Los permisos efectivos son la unión de todos los roles activos más los permisos adicionales.
        </Typography>

        <Stack spacing={1} sx={{ mb: 2 }}>
          {ASSIGNABLE_ROLE_SWITCHES.map((roleCode) => {
            if (roleCode === 'ADMIN' && !isSuperAdmin) return null;
            const checked = userHasAssignableRole(roleCodes, roleCode);
            const pending = pendingRoles.has(roleCode);
            const isPrivileged = roleCode === 'ADMIN';
            return (
              <Box
                key={roleCode}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: isPrivileged && checked ? 'warning.main' : 'divider',
                  bgcolor: checked ? 'action.selected' : 'background.paper',
                }}
              >
                <FormControlLabel
                  sx={{ m: 0, width: '100%', alignItems: 'flex-start', justifyContent: 'space-between' }}
                  control={
                    <Switch
                      checked={checked}
                      disabled={pending}
                      onChange={(_, next) => handleRoleSwitch(roleCode, next)}
                      color={isPrivileged ? 'warning' : 'primary'}
                    />
                  }
                  label={
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          {ROLE_DISPLAY_NAME[roleCode]}
                        </Typography>
                        {isPrivileged ? (
                          <Chip
                            size="small"
                            icon={<WarningAmberOutlinedIcon />}
                            label="Rol privilegiado"
                            color="warning"
                            variant="outlined"
                            sx={{ height: 22, fontWeight: 700 }}
                          />
                        ) : null}
                        {pending ? <CircularProgress size={16} /> : null}
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35 }}>
                        {roleHelpText(roleCode)}
                      </Typography>
                      {isPrivileged && checked ? (
                        <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                          Este rol permite administrar usuarios, configuración y funciones sensibles del sistema.
                        </Typography>
                      ) : null}
                    </Box>
                  }
                  labelPlacement="start"
                />
              </Box>
            );
          })}
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
          Acceso efectivo
        </Typography>
        {loadingPerms ? (
          <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <EffectivePermissionsPanel
            rolePermissionMap={rolePermissionMap}
            directPermissionCodes={directPermCodes}
          />
        )}

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
          Permisos adicionales
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Excepciones concedidas solo a esta cuenta. Los permisos heredados del rol no pueden revocarse aquí.
        </Typography>
        <Alert severity="info" sx={{ mb: 1.5 }}>
          Cambios en roles o permisos requieren nueva sesión o renovación del token para aplicarse por completo.
        </Alert>

        <Box
          sx={{
            maxHeight: 320,
            overflow: 'auto',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            p: 1,
          }}
        >
          {PERMISSION_MODULE_ORDER.map((mod) => {
            const codes = groupedDirect.get(mod);
            if (!codes?.length) return null;
            return (
              <Box key={mod} sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                  {mod.toUpperCase()}
                </Typography>
                {codes.map((codigo) => {
                  const row = catalog.find((p) => p.codigo === codigo);
                  const isInherited = inheritedSet.has(codigo);
                  const checked = isInherited || directPermCodes.includes(codigo);
                  return (
                    <PermissionRow
                      key={codigo}
                      codigo={codigo}
                      serverDescription={row?.descripcion}
                      checked={checked}
                      disabled={isInherited || pendingDirect.has(codigo)}
                      onToggle={() => handleDirectToggle(codigo, !directPermCodes.includes(codigo))}
                      useSwitch
                      originHint={
                        isInherited
                          ? `Heredado del rol (${roleCodes
                              .filter((r) => (rolePermissionMap.get(r) ?? []).includes(codigo))
                              .map((r) => ROLE_DISPLAY_NAME[r as AssignableRoleSwitch] ?? r)
                              .join(', ') || 'rol'})`
                          : directPermCodes.includes(codigo)
                            ? 'Permiso adicional'
                            : undefined
                      }
                    />
                  );
                })}
              </Box>
            );
          })}
        </Box>
      </Drawer>

      <Dialog open={adminConfirm !== null} onClose={() => setAdminConfirm(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AdminPanelSettingsOutlinedIcon color="warning" />
          {adminConfirm?.mode === 'assign' ? 'Asignar rol Administrador' : 'Revocar rol Administrador'}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            {adminConfirm?.mode === 'assign' ? (
              <>
                <strong>{displayUsuario(usuario)}</strong> obtendrá acceso administrativo al sistema.
              </>
            ) : (
              <>
                <strong>{displayUsuario(usuario)}</strong> perderá los privilegios administrativos heredados de
                este rol. La cuenta permanecerá activa con sus otros roles.
              </>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdminConfirm(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color={adminConfirm?.mode === 'assign' ? 'warning' : 'error'}
            onClick={() => {
              const mode = adminConfirm?.mode;
              setAdminConfirm(null);
              if (mode === 'assign') void applyRoleToggle('ADMIN', true);
              if (mode === 'revoke') void applyRoleToggle('ADMIN', false);
            }}
          >
            {adminConfirm?.mode === 'assign' ? 'Asignar Administrador' : 'Revocar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
