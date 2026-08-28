import { CssBaseline, ThemeProvider } from '@mui/material';
import type { PaletteMode } from '@mui/material';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ColorModeContext } from './color-mode-context';
import { createAppTheme } from './appTheme';

const STORAGE_KEY = 'sgd.ui.colorMode';

function readStoredMode(): PaletteMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'dark' || v === 'light') return v;
  } catch {
    /* almacenamiento no disponible */
  }
  return 'light';
}

/**
 * Aplica el tema claro/oscuro solo en el shell autenticado (no en login).
 * La preferencia se guarda en localStorage.
 */
export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>(readStoredMode);

  const toggleColorMode = useCallback(() => {
    setMode((prev) => {
      const next: PaletteMode = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const value = useMemo(() => ({ mode, toggleColorMode }), [mode, toggleColorMode]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
