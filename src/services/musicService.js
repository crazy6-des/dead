import { createCatalogMusicAsset } from "../features/create/mediaContract.js";
import { apiClient, hasApiBaseUrl } from "./apiClient.js";

const DEFAULT_LIMIT = 12;
const AUDIUS_STREAM_PATH = "/api/music/stream";

function getCatalogUrl() {
  return String(import.meta.env?.VITE_MUSIC_CATALOG_URL || "").trim();
}

function extractItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.tracks)) return data.tracks;
  if (Array.isArray(data?.music)) return data.music;
  return [];
}

function normalizeTrack(item) {
  const track = item?.track || item?.music || item;
  if (!track || typeof track !== "object") return null;

  const musicId = String(track.id ?? track.musicId ?? "").trim();
  const title = String(track.title ?? track.name ?? "Untitled track").trim();
  const url = musicId ? `${AUDIUS_STREAM_PATH}/${encodeURIComponent(musicId)}` : "";
  if (!musicId || !url) return null;

  const artist = String(track.user?.name ?? track.artist ?? track.artistName ?? "").trim();
  const artwork = track.artwork || {};
  const artworkUrl = String(
    track.artworkUrl
      ?? artwork._480x480
      ?? artwork._150x150
      ?? artwork._1000x1000
      ?? track.thumbnailUrl
      ?? ""
  ).trim();
  const durationMs = Number(track.duration || track.durationMs || 0) * (track.durationMs ? 1 : 1000);

  try {
    return createCatalogMusicAsset({
      musicId,
      url,
      title,
      artist,
      album: String(track.album?.title ?? track.album ?? "").trim(),
      type: "audio/mpeg",
      durationMs,
      artworkUrl,
      provider: "Audius",
      licenseUrl: "",
    });
  } catch {
    return null;
  }
}

async function requestDirect(baseUrl, params, { fetchImpl = fetch, signal } = {}) {
  if (!baseUrl) return [];
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const response = await fetchImpl(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error(`Music catalog request failed (${response.status}).`);
  return response.json();
}

export function hasMusicCatalog() {
  return hasApiBaseUrl() || Boolean(getCatalogUrl());
}

export function createApiMusicAdapter({ fetchImpl = fetch, baseUrl = getCatalogUrl() } = {}) {
  return {
    async search(query, { limit = DEFAULT_LIMIT, signal } = {}) {
      const trimmed = String(query || "").trim();
      if (!trimmed) return [];
      const payload = hasApiBaseUrl()
        ? await apiClient.get("/api/music/search", { query: { query: trimmed, limit }, signal })
        : await requestDirect(baseUrl, { q: trimmed, limit }, { fetchImpl, signal });
      return extractItems(payload).map(normalizeTrack).filter(Boolean);
    },

    async browse({ limit = DEFAULT_LIMIT, offset = 0, signal } = {}) {
      const payload = hasApiBaseUrl()
        ? await apiClient.get("/api/music/browse", { query: { limit, offset }, signal })
        : await requestDirect(baseUrl, { limit, offset }, { fetchImpl, signal });
      return extractItems(payload).map(normalizeTrack).filter(Boolean);
    },
  };
}

export function createUnavailableMusicAdapter() {
  return {
    search() {
      return Promise.resolve([]);
    },
    browse() {
      return Promise.resolve([]);
    },
  };
}

export function createMusicAdapter(options = {}) {
  return hasMusicCatalog()
    ? createApiMusicAdapter(options)
    : createUnavailableMusicAdapter();
}
