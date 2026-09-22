import { apiClient, hasApiBaseUrl } from "./apiClient.js";
import { createBookmarkFolder, createBookmarkRequest } from "../features/bookmarks/bookmarkContract.js";

export function createApiBookmarkAdapter(client = apiClient) {
  return {
    listSaved() { return client.get("/api/bookmarks"); },
    listFolders() { return client.get("/api/bookmarks/folders"); },
    createFolder(input) { return client.post("/api/bookmarks/folders", createBookmarkFolder(input)); },
    save(input) { return client.post("/api/bookmarks", createBookmarkRequest(input)); },
    remove(postId) { return client.delete("/api/bookmarks/" + encodeURIComponent(String(postId))); },
  };
}

export function createUnavailableBookmarkAdapter() {
  const unavailable = () => Promise.reject(new Error("Bookmark folders require the Cloudflare backend."));
  return {
    listSaved: unavailable,
    listFolders: unavailable,
    createFolder: unavailable,
    save: unavailable,
    remove: unavailable,
  };
}

export function createBookmarkAdapter({ client = apiClient } = {}) {
  return hasApiBaseUrl() ? createApiBookmarkAdapter(client) : createUnavailableBookmarkAdapter();
}

export const bookmarkService = createBookmarkAdapter();
