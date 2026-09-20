import React, { useMemo, useState } from "react";
import { FEED_TABS, selectFeed } from "./feedSelectors";
import { toFeedPostViewModels } from "./feedViewModel";

const PREVIEW_POSTS = [
  {
    id: "preview-1",
    a: "Maya Chen",
    h: "@mayachen",
    t: "2m",
    x: "Small ideas become meaningful when people build on them together.",
    topic: "Design",
    l: 128,
    p: 14,
    r: 31,
    b: 22,
    following: true,
  },
  {
    id: "preview-2",
    a: "Jon Bell",
    h: "@jonbuilds",
    t: "18m",
    x: "Working on a calmer, more expressive way to share moments. No noise required.",
    topic: "S",
    l: 86,
    p: 9,
    r: 18,
    b: 15,
    following: false,
  },
  {
    id: "preview-3",
    a: "Amina Yusuf",
    h: "@aminay",
    t: "41m",
    x: "What are you listening to today?",
    topic: "Music",
    l: 204,
    p: 27,
    r: 46,
    b: 39,
    following: true,
  },
];

export default function FeedPreview() {
  const [tab, setTab] = useState("For You");
  const [query, setQuery] = useState("");
  const [liked, setLiked] = useState([]);
  const [saved, setSaved] = useState([]);

  const posts = useMemo(() => {
    const selected = selectFeed(PREVIEW_POSTS, tab);
    const normalized = query.trim().toLowerCase();
    const filtered = normalized
      ? selected.filter((post) => `${post.a} ${post.h} ${post.x} ${post.topic}`.toLowerCase().includes(normalized))
      : selected;
    return toFeedPostViewModels(filtered);
  }, [query, tab]);

  return (
    <section className="s-feed-preview" aria-label="S feed preview">
      <header className="s-feed-preview__header">
        <div>
          <p className="s-feed-preview__eyebrow">S / HOME</p>
          <h2>Home</h2>
        </div>
        <label className="s-feed-preview__search">
          <span className="sr-only">Search preview posts</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" />
        </label>
      </header>

      <nav className="s-feed-preview__tabs" aria-label="Feed views">
        {FEED_TABS.map((item) => (
          <button key={item} className={tab === item ? "is-active" : ""} onClick={() => setTab(item)} type="button">
            {item}
          </button>
        ))}
      </nav>

      <div className="s-feed-preview__composer">Share something meaningful…</div>

      <div className="s-feed-preview__list">
        {posts.length ? posts.map((post) => {
          const isLiked = liked.includes(post.id);
          const isSaved = saved.includes(post.id);
          return (
            <article className="s-feed-preview__post" key={post.id}>
              <div className="s-feed-preview__avatar" aria-hidden="true">{post.author.name.charAt(0)}</div>
              <div className="s-feed-preview__body">
                <div className="s-feed-preview__meta">
                  <strong>{post.author.name}</strong>
                  <span>{post.author.handle}</span>
                  <span>·</span>
                  <span>{post.timestamp}</span>
                </div>
                <p>{post.text}</p>
                {post.topic && <span className="s-feed-preview__topic">#{post.topic}</span>}
                <div className="s-feed-preview__actions">
                  <button type="button" onClick={() => setLiked((items) => isLiked ? items.filter((id) => id !== post.id) : [...items, post.id])} aria-pressed={isLiked}>{isLiked ? "♥" : "♡"} {post.counts.likes + (isLiked ? 1 : 0)}</button>
                  <button type="button">↩ {post.counts.replies}</button>
                  <button type="button">↻ {post.counts.reposts}</button>
                  <button type="button" onClick={() => setSaved((items) => isSaved ? items.filter((id) => id !== post.id) : [...items, post.id])} aria-pressed={isSaved}>{isSaved ? "★" : "☆"}</button>
                </div>
              </div>
            </article>
          );
        }) : <p className="s-feed-preview__empty">No posts match this view.</p>}
      </div>
    </section>
  );
}
