import { Box, CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { userHasAdminAccess } from '../auth/role-utils';

type Props = {
  /** Permisos requeridos (códigos `Permission.codigo`). */
  permissions: string[];
  /** Si true (default), el usuario debe tener todos los permisos listados. */
  requireAll?: boolean;
};

export function PermissionRoute({ permissions, requireAll = true }: Props) {
  const { user, ready } = useAuth();
  const location = useLocation();
  const [codes, setCodes] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiClient.get<{ codigos: string[] }>('/rbac/me/permissions');
        if (!cancelled) {
          setCodes(res.data.codigos ?? []);
          setLoadError(false);
        }
      } catch {
        if (!cancelled) {
          setCodes([]);
          setLoadError(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  if (!ready) {
    return null;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (userHasAdminAccess(user.roles)) {
    return <Outlet />;
  }

  if (codes === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} aria-label="Verificando permisos" />
      </Box>
    );
  }

  if (loadError) {
    return <Navigate to="/forbidden" replace />;
  }

  const allowed = requireAll
    ? permissions.every((p) => codes.includes(p))
    : permissions.some((p) => codes.includes(p));

  if (!allowed) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}
