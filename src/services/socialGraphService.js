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
      return client.get("/api/users/" + encodeURIComponent(user) + "/followers", request)
        .then((page) => createGraphPage(page?.items || [], page?.nextCursor || null));
    },
    listFollowing(username, request = {}) {
      const user = normalizeUsername(username);
      return client.get("/api/users/" + encodeURIComponent(user) + "/following", request)
        .then((page) => createGraphPage(page?.items || [], page?.nextCursor || null));
    },
  };
}

export function createDevSocialGraphAdapter(seed = {}) {
  const relationships = new Map(
    Object.entries(seed).map(([username, values]) => [
      normalizeUsername(username),
      new Set(Array.isArray(values) ? values : []),
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
      const set = getSet(username);
      return Promise.resolve(createGraphPage([...set].map((relationship) => ({ relationship }))));
    },
  };
}

export function createSocialGraphAdapter({ client = apiClient, devSeed = {} } = {}) {
  return hasApiBaseUrl() ? createApiSocialGraphAdapter(client) : createDevSocialGraphAdapter(devSeed);
}

export const socialGraphService = createSocialGraphAdapter();

export { SOCIAL_RELATIONSHIPS };
