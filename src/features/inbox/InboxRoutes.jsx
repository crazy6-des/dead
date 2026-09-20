import React, { useState } from "react";
import { Bell, Check, Heart, MoreHorizontal, Paperclip, Send } from "lucide-react";
import { APP_ROUTES } from "../../app/routes.js";
export function NotificationsRoute({ onOpen }) {
  const [tab, setTab] = useState("All");
  const items = [["Maya Okafor","liked your post","2m"],["Daniel Cole","started following you","18m"],["Nia James","replied to your post","1h"],["S Team","mentioned you","3h"]];
  const visible = tab === "Mentions" ? items.filter((x) => x[1].includes("mentioned") || x[1].includes("replied")) : items;
  return <div className="page"><div className="heading"><small>INBOX</small><h2>Notifications</h2><p>Every interaction, follow and mention in one place.</p></div><div className="tabs3">{["All","Mentions","Verified"].map((x) => <button key={x} className={tab === x ? "active" : ""} onClick={() => setTab(x)}>{x}</button>)}</div><section className="card">{visible.map((x) => <button className="notice" key={x[0]+x[2]} onClick={() => onOpen?.(APP_ROUTES.PROFILE)}><span className="avatar avatar--small">{x[0][0]}</span><span><p><b>{x[0]}</b> {x[1]}</p><span>{x[2]}</span></span><Heart size={16}/></button>)}</section></div>;
}
export function MessagesRoute() {
  const [selected, setSelected] = useState("Maya Okafor");
  const [draft, setDraft] = useState("");
  const conversations = ["Maya Okafor","Daniel Cole","Nia James"];
  return <div className="messages"><aside>{conversations.map((name, i) => <button key={name} className={"conversation " + (selected === name ? "active" : "")} onClick={() => setSelected(name)}><span className="avatar avatar--small">{name[0]}</span><span><b>{name}</b><small>{i ? "Sent a photo" : "Are you building this tonight?"}</small></span><small>{i + 1}m</small></button>)}</aside><section className="chat"><header><span className="avatar avatar--small">{selected[0]}</span><span><b>{selected}</b><small>Active recently</small></span><MoreHorizontal/></header><div className="chat-body"><small>Today</small><div className="bubble in">Are you building this tonight?</div><div className="bubble out">Yep. Making S feel fast and genuinely social.</div><div className="bubble in">I like the direction. The creation surface feels different.</div></div><footer><Paperclip/><input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message..."/><button onClick={() => setDraft("")}><Send/></button></footer></section></div>;
}
export function SavedRoute({ posts, onSave, onOpen }) {
  const saved = posts.filter((p) => p.saved);
  return <div className="page"><div className="heading"><small>YOUR LIBRARY</small><h2>Saved</h2><p>Posts you chose to keep.</p></div>{saved.length ? saved.map((p) => <PostCardShim key={p.id} post={p} onSave={onSave} onOpen={onOpen}/>) : <div className="empty"><h3>Your saved posts will live here.</h3><p>Bookmark something from your feed and return to it anytime.</p></div>}</div>;
}
function PostCardShim({ post, onSave, onOpen }) {
  return <article className="post"><div className="avatar">{(post.a || "S")[0]}</div><div className="post__body"><button className="post-content-hit" onClick={() => onOpen?.("/post/" + post.id)}><p className="post__text">{post.x}</p></button><div className="post__actions"><button className="is-saved" onClick={() => onSave?.(post.id)}>Saved</button></div></div></article>;
}
