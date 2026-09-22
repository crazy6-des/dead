import assert from "node:assert/strict";
import { toFeedPostFromCreatedPost } from "../src/features/feed/feedPostAdapter.js";

const created = toFeedPostFromCreatedPost({
  id: "server-1",
  author: { username: "serveruser", displayName: "Server User" },
  text: "Hello S",
  stats: { likes: 4, replies: 2, reposts: 3, bookmarks: 5 },
  media: [{
    name: "photo.webp",
    type: "image/webp",
    size: 1024,
    url: "/api/media/media-image-1",
    file: { shouldNotLeak: true },
  }],
  audio: {
    name: "track.mp3",
    type: "audio/mpeg",
    size: 2048,
    url: "/api/media/media-audio-1",
    file: { shouldNotLeak: true },
  },
  background: { type: "color", value: "#151922" },
});

assert.equal(created.id, "server-1");
assert.equal(created.a, "Server User");
assert.equal(created.h, "@serveruser");
assert.equal(created.x, "Hello S");
assert.equal(created.l, 4);
assert.equal(created.r, 2);
assert.equal(created.p, 3);
assert.equal(created.b, 5);
assert.equal(created.media.length, 1);
assert.equal(created.media[0].url, "/api/media/media-image-1");
assert.equal("file" in created.media[0], false);
assert.equal(created.music.url, "/api/media/media-audio-1");
assert.equal("file" in created.music, false);
assert.deepEqual(created.bg, { type: "color", value: "#151922" });

console.log("PASS create-to-feed post mapping");
