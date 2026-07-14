import { Chip } from '@mui/material';

/** Chip institucional para activo/inactivo en catálogos. */
export function ActivoChip({ activo }: { activo: boolean }) {
  return (
    <Chip
      size="small"
      label={activo ? 'Activo' : 'Inactivo'}
      sx={
        activo
          ? {
              bgcolor: 'rgba(15, 118, 110, 0.12)',
              color: '#0F766E',
              fontWeight: 700,
            }
          : {
              bgcolor: 'rgba(100, 116, 139, 0.12)',
              color: '#475569',
              fontWeight: 700,
            }
      }
    />
  );
}
