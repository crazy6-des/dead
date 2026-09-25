import { apiClient, hasApiBaseUrl, resolveApiUrl } from "./apiClient.js";
import { createConversationRequest, createMessageRequest, normalizeMessage } from "../features/messages/messageContract.js";

export function createApiMessageAdapter(client = apiClient) {
  return {
    listConversations(request = {}) { return client.get("/api/messages/conversations", { query: createConversationRequest(request) }); },
    createConversation(username) { return client.post("/api/messages/conversations", { username: String(username || "").replace(/^@/, "").trim().toLowerCase() }); },
    listMessages(conversationId, request = {}) { return client.get("/api/messages/conversations/" + encodeURIComponent(conversationId), { query: createConversationRequest(request) }).then((page) => ({ ...page, items:(page?.items || []).map((item) => { const normalized = normalizeMessage(item); return normalized.media ? { ...normalized, media: { ...normalized.media, url: resolveApiUrl(normalized.media.url) } } : normalized; }) })); },
    markConversationRead(conversationId) { return client.post("/api/messages/conversations/" + encodeURIComponent(conversationId) + "/read"); },
    uploadImage(file) {
      const form = new FormData();
      form.append("file", file, file.name);
      return client.post("/api/media/upload", form).then((result) => ({
        ...(result?.media || {}),
        url: resolveApiUrl(result?.media?.url),
      }));
    },
    deleteMedia(mediaId) { return client.delete("/api/media/" + encodeURIComponent(mediaId)); },
    send(input) { return client.post("/api/messages", createMessageRequest(input)).then(normalizeMessage); }, update(messageId, text) { return client.patch("/api/messages/" + encodeURIComponent(messageId), { text: String(text || "").trim() }).then(normalizeMessage); }, delete(messageId) { return client.delete("/api/messages/" + encodeURIComponent(messageId)); }
  };
}

export function createDevMessageAdapter(seed = {}) {
  return {
    createConversation(username) { const normalized = String(username || "").replace(/^@/, "").trim().toLowerCase(); return Promise.resolve({ conversation: { id: normalized, username: normalized, name: normalized } }); },
    listConversations() { return Promise.resolve({ items: Object.keys(seed).map((name) => ({ id:name.toLowerCase().replace(/\s+/g,"-"), name })) }); },
    listMessages(conversationId) { const name = Object.keys(seed).find((key) => key.toLowerCase().replace(/\s+/g,"-") === conversationId); return Promise.resolve({ items:(seed[name] || []).map((item) => normalizeMessage({ ...item, conversationId })) }); },
    markConversationRead() { return Promise.resolve({ ok:true }); },
    uploadImage(file) { return Promise.resolve({ mediaId:"local-"+Date.now(), url:URL.createObjectURL(file), mediaType:"image", mimeType:file.type, size:file.size, name:file.name }); },
    deleteMedia() { return Promise.resolve({ ok:true }); },
    send(input) { return Promise.resolve(normalizeMessage({ ...input, id:Date.now(), senderId:"me", createdAt:new Date().toISOString(), media:input.media || null })); }, update(messageId, text) { return Promise.resolve(normalizeMessage({ id:messageId, text:String(text || "").trim(), senderId:"me", createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() })); }, delete(messageId) { return Promise.resolve({ ok:true, id:messageId }); }
  };
}
export function createMessageAdapter({ client = apiClient, devSeed = {} } = {}) { return hasApiBaseUrl() ? createApiMessageAdapter(client) : createDevMessageAdapter(devSeed); }
export const messageService = createMessageAdapter();
