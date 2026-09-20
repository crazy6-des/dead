/**
 * Feature switch for the new Create composer.
 *
 * Disabled by default so the legacy App.jsx modal remains the safe runtime
 * path until the integration is reviewed and verified.
 */
export const CREATE_COMPOSER_FLAG = "VITE_ENABLE_NEW_CREATE_COMPOSER";

export function isNewCreateComposerEnabled(env = import.meta.env) {
  return String(env?.[CREATE_COMPOSER_FLAG] || "").toLowerCase() === "true";
}
