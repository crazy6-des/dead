import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock3, Hash, Music2, Search, UserRound, X } from "lucide-react";
import { PRODUCT_IDENTITY } from "../../app/productIdentity.js";
import { createSearchAdapter } from "../../services/searchService.js";
const SEARCH_HISTORY = ["building in public", "Late Night Notes", "Maya"];
const MUSIC = ["Late Night Notes", "After Hours", "Soft Signals"];
export default function SearchOverlay({ posts = [], onOpen, onClose }) {
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState(null);
  const q = query.trim().toLowerCase();
  const people = useMemo(() => [["Maya Okafor","maya"],["Daniel Cole","daniel"],["Nia James","nia"],["S Team","s"]].filter(([name,username]) => !q || (name+" "+username).toLowerCase().includes(q)), [q]);
  const postResults = useMemo(() => posts.filter((p) => !q || [p.a,p.h,p.x,p.topic].join(" ").toLowerCase().includes(q)).slice(0, 8), [posts, q]);
  const topics = useMemo(() => remote?.items?.topics?.length ? remote.items.topics : [...new Set(posts.map((p) => p.topic).filter(Boolean))].filter((topic) => !q || topic.toLowerCase().includes(q)).slice(0, 6), [posts, q, remote]);
  const music = remote?.items?.music?.length ? remote.items.music : MUSIC.filter((item) => !q || item.toLowerCase().includes(q));
  const searchApi = useMemo(() => createSearchAdapter({ posts }), [posts]);
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  useEffect(() => { let active = true; if (!q) return () => { active = false; }; const timer = window.setTimeout(() => searchApi.search(q).then((result) => active && setRemote(result)).catch(() => active && setRemote(null)), 180); return () => { active = false; window.clearTimeout(timer); }; }, [q, searchApi]);
  return <div className="search-overlay" role="dialog" aria-modal="true">
    <div className="search-overlay__bar"><button onClick={onClose} aria-label="Close search"><ArrowLeft/></button><Search/><input autoFocus value={query} onChange={(e) => { setRemote(null); setQuery(e.target.value); }} placeholder={PRODUCT_IDENTITY.searchPlaceholder}/><button onClick={() => setQuery("")} aria-label="Clear search"><X/></button></div>
    {!q && <section className="search-section"><header><h3>Recent searches</h3></header>{SEARCH_HISTORY.map((item) => <button className="search-history" key={item} onClick={() => setQuery(item)}><Clock3 size={16}/>{item}</button>)}</section>}
    <div className="search-results">
      <section className="search-section"><header><h3>People</h3></header>{(remote?.items?.people?.length ? remote.items.people.map((p) => [p.name,p.username]) : people).map(([name,username]) => <button className="search-result" key={username} onClick={() => onOpen?.("/user/"+username)}><span className="avatar avatar--small">{name[0]}</span><span><b>{name}</b><small>@{username}</small></span><UserRound size={16}/></button>)}</section>
      <section className="search-section"><header><h3>Posts</h3></header>{(remote?.items?.posts?.length ? remote.items.posts : postResults).map((post) => <button className="search-result" key={post.id} onClick={() => onOpen?.("/post/"+post.id)}><span className="avatar avatar--small">{(post.a || "S")[0]}</span><span><b>{post.a}</b><small>{post.x}</small></span></button>)}</section>
      <section className="search-section"><header><h3>Topics</h3></header>{topics.map((topic) => <button className="search-result" key={topic} onClick={() => onOpen?.("/topic/"+encodeURIComponent(topic))}><Hash size={18}/><span><b>{topic}</b><small>Explore conversation</small></span></button>)}</section>
      <section className="search-section"><header><h3>Music</h3></header>{music.map((item) => <button className="search-result" key={item}><Music2 size={18}/><span><b>{item}</b><small>Original audio</small></span></button>)}</section>
    </div>
  </div>;
}
