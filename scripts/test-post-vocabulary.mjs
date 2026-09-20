import assert from "node:assert/strict";
import {
  POST_AUDIENCES,
  REPLY_POLICIES,
  createEmptyDraft,
  createPublishPayload,
} from "../src/features/create/postContract.js";
import {
  AUDIENCES,
  POST_AUDIENCES as DOMAIN_AUDIENCES,
  REPLY_POLICIES as DOMAIN_REPLY_POLICIES,
} from "../src/domain/models.js";
import {
  createEmptyDraft as createLegacyDraft,
  normalizeDraft,
} from "../src/services/createDraft.js";

assert.deepEqual(Object.values(POST_AUDIENCES), ["public", "followers", "private"]);
assert.deepEqual(Object.values(REPLY_POLICIES), ["everyone", "following", "mentioned"]);
assert.deepEqual(AUDIENCES, Object.values(POST_AUDIENCES));
assert.strictEqual(DOMAIN_AUDIENCES, POST_AUDIENCES);
assert.strictEqual(DOMAIN_REPLY_POLICIES, REPLY_POLICIES);

const canonical = createEmptyDraft();
assert.equal(canonical.audience, POST_AUDIENCES.PUBLIC);
assert.equal(canonical.replyPolicy, REPLY_POLICIES.EVERYONE);

const legacy = createLegacyDraft();
assert.equal(legacy.audience, POST_AUDIENCES.PUBLIC);
assert.equal(legacy.replyPolicy, REPLY_POLICIES.EVERYONE);
assert.equal(legacy.kind, "text");

const normalized = normalizeDraft({
  text: " Hello ",
  audience: POST_AUDIENCES.PRIVATE,
  replyPolicy: REPLY_POLICIES.MENTIONED,
});
assert.equal(normalized.text, " Hello ");
assert.equal(normalized.audience, "private");
assert.equal(normalized.replyPolicy, "mentioned");

const payload = createPublishPayload(normalized);
assert.equal(payload.text, "Hello");
assert.equal(payload.audience, "private");
assert.equal(payload.replyPolicy, "mentioned");

console.log("PASS canonical post vocabulary");
