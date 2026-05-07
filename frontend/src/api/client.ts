import axios, {
  AxiosError,
  isAxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';

/** Opcional por petición: evita toast global cuando la pantalla muestra otro mensaje */
declare module 'axios' {
  interface AxiosRequestConfig {
    suppressGlobalNetworkErrorToast?: boolean;
  }
}
import type { AuthUser } from '../auth/types';
import {
  getAccessToken,
  notifySessionLost,
  setAccessToken,
} from '../auth/accessToken';
import { notifyGlobalError } from '../app/notifications';

// En dev, URL relativa + proxy en `vite.config` evita mixed content (p. ej. UI en https://*.ngrok-free.app y API en http://localhost).
const envUrl = import.meta.env.VITE_API_URL?.trim();
const baseURL =
  envUrl && envUrl.length > 0 ? envUrl : '/api/v1';

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

/** Abort/cancelación (p. ej. AbortController en vista previa): sin `response` pero no es fallo de red. */
function esCancelacionCliente(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  return (
    error.code === AxiosError.ERR_CANCELED ||
    error.name === 'CanceledError'
  );
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // El default `'Content-Type': 'application/json'` rompe multipart: el servidor no parsea archivos y responde 400.
  if (config.data instanceof FormData && config.headers.delete) {
    config.headers.delete('Content-Type');
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const cfg = error.config as (InternalAxiosRequestConfig & {
      suppressGlobalNetworkErrorToast?: boolean;
    }) | undefined;
    const suppressToast = cfg?.suppressGlobalNetworkErrorToast === true;
    if (
      !error.response &&
      !esCancelacionCliente(error) &&
      !suppressToast
    ) {
      notifyGlobalError(
        'No se pudo conectar con la API. Verifica que el backend esté levantado.',
      );
    }
    const status = error.response?.status;
    const original = error.config as RetryConfig | undefined;
    if (!original || status !== 401) {
      return Promise.reject(error);
    }
    const path = original.url ?? '';
    if (path.includes('/auth/refresh') || path.includes('/auth/login')) {
      return Promise.reject(error);
    }
    if (original._retry) {
      notifyGlobalError('Tu sesión expiró. Vuelve a iniciar sesión.');
      notifySessionLost();
      return Promise.reject(error);
    }
    original._retry = true;
    try {
      const { data } = await apiClient.post<{
        accessToken: string;
        user: AuthUser;
      }>('/auth/refresh');
      setAccessToken(data.accessToken);
      original.headers = original.headers ?? {};
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return apiClient(original);
    } catch {
      setAccessToken(null);
      notifyGlobalError('Tu sesión expiró. Vuelve a iniciar sesión.');
      notifySessionLost();
      return Promise.reject(error);
    }
  },
);
