import { createTheme } from '@mui/material/styles';

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1565c0',
    },
    secondary: {
      main: '#2e7d32',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Segoe UI", sans-serif',
  },
});
