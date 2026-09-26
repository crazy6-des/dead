import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Flag, Heart, ImagePlus, MoreHorizontal, Paperclip, Send, X } from "lucide-react";
import { APP_ROUTES } from "../../app/routes.js";
import PostCard from "../post/PostCard.jsx";
import { NOTIFICATION_FILTERS } from "../notifications/notificationContract.js";
import { createNotificationAdapter } from "../../services/notificationService.js";
import { createMessageAdapter } from "../../services/messageService.js";
import { bookmarkService } from "../../services/bookmarkService.js";
import { MESSAGE_IMAGE_LIMITS } from "../messages/messageContract.js";
import { moderationService } from "../../services/moderationService.js";
import { REPORT_REASONS } from "../moderation/moderationContract.js";
import { formatFullDateTime } from "../../utils/dateTime.js";
import { resolveApiUrl } from "../../services/apiClient.js";

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

function formatFullInboxTime(value) {
  if (!value) return "";
  const formatted = formatFullDateTime(value);
  return formatted === "now" ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" }) : formatted;
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
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") loadNotifications({ silent: true });
    }, 12000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(poll);
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
        <span><p><b>{item.actor || "S"}</b> {item.text}</p><span>{formatFullInboxTime(item.time)}{!item.read ? " · New" : " · Read"}</span></span>
        {!item.read && <span className="notice-unread" aria-hidden="true"/>}
        {item.read ? <Check className="notice-read-tick" size={15} strokeWidth={2.5} aria-label="Read" /> : <Heart size={16} fill={item.type === "like" ? "currentColor" : "none"} aria-hidden="true"/>}
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
  const selectedImageRef = useRef(null);
  const [messages, setMessages] = useState({});
  const [messageCursors, setMessageCursors] = useState({});
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [failedMedia, setFailedMedia] = useState({});
  const [resolvedMediaUrls, setResolvedMediaUrls] = useState({});
  const resolvedMediaUrlsRef = useRef({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageReport, setMessageReport] = useState(null);
  const [messageReportNote, setMessageReportNote] = useState("");
  const [messageReportBusy, setMessageReportBusy] = useState(false);
  const [messageMenuId, setMessageMenuId] = useState(null);
  const [messageEditingId, setMessageEditingId] = useState(null);
  const [messageEditText, setMessageEditText] = useState("");
  const [messageEditBusy, setMessageEditBusy] = useState(false);
  const messageLongPressRef = useRef(null);
  const [error, setError] = useState("");
  const [conversationError, setConversationError] = useState("");
  const imageInputRef = useRef(null);
  const chatBodyRef = useRef(null);
  const loadingOlderRef = useRef(false);

  useEffect(() => {
    resolvedMediaUrlsRef.current = resolvedMediaUrls;
  }, [resolvedMediaUrls]);

  useEffect(() => () => {
    if (selectedImageRef.current?.url?.startsWith("blob:")) URL.revokeObjectURL(selectedImageRef.current.url);
    Object.values(resolvedMediaUrlsRef.current).forEach((url) => {
      if (String(url).startsWith("blob:")) URL.revokeObjectURL(url);
    });
  }, []);


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
        messagesApi.listMessages(selected, { limit: 50 }),
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

  useEffect(() => {
    if (!selected) return undefined;
    let active = true;
    const refreshConversation = async () => {
      if (document.visibilityState !== "visible" || loading || sending || loadingOlder) return;
      try {
        const [messagePage, conversationPage] = await Promise.all([
          messagesApi.listMessages(selected, { limit: 50 }),
          messagesApi.listConversations({ limit: 30 }),
        ]);
        if (!active) return;
        const nextItems = messagePage.items || [];
        setMessages((current) => {
          const existing = current[selected] || [];
          const same = existing.length === nextItems.length && existing.every((item, index) => item.id === nextItems[index]?.id && item.status === nextItems[index]?.status);
          return same ? current : { ...current, [selected]: nextItems };
        });
        setMessageCursors((current) => ({ ...current, [selected]: messagePage.nextCursor || null }));
        const nextConversations = conversationPage.items || conversationPage || [];
        setConversations(nextConversations);
      } catch (err) {
        if (active && err?.code !== "REQUEST_ABORTED") setError((current) => current || err?.message || "Connection to messaging was interrupted.");
      }
    };
    const poll = window.setInterval(refreshConversation, 5000);
    const refresh = () => refreshConversation();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.clearInterval(poll);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [selected, messagesApi, loading, sending, loadingOlder]);

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
  const renderMessage = (message) => ({
    ...message,
    direction: message.direction || (currentUserId && message.senderId === currentUserId ? "out" : "in"),
  });
  const clearMessageLongPress = () => { if (messageLongPressRef.current) { window.clearTimeout(messageLongPressRef.current); messageLongPressRef.current = null; } };
  const beginMessageLongPress = (message) => { if (message.direction !== "out" || String(message.id).startsWith("local-") || message.status === "failed" || message.status === "sending") return; clearMessageLongPress(); messageLongPressRef.current = window.setTimeout(() => { setMessageMenuId(message.id); messageLongPressRef.current = null; }, 550); };
  const saveMessageEdit = async () => {
    const text = messageEditText.trim();
    if (!messageEditingId || !text || messageEditBusy) return;
    setMessageEditBusy(true);
    try {
      const updated = await messagesApi.update(messageEditingId, text);
      setMessages((current) => ({ ...current, [selected]: (current[selected] || []).map((item) => item.id === messageEditingId ? { ...item, text: updated?.text || text, updatedAt: updated?.updatedAt || new Date().toISOString(), editedAt: updated?.editedAt || new Date().toISOString() } : item) }));
      setMessageEditingId(null);
      setMessageEditText("");
      setMessageMenuId(null);
    } catch (err) { setError(err?.message || "Could not edit this message."); }
    finally { setMessageEditBusy(false); }
  };

  const removeMessage = async (messageId) => {
    if (messageEditBusy || !window.confirm("Delete this message permanently from S?")) return;
    setMessageEditBusy(true);
    try {
      await messagesApi.delete(messageId);
      setMessages((current) => ({ ...current, [selected]: (current[selected] || []).filter((item) => item.id !== messageId) }));
      setMessageMenuId(null);
    } catch (err) { setError(err?.message || "Could not delete this message."); }
    finally { setMessageEditBusy(false); }
  };

  const submitMessageReport = async () => {
    if (!messageReport?.id || !messageReport.reason || messageReportBusy) return;
    setMessageReportBusy(true);
    try { await moderationService.report({ targetType: "message", targetId: messageReport.id, reason: messageReport.reason, note: messageReportNote }); setMessageReport(null); setMessageReportNote(""); setError(""); }
    catch (err) { setError(err?.message || "Could not submit the report."); }
    finally { setMessageReportBusy(false); }
  };

  useEffect(() => {
    let active = true;
    const mediaMessages = orderedMessages.filter((message) => message.media?.url && !String(message.media.url).startsWith("blob:") && !resolvedMediaUrls[message.id] && !failedMedia[message.id]);
    if (!mediaMessages.length) return () => { active = false; };
    Promise.all(mediaMessages.map(async (message) => {
      try {
        const response = await fetch(message.media.url, { credentials: "include", cache: "force-cache" });
        if (!response.ok) throw new Error("Media request failed");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        return { id: message.id, url };
      } catch {
        return { id: message.id, url: null };
      }
    })).then((results) => {
      if (!active) return;
      setResolvedMediaUrls((current) => {
        const next = { ...current };
        results.forEach(({ id, url }) => {
          if (url) next[id] = url;
          else setFailedMedia((failed) => ({ ...failed, [id]: true }));
        });
        return next;
      });
    });
    return () => { active = false; };
  }, [orderedMessages, resolvedMediaUrls, failedMedia]);

  useEffect(() => {
    if (!selected || loading || conversationError) return;
    const body = chatBodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [selected, loading, conversationError]);

  const loadOlderMessages = async () => {
    const cursor = messageCursors[selected];
    if (!selected || !cursor || loadingOlderRef.current) return;
    loadingOlderRef.current = true;
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
      loadingOlderRef.current = false;
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
      const persistedMessage = { ...sent, direction: "out", status: "sent" };
      if (image?.url && persistedMessage.media) {
        persistedMessage.media = { ...persistedMessage.media, url: image.url };
        setResolvedMediaUrls((current) => ({ ...current, [persistedMessage.id]: image.url }));
      }
      setMessages((current) => ({ ...current, [selected]: [...(current[selected] || []).filter((item) => item.id !== optimistic.id), persistedMessage] }));
      setDraft("");
      setSelectedImage(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
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
    if (!id) return;
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

  const closeConversation = () => {
    clearSelectedImage();
    setSelected(null);
    setDraft("");
    setError("");
    setConversationError("");
    setFailedMedia({});
    const params = new URLSearchParams(window.location.search);
    params.delete("conversation");
    const query = params.toString();
    const nextUrl = window.location.pathname + (query ? "?" + query : "") + window.location.hash;
    const currentUrl = window.location.pathname + window.location.search + window.location.hash;
    if (nextUrl !== currentUrl) window.history.pushState({}, "", nextUrl);
  };

  return <div className={"messages " + (hasSelectedConversation ? "messages--conversation-open" : "")}>
    <aside>
      {orderedConversations.length === 0 && !loading && !error && <div className="empty messages-empty"><h3>No conversations yet</h3><p>This is expected when you have not started a conversation. Open someone’s profile and choose Message to create the first conversation.</p></div>}
      {orderedConversations.map((conversation) => {
        const preview = conversation.lastMessage || "No messages yet";
        const previewTime = conversation.updatedAt;
        const avatarLetter = String(conversation.name || conversation.username || "S").trim().charAt(0).toUpperCase() || "S";
        const unreadCount = Number(conversation.unreadCount || 0);
        return <button key={conversation.id} className={"conversation " + (selected === conversation.id ? "active" : "")} onClick={() => selectConversation(conversation.id)} aria-label={"Open conversation with " + (conversation.name || conversation.username || "Conversation") + (unreadCount ? ", " + unreadCount + " unread " + (unreadCount === 1 ? "message" : "messages") : "")}>
          {conversation.avatarUrl ? <img className="avatar avatar--small conversation-avatar" src={resolveApiUrl(conversation.avatarUrl)} alt="" /> : <span className="avatar avatar--small">{avatarLetter}</span>}
          <span className="conversation-copy"><b>{conversation.name || conversation.username || "Conversation"}</b><small className={unreadCount ? "conversation-preview unread" : "conversation-preview"}>{preview}</small></span>
          <span className="conversation-meta"><small>{formatConversationTime(previewTime)}</small>{unreadCount > 0 && <span className="conversation-unread">{unreadCount > 99 ? "99+" : unreadCount}</span>}</span>
        </button>;
      })}
    </aside>
    <section className="chat">
      <header>
        {hasSelectedConversation && <button type="button" className="chat-back" onClick={closeConversation} aria-label="Back to messages" title="Back to messages"><ArrowLeft size={18}/></button>}
        {selectedConversation?.avatarUrl ? <img className="avatar avatar--small" src={resolveApiUrl(selectedConversation.avatarUrl)} alt="" /> : <span className="avatar avatar--small">{String(selectedName).charAt(0).toUpperCase()}</span>}
        <span><b>{selectedName}</b><small>{selectedConversation?.username ? "@" + selectedConversation.username : "Conversation"}</small></span><MoreHorizontal/>
      </header>
      <div className="chat-body" ref={chatBodyRef} onScroll={(event) => { if (event.currentTarget.scrollTop <= 48) loadOlderMessages(); }}>
        {!loading && !conversationError && messageCursors[selected] && <button className="outline message-load-older" onClick={loadOlderMessages} disabled={loadingOlder}>{loadingOlder ? "Loading older messages…" : "Load older messages"}</button>}
        {loading ? <div className="empty" role="status"><p>Loading conversation…</p></div> : conversationError ? <div className="empty" role="alert"><h3>Conversation unavailable</h3><p>{conversationError}</p></div> :
         orderedMessages.map((rawMessage, index) => {
          const message = renderMessage(rawMessage);
          const previous = orderedMessages[index - 1];
          const showDate = message.createdAt && (!previous || messageDateKey(message.createdAt) !== messageDateKey(previous.createdAt));
          return <React.Fragment key={message.id}>
            {showDate && <small className="message-date">{formatMessageDate(message.createdAt)}</small>}
            <div className={"message-row " + (message.direction === "out" ? "out" : "in")}>
              <div className="bubble">
                {message.media?.url && failedMedia[message.id] && <div className="message-media-error" role="img" aria-label="Image could not be loaded">Image unavailable</div>}
                {message.media?.url && !failedMedia[message.id] && (resolvedMediaUrls[message.id] || String(message.media.url).startsWith("blob:")) && <img className="message-image" src={resolvedMediaUrls[message.id] || message.media.url} alt={message.media.name || "Shared image"} onError={() => setFailedMedia((current) => ({ ...current, [message.id]: true }))} />}
                {message.media?.url && !failedMedia[message.id] && !resolvedMediaUrls[message.id] && !String(message.media.url).startsWith("blob:") && <div className="message-media-loading" role="status">Loading image…</div>}
                {messageEditingId === message.id ? <div className="message-edit-box"><textarea value={messageEditText} onChange={(event) => setMessageEditText(event.target.value)} maxLength={5000} aria-label="Edit message"/><div><button type="button" onClick={() => { setMessageEditingId(null); setMessageEditText(""); }} disabled={messageEditBusy}>Cancel</button><button type="button" className="primary" onClick={saveMessageEdit} disabled={messageEditBusy || !messageEditText.trim()}>{messageEditBusy ? "Saving…" : "Save"}</button></div></div> : message.text && <div>{message.text}</div>}
                {message.status === "failed" && <small> · Failed</small>}
                {message.status === "sending" && <small> · Sending</small>}{message.editedAt && <small> · Edited</small>}{messageMenuId === message.id && message.direction === "out" && <div className="message-action-menu" role="menu"><button type="button" onClick={() => { setMessageEditingId(message.id); setMessageEditText(message.text || ""); setMessageMenuId(null); }} disabled={!message.text || messageEditBusy}>Edit</button><button type="button" className="danger" onClick={() => removeMessage(message.id)} disabled={messageEditBusy}>Delete</button></div>}
              </div>
              {message.direction === "in" && !String(message.id).startsWith("optimistic-") && <button type="button" className="message-report-button" onClick={() => { setMessageReport({ id: message.id, reason: null }); setMessageReportNote(""); }} aria-label="Report message" title="Report message"><Flag size={13}/></button>}
            </div>
            {messageReport?.id === message.id && <div className={"message-report-form " + (message.direction === "out" ? "for-outgoing" : "for-incoming")} role="dialog" aria-label="Report message">
              <strong>Report message from @{selectedConversation?.username || "user"}</strong><small>Choose a reason and optionally add context. This message was sent at {message.createdAt ? formatFullInboxTime(message.createdAt) : "an unknown time"}.</small>
              <div className="message-report-reasons">{Object.entries(REPORT_REASONS).map(([key,value]) => <button key={value} type="button" className={messageReport.reason === value ? "active" : ""} onClick={() => setMessageReport((current) => ({ ...current, reason: value }))}>{key.replace("_"," ")}</button>)}</div>
              <textarea value={messageReportNote} onChange={(event) => setMessageReportNote(event.target.value)} maxLength={2000} placeholder="Optional details" aria-label="Additional report details"/>
              <div><button type="button" onClick={() => { setMessageReport(null); setMessageReportNote(""); }}>Cancel</button><button type="button" onClick={submitMessageReport} disabled={!messageReport.reason || messageReportBusy}>{messageReportBusy ? "Submitting…" : "Submit report"}</button></div>
            </div>}
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
