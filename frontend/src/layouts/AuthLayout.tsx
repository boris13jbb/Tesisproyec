import type { ReactNode } from 'react';
import { Box, Container, Paper, Typography } from '@mui/material';

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
        backgroundColor: '#EAF1F6',
        backgroundImage:
          'radial-gradient(900px 420px at 18% 30%, rgba(30, 58, 95, 0.10) 0%, rgba(30, 58, 95, 0) 60%), linear-gradient(165deg, #F4F7FA 0%, #EAF1F6 55%, #F8FAFC 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            border: '1px solid rgba(15, 23, 42, 0.08)',
            boxShadow: '0 18px 48px rgba(15, 23, 42, 0.10)',
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
