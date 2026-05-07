import { useEffect } from 'react';
import { onLCP, type LCPMetric } from 'web-vitals';
import { apiClient } from '../api/client';

/** Evita doble envío del mismo valor de Web Vitals (p. ej. React StrictMode en dev). */
const reportedLcpInstanceIds = new Set<string>();

/**
 * Mide el LCP en el panel principal y lo registra en auditoría (`CLIENT_WEB_VITAL_LCP`).
 * Diseñado únicamente para la ruta `/` (uso desde `DashboardPage`).
 */
export function useDashboardLcpReporting(): void {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let cancelled = false;

    const handle = (metric: LCPMetric) => {
      if (cancelled) return;
      if (reportedLcpInstanceIds.has(metric.id)) return;
      reportedLcpInstanceIds.add(metric.id);
      void apiClient
        .post('/client-perf/web-vitals', {
          metric: 'LCP',
          valueMs: Math.round(metric.value * 100) / 100,
          rating: metric.rating,
          pathname: window.location.pathname,
          navigationType: metric.navigationType,
          metricId: metric.id,
        })
        .catch(() => {
          // Fail-silenciado (ASVS): no exponer fallos internos ni datos en UI.
        });
    };

    onLCP(handle);

    return () => {
      cancelled = true;
    };
  }, []);
}
