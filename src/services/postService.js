import { apiClient, hasApiBaseUrl } from "./apiClient";
import { createPublishPayload } from "../features/create/postContract";
import { validatePostDraft } from "../features/create/postValidation";
import { isLocalMediaAsset, isUploadReadyMediaAsset } from "../features/create/mediaContract";

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
  const assets = [
    ...(Array.isArray(payload.media) ? payload.media : []),
    ...(payload.audio ? [payload.audio] : []),
  ];

  if (assets.some(isLocalMediaAsset)) {
    const error = new Error("Media upload is not connected yet. Please publish text-only posts until the media upload service is enabled.");
    error.code = "MEDIA_UPLOAD_REQUIRED";
    throw error;
  }

  if (assets.some((asset) => !isUploadReadyMediaAsset(asset))) {
    const error = new Error("Media must be uploaded before this post can be published.");
    error.code = "MEDIA_NOT_UPLOAD_READY";
    throw error;
  }
}

export function createApiPostAdapter({ endpoint = "/api/posts" } = {}) {
  return {
    async publish(draft) {
      const payload = createPostRequest(draft);
      assertApiMediaReady(payload);
      return apiClient.post(endpoint, payload);
    },
  };
}

export function createDevPostAdapter({ onPublish = null } = {}) {
  return {
    async publish(draft) {
      const payload = createPostRequest(draft);
      if (typeof onPublish === "function") await onPublish(payload);
      return { post: payload, developmentOnly: true };
    },
  };
}

export function createPostAdapter(options = {}) {
  return hasApiBaseUrl() ? createApiPostAdapter(options) : createDevPostAdapter(options);
}
