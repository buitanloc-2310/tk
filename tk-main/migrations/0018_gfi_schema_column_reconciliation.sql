-- ============================================================================
-- MIGRATION 0018: GFI SCHEMA & COLUMN RECONCILIATION (IDEMPOTENT DATA-SAFE)
-- Hệ thống: Trung tâm Nghiệp vụ Số Sky First (GFI)
-- Mục đích:
--   1. Khắc phục triệt để tình trạng cơ sở dữ liệu ghi nhận schema_version = 17
--      nhưng bảng support_ticket_assignments được tạo từ bản nháp cũ chưa có cột
--      impact_level và các cột vòng đời phiếu hỗ trợ mở rộng.
--   2. Bảo toàn 100% dữ liệu hiện hữu trong support_ticket_assignments và các bảng
--      nghiệp vụ khi đồng bộ cấu trúc cột.
-- ============================================================================

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS support_ticket_assignments(
  ticket_id TEXT PRIMARY KEY,
  org_node_id TEXT,
  assigned_account_id TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  impact_level TEXT NOT NULL DEFAULT 'medium',
  attachment_url TEXT,
  duplicate_of_ticket_id TEXT,
  escalated_to_account_id TEXT,
  escalation_reason TEXT,
  reopen_reason TEXT,
  reopened_at TEXT,
  satisfaction_score INTEGER,
  feedback_comment TEXT,
  sla_response_due_at TEXT,
  sla_due_at TEXT,
  sla_breached INTEGER NOT NULL DEFAULT 0,
  resolution_note TEXT,
  closed_reason TEXT,
  responded_at TEXT,
  resolved_at TEXT,
  updated_by_account_id TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_ticket_assignments_v18(
  ticket_id TEXT PRIMARY KEY,
  org_node_id TEXT,
  assigned_account_id TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  impact_level TEXT NOT NULL DEFAULT 'medium',
  attachment_url TEXT,
  duplicate_of_ticket_id TEXT,
  escalated_to_account_id TEXT,
  escalation_reason TEXT,
  reopen_reason TEXT,
  reopened_at TEXT,
  satisfaction_score INTEGER,
  feedback_comment TEXT,
  sla_response_due_at TEXT,
  sla_due_at TEXT,
  sla_breached INTEGER NOT NULL DEFAULT 0,
  resolution_note TEXT,
  closed_reason TEXT,
  responded_at TEXT,
  resolved_at TEXT,
  updated_by_account_id TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO support_ticket_assignments_v18(
  ticket_id, org_node_id, assigned_account_id, priority,
  sla_due_at, sla_breached, resolution_note, closed_reason,
  responded_at, resolved_at, updated_by_account_id, updated_at
)
SELECT
  ticket_id,
  org_node_id,
  assigned_account_id,
  CASE WHEN priority IN ('low','normal','high','urgent') THEN priority ELSE 'normal' END,
  sla_due_at,
  COALESCE(sla_breached, 0),
  resolution_note,
  closed_reason,
  responded_at,
  resolved_at,
  updated_by_account_id,
  COALESCE(updated_at, CURRENT_TIMESTAMP)
FROM support_ticket_assignments;

DROP TABLE support_ticket_assignments;
ALTER TABLE support_ticket_assignments_v18 RENAME TO support_ticket_assignments;

CREATE INDEX IF NOT EXISTS idx_support_ticket_assignments_org ON support_ticket_assignments(org_node_id, priority);
CREATE INDEX IF NOT EXISTS idx_support_ticket_assignments_impact ON support_ticket_assignments(impact_level, priority);

PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO schema_version(version) VALUES(16),(17);
