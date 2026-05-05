import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
            'No se pudo contactar al API. Compruebe que el backend esté en marcha.',
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
    <Container maxWidth="lg">
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Panel principal
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sesión: <strong>{user?.email}</strong> — roles:{' '}
            {user?.roles.map((r) => r.codigo).join(', ') || 'sin roles asignados'}
          </Typography>
        </Box>
      </Box>

      <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
        Accesos rápidos
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <DescriptionOutlinedIcon color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Documentos
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Consulte el registro documental, cree nuevos documentos y revise el detalle.
              </Typography>
            </CardContent>
            <CardActions sx={{ justifyContent: 'flex-end', pt: 0, pb: 2, px: 2 }}>
              <Button
                component={RouterLink}
                to="/documentos"
                endIcon={<ArrowForwardIosIcon sx={{ fontSize: 12 }} />}
              >
                Ir a documentos
              </Button>
            </CardActions>
          </Card>
        </Grid>
        {isAdmin && (
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                  Catálogos
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Dependencias, cargos, tipos documentales, series y subseries.
                </Typography>
              </CardContent>
              <CardActions sx={{ flexWrap: 'wrap', gap: 0.5, pb: 2, px: 2 }}>
                <Button size="small" component={RouterLink} to="/catalogos/dependencias">
                  Dependencias
                </Button>
                <Button size="small" component={RouterLink} to="/catalogos/series">
                  Series
                </Button>
              </CardActions>
            </Card>
          </Grid>
        )}
      </Grid>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
            Estado del servicio
          </Typography>
          <Box sx={{ minHeight: 40, display: 'flex', alignItems: 'center' }}>
            {healthLoading && (
              <CircularProgress size={28} aria-label="Comprobando salud del API" />
            )}
            {!healthLoading && healthError && (
              <Alert severity="warning">{healthError}</Alert>
            )}
            {!healthLoading && health && !healthError && (
              <Alert severity={health.database === 'down' ? 'warning' : 'success'}>
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
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Comprobación de rol administrador
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Ruta protegida en backend: <code>GET /api/v1/admin/ping</code> (JWT + rol ADMIN).
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
                No se pudo verificar el ámbito administrador (token o red).
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </Container>
  );
}
