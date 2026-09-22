import assert from "node:assert/strict";
import { createApiMusicAdapter } from "../src/services/musicService.js";

let requested = null;
const fetchImpl = async (url) => {
  requested = new URL(url);
  return {
    ok: true,
    async json() {
      return {
        ok: true,
        data: [{
          id: "track-1",
          title: "Test Track",
          artists: [[1, { id: "artist-1", name: "Artist One" }]],
          duration: 12.5,
          thumbnails: { md: "https://cdn.example.test/cover.jpg" },
          files: { mp3: "https://cdn.example.test/track.mp3" },
        }],
      };
    },
  };
};

const adapter = createApiMusicAdapter({
  fetchImpl,
  baseUrl: "https://api.example.test/music/tracks/search",
});

const searchResults = await adapter.search("focus", { limit: 7 });
assert.equal(requested.searchParams.get("q") ?? requested.searchParams.get("query"), "focus");
assert.equal(requested.searchParams.get("limit"), "7");
assert.equal(searchResults.length, 1);
assert.equal(searchResults[0].musicId, "track-1");
assert.equal(searchResults[0].title, "Test Track");
assert.equal(searchResults[0].artist, "Artist One");
assert.equal(searchResults[0].durationMs, 12500);
assert.equal(searchResults[0].artworkUrl, "https://cdn.example.test/cover.jpg");
assert.equal(searchResults[0].source, "catalog");
assert.equal(searchResults[0].provider, "Free To Use");
assert.equal(searchResults[0].licenseUrl, "https://api.freetouse.com/license");
assert.equal(searchResults[0].url, "https://cdn.example.test/track.mp3");

const browseFetch = async (url) => ({
  ok: true,
  async json() {
    return { data: [{ id: "track-2", title: "Browse Track", files: { mp3: "https://cdn.example.test/browse.mp3" }, duration: 3 }] };
  },
});
const browseAdapter = createApiMusicAdapter({ fetchImpl: browseFetch, baseUrl: "https://api.example.test/music/tracks/search" });
const browseResults = await browseAdapter.browse({ limit: 5, offset: 10, order: "random", sort: "asc" });
assert.equal(browseResults[0].musicId, "track-2");

console.log("music service contract: ok");
