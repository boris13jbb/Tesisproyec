import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
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
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../api/client';
import {
  groupPermissionsByModule,
  permissionLabel,
  permissionMatchesSearch,
  PERMISSION_MODULE_ORDER,
} from '../../constants/permission-display';
import {
  ROLE_DISPLAY_NAME,
  isRoleCode,
  roleHelpText,
} from '../../constants/role-display';
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

function setEquals(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

export function RolePermissionsPanel({
  catalog,
  rolesCatalog,
  onSaved,
  onError,
}: RolePermissionsPanelProps) {
  const [roleCodigo, setRoleCodigo] = useState('USUARIO');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [baseline, setBaseline] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadRole = useCallback(async (codigo: string) => {
    if (!codigo || catalog.length === 0) return;
    setLoading(true);
    try {
      const res = await apiClient.get<{ codigos: string[] }>(
        `/rbac/roles/${encodeURIComponent(codigo)}/permissions`,
      );
      const codes = new Set(res.data.codigos ?? []);
      setSelected(codes);
      setBaseline(codes);
    } catch {
      setSelected(new Set());
      setBaseline(new Set());
    } finally {
      setLoading(false);
    }
  }, [catalog.length]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recarga permisos al cambiar rol
    void loadRole(roleCodigo);
  }, [roleCodigo, loadRole]);

  const dirty = useMemo(() => !setEquals(selected, baseline), [selected, baseline]);

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

  const enabledCount = selected.size;
  const totalCount = catalog.length;

  const toggle = (codigo: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(codigo)) next.delete(codigo);
      else next.add(codigo);
      return next;
    });
  };

  const cancelChanges = () => {
    setSelected(new Set(baseline));
    setSearch('');
  };

  const diff = useMemo(() => {
    const enabled: string[] = [];
    const disabled: string[] = [];
    for (const c of catalog) {
      const code = c.codigo;
      const was = baseline.has(code);
      const now = selected.has(code);
      if (!was && now) enabled.push(code);
      if (was && !now) disabled.push(code);
    }
    enabled.sort((a, b) => permissionLabel(a).localeCompare(permissionLabel(b), 'es'));
    disabled.sort((a, b) => permissionLabel(a).localeCompare(permissionLabel(b), 'es'));
    return { enabled, disabled };
  }, [baseline, selected, catalog]);

  const persist = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/rbac/roles/${encodeURIComponent(roleCodigo)}/permissions`, {
        permissionCodes: [...selected].sort(),
      });
      setBaseline(new Set(selected));
      setConfirmOpen(false);
      onSaved?.(
        'Permisos del rol guardados. Los usuarios con este rol heredan los cambios al renovar la sesión.',
      );
    } catch (err: unknown) {
      onError?.(
        getApiErrorMessage(err, 'No se pudo guardar los permisos del rol.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const roleLabel = isRoleCode(roleCodigo)
    ? ROLE_DISPLAY_NAME[roleCodigo]
    : rolesCatalog.find((r) => r.codigo === roleCodigo)?.nombre ?? roleCodigo;

  const roleHelp = isRoleCode(roleCodigo) ? roleHelpText(roleCodigo) : '';

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
        subtitle="Configure las capacidades que hereda cada rol institucional."
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
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          {roleLabel}
        </Typography>
        {roleHelp ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {roleHelp}
          </Typography>
        ) : null}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          <strong>{enabledCount}</strong> de <strong>{totalCount}</strong> permisos habilitados
        </Typography>
      </Box>

      {roleCodigo === 'ADMIN' ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Modificar el rol Administrador puede impedir operaciones del sistema. Conserve todos los permisos
          salvo un plan explícito de segregación.
        </Alert>
      ) : null}

      {dirty ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Hay cambios sin guardar.
        </Alert>
      ) : null}

      <TextField
        size="small"
        fullWidth
        label="Buscar permiso"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Nombre, descripción o código…"
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
        aria-busy={loading || saving}
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
                <Divider sx={{ mb: 1 }} />
                {codes.map((codigo) => {
                  const row = catalog.find((p) => p.codigo === codigo);
                  return (
                    <PermissionRow
                      key={codigo}
                      codigo={codigo}
                      serverDescription={row?.descripcion}
                      checked={selected.has(codigo)}
                      onToggle={() => toggle(codigo)}
                    />
                  );
                })}
              </Box>
            );
          })
        )}
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
        <Button
          variant="contained"
          color="secondary"
          disabled={!dirty || saving || loading || !roleCodigo}
          onClick={() => setConfirmOpen(true)}
          sx={{ textTransform: 'none', fontWeight: 800 }}
        >
          Guardar permisos
        </Button>
        <Button
          variant="outlined"
          disabled={!dirty || saving}
          onClick={cancelChanges}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          Cancelar cambios
        </Button>
      </Stack>

      <Dialog open={confirmOpen} onClose={() => !saving && setConfirmOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Guardar cambios de permisos</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Rol: <strong>{roleLabel}</strong>
          </Typography>
          {diff.enabled.length > 0 ? (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="subtitle2" color="success.main" sx={{ fontWeight: 800 }}>
                Se habilitarán
              </Typography>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                {diff.enabled.map((c) => (
                  <li key={c}>
                    <Typography variant="body2">{permissionLabel(c)}</Typography>
                  </li>
                ))}
              </ul>
            </Box>
          ) : null}
          {diff.disabled.length > 0 ? (
            <Box>
              <Typography variant="subtitle2" color="error.main" sx={{ fontWeight: 800 }}>
                Se deshabilitarán
              </Typography>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                {diff.disabled.map((c) => (
                  <li key={c}>
                    <Typography variant="body2">{permissionLabel(c)}</Typography>
                  </li>
                ))}
              </ul>
            </Box>
          ) : null}
          {diff.enabled.length === 0 && diff.disabled.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No hay diferencias respecto al estado guardado.
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="contained" color="secondary" disabled={saving} onClick={() => void persist()}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
