export const MODERATION_ACTIONS = Object.freeze({
  REPORT:"report", BLOCK:"block", MUTE:"mute", UNBLOCK:"unblock", UNMUTE:"unmute"
});
export const REPORT_REASONS = Object.freeze({
  SPAM:"spam", ABUSE:"abuse", HATE:"hate", HARASSMENT:"harassment", VIOLENCE:"violence", SEXUAL:"sexual", MISINFORMATION:"misinformation", OTHER:"other"
});
export function createModerationRequest({ targetType="post", targetId="", action=MODERATION_ACTIONS.REPORT, reason=null, note="" }={}) {
  return Object.freeze({ targetType, targetId:String(targetId), action, reason, note:String(note||"").trim() });
}
