import { Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import { listSurfaceSx } from '../listSurfaces';
import type { DashboardActividadPorUsuarioItem } from './dashboard-types';
import { formatDashboardNumber } from './dashboard-utils';

type Props = {
  items: DashboardActividadPorUsuarioItem[];
  loading?: boolean;
  canViewMore?: boolean;
};

export function DashboardUserActivity({ items, loading, canViewMore }: Props) {
  const theme = useTheme();
  const max = Math.max(1, ...items.map((i) => i.documentosRegistrados));

  if (loading) {
    return (
      <Box sx={{ ...listSurfaceSx, p: 2.5, height: '100%' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
          Actividad documental por usuario
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ ...listSurfaceSx, p: { xs: 2, md: 2.5 }, height: '100%' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
        Actividad documental por usuario
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Documentos registrados este mes en su ámbito de visibilidad.
      </Typography>

      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          No hay actividad documental para este período.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {items.map((row, idx) => {
            const pct = Math.round((row.documentosRegistrados / max) * 100);
            return (
              <Box key={row.usuarioId}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
                      {idx + 1}. {row.nombre}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.rol} · {formatDashboardNumber(row.documentosRegistrados)} documentos
                    </Typography>
                  </Box>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  sx={{
                    height: 8,
                    borderRadius: 999,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 999,
                      bgcolor: theme.palette.secondary.main,
                    },
                  }}
                />
              </Box>
            );
          })}
        </Stack>
      )}

      {canViewMore ? (
        <Button
          component={RouterLink}
          to="/admin/usuarios"
          size="small"
          sx={{ mt: 2, fontWeight: 800 }}
        >
          Ver más
        </Button>
      ) : null}
    </Box>
  );
}
