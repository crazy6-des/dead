/**
 * Feed boundary. The current app can use the development adapter while the
 * same contract remains ready for a Workers/API implementation.
 */
export function createFeedRequest({ tab = 'For You', cursor = null, limit = 20, query = '' } = {}) {
  return { tab, cursor, limit, query };
}

export function createFeedResponse(items = [], nextCursor = null) {
  return { items, nextCursor, hasMore: Boolean(nextCursor) };
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
        ? items.filter((post) => `${post.a} ${post.x} ${post.topic}`.toLowerCase().includes(request.query.toLowerCase()))
        : items;
      return createFeedResponse(filtered.slice(0, request.limit), null);
    },
  };
}
