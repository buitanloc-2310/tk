-- Additive migration only: no DROP/DELETE/RESET.
-- 0001_initial_schema.sql: Consolidated core D1 schema for Sky First Network Website (0010 -> 0014)

CREATE TABLE IF NOT EXISTS website_comments (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','hidden')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_website_comments_article_status ON website_comments(article_id, status, created_at);

CREATE TABLE IF NOT EXISTS website_contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT 'Liên hệ chung',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','closed')),
  assigned_to TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_website_contacts_status_created ON website_contacts(status, created_at);

CREATE TABLE IF NOT EXISTS website_registrations (
  id TEXT PRIMARY KEY,
  application_code TEXT NOT NULL UNIQUE,
  program_id TEXT NOT NULL,
  program_title TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  organization TEXT NOT NULL,
  birth_year TEXT,
  portfolio_url TEXT,
  motivation TEXT NOT NULL,
  consent INTEGER NOT NULL DEFAULT 0 CHECK (consent IN (0,1)),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','accepted','rejected','closed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_website_registrations_program_created ON website_registrations(program_id, created_at);
CREATE INDEX IF NOT EXISTS idx_website_registrations_status_created ON website_registrations(status, created_at);

CREATE TABLE IF NOT EXISTS website_program_participants (
  id TEXT PRIMARY KEY,
  registration_id TEXT UNIQUE,
  program_id TEXT NOT NULL,
  program_title TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  joined_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS website_admin_records (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_website_admin_records_kind ON website_admin_records(kind, updated_at DESC);

CREATE TABLE IF NOT EXISTS website_admin_users (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  is_root_owner INTEGER NOT NULL DEFAULT 0 CHECK(is_root_owner IN (0,1)),
  permissions_json TEXT NOT NULL DEFAULT '[]',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login TEXT
);
CREATE INDEX IF NOT EXISTS idx_website_admin_users_email ON website_admin_users(email);

CREATE TABLE IF NOT EXISTS website_admin_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_uid TEXT NOT NULL,
  target_uid TEXT,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS website_cms_documents (
  collection_name TEXT NOT NULL,
  doc_id TEXT NOT NULL,
  data_json TEXT NOT NULL,
  is_published INTEGER NOT NULL DEFAULT 0 CHECK(is_published IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT,
  PRIMARY KEY(collection_name, doc_id)
);
CREATE INDEX IF NOT EXISTS idx_cms_collection_public ON website_cms_documents(collection_name, is_published, updated_at);

CREATE TABLE IF NOT EXISTS website_cms_collections (
  collection_name TEXT PRIMARY KEY,
  initialized_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS website_cms_deleted (
  collection_name TEXT NOT NULL,
  doc_id TEXT NOT NULL,
  deleted_at TEXT NOT NULL,
  PRIMARY KEY(collection_name, doc_id)
);

CREATE TABLE IF NOT EXISTS website_media_metadata (
  key TEXT PRIMARY KEY,
  alt TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  credit TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  focal_x REAL NOT NULL DEFAULT 50,
  focal_y REAL NOT NULL DEFAULT 50,
  display_mode TEXT NOT NULL DEFAULT 'original',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS website_forms (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  program_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  fields_json TEXT NOT NULL DEFAULT '[]',
  settings_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_website_forms_status ON website_forms(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS website_form_submissions (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL,
  program_id TEXT NOT NULL DEFAULT '',
  application_code TEXT NOT NULL UNIQUE,
  idempotency_key TEXT,
  applicant_name TEXT,
  applicant_email TEXT,
  applicant_phone TEXT,
  answers_json TEXT NOT NULL DEFAULT '{}',
  field_snapshot_json TEXT NOT NULL DEFAULT '[]',
  form_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'received',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(form_id) REFERENCES website_forms(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_website_form_submissions_form ON website_form_submissions(form_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_website_form_submissions_code ON website_form_submissions(application_code);

CREATE TABLE IF NOT EXISTS website_form_rate (
  rate_key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS website_people (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  public_profile INTEGER NOT NULL DEFAULT 0,
  allow_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_website_people_public ON website_people(public_profile, status, updated_at DESC);
