import { resolveSession } from "./auth.js";

function failure(code, status, message) {
  return { response: null, error: { code, status, message } };
}

async function listGraph(request, env, username, relationshipType) {
  const session = await resolveSession(request, env);
  if (!session?.user_id) return failure("UNAUTHORIZED", 401, "Authentication is required.");
  if (!env?.DB) return failure("SERVICE_UNAVAILABLE", 503, "Social graph service is not configured.");
  const targetUsername = String(username || "").replace(/^@/, "").trim().toLowerCase();
  if (!targetUsername) return failure("VALIDATION_ERROR", 400, "A username is required.");
  const target = await env.DB.prepare("SELECT id FROM users WHERE username=?1 AND deleted_at IS NULL LIMIT 1").bind(targetUsername).first();
  if (!target) return failure("USER_NOT_FOUND", 404, "User was not found.");
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 100);
  const cursor = Math.max(Number(url.searchParams.get("cursor")) || 0, 0);
  const sql = relationshipType === "following"
    ? "SELECT u.id,u.username,u.display_name,u.avatar_url FROM relationships r JOIN users u ON u.id=r.target_user_id WHERE r.source_user_id=?1 AND r.relationship_type='follow' AND u.deleted_at IS NULL ORDER BY r.created_at DESC,u.username ASC LIMIT ?2 OFFSET ?3"
    : "SELECT u.id,u.username,u.display_name,u.avatar_url,EXISTS (SELECT 1 FROM relationships vf WHERE vf.source_user_id=?1 AND vf.target_user_id=u.id AND vf.relationship_type='follow') AS following FROM relationships r JOIN users u ON u.id=r.source_user_id WHERE r.target_user_id=?2 AND r.relationship_type='follow' AND u.deleted_at IS NULL ORDER BY r.created_at DESC,u.username ASC LIMIT ?3 OFFSET ?4";
  const rows = relationshipType === "following"
    ? await env.DB.prepare(sql).bind(target.id, limit + 1, cursor).all()
    : await env.DB.prepare(sql).bind(session.user_id, target.id, limit + 1, cursor).all();
  const items = (rows.results || []).slice(0, limit).map((row) => ({
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url || null,
    following: relationshipType === "following" ? true : Boolean(row.following),
  }));
  return { response: { items, nextCursor: (rows.results || []).length > limit ? String(cursor + limit) : null }, error: null };
}

export async function listFollowing(request, env, username) {
  return listGraph(request, env, username, "following");
}

export async function listFollowers(request, env, username) {
  return listGraph(request, env, username, "followers");
}
