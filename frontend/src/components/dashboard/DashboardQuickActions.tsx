import { Box, Button, Grid, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import {
  dashboardCardPadding,
  dashboardSectionSubtitleSx,
  dashboardSectionTitleSx,
  dashboardSurfaceSx,
} from './dashboard-surface';
import type { QuickAction } from './dashboard-quick-actions';

type Props = {
  actions: QuickAction[];
  loading?: boolean;
};

export function DashboardQuickActions({ actions, loading }: Props) {
  const navigate = useNavigate();

  if (!loading && actions.length === 0) return null;

  return (
    <Box sx={{ ...dashboardSurfaceSx, p: dashboardCardPadding }}>
      <Typography component="h2" sx={dashboardSectionTitleSx}>
        Acciones rápidas
      </Typography>
      <Typography sx={{ ...dashboardSectionSubtitleSx, mb: 1.5 }}>
        Accesos directos según sus permisos.
      </Typography>

      <Grid container spacing={1.25}>
        {(loading ? [{ id: 'loading' }] : actions).map((action) => (
          <Grid key={action.id} size={{ xs: 12, sm: 6 }}>
            <Button
              fullWidth
              variant="outlined"
              disabled={loading}
              onClick={() => !loading && 'to' in action && navigate(action.to)}
              startIcon={'icon' in action ? action.icon : undefined}
              sx={{
                justifyContent: 'flex-start',
                py: 1,
                px: 1.25,
                textAlign: 'left',
                borderRadius: 1.5,
                fontWeight: 700,
                fontSize: '0.8125rem',
                '&:hover': {
                  bgcolor: (t) => alpha(t.palette.secondary.main, 0.06),
                },
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {'label' in action ? action.label : 'Cargando…'}
                </Typography>
                {'description' in action ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {action.description}
                  </Typography>
                ) : null}
              </Box>
            </Button>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
