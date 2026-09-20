export const NOTIFICATION_CHANNELS = Object.freeze({ PUSH:"push", EMAIL:"email", IN_APP:"in_app" });
export const NOTIFICATION_EVENTS = Object.freeze({ LIKES:"likes", REPLIES:"replies", REPOSTS:"reposts", MENTIONS:"mentions", FOLLOWS:"follows", DMS:"direct_messages", RECOMMENDATIONS:"recommendations", LIVE:"live_events" });
export function createNotificationPreferences(values={}) {
  return Object.freeze(Object.fromEntries(Object.values(NOTIFICATION_EVENTS).map((event)=>[event, values[event] !== false])));
}
