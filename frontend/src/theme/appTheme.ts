import { createTheme, type ThemeOptions } from '@mui/material/styles';
import { outlinedInputClasses } from '@mui/material/OutlinedInput';

/**
 * Tokens institucionales SGD-GADPR-LM.
 * Referencia: docs/25-ui-ux-diseno-sistema-institucional.md + Context7 MUI theming.
 */
const brandedTokens: ThemeOptions = {
  palette: {
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
  },
  typography: {
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
  },
  shape: {
    borderRadius: 10,
  },
  shadows: [
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
  ],
};

export const appTheme = createTheme({
  ...brandedTokens,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          scrollBehavior: 'smooth',
        },
        body: {
          backgroundColor: '#F4F7FA',
        },
        '*:focus-visible': {
          outline: '2px solid #1E7C89',
          outlineOffset: 2,
        },
        // Evita anillo doble en controles MUI que ya gestionan foco.
        '.MuiButtonBase-root:focus-visible, .MuiOutlinedInput-root:focus-within': {
          outline: 'none',
        },
      },
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
        outlined: {
          borderColor: '#E2E8F0',
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          borderColor: 'rgba(15, 23, 42, 0.08)',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1E3A5F',
          backgroundImage: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E2E8F0',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          marginInline: 8,
          marginBlock: 2,
          minHeight: 40,
          position: 'relative',
          transition: 'background-color 120ms ease, color 120ms ease',
          '&.Mui-selected': {
            backgroundColor: 'rgba(30, 124, 137, 0.10)',
            color: '#0F4C55',
            '&:hover': {
              backgroundColor: 'rgba(30, 124, 137, 0.16)',
            },
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 0,
              top: 8,
              bottom: 8,
              width: 3,
              borderRadius: 2,
              backgroundColor: '#2D8A99',
            },
            '& .MuiListItemIcon-root': {
              color: '#1E7C89',
            },
            '& .MuiListItemText-primary': {
              fontWeight: 600,
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(30, 58, 95, 0.04)',
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: 36,
          color: '#64748B',
        },
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
        root: {
          borderRadius: 10,
          backgroundColor: '#FFFFFF',
          [`&:hover .${outlinedInputClasses.notchedOutline}`]: {
            borderColor: '#94A3B8',
          },
          [`&.Mui-focused .${outlinedInputClasses.notchedOutline}`]: {
            borderColor: '#1E7C89',
            borderWidth: 2,
          },
        },
        notchedOutline: {
          borderColor: '#E2E8F0',
        },
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
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 700,
            color: '#334155',
            backgroundColor: 'rgba(30, 58, 95, 0.04)',
          },
        },
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
