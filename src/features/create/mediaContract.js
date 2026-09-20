/**
 * Media transport contract for S.
 *
 * Browser File objects and blob: preview URLs are local-only. They must never
 * be treated as persistent media URLs by the post API.
 *
 * Music can eventually come from two distinct sources:
 * - local: a browser File selected by the user;
 * - catalog: an API-selected track referenced by musicId.
 * Keeping those sources explicit prevents the future catalog API from being
 * coupled to the local file picker.
 */

export const MEDIA_UPLOAD_STATUS = Object.freeze({
  LOCAL: "local",
  UPLOADED: "uploaded",
});

export const MEDIA_SOURCES = Object.freeze({
  LOCAL: "local",
  CATALOG: "catalog",
});

export function isLocalMediaAsset(asset) {
  return Boolean(
    asset
      && typeof asset === "object"
      && ((typeof File !== "undefined" && asset.file instanceof File) || String(asset.url || "").startsWith("blob:"))
  );
}

export function isUploadReadyMediaAsset(asset) {
  return Boolean(
    asset
      && typeof asset === "object"
      && typeof asset.mediaId === "string"
      && asset.mediaId.length > 0
      && typeof asset.url === "string"
      && asset.url.length > 0
      && !String(asset.url).startsWith("blob:")
  );
}

export function isCatalogMusicAsset(asset) {
  return Boolean(
    asset
      && typeof asset === "object"
      && asset.source === MEDIA_SOURCES.CATALOG
      && typeof asset.musicId === "string"
      && asset.musicId.length > 0
      && typeof asset.url === "string"
      && /^https?:\/\//i.test(asset.url)
      && !String(asset.url).startsWith("blob:")
  );
}

export function createLocalMediaAsset(file) {
  if (!(file instanceof File)) throw new TypeError("A File is required.");
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    url: URL.createObjectURL(file),
    file,
    uploadStatus: MEDIA_UPLOAD_STATUS.LOCAL,
    source: MEDIA_SOURCES.LOCAL,
  };
}

export function createUploadedMediaAsset({ mediaId, url, name, type, size }) {
  if (!mediaId || !url) throw new Error("Uploaded media requires mediaId and url.");
  return {
    mediaId,
    url,
    name: name || "",
    type: type || "",
    size: Number.isFinite(size) ? size : 0,
    uploadStatus: MEDIA_UPLOAD_STATUS.UPLOADED,
  };
}

export function createCatalogMusicAsset({
  musicId,
  url,
  title,
  artist = "",
  album = "",
  type = "audio/mpeg",
  durationMs = 0,
} = {}) {
  if (!musicId || !url) throw new Error("Catalog music requires musicId and url.");
  if (!/^https?:\/\//i.test(String(url))) throw new Error("Catalog music requires an HTTP(S) URL.");
  return {
    source: MEDIA_SOURCES.CATALOG,
    musicId,
    url,
    name: title || "Untitled track",
    title: title || "Untitled track",
    artist,
    album,
    type,
    size: 0,
    durationMs: Number.isFinite(durationMs) ? durationMs : 0,
  };
}
