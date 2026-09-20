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

export function followPostAuthor(posts, id) {
  return (Array.isArray(posts) ? posts : []).map((post) =>
    post.id === id ? { ...post, following: true } : post,
  );
}
