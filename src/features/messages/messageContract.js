export const MESSAGE_TYPES = Object.freeze({ TEXT:"text", IMAGE:"image", AUDIO:"audio", FILE:"file" });
export function createConversationRequest({ cursor = null, limit = 30 } = {}) {
  return Object.freeze({ cursor, limit });
}
export function createMessageRequest({ conversationId, type = MESSAGE_TYPES.TEXT, text = "" } = {}) {
  return Object.freeze({ conversationId: String(conversationId || ""), type, text: String(text || "").trim() });
}
export function normalizeMessage(value = {}) {
  return Object.freeze({
    id: String(value.id ?? ""),
    conversationId: String(value.conversationId ?? ""),
    senderId: String(value.senderId ?? ""),
    type: value.type || MESSAGE_TYPES.TEXT,
    text: String(value.text || ""),
    createdAt: value.createdAt || null,
    status: value.status || "sent",
  });
}
