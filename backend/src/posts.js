import { resolveSession } from "./auth.js";

const MAX_POST_TEXT = 5000;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
const ALLOWED_AUDIENCES = new Set(["public", "followers", "private"]);
const ALLOWED_REPLY_POLICIES = new Set(["everyone", "following", "mentioned"]);
const ALLOWED_KINDS = new Set(["text", "image", "music", "background"]);
const MAX_MEDIA = 8;

function error(code, status, message, details = undefined) {
  return { code, status, message, ...(details === undefined ? {} : { details }) };
}

function encodeCursor(createdAt, id) {
  const value = JSON.stringify({ createdAt, id });
  return globalThis.btoa(value)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function decodeCursor(value) {
  if (!value) return null;
  try {
    const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(globalThis.atob(padded));
  } catch {
    return null;
  }
}

function normalizeLimit(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return DEFAULT_LIMIT;
  return Math.min(Math.max(parsed, 1), MAX_LIMIT);
}

function serializePost(row) {
  return {
    id: row.id,
    author: {
      id: row.author_id,
      username: row.username,
      displayName: row.display_name,
    },
    text: row.body,
    kind: row.post_kind || "text",
    media: row.media ? JSON.parse(row.media) : [],
    audio: row.audio || null,
    background: row.background_json ? JSON.parse(row.background_json) : null,
    audience: row.visibility,
    replyPolicy: row.reply_policy || "everyone",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    stats: {
      likes: Number(row.like_count || 0),
      reposts: Number(row.repost_count || 0),
      replies: Number(row.reply_count || 0),
      bookmarks: Number(row.bookmark_count || 0),
    },
  };
}

async function requireUser(request, env) {
  const session = await resolveSession(request, env);
  return session?.user_id ? session : null;
}

export async function createPost(request, env) {
  const session = await requireUser(request, env);
  if (!session) return { response: null, error: error("UNAUTHORIZED", 401, "Authentication is required.") };
  if (!env?.DB) return { response: null, error: error("SERVICE_UNAVAILABLE", 503, "Post service is not configured.") };

  let body;
  try { body = await request.json(); } catch {
    return { response: null, error: error("INVALID_JSON", 400, "Request body must be valid JSON.") };
  }

  if (!body || typeof body !== "object") return { response: null, error: error("INVALID_JSON", 400, "Request body must be a JSON object.") };
  const text = String(body.text || "").trim();
  const kind = String(body.kind || "text");
  const media = Array.isArray(body.media) ? body.media : [];
  const audio = body.audio && typeof body.audio === "object" ? body.audio : null;
  const background = body.background && typeof body.background === "object" ? body.background : null;
  if (body.poll !== null && body.poll !== undefined) return { response: null, error: error("UNSUPPORTED_POST_CONTENT", 400, "Poll persistence is not connected yet.") };
  if (!ALLOWED_KINDS.has(kind) || media.length > MAX_MEDIA) return { response: null, error: error("VALIDATION_ERROR", 400, "Unsupported post content or too many media items.") };
  if (media.some((item) => !item || typeof item.mediaId !== "string")) return { response: null, error: error("MEDIA_NOT_FOUND", 400, "Every uploaded media item must reference a media id.") };
  if (!text || text.length > MAX_POST_TEXT) {
    return { response: null, error: error("VALIDATION_ERROR", 400, "Post text must contain 1-5000 characters.") };
  }

  const audience = String(body.audience || "public");
  const replyPolicy = String(body.replyPolicy || "everyone");
  if (!ALLOWED_AUDIENCES.has(audience) || !ALLOWED_REPLY_POLICIES.has(replyPolicy)) {
    return { response: null, error: error("VALIDATION_ERROR", 400, "Unsupported post audience or reply policy.") };
  }

  const id = globalThis.crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO posts (id, author_id, body, visibility, reply_policy, post_kind, background_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
  ).bind(id, session.user_id, text, audience, replyPolicy, kind, background ? JSON.stringify(background) : null).run();

  for (let position = 0; position < media.length; position += 1) {
    const item = media[position];
    const stored = await env.DB.prepare("SELECT id, source FROM post_media WHERE id = ?1 LIMIT 1").bind(item.mediaId).first();
    if (!stored) return { response: null, error: error("MEDIA_NOT_FOUND", 400, "Referenced media was not found.") };
    await env.DB.prepare("UPDATE post_media SET post_id = ?1, position = ?2 WHERE id = ?3 AND post_id IS NULL").bind(id, position, item.mediaId).run();
  }

  if (audio?.source === "catalog") {
    await env.DB.prepare("INSERT INTO post_media (id, post_id, object_key, media_type, mime_type, byte_size, position, source, external_url, metadata_json, duration_ms) VALUES (?1, ?2, ?3, 'audio', ?4, 0, ?5, 'catalog', ?6, ?7, ?8)")
      .bind(globalThis.crypto.randomUUID(), id, `catalog:${audio.musicId}`, audio.type || "audio/mpeg", media.length, audio.url, JSON.stringify({ musicId: audio.musicId, title: audio.title || audio.name || "", artist: audio.artist || "", album: audio.album || "" }), Number(audio.durationMs || 0)).run();
  } else if (audio?.mediaId) {
    await env.DB.prepare("UPDATE post_media SET post_id = ?1, position = ?2 WHERE id = ?3 AND post_id IS NULL").bind(id, media.length, audio.mediaId).run();
  }

  const row = await env.DB.prepare(
    `SELECT p.id, p.author_id, p.body, p.visibility, p.reply_policy, p.post_kind, p.background_json, p.created_at, p.updated_at, u.username, u.display_name,
      (SELECT json_group_array(json_object('id',m.id,'mediaType',m.media_type,'mimeType',m.mime_type,'url',COALESCE(m.external_url, '/api/media/' || m.id),'source',m.source,'metadata',m.metadata_json,'durationMs',m.duration_ms)) FROM post_media m WHERE m.post_id = p.id ORDER BY m.position) AS media,
      0 AS like_count, 0 AS repost_count, 0 AS reply_count, 0 AS bookmark_count
     FROM posts p JOIN users u ON u.id = p.author_id WHERE p.id = ?1 AND p.deleted_at IS NULL LIMIT 1`
  ).bind(id).first();
  return { response: { post: serializePost(row), status: "created" }, error: null };
}

function visibilitySql(alias = "p") {
  return `(
    ${alias}.visibility = 'public'
    OR ${alias}.author_id = ?USER?
    OR (${alias}.visibility = 'followers' AND EXISTS (
      SELECT 1 FROM relationships rel
      WHERE rel.source_user_id = ?USER?
        AND rel.target_user_id = ${alias}.author_id
        AND rel.relationship_type = 'follow'
    ))
  )`;
}

export async function listFeed(request, env) {
  const session = await requireUser(request, env);
  if (!session) return { response: null, error: error("UNAUTHORIZED", 401, "Authentication is required.") };
  if (!env?.DB) return { response: null, error: error("SERVICE_UNAVAILABLE", 503, "Feed service is not configured.") };

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") || "For You";
  if (!new Set(["For You", "Following", "Latest"]).has(mode)) {
    return { response: null, error: error("VALIDATION_ERROR", 400, "Unsupported feed mode.") };
  }

  const limit = normalizeLimit(url.searchParams.get("limit"));
  const cursor = decodeCursor(url.searchParams.get("cursor"));
  if (url.searchParams.get("cursor") && !cursor?.createdAt) {
    return { response: null, error: error("INVALID_CURSOR", 400, "Feed cursor is invalid.") };
  }

  const values = [session.user_id];
  let visibility = visibilitySql("p").replace(/\?USER\?/g, () => {
    values.push(session.user_id);
    return `?${values.length}`;
  });
  let where = `p.deleted_at IS NULL AND u.deleted_at IS NULL AND ${visibility}`;

  if (mode === "Following") {
    where += " AND (p.author_id = ?1 OR EXISTS (SELECT 1 FROM relationships f WHERE f.source_user_id = ?1 AND f.target_user_id = p.author_id AND f.relationship_type = 'follow'))";
  }

  if (cursor?.createdAt && cursor?.id) {
    values.push(cursor.createdAt, cursor.id);
    where += ` AND (p.created_at < ?${values.length - 1} OR (p.created_at = ?${values.length - 1} AND p.id < ?${values.length}))`;
  }

  values.push(limit + 1);
  const rows = await env.DB.prepare(
    `SELECT p.id, p.author_id, p.body, p.visibility, p.reply_policy, p.created_at, p.updated_at,
      u.username, u.display_name, p.post_kind, p.background_json,
      (SELECT json_group_array(json_object('id',m.id,'mediaType',m.media_type,'mimeType',m.mime_type,'url',COALESCE(m.external_url, '/api/media/' || m.id),'source',m.source,'metadata',m.metadata_json,'durationMs',m.duration_ms)) FROM post_media m WHERE m.post_id = p.id ORDER BY m.position) AS media,
      (SELECT COUNT(*) FROM post_reactions r WHERE r.post_id = p.id AND r.reaction_type = 'like') AS like_count,
      (SELECT COUNT(*) FROM post_reactions r WHERE r.post_id = p.id AND r.reaction_type = 'repost') AS repost_count,
      (SELECT COUNT(*) FROM posts rp WHERE rp.reply_to_id = p.id AND rp.deleted_at IS NULL) AS reply_count,
      (SELECT COUNT(*) FROM bookmarks b WHERE b.post_id = p.id) AS bookmark_count
     FROM posts p JOIN users u ON u.id = p.author_id
     WHERE ${where}
     ORDER BY p.created_at DESC, p.id DESC
     LIMIT ?${values.length}`
  ).bind(...values).all();

  const items = rows.results.slice(0, limit).map(serializePost);
  const last = items.at(-1);
  const nextCursor = rows.results.length > limit ? encodeCursor(last.createdAt, last.id) : null;
  return { response: { items, nextCursor }, error: null };
}
