import type { SxProps, Theme } from '@mui/material/styles';

/** Ancho máximo del contenido del panel principal en pantallas grandes. */
export const DASHBOARD_CONTENT_MAX_WIDTH = 1560;

/** Espaciado vertical estándar entre secciones del Dashboard. */
export const DASHBOARD_SECTION_GAP = 2.5;

/** Superficie de card institucional — sombra sutil, borde ligero. */
export const dashboardSurfaceSx: SxProps<Theme> = {
  borderRadius: 2,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
  boxShadow: (theme) =>
    theme.palette.mode === 'dark'
      ? '0 1px 3px rgba(0, 0, 0, 0.35)'
      : '0 1px 3px rgba(15, 23, 42, 0.06)',
  transition: 'box-shadow 140ms ease, transform 140ms ease',
};

/** Hover suave para cards interactivas del Dashboard. */
export const dashboardInteractiveSurfaceSx: SxProps<Theme> = {
  ...dashboardSurfaceSx,
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: (theme) =>
      theme.palette.mode === 'dark'
        ? '0 4px 12px rgba(0, 0, 0, 0.4)'
        : '0 4px 12px rgba(15, 23, 42, 0.08)',
  },
};

export const dashboardSectionTitleSx: SxProps<Theme> = {
  fontWeight: 700,
  fontSize: { xs: '1rem', md: '1.0625rem' },
  lineHeight: 1.25,
  letterSpacing: '-0.01em',
};

export const dashboardSectionSubtitleSx: SxProps<Theme> = {
  fontSize: '0.8125rem',
  color: 'text.secondary',
  lineHeight: 1.45,
  mt: 0.25,
};

export const dashboardCardPadding = { xs: 2, md: 2.25 } as const;
