import { DurableObject } from "cloudflare:workers";
import { resolveSession } from "./auth.js";

export class SpaceRoom {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  async fetch(request) {
    if (request.headers.get("Upgrade") !== "websocket") return new Response("Expected WebSocket", {status:426});
    const userId = request.headers.get("X-S-User-Id"), username = request.headers.get("X-S-Username");
    const spaceId = request.headers.get("X-S-Space-Id");
    if (!userId || !username || !spaceId) return new Response("Unauthorized", {status:401});
    const pair = new WebSocketPair();
    const [, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [`user:${userId}`, `space:${spaceId}`]);
    server.serializeAttachment({userId,username,spaceId});
    const peers = this.ctx.getWebSockets().map((ws) => ws.deserializeAttachment() || {}).filter((peer) => peer.userId && peer.userId !== userId);
    server.send(JSON.stringify({type:"ready",userId,peers:peers.map((peer)=>({userId:peer.userId,username:peer.username}))}));
    await this.env.DB.prepare("UPDATE space_members SET last_seen_at=?3 WHERE space_id=?1 AND user_id=?2 AND left_at IS NULL").bind(spaceId,userId,new Date().toISOString()).run();
    this.broadcast({type:"presence",action:"joined",userId,username});
    return new Response(null,{status:101,webSocket:pair[0]});
  }
  broadcast(payload, except=null) {
    const data=JSON.stringify(payload);
    for(const ws of this.ctx.getWebSockets()) {
      if(ws!==except && ws.readyState===WebSocket.OPEN) { try{ws.send(data);}catch{}}
    }
  }
  async webSocketMessage(ws, message) {
    let payload; try{payload=JSON.parse(typeof message==="string"?message:new TextDecoder().decode(message));}catch{return;}
    const attachment=ws.deserializeAttachment()||{};
    if(payload.type==="signal" && ["offer","answer","ice"].includes(payload.kind)) {
      const target=String(payload.targetUserId||"");
      if(!target)return;
      for(const peer of this.ctx.getWebSockets()) {
        const peerInfo=peer.deserializeAttachment()||{};
        if(peerInfo.userId===target && peer.readyState===WebSocket.OPEN) peer.send(JSON.stringify({type:"signal",kind:payload.kind,fromUserId:attachment.userId,data:payload.data}));
      }
      return;
    }
    if(payload.type==="chat" && typeof payload.text==="string") {
      const text=payload.text.trim().slice(0,2000); if(!text)return;
      const result=await this.env.DB.prepare("SELECT sm.space_id,sm.user_id,sm.left_at,s.status FROM space_members sm JOIN spaces s ON s.id=sm.space_id WHERE sm.space_id=?1 AND sm.user_id=?2 LIMIT 1").bind(attachment.spaceId,attachment.userId).first();
      if(!result || result.left_at || result.status==="ended")return;
      const createdAt=new Date().toISOString(),id=crypto.randomUUID();
      await this.env.DB.prepare("INSERT INTO space_messages (id,space_id,sender_id,body,created_at) VALUES (?1,?2,?3,?4,?5)").bind(id,attachment.spaceId,attachment.userId,text,createdAt).run();
      this.broadcast({type:"chat",message:{id,text,createdAt,sender:{id:attachment.userId,username:attachment.username}}});
      return;
    }
    if(payload.type==="role" && ["speaker","listener"].includes(payload.role)) {
      const space=await this.env.DB.prepare("SELECT host_id FROM spaces WHERE id=?1 AND deleted_at IS NULL").bind(attachment.spaceId).first();
      if(space?.host_id!==attachment.userId)return;
      const target=String(payload.targetUserId||""); 
      await this.env.DB.prepare("UPDATE space_members SET role=?3 WHERE space_id=?1 AND user_id=?2 AND left_at IS NULL").bind(attachment.spaceId,target,payload.role).run();
      this.broadcast({type:"role",targetUserId:target,role:payload.role});
    }
  }
  async webSocketClose(ws) {
    const info=ws.deserializeAttachment()||{};
    if(info.userId && info.spaceId) {
      const timestamp=new Date().toISOString();
      await this.env.DB.prepare("UPDATE space_members SET left_at=?3 WHERE space_id=?1 AND user_id=?2 AND left_at IS NULL").bind(info.spaceId,info.userId,timestamp).run();
      this.broadcast({type:"presence",action:"left",userId:info.userId,username:info.username});
    }
  }
  async webSocketError(ws,error){ console.error("SPACE_WS_ERROR",error); }
}

export async function upgradeSpaceWebSocket(request,env,spaceId) {
  const user=await resolveSession(request,env);
  if(!user?.user_id)return {response:new Response(JSON.stringify({error:{code:"UNAUTHORIZED",message:"Authentication is required."}}),{status:401,headers:{"content-type":"application/json"}})};
  const member=await env.DB.prepare("SELECT role,left_at FROM space_members WHERE space_id=?1 AND user_id=?2 LIMIT 1").bind(spaceId,user.user_id).first();
  const space=await env.DB.prepare("SELECT id,status FROM spaces WHERE id=?1 AND deleted_at IS NULL LIMIT 1").bind(spaceId).first();
  if(!space)return {response:new Response("Space not found",{status:404})};
  if(!member || member.left_at)return {response:new Response("Join the Space first",{status:403})};
  if(space.status==="ended")return {response:new Response("Space has ended",{status:409})};
  const id=env.SPACE_ROOM.idFromName(spaceId), stub=env.SPACE_ROOM.get(id);
  const headers=new Headers(request.headers);
  headers.set("X-S-User-Id",user.user_id); headers.set("X-S-Username",user.username); headers.set("X-S-Space-Id",spaceId);
  return {response:await stub.fetch(new Request(request.url,{headers}))};
}
