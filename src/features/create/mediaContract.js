/**
 * Media transport contract for S.
 *
 * Browser File objects and blob: preview URLs are local-only. They must never
 * be treated as persistent media URLs by the post API.
 */

export const MEDIA_UPLOAD_STATUS = Object.freeze({
  LOCAL: "local",
  UPLOADED: "uploaded",
});

export function isLocalMediaAsset(asset) {
  return Boolean(
    asset
      && typeof asset === "object"
      && (asset.file instanceof File || String(asset.url || "").startsWith("blob:"))
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

export function createLocalMediaAsset(file) {
  if (!(file instanceof File)) throw new TypeError("A File is required.");
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    url: URL.createObjectURL(file),
    file,
    uploadStatus: MEDIA_UPLOAD_STATUS.LOCAL,
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
