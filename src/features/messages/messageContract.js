export const MESSAGE_TYPES = Object.freeze({ TEXT:"text", IMAGE:"image", AUDIO:"audio", FILE:"file" });
export const MESSAGE_IMAGE_LIMITS = Object.freeze({ MAX_SIZE: 10 * 1024 * 1024, TYPES: Object.freeze(["image/jpeg","image/png","image/webp","image/gif"]) });

export function createConversationRequest({ cursor = null, limit = 30 } = {}) {
  return Object.freeze({ cursor, limit });
}

export function createMessageRequest({ conversationId, type = MESSAGE_TYPES.TEXT, text = "", mediaId = null } = {}) {
  return Object.freeze({
    conversationId: String(conversationId || ""),
    type,
    text: String(text || "").trim(),
    ...(mediaId ? { mediaId: String(mediaId) } : {}),
  });
}

export function normalizeMessage(value = {}) {
  const media = value.media && typeof value.media === "object" ? {
    mediaId: String(value.media.mediaId ?? ""),
    url: String(value.media.url ?? ""),
    mediaType: value.media.mediaType || "image",
    mimeType: value.media.mimeType || null,
    size: Number(value.media.size || 0),
    name: value.media.name || null,
  } : null;
  return Object.freeze({
    id: String(value.id ?? ""),
    conversationId: String(value.conversationId ?? ""),
    senderId: String(value.senderId ?? ""),
    type: value.type || MESSAGE_TYPES.TEXT,
    text: String(value.text || ""),
    media,
    createdAt: value.createdAt || null,
    status: value.status || "sent",
  });
}
