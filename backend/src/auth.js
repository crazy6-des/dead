const SESSION_COOKIE = "s_session";

function parseCookies(header = "") {
  const cookies = {};

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;

    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!key || !value) continue;

    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  }

  return cookies;
}

export function getSessionToken(request) {
  return parseCookies(request.headers.get("Cookie") || "")[SESSION_COOKIE] || null;
}

export async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function resolveSession(request, env) {
  const token = getSessionToken(request);
  if (!token || !env?.DB) return null;

  const tokenHash = await sha256Hex(token);
  const session = await env.DB.prepare(
    "SELECT s.id, s.user_id, s.expires_at, u.username, u.display_name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?1 AND s.revoked_at IS NULL AND s.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ','now') AND u.deleted_at IS NULL LIMIT 1",
  ).bind(tokenHash).first();

  return session || null;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
