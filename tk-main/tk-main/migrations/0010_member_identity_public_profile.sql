PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS public_profiles(
 person_id TEXT PRIMARY KEY REFERENCES people(id) ON DELETE CASCADE,
 slug TEXT UNIQUE NOT NULL,
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 headline TEXT,
 bio TEXT,
 theme TEXT NOT NULL DEFAULT 'sky' CHECK(theme IN ('sky','midnight','minimal')),
 show_email INTEGER NOT NULL DEFAULT 0 CHECK(show_email IN (0,1)),
 show_phone INTEGER NOT NULL DEFAULT 0 CHECK(show_phone IN (0,1)),
 show_memberships INTEGER NOT NULL DEFAULT 1 CHECK(show_memberships IN (0,1)),
 show_activities INTEGER NOT NULL DEFAULT 1 CHECK(show_activities IN (0,1)),
 show_certificates INTEGER NOT NULL DEFAULT 1 CHECK(show_certificates IN (0,1)),
 show_achievements INTEGER NOT NULL DEFAULT 1 CHECK(show_achievements IN (0,1)),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_public_profiles_slug ON public_profiles(slug);
