import React, { useMemo, useState } from "react";
import { Hash, Search, Users } from "lucide-react";
import PostCard from "../post/PostCard.jsx";
import { extractHashtags, getSuggestedPeople, matchesDiscoverQuery } from "./discoverUtils.js";
import { createSearchAdapter } from "../../services/searchService.js";
import { toFeedPostFromCreatedPost } from "../feed/feedPostAdapter.js";

export default function DiscoverRoute({ posts = [], onLike, onSave, onOpen, onFollow, onRepost, followingUsers = new Set() }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("For you");
  const [remote, setRemote] = useState(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState("");
  const searchApi = useMemo(() => createSearchAdapter({ posts }), [posts]);
  const trends = useMemo(() => extractHashtags(posts), [posts]);
  const people = useMemo(() => getSuggestedPeople(posts, followingUsers), [posts, followingUsers]);
  const filtered = useMemo(() => posts.filter((post) => matchesDiscoverQuery(post, query)), [posts, query]);
  useEffect(() => {
    const type = tab === "People" ? "people" : tab === "Posts" ? "posts" : tab === "Topics" ? "topics" : tab === "Music" ? "music" : "all";
    if (!query.trim() || tab === "For you") { setRemote(null); setRemoteError(""); setRemoteLoading(false); return undefined; }
    let active = true;
    setRemoteLoading(true); setRemoteError("");
    const timer = window.setTimeout(() => searchApi.search(query, type).then((result) => { if (active) setRemote(result); }).catch((error) => { if (active) { setRemote(null); setRemoteError(error?.message || "Discover results could not be loaded."); } }).finally(() => { if (active) setRemoteLoading(false); }), 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, tab, searchApi]);
  const remotePeople = remote?.items?.people || [];
  const remotePosts = (remote?.items?.posts || []).map((post) => toFeedPostFromCreatedPost(post));
  const remoteTopics = remote?.items?.topics || [];
  const remoteMusic = remote?.items?.music || [];

  return <div className="page">
    <div className="discover-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people, posts, topics, music" aria-label="Search discover" /></div>
    <div className="tabs5" role="tablist" aria-label="Discover sections">{["For you", "People", "Posts", "Topics", "Music"].map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>

    {(tab === "For you" || tab === "Topics") && <section className="card"><header><div><small>FROM THE COMMUNITY</small><h2>Trending hashtags</h2></div><Hash size={18} aria-hidden="true" /></header>{(query.trim() && tab === "Topics" ? remoteTopics : trends).length ? (query.trim() && tab === "Topics" ? remoteTopics.map((tag) => ({ tag, count: 0 })) : trends).map(({ tag, count }) => <button className="discover-row" key={tag} type="button" onClick={() => { setQuery(tag); setTab("Posts"); }}><span><strong>{tag}</strong><small>{count ? `${count} ${count === 1 ? "post" : "posts"}` : "Explore conversation"}</small></span></button>) : <div className="empty"><p>Hashtags from published posts will appear here.</p></div>}</section>}

    {(tab === "For you" || tab === "People") && <section className="card"><header><div><small>DISCOVER PEOPLE</small><h2>People to connect</h2></div><Users size={18} aria-hidden="true" /></header>{remoteLoading && tab !== "For you" ? <div className="empty" role="status"><p>Searching…</p></div> : remoteError ? <div className="empty" role="alert"><p>{remoteError}</p></div> : (query.trim() && tab === "People" ? remotePeople : people).length ? (query.trim() && tab === "People" ? remotePeople.map(({ username, name }) => ({ username, name, location: "", interests: [] })) : people).map(({ username, name, location, interests }) => <div className="person" key={username}><button type="button" className="avatar avatar--small" onClick={() => onOpen?.("/user/" + username)} aria-label={`Open ${name}`}>{String(name || username).charAt(0).toUpperCase()}</button><div><strong>{name}</strong><span>@{username}{location ? ` · ${location}` : interests.length ? ` · ${interests.slice(0, 2).join(", ")}` : ""}</span></div><button type="button" className="follow" onClick={() => onFollow?.(username)}>Follow</button></div>) : <div className="empty"><p>People recommendations will appear when user profiles provide matching information.</p></div>}</section>}

    {(tab === "For you" || tab === "Posts") && <section className="card discover-posts"><header><div><small>POSTS</small><h2>Explore posts</h2></div></header>{(query.trim() && tab === "Posts" ? remotePosts : filtered).length ? (query.trim() && tab === "Posts" ? remotePosts : filtered).slice(0, 8).map((post) => <PostCard key={post.id} post={post} onLike={onLike} onSave={onSave} onRepost={onRepost} onFollow={() => onFollow?.(String(post.h || post.username || "").replace("@", "").toLowerCase())} onOpen={onOpen} />) : <div className="empty"><p>No posts match your search yet.</p></div>}</section>}
    {tab === "Music" && <section className="card"><header><div><small>MUSIC</small><h2>Music discovery</h2></div></header>{remoteLoading ? <div className="empty" role="status"><p>Searching…</p></div> : remoteError ? <div className="empty" role="alert"><p>{remoteError}</p></div> : remoteMusic.length ? remoteMusic.map((item) => <button className="discover-row" key={item.id || item.title || item} type="button"><span><strong>{item.title || item}</strong><small>{item.artist || "Music"}</small></span></button>) : <div className="empty"><p>Music discovery will appear here when published posts contain discoverable music.</p></div>}</section>}
  </div>;
}
