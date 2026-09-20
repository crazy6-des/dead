import { apiClient } from "./apiClient.js";

/**
 * Authentication service boundary.
 * These functions are intentionally thin: authorization and validation belong
 * to the future backend, not to the browser.
 */
export const authService = Object.freeze({
  getSession(options = {}) {
    return apiClient.get("/api/auth/session", options);
  },

  signIn(credentials, options = {}) {
    return apiClient.post("/api/auth/sign-in", credentials, options);
  },

  signUp(input, options = {}) {
    return apiClient.post("/api/auth/sign-up", input, options);
  },

  signOut(options = {}) {
    return apiClient.post("/api/auth/sign-out", undefined, options);
  },

  requestPasswordReset(input) {
    return apiClient.post("/api/auth/password-reset/request", input);
  },

  resetPassword(input) {
    return apiClient.post("/api/auth/password-reset/confirm", input);
  },
});
