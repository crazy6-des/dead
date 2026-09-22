/**
 * Feed boundary.
 *
 * The UI can continue using the development adapter while the API is introduced
 * incrementally. The API adapter preserves the feature feed contract so callers
 * do not need to know whether data comes from local fixtures or the backend.
 */
import { apiClient, hasApiBaseUrl } from "./apiClient.js";
import { FEED_MODES, createFeedRequest as createContractFeedRequest, createFeedPage } from "../features/feed/feedContract.js";
import { toFeedPostFromCreatedPost } from "../features/feed/feedPostAdapter.js";

export function createFeedRequest({ mode = FEED_MODES.FOR_YOU, cursor = null } = {}) {
  return createContractFeedRequest({ mode, cursor });
}

export function createFeedResponse(items = [], nextCursor = null) {
  return createFeedPage(items, nextCursor);
}

function normalizeApiResponse(payload) {
  const source = payload?.data && typeof payload.data === "object" ? payload.data : payload || {};
  const items = Array.isArray(source.items)
    ? source.items
    : Array.isArray(source.posts)
      ? source.posts
      : [];
  return createFeedResponse(
    items.map((post) => toFeedPostFromCreatedPost(post)),
    source.nextCursor ?? source.next_cursor ?? null,
  );
}

export function createDevFeedAdapter(seedPosts = []) {
  return {
    async list(request = createFeedRequest()) {
      const items = request.mode === FEED_MODES.FOLLOWING
        ? seedPosts.filter((post) => post.following)
        : request.mode === FEED_MODES.LATEST
          ? [...seedPosts].reverse()
          : [...seedPosts];
      return createFeedResponse(items, null);
    },
  };
}

export function createApiFeedAdapter({ endpoint = "/api/feed" } = {}) {
  return {
    async list(request = createFeedRequest()) {
      const params = new URLSearchParams({ mode: request.mode, limit: String(request.limit) });
      if (request.cursor) params.set("cursor", request.cursor);
      const payload = await apiClient.get(`${endpoint}?${params.toString()}`);
      return normalizeApiResponse(payload);
    },
  };
}

export function createFeedAdapter({ seedPosts = [], endpoint = "/api/feed" } = {}) {
  return hasApiBaseUrl() ? createApiFeedAdapter({ endpoint }) : createDevFeedAdapter(seedPosts);
}
