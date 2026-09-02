import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  dashboardCardPadding,
  dashboardSectionSubtitleSx,
  dashboardSectionTitleSx,
  dashboardSurfaceSx,
} from './dashboard-surface';
import type { DashboardDocumentosBloque } from './dashboard-types';
import { formatDashboardNumber, formatPercentOfTotal } from './dashboard-utils';

type EstadoRow = {
  key: keyof Pick<
    DashboardDocumentosBloque,
    'registrados' | 'borradores' | 'enRevision' | 'aprobados' | 'rechazados'
  >;
  label: string;
  accent: 'info' | 'secondary' | 'warning' | 'success' | 'error';
};

const ROWS: EstadoRow[] = [
  { key: 'registrados', label: 'Registrados', accent: 'info' },
  { key: 'borradores', label: 'Borradores', accent: 'secondary' },
  { key: 'enRevision', label: 'En revisión', accent: 'warning' },
  { key: 'aprobados', label: 'Aprobados', accent: 'success' },
  { key: 'rechazados', label: 'Rechazados', accent: 'error' },
];

type Props = {
  documentos?: DashboardDocumentosBloque;
  loading?: boolean;
};

export function DashboardDocumentStatus({ documentos, loading }: Props) {
  const theme = useTheme();
  const total = documentos?.total ?? 0;

  return (
    <Box sx={{ ...dashboardSurfaceSx, p: dashboardCardPadding, height: '100%' }}>
      <Typography component="h2" sx={dashboardSectionTitleSx}>
        Gestión documental
      </Typography>
      <Typography sx={{ ...dashboardSectionSubtitleSx, mb: 2 }}>
        Distribución por estado en el período actual.
      </Typography>

      <Box
        sx={{
          mb: 2,
          p: 1.5,
          borderRadius: 2,
          bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.12 : 0.06),
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
          Total documentos
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>
          {loading ? '…' : formatDashboardNumber(total)}
        </Typography>
      </Box>

      <Stack spacing={1.75}>
        {ROWS.map((row) => {
          const value = documentos?.[row.key] ?? 0;
          const pct = total > 0 ? Math.round((value / total) * 100) : 0;
          const color = theme.palette[row.accent].main;
          return (
            <Box key={row.key}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {row.label}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  {loading ? '…' : `${formatDashboardNumber(value)} · ${pct} %`}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={loading ? 0 : pct}
                aria-label={`${row.label}: ${pct} por ciento`}
                sx={{
                  height: 8,
                  borderRadius: 999,
                  bgcolor: 'action.hover',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 999,
                    bgcolor: color,
                  },
                }}
              />
            </Box>
          );
        })}
      </Stack>

      {!loading && total > 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          {formatPercentOfTotal(documentos?.aprobados ?? 0, total)
            ? `Aprobados representan el ${formatPercentOfTotal(documentos?.aprobados ?? 0, total)}.`
            : null}
        </Typography>
      ) : null}
    </Box>
  );
}
