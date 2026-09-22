import { resolveSession } from "./auth.js";
import { createNotification } from "./notifications.js";
import { serializePost } from "./posts.js";

const RELATIONSHIPS = new Set(["follow", "block", "mute"]);
const POST_ACTIONS = new Set(["like", "repost", "bookmark"]);

function failure(code, status, message) {
  return { response: null, error: { code, status, message } };
}

async function sessionOrFailure(request, env) {
  const session = await resolveSession(request, env);
  if (!session?.user_id) return { session: null, failure: failure("UNAUTHORIZED", 401, "Authentication is required.") };
  if (!env?.DB) return { session: null, failure: failure("SERVICE_UNAVAILABLE", 503, "Social service is not configured.") };
  return { session, failure: null };
}

export async function setRelationship(request, env) {
  const { session, failure: authFailure } = await sessionOrFailure(request, env);
  if (authFailure) return authFailure;

  let body;
  try { body = await request.json(); } catch { return failure("INVALID_JSON", 400, "Request body must be valid JSON."); }

  const username = String(body?.username || "").replace(/^@/, "").trim().toLowerCase();
  const relationship = String(body?.relationship || "");
  const enabled = body?.enabled === true;
  if (!username || !RELATIONSHIPS.has(relationship)) return failure("VALIDATION_ERROR", 400, "A valid username and relationship are required.");

  const target = await env.DB.prepare("SELECT id, username, display_name FROM users WHERE username = ?1 AND deleted_at IS NULL LIMIT 1").bind(username).first();
  if (!target) return failure("USER_NOT_FOUND", 404, "User was not found.");
  if (target.id === session.user_id) return failure("INVALID_RELATIONSHIP", 400, "You cannot create a relationship with yourself.");

  if (enabled) {
    if (relationship === "block") {
      await env.DB.batch([
        env.DB.prepare("DELETE FROM relationships WHERE source_user_id = ?1 AND target_user_id = ?2 AND relationship_type = 'follow'").bind(session.user_id, target.id),
        env.DB.prepare("DELETE FROM relationships WHERE source_user_id = ?1 AND target_user_id = ?2 AND relationship_type = 'follow'").bind(target.id, session.user_id),
      ]);
    }
    await env.DB.prepare("INSERT OR IGNORE INTO relationships (source_user_id, target_user_id, relationship_type) VALUES (?1, ?2, ?3)").bind(session.user_id, target.id, relationship).run();
    if (relationship === "follow") await createNotification(env, { recipientId: target.id, actorId: session.user_id, eventType: "follow", targetType: "profile", targetId: target.id });
  } else {
    await env.DB.prepare("DELETE FROM relationships WHERE source_user_id = ?1 AND target_user_id = ?2 AND relationship_type = ?3").bind(session.user_id, target.id, relationship).run();
  }

  return { response: { ok: true, username: target.username, relationship, enabled }, error: null };
}

export async function setPostAction(request, env, postId, action) {
  const { session, failure: authFailure } = await sessionOrFailure(request, env);
  if (authFailure) return authFailure;
  if (!postId || !POST_ACTIONS.has(action)) return failure("VALIDATION_ERROR", 400, "A valid post and action are required.");

  const post = await env.DB.prepare("SELECT id, author_id, deleted_at FROM posts WHERE id = ?1 LIMIT 1").bind(postId).first();
  if (!post || post.deleted_at) return failure("POST_NOT_FOUND", 404, "Post was not found.");
  if (post.author_id !== session.user_id) {
    const blocked = await env.DB.prepare("SELECT 1 FROM relationships WHERE relationship_type = 'block' AND ((source_user_id = ?1 AND target_user_id = ?2) OR (source_user_id = ?2 AND target_user_id = ?1)) LIMIT 1").bind(session.user_id, post.author_id).first();
    if (blocked) return failure("FORBIDDEN", 403, "This post is not available.");
  }

  let body = {};
  try { if (request.method !== "DELETE") body = await request.json(); } catch { return failure("INVALID_JSON", 400, "Request body must be valid JSON."); }
  const enabled = request.method === "DELETE" ? false : body?.enabled !== false;

  if (action === "bookmark") {
    if (enabled) await env.DB.prepare("INSERT OR IGNORE INTO bookmarks (user_id, post_id) VALUES (?1, ?2)").bind(session.user_id, postId).run();
    else await env.DB.prepare("DELETE FROM bookmarks WHERE user_id = ?1 AND post_id = ?2").bind(session.user_id, postId).run();
  } else {
    if (enabled) { await env.DB.prepare("INSERT OR IGNORE INTO post_reactions (user_id, post_id, reaction_type) VALUES (?1, ?2, ?3)").bind(session.user_id, postId, action).run(); if (action === "like" || action === "repost") await createNotification(env, { recipientId: post.author_id, actorId: session.user_id, eventType: action, targetType: "post", targetId: postId }); }
    else await env.DB.prepare("DELETE FROM post_reactions WHERE user_id = ?1 AND post_id = ?2 AND reaction_type = ?3").bind(session.user_id, postId, action).run();
  }

  const countColumn = action === "bookmark" ? "bookmarks" : `${action}s`;
  const count = action === "bookmark"
    ? await env.DB.prepare("SELECT COUNT(*) AS count FROM bookmarks WHERE post_id = ?1").bind(postId).first()
    : await env.DB.prepare("SELECT COUNT(*) AS count FROM post_reactions WHERE post_id = ?1 AND reaction_type = ?2").bind(postId, action).first();
  return { response: { ok: true, postId, action, enabled, count: Number(count?.count || 0), [countColumn]: Number(count?.count || 0) }, error: null };
}


export async function listSavedPosts(request, env) {
  const { session, failure: authFailure } = await sessionOrFailure(request, env);
  if (authFailure) return authFailure;
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 50);
  const rows = await env.DB.prepare(
    `SELECT p.id,p.author_id,p.body,p.visibility,p.reply_policy,p.post_kind,p.background_json,p.quoted_post_id,p.created_at,p.updated_at,
      u.username,u.display_name,
      (SELECT json_group_array(json_object('id',m.id,'mediaType',m.media_type,'mimeType',m.mime_type,'url',COALESCE(m.external_url,'/api/media/' || m.id),'source',m.source,'metadata',m.metadata_json,'durationMs',m.duration_ms)) FROM post_media m WHERE m.post_id=p.id ORDER BY m.position) AS media,
      (SELECT COUNT(*) FROM post_reactions r WHERE r.post_id=p.id AND r.reaction_type='like') AS like_count,
      (SELECT COUNT(*) FROM post_reactions r WHERE r.post_id=p.id AND r.reaction_type='repost') AS repost_count,
      (SELECT COUNT(*) FROM posts rp WHERE rp.reply_to_id=p.id AND rp.deleted_at IS NULL) AS reply_count,
      (SELECT COUNT(*) FROM bookmarks b2 WHERE b2.post_id=p.id) AS bookmark_count
     FROM bookmarks b JOIN posts p ON p.id=b.post_id JOIN users u ON u.id=p.author_id
     WHERE b.user_id=?1 AND p.deleted_at IS NULL
       AND (p.author_id=?1 OR p.visibility='public' OR (p.visibility='followers' AND EXISTS (SELECT 1 FROM relationships f WHERE f.source_user_id=?1 AND f.target_user_id=p.author_id AND f.relationship_type='follow')))
     ORDER BY b.created_at DESC LIMIT ?2`
  ).bind(session.user_id, limit).all();
  return { response: { items: (rows.results || []).map(serializePost), nextCursor: null }, error: null };
}

export async function sharePostWithFollowers(request, env, postId) {
  const { session, failure: authFailure } = await sessionOrFailure(request, env);
  if (authFailure) return authFailure;
  const normalizedPostId = String(postId || "").trim();
  if (!normalizedPostId) return failure("VALIDATION_ERROR", 400, "A post id is required.");
  const post = await env.DB.prepare("SELECT id, author_id, deleted_at, visibility FROM posts WHERE id = ?1 LIMIT 1").bind(normalizedPostId).first();
  if (!post || post.deleted_at) return failure("POST_NOT_FOUND", 404, "Post was not found.");
  if (post.author_id !== session.user_id) {
    const blocked = await env.DB.prepare("SELECT 1 FROM relationships WHERE relationship_type = 'block' AND ((source_user_id = ?1 AND target_user_id = ?2) OR (source_user_id = ?2 AND target_user_id = ?1)) LIMIT 1").bind(session.user_id, post.author_id).first();
    if (blocked) return failure("FORBIDDEN", 403, "This post is not available.");
  }
  const followers = await env.DB.prepare("SELECT source_user_id AS recipient_id FROM relationships WHERE target_user_id = ?1 AND relationship_type = 'follow'").bind(session.user_id).all();
  let notified = 0;
  for (const follower of followers.results || []) {
    if (follower.recipient_id === session.user_id) continue;
    const created = await createNotification(env, {
      recipientId: follower.recipient_id,
      actorId: session.user_id,
      eventType: "share",
      targetType: "post",
      targetId: normalizedPostId,
      payload: { text: "shared a post with their followers" },
    });
    if (created) notified += 1;
  }
  return { response: { ok: true, postId: normalizedPostId, recipientCount: notified }, error: null };
}
