import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import { Box, Typography } from '@mui/material';
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
  return (
    <Box
      sx={{
        py: dense ? 2 : 4,
        px: dense ? 1 : 2,
        textAlign: 'center',
        maxWidth: dense ? 'none' : 420,
        mx: dense ? 0 : 'auto',
      }}
    >
      {!dense && (
        <InboxOutlinedIcon
          sx={{ fontSize: 44, color: 'action.disabled', mb: 1.5 }}
          aria-hidden
        />
      )}
      <Typography
        variant={dense ? 'body2' : 'subtitle1'}
        color="text.secondary"
        component="p"
        sx={{ mb: description || action ? 0.5 : 0, m: 0 }}
      >
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: action ? 1.5 : 0 }}>
          {description}
        </Typography>
      ) : null}
      {action ? <Box sx={{ mt: 1 }}>{action}</Box> : null}
    </Box>
  );
}
