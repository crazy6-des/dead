import React, { useEffect, useRef, useState } from "react";
import { formatFullDateTime } from "../../utils/dateTime.js";
import { moderationService } from "../../services/moderationService.js";
import { postService } from "../../services/postService.js";
import { pollService } from "../../services/pollService.js";
import { MODERATION_ACTIONS, REPORT_REASONS } from "../moderation/moderationContract.js";
import { activatePostAudio, deactivatePostAudio, registerPostAudio, togglePostAudio } from "../create/postContract.js";
import { BarChart3, Bookmark, Check, Copy, Download, Flag, Heart, MessageCircle, MoreHorizontal, Music2, Repeat2, Send, Shield, X } from "lucide-react";

function getMediaItems(media) {
  if (!Array.isArray(media)) return media && typeof media === "object" ? [media] : [];
  return media.filter(Boolean);
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
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [pollVotes, setPollVotes] = useState(() => ({}));
  const [pollBusy, setPollBusy] = useState(false);
  const [pollError, setPollError] = useState("");
  const [localPoll, setLocalPoll] = useState(null);
  const cardRef = useRef(null);
  const audioRef = useRef(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const reposted = Boolean(post.reposted);
  const isFollowing = Boolean(post.following);
  const author = getAuthorName(post);
  const username = post.username || String(post.h || post.author?.username || "@user").replace("@", "").toLowerCase();
  const text = post.text || post.x || "";
  const [localText, setLocalText] = useState(text);
  const [editText, setEditText] = useState(text);
  const mediaItems = getMediaItems(post.media);
  const imageItems = mediaItems.filter((item) => !isAudioMedia(item));
  const mediaSources = imageItems.map(getMediaSource).filter(Boolean);
  const audioSource = getAudioSource(post, mediaItems);
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
  const runModeration = async (action, reason = null) => {
    setModerationBusy(true);
    try {
      await moderationService.act({ targetType: action === MODERATION_ACTIONS.REPORT ? "post" : "user", targetId: action === MODERATION_ACTIONS.REPORT ? post.id : username, action, reason });
      setModerationMessage(action === MODERATION_ACTIONS.REPORT ? "Thanks. Your report was submitted." : action === MODERATION_ACTIONS.MUTE ? "Author muted." : "Author blocked.");
      setModeration(null);
      setMenu(false);
    } catch (err) { setModerationMessage(err?.message || "Could not complete that action."); }
    finally { setModerationBusy(false); }
  };
  const immersive = Boolean(audioSource?.url || mediaSources.length > 0 || backgroundStyle);
  const postClassName = "post" + (immersive ? " post--immersive" : "") + (audioPlaying ? " post--audio-playing" : "");
  return <article ref={cardRef} className={postClassName} data-post-id={post.id} onDoubleClick={() => onLike?.(post.id)}>
    <button className="avatar avatar-button" onClick={() => onOpen?.("/user/" + encodeURIComponent(username))} aria-label="Open profile">{author[0]}</button>
    <div className="post__body">
      <div className="post__meta">
        <button className="post-author" onClick={() => onOpen?.("/user/" + encodeURIComponent(username))}><strong>{author}</strong>{(post.verified || post.a === "S Team") && <span className="verified"><Check size={10}/></span>}</button>
        <span>@{username}</span><span>·</span>
        <button className="post-time" onClick={() => onOpen?.("/post/" + encodeURIComponent(post.id))}>{formatFullDateTime(post.createdAt || post.t)}</button>
        <div className="post-menu"><button className="icon-btn" onClick={() => setMenu((v) => !v)} aria-label="More"><MoreHorizontal size={18}/></button>
          {menu && <div className="popover"><button onClick={() => { navigator.clipboard?.writeText(window.location.origin + "/post/" + encodeURIComponent(post.id)); setMenu(false); }}><Copy size={16}/>Copy link</button>{post.isOwner && <><button onClick={() => { setEditText(localText); setEditing(true); setMenu(false); }}><span aria-hidden="true">✎</span>Edit post</button><button className="danger" onClick={deleteOwnedPost} disabled={editBusy || deleteBusy}><X size={16}/>{deleteBusy ? "Deleting…" : "Delete post"}</button></>}<button onClick={() => { onRepost?.(post.id); setMenu(false); }}><Repeat2 size={16}/>Repost</button><button onClick={() => { onSave?.(post.id); setMenu(false); }}><Bookmark size={16}/> {post.saved ? "Remove from favourites" : "Add to favourites"}</button><button onClick={() => onOpen?.("/share/" + encodeURIComponent(post.id))}><Send size={16}/>Share</button>{(mediaSources.length > 0 || audioSource?.url) && <button onClick={downloadMedia}><Download size={16}/>Download media</button>}<button onClick={() => runModeration(MODERATION_ACTIONS.MUTE)} disabled={moderationBusy}><Shield size={16}/>Mute author</button><button onClick={() => runModeration(MODERATION_ACTIONS.BLOCK)} disabled={moderationBusy}><X size={16}/>Block author</button><button className="danger" onClick={() => setModeration("report")}><Flag size={16}/>Report post</button></div>}
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

      <div className="post__actions"><button onClick={() => onOpen?.("/post/" + encodeURIComponent(post.id) + "/replies")}><MessageCircle size={18}/><span>{post.replies ?? post.r ?? 0}</span></button><button className={reposted ? "is-active" : ""} onClick={() => onRepost?.(post.id)}><Repeat2 size={18}/><span>{post.reposts ?? post.p ?? 0}</span></button><button className={post.liked ? "is-liked" : ""} onClick={() => onLike?.(post.id)}><Heart size={18} fill={post.liked ? "currentColor" : "none"}/><span>{post.likes ?? post.l ?? 0}</span></button><button className={post.saved ? "is-saved" : ""} onClick={() => onSave?.(post.id)}><Bookmark size={18} fill={post.saved ? "currentColor" : "none"}/><span>{post.bookmarks ?? post.b ?? 0}</span></button><button onClick={() => onOpen?.("/post/" + encodeURIComponent(post.id) + "/quote")} aria-label="Quote"><Repeat2 size={16}/></button><button onClick={() => onOpen?.("/share/" + post.id)} aria-label="Share"><Send size={17}/></button></div>
      {moderation === "report" && <div className="moderation-sheet"><strong>Report this post</strong><small>Choose a reason</small><div>{Object.entries(REPORT_REASONS).map(([key, value]) => <button key={value} onClick={() => runModeration(MODERATION_ACTIONS.REPORT, value)} disabled={moderationBusy}>{key.replace("_", " ")}</button>)}</div><button className="outline" onClick={() => setModeration(null)}>Cancel</button></div>}
      {moderationMessage && <div className="inline-notice" role="status">{moderationMessage}</div>}
      <div className="post-foot"><button onClick={() => onFollow?.(post.id)}>{isFollowing ? "Following" : "Follow " + author.split(" ")[0]}</button><button onClick={() => onOpen?.("/topic/" + encodeURIComponent(post.topic || "community"))}>#{post.topic || "community"}</button></div>
    </div>
  </article>;
}
