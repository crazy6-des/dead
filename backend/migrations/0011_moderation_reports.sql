CREATE TABLE IF NOT EXISTS moderation_reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  email_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_created ON moderation_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_target ON moderation_reports(target_type,target_id);
