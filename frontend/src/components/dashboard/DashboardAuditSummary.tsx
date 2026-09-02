import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import { Box, Button, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { listSurfaceSx } from '../listSurfaces';
import type { DashboardAuditResumen } from './dashboard-types';
import { formatDashboardNumber } from './dashboard-utils';

type Props = {
  resumen?: DashboardAuditResumen | null;
  loading?: boolean;
  canView?: boolean;
};

export function DashboardAuditSummary({ resumen, loading, canView }: Props) {
  const navigate = useNavigate();
  if (!canView && !loading) return null;

  const total = resumen?.accionesHoy ?? 0;
  const ok = resumen?.okHoy ?? 0;
  const fail = resumen?.failHoy ?? 0;
  const okPct = total > 0 ? Math.round((ok / total) * 100) : 0;

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
            bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
            color: 'primary.main',
          }}
        >
          <FactCheckOutlinedIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
            Actividad del sistema
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Registros de auditoría de hoy.
          </Typography>
        </Box>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
        <Chip size="small" label={`Hoy: ${loading ? '…' : formatDashboardNumber(total)}`} sx={{ fontWeight: 700 }} />
        <Chip size="small" color="success" variant="outlined" label={`OK: ${loading ? '…' : ok}`} sx={{ fontWeight: 700 }} />
        <Chip
          size="small"
          color={fail > 0 ? 'error' : 'default'}
          variant="outlined"
          label={`Fallidas: ${loading ? '…' : fail}`}
          sx={{ fontWeight: 700 }}
        />
      </Stack>

      <LinearProgress
        variant="determinate"
        value={loading ? 0 : okPct}
        aria-label={`Acciones exitosas hoy: ${okPct} por ciento`}
        sx={{
          height: 8,
          borderRadius: 999,
          mb: 1.5,
          bgcolor: 'action.hover',
        }}
      />

      <Button size="small" variant="outlined" sx={{ fontWeight: 700 }} onClick={() => navigate('/admin/auditoria')}>
        Ver auditoría
      </Button>
    </Box>
  );
}
