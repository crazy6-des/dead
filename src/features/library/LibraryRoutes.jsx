import React, { useEffect, useState } from "react";
import { Plus, Bookmark, Folder, Users } from "lucide-react";
import { bookmarkService } from "../../services/bookmarkService.js";
import { listService } from "../../services/listService.js";

function BookmarkFoldersRoute({ posts = [], onOpen }) {
  const [folders, setFolders] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    bookmarkService.listFolders().then((page) => {
      if (active) { setFolders(page?.items || []); setLoading(false); }
    }).catch((err) => { if (active) { setError(err?.message || "Could not load bookmark folders."); setLoading(false); } });
    return () => { active = false; };
  }, []);

  const createFolder = async () => {
    const value = name.trim();
    if (!value) return;
    try {
      const folder = await bookmarkService.createFolder({ name: value });
      setFolders((current) => [...current, folder]);
      setName("");
      setError("");
    } catch (err) { setError(err?.message || "Could not create the folder."); }
  };

  return <div className="page">
    <div className="heading"><small>YOUR LIBRARY</small><h2>Bookmark folders</h2><p>Organize the posts you want to come back to.</p></div>
    <div className="card">
      <div className="page-actions"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="New folder name" aria-label="New folder name"/><button className="primary" onClick={createFolder} disabled={!name.trim()}><Plus size={16}/>Create folder</button></div>
      {error && <div className="inline-notice" role="status">{error}</div>}
      {loading ? <div className="empty"><p>Loading folders…</p></div> : folders.map((folder) => <button className="network-row" key={folder.id} onClick={() => onOpen?.("/saved?folder=" + encodeURIComponent(folder.id))}><span className="avatar avatar--small"><Folder size={17}/></span><span><b>{folder.name}</b><small>{folder.description || "Saved posts in this folder"}</small></span><Bookmark size={17}/></button>)}
    </div>
    {posts.some((post) => post.saved) && <section className="card"><div className="heading"><small>RECENT</small><h3>Saved posts</h3></div>{posts.filter((post) => post.saved).slice(0, 3).map((post) => <button className="topic-post" key={post.id} onClick={() => onOpen?.("/post/" + encodeURIComponent(post.id))}><b>{post.a}</b><p>{post.x}</p></button>)}</section>}
  </div>;
}

export function ListsRoute() {
  const [lists, setLists] = useState([]);
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { let active = true; listService.list().then((page) => active && setLists(page?.items || [])).catch((err) => { if (active) { setLists([]); setError(err?.message || "Lists are not available yet."); } }).finally(() => active && setLoading(false)); return () => { active = false; }; }, []);
  const createList = async () => { const value = name.trim(); if (!value) return; try { const list = await listService.create({ name: value, description: "A focused S feed." }); setLists((current) => [...current, list]); setName(""); setError(""); } catch (err) { setError(err?.message || "Could not create the list."); } };
  return <div className="page"><div className="heading"><small>YOUR NETWORK</small><h2>Lists</h2><p>Build focused feeds from the people and topics you care about.</p></div><div className="page-actions"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="New list name" aria-label="New list name"/><button className="primary" disabled={!name.trim()} onClick={createList}><Plus size={16}/>Create list</button></div>{error && <div className="inline-notice" role="status">{error}</div>}{loading ? <div className="empty"><p>Loading lists…</p></div> : lists.length ? lists.map((list) => <article className="card" key={list.id}><div className="network-row"><span className="avatar avatar--small"><Users size={17}/></span><span><b>{list.name}</b><small>{list.description}</small></span><button className="outline" onClick={() => setSelected(list.id)}>Open</button></div></article>) : !error ? <div className="empty"><p>No lists yet.</p></div> : null}{selected && <div className="inline-notice">List opened. Its focused feed is ready for membership and filtering through the Lists service.</div>}</div>;
}

export { BookmarkFoldersRoute };
export default BookmarkFoldersRoute;
