import assert from "node:assert/strict";
import worker from "../src/index.js";
import {
  clearSessionCookie,
  createSessionCookie,
  createSessionToken,
  hashPassword,
  sessionExpiry,
  sha256Hex,
  validateCredentials,
  verifyPassword,
} from "../src/auth.js";

const response = await worker.fetch(new Request("https://example.test/api/health"));
assert.equal(response.status, 200);
assert.deepEqual(await response.json(), { ok: true, service: "sss-api", version: "0.1.0" });

const missing = await worker.fetch(new Request("https://example.test/api/missing"));
assert.equal(missing.status, 404);
assert.equal((await missing.json()).error.code, "NOT_FOUND");

const session = await worker.fetch(new Request("https://example.test/api/auth/session"));
assert.equal(session.status, 200);
assert.deepEqual(await session.json(), { authenticated: false, user: null });

const invalidMethod = await worker.fetch(new Request("https://example.test/api/auth/session", { method: "POST" }));
assert.equal(invalidMethod.status, 405);
assert.equal((await invalidMethod.json()).error.code, "METHOD_NOT_ALLOWED");

const mediaUploadRoute = await worker.fetch(new Request("https://example.test/api/media/upload", { method: "POST" }), {});
assert.equal(mediaUploadRoute.status, 401);
assert.equal((await mediaUploadRoute.json()).error.code, "UNAUTHORIZED");

assert.equal(await sha256Hex("session-token-test"), "84fd062df4bff6a9dbc029aeadf02fef3cf19b112818a1dee8b782673bcb5484");

const credentials = validateCredentials({ username: "  David_01 ", email: " DAVID@example.com ", password: "correct horse battery staple" });
assert.equal(credentials.valid, true);
assert.equal(credentials.username, "david_01");
assert.equal(credentials.email, "david@example.com");
assert.equal(validateCredentials({ username: "x", email: "invalid", password: "short" }).valid, false);

const passwordHash = await hashPassword("correct horse battery staple");
assert.equal(passwordHash.startsWith("pbkdf2-sha256$100000$"), true);
assert.equal(await verifyPassword("correct horse battery staple", passwordHash), true);
assert.equal(await verifyPassword("wrong password", passwordHash), false);
assert.notEqual(await hashPassword("correct horse battery staple"), passwordHash);

const token = createSessionToken();
assert.equal(typeof token, "string");
assert.equal(token.length, 72);
const expiry = Date.parse(sessionExpiry());
assert.equal(Number.isFinite(expiry), true);
assert.equal(expiry > Date.now(), true);

const cookie = createSessionCookie(token);
assert.match(cookie, /^s_session=/);
assert.match(cookie, /HttpOnly/);
assert.match(cookie, /Secure/);
assert.match(cookie, /SameSite=None/);
assert.match(cookie, /Path=\//);
assert.match(cookie, /Max-Age=2592000/);
assert.equal(clearSessionCookie(), "s_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=None");

const users = [];
const sessions = [];
const mockDb = {
  prepare(query) {
    return {
      bind(...values) {
        return {
          async first() {
            if (query.startsWith("SELECT id FROM users")) return users.find((user) => user.username === values[0] || user.email === values[1]) || null;
            if (query.startsWith("SELECT id, username, display_name, password_hash FROM users")) return users.find((user) => (user.username === values[0] || user.email === values[0]) && !user.deleted_at) || null;
            if (query.startsWith("SELECT s.id")) {
              const found = sessions.find((entry) => entry.token_hash === values[0] && !entry.revoked_at && entry.user_id);
              const user = users.find((entry) => entry.id === found?.user_id && !entry.deleted_at);
              return found && user ? { ...found, username: user.username, display_name: user.display_name } : null;
            }
            return null;
          },
          async run() {
            if (query.startsWith("INSERT INTO users")) {
              users.push({ id: values[0], username: values[1], display_name: values[2], email: values[3], password_hash: values[4] });
            } else if (query.startsWith("INSERT INTO sessions")) {
              sessions.push({ id: values[0], user_id: values[1], token_hash: values[2], expires_at: values[3], revoked_at: null });
            } else if (query.startsWith("UPDATE sessions SET revoked_at")) {
              const found = sessions.find((entry) => entry.token_hash === values[0] && !entry.revoked_at);
              if (found) found.revoked_at = new Date().toISOString();
            }
            return { success: true };
          },
        };
      },
    };
  },
};

const signUp = await worker.fetch(new Request("https://example.test/api/auth/sign-up", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: "New_User", email: "new@example.com", password: "correct horse battery staple", displayName: "New User" }),
}), { DB: mockDb });
assert.equal(signUp.status, 201);
assert.deepEqual(await signUp.json(), { authenticated: true, user: { id: users[0].id, username: "new_user", displayName: "New User" } });
assert.match(signUp.headers.get("set-cookie"), /^s_session=.+HttpOnly/);
assert.equal(users.length, 1);
assert.equal(sessions.length, 1);

const rejectedOrigin = await worker.fetch(new Request("https://example.test/api/auth/sign-up", {
  method: "POST",
  headers: { "content-type": "application/json", Origin: "https://evil.example" },
  body: JSON.stringify({ username: "blocked_user", email: "blocked@example.com", password: "correct horse battery staple" }),
}), { DB: mockDb, FRONTEND_ORIGIN: "https://sphere.example" });
assert.equal(rejectedOrigin.status, 403);
assert.equal((await rejectedOrigin.json()).error.code, "FORBIDDEN_ORIGIN");

const duplicate = await worker.fetch(new Request("https://example.test/api/auth/sign-up", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: "new_user", email: "new@example.com", password: "correct horse battery staple" }),
}), { DB: mockDb });
assert.equal(duplicate.status, 409);
assert.equal((await duplicate.json()).error.code, "ACCOUNT_EXISTS");

const signIn = await worker.fetch(new Request("https://example.test/api/auth/sign-in", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ identifier: "NEW@EXAMPLE.COM", password: "correct horse battery staple" }),
}), { DB: mockDb });
assert.equal(signIn.status, 200);
assert.deepEqual(await signIn.json(), { authenticated: true, user: { id: users[0].id, username: "new_user", displayName: "New User" } });
assert.match(signIn.headers.get("set-cookie"), /^s_session=.+HttpOnly/);
assert.equal(sessions.length, 2);

const badSignIn = await worker.fetch(new Request("https://example.test/api/auth/sign-in", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ identifier: "new_user", password: "wrong password" }),
}), { DB: mockDb });
assert.equal(badSignIn.status, 401);
assert.equal((await badSignIn.json()).error.code, "INVALID_CREDENTIALS");

const invalidJson = await worker.fetch(new Request("https://example.test/api/auth/sign-in", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{bad",
}), { DB: mockDb });
assert.equal(invalidJson.status, 400);
assert.equal((await invalidJson.json()).error.code, "INVALID_JSON");

const signOut = await worker.fetch(new Request("https://example.test/api/auth/sign-out", { method: "POST", headers: { Cookie: `s_session=${encodeURIComponent(token)}` } }), { DB: {
  prepare(query) {
    assert.match(query, /^UPDATE sessions SET revoked_at/);
    return { bind(value) { return { run: async () => { assert.equal(value, await sha256Hex(token)); return { success: true }; } }; } };
  },
} });
assert.equal(signOut.status, 200);
assert.deepEqual(await signOut.json(), { ok: true });
assert.equal(signOut.headers.get("set-cookie"), clearSessionCookie());


let pollVoteCount = 0;
let pollVotedIndex = null;
const postDb = {
  prepare(query) {
    return {
      bind(...values) {
        return {
          async first() {
            if (query.startsWith("SELECT s.id")) {
              if (values[0] === await sha256Hex("post-session")) return { id: "session-1", user_id: "user-1", username: "new_user", display_name: "New User" };
            }
            if (query.includes("SELECT option_index FROM poll_votes")) {
              return pollVoteCount ? { option_index: pollVotedIndex } : null;
            }
            if (query.includes("SELECT p.id, p.author_id, p.body")) {
              return { id: "post-2", author_id: "user-1", body: "Hello backend", visibility: "public", reply_policy: "everyone", created_at: "2026-09-20T20:00:00.000Z", updated_at: "2026-09-20T20:00:00.000Z", username: "new_user", display_name: "New User", like_count: 2, repost_count: 1, reply_count: 0, bookmark_count: 1, poll_json: query.includes("poll_json") ? JSON.stringify({ question: "Pick one", options: ["A", "B"], multipleChoice: false, totalVotes: pollVoteCount, votedOptionIndex: pollVotedIndex }) : null };
            }
            return null;
          },
          async all() {
            return {
              results: [
                { id: "post-2", author_id: "user-1", body: "Second post", visibility: "public", reply_policy: "everyone", created_at: "2026-09-20T20:00:00.000Z", updated_at: "2026-09-20T20:00:00.000Z", username: "new_user", display_name: "New User", like_count: 2, repost_count: 1, reply_count: 0, bookmark_count: 1 },
                { id: "post-1", author_id: "user-1", body: "First post", visibility: "public", reply_policy: "everyone", created_at: "2026-09-20T19:00:00.000Z", updated_at: "2026-09-20T19:00:00.000Z", username: "new_user", display_name: "New User", like_count: 0, repost_count: 0, reply_count: 0, bookmark_count: 0 },
              ],
            };
          },
          async run() { if (query.includes("INSERT OR IGNORE INTO poll_votes")) { pollVoteCount += 1; pollVotedIndex = Number(values[2]); return { success: true, meta: { changes: 1 } }; } return { success: true, meta: { changes: 1 } }; },
        };
      },
    };
  },
};

const postResponse = await worker.fetch(new Request("https://example.test/api/posts", {
  method: "POST",
  headers: { "content-type": "application/json", Cookie: "s_session=post-session" },
  body: JSON.stringify({ text: "Hello backend", kind: "text", media: [], audio: null, background: null, poll: null, audience: "public", replyPolicy: "everyone" }),
}), { DB: postDb });
assert.equal(postResponse.status, 201);
assert.equal((await postResponse.json()).status, "created");

const pollPost = await worker.fetch(new Request("https://example.test/api/posts", {
  method: "POST",
  headers: { "content-type": "application/json", Cookie: "s_session=post-session" },
  body: JSON.stringify({ text: "Poll attempt", kind: "text", media: [], audio: null, background: null, poll: { question: "Pick one", options: ["A", "B"] }, audience: "public", replyPolicy: "everyone" }),
}), { DB: postDb });
assert.equal(pollPost.status, 201);
const pollPayload = await pollPost.json();
assert.equal(pollPayload.status, "created");
assert.equal(pollPayload.post.poll.question, "Pick one");
assert.equal(pollPayload.post.poll.options.length, 2);

const voteResponse = await worker.fetch(new Request("https://example.test/api/polls/" + encodeURIComponent(pollPayload.post.id) + "/votes", {
  method: "POST",
  headers: { "content-type": "application/json", Cookie: "s_session=post-session" },
  body: JSON.stringify({ optionIndex: 1 }),
}), { DB: postDb });
assert.equal(voteResponse.status, 200);
const votePayload = await voteResponse.json();
assert.equal(votePayload.poll.totalVotes, 1);
assert.equal(votePayload.poll.votedOptionIndex, 1);

const duplicateVote = await worker.fetch(new Request("https://example.test/api/polls/" + encodeURIComponent(pollPayload.post.id) + "/votes", {
  method: "POST",
  headers: { "content-type": "application/json", Cookie: "s_session=post-session" },
  body: JSON.stringify({ optionIndex: 0 }),
}), { DB: postDb });
assert.equal(duplicateVote.status, 200);
assert.equal((await duplicateVote.json()).alreadyVoted, true);

const feedResponse = await worker.fetch(new Request("https://example.test/api/feed?mode=Latest&limit=1", {
  headers: { Cookie: "s_session=post-session" },
}), { DB: postDb });
assert.equal(feedResponse.status, 200);
const feed = await feedResponse.json();
assert.equal(feed.items.length, 1);
assert.equal(feed.items[0].id, "post-2");
assert.equal(feed.items[0].stats.likes, 2);
assert.equal("nextCursor" in feed, true);

const unauthenticatedFeed = await worker.fetch(new Request("https://example.test/api/feed?mode=Latest"), { DB: postDb });
assert.equal(unauthenticatedFeed.status, 401);
assert.equal((await unauthenticatedFeed.json()).error.code, "UNAUTHORIZED");

console.log("Worker health, auth-session, hashing, credentials, session, cookie, sign-up, sign-in, and sign-out contracts: PASS");
