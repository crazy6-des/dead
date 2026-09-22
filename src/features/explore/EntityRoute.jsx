import React, { useEffect, useState } from "react";
import { socialGraphService } from "../../services/socialGraphService.js";
import { replyService } from "../../services/replyService.js";
import { profileService } from "../../services/profileService.js";
import PostCard from "../post/PostCard.jsx";
import { publishQuotePost } from "../../services/postService.js";
import { ArrowLeft, Check, Copy, Heart, Link2, MessageCircle, Repeat2, Send, Users } from "lucide-react";

function BackButton({ onBack }) { return <button className="back-link" onClick={onBack}><ArrowLeft size={17}/>Back</button>; }
function decodeRouteSegment(value) {
  try { return decodeURIComponent(value); } catch { return value; }
}

function ActionBar({ post, onLike, onSave, onReply, onRepost, onShare }) {
  return <div className="detail-actions">
    <button onClick={onReply}><MessageCircle size={17}/>{post.r ?? 0} Reply</button>
    <button className={post.reposted ? "is-active" : ""} onClick={() => onRepost?.(post.id)}><Repeat2 size={17}/>{post.p ?? 0} Repost</button>
    <button className={post.liked ? "is-liked" : ""} onClick={() => onLike?.(post.id)}><Heart size={17} fill={post.liked ? "currentColor" : "none"}/>{post.l ?? 0} Like</button>
    <button className={post.saved ? "is-active" : ""} onClick={() => onSave?.(post.id)}><span aria-hidden="true">🔖</span>{post.saved ? "Saved" : "Save"}</button>
    <button onClick={onShare}><Send size={17}/>Share</button>
  </div>;
}

function PostDetail({ post, onBack, onLike, onSave, onRepost, onOpen, onFollowUser, onQuote, followingUsers = new Set(), mode = "post" }) {
  const [reply, setReply] = useState("");
  const [quote, setQuote] = useState("");
  const [replies, setReplies] = useState([]);
  const [replyLoading, setReplyLoading] = useState(mode !== "quote" && mode !== "media");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [shared, setShared] = useState(false);
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);

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

  const submitQuote = async () => {
    const text = quote.trim();
    if (!text || quoteSubmitting) return;
    setQuoteSubmitting(true);
    setReplyError("");
    try {
      const created = await publishQuotePost({ postId: post.id, text });
      if (!created?.id) throw new Error("The quote was not returned by the server.");
      setQuote("");
      onQuote?.(created);
    } catch (error) {
      setReplyError(error?.message || "Your quote could not be posted.");
    } finally {
      setQuoteSubmitting(false);
    }
  };

  const share = async () => {
    const url = window.location.origin + "/post/" + post.id;
    try { if (navigator.share) await navigator.share({ title: "Post on S", text: post.x || "Post on S", url }); else await navigator.clipboard?.writeText(url); }
    catch { setShared(false); return; }
    setShared(true);
  };

  const music = post.music;
  const username = String(post.h || "user").replace(/^@/, "").toLowerCase();
  const following = followingUsers.has(username);
  return <div className="detail-page"><BackButton onBack={onBack}/><article className="detail-post"><div className="avatar">{(post.a || "S")[0]}</div><div>
    <div className="post__meta"><strong>{post.a || "User"}</strong>{post.verified && <span className="verified"><Check size={10}/></span>}<span className="muted">@{String(post.h || "user").replace("@", "")}</span><span className="muted">· {post.t || "now"}</span><button className={following ? "is-following" : "outline"} onClick={() => onFollowUser?.(username)}>{following ? "Following" : "Follow"}</button></div>
    <p className="detail-post__text">{post.x}</p>
    {Array.isArray(post.media) && post.media.length > 0 && <button className="post-media detail-media" onClick={() => onOpen?.("/post/" + post.id + "/media")}><img src={typeof post.media[0] === "string" ? post.media[0] : post.media[0]?.url} alt="Post media" loading="lazy" /><small>Open media viewer</small></button>}
    {music && <div className="audio-card"><strong>{music.title || music.name || "Audio attachment"}</strong><span>{music.artist || music.type || "Audio"}{music.durationMs ? " · " + Math.round(music.durationMs / 1000) + "s" : ""}</span></div>}
    <ActionBar post={post} onLike={onLike} onSave={onSave} onRepost={onRepost} onReply={() => document.getElementById("reply-box")?.focus()} onShare={share}/>
  </div></article>
  {mode === "quote" && <section className="composer-panel"><div className="heading"><small>QUOTE POST</small><h3>Add your perspective</h3></div><textarea value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="Say something about this post…" maxLength={5000}/><div className="composer-panel__footer"><span>{quote.length}/5000</span><button className="primary" disabled={!quote.trim() || quoteSubmitting} onClick={submitQuote}>{quoteSubmitting ? "Quoting…" : "Quote"}</button></div></section>}
  <section className="thread"><div className="thread-head"><h3>{mode === "media" ? "Media" : "Replies"}</h3><span>{mode === "media" ? "Media from this post" : replies.length + " repl" + (replies.length === 1 ? "y" : "ies")}</span></div>
    {mode === "media" && <div className="media-viewer">
      {Array.isArray(post.media) && post.media.filter((item) => String(item?.mediaType || "").toLowerCase() !== "audio").map((item, index) => {
        const src = typeof item === "string" ? item : item?.url;
        return src ? <img key={src + index} src={src} alt={item?.alt || "Post media"} loading="lazy" /> : null;
      })}
      {music?.url && <audio controls preload="metadata" src={music.url} />}
      {(!post.media?.length && !music?.url) && <div className="empty"><h3>No media available</h3><p>The post does not contain a deliverable media attachment.</p></div>}
    </div>}
    {mode !== "media" && <><div className="reply-composer"><div className="avatar avatar--small">D</div><div className="reply-composer__body"><textarea id="reply-box" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to this post…" maxLength={5000} disabled={replySubmitting}/><div><span>{reply.length}/5000</span><button className="primary" disabled={!reply.trim() || replySubmitting} onClick={submitReply}>{replySubmitting ? "Replying…" : "Reply"}</button></div></div></div>
      {replyError && <div className="inline-notice" role="alert">{replyError}</div>}
      {replyLoading ? <div className="empty" role="status"><h3>Loading replies…</h3></div> : replies.length === 0 ? <div className="empty"><h3>No replies yet</h3><p>Be the first to reply.</p></div> : <div className="reply-list">{replies.map((item) => <article className="reply-row" key={item.id}><div className="avatar avatar--small">{String(item.author?.displayName || item.author?.username || "U")[0]}</div><div><div className="post__meta"><strong>{item.author?.displayName || item.author?.username || "User"}</strong><span className="muted">@{item.author?.username || "user"}</span></div><p>{item.text}</p></div></article>)}</div>}
    </>}
  </section>{shared && <div className="inline-notice"><Link2 size={16}/>Post link copied/shared.</div>}</div>;
}
function ShareDetail({ post, onBack }) { const [copied, setCopied] = useState(false); const copy = async () => { try { await navigator.clipboard?.writeText(window.location.origin + "/post/" + post.id); setCopied(true); } catch { setCopied(false); } }; return <div className="detail-page"><BackButton onBack={onBack}/><div className="share-sheet"><div className="heading"><small>SHARE</small><h2>Share this post</h2></div><div className="share-preview"><b>{post.a || "User"}</b><p>{post.x}</p></div><div className="share-options"><button onClick={copy}><Copy/>Copy link</button><button onClick={() => window.open("mailto:?subject=Post on S&body=" + encodeURIComponent(window.location.origin + "/post/" + post.id), "_self")}><Send/>Send by email</button><button disabled><Users/>Share with followers</button></div>{copied && <p className="inline-notice">Link copied.</p>}</div></div>; }

function UserDetail({ username, onBack, onOpen, onLike, onSave, onRepost, onFollowUser, followingUsers = new Set() }) {
  const user = String(username || "user").replace(/^@/, "").toLowerCase();
  const following = followingUsers.has(user);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("posts");
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");
  useEffect(() => {
    let active = true;
    profileService.getByUsername(user).then((result) => {
      if (!active) return;
      setProfile(result?.profile || result || null);
      setLoading(false);
    }).catch((cause) => {
      if (!active) return;
      setError(cause?.message || "Profile could not be loaded.");
      setLoading(false);
    });
    return () => { active = false; };
  }, [user]);
  useEffect(() => { let active = true; profileService.listPosts(user, tab).then((result) => { if (active) setActivity(Array.isArray(result?.items) ? result.items : []); }).catch((cause) => { if (active) setActivityError(cause?.message || "Profile activity could not be loaded."); }).finally(() => { if (active) setActivityLoading(false); }); return () => { active = false; }; }, [user, tab]);
  const displayName = profile?.displayName || profile?.username || user;
  const initial = displayName.charAt(0).toUpperCase() || "U";
  return <div className="detail-page"><BackButton onBack={onBack}/><div className="entity-hero"><div className="profile-cover"></div><div className="entity-avatar-wrap"><div className="avatar entity-avatar">{profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : initial}</div></div><div className="entity-hero__content">
    {loading ? <><h2>Loading profile…</h2><span>@{user}</span></> : error ? <><h2>Profile unavailable</h2><span>@{user}</span><p>{error}</p></> : <><h2>{displayName}</h2><span>@{profile.username}</span><p>{profile.bio || "No bio yet."}</p>{profile.website && <a href={/^https?:\/\//i.test(profile.website) ? profile.website : "https://" + profile.website} target="_blank" rel="noreferrer">{profile.website}</a>}</>}
    <div className="entity-stats"><button onClick={() => onOpen?.("/followers/" + user)}><b>{profile?.counts?.followers ?? "—"}</b><small>Followers</small></button><button onClick={() => onOpen?.("/following/" + user)}><b>{profile?.counts?.following ?? "—"}</b><small>Following</small></button></div><button className={following ? "outline" : "primary"} onClick={() => onFollowUser?.(user)}>{following ? "Following" : "Follow"}</button>
  </div></div><div className="entity-tabs">{["posts", "replies", "media", "likes"].map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => { if (item === tab) return; setActivityLoading(true); setActivityError(""); setTab(item); }}>{item.charAt(0).toUpperCase() + item.slice(1)}</button>)}</div>
  {activityLoading ? <div className="empty" role="status"><h3>Loading activity…</h3></div> : activityError ? <div className="empty" role="alert"><h3>Could not load activity</h3><p>{activityError}</p></div> : activity.length > 0 ? activity.map((post) => <PostCard key={post.id} post={post} onLike={onLike} onSave={onSave} onRepost={onRepost} onFollow={(postId) => { const item = activity.find((entry) => entry.id === postId); onFollowUser?.(String(item?.author?.username || "").replace(/^@/, "")); }} onOpen={onOpen}/>) : <div className="empty"><h3>No {tab} yet</h3><p>This profile has no public {tab} activity to show.</p></div>}
  </div>;
}

function NetworkRoute({ type, username, onBack, followingUsers = new Set(), onFollowUser }) { const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); useEffect(() => { let active = true; const request = type === "followers" ? socialGraphService.listFollowers(username) : socialGraphService.listFollowing(username); request.then((page) => { if (!active) return; setItems(Array.isArray(page?.items) ? page.items : []); setLoading(false); }).catch(() => active && setLoading(false)); return () => { active = false; }; }, [type, username]); if (loading) return <div className="detail-page"><BackButton onBack={onBack}/><div className="empty"><h3>Loading network…</h3></div></div>; return <div className="detail-page"><BackButton onBack={onBack}/><div className="heading"><small>PROFILE NETWORK</small><h2>{type === "followers" ? "Followers" : "Following"}</h2><p>@{username}</p></div>{items.length === 0 ? <div className="empty"><h3>No network data yet</h3><p>Follow relationships will appear here when the social graph service returns them.</p></div> : items.map((person) => { const target = person.username; const following = followingUsers.has(target); return <div className="network-row" key={target}><div className="avatar avatar--small">{String(person.name || target)[0]}</div><div><b>{person.name || target}</b><span>@{target}</span></div><button className={following ? "is-following" : "outline"} onClick={() => onFollowUser?.(target)}>{following ? "Following" : "Follow"}</button></div>; })}</div>; }

export default function EntityRoute({ path = "/", posts = [], onBack, onOpen, onLike, onSave, onRepost, onFollowUser, onQuote, followingUsers = new Set() }) { const parts = String(path).split("/").filter(Boolean); const type = parts[0] || ""; const id = parts[1] || ""; if (type === "post") { const post = posts.find((item) => String(item.id) === String(id)); return post ? <PostDetail post={post} onBack={onBack} onLike={onLike} onSave={onSave} onRepost={onRepost} onOpen={onOpen} onFollowUser={onFollowUser} onQuote={onQuote} followingUsers={followingUsers} mode={parts[2] || "post"}/> : <div className="detail-page"><BackButton onBack={onBack}/><div className="empty"><h3>Post not found</h3><p>This post may have been removed or is not available.</p></div></div>; } if (type === "share") { const post = posts.find((item) => String(item.id) === String(id)); return post ? <ShareDetail post={post} onBack={onBack}/> : <div className="detail-page"><BackButton onBack={onBack}/><div className="empty"><h3>Post not found</h3></div></div>; } if (type === "user") return <UserDetail username={id} onBack={onBack} onOpen={onOpen} onLike={onLike} onSave={onSave} onRepost={onRepost} onFollowUser={onFollowUser} followingUsers={followingUsers}/>; if (type === "followers" || type === "following") return <NetworkRoute type={type} username={id || "david"} onBack={onBack} followingUsers={followingUsers} onFollowUser={onFollowUser}/>; if (type === "topic") { const topic = decodeRouteSegment(id); return <div className="detail-page"><BackButton onBack={onBack}/><div className="heading"><small>TOPIC</small><h2>#{topic}</h2><p>Conversation around this topic on S.</p></div>{posts.filter((post) => String(post.topic || "").toLowerCase() === topic.toLowerCase()).map((post) => <PostCard key={post.id} post={post} onLike={onLike} onSave={onSave} onRepost={onRepost} onFollow={(postId) => onFollowUser?.(String(posts.find((item) => item.id === postId)?.h || "").replace("@", ""))} onOpen={onOpen}/>)}</div>; } return <div className="detail-page"><BackButton onBack={onBack}/><div className="empty"><h3>Nothing to show</h3><p>That S destination is not available.</p></div></div>; }
