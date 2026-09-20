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

let revokedTokenHash = null;
const mockDb = {
  prepare(query) {
    assert.match(query, /^UPDATE sessions SET revoked_at/);
    return {
      bind(value) {
        revokedTokenHash = value;
        return { run: async () => ({ success: true }) };
      },
    };
  },
};
const signOut = await worker.fetch(new Request("https://example.test/api/auth/sign-out", { method: "POST", headers: { Cookie: `s_session=${encodeURIComponent(token)}` } }), { DB: mockDb });
assert.equal(signOut.status, 200);
assert.deepEqual(await signOut.json(), { ok: true });
assert.equal(revokedTokenHash, await sha256Hex(token));
assert.equal(signOut.headers.get("set-cookie"), clearSessionCookie());

console.log("Worker health, auth-session, hashing, credentials, session, cookie, and sign-out primitives: PASS");
