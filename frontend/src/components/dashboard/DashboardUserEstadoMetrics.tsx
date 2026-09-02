import { Box, FormControl, Grid, MenuItem, Select, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { formatDashboardNumber } from './dashboard-utils';

export type UserEstadoMetrics = {
  totalEnRevision: number;
  totalAprobados: number;
  totalRechazados: number;
  totalBorradores?: number;
};

const ESTADO_METRICS: ReadonlyArray<{
  key: keyof UserEstadoMetrics;
  label: string;
  colorKey: 'warning' | 'success' | 'error' | 'primary';
}> = [
  { key: 'totalEnRevision', label: 'En revisión', colorKey: 'warning' },
  { key: 'totalAprobados', label: 'Aprobados', colorKey: 'success' },
  { key: 'totalRechazados', label: 'Rechazados', colorKey: 'error' },
  { key: 'totalBorradores', label: 'Borradores', colorKey: 'primary' },
];

type Props = {
  totalDocumentosSubidos: number;
  metrics: UserEstadoMetrics;
  compact?: boolean;
};

export function DashboardUserEstadoMetrics({
  totalDocumentosSubidos,
  metrics,
  compact,
}: Props) {
  const theme = useTheme();

  const visibleMetrics = ESTADO_METRICS.filter(({ key }) => {
    if (key === 'totalBorradores') {
      return (metrics.totalBorradores ?? 0) > 0;
    }
    return true;
  });

  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mb: 0.25, fontWeight: 600 }}
      >
        Documentos subidos
      </Typography>
      <Typography
        variant={compact ? 'h6' : 'h5'}
        sx={{ fontWeight: 800, mb: 1.25, lineHeight: 1.2 }}
      >
        {formatDashboardNumber(totalDocumentosSubidos)}
      </Typography>

      <Grid container spacing={compact ? 1 : 1.25}>
        {visibleMetrics.map(({ key, label, colorKey }) => {
          const palette = theme.palette[colorKey];
          const main = palette.main;
          const value = metrics[key] ?? 0;
          return (
            <Grid key={key} size={{ xs: 6, sm: visibleMetrics.length <= 3 ? 4 : 3 }}>
              <Box
                sx={{
                  px: 1,
                  py: 0.75,
                  borderRadius: 1,
                  border: `1px solid ${alpha(main, 0.22)}`,
                  bgcolor: alpha(main, 0.06),
                  minWidth: 0,
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', lineHeight: 1.2, fontSize: '0.65rem' }}
                  noWrap
                >
                  {label}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 800, color: main, lineHeight: 1.3 }}
                >
                  {formatDashboardNumber(value)}
                </Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}

type PeriodSelectorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function DashboardActividadPeriodoSelect({
  value,
  onChange,
  disabled,
}: PeriodSelectorProps) {
  return (
    <FormControl size="small" sx={{ minWidth: { xs: 140, sm: 168 } }}>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        displayEmpty
        sx={{ fontWeight: 700, fontSize: '0.8rem' }}
      >
        <MenuItem value="historico">Histórico</MenuItem>
        <MenuItem value="mes">Este mes</MenuItem>
        <MenuItem value="3m">Últimos 3 meses</MenuItem>
        <MenuItem value="anio">Este año</MenuItem>
      </Select>
    </FormControl>
  );
}
