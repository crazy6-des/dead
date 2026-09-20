import React, { useEffect, useMemo, useState } from "react";
import { Heart, MoreHorizontal, Paperclip, Send } from "lucide-react";
import { APP_ROUTES } from "../../app/routes.js";
import PostCard from "../post/PostCard.jsx";
import { NOTIFICATION_FILTERS } from "../notifications/notificationContract.js";
import { createNotificationAdapter } from "../../services/notificationService.js";
import { createMessageAdapter } from "../../services/messageService.js";

const NOTIFICATION_SEED = [
  { id: "n1", actor: "Maya Okafor", username: "maya", type: "like", text: "liked your post", time: "2m", target: "/post/1" },
  { id: "n2", actor: "Daniel Cole", username: "daniel", type: "follow", text: "started following you", time: "18m", target: "/user/daniel" },
  { id: "n3", actor: "Nia James", username: "nia", type: "reply", text: "replied to your post", time: "1h", target: "/post/1/replies" },
  { id: "n4", actor: "S Team", username: "s", type: "mention", text: "mentioned you", time: "3h", verified: true, target: "/post/1/replies" }
];

const MESSAGE_SEED = {
  "Maya Okafor": [
    { id: "m1", direction: "in", senderId: "maya", text: "Are you building this tonight?" },
    { id: "m2", direction: "out", senderId: "me", text: "Yep. Making S feel fast and genuinely social." },
    { id: "m3", direction: "in", senderId: "maya", text: "I like the direction. The creation surface feels different." }
  ],
  "Daniel Cole": [{ id: "d1", direction: "in", senderId: "daniel", text: "Sent a photo" }],
  "Nia James": [{ id: "n1", direction: "in", senderId: "nia", text: "What are you listening to while you work?" }]
};

export function NotificationsRoute({ onOpen }) {
  const notifications = useMemo(() => createNotificationAdapter({ devSeed: NOTIFICATION_SEED }), []);
  const [tab, setTab] = useState(NOTIFICATION_FILTERS.ALL);
  const [items, setItems] = useState(() => NOTIFICATION_SEED);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    notifications.list({ filter: tab }).then((page) => {
      if (active) { setItems(page.items || []); setError(""); setLoading(false); }
    }).catch((err) => {
      if (active) { setError(err?.message || "Could not load notifications."); setLoading(false); }
    });
    return () => { active = false; };
  }, [tab]);

  const unreadCount = items.filter((item) => !item.read).length;

  const openNotification = async (item) => {
    try { await notifications.markRead(item.id); } catch {}
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry));
    onOpen?.(item.target || (item.type === "follow" ? "/user/" + String(item.username || "").replace("@", "") : APP_ROUTES.PROFILE));
  };

  const markAllRead = async () => {
    try { await notifications.markAllRead(); } catch {}
    setItems((current) => current.map((item) => ({ ...item, read: true })));
  };

  return <div className="page">
    <div className="heading"><small>INBOX</small><h2>Notifications {unreadCount > 0 && <span className="badge">{unreadCount}</span>}</h2><p>Every interaction, follow and mention in one place.</p></div>
    <div className="tabs3">{[NOTIFICATION_FILTERS.ALL, NOTIFICATION_FILTERS.MENTIONS, NOTIFICATION_FILTERS.VERIFIED].map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
    {unreadCount > 0 && <div className="page-actions"><button className="outline" onClick={markAllRead}>Mark all as read</button></div>}
    <section className="card">
      {loading ? <div className="empty"><h3>Loading activity…</h3></div> :
       error ? <div className="empty"><h3>Could not load activity</h3><p>{error}</p></div> :
       items.length ? items.map((item) => <button className={"notice " + (item.read ? "is-read" : "")} key={item.id} onClick={() => openNotification(item)}>
        <span className="avatar avatar--small">{String(item.actor || "S")[0]}</span>
        <span><p><b>{item.actor || "S"}</b> {item.text}</p><span>{item.time}{!item.read && " · New"}</span></span>
        <Heart size={16} fill={item.type === "like" ? "currentColor" : "none"}/>
      </button>) : <div className="empty"><h3>No notifications here yet.</h3><p>New activity will appear in this view.</p></div>}
    </section>
  </div>;
}

export function MessagesRoute() {
  const messagesApi = useMemo(() => createMessageAdapter({ devSeed: MESSAGE_SEED }), []);
  const [conversations, setConversations] = useState(() => Object.keys(MESSAGE_SEED).map((name) => ({ id: name.toLowerCase().replace(/\s+/g, "-"), name })));
  const [selected, setSelected] = useState("maya-okafor");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(MESSAGE_SEED);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([messagesApi.listConversations(), messagesApi.listMessages(selected)]).then(([conversationPage, messagePage]) => {
      if (!active) return;
      setConversations(conversationPage.items || conversationPage || []);
      const selectedName = Object.keys(MESSAGE_SEED).find((name) => name.toLowerCase().replace(/\s+/g, "-") === selected);
      setMessages((current) => ({ ...current, [selectedName || selected]: messagePage.items || [] }));
      setLoading(false);
    }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selected]);

  const selectedConversation = conversations.find((item) => item.id === selected);
  const selectedName = selectedConversation?.name || "Maya Okafor";
  const currentMessages = messages[selectedName] || [];

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text) return;
    const optimistic = { id: "local-" + Date.now(), direction: "out", senderId: "me", text, status: "sending" };
    setMessages((current) => ({ ...current, [selectedName]: [...(current[selectedName] || []), optimistic] }));
    setDraft("");
    try {
      const sent = await messagesApi.send({ conversationId: selected, text });
      setMessages((current) => ({ ...current, [selectedName]: [...(current[selectedName] || []).filter((item) => item.id !== optimistic.id), { ...sent, direction: "out", status: "sent" }] }));
    } catch {
      setMessages((current) => ({ ...current, [selectedName]: (current[selectedName] || []).map((item) => item.id === optimistic.id ? { ...item, status: "failed" } : item) }));
    }
  };

  const selectConversation = (id) => { setSelected(id); setDraft(""); };

  return <div className="messages">
    <aside>{conversations.map((conversation) => {
      const latest = messages[conversation.name]?.at(-1);
      return <button key={conversation.id} className={"conversation " + (selected === conversation.id ? "active" : "")} onClick={() => selectConversation(conversation.id)}>
        <span className="avatar avatar--small">{conversation.name[0]}</span>
        <span><b>{conversation.name}</b><small>{latest?.text || "Start a conversation"}</small></span>
        <small>{selected === conversation.id ? "now" : "1m"}</small>
      </button>;
    })}</aside>
    <section className="chat">
      <header><span className="avatar avatar--small">{selectedName[0]}</span><span><b>{selectedName}</b><small>Active recently</small></span><MoreHorizontal/></header>
      <div className="chat-body">
        <small>Today</small>
        {loading ? <div className="empty"><p>Loading conversation…</p></div> : currentMessages.map((message) => <div className={"bubble " + (message.direction === "out" ? "out" : "in")} key={message.id}>{message.text}{message.status === "failed" && <small> · Failed</small>}{message.status === "sending" && <small> · Sending</small>}</div>)}
      </div>
      <footer>
        <Paperclip/>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder={"Message " + selectedName + "..."} aria-label={"Message " + selectedName}/>
        <button onClick={sendMessage} disabled={!draft.trim()} aria-label="Send message"><Send/></button>
      </footer>
    </section>
  </div>;
}

export function SavedRoute({ posts, onSave, onOpen }) {
  const saved = posts.filter((p) => p.saved);
  return <div className="page"><div className="heading"><small>YOUR LIBRARY</small><h2>Saved</h2><p>Posts you chose to keep.</p></div>{saved.length ? saved.map((p) => <PostCard key={p.id} post={p} onSave={onSave} onOpen={onOpen}/>) : <div className="empty"><h3>Your saved posts will live here.</h3><p>Bookmark something from your feed and return to it anytime.</p></div>}</div>;
}
