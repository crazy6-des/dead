-- Messaging media and notification target hardening.
-- Extends the existing social/messaging schema without changing public API contracts.

PRAGMA foreign_keys = OFF;

ALTER TABLE messages ADD COLUMN media_id TEXT REFERENCES post_media(id) ON DELETE SET NULL;

CREATE TABLE notifications_new (
  id TEXT PRIMARY KEY NOT NULL,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('follow','like','repost','reply','message','share')),
  target_type TEXT,
  target_id TEXT,
  payload TEXT NOT NULL DEFAULT '{}',
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (recipient_id, actor_id, event_type, target_type, target_id)
);

INSERT INTO notifications_new
  (id, recipient_id, actor_id, event_type, target_type, target_id, payload, conversation_id, read_at, created_at)
SELECT
  id, recipient_id, actor_id, event_type, target_type, target_id, payload, conversation_id, read_at, created_at
FROM notifications;

DROP TABLE notifications;
ALTER TABLE notifications_new RENAME TO notifications;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON notifications(recipient_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read
  ON notifications(recipient_id, read_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_media
  ON messages(media_id);

PRAGMA foreign_keys = ON;
