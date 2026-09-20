import React, { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import PostCard from "../post/PostCard.jsx";
export default function HomeRoute({ posts, onLike, onSave, onFollow, onRepost, onCreate, onOpen }) {
  const [tab, setTab] = useState("For You");
  const visible = useMemo(() => tab === "Following" ? posts.filter((p) => p.following) : tab === "Latest" ? [...posts].reverse() : posts, [posts, tab]);
  return <><div className="feed-tabs">{["For You", "Following", "Latest"].map((name) => <button key={name} className={tab === name ? "selected" : ""} onClick={() => setTab(name)}>{name}</button>)}</div>
    <button className="quick" onClick={onCreate}><span className="avatar">D</span><span><b>What is happening?</b><small>Share a thought, image, sound or moment.</small></span><Plus size={19}/></button>
    {visible.map((post) => <PostCard key={post.id} post={post} onLike={onLike} onSave={onSave} onFollow={onFollow} onRepost={onRepost} onOpen={onOpen}/>)}
  </>;
}
