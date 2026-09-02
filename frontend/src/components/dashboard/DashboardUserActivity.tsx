import { useMemo, useState } from 'react';
import { Box, Button, Grid, Skeleton, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { listSurfaceSx } from '../listSurfaces';
import type { DashboardActividadPorUsuarioItem } from './dashboard-types';
import { DashboardUserDocumentCard } from './DashboardUserDocumentCard';

const INITIAL_VISIBLE = 3;

type Props = {
  items: DashboardActividadPorUsuarioItem[];
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
            <Skeleton width="60%" sx={{ mb: 2 }} />
            <Skeleton variant="rounded" height={72} />
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}

export function DashboardUserActivity({ items, loading, canViewMore }: Props) {
  const [expanded, setExpanded] = useState(false);

  const visibleItems = useMemo(
    () => (expanded ? items : items.slice(0, INITIAL_VISIBLE)),
    [expanded, items],
  );
  const hasHidden = items.length > INITIAL_VISIBLE;

  if (loading) {
    return (
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
          Registros por usuario y tipo documental
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Distribución de los documentos registrados por cada usuario según su tipo documental.
          Período: <strong>este mes</strong>.
        </Typography>
        <LoadingSkeleton />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
        Registros por usuario y tipo documental
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Distribución de los documentos registrados por cada usuario según su tipo documental.
        Período: <strong>este mes</strong>.
      </Typography>

      {items.length === 0 ? (
        <Box sx={{ ...listSurfaceSx, p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No hay documentos registrados por usuarios en este período.
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
