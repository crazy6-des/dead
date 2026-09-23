import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Flag, Heart, ImagePlus, MoreHorizontal, Paperclip, Send, X } from "lucide-react";
import { APP_ROUTES } from "../../app/routes.js";
import PostCard from "../post/PostCard.jsx";
import { NOTIFICATION_FILTERS } from "../notifications/notificationContract.js";
import { createNotificationAdapter } from "../../services/notificationService.js";
import { createMessageAdapter } from "../../services/messageService.js";
import { bookmarkService } from "../../services/bookmarkService.js";
import { MESSAGE_IMAGE_LIMITS } from "../messages/messageContract.js";
import { moderationService } from "../../services/moderationService.js";
import { REPORT_REASONS } from "../moderation/moderationContract.js";

function formatConversationTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  if (diff < 60 * 1000) return "now";
  if (diff < 60 * 60 * 1000) return Math.floor(diff / (60 * 1000)) + "m";
  if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / (60 * 60 * 1000)) + "h";
  if (diff < 7 * 24 * 60 * 60 * 1000) return Math.floor(diff / (24 * 60 * 60 * 1000)) + "d";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function messageDateKey(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

function formatMessageDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Today";
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function NotificationsRoute({ onOpen }) {
  const notifications = useMemo(() => createNotificationAdapter(), []);
  const [tab, setTab] = useState(NOTIFICATION_FILTERS.ALL);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const page = await notifications.list({ filter: tab });
      setItems(page.items || []);
      setError("");
    } catch (err) {
      setError(err?.message || "Could not load notifications.");
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }, [notifications, tab]);

  useEffect(() => {
    let active = true;
    notifications.list({ filter: tab }).then((page) => {
      if (!active) return;
      setItems(page.items || []);
      setLoading(false);
    }).catch((err) => {
      if (!active) return;
      setError(err?.message || "Could not load notifications.");
      setLoading(false);
    });
    return () => { active = false; };
  }, [tab, notifications]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") loadNotifications({ silent: true });
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadNotifications]);

  const unreadCount = items.filter((item) => !item.read).length;

  const openNotification = async (item) => {
    try {
      await notifications.markRead(item.id);
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry));
    } catch (err) {
      setError(err?.message || "Could not mark notification as read.");
      return;
    }
    onOpen?.(item.target || (item.type === "follow" && item.username ? "/user/" + encodeURIComponent(String(item.username).replace(/^@/, "")) : APP_ROUTES.PROFILE));
  };

  const markAllRead = async () => {
    try {
      await notifications.markAllRead();
      setItems((current) => current.map((item) => ({ ...item, read: true })));
      setError("");
    } catch (err) {
      setError(err?.message || "Could not mark notifications as read.");
    }
  };

  return <div className="page">
    <div className="heading"><small>INBOX</small><h2>Notifications {unreadCount > 0 && <span className="badge">{unreadCount}</span>}</h2><p>Likes, follows, replies, reposts and other activity.</p></div>
    <div className="tabs3">{[NOTIFICATION_FILTERS.ALL, NOTIFICATION_FILTERS.REPLIES].map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => { setError(""); setLoading(true); setTab(item); }} aria-pressed={tab === item}>{item}</button>)}</div>
    <div className="page-actions">
      {unreadCount > 0 && <button className="outline" onClick={markAllRead}>Mark all as read</button>}
      <button className="outline" onClick={() => loadNotifications()} disabled={loading || refreshing} aria-label="Refresh notifications">{refreshing ? "Refreshing…" : "Refresh"}</button>
    </div>
    <section className="card" aria-busy={loading || refreshing}>
      {loading ? <div className="empty" role="status"><h3>Loading activity…</h3></div> :
       error ? <div className="empty" role="alert"><h3>Could not load activity</h3><p>{error}</p><button className="outline" onClick={() => loadNotifications()}>Try again</button></div> :
       items.length ? items.map((item) => <button className={"notice " + (item.read ? "is-read" : "is-unread")} key={item.id} onClick={() => openNotification(item)} aria-label={(item.actor || "S") + " " + item.text + (item.read ? "" : ", unread")}>
        <span className="avatar avatar--small">{String(item.actor || "S")[0]}</span>
        <span><p><b>{item.actor || "S"}</b> {item.text}</p><span>{item.time}{!item.read && " · New"}</span></span>
        {!item.read && <span className="notice-unread" aria-hidden="true"/>}
        <Heart size={16} fill={item.type === "like" ? "currentColor" : "none"} aria-hidden="true"/>
      </button>) : <div className="empty"><h3>No notifications here yet.</h3><p>New activity will appear in this view.</p></div>}
    </section>
  </div>;
}
export function MessagesRoute({ currentUserId = null }) {
  const messagesApi = useMemo(() => createMessageAdapter(), []);
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(() => new URLSearchParams(window.location.search).get("conversation") || null);
  const [draft, setDraft] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [messages, setMessages] = useState({});
  const [messageCursors, setMessageCursors] = useState({});
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [failedMedia, setFailedMedia] = useState({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageReport, setMessageReport] = useState(null);
  const [messageReportNote, setMessageReportNote] = useState("");
  const [messageReportBusy, setMessageReportBusy] = useState(false);
  const [error, setError] = useState("");
  const [conversationError, setConversationError] = useState("");
  const imageInputRef = useRef(null);
  const chatBodyRef = useRef(null);

  useEffect(() => () => {
    if (selectedImage?.url?.startsWith("blob:")) URL.revokeObjectURL(selectedImage.url);
  }, [selectedImage]);

  useEffect(() => {
    const syncConversationFromUrl = () => {
      const conversationId = new URLSearchParams(window.location.search).get("conversation") || null;
      setSelected(conversationId);
      setDraft("");
      setError("");
      setConversationError("");
    };
    window.addEventListener("popstate", syncConversationFromUrl);
    return () => window.removeEventListener("popstate", syncConversationFromUrl);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    messagesApi.listConversations().then(async (conversationPage) => {
      if (!active) return;
      const nextConversations = conversationPage.items || conversationPage || [];
      setConversations(nextConversations);
      setConversationError("");
      if (!selected) {
        if (nextConversations[0]?.id) {
          setSelected(nextConversations[0].id);
          return;
        }
        setLoading(false);
        return;
      }
      const selectedConversation = nextConversations.find((item) => item.id === selected);
      if (!selectedConversation) {
        setConversationError("Conversation not found.");
        setLoading(false);
        return;
      }
      const [messagePage] = await Promise.all([
        messagesApi.listMessages(selected),
        messagesApi.markConversationRead(selected),
      ]);
      if (!active) return;
      setMessages((current) => ({ ...current, [selectedConversation.id]: messagePage.items || [] }));
      setMessageCursors((current) => ({ ...current, [selectedConversation.id]: messagePage.nextCursor || null }));
      setConversations((current) => current.map((item) => item.id === selected ? { ...item, unreadCount: 0 } : item));
      setLoading(false);
    }).catch((err) => {
      if (active) { setError(err?.message || "Could not load conversations."); setLoading(false); }
    });
    return () => { active = false; };
  }, [selected, messagesApi]);

  const selectedConversation = conversations.find((item) => item.id === selected);
  const hasSelectedConversation = Boolean(selectedConversation);
  const selectedName = selectedConversation?.name || "Select a conversation";
  const orderedMessages = useMemo(() => [...(messages[selected] || [])].sort((a, b) => {
    const aTime = Date.parse(a?.createdAt || "") || 0;
    const bTime = Date.parse(b?.createdAt || "") || 0;
    if (aTime !== bTime) return aTime - bTime;
    return String(a?.id || "").localeCompare(String(b?.id || ""));
  }), [messages, selected]);
  const orderedConversations = useMemo(() => [...conversations].sort((a, b) => {
    const aTime = Date.parse(a?.updatedAt || "") || 0;
    const bTime = Date.parse(b?.updatedAt || "") || 0;
    if (aTime !== bTime) return bTime - aTime;
    return String(a?.id || "").localeCompare(String(b?.id || ""));
  }), [conversations]);
  const renderMessage = (message) => ({ ...message, direction: message.direction || (currentUserId && message.senderId === currentUserId ? "out" : "in") });
  const submitMessageReport = async () => {
    if (!messageReport?.id || !messageReport.reason || messageReportBusy) return;
    setMessageReportBusy(true);
    try { await moderationService.report({ targetType: "message", targetId: messageReport.id, reason: messageReport.reason, note: messageReportNote }); setMessageReport(null); setMessageReportNote(""); setError(""); }
    catch (err) { setError(err?.message || "Could not submit the report."); }
    finally { setMessageReportBusy(false); }
  };

  useEffect(() => {
    if (!selected || loading || conversationError || loadingOlder) return;
    const body = chatBodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [selected, loading, conversationError, loadingOlder]);

  const loadOlderMessages = async () => {
    const cursor = messageCursors[selected];
    if (!selected || !cursor || loadingOlder) return;
    setLoadingOlder(true);
    setError("");
    try {
      const page = await messagesApi.listMessages(selected, { cursor });
      const older = page.items || [];
      const chatBody = chatBodyRef.current;
      const previousHeight = chatBody?.scrollHeight || 0;
      setMessages((current) => {
        const existing = current[selected] || [];
        const seen = new Set(existing.map((item) => item.id));
        return { ...current, [selected]: [...older.filter((item) => !seen.has(item.id)), ...existing] };
      });
      setMessageCursors((current) => ({ ...current, [selected]: page.nextCursor || null }));
      window.requestAnimationFrame(() => {
        if (chatBody) chatBody.scrollTop += chatBody.scrollHeight - previousHeight;
      });
    } catch (err) {
      setError(err?.message || "Could not load older messages.");
    } finally {
      setLoadingOlder(false);
    }
  };

  const clearSelectedImage = () => {
    setSelectedImage((current) => {
      if (current?.url?.startsWith("blob:")) URL.revokeObjectURL(current.url);
      return null;
    });
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!MESSAGE_IMAGE_LIMITS.TYPES.includes(file.type)) {
      setError("Choose a JPG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size <= 0 || file.size > MESSAGE_IMAGE_LIMITS.MAX_SIZE) {
      setError("Message images must be 10 MB or smaller.");
      return;
    }
    setError("");
    setSelectedImage((current) => {
      if (current?.url?.startsWith("blob:")) URL.revokeObjectURL(current.url);
      return { file, url: URL.createObjectURL(file), name: file.name, type: file.type, size: file.size };
    });
  };

  const sendMessage = async () => {
    const text = draft.trim();
    const image = selectedImage;
    if ((!text && !image) || sending || !selectedConversation) return;
    const optimistic = {
      id: "local-" + Date.now(),
      conversationId: selected,
      senderId: currentUserId,
      direction: "out",
      type: image ? "image" : "text",
      text,
      media: image ? { url: image.url, mediaType: "image", name: image.name, mimeType: image.type, size: image.size } : null,
      status: "sending",
    };
    setSending(true);
    setError("");
    setMessages((current) => ({ ...current, [selected]: [...(current[selected] || []), optimistic] }));
    window.requestAnimationFrame(() => {
      if (chatBodyRef.current) chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    });
    let uploadedMediaId = null;
    try {
      let media = null;
      if (image) {
        media = await messagesApi.uploadImage(image.file);
        uploadedMediaId = media?.mediaId || null;
        if (!uploadedMediaId) throw new Error("Image upload did not return a media id.");
      }
      const sent = await messagesApi.send({ conversationId: selected, type: image ? "image" : "text", text, mediaId: uploadedMediaId });
      setConversations((current) => current.map((item) => item.id === selected ? { ...item, lastMessage: sent?.text || (sent?.media ? "Image" : ""), updatedAt: sent?.createdAt || item.updatedAt } : item));
      setMessages((current) => ({ ...current, [selected]: [...(current[selected] || []).filter((item) => item.id !== optimistic.id), { ...sent, direction: "out", status: "sent" }] }));
      setDraft("");
      clearSelectedImage();
      setError("");
    } catch (err) {
      if (uploadedMediaId) {
        try { await messagesApi.deleteMedia(uploadedMediaId); } catch (cleanupError) { setError((current) => current || cleanupError?.message || "Could not clean up the uploaded image."); }
      }
      setMessages((current) => ({ ...current, [selected]: (current[selected] || []).map((item) => item.id === optimistic.id ? { ...item, status: "failed" } : item) }));
      setError(err?.message || "Could not send this message.");
    } finally {
      setSending(false);
    }
  };

  const selectConversation = (id) => {
    clearSelectedImage();
    setSelected(id);
    setDraft("");
    setError("");
    setConversationError("");
    setFailedMedia({});
    const params = new URLSearchParams(window.location.search);
    params.set("conversation", id);
    const nextUrl = window.location.pathname + "?" + params.toString() + window.location.hash;
    const currentUrl = window.location.pathname + window.location.search + window.location.hash;
    if (nextUrl !== currentUrl) window.history.pushState({}, "", nextUrl);
  };

  return <div className="messages">
    <aside>{orderedConversations.map((conversation) => {
      const latest = messages[conversation.id]?.length ? [...messages[conversation.id]].sort((a, b) => (Date.parse(b?.createdAt || "") || 0) - (Date.parse(a?.createdAt || "") || 0))[0] : null;
      const preview = latest?.text || (latest?.media ? "Image" : conversation.lastMessage || "No messages yet");
      const previewTime = latest?.createdAt || conversation.updatedAt;
      const avatarLetter = String(conversation.name || conversation.username || "S").trim().charAt(0).toUpperCase() || "S";
      return <button key={conversation.id} className={"conversation " + (selected === conversation.id ? "active" : "")} onClick={() => selectConversation(conversation.id)}>
        <span className="avatar avatar--small">{avatarLetter}</span>
        <span><b>{conversation.name || conversation.username || "Conversation"}</b><small>{preview}</small></span>
        <small>{formatConversationTime(previewTime)}</small>
      </button>;
    })}</aside>
    <section className="chat">
      <header><span className="avatar avatar--small">{String(selectedName).charAt(0).toUpperCase()}</span><span><b>{selectedName}</b><small>{selectedConversation?.username ? "@" + selectedConversation.username : "Conversation"}</small></span><MoreHorizontal/></header>
      <div className="chat-body" ref={chatBodyRef}>
        {!loading && !conversationError && messageCursors[selected] && <button className="outline message-load-older" onClick={loadOlderMessages} disabled={loadingOlder}>{loadingOlder ? "Loading older messages…" : "Load older messages"}</button>}
        {loading ? <div className="empty" role="status"><p>Loading conversation…</p></div> : conversationError ? <div className="empty" role="alert"><h3>Conversation unavailable</h3><p>{conversationError}</p></div> :
         orderedMessages.map((rawMessage, index) => {
          const message = renderMessage(rawMessage);
          const previous = orderedMessages[index - 1];
          const showDate = message.createdAt && (!previous || messageDateKey(message.createdAt) !== messageDateKey(previous.createdAt));
          return <React.Fragment key={message.id}>
            {showDate && <small className="message-date">{formatMessageDate(message.createdAt)}</small>}
            <div className={"bubble " + (message.direction === "out" ? "out" : "in")}>
            {message.media?.url && !failedMedia[message.id] && <img className="message-image" src={message.media.url} alt={message.media.name || "Shared image"} onError={() => setFailedMedia((current) => ({ ...current, [message.id]: true }))} />}
              {message.media?.url && failedMedia[message.id] && <div className="message-media-error" role="img" aria-label="Image could not be loaded">Image unavailable</div>}
            {message.text && <div>{message.text}</div>}
            {message.status === "failed" && <small> · Failed</small>}
            {message.status === "sending" && <small> · Sending</small>}
            {message.direction === "in" && !String(message.id).startsWith("optimistic-") && <button type="button" className="message-report-button" onClick={() => { setMessageReport({ id: message.id, reason: null }); setMessageReportNote(""); }}><Flag size={13}/>Report</button>}
            </div>
            {messageReport?.id === message.id && <div className="message-report-form" role="dialog" aria-label="Report message">
              <strong>Report this message</strong><small>Choose a reason and optionally add context.</small>
              <div className="message-report-reasons">{Object.entries(REPORT_REASONS).map(([key,value]) => <button key={value} type="button" className={messageReport.reason === value ? "active" : ""} onClick={() => setMessageReport((current) => ({ ...current, reason: value }))}>{key.replace("_"," ")}</button>)}</div>
              <textarea value={messageReportNote} onChange={(event) => setMessageReportNote(event.target.value)} maxLength={2000} placeholder="Optional details" aria-label="Additional report details"/>
              <div><button type="button" onClick={() => { setMessageReport(null); setMessageReportNote(""); }}>Cancel</button><button type="button" onClick={submitMessageReport} disabled={!messageReport.reason || messageReportBusy}>{messageReportBusy ? "Submitting…" : "Submit report"}</button></div>
            </div>
          </React.Fragment>;
        })}
      </div>
      {error && <div className="chat-error" role="alert">{error}</div>}
      <footer>
        <label className={"chat-attach" + (!hasSelectedConversation ? " is-disabled" : "")} title={hasSelectedConversation ? "Add image" : "Select a conversation first"}>
          <ImagePlus size={18}/>
          <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageSelect} disabled={!hasSelectedConversation} />
        </label>
        <Paperclip size={18} aria-hidden="true"/>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={hasSelectedConversation ? "Message " + selectedName + "..." : "Select a conversation first"} aria-label={hasSelectedConversation ? "Message " + selectedName : "Select a conversation first"} disabled={!hasSelectedConversation || sending}/>
        <button onClick={sendMessage} disabled={!hasSelectedConversation || sending || (!draft.trim() && !selectedImage)} aria-label="Send message">{sending ? "…" : <Send/>}</button>
      </footer>
      {selectedImage && <div className="chat-image-preview"><img src={selectedImage.url} alt="Selected image preview"/><div><b>{selectedImage.name}</b><small>Ready to send · nothing is sent until you press Send</small></div><button onClick={clearSelectedImage} aria-label="Remove selected image"><X size={16}/></button></div>}
    </section>
  </div>;
}

export function SavedRoute({ posts = [], onSave, onOpen }) {
  const folder = new URLSearchParams(window.location.search).get("folder");
  const [saved, setSaved] = useState(() => posts.filter((post) => post.saved));
  const [loading, setLoading] = useState(Boolean(window.__S_API_BASE_URL || import.meta.env.VITE_API_BASE_URL));
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    bookmarkService.listSaved().then((page) => { if (active) { setSaved(Array.isArray(page?.items) ? page.items : []); setError(""); } }).catch((err) => { if (active) { setSaved(posts.filter((post) => post.saved)); setError(err?.message || "Could not load saved posts."); } }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [posts]);
  const removeSaved = (id) => { setSaved((current) => current.filter((post) => post.id !== id)); onSave?.(id); };
  return <div className="page"><div className="heading"><small>YOUR LIBRARY</small><h2>Saved</h2><p>Posts you chose to keep.</p></div>{loading ? <div className="empty"><p>Loading saved posts…</p></div> : error && saved.length === 0 ? <div className="empty"><h3>Could not load saved posts</h3><p>{error}</p></div> : saved.length ? saved.map((post) => <PostCard key={post.id} post={{ ...post, saved: true }} onSave={removeSaved} onOpen={onOpen}/>) : <div className="empty"><h3>Your saved posts will live here.</h3><p>Bookmark something from your feed and return to it anytime.</p></div>}</div>;
}
