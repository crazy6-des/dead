import assert from "node:assert/strict";
import {
  FEED_MODES,
  FEED_PAGE_SIZE,
  createFeedRequest,
  createFeedPage,
} from "../src/features/feed/feedContract.js";
import { selectFeed, searchPosts } from "../src/features/feed/feedSelectors.js";
import { toggleLike, toggleSaved, followPostAuthor } from "../src/features/social/socialState.js";
import { createDevFeedAdapter } from "../src/services/feedService.js";

const posts = [
  { id: 1, a: "Maya", h: "@maya", x: "Hello music", topic: "Music", following: true, liked: false, saved: false, l: 2, b: 1 },
  { id: 2, a: "Daniel", h: "@daniel", x: "Building S", topic: "Creators", following: false, liked: true, saved: false, l: 4, b: 3 },
];

const request = createFeedRequest();
assert.equal(request.mode, FEED_MODES.FOR_YOU);
assert.equal(request.limit, FEED_PAGE_SIZE);
assert.equal(request.cursor, null);

const page = createFeedPage(posts, "next");
assert.deepEqual(page.items, posts);
assert.equal(page.nextCursor, "next");
assert.equal(page.hasMore, true);

assert.deepEqual(selectFeed(posts, FEED_MODES.FOLLOWING), [posts[0]]);
assert.deepEqual(selectFeed(posts, FEED_MODES.LATEST), [posts[1], posts[0]]);
assert.deepEqual(searchPosts(posts, "music"), [posts[0]]);

assert.equal(toggleLike(posts, 1)[0].liked, true);
assert.equal(toggleLike(posts, 1)[0].l, 3);
assert.equal(toggleSaved(posts, 2)[1].saved, true);
assert.equal(toggleSaved(posts, 2)[1].b, 4);
assert.equal(followPostAuthor(posts, 2)[1].following, true);

const adapter = createDevFeedAdapter(posts);
const followingPage = await adapter.list(createFeedRequest({ mode: FEED_MODES.FOLLOWING }));
assert.deepEqual(followingPage.items, [posts[0]]);

console.log("PASS feed contract/selectors/social state alignment");
