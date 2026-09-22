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


const variants = [
  { id: "text-only", kind: "text", text: "Text only" },
  { id: "image-only", kind: "image", media: [{ mediaType: "image", url: "/api/media/image-1", file: { local: true } }] },
  { id: "music-only", kind: "music", audio: { mediaType: "audio", url: "https://cdn.example.test/track.mp3", title: "Track", artist: "Artist", file: { local: true } } },
  { id: "background-only", kind: "background", background: { type: "gradient", value: "linear-gradient(135deg,#111,#333)" } },
  { id: "mixed", kind: "image", text: "Mixed", media: [{ mediaType: "image", url: "/api/media/image-2", file: { local: true } }], audio: { mediaType: "audio", url: "/api/media/audio-2", file: { local: true } }, background: { type: "color", value: "#111" } },
];

for (const variant of variants) {
  const mapped = toFeedPostFromCreatedPost(variant);
  assert.equal(mapped.id, variant.id);
  assert.equal(mapped.kind, variant.kind);
  assert.equal("file" in mapped, false);
  assert.equal(mapped.media.some((item) => "file" in item), false);
  if (variant.audio) assert.equal("file" in mapped.music, false);
  if (variant.background) assert.deepEqual(mapped.bg, variant.background);
}
console.log("PASS feed presentation variants");
