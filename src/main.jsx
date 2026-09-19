import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bell, Bookmark, Compass, Heart, Home, Image, MessageCircle,
  MoreHorizontal, Music2, Plus, Repeat2, Search, Send, Settings,
  Sparkles, UserRound, X
} from "lucide-react";
import "./styles.css";

const seedPosts = [
  {
    id: 1,
    author: "S Team",
    handle: "@s",
    time: "2h",
    text: "Welcome to S — a place for ideas, images, music, and the people behind them.",
    likes: 128,
    replies: 18,
    reposts: 9,
    liked: false,
  },
  {
    id: 2,
    author: "Maya Okafor",
    handle: "@maya",
    time: "34m",
    text: "A quiet thought: the best communities make you feel like your presence matters.",
    likes: 74,
    replies: 12,
    reposts: 4,
    liked: true,
  },
];

function Avatar({ label = "S", small = false }) {
  return <div className={small ? "avatar avatar--small" : "avatar"}>{label}</div>;
}

function Post({ post, onLike }) {
  return (
    <article className="post">
      <Avatar label={post.author[0]} />
      <div className="post__body">
        <div className="post__meta">
          <strong>{post.author}</strong>
          <span>{post.handle}</span>
          <span>·</span>
          <span>{post.time}</span>
          <button className="icon-btn icon-btn--tiny" aria-label="More"><MoreHorizontal size={18} /></button>
        </div>
        <p>{post.text}</p>
        <div className="post__actions">
          <button><MessageCircle size={18}/><span>{post.replies}</span></button>
          <button><Repeat2 size={18}/><span>{post.reposts}</span></button>
          <button className={post.liked ? "is-liked" : ""} onClick={() => onLike(post.id)}>
            <Heart size={18} fill={post.liked ? "currentColor" : "none"}/><span>{post.likes}</span>
          </button>
          <button><Bookmark size={18}/></button>
          <button><Send size={18}/></button>
        </div>
      </div>
    </article>
  );
}

function Composer({ onPublish }) {
  const [text, setText] = useState("");
  const publish = () => {
    if (!text.trim()) return;
    onPublish(text.trim());
    setText("");
  };

  return (
    <section className="composer">
      <Avatar label="D" />
      <div className="composer__main">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What do you want to share?"
          rows={2}
        />
        <div className="composer__bar">
          <div className="composer__tools">
            <button aria-label="Add image"><Image size={19}/></button>
            <button aria-label="Add music"><Music2 size={19}/></button>
            <button aria-label="Add background"><Sparkles size={19}/></button>
          </div>
          <button className="primary-btn" onClick={publish}>Post</button>
        </div>
      </div>
    </section>
  );
}

function App() {
  const [active, setActive] = useState("Home");
  const [posts, setPosts] = useState(seedPosts);
  const [dark, setDark] = useState(true);

  const publish = (text) => {
    setPosts([{
      id: Date.now(), author: "David", handle: "@david", time: "now",
      text, likes: 0, replies: 0, reposts: 0, liked: false
    }, ...posts]);
  };

  const like = (id) => setPosts(posts.map(p => p.id === id
    ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) }
    : p));

  const nav = [
    [Home, "Home"], [Compass, "Discover"], [Bell, "Notifications"],
    [MessageCircle, "Messages"], [Bookmark, "Saved"], [UserRound, "Profile"],
    [Settings, "Settings"]
  ];

  return (
    <div className={dark ? "app" : "app app--light"}>
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">S</div><span>S</span></div>
        <nav>
          {nav.map(([Icon, name]) => (
            <button key={name} className={active === name ? "nav-item active" : "nav-item"} onClick={() => setActive(name)}>
              <Icon size={21}/><span>{name}</span>
            </button>
          ))}
        </nav>
        <button className="create-btn" onClick={() => document.querySelector(".composer textarea")?.focus()}>
          <Plus size={20}/><span>Create</span>
        </button>
        <button className="profile-mini">
          <Avatar label="D" small />
          <div><strong>David</strong><span>@david</span></div>
        </button>
      </aside>

      <main className="main">
        <header className="mobile-header">
          <div className="brand"><div className="brand-mark">S</div></div>
          <button className="icon-btn" onClick={() => setDark(!dark)} aria-label="Toggle theme">
            {dark ? <Sparkles size={19}/> : <X size={19}/>}
          </button>
        </header>

        <header className="feed-header">
          <div>
            <h1>{active}</h1>
            <span>Good to see you.</span>
          </div>
          <button className="icon-btn"><Search size={20}/></button>
        </header>

        {active === "Home" ? (
          <>
            <div className="feed-tabs">
              <button className="selected">For You</button>
              <button>Following</button>
              <button>Latest</button>
            </div>
            <Composer onPublish={publish} />
            <div className="posts">
              {posts.map(post => <Post key={post.id} post={post} onLike={like} />)}
            </div>
          </>
        ) : (
          <section className="placeholder">
            <div className="placeholder__icon"><Sparkles size={24}/></div>
            <h2>{active}</h2>
            <p>This surface is part of S's product foundation. We'll build it as a real feature next.</p>
          </section>
        )}
      </main>

      <aside className="right-rail">
        <div className="search-box"><Search size={18}/><input placeholder="Search S" /></div>
        <section className="rail-card">
          <div className="rail-title"><h3>What's happening</h3><button>View all</button></div>
          <div className="trend"><span>Trending in S</span><strong>#NewBeginnings</strong><small>2.4K posts</small></div>
          <div className="trend"><span>Music</span><strong>Late Night Notes</strong><small>8.1K listeners</small></div>
          <div className="trend"><span>Community</span><strong>Creators of S</strong><small>1.7K posts</small></div>
        </section>
        <section className="rail-card">
          <div className="rail-title"><h3>People to connect</h3></div>
          {["Maya Okafor", "Daniel Cole", "Nia James"].map((name, i) => (
            <div className="suggestion" key={name}>
              <Avatar label={name[0]} small />
              <div><strong>{name}</strong><span>@{name.split(" ")[0].toLowerCase()}</span></div>
              <button className="follow-btn">Follow</button>
            </div>
          ))}
        </section>
      </aside>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);