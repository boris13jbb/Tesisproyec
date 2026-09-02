import { Box, Grid, Skeleton } from '@mui/material';

export function DashboardSkeleton() {
  return (
    <Box>
      <Skeleton variant="rounded" height={120} sx={{ mb: 3, borderRadius: 3 }} />
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <Skeleton variant="rounded" height={140} sx={{ borderRadius: 3 }} />
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Skeleton variant="rounded" height={360} sx={{ borderRadius: 3 }} />
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Skeleton variant="rounded" height={360} sx={{ borderRadius: 3 }} />
        </Grid>
      </Grid>
      <Skeleton variant="rounded" height={280} sx={{ mb: 2.5, borderRadius: 3 }} />
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3 }} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3 }} />
        </Grid>
      </Grid>
    </Box>
  );
}
