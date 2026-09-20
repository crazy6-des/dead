import React, { useMemo, useState } from "react";
import { Bell, Heart, MoreHorizontal, Paperclip, Send } from "lucide-react";
import { APP_ROUTES } from "../../app/routes.js";
import PostCard from "../post/PostCard.jsx";

const NOTIFICATIONS = [
  { id: "n1", name: "Maya Okafor", type: "like", text: "liked your post", time: "2m", verified: false },
  { id: "n2", name: "Daniel Cole", type: "follow", text: "started following you", time: "18m", verified: false },
  { id: "n3", name: "Nia James", type: "reply", text: "replied to your post", time: "1h", verified: false },
  { id: "n4", name: "S Team", type: "mention", text: "mentioned you", time: "3h", verified: true }
];

export function NotificationsRoute({ onOpen }) {
  const [tab, setTab] = useState("All");
  const [read, setRead] = useState(() => new Set());

  const visible = useMemo(() => {
    if (tab === "Mentions") return NOTIFICATIONS.filter((item) => item.type === "mention" || item.type === "reply");
    if (tab === "Verified") return NOTIFICATIONS.filter((item) => item.verified);
    return NOTIFICATIONS;
  }, [tab]);

  const openNotification = (item) => {
    setRead((current) => new Set(current).add(item.id));
    onOpen?.(item.type === "mention" || item.type === "reply" ? "/post/1/replies" : APP_ROUTES.PROFILE);
  };

  return <div className="page">
    <div className="heading"><small>INBOX</small><h2>Notifications</h2><p>Every interaction, follow and mention in one place.</p></div>
    <div className="tabs3">{["All", "Mentions", "Verified"].map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
    <section className="card">
      {visible.length ? visible.map((item) => <button className={"notice " + (read.has(item.id) ? "is-read" : "")} key={item.id} onClick={() => openNotification(item)}>
        <span className="avatar avatar--small">{item.name[0]}</span>
        <span><p><b>{item.name}</b> {item.text}</p><span>{item.time}{!read.has(item.id) && " · New"}</span></span>
        <Heart size={16} fill={item.type === "like" ? "currentColor" : "none"}/>
      </button>) : <div className="empty"><h3>No notifications here yet.</h3><p>New activity will appear in this view.</p></div>}
    </section>
  </div>;
}

const INITIAL_MESSAGES = {
  "Maya Okafor": [
    { id: "m1", direction: "in", text: "Are you building this tonight?" },
    { id: "m2", direction: "out", text: "Yep. Making S feel fast and genuinely social." },
    { id: "m3", direction: "in", text: "I like the direction. The creation surface feels different." }
  ],
  "Daniel Cole": [
    { id: "d1", direction: "in", text: "Sent a photo" }
  ],
  "Nia James": [
    { id: "n1", direction: "in", text: "What are you listening to while you work?" }
  ]
};

export function MessagesRoute() {
  const [selected, setSelected] = useState("Maya Okafor");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(INITIAL_MESSAGES);

  const currentMessages = messages[selected] || [];
  const sendMessage = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => ({
      ...current,
      [selected]: [...(current[selected] || []), { id: Date.now(), direction: "out", text }]
    }));
    setDraft("");
  };

  const selectConversation = (name) => {
    setSelected(name);
    setDraft("");
  };

  return <div className="messages">
    <aside>{Object.keys(INITIAL_MESSAGES).map((name) => {
      const latest = messages[name]?.at(-1);
      return <button key={name} className={"conversation " + (selected === name ? "active" : "")} onClick={() => selectConversation(name)}>
        <span className="avatar avatar--small">{name[0]}</span>
        <span><b>{name}</b><small>{latest?.text || "Start a conversation"}</small></span>
        <small>{name === selected ? "now" : "1m"}</small>
      </button>;
    })}</aside>
    <section className="chat">
      <header><span className="avatar avatar--small">{selected[0]}</span><span><b>{selected}</b><small>Active recently</small></span><MoreHorizontal/></header>
      <div className="chat-body">
        <small>Today</small>
        {currentMessages.map((message) => <div className={"bubble " + (message.direction === "out" ? "out" : "in")} key={message.id}>{message.text}</div>)}
      </div>
      <footer>
        <Paperclip/>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder={"Message " + selected + "..."} aria-label={"Message " + selected}/>
        <button onClick={sendMessage} disabled={!draft.trim()} aria-label="Send message"><Send/></button>
      </footer>
    </section>
  </div>;
}

export function SavedRoute({ posts, onSave, onOpen }) {
  const saved = posts.filter((p) => p.saved);
  return <div className="page"><div className="heading"><small>YOUR LIBRARY</small><h2>Saved</h2><p>Posts you chose to keep.</p></div>{saved.length ? saved.map((p) => <PostCard key={p.id} post={p} onSave={onSave} onOpen={onOpen}/>) : <div className="empty"><h3>Your saved posts will live here.</h3><p>Bookmark something from your feed and return to it anytime.</p></div>}</div>;
}
