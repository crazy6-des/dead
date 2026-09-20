/**
 * Feed presentation helpers shared by the current UI and future API adapters.
 * No React or network dependencies: safe to test and integrate incrementally.
 */

export const FEED_ACTIONS = Object.freeze([
  "reply",
  "repost",
  "like",
  "bookmark",
  "share",
]);

export function getPostAuthorLabel(post = {}) {
  return post.a || post.authorName || "S member";
}

export function getPostHandle(post = {}) {
  return post.h || post.authorHandle || "@member";
}

export function getPostText(post = {}) {
  return post.x || post.text || "";
}

export function getPostCounts(post = {}) {
  return {
    replies: Number(post.r ?? post.replies ?? 0),
    reposts: Number(post.p ?? post.reposts ?? 0),
    likes: Number(post.l ?? post.likes ?? 0),
    bookmarks: Number(post.b ?? post.bookmarks ?? 0),
  };
}

export function toFeedPostViewModel(post = {}) {
  return {
    id: post.id,
    author: {
      name: getPostAuthorLabel(post),
      handle: getPostHandle(post),
    },
    timestamp: post.t || post.createdAt || "",
    text: getPostText(post),
    topic: post.topic || "",
    media: post.media || null,
    music: post.music || null,
    background: post.bg || post.background || null,
    following: Boolean(post.following),
    liked: Boolean(post.liked),
    saved: Boolean(post.saved),
    counts: getPostCounts(post),
  };
}

export function toFeedPostViewModels(posts) {
  return (Array.isArray(posts) ? posts : []).map(toFeedPostViewModel);
}
