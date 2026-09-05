import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import type { ReactElement } from 'react';
import type { AuditSummaryCardDatum } from './audit-stats.types';

type Props = {
  cards: AuditSummaryCardDatum[];
  loading?: boolean;
};

function iconFor(kind: AuditSummaryCardDatum['icon']): ReactElement {
  const sx = { fontSize: 20 };
  switch (kind) {
    case 'ok':
      return <CheckCircleOutlinedIcon sx={sx} />;
    case 'fail':
      return <ErrorOutlinedIcon sx={sx} />;
    case 'created':
      return <NoteAddOutlinedIcon sx={sx} />;
    case 'disabled':
      return <BlockOutlinedIcon sx={sx} />;
    case 'deleted':
      return <DeleteOutlinedIcon sx={sx} />;
    case 'records':
    default:
      return <DescriptionOutlinedIcon sx={sx} />;
  }
}

function accentColor(accent: AuditSummaryCardDatum['accent'], theme: Theme): string {
  switch (accent) {
    case 'success':
      return theme.palette.success.main;
    case 'error':
      return theme.palette.error.main;
    case 'warning':
      return theme.palette.warning.main;
    case 'primary':
      return theme.palette.primary.main;
    default:
      return theme.palette.text.primary;
  }
}

function KpiCard({ card }: { card: AuditSummaryCardDatum }) {
  const theme = useTheme();
  const color = accentColor(card.accent, theme);
  const softBg =
    card.accent === 'default'
      ? theme.palette.background.paper
      : alpha(color, theme.palette.mode === 'dark' ? 0.12 : 0.06);

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: softBg,
        height: '100%',
        minHeight: 72,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>
            {card.label}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color, lineHeight: 1.2, mt: 0.25 }}>
            {card.value.toLocaleString('es-EC')}
          </Typography>
        </Box>
        <Box sx={{ color, opacity: 0.85, mt: 0.25 }} aria-hidden>
          {iconFor(card.icon)}
        </Box>
      </Stack>
    </Box>
  );
}

export function AuditSummaryCards({ cards, loading = false }: Props) {
  if (loading) {
    return (
      <Grid container spacing={1.5}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Grid key={i} size={{ xs: 6, sm: 4, md: 2 }}>
            <Skeleton variant="rounded" height={72} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={1.5}>
      {cards.map((card) => (
        <Grid key={card.id} size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard card={card} />
        </Grid>
      ))}
    </Grid>
  );
}
