import React, { useEffect, useState } from "react";
import { Plus, Bookmark, Folder, Users, Trash2, UserPlus, X } from "lucide-react";
import { bookmarkService } from "../../services/bookmarkService.js";
import { listService } from "../../services/listService.js";

function BookmarkFoldersRoute({ onOpen }) {
  const [folders,setFolders]=useState([]),[saved,setSaved]=useState([]),[name,setName]=useState(""),[selected,setSelected]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const load=async(folderId=null)=>{setLoading(true);try{const [fs,bs]=await Promise.all([bookmarkService.listFolders(),bookmarkService.listSaved(folderId?{folderId}: {})]);setFolders(fs?.items||[]);setSaved(bs?.items||[]);setError("");}catch(e){setError(e?.message||"Could not load bookmarks.");}finally{setLoading(false);}};
  useEffect(()=>{let active=true;Promise.resolve().then(()=>{if(active) return load();});return()=>{active=false;};},[]);
  const createFolder=async()=>{const value=name.trim();if(!value)return;try{const folder=await bookmarkService.createFolder({name:value});setFolders(v=>[folder,...v]);setName("");setError("");}catch(e){setError(e?.message||"Could not create the folder.");}};
  const remove=async(postId)=>{try{await bookmarkService.remove(postId);setSaved(v=>v.filter(p=>p.id!==postId));setFolders(v=>v.map(f=>({...f,itemCount:Math.max(0,Number(f.itemCount||0)-1)})));}catch(e){setError(e?.message||"Could not remove bookmark.");}};
  return <div className="page"><div className="heading"><small>YOUR LIBRARY</small><h2>Bookmarks</h2><p>Private saved posts, organized into folders.</p></div>
    <div className="card"><div className="page-actions"><input value={name} onChange={e=>setName(e.target.value)} placeholder="New folder name" aria-label="New folder name"/><button className="primary" onClick={createFolder} disabled={!name.trim()}><Plus size={16}/>Create folder</button></div>
      {error&&<div className="inline-notice" role="status">{error}</div>}
      <button className={"network-row "+(!selected?"active":"")} onClick={()=>{setSelected(null);load();}}><span className="avatar avatar--small"><Bookmark size={17}/></span><span><b>All Bookmarks</b><small>Every post you have saved</small></span></button>
      {folders.map(f=><button className={"network-row "+(selected===f.id?"active":"")} key={f.id} onClick={()=>{setSelected(f.id);load(f.id);}}><span className="avatar avatar--small"><Folder size={17}/></span><span><b>{f.name}</b><small>{Number(f.itemCount||0)} saved {Number(f.itemCount||0)===1?"post":"posts"}</small></span></button>)}
    </div>
    <div className="card"><div className="heading"><small>{selected?"FOLDER":"SAVED"}</small><h3>{selected?(folders.find(f=>f.id===selected)?.name||"Folder"):"All Bookmarks"}</h3></div>
      {loading?<div className="empty"><p>Loading bookmarks…</p></div>:saved.length?saved.map(post=><article className="topic-post" key={post.id}><button onClick={()=>onOpen?.("/post/"+encodeURIComponent(post.id))}><b>{post.a||post.displayName||post.username}</b><p>{post.x||post.text||""}</p></button><button className="icon-btn" onClick={()=>remove(post.id)} aria-label="Remove bookmark" title="Remove bookmark"><Trash2 size={16}/></button></article>):<div className="empty"><p>No saved posts here yet.</p></div>}
    </div></div>;
}

export function ListsRoute({ onOpen }) {
 const [lists,setLists]=useState([]),[selected,setSelected]=useState(null),[detail,setDetail]=useState(null),[posts,setPosts]=useState([]),[name,setName]=useState(""),[member,setMember]=useState(""),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=async()=>{setLoading(true);try{const p=await listService.list();setLists(p?.items||[]);setError("");}catch(e){setError(e?.message||"Could not load lists.");}finally{setLoading(false);}};
 useEffect(()=>{let active=true;Promise.resolve().then(()=>{if(active) return load();});return()=>{active=false;};},[]);
 const open=async(id)=>{setSelected(id);try{const [d,p]=await Promise.all([listService.get(id),listService.posts(id)]);setDetail(d);setPosts(p?.items||[]);setError("");}catch(e){setError(e?.message||"Could not open list.");}};
 const create=async()=>{const value=name.trim();if(!value)return;try{const l=await listService.create({name:value,description:""});setLists(v=>[l,...v]);setName("");setError("");open(l.id);}catch(e){setError(e?.message||"Could not create list.");}};
 const add=async()=>{if(!selected||!member.trim())return;try{await listService.addMember(selected,member.trim());setMember("");await open(selected);await load();}catch(e){setError(e?.message||"Could not add member.");}};
 const remove=async(userId)=>{try{await listService.removeMember(selected,userId);await open(selected);await load();}catch(e){setError(e?.message||"Could not remove member.");}};
 const del=async()=>{if(!selected)return;try{await listService.remove(selected);setSelected(null);setDetail(null);setPosts([]);await load();}catch(e){setError(e?.message||"Could not delete list.");}};
 return <div className="page"><div className="heading"><small>YOUR NETWORK</small><h2>Lists</h2><p>Focused timelines built from accounts you choose.</p></div>
  <div className="page-actions"><input value={name} onChange={e=>setName(e.target.value)} placeholder="New list name" aria-label="New list name"/><button className="primary" disabled={!name.trim()} onClick={create}><Plus size={16}/>Create list</button></div>
  {error&&<div className="inline-notice" role="status">{error}</div>}
  {loading?<div className="empty"><p>Loading lists…</p></div>:<div className="card">{lists.map(l=><button className={"network-row "+(selected===l.id?"active":"")} key={l.id} onClick={()=>open(l.id)}><span className="avatar avatar--small"><Users size={17}/></span><span><b>{l.name}</b><small>{Number(l.memberCount||0)} members · {l.visibility}</small></span></button>)}{!lists.length&&<div className="empty"><p>No lists yet.</p></div>}</div>}
  {detail&&<section className="card"><div className="heading"><small>LIST</small><h3>{detail.name}</h3><p>{detail.description||"Focused timeline"}</p></div><div className="page-actions"><input value={member} onChange={e=>setMember(e.target.value)} placeholder="@username" aria-label="List member username"/><button className="primary" disabled={!member.trim()} onClick={add}><UserPlus size={16}/>Add member</button><button className="outline" onClick={del}><Trash2 size={16}/>Delete</button></div><div className="network-list">{(detail.members||[]).map(m=><div className="network-row" key={m.id}><span className="avatar avatar--small">{String(m.display_name||m.username).charAt(0).toUpperCase()}</span><span><b>{m.display_name}</b><small>@{m.username}</small></span><button className="icon-btn" onClick={()=>remove(m.id)} aria-label={"Remove @"+m.username}><X size={16}/></button></div>)}</div>{posts.length?<div className="list-timeline">{posts.map(p=><button className="topic-post" key={p.id} onClick={()=>onOpen?.("/post/"+encodeURIComponent(p.id))}><b>{p.displayName||p.username||p.a}</b><p>{p.text||p.x||""}</p></button>)}</div>:<div className="empty"><p>No public posts from list members yet.</p></div>}</section>}
 </div>;
}
export { BookmarkFoldersRoute };
export default BookmarkFoldersRoute;
