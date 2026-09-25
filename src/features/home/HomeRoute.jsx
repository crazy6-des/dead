import React, { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import PostCard from "../post/PostCard.jsx";
import AppErrorBoundary from "../../ui/AppErrorBoundary.jsx";
import { PRODUCT_IDENTITY } from "../../app/productIdentity.js";
import { getUserPresentation } from "../auth/userPresentation.js";

const TABS = ["For You", "Following", "Latest"];

export default function HomeRoute({ currentUser, posts, onLike, onSave, onFollow, onRepost, onCreate, onOpen, onModeChange, loading = false, loadingMore = false, hasMore = false, error = "", onRetry, onLoadMore }) {
  const [tab, setTab] = useState("For You");
  const loadMoreRef = useRef(null);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMore || loading || loadingMore || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) onLoadMore?.();
    }, { rootMargin: "720px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, onLoadMore]);
  const visible = Array.isArray(posts) ? posts : [];
  const presentation = getUserPresentation(currentUser);
  let timeline;
  if (loading) {
    timeline = <div className="empty feed-state" role="status" aria-live="polite"><h3>Loading your timeline…</h3><p>Fetching the latest posts from S.</p></div>;
  } else if (error) {
    timeline = <div className="empty feed-state" role="alert"><h3>We couldn’t load this timeline</h3><p>{error}</p>{onRetry && <button className="primary" type="button" onClick={onRetry}>Try again</button>}</div>;
  } else if (visible.length > 0) {
    timeline = <div className="feed-list" aria-live="polite">
      {visible.map((post, index) => <AppErrorBoundary key={post.id || `feed-${index}`}><PostCard post={post} onLike={onLike} onSave={onSave} onFollow={onFollow} onRepost={onRepost} onOpen={onOpen} /></AppErrorBoundary>)}
      {hasMore && <div ref={loadMoreRef} className="feed-more" aria-label="More posts"><button className="outline" type="button" onClick={onLoadMore} disabled={loadingMore}>{loadingMore ? "Loading…" : "Load more"}</button></div>}
    </div>;
  } else {
    timeline = <div className="empty feed-state" role="status">
      <h3>{tab === "Following" ? "No posts from followed accounts yet" : "Your timeline is empty"}</h3>
      <p>{tab === "Following" ? "Follow accounts to see their posts here." : "Posts will appear here when the feed service returns real data."}</p>
    </div>;
  }
  return <>
    <div className="feed-tabs" role="tablist" aria-label="Timeline">
      {TABS.map((name) => <button key={name} type="button" role="tab" aria-selected={tab === name} className={tab === name ? "selected" : ""} onClick={() => { setTab(name); onModeChange?.(name); }}>{name}</button>)}
    </div>
    <button className="quick" type="button" onClick={onCreate}>
      <span className="avatar">{presentation.avatarInitial}</span>
      <span><b>{PRODUCT_IDENTITY.composerPrompt}</b><small>{PRODUCT_IDENTITY.composerHint}</small></span>
      <Plus size={19} aria-hidden="true" />
    </button>
    {timeline}
  </>;
}
