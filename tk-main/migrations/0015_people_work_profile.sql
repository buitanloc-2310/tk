-- Preserve application-provided school/work details when an account request is approved.
-- Guardian birth/identity fields remain in the review table and are cleared after approval.
CREATE TABLE IF NOT EXISTS people_work_profiles(
  person_id TEXT PRIMARY KEY REFERENCES people(id) ON DELETE CASCADE,
  school_name TEXT,
  employment_status TEXT,
  workplace_name TEXT,
  work_department TEXT,
  job_title TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_people_work_profiles_employment ON people_work_profiles(employment_status);
INSERT OR IGNORE INTO schema_version(version) VALUES(15);
