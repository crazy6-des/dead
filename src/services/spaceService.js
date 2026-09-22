import { apiClient, hasApiBaseUrl } from "./apiClient.js";
import { createSpace, createSpacePage, createSpaceRequest } from "../features/spaces/spaceContract.js";

export function createApiSpaceAdapter(client = apiClient) {
  return {
    list(request = {}) {
      return client.get("/api/spaces", { query: request }).then((page) => createSpacePage((page?.items || []).map(createSpace), page?.nextCursor || null));
    },
    create(input) {
      return client.post("/api/spaces", createSpaceRequest(input)).then(createSpace);
    },
    join(id) { return client.post("/api/spaces/" + encodeURIComponent(id) + "/join"); },
    leave(id) { return client.post("/api/spaces/" + encodeURIComponent(id) + "/leave"); },
  };
}

export function createUnavailableSpaceAdapter() {
  const unavailable = () => Promise.reject(new Error("Spaces require the Cloudflare backend."));
  return { list: unavailable, create: unavailable, join: unavailable, leave: unavailable };
}

export function createSpaceAdapter({ client = apiClient } = {}) {
  return hasApiBaseUrl() ? createApiSpaceAdapter(client) : createUnavailableSpaceAdapter();
}

export const spaceService = createSpaceAdapter();
