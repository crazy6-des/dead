import assert from "node:assert/strict";
import { setFollowUser } from "../src/features/social/socialState.js";

const posts = [
  { id: 1, h: "@maya", following: false },
  { id: 2, h: "@daniel", following: true },
  { id: 3, h: "@maya", following: true },
];

assert.deepEqual(setFollowUser(posts, "maya", true).map(({ following }) => following), [true, true, true]);
assert.deepEqual(setFollowUser(posts, "@maya", false).map(({ following }) => following), [false, true, false]);
assert.deepEqual(setFollowUser(posts, "", true), posts);

console.log("Social state follow transitions: PASS");
