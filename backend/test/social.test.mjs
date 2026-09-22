import assert from "node:assert/strict";
import worker from "../src/index.js";
import { sha256Hex } from "../src/auth.js";

const state = {
  posts: [{ id: "post-1", author_id: "user-2", deleted_at: null }],
  reactions: new Set(),
  bookmarks: new Set(),
  followers: ["user-3", "user-4"],
  notifications: [],
};

const db = {
  prepare(query) {
    return {
      bind(...values) {
        return {
          async first() {
            if (query.startsWith("SELECT s.id")) {
              return values[0] === await sha256Hex("session-1")
                ? { id: "session-1", user_id: "user-1", username: "user1", display_name: "User 1" }
                : null;
            }
            if (query.startsWith("SELECT id, author_id, deleted_at")) return state.posts.find((post) => post.id === values[0]) || null;
            if (query.startsWith("SELECT id, author_id, deleted_at, visibility")) return state.posts.find((post) => post.id === values[0]) || null;
            if (query.includes("relationship_type = 'block'")) return null;
            if (query.startsWith("SELECT COUNT(*)")) {
              const count = query.includes("FROM bookmarks")
                ? [...state.bookmarks].filter((key) => key.endsWith(`:${values[0]}`)).length
                : [...state.reactions].filter((key) => key.endsWith(`:${values[0]}:${values[1]}`)).length;
              return { count };
            }
            return null;
          },
          async all() { if (query.includes("source_user_id AS recipient_id")) return { results: state.followers.map((recipient_id) => ({ recipient_id })) }; return { results: [] }; },
          async run() {
            if (query.startsWith("INSERT OR IGNORE INTO bookmarks")) state.bookmarks.add(`${values[0]}:${values[1]}`);
            if (query.startsWith("DELETE FROM bookmarks")) state.bookmarks.delete(`${values[0]}:${values[1]}`);
            if (query.startsWith("INSERT OR IGNORE INTO post_reactions")) state.reactions.add(`${values[0]}:${values[1]}:${values[2]}`);
            if (query.startsWith("DELETE FROM post_reactions")) state.reactions.delete(`${values[0]}:${values[1]}:${values[2]}`);
            if (query.startsWith("INSERT OR IGNORE INTO notifications")) state.notifications.push(values);
            return { success: true };
          },
        };
      },
    };
  },
};

const request = (path, method = "POST", body = {}) => new Request(`https://example.test${path}`, {
  method,
  headers: { Cookie: "s_session=session-1", "content-type": "application/json" },
  body: JSON.stringify(body),
});

const unauthenticated = await worker.fetch(new Request("https://example.test/api/social/posts/post-1/like", { method: "POST" }), { DB: db });
assert.equal(unauthenticated.status, 401);

const liked = await worker.fetch(request("/api/social/posts/post-1/like"), { DB: db });
assert.equal(liked.status, 200);
assert.deepEqual(await liked.json(), { ok: true, postId: "post-1", action: "like", enabled: true, count: 1, likes: 1 });

const duplicateLike = await worker.fetch(request("/api/social/posts/post-1/like"), { DB: db });
assert.equal((await duplicateLike.json()).count, 1);

const unliked = await worker.fetch(request("/api/social/posts/post-1/like", "DELETE"), { DB: db });
const unlikeBody = await unliked.json();
assert.equal(unlikeBody.enabled, false);
assert.equal(unlikeBody.count, 0);

const reposted = await worker.fetch(request("/api/social/posts/post-1/repost"), { DB: db });
assert.equal((await reposted.json()).reposts, 1);

const unreposted = await worker.fetch(request("/api/social/posts/post-1/repost", "DELETE"), { DB: db });
assert.equal((await unreposted.json()).reposts, 0);

const bookmarked = await worker.fetch(request("/api/social/posts/post-1/bookmark"), { DB: db });
assert.equal((await bookmarked.json()).bookmarks, 1);

const unbookmarked = await worker.fetch(request("/api/social/posts/post-1/bookmark", "DELETE"), { DB: db });
assert.equal((await unbookmarked.json()).bookmarks, 0);

console.log("Social post action contracts: PASS");


const shared = await worker.fetch(request("/api/social/posts/post-1/share"), { DB: db });
assert.equal(shared.status, 200);
const sharedBody = await shared.json();
assert.deepEqual(sharedBody, { ok: true, postId: "post-1", recipientCount: 2 });
assert.equal(state.notifications.length, 2);
assert.equal(state.notifications.every((values) => values[3] === "share"), true);

console.log("Follower share contract: PASS");
