import { createTheme, alpha, type PaletteMode, type ThemeOptions } from '@mui/material/styles';
import { outlinedInputClasses } from '@mui/material/OutlinedInput';

/**
 * Tokens institucionales SGD-GADPR-LM.
 * Referencia: docs/25-ui-ux-diseno-sistema-institucional.md + Context7 MUI theming.
 */
const typography: ThemeOptions['typography'] = {
  fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
  h1: { fontWeight: 700, letterSpacing: '-0.02em' },
  h2: { fontWeight: 700, letterSpacing: '-0.02em' },
  h3: { fontWeight: 700, letterSpacing: '-0.015em' },
  h4: { fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.01em' },
  h5: { fontWeight: 600, fontSize: '1.25rem' },
  h6: { fontWeight: 600, fontSize: '1.05rem' },
  subtitle1: { fontWeight: 600 },
  subtitle2: { fontWeight: 600 },
  button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0.01 },
  body1: { lineHeight: 1.55 },
  body2: { lineHeight: 1.5 },
};

const shadows: ThemeOptions['shadows'] = [
  'none',
  '0 1px 2px 0 rgb(15 23 42 / 0.05)',
  '0 1px 3px 0 rgb(15 23 42 / 0.08), 0 1px 2px -1px rgb(15 23 42 / 0.08)',
  '0 2px 6px 0 rgb(15 23 42 / 0.07)',
  '0 4px 12px -2px rgb(15 23 42 / 0.08)',
  '0 8px 20px -4px rgb(15 23 42 / 0.10)',
  '0 12px 28px -6px rgb(15 23 42 / 0.12)',
  '0 16px 36px -8px rgb(15 23 42 / 0.14)',
  '0 20px 44px -10px rgb(15 23 42 / 0.15)',
  '0 24px 50px -12px rgb(15 23 42 / 0.16)',
  '0 28px 56px -14px rgb(15 23 42 / 0.17)',
  '0 32px 62px -16px rgb(15 23 42 / 0.18)',
  '0 36px 68px -18px rgb(15 23 42 / 0.19)',
  '0 40px 74px -20px rgb(15 23 42 / 0.20)',
  '0 44px 80px -22px rgb(15 23 42 / 0.21)',
  '0 48px 86px -24px rgb(15 23 42 / 0.22)',
  '0 52px 92px -26px rgb(15 23 42 / 0.23)',
  '0 56px 98px -28px rgb(15 23 42 / 0.24)',
  '0 60px 104px -30px rgb(15 23 42 / 0.25)',
  '0 64px 110px -32px rgb(15 23 42 / 0.26)',
  '0 68px 116px -34px rgb(15 23 42 / 0.27)',
  '0 72px 122px -36px rgb(15 23 42 / 0.28)',
  '0 76px 128px -38px rgb(15 23 42 / 0.29)',
  '0 80px 134px -40px rgb(15 23 42 / 0.30)',
  '0 84px 140px -42px rgb(15 23 42 / 0.31)',
];

function paletteFor(mode: PaletteMode): ThemeOptions['palette'] {
  if (mode === 'dark') {
    return {
      mode: 'dark',
      primary: {
        main: '#8BA4C7',
        light: '#A8BDD9',
        dark: '#1E3A5F',
        contrastText: '#0B1220',
      },
      secondary: {
        main: '#3BA8B6',
        light: '#5BC0CC',
        dark: '#1E7C89',
        contrastText: '#0B1220',
      },
      error: { main: '#F87171' },
      warning: { main: '#FBBF24' },
      info: { main: '#60A5FA' },
      success: { main: '#34D399' },
      background: {
        default: '#0B1220',
        paper: '#111827',
      },
      text: {
        primary: '#F1F5F9',
        secondary: '#94A3B8',
      },
      divider: '#1E293B',
    };
  }

  return {
    mode: 'light',
    primary: {
      main: '#1E3A5F',
      light: '#2A5082',
      dark: '#152A45',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#1E7C89',
      light: '#2D8A99',
      dark: '#15606A',
      contrastText: '#ffffff',
    },
    error: { main: '#B91C1C' },
    warning: { main: '#B45309' },
    info: { main: '#1D4ED8' },
    success: { main: '#0F766E' },
    background: {
      default: '#F4F7FA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',
      secondary: '#475569',
    },
    divider: '#E2E8F0',
  };
}

/** Tema institucional. El modo oscuro solo se aplica en el shell autenticado. */
export function createAppTheme(mode: PaletteMode) {
  return createTheme({
    palette: paletteFor(mode),
    typography,
    shape: { borderRadius: 10 },
    shadows,
    components: {
      MuiCssBaseline: {
        styleOverrides: (theme) => ({
          html: {
            scrollBehavior: 'smooth',
          },
          body: {
            backgroundColor: theme.palette.background.default,
          },
          '*:focus-visible': {
            outline: `2px solid ${theme.palette.secondary.main}`,
            outlineOffset: 2,
          },
          '.MuiButtonBase-root:focus-visible, .MuiOutlinedInput-root:focus-within': {
            outline: 'none',
          },
        }),
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 10,
            minHeight: 40,
            transition: 'background-color 120ms ease, box-shadow 120ms ease, transform 120ms ease',
          },
          contained: {
            boxShadow: '0 1px 2px rgb(15 23 42 / 0.08)',
            '&:hover': {
              boxShadow: '0 4px 12px rgb(15 23 42 / 0.14)',
            },
          },
          sizeLarge: {
            minHeight: 46,
            fontSize: '0.95rem',
          },
        },
      },
      MuiPaper: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
          outlined: ({ theme }) => ({
            borderColor: theme.palette.divider,
          }),
        },
      },
      MuiCard: {
        defaultProps: {
          elevation: 0,
          variant: 'outlined',
        },
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 12,
            borderColor: theme.palette.divider,
            boxShadow:
              theme.palette.mode === 'dark'
                ? '0 8px 24px rgba(0, 0, 0, 0.28)'
                : '0 8px 24px rgba(15, 23, 42, 0.06)',
          }),
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: '#1E3A5F',
            backgroundImage: 'none',
            color: '#ffffff',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: ({ theme }) => ({
            backgroundColor: theme.palette.background.paper,
            borderRight: `1px solid ${theme.palette.divider}`,
            overflowX: 'hidden',
          }),
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 10,
            marginInline: 8,
            marginBlock: 2,
            minHeight: 44,
            position: 'relative',
            transition: 'background-color 120ms ease, color 120ms ease',
            '&.Mui-selected': {
              backgroundColor: alpha(theme.palette.secondary.main, 0.12),
              color: theme.palette.mode === 'dark' ? theme.palette.secondary.light : '#0F4C55',
              '&:hover': {
                backgroundColor: alpha(theme.palette.secondary.main, 0.18),
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: 8,
                bottom: 8,
                width: 3,
                borderRadius: 2,
                backgroundColor: theme.palette.secondary.main,
              },
              '& .MuiListItemIcon-root': {
                color: theme.palette.secondary.main,
              },
              '& .MuiListItemText-primary': {
                fontWeight: 600,
              },
            },
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.06),
            },
          }),
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: ({ theme }) => ({
            minWidth: 36,
            color: theme.palette.text.secondary,
          }),
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          size: 'medium',
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 10,
            backgroundColor: theme.palette.background.paper,
            [`&:hover .${outlinedInputClasses.notchedOutline}`]: {
              borderColor: theme.palette.mode === 'dark' ? '#64748B' : '#94A3B8',
            },
            [`&.Mui-focused .${outlinedInputClasses.notchedOutline}`]: {
              borderColor: theme.palette.secondary.main,
              borderWidth: 2,
            },
          }),
          notchedOutline: ({ theme }) => ({
            borderColor: theme.palette.divider,
          }),
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 10,
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: ({ theme }) => ({
            '& .MuiTableCell-head': {
              fontWeight: 700,
              color: theme.palette.text.secondary,
              backgroundColor: alpha(theme.palette.primary.main, 0.06),
            },
          }),
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 8,
            fontSize: '0.75rem',
          },
        },
      },
    },
  });
}

/** Tema claro de autenticación (login / recuperación) y fallback del árbol raíz. */
export const appTheme = createAppTheme('light');
