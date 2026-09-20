/**
 * Boundary between the create/post contract and the current feed shape.
 *
 * The legacy feed uses compact presentation keys (x, a, h, etc.). The create
 * feature uses backend-friendly names (text, media, audio, background).
 * Keeping this translation here prevents App.jsx from knowing both contracts.
 */

function sanitizeMediaAsset(asset) {
  if (!asset || typeof asset !== "object") return asset;

  const { file, ...safeAsset } = asset;
  return safeAsset;
}

function normalizeMedia(media) {
  if (!Array.isArray(media)) return [];
  return media.map(sanitizeMediaAsset);
}

export function toFeedPostFromCreatedPost(
  post = {},
  { authorName = "David", authorHandle = "@david" } = {},
) {
  const media = normalizeMedia(post.media);
  const audio = post.audio ? sanitizeMediaAsset(post.audio) : null;

  return {
    id: post.id ?? Date.now(),
    a: post.a ?? post.authorName ?? authorName,
    h: post.h ?? post.authorHandle ?? authorHandle,
    t: post.t ?? post.createdAt ?? "now",
    x: post.x ?? post.text ?? "",
    l: Number(post.l ?? post.likes ?? 0),
    r: Number(post.r ?? post.replies ?? 0),
    p: Number(post.p ?? post.reposts ?? 0),
    b: Number(post.b ?? post.bookmarks ?? 0),
    liked: Boolean(post.liked),
    saved: Boolean(post.saved),
    following: Boolean(post.following),
    topic: post.topic ?? "Your post",
    media,
    music: post.music ?? audio,
    bg: post.bg ?? post.background ?? null,
    poll: post.poll ?? null,
    kind: post.kind ?? "text",
  };
}
