import { Box, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { listResultsSurfaceSx } from './listSurfaces';

export type ListPanelProps = {
  /** Letra o nodo del badge (p. ej. “D”, “A”). */
  badge?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  /** Contador / meta a la derecha del encabezado. */
  meta?: ReactNode;
  loading?: boolean;
  children: ReactNode;
  /** Pie (paginación, leyendas). */
  footer?: ReactNode;
};

/**
 * Contenedor de resultados de listado: encabezado + tabla/cuerpo + pie.
 */
export function ListPanel({
  badge = '·',
  title,
  subtitle,
  meta,
  loading = false,
  children,
  footer,
}: ListPanelProps) {
  return (
    <Paper elevation={0} sx={listResultsSurfaceSx}>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ mb: 2, alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
          <Box
            aria-hidden
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              bgcolor: (t) =>
                alpha(t.palette.secondary.main, t.palette.mode === 'dark' ? 0.16 : 0.14),
              color: 'secondary.main',
              fontWeight: 800,
              fontSize: '0.85rem',
            }}
          >
            {badge}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35, lineHeight: 1.45 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
          {meta}
          {loading ? <CircularProgress size={22} aria-label="Cargando resultados" /> : null}
        </Stack>
      </Stack>
      {children}
      {footer ? <Box sx={{ mt: 2 }}>{footer}</Box> : null}
    </Paper>
  );
}
