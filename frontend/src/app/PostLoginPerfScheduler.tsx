import { useEffect, useRef } from 'react';
import { useAuth } from '../auth/useAuth';
import { schedulePostLoginPrefetch } from '../perf/postLoginPrefetch';

/**
 * Tras restaurar sesión o completar login, precalienta rutas y datos típicos
 * (dashboard, bandeja de documentos, perfil) cuando el navegador está ocioso.
 */
export function PostLoginPerfScheduler() {
  const { ready, user } = useAuth();
  const prefetchUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!user) {
      prefetchUserId.current = null;
      return;
    }
    if (prefetchUserId.current === user.id) {
      return;
    }
    prefetchUserId.current = user.id;
    const isAdmin = user.roles.some((r) => r.codigo === 'ADMIN');
    schedulePostLoginPrefetch(isAdmin);
  }, [ready, user]);

  return null;
}
