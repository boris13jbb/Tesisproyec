import { createContext } from 'react';

export type BreadcrumbDetailCtx = {
  labelsByPath: Record<string, string>;
  setLabelForPath: (path: string, label: string | null) => void;
};

export const BreadcrumbDetailContext = createContext<BreadcrumbDetailCtx | null>(null);
