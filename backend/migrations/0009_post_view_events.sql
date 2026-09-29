-- Durable view/impression events.
-- Unlike the per-viewer table, every qualified view event is counted.
CREATE TABLE IF NOT EXISTS post_view_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_post_view_events_post_created
  ON post_view_events(post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_view_events_user_created
  ON post_view_events(user_id, created_at DESC);
