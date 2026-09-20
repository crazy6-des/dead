/**
 * Backward-compatible social action facade.
 * Canonical interaction transitions live in features/social/socialState.js.
 */
export {
  toggleLike,
  toggleSaved as toggleSave,
  followPostAuthor as followAuthor,
} from "../features/social/socialState.js";

export function insertLocalPost(posts, value, author = { a: "David", h: "@david" }) {
  return [{
    id: Date.now(),
    ...author,
    t: "now",
    x: value.text,
    l: 0,
    r: 0,
    p: 0,
    b: 0,
    liked: false,
    saved: false,
    following: false,
    topic: "Your post",
    ...value,
  }, ...(Array.isArray(posts) ? posts : [])];
}
