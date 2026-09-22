import { createCatalogMusicAsset } from "../features/create/mediaContract.js";
import { apiClient, hasApiBaseUrl } from "./apiClient.js";

const DEFAULT_LIMIT = 12;
const FREE_TO_USE_SEARCH_URL = "https://api.freetouse.com/v3/music/tracks/search";
const FREE_TO_USE_BROWSE_URL = "https://api.freetouse.com/v3/music/tracks/all";

function getCatalogUrl() {
  return String(import.meta.env?.VITE_MUSIC_CATALOG_URL || "").trim();
}

function normalizeTrack(item) {
  const track = item?.track || item?.music || item;
  if (!track || typeof track !== "object") return null;
  const musicId = String(track.musicId ?? track.id ?? "").trim();
  const url = String(track.url ?? track.audioUrl ?? track.previewUrl ?? track.files?.mp3 ?? "").trim();
  if (!musicId || !/^https?:\/\//i.test(url)) return null;
  const artists = Array.isArray(track.artists) ? track.artists.map((entry) => Array.isArray(entry) ? entry[1]?.name : entry?.name).filter(Boolean) : [];
  try {
    return createCatalogMusicAsset({
      musicId,
      url,
      title: track.title ?? track.name ?? "Untitled track",
      artist: track.artist ?? track.artistName ?? artists.join(", "),
      album: track.album ?? track.albumName ?? "",
      type: track.type ?? track.mimeType ?? "audio/mpeg",
      durationMs: Number(track.durationMs ?? (Number(track.duration || 0) * 1000)),
      artworkUrl: track.artworkUrl ?? track.thumbnailUrl ?? track.thumbnails?.md ?? track.thumbnails?.lg ?? track.thumbnails?.sm ?? "",
      provider: track.provider ?? "Free To Use",
      licenseUrl: track.licenseUrl ?? "https://api.freetouse.com/license",
    });
  } catch {
    return null;
  }
}

function extractItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.tracks)) return data.tracks;
  if (Array.isArray(data?.music)) return data.music;
  return [];
}

export function hasMusicCatalog() {
  return hasApiBaseUrl() || Boolean(getCatalogUrl());
}

async function requestDirect(urlString, query, { fetchImpl = fetch, signal } = {}) {
  const url = new URL(urlString);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });
  const response = await fetchImpl(url, { method: "GET", headers: { Accept: "application/json" }, signal });
  if (!response.ok) throw new Error(`Music catalog request failed (${response.status}).`);
  return response.json();
}

export function createApiMusicAdapter({ fetchImpl = fetch, baseUrl = getCatalogUrl() } = {}) {
  return {
    async search(query, { limit = DEFAULT_LIMIT, signal } = {}) {
      const trimmed = String(query || "").trim();
      if (!trimmed) return [];
      const payload = hasApiBaseUrl()
        ? await apiClient.get("/api/music/search", { query: { query: trimmed, limit }, signal })
        : await requestDirect(baseUrl || FREE_TO_USE_SEARCH_URL, { query: trimmed, limit }, { fetchImpl, signal });
      return extractItems(payload).map(normalizeTrack).filter(Boolean);
    },
    async browse({ limit = DEFAULT_LIMIT, offset = 0, order = "release_date", sort = "desc", signal } = {}) {
      const payload = hasApiBaseUrl()
        ? await apiClient.get("/api/music/browse", { query: { limit, offset, order, sort }, signal })
        : await requestDirect(FREE_TO_USE_BROWSE_URL, { limit, offset, order, sort }, { fetchImpl, signal });
      return extractItems(payload).map(normalizeTrack).filter(Boolean);
    },
  };
}

export function createUnavailableMusicAdapter() {
  return { search: () => Promise.resolve([]), browse: () => Promise.resolve([]) };
}

export function createMusicAdapter(options = {}) {
  return hasMusicCatalog() ? createApiMusicAdapter(options) : createUnavailableMusicAdapter();
}
