import assert from "node:assert/strict";
import {
  MEDIA_SOURCES,
  createCatalogMusicAsset,
  isCatalogMusicAsset,
  isLocalMediaAsset,
} from "../src/features/create/mediaContract.js";
import { createPostRequest } from "../src/services/postService.js";

const catalogTrack = createCatalogMusicAsset({
  musicId: "track-1",
  url: "https://cdn.example.com/track-1.mp3",
  title: "Track One",
  artist: "Artist",
  durationMs: 180000,
});

assert.equal(catalogTrack.source, MEDIA_SOURCES.CATALOG);
assert.equal(catalogTrack.musicId, "track-1");
assert.equal(isCatalogMusicAsset(catalogTrack), true);
assert.equal(isLocalMediaAsset(catalogTrack), false);

const catalogDraft = {
  text: "Listen to this.",
  kind: "music",
  media: [],
  audio: catalogTrack,
  background: null,
  poll: null,
  audience: "public",
  replyPolicy: "everyone",
};

const request = createPostRequest(catalogDraft);
assert.equal(request.audio.musicId, "track-1");
assert.equal(request.audio.source, MEDIA_SOURCES.CATALOG);

assert.throws(
  () => createCatalogMusicAsset({ musicId: "track-2", url: "blob:track", title: "Bad" }),
  /HTTP\(S\) URL/,
);

console.log("media contract tests passed");
