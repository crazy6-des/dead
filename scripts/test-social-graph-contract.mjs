import assert from "node:assert/strict";
import { createDevSocialGraphAdapter } from "../src/services/socialGraphService.js";

const adapter = createDevSocialGraphAdapter({
  david: ["maya", "nia"],
});

const following = await adapter.listFollowing("david");
assert.deepEqual(following.items, [
  { username: "maya" },
  { username: "nia" },
]);
assert.equal(following.hasMore, false);

const followers = await adapter.listFollowers("david");
assert.deepEqual(followers.items, []);
assert.equal(followers.hasMore, false);

console.log("Social graph contract: PASS");
