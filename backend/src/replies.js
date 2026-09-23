import { resolveSession } from "./auth.js";
import { createNotification } from "./notifications.js";

const MAX_REPLY_TEXT = 5000;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 30;

function failure(code, status, message) { return { response: null, error: { code, status, message } }; }
function encodeCursor(createdAt, id) { return globalThis.btoa(JSON.stringify({ createdAt, id })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_"); }
function decodeCursor(value) { if (!value) return null; try { const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(globalThis.atob(normalized + "=".repeat((4 - normalized.length % 4) % 4))); } catch { return null; } }
function limitValue(value) { const n = Number(value); return Number.isInteger(n) ? Math.min(Math.max(n, 1), MAX_LIMIT) : DEFAULT_LIMIT; }
function serializeReply(row) {
  return {
    id: row.id,
    postId: row.reply_to_id,
    author: { id: row.author_id, username: row.username, displayName: row.display_name },
    text: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    likes: Number(row.like_count || 0),
  };
}
async function requireSession(request, env) {
  const session = await resolveSession(request, env);
  if (!session?.user_id) return { session: null, failure: failure("UNAUTHORIZED", 401, "Authentication is required.") };
  if (!env?.DB) return { session: null, failure: failure("SERVICE_UNAVAILABLE", 503, "Reply service is not configured.") };
  return { session, failure: null };
}

export async function createReply(request, env, postId) {
  const { session, failure: authFailure } = await requireSession(request, env);
  if (authFailure) return authFailure;
  if (!postId) return failure("VALIDATION_ERROR", 400, "A post id is required.");

  const parent = await env.DB.prepare("SELECT id, author_id, reply_policy, deleted_at FROM posts WHERE id = ?1 LIMIT 1").bind(postId).first();
  if (!parent || parent.deleted_at) return failure("POST_NOT_FOUND", 404, "Post was not found.");
  if (parent.reply_policy === "mentioned") return failure("REPLIES_RESTRICTED", 403, "Replies to this post are restricted to mentioned users.");
  if (parent.reply_policy === "following") {
    const follows = await env.DB.prepare("SELECT 1 FROM relationships WHERE source_user_id = ?1 AND target_user_id = ?2 AND relationship_type = 'follow' LIMIT 1").bind(session.user_id, parent.author_id).first();
    if (!follows && session.user_id !== parent.author_id) return failure("REPLIES_RESTRICTED", 403, "Only users who follow the author can reply to this post.");
  }
  if (parent.author_id !== session.user_id) {
    const blocked = await env.DB.prepare("SELECT 1 FROM relationships WHERE relationship_type = 'block' AND ((source_user_id = ?1 AND target_user_id = ?2) OR (source_user_id = ?2 AND target_user_id = ?1)) LIMIT 1").bind(session.user_id, parent.author_id).first();
    if (blocked) return failure("FORBIDDEN", 403, "This post is not available.");
  }

  let body;
  try { body = await request.json(); } catch { return failure("INVALID_JSON", 400, "Request body must be valid JSON."); }
  const text = String(body?.text || "").trim();
  if (!text || text.length > MAX_REPLY_TEXT) return failure("VALIDATION_ERROR", 400, "Reply text must contain 1-5000 characters.");

  const id = globalThis.crypto.randomUUID();
  await env.DB.prepare("INSERT INTO posts (id, author_id, body, visibility, reply_policy, reply_to_id) VALUES (?1, ?2, ?3, 'public', 'everyone', ?4)").bind(id, session.user_id, text, postId).run();
  await createNotification(env, { recipientId: parent.author_id, actorId: session.user_id, eventType: "reply", targetType: "post", targetId: postId, payload: { text: text.slice(0, 160) } });
  const row = await env.DB.prepare("SELECT p.id, p.reply_to_id, p.author_id, p.body, p.created_at, p.updated_at, u.username, u.display_name, (SELECT COUNT(*) FROM post_reactions r WHERE r.post_id = p.id AND r.reaction_type = 'like') AS like_count FROM posts p JOIN users u ON u.id = p.author_id WHERE p.id = ?1 AND p.deleted_at IS NULL LIMIT 1").bind(id).first();
  return { response: { reply: serializeReply(row), status: "created" }, error: null };
}

export async function listReplies(request, env, postId) {
  const { session, failure: authFailure } = await requireSession(request, env);
  if (authFailure) return authFailure;
  if (!postId) return failure("VALIDATION_ERROR", 400, "A post id is required.");
  const parent = await env.DB.prepare("SELECT id FROM posts WHERE id = ?1 AND deleted_at IS NULL LIMIT 1").bind(postId).first();
  if (!parent) return failure("POST_NOT_FOUND", 404, "Post was not found.");

  const url = new URL(request.url);
  const limit = limitValue(url.searchParams.get("limit"));
  const cursor = decodeCursor(url.searchParams.get("cursor"));
  if (url.searchParams.get("cursor") && !cursor?.createdAt) return failure("INVALID_CURSOR", 400, "Reply cursor is invalid.");

  const values = [postId, session.user_id];
  let where = "p.reply_to_id = ?1 AND p.deleted_at IS NULL AND u.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM relationships br WHERE br.relationship_type='block' AND ((br.source_user_id=?2 AND br.target_user_id=p.author_id) OR (br.source_user_id=p.author_id AND br.target_user_id=?2))) AND NOT EXISTS (SELECT 1 FROM relationships mr WHERE mr.relationship_type='mute' AND mr.source_user_id=?2 AND mr.target_user_id=p.author_id)";
  if (cursor?.createdAt && cursor?.id) {
    values.push(cursor.createdAt, cursor.id);
    where += " AND (p.created_at < ?2 OR (p.created_at = ?2 AND p.id < ?3))";
  }
  values.push(limit + 1);
  const rows = await env.DB.prepare(`SELECT p.id, p.reply_to_id, p.author_id, p.body, p.created_at, p.updated_at, u.username, u.display_name,
    (SELECT COUNT(*) FROM post_reactions r WHERE r.post_id = p.id AND r.reaction_type = 'like') AS like_count
    FROM posts p JOIN users u ON u.id = p.author_id WHERE ${where}
    ORDER BY p.created_at DESC, p.id DESC LIMIT ?${values.length}`).bind(...values).all();
  const items = rows.results.slice(0, limit).map(serializeReply).reverse();
  const oldest = items[0];
  return { response: { items, nextCursor: rows.results.length > limit && oldest ? encodeCursor(oldest.createdAt, oldest.id) : null }, error: null };
}
