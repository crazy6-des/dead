-- Posts/feed contract: backend support for the existing frontend text-post contract.

ALTER TABLE posts ADD COLUMN reply_policy TEXT NOT NULL DEFAULT 'everyone'
  CHECK (reply_policy IN ('everyone','following','mentioned'));

CREATE INDEX IF NOT EXISTS idx_posts_visibility_created
  ON posts(visibility, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_post_reactions_post_type
  ON post_reactions(post_id, reaction_type);

CREATE INDEX IF NOT EXISTS idx_relationships_source_type_target
  ON relationships(source_user_id, relationship_type, target_user_id);
