import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

type Row = {
  label: string;
  value: string;
};

type Props = {
  title?: string;
  rows: Row[];
};

/** Contenedor visual MUI para tooltips de Recharts (light/dark). */
export function AuditChartTooltipBody({ title, rows }: Props) {
  if (rows.length === 0) return null;
  return (
    <Paper
      elevation={3}
      sx={{
        px: 1.25,
        py: 1,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        color: 'text.primary',
        maxWidth: 280,
      }}
    >
      {title ? (
        <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}>
          {title}
        </Typography>
      ) : null}
      {rows.map((row) => (
        <Box key={`${row.label}-${row.value}`} sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">
            {row.label}
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {row.value}
          </Typography>
        </Box>
      ))}
    </Paper>
  );
}
