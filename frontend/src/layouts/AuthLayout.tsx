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
        backgroundColor: 'grey.50',
        backgroundImage: (theme) =>
          `linear-gradient(165deg, ${theme.palette.grey[100]} 0%, ${theme.palette.primary.dark}12 45%, ${theme.palette.grey[50]} 100%)`,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            boxShadow: '0 4px 24px rgba(15, 23, 42, 0.08)',
          }}
        >
          <Typography
            variant="subtitle1"
            color="primary"
            sx={{ mb: title ? 0.5 : 2, fontWeight: 700, letterSpacing: 0.5 }}
          >
            SGD-GADPR-LM
          </Typography>
          {title ? (
            <Typography variant="h5" component="h1" sx={{ mb: 3, fontWeight: 600 }}>
              {title}
            </Typography>
          ) : null}
          {children}
        </Paper>
      </Container>
    </Box>
  );
}
