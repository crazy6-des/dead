/**
 * Feed contract for the future API adapter.
 * This file defines stable vocabulary without connecting the UI to a backend yet.
 */

export const FEED_MODES = Object.freeze({
  FOR_YOU: "For You",
  FOLLOWING: "Following",
  LATEST: "Latest",
});

export const FEED_PAGE_SIZE = 20;

export function createFeedRequest({ mode = FEED_MODES.FOR_YOU, cursor = null } = {}) {
  return Object.freeze({
    mode,
    cursor,
    limit: FEED_PAGE_SIZE,
  });
}

export function createFeedPage(items = [], nextCursor = null) {
  return Object.freeze({
    items: Array.isArray(items) ? items : [],
    nextCursor,
    hasMore: Boolean(nextCursor),
  });
}
