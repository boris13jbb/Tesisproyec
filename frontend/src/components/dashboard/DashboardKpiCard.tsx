import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { Box, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import type { KeyboardEvent, ReactNode } from 'react';

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
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        borderLeftWidth: 3,
        borderLeftColor: accentColor,
        boxShadow: (t) =>
          t.palette.mode === 'dark'
            ? '0 8px 24px rgba(0, 0, 0, 0.28)'
            : '0 8px 24px rgba(15, 23, 42, 0.06)',
        p: 2.25,
        height: '100%',
        bgcolor: 'background.paper',
        transition: 'box-shadow 140ms ease, transform 140ms ease, border-color 140ms ease',
        ...(interactive
          ? {
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: (t) =>
                  t.palette.mode === 'dark'
                    ? '0 14px 32px rgba(0, 0, 0, 0.4)'
                    : '0 14px 32px rgba(15, 23, 42, 0.10)',
              },
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'secondary.main',
                outlineOffset: 2,
              },
            }
          : {}),
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
        <Box
          aria-hidden
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: alpha(accentColor, 0.12),
            color: accentColor,
          }}
        >
          {icon}
        </Box>
        {trend === 'up' ? (
          <TrendingUpIcon sx={{ fontSize: 18, color: 'success.main' }} aria-hidden />
        ) : null}
        {trend === 'down' ? (
          <TrendingDownIcon sx={{ fontSize: 18, color: 'error.main' }} aria-hidden />
        ) : null}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 0.25 }}>
        {title}
      </Typography>
      {description ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, lineHeight: 1.35 }}>
          {description}
        </Typography>
      ) : null}
      <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: 0.2, color: 'text.primary' }}>
        {value}
      </Typography>
      {secondary ? (
        <Typography
          variant="caption"
          sx={{
            mt: 0.75,
            display: 'block',
            fontWeight: 700,
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
