export const SPACE_STATUSES = Object.freeze({ SCHEDULED: "scheduled", LIVE: "live", ENDED: "ended" });

export function createSpace({ id=null, title="", host="", status=SPACE_STATUSES.SCHEDULED, startAt=null, participants=[] }={}) {
  return Object.freeze({ id, title: String(title).trim(), host, status, startAt, participants: Array.isArray(participants) ? participants : [] });
}

export function createSpaceRequest({ title="", startAt=null, host="" }={}) {
  return Object.freeze({ title: String(title).trim(), startAt, host });
}

export function createSpacePage(items=[], nextCursor=null) {
  return Object.freeze({ items: Array.isArray(items) ? items : [], nextCursor, hasMore: Boolean(nextCursor) });
}
