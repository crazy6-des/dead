import assert from "node:assert/strict";
import worker from "../src/index.js";

const queries = [];
const rows = [
  {
    id: "post-1",
    author_id: "user-1",
    body: "A public post",
    visibility: "public",
    reply_policy: "everyone",
    post_kind: "text",
    background_json: null,
    quoted_post_id: null,
    reply_to_id: null,
    created_at: "2026-09-22T00:00:00.000Z",
    updated_at: "2026-09-22T00:00:00.000Z",
    username: "david",
    display_name: "David",
    media: "[]",
    like_count: 2,
    repost_count: 1,
    reply_count: 1,
    bookmark_count: 0,
    quoted_post: null,
  },
];

const mockDb = {
  prepare(query) {
    queries.push(query);
    return {
      bind(...values) {
        return {
          async first() {
            if (query.includes("SELECT s.id")) {
              if (values[0] === "session-hash") return { id: "session-1", user_id: "user-1", username: "david", display_name: "David" };
              if (values[0] === "other-session-hash") return { id: "session-2", user_id: "user-2", username: "maya", display_name: "Maya" };
            }
            if (query.includes("SELECT id, username FROM users")) return { id: "user-1", username: "david" };
            return null;
          },
          async all() {
            return { results: rows };
          },
        };
      },
    };
  },
};

const requestFor = (tab, cookie = "s_session=session-hash") => new Request(
  `https://example.test/api/profile/david/posts?tab=${tab}`,
  { headers: { Cookie: cookie } },
);

for (const tab of ["posts", "replies", "media", "likes"]) {
  queries.length = 0;
  const response = await worker.fetch(requestFor(tab), { DB: mockDb });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.tab, tab);
  assert.equal(Array.isArray(body.items), true);
  assert.equal(body.items[0].id, "post-1");
}

queries.length = 0;
const invalid = await worker.fetch(requestFor("unknown"), { DB: mockDb });
assert.equal(invalid.status, 400);
assert.equal((await invalid.json()).error.code, "VALIDATION_ERROR");

queries.length = 0;
const publicProfile = await worker.fetch(requestFor("posts", "s_session=other-session-hash"), { DB: mockDb });
assert.equal(publicProfile.status, 200);
assert.match(queries.at(-1), /p\.visibility = 'public'/);

queries.length = 0;
await worker.fetch(requestFor("replies"), { DB: mockDb });
assert.match(queries.at(-1), /p\.reply_to_id IS NOT NULL/);

queries.length = 0;
await worker.fetch(requestFor("media"), { DB: mockDb });
assert.match(queries.at(-1), /EXISTS \(SELECT 1 FROM post_media/);

queries.length = 0;
await worker.fetch(requestFor("likes"), { DB: mockDb });
assert.match(queries.at(-1), /EXISTS \(SELECT 1 FROM post_reactions/);
assert.match(queries.at(-1), /reaction_type = 'like'/);

const missingProfile = await worker.fetch(new Request("https://example.test/api/profile/missing/posts?tab=posts", {
  headers: { Cookie: "s_session=session-hash" },
}), { DB: { prepare() { return { bind() { return { first: async () => null }; } }; } } });
assert.equal(missingProfile.status, 404);

console.log("Profile activity route, tab validation, visibility, replies, media, and likes contracts: PASS");
