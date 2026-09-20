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

assert.equal(await sha256Hex("session-token-test"), "84fd062df4bff6a9dbc029aeadf02fef3cf19b112818a1dee8b782673bcb5484");

const credentials = validateCredentials({ username: "  David_01 ", email: " DAVID@example.com ", password: "correct horse battery staple" });
assert.equal(credentials.valid, true);
assert.equal(credentials.username, "david_01");
assert.equal(credentials.email, "david@example.com");
assert.equal(validateCredentials({ username: "x", email: "invalid", password: "short" }).valid, false);

const passwordHash = await hashPassword("correct horse battery staple");
assert.equal(passwordHash.startsWith("pbkdf2-sha256$120000$"), true);
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
assert.match(cookie, /SameSite=Lax/);
assert.match(cookie, /Path=\//);
assert.match(cookie, /Max-Age=2592000/);
assert.equal(clearSessionCookie(), "s_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax");

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

console.log("Worker health, auth-session, hashing, credentials, session, cookie, sign-up, sign-in, and sign-out contracts: PASS");
