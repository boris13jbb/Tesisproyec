import { useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { BreadcrumbDetailContext } from './breadcrumbDetailContext';

export function useBreadcrumbDetail() {
  const ctx = useContext(BreadcrumbDetailContext);
  if (!ctx) {
    return { labelsByPath: {} as Record<string, string>, setLabelForPath: () => {} };
  }
  return ctx;
}

/**
 * Registra el texto mostrado en la última miga de pan para la ruta actual (p. ej. código de documento).
 */
export function useRegisterBreadcrumbDetail(label: string | null | undefined) {
  const { setLabelForPath } = useBreadcrumbDetail();
  const { pathname } = useLocation();

  useEffect(() => {
    setLabelForPath(pathname, label ?? null);
    return () => {
      setLabelForPath(pathname, null);
    };
  }, [pathname, label, setLabelForPath]);
}
