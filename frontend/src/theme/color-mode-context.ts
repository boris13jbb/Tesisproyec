import { createContext } from 'react';
import type { PaletteMode } from '@mui/material';

export type ColorModeContextValue = {
  mode: PaletteMode;
  toggleColorMode: () => void;
};

export const ColorModeContext = createContext<ColorModeContextValue | null>(null);
