import { Box, Button, Grid, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { listSurfaceSx } from '../listSurfaces';
import type { QuickAction } from './dashboard-quick-actions';

type Props = {
  actions: QuickAction[];
  loading?: boolean;
};

export function DashboardQuickActions({ actions, loading }: Props) {
  const navigate = useNavigate();

  if (!loading && actions.length === 0) return null;

  return (
    <Box sx={{ ...listSurfaceSx, p: { xs: 2, md: 2.5 }, height: '100%' }}>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
        Acciones rápidas
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
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
                py: 1.25,
                px: 1.5,
                textAlign: 'left',
                borderRadius: 2,
                fontWeight: 700,
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
