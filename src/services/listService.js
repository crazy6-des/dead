import { apiClient, hasApiBaseUrl } from "./apiClient.js";
import { createList, createListPage } from "../features/lists/listContract.js";

export function createApiListAdapter(client = apiClient) {
  return {
    list(request = {}) { return client.get("/api/lists", { query: request }).then((page) => createListPage((page?.items || []).map(createList), page?.nextCursor || null)); },
    create(input) { return client.post("/api/lists", createList(input)).then(createList); },
    update(id, input) { return client.patch("/api/lists/" + encodeURIComponent(String(id)), createList({ ...input, id })).then(createList); },
    remove(id) { return client.delete("/api/lists/" + encodeURIComponent(String(id))); },
  };
}

export function createUnavailableListAdapter() {
  const unavailable = () => Promise.reject(new Error("Lists require the Cloudflare backend."));
  return { list: unavailable, create: unavailable, update: unavailable, remove: unavailable };
}

export function createListAdapter({ client = apiClient } = {}) {
  return hasApiBaseUrl() ? createApiListAdapter(client) : createUnavailableListAdapter();
}

export const listService = createListAdapter();
