import React, { useCallback, useEffect, useRef, useState } from "react";
import { formatFullDateTime } from "../../utils/dateTime.js";
import { moderationService } from "../../services/moderationService.js";
import { bookmarkService } from "../../services/bookmarkService.js";
import { postService } from "../../services/postService.js";
import { resolveApiUrl } from "../../services/apiClient.js";
import { pollService } from "../../services/pollService.js";
import { MODERATION_ACTIONS, REPORT_REASONS } from "../moderation/moderationContract.js";
import { activatePostAudio, deactivatePostAudio, registerPostAudio, togglePostAudio } from "../create/postContract.js";
import { BarChart3, Bookmark, Check, Copy, Download, Flag, Heart, MessageCircle, MoreHorizontal, Music2, Repeat2, Send, Shield, X } from "lucide-react";

function getMediaItems(media) {
  if (!Array.isArray(media)) return media && typeof media === "object" ? [media] : [];
  return media.filter(Boolean);
}

function getRelativeTime(value) {
  if (value === null || value === undefined || value === "") return "now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + "m";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + "h";
  const days = Math.floor(hours / 24);
  if (days < 7) return days + "d";
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return weeks + "w";
  const months = Math.floor(days / 30);
  if (months < 12) return months + "mo";
  return Math.floor(days / 365) + "y";
}

function getAuthorName(post) {
  const value = post?.author ?? post?.a ?? "S";
  if (typeof value === "string") return value.trim() || "S";
  if (value && typeof value === "object") {
    return String(value.displayName ?? value.name ?? value.username ?? "S").trim() || "S";
  }
  return String(value || "S");
}

function getPollOptions(poll) {
  return poll && typeof poll === "object" && Array.isArray(poll.options) ? poll.options : [];
}

function getPollOptionText(option) {
  if (typeof option === "string" || typeof option === "number") return String(option);
  if (option && typeof option === "object") {
    return String(option.text ?? option.label ?? option.title ?? "").trim();
  }
  return "";
}

function getPollOptionVotes(poll, option, index) {
  if (Array.isArray(poll?.optionVotes)) return Math.max(0, Number(poll.optionVotes[index] || 0));
  if (option && typeof option === "object") return Math.max(0, Number(option.votes || 0));
  return 0;
}

function getMediaSource(item) {
  if (typeof item === "string") return item;
  if (!item || typeof item !== "object") return "";
  return item.url || item.src || item.previewUrl || item.preview || "";
}

function isAudioMedia(item) {
  return Boolean(item && typeof item === "object" && String(item.mediaType || "").toLowerCase() === "audio");
}

function getAudioSource(post, mediaItems) {
  if (post.audio && typeof post.audio === "object") return post.audio;
  if (post.music && typeof post.music === "object") return post.music;
  return mediaItems.find(isAudioMedia) || null;
}

function getBackgroundStyle(background) {
  if (!background || typeof background !== "object") return null;
  const value = background.value || background.url || background.src || "";
  const type = String(background.type || "").toLowerCase();
  if (!value) return null;
  if (type === "image" || type === "url") {
    const safeValue = String(value).replace(/"/g, "\\\"");
    return { backgroundImage: `url("${safeValue}")`, backgroundSize: "cover", backgroundPosition: "center" };
  }
  if (type === "gradient" || type === "color") return { background: value };
  return null;
}

export default function PostCard({ post, onLike, onSave, onFollow, onRepost, onOpen }) {
  const [moderation, setModeration] = useState(null);
  const [moderationBusy, setModerationBusy] = useState(false);
  const [moderationMessage, setModerationMessage] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [reportNote, setReportNote] = useState("");
  const [menu, setMenu] = useState(false);
  const [folderPicker, setFolderPicker] = useState(false);
  const [bookmarkFolders, setBookmarkFolders] = useState([]);
  const [folderBusy, setFolderBusy] = useState(false);
  const menuRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [pollVotes, setPollVotes] = useState(() => ({}));
  const [pollBusy, setPollBusy] = useState(false);
  const [pollError, setPollError] = useState("");
  const [localPoll, setLocalPoll] = useState(null);
  const [viewCount, setViewCount] = useState(() => Number(post.views ?? post.viewCount ?? post.v ?? post.stats?.views ?? 0));
  const cardRef = useRef(null);
  const viewRecordedAtRef = useRef(0);
  const viewRequestRef = useRef(null);
  const audioRef = useRef(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const reposted = Boolean(post.reposted);
  const isFollowing = Boolean(post.following);
  const author = getAuthorName(post);
  const avatarUrl = post?.author?.avatarUrl ? resolveApiUrl(post.author.avatarUrl) : "";
  const username = post.username || String(post.h || post.author?.username || "@user").replace("@", "").toLowerCase();
  const text = post.text || post.x || "";
  const [localText, setLocalText] = useState(text);
  const [editText, setEditText] = useState(text);
  const mediaItems = getMediaItems(post.media);
  const imageItems = mediaItems.filter((item) => !isAudioMedia(item));
  const mediaSources = imageItems.map(getMediaSource).filter(Boolean);
  const audioSource = getAudioSource(post, mediaItems);
  useEffect(() => {
    if (!menu) return undefined;
    const closeMenu = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenu(false);
    };
    const closeOnEscape = (event) => { if (event.key === "Escape") setMenu(false); };
    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menu]);

  const recordView = useCallback(async () => {
    const now = Date.now();
    if (viewRequestRef.current || now - viewRecordedAtRef.current < 1500) return;
    viewRequestRef.current = postService.recordView(post.id);
    try {
      const result = await viewRequestRef.current;
      if (Number.isFinite(Number(result?.viewCount))) {
        setViewCount(Number(result.viewCount));
      }
      viewRecordedAtRef.current = Date.now();
    } catch {
      // Do not update the UI when the real server event was not recorded.
    } finally {
      viewRequestRef.current = null;
    }
  }, [post.id]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || !post.id) return undefined;
    const onPointerDown = () => { void recordView(); };
    const onTouchStart = () => { void recordView(); };
    const onFocus = () => { void recordView(); };
    const onScroll = () => {
      const rect = card.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) void recordView();
    };
    card.addEventListener("pointerdown", onPointerDown, { passive: true });
    card.addEventListener("touchstart", onTouchStart, { passive: true });
    card.addEventListener("focusin", onFocus);
    window.addEventListener("scroll", onScroll, { passive: true });

    let observer;
    if (typeof window.IntersectionObserver === "function") {
      observer = new window.IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && entry.intersectionRatio > 0) void recordView();
      }, { threshold: [0, 0.01] });
      observer.observe(card);
    }
    return () => {
      card.removeEventListener("pointerdown", onPointerDown);
      card.removeEventListener("touchstart", onTouchStart);
      card.removeEventListener("focusin", onFocus);
      window.removeEventListener("scroll", onScroll);
      observer?.disconnect();
    };
  }, [post.id, recordView]);


  useEffect(() => {
    const audio = audioRef.current;
    const card = cardRef.current;
    if (!audio || !card || !audioSource?.url || typeof window.IntersectionObserver === "undefined") return undefined;
    const unregister = registerPostAudio(post.id, audio, setAudioPlaying);
    const observer = new window.IntersectionObserver(async (entries) => {
      const entry = entries[0];
      if (!entry) return;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.1) {
        const result = await activatePostAudio(post.id);
        setAudioBlocked(Boolean(result.blocked));
      } else if (!entry.isIntersecting || entry.intersectionRatio < 0.05) {
        deactivatePostAudio(post.id);
        setAudioBlocked(false);
      }
    }, { rootMargin: "-30% 0px -30% 0px", threshold: [0, 0.1, 0.5] });
    observer.observe(card);
    return () => { observer.disconnect(); unregister(); };
  }, [post.id, audioSource?.url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    const onPlay = () => { setAudioPlaying(true); setAudioBlocked(false); };
    const onPause = () => setAudioPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);
  if (deleted) return null;
  const toggleAudio = async (event) => {
    event?.stopPropagation?.();
    const result = await togglePostAudio(post.id);
    setAudioBlocked(Boolean(result.blocked));
  };
  const background = post.background || post.bg || null;
  const backgroundStyle = getBackgroundStyle(background);
  const openFolderPicker = async () => {
    setFolderBusy(true);
    try {
      const result = await bookmarkService.listFolders();
      setBookmarkFolders(result?.items || []);
      setFolderPicker(true);
    } catch (error) {
      setModerationMessage(error?.message || "Could not load bookmark folders.");
    } finally {
      setFolderBusy(false);
    }
  };
  const saveToFolder = async (folderId) => {
    setFolderBusy(true);
    try {
      await bookmarkService.save({ postId: post.id, folderId });
      setFolderPicker(false);
      setMenu(false);
      setModerationMessage("Saved to bookmark folder.");
    } catch (error) {
      setModerationMessage(error?.message || "Could not save to that folder.");
    } finally {
      setFolderBusy(false);
    }
  };
  const downloadMedia = () => {
    const source = mediaSources[0] || audioSource?.url;
    if (!source) return;
    const link = document.createElement("a");
    link.href = source;
    link.download = `s-post-${post.id}`;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setMenu(false);
  };
  const saveEdit = async () => {
    const value = editText.trim();
    if (!value || editBusy) return;
    setEditBusy(true);
    try {
      const updated = await postService.update(post.id, value);
      setLocalText(updated?.text || updated?.body || value);
      setEditing(false);
      setMenu(false);
    } catch (error) { setModerationMessage(error?.message || "Could not edit this post."); }
    finally { setEditBusy(false); }
  };
  const deleteOwnedPost = async () => {
    if (editBusy || deleteBusy) return;
    setDeleteBusy(true);
    try {
      await postService.delete(post.id);
      setDeleted(true);
      setMenu(false);
    } catch (error) {
      setModerationMessage(error?.message || "Could not delete this post.");
    } finally {
      setDeleteBusy(false);
    }
  };
  const runModeration = async (action, reason = null, note = "") => {
    setModerationBusy(true);
    try {
      await moderationService.act({ targetType: action === MODERATION_ACTIONS.REPORT ? "post" : "user", targetId: action === MODERATION_ACTIONS.REPORT ? post.id : username, action, reason, note });
      setModerationMessage(action === MODERATION_ACTIONS.REPORT ? "Thanks. Your report was submitted." : action === MODERATION_ACTIONS.MUTE ? "Author muted." : "Author blocked.");
      setModeration(null);
      setMenu(false);
      if (action === MODERATION_ACTIONS.REPORT) {
        setReportReason("");
        setReportNote("");
      }
    } catch (err) { setModerationMessage(err?.message || "Could not complete that action."); }
    finally { setModerationBusy(false); }
  };
  const immersive = Boolean(audioSource?.url || mediaSources.length > 0 || backgroundStyle);
  const postClassName = "post" + (immersive ? " post--immersive" : "") + (audioPlaying ? " post--audio-playing" : "");
  return <article ref={cardRef} className={postClassName} data-post-id={post.id} onDoubleClick={() => onLike?.(post.id)}>
    <button className="avatar avatar-button" onClick={() => onOpen?.("/user/" + encodeURIComponent(username))} aria-label="Open profile">{avatarUrl ? <img src={avatarUrl} alt="" /> : author[0]}</button>
    <div className="post__body">
      <div className="post__meta">
        <button className="post-author" onClick={() => onOpen?.("/user/" + encodeURIComponent(username))}><strong>{author}</strong>{(post.verified || post.a === "S Team") && <span className="verified"><Check size={10}/></span>}</button>
        <span>@{username}</span><span>·</span>
        <button className="post-time" title={formatFullDateTime(post.createdAt || post.t)} onClick={() => onOpen?.("/post/" + encodeURIComponent(post.id))}>{getRelativeTime(post.createdAt || post.t)}</button>
        <div ref={menuRef} className="post-menu"><button type="button" className="icon-btn" onClick={(event) => { event.stopPropagation(); setMenu((v) => !v); }} aria-label="More"><MoreHorizontal size={18}/></button>
          {menu && <div className="popover"><button onClick={() => { navigator.clipboard?.writeText(window.location.origin + "/post/" + encodeURIComponent(post.id)); setMenu(false); }}><Copy size={16}/>Copy link</button>{post.isOwner && <><button onClick={() => { setEditText(localText); setEditing(true); setMenu(false); }}><span aria-hidden="true">✎</span>Edit post</button><button className="danger" onClick={deleteOwnedPost} disabled={editBusy || deleteBusy}><X size={16}/>{deleteBusy ? "Deleting…" : "Delete post"}</button></>}<button onClick={() => { onRepost?.(post.id); setMenu(false); }}><Repeat2 size={16}/>Repost</button><button onClick={() => { onOpen?.("/post/" + encodeURIComponent(post.id) + "/quote"); setMenu(false); }}><Repeat2 size={16}/>Quote</button><button onClick={() => { onSave?.(post.id); setMenu(false); }}><Bookmark size={16}/> {post.saved ? "Remove from favourites" : "Add to favourites"}</button><button onClick={() => { setMenu(false); onOpen?.("/share/" + encodeURIComponent(post.id)); }}><Send size={16}/>Share</button><button onClick={openFolderPicker} disabled={folderBusy}><Bookmark size={16}/>{folderBusy ? "Loading folders…" : "Add to bookmark folder"}</button>{(mediaSources.length > 0 || audioSource?.url) && <button onClick={downloadMedia}><Download size={16}/>Download media</button>}<button onClick={() => runModeration(MODERATION_ACTIONS.MUTE)} disabled={moderationBusy}><Shield size={16}/>Mute author</button><button onClick={() => runModeration(MODERATION_ACTIONS.BLOCK)} disabled={moderationBusy}><X size={16}/>Block author</button><button className="danger" onClick={() => setModeration("report")}><Flag size={16}/>Report post</button></div>}
        </div>
      </div>
      {editing ? <div className="post-edit-box"><textarea value={editText} onChange={(event) => setEditText(event.target.value)} maxLength={5000} aria-label="Edit post"/><div><span>{editText.length}/5000</span><button type="button" className="outline" onClick={() => { setEditing(false); setEditText(localText); }} disabled={editBusy}>Cancel</button><button type="button" className="primary" onClick={saveEdit} disabled={editBusy || !editText.trim()}>{editBusy ? "Saving…" : "Save"}</button></div></div> : localText && !backgroundStyle && <button className="post-content-hit" onClick={() => onOpen?.("/post/" + post.id)}><p className="post__text">{localText}</p></button>}
      {post.quotedPost && <button className="quoted-post-card" onClick={() => onOpen?.("/post/" + encodeURIComponent(post.quotedPost.id))}><strong>{post.quotedPost.author?.displayName || post.quotedPost.author?.username || "User"}</strong><span>@{post.quotedPost.author?.username || "user"}</span><p>{post.quotedPost.text || ""}</p></button>}
      {backgroundStyle && <div className={"post-background-card" + (localText ? " has-text" : "")} style={backgroundStyle} aria-label="Post background">
        {localText && <span>{localText}</span>}
        {audioSource?.url && <button type="button" className={"post-sound-control " + (audioPlaying ? "is-playing" : "")} onClick={toggleAudio} aria-label={audioPlaying ? "Pause soundtrack" : "Play soundtrack"}>{audioPlaying ? "♫" : <Music2 size={17}/>}<span>{audioBlocked ? "Tap for sound" : (audioSource.title || audioSource.name || "Soundtrack")}</span></button>}
      </div>}
      {mediaSources.length > 0 && <div className={"post-media-grid media-count-" + Math.min(mediaSources.length, 4)}>
        {mediaSources.map((source, index) => <div className="post-media" key={source + index} role="button" tabIndex={0} onClick={() => onOpen?.("/post/" + encodeURIComponent(post.id))} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen?.("/post/" + encodeURIComponent(post.id)); } }}>
          <img src={source} alt={imageItems[index]?.alt || "Post media"} loading="lazy" />
          {index === 0 && audioSource?.url && <button type="button" className="post-media-sound-layer" onClick={(event) => { event.stopPropagation(); toggleAudio(event); }} aria-label={audioPlaying ? "Pause soundtrack" : "Play soundtrack"}>
            <Music2 size={16}/><b>{audioBlocked ? "Tap for sound" : (audioSource.title || audioSource.name || "Soundtrack")}</b>
          </button>}
        </div>)}
      </div>}
      {audioSource?.url && mediaSources.length === 0 && !backgroundStyle && <div className="post-audio-stage">
        <div className="post-audio-stage__art">{audioSource.artworkUrl ? <img src={audioSource.artworkUrl} alt="" loading="lazy" /> : <Music2 size={34}/>}</div>
        <button type="button" className={"post-sound-control " + (audioPlaying ? "is-playing" : "")} onClick={toggleAudio} aria-label={audioPlaying ? "Pause soundtrack" : "Play soundtrack"}>{audioPlaying ? "♫" : <Music2 size={17}/>}<span>{audioBlocked ? "Tap for sound" : (audioSource.title || audioSource.name || "Soundtrack")}</span></button>
      </div>}
      {audioSource?.url && <audio ref={audioRef} preload="metadata" src={audioSource.url} aria-hidden="true" tabIndex={-1} />}
      {audioSource?.url && audioSource.provider && <div className="post-audio-license">Music: {audioSource.provider}{audioSource.licenseUrl && <><span> · </span><a href={audioSource.licenseUrl} target="_blank" rel="noreferrer">License</a></>}</div>}

      {post.poll && <div className="poll-card"><div className="poll-card__question"><BarChart3 size={17}/><strong>{post.poll.question}</strong></div>{getPollOptions(localPoll || post.poll).map((option, index) => { const poll = localPoll || post.poll; const pollId = post.poll.id || post.id; const selected = Number(poll?.votedOptionIndex ?? pollVotes[pollId]) === index; const votes = getPollOptionVotes(poll, option, index); const total = Array.isArray(poll?.optionVotes) ? poll.optionVotes.reduce((sum, count) => sum + Math.max(0, Number(count || 0)), 0) : Number(poll?.totalVotes || 0); const percent = total > 0 ? Math.round((votes / total) * 100) : 0; const optionText = getPollOptionText(option); return <button className={"poll-option " + (selected ? "is-selected" : "")} key={index} onClick={async () => { if (pollBusy) return; setPollBusy(true); setPollError(""); try { const result = await pollService.vote(pollId, index); if (result?.poll) setLocalPoll(result.poll); setPollVotes((current) => ({ ...current, [pollId]: Number(result?.optionIndex ?? index) })); } catch (err) { setPollError(err?.message || "Could not record your vote."); } finally { setPollBusy(false); } }}><span>{optionText || "Option " + (index + 1)}</span><span>{percent}%</span></button>; })}<small>{pollError || `${(localPoll || post.poll)?.totalVotes || 0} votes`}</small></div>}

      <div className="post__actions"><button onClick={() => onOpen?.("/post/" + encodeURIComponent(post.id) + "/replies")} aria-label="Comment"><MessageCircle size={18.75}/><span>{post.replies ?? post.r ?? 0}</span></button><button className={reposted ? "is-active" : ""} onClick={() => onRepost?.(post.id)} aria-label="Repost"><Repeat2 size={18.75}/><span>{post.reposts ?? post.p ?? 0}</span></button><button className={post.liked ? "is-liked" : ""} onClick={() => onLike?.(post.id)} aria-label="Like"><Heart size={18.75} fill={post.liked ? "currentColor" : "none"}/><span>{post.likes ?? post.l ?? 0}</span></button><button onClick={() => onOpen?.("/post/" + encodeURIComponent(post.id))} aria-label="Views"><BarChart3 size={18.75}/><span>{viewCount}</span></button><button onClick={() => onOpen?.("/share/" + post.id)} aria-label="Share"><Send size={18.75}/></button></div>
      {folderPicker && <div className="moderation-sheet" role="dialog" aria-modal="true" aria-label="Save to bookmark folder">
        <strong>Save to bookmark folder</strong><small>Choose a private folder for this saved post.</small>
        <div className="moderation-reasons">{bookmarkFolders.map((folder) => <button type="button" key={folder.id} onClick={() => saveToFolder(folder.id)} disabled={folderBusy}>{folder.name}</button>)}</div>
        {!bookmarkFolders.length && <small>You have no folders yet. Open Bookmarks to create one.</small>}
        <div className="moderation-actions"><button className="outline" type="button" onClick={() => setFolderPicker(false)} disabled={folderBusy}>Cancel</button></div>
      </div>}
      {moderation === "report" && <div className="moderation-sheet" role="dialog" aria-modal="true" aria-labelledby={"report-post-title-" + post.id}>
        <strong id={"report-post-title-" + post.id}>Report this post</strong>
        <small>Choose a reason, add details if needed, then send your report.</small>
        <div className="moderation-reasons">
          {Object.entries(REPORT_REASONS).map(([key, value]) => <button type="button" key={value} className={reportReason === value ? "selected" : ""} onClick={() => setReportReason(value)} disabled={moderationBusy}>{key.replace("_", " ")}</button>)}
        </div>
        <textarea className="moderation-note" value={reportNote} onChange={(event) => setReportNote(event.target.value)} maxLength={2000} placeholder="Optional details" aria-label="Report details" disabled={moderationBusy} />
        <div className="moderation-actions">
          <button className="outline" type="button" onClick={() => { setModeration(null); setReportReason(""); setReportNote(""); }} disabled={moderationBusy}>Cancel</button>
          <button type="button" className="moderation-send" onClick={() => runModeration(MODERATION_ACTIONS.REPORT, reportReason, reportNote)} disabled={moderationBusy || !reportReason}>{moderationBusy ? "Sending…" : "Send report"}</button>
        </div>
      </div>}
      {moderationMessage && <div className="inline-notice" role="status">{moderationMessage}</div>}
      <div className="post-foot"><button onClick={() => onFollow?.(post.id)}>{isFollowing ? "Following" : "Follow " + author.split(" ")[0]}</button><button onClick={() => onOpen?.("/topic/" + encodeURIComponent(post.topic || "community"))}>#{post.topic || "community"}</button></div>
    </div>
  </article>;
}
