import { resolveSession } from "./auth.js";
import { serializePost } from "./posts.js";

function failure(code,status,message){return {response:null,error:{code,status,message}};}
async function sessionOrFailure(request,env){const session=await resolveSession(request,env);if(!session?.user_id)return{session:null,failure:failure("UNAUTHORIZED",401,"Authentication is required.")};if(!env?.DB)return{session:null,failure:failure("SERVICE_UNAVAILABLE",503,"Library service is not configured.")};return{session,failure:null};}
function id(){return globalThis.crypto.randomUUID();}
function clean(value,max=80){return String(value||"").trim().slice(0,max);}
function postVisibilitySql(userId){return "(p.author_id=?1 OR p.visibility='public' OR (p.visibility='followers' AND EXISTS (SELECT 1 FROM relationships f WHERE f.source_user_id=?1 AND f.target_user_id=p.author_id AND f.relationship_type='follow')))";}

export async function listBookmarkFolders(request,env){
 const {session,failure:af}=await sessionOrFailure(request,env);if(af)return af;
 const rows=await env.DB.prepare("SELECT f.id,f.name,f.description,f.created_at,COUNT(i.post_id) AS item_count FROM bookmark_folders f LEFT JOIN bookmark_folder_items i ON i.folder_id=f.id WHERE f.user_id=?1 GROUP BY f.id ORDER BY f.created_at DESC").bind(session.user_id).all();
 return {response:{items:(rows.results||[]).map(r=>({...r,itemCount:Number(r.item_count||0)}))},error:null};
}
export async function createBookmarkFolder(request,env){
 const {session,failure:af}=await sessionOrFailure(request,env);if(af)return af;let b;try{b=await request.json();}catch{return failure("INVALID_JSON",400,"Request body must be valid JSON.");}
 const name=clean(b?.name,80);const description=clean(b?.description,200);if(!name)return failure("VALIDATION_ERROR",400,"Folder name is required.");
 const folderId=id();try{await env.DB.prepare("INSERT INTO bookmark_folders(id,user_id,name,description) VALUES(?1,?2,?3,?4)").bind(folderId,session.user_id,name,description).run();}catch(e){if(String(e?.message||e).toLowerCase().includes("unique"))return failure("CONFLICT",409,"A folder with that name already exists.");throw e;}
 return {response:{id:folderId,name,description,itemCount:0},error:null};
}
export async function addBookmark(request,env){
 const {session,failure:af}=await sessionOrFailure(request,env);if(af)return af;let b;try{b=await request.json();}catch{return failure("INVALID_JSON",400,"Request body must be valid JSON.");}
 const postId=clean(b?.postId,120);const folderId=b?.folderId?clean(b.folderId,120):null;if(!postId)return failure("VALIDATION_ERROR",400,"A post id is required.");
 const post=await env.DB.prepare("SELECT id,author_id,visibility,deleted_at FROM posts WHERE id=?1 LIMIT 1").bind(postId).first();if(!post||post.deleted_at)return failure("POST_NOT_FOUND",404,"Post was not found.");
 if(post.author_id!==session.user_id&&post.visibility!=="public"){const ok=post.visibility==="followers"&&await env.DB.prepare("SELECT 1 FROM relationships WHERE source_user_id=?1 AND target_user_id=?2 AND relationship_type='follow'").bind(session.user_id,post.author_id).first();if(!ok)return failure("FORBIDDEN",403,"This post is not available.");}
 if(folderId){const folder=await env.DB.prepare("SELECT id FROM bookmark_folders WHERE id=?1 AND user_id=?2").bind(folderId,session.user_id).first();if(!folder)return failure("FOLDER_NOT_FOUND",404,"Bookmark folder was not found.");}
 await env.DB.batch([
  env.DB.prepare("INSERT OR IGNORE INTO bookmarks(user_id,post_id) VALUES(?1,?2)").bind(session.user_id,postId),
  ...(folderId?[env.DB.prepare("INSERT OR IGNORE INTO bookmark_folder_items(folder_id,user_id,post_id) VALUES(?1,?2,?3)").bind(folderId,session.user_id,postId)]:[]),
 ]);
 return {response:{ok:true,postId,folderId},error:null};
}
export async function removeBookmark(request,env,postId){
 const {session,failure:af}=await sessionOrFailure(request,env);if(af)return af;postId=clean(postId,120);
 await env.DB.batch([env.DB.prepare("DELETE FROM bookmarks WHERE user_id=?1 AND post_id=?2").bind(session.user_id,postId),env.DB.prepare("DELETE FROM bookmark_folder_items WHERE user_id=?1 AND post_id=?2").bind(session.user_id,postId)]);
 return {response:{ok:true,postId},error:null};
}
export async function listBookmarks(request,env){
 const {session,failure:af}=await sessionOrFailure(request,env);if(af)return af;const u=new URL(request.url);const folderId=u.searchParams.get("folderId");
 let sql=`SELECT p.id,p.author_id,p.body,p.visibility,p.reply_policy,p.post_kind,p.background_json,p.quoted_post_id,p.created_at,p.updated_at,u.username,u.display_name,
 (SELECT json_group_array(json_object('id',m.id,'mediaType',m.media_type,'mimeType',m.mime_type,'url',COALESCE(m.external_url,'/api/media/'||m.id),'source',m.source,'metadata',m.metadata_json,'durationMs',m.duration_ms)) FROM post_media m WHERE m.post_id=p.id ORDER BY m.position) AS media,
 (SELECT COUNT(*) FROM post_reactions r WHERE r.post_id=p.id AND r.reaction_type='like') AS like_count,
 (SELECT COUNT(*) FROM post_reactions r WHERE r.post_id=p.id AND r.reaction_type='repost') AS repost_count,
 (SELECT COUNT(*) FROM posts rp WHERE rp.reply_to_id=p.id AND rp.deleted_at IS NULL) AS reply_count,
 (SELECT COUNT(*) FROM bookmarks b2 WHERE b2.post_id=p.id) AS bookmark_count
 FROM bookmarks b JOIN posts p ON p.id=b.post_id JOIN users u ON u.id=p.author_id
 WHERE b.user_id=?1 AND p.deleted_at IS NULL AND ${postVisibilitySql(session.user_id)}${folderId?" AND EXISTS (SELECT 1 FROM bookmark_folder_items fi WHERE fi.folder_id=?2 AND fi.user_id=?1 AND fi.post_id=p.id)":""}
 ORDER BY b.created_at DESC LIMIT 50`;
 const rows=folderId?await env.DB.prepare(sql).bind(session.user_id,folderId).all():await env.DB.prepare(sql).bind(session.user_id).all();
 return {response:{items:(rows.results||[]).map(serializePost),folderId:folderId||null},error:null};
}

export async function listLists(request,env){
 const {session,failure:af}=await sessionOrFailure(request,env);if(af)return af;
 const rows=await env.DB.prepare("SELECT l.id,l.name,l.description,l.visibility,l.created_at,l.updated_at,(SELECT COUNT(*) FROM list_members m WHERE m.list_id=l.id) AS member_count,(SELECT COUNT(*) FROM list_followers f WHERE f.list_id=l.id) AS follower_count FROM lists l WHERE l.owner_id=?1 OR l.visibility='public' ORDER BY l.updated_at DESC LIMIT 50").bind(session.user_id).all();
 return {response:{items:(rows.results||[]).map(r=>({...r,memberCount:Number(r.member_count||0),followerCount:Number(r.follower_count||0)}))},error:null};
}
export async function createList(request,env){
 const {session,failure:af}=await sessionOrFailure(request,env);if(af)return af;let b;try{b=await request.json();}catch{return failure("INVALID_JSON",400,"Request body must be valid JSON.");}
 const name=clean(b?.name,25);const description=clean(b?.description,200);const visibility=b?.visibility==="private"?"private":"public";if(!name||/^\d/.test(name))return failure("VALIDATION_ERROR",400,"List name is required and cannot begin with a number.");
 const listId=id();try{await env.DB.prepare("INSERT INTO lists(id,owner_id,name,description,visibility) VALUES(?1,?2,?3,?4,?5)").bind(listId,session.user_id,name,description,visibility).run();}catch(e){if(String(e?.message||e).toLowerCase().includes("unique"))return failure("CONFLICT",409,"A list with that name already exists.");throw e;}
 return {response:{id:listId,name,description,visibility,members:[],memberCount:0,followerCount:0,ownerUsername:null},error:null};
}
export async function updateList(request,env,listId){
 const {session,failure:af}=await sessionOrFailure(request,env);if(af)return af;let b;try{b=await request.json();}catch{return failure("INVALID_JSON",400,"Request body must be valid JSON.");}
 const existing=await env.DB.prepare("SELECT id FROM lists WHERE id=?1 AND owner_id=?2").bind(listId,session.user_id).first();if(!existing)return failure("LIST_NOT_FOUND",404,"List was not found.");
 const name=clean(b?.name,25),description=clean(b?.description,200),visibility=b?.visibility==="private"?"private":"public";if(!name||/^\d/.test(name))return failure("VALIDATION_ERROR",400,"List name is required and cannot begin with a number.");
 await env.DB.prepare("UPDATE lists SET name=?1,description=?2,visibility=?3,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?4 AND owner_id=?5").bind(name,description,visibility,listId,session.user_id).run();
 return {response:{id:listId,name,description,visibility},error:null};
}
export async function deleteList(request,env,listId){
 const {session,failure:af}=await sessionOrFailure(request,env);if(af)return af;await env.DB.prepare("DELETE FROM lists WHERE id=?1 AND owner_id=?2").bind(listId,session.user_id).run();return {response:{ok:true,id:listId},error:null};
}
export async function addListMember(request,env,listId){
 const {session,failure:af}=await sessionOrFailure(request,env);if(af)return af;let b;try{b=await request.json();}catch{return failure("INVALID_JSON",400,"Request body must be valid JSON.");}
 const list=await env.DB.prepare("SELECT id,visibility FROM lists WHERE id=?1 AND owner_id=?2").bind(listId,session.user_id).first();if(!list)return failure("LIST_NOT_FOUND",404,"List was not found.");
 const username=clean(b?.username,40).replace(/^@/,"").toLowerCase();const user=await env.DB.prepare("SELECT id,username,display_name FROM users WHERE username=?1 AND deleted_at IS NULL").bind(username).first();if(!user)return failure("USER_NOT_FOUND",404,"User was not found.");if(user.id===session.user_id)return failure("VALIDATION_ERROR",400,"You cannot add yourself to a list.");
 await env.DB.prepare("INSERT OR IGNORE INTO list_members(list_id,user_id) VALUES(?1,?2)").bind(listId,user.id).run();
 return {response:{ok:true,listId,member:{id:user.id,username:user.username,displayName:user.display_name}},error:null};
}
export async function removeListMember(request,env,listId,userId){
 const {session,failure:af}=await sessionOrFailure(request,env);if(af)return af;const list=await env.DB.prepare("SELECT id FROM lists WHERE id=?1 AND owner_id=?2").bind(listId,session.user_id).first();if(!list)return failure("LIST_NOT_FOUND",404,"List was not found.");
 await env.DB.prepare("DELETE FROM list_members WHERE list_id=?1 AND user_id=?2").bind(listId,userId).run();return {response:{ok:true,listId,userId},error:null};
}
export async function getList(request,env,listId){
 const {session,failure:af}=await sessionOrFailure(request,env);if(af)return af;const list=await env.DB.prepare("SELECT l.*,u.username AS owner_username,u.display_name AS owner_display_name FROM lists l JOIN users u ON u.id=l.owner_id WHERE l.id=?1 AND (l.owner_id=?2 OR l.visibility='public')").bind(listId,session.user_id).first();if(!list)return failure("LIST_NOT_FOUND",404,"List was not found.");
 const members=await env.DB.prepare("SELECT u.id,u.username,u.display_name FROM list_members m JOIN users u ON u.id=m.user_id WHERE m.list_id=?1 ORDER BY m.created_at DESC").bind(listId).all();
 return {response:{...list,members:members.results||[]},error:null};
}
export async function listListPosts(request,env,listId){
 const detail=await getList(request,env,listId);if(detail.error)return detail;
 const memberIds=(detail.response.members||[]).map(m=>m.id);if(!memberIds.length)return {response:{items:[],list:detail.response},error:null};
 const placeholders=memberIds.map(()=>"?").join(",");
 const rows=await env.DB.prepare(`SELECT p.id,p.author_id,p.body,p.visibility,p.reply_policy,p.post_kind,p.background_json,p.quoted_post_id,p.created_at,p.updated_at,u.username,u.display_name,
 (SELECT json_group_array(json_object('id',m.id,'mediaType',m.media_type,'mimeType',m.mime_type,'url',COALESCE(m.external_url,'/api/media/'||m.id),'source',m.source,'metadata',m.metadata_json,'durationMs',m.duration_ms)) FROM post_media m WHERE m.post_id=p.id ORDER BY m.position) media,
 (SELECT COUNT(*) FROM post_reactions r WHERE r.post_id=p.id AND r.reaction_type='like') like_count,
 (SELECT COUNT(*) FROM post_reactions r WHERE r.post_id=p.id AND r.reaction_type='repost') repost_count,
 (SELECT COUNT(*) FROM posts rp WHERE rp.reply_to_id=p.id AND rp.deleted_at IS NULL) reply_count,
 (SELECT COUNT(*) FROM bookmarks b2 WHERE b2.post_id=p.id) bookmark_count
 FROM posts p JOIN users u ON u.id=p.author_id WHERE p.deleted_at IS NULL AND p.author_id IN (${placeholders}) AND p.visibility='public' ORDER BY p.created_at DESC LIMIT 50`).bind(...memberIds).all();
 return {response:{items:(rows.results||[]).map(serializePost),list:detail.response},error:null};
}
