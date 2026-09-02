import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { listSurfaceSx } from '../listSurfaces';
import type { DashboardActividadMes } from './dashboard-types';
import { formatDashboardNumber } from './dashboard-utils';

type Props = {
  actividad?: DashboardActividadMes;
  loading?: boolean;
};

export function DashboardMonthlyComparison({ actividad, loading }: Props) {
  const variacion = actividad?.variacionPorcentaje ?? null;
  const trendIcon =
    variacion === null ? (
      <TrendingFlatIcon fontSize="small" color="action" />
    ) : variacion > 0 ? (
      <TrendingUpIcon fontSize="small" color="success" />
    ) : variacion < 0 ? (
      <TrendingDownIcon fontSize="small" color="error" />
    ) : (
      <TrendingFlatIcon fontSize="small" color="action" />
    );

  return (
    <Box sx={{ ...listSurfaceSx, p: { xs: 2, md: 2.5 }, height: '100%' }}>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
        Actividad del mes
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Comparación de documentos registrados respecto al mes anterior.
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Box
          sx={{
            flex: 1,
            p: 1.5,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            Este mes
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            {loading ? '…' : formatDashboardNumber(actividad?.esteMes ?? 0)}
          </Typography>
        </Box>
        <Box
          sx={{
            flex: 1,
            p: 1.5,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            Mes anterior
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            {loading ? '…' : formatDashboardNumber(actividad?.mesAnterior ?? 0)}
          </Typography>
        </Box>
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          p: 1.25,
          borderRadius: 2,
          bgcolor: (t) => alpha(t.palette.info.main, t.palette.mode === 'dark' ? 0.12 : 0.08),
        }}
      >
        {trendIcon}
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {loading
            ? 'Calculando variación…'
            : variacion !== null
              ? `${variacion > 0 ? '+' : ''}${variacion} %`
              : 'Sin variación comparable'}
        </Typography>
      </Stack>

      {!loading && actividad?.mensaje ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.5 }}>
          {actividad.mensaje}
        </Typography>
      ) : null}
    </Box>
  );
}
