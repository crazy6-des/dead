import React, { useMemo, useState } from "react";
import { Hash, Search, Users } from "lucide-react";
import PostCard from "../post/PostCard.jsx";
import { extractHashtags, getSuggestedPeople, matchesDiscoverQuery } from "./discoverUtils.js";

export default function DiscoverRoute({ posts = [], onLike, onSave, onOpen, onFollow, onRepost, followingUsers = new Set() }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("For you");
  const trends = useMemo(() => extractHashtags(posts), [posts]);
  const people = useMemo(() => getSuggestedPeople(posts, followingUsers), [posts, followingUsers]);
  const filtered = useMemo(() => posts.filter((post) => matchesDiscoverQuery(post, query)), [posts, query]);

  return <div className="page">
    <div className="discover-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people, posts, topics, music" aria-label="Search discover" /></div>
    <div className="tabs5" role="tablist" aria-label="Discover sections">{["For you", "People", "Posts", "Topics", "Music"].map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>

    {(tab === "For you" || tab === "Topics") && <section className="card"><header><div><small>FROM THE COMMUNITY</small><h2>Trending hashtags</h2></div><Hash size={18} aria-hidden="true" /></header>{trends.length ? trends.map(({ tag, count }) => <button className="discover-row" key={tag} type="button" onClick={() => { setQuery(tag); setTab("Posts"); }}><span><strong>{tag}</strong><small>{count} {count === 1 ? "post" : "posts"}</small></span></button>) : <div className="empty"><p>Hashtags from published posts will appear here.</p></div>}</section>}

    {(tab === "For you" || tab === "People") && <section className="card"><header><div><small>DISCOVER PEOPLE</small><h2>People to connect</h2></div><Users size={18} aria-hidden="true" /></header>{people.length ? people.map(({ username, name, location, interests }) => <div className="person" key={username}><button type="button" className="avatar avatar--small" onClick={() => onOpen?.("/user/" + username)} aria-label={`Open ${name}`}>{String(name || username).charAt(0).toUpperCase()}</button><div><strong>{name}</strong><span>@{username}{location ? ` · ${location}` : interests.length ? ` · ${interests.slice(0, 2).join(", ")}` : ""}</span></div><button type="button" className="follow" onClick={() => onFollow?.(username)}>Follow</button></div>) : <div className="empty"><p>People recommendations will appear when user profiles provide matching information.</p></div>}</section>}

    {(tab === "For you" || tab === "Posts") && <section className="card discover-posts"><header><div><small>POSTS</small><h2>Explore posts</h2></div></header>{filtered.length ? filtered.slice(0, 8).map((post) => <PostCard key={post.id} post={post} onLike={onLike} onSave={onSave} onRepost={onRepost} onFollow={() => onFollow?.(String(post.h || "").replace("@", "").toLowerCase())} onOpen={onOpen} />) : <div className="empty"><p>No posts match your search yet.</p></div>}</section>}
    {tab === "Music" && <div className="empty"><h3>Music discovery</h3><p>Music discovery will use real shared audio when the catalog endpoint is connected.</p></div>}
  </div>;
}
