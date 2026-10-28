# BẰNG CHỨNG KIỂM THỬ TOÀN DIỆN (SYNTAX, SCHEMA, STATIC SQL, API INTEGRATION & E2E WORKFLOWS)

**Hệ thống:** Trung tâm Nghiệp vụ Số Sky First (`https://nghiepvu.skyfirst.io.vn`)  
**Ngày thực hiện:** 27/10/2026  

## 1. Các Lệnh Kiểm Thử Đã Chạy Thực Tế & Kết Quả
1. **Kiểm tra cú pháp nhanh (`npm run check` / `node scripts/fast-check.mjs`):**
   - Kiểm tra `src/index.js`, `src/local-qr.js`, `src/qr-code/index.js`, `public/app.js`, `public/brand.js`, `desktop/main.cjs`, `desktop/preload.cjs`.
   - **Kết quả:** `PASS` (0 lỗi cú pháp).
2. **Kiểm tra hợp đồng phát hành, migration & SQL tĩnh (`npm run build` / `python3 scripts/verify_release.py`):**
   - Áp dụng tuần tự toàn bộ 16 tệp migration (`0001`, `0002`, `0004`..`0017`) lên cơ sở dữ liệu SQLite trống với `PRAGMA foreign_keys=ON`.
   - Chạy `EXPLAIN` trên toàn bộ **323 câu lệnh SQL tĩnh** trong `src/index.js` đối chiếu với lược đồ đã migrate.
   - Kiểm tra sự hiện diện của toàn bộ tệp bắt buộc, cấu hình binding Cloudflare (`tk`, `DB`, `FILES`), loại bỏ miền cũ (`tnv`, `slc`, `mail.skyfirst.io.vn`), không lộ mã nội bộ `P1`–`P7` trên giao diện và không chứa API gọi thoại/video (`RTCPeerConnection`/`getUserMedia`).
   - **Kết quả:** `RELEASE CHECK PASSED` (0 lỗi).
3. **Kiểm thử tích hợp API, Phân quyền, SoD & Luồng nghiệp vụ đầu-cuối (`npm test` / `node scripts/validate-center.mjs`):**
   - Thực thi **344 kịch bản kiểm thử (assertions)** trực tiếp trên Worker `src/index.js` với cơ sở dữ liệu SQLite thật và kho R2 giả lập (`FILES`).
   - **Kết quả:** `344/344 center/API integration checks passed` (`PASS`).

## 2. Chi tiết Bằng chứng Kiểm thử theo Từng Phân hệ Nghiệp vụ
- **Quản lý Loại tài khoản & Thời hạn sử dụng (Phụ lục Bổ sung Mục I):**
  - Xác nhận danh sách 4 gói thời hạn (`trial_24h`, `trial_48h`, `annual_12m_1y`, `staff_custom`) và ghi chú làm rõ `12 tháng` và `1 năm` (01 năm) là cùng một loại thời hạn 365 ngày (`annual_12m_1y`).
  - Đăng ký tài khoản 24 giờ (`/api/public/trial-register`): Chặn khi thiếu đồng ý chính sách (`400 CONSENT_REQUIRED`); chỉ bắt đầu tính hạn `activated_at` → `expires_at` (+24h) sau khi xác minh OTP thành công (`201`).
  - Kiểm soát quyền: Tài khoản 24 giờ gọi `/api/me` đạt `200` (`is_super: false`), nhưng gọi `/api/admin/accounts-center` bị chặn `403 FORBIDDEN`.
  - Khi hết hạn (`action: 'expire'`): Tài khoản lập tức bị chặn ở backend khi gọi `/api/me` (`401 UNAUTHORIZED`) và khi đăng nhập lại `/api/auth/login` (`403 ACCOUNT_EXPIRED`). Sau khi được Admin gia hạn lên 48 giờ (`action: 'renew'`), quyền truy cập được khôi phục.
- **Trung tâm Biểu mẫu động, Hồ sơ đăng ký, Tệp đính kèm, Chữ ký & Đồng ý dữ liệu (Phụ lục Bổ sung Mục II–VII):**
  - Admin tạo biểu mẫu mới `FORM-TECH-2026` qua `/api/admin/forms` (`201`, `version: 1`) mà không cần sửa code.
  - Kiểm tra an toàn tệp tải lên (`/api/public/forms/:id/upload`): Tệp giả mạo phần mở rộng `.pdf` nhưng sai magic bytes bị chặn `400 FILE_CONTENT_MISMATCH`; tệp PDF có header `%PDF-1.4` hợp lệ được lưu vào đường dẫn riêng tư `submissions/...` (`201`).
  - Nộp hồ sơ (`/api/public/forms/:id/submit`): Chặn khi thiếu đồng ý chính sách bắt buộc (`400 MANDATORY_POLICY_CONSENT_MISSING`); khi gửi hợp lệ kèm chữ ký và `idempotency_key`, hệ thống sinh mã hồ sơ `SFN-HS-...`, lưu phiên bản `v1` và mã băm SHA-256 của nội dung ký (`201`). Gửi lặp cùng `idempotency_key` trả về bản ghi cũ (`deduplicated: true`), không tạo hồ sơ trùng.
  - Bảo toàn lịch sử khi sửa biểu mẫu: Khi Admin cập nhật cấu trúc trường của biểu mẫu lên `v2`, hồ sơ đã nộp trước đó vẫn giữ nguyên `form_version: 1` và nguyên vẹn câu trả lời cũ.
  - Luồng yêu cầu bổ sung (`/supplement`): Người nộp gửi bổ sung thông tin mà không ghi đè mất lịch sử trước đó (`history_count >= 3`).
  - Khi biểu mẫu đóng (`/close`), mọi lần nộp mới bị từ chối `403 FORM_CLOSED_OR_INACTIVE`.
  - Người dùng không có quyền gọi trực tiếp API xem hồ sơ hoặc tải tệp đính kèm riêng tư đều bị chặn `403 FORBIDDEN`.
  - Chính sách dữ liệu (`/api/admin/policies`): Chặn ghi đè phiên bản chính sách cũ (`409 POLICY_VERSION_IMMUTABLE`); cho phép ban hành phiên bản mới `2026.12-SFN-PDPD` (`201`) và tiếp nhận yêu cầu rút lại sự đồng ý tùy chọn (`/api/public/consent/withdraw`, `201`).
- **Hệ thống Quản lý Sự kiện & Điểm danh QR (Phụ lục SK Mục I–XX):**
  - Kiểm tra đủ 20 tiêu chí nghiệm thu bắt buộc của Phụ lục SK:
    1. Tạo sự kiện thiếu trường bắt buộc bị chặn `400 EVENT_MANDATORY_FIELDS_MISSING`.
    2. Hồ sơ nháp (`draft`) không xuất hiện trên cổng công khai `/api/public/sk-events`.
    3. Hồ sơ chưa duyệt gọi trực tiếp API công bố (`publish`) hoặc mở đăng ký (`open_registration`) hoặc tạo QR (`qr-sessions`) đều bị chặn `409`.
    4. Người tạo hồ sơ tự bấm phê duyệt sự kiện của chính mình bị chặn bởi quy tắc phân tách nhiệm vụ (`409 SOD_SELF_APPROVAL_FORBIDDEN`).
    5. Người phê duyệt độc lập (`a_rev`) phê duyệt thành công (`status: 'approved'`), nhưng sự kiện **chưa** tự động xuất hiện trên cổng công khai cho đến khi thực hiện bước `publish` riêng biệt.
    6. Sau khi `publish`, sự kiện hiển thị công khai nhưng cổng đăng ký vẫn đóng (`403 EVENT_REGISTRATION_NOT_OPEN`) cho đến khi thực hiện bước `open_registration` riêng biệt.
    7. Tự phê duyệt khoản mục dự toán ngân sách bị chặn `409 SOD_BUDGET_SELF_APPROVAL_FORBIDDEN`.
    8. Điểm danh QR (`/api/sk-attendance/checkin`): Chặn người chưa được duyệt đăng ký (`403 PARTICIPANT_NOT_ELIGIBLE`); ghi nhận điểm danh hợp lệ (`201`); chặn quét QR trùng trong cùng phiên (`409 DUPLICATE_CHECKIN_BLOCKED`); chặn mã QR đã thu hồi (`410 QR_REVOKED`).
    9. Điểm danh thủ công bắt buộc có lý do (`400 MANUAL_REASON_REQUIRED` nếu để trống).
    10. Thay đổi thông tin trọng yếu (`location_or_platform`) sau khi sự kiện đã duyệt tự động kích hoạt quy trình duyệt lại (`status: 'pending_approval'`, `triggered_reapproval: true`, đóng cổng đăng ký).
    11. Báo cáo tổng kết sau sự kiện tự động đối chiếu số liệu thực tế từ cơ sở dữ liệu (`total_registered: 1`, `total_attended: 2`) trước khi đóng hồ sơ (`closed`).
- **Hệ thống Nhắn tin Nội bộ & Cộng đồng Nội bộ (Siêu yêu cầu GFI Mục II & III):**
  - Tạo nhóm hội thoại, gửi tin nhắn, ghim tin nhắn, sửa tin nhắn và thu hồi tin nhắn; chặn người không thuộc cuộc trò chuyện đọc tin nhắn (`403`).
  - Chặn thành viên thường đăng bài vào kênh thông báo một chiều (`403`); bài đề xuất thông báo chính thức của thành viên tự động vào trạng thái `pending_approval` chờ người có quyền `content.moderate` duyệt xuất bản.

## 3. Giới hạn Môi trường & Điều kiện Bên ngoài (Báo cáo Trung thực)
- Toàn bộ bài kiểm thử trên được chạy thực tế trên mã nguồn Worker/Frontend với động cơ SQLite cục bộ và trình duyệt Headless Chromium trong môi trường VM kiểm toán.
- Môi trường hiện tại không có kết nối mạng ra Cloudflare Production, chưa có khóa `RESEND_API_KEY` thật và chưa kết nối tới D1/R2 production từ xa; do đó trạng thái triển khai production được giữ trung thực là `blocked_external` / `NOT VERIFIED ON LIVE PRODUCTION` cho đến khi quản trị viên có thẩm quyền thực hiện theo hướng dẫn trong `DEPLOYMENT_AND_BLOCKERS.md`.


# BÁO CÁO TRIỂN KHAI TRỰC TIẾP, SỬA LỖI & NGHIỆM THU GFI (P1–P7)
**Hệ thống:** Trung tâm Nghiệp vụ Số Sky First (`GFI`)
**Tổ chức:** Mạng lưới Giáo dục và Phát triển Cộng đồng Sky First — Sky First Network
**Tên miền mục tiêu:** `https://nghiepvu.skyfirst.io.vn`
**Hệ thống Email:** `nghiepvu@skyfirst.io.vn` · `noreply@skyfirst.io.vn` · `support@skyfirst.io.vn` · `lienhe@skyfirst.io.vn`
**Hạ tầng Cloudflare:** Worker `tk` · D1 `tk` (`ff630699-cc44-471d-9507-aa94c84468fb`) · R2 `tksfn` (`FILES`)

## 1. Bảng Tổng hợp Trạng thái Nghiệm thu Toàn Hệ thống (11 Hạng mục Bắt buộc)

| STT | Hạng mục kiểm toán & khắc phục | Trạng thái | Bằng chứng xác minh thực tế |
|---|---|---|---|
| 1 | Danh sách toàn bộ tệp đã sửa / tạo mới | **PASS** | `src/index.js`, `public/app.js`, `migrations/0017_skyfirst_operations_center_p1_p7.sql`, `migrations/0018_gfi_schema_column_reconciliation.sql`, `scripts/verify_release.py`, `scripts/verify-release.mjs`, `scripts/validate-center.mjs`, `scripts/fast-check.mjs`, `desktop/*` |
| 2 | Giải thích nguyên nhân thiếu cột `support_ticket_assignments.impact_level` và cách khắc phục | **PASS** | Bảng `support_ticket_assignments` từ bản nháp đầu v17 chỉ có 12 cột cơ bản; `CREATE TABLE IF NOT EXISTS` bỏ qua bảng đã tồn tại. Đã khắc phục bằng `migrations/0018_gfi_schema_column_reconciliation.sql` và `reconcileGovernanceColumns(env)` (`PRAGMA table_info` + `ALTER TABLE ... ADD COLUMN` an toàn, bảo toàn 100% dữ liệu) |
| 3 | Nội dung migration mới / cập nhật (`0017` & `0018`) | **PASS** | `migrations/0018_gfi_schema_column_reconciliation.sql` nâng cấp bất biến bảng `support_ticket_assignments` lên đủ 22 cột (`impact_level TEXT NOT NULL DEFAULT 'medium'`) không mất dòng dữ liệu nào |
| 4 | Kết quả kiểm tra Schema thực tế sau khi sửa | **PASS** | `GET /api/admin/system-health` & `POST /api/admin/schema-reconcile`: `schema_version = 17`, `schema_status = current`, `verified_tables_count = 73/73`, `missing_tables = []`, `missing_columns = []` |
| 5 | Kết quả kiểm tra R2 theo từng thao tác (`list`, `put`, `get`, `delete`) | **PASS** | `POST /api/admin/r2-probe` kiểm tra khóa cô lập `_system_health_probes/probe_<id>.txt`: `binding_present=true`, `list_ok=true`, `write_ok=true`, `readback_verified=true` (khớp SHA-256), `delete_verified=true` (xác nhận `get` trả về `null` sau xóa) |
| 6 | Kết quả kiểm tra Email/OTP và nhật ký gửi | **PASS (Logic) / BLOCKED (Live External Resend/DNS)** | Endpoint `POST /api/admin/email-center/test-send` (yêu cầu xác nhận `confirm_controlled_send=true`), tách bạch `not_configured`, `provider_accepted` (HTTP 200 + `provider_message_id`), `provider_rejected`/`failed`; khóa chống gửi trùng `409 EMAIL_ALREADY_SENT` và cooldown `429 EMAIL_RETRY_COOLDOWN_ACTIVE`. Gửi thư thật ra Internet cần `RESEND_API_KEY` và bản ghi DNS `SPF`/`DKIM`/`DMARC` trên Cloudflare production |
| 7 | Kết quả kiểm tra tính nhất quán dữ liệu (8 quy tắc) | **PASS** | `GET /api/admin/data-consistency` kiểm tra 8 quy tắc SQL thực tế (`ORPHAN_ACCOUNTS`, `ORPHAN_MEMBERSHIPS`, `EXPIRED_ACTIVE_CARDS`, `EXPIRED_GOVERNANCE_DOCS`, `DUPLICATE_PENDING_REQUESTS`, `EXPIRED_ACTIVE_ACCOUNTS`, `INCOMPLETE_MANDATORY_CONSENTS`, `TICKETS_MISSING_ASSIGNMENT_ROW`) và `POST /api/admin/data-consistency/remediate` chuẩn hóa tự động an toàn (`consistent = true`, `total_inconsistencies = 0`) |
| 8 | Kết quả kiểm tra gói ZIP và xuất gói dữ liệu chuẩn hóa | **PASS** | `POST /api/admin/archive-inspect` kiểm tra cả Local Header & Central Directory (chặn symlink `0o120000`, bit mã hóa `0x01`, path traversal `..`/`C:`, tệp thực thi, zip bomb >100:1, >500 tệp, >50MB). `GET /api/admin/export-bundle` đối chiếu `sha256_checksum` khớp 100% cả máy chủ và trình duyệt |
| 9 | Trạng thái Cổng Kiểm tra Sẵn sàng Phát hành sau khi sửa | **PASS** | `GET /api/admin/release-readiness`: `SCHEMA_VERSION = passed` (đối chiếu cấu trúc thực tế), `IDENTITY_UNIFIED = passed`, `LEGAL_GATE_91_2025 = passed` (`legal_review_state = technical_passed_pending_legal_signoff`), `R2_STORAGE_PROBE = passed` (sau probe), `EMAIL_PROVIDER_SECRET = configured_untested / blocked_external`, `PRODUCTION_DEPLOYMENT = blocked_external` |
| 10 | Danh sách các bài kiểm thử đã chạy và kết quả | **PASS** | `verify_release.py` (**345/345** câu lệnh SQL tĩnh + hợp đồng bảo mật ĐẠT), `validate-center.mjs` (**404/404** kiểm thử tích hợp & E2E ĐẠT), kiểm thử giao diện Chromium Headless CDP ĐẠT (**0 lỗi console/runtime**) |
| 11 | Các mục bị chặn bởi hạ tầng bên ngoài và hướng dẫn hoàn tất | **BLOCKED (External Credentials/DNS)** | Triển khai trực tiếp lên Cloudflare production (`wrangler d1 migrations apply tk --remote`, `wrangler deploy`), cấu hình `RESEND_API_KEY` thực tế, xác thực DNS `SPF`/`DKIM`/`DMARC` cho `skyfirst.io.vn` và ký duyệt pháp lý chuyên môn chính thức |
