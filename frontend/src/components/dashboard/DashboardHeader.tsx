import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  dashboardCardPadding,
  dashboardSectionSubtitleSx,
  dashboardSurfaceSx,
} from './dashboard-surface';
import {
  displayUserFirstName,
  formatLongDateEc,
  formatTimeEc,
  greetingForHour,
} from './dashboard-utils';

type Props = {
  userNombres?: string | null;
  userApellidos?: string | null;
  userEmail?: string | null;
  roleLabel: string;
  dependenciaNombre?: string | null;
  generatedAt?: string | null;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
};

function initialsFromUser(
  email: string,
  nombres?: string | null,
  apellidos?: string | null,
): string {
  const joined = `${nombres ?? ''} ${apellidos ?? ''}`.trim();
  if (joined) {
    const parts = joined.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function DashboardHeader({
  userNombres,
  userApellidos,
  userEmail,
  roleLabel,
  dependenciaNombre,
  generatedAt,
  loading,
  refreshing,
  onRefresh,
}: Props) {
  const firstName = displayUserFirstName(userNombres, userApellidos, userEmail);
  const greeting = greetingForHour();
  const fecha = formatLongDateEc();
  const fechaCapitalized = fecha.charAt(0).toUpperCase() + fecha.slice(1);

  return (
    <Box
      sx={{
        ...dashboardSurfaceSx,
        p: dashboardCardPadding,
        mb: 2.5,
        borderLeft: '4px solid',
        borderLeftColor: 'primary.main',
      }}
    >
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        spacing={2}
        sx={{ alignItems: { xs: 'stretch', lg: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
              color: 'primary.main',
              fontWeight: 800,
              fontSize: '0.9rem',
            }}
          >
            {userEmail ? initialsFromUser(userEmail, userNombres, userApellidos) : '—'}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ fontWeight: 700, letterSpacing: 0.6, fontSize: '0.65rem' }}
            >
              SGD-GADPR-LM
            </Typography>
            <Typography
              variant="h5"
              component="h1"
              sx={{ fontWeight: 800, lineHeight: 1.2, fontSize: { xs: '1.35rem', md: '1.5rem' } }}
            >
              {loading ? 'Cargando…' : `${greeting}, ${firstName}`}
            </Typography>
            <Typography sx={dashboardSectionSubtitleSx}>
              Resumen ejecutivo de la gestión documental
            </Typography>
          </Box>
        </Stack>

        <Stack
          spacing={1}
          sx={{ alignItems: { xs: 'flex-start', lg: 'flex-end' }, flexShrink: 0 }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {fechaCapitalized}
          </Typography>
          <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
            <Chip
              size="small"
              label={roleLabel}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700, height: 26 }}
            />
            {dependenciaNombre ? (
              <Chip
                size="small"
                label={dependenciaNombre}
                variant="outlined"
                sx={{ fontWeight: 600, height: 26, maxWidth: 220 }}
              />
            ) : null}
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            {onRefresh ? (
              <Tooltip title="Actualizar información del Dashboard">
                <span>
                  <Button
                    type="button"
                    variant="outlined"
                    size="small"
                    onClick={onRefresh}
                    disabled={refreshing}
                    aria-busy={refreshing}
                    startIcon={
                      refreshing ? (
                        <CircularProgress aria-hidden size={14} thickness={5} />
                      ) : (
                        <RefreshOutlinedIcon fontSize="small" />
                      )
                    }
                    sx={{ fontWeight: 700, whiteSpace: 'nowrap', height: 32 }}
                  >
                    {refreshing ? 'Actualizando…' : 'Actualizar ahora'}
                  </Button>
                </span>
              </Tooltip>
            ) : null}
            {generatedAt ? (
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Actualizado: {formatTimeEc(generatedAt)}
              </Typography>
            ) : null}
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}
