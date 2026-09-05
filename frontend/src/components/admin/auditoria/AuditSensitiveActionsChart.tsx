import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme, type Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SensitiveAuditDatum, SensitiveAuditLevel } from './audit-stats.types';
import { AuditChartCard } from './AuditChartCard';
import { AuditChartTooltipBody } from './AuditChartTooltip';
import { safeNonNegativeCount, sensitiveLevelLabel } from './auditChartData';

type Props = {
  data: SensitiveAuditDatum[];
  truncated?: boolean;
  loading?: boolean;
  height?: number;
};

function levelColor(level: SensitiveAuditLevel, theme: Theme): string {
  switch (level) {
    case 'high':
      return theme.palette.error.main;
    case 'medium':
      return theme.palette.warning.main;
    case 'low':
    default:
      return theme.palette.success.main;
  }
}

function SemaforoLegend({ theme }: { theme: Theme }) {
  const items: { level: SensitiveAuditLevel; label: string }[] = [
    { level: 'high', label: 'Actividad alta' },
    { level: 'medium', label: 'Actividad media' },
    { level: 'low', label: 'Actividad baja' },
  ];
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 0.75, sm: 2 }}
      component="ul"
      sx={{ m: 0, p: 0, listStyle: 'none' }}
      aria-label="Leyenda del semáforo de actividad sensible"
    >
      {items.map((item) => (
        <Box
          key={item.level}
          component="li"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
        >
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: levelColor(item.level, theme),
              flexShrink: 0,
            }}
            aria-hidden
          />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {item.label}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

export function AuditSensitiveActionsChart({
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
      title="Acciones sensibles por usuario (semáforo)"
      subtitle="Usuarios con mayor concentración de acciones sensibles. El color indica el nivel (alto, medio o bajo)."
      height={chartHeight}
      loading={loading}
      empty={empty}
      aria-label="Gráfico de barras de acciones sensibles por usuario"
      footer={
        <Stack spacing={0.75}>
          <SemaforoLegend theme={theme} />
          {truncated ? (
            <Typography variant="caption" color="text.secondary">
              Mostrando los 10 usuarios con mayor actividad
            </Typography>
          ) : null}
        </Stack>
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
              const item = payload[0]?.payload as SensitiveAuditDatum | undefined;
              if (!item) return null;
              return (
                <AuditChartTooltipBody
                  title={item.fullLabel}
                  rows={[
                    { label: 'Acciones', value: safeNonNegativeCount(item.value).toLocaleString('es-EC') },
                    { label: 'Nivel', value: sensitiveLevelLabel(item.level) },
                  ]}
                />
              );
            }}
          />
          <Bar
            dataKey="value"
            name="Acciones sensibles"
            radius={[0, 4, 4, 0]}
            maxBarSize={22}
            isAnimationActive={!prefersReducedMotion}
          >
            {data.map((entry) => (
              <Cell key={`${entry.fullLabel}-${entry.level}`} fill={levelColor(entry.level, theme)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </AuditChartCard>
  );
}
