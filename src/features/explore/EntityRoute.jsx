import React, { useEffect, useMemo, useState } from "react";
import { socialGraphService } from "../../services/socialGraphService.js";
import { replyService } from "../../services/replyService.js";
import { profileService } from "../../services/profileService.js";
import { createMessageAdapter } from "../../services/messageService.js";
import PostCard from "../post/PostCard.jsx";
import { toFeedPostFromCreatedPost } from "../feed/feedPostAdapter.js";
import { postService, publishQuotePost } from "../../services/postService.js";
import { createSearchAdapter } from "../../services/searchService.js";
import { ArrowLeft, Check, Copy, Heart, Link2, MessageCircle, MoreHorizontal, Repeat2, Send, Users, X } from "lucide-react";
import { getUserPresentation } from "../auth/userPresentation.js";
import { formatFullDateTime } from "../../utils/dateTime.js";

function BackButton({ onBack }) { return <button className="back-link" onClick={onBack}><ArrowLeft size={17}/>Back</button>; }
function decodeRouteSegment(value) {
  try { return decodeURIComponent(value); } catch { return value; }
}

function ActionBar({ post, replyCount, onLike, onSave, onReply, onRepost, onShare }) {
  return <div className="detail-actions">
    <button onClick={onReply}><MessageCircle size={17}/>{replyCount ?? post.r ?? 0} Reply</button>
    <button className={post.reposted ? "is-active" : ""} onClick={() => onRepost?.(post.id)}><Repeat2 size={17}/>{post.p ?? 0} Repost</button>
    <button className={post.liked ? "is-liked" : ""} onClick={() => onLike?.(post.id)}><Heart size={17} fill={post.liked ? "currentColor" : "none"}/>{post.l ?? 0} Like</button>
    <button className={post.saved ? "is-active" : ""} onClick={() => onSave?.(post.id)}><span aria-hidden="true">🔖</span>{post.saved ? "Saved" : "Save"}</button>
    <button onClick={onShare}><Send size={17}/>Share</button>
  </div>;
}

function PostDetail({ post, currentUser, onBack, onLike, onSave, onRepost, onOpen, onFollowUser, onQuote, followingUsers = new Set(), mode = "post" }) {
  const [reply, setReply] = useState("");
  const [quote, setQuote] = useState("");
  const [replies, setReplies] = useState([]);
  const [replyCount, setReplyCount] = useState(Number(post.r ?? 0));
  const [replyLoading, setReplyLoading] = useState(mode !== "quote" && mode !== "media");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyCursor, setReplyCursor] = useState(null);
  const [replyLoadingMore, setReplyLoadingMore] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [shared, setShared] = useState(false);
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [postMenu, setPostMenu] = useState(false);
  const [postEditing, setPostEditing] = useState(false);
  const [postEditText, setPostEditText] = useState(post.x || post.text || "");
  const [detailText, setDetailText] = useState(post.x || post.text || "");
  const [postEditBusy, setPostEditBusy] = useState(false);
  const [replyEditingId, setReplyEditingId] = useState(null);
  const [replyEditText, setReplyEditText] = useState("");
  const [replyEditBusy, setReplyEditBusy] = useState(false);
  const [replyMenuId, setReplyMenuId] = useState(null);

  useEffect(() => {
    if (mode === "quote" || mode === "media") return undefined;
    let active = true;
    replyService.list(post.id)
      .then((page) => {
        if (!active) return;
        setReplies(page.items);
        setReplyCursor(page.nextCursor || null);
        setReplyCount(Number(page.replyCount ?? post.r ?? page.items.length));
        setReplyLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        setReplyError(error?.message || "Replies could not be loaded.");
        setReplyLoading(false);
      });
    return () => { active = false; };
  }, [mode, post.id, post.r]);

  const savePostEdit = async () => {
    const text = postEditText.trim();
    if (!text || postEditBusy) return;
    setPostEditBusy(true);
    try {
      const updated = await postService.update(post.id, text);
      setDetailText(updated?.text || text);
      setPostEditing(false);
      setPostMenu(false);
    } catch (error) { setReplyError(error?.message || "The post could not be edited."); }
    finally { setPostEditBusy(false); }
  };
  const deleteOwnedPost = async () => {
    if (postEditBusy || !window.confirm("Delete this post permanently from S?")) return;
    setPostEditBusy(true);
    try { await postService.delete(post.id); setPostMenu(false); onBack(); }
    catch (error) { setReplyError(error?.message || "The post could not be deleted."); }
    finally { setPostEditBusy(false); }
  };

  const submitReply = async () => {
    const text = reply.trim();
    if (!text || replySubmitting) return;
    setReplySubmitting(true);
    setReplyError("");
    try {
      const parentId = replyTarget?.id || post.id;
      const created = await replyService.create(parentId, text);
      if (!created) throw new Error("The reply was not returned by the server.");
      setReplies((items) => [...items, created]);
      setReplyCount((count) => count + 1);
      setReply("");
      setReplyTarget(null);
    } catch (error) {
      setReplyError(error?.message || "Your reply could not be posted.");
    } finally {
      setReplySubmitting(false);
    }
  };

  const loadOlderReplies = async () => {
    if (!replyCursor || replyLoadingMore) return;
    setReplyLoadingMore(true);
    setReplyError("");
    try {
      const page = await replyService.list(post.id, { cursor: replyCursor });
      setReplies((items) => [...(page.items || []).filter((older) => !items.some((item) => item.id === older.id)), ...items]);
      setReplyCursor(page.nextCursor || null);
    } catch (error) {
      setReplyError(error?.message || "Older replies could not be loaded.");
    } finally {
      setReplyLoadingMore(false);
    }
  };

  const saveReplyEdit = async () => {
    const text = replyEditText.trim();
    if (!replyEditingId || !text || replyEditBusy) return;
    setReplyEditBusy(true);
    try {
      const updated = await replyService.update(replyEditingId, text);
      setReplies((items) => items.map((item) => item.id === replyEditingId ? { ...item, text: updated?.text || text, updatedAt: updated?.updatedAt || new Date().toISOString() } : item));
      setReplyEditingId(null);
      setReplyEditText("");
    } catch (error) { setReplyError(error?.message || "Your reply could not be edited."); }
    finally { setReplyEditBusy(false); }
  };

  const deleteReply = async (replyId) => {
    if (replyEditBusy || !window.confirm("Delete this reply permanently from S?")) return;
    setReplyEditBusy(true);
    try {
      await replyService.delete(replyId);
      setReplies((items) => items.filter((item) => item.id !== replyId));
      setReplyCount((count) => Math.max(0, count - 1));
    } catch (error) { setReplyError(error?.message || "Your reply could not be deleted."); }
    finally { setReplyEditBusy(false); }
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
  const currentUserPresentation = getUserPresentation(currentUser);
  const username = String(post.h || "user").replace(/^@/, "").toLowerCase();
  const following = followingUsers.has(username);
  return <div className="detail-page"><BackButton onBack={onBack}/><article className="detail-post"><div className="avatar">{(post.a || "S")[0]}</div><div>
    <div className="post__meta"><strong>{post.a || "User"}</strong>{post.verified && <span className="verified"><Check size={10}/></span>}<span className="muted">@{String(post.h || "user").replace("@", "")}</span><span className="muted">· {formatFullDateTime(post.createdAt || post.t)}</span><button className={following ? "is-following" : "outline"} onClick={() => onFollowUser?.(username)}>{following ? "Following" : "Follow"}</button>{post.isOwner && <div className="post-menu"><button className="icon-btn" type="button" aria-label="More" onClick={() => setPostMenu((value) => !value)}><MoreHorizontal size={17}/></button>{postMenu && <div className="popover"><button type="button" onClick={() => { setPostEditText(detailText); setPostEditing(true); setPostMenu(false); }}>Edit post</button><button type="button" className="danger" onClick={deleteOwnedPost} disabled={postEditBusy}>Delete post</button></div>}</div>}</div>
    {postEditing ? <div className="post-edit-box"><textarea value={postEditText} onChange={(event) => setPostEditText(event.target.value)} maxLength={5000} aria-label="Edit post"/><div><span>{postEditText.length}/5000</span><button type="button" onClick={() => { setPostEditing(false); setPostEditText(detailText); }} disabled={postEditBusy}>Cancel</button><button type="button" className="primary" onClick={savePostEdit} disabled={postEditBusy || !postEditText.trim()}>{postEditBusy ? "Saving…" : "Save"}</button></div></div> : <p className="detail-post__text">{detailText}</p>
    {Array.isArray(post.media) && post.media.filter((item) => String(item?.mediaType || "").toLowerCase() !== "audio").length > 0 && <div className="post-media-grid detail-media-grid" aria-label="Post images">{post.media.filter((item) => String(item?.mediaType || "").toLowerCase() !== "audio").map((item, index) => { const src = typeof item === "string" ? item : item?.url; return src ? <img key={src + index} src={src} alt={item?.alt || "Post media"} loading="lazy" /> : null; })}</div>}
    {music && <div className="audio-card"><strong>{music.title || music.name || "Audio attachment"}</strong><span>{music.artist || music.type || "Audio"}{music.durationMs ? " · " + Math.round(music.durationMs / 1000) + "s" : ""}</span></div>}
    <ActionBar post={post} replyCount={replyCount} onLike={onLike} onSave={onSave} onRepost={onRepost} onReply={() => document.getElementById("reply-box")?.focus()} onShare={share}/>
  </div></article>
  {mode === "quote" && <section className="composer-panel"><div className="heading"><small>QUOTE POST</small><h3>Add your perspective</h3></div><textarea value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="Say something about this post…" maxLength={5000}/><div className="composer-panel__footer"><span>{quote.length}/5000</span><button className="primary" disabled={!quote.trim() || quoteSubmitting} onClick={submitQuote}>{quoteSubmitting ? "Quoting…" : "Quote"}</button></div></section>}
  <section className="thread"><div className="thread-head"><h3>{mode === "media" ? "Media" : "Replies"}</h3><span>{mode === "media" ? "Media from this post" : replyCount + " repl" + (replyCount === 1 ? "y" : "ies")}</span></div>
    {mode !== "media" && <><div className="reply-composer"><div className="avatar avatar--small">{currentUserPresentation.avatarInitial}</div><div className="reply-composer__body">{replyTarget && <div className="reply-target" role="status">Replying to @{replyTarget.author?.username || "user"} <button type="button" onClick={() => setReplyTarget(null)}>Cancel</button></div>}<textarea id="reply-box" value={reply} onChange={(e) => setReply(e.target.value)} placeholder={replyTarget ? "Reply to this reply…" : "Reply to this post…"} maxLength={5000} disabled={replySubmitting}/><div><span>{reply.length}/5000</span><button className="primary" disabled={!reply.trim() || replySubmitting} onClick={submitReply}>{replySubmitting ? "Replying…" : "Reply"}</button></div></div></div>
      {replyError && <div className="inline-notice" role="alert">{replyError}</div>}
      {replyLoading ? <div className="empty" role="status"><h3>Loading replies…</h3></div> : replies.length === 0 ? <div className="empty"><h3>No replies yet</h3><p>Be the first to reply.</p></div> : <div className="reply-list">{replyCursor && <button className="outline" type="button" onClick={loadOlderReplies} disabled={replyLoadingMore}>{replyLoadingMore ? "Loading older replies…" : "Load older replies"}</button>}{replies.map((item) => <article className="reply-row" key={item.id}><div className="avatar avatar--small">{String(item.author?.displayName || item.author?.username || "U")[0]}</div><div><div className="post__meta"><strong>{item.author?.displayName || item.author?.username || "User"}</strong><span className="muted">@{item.author?.username || "user"}</span><span className="muted">· {formatFullDateTime(item.createdAt || item.t)}</span>{item.isOwner && <div className="post-menu"><button className="icon-btn" type="button" aria-label="Reply options" onClick={() => setReplyMenuId((current) => current === item.id ? null : item.id)}><MoreHorizontal size={16}/></button>{replyMenuId === item.id && <div className="popover"><button type="button" onClick={() => { setReplyEditingId(item.id); setReplyEditText(item.text || ""); }}><span aria-hidden="true">✎</span>Edit reply</button><button type="button" className="danger" onClick={() => deleteReply(item.id)} disabled={replyEditBusy}>Delete reply</button></div></div>}</div>{replyEditingId === item.id ? <div className="reply-edit-box"><textarea value={replyEditText} onChange={(event) => setReplyEditText(event.target.value)} maxLength={5000} aria-label="Edit reply"/><div><span>{replyEditText.length}/5000</span><button type="button" onClick={() => setReplyEditingId(null)} disabled={replyEditBusy}>Cancel</button><button type="button" className="primary" onClick={saveReplyEdit} disabled={replyEditBusy || !replyEditText.trim()}>{replyEditBusy ? "Saving…" : "Save"}</button></div></div> : <p>{item.text}</p>}<button className="reply-inline" type="button" onClick={() => { setReplyTarget(item); document.getElementById("reply-box")?.focus(); }}>Reply</button></div></article>)}</div>}
    </>}
  </section>{shared && <div className="inline-notice"><Link2 size={16}/>Post link copied/shared.</div>}</div>;
}
function PostEntityRoute({ postId, initialPost, ...props }) {
  const [post,setPost]=useState(initialPost||null); const [loading,setLoading]=useState(!initialPost); const [error,setError]=useState("");
  const toggleEntityAction = async (action, field, countKey) => {
    if (!post) return;
    const previous = post;
    const enabled = !Boolean(previous[field]);
    setPost((current) => current ? { ...current, [field]: enabled, [countKey]: Math.max(0, Number(current[countKey] || 0) + (enabled ? 1 : -1)) } : current);
    try {
      await props[action]?.(post.id, enabled);
    } catch (cause) {
      setPost(previous);
      throw cause;
    }
  };
  useEffect(()=>{ if(initialPost) return undefined; let active=true;
    postService.getById(postId).then((result)=>{if(!active)return;setPost(result||null);if(!result)setError("This post may have been removed or is not available.");}).catch((cause)=>active&&setError(cause?.message||"Post could not be loaded.")).finally(()=>active&&setLoading(false));
    return()=>{active=false;};
  },[postId,initialPost]);
  if(loading)return <div className="detail-page"><BackButton onBack={props.onBack}/><div className="empty" role="status"><h3>Loading post…</h3></div></div>;
  if(!post)return <div className="detail-page"><BackButton onBack={props.onBack}/><div className="empty"><h3>Post not found</h3><p>{error||"This post may have been removed or is not available."}</p></div></div>;
  return <PostDetail post={toFeedPostFromCreatedPost(post)} {...props} onLike={() => toggleEntityAction("onLike", "liked", "l")} onSave={() => toggleEntityAction("onSave", "saved", "b")} onRepost={() => toggleEntityAction("onRepost", "reposted", "p")}/>
}

function ShareDetail({ post: initialPost, postId, onBack, onShareFollowers }) {
  const [post, setPost] = useState(initialPost || null);
  const [loading, setLoading] = useState(() => !initialPost && Boolean(postId));
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false); const [sharing, setSharing] = useState(false); const [sharedFollowers, setSharedFollowers] = useState(false); useEffect(() => {
    if (post || !postId) return undefined;
    let active = true;
    postService.getById(postId).then((result) => {
      if (!active) return;
      if (!result) throw new Error("Post not found.");
      setPost(toFeedPostFromCreatedPost(result));
    }).catch((cause) => {
      if (active) setError(cause?.message || "Post could not be loaded.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [post, postId]);

  const copy = async () => { try { await navigator.clipboard?.writeText(window.location.origin + "/post/" + encodeURIComponent(post.id)); setCopied(true); } catch { setCopied(false); } }; const shareFollowers = async () => { if (sharing || sharedFollowers) return; setSharing(true); try { await onShareFollowers?.(post.id); setSharedFollowers(true); } catch (error) { setSharedFollowers(false); } finally { setSharing(false); } }; if (loading) return <div className="detail-page"><BackButton onBack={onBack}/><div className="empty" role="status"><p>Loading post…</p></div></div>;
  if (error || !post) return <div className="detail-page"><BackButton onBack={onBack}/><div className="empty" role="alert"><h3>Post unavailable</h3><p>{error || "Post not found."}</p></div></div>;
  return <div className="detail-page"><BackButton onBack={onBack}/><div className="share-sheet"><div className="heading"><small>SHARE</small><h2>Share this post</h2></div><div className="share-preview"><b>{post.a || "User"}</b><p>{post.x}</p></div><div className="share-options"><button onClick={copy}><Copy/>Copy link</button><button onClick={() => window.open("mailto:?subject=Post on S&body=" + encodeURIComponent(window.location.origin + "/post/" + encodeURIComponent(post.id)), "_self")}><Send/>Send by email</button><button onClick={shareFollowers} disabled={sharing || sharedFollowers}><Users/>{sharing ? "Sharing…" : sharedFollowers ? "Shared with followers" : "Share with followers"}</button></div>{copied && <p className="inline-notice">Link copied.</p>}</div></div>; }

function UserDetail({ username, onBack, onOpen, onLike, onSave, onRepost, onFollowUser, followingUsers = new Set() }) {
  const user = String(username || "user").replace(/^@/, "").toLowerCase();
  const following = followingUsers.has(user);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("posts");
  const [activity, setActivity] = useState([]);
  const [activityLoadedKey, setActivityLoadedKey] = useState("");
  const [activityErrorKey, setActivityErrorKey] = useState("");
  const [activityError, setActivityError] = useState("");
  const [messaging, setMessaging] = useState(false);
  const [messageError, setMessageError] = useState("");
  const messagesApi = useMemo(() => createMessageAdapter(), []);
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
  useEffect(() => { let active = true; const key = `${user}:${tab}`; profileService.listPosts(user, tab).then((result) => { if (!active) return; setActivity(Array.isArray(result?.items) ? result.items.map((item) => toFeedPostFromCreatedPost(item)) : []); setActivityLoadedKey(key); setActivityErrorKey(""); }).catch((cause) => { if (!active) return; setActivityError(cause?.message || "Profile activity could not be loaded."); setActivityErrorKey(key); }).finally(() => { if (!active) return; }); return () => { active = false; }; }, [user, tab]);
  const activityKey = `${user}:${tab}`;
  const activityLoading = activityLoadedKey !== activityKey && activityErrorKey !== activityKey;
  const currentActivityError = activityErrorKey === activityKey ? activityError : "";
  const displayName = profile?.displayName || profile?.username || user;
  const initial = displayName.charAt(0).toUpperCase() || "U";
  return <div className="detail-page"><BackButton onBack={onBack}/><div className="entity-hero"><div className="profile-cover"></div><div className="entity-avatar-wrap"><div className="avatar entity-avatar">{profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : initial}</div></div><div className="entity-hero__content">
    {loading ? <><h2>Loading profile…</h2><span>@{user}</span></> : error ? <><h2>Profile unavailable</h2><span>@{user}</span><p>{error}</p></> : <><h2>{displayName}</h2><span>@{profile.username}</span><p>{profile.bio || "No bio yet."}</p>{profile.website && <a href={/^https?:\/\//i.test(profile.website) ? profile.website : "https://" + profile.website} target="_blank" rel="noreferrer">{profile.website}</a>}</>}
    <div className="entity-stats"><button onClick={() => onOpen?.("/followers/" + encodeURIComponent(user))}><b>{profile?.counts?.followers ?? "—"}</b><small>Followers</small></button><button onClick={() => onOpen?.("/following/" + encodeURIComponent(user))}><b>{profile?.counts?.following ?? "—"}</b><small>Following</small></button></div><div className="entity-actions"><button className={following ? "outline" : "primary"} onClick={() => onFollowUser?.(user)}>{following ? "Following" : "Follow"}</button><button className="outline" disabled={messaging} onClick={async () => { setMessaging(true); setMessageError(""); try { const result = await messagesApi.createConversation(user); const id = result?.conversation?.id; if (!id) throw new Error("Conversation could not be created."); onOpen?.("/messages?conversation=" + encodeURIComponent(id)); } catch (cause) { setMessageError(cause?.message || "Could not start conversation."); } finally { setMessaging(false); } }}>{messaging ? "Opening…" : "Message"}</button></div>{messageError && <p className="entity-error" role="alert">{messageError}</p>}
  </div></div><div className="entity-tabs">{["posts", "replies", "media", "likes"].map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => { if (item === tab) return; setTab(item); }}>{item.charAt(0).toUpperCase() + item.slice(1)}</button>)}</div>
  {activityLoading ? <div className="empty" role="status"><h3>Loading activity…</h3></div> : currentActivityError ? <div className="empty" role="alert"><h3>Could not load activity</h3><p>{currentActivityError}</p></div> : activity.length > 0 ? activity.map((post) => <PostCard key={post.id} post={post} onLike={onLike} onSave={onSave} onRepost={onRepost} onFollow={(postId) => { const item = activity.find((entry) => entry.id === postId); onFollowUser?.(String(item?.author?.username || "").replace(/^@/, "")); }} onOpen={onOpen}/>) : <div className="empty"><h3>No {tab} yet</h3><p>This profile has no public {tab} activity to show.</p></div>}
  </div>;
}

function TopicDetail({ topic, posts, onBack, onOpen, onLike, onSave, onRepost, onFollowUser }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const fallback = posts.filter((post) => String(post.topic || "").toLowerCase() === topic.toLowerCase());
    createSearchAdapter({ posts }).search("#" + topic, "posts").then((result) => {
      if (!active) return;
      const remote = Array.isArray(result?.items?.posts) ? result.items.posts.map((item) => toFeedPostFromCreatedPost(item)) : [];
      setItems(remote.length ? remote : fallback);
    }).catch((cause) => {
      if (active) { setItems(fallback); setError(cause?.message || "Topic posts could not be loaded."); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [topic, posts]);
  return <div className="detail-page"><BackButton onBack={onBack}/><div className="heading"><small>TOPIC</small><h2>#{topic}</h2><p>Conversation around this topic on S.</p></div>
    {loading ? <div className="empty" role="status"><h3>Loading topic…</h3></div> : error ? <div className="inline-notice" role="alert">{error}</div> : null}
    {!loading && items.length === 0 ? <div className="empty"><h3>No posts yet</h3><p>There are no public posts for this topic.</p></div> : items.map((post) => <PostCard key={post.id} post={post} onLike={onLike} onSave={onSave} onRepost={onRepost} onFollow={(postId) => onFollowUser?.(String(items.find((item) => item.id === postId)?.h || "").replace("@", ""))} onOpen={onOpen}/>)}
  </div>;
}

function NetworkRoute({ type, username, onBack, followingUsers = new Set(), onFollowUser }) { const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); useEffect(() => { let active = true; const request = type === "followers" ? socialGraphService.listFollowers(username) : socialGraphService.listFollowing(username); request.then((page) => { if (!active) return; setItems(Array.isArray(page?.items) ? page.items : []); }).catch((cause) => { if (!active) return; setItems([]); setError(cause?.message || "The social graph could not be loaded."); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [type, username]); if (loading) return <div className="detail-page"><BackButton onBack={onBack}/><div className="empty" role="status"><h3>Loading network…</h3></div></div>; return <div className="detail-page"><BackButton onBack={onBack}/><div className="heading"><small>PROFILE NETWORK</small><h2>{type === "followers" ? "Followers" : "Following"}</h2><p>@{username}</p></div>{error ? <div className="empty" role="alert"><h3>Could not load network</h3><p>{error}</p></div> : items.length === 0 ? <div className="empty"><h3>No network data yet</h3><p>Follow relationships will appear here when the social graph service returns them.</p></div> : items.map((person) => { const target = person.username; const following = followingUsers.has(target); return <div className="network-row" key={target}><div className="avatar avatar--small">{String(person.name || target)[0]}</div><div><b>{person.name || target}</b><span>@{target}</span></div><button className={following ? "is-following" : "outline"} onClick={() => onFollowUser?.(target)}>{following ? "Following" : "Follow"}</button></div>; })}</div>; }

export default function EntityRoute({ path = "/", currentUser, posts = [], onBack, onOpen, onLike, onSave, onRepost, onFollowUser, onQuote, onShareFollowers, followingUsers = new Set() }) { const parts = String(path).split("/").filter(Boolean); const type = parts[0] || ""; const id = parts[1] || ""; if (type === "post") return <PostEntityRoute postId={id} initialPost={posts.find((item) => String(item.id) === String(id))} currentUser={currentUser} onBack={onBack} onLike={onLike} onSave={onSave} onRepost={onRepost} onOpen={onOpen} onFollowUser={onFollowUser} onQuote={onQuote} followingUsers={followingUsers} mode={parts[2] === "quote" ? "quote" : "post"}/>; if (type === "share") { const post = posts.find((item) => String(item.id) === String(id)); return <ShareDetail post={post} postId={id} onBack={onBack} onShareFollowers={onShareFollowers}/>; } if (type === "user") return <UserDetail username={id} onBack={onBack} onOpen={onOpen} onLike={onLike} onSave={onSave} onRepost={onRepost} onFollowUser={onFollowUser} followingUsers={followingUsers}/>; if (type === "followers" || type === "following") return <NetworkRoute key={`${type}:${id || ""}`} type={type} username={id || ""} onBack={onBack} followingUsers={followingUsers} onFollowUser={onFollowUser}/>; if (type === "topic") return <TopicDetail topic={decodeRouteSegment(id).replace(/^#/, "")} posts={posts} onBack={onBack} onOpen={onOpen} onLike={onLike} onSave={onSave} onRepost={onRepost} onFollowUser={onFollowUser}/>; return <div className="detail-page"><BackButton onBack={onBack}/><div className="empty"><h3>Nothing to show</h3><p>That S destination is not available.</p></div></div>; }
