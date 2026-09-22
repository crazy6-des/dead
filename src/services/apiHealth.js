import { apiClient, hasApiBaseUrl } from "./apiClient.js";

export const API_HEALTH_PATH = "/api/health";

export async function checkApiHealth(options = {}) {
  if (!hasApiBaseUrl()) {
    return { reachable: false, configured: false, service: null, version: null };
  }

  try {
    const payload = await apiClient.get(API_HEALTH_PATH, options);
    return {
      reachable: payload?.ok === true,
      configured: true,
      service: payload?.service ?? null,
      version: payload?.version ?? null,
    };
  } catch (error) {
    return {
      reachable: false,
      configured: true,
      service: null,
      version: null,
      error,
    };
  }
}
