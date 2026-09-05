import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useMemo } from 'react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { AuditOutcomeDatum } from './audit-stats.types';
import { AuditChartCard } from './AuditChartCard';
import { AuditChartTooltipBody } from './AuditChartTooltip';
import { formatPercent, outcomeTotal, safeNonNegativeCount } from './auditChartData';

type Props = {
  data: AuditOutcomeDatum[];
  loading?: boolean;
  height?: number;
};

export function AuditOutcomeChart({ data, loading = false, height }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const chartHeight = height ?? (isMobile ? 280 : 320);
  const total = useMemo(() => outcomeTotal(data), [data]);
  const empty = !loading && (data.length === 0 || total === 0);

  const colors: Record<AuditOutcomeDatum['name'], string> = {
    OK: theme.palette.success.main,
    Fallo: theme.palette.error.main,
  };

  return (
    <AuditChartCard
      title="Estado de operaciones"
      subtitle="Distribución de resultados OK frente a Fallo en el período filtrado."
      height={chartHeight}
      loading={loading}
      empty={empty}
      aria-label="Gráfico donut de resultados OK y Fallo"
    >
      <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="46%"
              innerRadius={isMobile ? 58 : 68}
              outerRadius={isMobile ? 88 : 102}
              paddingAngle={2}
              isAnimationActive={!prefersReducedMotion}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={colors[entry.name]} stroke={theme.palette.background.paper} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0];
                const name = String(row.name ?? '');
                const value = safeNonNegativeCount(row.value);
                return (
                  <AuditChartTooltipBody
                    title={name}
                    rows={[
                      { label: 'Cantidad', value: value.toLocaleString('es-EC') },
                      { label: 'Porcentaje', value: formatPercent(value, total) },
                    ]}
                  />
                );
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <Typography component="span" variant="caption" color="text.primary" sx={{ fontWeight: 600 }}>
                  {value}
                </Typography>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        <Box
          sx={{
            position: 'absolute',
            top: '42%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
          aria-hidden
        >
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1, color: 'text.primary' }}>
            {total.toLocaleString('es-EC')}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            registros
          </Typography>
        </Box>
      </Box>
    </AuditChartCard>
  );
}
