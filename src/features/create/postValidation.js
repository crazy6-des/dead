import { POST_KINDS, POST_AUDIENCES, REPLY_POLICIES, createPublishPayload } from "./postContract";

const MAX_TEXT_LENGTH = 5000;

export function validatePostDraft(draft) {
  const payload = createPublishPayload(draft);
  const errors = {};

  if (!payload.text && payload.media.length === 0 && !payload.audio && !payload.background) {
    errors.content = "Add text or media before publishing.";
  }

  if (payload.text.length > MAX_TEXT_LENGTH) {
    errors.text = `Text must be ${MAX_TEXT_LENGTH} characters or fewer.`;
  }

  if (!Object.values(POST_KINDS).includes(payload.kind)) errors.kind = "Unsupported post type.";
  if (!Object.values(POST_AUDIENCES).includes(payload.audience)) errors.audience = "Unsupported audience.";
  if (!Object.values(REPLY_POLICIES).includes(payload.replyPolicy)) errors.replyPolicy = "Unsupported reply policy.";

  return { valid: Object.keys(errors).length === 0, errors, payload };
}
