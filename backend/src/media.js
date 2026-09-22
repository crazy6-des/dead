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
  await env.DB.prepare("INSERT INTO post_media (id, post_id, object_key, media_type, mime_type, byte_size, position, source, metadata_json) VALUES (?1, NULL, ?2, ?3, ?4, ?5, 0, 'upload', ?6)")
    .bind(mediaId, objectKey, isImage ? "image" : "audio", type, file.size, JSON.stringify({name:safeName(file.name)})).run();

  return { response: { media: { mediaId, url: "/api/media/" + mediaId, mediaType: isImage ? "image" : "audio", mimeType: type, size: file.size, name: safeName(file.name), source: "upload" }, status:"uploaded" }, error:null };
}

export async function getMedia(request, env, mediaId) {
  if (!env?.DB || !env?.MEDIA_BUCKET) return fail("SERVICE_UNAVAILABLE",503,"Media service is not configured.");
  const row = await env.DB.prepare("SELECT id, object_key, mime_type, byte_size FROM post_media WHERE id = ?1 LIMIT 1").bind(mediaId).first();
  if (!row) return fail("NOT_FOUND",404,"Media not found.");
  const object = await env.MEDIA_BUCKET.get(row.object_key);
  if (!object) return fail("NOT_FOUND",404,"Media not found.");
  const headers = new Headers();
  headers.set("content-type", row.mime_type);
  headers.set("content-length", String(row.byte_size));
  headers.set("cache-control","public, max-age=31536000, immutable");
  headers.set("etag", object.httpEtag);
  return { response:new Response(object.body,{status:200,headers}), error:null };
}
