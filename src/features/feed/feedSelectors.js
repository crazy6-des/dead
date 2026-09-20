/**
 * Pure feed selectors. Keep feed ordering/filtering independent from UI components.
 * This module is intentionally framework-free so it can later be backed by the API.
 */

export const FEED_TABS = Object.freeze(["For You", "Following", "Latest"]);

export function selectFeed(posts, tab = "For You") {
  const source = Array.isArray(posts) ? posts : [];

  if (tab === "Following") return source.filter((post) => post.following);
  if (tab === "Latest") return [...source].reverse();

  return source;
}

export function searchPosts(posts, query = "") {
  const normalized = String(query).trim().toLowerCase();
  if (!normalized) return Array.isArray(posts) ? posts : [];

  return (Array.isArray(posts) ? posts : []).filter((post) =>
    [post.a, post.h, post.x, post.topic]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
}
