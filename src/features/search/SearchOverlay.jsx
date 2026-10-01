import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock3, Hash, Music2, Search, UserRound, X } from "lucide-react";
import { PRODUCT_IDENTITY } from "../../app/productIdentity.js";
import { createSearchAdapter } from "../../services/searchService.js";
import { createMusicAdapter } from "../../services/musicService.js";
import { toFeedPostFromCreatedPost } from "../feed/feedPostAdapter.js";
export default function SearchOverlay({ posts = [], onOpen, onClose, onFollow, followingUsers = new Set() }) {
  const [query, setQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    const path = window.location.pathname.replace(/\/+$/, "");
    const prefix = "/search/";
    if (path.startsWith(prefix)) { try { return decodeURIComponent(path.slice(prefix.length)); } catch (error) { void error; return path.slice(prefix.length); } }
    return new URLSearchParams(window.location.search).get("q") || "";
  });
  const [remote, setRemote] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [catalogMusic, setCatalogMusic] = useState([]);
  const [musicLoading, setMusicLoading] = useState(false);
  const [history, setHistory] = useState(() => { try { return JSON.parse(window.localStorage.getItem("s.searchHistory") || "[]").filter((item) => typeof item === "string").slice(0, 8); } catch (error) { void error; return []; } });
  const q = query.trim().toLowerCase();
  const people = useMemo(() => [...new Map(posts.map((post) => [post.u || post.username, [post.a || post.displayName || post.username, post.u || post.username]]).filter(([username]) => username)).values()].filter(([name, username]) => !q || (name + " " + username).toLowerCase().includes(q)).slice(0, 8), [posts, q]);
  const postResults = useMemo(() => posts.filter((p) => !q || [p.a,p.h,p.x,p.topic].join(" ").toLowerCase().includes(q)).slice(0, 8), [posts, q]);
  const topics = useMemo(() => remote ? (remote.items?.topics || []) : [...new Set(posts.map((p) => p.topic).filter(Boolean))].filter((topic) => !q || topic.toLowerCase().includes(q)).slice(0, 6), [posts, q, remote]);
  const music = remote?.items?.music?.filter(Boolean) || [];
  const searchApi = useMemo(() => createSearchAdapter({ posts }), [posts]);
  const musicApi = useMemo(() => createMusicAdapter(), []);
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

  useEffect(() => {
    let active = true;
    if (!q) return () => { active = false; };
    const timer = window.setTimeout(() => {
      setMusicLoading(true);
      Promise.allSettled([searchApi.search(q), musicApi.search(q, { limit: 12 })]).then(([searchResult, musicResult]) => {
        if (!active) return;
        if (searchResult.status === "fulfilled") {
          setRemote(searchResult.value);
          setSearchError("");
        } else {
          setRemote(null);
          setSearchError(searchResult.reason?.message || "Search could not be completed.");
        }
        if (musicResult.status === "fulfilled") setCatalogMusic(musicResult.value || []);
        else setCatalogMusic([]);
      }).finally(() => {
        if (active) setMusicLoading(false);
      });
    }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [q, searchApi, musicApi]);
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
    <div className="search-overlay__bar"><button onClick={onClose} aria-label="Close search"><ArrowLeft/></button><Search/><input autoFocus value={query} onChange={(e) => { setRemote(null); setSearchError(""); setQuery(e.target.value); const value = e.target.value.trim(); const nextPath = value ? "/search/" + encodeURIComponent(value) : "/search"; if (window.location.pathname !== nextPath) window.history.replaceState({}, "", nextPath); }} onKeyDown={(e) => { if (e.key === "Enter") commitSearch(e.currentTarget.value); }} placeholder={PRODUCT_IDENTITY.searchPlaceholder}/><button onClick={() => setQuery("")} aria-label="Clear search"><X/></button></div>
    {!q && history.length > 0 && <section className="search-section"><header><h3>Recent searches</h3></header>{history.map((item) => <button className="search-history" key={item} onClick={() => { setQuery(item); commitSearch(item); }}><Clock3 size={16}/>{item}</button>)}</section>}
    <div className="search-results">{searchError && <div className="inline-notice" role="alert">{searchError}</div>}{q && !remote && !searchError && <div className="empty" role="status"><p>Searching…</p></div>}
      <section className="search-section"><header><h3>People</h3></header>{(remote ? (remote.items?.people || []).map((p) => ({ name:p.name, username:p.username, avatarUrl:p.avatarUrl })) : people.map(([name,username]) => ({ name, username, avatarUrl:null }))).map(({name,username,avatarUrl}) => { const normalized = String(username || "").replace(/^@/,"").toLowerCase(); const following = followingUsers.has(normalized); return <div className="search-result" key={username}><button type="button" className="search-result__main" onClick={() => onOpen?.("/user/"+encodeURIComponent(username))}><span className="avatar avatar--small">{avatarUrl ? <img src={avatarUrl} alt="" /> : String(name || username || "S").charAt(0).toUpperCase()}</span><span><b>{name}</b><small>@{username}</small></span></button><button type="button" className={following ? "is-following" : "follow"} onClick={() => onFollow?.(normalized)}>{following ? "Following" : "Follow"}</button></div>})}</section>
      <section className="search-section"><header><h3>Posts</h3></header>{(remote ? (remote.items?.posts || []).map((post) => toFeedPostFromCreatedPost(post)) : postResults).map((post) => <button className="search-result" key={post.id} onClick={() => onOpen?.("/post/"+encodeURIComponent(post.id))}><span className="avatar avatar--small">{(post.a || "S")[0]}</span><span><b>{post.a}</b><small>{post.x}</small></span></button>)}</section>
      <section className="search-section"><header><h3>Topics</h3></header>{topics.map((topic) => <button className="search-result" key={topic} onClick={() => onOpen?.("/search/"+encodeURIComponent(topic))}><Hash size={18}/><span><b>{topic}</b><small>Explore conversation</small></span></button>)}</section>
      <section className="search-section"><header><h3>Music</h3></header>{musicLoading && <div className="empty" role="status"><p>Searching music…</p></div>}{[...music, ...catalogMusic.filter((track) => !music.some((item) => String(item.id) === String(track.musicId)))].map((item) => <button className="search-result" key={item.id || item.musicId || item.title || item}><Music2 size={18}/><span><b>{item.title || item.name}</b><small>{item.artist || item.artistName || "Music"}{item.provider ? " · " + item.provider : ""}</small></span></button>)}{!musicLoading && !music.length && !catalogMusic.length && q && <div className="empty"><p>No public music matched your search.</p></div>}</section>
    </div>
  </div>;
}
