-- Rich post media/content persistence: image uploads, catalog audio, backgrounds.
ALTER TABLE posts ADD COLUMN post_kind TEXT NOT NULL DEFAULT 'text'
  CHECK (post_kind IN ('text','image','music','background'));
ALTER TABLE posts ADD COLUMN background_json TEXT;

ALTER TABLE post_media ADD COLUMN source TEXT NOT NULL DEFAULT 'upload'
  CHECK (source IN ('upload','catalog'));
ALTER TABLE post_media ADD COLUMN external_url TEXT;
ALTER TABLE post_media ADD COLUMN metadata_json TEXT;
ALTER TABLE post_media ADD COLUMN duration_ms INTEGER;

CREATE INDEX IF NOT EXISTS idx_post_media_post_position
  ON post_media(post_id, position, id);

CREATE INDEX IF NOT EXISTS idx_post_media_source
  ON post_media(source, media_type);
