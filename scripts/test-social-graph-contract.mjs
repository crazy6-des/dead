import assert from "node:assert/strict";
import { createDevSocialGraphAdapter } from "../src/services/socialGraphService.js";

const adapter = createDevSocialGraphAdapter({
  "@David": ["@Maya", " nia "],
  invalid: null,
});

const following = await adapter.listFollowing("@david");
assert.deepEqual(following.items, [
  { username: "maya" },
  { username: "nia" },
]);
assert.equal(following.hasMore, false);

const emptySeed = await adapter.listFollowing("invalid");
assert.deepEqual(emptySeed.items, []);
assert.equal(emptySeed.hasMore, false);

const followers = await adapter.listFollowers("david");
assert.deepEqual(followers.items, []);
assert.equal(followers.hasMore, false);

console.log("Social graph contract: PASS");
