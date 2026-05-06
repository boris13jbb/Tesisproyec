import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiClient } from '../api/client';
import {
  setAccessToken,
  setSessionLostHandler,
} from './accessToken';
import { AuthContext, type AuthContextValue } from './auth-context';
import type { AuthUser } from './types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const refreshSession = useCallback(async () => {
    // Bootstrap sin HTTP 401: el backend responde 200 + `{ restored: false }` si no hay sesión válida,
    // para que el navegador no marque un XHR “fallido” en consola (ver `POST /auth/session/restore`).
    const { data } = await apiClient.post<
      | { restored: false }
      | { restored: true; accessToken: string; user: AuthUser }
    >('/auth/session/restore', {});
    if (!data.restored) {
      setAccessToken(null);
      setUser(null);
      return;
    }
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  useEffect(() => {
    setSessionLostHandler(() => {
      setAccessToken(null);
      setUser(null);
    });
    return () => setSessionLostHandler(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshSession();
      } catch {
        setAccessToken(null);
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await apiClient.post<{
      accessToken: string;
      user: AuthUser;
    }>('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      login,
      logout,
      refreshSession,
    }),
    [user, ready, login, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
