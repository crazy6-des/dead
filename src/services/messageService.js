import { apiClient, hasApiBaseUrl } from "./apiClient.js";
import { createConversationRequest, createMessageRequest, normalizeMessage } from "../features/messages/messageContract.js";
export function createApiMessageAdapter(client = apiClient) {
  return {
    listConversations(request = {}) { return client.get("/api/messages/conversations", { query: createConversationRequest(request) }); },
    listMessages(conversationId, request = {}) { return client.get("/api/messages/conversations/" + encodeURIComponent(conversationId), createConversationRequest(request)).then((page) => ({ ...page, items:(page?.items || []).map(normalizeMessage) })); },
    send(input) { return client.post("/api/messages", createMessageRequest(input)).then(normalizeMessage); }
  };
}
export function createDevMessageAdapter(seed = {}) {
  return {
    listConversations() { return Promise.resolve({ items: Object.keys(seed).map((name) => ({ id:name.toLowerCase().replace(/\s+/g,"-"), name })) }); },
    listMessages(conversationId) { const name = Object.keys(seed).find((key) => key.toLowerCase().replace(/\s+/g,"-") === conversationId); return Promise.resolve({ items:(seed[name] || []).map((item) => normalizeMessage({ ...item, conversationId })) }); },
    send(input) { return Promise.resolve(normalizeMessage({ ...input, id:Date.now(), senderId:"me", createdAt:new Date().toISOString() })); }
  };
}
export function createMessageAdapter({ client = apiClient, devSeed = {} } = {}) { return hasApiBaseUrl() ? createApiMessageAdapter(client) : createDevMessageAdapter(devSeed); }
export const messageService = createMessageAdapter();
