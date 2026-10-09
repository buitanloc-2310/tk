-- Record the full schema baseline only after all prior migrations have been applied.
-- Some older migrations added schema objects without recording their own version.
-- This migration does not delete or rewrite application data.
INSERT OR IGNORE INTO schema_version(version) VALUES(9),(11),(12),(13),(14),(16);
