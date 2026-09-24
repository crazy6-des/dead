import assert from "node:assert/strict";
import { createSpace, listSpaces, joinSpace, leaveSpace, endSpace, createSpaceMessage, listSpaceMessages } from "../src/spaces.js";
import { sha256Hex } from "../src/auth.js";

const normalizeSql = value => value.replace(/\s+/g," ").trim().toLowerCase();
const state={users:[{id:"u1",username:"alice",display_name:"Alice",avatar_url:null,deleted_at:null},{id:"u2",username:"bob",display_name:"Bob",avatar_url:null,deleted_at:null}],spaces:[],members:[],messages:[]};
const now="2026-09-24T10:00:00.000Z";
const db={
 prepare(query){const sql=normalizeSql(query);return {bind(...v){return {
  async first(){
   if(sql.startsWith("select s.id")) return v[0]===await sha256Hex("session-1")?{id:"sess",user_id:"u1",username:"alice",display_name:"Alice"}:null;
   if(sql.startsWith("select s.*,u.username as host_username") && sql.includes("from spaces s join users u")){const spaceId=v[0];const s=state.spaces.find(x=>String(x.id)===String(spaceId));const u=state.users.find(x=>x.id===s?.host_id);return s?{...s,host_username:u.username,host_display_name:u.display_name,host_avatar_url:u.avatar_url}:null;}
   if(sql.startsWith("select space_id,user_id,role")) return state.members.find(x=>x.space_id===v[0]&&x.user_id===v[1])||null;
   if(sql.startsWith("select count(*) as count from space_members")) return {count:state.members.filter(x=>x.space_id===v[0]&&!x.left_at).length};
   if(sql.startsWith("select 1 from relationships")) return null;
   if(sql.startsWith("select sm.space_id")) return state.members.find(x=>x.space_id===v[0]&&x.user_id===v[1]) ? {...state.members.find(x=>x.space_id===v[0]&&x.user_id===v[1]),status:state.spaces.find(s=>s.id===v[0])?.status}:null;
   if(sql.startsWith("select id,username,display_name,avatar_url")) return state.users.find(x=>x.id===v[0]);
   if(sql.startsWith("select s.host_id")) return state.spaces.find(x=>x.id===v[0])||null;
   return null;
  },
  async all(){
   if(sql.startsWith("select s.id,s.title")) return {results:state.spaces.map(s=>{const u=state.users.find(x=>x.id===s.host_id);return {...s,host_id:s.host_id,host_username:u.username,host_display_name:u.display_name,host_avatar_url:u.avatar_url,participant_count:state.members.filter(m=>m.space_id===s.id&&!m.left_at).length,joined:0,can_speak:0};})};
   if(sql.startsWith("select sm.user_id")) return {results:state.members.filter(m=>m.space_id===v[0]&&!m.left_at).map(m=>{const u=state.users.find(x=>x.id===m.user_id);return {...m,username:u.username,display_name:u.display_name,avatar_url:u.avatar_url};})};
   if(sql.startsWith("select m.id")) return {results:state.messages.filter(m=>m.space_id===v[0]).map(m=>{const u=state.users.find(x=>x.id===m.sender_id);return {...m,sender_id:m.sender_id,username:u.username,display_name:u.display_name,avatar_url:u.avatar_url};})};
   return {results:[]};
  },
  async run(){
   if(sql.startsWith("update spaces set status='live'")) return {success:true};
   if(sql.startsWith("insert into spaces")) state.spaces.push({id:v[0],host_id:v[1],title:v[2],status:v[3],scheduled_at:v[4],started_at:v[5],ended_at:null,created_at:v[6],updated_at:v[6],deleted_at:null});
   else if(sql.startsWith("insert into space_members")) state.members.push({space_id:v[0],user_id:v[1],role:v[2]||"listener",joined_at:now,last_seen_at:v[2]||now,left_at:null});
   else if(sql.startsWith("update space_members set left_at")) state.members.filter(m=>m.space_id===v[0]&&m.user_id===v[1]).forEach(m=>m.left_at=v[2]);
   else if(sql.startsWith("update space_members set last_seen_at")) state.members.filter(m=>m.space_id===v[0]&&m.user_id===v[1]).forEach(m=>m.last_seen_at=v[2]);
   else if(sql.startsWith("update spaces set status='ended'")) state.spaces.find(s=>s.id===v[0]).status="ended";
   else if(sql.startsWith("insert into space_messages")) state.messages.push({id:v[0],space_id:v[1],sender_id:v[2],body:v[3],created_at:v[4],deleted_at:null});
   return {success:true,meta:{changes:1}};
  },
};},async all(){return {results:[]}}};},
async batch(statements){for(const s of statements)await s.run();return statements.map(()=>({success:true}));}
};
const req=(path,init={})=>new Request("https://example.test"+path,{...init,headers:{Cookie:"s_session=session-1","content-type":"application/json",...(init.headers||{})}});
let result=await createSpace(req("/api/spaces",{method:"POST",body:JSON.stringify({title:"S Live Room"})}),{DB:db});
assert.equal(result.error,null); assert.equal(result.response.space.host,"Alice"); assert.equal(state.spaces.length,1);
const id=result.response.space.id; assert.ok(id); assert.equal(state.spaces[0].id,id);
result=await listSpaces(req("/api/spaces"),{DB:db}); assert.equal(result.response.items[0].participantCount,1);
result=await joinSpace(req("/api/spaces/"+id+"/join",{method:"POST"}),{DB:db}); assert.equal(result.error,null); assert.equal(result.response.space.role,"host");
const db2={...db,prepare(query){const base=db.prepare(query);return {bind(...v){const b=base.bind(...v);return {first:async()=>{if(sql.startsWith("select s.id"))return v[0]===await sha256Hex("session-2")?{id:"sess2",user_id:"u2",username:"bob",display_name:"Bob"}:null;return b.first()},all:()=>b.all(),run:()=>b.run()}}}}};
result=await joinSpace(req("/api/spaces/"+id+"/join",{method:"POST",headers:{Cookie:"s_session=session-2"}}),{DB:db2}); assert.equal(result.error,null);
result=await createSpaceMessage(req("/api/spaces/"+id+"/messages",{method:"POST",body:JSON.stringify({text:"Hello Space"})}),{DB:db2}); assert.equal(result.error,null); assert.equal(result.response.message.text,"Hello Space");
result=await listSpaceMessages(req("/api/spaces/"+id+"/messages"),{DB:db2}); assert.equal(result.response.items.length,1);
result=await leaveSpace(req("/api/spaces/"+id+"/leave",{method:"POST",headers:{Cookie:"s_session=session-2"}}),{DB:db2}); assert.equal(result.error,null);
result=await endSpace(req("/api/spaces/"+id+"/end",{method:"POST"}),{DB:db}); assert.equal(result.error,null); assert.equal(state.spaces[0].status,"ended");
console.log("Spaces persistence, authorization, membership, chat and lifecycle contracts: PASS");
