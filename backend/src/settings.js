import { resolveSession } from "./auth.js";

const THEMES = new Set(["light", "dark"]);

function failure(code, status, message) { return { response: null, error: { code, status, message } }; }
function settingsPayload(row) {
  return {
    privateAccount: Boolean(row.private_account),
    showFollowerCount: Boolean(row.show_follower_count),
    allowMessages: Boolean(row.allow_messages),
    theme: row.theme,
    reduceMotion: Boolean(row.reduce_motion),
  };
}
async function requireSession(request, env) {
  const session = await resolveSession(request, env);
  if (!session?.user_id) return { session: null, failure: failure("UNAUTHORIZED", 401, "Authentication is required.") };
  if (!env?.DB) return { session: null, failure: failure("SERVICE_UNAVAILABLE", 503, "Settings service is not configured.") };
  return { session, failure: null };
}
export async function getMySettings(request, env) {
  const { session, failure: authFailure } = await requireSession(request, env);
  if (authFailure) return authFailure;
  await env.DB.prepare("INSERT OR IGNORE INTO user_settings (user_id) VALUES (?1)").bind(session.user_id).run();
  const row = await env.DB.prepare("SELECT private_account, show_follower_count, allow_messages, theme, reduce_motion FROM user_settings WHERE user_id = ?1 LIMIT 1").bind(session.user_id).first();
  return { response: { settings: settingsPayload(row) }, error: null };
}
export async function updateMySettings(request, env) {
  const { session, failure: authFailure } = await requireSession(request, env);
  if (authFailure) return authFailure;
  let body;
  try { body = await request.json(); } catch { return failure("INVALID_JSON", 400, "Request body must be valid JSON."); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return failure("INVALID_JSON", 400, "Request body must be a JSON object.");
  const allowed = ["privateAccount", "showFollowerCount", "allowMessages", "theme", "reduceMotion"];
  if (!allowed.some((key) => key in body)) return failure("VALIDATION_ERROR", 400, "No supported settings were provided.");
  if ("theme" in body && !THEMES.has(String(body.theme))) return failure("VALIDATION_ERROR", 400, "Theme must be light or dark.");
  for (const key of ["privateAccount", "showFollowerCount", "allowMessages", "reduceMotion"]) {
    if (key in body && typeof body[key] !== "boolean") return failure("VALIDATION_ERROR", 400, `${key} must be a boolean.`);
  }
  await env.DB.prepare("INSERT OR IGNORE INTO user_settings (user_id) VALUES (?1)").bind(session.user_id).run();
  const fields = [];
  const values = [];
  const map = { privateAccount: "private_account", showFollowerCount: "show_follower_count", allowMessages: "allow_messages", theme: "theme", reduceMotion: "reduce_motion" };
  for (const key of allowed) {
    if (!(key in body)) continue;
    fields.push(`${map[key]} = ?${values.length + 1}`);
    values.push(typeof body[key] === "boolean" ? (body[key] ? 1 : 0) : String(body[key]));
  }
  fields.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
  values.push(session.user_id);
  await env.DB.prepare(`UPDATE user_settings SET ${fields.join(", ")} WHERE user_id = ?${values.length}`).bind(...values).run();
  return getMySettings(request, env);
}
export async function getUserSettings(env, userId) {
  if (!env?.DB || !userId) return null;
  return env.DB.prepare("SELECT private_account, show_follower_count, allow_messages, theme, reduce_motion FROM user_settings WHERE user_id = ?1 LIMIT 1").bind(userId).first();
}
