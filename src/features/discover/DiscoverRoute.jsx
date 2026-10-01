import React, { useEffect, useMemo, useState } from "react";
import { Hash, Search, Users } from "lucide-react";
import PostCard from "../post/PostCard.jsx";
import { DISCOVER_NICHES, extractHashtags, getNichePosts, getSuggestedPeople, matchesDiscoverQuery } from "./discoverUtils.js";
import { createSearchAdapter } from "../../services/searchService.js";
import { toFeedPostFromCreatedPost } from "../feed/feedPostAdapter.js";
import { resolveApiUrl, hasApiBaseUrl } from "../../services/apiClient.js";
import { createFeedAdapter } from "../../services/feedService.js";

export default function DiscoverRoute({ posts = [], onLike, onSave, onOpen, onFollow, onRepost, followingUsers = new Set() }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("For you");
  const [remote, setRemote] = useState(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState("");
  const [activeNiche, setActiveNiche] = useState("");
  const [peopleMoreLoading, setPeopleMoreLoading] = useState(false);
  const [personalPosts, setPersonalPosts] = useState([]);
  const [personalLoading, setPersonalLoading] = useState(false);
  const [liveNicheStats, setLiveNicheStats] = useState(() => Object.fromEntries(DISCOVER_NICHES ? Object.keys(DISCOVER_NICHES).map((niche) => [niche, 0]) : []));
  const searchApi = useMemo(() => createSearchAdapter({ posts }), [hasApiBaseUrl() ? null : posts]);
  const feedApi = useMemo(() => createFeedAdapter({ seedPosts: posts }), [hasApiBaseUrl() ? null : posts]);
  const trends = useMemo(() => extractHashtags(posts), [posts]);
  const people = useMemo(() => getSuggestedPeople(posts, followingUsers), [posts, followingUsers]);
  const filtered = useMemo(() => posts.filter((post) => matchesDiscoverQuery(post, query)), [posts, query]);
  const nicheStats = useMemo(() => Object.keys(DISCOVER_NICHES).map((niche) => ({ niche, count: liveNicheStats[niche] ?? 0 })), [liveNicheStats]);
  const localNichePosts = useMemo(() => getNichePosts(posts, activeNiche), [posts, activeNiche]);
  useEffect(() => {
    if (tab !== "For you" || query.trim() || activeNiche || !hasApiBaseUrl()) return undefined;
    let active = true;
    setPersonalLoading(true);
    feedApi.list({ mode: "For You", limit: 20, cursor: null }).then((page) => {
      if (active) setPersonalPosts(page?.items || []);
    }).catch((error) => {
      if (active) setRemoteError(error?.message || "Your personalized Discover feed could not be loaded.");
    }).finally(() => { if (active) setPersonalLoading(false); });
    return () => { active = false; };
  }, [tab, query, activeNiche, feedApi]);

  useEffect(() => {
    const type = (tab === "People" || tab === "For you") ? "people" : tab === "Posts" ? "posts" : tab === "Topics" ? "topics" : tab === "Music" ? "music" : "all";
    if (activeNiche || ((tab === "Posts" || tab === "Topics" || tab === "Music") && !query.trim())) return undefined;
    if (tab !== "People" && tab !== "For you" && !query.trim()) return undefined;
    let active = true;
    const timer = window.setTimeout(() => { setRemoteLoading(true); setRemoteError(""); setRemote(null); searchApi.search(query, type).then((result) => { if (active) setRemote(result); }).catch((error) => { if (active) { setRemote(null); setRemoteError(error?.message || "Discover results could not be loaded."); } }).finally(() => { if (active) setRemoteLoading(false); }); }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, tab, searchApi, activeNiche]);
  useEffect(() => {
    let active = true;
    const refreshNicheStats = async () => {
      try {
        const results = await Promise.all(Object.keys(DISCOVER_NICHES).map(async (niche) => {
          const result = await searchApi.search("", "posts", null, niche);
          return [niche, Number(result?.nicheCount || 0)];
        }));
        if (active) setLiveNicheStats(Object.fromEntries(results));
      } catch (error) {
        if (active) setRemoteError(error?.message || "Could not refresh live Discover topics.");
      }
    };
    void refreshNicheStats();
    const interval = window.setInterval(refreshNicheStats, 20000);
    return () => { active = false; window.clearInterval(interval); };
  }, [searchApi]);

  useEffect(() => {
    if (!activeNiche || tab !== "Posts") return undefined;
    let active = true;
    const refresh = async () => {
      try {
        const result = await searchApi.search("", "posts", null, activeNiche);
        if (active) setRemote(result);
      } catch (error) {
        if (active) setRemoteError(error?.message || `Could not refresh live ${activeNiche} posts.`);
      }
    };
    const interval = window.setInterval(refresh, 20000);
    return () => { active = false; window.clearInterval(interval); };
  }, [activeNiche, tab, searchApi]);

  const openNiche = async (niche) => {
    setActiveNiche(niche);
    setQuery("");
    setTab("Posts");
    setRemote(null);
    setRemoteError("");
    setRemoteLoading(true);
    try {
      const result = await searchApi.search("", "posts", null, niche);
      setRemote(result);
    } catch (error) {
      setRemote(null);
      setRemoteError(error?.message || `Could not load live ${niche} posts.`);
    } finally {
      setRemoteLoading(false);
    }
  };
  const remotePeople = remote?.items?.people || [];
  const remotePosts = (remote?.items?.posts || []).map((post) => toFeedPostFromCreatedPost(post));
  const remoteTopics = remote?.items?.topics || [];
  const remoteMusic = remote?.items?.music || [];
  const loadMorePeople = async () => {
    if (!peopleNextCursor || peopleMoreLoading) return;
    setPeopleMoreLoading(true);
    try {
      const result = await searchApi.search(query, "people", peopleNextCursor, "", 20);
      setRemote((current) => current ? {
        ...current,
        items: {
          ...current.items,
          people: [...(current.items?.people || []), ...(result?.items?.people || [])],
          peopleNextCursor: result?.items?.peopleNextCursor || null,
        },
      } : result);
    } catch (error) {
      setRemoteError(error?.message || "More people could not be loaded.");
    } finally {
      setPeopleMoreLoading(false);
    }
  };
  const nicheTerms = Object.keys(DISCOVER_NICHES);

  return <div className="page discover-page">
    
    <div className="discover-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => { setActiveNiche(""); setQuery(event.target.value); }} placeholder="Search" aria-label="Search discover" /></div>
    <div className="discover-niches" aria-label="Explore topics">{nicheTerms.map((term) => { const count = nicheStats.find((item) => item.niche === term)?.count || 0; return <button key={term} type="button" className={activeNiche === term ? "active" : ""} onClick={() => { void openNiche(term); }}><strong>{term}</strong><small>{count} {count === 1 ? "post" : "posts"}</small></button>; })}</div>
    <div className="tabs5" role="tablist" aria-label="Discover sections">{["For you", "People", "Posts", "Topics", "Music"].map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "active" : ""} onClick={() => { setActiveNiche(""); setTab(item); }}>{item}</button>)}</div>

    {(tab === "For you" || tab === "Topics") && <section className="card"><header><div><small>FROM THE COMMUNITY</small><h2>Trending hashtags</h2></div><Hash size={18} aria-hidden="true" /></header>{(query.trim() && tab === "Topics" ? remoteTopics : trends).length ? (query.trim() && tab === "Topics" ? remoteTopics.map((tag) => ({ tag, count: 0 })) : trends).map(({ tag, count }) => <button className="discover-row" key={tag} type="button" onClick={() => { setQuery(tag); setTab("Posts"); }}><span><strong>{tag}</strong><small>{count ? `${count} ${count === 1 ? "post" : "posts"}` : "Explore conversation"}</small></span></button>) : <div className="empty"><p>Hashtags from published posts will appear here.</p></div>}</section>}

    {(tab === "For you" || tab === "People") && <section className="card"><header><div><small>WHO TO FOLLOW</small><h2>Who to follow</h2></div><Users size={18} aria-hidden="true" /></header>{remoteLoading && tab !== "For you" ? <div className="empty" role="status"><p>Searching…</p></div> : remoteError ? <div className="empty" role="alert"><p>{remoteError}</p></div> : (((tab === "People" || tab === "For you") && remote) ? remotePeople : people).length ? ((tab === "People" || tab === "For you") && remote ? remotePeople : people).map(({ username, name, avatarUrl, following: serverFollowing, location, interests }) => <div className="person" key={username}><button type="button" className="avatar avatar--small person-avatar" onClick={() => onOpen?.("/user/" + username)} aria-label={"Open " + name}><span>{String(name || username).charAt(0).toUpperCase()}</span>{avatarUrl && <img src={resolveApiUrl(avatarUrl)} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />}</button><div><strong>{name}</strong><span>@{username}{location ? " · " + location : interests?.length ? " · " + interests.slice(0, 2).join(", ") : ""}</span></div><button type="button" className="follow" onClick={async () => { await onFollow?.(username); setRemote((current) => current ? { ...current, items: { ...current.items, people: (current.items.people || []).filter((person) => person.username !== username) } } : current); }}>{serverFollowing || followingUsers.has(String(username).toLowerCase()) ? "Following" : "Follow"}</button></div>) : <div className="empty"><p>There are no more accounts to connect with right now.</p></div>}\n    {(tab === "For you" || tab === "People") && peopleNextCursor && <div className="discover-more"><button type="button" onClick={() => { void loadMorePeople(); }} disabled={peopleMoreLoading}>{peopleMoreLoading ? "Loading…" : "More people"}</button></div>}

    {(tab === "For you" || tab === "Posts") && <section className="card discover-posts"><header><div><small>POSTS</small><h2>Explore posts</h2></div></header>{(tab === "For you" && !query.trim() && !activeNiche ? personalPosts : ((query.trim() || activeNiche) && tab === "Posts" ? (remotePosts.length ? remotePosts : localNichePosts) : filtered)).length ? (tab === "For you" && !query.trim() && !activeNiche ? personalPosts : ((query.trim() || activeNiche) && tab === "Posts" ? (remotePosts.length ? remotePosts : localNichePosts) : filtered)).slice(0, 20).map((post) => <PostCard key={post.id} post={post} onLike={onLike} onSave={onSave} onRepost={onRepost} onFollow={() => onFollow?.(String(post.h || post.username || "").replace("@", "").toLowerCase())} onOpen={onOpen} />) : <div className="empty"><p>No posts match your search yet.</p></div>}</section>}
    {tab === "For you" && !query.trim() && !activeNiche && personalLoading && <div className="empty" role="status"><p>Personalizing your Discover feed…</p></div>}
    {tab === "Music" && <section className="card"><header><div><small>MUSIC</small><h2>Music discovery</h2></div></header>{remoteLoading ? <div className="empty" role="status"><p>Searching…</p></div> : remoteError ? <div className="empty" role="alert"><p>{remoteError}</p></div> : remoteMusic.length ? remoteMusic.map((item) => <button className="discover-row" key={item.id || item.title || item} type="button"><span><strong>{item.title || item}</strong><small>{item.artist || "Music"}</small></span></button>) : <div className="empty"><p>Music discovery will appear here when published posts contain discoverable music.</p></div>}</section>}
  </div>;
}
