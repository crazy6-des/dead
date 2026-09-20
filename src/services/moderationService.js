import { apiClient, hasApiBaseUrl } from "./apiClient.js";
import { createModerationRequest } from "../features/moderation/moderationContract.js";

export function createApiModerationAdapter(client = apiClient) {
  return {
    act(input) {
      const payload = createModerationRequest(input);
      return client.post("/api/moderation/actions", payload);
    },
    report(input) {
      return this.act({ ...input, action: "report" });
    },
    block(targetId, targetType = "user") {
      return this.act({ targetId, targetType, action: "block" });
    },
    mute(targetId, targetType = "user") {
      return this.act({ targetId, targetType, action: "mute" });
    },
  };
}

export function createDevModerationAdapter() {
  const actions = [];
  return {
    act(input) {
      const payload = createModerationRequest(input);
      actions.push(payload);
      return Promise.resolve({ ok: true, ...payload });
    },
    report(input) { return this.act({ ...input, action: "report" }); },
    block(targetId, targetType = "user") { return this.act({ targetId, targetType, action: "block" }); },
    mute(targetId, targetType = "user") { return this.act({ targetId, targetType, action: "mute" }); },
  };
}

export function createModerationAdapter({ client = apiClient } = {}) {
  return hasApiBaseUrl() ? createApiModerationAdapter(client) : createDevModerationAdapter();
}

export const moderationService = createModerationAdapter();
