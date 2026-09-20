import { apiClient, hasApiBaseUrl } from "./apiClient.js";
import { createBookmarkFolder, createBookmarkRequest } from "../features/bookmarks/bookmarkContract.js";

export function createApiBookmarkAdapter(client = apiClient) {
  return {
    listFolders() { return client.get("/api/bookmarks/folders"); },
    createFolder(input) { return client.post("/api/bookmarks/folders", createBookmarkFolder(input)); },
    save(input) { return client.post("/api/bookmarks", createBookmarkRequest(input)); },
    remove(postId) { return client.delete("/api/bookmarks/" + encodeURIComponent(String(postId))); },
  };
}
export function createDevBookmarkAdapter() {
  const folders = [{ id: "all", name: "All saved", description: "Everything you bookmarked." }];
  const saved = new Map();
  return {
    listFolders() { return Promise.resolve({ items: folders }); },
    createFolder(input) {
      const folder = createBookmarkFolder({ ...input, id: "folder-" + Date.now() });
      folders.push(folder);
      return Promise.resolve(folder);
    },
    save(input) {
      const payload = createBookmarkRequest(input);
      saved.set(payload.postId, payload);
      return Promise.resolve({ ok: true, ...payload });
    },
    remove(postId) { saved.delete(String(postId)); return Promise.resolve({ ok: true }); },
  };
}
export function createBookmarkAdapter({ client = apiClient } = {}) {
  return hasApiBaseUrl() ? createApiBookmarkAdapter(client) : createDevBookmarkAdapter();
}
export const bookmarkService = createBookmarkAdapter();
