-- Additive migration only: no DROP/DELETE/RESET.
-- 0002_system_automation_analytics.sql: Email outbox/queue, content/config revisions, backups, and privacy-safe analytics

CREATE TABLE IF NOT EXISTS website_email_outbox (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT UNIQUE,
  recipient TEXT NOT NULL,
  reply_to TEXT NOT NULL DEFAULT '',
  from_name TEXT NOT NULL DEFAULT 'Sky First Network',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  html_body TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL DEFAULT 'general',
  reference_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_retry_at TEXT,
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_id TEXT NOT NULL DEFAULT '',
  error_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_email_outbox_status_retry ON website_email_outbox(status, next_retry_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_outbox_event_ref ON website_email_outbox(event_type, reference_id);

CREATE TABLE IF NOT EXISTS website_revisions (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  version_label TEXT NOT NULL DEFAULT '',
  snapshot_json TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_website_revisions_entity ON website_revisions(entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS website_analytics_daily (
  day TEXT NOT NULL,
  path TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  entity_type TEXT NOT NULL DEFAULT 'page',
  entity_id TEXT NOT NULL DEFAULT '',
  views INTEGER NOT NULL DEFAULT 0,
  sessions_est INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (day, path)
);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_day ON website_analytics_daily(day DESC, views DESC);

CREATE TABLE IF NOT EXISTS website_analytics_manual (
  id TEXT PRIMARY KEY,
  metric_date TEXT NOT NULL,
  period_label TEXT NOT NULL DEFAULT '',
  path_or_scope TEXT NOT NULL DEFAULT 'all',
  pageviews INTEGER NOT NULL DEFAULT 0,
  visitors_est INTEGER NOT NULL DEFAULT 0,
  source_name TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  recorded_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_analytics_manual_date ON website_analytics_manual(metric_date DESC);

CREATE TABLE IF NOT EXISTS website_backups (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'full_cms_forms_config',
  status TEXT NOT NULL DEFAULT 'completed',
  checksum TEXT NOT NULL DEFAULT '',
  stats_json TEXT NOT NULL DEFAULT '{}',
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_website_backups_created ON website_backups(created_at DESC);
