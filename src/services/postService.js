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

function assertApiMediaReady(payload) {
  const imageAssets = Array.isArray(payload.media) ? payload.media : [];
  const audioAsset = payload.audio;

  if (imageAssets.some(isLocalMediaAsset) || isLocalMediaAsset(audioAsset)) {
    const error = new Error("Media upload is not connected yet. Please publish text-only posts until the media upload service is enabled.");
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
      const payload = createPostRequest(draft);
      assertApiMediaReady(payload);
      return normalizeCreatedPostResponse(await apiClient.post(endpoint, payload));
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
    return {
      async publish() {
        throw error;
      },
    };
  }

  return createApiPostAdapter(options);
}
