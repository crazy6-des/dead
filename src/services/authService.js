import { apiClient } from "./apiClient.js";

/**
 * Authentication service boundary.
 * These functions are intentionally thin: authorization and validation belong
 * to the future backend, not to the browser.
 */
export const authService = Object.freeze({
  getSession() {
    return apiClient.get("/api/auth/session");
  },

  signIn(credentials) {
    return apiClient.post("/api/auth/sign-in", credentials);
  },

  signUp(input) {
    return apiClient.post("/api/auth/sign-up", input);
  },

  signOut() {
    return apiClient.post("/api/auth/sign-out");
  },

  requestPasswordReset(input) {
    return apiClient.post("/api/auth/password-reset/request", input);
  },

  resetPassword(input) {
    return apiClient.post("/api/auth/password-reset/confirm", input);
  },
});
