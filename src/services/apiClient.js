/**
 * Small, backend-agnostic HTTP client for S.
 *
 * The API base URL is intentionally environment-driven so the frontend can
 * remain on Netlify while the API is introduced later.
 */

const API_BASE_URL = String(import.meta.env?.VITE_API_BASE_URL || "").replace(/\/$/, "");
const DEFAULT_TIMEOUT_MS = 15000;

export class ApiError extends Error {
  constructor(message, { status = 0, code = "API_ERROR", details = null, cause = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.cause = cause;
  }
}

function buildUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch (cause) {
      throw new ApiError("The server returned invalid JSON.", {
        status: response.status,
        code: "INVALID_RESPONSE",
        cause,
      });
    }
  }

  const text = await response.text();
  return text || null;
}

export async function apiRequest(path, options = {}) {
  const { body, headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS, signal: externalSignal, ...requestOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (externalSignal) {
    if (externalSignal.aborted) controller.abort(externalSignal.reason);
    else externalSignal.addEventListener("abort", () => controller.abort(externalSignal.reason), { once: true });
  }

  const requestHeaders = new Headers(headers);
  if (body !== undefined && !(body instanceof FormData) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(buildUrl(path), {
      credentials: "include",
      ...requestOptions,
      headers: requestHeaders,
      signal: controller.signal,
      body: body === undefined || body instanceof FormData || typeof body === "string" ? body : JSON.stringify(body),
    });
    const payload = await parseResponse(response);

    if (!response.ok) {
      const message = payload && typeof payload === "object" && payload.message ? payload.message : `Request failed with status ${response.status}`;
      throw new ApiError(message, {
        status: response.status,
        code: payload && typeof payload === "object" && payload.code ? payload.code : "API_ERROR",
        details: payload,
      });
    }

    return payload;
  } catch (cause) {
    if (cause instanceof ApiError) throw cause;
    if (cause?.name === "AbortError") {
      throw new ApiError("The request timed out or was cancelled.", { code: "REQUEST_ABORTED", cause });
    }
    throw new ApiError("Unable to reach the server. Please try again.", { code: "NETWORK_ERROR", cause });
  } finally {
    clearTimeout(timeoutId);
  }
}

export const apiClient = Object.freeze({
  get: (path, options = {}) => apiRequest(path, { ...options, method: "GET" }),
  post: (path, body, options = {}) => apiRequest(path, { ...options, method: "POST", body }),
  put: (path, body, options = {}) => apiRequest(path, { ...options, method: "PUT", body }),
  patch: (path, body, options = {}) => apiRequest(path, { ...options, method: "PATCH", body }),
  delete: (path, options = {}) => apiRequest(path, { ...options, method: "DELETE" }),
});

export function hasApiBaseUrl() {
  return Boolean(API_BASE_URL);
}
