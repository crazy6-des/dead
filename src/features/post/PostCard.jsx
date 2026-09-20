import React, { useState } from "react";
import { moderationService } from "../../services/moderationService.js";
import { MODERATION_ACTIONS, REPORT_REASONS } from "../moderation/moderationContract.js";
import { Bookmark, Check, Copy, Flag, Heart, MessageCircle, MoreHorizontal, Music2, Repeat2, Send, Shield, X, BarChart3 } from "lucide-react";
export default function PostCard({ post, onLike, onSave, onFollow, onRepost, onOpen }) {
  const [moderation, setModeration] = useState(null);
  const [moderationBusy, setModerationBusy] = useState(false);
  const [moderationMessage, setModerationMessage] = useState("");
  const [menu, setMenu] = useState(false);\n  const [pollVotes, setPollVotes] = useState(() => ({}));
  const reposted = Boolean(post.reposted);
  const isFollowing = Boolean(post.following);
  const author = post.author || post.a || "S";
  const username = post.username || String(post.h || "@user").replace("@", "").toLowerCase();
  const text = post.text || post.x || "";
  const runModeration = async (action, reason = null) => {
    setModerationBusy(true);
    try {
      await moderationService.act({ targetType: "post", targetId: post.id, action, reason });
      setModerationMessage(action === MODERATION_ACTIONS.REPORT ? "Thanks. Your report was submitted." : action === MODERATION_ACTIONS.MUTE ? "Author muted." : "Author blocked.");
      setModeration(null);
      setMenu(false);
    } catch { setModerationMessage("Could not complete that action."); }
    finally { setModerationBusy(false); }
  };
  return <article className="post" onDoubleClick={() => onLike?.(post.id)}>
    <button className="avatar avatar-button" onClick={() => onOpen?.("/user/" + username)} aria-label="Open profile">{author[0]}</button>
    <div className="post__body">
      <div className="post__meta">
        <button className="post-author" onClick={() => onOpen?.("/user/" + username)}><strong>{author}</strong>{(post.verified || post.a === "S Team") && <span className="verified"><Check size={10}/></span>}</button>
        <span>@{username}</span><span>·</span>
        <button className="post-time" onClick={() => onOpen?.("/post/" + post.id)}>{post.createdAt || post.t || "now"}</button>
        <div className="post-menu"><button className="icon-btn" onClick={() => setMenu((v) => !v)} aria-label="More"><MoreHorizontal size={18}/></button>
          {menu && <div className="popover">
            <button onClick={() => navigator.clipboard?.writeText(window.location.origin + "/post/" + post.id)}><Copy size={16}/>Copy link</button>
            <button onClick={() => runModeration(MODERATION_ACTIONS.MUTE)} disabled={moderationBusy}><Shield size={16}/>Mute author</button><button onClick={() => runModeration(MODERATION_ACTIONS.BLOCK)} disabled={moderationBusy}><X size={16}/>Block author</button><button className="danger" onClick={() => setModeration("report")}><Flag size={16}/>Report post</button>
          </div>}
        </div>
      </div>
      <button className="post-content-hit" onClick={() => onOpen?.("/post/" + post.id)}><p className="post__text">{text}</p></button>
      {(post.media || post.media === true) && <button className="post-media" onClick={() => onOpen?.("/post/" + post.id + "/media")}><span>Visual expression</span><small>Open media</small></button>}
      {post.poll && <div className="poll-card"><div className="poll-card__question"><BarChart3 size={17}/><strong>{post.poll.question}</strong></div>{(post.poll.options || []).map((option, index) => { const selected = pollVotes[post.poll.id || post.id] === index; const total = Number(post.poll.totalVotes || 0); const votes = Number(option.votes || 0); const percent = total > 0 ? Math.round((votes / total) * 100) : 0; return <button className={"poll-option " + (selected ? "is-selected" : "")} key={index} onClick={() => setPollVotes((current) => ({ ...current, [post.poll.id || post.id]: index }))}><span>{option.text || option}</span><span>{percent}%</span></button>; })}<small>{post.poll.totalVotes || 0} votes</small></div>}\n      {(post.audio || post.music) && <div className="audio-card"><div className="audio-art"><Music2 size={20}/></div><div><strong>{post.audio?.title || "Late Night Notes"}</strong><span>{post.audio?.artist || "Original audio"} · 2:48</span></div><button className="play">▶</button></div>}
      <div className="post__actions">
        <button onClick={() => onOpen?.("/post/" + post.id + "/replies")}><MessageCircle size={18}/><span>{post.replies ?? post.r ?? 0}</span></button>
        <button className={reposted ? "is-active" : ""} onClick={() => onRepost?.(post.id)}><Repeat2 size={18}/><span>{post.reposts ?? post.p ?? 0}</span></button>
        <button className={post.liked ? "is-liked" : ""} onClick={() => onLike?.(post.id)}><Heart size={18} fill={post.liked ? "currentColor" : "none"}/><span>{post.likes ?? post.l ?? 0}</span></button>
        <button className={post.saved ? "is-saved" : ""} onClick={() => onSave?.(post.id)}><Bookmark size={18} fill={post.saved ? "currentColor" : "none"}/><span>{post.bookmarks ?? post.b ?? 0}</span></button>
        <button onClick={() => onOpen?.("/post/" + post.id + "/quote")} aria-label="Quote"><Repeat2 size={16}/></button>
        <button onClick={() => onOpen?.("/share/" + post.id)} aria-label="Share"><Send size={17}/></button>
      </div>
      {moderation === "report" && <div className="moderation-sheet"><strong>Report this post</strong><small>Choose a reason</small><div>{Object.entries(REPORT_REASONS).map(([key, value]) => <button key={value} onClick={() => runModeration(MODERATION_ACTIONS.REPORT, value)} disabled={moderationBusy}>{key.replace("_", " ")}</button>)}</div><button className="outline" onClick={() => setModeration(null)}>Cancel</button></div>}
      {moderationMessage && <div className="inline-notice" role="status">{moderationMessage}</div>}
      <div className="post-foot"><button onClick={() => onFollow?.(post.id)}>{isFollowing ? "Following" : "Follow " + author.split(" ")[0]}</button><button onClick={() => onOpen?.("/topic/" + encodeURIComponent(post.topic || "community"))}>#{post.topic || "community"}</button></div>
    </div>
  </article>;
}
