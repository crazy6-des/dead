import { apiClient, hasApiBaseUrl } from "./apiClient.js";
import { createList, createListPage } from "../features/lists/listContract.js";
export function createApiListAdapter(client = apiClient) {
  return {
    list(request = {}) { return client.get("/api/lists", { query: request }).then((page) => createListPage((page?.items || []).map(createList), page?.nextCursor || null)); },
    get(id) { return client.get("/api/lists/" + encodeURIComponent(String(id))).then(createList); },
    posts(id) { return client.get("/api/lists/" + encodeURIComponent(String(id)) + "/posts"); },
    create(input) { return client.post("/api/lists", createList(input)).then(createList); },
    update(id, input) { return client.patch("/api/lists/" + encodeURIComponent(String(id)), createList({ ...input, id })).then(createList); },
    remove(id) { return client.delete("/api/lists/" + encodeURIComponent(String(id))); },
    addMember(id, username) { return client.post("/api/lists/" + encodeURIComponent(String(id)) + "/members", { username }); },
    removeMember(id, userId) { return client.delete("/api/lists/" + encodeURIComponent(String(id)) + "/members", { body: { userId } }); },
  };
}
export function createUnavailableListAdapter() { const unavailable = () => Promise.reject(new Error("Lists require the Cloudflare backend.")); return { list: unavailable,get: unavailable,posts: unavailable,create: unavailable,update: unavailable,remove: unavailable,addMember: unavailable,removeMember: unavailable }; }
export function createListAdapter({ client = apiClient } = {}) { return hasApiBaseUrl() ? createApiListAdapter(client) : createUnavailableListAdapter(); }
export const listService = createListAdapter();
