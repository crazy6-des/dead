import React, { useEffect, useState } from "react";
import { Plus, Bookmark, Folder, Users } from "lucide-react";
import { bookmarkService } from "../../services/bookmarkService.js";
import { listService } from "../../services/listService.js";

export default function BookmarkFoldersRoute({ posts = [], onOpen }) {
  const [folders, setFolders] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    bookmarkService.listFolders().then((page) => {
      if (active) { setFolders(page?.items || []); setLoading(false); }
    }).catch(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const createFolder = async () => {
    const value = name.trim();
    if (!value) return;
    const folder = await bookmarkService.createFolder({ name: value });
    setFolders((current) => [...current, folder]);
    setName("");
  };

  return <div className="page">
    <div className="heading"><small>YOUR LIBRARY</small><h2>Bookmark folders</h2><p>Organize the posts you want to come back to.</p></div>
    <div className="card">
      <div className="page-actions"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="New folder name" aria-label="New folder name"/><button className="primary" onClick={createFolder} disabled={!name.trim()}><Plus size={16}/>Create folder</button></div>
      {loading ? <div className="empty"><p>Loading folders…</p></div> : folders.map((folder) => <button className="network-row" key={folder.id} onClick={() => onOpen?.("/saved?folder=" + encodeURIComponent(folder.id))}><span className="avatar avatar--small"><Folder size={17}/></span><span><b>{folder.name}</b><small>{folder.description || "Saved posts in this folder"}</small></span><Bookmark size={17}/></button>)}
    </div>
    {posts.some((post) => post.saved) && <section className="card"><div className="heading"><small>RECENT</small><h3>Saved posts</h3></div>{posts.filter((post) => post.saved).slice(0, 3).map((post) => <button className="topic-post" key={post.id} onClick={() => onOpen?.("/post/" + post.id)}><b>{post.a}</b><p>{post.x}</p></button>)}</section>}
  </div>;
}

export function ListsRoute() {
  const [lists, setLists] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; listService.list().then((page) => active && setLists(page?.items || [])).catch(() => active && setLists([])).finally(() => active && setLoading(false)); return () => { active = false; }; }, []);
  const createList = async () => { const value = name.trim(); if (!value) return; const list = await listService.create({ name: value, description: "A focused S feed." }); setLists((current) => [...current, list]); setName(""); };
  return <div className="page"><div className="heading"><small>YOUR NETWORK</small><h2>Lists</h2><p>Build focused feeds from the people and topics you care about.</p></div><div className="page-actions"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="New list name" aria-label="New list name"/><button className="primary" disabled={!name.trim()} onClick={createList}><Plus size={16}/>Create list</button></div>{loading ? <div className="empty"><p>Loading lists…</p></div> : lists.map((list) => <article className="card" key={list.id}><div className="network-row"><span className="avatar avatar--small"><Users size={17}/></span><span><b>{list.name}</b><small>{list.description}</small></span><button className="outline">Open</button></div></article>)}</div>;
}