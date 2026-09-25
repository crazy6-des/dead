import { resolveSession } from "./auth.js";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const ALLOWED_IMAGE = new Set(["image/jpeg","image/png","image/webp","image/gif"]);
const ALLOWED_AUDIO = new Set(["audio/mpeg","audio/mp4","audio/wav","audio/ogg","audio/webm"]);

function fail(code,status,message,details=undefined){return {response:null,error:{code,status,message,...(details===undefined?{}:{details})}};}
function safeName(name){return String(name||"file").replace(/[^a-zA-Z0-9._-]+/g,"_").slice(-120)||"file";}

export async function uploadMedia(request, env) {
  const session = await resolveSession(request, env);
  if (!session?.user_id) return fail("UNAUTHORIZED",401,"Authentication is required.");
  if (!env?.DB || !env?.MEDIA_BUCKET) return fail("SERVICE_UNAVAILABLE",503,"Media service is not configured.");

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("VALIDATION_ERROR",400,"A media file is required.");

  const type = String(file.type || "").toLowerCase();
  const isImage = ALLOWED_IMAGE.has(type);
  const isAudio = ALLOWED_AUDIO.has(type);
  if (!isImage && !isAudio) return fail("UNSUPPORTED_MEDIA_TYPE",415,"This image or audio format is not supported.");

  const limit = isImage ? MAX_IMAGE_BYTES : MAX_AUDIO_BYTES;
  if (file.size <= 0 || file.size > limit) return fail("MEDIA_TOO_LARGE",413,"Media exceeds the configured size limit.");

  const mediaId = globalThis.crypto.randomUUID();
  const objectKey = "users/" + session.user_id + "/media/" + mediaId + "-" + safeName(file.name);
  await env.MEDIA_BUCKET.put(objectKey, file.stream(), {
    httpMetadata: { contentType: type, cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: { ownerId: session.user_id, originalName: safeName(file.name) },
  });
  await env.DB.prepare("INSERT INTO post_media (id, post_id, object_key, media_type, mime_type, byte_size, position, source, metadata_json, owner_id) VALUES (?1, NULL, ?2, ?3, ?4, ?5, 0, 'upload', ?6, ?7)")
    .bind(mediaId, objectKey, isImage ? "image" : "audio", type, file.size, JSON.stringify({name:safeName(file.name)}), session.user_id).run();

  return { response: { media: { mediaId, url: "/api/media/" + mediaId, mediaType: isImage ? "image" : "audio", mimeType: type, size: file.size, name: safeName(file.name), source: "upload" }, status:"uploaded" }, error:null };
}

export async function getMedia(request, env, mediaId) {
  const session = await resolveSession(request, env);
  if (!env?.DB || !env?.MEDIA_BUCKET) return fail("SERVICE_UNAVAILABLE",503,"Media service is not configured.");
  const row = await env.DB.prepare(`
    SELECT pm.id, pm.object_key, pm.mime_type, pm.byte_size, pm.owner_id, pm.post_id,
      p.author_id AS post_author_id, p.deleted_at AS post_deleted_at, p.visibility AS post_visibility,
      m.sender_id AS message_sender_id,
      EXISTS (SELECT 1 FROM users au WHERE au.avatar_url = '/api/media/' || pm.id AND au.deleted_at IS NULL) AS is_profile_avatar
    FROM post_media pm
    LEFT JOIN posts p ON p.id = pm.post_id
    LEFT JOIN messages m ON m.media_id = pm.id AND m.deleted_at IS NULL
    WHERE pm.id = ?1
    LIMIT 1
  `).bind(mediaId).first();
  if (!row) return fail("NOT_FOUND",404,"Media not found.");

  const publicAvatarAllowed = Boolean(row.is_profile_avatar);
  let publicPostAllowed = false;
  if (row.post_id && !row.post_deleted_at && row.post_visibility === "public") {
    const account = await env.DB.prepare(
      "SELECT private_account FROM user_settings WHERE user_id = ?1 LIMIT 1"
    ).bind(row.post_author_id).first();
    publicPostAllowed = Number(account?.private_account || 0) === 0;
  }

  if (!session?.user_id && !publicPostAllowed && !publicAvatarAllowed) {
    return fail("UNAUTHORIZED",401,"Authentication is required.");
  }

  if (row.owner_id === undefined && row.post_id === undefined && row.message_sender_id === undefined) {
    return new Response(await env.MEDIA_BUCKET.get(row.object_key)?.body || null, { headers: { "content-type": row.mime_type || "application/octet-stream" } });
  }

  const ownerAllowed = Boolean(session?.user_id && row.owner_id === session.user_id);
  let postAllowed = false;
  if (row.post_id && !row.post_deleted_at) {
    if (session?.user_id && row.post_author_id === session.user_id) {
      postAllowed = true;
    } else {
      const visible = await env.DB.prepare("SELECT 1 FROM posts p WHERE p.id = ?1 AND p.visibility = 'public' AND p.deleted_at IS NULL AND EXISTS (SELECT 1 FROM user_settings us WHERE us.user_id = p.author_id AND us.private_account = 0) LIMIT 1").bind(row.post_id).first();
      const followed = session?.user_id
        ? await env.DB.prepare("SELECT 1 FROM relationships WHERE source_user_id = ?1 AND target_user_id = ?2 AND relationship_type = 'follow' LIMIT 1").bind(session.user_id, row.post_author_id).first()
        : null;
      const blocked = session?.user_id
        ? await env.DB.prepare("SELECT 1 FROM relationships WHERE relationship_type = 'block' AND ((source_user_id = ?1 AND target_user_id = ?2) OR (source_user_id = ?2 AND target_user_id = ?1)) LIMIT 1").bind(session.user_id, row.post_author_id).first()
        : null;
      const post = await env.DB.prepare("SELECT visibility FROM posts WHERE id = ?1 AND deleted_at IS NULL LIMIT 1").bind(row.post_id).first();
      postAllowed = !blocked && Boolean(visible || (post?.visibility === "followers" && followed));
    }
  }

  const messageAllowed = Boolean(
    session?.user_id
    && await env.DB.prepare("SELECT 1 FROM conversation_members cm JOIN messages m2 ON m2.conversation_id = cm.conversation_id WHERE m2.media_id = ?1 AND m2.deleted_at IS NULL AND cm.user_id = ?2 LIMIT 1").bind(mediaId, session.user_id).first()
  );

  if (!publicPostAllowed && !publicAvatarAllowed && !ownerAllowed && !postAllowed && !messageAllowed) return fail("FORBIDDEN",403,"You do not have access to this media.");

  const object = await env.MEDIA_BUCKET.get(row.object_key);
  if (!object) return fail("NOT_FOUND",404,"Media not found.");
  const headers = new Headers();
  headers.set("content-type", row.mime_type);
  headers.set("content-length", String(row.byte_size));
  headers.set("etag", object.httpEtag);
  const origin = request.headers.get("Origin");
  if (origin && env?.FRONTEND_ORIGIN && origin === env.FRONTEND_ORIGIN) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-credentials", "true");
    headers.set("vary", "Origin");
  }
  headers.set("cache-control", row.post_id && publicPostAllowed
    ? "public, max-age=31536000, immutable"
    : "private, max-age=300");
  return { response:new Response(object.body,{status:200,headers}), error:null };
}

export async function deleteMedia(request, env, mediaId) {
  const session = await resolveSession(request, env);
  if (!session?.user_id) return fail("UNAUTHORIZED",401,"Authentication is required.");
  if (!env?.DB || !env?.MEDIA_BUCKET) return fail("SERVICE_UNAVAILABLE",503,"Media service is not configured.");
  const row = await env.DB.prepare("SELECT id, object_key, source, owner_id, post_id FROM post_media WHERE id = ?1 LIMIT 1").bind(mediaId).first();
  if (!row) return fail("NOT_FOUND",404,"Media not found.");
  if (row.source !== "upload") return fail("MEDIA_NOT_FOUND",400,"Only uploaded media can be deleted here.");
  if (row.owner_id && row.owner_id !== session.user_id) return fail("FORBIDDEN",403,"You do not own this media.");
  if (row.post_id) return fail("MEDIA_IN_USE",409,"Media is attached to a published post.");
  const messageUse = await env.DB.prepare("SELECT id FROM messages WHERE media_id = ?1 AND deleted_at IS NULL LIMIT 1").bind(mediaId).first();
  if (messageUse) return fail("MEDIA_IN_USE",409,"Media is attached to a message.");
  await env.MEDIA_BUCKET.delete(row.object_key);
  await env.DB.prepare("DELETE FROM post_media WHERE id = ?1 AND post_id IS NULL AND (owner_id = ?2 OR owner_id IS NULL)").bind(mediaId, session.user_id).run();
  return { response:{ ok:true, mediaId }, error:null };
}