import { apiClient, hasApiBaseUrl, resolveApiUrl } from "./apiClient.js";
import { createConversationRequest, createMessageRequest, normalizeMessage } from "../features/messages/messageContract.js";

export function createApiMessageAdapter(client = apiClient) {
  return {
    listConversations(request = {}) { return client.get("/api/messages/conversations", { query: createConversationRequest(request) }); },
    listMessages(conversationId, request = {}) { return client.get("/api/messages/conversations/" + encodeURIComponent(conversationId), { query: createConversationRequest(request) }).then((page) => ({ ...page, items:(page?.items || []).map(normalizeMessage) })); },
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
    send(input) { return client.post("/api/messages", createMessageRequest(input)).then(normalizeMessage); }
  };
}

export function createDevMessageAdapter(seed = {}) {
  return {
    listConversations() { return Promise.resolve({ items: Object.keys(seed).map((name) => ({ id:name.toLowerCase().replace(/\s+/g,"-"), name })) }); },
    listMessages(conversationId) { const name = Object.keys(seed).find((key) => key.toLowerCase().replace(/\s+/g,"-") === conversationId); return Promise.resolve({ items:(seed[name] || []).map((item) => normalizeMessage({ ...item, conversationId })) }); },
    markConversationRead() { return Promise.resolve({ ok:true }); },
    uploadImage(file) { return Promise.resolve({ mediaId:"local-"+Date.now(), url:URL.createObjectURL(file), mediaType:"image", mimeType:file.type, size:file.size, name:file.name }); },
    deleteMedia() { return Promise.resolve({ ok:true }); },
    send(input) { return Promise.resolve(normalizeMessage({ ...input, id:Date.now(), senderId:"me", createdAt:new Date().toISOString(), media:input.media || null })); }
  };
}
export function createMessageAdapter({ client = apiClient, devSeed = {} } = {}) { return hasApiBaseUrl() ? createApiMessageAdapter(client) : createDevMessageAdapter(devSeed); }
export const messageService = createMessageAdapter();
