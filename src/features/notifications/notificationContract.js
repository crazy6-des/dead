export const NOTIFICATION_TYPES = Object.freeze({ LIKE:"like", FOLLOW:"follow", REPLY:"reply", MENTION:"mention", REPOST:"repost", QUOTE:"quote", SYSTEM:"system" });
export const NOTIFICATION_FILTERS = Object.freeze({ ALL:"All", MENTIONS:"Mentions", VERIFIED:"Verified" });
export const NOTIFICATION_FILTERS = Object.freeze({ ALL:"All", MENTIONS:"Mentions", VERIFIED:"Verified" });
export function createNotificationRequest({ cursor = null, filter = NOTIFICATION_FILTERS.ALL } = {}) {
  return Object.freeze({ cursor, filter, limit: 30 });
}
export function normalizeNotification(value = {}) {
  return Object.freeze({
    id: String(value.id ?? ""),
    type: value.type || NOTIFICATION_TYPES.SYSTEM,
    actor: value.actor || value.name || "S",
    text: String(value.text || ""),
    time: value.time || "now",
    verified: Boolean(value.verified),
    read: Boolean(value.read),
    target: value.target || null,
  });
}
