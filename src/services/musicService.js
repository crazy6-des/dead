export function createApiMusicAdapter({ fetchImpl = fetch, baseUrl = getCatalogUrl() } = {}) {
  return {
    async search(query, { limit = DEFAULT_LIMIT, signal } = {}) {
      const trimmed = String(query || "").trim();
      if (!trimmed) return [];
      const payload = hasApiBaseUrl()
        ? await apiClient.get("/api/music/search", { query: { query: trimmed, limit }, signal })
        : await requestDirect(baseUrl, { query: trimmed, limit }, { fetchImpl, signal });
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

import { createCatalogMusicAsset } from "../features/create/mediaContract.js";
import { apiClient, hasApiBaseUrl } from "./apiClient.js";

const DEFAULT_LIMIT = 12;
const AUDIUS_STREAM_PATH = "/api/music/stream";

function getCatalogUrl() {
  return String(import.meta.env?.VITE_MUSIC_CATALOG_URL || "").trim();
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
      licenseUrl: String(track.permalink || "https://audius.co").trim(),
    });
  } catch {
    return null;
  }
}

