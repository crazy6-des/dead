import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ArrowLeft, Headphones, Mic, MicOff, Plus, Radio, Search, Send, Users, X } from "lucide-react";
import { spaceService } from "../../services/spaceService.js";
import { SPACE_STATUSES } from "./spaceContract.js";

function Avatar({ name, src }) {
  if (src) return <img className="space-avatar" src={src} alt="" />;
  return <span className="space-avatar">{String(name || "S").charAt(0).toUpperCase()}</span>;
}

const LiveAudio = forwardRef(function LiveAudio({ space, userRole, onRoleChange, onChat, onPresence }, ref) {
  const wsRef = useRef(null), peersRef = useRef(new Map()), streamRef = useRef(null), audioRef = useRef(new Map());
  const [connection, setConnection] = useState("connecting");
  const [mic, setMic] = useState(false);
  const [error, setError] = useState("");
  const createPeer = async (remoteId, initiator) => {
    if (peersRef.current.has(remoteId)) return peersRef.current.get(remoteId);
    const pc = new RTCPeerConnection();
    peersRef.current.set(remoteId, pc);
    pc.onicecandidate = (event) => { if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({type:"signal",kind:"ice",targetUserId:remoteId,data:event.candidate})); };
    pc.ontrack = (event) => {
      let audio = audioRef.current.get(remoteId);
      if (!audio) { audio = new Audio(); audio.autoplay = true; audioRef.current.set(remoteId,audio); }
      audio.srcObject = event.streams[0];
    };
    if (streamRef.current) streamRef.current.getTracks().forEach((track) => pc.addTrack(track,streamRef.current));
    if (initiator) { const offer=await pc.createOffer(); await pc.setLocalDescription(offer); wsRef.current?.send(JSON.stringify({type:"signal",kind:"offer",targetUserId:remoteId,data:offer})); }
    return pc;
  };
  const enableMic = async () => {
    try {
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      streamRef.current=stream; setMic(true);
      for(const [id,pc] of peersRef.current){stream.getTracks().forEach((track)=>pc.addTrack(track,stream)); const offer=await pc.createOffer(); await pc.setLocalDescription(offer); wsRef.current?.send(JSON.stringify({type:"signal",kind:"offer",targetUserId:id,data:offer}));}
    } catch (err) { setError(err?.name==="NotAllowedError" ? "Microphone access was denied." : "Microphone is unavailable."); }
  };
  const disableMic = () => { streamRef.current?.getTracks().forEach((track)=>track.stop()); streamRef.current=null; setMic(false); };
  useImperativeHandle(ref, () => ({ sendChat(text) { if (wsRef.current?.readyState !== WebSocket.OPEN) return false; wsRef.current.send(JSON.stringify({type:"chat",text})); return true; } }), []);
  useEffect(() => {
    const ws=spaceService.websocket(space.id); wsRef.current=ws;
    ws.onopen=()=>setConnection("connected");
    ws.onerror=()=>{setConnection("error");setError("Live connection failed. Try leaving and rejoining.");};
    ws.onclose=()=>setConnection("disconnected");
    ws.onmessage=async(event)=>{
      let msg; try{msg=JSON.parse(event.data);}catch{return;}
      if(msg.type==="ready"){ for(const peer of msg.peers||[]) await createPeer(peer.userId,true); return; }
      if(msg.type==="signal"){
        const pc=await createPeer(msg.fromUserId,false);
        if(msg.kind==="offer"){await pc.setRemoteDescription(msg.data); const answer=await pc.createAnswer(); await pc.setLocalDescription(answer); ws.send(JSON.stringify({type:"signal",kind:"answer",targetUserId:msg.fromUserId,data:answer}));}
        else if(msg.kind==="answer") await pc.setRemoteDescription(msg.data);
        else if(msg.kind==="ice"){try{await pc.addIceCandidate(msg.data);}catch{}}
      }
      if(msg.type==="role" && msg.targetUserId){ onRoleChange(msg.targetUserId,msg.role); }
      if(msg.type==="chat" && msg.message){ onChat(msg.message); }
      if(msg.type==="presence"){ onPresence(); }
    };
    return ()=>{disableMic(); ws.close(); peersRef.current.forEach((pc)=>pc.close()); peersRef.current.clear(); audioRef.current.forEach((audio)=>{audio.pause();audio.srcObject=null;});audioRef.current.clear();};
  },[space.id]);
  return <div className="space-livebar">
    <span className={"space-connection "+connection}>{connection==="connected" ? "Live audio connected" : connection==="connecting" ? "Connecting live audio…" : "Live audio disconnected"}</span>
    {userRole==="host" || userRole==="speaker" ? <button className={mic?"primary":"outline"} onClick={mic?disableMic:enableMic}>{mic?<MicOff size={15}/>:<Mic size={15}/>} {mic?"Mute":"Speak"}</button> : <span className="space-listener-note"><Headphones size={14}/> Listening</span>}
    {error && <span className="space-live-error">{error}</span>}
  </div>;
}

function SpaceRoom({ space, onBack, onRefresh }) {
  const [detail,setDetail]=useState(space), [members,setMembers]=useState([]), [messages,setMessages]=useState([]), [text,setText]=useState(""), [error,setError]=useState("");
  const audioRef=useRef(null);
  const load=async()=>{try{const [next,membersData,msgs]=await Promise.all([spaceService.get(space.id),spaceService.members(space.id),spaceService.messages(space.id)]);setDetail(next);setMembers(membersData);setMessages(msgs);setError("");}catch(err){setError(err?.message||"Could not load this Space.");}};
  useEffect(()=>{load(); const timer=setInterval(()=>spaceService.heartbeat(space.id).catch(()=>{}),20000); return()=>clearInterval(timer);},[space.id]);
  const send=async()=>{const value=text.trim();if(!value)return;const sent=audioRef.current?.sendChat(value);if(!sent){setError("Live connection is not ready. Try again in a moment.");return;}setText("");};
  const leave=async()=>{try{await spaceService.leave(space.id);onBack();onRefresh();}catch(err){setError(err?.message||"Could not leave.");}};
  const end=async()=>{try{await spaceService.end(space.id);onBack();onRefresh();}catch(err){setError(err?.message||"Could not end the Space.");}};
  const roleChange=(userId,role)=>setMembers((all)=>all.map((m)=>m.id===userId?{...m,role}:m));
  return <div className="space-room">
    <header className="space-room__head"><button className="icon-btn" onClick={onBack} aria-label="Back to Spaces"><ArrowLeft/></button><div><small>{detail.status==="live"?"LIVE NOW":"SPACE"}</small><h2>{detail.title}</h2></div><button className="icon-btn" onClick={load} aria-label="Refresh Space"><Radio/></button></header>
    {error&&<div className="inline-notice" role="status">{error}</div>}
    <div className="space-room__grid">
      <section className="space-stage"><div className="space-host"><Avatar name={detail.host} src={detail.hostAvatarUrl}/><div><strong>{detail.host}</strong><span>@{detail.hostUsername} · Host</span></div></div><h3>{detail.title}</h3><p>Live audio on S. Speak, listen, and participate with the people in this Space.</p><LiveAudio ref={audioRef} space={detail} userRole={detail.role} onRoleChange={roleChange} onPresence={load}
      onChat={(message)=>setMessages((all)=>all.some((item)=>item.id===message.id)?all:[...all,{...message,text:message.text,sender:message.sender}])}/>{detail.role==="host"&&<button className="danger-outline" onClick={end}>End Space</button>}{detail.role!=="host"&&<button className="outline" onClick={leave}>Leave Space</button>}</section>
      <aside className="space-room__side"><div className="space-panel"><h3><Users size={15}/> Participants · {members.length}</h3>{members.map((m)=><div className="space-member" key={m.id}><Avatar name={m.name} src={m.avatarUrl}/><div><b>{m.name}</b><span>@{m.username} · {m.role}</span></div>{detail.role==="host"&&m.role!=="host"&&<button className="outline" onClick={()=>spaceService.setRole(detail.id,m.id,m.role==="speaker"?"listener":"speaker").then(()=>setMembers((all)=>all.map((x)=>x.id===m.id?{...x,role:x.role==="speaker"?"listener":"speaker"}:x))).catch(err=>setError(err?.message||"Could not change role."))}>{m.role==="speaker"?"Make listener":"Invite to speak"}</button>}</div>)}</div>
      <div className="space-panel space-chat"><h3>Conversation</h3><div className="space-chat__body">{messages.map((m)=><div className="space-chat__message" key={m.id}><b>{m.sender?.name||m.sender?.username}</b><span>{m.text}</span></div>)}</div><div className="space-chat__composer"><input value={text} onChange={(e)=>setText(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter")send();}} placeholder="Say something…" maxLength={2000}/><button className="primary" onClick={send} disabled={!text.trim()}><Send size={15}/></button></div></div></aside>
    </div>
  </div>;
}

export default function SpacesRoute() {
  const [spaces,setSpaces]=useState([]),[loading,setLoading]=useState(true),[creating,setCreating]=useState(false),[title,setTitle]=useState(""),[scheduledAt,setScheduledAt]=useState(""),[error,setError]=useState(""),[query,setQuery]=useState(""),[active,setActive]=useState(null);
  const load=async()=>{setLoading(true);try{const page=await spaceService.list({q:query});setSpaces(page.items||[]);setError("");}catch(err){setSpaces([]);setError(err?.message||"Could not load Spaces.");}finally{setLoading(false);}};
  useEffect(()=>{const timer=setTimeout(load,250);return()=>clearTimeout(timer);},[query]);
  const create=async()=>{if(!title.trim())return;try{const created=await spaceService.create({title,scheduledAt:scheduledAt?new Date(scheduledAt).toISOString():null});setTitle("");setScheduledAt("");setCreating(false);setActive(created);load();}catch(err){setError(err?.message||"Could not create the Space.");}};
  const join=async(space)=>{try{const joined=await spaceService.join(space.id);setActive(joined);load();}catch(err){setError(err?.message||"Could not join that Space.");}};
  if(active)return <div className="page"><SpaceRoom space={active} onBack={()=>setActive(null)} onRefresh={load}/></div>;
  return <div className="page">
    <div className="heading"><small>LIVE CONVERSATIONS</small><h2>Spaces</h2><p>Real-time audio conversations with real people on S.</p></div>
    <div className="space-toolbar"><div className="space-search"><Search size={16}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search Spaces, topics or hosts" aria-label="Search Spaces"/></div><button className="primary" onClick={()=>setCreating((v)=>!v)}><Plus size={16}/>Create a Space</button></div>
    {creating&&<section className="card composer-panel"><div className="heading"><small>NEW SPACE</small><h3>Start a conversation</h3></div><input value={title} onChange={(e)=>setTitle(e.target.value)} maxLength={120} placeholder="What do you want to talk about?" aria-label="Space title"/><label className="space-schedule">Optional start time<input type="datetime-local" value={scheduledAt} onChange={(e)=>setScheduledAt(e.target.value)}/></label><div className="composer-panel__footer"><button className="outline" onClick={()=>setCreating(false)}>Cancel</button><button className="primary" disabled={!title.trim()} onClick={create}><Mic size={16}/>Create Space</button></div></section>}
    {error&&<div className="inline-notice" role="status">{error}</div>}
    <section className="space-list">{loading?<div className="empty"><p>Loading Spaces…</p></div>:spaces.length?spaces.map((space)=><article className={"space-card "+(space.status==="live"?"is-live":"")} key={space.id}><div className="space-card__icon">{space.status==="live"?<Radio size={20}/>:<Headphones size={20}/>}</div><div className="space-card__body"><span className="space-card__status">{space.status==="live"?"LIVE NOW":"UPCOMING"}</span><h3>{space.title}</h3><p>Hosted by {space.host} · @{space.hostUsername}</p><small><Users size={14}/> {space.participantCount} active {space.participantCount===1?"participant":"participants"}</small></div><button className={space.status==="live"?"primary":"outline"} onClick={()=>space.status==="live"?join(space):setError("This Space is scheduled. Join it when it goes live.")}>{space.status==="live"?"Join live":"Scheduled"}</button></article>):<div className="empty"><h3>No Spaces found</h3><p>{query?"Try another title, topic or host.":"Create the first Space and start a real conversation."}</p></div>}</section>
  </div>;
}
