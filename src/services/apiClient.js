/**
 * Small, backend-agnostic HTTP client for S.
 *
 * The API base URL is intentionally environment-driven so the frontend can
 * remain on Netlify while the API is introduced later.
 */

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, { status = 0, code = "API_ERROR", details = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
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
    return response.json();
  }

  const text = await response.text();
  return text || null;
}

export async function apiRequest(path, options = {}) {
  const { body, headers = {}, ...requestOptions } = options;
  const requestHeaders = new Headers(headers);

  if (body !== undefined && !(body instanceof FormData) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path), {
    credentials: "include",
    ...requestOptions,
    headers: requestHeaders,
    body: body === undefined || body instanceof FormData || typeof body === "string"
      ? body
      : JSON.stringify(body),
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    const message = payload && typeof payload === "object" && payload.message
      ? payload.message
      : `Request failed with status ${response.status}`;

    throw new ApiError(message, {
      status: response.status,
      code: payload?.code || "API_ERROR",
      details: payload,
    });
  }

  return payload;
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
