import { useCallback, useEffect, useMemo, useState } from "react";
import { authService } from "../../services/authService.js";
import { AUTH_STATUSES } from "./authContract.js";

// Compatibility alias for existing consumers; AUTH_STATUSES is canonical.
export const AUTH_STATUS = AUTH_STATUSES;

export function useAuthState({ enabled = true } = {}) {
  const [status, setStatus] = useState(enabled ? AUTH_STATUS.LOADING : AUTH_STATUS.ANONYMOUS);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  const refreshSession = useCallback(async ({ signal } = {}) => {
    if (!enabled) return null;

    setStatus(AUTH_STATUS.LOADING);
    setError(null);

    try {
      const result = await authService.getSession({ signal });
      const nextUser = result?.user ?? result?.data?.user ?? null;
      setUser(nextUser);
      setStatus(nextUser ? AUTH_STATUS.AUTHENTICATED : AUTH_STATUS.ANONYMOUS);
      return nextUser;
    } catch (cause) {
      setUser(null);
      setError(cause);
      setStatus(AUTH_STATUS.ERROR);
      return null;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    refreshSession({ signal: controller.signal }).catch(() => {});
    return () => controller.abort();
  }, [enabled, refreshSession]);

  const signIn = useCallback(async (credentials, { signal } = {}) => {
    setStatus(AUTH_STATUS.LOADING);
    setError(null);

    try {
      const result = await authService.signIn(credentials, { signal });
      const nextUser = result?.user ?? result?.data?.user ?? null;
      setUser(nextUser);
      setStatus(nextUser ? AUTH_STATUS.AUTHENTICATED : AUTH_STATUS.ANONYMOUS);
      return result;
    } catch (cause) {
      setError(cause);
      setStatus(AUTH_STATUS.ERROR);
      throw cause;
    }
  }, []);

  const signUp = useCallback(async (input, { signal } = {}) => {
    setStatus(AUTH_STATUS.LOADING);
    setError(null);

    try {
      const result = await authService.signUp(input, { signal });
      const nextUser = result?.user ?? result?.data?.user ?? null;
      setUser(nextUser);
      setStatus(nextUser ? AUTH_STATUS.AUTHENTICATED : AUTH_STATUS.ANONYMOUS);
      return result;
    } catch (cause) {
      setError(cause);
      setStatus(AUTH_STATUS.ERROR);
      throw cause;
    }
  }, []);

  const signOut = useCallback(async ({ signal } = {}) => {
    setStatus(AUTH_STATUS.LOADING);
    setError(null);

    try {
      const result = await authService.signOut({ signal });
      setUser(null);
      setStatus(AUTH_STATUS.ANONYMOUS);
      return result;
    } catch (cause) {
      setError(cause);
      setStatus(AUTH_STATUS.ERROR);
      throw cause;
    }
  }, []);

  return useMemo(() => ({
    user,
    status,
    error,
    isLoading: status === AUTH_STATUS.LOADING,
    isAuthenticated: status === AUTH_STATUS.AUTHENTICATED,
    isAnonymous: status === AUTH_STATUS.ANONYMOUS,
    refreshSession,
    signIn,
    signUp,
    signOut,
  }), [error, refreshSession, signIn, signOut, signUp, status, user]);
}
