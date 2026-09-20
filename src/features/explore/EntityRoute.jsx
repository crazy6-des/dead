import React, { useEffect, useState } from "react";
import { socialGraphService } from "../../services/socialGraphService.js";
import PostCard from "../post/PostCard.jsx";
import {
  ArrowLeft, Bookmark, Check, Copy, Heart, Link2, MessageCircle,
  Repeat2, Send, Users
} from "lucide-react";

const people = [
  { name: "Maya Okafor", username: "maya", bio: "Culture, community and thoughtful things." },
  { name: "Daniel Cole", username: "daniel", bio: "Building small things that matter." },
  { name: "Nia James", username: "nia", bio: "Music, ideas and late-night conversations." },
  { name: "S Team", username: "s", bio: "Official S account." }
];

function BackButton({ onBack }) {
  return <button className="back-link" onClick={onBack}><ArrowLeft size={17}/>Back</button>;
}

function ActionBar({ post, onLike, onSave, onReply, onRepost, onShare }) {
  const reposted = Boolean(post.reposted);
  const liked = Boolean(post.liked);
  const saved = Boolean(post.saved);
  return <div className="detail-actions">
    <button onClick={onReply}><MessageCircle size={17}/>{post.r ?? 0} Reply</button>
    <button className={reposted ? "is-active" : ""} onClick={() => onRepost?.(post.id)}><Repeat2 size={17}/>{post.p ?? 0} Repost</button>
    <button className={liked ? "is-liked" : ""} onClick={() => onLike?.(post.id)}><Heart size={17} fill={liked ? "currentColor" : "none"}/>{post.l ?? 0} Like</button>
    <button className={saved ? "is-saved" : ""} onClick={() => onSave?.(post.id)}><Bookmark size={17} fill={saved ? "currentColor" : "none"}/>Save</button>
    <button onClick={onShare}><Send size={17}/>Share</button>
  </div>;
}

function PostDetail({ post, onBack, onLike, onSave, onRepost, onOpen, mode = "post" }) {
  const [reply, setReply] = useState("");
  const [quote, setQuote] = useState("");
  const [replies, setReplies] = useState([
    { id: "r1", name: "Maya Okafor", username: "maya", text: "This is exactly the kind of conversation S should make room for." },
    { id: "r2", name: "Nia James", username: "nia", text: "Adding this to my thoughts for later." }
  ]);
  const [shared, setShared] = useState(false);

  const submitReply = () => {
    const value = reply.trim();
    if (!value) return;
    setReplies((items) => [{ id: Date.now(), name: "David", username: "david", text: value }, ...items]);
    setReply("");
  };
  const submitQuote = () => {
    const value = quote.trim();
    if (!value) return;
    setReplies((items) => [{ id: Date.now(), name: "David", username: "david", text: value, quote: true }, ...items]);
    setQuote("");
  };
  const share = async () => {
    const url = window.location.origin + "/post/" + post.id;
    try {
      if (navigator.share) await navigator.share({ title: "Post on S", text: post.x || "Post on S", url });
      else await navigator.clipboard?.writeText(url);
    } catch {
      setShared(false);
      return;
    }
    setShared(true);
  };

  return <div className="detail-page">
    <BackButton onBack={onBack}/>
    <article className="detail-post">
      <div className="avatar">{(post.a || "S")[0]}</div>
      <div>
        <div className="post__meta"><strong>{post.a}</strong>{post.verified && <span className="verified"><Check size={10}/></span>}<span className="muted">@{String(post.h || "user").replace("@", "")}</span><span className="muted">· {post.t || "now"}</span></div>
        <p className="detail-post__text">{post.x}</p>
        {post.media && <button className="post-media detail-media" onClick={() => onOpen?.("/post/" + post.id + "/media")}><span>Visual expression</span><small>Open media viewer</small></button>}
        {post.music && <div className="audio-card"><strong>Late Night Notes</strong><span>Original audio · 2:48</span></div>}
        <ActionBar post={post} onLike={onLike} onSave={onSave} onRepost={onRepost} onReply={() => document.getElementById("reply-box")?.focus()} onShare={share}/>
      </div>
    </article>

    {mode === "quote" && <section className="composer-panel">
      <div className="heading"><small>QUOTE POST</small><h3>Add your perspective</h3></div>
      <textarea value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="Say something about this post…" maxLength={5000}/>
      <div className="composer-panel__footer"><span>{quote.length}/5000</span><button className="primary" disabled={!quote.trim()} onClick={submitQuote}>Quote</button></div>
    </section>}

    <section className="thread">
      <div className="thread-head"><h3>{mode === "media" ? "Media" : "Replies"}</h3><span>{replies.length} conversations</span></div>
      {mode === "media" && <div className="media-viewer"><div className="post-media"><span>Visual expression</span><small>Full media viewer surface</small></div><p className="muted">Media controls and delivery will connect to the media service later.</p></div>}
      {mode !== "media" && <>
        <div className="reply-composer">
          <div className="avatar avatar--small">D</div>
          <div className="reply-composer__body"><textarea id="reply-box" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Post your reply" maxLength={5000}/><div><span>{reply.length}/5000</span><button className="primary" disabled={!reply.trim()} onClick={submitReply}>Reply</button></div></div>
        </div>
        {replies.map((item) => <article className="reply-row" key={item.id}>
          <div className="avatar avatar--small">{item.name[0]}</div>
          <div><div className="post__meta"><strong>{item.name}</strong><span>@{item.username}</span></div>{item.quote && <small className="muted">Quote post</small>}<p>{item.text}</p><div className="reply-actions"><button><MessageCircle size={15}/>Reply</button><button><Heart size={15}/>Like</button><button><Repeat2 size={15}/>Repost</button></div></div>
        </article>)}
      </>}
    </section>
    {shared && <div className="inline-notice"><Link2 size={16}/>Post link copied/shared.</div>}
  </div>;
}

function ShareDetail({ post, onBack }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard?.writeText(window.location.origin + "/post/" + post.id); } catch { setCopied(false); return; }
    setCopied(true);
  };
  return <div className="detail-page"><BackButton onBack={onBack}/><div className="share-sheet"><div className="heading"><small>SHARE</small><h2>Share this post</h2></div><div className="share-preview"><b>{post.a}</b><p>{post.x}</p></div><div className="share-options"><button onClick={copy}><Copy/>Copy link</button><button onClick={() => window.open("mailto:?subject=Post on S&body=" + encodeURIComponent(window.location.origin + "/post/" + post.id), "_self")}><Send/>Send by email</button><button><Users/>Share with followers</button></div>{copied && <p className="inline-notice">Link copied.</p>}</div></div>;
}

function UserDetail({ username, onBack, onOpen, onFollowUser, followingUsers = new Set() }) {
  const person = people.find((item) => item.username === username) || { name: username || "User", username, bio: "Creator on S." };
  const following = followingUsers.has(person.username);
  return <div className="detail-page"><BackButton onBack={onBack}/><div className="entity-hero"><div className="profile-cover"></div><div className="entity-avatar-wrap"><div className="avatar entity-avatar">{person.name[0]}</div></div><div className="entity-hero__content"><h2>{person.name}</h2><span>@{person.username}</span><p>{person.bio}</p><div className="entity-stats"><button onClick={() => onOpen?.("/followers/" + person.username)}><b>1.8K</b><small>Followers</small></button><button onClick={() => onOpen?.("/following/" + person.username)}><b>142</b><small>Following</small></button></div><button className={following ? "outline" : "primary"} onClick={() => onFollowUser?.(person.username)}>{following ? "Following" : "Follow"}</button></div></div><div className="entity-tabs"><button className="active">Posts</button><button>Replies</button><button>Media</button><button>Likes</button></div></div>;
}

function NetworkRoute({ type, username, onBack, followingUsers = new Set(), onFollowUser }) {
  const [items, setItems] = useState(people);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const request = type === "followers" ? socialGraphService.listFollowers(username) : socialGraphService.listFollowing(username);
    request.then((page) => {
      if (!active) return;
      if (page?.items?.length) setItems(page.items.map((item) => people.find((person) => person.username === item.username) || item));
      setLoading(false);
    }).catch(() => active && setLoading(false));
    return () => { active = false; };
  }, [type, username]);
  if (loading) return <div className="detail-page"><BackButton onBack={onBack}/><div className="empty"><h3>Loading network…</h3></div></div>;
  return <div className="detail-page"><BackButton onBack={onBack}/><div className="heading"><small>PROFILE NETWORK</small><h2>{type === "followers" ? "Followers" : "Following"}</h2><p>@{username}</p></div>{items.map((person) => {
    const target = person.username;
    const following = followingUsers.has(target);
    return <div className="network-row" key={target}><div className="avatar avatar--small">{String(person.name || target)[0]}</div><div><b>{person.name || target}</b><span>@{target}</span></div><button className={following ? "is-following" : "outline"} onClick={() => onFollowUser?.(target)}>{following ? "Following" : "Follow"}</button></div>;
  })}</div>;
}



export default function EntityRoute({ path = "/", posts = [], onBack, onOpen, onLike, onSave, onRepost, onFollowUser, followingUsers = new Set() }) {
  const parts = String(path).split("/").filter(Boolean);
  const type = parts[0] || "";
  const id = parts[1] || "";
  if (type === "post") {
    const post = posts.find((item) => String(item.id) === String(id));
    if (!post) return <div className="detail-page"><BackButton onBack={onBack}/><div className="empty"><h3>Post not found</h3><p>This post may have been removed or is not available.</p></div></div>;
    return <PostDetail post={post} onBack={onBack} onLike={onLike} onSave={onSave} onRepost={onRepost} onOpen={onOpen} mode={parts[2] || "post"}/>;
  }
  if (type === "share") {
    const post = posts.find((item) => String(item.id) === String(id));
    return post ? <ShareDetail post={post} onBack={onBack}/> : <div className="detail-page"><BackButton onBack={onBack}/><div className="empty"><h3>Post not found</h3></div></div>;
  }
  if (type === "user") return <UserDetail username={id} onBack={onBack} onOpen={onOpen} onFollowUser={onFollowUser} followingUsers={followingUsers}/>;
  if (type === "followers" || type === "following") return <NetworkRoute type={type} username={id || "david"} onBack={onBack} followingUsers={followingUsers} onFollowUser={onFollowUser}/>;
  if (type === "topic") return <div className="detail-page"><BackButton onBack={onBack}/><div className="heading"><small>TOPIC</small><h2>#{decodeURIComponent(id)}</h2><p>Conversation around this topic on S.</p></div>{posts.filter((post) => String(post.topic || "").toLowerCase() === decodeURIComponent(id).toLowerCase()).map((post) => <PostCard key={post.id} post={post} onLike={onLike} onSave={onSave} onRepost={onRepost} onOpen={onOpen}/>)}</div>;
  return <div className="detail-page"><BackButton onBack={onBack}/><div className="empty"><h3>Nothing to show</h3><p>That S destination is not available.</p></div></div>;
}
