import assert from "node:assert/strict";
import worker from "../src/index.js";
import { sha256Hex } from "../src/auth.js";

const response = await worker.fetch(new Request("https://example.test/api/health"));
assert.equal(response.status, 200);
assert.deepEqual(await response.json(), {
  ok: true,
  service: "sss-api",
  version: "0.1.0",
});

const missing = await worker.fetch(new Request("https://example.test/api/missing"));
assert.equal(missing.status, 404);
assert.equal((await missing.json()).error.code, "NOT_FOUND");

const session = await worker.fetch(new Request("https://example.test/api/auth/session"));
assert.equal(session.status, 200);
assert.deepEqual(await session.json(), { authenticated: false, user: null });

const invalidMethod = await worker.fetch(new Request("https://example.test/api/auth/session", { method: "POST" }));
assert.equal(invalidMethod.status, 405);
assert.equal((await invalidMethod.json()).error.code, "METHOD_NOT_ALLOWED");

assert.equal(
  await sha256Hex("session-token-test"),
  "c1a2c3d4e5f6",
);

console.log("Worker health, auth-session, and token-hashing contracts: PASS");
