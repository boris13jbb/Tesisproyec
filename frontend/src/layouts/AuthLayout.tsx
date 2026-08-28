import type { ReactNode } from 'react';
import { Box, Container, Paper, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

type AuthLayoutProps = {
  children: ReactNode;
  /** Título opcional bajo la marca (p. ej. “Iniciar sesión”). */
  title?: string;
};

/**
 * Contenedor institucional para flujos de autenticación (login, recuperación).
 * Alineado con la guía docs/25-ui-ux-diseno-sistema-institucional.md
 */
export function AuthLayout({ children, title }: AuthLayoutProps) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        px: 2,
        backgroundColor: 'background.default',
        backgroundImage: (t) =>
          `radial-gradient(900px 420px at 18% 30%, ${alpha(t.palette.primary.main, 0.1)} 0%, ${alpha(t.palette.primary.main, 0)} 60%), linear-gradient(165deg, ${t.palette.background.default} 0%, ${alpha(t.palette.primary.main, 0.04)} 55%, ${t.palette.background.paper} 100%)`,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            border: 1,
            borderColor: 'divider',
            boxShadow: 5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: title ? 1 : 2.5 }}>
            <Box
              aria-hidden
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'secondary.main',
                color: 'common.white',
                fontWeight: 800,
                fontSize: '0.7rem',
              }}
            >
              SGD
            </Box>
            <Typography
              variant="subtitle1"
              color="primary"
              sx={{ fontWeight: 800, letterSpacing: 0.2 }}
            >
              SGD-GADPR-LM
            </Typography>
          </Box>
          {title ? (
            <Typography variant="h5" component="h1" sx={{ mb: 3, fontWeight: 700 }}>
              {title}
            </Typography>
          ) : null}
          {children}
        </Paper>
      </Container>
    </Box>
  );
}
