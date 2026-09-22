import assert from "node:assert/strict";
import worker from "../src/index.js";

let settings = {
  private_account: 0,
  show_follower_count: 1,
  allow_messages: 1,
  theme: "dark",
  reduce_motion: 0,
};

const mockDb = {
  prepare(query) {
    return {
      bind(...values) {
        return {
          async first() {
            if (query.includes("SELECT s.id")) {
              return { id: "session-1", user_id: "user-1", username: "david", display_name: "David" };
            }
            if (query.includes("SELECT private_account")) return { ...settings };
            return null;
          },
          async run() {
            return { success: true };
          },
          async all() {
            return { results: [] };
          },
        };
      },
    };
  },
};

const env = { DB: mockDb };
const auth = { Cookie: "s_session=session-hash" };

let response = await worker.fetch(new Request("https://example.test/api/settings/me", { headers: auth }), env);
assert.equal(response.status, 200);
assert.deepEqual(await response.json(), {
  settings: { privateAccount: false, showFollowerCount: true, allowMessages: true, theme: "dark", reduceMotion: false },
});

settings = { ...settings, private_account: 1, allow_messages: 0, theme: "light", reduce_motion: 1 };
response = await worker.fetch(new Request("https://example.test/api/settings/me", {
  method: "PATCH",
  headers: { ...auth, "Content-Type": "application/json", Origin: "https://example.test" },
  body: JSON.stringify({ privateAccount: true, allowMessages: false, theme: "light", reduceMotion: true }),
}), env);
assert.equal(response.status, 200);
const updated = await response.json();
assert.equal(updated.settings.privateAccount, true);
assert.equal(updated.settings.allowMessages, false);
assert.equal(updated.settings.theme, "light");
assert.equal(updated.settings.reduceMotion, true);

response = await worker.fetch(new Request("https://example.test/api/settings/me", {
  method: "PATCH",
  headers: { ...auth, "Content-Type": "application/json", Origin: "https://example.test" },
  body: JSON.stringify({ theme: "blue" }),
}), env);
assert.equal(response.status, 400);
assert.equal((await response.json()).error.code, "VALIDATION_ERROR");

response = await worker.fetch(new Request("https://example.test/api/settings/me", { headers: {} }), env);
assert.equal(response.status, 401);

console.log("Persisted user settings API and validation contracts: PASS");
