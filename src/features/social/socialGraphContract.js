export const SOCIAL_RELATIONSHIPS = Object.freeze({
  FOLLOW:"follow", FOLLOW_REQUEST:"follow_request", BLOCK:"block", MUTE:"mute", CLOSE_FRIEND:"close_friend"
});
export function normalizeUsername(value=""){ return String(value||"").replace(/^@/,"").trim().toLowerCase(); }
export function createRelationshipRequest({ username, relationship, enabled=true }={}) {
  return Object.freeze({ username:normalizeUsername(username), relationship, enabled:Boolean(enabled) });
}
export function createGraphPage(items=[], nextCursor=null){
  return Object.freeze({ items:Array.isArray(items)?items:[], nextCursor, hasMore:Boolean(nextCursor) });
}
