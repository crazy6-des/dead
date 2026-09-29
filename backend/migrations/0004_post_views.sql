-- Durable post view counters.
-- Each post stores its real server-side view total; detail opens increment it atomically.

ALTER TABLE posts ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_posts_view_count ON posts(view_count DESC, created_at DESC, id DESC);
