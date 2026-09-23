/**
 * Small, backend-agnostic HTTP client for S.
 *
 * The API base URL is intentionally environment-driven so the frontend can
 * remain on Netlify while the API is introduced later.
 */

const DEFAULT_PRODUCTION_API_BASE_URL = "https://muddy-tooth-e4be.binancecompany274.workers.dev";
const API_BASE_URL = String(
  import.meta.env?.VITE_API_BASE_URL || (import.meta.env?.PROD ? DEFAULT_PRODUCTION_API_BASE_URL : ""),
).replace(/\/$/, "");
const DEFAULT_TIMEOUT_MS = 10000;
const GET_RETRY_DELAY_MS = 250;
const GET_RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

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

function buildQuery(path, query) {
  if (!query || typeof query !== "object") return path;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  });
  const encoded = params.toString();
  if (!encoded) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${encoded}`;
}

function getErrorField(payload, field, fallback) {
  if (!payload || typeof payload !== "object") return fallback;
  return payload[field] ?? payload.error?.[field] ?? fallback;
}

export async function apiRequest(path, options = {}) {
  const { body, query, headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS, signal: externalSignal, ...requestOptions } = options;
  const controller = new AbortController();
  let didTimeout = false;
  const timeoutId = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);

  if (externalSignal) {
    if (externalSignal.aborted) controller.abort(externalSignal.reason);
    else externalSignal.addEventListener("abort", () => controller.abort(externalSignal.reason), { once: true });
  }

  const requestHeaders = new Headers(headers);
  if (body !== undefined && !(body instanceof FormData) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  try {
    const url = buildUrl(buildQuery(path, query));
    const isGet = String(requestOptions.method || "GET").toUpperCase() === "GET";
    let response;
    let lastNetworkError = null;
    for (let attempt = 0; attempt < (isGet ? 2 : 1); attempt += 1) {
      try {
        response = await fetch(url, {
          credentials: "include",
          ...requestOptions,
          headers: requestHeaders,
          signal: controller.signal,
          body: body === undefined || body instanceof FormData || typeof body === "string" ? body : JSON.stringify(body),
        });
        if (!(isGet && GET_RETRYABLE_STATUSES.has(response.status) && attempt === 0)) break;
      } catch (networkError) {
        lastNetworkError = networkError;
        if (!isGet || attempt !== 0) throw networkError;
      }
      await new Promise((resolve) => setTimeout(resolve, GET_RETRY_DELAY_MS));
    }
    if (!response && lastNetworkError) throw lastNetworkError;
    const payload = await parseResponse(response);

    if (!response.ok) {
      throw new ApiError(getErrorField(payload, "message", `Request failed with status ${response.status}`), {
        status: response.status,
        code: getErrorField(payload, "code", "API_ERROR"),
        details: payload,
      });
    }

    return payload;
  } catch (cause) {
    if (cause instanceof ApiError) throw cause;
    if (cause?.name === "AbortError") {
      throw new ApiError(
        didTimeout ? "The request timed out." : "The request was cancelled.",
        { code: didTimeout ? "REQUEST_TIMEOUT" : "REQUEST_ABORTED", cause },
      );
    }
    throw new ApiError("Unable to reach the server. Please try again.", {
      code: "NETWORK_ERROR",
      cause,
    });
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

export function resolveApiUrl(path) {
  const value = String(path || "");
  if (/^(https?:|blob:|data:)/i.test(value)) return value;
  return buildUrl(value);
}
