import { Avatar, Box, Chip, Stack, Typography } from '@mui/material';
import {
  displayUserFirstName,
  formatLongDateEc,
  formatTimeEc,
  greetingForHour,
} from './dashboard-utils';

type Props = {
  userName?: string | null;
  userNombres?: string | null;
  userApellidos?: string | null;
  userEmail?: string | null;
  roleLabel: string;
  dependenciaNombre?: string | null;
  generatedAt?: string | null;
  loading?: boolean;
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
}: Props) {
  const firstName = displayUserFirstName(userNombres, userApellidos, userEmail);
  const greeting = greetingForHour();
  const fecha = formatLongDateEc();
  const fechaCapitalized = fecha.charAt(0).toUpperCase() + fecha.slice(1);

  return (
    <Box
      sx={{
        mb: 3,
        p: { xs: 2, md: 2.5 },
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: (t) =>
          t.palette.mode === 'dark'
            ? '0 8px 24px rgba(0, 0, 0, 0.28)'
            : '0 8px 24px rgba(15, 23, 42, 0.06)',
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Avatar
            sx={{
              width: 52,
              height: 52,
              bgcolor: 'secondary.main',
              color: 'secondary.contrastText',
              fontWeight: 800,
            }}
          >
            {userEmail ? initialsFromUser(userEmail, userNombres, userApellidos) : '—'}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.8 }}>
              SGD-GADPR-LM
            </Typography>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              {loading ? 'Cargando…' : `${greeting}, ${firstName}`}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Aquí tienes el resumen de la gestión documental.
            </Typography>
          </Box>
        </Stack>
        <Stack spacing={1} sx={{ alignItems: { xs: 'flex-start', md: 'flex-end' } }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {fechaCapitalized}
          </Typography>
          <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
            <Chip size="small" label={roleLabel} color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
            {dependenciaNombre ? (
              <Chip size="small" label={dependenciaNombre} variant="outlined" sx={{ fontWeight: 600 }} />
            ) : null}
            {generatedAt ? (
              <Chip
                size="small"
                variant="outlined"
                label={`Actualizado: ${formatTimeEc(generatedAt)}`}
                sx={{ fontWeight: 600 }}
              />
            ) : null}
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}
