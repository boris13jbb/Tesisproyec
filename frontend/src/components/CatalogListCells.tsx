import { Chip, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

/** Código de catálogo en chip (tipos documentales, dependencias, etc.). */
export function CatalogCodigoChip({ codigo }: { codigo: string }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      label={codigo}
      sx={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}
    />
  );
}

/** Nombre de fila con el icono del catálogo (tema secondary). */
export function CatalogNombreCell({ icon, nombre }: { icon: ReactNode; nombre: string }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Stack aria-hidden sx={{ color: 'secondary.main', flexShrink: 0, lineHeight: 0 }}>
        {icon}
      </Stack>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {nombre}
      </Typography>
    </Stack>
  );
}
