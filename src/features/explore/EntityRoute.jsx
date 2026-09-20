import React, { useMemo, useState } from "react";
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

function ActionBar({ post, onSave, onReply, onRepost, onShare }) {
  const [reposted, setReposted] = useState(Boolean(post.reposted));
  const [liked, setLiked] = useState(Boolean(post.liked));
  const [saved, setSaved] = useState(Boolean(post.saved));
  return <div className="detail-actions">
    <button onClick={onReply}><MessageCircle size={17}/>{post.r ?? 0} Reply</button>
    <button className={reposted ? "is-active" : ""} onClick={() => { setReposted((v) => !v); onRepost?.(); }}><Repeat2 size={17}/>{(post.p ?? 0) + (reposted ? 1 : 0)} Repost</button>
    <button className={liked ? "is-liked" : ""} onClick={() => setLiked((v) => !v)}><Heart size={17} fill={liked ? "currentColor" : "none"}/>{(post.l ?? 0) + (liked ? 1 : 0)} Like</button>
    <button className={saved ? "is-saved" : ""} onClick={() => { setSaved((v) => !v); onSave?.(post.id); }}><Bookmark size={17} fill={saved ? "currentColor" : "none"}/>Save</button>
    <button onClick={onShare}><Send size={17}/>Share</button>
  </div>;
}

function PostDetail({ post, onBack, onSave, onOpen, mode = "post" }) {
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
    } catch { setShared(false); }
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
        <ActionBar post={post} onSave={onSave} onReply={() => document.getElementById("reply-box")?.focus()} onRepost={() => setQuote("")} onShare={share}/>
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

function UserDetail({ username, onBack, onOpen }) {
  const person = people.find((item) => item.username === username) || { name: username || "User", username, bio: "Creator on S." };
  return <div className="detail-page"><BackButton onBack={onBack}/><div className="entity-hero"><div className="profile-cover"></div><div className="entity-avatar-wrap"><div className="avatar entity-avatar">{person.name[0]}</div></div><div className="entity-hero__content"><h2>{person.name}</h2><span>@{person.username}</span><p>{person.bio}</p><div className="entity-stats"><button onClick={() => onOpen?.("/followers/" + person.username)}><b>1.8K</b><small>Followers</small></button><button onClick={() => onOpen?.("/following/" + person.username)}><b>142</b><small>Following</small></button></div><button className="primary">Follow</button></div></div><div className="entity-tabs"><button className="active">Posts</button><button>Replies</button><button>Media</button><button>Likes</button></div></div>;
}

export default function EntityRoute({ path, posts, onBack, onOpen, onSave }) {
  const parts = path.split("/").filter(Boolean);
  const type = parts[0];
  const id = parts[1];
  const post = useMemo(() => posts.find((item) => String(item.id) === String(id)) || posts[0], [posts, id]);

  if (type === "post" || type === "share") {
    const mode = parts[2] === "replies" ? "replies" : parts[2] === "quote" ? "quote" : parts[2] === "media" ? "media" : "post";
    if (type === "share") return <ShareDetail post={post} onBack={onBack}/>;
    return <PostDetail post={post} onBack={onBack} onSave={onSave} onOpen={onOpen} mode={mode}/>;
  }
  if (type === "user") return <UserDetail username={id} onBack={onBack} onOpen={onOpen}/>;
  if (type === "topic") return <div className="detail-page"><BackButton onBack={onBack}/><div className="entity-hero topic-hero"><span className="topic-icon">#</span><h2>{decodeURIComponent(id || "community")}</h2><p>Posts and conversations around this topic on S.</p><div className="entity-stats"><b>8.1K <small>Posts</small></b><b>24K <small>People</small></b></div></div>{posts.slice(0, 5).map((item) => <button className="topic-post" key={item.id} onClick={() => onOpen?.("/post/" + item.id)}><b>{item.a}</b><span className="muted"> {item.t}</span><p>{item.x}</p></button>)}</div>;
  if (type === "followers" || type === "following") return <div className="detail-page"><BackButton onBack={onBack}/><div className="heading"><small>PROFILE NETWORK</small><h2>{type === "followers" ? "Followers" : "Following"}</h2></div>{people.map((person) => <div className="network-row" key={person.username}><div className="avatar avatar--small">{person.name[0]}</div><div><b>{person.name}</b><span>@{person.username}</span></div><button className="outline">Follow</button></div>)}</div>;
  return <div className="detail-page"><div className="empty"><Users/><h3>S surface</h3><p>This destination is part of the frontend route map and is ready for its backend-backed data contract.</p></div></div>;
}
