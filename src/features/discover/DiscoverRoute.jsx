import React, { useEffect, useMemo, useRef, useState } from "react";
import { Hash, Search, Users } from "lucide-react";
import PostCard from "../post/PostCard.jsx";
import { extractHashtags, getSuggestedPeople, matchesDiscoverQuery } from "./discoverUtils.js";
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
  const [peopleMoreLoading, setPeopleMoreLoading] = useState(false);
  const [postsMoreLoading, setPostsMoreLoading] = useState(false);
  const postsLoadMoreRef = useRef(null);
  const [personalPosts, setPersonalPosts] = useState([]);
  const [personalLoading, setPersonalLoading] = useState(false);
  const searchApi = useMemo(() => createSearchAdapter({ posts }), [hasApiBaseUrl() ? null : posts]);
  const feedApi = useMemo(() => createFeedAdapter({ seedPosts: posts }), [hasApiBaseUrl() ? null : posts]);
  const trends = useMemo(() => extractHashtags(posts), [posts]);
  const people = useMemo(() => getSuggestedPeople(posts, followingUsers), [posts, followingUsers]);
  const filtered = useMemo(() => posts.filter((post) => matchesDiscoverQuery(post, query)), [posts, query]);

  useEffect(() => {
    if (tab !== "For you" || query.trim() || !hasApiBaseUrl()) return undefined;
    let active = true;
    Promise.resolve().then(() => {
      if (active) setPersonalLoading(true);
      return feedApi.list({ mode: "For You", limit: 20, cursor: null });
    }).then((page) => {
      if (active) setPersonalPosts(page?.items || []);
    }).catch((error) => {
      if (active) setRemoteError(error?.message || "Your personalized Discover feed could not be loaded.");
    }).finally(() => { if (active) setPersonalLoading(false); });
    return () => { active = false; };
  }, [tab, query, feedApi]);

  useEffect(() => {
    if (tab === "For you") return undefined;
    const type = tab === "People" ? "people" : "posts";
    let active = true;
    const timer = window.setTimeout(() => {
      setRemoteLoading(true);
      setRemoteError("");
      setRemote(null);
      searchApi.search(query, type).then((result) => {
        if (active) setRemote(result);
      }).catch((error) => {
        if (active) {
          setRemote(null);
          setRemoteError(error?.message || "Search results could not be loaded.");
        }
      }).finally(() => { if (active) setRemoteLoading(false); });
    }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, tab, searchApi]);

  const remotePeople = remote?.items?.people || [];
  const peopleNextCursor = remote?.items?.peopleNextCursor || null;
  const postsNextCursor = remote?.items?.postsNextCursor || null;
  const remotePosts = (remote?.items?.posts || []).map((post) => toFeedPostFromCreatedPost(post));

  const loadMorePeople = async () => {
    if (!peopleNextCursor || peopleMoreLoading) return;
    setPeopleMoreLoading(true);
    try {
      const result = await searchApi.search(query, "people", peopleNextCursor, "", 20);
      setRemote((current) => current ? { ...current, items: { ...current.items, people: [...(current.items?.people || []), ...(result?.items?.people || [])], peopleNextCursor: result?.items?.peopleNextCursor || null } } : result);
    } catch (error) {
      setRemoteError(error?.message || "More people could not be loaded.");
    } finally {
      setPeopleMoreLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (!postsNextCursor || postsMoreLoading || tab !== "Posts") return;
    setPostsMoreLoading(true);
    try {
      const result = await searchApi.search(query, "posts", postsNextCursor, "", 20);
      setRemote((current) => current ? { ...current, items: { ...current.items, posts: [...(current.items?.posts || []), ...(result?.items?.posts || [])], postsNextCursor: result?.items?.postsNextCursor || null } } : result);
    } catch (error) {
      setRemoteError(error?.message || "More posts could not be loaded.");
    } finally {
      setPostsMoreLoading(false);
    }
  };

  const displayPeople = tab === "People" ? remotePeople : people;
  const displayPosts = query.trim() && tab === "Posts"
    ? (remotePosts.length ? remotePosts : filtered)
    : tab === "For you" && !query.trim()
      ? personalPosts
      : filtered;

  return <div className="page discover-page">
    <div className="discover-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" aria-label="Search discover" /></div>

    <div className="tabs5" role="tablist" aria-label="Discover sections">
      {["For you", "People", "Posts"].map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "active" : ""} onClick={() => { setRemote(null); setRemoteError(""); setTab(item); }}>{item}</button>)}
    </div>

    {tab === "For you" && <section className="card">
      <header><div><small>FROM THE COMMUNITY</small><h2>Trending hashtags</h2></div><Hash size={18} aria-hidden="true" /></header>
      {trends.length ? trends.map(({ tag, count }) => <button className="discover-row" key={tag} type="button" onClick={() => { setQuery(tag); setTab("Posts"); }}><span><strong>{tag}</strong><small>{count ? `${count} ${count === 1 ? "post" : "posts"}` : "Explore conversation"}</small></span></button>) : <div className="empty"><p>Hashtags from published posts will appear here.</p></div>}
    </section>}

    {(tab === "For you" || tab === "People") && <section className="card">
      <header><div><small>WHO TO FOLLOW</small><h2>Who to follow</h2></div><Users size={18} aria-hidden="true" /></header>
      {remoteLoading && tab === "People" ? <div className="empty" role="status"><p>Searching…</p></div> : remoteError ? <div className="empty" role="alert"><p>{remoteError}</p></div> : displayPeople.length ? displayPeople.map(({ username, name, avatarUrl, following: serverFollowing, location, interests }) => <div className="person" key={username}>
        <button type="button" className="avatar avatar--small person-avatar" onClick={() => onOpen?.("/user/" + username)} aria-label={"Open " + name}><span>{String(name || username).charAt(0).toUpperCase()}</span>{avatarUrl && <img src={resolveApiUrl(avatarUrl)} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />}</button>
        <div><strong>{name}</strong><span>@{username}{location ? " · " + location : interests?.length ? " · " + interests.slice(0, 2).join(", ") : ""}</span></div>
        <button type="button" className="follow" onClick={async () => { await onFollow?.(username); setRemote((current) => current ? { ...current, items: { ...current.items, people: (current.items.people || []).filter((person) => person.username !== username) } } : current); }}>{serverFollowing || followingUsers.has(String(username).toLowerCase()) ? "Following" : "Follow"}</button>
      </div>) : <div className="empty"><p>No more accounts to connect with right now.</p></div>}
      {tab === "People" && peopleNextCursor && <div className="discover-more"><button type="button" onClick={() => { void loadMorePeople(); }} disabled={peopleMoreLoading}>{peopleMoreLoading ? "Loading…" : "More people"}</button></div>}
    </section>}

    {(tab === "For you" || tab === "Posts") && <section className="card discover-posts">
      <header><div><small>POSTS</small><h2>{tab === "For you" ? "For you" : "Explore posts"}</h2></div></header>
      {displayPosts.length ? displayPosts.map((post) => <PostCard key={post.id} post={post} onLike={onLike} onSave={onSave} onRepost={onRepost} onFollow={() => onFollow?.(String(post.h || post.username || "").replace("@", "").toLowerCase())} onOpen={onOpen} />) : <div className="empty"><p>{query.trim() ? "No public posts match your search yet." : "No posts are available yet."}</p></div>}
      {tab === "Posts" && postsNextCursor && <div ref={postsLoadMoreRef} className="discover-more"><button type="button" onClick={() => { void loadMorePosts(); }} disabled={postsMoreLoading}>{postsMoreLoading ? "Loading…" : "More posts"}</button></div>}
    </section>}
    {tab === "For you" && !query.trim() && personalLoading && <div className="empty" role="status"><p>Personalizing your Discover feed…</p></div>}
  </div>;
}