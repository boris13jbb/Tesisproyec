import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { listSurfaceSx } from '../listSurfaces';
import type { DashboardDistribucionPorTipoItem } from './dashboard-types';
import { buildTipoColorMap } from './dashboard-tipo-chart-colors';
import { formatDashboardNumber } from './dashboard-utils';

type Props = {
  items: DashboardDistribucionPorTipoItem[];
  totalDocumentos: number;
  loading?: boolean;
};

export function DashboardTypeDistribution({ items, totalDocumentos, loading }: Props) {
  const theme = useTheme();
  const total =
    totalDocumentos > 0
      ? totalDocumentos
      : items.reduce((s, i) => s + i.cantidad, 0);
  const colorMap = buildTipoColorMap(items.map((i) => i.codigo), theme);

  if (loading) {
    return (
      <Box sx={{ ...listSurfaceSx, p: { xs: 2, md: 2.5 }, height: '100%', minHeight: 280 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Distribución por tipo de documento</Typography>
        <Box sx={{ height: 160, bgcolor: 'action.hover', borderRadius: 2 }} />
      </Box>
    );
  }

  if (items.length === 0 || total <= 0) {
    return (
      <Box sx={{ ...listSurfaceSx, p: { xs: 2, md: 2.5 }, height: '100%' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
          Distribución por tipo de documento
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Composición de los documentos registrados según su tipo.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
          Aún no existen documentos clasificados por tipo.
        </Typography>
      </Box>
    );
  }

  let cursor = 0;
  const stops: string[] = [];
  for (const item of items) {
    const share = (item.cantidad / total) * 100;
    const color = colorMap.get(item.codigo) ?? theme.palette.primary.main;
    const from = cursor;
    const to = cursor + share;
    stops.push(`${color} ${from}% ${to}%`);
    cursor = to;
  }

  return (
    <Box sx={{ ...listSurfaceSx, p: { xs: 2, md: 2.5 }, height: '100%' }}>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
        Distribución por tipo de documento
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Composición de los documentos registrados según su tipo.
      </Typography>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { xs: 'center', sm: 'flex-start' } }}
      >
        <Box sx={{ position: 'relative', width: 160, height: 160, flexShrink: 0 }}>
          <Box
            role="img"
            aria-label="Distribución por tipo de documento"
            sx={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: `conic-gradient(${stops.join(', ')})`,
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: '28%',
              borderRadius: '50%',
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1 }}>
              {formatDashboardNumber(total)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              documentos
            </Typography>
          </Box>
        </Box>

        <Stack spacing={1} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          {items.map((item) => {
            const color = colorMap.get(item.codigo) ?? theme.palette.primary.main;
            return (
              <Tooltip
                key={item.codigo}
                title={`${item.nombre}: ${item.cantidad} documentos (${item.porcentaje}%)`}
                arrow
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: color,
                      flexShrink: 0,
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                      {item.nombre}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.cantidad} · {item.porcentaje}%
                    </Typography>
                  </Box>
                </Stack>
              </Tooltip>
            );
          })}
        </Stack>
      </Stack>
    </Box>
  );
}
