import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock3, Hash, Music2, Search, UserRound, X } from "lucide-react";
import { PRODUCT_IDENTITY } from "../../app/productIdentity.js";
import { createSearchAdapter } from "../../services/searchService.js";
export default function SearchOverlay({ posts = [], onOpen, onClose }) {
  const [query, setQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    const path = window.location.pathname.replace(/\/+$/, "");
    const prefix = "/search/";
    if (path.startsWith(prefix)) return decodeURIComponent(path.slice(prefix.length));
    return new URLSearchParams(window.location.search).get("q") || "";
  });
  const [remote, setRemote] = useState(null);
  const [history, setHistory] = useState(() => { try { return JSON.parse(window.localStorage.getItem("s.searchHistory") || "[]").filter((item) => typeof item === "string").slice(0, 8); } catch (error) { void error; return []; } });
  const q = query.trim().toLowerCase();
  const people = useMemo(() => [...new Map(posts.map((post) => [post.u || post.username, [post.a || post.displayName || post.username, post.u || post.username]]).filter(([username]) => username)).values()].filter(([name, username]) => !q || (name + " " + username).toLowerCase().includes(q)).slice(0, 8), [posts, q]);
  const postResults = useMemo(() => posts.filter((p) => !q || [p.a,p.h,p.x,p.topic].join(" ").toLowerCase().includes(q)).slice(0, 8), [posts, q]);
  const topics = useMemo(() => remote?.items?.topics?.length ? remote.items.topics : [...new Set(posts.map((p) => p.topic).filter(Boolean))].filter((topic) => !q || topic.toLowerCase().includes(q)).slice(0, 6), [posts, q, remote]);
  const music = remote?.items?.music?.filter(Boolean) || [];
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
  const commitSearch = (value) => {
    const normalized = String(value || "").trim();
    if (!normalized) return;
    setHistory((current) => {
      const next = [normalized, ...current.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 8);
      try { window.localStorage.setItem("s.searchHistory", JSON.stringify(next)); } catch (error) { void error; }
      return next;
    });
  };
  return <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Search S">
    <div className="search-overlay__bar"><button onClick={onClose} aria-label="Close search"><ArrowLeft/></button><Search/><input autoFocus value={query} onChange={(e) => { setRemote(null); setQuery(e.target.value); commitSearch(e.target.value); }} placeholder={PRODUCT_IDENTITY.searchPlaceholder}/><button onClick={() => setQuery("")} aria-label="Clear search"><X/></button></div>
    {!q && history.length > 0 && <section className="search-section"><header><h3>Recent searches</h3></header>{history.map((item) => <button className="search-history" key={item} onClick={() => setQuery(item)}><Clock3 size={16}/>{item}</button>)}</section>}
    <div className="search-results">
      <section className="search-section"><header><h3>People</h3></header>{(remote?.items?.people?.length ? remote.items.people.map((p) => [p.name,p.username]) : people).map(([name,username]) => <button className="search-result" key={username} onClick={() => onOpen?.("/user/"+username)}><span className="avatar avatar--small">{name[0]}</span><span><b>{name}</b><small>@{username}</small></span><UserRound size={16}/></button>)}</section>
      <section className="search-section"><header><h3>Posts</h3></header>{(remote?.items?.posts?.length ? remote.items.posts : postResults).map((post) => <button className="search-result" key={post.id} onClick={() => onOpen?.("/post/"+post.id)}><span className="avatar avatar--small">{(post.a || "S")[0]}</span><span><b>{post.a}</b><small>{post.x}</small></span></button>)}</section>
      <section className="search-section"><header><h3>Topics</h3></header>{topics.map((topic) => <button className="search-result" key={topic} onClick={() => onOpen?.("/topic/"+encodeURIComponent(topic))}><Hash size={18}/><span><b>{topic}</b><small>Explore conversation</small></span></button>)}</section>
      <section className="search-section"><header><h3>Music</h3></header>{music.map((item) => <button className="search-result" key={item.id || item.title || item}><Music2 size={18}/><span><b>{item.title || item}</b><small>{item.artist || "Music"}</small></span></button>)}</section>
    </div>
  </div>;
}
