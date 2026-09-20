import {
  createEmptyDraft as createContractDraft,
  createPublishPayload,
} from "../features/create/postContract.js";
import { POST_AUDIENCES, REPLY_POLICIES } from "../features/create/postContract.js";

export { POST_AUDIENCES, REPLY_POLICIES };

export function createEmptyDraft() {
  return {
    id: undefined,
    ...createContractDraft(),
    status: "draft",
  };
}

export function normalizeDraft(input = {}) {
  const base = createEmptyDraft();
  return {
    ...base,
    ...input,
    text: String(input.text || ""),
    media: Array.isArray(input.media) ? input.media : [],
    status: input.status || "draft",
  };
}

export function canPublishDraft(draft) {
  const normalized = normalizeDraft(draft);
  const payload = createPublishPayload(normalized);
  return Boolean(
    payload.text ||
    payload.media.length ||
    payload.audio ||
    payload.background,
  );
}
