import { Box, Grid, Skeleton } from '@mui/material';
import { dashboardSurfaceSx } from './dashboard-surface';

export function DashboardSkeleton() {
  return (
    <Box>
      <Skeleton variant="rounded" height={110} sx={{ mb: 2.5, borderRadius: 2 }} />
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Grid key={i} size={{ xs: 6, sm: 4, md: 4, lg: 2 }}>
            <Skeleton variant="rounded" height={118} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Skeleton variant="rounded" height={320} sx={{ borderRadius: 2 }} />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Skeleton variant="rounded" height={320} sx={{ borderRadius: 2 }} />
        </Grid>
      </Grid>
      <Box sx={{ ...dashboardSurfaceSx, p: 2, mb: 2.5 }}>
        <Skeleton variant="rounded" height={240} sx={{ borderRadius: 1.5 }} />
      </Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Skeleton variant="rounded" height={220} sx={{ borderRadius: 2 }} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Skeleton variant="rounded" height={220} sx={{ borderRadius: 2 }} />
        </Grid>
      </Grid>
    </Box>
  );
}
