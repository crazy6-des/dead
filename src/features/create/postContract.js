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
    poll: null,
    audience: POST_AUDIENCES.PUBLIC,
    replyPolicy: REPLY_POLICIES.EVERYONE,
  };
}

export function inferPostKind(draft) {
  const hasText = String(draft?.text || "").trim().length > 0;
  const hasImages = Array.isArray(draft?.media) && draft.media.length > 0;
  const hasAudio = Boolean(draft?.audio);
  const hasBackground = Boolean(draft?.background);
  if (hasImages) return POST_KINDS.IMAGE;
  if (hasAudio) return POST_KINDS.MUSIC;
  if (hasBackground && !hasText) return POST_KINDS.BACKGROUND;
  return POST_KINDS.TEXT;
}

export function createPublishPayload(draft) {
  return {
    text: String(draft?.text || "").trim(),
    kind: inferPostKind(draft),
    media: Array.isArray(draft?.media) ? draft.media : [],
    audio: draft?.audio || null,
    background: draft?.background || null,
    poll: draft?.poll || null,
    audience: draft?.audience || POST_AUDIENCES.PUBLIC,
    replyPolicy: draft?.replyPolicy || REPLY_POLICIES.EVERYONE,
  };
}

export function normalizeCreatedPostResponse(response) {
  const post = response?.post ?? response?.data?.post ?? response?.data ?? response;
  if (!post || typeof post !== "object" || Array.isArray(post)) {
    throw new Error("The post service returned an invalid post response.");
  }
  if (!post.kind) post.kind = POST_KINDS.TEXT;
  return post;
}

const activePostAudioPlayers = new Map();
let activePostAudioId = null;

function stopPostAudio(id, audio) {
  try { audio?.pause(); } catch {}
  activePostAudioPlayers.get(id)?.setPlaying?.(false);
}

export function registerPostAudio(id, audio, setPlaying) {
  const key = String(id || "");
  if (!key || !audio) return () => {};
  activePostAudioPlayers.set(key, { audio, setPlaying });
  return () => {
    if (activePostAudioPlayers.get(key)?.audio === audio) {
      stopPostAudio(key, audio);
      activePostAudioPlayers.delete(key);
      if (activePostAudioId === key) activePostAudioId = null;
    }
  };
}

export async function activatePostAudio(id) {
  const key = String(id || "");
  const entry = activePostAudioPlayers.get(key);
  if (!entry?.audio) return { played: false, blocked: false };
  if (activePostAudioId && activePostAudioId !== key) {
    const previous = activePostAudioPlayers.get(activePostAudioId);
    stopPostAudio(activePostAudioId, previous?.audio);
  }
  activePostAudioId = key;
  try {
    await entry.audio.play();
    entry.setPlaying?.(true);
    return { played: true, blocked: false };
  } catch {
    entry.setPlaying?.(false);
    return { played: false, blocked: true };
  }
}

export function deactivatePostAudio(id) {
  const key = String(id || "");
  const entry = activePostAudioPlayers.get(key);
  if (entry?.audio) stopPostAudio(key, entry.audio);
  if (activePostAudioId === key) activePostAudioId = null;
}

export function togglePostAudio(id) {
  const key = String(id || "");
  const entry = activePostAudioPlayers.get(key);
  if (!entry?.audio) return Promise.resolve({ played: false, blocked: false });
  if (entry.audio.paused) return activatePostAudio(key);
  deactivatePostAudio(key);
  return Promise.resolve({ played: false, blocked: false });
}
