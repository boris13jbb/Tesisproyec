import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AuditUserActionDatum } from './audit-stats.types';
import { AuditChartCard } from './AuditChartCard';
import { AuditChartTooltipBody } from './AuditChartTooltip';
import { safeNonNegativeCount } from './auditChartData';

type Props = {
  data: AuditUserActionDatum[];
  truncated?: boolean;
  loading?: boolean;
  height?: number;
};

export function AuditActionsByUserChart({
  data,
  truncated = false,
  loading = false,
  height,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const chartHeight = height ?? (isMobile ? 280 : 320);
  const empty = !loading && data.length === 0;
  const yAxisWidth = isMobile ? 88 : 112;

  return (
    <AuditChartCard
      title="Acciones por usuario"
      subtitle="Actividad total por actor en el período filtrado (mayor a menor)."
      height={chartHeight}
      loading={loading}
      empty={empty}
      aria-label="Gráfico de barras de acciones por usuario"
      footer={
        truncated ? (
          <Typography variant="caption" color="text.secondary">
            Mostrando los 10 usuarios con mayor actividad
          </Typography>
        ) : null
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke={theme.palette.divider}
          />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
            axisLine={{ stroke: theme.palette.divider }}
            tickLine={{ stroke: theme.palette.divider }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={yAxisWidth}
            tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
            axisLine={{ stroke: theme.palette.divider }}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: theme.palette.action.hover }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0]?.payload as AuditUserActionDatum | undefined;
              if (!item) return null;
              return (
                <AuditChartTooltipBody
                  title={item.fullLabel}
                  rows={[{ label: 'Acciones', value: safeNonNegativeCount(item.value).toLocaleString('es-EC') }]}
                />
              );
            }}
          />
          <Bar
            dataKey="value"
            name="Acciones"
            fill={theme.palette.primary.main}
            radius={[0, 4, 4, 0]}
            maxBarSize={22}
            isAnimationActive={!prefersReducedMotion}
          />
        </BarChart>
      </ResponsiveContainer>
    </AuditChartCard>
  );
}
