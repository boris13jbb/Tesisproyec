import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import { Box, Button, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { listSurfaceSx } from '../listSurfaces';
import type { DashboardUsuariosResumen } from './dashboard-types';
import { formatDashboardNumber } from './dashboard-utils';

type Props = {
  resumen?: DashboardUsuariosResumen | null;
  loading?: boolean;
  canManage?: boolean;
};

export function DashboardUsersSummary({ resumen, loading, canManage }: Props) {
  const navigate = useNavigate();
  if (!resumen && !loading) return null;

  return (
    <Box sx={{ ...listSurfaceSx, p: { xs: 2, md: 2.5 } }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1.5 }}>
        <Box
          aria-hidden
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: (t) => alpha(t.palette.success.main, 0.12),
            color: 'success.main',
          }}
        >
          <PeopleOutlinedIcon fontSize="small" />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Usuarios
        </Typography>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 1.5 }}>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            Activos
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {loading ? '…' : formatDashboardNumber(resumen?.activos ?? 0)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            Inactivos
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {loading ? '…' : formatDashboardNumber(resumen?.inactivos ?? 0)}
          </Typography>
        </Box>
      </Stack>

      {canManage ? (
        <Button size="small" variant="outlined" sx={{ fontWeight: 700 }} onClick={() => navigate('/admin/usuarios')}>
          Gestionar usuarios
        </Button>
      ) : null}
    </Box>
  );
}
