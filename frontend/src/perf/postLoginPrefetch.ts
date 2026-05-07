import { apiClient } from '../api/client';

/**
 * Parámetros de lista de documentos alineados con el estado inicial de `DocumentosPage`
 * (bandeja por defecto: orden por fecha del documento descendente, página 1, 20 ítems).
 */
const DOCUMENTOS_BANDEJA_DEFAULT_PARAMS = {
  incluirInactivos: 'false',
  sortBy: 'fechaDocumento',
  sortDir: 'desc',
  page: '1',
  pageSize: '20',
} as const;

function runWhenIdle(fn: () => void): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => fn(), { timeout: 2800 });
  } else {
    window.setTimeout(fn, 180);
  }
}

/** Descarga en paralelo los chunks de las tres rutas más frecuentes tras autenticarse. */
export function prefetchFrequentRouteChunks(): Promise<unknown> {
  return Promise.all([
    import('../pages/DashboardPage'),
    import('../pages/documentos/DocumentosPage'),
    import('../pages/PerfilUsuarioPage'),
  ]);
}

/**
 * Precalienta los mismos GET que suelen necesitar panel, bandeja de documentos y perfil.
 * Los fallos son intencionalmente ignorados (red ocupada o permisos intermedios).
 */
export async function prefetchFrequentAuthenticatedData(isAdmin: boolean): Promise<void> {
  const tasks: Promise<unknown>[] = [
    apiClient.get('/health').catch(() => undefined),
    apiClient.get('/dashboard/summary').catch(() => undefined),
    apiClient.get('/auth/profile').catch(() => undefined),
    apiClient
      .get('/documentos', { params: { ...DOCUMENTOS_BANDEJA_DEFAULT_PARAMS } })
      .catch(() => undefined),
    apiClient.get('/tipos-documentales').catch(() => undefined),
    apiClient.get('/subseries').catch(() => undefined),
    apiClient.get('/dependencias').catch(() => undefined),
  ];
  if (isAdmin) {
    tasks.push(apiClient.get('/admin/ping').catch(() => undefined));
  }
  await Promise.all(tasks);
}

/** Orquesta prefetch de rutas y datos en momento de ralentí del hilo principal. */
export function schedulePostLoginPrefetch(isAdmin: boolean): void {
  runWhenIdle(() => {
    void prefetchFrequentRouteChunks().catch(() => undefined);
    void prefetchFrequentAuthenticatedData(isAdmin).catch(() => undefined);
  });
}
