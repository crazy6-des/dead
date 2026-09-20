import { apiClient, hasApiBaseUrl } from "./apiClient.js";
import { createList, createListPage } from "../features/lists/listContract.js";

const DEV_LISTS = [
  createList({ id: "creators", name: "Creators of S", description: "People building and sharing." }),
  createList({ id: "music", name: "Music & sound", description: "Artists, listeners and conversations." }),
];

export function createApiListAdapter(client = apiClient) {
  return {
    list(request = {}) { return client.get("/api/lists", { query: request }).then((page) => createListPage((page?.items || []).map(createList), page?.nextCursor || null)); },
    create(input) { return client.post("/api/lists", createList(input)).then(createList); },
    update(id, input) { return client.patch("/api/lists/" + encodeURIComponent(String(id)), createList({ ...input, id })).then(createList); },
    remove(id) { return client.delete("/api/lists/" + encodeURIComponent(String(id))); },
  };
}
export function createDevListAdapter(seed = DEV_LISTS) {
  const lists = [...seed];
  return {
    list() { return Promise.resolve(createListPage(lists)); },
    create(input) { const list = createList({ ...input, id: "list-" + Date.now() }); lists.push(list); return Promise.resolve(list); },
    update(id, input) { const index = lists.findIndex((item) => item.id === id); if (index < 0) return Promise.reject(new Error("List not found.")); lists[index] = createList({ ...input, id }); return Promise.resolve(lists[index]); },
    remove(id) { const index = lists.findIndex((item) => item.id === id); if (index >= 0) lists.splice(index, 1); return Promise.resolve({ ok: true }); },
  };
}
export function createListAdapter({ client = apiClient, devSeed = DEV_LISTS } = {}) { return hasApiBaseUrl() ? createApiListAdapter(client) : createDevListAdapter(devSeed); }
export const listService = createListAdapter();