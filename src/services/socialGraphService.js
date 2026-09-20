import { apiClient, hasApiBaseUrl } from "./apiClient.js";
import {
  SOCIAL_RELATIONSHIPS,
  createGraphPage,
  createRelationshipRequest,
  normalizeUsername,
} from "../features/social/socialGraphContract.js";

export function createApiSocialGraphAdapter(client = apiClient) {
  return {
    setRelationship(input) {
      const payload = createRelationshipRequest(input);
      return client.post("/api/social/relationships", payload);
    },
    listFollowers(username, request = {}) {
      const user = normalizeUsername(username);
      return client.get("/api/users/" + encodeURIComponent(user) + "/followers", { query: request })
        .then((page) => createGraphPage(page?.items || [], page?.nextCursor || null));
    },
    listFollowing(username, request = {}) {
      const user = normalizeUsername(username);
      return client.get("/api/users/" + encodeURIComponent(user) + "/following", { query: request })
        .then((page) => createGraphPage(page?.items || [], page?.nextCursor || null));
    },
  };
}

export function createDevSocialGraphAdapter(seed = {}) {
  const relationships = new Map(
    Object.entries(seed).map(([username, values]) => [
      normalizeUsername(username),
      new Set(Array.isArray(values) ? values.map(normalizeUsername).filter(Boolean) : []),
    ]),
  );

  const getSet = (username) => {
    const key = normalizeUsername(username);
    if (!relationships.has(key)) relationships.set(key, new Set());
    return relationships.get(key);
  };

  return {
    setRelationship(input = {}) {
      const payload = createRelationshipRequest(input);
      const set = getSet(payload.username);
      if (payload.enabled) set.add(payload.relationship);
      else set.delete(payload.relationship);
      return Promise.resolve({ ok: true, ...payload, relationships: [...set] });
    },
    listFollowers() {
      return Promise.resolve(createGraphPage([]));
    },
    listFollowing(username) {
      return Promise.resolve(createGraphPage([...getSet(username)].map((username) => ({ username }))));
    },
  };
}

export function createSocialGraphAdapter({ client = apiClient, devSeed = {} } = {}) {
  return hasApiBaseUrl() ? createApiSocialGraphAdapter(client) : createDevSocialGraphAdapter(devSeed);
}

export const socialGraphService = createSocialGraphAdapter();

export { SOCIAL_RELATIONSHIPS };
