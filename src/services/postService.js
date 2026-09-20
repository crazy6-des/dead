import { apiClient, hasApiBaseUrl } from "./apiClient";
import { createPublishPayload } from "../features/create/postContract";
import { validatePostDraft } from "../features/create/postValidation";

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

export function createApiPostAdapter({ endpoint = "/api/posts" } = {}) {
  return {
    async publish(draft) {
      return apiClient.post(endpoint, createPostRequest(draft));
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
