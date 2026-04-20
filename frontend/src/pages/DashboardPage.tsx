import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Typography,
} from '@mui/material';
import { apiClient } from '../api/client';
import { useAuth } from '../auth/useAuth';

type HealthResponse = {
  status: string;
  service: string;
  database?: 'up' | 'down';
};

export function DashboardPage() {
  const { user } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [adminOk, setAdminOk] = useState<boolean | null>(null);
  const [adminError, setAdminError] = useState(false);

  const isAdmin = user?.roles.some((r) => r.codigo === 'ADMIN') ?? false;

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<HealthResponse>('/health')
      .then((res) => {
        if (!cancelled) {
          setHealth(res.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHealthError(
            'No se pudo contactar al API. Comprueba que el backend esté en marcha.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHealthLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    let cancelled = false;
    apiClient
      .get<{ ok: boolean; scope: string }>('/admin/ping')
      .then((res) => {
        if (!cancelled) {
          setAdminOk(res.data.ok);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAdminError(true);
          setAdminOk(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  return (
    <Container maxWidth="md">
      <Typography variant="h4" component="h1" gutterBottom>
        Panel principal
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Prototipo — ETAPA 4 (shell de navegación). Sesión activa como{' '}
        <strong>{user?.email}</strong> (
        {user?.roles.map((r) => r.codigo).join(', ') ?? 'sin roles'}).
      </Typography>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Estado del API y base de datos
          </Typography>
          <Box sx={{ minHeight: 40, display: 'flex', alignItems: 'center' }}>
            {healthLoading && (
              <CircularProgress size={28} aria-label="Comprobando salud del API" />
            )}
            {!healthLoading && healthError && (
              <Alert severity="warning">{healthError}</Alert>
            )}
            {!healthLoading && health && !healthError && (
              <Alert
                severity={health.database === 'down' ? 'warning' : 'success'}
              >
                API en línea: {health.service} — estado {health.status}
                {health.database !== undefined &&
                  ` — base de datos: ${health.database === 'up' ? 'conectada' : 'sin conexión'}`}
              </Alert>
            )}
          </Box>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Comprobación de rol administrador
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Ruta protegida en backend: <code>GET /api/v1/admin/ping</code> (JWT +
              rol ADMIN).
            </Typography>
            {adminOk === null && !adminError && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <CircularProgress size={22} />
                <Typography variant="body2" color="text.secondary">
                  Verificando permisos…
                </Typography>
              </Box>
            )}
            {adminOk === true && (
              <Chip color="success" label="Acceso administrador confirmado" size="small" />
            )}
            {adminError && (
              <Alert severity="error" sx={{ mt: 1 }}>
                No se pudo verificar el ámbito admin (token o red).
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </Container>
  );
}
