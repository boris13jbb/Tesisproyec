import { Chip } from '@mui/material';

/** Chip institucional para activo/inactivo en catálogos (colores del tema). */
export function ActivoChip({ activo }: { activo: boolean }) {
  return (
    <Chip
      size="small"
      label={activo ? 'Activo' : 'Inactivo'}
      color={activo ? 'success' : 'default'}
      variant={activo ? 'filled' : 'outlined'}
      sx={{ fontWeight: 800 }}
    />
  );
}
