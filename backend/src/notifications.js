import { resolveSession } from "./auth.js";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 30;
const EVENT_TYPES = new Set(["follow", "like", "repost", "reply", "message", "share"]);

function failure(code, status, message) { return { response: null, error: { code, status, message } }; }
function encodeCursor(createdAt, id) { return globalThis.btoa(JSON.stringify({ createdAt, id })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_"); }
function decodeCursor(value) { if (!value) return null; try { const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(globalThis.atob(normalized + "=".repeat((4 - normalized.length % 4) % 4))); } catch { return null; } }
function limitValue(value) { const n = Number(value); return Number.isInteger(n) ? Math.min(Math.max(n, 1), MAX_LIMIT) : DEFAULT_LIMIT; }
async function requireSession(request, env) { const session = await resolveSession(request, env); if (!session?.user_id) return { session: null, failure: failure("UNAUTHORIZED", 401, "Authentication is required.") }; if (!env?.DB) return { session: null, failure: failure("SERVICE_UNAVAILABLE", 503, "Notification service is not configured.") }; return { session, failure: null }; }

function notificationPayload(row) {
  let payload = {};
  try { payload = JSON.parse(row.payload || "{}"); } catch { payload = {}; }
  const text = payload.text ? String(payload.text) : row.event_type === "follow" ? "followed you" : row.event_type === "like" ? "liked your post" : row.event_type === "repost" ? "reposted your post" : row.event_type === "reply" ? "replied to your post" : row.event_type === "share" ? "shared a post with their followers" : "sent you a message";
  let target = null;
  if (row.event_type === "follow") target = row.actor_username ? "/user/" + encodeURIComponent(row.actor_username) : null;
  else if (row.event_type === "message") target = row.conversation_id ? "/messages?conversation=" + encodeURIComponent(row.conversation_id) : null;
  else if (row.target_id) target = "/post/" + encodeURIComponent(row.target_id) + (row.event_type === "reply" ? "/replies" : "");
  return {
    id: row.id,
    type: row.event_type === "message" ? "system" : row.event_type,
    actor: row.actor_display_name || row.actor_username || "S",
    username: row.actor_username || null,
    text,
    time: row.created_at,
    verified: Boolean(row.actor_verified),
    read: Boolean(row.read_at),
    target,
    targetType: row.target_type || null,
    targetId: row.target_id || null,
    conversationId: row.conversation_id || null,
  };
}

export async function createNotification(env, { recipientId, actorId = null, eventType, targetType = null, targetId = null, conversationId = null, payload = {} }) {
  if (!env?.DB || !recipientId || !EVENT_TYPES.has(eventType) || recipientId === actorId) return false;
  await env.DB.prepare("INSERT OR IGNORE INTO notifications (id, recipient_id, actor_id, event_type, target_type, target_id, payload, conversation_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)").bind(crypto.randomUUID(), recipientId, actorId, eventType, targetType, targetId, JSON.stringify(payload), conversationId).run();
  return true;
}

export async function listNotifications(request, env) {
  const { session, failure: authFailure } = await requireSession(request, env); if (authFailure) return authFailure;
  const url = new URL(request.url); const limit = limitValue(url.searchParams.get("limit")); const filter = String(url.searchParams.get("filter") || "All"); const cursor = decodeCursor(url.searchParams.get("cursor"));
  if (url.searchParams.get("cursor") && !cursor?.createdAt) return failure("INVALID_CURSOR", 400, "Notification cursor is invalid.");
  const values = [session.user_id]; let where = "n.recipient_id = ?1";
  if (filter === "Mentions") where += " AND n.event_type = 'reply'";
  else if (filter !== "All" && filter !== "Verified") return failure("VALIDATION_ERROR", 400, "Unsupported notification filter.");
  if (cursor?.createdAt && cursor?.id) { values.push(cursor.createdAt, cursor.id); where += ` AND (n.created_at < ?${values.length - 1} OR (n.created_at = ?${values.length - 1} AND n.id < ?${values.length}))`; }
  values.push(limit + 1);
  const rows = await env.DB.prepare(`SELECT n.id, n.event_type, n.payload, n.target_type, n.target_id, n.conversation_id, n.read_at, n.created_at, u.username AS actor_username, u.display_name AS actor_display_name, 0 AS actor_verified FROM notifications n LEFT JOIN users u ON u.id = n.actor_id WHERE ${where} ORDER BY n.created_at DESC, n.id DESC LIMIT ?${values.length}`).bind(...values).all();
  const items = rows.results.slice(0, limit).map(notificationPayload); const last = items.at(-1);
  return { response: { items, nextCursor: rows.results.length > limit && last ? encodeCursor(last.time, last.id) : null, hasMore: rows.results.length > limit }, error: null };
}

export async function markNotificationRead(request, env) {
  const { session, failure: authFailure } = await requireSession(request, env); if (authFailure) return authFailure;
  let body; try { body = await request.json(); } catch { return failure("INVALID_JSON", 400, "Request body must be valid JSON."); }
  const id = String(body?.id || ""); if (!id) return failure("VALIDATION_ERROR", 400, "A notification id is required.");
  const result = await env.DB.prepare("UPDATE notifications SET read_at = COALESCE(read_at, strftime('%Y-%m-%dT%H:%M:%fZ','now')) WHERE id = ?1 AND recipient_id = ?2").bind(id, session.user_id).run();
  if (!result?.meta?.changes && !result?.changes) return failure("NOT_FOUND", 404, "Notification not found.");
  return { response: { ok: true, id }, error: null };
}

export async function markAllNotificationsRead(request, env) {
  const { session, failure: authFailure } = await requireSession(request, env); if (authFailure) return authFailure;
  await env.DB.prepare("UPDATE notifications SET read_at = COALESCE(read_at, strftime('%Y-%m-%dT%H:%M:%fZ','now')) WHERE recipient_id = ?1 AND read_at IS NULL").bind(session.user_id).run();
  return { response: { ok: true }, error: null };
}
