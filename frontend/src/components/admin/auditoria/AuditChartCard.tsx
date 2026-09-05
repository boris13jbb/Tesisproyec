import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  height?: number;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  footer?: ReactNode;
  'aria-label'?: string;
};

export function AuditChartCard({
  title,
  subtitle,
  children,
  height = 300,
  loading = false,
  empty = false,
  emptyMessage = 'No hay datos para el período seleccionado.',
  footer,
  'aria-label': ariaLabel,
}: Props) {
  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
      aria-label={ariaLabel ?? title}
    >
      <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: subtitle ? 0.25 : 1 }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25, lineHeight: 1.45 }}>
            {subtitle}
          </Typography>
        ) : null}

        {loading ? (
          <Skeleton variant="rounded" height={height} sx={{ borderRadius: 1.5 }} />
        ) : empty ? (
          <Box
            sx={{
              height,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              {emptyMessage}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ width: '100%', height }}>{children}</Box>
        )}

        {footer && !loading ? <Box sx={{ mt: 1.25 }}>{footer}</Box> : null}
      </CardContent>
    </Card>
  );
}
