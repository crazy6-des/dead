import assert from "node:assert/strict";
import { createCreatePublishHandler } from "../src/features/create/createIntegration.js";
import { validatePostDraft } from "../src/features/create/postValidation.js";
import { normalizeCreatedPostResponse } from "../src/features/create/postContract.js";
import { createApiPostAdapter, createPostRequest } from "../src/services/postService.js";

const draft = {
  text: "Integration test post",
  kind: "text",
  media: [],
  audio: null,
  background: null,
  poll: null,
  audience: "public",
  replyPolicy: "everyone",
};

let received = null;

const publish = createCreatePublishHandler({
  onLocalPublish: async (post) => {
    received = post;
  },
});

await assert.rejects(
  () => publish(draft),
  (error) => error?.code === "BACKEND_NOT_CONNECTED",
);
assert.equal(received, null);

const validRichDraft = {
  ...draft,
  kind: "image",
  media: [{ name: "photo.webp", type: "image/webp", size: 1024, url: "blob:test" }],
  audio: { name: "track.mp3", type: "audio/mpeg", size: 2048, url: "blob:test-audio" },
  background: { type: "color", value: "#151922" },
};

assert.equal(validatePostDraft(validRichDraft).valid, true);
assert.equal(validatePostDraft({ ...draft, text: "", kind: "text", media: [{ name: "photo.jpg", type: "image/jpeg", size: 1024, url: "blob:image" }] }).valid, true);
assert.equal(validatePostDraft({ ...draft, text: "", audio: { name: "track.mp3", type: "audio/mpeg", size: 2048, url: "blob:audio" } }).valid, true);
assert.equal(validatePostDraft({ ...draft, text: "", background: { type: "color", value: "#123456" } }).valid, true);
assert.equal(validatePostDraft({ ...draft, text: "Hello", media: [{ name: "photo.jpg", type: "image/jpeg", size: 1024, url: "blob:image" }], audio: { name: "track.mp3", type: "audio/mpeg", size: 2048, url: "blob:audio" }, background: { type: "color", value: "#123456" } }).valid, true);

assert.equal(validatePostDraft({
  ...draft,
  media: [{ name: "photo.exe", type: "application/octet-stream", size: 1024, url: "blob:test" }],
}).valid, false);

assert.equal(validatePostDraft({
  ...draft,
  audio: { name: "track.mp3", type: "audio/mpeg", size: 26 * 1024 * 1024, url: "blob:test-audio" },
}).valid, false);

assert.equal(validatePostDraft({
  ...draft,
  background: { type: "color", value: "not-a-color" },
}).valid, false);

assert.equal(validatePostDraft({
  ...draft,
  media: Array.from({ length: 5 }, (_, index) => ({
    name: `photo-${index}.jpg`,
    type: "image/jpeg",
    size: 1024,
    url: `blob:${index}`,
  })),
}).valid, false);

console.log("PASS Create publish backend guard");
const normalizedPost = normalizeCreatedPostResponse({ data: { post: { id: "server-1", text: "Created" } } });
assert.deepEqual(normalizedPost, { id: "server-1", text: "Created", kind: "text" });
assert.throws(() => normalizeCreatedPostResponse(null), /invalid post response/i);

const originalFetch = globalThis.fetch;
try {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (String(url).endsWith("/api/media/upload")) {
      assert.equal(options.method, "POST");
      assert.equal(options.body instanceof FormData, true);
      return new Response(JSON.stringify({
        status: "uploaded",
        media: { mediaId: "media-image-1", url: "/api/media/media-image-1", mediaType: "image", mimeType: "image/jpeg", size: 1024, name: "photo.jpg", source: "upload" },
      }), { status: 201, headers: { "content-type": "application/json" } });
    }
    if (String(url).endsWith("/api/posts")) {
      assert.equal(options.method, "POST");
      const body = JSON.parse(options.body);
      assert.equal(body.kind, "image");
      assert.deepEqual(body.media.map((item) => item.mediaId), ["media-image-1"]);
      assert.equal("file" in body.media[0], false);
      return new Response(JSON.stringify({
        status: "created",
        post: { id: "server-rich-1", kind: body.kind, text: body.text, media: body.media, audio: body.audio, background: body.background },
      }), { status: 201, headers: { "content-type": "application/json" } });
    }
    throw new Error("Unexpected fetch URL: " + String(url));
  };

  const apiAdapter = createApiPostAdapter();
  const imageFile = new File([new Uint8Array([1, 2, 3])], "photo.jpg", { type: "image/jpeg" });
  const published = await apiAdapter.publish({ ...draft, text: "", media: [{ name: imageFile.name, type: imageFile.type, size: imageFile.size, url: "blob:image", file: imageFile }] });
  assert.equal(published.id, "server-rich-1");
  assert.equal(calls.length, 2);

  const audioFile = new File([new Uint8Array([4, 5, 6])], "track.mp3", { type: "audio/mpeg" });
  const catalogLikeDraft = { ...draft, text: "", media: [], audio: { source: "catalog", musicId: "catalog-1", url: "https://cdn.example.com/catalog-1.mp3", title: "Catalog Track", artist: "Artist", type: "audio/mpeg", size: 0 } };
  const catalogPayload = createPostRequest(catalogLikeDraft);
  assert.equal(catalogPayload.kind, "music");
  assert.equal(catalogPayload.audio.musicId, "catalog-1");

  assert.equal(audioFile.type, "audio/mpeg");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("PASS Create rich-media validation");
console.log("PASS local image upload + media identity persistence");
console.log("PASS catalog music payload");
