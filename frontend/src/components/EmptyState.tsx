import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import { Box, Paper, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';

export type EmptyStateProps = {
  /** Texto principal. */
  title: string;
  /** Texto secundario opcional. */
  description?: ReactNode;
  /** Botón o enlace (p. ej. “Registrar”). */
  action?: ReactNode;
  /**
   * Vista compacta para celdas de tabla o espacios reducidos.
   * Oculta el icono y reduce padding.
   */
  dense?: boolean;
};

/**
 * Estado vacío institucional reutilizable (tablas, listas, paneles).
 */
export function EmptyState({ title, description, action, dense }: EmptyStateProps) {
  const content = (
    <>
      {!dense && (
        <Box
          aria-hidden
          sx={{
            width: 64,
            height: 64,
            mx: 'auto',
            mb: 1.75,
            borderRadius: 3,
            display: 'grid',
            placeItems: 'center',
            bgcolor: (t) =>
              alpha(t.palette.secondary.main, t.palette.mode === 'dark' ? 0.16 : 0.1),
            color: 'secondary.main',
          }}
        >
          <InboxOutlinedIcon sx={{ fontSize: 30 }} />
        </Box>
      )}
      <Typography
        variant={dense ? 'body2' : 'subtitle1'}
        color="text.primary"
        component="p"
        sx={{ mb: description || action ? 0.5 : 0, m: 0, fontWeight: 700 }}
      >
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: action ? 2 : 0 }}>
          {description}
        </Typography>
      ) : null}
      {action ? <Box sx={{ mt: 0.5 }}>{action}</Box> : null}
    </>
  );

  if (dense) {
    return (
      <Box sx={{ py: 2, px: 1, textAlign: 'center' }}>
        {content}
      </Box>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        py: 4.5,
        px: 3,
        textAlign: 'center',
        maxWidth: 440,
        mx: 'auto',
        borderRadius: 3,
        bgcolor: 'action.hover',
        borderStyle: 'dashed',
      }}
    >
      {content}
    </Paper>
  );
}
