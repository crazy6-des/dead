import { apiClient, hasApiBaseUrl } from "./apiClient.js";
import { createNotificationRequest, normalizeNotification } from "../features/notifications/notificationContract.js";
export function createApiNotificationAdapter(client = apiClient) {
  return { list(request = {}) { const params = createNotificationRequest(request); return client.get("/api/notifications", params).then((page) => ({ ...page, items:(page?.items || []).map(normalizeNotification) })); } };
}
export function createDevNotificationAdapter(seed = []) {
  return { list(request = {}) { const params = createNotificationRequest(request); let items = seed.map(normalizeNotification); if (params.filter === "Mentions") items = items.filter((n) => n.type === "mention" || n.type === "reply"); if (params.filter === "Verified") items = items.filter((n) => n.verified); return Promise.resolve({ items, nextCursor:null, hasMore:false }); } };
}
export function createNotificationAdapter({ client = apiClient, devSeed = [] } = {}) { return hasApiBaseUrl() ? createApiNotificationAdapter(client) : createDevNotificationAdapter(devSeed); }
export const notificationService = createNotificationAdapter();
