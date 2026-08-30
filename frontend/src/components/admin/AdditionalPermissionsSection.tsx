import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import {
  Alert,
  Box,
  Chip,
  Divider,
  FormControl,
  FormLabel,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../api/client';
import { isDirectPermissionBlockedForAdmin } from '../../constants/direct-permissions-policy';
import {
  groupPermissionsByModule,
  permissionLabel,
  permissionMatchesSearch,
  PERMISSION_MODULE_ORDER,
} from '../../constants/permission-display';
import {
  composeRoleCodes,
  ROLE_DISPLAY_NAME,
  type PrimaryRoleCode,
} from '../../constants/role-display';
import { PermissionRow } from './PermissionRow';

type RbacPermRow = { id: string; codigo: string; descripcion: string | null };

type AdditionalPermissionsSectionProps = {
  catalog: RbacPermRow[];
  value: string[];
  onChange: (next: string[]) => void;
  primaryRole: PrimaryRoleCode;
  editorDocComplement: boolean;
  restrictCriticalForAdmin: boolean;
};

export function AdditionalPermissionsSection({
  catalog,
  value,
  onChange,
  primaryRole,
  editorDocComplement,
  restrictCriticalForAdmin,
}: AdditionalPermissionsSectionProps) {
  const [search, setSearch] = useState('');
  const [inherited, setInherited] = useState<string[]>([]);
  const [inheritedLoading, setInheritedLoading] = useState(false);

  const roleCodes = useMemo(
    () => composeRoleCodes(primaryRole, editorDocComplement),
    [primaryRole, editorDocComplement],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setInheritedLoading(true);
      try {
        const sets = await Promise.all(
          roleCodes.map(async (codigo) => {
            const res = await apiClient.get<{ codigos: string[] }>(
              `/rbac/roles/${encodeURIComponent(codigo)}/permissions`,
            );
            return res.data.codigos ?? [];
          }),
        );
        if (cancelled) return;
        const merged = [...new Set(sets.flat())].sort((a, b) => a.localeCompare(b));
        setInherited(merged);
      } catch {
        if (!cancelled) setInherited([]);
      } finally {
        if (!cancelled) setInheritedLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roleCodes]);

  const visibleCatalog = useMemo(() => {
    let list = catalog;
    if (restrictCriticalForAdmin) {
      list = list.filter((p) => !isDirectPermissionBlockedForAdmin(p.codigo));
    }
    return list.filter((p) => permissionMatchesSearch(p.codigo, search, p.descripcion));
  }, [catalog, restrictCriticalForAdmin, search]);

  const grouped = useMemo(
    () => groupPermissionsByModule(visibleCatalog.map((p) => p.codigo)),
    [visibleCatalog],
  );

  const selected = useMemo(() => new Set(value), [value]);
  const inheritedSet = useMemo(() => new Set(inherited), [inherited]);

  const additionalOnly = value.filter((c) => !inheritedSet.has(c));

  const roleSummary = roleCodes
    .map((c) => ROLE_DISPLAY_NAME[c as keyof typeof ROLE_DISPLAY_NAME] ?? c)
    .join(' · ');

  return (
    <Box sx={{ mt: 2 }}>
      <Paper
        elevation={0}
        variant="outlined"
        sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: 'action.hover' }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
          Acceso efectivo
        </Typography>
        <Stack spacing={0.5}>
          <Typography variant="body2">
            Rol: <strong>{roleSummary}</strong>
          </Typography>
          <Typography variant="body2">
            Permisos adicionales: <strong>{additionalOnly.length}</strong>
          </Typography>
          <Typography variant="caption" color="text.secondary">
            = Acceso final del usuario (rol + excepciones de esta cuenta)
          </Typography>
        </Stack>
      </Paper>

      <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
        <FormLabel sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
          Permisos heredados del rol
        </FormLabel>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          Provienen del rol asignado. Para cambiarlos, use la pestaña Roles y permisos.
        </Typography>
        {inheritedLoading ? (
          <Typography variant="body2" color="text.secondary">
            Cargando permisos del rol…
          </Typography>
        ) : inherited.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Sin permisos heredados visibles.
          </Typography>
        ) : (
          <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {inherited.slice(0, 12).map((c) => (
              <Chip
                key={c}
                size="small"
                icon={<LockOutlinedIcon />}
                label={permissionLabel(c)}
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            ))}
            {inherited.length > 12 ? (
              <Chip size="small" label={`+${inherited.length - 12} más`} variant="outlined" />
            ) : null}
          </Stack>
        )}
      </FormControl>

      <Divider sx={{ my: 2 }} />

      <FormControl component="fieldset" fullWidth>
        <FormLabel sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
          Permisos adicionales
        </FormLabel>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          Permisos especiales concedidos únicamente a este usuario, además de los que recibe por su rol.
          Use solo cuando sea necesario; en condiciones normales asigne accesos mediante roles.
        </Typography>
        <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ mb: 1.5 }}>
          Permisos adicionales (directos en base de datos) se suman al rol. El efecto completo requiere
          nueva sesión o renovación del token.
        </Alert>

        {catalog.length === 0 ? (
          <Alert severity="warning">No hay catálogo de permisos disponible.</Alert>
        ) : (
          <>
            <TextField
              size="small"
              label="Buscar permiso"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              fullWidth
              sx={{ mb: 1.5 }}
            />
            <Box
              sx={{
                maxHeight: 260,
                overflow: 'auto',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 1,
                bgcolor: 'background.paper',
              }}
            >
              {PERMISSION_MODULE_ORDER.map((mod) => {
                const codes = grouped.get(mod);
                if (!codes?.length) return null;
                return (
                  <Box key={mod} sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                      {mod.toUpperCase()}
                    </Typography>
                    {codes.map((codigo) => {
                      const row = catalog.find((p) => p.codigo === codigo);
                      const isInherited = inheritedSet.has(codigo);
                      return (
                        <PermissionRow
                          key={codigo}
                          codigo={codigo}
                          serverDescription={row?.descripcion}
                          checked={selected.has(codigo)}
                          disabled={isInherited}
                          onToggle={() => {
                            const next = new Set(selected);
                            if (next.has(codigo)) next.delete(codigo);
                            else next.add(codigo);
                            onChange([...next].sort((a, b) => a.localeCompare(b)));
                          }}
                          showStatusHint={!isInherited}
                        />
                      );
                    })}
                  </Box>
                );
              })}
            </Box>
          </>
        )}
      </FormControl>
    </Box>
  );
}
