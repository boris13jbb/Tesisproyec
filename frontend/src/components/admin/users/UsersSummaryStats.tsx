import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

type StatProps = {
  label: string;
  value: number | string;
  accent?: 'success' | 'primary' | 'default';
};

function StatCard({ label, value, accent = 'default' }: StatProps) {
  const colorKey = accent === 'default' ? 'text.primary' : `${accent}.main`;
  return (
    <Box
      sx={{
        flex: '1 1 120px',
        minWidth: 120,
        p: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: (t) =>
          accent === 'default'
            ? 'background.paper'
            : alpha(t.palette[accent === 'success' ? 'success' : 'primary'].main, 0.06),
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.25 }}>
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 800, color: colorKey, lineHeight: 1.2 }}>
        {value}
      </Typography>
    </Box>
  );
}

type Props = {
  activos: number;
  total: number;
  visibles: number;
  loading?: boolean;
};

export function UsersSummaryStats({ activos, total, visibles, loading }: Props) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ width: '100%' }}>
      <StatCard label="Usuarios activos" value={loading ? '…' : activos} accent="success" />
      <StatCard label="Usuarios totales" value={loading ? '…' : total} accent="primary" />
      <StatCard label="Resultados visibles" value={loading ? '…' : visibles} />
    </Stack>
  );
}
