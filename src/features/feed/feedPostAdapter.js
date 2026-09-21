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
  const author = post.author && typeof post.author === "object" ? post.author : {};
  const resolvedAuthorName = post.a ?? post.authorName ?? author.displayName ?? authorName;
  const resolvedAuthorHandle = post.h ?? post.authorHandle ?? (author.username ? `@${author.username}` : authorHandle);

  return {
    id: post.id,
    a: resolvedAuthorName,
    h: resolvedAuthorHandle,
    t: post.t ?? post.createdAt ?? "now",
    x: post.x ?? post.text ?? post.body ?? "",
    l: Number(post.l ?? post.likes ?? post.stats?.likes ?? 0),
    r: Number(post.r ?? post.replies ?? post.stats?.replies ?? 0),
    p: Number(post.p ?? post.reposts ?? post.stats?.reposts ?? 0),
    b: Number(post.b ?? post.bookmarks ?? post.stats?.bookmarks ?? 0),
    liked: Boolean(post.liked),
    saved: Boolean(post.saved),
    following: Boolean(post.following),
    reposted: Boolean(post.reposted),
    topic: post.topic ?? "Your post",
    media,
    music: post.music ?? audio,
    bg: post.bg ?? post.background ?? null,
    poll: post.poll ?? null,
    kind: post.kind ?? "text",
  };
}
