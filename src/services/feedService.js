/**
 * Feed boundary.
 *
 * The UI can continue using the development adapter while the API is introduced
 * incrementally. The API adapter deliberately preserves the same request and
 * response contract so callers do not need to change when the backend is ready.
 */
import { apiClient, hasApiBaseUrl } from "./apiClient.js";

export function createFeedRequest({ tab = 'For You', cursor = null, limit = 20, query = '' } = {}) {
  return { tab, cursor, limit, query };
}

export function createFeedResponse(items = [], nextCursor = null) {
  return {
    items: Array.isArray(items) ? items : [],
    nextCursor,
    hasMore: Boolean(nextCursor),
  };
}

function normalizeApiResponse(payload) {
  const source = payload?.data && typeof payload.data === 'object'
    ? payload.data
    : payload || {};

  return createFeedResponse(
    Array.isArray(source.items) ? source.items : source.posts,
    source.nextCursor ?? source.next_cursor ?? null,
  );
}

export function createDevFeedAdapter(seedPosts = []) {
  return {
    async list(request = createFeedRequest()) {
      const items = request.tab === 'Following'
        ? seedPosts.filter((post) => post.following)
        : request.tab === 'Latest'
          ? [...seedPosts].reverse()
          : [...seedPosts];

      const filtered = request.query
        ? items.filter((post) => `${post.a} ${post.x} ${post.topic}`
          .toLowerCase()
          .includes(request.query.toLowerCase()))
        : items;

      return createFeedResponse(filtered.slice(0, request.limit), null);
    },
  };
}

export function createApiFeedAdapter({ endpoint = '/api/feed' } = {}) {
  return {
    async list(request = createFeedRequest()) {
      const params = new URLSearchParams({
        tab: request.tab,
        limit: String(request.limit),
      });

      if (request.cursor) params.set('cursor', request.cursor);
      if (request.query) params.set('query', request.query);

      const payload = await apiClient.get(`${endpoint}?${params.toString()}`);
      return normalizeApiResponse(payload);
    },
  };
}

export function createFeedAdapter({ seedPosts = [], endpoint = '/api/feed' } = {}) {
  return hasApiBaseUrl()
    ? createApiFeedAdapter({ endpoint })
    : createDevFeedAdapter(seedPosts);
}
