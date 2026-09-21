import { resolveSession } from "./auth.js";

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
const MAX = { displayName: 60, bio: 160, website: 200, location: 100 };

function profilePayload(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    bio: user.bio || "",
    website: user.website || "",
    avatarUrl: user.avatar_url || null,
    coverUrl: user.cover_url || null,
    location: user.location || "",
    counts: { followers: Number(user.follower_count || 0), following: Number(user.following_count || 0), posts: Number(user.post_count || 0) },
  };
}

const PROFILE_SELECT = `SELECT u.id, u.username, u.display_name, u.bio, u.website, u.avatar_url, u.cover_url, u.location,
  (SELECT COUNT(*) FROM relationships r WHERE r.target_user_id = u.id AND r.relationship_type = 'follow') AS follower_count,
  (SELECT COUNT(*) FROM relationships r WHERE r.source_user_id = u.id AND r.relationship_type = 'follow') AS following_count,
  (SELECT COUNT(*) FROM posts p WHERE p.author_id = u.id AND p.deleted_at IS NULL) AS post_count
  FROM users u`;

export async function getProfile(request, env, username) {
  if (!env?.DB) return { error: { code: "SERVICE_UNAVAILABLE", status: 503, message: "Profile service is not configured." } };
  const normalized = String(username || "").trim().toLowerCase();
  if (!USERNAME_PATTERN.test(normalized)) return { error: { code: "VALIDATION_ERROR", status: 400, message: "A valid username is required." } };
  const user = await env.DB.prepare(`${PROFILE_SELECT} WHERE u.username = ?1 AND u.deleted_at IS NULL LIMIT 1`).bind(normalized).first();
  if (!user) return { error: { code: "NOT_FOUND", status: 404, message: "Profile not found." } };
  return { response: { profile: profilePayload(user) } };
}

export async function getMyProfile(request, env) {
  const session = await resolveSession(request, env);
  if (!session) return { error: { code: "UNAUTHORIZED", status: 401, message: "Authentication is required." } };
  return getProfile(request, env, session.username);
}

export async function updateMyProfile(request, env) {
  const session = await resolveSession(request, env);
  if (!session) return { error: { code: "UNAUTHORIZED", status: 401, message: "Authentication is required." } };
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: { code: "INVALID_JSON", status: 400, message: "Request body must be a JSON object." } };
  const fields = [];
  const values = [];
  const add = (column, key, max, nullable = false) => {
    if (!(key in body)) return;
    const value = body[key];
    if (value === null && nullable) { fields.push(`${column} = NULL`); return; }
    if (typeof value !== "string" || value.length > max) throw new Error(`Invalid ${key}.`);
    fields.push(`${column} = ?${values.length + 1}`); values.push(value.trim());
  };
  try {
    add("display_name", "displayName", MAX.displayName);
    add("bio", "bio", MAX.bio);
    add("website", "website", MAX.website);
    add("location", "location", MAX.location);
    add("avatar_url", "avatarUrl", 500, true);
    add("cover_url", "coverUrl", 500, true);
    if ("username" in body) {
      if (typeof body.username !== "string" || !USERNAME_PATTERN.test(body.username.trim().toLowerCase())) throw new Error("Invalid username.");
      fields.push(`username = ?${values.length + 1}`); values.push(body.username.trim().toLowerCase());
    }
  } catch (error) {
    return { error: { code: "VALIDATION_ERROR", status: 400, message: error.message } };
  }
  if (!fields.length) return { error: { code: "VALIDATION_ERROR", status: 400, message: "No profile fields were provided." } };
  fields.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
  values.push(session.user_id);
  try {
    await env.DB.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?${values.length} AND deleted_at IS NULL`).bind(...values).run();
  } catch (error) {
    if (String(error?.message || "").toLowerCase().includes("unique")) return { error: { code: "USERNAME_TAKEN", status: 409, message: "That username is already in use." } };
    throw error;
  }
  return getProfile(request, env, body.username || session.username);
}
