import { Box, Stack, Typography } from '@mui/material';
import { listSurfaceSx } from '../listSurfaces';
import type { DashboardMiActividadDocumental } from './dashboard-types';
import { formatDashboardNumber } from './dashboard-utils';

type Props = {
  data?: DashboardMiActividadDocumental | null;
  loading?: boolean;
};

export function DashboardMyActivity({ data, loading }: Props) {
  if (loading) {
    return (
      <Box sx={{ ...listSurfaceSx, p: 2.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Mi actividad</Typography>
      </Box>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Box sx={{ ...listSurfaceSx, p: { xs: 2, md: 2.5 } }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
        Mi actividad
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Sus documentos en el ámbito visible del sistema.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Box>
          <Typography variant="caption" color="text.secondary">Registrados este mes</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {formatDashboardNumber(data.documentosRegistradosEsteMes)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Documentos visibles</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {formatDashboardNumber(data.documentosVisibles)}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}
