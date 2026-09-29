-- Durable per-viewer post impressions.
-- A viewer contributes at most one view per post, even across reloads/devices using the same account.

CREATE TABLE IF NOT EXISTS post_views (
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_post_views_user ON post_views(user_id, created_at DESC);
