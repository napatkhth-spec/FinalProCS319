import { useEffect, useRef, type PropsWithChildren } from 'react';
import { getCurrentUser } from './auth.service';
import { getAccessTokenExpirationMs } from './access-token-expiration';
import { readStoredAccessToken, useAuthStore } from '../../stores/auth.store';
import { queryClient } from '../../lib/query-client';

export function AuthInitializer({ children }: PropsWithChildren) {
  const initializeAnonymous = useAuthStore((state) => state.initializeAnonymous);
  const beginSessionInitialization = useAuthStore((state) => state.beginSessionInitialization);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const accessToken = useAuthStore((state) => state.accessToken);
  const initialization = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (useAuthStore.getState().isInitialized || initialization.current) return;

    const accessToken = readStoredAccessToken();
    if (!accessToken) {
      initializeAnonymous();
      return;
    }

    beginSessionInitialization(accessToken);
    initialization.current = getCurrentUser()
      .then((user) => setSession(user, accessToken))
      .catch(() => clearSession())
      .finally(() => {
        initialization.current = null;
      });
  }, [beginSessionInitialization, clearSession, initializeAnonymous, setSession]);

  useEffect(() => {
    if (!accessToken) return;

    const expiresAt = getAccessTokenExpirationMs(accessToken);
    if (expiresAt === null || expiresAt <= Date.now()) {
      clearSession();
      queryClient.clear();
      return;
    }

    const timeout = window.setTimeout(() => {
      clearSession();
      queryClient.clear();
    }, expiresAt - Date.now());

    return () => window.clearTimeout(timeout);
  }, [accessToken, clearSession]);

  return children;
}
