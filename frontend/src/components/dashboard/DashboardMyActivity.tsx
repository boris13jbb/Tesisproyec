import { Box, Stack, Typography } from '@mui/material';
import {
  dashboardCardPadding,
  dashboardSectionSubtitleSx,
  dashboardSectionTitleSx,
  dashboardSurfaceSx,
} from './dashboard-surface';
import {
  ACTIVIDAD_PERIODO_SUBTITLES,
  type ActividadDocumentalPeriodo,
} from './actividad-documental-periodo';
import type { DashboardMiActividadDocumental } from './dashboard-types';
import {
  DashboardActividadPeriodoSelect,
  DashboardUserEstadoMetrics,
} from './DashboardUserEstadoMetrics';
import { formatDashboardNumber } from './dashboard-utils';

type Props = {
  data?: DashboardMiActividadDocumental | null;
  periodo: ActividadDocumentalPeriodo;
  onPeriodoChange: (periodo: ActividadDocumentalPeriodo) => void;
  loading?: boolean;
};

export function DashboardMyActivity({
  data,
  periodo,
  onPeriodoChange,
  loading,
}: Props) {
  if (!data && !loading) {
    return null;
  }

  const sinActividad =
    data &&
    data.totalRegistrados === 0 &&
    data.totalEnRevision === 0 &&
    data.totalAprobados === 0 &&
    data.totalRechazados === 0;

  return (
    <Box sx={{ ...dashboardSurfaceSx, p: dashboardCardPadding }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'flex-start' },
          mb: 0.5,
        }}
      >
        <Typography component="h2" sx={dashboardSectionTitleSx}>
          Mi actividad
        </Typography>
        <DashboardActividadPeriodoSelect
          value={periodo}
          onChange={(v) => onPeriodoChange(v as ActividadDocumentalPeriodo)}
          disabled={loading}
        />
      </Stack>

      <Typography sx={{ ...dashboardSectionSubtitleSx, mb: 2 }}>
        {ACTIVIDAD_PERIODO_SUBTITLES[periodo]}
      </Typography>

      {loading ? (
        <Typography variant="body2" color="text.secondary">Actualizando…</Typography>
      ) : sinActividad ? (
        <Typography variant="body2" color="text.secondary">
          Sin actividad documental en este período.
        </Typography>
      ) : data ? (
        <>
          <DashboardUserEstadoMetrics
            compact
            totalDocumentosSubidos={data.totalRegistrados}
            metrics={{
              totalEnRevision: data.totalEnRevision,
              totalAprobados: data.totalAprobados,
              totalRechazados: data.totalRechazados,
              totalBorradores: data.totalBorradores,
            }}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Documentos visibles (histórico)
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {formatDashboardNumber(data.documentosVisibles)}
              </Typography>
            </Box>
          </Stack>
        </>
      ) : null}
    </Box>
  );
}
