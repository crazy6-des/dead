-- Durable poll persistence: one poll per post and one vote per user/poll.
ALTER TABLE posts ADD COLUMN poll_json TEXT;
-- Durable poll persistence: one poll per post and one vote per user/poll.
CREATE TABLE IF NOT EXISTS poll_votes (
  poll_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  option_index INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (poll_id, user_id),
  FOREIGN KEY (poll_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_option
  ON poll_votes(poll_id, option_index);
