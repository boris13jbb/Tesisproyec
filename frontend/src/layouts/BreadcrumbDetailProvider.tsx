import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { BreadcrumbDetailContext } from './breadcrumbDetailContext';

export function BreadcrumbDetailProvider({ children }: { children: ReactNode }) {
  const [labelsByPath, setLabelsByPath] = useState<Record<string, string>>({});

  const setLabelForPath = useCallback((path: string, label: string | null) => {
    setLabelsByPath((prev) => {
      const next = { ...prev };
      if (label === null || label === '') {
        delete next[path];
      } else {
        next[path] = label;
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ labelsByPath, setLabelForPath }),
    [labelsByPath, setLabelForPath],
  );

  return (
    <BreadcrumbDetailContext.Provider value={value}>{children}</BreadcrumbDetailContext.Provider>
  );
}
