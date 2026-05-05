import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Button, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

export type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  /** Controles alineados a la derecha en escritorio (botones, chips). */
  actions?: ReactNode;
  /** Enlace de retorno encima del título. */
  backTo?: { to: string; label?: string };
};

/**
 * Cabecera homogénea para pantallas dentro del shell principal.
 * Ver docs/25-ui-ux-diseno-sistema-institucional.md
 */
export function PageHeader({ title, description, actions, backTo }: PageHeaderProps) {
  return (
    <Box sx={{ mb: 3 }}>
      {backTo ? (
        <Button
          component={RouterLink}
          to={backTo.to}
          startIcon={<ArrowBackIcon fontSize="small" />}
          size="small"
          sx={{ mb: 1 }}
        >
          {backTo.label ?? 'Volver'}
        </Button>
      ) : null}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'flex-start' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {description ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {description}
            </Typography>
          ) : null}
        </Box>
        {actions ? (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              justifyContent: { xs: 'flex-start', sm: 'flex-end' },
              flexShrink: 0,
            }}
          >
            {actions}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
