const UPSTREAM = "https://api.audius.co/v1";

function error(code, status, message) {
  return { code, status, message };
}

function normalizeLimit(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return 12;
  return Math.min(Math.max(parsed, 1), 50);
}

function normalizeOffset(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return 0;
  return Math.min(Math.max(parsed, 0), 100000);
}

function upstreamHeaders(env) {
  const headers = new Headers({ Accept: "application/json" });
  const bearer = String(env?.AUDIUS_BEARER_TOKEN || "").trim();
  if (bearer) headers.set("Authorization", bearer.toLowerCase().startsWith("bearer ") ? bearer : `Bearer ${bearer}`);
  return headers;
}

async function upstream(path, params, env) {
  const url = new URL(`${UPSTREAM}/${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });
  const response = await fetch(url, { headers: upstreamHeaders(env) });
  if (!response.ok) return { error: error("MUSIC_UPSTREAM_ERROR", 502, "Audius music catalog is temporarily unavailable.") };
  let payload;
  try { payload = await response.json(); } catch { return { error: error("MUSIC_UPSTREAM_INVALID", 502, "Audius returned invalid data.") }; }
  if (payload?.data === undefined && payload?.error) return { error: error("MUSIC_UPSTREAM_ERROR", 502, String(payload.error)) };
  return { response: payload };
}

function catalogParams(url, defaults = {}) {
  return {
    limit: normalizeLimit(url.searchParams.get("limit") ?? defaults.limit ?? 12),
    offset: normalizeOffset(url.searchParams.get("offset")),
  };
}

export async function searchMusic(request, env) {
  const url = new URL(request.url);
  const query = String(url.searchParams.get("query") || "").trim();
  if (!query) return { response: null, error: error("VALIDATION_ERROR", 400, "A music search query is required.") };
  return upstream("tracks/search", { query, ...catalogParams(url) }, env);
}

export async function browseMusic(request, env) {
  const url = new URL(request.url);
  return upstream("tracks/trending", catalogParams(url), env);
}

export async function streamMusic(request, env, trackId) {
  const id = String(trackId || "").trim();
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) return { response: null, error: error("VALIDATION_ERROR", 400, "A valid Audius track id is required.") };
  const url = new URL(`${UPSTREAM}/tracks/${encodeURIComponent(id)}/stream`);
  const response = await fetch(url, { headers: upstreamHeaders(env), redirect: "manual" });
  if (![200, 206, 301, 302, 303, 307, 308].includes(response.status)) {
    return { response: null, error: error("MUSIC_STREAM_ERROR", 502, "Audius could not provide this track stream.") };
  }
  return { response };
}
