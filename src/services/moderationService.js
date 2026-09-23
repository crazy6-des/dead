import { apiClient, hasApiBaseUrl } from "./apiClient.js";
import { createModerationRequest } from "../features/moderation/moderationContract.js";

export function createApiModerationAdapter(client = apiClient) {
  const pending = new Set();
  const act = (input) => {
    const payload = createModerationRequest(input);
    const key = [payload.targetType, payload.targetId, payload.action, payload.reason || "", payload.note].join(":");
    if (pending.has(key)) {
      const error = new Error("This moderation action is already being submitted.");
      error.code = "MODERATION_ACTION_BUSY";
      return Promise.reject(error);
    }
    pending.add(key);
    return client.post("/api/moderation/actions", payload).finally(() => pending.delete(key));
  };
  return {
    act,
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
