PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS email_otp_tokens(
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'account_request',
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

CREATE TABLE IF NOT EXISTS email_delivery_logs(
  id TEXT PRIMARY KEY,
  template_code TEXT NOT NULL DEFAULT 'master_notification',
  recipient_email TEXT NOT NULL,
  sender_address TEXT NOT NULL,
  reply_to_address TEXT,
  subject TEXT NOT NULL,
  provider_name TEXT NOT NULL DEFAULT 'resend',
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_detail TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  related_entity_type TEXT,
  related_entity_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_email_delivery_created ON email_delivery_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS legal_consent_records(
  id TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL,
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
  otp_token_id TEXT,
  purpose_scope TEXT NOT NULL DEFAULT 'account_review_and_member_operations',
  ip_hint TEXT,
  user_agent TEXT,
  consented_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_legal_consent_subject ON legal_consent_records(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_legal_consent_email ON legal_consent_records(email);

CREATE TABLE IF NOT EXISTS system_config_history(
  id TEXT PRIMARY KEY,
  config_key TEXT NOT NULL,
  version_no INTEGER NOT NULL DEFAULT 1,
  previous_value_json TEXT,
  new_value_json TEXT NOT NULL,
  change_reason TEXT,
  impact_summary_json TEXT NOT NULL DEFAULT '{}',
  actor_account_id TEXT,
  approved_by_account_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_system_config_history_key ON system_config_history(config_key, version_no DESC);

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

CREATE TABLE IF NOT EXISTS support_ticket_messages(
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  sender_account_id TEXT,
  visibility TEXT NOT NULL DEFAULT 'public',
  message_type TEXT NOT NULL DEFAULT 'reply',
  body TEXT NOT NULL,
  attachment_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket ON support_ticket_messages(ticket_id, created_at ASC);

CREATE TABLE IF NOT EXISTS work_queue_states(
  item_key TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  org_node_id TEXT,
  assigned_account_id TEXT,
  collaborator_ids_json TEXT NOT NULL DEFAULT '[]',
  dependency_keys_json TEXT NOT NULL DEFAULT '[]',
  priority TEXT NOT NULL DEFAULT 'normal',
  workflow_state TEXT NOT NULL DEFAULT 'open',
  blocked_reason TEXT,
  blocked_missing_condition TEXT,
  blocked_coordination_party TEXT,
  blocked_resolution_plan TEXT,
  due_at TEXT,
  last_reminder_at TEXT,
  reminder_count INTEGER NOT NULL DEFAULT 0,
  handover_note TEXT,
  updated_by_account_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS governance_registry(
  id TEXT PRIMARY KEY,
  domain_group TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  org_node_id TEXT,
  owner_account_id TEXT,
  reviewer_account_id TEXT,
  approver_account_id TEXT,
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
CREATE INDEX IF NOT EXISTS idx_governance_domain ON governance_registry(domain_group, status);

CREATE TABLE IF NOT EXISTS account_type_configs(
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  aliases_json TEXT NOT NULL DEFAULT '[]',
  purpose TEXT NOT NULL,
  eligible_group TEXT NOT NULL,
  activation_condition TEXT NOT NULL,
  duration_hours INTEGER,
  duration_months INTEGER,
  allow_public_register INTEGER NOT NULL DEFAULT 1,
  granted_scope_note TEXT NOT NULL,
  resource_limits_json TEXT NOT NULL DEFAULT '{}',
  renewal_policy TEXT NOT NULL,
  retention_policy TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO account_type_configs(code, name, aliases_json, purpose, eligible_group, activation_condition, duration_hours, duration_months, allow_public_register, granted_scope_note, resource_limits_json, renewal_policy, retention_policy, status) VALUES
('trial_24h', 'Tài khoản 24 giờ', '["24h","24 giờ"]', 'Dùng thử hoặc tham gia phiên nghiệp vụ ngắn hạn trong 24 giờ kể từ lúc kích hoạt.', 'Người đăng ký dùng thử, khách mời hoặc cộng tác viên ngắn hạn', 'Sau khi xác minh OTP email và được kích hoạt', 24, NULL, 1, 'Chỉ sử dụng chức năng cá nhân và biểu mẫu công khai; không mặc nhiên có quyền Admin hoặc xem dữ liệu nội bộ.', '{"max_files_mb":10,"admin_access":false}', 'Có thể được quản trị viên gia hạn sang 48 giờ hoặc chuyển sang Tài khoản 12 tháng (01 năm) sau khi xét duyệt.', 'Khi hết hạn: tự động chặn đăng nhập và API cần quyền sử dụng; giữ nguyên hồ sơ và nhật ký kiểm toán.', 'active'),
('trial_48h', 'Tài khoản 48 giờ', '["48h","48 giờ"]', 'Tham gia chương trình, sự kiện hoặc đợt công tác ngắn hạn trong 48 giờ kể từ lúc kích hoạt.', 'Người tham gia sự kiện, tình nguyện viên theo đợt hoặc tài khoản trải nghiệm mở rộng', 'Sau khi xác minh OTP email và được kích hoạt', 48, NULL, 1, 'Sử dụng cổng thành viên trong phạm vi được giao; không có quyền quản trị hệ thống.', '{"max_files_mb":20,"admin_access":false}', 'Quản trị viên có thẩm quyền có thể gia hạn hoặc nâng cấp lên Tài khoản 12 tháng (01 năm).', 'Khi hết hạn: tự động chặn phiên và thao tác API; bảo toàn dữ liệu lịch sử.', 'active'),
('annual_12m_1y', 'Tài khoản 12 tháng (01 năm)', '["12_months","1_year","12 tháng","1 năm","01 năm"]', 'Tài khoản thành viên/cộng tác viên có kỳ hạn chuẩn 12 tháng (tương đương 01 năm — hai cách gọi cùng một gói thời hạn 365 ngày / 12 tháng để tránh trùng lặp).', 'Thành viên chính thức, cộng tác viên thường xuyên của Sky First Network', 'Sau khi hồ sơ đăng ký được cấp có thẩm quyền phê duyệt và kích hoạt', 8760, 12, 1, 'Quyền thành viên theo đơn vị trực thuộc; vai trò nghiệp vụ được gán tách biệt với loại tài khoản.', '{"max_files_mb":100,"admin_access":false}', 'Gia hạn định kỳ hằng năm theo kết quả đánh giá hoạt động hoặc quyết định của Ban/Đơn vị.', 'Khi hết hạn: khóa quyền thao tác nghiệp vụ cho đến khi được gia hạn; bảo toàn toàn bộ hồ sơ, thẻ và chứng nhận.', 'active'),
('staff_custom', 'Tài khoản nhân sự (Thời hạn do Quản trị viên thiết lập)', '["staff","custom","nhân sự"]', 'Tài khoản dành cho nhân sự, cán bộ phụ trách hoặc ban điều hành với thời hạn hoạt động thiết lập theo nhiệm kỳ/nhiệm vụ.', 'Nhân sự nội bộ, Ban Chấp hành, Văn phòng Mạng lưới, Trưởng/Phó đơn vị do Quản trị viên cấp', 'Do quản trị viên có thẩm quyền khởi tạo hoặc phê duyệt kèm mốc hết hạn cụ thể', NULL, NULL, 0, 'Loại tài khoản xác định thời hạn hoạt động; quyền quản trị được kiểm soát độc lập qua bảng vai trò và phạm vi đơn vị (RBAC).', '{"max_files_mb":500}', 'Điều chỉnh hoặc gia hạn theo quyết định bổ nhiệm/phân công nhiệm vụ của tổ chức.', 'Khi hết thời hạn nhiệm vụ: thu hồi phiên đăng nhập và quyền thao tác nhưng giữ nguyên toàn bộ lịch sử phê duyệt và nhật ký.', 'active');

CREATE TABLE IF NOT EXISTS account_lifecycle(
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  account_type_code TEXT NOT NULL DEFAULT 'annual_12m_1y',
  duration_label TEXT NOT NULL DEFAULT '12 tháng (01 năm)',
  activated_at TEXT,
  expires_at TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'active',
  expiry_notified_at TEXT,
  renewal_count INTEGER NOT NULL DEFAULT 0,
  last_action_reason TEXT,
  updated_by_account_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_account_lifecycle_expiry ON account_lifecycle(expires_at, lifecycle_status);

CREATE TABLE IF NOT EXISTS data_policies(
  id TEXT PRIMARY KEY,
  policy_code TEXT NOT NULL,
  policy_type TEXT NOT NULL,
  title TEXT NOT NULL,
  version_label TEXT NOT NULL,
  content_summary TEXT NOT NULL,
  content_body TEXT NOT NULL,
  is_mandatory INTEGER NOT NULL DEFAULT 1,
  requires_reconsent INTEGER NOT NULL DEFAULT 0,
  applicable_scope TEXT NOT NULL DEFAULT 'all_forms',
  status TEXT NOT NULL DEFAULT 'active',
  effective_from TEXT NOT NULL,
  updated_by_account_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(policy_code, version_label)
);

INSERT OR IGNORE INTO data_policies(id, policy_code, policy_type, title, version_label, content_summary, content_body, is_mandatory, requires_reconsent, applicable_scope, status, effective_from) VALUES
('pol_privacy_2026', 'SFN-PDPD-NOTICE', 'privacy_notice', 'Thông báo Bảo mật và Xử lý Dữ liệu Cá nhân', '2026.10-SFN-PDPD', 'Quy định mục đích thu thập, phạm vi sử dụng, thời hạn lưu trữ và quyền của chủ thể dữ liệu theo Luật 91/2025/QH15 & Nghị định 356/2025/NĐ-CP.', 'Trung tâm Nghiệp vụ Số Sky First thu thập và xử lý dữ liệu cá nhân tối thiểu phục vụ xác minh danh tính, xét duyệt hồ sơ, quản lý thành viên, tổ chức sự kiện và cấp thẻ/chứng nhận. Không công khai CCCD, địa chỉ, số điện thoại hoặc dữ liệu người giám hộ.', 1, 1, 'all_forms', 'active', '2026-01-01'),
('pol_terms_2026', 'SFN-TERMS-USE', 'terms_of_use', 'Điều khoản Sử dụng Hệ thống Trung tâm Nghiệp vụ Số Sky First', '2026.10-SFN-TERMS', 'Quy định trách nhiệm bảo mật tài khoản, không chia sẻ thông tin xác thực và sử dụng hệ thống đúng thẩm quyền.', 'Người dùng cam kết khai báo thông tin trung thực, bảo vệ thông tin đăng nhập, đổi mật khẩu tạm ngay lần đầu và tuân thủ quy chế hoạt động của Mạng lưới Giáo dục và Phát triển Cộng đồng Sky First.', 1, 1, 'all_forms', 'active', '2026-01-01'),
('pol_opt_comm_2026', 'SFN-OPT-NEWS', 'optional_consent', 'Đồng ý nhận bản tin hoạt động & cơ hội tình nguyện mở rộng (Tùy chọn)', '2026.10-SFN-OPT', 'Nhận thông báo về các chương trình cộng đồng, học bổng và sự kiện mở rộng ngoài phạm vi quản lý hồ sơ bắt buộc.', 'Lựa chọn này hoàn toàn tự nguyện và tách biệt với sự đồng ý bắt buộc để thực hiện dịch vụ hồ sơ. Người dùng có thể rút lại sự đồng ý bất kỳ lúc nào.', 0, 0, 'all_forms', 'active', '2026-01-01');

CREATE TABLE IF NOT EXISTS consent_withdrawal_requests(
  id TEXT PRIMARY KEY,
  consent_record_id TEXT,
  subject_email TEXT NOT NULL,
  person_id TEXT,
  policy_code TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  admin_note TEXT,
  processed_by_account_id TEXT,
  processed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS registration_forms(
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  target_audience TEXT,
  guidelines TEXT,
  support_contact TEXT NOT NULL DEFAULT 'support@skyfirst.io.vn',
  owner_org_node_id TEXT,
  owner_account_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  current_version INTEGER NOT NULL DEFAULT 1,
  opens_at TEXT,
  closes_at TEXT,
  max_submissions INTEGER,
  require_attachment INTEGER NOT NULL DEFAULT 0,
  require_signature INTEGER NOT NULL DEFAULT 0,
  signature_method TEXT NOT NULL DEFAULT 'drawn_or_uploaded',
  default_account_type TEXT,
  post_submit_message TEXT,
  fields_json TEXT NOT NULL DEFAULT '[]',
  policy_codes_json TEXT NOT NULL DEFAULT '["SFN-PDPD-NOTICE","SFN-TERMS-USE"]',
  event_id TEXT,
  created_by_account_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS registration_form_versions(
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL REFERENCES registration_forms(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL,
  title TEXT NOT NULL,
  fields_json TEXT NOT NULL,
  config_snapshot_json TEXT NOT NULL,
  change_note TEXT,
  created_by_account_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(form_id, version_no)
);

INSERT OR IGNORE INTO registration_forms(id, code, slug, title, description, target_audience, guidelines, support_contact, owner_org_node_id, status, current_version, require_attachment, require_signature, signature_method, default_account_type, post_submit_message, fields_json, policy_codes_json) VALUES
('form_member_standard', 'FORM-MEMBER-2026', 'dang-ky-thanh-vien-sky-first', 'Biểu mẫu Đăng ký Thành viên & Tài khoản Nghiệp vụ Sky First', 'Biểu mẫu chuẩn tiếp nhận hồ sơ đăng ký thành viên, cộng tác viên hoặc tài khoản dùng thử theo thời hạn cấu hình.', 'Ứng viên thành viên, tình nguyện viên, cộng tác viên Sky First Network', 'Vui lòng điền đầy đủ các trường bắt buộc, đính kèm minh chứng (nếu có), ký xác nhận cam kết và tích chọn đồng ý chính sách dữ liệu.', 'support@skyfirst.io.vn', 'org_office', 'published', 1, 0, 1, 'drawn_or_uploaded', 'annual_12m_1y', 'Hồ sơ của bạn đã được ghi nhận cùng phiên bản biểu mẫu và bằng chứng đồng ý. Vui lòng lưu mã hồ sơ để tra cứu.', '[{"code":"full_name","label":"Họ và tên","type":"text","required":true,"maxLength":160,"order":1,"active":true},{"code":"email","label":"Địa chỉ Email","type":"email","required":true,"maxLength":200,"order":2,"active":true},{"code":"phone","label":"Số điện thoại","type":"phone","required":true,"maxLength":30,"order":3,"active":true},{"code":"account_type_requested","label":"Loại tài khoản & Thời hạn đăng ký","type":"select","required":true,"options":["trial_24h","trial_48h","annual_12m_1y"],"defaultValue":"annual_12m_1y","order":4,"active":true},{"code":"motivation","label":"Mục tiêu tham gia & Đóng góp dự kiến","type":"textarea","required":true,"maxLength":2000,"order":5,"active":true}]', '["SFN-PDPD-NOTICE","SFN-TERMS-USE","SFN-OPT-NEWS"]');

INSERT OR IGNORE INTO registration_form_versions(id, form_id, version_no, title, fields_json, config_snapshot_json, change_note) VALUES
('fver_member_v1', 'form_member_standard', 1, 'Biểu mẫu Đăng ký Thành viên & Tài khoản Nghiệp vụ Sky First', '[{"code":"full_name","label":"Họ và tên","type":"text","required":true,"maxLength":160,"order":1,"active":true},{"code":"email","label":"Địa chỉ Email","type":"email","required":true,"maxLength":200,"order":2,"active":true},{"code":"phone","label":"Số điện thoại","type":"phone","required":true,"maxLength":30,"order":3,"active":true},{"code":"account_type_requested","label":"Loại tài khoản & Thời hạn đăng ký","type":"select","required":true,"options":["trial_24h","trial_48h","annual_12m_1y"],"defaultValue":"annual_12m_1y","order":4,"active":true},{"code":"motivation","label":"Mục tiêu tham gia & Đóng góp dự kiến","type":"textarea","required":true,"maxLength":2000,"order":5,"active":true}]', '{"require_attachment":0,"require_signature":1,"default_account_type":"annual_12m_1y"}', 'Phiên bản khởi tạo chuẩn hóa');

CREATE TABLE IF NOT EXISTS registration_submissions(
  id TEXT PRIMARY KEY,
  submission_code TEXT NOT NULL UNIQUE,
  form_id TEXT NOT NULL REFERENCES registration_forms(id),
  form_version INTEGER NOT NULL,
  form_snapshot_json TEXT NOT NULL,
  applicant_name TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  applicant_phone TEXT,
  requested_account_type TEXT,
  org_node_id TEXT,
  event_id TEXT,
  answers_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  assigned_account_id TEXT,
  reviewer_account_id TEXT,
  decision_reason TEXT,
  supplement_request_note TEXT,
  internal_notes_json TEXT NOT NULL DEFAULT '[]',
  history_json TEXT NOT NULL DEFAULT '[]',
  approved_account_id TEXT,
  idempotency_key TEXT UNIQUE,
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reg_submissions_form ON registration_submissions(form_id, status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_reg_submissions_email ON registration_submissions(applicant_email);

CREATE TABLE IF NOT EXISTS registration_submission_files(
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES registration_submissions(id) ON DELETE CASCADE,
  field_code TEXT NOT NULL DEFAULT 'attachment',
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  storage_key TEXT NOT NULL,
  version_no INTEGER NOT NULL DEFAULT 1,
  check_status TEXT NOT NULL DEFAULT 'verified_header',
  review_note TEXT,
  uploaded_by_email TEXT,
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS signature_records(
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES registration_submissions(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signature_type TEXT NOT NULL DEFAULT 'drawn_canvas',
  legal_classification TEXT NOT NULL DEFAULT 'electronic_confirmation_non_ca',
  legal_disclaimer TEXT NOT NULL DEFAULT 'Xác nhận trực tiếp hoặc tệp xác nhận gắn với hồ sơ và mã băm nội dung tại thời điểm gửi.',
  content_version_hash TEXT NOT NULL,
  signed_payload_snapshot TEXT NOT NULL,
  signature_data_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'valid',
  resign_reason TEXT,
  ip_hint TEXT,
  user_agent TEXT,
  signed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sk_events(
  id TEXT PRIMARY KEY,
  event_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  expected_outcomes TEXT,
  event_type TEXT NOT NULL DEFAULT 'community',
  domain_field TEXT NOT NULL DEFAULT 'Giáo dục & Cộng đồng',
  scale_label TEXT NOT NULL DEFAULT 'Cấp Mạng lưới',
  proposing_org_id TEXT NOT NULL,
  host_org_id TEXT NOT NULL,
  coordinating_orgs_json TEXT NOT NULL DEFAULT '[]',
  lead_person_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  milestones_json TEXT NOT NULL DEFAULT '[]',
  location_or_platform TEXT NOT NULL,
  target_participants TEXT,
  eligibility_criteria TEXT,
  expected_participants INTEGER NOT NULL DEFAULT 50,
  implementation_plan TEXT,
  communication_plan TEXT,
  risk_plan_json TEXT NOT NULL DEFAULT '[]',
  registration_form_id TEXT,
  registration_opens_at TEXT,
  registration_closes_at TEXT,
  max_registrations INTEGER NOT NULL DEFAULT 100,
  require_registration_approval INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  registration_state TEXT NOT NULL DEFAULT 'closed',
  summary_report_state TEXT NOT NULL DEFAULT 'not_submitted',
  current_version INTEGER NOT NULL DEFAULT 1,
  version_history_json TEXT NOT NULL DEFAULT '[]',
  proposer_account_id TEXT NOT NULL,
  appraiser_account_id TEXT,
  appraisal_note TEXT,
  appraised_at TEXT,
  approver_account_id TEXT,
  approval_note TEXT,
  approved_at TEXT,
  publisher_account_id TEXT,
  published_at TEXT,
  rejected_reason TEXT,
  postponed_or_cancelled_reason TEXT,
  incident_report_json TEXT,
  summary_report_json TEXT,
  checklist_json TEXT NOT NULL DEFAULT '{"approved":false,"venue_ready":false,"staff_ready":false,"logistics_ready":false,"form_ready":false,"comms_approved":false}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sk_events_status ON sk_events(status, starts_at DESC);

CREATE TABLE IF NOT EXISTS sk_event_tasks(
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES sk_events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  assignee_account_id TEXT,
  assignee_name TEXT,
  collaborators_json TEXT NOT NULL DEFAULT '[]',
  reviewer_account_id TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  weight INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'not_started',
  due_at TEXT,
  evidence_note TEXT,
  updated_by_account_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sk_event_staff(
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES sk_events(id) ON DELETE CASCADE,
  account_id TEXT,
  person_name TEXT NOT NULL,
  role_in_event TEXT NOT NULL,
  team_or_shift TEXT,
  task_description TEXT,
  supervisor_name TEXT,
  is_backup INTEGER NOT NULL DEFAULT 0,
  assignment_status TEXT NOT NULL DEFAULT 'assigned',
  handover_note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sk_event_logistics(
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES sk_events(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL DEFAULT 'equipment',
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  location_or_room TEXT,
  use_starts_at TEXT,
  use_ends_at TEXT,
  responsible_party TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  estimated_cost REAL NOT NULL DEFAULT 0,
  actual_cost REAL NOT NULL DEFAULT 0,
  contingency_note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sk_event_budgets(
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES sk_events(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  funding_source TEXT NOT NULL DEFAULT 'Ngân sách Mạng lưới / Tài trợ',
  estimated_amount REAL NOT NULL DEFAULT 0,
  approved_amount REAL NOT NULL DEFAULT 0,
  received_amount REAL NOT NULL DEFAULT 0,
  spent_amount REAL NOT NULL DEFAULT 0,
  voucher_ref TEXT,
  proposer_account_id TEXT NOT NULL,
  reviewer_account_id TEXT,
  approver_account_id TEXT,
  status TEXT NOT NULL DEFAULT 'proposed',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sk_event_partners(
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES sk_events(id) ON DELETE CASCADE,
  partner_name TEXT NOT NULL,
  partner_role TEXT NOT NULL DEFAULT 'Đơn vị phối hợp',
  contact_person TEXT,
  contact_info_restricted TEXT,
  commitment_summary TEXT,
  status TEXT NOT NULL DEFAULT 'contacted',
  public_display_approved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sk_event_communications(
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES sk_events(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL DEFAULT 'announcement',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  media_url TEXT,
  channel TEXT NOT NULL DEFAULT 'Cổng nội bộ & Website',
  author_account_id TEXT NOT NULL,
  reviewer_account_id TEXT,
  approver_account_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_publish_at TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sk_event_registrations(
  id TEXT PRIMARY KEY,
  registration_code TEXT NOT NULL UNIQUE,
  event_id TEXT NOT NULL REFERENCES sk_events(id) ON DELETE CASCADE,
  account_id TEXT,
  person_id TEXT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  org_name TEXT,
  answers_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  reviewer_account_id TEXT,
  review_note TEXT,
  registered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, email)
);

CREATE TABLE IF NOT EXISTS sk_qr_sessions(
  id TEXT PRIMARY KEY,
  session_code TEXT NOT NULL UNIQUE,
  event_id TEXT NOT NULL REFERENCES sk_events(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL,
  qr_token TEXT NOT NULL UNIQUE,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  require_approved_registration INTEGER NOT NULL DEFAULT 1,
  allow_duplicate_checkin INTEGER NOT NULL DEFAULT 0,
  created_by_account_id TEXT NOT NULL,
  revoked_reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sk_attendance_records(
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES sk_events(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES sk_qr_sessions(id) ON DELETE CASCADE,
  registration_id TEXT,
  account_id TEXT,
  participant_name TEXT NOT NULL,
  participant_email TEXT NOT NULL,
  attendance_status TEXT NOT NULL DEFAULT 'checked_in',
  checkin_method TEXT NOT NULL DEFAULT 'qr_scan',
  manual_reason TEXT,
  operator_account_id TEXT,
  checked_in_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_conversations(
  id TEXT PRIMARY KEY,
  conv_type TEXT NOT NULL DEFAULT 'direct',
  title TEXT,
  description TEXT,
  avatar_url TEXT,
  org_node_id TEXT,
  event_id TEXT,
  created_by_account_id TEXT NOT NULL,
  pinned_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_participants(
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role_in_chat TEXT NOT NULL DEFAULT 'member',
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_muted INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  unread_count INTEGER NOT NULL DEFAULT 0,
  last_read_at TEXT,
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(conversation_id, account_id)
);

CREATE TABLE IF NOT EXISTS chat_messages(
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  reply_to_message_id TEXT,
  forwarded_from_id TEXT,
  body TEXT NOT NULL,
  attachment_url TEXT,
  attachment_type TEXT,
  linked_entity_type TEXT,
  linked_entity_id TEXT,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  delivery_state TEXT NOT NULL DEFAULT 'sent',
  status TEXT NOT NULL DEFAULT 'active',
  edited_at TEXT,
  recalled_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages(conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS community_groups(
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  group_type TEXT NOT NULL DEFAULT 'group',
  visibility TEXT NOT NULL DEFAULT 'public_internal',
  org_node_id TEXT,
  description TEXT,
  allow_member_posts INTEGER NOT NULL DEFAULT 1,
  allow_comments INTEGER NOT NULL DEFAULT 1,
  require_post_approval INTEGER NOT NULL DEFAULT 0,
  created_by_account_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO community_groups(id, code, name, group_type, visibility, org_node_id, description, allow_member_posts, allow_comments, require_post_approval, created_by_account_id) VALUES
('grp_official_bch', 'CHANNEL-SFN-OFFICIAL', 'Kênh Thông báo Chính thức Sky First Network', 'announcement_channel', 'public_internal', 'org_sfn', 'Kênh phát hành thông báo chính thức của Ban Chấp hành và Văn phòng Mạng lưới (chỉ tài khoản có thẩm quyền xuất bản).', 0, 1, 1, 'a'),
('grp_general_community', 'GROUP-SFN-COMMUNITY', 'Cộng đồng Thành viên & Điều phối Nghiệp vụ Sky First', 'group', 'public_internal', 'org_sfn', 'Không gian trao đổi kinh nghiệm, chia sẻ hoạt động và kết nối giữa các Ban/Đơn vị trong Mạng lưới.', 1, 1, 0, 'a');

CREATE TABLE IF NOT EXISTS community_group_members(
  group_id TEXT NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role_in_group TEXT NOT NULL DEFAULT 'member',
  can_post INTEGER NOT NULL DEFAULT 1,
  can_comment INTEGER NOT NULL DEFAULT 1,
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(group_id, account_id)
);

CREATE TABLE IF NOT EXISTS social_posts(
  id TEXT PRIMARY KEY,
  group_id TEXT REFERENCES community_groups(id) ON DELETE SET NULL,
  author_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  org_node_id TEXT,
  event_id TEXT,
  post_kind TEXT NOT NULL DEFAULT 'discussion',
  title TEXT,
  body TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  moderation_status TEXT NOT NULL DEFAULT 'published',
  approver_account_id TEXT,
  approved_at TEXT,
  rejected_reason TEXT,
  published_at TEXT,
  share_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_social_posts_feed ON social_posts(moderation_status, is_pinned DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS social_comments(
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  parent_comment_id TEXT,
  author_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS social_reactions(
  post_id TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(post_id, account_id)
);

CREATE TABLE IF NOT EXISTS content_reports(
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reporter_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  moderator_account_id TEXT,
  resolution_note TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO permissions(id, code, name, description) VALUES
('perm_form_manage', 'form.manage', 'Quản lý biểu mẫu và hồ sơ đăng ký', 'Tạo, cấu hình, công bố biểu mẫu và xử lý hồ sơ đăng ký'),
('perm_event_propose', 'event.propose', 'Đề xuất và lập hồ sơ sự kiện', 'Tạo bản nháp và trình duyệt hồ sơ sự kiện/hoạt động'),
('perm_event_appraise', 'event.appraise', 'Thẩm định hồ sơ sự kiện', 'Kiểm tra tính đầy đủ, khả thi và rủi ro của hồ sơ sự kiện'),
('perm_event_approve', 'event.approve', 'Phê duyệt chính thức sự kiện', 'Phê duyệt hoặc từ chối hồ sơ sự kiện theo thẩm quyền'),
('perm_event_publish', 'event.publish', 'Công bố sự kiện & Mở đăng ký', 'Xuất bản sự kiện đã duyệt và điều khiển cổng đăng ký'),
('perm_event_checkin', 'event.checkin', 'Vận hành phiên QR & Điểm danh', 'Tạo mã QR điểm danh, xác thực và điều chỉnh điểm danh'),
('perm_content_moderate', 'content.moderate', 'Kiểm duyệt nội dung & Thông báo chính thức', 'Phê duyệt bài viết chính thức và xử lý báo cáo nội dung');

INSERT OR IGNORE INTO role_permissions(role_id, permission_id)
SELECT 'role_super_admin', id FROM permissions WHERE code IN ('form.manage','event.propose','event.appraise','event.approve','event.publish','event.checkin','content.moderate');

INSERT OR IGNORE INTO role_permissions(role_id, permission_id)
SELECT 'role_network_admin', id FROM permissions WHERE code IN ('form.manage','event.propose','event.appraise','event.approve','event.publish','event.checkin','content.moderate');

INSERT OR IGNORE INTO role_permissions(role_id, permission_id)
SELECT 'role_unit_admin', id FROM permissions WHERE code IN ('event.propose','event.checkin');

INSERT OR IGNORE INTO role_permissions(role_id, permission_id)
SELECT 'role_department_admin', id FROM permissions WHERE code IN ('event.propose','event.appraise','event.checkin');

UPDATE system_settings SET value_json='{"name":"Mạng lưới Giáo dục và Phát triển Cộng đồng Sky First","short_name":"SFN","app_name":"Trung tâm Nghiệp vụ Số Sky First","app_url":"https://nghiepvu.skyfirst.io.vn","system_email":"nghiepvu@skyfirst.io.vn","noreply_email":"noreply@skyfirst.io.vn","support_email":"support@skyfirst.io.vn","contact_email":"lienhe@skyfirst.io.vn"}', updated_at=CURRENT_TIMESTAMP WHERE key='organization';

INSERT OR IGNORE INTO governance_registry(id, domain_group, code, title, status, version_label, summary, evidence_ref, effective_from) VALUES
('gov_law_91', 'legal_obligation', 'LAW-91-2025-QH15', 'Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15', 'active', '2026.01', 'Quy định nguyên tắc xử lý dữ liệu cá nhân, sự đồng ý tách bạch theo mục đích, quyền chủ thể dữ liệu và bảo vệ dữ liệu người chưa thành niên.', 'https://chinhphu.vn/?pageid=27160&docid=214590&classid=1&typegroupid=3', '2026-01-01'),
('gov_dec_356', 'legal_obligation', 'DEC-356-2025-NDCP', 'Nghị định số 356/2025/NĐ-CP quy định chi tiết Luật Bảo vệ dữ liệu cá nhân', 'active', '2026.01', 'Hướng dẫn chi tiết hồ sơ đánh giá tác động xử lý dữ liệu cá nhân, bằng chứng đồng ý, rút lại sự đồng ý và kiểm soát truy cập nội bộ.', 'https://vanban.chinhphu.vn/?pageid=27160&docid=216387', '2026-01-01'),
('gov_wf_01', 'workflow_def', 'WF-ACC-REQ-01', 'Quy trình tiếp nhận, thẩm định và phê duyệt hồ sơ đăng ký tài khoản', 'active', '2.0', 'Quy trình chuẩn từ xác minh OTP email, kiểm tra hồ sơ đa đơn vị, đối chiếu thông tin người giám hộ đến phê duyệt tạo tài khoản.', 'Quy chế Quản trị Thành viên Sky First Network', '2026-01-01'),
('gov_wf_02', 'workflow_def', 'WF-EVENT-SK-01', 'Quy trình thẩm định, phê duyệt, công bố và mở đăng ký sự kiện Sky First', 'active', '1.0', 'Tách bạch 3 quyết định độc lập: Phê duyệt chủ trương/nội dung, Công bố thông tin chính thức và Mở cổng đăng ký tham gia.', 'Quy chế Hoạt động & Sự kiện Sky First Network', '2026-01-01'),
('gov_sod_01', 'sod_rule', 'SOD-APPROVAL-01', 'Quy tắc phân tách nhiệm vụ: Không tự phê duyệt hồ sơ do chính mình đề xuất', 'active', '1.0', 'Người tạo yêu cầu thay đổi quy trình, hồ sơ sự kiện hoặc khoản mục ngân sách không được tự phê duyệt trực tiếp.', 'Khung Kiểm soát Nội bộ Sky First', '2026-01-01'),
('gov_kn_01', 'knowledge_article', 'KN-SLA-2026', 'Hướng dẫn SLA xét duyệt hồ sơ đăng ký tài khoản và xử lý phiếu hỗ trợ', 'active', '1.2', 'Thời gian xử lý tiêu chuẩn cho hồ sơ đăng ký thành viên là từ 60 phút đến 48 giờ; phiếu hỗ trợ khẩn cấp phản hồi trong 4 giờ.', 'Sổ tay Vận hành Trung tâm Nghiệp vụ Số', '2026-01-01'),
('gov_svc_01', 'service_catalog', 'SVC-PORTAL-MAIN', 'Trang Thông Tin Điện Tử Sky First', 'active', '1.0', 'Cổng thông tin chính thức của Mạng lưới Giáo dục và Phát triển Cộng đồng Sky First.', 'https://www.skyfirst.io.vn/', '2026-01-01'),
('gov_svc_02', 'service_catalog', 'SVC-PORTAL-CTT', 'Cổng Thông Tin Số Sky First', 'active', '1.0', 'Nền tảng thông tin, chương trình và tiện ích số thuộc hệ sinh thái Sky First.', 'https://ctt.skyfirst.io.vn/', '2026-01-01'),
('gov_cap_01', 'capability_map', 'CAP-IDENTITY-01', 'Năng lực Quản trị Định danh Số, Thẻ Thành viên & Xác minh QR Độc lập', 'active', '2.0', 'Quản lý vòng đời hồ sơ nhân sự, cấp phát thẻ hai mặt chuẩn in ấn và xác minh QR độc lập không phụ thuộc dịch vụ bên thứ ba.', 'Kiến trúc Nghiệp vụ Sky First', '2026-01-01'),
('gov_sla_01', 'sla_commitment', 'SLA-CORE-01', 'Cam kết chất lượng dịch vụ (SLA) xét duyệt hồ sơ & hỗ trợ kỹ thuật', 'active', '1.0', 'Đảm bảo xét duyệt hồ sơ trong 60 phút đến 48 giờ và lưu vết đầy đủ mọi quyết định điều phối.', 'Khung SLA Nội bộ Sky First', '2026-01-01'),
('gov_csr_01', 'csr_program', 'CSR-COMMUNITY-01', 'Chương trình Trách nhiệm Xã hội & Phát triển Cộng đồng Sky First', 'active', '1.0', 'Theo dõi các sáng kiến giáo dục cộng đồng, tình nguyện và hỗ trợ thanh thiếu niên.', 'Khung Phát triển Bền vững Sky First', '2026-01-01'),
('gov_esd_01', 'esd_program', 'ESD-EDU-2026', 'Chương trình Giáo dục vì Sự phát triển Bền vững (ESD)', 'active', '1.0', 'Tích hợp tiêu chí phát triển bền vững và kỹ năng số trong các hoạt động đào tạo của Mạng lưới.', 'Chương trình ESD Sky First Network', '2026-01-01');

INSERT OR IGNORE INTO schema_version(version) VALUES(17);
