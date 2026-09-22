import { apiClient, hasApiBaseUrl } from "./apiClient.js";

function assertBackend() {
  if (!hasApiBaseUrl()) {
    const error = new Error("Replies are unavailable until the Cloudflare backend is connected.");
    error.code = "BACKEND_NOT_CONNECTED";
    throw error;
  }
}

export const replyService = Object.freeze({
  async list(postId, { limit = 30, cursor = null } = {}) {
    assertBackend();
    const result = await apiClient.get(`/api/posts/${encodeURIComponent(postId)}/replies`, {
      query: { limit, cursor },
    });
    return {
      items: Array.isArray(result?.items) ? result.items : [],
      nextCursor: result?.nextCursor || null,
    };
  },

  async create(postId, text) {
    assertBackend();
    const result = await apiClient.post(`/api/posts/${encodeURIComponent(postId)}/replies`, {
      text: String(text || "").trim(),
    });
    return result?.reply || null;
  },
});
