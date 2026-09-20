import React, { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import PostCard from "../post/PostCard.jsx";
import { PRODUCT_IDENTITY } from "../../app/productIdentity.js";

const TABS = ["For You", "Following", "Latest"];

export default function HomeRoute({ posts, onLike, onSave, onFollow, onRepost, onCreate, onOpen }) {
  const [tab, setTab] = useState("For You");
  const visible = useMemo(() => {
    const source = Array.isArray(posts) ? posts : [];
    if (tab === "Following") return source.filter((post) => post.following);
    if (tab === "Latest") return [...source].reverse();
    return source;
  }, [posts, tab]);

  return <>
    <div className="feed-tabs" role="tablist" aria-label="Timeline">
      {TABS.map((name) => <button
        key={name}
        type="button"
        role="tab"
        aria-selected={tab === name}
        className={tab === name ? "selected" : ""}
        onClick={() => setTab(name)}
      >{name}</button>)}
    </div>
    <button className="quick" type="button" onClick={onCreate}>
      <span className="avatar">D</span>
      <span><b>{PRODUCT_IDENTITY.composerPrompt}</b><small>{PRODUCT_IDENTITY.composerHint}</small></span>
      <Plus size={19} aria-hidden="true" />
    </button>
    {visible.length > 0 ? visible.map((post) => <PostCard key={post.id} post={post} onLike={onLike} onSave={onSave} onFollow={onFollow} onRepost={onRepost} onOpen={onOpen} />) : <div className="empty" role="status">
      <h3>{tab === "Following" ? "No posts from followed accounts yet" : "Your timeline is empty"}</h3>
      <p>{tab === "Following" ? "Follow accounts to see their posts here when real feed data is available." : "Posts will appear here when the feed service returns real data."}</p>
    </div>}
  </>;
}
