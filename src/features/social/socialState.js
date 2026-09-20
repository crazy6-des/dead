/**
 * Pure social-state transitions.
 * UI and future API adapters can share these predictable operations.
 */

function count(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toggleLike(posts, id) {
  return (Array.isArray(posts) ? posts : []).map((post) =>
    post.id === id
      ? { ...post, liked: !post.liked, l: Math.max(0, count(post.l) + (post.liked ? -1 : 1)) }
      : post,
  );
}

export function toggleSaved(posts, id) {
  return (Array.isArray(posts) ? posts : []).map((post) =>
    post.id === id
      ? { ...post, saved: !post.saved, b: Math.max(0, count(post.b) + (post.saved ? -1 : 1)) }
      : post,
  );
}

export function setFollowUser(posts, username, following) {
  const target = String(username || "").replace("@", "").toLowerCase();
  if (!target) return Array.isArray(posts) ? posts : [];
  return (Array.isArray(posts) ? posts : []).map((post) => {
    const author = String(post.username || post.h || "").replace("@", "").toLowerCase();
    return author === target ? { ...post, following: Boolean(following) } : post;
  });
}

export function toggleFollowUser(posts, username) {
  const target = String(username || "").replace("@", "").toLowerCase();
  if (!target) return Array.isArray(posts) ? posts : [];
  return (Array.isArray(posts) ? posts : []).map((post) => {
    const author = String(post.username || post.h || "").replace("@", "").toLowerCase();
    return author === target ? { ...post, following: !post.following } : post;
  });
}

export function followPostAuthor(posts, id) {
  return (Array.isArray(posts) ? posts : []).map((post) =>
    post.id === id ? { ...post, following: true } : post,
  );
}

export function toggleRepost(posts, id) {
  return (Array.isArray(posts) ? posts : []).map((post) =>
    post.id === id
      ? { ...post, reposted: !post.reposted, p: Math.max(0, count(post.p) + (post.reposted ? -1 : 1)) }
      : post,
  );
}
