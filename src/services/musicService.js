import { createCatalogMusicAsset } from "../features/create/mediaContract.js";

const DEFAULT_LIMIT = 12;

function getCatalogUrl() {
  return String(import.meta.env.VITE_MUSIC_CATALOG_URL || "").trim();
}

function normalizeTrack(item) {
  const track = item?.track || item?.music || item;
  if (!track || typeof track !== "object") return null;

  const musicId = String(track.musicId ?? track.id ?? "").trim();
  const url = String(track.url ?? track.audioUrl ?? track.previewUrl ?? "").trim();
  if (!musicId || !/^https?:\/\//i.test(url)) return null;

  try {
    return createCatalogMusicAsset({
      musicId,
      url,
      title: track.title ?? track.name ?? "Untitled track",
      artist: track.artist ?? track.artistName ?? "",
      album: track.album ?? track.albumName ?? "",
      type: track.type ?? track.mimeType ?? "audio/mpeg",
      durationMs: Number(track.durationMs ?? track.duration ?? 0),
    });
  } catch {
    return null;
  }
}

function extractItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.tracks)) return data.tracks;
  if (Array.isArray(data?.music)) return data.music;
  return [];
}

export function hasMusicCatalog() {
  return Boolean(getCatalogUrl());
}

export function createApiMusicAdapter({ fetchImpl = fetch, baseUrl = getCatalogUrl() } = {}) {
  return {
    async search(query, { limit = DEFAULT_LIMIT, signal } = {}) {
      const trimmed = String(query || "").trim();
      if (!trimmed) return [];
      if (!baseUrl) return [];

      const url = new URL(baseUrl);
      url.searchParams.set("q", trimmed);
      url.searchParams.set("limit", String(Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), 50)));

      const response = await fetchImpl(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal,
      });

      if (!response.ok) throw new Error(`Music catalog request failed (${response.status}).`);
      const data = await response.json();
      return extractItems(data).map(normalizeTrack).filter(Boolean);
    },
  };
}

export function createUnavailableMusicAdapter() {
  return {
    search() {
      return Promise.resolve([]);
    },
  };
}

export function createMusicAdapter(options = {}) {
  return hasMusicCatalog()
    ? createApiMusicAdapter(options)
    : createUnavailableMusicAdapter();
}
