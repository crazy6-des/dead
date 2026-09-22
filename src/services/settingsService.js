import { apiClient } from "./apiClient.js";

const DEFAULTS = Object.freeze({ privateAccount: false, showFollowerCount: true, allowMessages: true, theme: "dark", reduceMotion: false });

function normalize(value = {}) {
  return {
    privateAccount: Boolean(value.privateAccount),
    showFollowerCount: value.showFollowerCount !== false,
    allowMessages: value.allowMessages !== false,
    theme: value.theme === "light" ? "light" : "dark",
    reduceMotion: Boolean(value.reduceMotion),
  };
}

export const settingsService = Object.freeze({
  defaults: DEFAULTS,
  get(options = {}) { return apiClient.get("/api/settings/me", options).then((data) => normalize(data?.settings)); },
  update(patch, options = {}) { return apiClient.patch("/api/settings/me", patch, options).then((data) => normalize(data?.settings)); },
  normalize,
});
