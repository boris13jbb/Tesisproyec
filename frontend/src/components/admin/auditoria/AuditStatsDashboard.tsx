import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useMemo } from 'react';
import type { AuditStatsResponse } from './audit-stats.types';
import { AuditActionsByUserChart } from './AuditActionsByUserChart';
import { AuditOutcomeChart } from './AuditOutcomeChart';
import { AuditSensitiveActionsChart } from './AuditSensitiveActionsChart';
import { AuditSummaryCards } from './AuditSummaryCards';
import {
  buildActionsByUserData,
  buildAuditOutcomeData,
  buildAuditSummaryCards,
  buildSensitiveActionsData,
} from './auditChartData';

type Props = {
  stats: AuditStatsResponse | null;
  loading?: boolean;
};

export function AuditStatsDashboard({ stats, loading = false }: Props) {
  const cards = useMemo(() => buildAuditSummaryCards(stats), [stats]);
  const outcome = useMemo(() => buildAuditOutcomeData(stats), [stats]);
  const byUser = useMemo(() => buildActionsByUserData(stats), [stats]);
  const sensitive = useMemo(() => buildSensitiveActionsData(stats), [stats]);

  return (
    <Paper
      elevation={0}
      sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
        Estadísticas del período filtrado
      </Typography>

      <Box sx={{ mb: 2 }}>
        <AuditSummaryCards cards={cards} loading={loading} />
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <AuditOutcomeChart data={outcome} loading={loading} />
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <AuditActionsByUserChart
            data={byUser.items}
            truncated={byUser.truncated}
            loading={loading}
          />
        </Grid>
      </Grid>

      <AuditSensitiveActionsChart
        data={sensitive.items}
        truncated={sensitive.truncated}
        loading={loading}
      />
    </Paper>
  );
}
