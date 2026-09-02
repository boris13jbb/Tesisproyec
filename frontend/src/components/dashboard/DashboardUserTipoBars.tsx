import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import type { DashboardActividadPorUsuarioTipoItem } from './dashboard-types';
import { colorForTipoCodigo } from './dashboard-tipo-chart-colors';
import { formatDashboardNumber } from './dashboard-utils';

type Props = {
  tipos: DashboardActividadPorUsuarioTipoItem[];
};

function useBarOrientation(tipos: DashboardActividadPorUsuarioTipoItem[]) {
  const hasLongLabel = tipos.some((t) => t.nombre.length > 12);
  return tipos.length > 4 || hasLongLabel ? 'horizontal' : 'vertical';
}

export function DashboardUserTipoBars({ tipos }: Props) {
  const theme = useTheme();
  const orientation = useBarOrientation(tipos);
  const max = Math.max(1, ...tipos.map((t) => t.cantidad));

  if (tipos.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ py: 1 }}>
        Sin tipos documentales en el período.
      </Typography>
    );
  }

  if (orientation === 'vertical') {
    return (
      <Box
        role="img"
        aria-label="Distribución por tipo documental"
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 1,
          minHeight: 88,
          pt: 1,
        }}
      >
        {tipos.map((tipo) => {
          const height = Math.max(12, Math.round((tipo.cantidad / max) * 72));
          const color = colorForTipoCodigo(tipo.codigo, theme);
          return (
            <Tooltip
              key={`${tipo.tipoId}-${tipo.codigo}`}
              title={
                <Box sx={{ fontSize: '0.75rem' }}>
                  <strong>{tipo.nombre}</strong>
                  <br />
                  {formatDashboardNumber(tipo.cantidad)} documentos
                </Box>
              }
              arrow
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: '1 1 0',
                  minWidth: 0,
                  maxWidth: 56,
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, fontSize: '0.65rem' }}>
                  {tipo.cantidad}
                </Typography>
                <Box
                  sx={{
                    width: '100%',
                    maxWidth: 36,
                    height,
                    borderRadius: 1,
                    bgcolor: color,
                    transition: 'opacity 0.15s',
                    '&:hover': { opacity: 0.85 },
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    mt: 0.75,
                    fontSize: '0.6rem',
                    textAlign: 'center',
                    lineHeight: 1.2,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    width: '100%',
                  }}
                >
                  {tipo.nombre}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    );
  }

  return (
    <Stack spacing={1} sx={{ py: 0.5 }}>
      {tipos.map((tipo) => {
        const pct = Math.round((tipo.cantidad / max) * 100);
        const color = colorForTipoCodigo(tipo.codigo, theme);
        return (
          <Tooltip
            key={`${tipo.tipoId}-${tipo.codigo}`}
            title={
              <Box sx={{ fontSize: '0.75rem' }}>
                <strong>{tipo.nombre}</strong>
                <br />
                {formatDashboardNumber(tipo.cantidad)} documentos
              </Box>
            }
            arrow
          >
            <Box>
              <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.25, gap: 1 }}>
                <Typography variant="caption" noWrap sx={{ minWidth: 0, flex: 1 }}>
                  {tipo.nombre}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, flexShrink: 0 }}>
                  {tipo.cantidad}
                </Typography>
              </Stack>
              <Box
                sx={{
                  height: 8,
                  borderRadius: 999,
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    width: `${pct}%`,
                    height: '100%',
                    borderRadius: 999,
                    bgcolor: color,
                    minWidth: tipo.cantidad > 0 ? 4 : 0,
                  }}
                />
              </Box>
            </Box>
          </Tooltip>
        );
      })}
    </Stack>
  );
}
