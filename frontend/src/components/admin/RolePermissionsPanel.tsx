import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../api/client';
import {
  groupPermissionsByModule,
  permissionMatchesSearch,
  PERMISSION_MODULE_ORDER,
} from '../../constants/permission-display';
import {
  ROLE_DISPLAY_NAME,
  isRoleCode,
  roleHelpText,
} from '../../constants/role-display';
import { useSerializedMutation } from '../../hooks/useSerializedMutation';
import { getApiErrorMessage } from '../../utils/api-error-message';
import { PermissionRow } from './PermissionRow';
import { SectionHeader } from '../SectionHeader';
import { listSurfaceSx } from '../listSurfaces';

type RbacPermRow = { id: string; codigo: string; descripcion: string | null };
type RbacRoleRow = { id: string; codigo: string; nombre: string };

type RolePermissionsPanelProps = {
  catalog: RbacPermRow[];
  rolesCatalog: RbacRoleRow[];
  onSaved?: (message: string) => void;
  onError?: (message: string) => void;
};

export function RolePermissionsPanel({
  catalog,
  rolesCatalog,
  onSaved,
  onError,
}: RolePermissionsPanelProps) {
  const [roleCodigo, setRoleCodigo] = useState('USUARIO');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [pendingCodes, setPendingCodes] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const runSerialized = useSerializedMutation<string[]>();

  const loadRole = useCallback(async (codigo: string) => {
    if (!codigo || catalog.length === 0) return;
    setLoading(true);
    try {
      const res = await apiClient.get<{ codigos: string[] }>(
        `/rbac/roles/${encodeURIComponent(codigo)}/permissions`,
      );
      setSelected(new Set(res.data.codigos ?? []));
    } catch {
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, [catalog.length]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza permisos al cambiar rol seleccionado
    void loadRole(roleCodigo);
  }, [roleCodigo, loadRole]);

  const sortedCatalog = useMemo(
    () => [...catalog].sort((a, b) => a.codigo.localeCompare(b.codigo)),
    [catalog],
  );

  const filteredCatalog = useMemo(() => {
    return sortedCatalog.filter((p) => permissionMatchesSearch(p.codigo, search, p.descripcion));
  }, [sortedCatalog, search]);

  const grouped = useMemo(
    () => groupPermissionsByModule(filteredCatalog.map((p) => p.codigo)),
    [filteredCatalog],
  );

  const roleLabel = isRoleCode(roleCodigo)
    ? ROLE_DISPLAY_NAME[roleCodigo]
    : rolesCatalog.find((r) => r.codigo === roleCodigo)?.nombre ?? roleCodigo;

  const roleHelp = isRoleCode(roleCodigo) ? roleHelpText(roleCodigo) : '';

  const persistPermissions = async (next: Set<string>, toggledCode: string) => {
    setPendingCodes((prev) => new Set(prev).add(toggledCode));
    try {
      const codigos = await runSerialized(async () => {
        const res = await apiClient.put<{ codigos: string[] }>(
          `/rbac/roles/${encodeURIComponent(roleCodigo)}/permissions`,
          { permissionCodes: [...next].sort() },
        );
        return res.data.codigos ?? [...next].sort();
      });
      setSelected(new Set(codigos));
      onSaved?.(
        `Permiso actualizado en rol ${roleLabel}. Los usuarios con este rol heredan el cambio al renovar sesión.`,
      );
    } catch (err: unknown) {
      await loadRole(roleCodigo);
      onError?.(getApiErrorMessage(err, 'No se pudo guardar el permiso del rol.'));
    } finally {
      setPendingCodes((prev) => {
        const copy = new Set(prev);
        copy.delete(toggledCode);
        return copy;
      });
    }
  };

  const toggle = (codigo: string) => {
    const next = new Set(selected);
    if (next.has(codigo)) next.delete(codigo);
    else next.add(codigo);
    setSelected(next);
    void persistPermissions(next, codigo);
  };

  if (catalog.length === 0) {
    return (
      <Alert severity="warning">
        No hay permisos en catálogo. Verifique que el servidor esté actualizado y el seed ejecutado.
      </Alert>
    );
  }

  return (
    <Paper elevation={0} sx={{ ...listSurfaceSx, p: { xs: 2, sm: 2.5, md: 3 } }}>
      <SectionHeader
        icon={<VpnKeyOutlinedIcon fontSize="small" />}
        title="Roles y permisos"
        subtitle="Active o desactive capacidades heredadas por cada rol institucional."
      />

      <FormControl fullWidth size="small" sx={{ mt: 2, mb: 1, maxWidth: 360 }}>
        <InputLabel id="role-perm-select">Rol a configurar</InputLabel>
        <Select
          labelId="role-perm-select"
          label="Rol a configurar"
          value={rolesCatalog.some((r) => r.codigo === roleCodigo) ? roleCodigo : ''}
          onChange={(e) => setRoleCodigo(String(e.target.value))}
        >
          {rolesCatalog.map((r) => (
            <MenuItem key={r.id} value={r.codigo}>
              {isRoleCode(r.codigo) ? ROLE_DISPLAY_NAME[r.codigo] : r.nombre}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {roleLabel}
          </Typography>
          {roleCodigo === 'SUPERADMIN' ? (
            <Chip
              size="small"
              icon={<ShieldOutlinedIcon />}
              label="Rol protegido"
              color="primary"
              sx={{ fontWeight: 700 }}
            />
          ) : null}
        </Stack>
        {roleHelp ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {roleHelp}
          </Typography>
        ) : null}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          <strong>{selected.size}</strong> de <strong>{catalog.length}</strong> permisos habilitados
        </Typography>
      </Box>

      {roleCodigo === 'SUPERADMIN' ? (
        <Alert severity="info" icon={<ShieldOutlinedIcon />} sx={{ mb: 2 }}>
          El rol Super Administrador es una cuenta protegida del sistema. Modifique sus permisos solo con autorización
          explícita.
        </Alert>
      ) : null}

      {roleCodigo === 'ADMIN' ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Modificar el rol Administrador puede impedir operaciones del sistema. Conserve todos los permisos
          salvo un plan explícito de segregación.
        </Alert>
      ) : null}

      <TextField
        size="small"
        fullWidth
        label="Buscar permiso"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Nombre o descripción…"
        sx={{ mb: 2, maxWidth: 480 }}
      />

      <Box
        sx={{
          maxHeight: 480,
          overflow: 'auto',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          p: { xs: 1, sm: 1.5 },
          bgcolor: 'action.hover',
        }}
        aria-busy={loading || pendingCodes.size > 0}
      >
        {loading ? (
          <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={32} aria-label="Cargando permisos del rol" />
          </Box>
        ) : (
          PERMISSION_MODULE_ORDER.map((mod) => {
            const codes = grouped.get(mod);
            if (!codes?.length) return null;
            return (
              <Box key={mod} sx={{ mb: 2 }}>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ fontWeight: 800, letterSpacing: 1, display: 'block', mb: 0.5 }}
                >
                  {mod.toUpperCase()}
                </Typography>
                {codes.map((codigo) => {
                  const row = catalog.find((p) => p.codigo === codigo);
                  return (
                    <PermissionRow
                      key={codigo}
                      codigo={codigo}
                      serverDescription={row?.descripcion}
                      checked={selected.has(codigo)}
                      disabled={pendingCodes.has(codigo)}
                      onToggle={() => toggle(codigo)}
                      useSwitch
                    />
                  );
                })}
              </Box>
            );
          })
        )}
      </Box>

      {pendingCodes.size > 0 ? (
        <Stack direction="row" spacing={1} sx={{ mt: 2, alignItems: 'center' }}>
          <CircularProgress size={18} />
          <Typography variant="caption" color="text.secondary">
            Guardando cambios…
          </Typography>
        </Stack>
      ) : null}
    </Paper>
  );
}
