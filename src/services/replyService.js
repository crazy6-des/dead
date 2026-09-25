import { apiClient, hasApiBaseUrl } from "./apiClient.js";

function assertBackend() {
  if (!hasApiBaseUrl()) {
    const error = new Error("Replies are unavailable until the Cloudflare backend is connected.");
    error.code = "BACKEND_NOT_CONNECTED";
    throw error;
  }
}

const pendingReplies = new Set();

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

  async update(replyId, text) {\n    assertBackend();\n    const id = String(replyId || "").trim();\n    const normalizedText = String(text || "").trim();\n    if (!id || !normalizedText) throw new TypeError("Reply id and text are required.");\n    const result = await apiClient.patch(`/api/posts/${encodeURIComponent(id)}`, { text: normalizedText });\n    return result?.reply || result?.post || null;\n  },\n\n  async delete(replyId) {\n    assertBackend();\n    const id = String(replyId || "").trim();\n    if (!id) throw new TypeError("Reply id is required.");\n    return apiClient.delete(`/api/posts/${encodeURIComponent(id)}`);\n  },\n\n  async create(postId, text) {
    assertBackend();
    const normalizedPostId = String(postId || "").trim();
    const normalizedText = String(text || "").trim();
    const key = normalizedPostId + ":" + normalizedText;
    if (pendingReplies.has(key)) {
      const error = new Error("This reply is already being submitted.");
      error.code = "REPLY_SUBMISSION_BUSY";
      throw error;
    }
    pendingReplies.add(key);
    try {
      const result = await apiClient.post(`/api/posts/${encodeURIComponent(normalizedPostId)}/replies`, { text: normalizedText });
      return result?.reply || null;
    } finally {
      pendingReplies.delete(key);
    }
  },
});
