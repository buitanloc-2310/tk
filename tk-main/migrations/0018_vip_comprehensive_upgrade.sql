-- Migration 0018: Sky First Digital Operations Center VIP Comprehensive Upgrade
-- 1. Announcement read tracking table
CREATE TABLE IF NOT EXISTS announcement_reads(
  post_id TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  read_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(post_id, account_id)
);

-- 2. Standardize ecosystem service catalog to Hệ thống Số Sky First (https://app.skyfirst.io.vn)
UPDATE governance_registry
SET code='SVC-PORTAL-APP',
    title='Hệ thống Số Sky First',
    summary='Hệ thống số phục vụ các chức năng và tiện ích thuộc hệ sinh thái Sky First.',
    evidence_ref='https://app.skyfirst.io.vn',
    updated_at=CURRENT_TIMESTAMP
WHERE id='gov_svc_02' OR code='SVC-PORTAL-CTT';

-- 3. Standardize account type display label to "12 tháng" (preserving internal code annual_12m_1y)
UPDATE account_type_configs
SET name='12 tháng',
    updated_at=CURRENT_TIMESTAMP
WHERE code='annual_12m_1y';

UPDATE account_lifecycle
SET duration_label='12 tháng',
    updated_at=CURRENT_TIMESTAMP
WHERE account_type_code='annual_12m_1y' AND duration_label LIKE '%01 năm%';

-- 4. Seed structured metadata on official legal documents (distinguishing auto_sync vs manual_admin)
UPDATE governance_registry
SET payload_json='{"doc_number":"91/2025/QH15","source_name":"Cổng Thông tin Điện tử Chính phủ (chinhphu.vn)","official_url":"https://chinhphu.vn/?pageid=27160&docid=214590&classid=1&typegroupid=3","issued_date":"2025-06-26","effective_date":"2026-01-01","legal_status":"Còn hiệu lực","sync_source_type":"auto_sync","approval_state":"approved_published","last_synced_at":"2026-10-28T00:00:00Z"}'
WHERE id='gov_law_91' AND (payload_json IS NULL OR payload_json='{}');

UPDATE governance_registry
SET payload_json='{"doc_number":"356/2025/NĐ-CP","source_name":"Hệ thống Văn bản Quy phạm Pháp luật Chính phủ (vanban.chinhphu.vn)","official_url":"https://vanban.chinhphu.vn/?pageid=27160&docid=216387","issued_date":"2025-12-31","effective_date":"2026-01-01","legal_status":"Còn hiệu lực","sync_source_type":"auto_sync","approval_state":"approved_published","last_synced_at":"2026-10-28T00:00:00Z"}'
WHERE id='gov_dec_356' AND (payload_json IS NULL OR payload_json='{}');

-- 5. Dedicated attendance evidence table with D1/R2 resilience
CREATE TABLE IF NOT EXISTS sk_attendance_evidence(
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  session_id TEXT,
  file_key TEXT NOT NULL UNIQUE,
  file_url TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  r2_stored INTEGER NOT NULL DEFAULT 0,
  data_base64 TEXT,
  uploaded_ip_hint TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sk_attendance_evidence_url ON sk_attendance_evidence(file_url, event_id);
