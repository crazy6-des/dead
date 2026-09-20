/**
 * Pure local interaction reducers. These preserve current UI behavior and
 * provide a seam for authenticated API mutations later.
 */
export function toggleLike(posts, id) {
  return posts.map((post) => post.id === id
    ? { ...post, liked: !post.liked, l: post.l + (post.liked ? -1 : 1) }
    : post);
}

export function toggleSave(posts, id) {
  return posts.map((post) => post.id === id
    ? { ...post, saved: !post.saved, b: post.b + (post.saved ? -1 : 1) }
    : post);
}

export function followAuthor(posts, id) {
  return posts.map((post) => post.id === id ? { ...post, following: true } : post);
}

export function insertLocalPost(posts, value, author = { a: 'David', h: '@david' }) {
  return [{
    id: Date.now(),
    ...author,
    t: 'now',
    x: value.text,
    l: 0,
    r: 0,
    p: 0,
    b: 0,
    liked: false,
    saved: false,
    following: false,
    topic: 'Your post',
    ...value,
  }, ...posts];
}
