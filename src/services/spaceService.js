import { apiClient, hasApiBaseUrl, resolveApiUrl } from "./apiClient.js";
import { createSpace, createSpacePage, createSpaceRequest } from "../features/spaces/spaceContract.js";

function wsUrl(path) {
  const value = resolveApiUrl(path);
  return value.replace(/^http/i, "ws");
}

export function createApiSpaceAdapter(client = apiClient) {
  return {
    list(request = {}) { return client.get("/api/spaces", { query: request }).then((page) => createSpacePage((page?.items || []).map(createSpace), page?.nextCursor || null)); },
    get(id) { return client.get("/api/spaces/" + encodeURIComponent(id)).then((payload) => payload.space); },
    create(input) { return client.post("/api/spaces", createSpaceRequest(input)).then((payload) => payload.space); },
    join(id) { return client.post("/api/spaces/" + encodeURIComponent(id) + "/join").then((payload) => payload.space); },
    leave(id) { return client.post("/api/spaces/" + encodeURIComponent(id) + "/leave"); },
    heartbeat(id) { return client.post("/api/spaces/" + encodeURIComponent(id) + "/heartbeat"); },
    end(id) { return client.post("/api/spaces/" + encodeURIComponent(id) + "/end"); },
    delete(id) { return client.delete("/api/spaces/" + encodeURIComponent(id) + "/delete"); },
    members(id) { return client.get("/api/spaces/" + encodeURIComponent(id) + "/members").then((payload) => payload.items || []); },
    messages(id) { return client.get("/api/spaces/" + encodeURIComponent(id) + "/messages").then((payload) => payload.items || []); },
    sendMessage(id, text) { return client.post("/api/spaces/" + encodeURIComponent(id) + "/messages", { text }).then((payload) => payload.message); },
    setRole(id, userId, role) { return client.post("/api/spaces/" + encodeURIComponent(id) + "/role/" + encodeURIComponent(userId), { role }); },
    websocket(id) { return new WebSocket(wsUrl("/api/spaces/" + encodeURIComponent(id) + "/websocket")); },
  };
}

export function createUnavailableSpaceAdapter() {
  const unavailable = () => Promise.reject(new Error("Spaces require the Cloudflare backend."));
  return { list: unavailable, get: unavailable, create: unavailable, join: unavailable, leave: unavailable, heartbeat: unavailable, end: unavailable, members: unavailable, messages: unavailable, sendMessage: unavailable, setRole: unavailable, websocket: unavailable };
}
export function createSpaceAdapter({ client = apiClient } = {}) { return hasApiBaseUrl() ? createApiSpaceAdapter(client) : createUnavailableSpaceAdapter(); }
export const spaceService = createSpaceAdapter();
