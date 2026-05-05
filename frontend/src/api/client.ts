import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
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

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    if (!error.response) {
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
