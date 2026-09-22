import React, { useEffect, useState } from "react";
import { socialGraphService } from "../../services/socialGraphService.js";
import { replyService } from "../../services/replyService.js";
import PostCard from "../post/PostCard.jsx";
import { ArrowLeft, Check, Copy, Heart, Link2, MessageCircle, Repeat2, Send, Users } from "lucide-react";

function BackButton({ onBack }) { return <button className="back-link" onClick={onBack}><ArrowLeft size={17}/>Back</button>; }

function ActionBar({ post, onLike, onSave, onReply, onRepost, onShare }) {
  return <div className="detail-actions">
    <button onClick={onReply}><MessageCircle size={17}/>{post.r ?? 0} Reply</button>
    <button className={post.reposted ? "is-active" : ""} onClick={() => onRepost?.(post.id)}><Repeat2 size={17}/>{post.p ?? 0} Repost</button>
    <button className={post.liked ? "is-liked" : ""} onClick={() => onLike?.(post.id)}><Heart size={17} fill={post.liked ? "currentColor" : "none"}/>{post.l ?? 0} Like</button>
    <button onClick={() => onSave?.(post.id)}><span aria-hidden="true">🔖</span>Save</button>
    <button onClick={onShare}><Send size={17}/>Share</button>
  </div>;
}

function PostDetail({ post, onBack, onLike, onSave, onRepost, onOpen, mode = "post" }) {
  const [reply, setReply] = useState("");
  const [quote, setQuote] = useState("");
  const [replies, setReplies] = useState([]);
  const [replyLoading, setReplyLoading] = useState(mode !== "quote" && mode !== "media");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (mode === "quote" || mode === "media") return undefined;
    let active = true;
    replyService.list(post.id)
      .then((page) => {
        if (!active) return;
        setReplies(page.items);
        setReplyLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        setReplyError(error?.message || "Replies could not be loaded.");
        setReplyLoading(false);
      });
    return () => { active = false; };
  }, [mode, post.id]);

  const submitReply = async () => {
    const text = reply.trim();
    if (!text || replySubmitting) return;
    setReplySubmitting(true);
    setReplyError("");
    try {
      const created = await replyService.create(post.id, text);
      if (!created) throw new Error("The reply was not returned by the server.");
      setReplies((items) => [...items, created]);
      setReply("");
    } catch (error) {
      setReplyError(error?.message || "Your reply could not be posted.");
    } finally {
      setReplySubmitting(false);
    }
  };

  const submitLocalDraft = (value, kind) => { if (!value.trim()) return; setShared(false); setReply(""); setQuote(""); void kind; };

  const share = async () => {
    const url = window.location.origin + "/post/" + post.id;
    try { if (navigator.share) await navigator.share({ title: "Post on S", text: post.x || "Post on S", url }); else await navigator.clipboard?.writeText(url); }
    catch { setShared(false); return; }
    setShared(true);
  };

  const music = post.music;
  return <div className="detail-page"><BackButton onBack={onBack}/><article className="detail-post"><div className="avatar">{(post.a || "S")[0]}</div><div>
    <div className="post__meta"><strong>{post.a || "User"}</strong>{post.verified && <span className="verified"><Check size={10}/></span>}<span className="muted">@{String(post.h || "user").replace("@", "")}</span><span className="muted">· {post.t || "now"}</span></div>
    <p className="detail-post__text">{post.x}</p>
    {post.media && <button className="post-media detail-media" onClick={() => onOpen?.("/post/" + post.id + "/media")}><span>Visual expression</span><small>Open media viewer</small></button>}
    {music && <div className="audio-card"><strong>{music.title || music.name || "Audio attachment"}</strong><span>{music.artist || music.type || "Audio"}{music.durationMs ? " · " + Math.round(music.durationMs / 1000) + "s" : ""}</span></div>}
    <ActionBar post={post} onLike={onLike} onSave={onSave} onRepost={onRepost} onReply={() => document.getElementById("reply-box")?.focus()} onShare={share}/>
  </div></article>
  {mode === "quote" && <section className="composer-panel"><div className="heading"><small>QUOTE POST</small><h3>Add your perspective</h3></div><textarea value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="Say something about this post…" maxLength={5000}/><div className="composer-panel__footer"><span>{quote.length}/5000</span><button className="primary" disabled={!quote.trim()} onClick={() => submitLocalDraft(quote, "quote")}>Quote</button></div></section>}
  <section className="thread"><div className="thread-head"><h3>{mode === "media" ? "Media" : "Replies"}</h3><span>{mode === "media" ? "Media from this post" : replies.length + " repl" + (replies.length === 1 ? "y" : "ies")}</span></div>
    {mode === "media" && <div className="media-viewer"><div className="post-media"><span>Visual expression</span><small>Full media viewer surface</small></div><p className="muted">Media controls and delivery will connect to the media service later.</p></div>}
    {mode !== "media" && <><div className="reply-composer"><div className="avatar avatar--small">D</div><div className="reply-composer__body"><textarea id="reply-box" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to this post…" maxLength={5000} disabled={replySubmitting}/><div><span>{reply.length}/5000</span><button className="primary" disabled={!reply.trim() || replySubmitting} onClick={submitReply}>{replySubmitting ? "Replying…" : "Reply"}</button></div></div></div>
      {replyError && <div className="inline-notice" role="alert">{replyError}</div>}
      {replyLoading ? <div className="empty" role="status"><h3>Loading replies…</h3></div> : replies.length === 0 ? <div className="empty"><h3>No replies yet</h3><p>Be the first to reply.</p></div> : <div className="reply-list">{replies.map((item) => <article className="reply-row" key={item.id}><div className="avatar avatar--small">{String(item.author?.displayName || item.author?.username || "U")[0]}</div><div><div className="post__meta"><strong>{item.author?.displayName || item.author?.username || "User"}</strong><span className="muted">@{item.author?.username || "user"}</span></div><p>{item.text}</p></div></article>)}</div>}
    </>}
  </section>{shared && <div className="inline-notice"><Link2 size={16}/>Post link copied/shared.</div>}</div>;
}
function ShareDetail({ post, onBack }) { const [copied, setCopied] = useState(false); const copy = async () => { try { await navigator.clipboard?.writeText(window.location.origin + "/post/" + post.id); setCopied(true); } catch { setCopied(false); } }; return <div className="detail-page"><BackButton onBack={onBack}/><div className="share-sheet"><div className="heading"><small>SHARE</small><h2>Share this post</h2></div><div className="share-preview"><b>{post.a || "User"}</b><p>{post.x}</p></div><div className="share-options"><button onClick={copy}><Copy/>Copy link</button><button onClick={() => window.open("mailto:?subject=Post on S&body=" + encodeURIComponent(window.location.origin + "/post/" + post.id), "_self")}><Send/>Send by email</button><button disabled><Users/>Share with followers</button></div>{copied && <p className="inline-notice">Link copied.</p>}</div></div>; }

function UserDetail({ username, onBack, onOpen, onFollowUser, followingUsers = new Set() }) { const user = String(username || "user").replace(/^@/, ""); const following = followingUsers.has(user.toLowerCase()); return <div className="detail-page"><BackButton onBack={onBack}/><div className="entity-hero"><div className="profile-cover"></div><div className="entity-avatar-wrap"><div className="avatar entity-avatar">{user[0]?.toUpperCase() || "U"}</div></div><div className="entity-hero__content"><h2>User profile</h2><span>@{user}</span><p>Profile information will appear when the user service is connected.</p><div className="entity-stats"><button onClick={() => onOpen?.("/followers/" + user)}><b>—</b><small>Followers</small></button><button onClick={() => onOpen?.("/following/" + user)}><b>—</b><small>Following</small></button></div><button className={following ? "outline" : "primary"} onClick={() => onFollowUser?.(user)}>{following ? "Following" : "Follow"}</button></div></div><div className="entity-tabs"><button className="active">Posts</button><button disabled>Replies</button><button disabled>Media</button><button disabled>Likes</button></div></div>; }

function NetworkRoute({ type, username, onBack, followingUsers = new Set(), onFollowUser }) { const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); useEffect(() => { let active = true; const request = type === "followers" ? socialGraphService.listFollowers(username) : socialGraphService.listFollowing(username); request.then((page) => { if (!active) return; setItems(Array.isArray(page?.items) ? page.items : []); setLoading(false); }).catch(() => active && setLoading(false)); return () => { active = false; }; }, [type, username]); if (loading) return <div className="detail-page"><BackButton onBack={onBack}/><div className="empty"><h3>Loading network…</h3></div></div>; return <div className="detail-page"><BackButton onBack={onBack}/><div className="heading"><small>PROFILE NETWORK</small><h2>{type === "followers" ? "Followers" : "Following"}</h2><p>@{username}</p></div>{items.length === 0 ? <div className="empty"><h3>No network data yet</h3><p>Follow relationships will appear here when the social graph service returns them.</p></div> : items.map((person) => { const target = person.username; const following = followingUsers.has(target); return <div className="network-row" key={target}><div className="avatar avatar--small">{String(person.name || target)[0]}</div><div><b>{person.name || target}</b><span>@{target}</span></div><button className={following ? "is-following" : "outline"} onClick={() => onFollowUser?.(target)}>{following ? "Following" : "Follow"}</button></div>; })}</div>; }

export default function EntityRoute({ path = "/", posts = [], onBack, onOpen, onLike, onSave, onRepost, onFollowUser, followingUsers = new Set() }) { const parts = String(path).split("/").filter(Boolean); const type = parts[0] || ""; const id = parts[1] || ""; if (type === "post") { const post = posts.find((item) => String(item.id) === String(id)); return post ? <PostDetail post={post} onBack={onBack} onLike={onLike} onSave={onSave} onRepost={onRepost} onOpen={onOpen} mode={parts[2] || "post"}/> : <div className="detail-page"><BackButton onBack={onBack}/><div className="empty"><h3>Post not found</h3><p>This post may have been removed or is not available.</p></div></div>; } if (type === "share") { const post = posts.find((item) => String(item.id) === String(id)); return post ? <ShareDetail post={post} onBack={onBack}/> : <div className="detail-page"><BackButton onBack={onBack}/><div className="empty"><h3>Post not found</h3></div></div>; } if (type === "user") return <UserDetail username={id} onBack={onBack} onOpen={onOpen} onFollowUser={onFollowUser} followingUsers={followingUsers}/>; if (type === "followers" || type === "following") return <NetworkRoute type={type} username={id || "david"} onBack={onBack} followingUsers={followingUsers} onFollowUser={onFollowUser}/>; if (type === "topic") { const topic = decodeURIComponent(id); return <div className="detail-page"><BackButton onBack={onBack}/><div className="heading"><small>TOPIC</small><h2>#{topic}</h2><p>Conversation around this topic on S.</p></div>{posts.filter((post) => String(post.topic || "").toLowerCase() === topic.toLowerCase()).map((post) => <PostCard key={post.id} post={post} onLike={onLike} onSave={onSave} onRepost={onRepost} onOpen={onOpen}/>)}</div>; } return <div className="detail-page"><BackButton onBack={onBack}/><div className="empty"><h3>Nothing to show</h3><p>That S destination is not available.</p></div></div>; }
