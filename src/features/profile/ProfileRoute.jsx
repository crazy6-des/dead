import React, { useState } from "react";
import { Check, Link2, MoreHorizontal } from "lucide-react";
import PostCard from "../post/PostCard.jsx";
export default function ProfileRoute({ posts, onLike, onSave, onFollow, onRepost, onFollowUser, followingUsers = new Set(), onOpen }) {
  const [tab, setTab] = useState("Posts");
  const tabs = ["Posts","Replies","Media","Likes"];
  const isOwnProfile = true;
  const following = followingUsers.has("david");
  const visible = tab === "Media" ? posts.filter((p) => p.media || p.music) : tab === "Likes" ? posts.filter((p) => p.liked) : tab === "Replies" ? posts.filter((p) => p.r > 0) : posts;
  return <div className="profile">
    <div className="cover"><div/></div>
    <div className="identity"><div className="profile-avatar avatar">D</div><div className="profile-actions"><button className="icon-btn"><MoreHorizontal/></button><button className={following ? "outline" : "primary"} onClick={() => isOwnProfile ? onOpen?.("/settings?section=profile") : onFollowUser?.("david")}>{isOwnProfile ? "Edit profile" : "Follow"}</button></div></div>
    <div className="profile-info"><h2>David <span className="verified"><Check size={10}/></span></h2><span>@david</span><p>Building S — a place to be seen, connect, create and belong.</p><div className="links"><span><Link2/>s.social</span><span>Joined September 2026</span></div><div className="stats"><button onClick={() => onOpen?.("/following/david")}><b>142</b> Following</button><button onClick={() => onOpen?.("/followers/david")}><b>1.8K</b> Followers</button></div></div>
    <div className="tabs4">{tabs.map((x) => <button key={x} className={tab === x ? "active" : ""} onClick={() => setTab(x)}>{x}</button>)}</div>
    {visible.length ? visible.slice(0,8).map((p) => <PostCard key={p.id} post={p} onLike={onLike} onSave={onSave} onFollow={onFollow} onRepost={onRepost} onOpen={onOpen}/>) : <div className="empty"><h3>No {tab.toLowerCase()} yet</h3><p>This space will fill as your activity grows.</p></div>}
  </div>;
}
