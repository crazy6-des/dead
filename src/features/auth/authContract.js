/**
 * Authentication contract for S.
 * Framework-free vocabulary for the future API/session adapter.
 * No credentials or tokens are handled in this client-side module.
 */

export const AUTH_MODES = Object.freeze({
  SIGN_IN: "sign-in",
  SIGN_UP: "sign-up",
  SIGN_OUT: "sign-out",
  RECOVER: "recover",
  RESET: "reset",
});

export const AUTH_STATUSES = Object.freeze({
  UNKNOWN: "unknown",
  LOADING: "loading",
  AUTHENTICATED: "authenticated",
  ANONYMOUS: "anonymous",
  ERROR: "error",
});

export function createAuthRequest({ mode, email = "", password = "" } = {}) {
  return Object.freeze({
    mode,
    email: String(email).trim().toLowerCase(),
    password,
  });
}

export function createAuthState(status = AUTH_STATUSES.UNKNOWN, user = null, error = null) {
  return Object.freeze({ status, user, error });
}

export function getAuthUser(payload) {
  return payload?.user ?? payload?.data?.user ?? null;
}

export function isAuthenticated(state) {
  return state?.status === AUTH_STATUSES.AUTHENTICATED && Boolean(state.user);
}
