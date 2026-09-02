import { Avatar, Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { listSurfaceSx } from '../listSurfaces';
import type { DashboardActividadPorUsuarioItem } from './dashboard-types';
import { DashboardUserEstadoMetrics } from './DashboardUserEstadoMetrics';
import { DashboardUserTipoCompact } from './DashboardUserTipoCompact';

type Props = {
  item: DashboardActividadPorUsuarioItem;
};

function initialsFromName(nombre: string, email: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (email.split('@')[0] ?? 'U').slice(0, 2).toUpperCase();
}

export function DashboardUserDocumentCard({ item }: Props) {
  const showEmail =
    item.nombre !== item.email && item.email !== 'Usuario no identificado';

  return (
    <Box
      sx={{
        ...listSurfaceSx,
        p: { xs: 2, md: 2.25 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{ mb: 1.5, alignItems: 'flex-start' }}>
        <Avatar
          sx={{
            width: 36,
            height: 36,
            fontSize: '0.8rem',
            fontWeight: 800,
            bgcolor: 'primary.main',
            flexShrink: 0,
          }}
        >
          {initialsFromName(item.nombre, item.email)}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Tooltip title={item.nombre}>
            <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
              {item.nombre}
            </Typography>
          </Tooltip>
          {showEmail ? (
            <Tooltip title={item.email}>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {item.email}
              </Typography>
            </Tooltip>
          ) : null}
          <Chip
            label={item.rol}
            size="small"
            sx={{
              mt: 0.75,
              height: 22,
              fontSize: '0.65rem',
              fontWeight: 700,
              maxWidth: '100%',
              '& .MuiChip-label': {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              },
            }}
          />
        </Box>
      </Stack>

      <DashboardUserEstadoMetrics
        totalDocumentosSubidos={item.totalRegistrados}
        metrics={{
          totalEnRevision: item.totalEnRevision,
          totalAprobados: item.totalAprobados,
          totalRechazados: item.totalRechazados,
          totalBorradores: item.totalBorradores,
        }}
      />

      <Box sx={{ flex: 1, minHeight: 0, mt: 'auto' }}>
        <DashboardUserTipoCompact tipos={item.tipos} />
      </Box>
    </Box>
  );
}
