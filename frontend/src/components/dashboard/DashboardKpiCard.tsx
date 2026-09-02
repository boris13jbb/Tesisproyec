import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { Box, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import type { KeyboardEvent, ReactNode } from 'react';
import { dashboardInteractiveSurfaceSx } from './dashboard-surface';

export type KpiAccent = 'primary' | 'secondary' | 'warning' | 'success' | 'error' | 'info';

type Props = {
  icon: ReactNode;
  title: string;
  value: string;
  description?: string;
  secondary?: string;
  accent?: KpiAccent;
  trend?: 'up' | 'down' | 'neutral';
  tooltip?: string;
  interactive?: boolean;
  interactiveLabel?: string;
  onClick?: () => void;
};

export function DashboardKpiCard({
  icon,
  title,
  value,
  description,
  secondary,
  accent = 'primary',
  trend,
  tooltip,
  interactive,
  interactiveLabel,
  onClick,
}: Props) {
  const theme = useTheme();
  const accentColor = theme.palette[accent].main;

  const interactiveProps =
    interactive && onClick
      ? ({
          role: 'button' as const,
          tabIndex: 0,
          onClick,
          onKeyDown: (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          },
        } satisfies React.ComponentProps<typeof Paper>)
      : {};

  const card = (
    <Paper
      elevation={0}
      {...interactiveProps}
      aria-label={interactive ? interactiveLabel : undefined}
      sx={{
        ...dashboardInteractiveSurfaceSx,
        p: 1.75,
        height: '100%',
        borderTop: `3px solid ${accentColor}`,
        ...(interactive
          ? {
              cursor: 'pointer',
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'secondary.main',
                outlineOffset: 2,
              },
            }
          : {}),
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
        <Box
          aria-hidden
          sx={{
            width: 34,
            height: 34,
            borderRadius: 1.5,
            display: 'grid',
            placeItems: 'center',
            bgcolor: alpha(accentColor, 0.1),
            color: accentColor,
          }}
        >
          {icon}
        </Box>
        {trend === 'up' ? (
          <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} aria-hidden />
        ) : null}
        {trend === 'down' ? (
          <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main' }} aria-hidden />
        ) : null}
      </Stack>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 700, display: 'block', lineHeight: 1.2, fontSize: '0.7rem' }}
      >
        {title}
      </Typography>
      {description ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mb: 0.5, lineHeight: 1.3, fontSize: '0.65rem' }}
        >
          {description}
        </Typography>
      ) : null}
      <Typography
        variant="h5"
        sx={{ fontWeight: 800, letterSpacing: '-0.02em', color: 'text.primary', lineHeight: 1.1 }}
      >
        {value}
      </Typography>
      {secondary ? (
        <Typography
          variant="caption"
          sx={{
            mt: 0.5,
            display: 'block',
            fontWeight: 600,
            fontSize: '0.65rem',
            color: trend === 'up' ? 'success.main' : 'text.secondary',
          }}
        >
          {secondary}
        </Typography>
      ) : null}
    </Paper>
  );

  if (tooltip) {
    return (
      <Tooltip title={tooltip} arrow>
        <Box sx={{ height: '100%' }}>{card}</Box>
      </Tooltip>
    );
  }
  return card;
}
