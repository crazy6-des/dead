import { apiClient, hasApiBaseUrl } from "./apiClient.js";
import { createNotificationRequest, createNotificationReadRequest, normalizeNotification } from "../features/notifications/notificationContract.js";

export function createApiNotificationAdapter(client = apiClient) {
  return {
    list(request = {}) {
      const params = createNotificationRequest(request);
      return client.get("/api/notifications", { query: params }).then((page) => ({
        ...page,
        items: (page?.items || []).map(normalizeNotification),
      }));
    },
    markRead(id) {
      return client.post("/api/notifications/read", createNotificationReadRequest({ id }));
    },
    markAllRead() {
      return client.post("/api/notifications/read-all");
    },
  };
}

export function createDevNotificationAdapter(seed = []) {
  let items = seed.map(normalizeNotification);
  return {
    list(request = {}) {
      const params = createNotificationRequest(request);
      let visible = items;
      if (params.filter === "Mentions") visible = visible.filter((n) => n.type === "mention" || n.type === "reply");
      if (params.filter === "Verified") visible = visible.filter((n) => n.verified);
      return Promise.resolve({ items: visible, nextCursor: null, hasMore: false });
    },
    markRead(id) {
      const target = String(id || "");
      items = items.map((item) => item.id === target ? normalizeNotification({ ...item, read: true }) : item);
      return Promise.resolve({ ok: true, id: target });
    },
    markAllRead() {
      items = items.map((item) => normalizeNotification({ ...item, read: true }));
      return Promise.resolve({ ok: true });
    },
  };
}

export function createNotificationAdapter({ client = apiClient, devSeed = [] } = {}) {
  return hasApiBaseUrl() ? createApiNotificationAdapter(client) : createDevNotificationAdapter(devSeed);
}

export const notificationService = createNotificationAdapter();
