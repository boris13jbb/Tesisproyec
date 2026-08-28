import type { SxProps, Theme } from '@mui/material/styles';

/** Superficie institucional compartida para filtros y resultados de listados. */
export const listSurfaceSx: SxProps<Theme> = {
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
  boxShadow: (theme) =>
    theme.palette.mode === 'dark'
      ? '0 8px 24px rgba(0, 0, 0, 0.28)'
      : '0 8px 24px rgba(15, 23, 42, 0.06)',
  bgcolor: 'background.paper',
};

export const listFilterSurfaceSx: SxProps<Theme> = {
  ...listSurfaceSx,
  p: { xs: 2, sm: 2.25 },
  mb: 2,
};

export const listResultsSurfaceSx: SxProps<Theme> = {
  ...listSurfaceSx,
  p: { xs: 2, sm: 2.25 },
  mb: 0,
  overflow: 'hidden',
};

export const listTableContainerSx: SxProps<Theme> = {
  borderRadius: 2,
  border: '1px solid',
  borderColor: 'divider',
  '& .MuiTableRow-root:hover': {
    backgroundColor: (theme) =>
      theme.palette.mode === 'dark'
        ? 'rgba(59, 168, 182, 0.08)'
        : 'rgba(30, 124, 137, 0.04)',
  },
  '& .MuiTableBody-root .MuiTableRow-root:last-child .MuiTableCell-root': {
    borderBottom: 'none',
  },
};
