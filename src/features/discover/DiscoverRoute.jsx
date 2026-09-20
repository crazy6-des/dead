import React, { useMemo, useState } from "react";
import { MoreHorizontal, Search, Users } from "lucide-react";
import PostCard from "../post/PostCard.jsx";
const trends = [["Music","Late Night Notes","8.1K posts"],["Community","Creators of S","1.7K posts"],["Culture","#NewBeginnings","2.4K posts"],["Technology","Building in public","5.6K posts"]];
const people = ["Maya Okafor","Daniel Cole","Nia James"];
export default function DiscoverRoute({ posts, onOpen, onFollow, followingUsers = new Set() }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("For you");
  const filtered = useMemo(() => posts.filter((p) => !query || (String(p.a || "") + " " + String(p.x || "") + " " + String(p.topic || "")).toLowerCase().includes(query.toLowerCase())), [posts, query]);
  return <div className="page">
    <div className="discover-search"><Search/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people, posts, topics, music"/></div>
    <div className="tabs5">{["For you","People","Posts","Topics","Music"].map((x) => <button key={x} className={tab === x ? "active" : ""} onClick={() => setTab(x)}>{x}</button>)}</div>
    {(tab === "For you" || tab === "Topics") && <section className="card"><header><div><small>TRENDING NOW</small><h2>What's happening</h2></div><button onClick={() => setTab("Topics")}>See all</button></header>{trends.map(([category,title,count]) => <button className="discover-row" key={title} onClick={() => onOpen?.("/topic/" + encodeURIComponent(title))}><span><small>{category}</small><strong>{title}</strong><small>{count}</small></span><MoreHorizontal size={17}/></button>)}</section>}
    {(tab === "For you" || tab === "People") && <section className="card"><header><div><small>PEOPLE</small><h2>People to connect</h2></div><Users size={18}/></header>{people.map((name) => <div className="person" key={name}><button className="avatar avatar--small" onClick={() => onOpen?.("/user/" + name.split(" ")[0].toLowerCase())}>{name[0]}</button><div><strong>{name}</strong><span>@{name.split(" ")[0].toLowerCase()} · Creator</span></div><button className={"follow " + (followingUsers.has(name.split(" ")[0].toLowerCase()) ? "is-following" : "")} onClick={() => onFollow?.(name.split(" ")[0].toLowerCase())}>{followingUsers.has(name.split(" ")[0].toLowerCase()) ? "Following" : "Follow"}</button></div>)}</section>}
    {(tab === "For you" || tab === "Posts") && <section className="card discover-posts"><header><div><small>POSTS</small><h2>Posts for you</h2></div></header>{filtered.slice(0,8).map((p) => <PostCard key={p.id} post={p} onLike={() => {}} onSave={() => {}} onFollow={() => onFollow?.(String(p.h || "").replace("@", "").toLowerCase())} onOpen={onOpen}/>)}</section>}
    {tab === "Music" && <div className="empty"><h3>Music discovery</h3><p>Browse sounds, tracks and original audio shared across S.</p></div>}
  </div>;
}
