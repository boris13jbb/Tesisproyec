import { Box, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import type {
  DashboardTipoDocumentalSerie,
  DashboardTipoPorMesItem,
} from './dashboard-types';
import { buildTipoColorMap } from './dashboard-tipo-chart-colors';

type Props = {
  series: DashboardTipoDocumentalSerie[];
  items: DashboardTipoPorMesItem[];
  loading?: boolean;
};

export function DashboardTypesByMonth({ series, items, loading }: Props) {
  const theme = useTheme();
  const codigos = series.map((s) => s.codigo);
  const colorMap = buildTipoColorMap(codigos, theme);
  const maxTotal = Math.max(1, ...items.map((i) => i.total));

  if (loading) {
    return (
      <Box sx={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary">Cargando composición por tipo…</Typography>
      </Box>
    );
  }

  if (items.length === 0 || series.length === 0) {
    return (
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
          Tipo documental por mes
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Composición mensual por tipo documental (últimos 12 meses).
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
          No hay datos de tipos documentales en el período.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
        Tipo documental por mes
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Composición mensual por tipo documental (últimos 12 meses).
      </Typography>

      <Box
        role="img"
        aria-label="Gráfico de barras apiladas por tipo documental y mes"
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: { xs: 0.75, sm: 1.25 },
          minHeight: 200,
          px: { xs: 0.5, sm: 1 },
          pt: 1,
          overflowX: 'auto',
        }}
      >
        {items.map((month) => {
          const barHeight =
            month.total > 0 ? Math.max(24, Math.round((month.total / maxTotal) * 120)) : 4;
          const tooltipLines = month.tipos
            .filter((t) => t.cantidad > 0)
            .map((t) => `${t.nombre}: ${t.cantidad}`)
            .join('\n');
          const tooltipTitle = `${month.nombreMes} ${month.anio}\n${tooltipLines}\nTotal: ${month.total}`;

          return (
            <Tooltip
              key={`${month.anio}-${month.mes}`}
              title={
                <Box sx={{ whiteSpace: 'pre-line', fontSize: '0.75rem' }}>
                  {tooltipTitle}
                </Box>
              }
              arrow
            >
              <Box
                sx={{
                  flex: '1 1 0',
                  minWidth: { xs: 28, sm: 36 },
                  maxWidth: 56,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.75,
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 800, lineHeight: 1, fontSize: '0.7rem' }}>
                  {month.total}
                </Typography>
                <Box
                  sx={{
                    width: '100%',
                    height: barHeight,
                    display: 'flex',
                    flexDirection: 'column-reverse',
                    borderRadius: 1,
                    overflow: 'hidden',
                    bgcolor: alpha(theme.palette.action.disabled, 0.15),
                  }}
                >
                  {month.tipos.map((seg) => {
                    if (seg.cantidad <= 0 || month.total <= 0) return null;
                    const segHeight = Math.max(2, Math.round((seg.cantidad / month.total) * barHeight));
                    const color = colorMap.get(seg.codigo) ?? theme.palette.primary.main;
                    return (
                      <Box
                        key={seg.codigo}
                        sx={{
                          height: segHeight,
                          bgcolor: alpha(color, 0.9),
                          transition: 'height 0.25s ease',
                        }}
                      />
                    );
                  })}
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700, fontSize: '0.65rem', textAlign: 'center' }}
                >
                  {month.nombreMes.slice(0, 3)}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          mt: 2,
          justifyContent: { xs: 'center', sm: 'flex-start' },
        }}
      >
        {series.map((s) => (
          <Box key={s.codigo} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: colorMap.get(s.codigo) ?? theme.palette.primary.main,
              }}
            />
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {s.nombre}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
