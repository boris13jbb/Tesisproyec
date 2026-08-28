import { Box, Tooltip, Typography } from '@mui/material';
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
      <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
        Cargando gráfico…
      </Typography>
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
    <Box
      role="img"
      aria-label="Gráfico de documentos registrados por mes"
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: { xs: 0.75, sm: 1.25 },
        minHeight: 180,
        px: { xs: 0.5, sm: 1 },
        pt: 1,
        overflowX: 'auto',
      }}
    >
      {items.map((item) => {
        const pct = Math.round((item.cantidad / max) * 100);
        const label = `${item.nombreMes} ${item.anio} — ${item.cantidad} documento(s)`;
        return (
          <Tooltip key={`${item.anio}-${item.mes}`} title={label} arrow>
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
              <Typography variant="caption" sx={{ fontWeight: 800, lineHeight: 1 }}>
                {item.cantidad}
              </Typography>
              <Box
                sx={{
                  width: '100%',
                  height: `${Math.max(pct, item.cantidad > 0 ? 8 : 2)}%`,
                  minHeight: item.cantidad > 0 ? 24 : 4,
                  maxHeight: 120,
                  bgcolor: alpha(theme.palette.primary.main, 0.85),
                  borderRadius: 1,
                  transition: 'height 0.25s ease',
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
  );
}
