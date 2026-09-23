import { apiClient, hasApiBaseUrl } from "./apiClient.js";

export function createApiPollAdapter(client = apiClient) {
  const busy = new Set();
  return {
    vote(pollId, optionIndex) {
      const key = String(pollId);
      if (busy.has(key)) return Promise.reject(Object.assign(new Error("Vote already being submitted."), { code: "POLL_VOTE_BUSY" }));
      busy.add(key);
      return client.post("/api/polls/" + encodeURIComponent(key) + "/votes", { optionIndex }).finally(() => busy.delete(key));
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
