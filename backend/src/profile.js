import { resolveSession } from "./auth.js";
import { serializePost } from "./posts.js";
import { getUserSettings } from "./settings.js";

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
const MAX = { displayName: 60, bio: 160, website: 200, location: 100 };

function profilePayload(user, settings = null) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    bio: user.bio || "",
    website: user.website || "",
    avatarUrl: user.avatar_url || null,
    coverUrl: user.cover_url || null,
    location: user.location || "",
    counts: { followers: settings?.show_follower_count === false ? null : Number(user.follower_count || 0), following: Number(user.following_count || 0), posts: Number(user.post_count || 0) },
    privacy: { privateAccount: Boolean(settings?.private_account), showFollowerCount: settings?.show_follower_count !== false, allowMessages: settings?.allow_messages !== false },
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
  const settings = await getUserSettings(env, user.id);
  return { response: { profile: profilePayload(user, settings) } };
}

export async function listProfilePosts(request, env, username) {
  if (!env?.DB) return { error: { code: "SERVICE_UNAVAILABLE", status: 503, message: "Profile service is not configured." } };
  const normalized = String(username || "").trim().toLowerCase();
  if (!USERNAME_PATTERN.test(normalized)) return { error: { code: "VALIDATION_ERROR", status: 400, message: "A valid username is required." } };
  const target = await env.DB.prepare("SELECT id, username FROM users WHERE username = ?1 AND deleted_at IS NULL LIMIT 1").bind(normalized).first();
  if (!target) return { error: { code: "NOT_FOUND", status: 404, message: "Profile not found." } };
  const session = await resolveSession(request, env);
  const ownProfile = session?.user_id === target.id;
  const targetSettings = await getUserSettings(env, target.id);
  const isFollower = session?.user_id ? Boolean(await env.DB.prepare("SELECT 1 FROM relationships WHERE source_user_id = ?1 AND target_user_id = ?2 AND relationship_type = 'follow' LIMIT 1").bind(session.user_id, target.id).first()) : false;
  const url = new URL(request.url);
  const tab = String(url.searchParams.get("tab") || "posts").toLowerCase();
  if (!["posts", "replies", "media", "likes"].includes(tab)) return { error: { code: "VALIDATION_ERROR", status: 400, message: "Unsupported profile tab." } };

  const values = [target.id];
  if (!ownProfile) values.push(session?.user_id || "");
  let where = "p.deleted_at IS NULL AND p.author_id = ?1";
  if (!ownProfile) where += targetSettings?.private_account && !isFollower ? " AND p.visibility = 'public' AND 1 = 0" : " AND (p.visibility = 'public' OR (p.visibility = 'followers' AND EXISTS (SELECT 1 FROM relationships rel WHERE rel.source_user_id = ?2 AND rel.target_user_id = p.author_id AND rel.relationship_type = 'follow')))";
  if (tab === "replies") where += " AND p.reply_to_id IS NOT NULL";
  if (tab === "media") where += " AND EXISTS (SELECT 1 FROM post_media pm WHERE pm.post_id = p.id)";
  if (tab === "likes") {
    where = "p.deleted_at IS NULL AND EXISTS (SELECT 1 FROM post_reactions pr WHERE pr.post_id = p.id AND pr.user_id = ?1 AND pr.reaction_type = 'like')";
    if (!ownProfile) where += targetSettings?.private_account && !isFollower ? " AND p.visibility = 'public' AND 1 = 0" : " AND (p.visibility = 'public' OR (p.visibility = 'followers' AND EXISTS (SELECT 1 FROM relationships rel WHERE rel.source_user_id = ?2 AND rel.target_user_id = p.author_id AND rel.relationship_type = 'follow')))";
  }
  const rows = await env.DB.prepare(
    `SELECT p.id, p.author_id, p.body, p.visibility, p.reply_policy, p.post_kind, p.background_json, p.quoted_post_id, p.reply_to_id, p.created_at, p.updated_at,
      u.username, u.display_name,
      (SELECT json_group_array(json_object('id',m.id,'mediaType',m.media_type,'mimeType',m.mime_type,'url',COALESCE(m.external_url, '/api/media/' || m.id),'source',m.source,'metadata',m.metadata_json,'durationMs',m.duration_ms)) FROM post_media m WHERE m.post_id = p.id ORDER BY m.position) AS media,
      (SELECT COUNT(*) FROM post_reactions r WHERE r.post_id = p.id AND r.reaction_type = 'like') AS like_count,
      (SELECT COUNT(*) FROM post_reactions r WHERE r.post_id = p.id AND r.reaction_type = 'repost') AS repost_count,
      (SELECT COUNT(*) FROM posts rp WHERE rp.reply_to_id = p.id AND rp.deleted_at IS NULL) AS reply_count,
      (SELECT COUNT(*) FROM bookmarks b WHERE b.post_id = p.id) AS bookmark_count,
      (SELECT json_object('id',qp.id,'author',json_object('username',qu.username,'displayName',qu.display_name),'text',qp.body) FROM posts qp JOIN users qu ON qu.id = qp.author_id WHERE qp.id = p.quoted_post_id AND qp.deleted_at IS NULL) AS quoted_post
     FROM posts p JOIN users u ON u.id = p.author_id WHERE ${where}
     ORDER BY p.created_at DESC, p.id DESC LIMIT 50`
  ).bind(...values).all();
  return { response: { items: (rows.results || []).map(serializePost), tab }, error: null };
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
    if ("privateAccount" in body && typeof body.privateAccount !== "boolean") throw new Error("Invalid privateAccount.");
  } catch (error) {
    return { error: { code: "VALIDATION_ERROR", status: 400, message: error.message } };
  }
  if (!fields.length && !("privateAccount" in body)) return { error: { code: "VALIDATION_ERROR", status: 400, message: "No profile fields were provided." } };
  fields.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
  values.push(session.user_id);
  try {
    if (fields.length > 1) await env.DB.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?${values.length} AND deleted_at IS NULL`).bind(...values).run();
    if ("privateAccount" in body) {
      await env.DB.prepare("INSERT OR IGNORE INTO user_settings (user_id) VALUES (?1)").bind(session.user_id).run();
      await env.DB.prepare("UPDATE user_settings SET private_account = ?1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE user_id = ?2").bind(body.privateAccount ? 1 : 0, session.user_id).run();
    }
  } catch (error) {
    if (String(error?.message || "").toLowerCase().includes("unique")) return { error: { code: "USERNAME_TAKEN", status: 409, message: "That username is already in use." } };
    throw error;
  }
  return getProfile(request, env, body.username || session.username);
}
