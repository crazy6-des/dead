import { apiClient } from "./apiClient.js";

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
const MAX_LENGTHS = Object.freeze({ displayName: 60, bio: 160, website: 200, location: 100, avatarUrl: 500, coverUrl: 500 });

function text(value, field) {
  if (typeof value !== "string" || value.length > MAX_LENGTHS[field]) throw new TypeError(`Invalid ${field}.`);
  return value.trim();
}

function normalizeUsername(value) {
  const username = String(value || "").trim().replace(/^@/, "").toLowerCase();
  if (!USERNAME_PATTERN.test(username)) throw new TypeError("Username must contain 3–30 lowercase letters, numbers, or underscores.");
  return username;
}

export function normalizeProfilePatch(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Profile update must be an object.");
  const output = {};
  if ("displayName" in input) output.displayName = text(input.displayName, "displayName");
  if ("bio" in input) output.bio = text(input.bio, "bio");
  if ("website" in input) output.website = text(input.website, "website");
  if ("location" in input) output.location = text(input.location, "location");
  if ("username" in input) output.username = normalizeUsername(input.username);
  for (const field of ["avatarUrl", "coverUrl"]) {
    if (!(field in input)) continue;
    if (input[field] !== null) output[field] = text(input[field], field);
    else output[field] = null;
  }
  if (!Object.keys(output).length) throw new TypeError("At least one profile field is required.");
  return output;
}

export const profileService = Object.freeze({
  getMe(options = {}) {
    return apiClient.get("/api/profile/me", options);
  },
  getByUsername(username, options = {}) {
    return apiClient.get(`/api/profile/${encodeURIComponent(normalizeUsername(username))}`, options);
  },
  listPosts(username, tab = "posts", options = {}) {
    const normalized = normalizeUsername(username);
    const params = new URLSearchParams({ tab: String(tab || "posts").toLowerCase() });
    return apiClient.get(`/api/profile/${encodeURIComponent(normalized)}/posts?${params.toString()}`, options);
  },
  updateMe(input, options = {}) {
    return apiClient.patch("/api/profile/me", normalizeProfilePatch(input), options);
  },
});
