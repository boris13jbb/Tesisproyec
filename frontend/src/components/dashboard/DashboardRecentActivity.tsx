import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import { Box, Button, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import { EmptyState } from '../EmptyState';
import { listSurfaceSx } from '../listSurfaces';
import type { DashboardActivityItem } from './dashboard-types';
import { formatRelativeEs } from './dashboard-utils';

type Props = {
  items: DashboardActivityItem[];
  loading?: boolean;
  showViewAll?: boolean;
  viewAllTo?: string;
};

export function DashboardRecentActivity({
  items,
  loading,
  showViewAll,
  viewAllTo = '/documentos',
}: Props) {
  const theme = useTheme();

  return (
    <Box sx={{ ...listSurfaceSx, overflow: 'hidden', height: '100%' }}>
      <Box sx={{ px: 2.5, pt: 2.25, pb: 1.5 }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
              Actividad reciente
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Últimas acciones relevantes en el sistema.
            </Typography>
          </Box>
          {showViewAll ? (
            <Button component={RouterLink} to={viewAllTo} variant="text" size="small" sx={{ fontWeight: 700 }}>
              Ver todos
            </Button>
          ) : null}
        </Stack>
      </Box>

      <Box sx={{ px: 1.5, pb: 2 }}>
        {loading ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1.25, py: 2 }}>
            Cargando actividad…
          </Typography>
        ) : items.length === 0 ? (
          <EmptyState dense title="Aún no existe actividad reciente." />
        ) : (
          <Stack spacing={0.5} role="list" aria-label="Actividad reciente">
            {items.map((item) => (
              <Stack
                key={item.id}
                direction="row"
                spacing={1.5}
                role="listitem"
                sx={{
                  px: 1.25,
                  py: 1.1,
                  borderRadius: 2,
                  alignItems: 'flex-start',
                }}
              >
                <Box
                  aria-hidden
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1.5,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: alpha(theme.palette.secondary.main, 0.12),
                    color: 'secondary.main',
                    flexShrink: 0,
                    mt: 0.15,
                  }}
                >
                  <HistoryOutlinedIcon sx={{ fontSize: 16 }} />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.35 }}>
                    {item.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatRelativeEs(item.at)}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
