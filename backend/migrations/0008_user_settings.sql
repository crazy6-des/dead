CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  private_account INTEGER NOT NULL DEFAULT 0 CHECK (private_account IN (0,1)),
  show_follower_count INTEGER NOT NULL DEFAULT 1 CHECK (show_follower_count IN (0,1)),
  allow_messages INTEGER NOT NULL DEFAULT 1 CHECK (allow_messages IN (0,1)),
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('light','dark')),
  reduce_motion INTEGER NOT NULL DEFAULT 0 CHECK (reduce_motion IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
