import { resolveSession } from "./auth.js";

const RELATIONSHIPS = new Set(["follow", "block", "mute"]);

function failure(code, status, message) {
  return { response: null, error: { code, status, message } };
}

export async function setRelationship(request, env) {
  const session = await resolveSession(request, env);
  if (!session?.user_id) return failure("UNAUTHORIZED", 401, "Authentication is required.");
  if (!env?.DB) return failure("SERVICE_UNAVAILABLE", 503, "Social service is not configured.");

  let body;
  try { body = await request.json(); } catch { return failure("INVALID_JSON", 400, "Request body must be valid JSON."); }

  const username = String(body?.username || "").replace(/^@/, "").trim().toLowerCase();
  const relationship = String(body?.relationship || "");
  const enabled = Boolean(body?.enabled);
  if (!username || !RELATIONSHIPS.has(relationship)) {
    return failure("VALIDATION_ERROR", 400, "A valid username and relationship are required.");
  }

  const target = await env.DB.prepare(
    "SELECT id, username, display_name FROM users WHERE username = ?1 AND deleted_at IS NULL LIMIT 1",
  ).bind(username).first();
  if (!target) return failure("USER_NOT_FOUND", 404, "User was not found.");
  if (target.id === session.user_id) return failure("INVALID_RELATIONSHIP", 400, "You cannot create a relationship with yourself.");

  if (enabled) {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO relationships (source_user_id, target_user_id, relationship_type) VALUES (?1, ?2, ?3)",
    ).bind(session.user_id, target.id, relationship).run();
  } else {
    await env.DB.prepare(
      "DELETE FROM relationships WHERE source_user_id = ?1 AND target_user_id = ?2 AND relationship_type = ?3",
    ).bind(session.user_id, target.id, relationship).run();
  }

  return {
    response: {
      ok: true,
      username: target.username,
      relationship,
      enabled,
    },
    error: null,
  };
}
