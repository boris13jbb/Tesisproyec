import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Grid,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { listSurfaceSx } from '../listSurfaces';
import {
  ACTIVIDAD_PERIODO_SUBTITLES,
  type ActividadDocumentalPeriodo,
} from './actividad-documental-periodo';
import type {
  DashboardActividadPorUsuarioItem,
  DashboardActividadPorUsuarioMeta,
} from './dashboard-types';
import { DashboardUserDocumentCard } from './DashboardUserDocumentCard';
import { DashboardActividadPeriodoSelect } from './DashboardUserEstadoMetrics';
import { formatDashboardNumber } from './dashboard-utils';

const INITIAL_VISIBLE = 3;

type Props = {
  items: DashboardActividadPorUsuarioItem[];
  meta?: DashboardActividadPorUsuarioMeta | null;
  periodo: ActividadDocumentalPeriodo;
  onPeriodoChange: (periodo: ActividadDocumentalPeriodo) => void;
  loading?: boolean;
  canViewMore?: boolean;
};

function LoadingSkeleton() {
  return (
    <Grid container spacing={2}>
      {[0, 1, 2].map((i) => (
        <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
          <Box sx={{ ...listSurfaceSx, p: 2.25 }}>
            <Stack direction="row" spacing={1.25} sx={{ mb: 2 }}>
              <Skeleton variant="circular" width={36} height={36} />
              <Box sx={{ flex: 1 }}>
                <Skeleton width="70%" />
                <Skeleton width="50%" />
                <Skeleton width={80} height={22} sx={{ mt: 0.75 }} />
              </Box>
            </Stack>
            <Skeleton width="40%" height={28} sx={{ mb: 1 }} />
            <Skeleton width="20%" height={36} sx={{ mb: 2 }} />
            <Grid container spacing={1} sx={{ mb: 2 }}>
              {[0, 1, 2].map((j) => (
                <Grid key={j} size={{ xs: 6, sm: 4 }}>
                  <Skeleton variant="rounded" height={44} />
                </Grid>
              ))}
            </Grid>
            <Skeleton width="40%" />
            <Skeleton width="80%" />
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}

export function DashboardUserActivity({
  items,
  meta,
  periodo,
  onPeriodoChange,
  loading,
  canViewMore,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const visibleItems = useMemo(
    () => (expanded ? items : items.slice(0, INITIAL_VISIBLE)),
    [expanded, items],
  );
  const hasHidden = items.length > INITIAL_VISIBLE;
  const subtitle = ACTIVIDAD_PERIODO_SUBTITLES[periodo];

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'flex-start' },
          mb: 0.5,
          gap: 1,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Actividad documental por usuario
        </Typography>
        <DashboardActividadPeriodoSelect
          value={periodo}
          onChange={(v) => onPeriodoChange(v as ActividadDocumentalPeriodo)}
          disabled={loading}
        />
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {subtitle} Incluye distribución compacta por tipo documental.
      </Typography>

      {meta && meta.documentosSinCreadorIdentificado > 0 ? (
        <Typography variant="caption" color="warning.main" sx={{ display: 'block', mb: 1.5 }}>
          {formatDashboardNumber(meta.documentosSinCreadorIdentificado)} documento(s) con
          creador no identificado en el sistema.
        </Typography>
      ) : null}

      {loading ? (
        <LoadingSkeleton />
      ) : items.length === 0 ? (
        <Box sx={{ ...listSurfaceSx, p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Sin actividad documental en este período.
          </Typography>
        </Box>
      ) : (
        <>
          <Grid container spacing={2}>
            {visibleItems.map((item) => (
              <Grid key={item.usuarioId} size={{ xs: 12, sm: 6, lg: 4 }}>
                <DashboardUserDocumentCard item={item} />
              </Grid>
            ))}
          </Grid>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
            {hasHidden && !expanded ? (
              <Button
                size="small"
                variant="outlined"
                onClick={() => setExpanded(true)}
                sx={{ fontWeight: 800, alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
              >
                Mostrar más ({items.length - INITIAL_VISIBLE} adicionales)
              </Button>
            ) : null}
            {canViewMore ? (
              <Button
                component={RouterLink}
                to="/admin/usuarios"
                size="small"
                sx={{ fontWeight: 800, alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
              >
                Ver usuarios
              </Button>
            ) : null}
          </Stack>
        </>
      )}
    </Box>
  );
}
