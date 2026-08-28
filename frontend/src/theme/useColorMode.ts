import { useContext } from 'react';
import { ColorModeContext, type ColorModeContextValue } from './color-mode-context';

export function useColorMode(): ColorModeContextValue {
  const ctx = useContext(ColorModeContext);
  if (!ctx) {
    throw new Error('useColorMode debe usarse dentro de ColorModeProvider');
  }
  return ctx;
}
