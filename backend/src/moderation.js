import { resolveSession } from "./auth.js";

const ACTIONS = new Set(["report","block","mute"]);
const TARGET_TYPES = new Set(["post","user","message"]);
const REASONS = new Set(["spam","abuse","hate","harassment","violence","sexual","misinformation","other"]);
const REPORT_RECIPIENT = "growthmedia70@gmail.com";
function failure(code,status,message){return {response:null,error:{code,status,message}};}
async function sendReportEmail(env,report){
  const apiKey=String(env?.BREVO_API_KEY||"").trim(), senderEmail=String(env?.BREVO_SENDER_EMAIL||"").trim(), senderName=String(env?.BREVO_SENDER_NAME||"sphere").trim()||"sphere";
  if(!apiKey||!senderEmail)return false;
  const escape=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const html=`<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>New S moderation report</h2><table cellpadding="6"><tr><td><b>Report ID</b></td><td>${escape(report.id)}</td></tr><tr><td><b>Reporter</b></td><td>@${escape(report.reporterUsername)}</td></tr><tr><td><b>Reported username</b></td><td>@${escape(report.targetUsername||"unknown")}</td></tr><tr><td><b>Target</b></td><td>${escape(report.targetType)} / ${escape(report.targetId)}</td></tr><tr><td><b>Content timestamp</b></td><td>${escape(report.targetCreatedAt||"unknown")}</td></tr><tr><td><b>Reason</b></td><td>${escape(report.reason)}</td></tr><tr><td><b>Note</b></td><td>${escape(report.note||"")}</td></tr><tr><td><b>Submitted</b></td><td>${escape(report.createdAt)}</td></tr><tr><td><b>URL</b></td><td>${escape(report.url||"")}</td></tr></table></div>`;
  const response=await fetch("https://api.brevo.com/v3/smtp/email",{method:"POST",headers:{"accept":"application/json","content-type":"application/json","api-key":apiKey},body:JSON.stringify({sender:{email:senderEmail,name:senderName},to:[{email:REPORT_RECIPIENT}],subject:`S report: ${report.reason} / ${report.targetType}`,htmlContent:html,textContent:`S moderation report\nReport ID: ${report.id}\nReporter: @${report.reporterUsername}\nReported username: @${report.targetUsername||"unknown"}\nTarget: ${report.targetType} / ${report.targetId}\nContent timestamp: ${report.targetCreatedAt||"unknown"}\nReason: ${report.reason}\nNote: ${report.note||""}\nSubmitted: ${report.createdAt}\nURL: ${report.url||""}`})});
  return response.ok;
}
export async function moderationAction(request,env){
  const session=await resolveSession(request,env); if(!session?.user_id)return failure("UNAUTHORIZED",401,"Authentication is required.");
  if(!env?.DB)return failure("SERVICE_UNAVAILABLE",503,"Moderation service is not configured.");
  let body;try{body=await request.json();}catch{return failure("INVALID_JSON",400,"Request body must be valid JSON.");}
  const action=String(body?.action||""), targetType=String(body?.targetType||"post"), targetId=String(body?.targetId||"").trim(), reason=String(body?.reason||"other").toLowerCase(), note=String(body?.note||"").trim().slice(0,2000);
  if(!ACTIONS.has(action)||!TARGET_TYPES.has(targetType)||!targetId)return failure("VALIDATION_ERROR",400,"A valid moderation action and target are required.");
  if(action==="report"&&!REASONS.has(reason))return failure("VALIDATION_ERROR",400,"A valid report reason is required.");
  if(targetType==="user"&&action!=="report"){
    const target=await env.DB.prepare("SELECT id,username FROM users WHERE username=?1 AND deleted_at IS NULL LIMIT 1").bind(targetId.replace(/^@/,"").toLowerCase()).first();
    if(!target)return failure("USER_NOT_FOUND",404,"User was not found.");
    if(target.id===session.user_id)return failure("INVALID_MODERATION",400,"You cannot moderate yourself.");
    const relationship=action==="block"?"block":"mute";
    await env.DB.prepare("INSERT OR IGNORE INTO relationships (source_user_id,target_user_id,relationship_type) VALUES (?1,?2,?3)").bind(session.user_id,target.id,relationship).run();
    if(action==="block")await env.DB.batch([env.DB.prepare("DELETE FROM relationships WHERE source_user_id=?1 AND target_user_id=?2 AND relationship_type='follow'").bind(session.user_id,target.id),env.DB.prepare("DELETE FROM relationships WHERE source_user_id=?1 AND target_user_id=?2 AND relationship_type='follow'").bind(target.id,session.user_id)]);
    return {response:{ok:true,action,targetType,targetId:target.username,enabled:true},error:null};
  }
  let targetRow=null;
  if(targetType==="post")targetRow=await env.DB.prepare("SELECT p.id,p.author_id,u.username,p.created_at FROM posts p JOIN users u ON u.id=p.author_id WHERE p.id=?1 AND p.deleted_at IS NULL LIMIT 1").bind(targetId).first();
  else if(targetType==="message")targetRow=await env.DB.prepare("SELECT m.id,m.sender_id,u.username,m.created_at FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id=?1 AND m.deleted_at IS NULL LIMIT 1").bind(targetId).first();
  if(!targetRow)return failure("TARGET_NOT_FOUND",404,"The reported content was not found.");
  if(action!=="report")return failure("INVALID_MODERATION",400,"This moderation action is only supported for users.");
  if(targetRow.author_id===session.user_id||targetRow.sender_id===session.user_id)return failure("INVALID_MODERATION",400,"You cannot report your own content.");
  const reporter=await env.DB.prepare("SELECT username FROM users WHERE id=?1 LIMIT 1").bind(session.user_id).first(), id=crypto.randomUUID(), createdAt=new Date().toISOString();
  await env.DB.prepare("INSERT INTO moderation_reports (id,reporter_id,target_type,target_id,reason,note,email_status,created_at) VALUES (?1,?2,?3,?4,?5,?6,'pending',?7)").bind(id,session.user_id,targetType,targetId,reason,note,createdAt).run();
  let emailStatus="not_configured";
  try{emailStatus=await sendReportEmail(env,{id,reporterUsername:reporter?.username||session.user_id,targetType,targetId,targetUsername:targetRow.username,targetCreatedAt:targetRow.created_at,reason,note,createdAt,url:request.url})?"sent":"not_configured";}catch(error){console.error("MODERATION_REPORT_EMAIL_FAILED",error);emailStatus="failed";}
  await env.DB.prepare("UPDATE moderation_reports SET email_status=?1 WHERE id=?2").bind(emailStatus,id).run();
  return {response:{ok:true,reportId:id,submitted:true,emailStatus:emailStatus==="sent"?"sent":"queued"},error:null};
}
