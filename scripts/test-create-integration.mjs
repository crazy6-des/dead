import assert from "node:assert/strict";
import { createCreatePublishHandler } from "../src/features/create/createIntegration.js";

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

console.log("PASS Create publish integration");
