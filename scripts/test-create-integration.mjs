import assert from "node:assert/strict";
import { createCreatePublishHandler } from "../src/features/create/createIntegration.js";
import { validatePostDraft } from "../src/features/create/postValidation.js";

const draft = {
  text: "Integration test post",
  kind: "text",
  media: [],
  audio: null,
  background: null,
  audience: "public",
  replyPolicy: "everyone",
};

let received = null;

const publish = createCreatePublishHandler({
  onLocalPublish: async (post) => {
    received = post;
  },
});

const result = await publish(draft);

assert.equal(result.developmentOnly, true);
assert.deepEqual(result.post, draft);
assert.deepEqual(received, draft);

const validRichDraft = {
  ...draft,
  kind: "image",
  media: [{ name: "photo.webp", type: "image/webp", size: 1024, url: "blob:test" }],
  audio: { name: "track.mp3", type: "audio/mpeg", size: 2048, url: "blob:test-audio" },
  background: { type: "color", value: "#151922" },
};

assert.equal(validatePostDraft(validRichDraft).valid, true);

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

console.log("PASS Create publish integration");
console.log("PASS Create rich-media validation");
