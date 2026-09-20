const SESSION_COOKIE = "s_session";

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map((part) => part.trim().split("=")).filter(([key, value]) => key && value).map(([key, ...value]) => [key, value.join("=")])));
}

export function getSessionToken(request) {
  return parseCookies(request.headers.get("Cookie") || "")[SESSION_COOKIE] || null;
}

export async function resolveSession(request, env) {
  const token = getSessionToken(request);
  if (!token || !env?.DB) return null;

  const session = await env.DB.prepare(
    "SELECT s.id, s.user_id, s.expires_at, u.username, u.display_name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?1 AND s.revoked_at IS NULL AND s.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ','now') AND u.deleted_at IS NULL LIMIT 1",
  ).bind(token).first();

  return session || null;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
