import { Box, Paper, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { listFilterSurfaceSx } from './listSurfaces';

export type FilterPanelProps = {
  title?: string;
  description?: ReactNode;
  /** Chips de filtros activos u otras meta acciones bajo el título. */
  meta?: ReactNode;
  children: ReactNode;
  /** Fila de botones (Aplicar / Limpiar / exportar) bajo los campos. */
  actions?: ReactNode;
};

/**
 * Tarjeta homogénea de filtros para listados institucionales.
 */
export function FilterPanel({
  title = 'Filtros de búsqueda',
  description,
  meta,
  children,
  actions,
}: FilterPanelProps) {
  return (
    <Paper elevation={0} sx={listFilterSurfaceSx}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ mb: description || meta ? 1.5 : 1.25, alignItems: { sm: 'flex-start' }, justifyContent: 'space-between' }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ letterSpacing: 0.1, fontWeight: 800, lineHeight: 1.2 }}
          >
            {title}
          </Typography>
          {description ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 720 }}>
              {description}
            </Typography>
          ) : null}
        </Box>
        {meta ? <Box sx={{ flexShrink: 0 }}>{meta}</Box> : null}
      </Stack>
      {children}
      {actions ? <Box sx={{ mt: 1.75 }}>{actions}</Box> : null}
    </Paper>
  );
}
