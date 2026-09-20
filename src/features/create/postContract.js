/**
 * Stable contract for S post creation.
 * Keeps composer vocabulary independent of UI and backend details.
 */

export const POST_KINDS = Object.freeze({
  TEXT: "text",
  IMAGE: "image",
  MUSIC: "music",
  BACKGROUND: "background",
});

export const POST_AUDIENCES = Object.freeze({
  PUBLIC: "public",
  FOLLOWERS: "followers",
  PRIVATE: "private",
});

export const REPLY_POLICIES = Object.freeze({
  EVERYONE: "everyone",
  FOLLOWING: "following",
  MENTIONED: "mentioned",
});

export const POST_RESPONSE_STATUSES = Object.freeze({
  CREATED: "created",
});

export function createEmptyDraft() {
  return {
    text: "",
    kind: POST_KINDS.TEXT,
    media: [],
    audio: null,
    background: null,
    audience: POST_AUDIENCES.PUBLIC,
    replyPolicy: REPLY_POLICIES.EVERYONE,
  };
}

export function createPublishPayload(draft) {
  return {
    text: String(draft?.text || "").trim(),
    kind: draft?.kind || POST_KINDS.TEXT,
    media: Array.isArray(draft?.media) ? draft.media : [],
    audio: draft?.audio || null,
    background: draft?.background || null,
    audience: draft?.audience || POST_AUDIENCES.PUBLIC,
    replyPolicy: draft?.replyPolicy || REPLY_POLICIES.EVERYONE,
  };
}

export function normalizeCreatedPostResponse(response) {
  const post = response?.post ?? response?.data?.post ?? response?.data ?? response;
  if (!post || typeof post !== "object" || Array.isArray(post)) {
    throw new Error("The post service returned an invalid post response.");
  }

  return post;
}
