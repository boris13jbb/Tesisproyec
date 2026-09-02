import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  dashboardCardPadding,
  dashboardSectionSubtitleSx,
  dashboardSectionTitleSx,
  dashboardSurfaceSx,
} from './dashboard-surface';
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
    <Box sx={{ ...dashboardSurfaceSx, p: dashboardCardPadding }}>
      <Typography component="h2" sx={dashboardSectionTitleSx}>
        Actividad del mes
      </Typography>
      <Typography sx={{ ...dashboardSectionSubtitleSx, mb: 2 }}>
        Comparación frente al mes anterior.
      </Typography>

      <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            Este mes
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
            {loading ? '…' : formatDashboardNumber(actividad?.esteMes ?? 0)}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            Mes anterior
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
            {loading ? '…' : formatDashboardNumber(actividad?.mesAnterior ?? 0)}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            Variación
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            {trendIcon}
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
              {loading
                ? '…'
                : variacion !== null
                  ? `${variacion > 0 ? '+' : ''}${variacion} %`
                  : '—'}
            </Typography>
          </Stack>
        </Box>
      </Stack>

      {!loading && actividad?.mensaje ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            lineHeight: 1.45,
            p: 1.25,
            borderRadius: 1.5,
            bgcolor: (t) => alpha(t.palette.info.main, t.palette.mode === 'dark' ? 0.12 : 0.06),
          }}
        >
          {actividad.mensaje}
        </Typography>
      ) : null}
    </Box>
  );
}
