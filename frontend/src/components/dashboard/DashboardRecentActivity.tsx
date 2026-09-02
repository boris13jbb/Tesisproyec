import { Box, Button, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { EmptyState } from '../EmptyState';
import {
  dashboardCardPadding,
  dashboardSectionSubtitleSx,
  dashboardSectionTitleSx,
  dashboardSurfaceSx,
} from './dashboard-surface';
import type { DashboardActivityItem } from './dashboard-types';
import { formatRelativeEs } from './dashboard-utils';

const MAX_VISIBLE = 5;

type Props = {
  items: DashboardActivityItem[];
  loading?: boolean;
  showViewAll?: boolean;
  viewAllTo?: string;
  viewAllLabel?: string;
};

export function DashboardRecentActivity({
  items,
  loading,
  showViewAll,
  viewAllTo = '/documentos',
  viewAllLabel = 'Ver toda la actividad',
}: Props) {
  const visible = items.slice(0, MAX_VISIBLE);

  return (
    <Box sx={{ ...dashboardSurfaceSx, overflow: 'hidden', height: '100%' }}>
      <Box sx={{ px: dashboardCardPadding.xs, pt: dashboardCardPadding.xs, pb: 1 }}>
        <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
          <Box>
            <Typography component="h2" sx={dashboardSectionTitleSx}>
              Actividad reciente
            </Typography>
            <Typography sx={dashboardSectionSubtitleSx}>
              Últimas acciones relevantes en el sistema.
            </Typography>
          </Box>
          {showViewAll ? (
            <Button
              component={RouterLink}
              to={viewAllTo}
              variant="text"
              size="small"
              sx={{ fontWeight: 700, flexShrink: 0, mt: 0.25 }}
            >
              Ver todos
            </Button>
          ) : null}
        </Stack>
      </Box>

      <Box sx={{ px: 1.25, pb: dashboardCardPadding.xs }}>
        {loading ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 0.5, py: 1.5 }}>
            Cargando actividad…
          </Typography>
        ) : visible.length === 0 ? (
          <EmptyState dense title="Aún no existe actividad reciente." />
        ) : (
          <Stack spacing={0.25} role="list" aria-label="Actividad reciente">
            {visible.map((item) => (
              <Stack
                key={item.id}
                direction="row"
                spacing={1}
                role="listitem"
                sx={{
                  px: 0.75,
                  py: 0.85,
                  borderRadius: 1.5,
                  alignItems: 'center',
                }}
              >
                <Box
                  aria-hidden
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'secondary.main',
                    flexShrink: 0,
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }} noWrap>
                  {item.label}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, fontWeight: 600 }}>
                  {formatRelativeEs(item.at)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}

        {!loading && items.length > MAX_VISIBLE ? (
          <Button
            component={RouterLink}
            to={viewAllTo}
            size="small"
            variant="text"
            sx={{ mt: 0.5, ml: 0.5, fontWeight: 700 }}
          >
            {viewAllLabel}
          </Button>
        ) : null}
      </Box>
    </Box>
  );
}
