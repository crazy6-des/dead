import { resolveSession } from "./auth.js";

const MAX_TITLE = 120;
const MAX_MESSAGE = 2000;
const PRESENCE_TTL_SECONDS = 45;

function failure(code, status, message) { return { response: null, error: { code, status, message } }; }
function now() { return new Date().toISOString(); }
function cleanTitle(value) { return String(value || "").trim().replace(/\s+/g, " ").slice(0, MAX_TITLE); }
function cleanMessage(value) { return String(value || "").trim().slice(0, MAX_MESSAGE); }

async function session(request, env) {
  const value = await resolveSession(request, env);
  return value?.user_id ? value : null;
}

function participantQuery() {
  return "(SELECT COUNT(*) FROM space_members sm WHERE sm.space_id=s.id AND sm.left_at IS NULL AND sm.last_seen_at >= datetime('now', ?1))";
}

export async function listSpaces(request, env) {
  const user = await session(request, env);
  if (!user) return failure("UNAUTHORIZED", 401, "Authentication is required.");
  const url = new URL(request.url);
  const q = String(url.searchParams.get("q") || "").trim().slice(0, 80);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 20), 1), 50);
  const like = "%" + q.replace(/[\\%_]/g, "\\$&") + "%";
  const result = await env.DB.prepare(
    `SELECT s.id,s.title,s.status,s.scheduled_at,s.started_at,s.ended_at,s.created_at,s.updated_at,
      u.id AS host_id,u.username AS host_username,u.display_name AS host_display_name,u.avatar_url AS host_avatar_url,
      ${participantQuery()} AS participant_count,
      EXISTS(SELECT 1 FROM space_members me WHERE me.space_id=s.id AND me.user_id=?2 AND me.left_at IS NULL) AS joined,
      EXISTS(SELECT 1 FROM space_members sp WHERE sp.space_id=s.id AND sp.user_id=?2 AND sp.role IN ('host','speaker') AND sp.left_at IS NULL) AS can_speak
      FROM spaces s JOIN users u ON u.id=s.host_id
      WHERE s.deleted_at IS NULL AND s.status != 'ended'
      AND (s.title LIKE ?3 ESCAPE '\\' OR u.username LIKE ?3 ESCAPE '\\' OR u.display_name LIKE ?3 ESCAPE '\\')
      ORDER BY CASE s.status WHEN 'live' THEN 0 ELSE 1 END, s.updated_at DESC LIMIT ?4`
  ).bind("-" + PRESENCE_TTL_SECONDS + " seconds", user.user_id, like, limit).all();
  return { response: { items: result.results.map(spaceRow), nextCursor: null }, error: null };
}

function spaceRow(row) {
  return {
    id: row.id, title: row.title, status: row.status,
    startAt: row.scheduled_at, startedAt: row.started_at, endedAt: row.ended_at,
    host: row.host_display_name || row.host_username, hostUsername: row.host_username,
    hostAvatarUrl: row.host_avatar_url, participantCount: Number(row.participant_count || 0),
    joined: Boolean(row.joined), canSpeak: Boolean(row.can_speak),
  };
}

async function getSpace(env, id) {
  return env.DB.prepare("SELECT s.*,u.username AS host_username,u.display_name AS host_display_name,u.avatar_url AS host_avatar_url FROM spaces s JOIN users u ON u.id=s.host_id WHERE s.id=?1 AND s.deleted_at IS NULL LIMIT 1").bind(id).first();
}

async function membership(env, spaceId, userId) {
  return env.DB.prepare("SELECT space_id,user_id,role,left_at,last_seen_at FROM space_members WHERE space_id=?1 AND user_id=?2 LIMIT 1").bind(spaceId,userId).first();
}

export async function createSpace(request, env) {
  const user = await session(request, env);
  if (!user) return failure("UNAUTHORIZED",401,"Authentication is required.");
  let body; try { body = await request.json(); } catch { return failure("INVALID_JSON",400,"Request body must be valid JSON."); }
  const title = cleanTitle(body?.title);
  if (title.length < 1) return failure("VALIDATION_ERROR",400,"A Space title is required.");
  const scheduledAt = body?.scheduledAt ? new Date(body.scheduledAt).toISOString() : null;
  if (scheduledAt && Number.isNaN(Date.parse(scheduledAt))) return failure("VALIDATION_ERROR",400,"scheduledAt must be a valid date.");
  const id = crypto.randomUUID(), createdAt = now(), status = scheduledAt && Date.parse(scheduledAt) > Date.now() ? "scheduled" : "live";
  const startedAt = status === "live" ? createdAt : null;
  await env.DB.batch([
    env.DB.prepare("INSERT INTO spaces (id,host_id,title,status,scheduled_at,started_at,created_at,updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?7)").bind(id,user.user_id,title,status,scheduledAt,startedAt,createdAt),
    env.DB.prepare("INSERT INTO space_members (space_id,user_id,role,last_seen_at) VALUES (?1,?2,'host',?3)").bind(id,user.user_id,createdAt),
  ]);
  const created = await getSpace(env,id);
  return { response: { space: spaceDetail(created, 1, "host") }, error: null };
}

function spaceDetail(row, participantCount = 0, role = null) {
  return { id:row.id,title:row.title,status:row.status,startAt:row.scheduled_at,startedAt:row.started_at,endedAt:row.ended_at,host:row.host_display_name || row.host_username,hostUsername:row.host_username,hostAvatarUrl:row.host_avatar_url,participantCount,role };
}

export async function getSpaceDetail(request, env, id) {
  const user = await session(request,env); if(!user)return failure("UNAUTHORIZED",401,"Authentication is required.");
  const row=await getSpace(env,id); if(!row)return failure("NOT_FOUND",404,"Space was not found.");
  const role=await membership(env,id,user.user_id);
  const count=await env.DB.prepare("SELECT COUNT(*) AS count FROM space_members WHERE space_id=?1 AND left_at IS NULL AND last_seen_at >= datetime('now', ?2)").bind(id,"-"+PRESENCE_TTL_SECONDS+" seconds").first();
  return {response:{space:spaceDetail(row,Number(count?.count||0),role?.left_at?null:role?.role)},error:null};
}

export async function joinSpace(request,env,id) {
  const user=await session(request,env); if(!user)return failure("UNAUTHORIZED",401,"Authentication is required.");
  const row=await getSpace(env,id); if(!row)return failure("NOT_FOUND",404,"Space was not found.");
  if(row.status==="ended")return failure("SPACE_ENDED",409,"This Space has ended.");
  const blocked=await env.DB.prepare("SELECT 1 FROM relationships WHERE relationship_type='block' AND ((source_user_id=?1 AND target_user_id=?2) OR (source_user_id=?2 AND target_user_id=?1)) LIMIT 1").bind(user.user_id,row.host_id).first();
  if(blocked)return failure("FORBIDDEN",403,"You cannot join this Space.");
  const current=await membership(env,id,user.user_id);
  const timestamp=now();
  if(current?.left_at) await env.DB.prepare("UPDATE space_members SET left_at=NULL,last_seen_at=?3 WHERE space_id=?1 AND user_id=?2").bind(id,user.user_id,timestamp).run();
  else if(!current) await env.DB.prepare("INSERT INTO space_members (space_id,user_id,role,last_seen_at) VALUES (?1,?2,'listener',?3)").bind(id,user.user_id,timestamp).run();
  else await env.DB.prepare("UPDATE space_members SET last_seen_at=?3 WHERE space_id=?1 AND user_id=?2").bind(id,user.user_id,timestamp).run();
  return getSpaceDetail(request,env,id);
}

export async function leaveSpace(request,env,id) {
  const user=await session(request,env); if(!user)return failure("UNAUTHORIZED",401,"Authentication is required.");
  const row=await getSpace(env,id); if(!row)return failure("NOT_FOUND",404,"Space was not found.");
  const member=await membership(env,id,user.user_id); if(!member || member.left_at)return {response:{ok:true},error:null};
  if(member.role==="host")return failure("HOST_CANNOT_LEAVE",409,"The host must end the Space.");
  await env.DB.prepare("UPDATE space_members SET left_at=?3 WHERE space_id=?1 AND user_id=?2").bind(id,user.user_id,now()).run();
  return {response:{ok:true},error:null};
}

export async function heartbeatSpace(request,env,id) {
  const user=await session(request,env); if(!user)return failure("UNAUTHORIZED",401,"Authentication is required.");
  const member=await membership(env,id,user.user_id); if(!member || member.left_at)return failure("NOT_JOINED",409,"Join the Space first.");
  await env.DB.prepare("UPDATE space_members SET last_seen_at=?3 WHERE space_id=?1 AND user_id=?2").bind(id,user.user_id,now()).run();
  return {response:{ok:true},error:null};
}

export async function endSpace(request,env,id) {
  const user=await session(request,env); if(!user)return failure("UNAUTHORIZED",401,"Authentication is required.");
  const row=await getSpace(env,id); if(!row)return failure("NOT_FOUND",404,"Space was not found.");
  if(row.host_id!==user.user_id)return failure("FORBIDDEN",403,"Only the host can end this Space.");
  if(row.status==="ended")return {response:{ok:true},error:null};
  const ended=now();
  await env.DB.batch([
    env.DB.prepare("UPDATE spaces SET status='ended',ended_at=?2,updated_at=?2 WHERE id=?1").bind(id,ended),
    env.DB.prepare("UPDATE space_members SET left_at=?2 WHERE space_id=?1 AND left_at IS NULL").bind(id,ended),
  ]);
  return {response:{ok:true,endedAt:ended},error:null};
}

export async function listSpaceMembers(request,env,id) {
  const user=await session(request,env); if(!user)return failure("UNAUTHORIZED",401,"Authentication is required.");
  const member=await membership(env,id,user.user_id); if(!member || member.left_at)return failure("FORBIDDEN",403,"Join the Space first.");
  const result=await env.DB.prepare("SELECT sm.user_id,sm.role,u.username,u.display_name,u.avatar_url FROM space_members sm JOIN users u ON u.id=sm.user_id WHERE sm.space_id=?1 AND sm.left_at IS NULL AND sm.last_seen_at >= datetime('now', ?2) ORDER BY CASE sm.role WHEN 'host' THEN 0 WHEN 'speaker' THEN 1 ELSE 2 END,u.display_name").bind(id,"-"+PRESENCE_TTL_SECONDS+" seconds").all();
  return {response:{items:result.results.map(r=>({id:r.user_id,username:r.username,name:r.display_name,avatarUrl:r.avatar_url,role:r.role}))},error:null};
}

export async function listSpaceMessages(request,env,id) {
  const user=await session(request,env); if(!user)return failure("UNAUTHORIZED",401,"Authentication is required.");
  const member=await membership(env,id,user.user_id); if(!member || member.left_at)return failure("FORBIDDEN",403,"Join the Space first.");
  const result=await env.DB.prepare("SELECT m.id,m.body,m.created_at,u.id AS sender_id,u.username,u.display_name,u.avatar_url FROM space_messages m JOIN users u ON u.id=m.sender_id WHERE m.space_id=?1 AND m.deleted_at IS NULL ORDER BY m.created_at DESC LIMIT 100").bind(id).all();
  return {response:{items:result.results.reverse().map(r=>({id:r.id,text:r.body,createdAt:r.created_at,sender:{id:r.sender_id,username:r.username,name:r.display_name,avatarUrl:r.avatar_url}}))},error:null};
}

export async function createSpaceMessage(request,env,id) {
  const user=await session(request,env); if(!user)return failure("UNAUTHORIZED",401,"Authentication is required.");
  const member=await membership(env,id,user.user_id); if(!member || member.left_at)return failure("FORBIDDEN",403,"Join the Space first.");
  const row=await getSpace(env,id); if(!row || row.status==="ended")return failure("SPACE_ENDED",409,"This Space has ended.");
  let body;try{body=await request.json();}catch{return failure("INVALID_JSON",400,"Request body must be valid JSON.");}
  const text=cleanMessage(body?.text); if(!text)return failure("VALIDATION_ERROR",400,"Message text is required.");
  const idValue=crypto.randomUUID(),createdAt=now();
  await env.DB.prepare("INSERT INTO space_messages (id,space_id,sender_id,body,created_at) VALUES (?1,?2,?3,?4,?5)").bind(idValue,id,user.user_id,text,createdAt).run();
  const sender=await env.DB.prepare("SELECT id,username,display_name,avatar_url FROM users WHERE id=?1").bind(user.user_id).first();
  return {response:{message:{id:idValue,text,createdAt,sender:{id:sender.id,username:sender.username,name:sender.display_name,avatarUrl:sender.avatar_url}}},error:null};
}

export async function setSpaceRole(request,env,id,targetUserId) {
  const user=await session(request,env);if(!user)return failure("UNAUTHORIZED",401,"Authentication is required.");
  const row=await getSpace(env,id);if(!row)return failure("NOT_FOUND",404,"Space was not found.");
  if(row.host_id!==user.user_id)return failure("FORBIDDEN",403,"Only the host can change roles.");
  if(targetUserId===user.user_id)return failure("INVALID_ROLE",400,"The host role cannot be changed.");
  const member=await membership(env,id,targetUserId);if(!member || member.left_at)return failure("NOT_FOUND",404,"Participant was not found.");
  let body;try{body=await request.json();}catch{return failure("INVALID_JSON",400,"Request body must be valid JSON.");}
  const role=String(body?.role||"listener");if(!["speaker","listener"].includes(role))return failure("VALIDATION_ERROR",400,"Role must be speaker or listener.");
  await env.DB.prepare("UPDATE space_members SET role=?3 WHERE space_id=?1 AND user_id=?2").bind(id,targetUserId,role).run();
  return {response:{ok:true,role},error:null};
}
