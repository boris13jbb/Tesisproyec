import { Box, Stack, Typography } from '@mui/material';
import type { DashboardActividadPorUsuarioTipoItem } from './dashboard-types';
import { formatDashboardNumber } from './dashboard-utils';

type Props = {
  tipos: DashboardActividadPorUsuarioTipoItem[];
};

export function DashboardUserTipoCompact({ tipos }: Props) {
  if (tipos.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        Sin tipos documentales en el período.
      </Typography>
    );
  }

  return (
    <Stack spacing={0.5}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
        Por tipo documental
      </Typography>
      <Stack
        direction="row"
        useFlexGap
        sx={{ flexWrap: 'wrap', gap: 0.75, rowGap: 0.5 }}
      >
        {tipos.map((tipo) => (
          <Typography
            key={`${tipo.tipoId}-${tipo.codigo}`}
            variant="caption"
            sx={{
              fontWeight: 600,
              px: 0.75,
              py: 0.25,
              borderRadius: 0.75,
              bgcolor: 'action.hover',
              whiteSpace: 'nowrap',
            }}
          >
            {tipo.nombre}{' '}
            <Box component="span" sx={{ fontWeight: 800 }}>
              {formatDashboardNumber(tipo.cantidad)}
            </Box>
          </Typography>
        ))}
      </Stack>
    </Stack>
  );
}
