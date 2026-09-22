-- Persisted quote-post relationship: a post may reference one quoted post.
ALTER TABLE posts ADD COLUMN quoted_post_id TEXT REFERENCES posts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_posts_quoted_post ON posts(quoted_post_id);
