/**
 * Pure social-state transitions.
 * UI and future API adapters can share these predictable operations.
 */

export function toggleLike(posts, id) {
  return (Array.isArray(posts) ? posts : []).map((post) =>
    post.id === id
      ? { ...post, liked: !post.liked, l: post.l + (post.liked ? -1 : 1) }
      : post,
  );
}

export function toggleSaved(posts, id) {
  return (Array.isArray(posts) ? posts : []).map((post) =>
    post.id === id
      ? { ...post, saved: !post.saved, b: post.b + (post.saved ? -1 : 1) }
      : post,
  );
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
