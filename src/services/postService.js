import { apiClient, hasApiBaseUrl } from "./apiClient.js";
import { createPublishPayload, normalizeCreatedPostResponse } from "../features/create/postContract.js";
import { validatePostDraft } from "../features/create/postValidation.js";
import { isCatalogMusicAsset, isLocalMediaAsset, isUploadReadyMediaAsset } from "../features/create/mediaContract.js";

export function createPostRequest(draft) {
  const result = validatePostDraft(draft);
  if (!result.valid) {
    const error = new Error("Post draft is invalid.");
    error.code = "INVALID_POST_DRAFT";
    error.details = result.errors;
    throw error;
  }
  return createPublishPayload(result.payload);
}

function toPersistentMediaAsset(asset, media) {
  return {
    mediaId: media.mediaId,
    url: media.url,
    name: asset?.name || media.name || "",
    type: asset?.type || media.type || "",
    size: Number.isFinite(asset?.size) ? asset.size : Number(media.size || 0),
    source: "upload",
  };
}

async function prepareMediaAsset(asset) {
  if (isCatalogMusicAsset(asset)) return asset;
  if (isUploadReadyMediaAsset(asset)) {
    return {
      mediaId: asset.mediaId,
      url: asset.url,
      name: asset.name || "",
      type: asset.type || "",
      size: Number(asset.size || 0),
      source: "upload",
    };
  }
  if (!isLocalMediaAsset(asset) || !asset.file) return asset;

  const form = new FormData();
  form.append("file", asset.file, asset.file.name);
  try {
    const result = await apiClient.post("/api/media/upload", form);
    const media = result?.media;
    if (!media?.mediaId || !media?.url) throw new Error("Media upload returned an invalid response.");
    return toPersistentMediaAsset(asset, media);
  } catch (error) {
    if (error?.code === "NETWORK_ERROR" || error?.code === "REQUEST_TIMEOUT") {
      error.message = "Media upload failed. Check your connection and try again.";
    }
    throw error;
  }
}

async function cleanupUploadedMedia(assets = []) {
  const uploaded = assets.filter((asset) => isUploadReadyMediaAsset(asset) && asset.source === "upload" && asset.mediaId);
  await Promise.allSettled(uploaded.map((asset) => apiClient.delete(`/api/media/${encodeURIComponent(asset.mediaId)}`)));
}

async function preparePublishPayload(payload) {
  const preparedMedia = [];
  let preparedAudio = null;
  try {
    for (const asset of payload.media || []) {
      preparedMedia.push(await prepareMediaAsset(asset));
    }
    if (payload.audio) preparedAudio = await prepareMediaAsset(payload.audio);
    return { ...payload, media: preparedMedia, audio: preparedAudio };
  } catch (error) {
    await cleanupUploadedMedia([...preparedMedia, preparedAudio]);
    throw error;
  }
}

function assertApiMediaReady(payload) {
  const imageAssets = Array.isArray(payload.media) ? payload.media : [];
  const audioAsset = payload.audio;

  if (imageAssets.some(isLocalMediaAsset) || isLocalMediaAsset(audioAsset)) {
    const error = new Error("Media upload did not finish. Please try Publish again.");
    error.code = "MEDIA_UPLOAD_REQUIRED";
    throw error;
  }

  if (imageAssets.some((asset) => !isUploadReadyMediaAsset(asset))) {
    const error = new Error("Images must be uploaded before this post can be published.");
    error.code = "MEDIA_NOT_UPLOAD_READY";
    throw error;
  }

  if (audioAsset && !isUploadReadyMediaAsset(audioAsset) && !isCatalogMusicAsset(audioAsset)) {
    const error = new Error("Audio must be uploaded or selected from the music catalog before this post can be published.");
    error.code = "AUDIO_NOT_READY";
    throw error;
  }
}

export function createApiPostAdapter({ endpoint = "/api/posts" } = {}) {
  return {
    async publish(draft) {
      const payload = await preparePublishPayload(createPostRequest(draft));
      assertApiMediaReady(payload);
      try {
        return normalizeCreatedPostResponse(await apiClient.post(endpoint, payload));
      } catch (error) {
        await cleanupUploadedMedia([...payload.media, payload.audio]);
        throw error;
      }
    },
  };
}

function createDevelopmentPostId() {
  if (typeof crypto?.randomUUID === "function") return `dev-${crypto.randomUUID()}`;
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createDevPostAdapter({ onPublish = null } = {}) {
  return {
    async publish(draft) {
      const payload = createPostRequest(draft);
      const post = { ...payload, id: createDevelopmentPostId() };
      if (typeof onPublish === "function") await onPublish(post);
      return { post, developmentOnly: true };
    },
  };
}

export function createPostAdapter(options = {}) {
  if (!hasApiBaseUrl()) {
    const error = new Error("Publishing is unavailable until the Cloudflare backend is connected.");
    error.code = "BACKEND_NOT_CONNECTED";
    return { async publish() { throw error; } };
  }
  return createApiPostAdapter(options);
}
export async function publishQuotePost({ postId, text = "" } = {}) {
  if (!hasApiBaseUrl()) {
    const error = new Error("Quoting is unavailable until the Cloudflare backend is connected.");
    error.code = "BACKEND_NOT_CONNECTED";
    throw error;
  }
  const normalizedPostId = String(postId || "").trim();
  const normalizedText = String(text || "").trim();
  if (!normalizedPostId) throw new TypeError("A post ID is required.");
  if (!normalizedText) throw new TypeError("A quote must contain text.");
  return normalizeCreatedPostResponse(await apiClient.post("/api/posts", {
    text: normalizedText,
    kind: "text",
    quotedPostId: normalizedPostId,
    media: [],
    audio: null,
    background: null,
    audience: "public",
    replyPolicy: "everyone",
  }));
}


export const postService = Object.freeze({
  getById(postId, options = {}) {
    const id = String(postId || "").trim();
    if (!id) return Promise.reject(new TypeError("Post id is required."));
    return apiClient.get(`/api/posts/${encodeURIComponent(id)}`, options).then((result) => result?.post || null);
  },
});
