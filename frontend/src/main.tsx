import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { appTheme } from './theme/appTheme';
import { App } from './app/App';
import { AppNotifications } from './app/AppNotifications';
import { AuthProvider } from './auth/AuthProvider';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <BrowserRouter>
        <AppNotifications>
          <AuthProvider>
            <App />
          </AuthProvider>
        </AppNotifications>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
