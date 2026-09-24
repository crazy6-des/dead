export const SPACE_STATUSES = Object.freeze({ SCHEDULED: "scheduled", LIVE: "live", ENDED: "ended" });
export function createSpace({ id=null,title="",host="",hostUsername="",hostAvatarUrl=null,status=SPACE_STATUSES.SCHEDULED,startAt=null,startedAt=null,endedAt=null,participantCount=0,joined=false,canSpeak=false,role=null }={}) {
  return Object.freeze({ id,title:String(title).trim(),host,hostUsername,hostAvatarUrl,status,startAt,startedAt,endedAt,participantCount:Number(participantCount)||0,joined:Boolean(joined),canSpeak:Boolean(canSpeak),role });
}
export function createSpaceRequest({ title="",startAt=null }={}) { return Object.freeze({ title:String(title).trim(),startAt }); }
export function createSpacePage(items=[],nextCursor=null){return Object.freeze({items:Array.isArray(items)?items:[],nextCursor,hasMore:Boolean(nextCursor)});}
