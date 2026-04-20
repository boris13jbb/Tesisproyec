import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

type Props = {
  /** Códigos de rol requeridos (p. ej. ADMIN). */
  roles: string[];
};

export function RoleRoute({ roles }: Props) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return null;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  const userRoles = user.roles.map((r) => r.codigo);
  const allowed = roles.some((r) => userRoles.includes(r));
  if (!allowed) {
    return <Navigate to="/forbidden" replace />;
  }
  return <Outlet />;
}

