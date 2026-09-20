import { apiClient, hasApiBaseUrl } from "./apiClient.js";

export function createApiPollAdapter(client = apiClient) {
  return {
    vote(pollId, optionIndex) {
      return client.post("/api/polls/" + encodeURIComponent(String(pollId)) + "/votes", { optionIndex });
    },
  };
}

export function createDevPollAdapter() {
  const votes = new Map();
  return {
    vote(pollId, optionIndex) {
      votes.set(String(pollId), Number(optionIndex));
      return Promise.resolve({ ok: true, pollId: String(pollId), optionIndex: Number(optionIndex) });
    },
  };
}

export function createPollAdapter({ client = apiClient } = {}) {
  return hasApiBaseUrl() ? createApiPollAdapter(client) : createDevPollAdapter();
}

export const pollService = createPollAdapter();
