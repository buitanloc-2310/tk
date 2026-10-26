-- Migration 0017: Chuyển đổi sang Trung tâm Nghiệp vụ Số Sky First & Tích hợp toàn diện năng lực P1–P7
-- Bảo toàn 100% bảng, cột, khóa chính/phụ và dữ liệu lịch sử từ phiên bản 1–16.

-- 1. Hệ thống OTP xác minh email dùng một lần (P6.44, Mục 13.2)
CREATE TABLE IF NOT EXISTS email_otp_tokens(
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'account_request' CHECK(purpose IN ('account_request','email_change','security_verify')),
  otp_hash TEXT NOT NULL,
  verify_token_hash TEXT UNIQUE,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  resend_count INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  verified_at TEXT,
  used_at TEXT,
  ip_hint TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_email_otp_lookup ON email_otp_tokens(email, purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_otp_expiry ON email_otp_tokens(expires_at);

-- 2. Nhật ký & Hàng đợi gửi email thực chất (P6.19, P6.20, IX.4)
CREATE TABLE IF NOT EXISTS email_delivery_logs(
  id TEXT PRIMARY KEY,
  template_code TEXT NOT NULL DEFAULT 'master_notification',
  recipient_email TEXT NOT NULL,
  sender_address TEXT NOT NULL,
  reply_to_address TEXT,
  subject TEXT NOT NULL,
  provider_name TEXT NOT NULL DEFAULT 'resend',
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','failed','retried','bounced','not_configured')),
  error_detail TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  related_entity_type TEXT,
  related_entity_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_email_logs_status_created ON email_delivery_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_delivery_logs(recipient_email, created_at DESC);

-- 3. Hồ sơ bằng chứng pháp lý, điều khoản & đồng ý dữ liệu cá nhân (P6.49, P6.50, Mục 11)
CREATE TABLE IF NOT EXISTS legal_consent_records(
  id TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL CHECK(subject_type IN ('account_request','person','account','email_change')),
  subject_id TEXT NOT NULL,
  email TEXT NOT NULL,
  terms_version TEXT NOT NULL DEFAULT '2026.10-SFN-TERMS',
  privacy_version TEXT NOT NULL DEFAULT '2026.10-SFN-PDPD',
  read_acknowledged INTEGER NOT NULL DEFAULT 0,
  terms_accepted INTEGER NOT NULL DEFAULT 0,
  privacy_consent INTEGER NOT NULL DEFAULT 0,
  accuracy_committed INTEGER NOT NULL DEFAULT 0,
  is_minor INTEGER NOT NULL DEFAULT 0,
  guardian_consent INTEGER NOT NULL DEFAULT 0,
  email_verified INTEGER NOT NULL DEFAULT 0,
  otp_token_id TEXT REFERENCES email_otp_tokens(id) ON DELETE SET NULL,
  purpose_scope TEXT NOT NULL DEFAULT 'account_review_and_member_operations',
  ip_hint TEXT,
  user_agent TEXT,
  consented_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_legal_consent_subject ON legal_consent_records(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_legal_consent_email ON legal_consent_records(email);

-- 4. Lịch sử phiên bản cấu hình & đánh giá tác động thay đổi (P4.04, P6.21, P6.22, P6.34, P6.38)
CREATE TABLE IF NOT EXISTS system_config_history(
  id TEXT PRIMARY KEY,
  config_key TEXT NOT NULL,
  version_no INTEGER NOT NULL DEFAULT 1,
  previous_value_json TEXT,
  new_value_json TEXT NOT NULL,
  change_reason TEXT,
  impact_summary_json TEXT NOT NULL DEFAULT '{}',
  actor_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  approved_by_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_config_history_key ON system_config_history(config_key, version_no DESC);

-- 5. Mở rộng quản trị quy trình & hỗ trợ cho support_tickets (P7.09, P7.17)
CREATE TABLE IF NOT EXISTS support_ticket_assignments(
  ticket_id TEXT PRIMARY KEY REFERENCES support_tickets(id) ON DELETE CASCADE,
  org_node_id TEXT REFERENCES org_nodes(id) ON DELETE SET NULL,
  assigned_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
  sla_due_at TEXT,
  resolution_note TEXT,
  closed_reason TEXT,
  responded_at TEXT,
  resolved_at TEXT,
  updated_by_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Sổ đăng ký quản trị tích hợp P4–P7 (Quy trình, Tri thức, Pháp lý, Dịch vụ, Chương trình CSR/ESD, Cam kết, Chất lượng, Quyết định, Rủi ro)
CREATE TABLE IF NOT EXISTS governance_registry(
  id TEXT PRIMARY KEY,
  domain_group TEXT NOT NULL CHECK(domain_group IN (
    'workflow_def','workflow_change','workflow_exception','sod_rule',
    'knowledge_article','knowledge_graph','ai_governance','scenario_simulation','maturity_assessment',
    'legal_obligation','privacy_dsar','background_job','backup_verify','tech_dependency','service_catalog','route_link','email_template','csr_program','esd_program','public_page','feature_flag','cost_record','tech_handover','archive_inspection',
    'capability_map','case_lifecycle','sla_commitment','quality_check','decision_record','change_impact_eval','staff_readiness','ops_lesson','demand_forecast','ops_dependency','service_value','dev_proposal','resource_catalog','partner_obligation','sla_standard','beneficiary_feedback','ops_risk','initiative_portfolio'
  )),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  org_node_id TEXT REFERENCES org_nodes(id) ON DELETE SET NULL,
  owner_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  reviewer_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  approver_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  related_entity_type TEXT,
  related_entity_id TEXT,
  version_label TEXT NOT NULL DEFAULT '1.0',
  summary TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  evidence_ref TEXT,
  effective_from TEXT,
  effective_to TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_gov_registry_domain ON governance_registry(domain_group, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_gov_registry_org ON governance_registry(org_node_id, domain_group);

-- Cập nhật cấu hình nhận diện mặc định sang Trung tâm Nghiệp vụ Số Sky First (bảo toàn khóa kỹ thuật)
INSERT INTO system_settings(key, value_json, updated_at) VALUES
('organization', '{"name":"Mạng lưới Giáo dục và Phát triển Cộng đồng Sky First","short_name":"SFN","system_name":"Trung tâm Nghiệp vụ Số Sky First","domain":"https://nghiepvu.skyfirst.io.vn","emails":{"system":"nghiepvu@skyfirst.io.vn","noreply":"noreply@skyfirst.io.vn","support":"support@skyfirst.io.vn","contact":"lienhe@skyfirst.io.vn"}}', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=CURRENT_TIMESTAMP;

-- Khởi tạo dữ liệu chuẩn có căn cứ pháp lý & kỹ thuật thực tế cho sổ đăng ký P4–P7
INSERT OR IGNORE INTO governance_registry(id, domain_group, code, title, status, version_label, summary, payload_json, evidence_ref, effective_from) VALUES
('gov_leg_01', 'legal_obligation', 'LAW-91-2025-QH15', 'Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15', 'active', '2026.1', 'Quy định về dữ liệu cá nhân, nguyên tắc xử lý, sự đồng ý tách bạch, bảo vệ dữ liệu người chưa thành niên và nghĩa vụ của Bên Kiểm soát và xử lý dữ liệu.', '{"law_no":"91/2025/QH15","issued_date":"2025-06-26","effective_date":"2026-01-01","authority":"Quốc hội","verification_status":"verified_technical_controls_pending_legal_signoff"}', 'https://chinhphu.vn/?pageid=27160&docid=214590&classid=1&typegroupid=3', '2026-01-01'),
('gov_leg_02', 'legal_obligation', 'DEC-356-2025-NDCP', 'Nghị định số 356/2025/NĐ-CP quy định chi tiết Luật Bảo vệ dữ liệu cá nhân', 'active', '2026.1', 'Hướng dẫn điều kiện bảo vệ dữ liệu cá nhân, hồ sơ đánh giá tác động xử lý dữ liệu cá nhân và chia sẻ dữ liệu giữa các bộ phận nội bộ.', '{"decree_no":"356/2025/NĐ-CP","issued_date":"2025-12-31","effective_date":"2026-01-01","authority":"Chính phủ","verification_status":"verified_technical_controls_pending_legal_signoff"}', 'https://vanban.chinhphu.vn/?pageid=27160&docid=216387', '2026-01-01'),
('gov_leg_03', 'legal_obligation', 'DEC-13-2023-NDCP', 'Nghị định số 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân (tiền nhiệm/tham chiếu chuyển tiếp)', 'active', '2023.1', 'Văn bản nền tảng về phân loại dữ liệu cá nhân cơ bản và nhạy cảm, quyền của chủ thể dữ liệu.', '{"decree_no":"13/2023/NĐ-CP","issued_date":"2023-04-17","effective_date":"2023-07-01","authority":"Chính phủ"}', 'https://vanban.chinhphu.vn/?pageid=27160&docid=207759', '2023-07-01'),
('gov_wf_01', 'workflow_def', 'WF-ACC-REQ', 'Quy trình tiếp nhận, xác minh OTP email và xét duyệt yêu cầu tạo tài khoản', 'active', '2.0', 'Luồng 5 bước: Nhập hồ sơ & đồng ý tách bạch -> Xác minh OTP email (tùy chọn cấu hình) -> Tiếp nhận chờ duyệt -> Bổ sung/Phê duyệt/Từ chối -> Kích hoạt & bắt buộc đổi mật khẩu lần đầu.', '{"steps":["submit","email_otp_verify","review","approve_or_supplement_or_reject","first_login_password_change"],"sod_required":true,"sla_hours":48}', '/api/public/account-request', '2026-10-01'),
('gov_wf_02', 'workflow_def', 'WF-CRED-ISSUE', 'Quy trình cấp phát thẻ thành viên, thẻ sự kiện một lần và QR xác minh độc lập', 'active', '2.0', 'Tách biệt 3 luồng: Thẻ thành viên chính thức (gắn hồ sơ), Thẻ sự kiện một lần (không tạo tài khoản) và Hồ sơ QR xác minh độc lập (cho thiết kế ngoài).', '{"steps":["create_record","generate_local_qr","verify_public","revoke_or_expire"],"sod_required":false}', '/api/admin/issuance-overview', '2026-10-01'),
('gov_sod_01', 'sod_rule', 'SOD-REQ-APPROVAL', 'Phân tách người đăng ký, người đề xuất và người phê duyệt hồ sơ/đánh giá', 'active', '1.0', 'Chặn tự khóa/tự cấm tài khoản bản thân; kiểm tra xung đột khi người tạo yêu cầu trùng email hoặc tài khoản với người phê duyệt.', '{"enforced_in_backend":true,"target_entities":["account_requests","account_restrictions","member_evaluations"]}', 'src/index.js', '2026-10-01'),
('gov_svc_01', 'service_catalog', 'SVC-NGHIEPVU', 'Trung tâm Nghiệp vụ Số Sky First', 'active', '6.1', 'Hệ thống lõi quản trị nghiệp vụ, hồ sơ, thẻ, chứng nhận, quy trình và tuân thủ của Mạng lưới Giáo dục và Phát triển Cộng đồng Sky First.', '{"domain":"https://nghiepvu.skyfirst.io.vn","worker":"tk","d1":"tk","r2":"tksfn","system_email":"nghiepvu@skyfirst.io.vn","noreply_email":"noreply@skyfirst.io.vn","support_email":"support@skyfirst.io.vn","contact_email":"lienhe@skyfirst.io.vn","production_deployed":false}', 'wrangler.jsonc', '2026-10-26'),
('gov_svc_02', 'service_catalog', 'SVC-WWW', 'Trang Thông Tin Điện Tử Sky First', 'active', '1.0', 'Cổng thông tin chính thức của Sky First Network.', '{"domain":"https://www.skyfirst.io.vn/","type":"public_portal"}', 'public/app.js', '2026-01-01'),
('gov_svc_03', 'service_catalog', 'SVC-CTT', 'Cổng Thông Tin Số Sky First', 'active', '1.0', 'Thông tin, chương trình và tiện ích số.', '{"domain":"https://ctt.skyfirst.io.vn/","type":"digital_portal"}', 'public/app.js', '2026-01-01'),
('gov_svc_04', 'service_catalog', 'SVC-TNV', 'Trung Tâm Tình Nguyện Viên Sky First', 'active', '1.0', 'Hoạt động tình nguyện và cộng đồng.', '{"domain":"https://tnv.skyfirst.io.vn/","type":"volunteer_center"}', 'public/app.js', '2026-01-01'),
('gov_svc_05', 'service_catalog', 'SVC-SLC', 'Trung Tâm Học Tập Số Sky First', 'active', '1.0', 'Học tập và lớp học trực tuyến.', '{"domain":"https://slc.skyfirst.io.vn/","type":"learning_center"}', 'public/app.js', '2026-01-01'),
('gov_svc_06', 'service_catalog', 'SVC-MAIL', 'Trung Tâm Thư Điện Tử Sky First', 'active', '1.0', 'Dịch vụ thư điện tử nội bộ.', '{"domain":"https://mail.skyfirst.io.vn/","type":"mail_center"}', 'public/app.js', '2026-01-01'),
('gov_esd_01', 'esd_program', 'ESD-DEFINITION-GATE', 'Danh mục Chương trình ESD & Sinh kế (Đang chờ xác nhận định nghĩa thuật ngữ chính thức của SFN)', 'pending_verification', '1.0', 'Khung quản trị chương trình ESD và sinh kế. Lưu ý: Chưa tự gán định nghĩa cố định cho viết tắt ESD (Education for Sustainable Development / Enterprise & Supplier Development / Livelihood) cho đến khi Ban Điều hành SFN xác nhận chính thức.', '{"terminology_verified":false,"candidate_meanings":["Giáo dục vì sự phát triển bền vững (Education for Sustainable Development)","Phát triển sinh kế & năng lực cộng đồng"],"requires_org_confirmation":true}', 'P6.24', '2026-10-26'),
('gov_csr_01', 'csr_program', 'CSR-COMMUNITY-CORE', 'Khung quản lý Chương trình Trách nhiệm Xã hội & Cộng đồng (CSR)', 'active', '1.0', 'Quản lý đối tác, mục tiêu, nguồn lực, hoạt động và biểu mẫu công khai thuộc phạm vi Mạng lưới Giáo dục và Phát triển Cộng đồng Sky First.', '{"scope":"SFN Community & Education","status":"ready"}', 'P6.23', '2026-10-26'),
('gov_tpl_01', 'email_template', 'TPL-MASTER-VN', 'Mẫu Email Thông báo & Xác minh Chuẩn — Trung tâm Nghiệp vụ Số Sky First', 'active', '2.0', 'Template HTML chuẩn hóa nhận diện Trung tâm Nghiệp vụ Số Sky First, CTA trỏ về https://nghiepvu.skyfirst.io.vn, phân tách rõ noreply@skyfirst.io.vn, nghiepvu@skyfirst.io.vn, support@skyfirst.io.vn và lienhe@skyfirst.io.vn.', '{"from_auto":"Trung tâm Nghiệp vụ Số Sky First <noreply@skyfirst.io.vn>","from_system":"Trung tâm Nghiệp vụ Số Sky First <nghiepvu@skyfirst.io.vn>","reply_to":"support@skyfirst.io.vn","cta_base":"https://nghiepvu.skyfirst.io.vn"}', 'src/index.js', '2026-10-26'),
('gov_cap_01', 'capability_map', 'CAP-CORE-OPS', 'Bản đồ năng lực nghiệp vụ cốt lõi Sky First', 'active', '1.0', 'Tổng hợp các năng lực: Quản trị định danh & hồ sơ số, Xét duyệt đa đơn vị, Cấp phát thẻ & QR xác minh độc lập, Đánh giá thành viên, Quản trị quy trình & tuân thủ pháp lý.', '{"digitization_level":"85%","manual_steps":["Xác minh hồ sơ thực tế trước khi duyệt","Cấu hình DNS/SPF/DKIM trên nhà cung cấp tên miền","Chạy migration trên Cloudflare D1 production"]}', 'P7.01', '2026-10-26'),
('gov_sla_01', 'sla_standard', 'SLA-ACC-REVIEW', 'Tiêu chuẩn thời gian xử lý hồ sơ đăng ký tài khoản (60 phút – 48 giờ)', 'active', '1.0', 'Thời gian tiếp nhận tự động ngay lập tức; thời gian xét duyệt mục tiêu từ 60 phút đến 48 giờ làm việc.', '{"target_min_minutes":60,"target_max_hours":48,"applies_to":"account_requests"}', 'src/index.js', '2026-10-01');

INSERT OR IGNORE INTO schema_version(version) VALUES(17);
