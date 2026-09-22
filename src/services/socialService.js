import { apiClient } from "./apiClient.js";

const ACTIONS = new Set(["like", "repost", "bookmark"]);
const RELATIONSHIPS = new Set(["follow", "block", "mute"]);

function assertAction(action) {
  if (!ACTIONS.has(action)) throw new TypeError("Unsupported social action.");
}

function assertRelationship(relationship) {
  if (!RELATIONSHIPS.has(relationship)) throw new TypeError("Unsupported relationship.");
}

export const socialService = Object.freeze({
  setPostAction(postId, action, enabled = true) {
    assertAction(action);
    const normalizedPostId = String(postId || "").trim();
    if (!normalizedPostId) throw new TypeError("A post ID is required.");
    const path = `/api/social/posts/${encodeURIComponent(normalizedPostId)}/${action}`;
    return enabled
      ? apiClient.post(path, { enabled: true })
      : apiClient.delete(path);
  },

  sharePostWithFollowers(postId) { const normalizedPostId = String(postId || "").trim(); if (!normalizedPostId) throw new TypeError("A post ID is required."); return apiClient.post(`/api/social/posts/${encodeURIComponent(normalizedPostId)}/share`); },

  setRelationship(username, relationship, enabled) {
    assertRelationship(relationship);
    const normalizedUsername = String(username || "").replace(/^@/, "").trim();
    if (!normalizedUsername) throw new TypeError("A username is required.");
    return apiClient.post("/api/social/relationships", {
      username: normalizedUsername,
      relationship,
      enabled: enabled === true,
    });
  },
});
