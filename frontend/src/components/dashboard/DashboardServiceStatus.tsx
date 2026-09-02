import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  dashboardCardPadding,
  dashboardSectionSubtitleSx,
  dashboardSectionTitleSx,
  dashboardSurfaceSx,
} from './dashboard-surface';

type HealthResponse = {
  status: string;
  service: string;
  database?: 'up' | 'down';
};

type Props = {
  health: HealthResponse | null;
  healthLoading?: boolean;
  healthError?: string | null;
  adminOk?: boolean | null;
  adminError?: boolean;
  adminLoading?: boolean;
};

export function DashboardServiceStatus({
  health,
  healthLoading,
  healthError,
  adminOk,
  adminError,
  adminLoading,
}: Props) {
  const apiOnline = !healthError && Boolean(health);
  const dbOnline = health?.database !== 'down';
  const operativo = apiOnline && dbOnline && adminOk !== false;

  return (
    <Box sx={{ ...dashboardSurfaceSx, p: dashboardCardPadding }}>
      <Typography component="h2" sx={dashboardSectionTitleSx}>
        Estado del servicio
      </Typography>
      <Typography sx={dashboardSectionSubtitleSx}>
        Disponibilidad de la plataforma y acceso administrativo.
      </Typography>

      <Stack spacing={1.25} sx={{ mt: 2 }}>
        {healthLoading || adminLoading ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <CircularProgress size={18} aria-label="Comprobando servicio" />
            <Typography variant="body2" color="text.secondary">
              Verificando…
            </Typography>
          </Stack>
        ) : (
          <>
            <StatusRow
              ok={apiOnline}
              icon={<StorageOutlinedIcon sx={{ fontSize: 18 }} />}
              label={apiOnline ? 'API en línea' : 'API no disponible'}
            />
            <StatusRow
              ok={dbOnline}
              icon={<StorageOutlinedIcon sx={{ fontSize: 18 }} />}
              label={dbOnline ? 'Base de datos conectada' : 'Base de datos sin conexión'}
            />
            <StatusRow
              ok={adminOk === true && !adminError}
              icon={<CheckCircleOutlineOutlinedIcon sx={{ fontSize: 18 }} />}
              label={
                adminOk === true
                  ? 'Acceso administrador confirmado'
                  : adminError
                    ? 'No se verificó el ámbito administrador'
                    : 'Verificando permisos…'
              }
            />
          </>
        )}
      </Stack>

      <Box
        sx={{
          mt: 2,
          px: 1.25,
          py: 1,
          borderRadius: 1.5,
          bgcolor: (t) =>
            alpha(operativo ? t.palette.success.main : t.palette.warning.main, 0.1),
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {operativo ? 'Operativo' : 'Revisar conectividad o permisos'}
        </Typography>
        {healthError ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
            {healthError}
          </Typography>
        ) : null}
      </Box>

      <Button
        component={RouterLink}
        to="/documentos"
        size="small"
        variant="outlined"
        sx={{ mt: 1.5, fontWeight: 700 }}
      >
        Ir a documentos
      </Button>
    </Box>
  );
}

function StatusRow({
  ok,
  icon,
  label,
}: {
  ok: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Box
        aria-hidden
        sx={{
          color: ok ? 'success.main' : 'error.main',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {ok ? icon : <ErrorOutlineOutlinedIcon sx={{ fontSize: 18 }} />}
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
    </Stack>
  );
}
