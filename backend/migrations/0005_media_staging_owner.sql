-- Allow media to exist as an upload staging record before a post is published.
-- The original post_media table required post_id, which made the new /api/media/upload
-- flow impossible against the real D1 schema.

PRAGMA foreign_keys = OFF;

CREATE TABLE post_media_new (
  id TEXT PRIMARY KEY NOT NULL,
  post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL UNIQUE,
  media_type TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  source TEXT NOT NULL DEFAULT 'upload' CHECK (source IN ('upload','catalog')),
  external_url TEXT,
  metadata_json TEXT,
  duration_ms INTEGER,
  owner_id TEXT REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO post_media_new (id, post_id, object_key, media_type, mime_type, byte_size, position, created_at, source, external_url, metadata_json, duration_ms)
SELECT id, post_id, object_key, media_type, mime_type, byte_size, position, created_at, source, external_url, metadata_json, duration_ms
FROM post_media;

DROP TABLE post_media;
ALTER TABLE post_media_new RENAME TO post_media;

CREATE INDEX IF NOT EXISTS idx_post_media_post_position ON post_media(post_id, position, id);
CREATE INDEX IF NOT EXISTS idx_post_media_source ON post_media(source, media_type);
CREATE INDEX IF NOT EXISTS idx_post_media_owner ON post_media(owner_id, post_id);

PRAGMA foreign_keys = ON;