import { Box, Skeleton, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

export type MonthlyBarItem = {
  anio: number;
  mes: number;
  nombreMes: string;
  cantidad: number;
};

type Props = {
  items: MonthlyBarItem[];
  loading?: boolean;
};

export function DocumentosMonthlyChart({ items, loading }: Props) {
  const theme = useTheme();
  const max = Math.max(1, ...items.map((i) => i.cantidad));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, minHeight: 200, pt: 1 }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            sx={{ flex: '1 1 0', minWidth: 28, height: 40 + (i % 4) * 18, borderRadius: 1 }}
          />
        ))}
      </Box>
    );
  }

  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
        Sin datos mensuales para mostrar.
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
        Documentos registrados por mes
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Evolución de documentos registrados durante los últimos 12 meses.
      </Typography>
      <Box
        role="img"
        aria-label="Gráfico de documentos registrados por mes"
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
        {items.map((item) => {
          const barHeight = item.cantidad > 0 ? Math.max(24, Math.round((item.cantidad / max) * 120)) : 4;
          const tooltipTitle = `${item.nombreMes} ${item.anio}`;
          const tooltipBody = `${item.cantidad} documento${item.cantidad === 1 ? '' : 's'}`;
          return (
            <Tooltip
              key={`${item.anio}-${item.mes}`}
              title={
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }}>
                    {tooltipTitle}
                  </Typography>
                  <Typography variant="caption">{tooltipBody}</Typography>
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
                  {item.cantidad}
                </Typography>
                <Box
                  sx={{
                    width: '100%',
                    height: barHeight,
                    bgcolor: alpha(theme.palette.primary.main, item.cantidad > 0 ? 0.88 : 0.2),
                    borderRadius: 1,
                    transition: 'height 0.25s ease, background-color 0.2s ease',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.secondary.main, 0.9),
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700, fontSize: '0.65rem', textAlign: 'center' }}
                >
                  {item.nombreMes.slice(0, 3)}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
}
