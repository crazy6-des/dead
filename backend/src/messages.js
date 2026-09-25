import { resolveSession } from "./auth.js";
import { createNotification } from "./notifications.js";
import { getUserSettings } from "./settings.js";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 30;
const MAX_TEXT = 5000;
const MESSAGE_TYPES = new Set(["text", "image", "audio", "file"]);
const IMAGE_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function failure(code, status, message) { return { response: null, error: { code, status, message } }; }
function encodeCursor(createdAt, id) { return globalThis.btoa(JSON.stringify({ createdAt, id })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_"); }
function decodeCursor(value) { if (!value) return null; try { const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(globalThis.atob(normalized + "=".repeat((4 - normalized.length % 4) % 4))); } catch { return null; } }
function limitValue(value) { if (value === null || value === undefined || String(value).trim() === "") return DEFAULT_LIMIT; const n = Number(value); return Number.isInteger(n) ? Math.min(Math.max(n, 1), MAX_LIMIT) : DEFAULT_LIMIT; }
async function requireSession(request, env) { const session = await resolveSession(request, env); if (!session?.user_id) return { session: null, failure: failure("UNAUTHORIZED", 401, "Authentication is required.") }; if (!env?.DB) return { session: null, failure: failure("SERVICE_UNAVAILABLE", 503, "Messaging service is not configured.") }; return { session, failure: null }; }
function messagePayload(row, currentUserId = null) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    direction: currentUserId && row.sender_id === currentUserId ? "out" : "in",
    type: row.message_type,
    text: row.body || "",
    media: row.media_id ? { mediaId: row.media_id, url: "/api/media/" + row.media_id, mediaType: row.media_type || "image", mimeType: row.mime_type || null, size: Number(row.media_size || 0), name: row.media_name || null } : null,
    createdAt: row.created_at,
    status: row.deleted_at ? "deleted" : "sent",
  };
}

export async function listConversations(request, env) {
  const { session, failure: authFailure } = await requireSession(request, env); if (authFailure) return authFailure;
  const url = new URL(request.url); const limit = limitValue(url.searchParams.get("limit")); const cursor = decodeCursor(url.searchParams.get("cursor"));
  if (url.searchParams.get("cursor") && !cursor?.updatedAt) return failure("INVALID_CURSOR", 400, "Conversation cursor is invalid.");
  const values = [session.user_id]; let where = "c.deleted_at IS NULL AND cm.user_id = ?1";
  if (cursor?.updatedAt && cursor?.id) { values.push(cursor.updatedAt, cursor.id); where += ` AND (c.updated_at < ?${values.length - 1} OR (c.updated_at = ?${values.length - 1} AND c.id < ?${values.length}))`; }
  values.push(limit + 1);
  const rows = await env.DB.prepare(`SELECT c.id, c.updated_at, other.id AS other_id, other.username AS other_username, other.display_name AS other_display_name, other.avatar_url AS other_avatar_url,
    (SELECT m.body FROM messages m WHERE m.conversation_id = c.id AND m.deleted_at IS NULL ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS last_body,
    (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id AND m.deleted_at IS NULL ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS last_message_at,
    (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.created_at > COALESCE(cm.last_read_at, '1970-01-01T00:00:00.000Z') AND m.sender_id <> ?1 AND m.deleted_at IS NULL) AS unread_count
    FROM conversations c JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = ?1
    JOIN conversation_members other_member ON other_member.conversation_id = c.id AND other_member.user_id <> ?1
    JOIN users other ON other.id = other_member.user_id AND other.deleted_at IS NULL
    WHERE ${where} AND NOT EXISTS (SELECT 1 FROM relationships br WHERE br.relationship_type='block' AND ((br.source_user_id=?1 AND br.target_user_id=other.id) OR (br.source_user_id=other.id AND br.target_user_id=?1))) ORDER BY c.updated_at DESC, c.id DESC LIMIT ?${values.length}`).bind(...values).all();
  const items = rows.results.slice(0, limit).map(row => ({ id: row.id, name: row.other_display_name || row.other_username, username: row.other_username, avatarUrl: row.other_avatar_url || null, lastMessage: row.last_body || "", updatedAt: row.last_message_at || row.updated_at, unreadCount: Number(row.unread_count || 0) }));
  const last = items.at(-1);
  return { response: { items, nextCursor: rows.results.length > limit && last ? encodeCursor(last.updatedAt, last.id) : null }, error: null };
}

export async function createConversation(request, env) {
  const { session, failure: authFailure } = await requireSession(request, env); if (authFailure) return authFailure;
  let body; try { body = await request.json(); } catch { return failure("INVALID_JSON", 400, "Request body must be valid JSON."); }
  const username = String(body?.username || "").replace(/^@/, "").trim().toLowerCase();
  if (!username) return failure("VALIDATION_ERROR", 400, "A username is required.");
  const target = await env.DB.prepare("SELECT id, username, display_name, avatar_url FROM users WHERE username = ?1 AND deleted_at IS NULL LIMIT 1").bind(username).first();
  if (!target) return failure("USER_NOT_FOUND", 404, "User was not found.");
  if (target.id === session.user_id) return failure("INVALID_CONVERSATION", 400, "You cannot message yourself.");
  const targetSettings = await getUserSettings(env, target.id);
  if (targetSettings && !Boolean(targetSettings.allow_messages)) return failure("MESSAGES_DISABLED", 403, "This user is not accepting messages.");
  const blocked = await env.DB.prepare("SELECT 1 FROM relationships WHERE relationship_type='block' AND ((source_user_id=?1 AND target_user_id=?2) OR (source_user_id=?2 AND target_user_id=?1)) LIMIT 1").bind(session.user_id, target.id).first();
  if (blocked) return failure("FORBIDDEN", 403, "Messaging is unavailable between these users.");
  const existing = await env.DB.prepare("SELECT c.id FROM conversations c JOIN conversation_members a ON a.conversation_id = c.id AND a.user_id = ?1 JOIN conversation_members b ON b.conversation_id = c.id AND b.user_id = ?2 WHERE c.deleted_at IS NULL LIMIT 1").bind(session.user_id, target.id).first();
  if (existing) return { response: { conversation: { id: existing.id, username: target.username, name: target.display_name, avatarUrl: target.avatar_url || null } }, error: null };
  const conversationId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO conversations (id, created_by) VALUES (?1, ?2)").bind(conversationId, session.user_id),
    env.DB.prepare("INSERT INTO conversation_members (conversation_id, user_id) VALUES (?1, ?2)").bind(conversationId, session.user_id),
    env.DB.prepare("INSERT INTO conversation_members (conversation_id, user_id) VALUES (?1, ?2)").bind(conversationId, target.id)
  ]);
  return { response: { conversation: { id: conversationId, username: target.username, name: target.display_name, avatarUrl: target.avatar_url || null } }, error: null };
}

export async function listMessages(request, env, conversationId) {
  const { session, failure: authFailure } = await requireSession(request, env); if (authFailure) return authFailure;
  if (!conversationId) return failure("VALIDATION_ERROR", 400, "A conversation id is required.");
  const member = await env.DB.prepare("SELECT 1 FROM conversation_members WHERE conversation_id = ?1 AND user_id = ?2 LIMIT 1").bind(conversationId, session.user_id).first();
  if (!member) return failure("NOT_FOUND", 404, "Conversation not found.");
  const url = new URL(request.url); const limit = limitValue(url.searchParams.get("limit")); const cursor = decodeCursor(url.searchParams.get("cursor"));
  if (url.searchParams.get("cursor") && !cursor?.createdAt) return failure("INVALID_CURSOR", 400, "Message cursor is invalid.");
  const values = [conversationId]; let where = "m.conversation_id = ?1 AND m.deleted_at IS NULL";
  if (cursor?.createdAt && cursor?.id) { values.push(cursor.createdAt, cursor.id); where += ` AND (m.created_at < ?${values.length - 1} OR (m.created_at = ?${values.length - 1} AND m.id < ?${values.length}))`; }
  values.push(limit + 1);
  const rows = await env.DB.prepare(`SELECT m.id, m.conversation_id, m.sender_id, m.message_type, m.body, m.created_at, m.deleted_at,
    m.media_id, pm.media_type, pm.mime_type, pm.byte_size AS media_size,
    json_extract(pm.metadata_json, '$.name') AS media_name
    FROM messages m
    LEFT JOIN post_media pm ON pm.id = m.media_id
    WHERE ${where} ORDER BY m.created_at DESC, m.id DESC LIMIT ?${values.length}`).bind(...values).all();
  const items = rows.results.slice(0, limit).map((row) => messagePayload(row, session.user_id)).reverse(); const oldest = items[0];
  return { response: { items, nextCursor: rows.results.length > limit && oldest ? encodeCursor(oldest.createdAt, oldest.id) : null }, error: null };
}

export async function sendMessage(request, env) {
  const { session, failure: authFailure } = await requireSession(request, env); if (authFailure) return authFailure;
  let body; try { body = await request.json(); } catch { return failure("INVALID_JSON", 400, "Request body must be valid JSON."); }
  const conversationId = String(body?.conversationId || ""); const type = String(body?.type || "text"); const text = String(body?.text || "").trim(); const mediaId = String(body?.mediaId || "").trim();
  if (!conversationId || !MESSAGE_TYPES.has(type)) return failure("VALIDATION_ERROR", 400, "A valid conversation and message type are required.");
  if (type === "text" && (!text || text.length > MAX_TEXT)) return failure("VALIDATION_ERROR", 400, "Text messages must contain 1-5000 characters.");
  if (type !== "text" && text.length > MAX_TEXT) return failure("VALIDATION_ERROR", 400, "Message text is too long.");
  if (type === "image" && !mediaId) return failure("VALIDATION_ERROR", 400, "An image message requires an uploaded image.");
  if (type !== "image" && mediaId) return failure("VALIDATION_ERROR", 400, "Media attachments are currently supported for image messages only.");
  const member = await env.DB.prepare("SELECT 1 FROM conversation_members WHERE conversation_id = ?1 AND user_id = ?2 LIMIT 1").bind(conversationId, session.user_id).first();
  if (!member) return failure("NOT_FOUND", 404, "Conversation not found.");
  const recipient = await env.DB.prepare("SELECT user_id FROM conversation_members WHERE conversation_id = ?1 AND user_id <> ?2 LIMIT 1").bind(conversationId, session.user_id).first();
  if (!recipient) return failure("INVALID_CONVERSATION", 400, "Conversation must have another member.");
  const recipientSettings = await getUserSettings(env, recipient.user_id);
  if (recipientSettings && !Boolean(recipientSettings.allow_messages)) return failure("MESSAGES_DISABLED", 403, "This user is not accepting messages.");
  const blocked = await env.DB.prepare("SELECT 1 FROM relationships WHERE relationship_type='block' AND ((source_user_id=?1 AND target_user_id=?2) OR (source_user_id=?2 AND target_user_id=?1)) LIMIT 1").bind(session.user_id, recipient.user_id).first();
  if (blocked) return failure("FORBIDDEN", 403, "Messaging is unavailable between these users.");
  let media = null;
  if (type === "image") {
    media = await env.DB.prepare("SELECT id, media_type, mime_type, byte_size, metadata_json FROM post_media WHERE id = ?1 AND post_id IS NULL AND owner_id = ?2 LIMIT 1").bind(mediaId, session.user_id).first();
    if (!media) return failure("MEDIA_NOT_FOUND", 404, "The selected image is unavailable.");
    if (media.media_type !== "image" || !IMAGE_MEDIA_TYPES.has(media.mime_type)) return failure("UNSUPPORTED_MEDIA_TYPE", 415, "The selected media is not a supported image.");
  }
  const id = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO messages (id, conversation_id, sender_id, message_type, body, media_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6)").bind(id, conversationId, session.user_id, type, text, mediaId || null),
    env.DB.prepare("UPDATE conversations SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?1").bind(conversationId),
    env.DB.prepare("UPDATE post_media SET metadata_json = json_set(COALESCE(metadata_json, '{}'), '$.messageId', ?1) WHERE id = ?1 AND post_id IS NULL AND owner_id = ?2").bind(mediaId || null, session.user_id)
  ]);
  await createNotification(env, { recipientId: recipient.user_id, actorId: session.user_id, eventType: "message", targetType: "message", targetId: id, conversationId, payload: { text: text.slice(0, 120), hasImage: Boolean(mediaId) } });
  const row = await env.DB.prepare("SELECT m.id, m.conversation_id, m.sender_id, m.message_type, m.body, m.created_at, m.deleted_at, m.media_id, pm.media_type, pm.mime_type, pm.byte_size AS media_size, json_extract(pm.metadata_json, '$.name') AS media_name FROM messages m LEFT JOIN post_media pm ON pm.id = m.media_id WHERE m.id = ?1 LIMIT 1").bind(id).first();
  return { response: messagePayload(row, session.user_id), error: null };
}

export async function updateMessage(request, env, messageId) {
  const session = await resolveSession(request, env);
  if (!session?.user_id) return { response: null, error: { code: "UNAUTHORIZED", status: 401, message: "Authentication is required." } };
  if (!env?.DB) return { response: null, error: { code: "SERVICE_UNAVAILABLE", status: 503, message: "Message service is not configured." } };
  const id = String(messageId || "").trim();
  let body;
  try { body = await request.json(); } catch { return { response: null, error: { code: "INVALID_JSON", status: 400, message: "Request body must be valid JSON." } }; }
  const text = String(body?.text || "").trim();
  if (!id || !text || text.length > 5000) return { response: null, error: { code: "VALIDATION_ERROR", status: 400, message: "Message text must contain 1-5000 characters." } };
  const result = await env.DB.prepare("UPDATE messages SET body=?1, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'), edited_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?2 AND sender_id=?3 AND deleted_at IS NULL").bind(text,id,session.user_id).run();
  if (!result?.meta?.changes) return { response: null, error: { code: "MESSAGE_NOT_FOUND", status: 404, message: "Message was not found or you are not its sender." } };
  const row = await env.DB.prepare("SELECT m.id,m.conversation_id,m.sender_id,m.message_type,m.body,m.created_at,m.updated_at,m.deleted_at,m.media_id,m.edited_at,pm.media_type,pm.mime_type,pm.byte_size AS media_size,json_extract(pm.metadata_json,'$.name') AS media_name FROM messages m LEFT JOIN post_media pm ON pm.id=m.media_id WHERE m.id=?1 LIMIT 1").bind(id).first();
  return { response: normalizeMessageRow(row), error: null };
}

export async function deleteMessage(request, env, messageId) {
  const session = await resolveSession(request, env);
  if (!session?.user_id) return { response: null, error: { code: "UNAUTHORIZED", status: 401, message: "Authentication is required." } };
  if (!env?.DB) return { response: null, error: { code: "SERVICE_UNAVAILABLE", status: 503, message: "Message service is not configured." } };
  const id = String(messageId || "").trim();
  const result = await env.DB.prepare("UPDATE messages SET deleted_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?1 AND sender_id=?2 AND deleted_at IS NULL").bind(id,session.user_id).run();
  if (!result?.meta?.changes) return { response: null, error: { code: "MESSAGE_NOT_FOUND", status: 404, message: "Message was not found or you are not its sender." } };
  return { response: { ok: true, id, status: "deleted" }, error: null };
}

export async function markConversationRead(request, env, conversationId) {
  const { session, failure: authFailure } = await requireSession(request, env); if (authFailure) return authFailure;
  const result = await env.DB.prepare("UPDATE conversation_members SET last_read_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE conversation_id = ?1 AND user_id = ?2").bind(conversationId, session.user_id).run();
  if (!result?.meta?.changes && !result?.changes) return failure("NOT_FOUND", 404, "Conversation not found.");
  return { response: { ok: true, conversationId }, error: null };
}
