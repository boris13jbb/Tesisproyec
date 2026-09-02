import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { labelDocumentoEstado, documentoEstadoTone } from '../../constants/documento-estado';
import {
  dashboardCardPadding,
  dashboardSectionSubtitleSx,
  dashboardSectionTitleSx,
  dashboardSurfaceSx,
} from './dashboard-surface';
import type { DashboardPendienteItem } from './dashboard-types';
import { formatDashboardNumber, formatRelativeEs } from './dashboard-utils';

type Props = {
  items: DashboardPendienteItem[];
  totalPendientes: number;
  loading?: boolean;
  visible?: boolean;
};

export function DashboardPendingReview({ items, totalPendientes, loading, visible = true }: Props) {
  const theme = useTheme();
  const navigate = useNavigate();

  if (!visible) return null;

  return (
    <Box sx={{ ...dashboardSurfaceSx, overflow: 'hidden' }}>
      <Box sx={{ px: dashboardCardPadding.xs, pt: dashboardCardPadding.xs, pb: 1 }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box>
            <Typography component="h2" sx={dashboardSectionTitleSx}>
              Requieren atención
            </Typography>
            <Typography sx={dashboardSectionSubtitleSx}>
              Documentos pendientes de revisión.
            </Typography>
          </Box>
          <Chip
            size="small"
            color="warning"
            label={loading ? '…' : String(totalPendientes)}
            sx={{ fontWeight: 800 }}
          />
        </Stack>
      </Box>

      <Box sx={{ px: 1.5, pb: 2 }}>
        {loading ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1.25, py: 2 }}>
            Cargando pendientes…
          </Typography>
        ) : items.length === 0 ? (
          <Box sx={{ px: 1.25, py: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
              {formatDashboardNumber(totalPendientes)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No hay documentos pendientes de revisión.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={0.5} role="list" aria-label="Documentos pendientes de revisión">
            {items.map((d) => {
              const tone = documentoEstadoTone(d.estado);
              const accent = theme.palette[tone].main;
              return (
                <Box
                  key={d.id}
                  role="listitem"
                  tabIndex={0}
                  onClick={() => navigate(`/documentos/${d.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/documentos/${d.id}`);
                    }
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 1.25,
                    py: 1,
                    borderRadius: 2,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                    '&:focus-visible': {
                      outline: '2px solid',
                      outlineColor: 'secondary.main',
                      outlineOffset: 2,
                    },
                  }}
                >
                  <Box
                    aria-hidden
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: alpha(accent, 0.14),
                      color: accent,
                      flexShrink: 0,
                    }}
                  >
                    <PendingActionsOutlinedIcon sx={{ fontSize: 18 }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                      {d.asunto}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {d.codigo}
                      {d.tipoDocumental ? ` · ${d.tipoDocumental}` : ''} · {labelDocumentoEstado(d.estado)}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                    {formatRelativeEs(d.ultimaActividadAt)}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        )}

        <Button
          variant="outlined"
          size="small"
          sx={{ mt: 1.5, ml: 1.25, fontWeight: 700 }}
          onClick={() => navigate('/documentos?estado=EN_REVISION')}
        >
          Ver todos
        </Button>
      </Box>
    </Box>
  );
}
