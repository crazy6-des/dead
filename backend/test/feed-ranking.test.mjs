import assert from "node:assert/strict";
import { rankForYouPosts } from "../src/feedRanking.js";

const now = Date.parse("2026-10-10T12:00:00.000Z");
const post = (id, author_id, body, extra = {}) => ({
  id, author_id, body, created_at: "2026-10-10T10:00:00.000Z",
  like_count: 0, repost_count: 0, reply_count: 0, bookmark_count: 0,
  following: 0, liked: 0, ...extra,
});

const candidates = [
  post("f1", "creator-a", "Finance markets and investing tips", { like_count: 8 }),
  post("f2", "creator-a", "More finance and wealth news", { like_count: 8 }),
  post("t1", "creator-b", "New technology and software tools"),
  post("c1", "creator-c", "A funny comedy skit"),
  post("m1", "creator-d", "New music and Afrobeats release"),
];
const options = {
  userId: "reader-1",
  now,
  interestSignals: [{ body: "I like finance, stocks, investing and wealth", weight: 4 }],
};
const ranked = rankForYouPosts(candidates, options);
assert.equal(ranked.length, candidates.length, "ranking must preserve all candidates");
assert.deepEqual(
  rankForYouPosts(candidates, options).map((item) => item.id),
  ranked.map((item) => item.id),
  "ranking must remain stable across pagination requests",
);
assert.equal(new Set(ranked.map((item) => item.id)).size, candidates.length, "ranking must not duplicate posts");
assert.match(ranked[0].body, /finance|wealth|investing/i, "strong topic relevance and engagement should influence ranking");
assert.notEqual(ranked[1].author_id, ranked[0].author_id, "diversity reranking should separate repeated authors when alternatives exist");

const noSignals = rankForYouPosts(candidates, { userId: "reader-2", now });
assert.notDeepEqual(
  ranked.map((item) => item.id),
  noSignals.map((item) => item.id),
  "different interest profiles should be able to produce different rankings",
);
console.log("feed ranking tests passed");
