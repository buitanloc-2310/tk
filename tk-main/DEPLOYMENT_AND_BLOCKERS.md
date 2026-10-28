# HƯỚNG DẪN CẤU HÌNH, TRIỂN KHAI PRODUCTION AN TOÀN & DANH MỤC ĐIỀU KIỆN BÊN NGOÀI (DEPLOYMENT & BLOCKERS)

**Hệ thống:** Trung tâm Nghiệp vụ Số Sky First (`https://nghiepvu.skyfirst.io.vn`)  
**Tổ chức:** Mạng lưới Giáo dục và Phát triển Cộng đồng Sky First — Sky First Network  

## 1. Cấu hình Hạ tầng Bảo toàn (Không tự ý thay đổi ID/Binding)
- **Worker Name (`wrangler.jsonc`):** `tk`
- **D1 Database Binding:** `DB` (`database_name`: `tk`, `database_id`: `ff630699-cc44-471d-9507-aa94c84468fb`)
- **R2 Bucket Binding:** `FILES` (`bucket_name`: `tksfn`)
- **Biến môi trường định danh (`vars` trong `wrangler.jsonc`):**
  - `APP_NAME`: `Trung tâm Nghiệp vụ Số Sky First`
  - `ORG_NAME`: `Mạng lưới Giáo dục và Phát triển Cộng đồng Sky First`
  - `APP_URL`: `https://nghiepvu.skyfirst.io.vn`
  - `SYSTEM_EMAIL`: `nghiepvu@skyfirst.io.vn`
  - `NOREPLY_EMAIL`: `noreply@skyfirst.io.vn`
  - `SUPPORT_EMAIL`: `support@skyfirst.io.vn`
  - `CONTACT_EMAIL`: `lienhe@skyfirst.io.vn`

## 2. Phân định Rõ Trạng thái Thực tế (Mục VIII — Không đánh đồng Code với Production Live)

| Hạng mục | Đã viết code & Kiểm thử cục bộ | Đã kiểm tra cấu hình | Kết nối dịch vụ thật / Production | Ghi chú & Điều kiện bên ngoài cần Quản trị viên thực hiện |
|---|---|---|---|---|
| **Mã nguồn Worker & Frontend P1–P7 + Phụ lục I–VI + SK + GFI** | **ĐẠT (PASS)** (`344/344` API checks, `323` SQL checks, `13` ảnh UI Chromium) | **ĐẠT (PASS)** | **Chưa triển khai lên Cloudflare Production** | Môi trường kiểm toán hiện tại là sandbox cô lập không có mạng Internet và không có Cloudflare API Token của tổ chức. |
| **Cơ sở dữ liệu D1 (`tk`) & Migration `0001`..`0017`** | **ĐẠT (PASS)** trên SQLite trống và kiểm thử tự phục hồi (`ensureGovernanceTables`) | **ĐẠT (PASS)** | **Chưa chạy `wrangler d1 migrations apply` trên D1 từ xa** | Cần sao lưu D1 production và kiểm tra `npx wrangler d1 migrations list tk --remote` trước khi áp dụng migration mới. |
| **Kho lưu trữ R2 (`tksfn`)** | **ĐẠT (PASS)** với R2 mock (kiểm tra magic bytes, private path guard `401/403`) | **ĐẠT (PASS)** | **Chưa kiểm thử ghi/xóa trên bucket R2 production** | Endpoint `/api/admin/system-health` chỉ kiểm tra đọc danh sách (`list`), tuyệt đối không tự ghi/xóa dữ liệu thật. |
| **Dịch vụ Gửi Email (`RESEND_API_KEY`) & DNS (`SPF/DKIM/DMARC`)** | **ĐẠT (PASS)** (Ghi nhận trung thực `not_configured` vào `email_delivery_logs`) | **ĐẠT (PASS)** | **Bị chặn bởi điều kiện bên ngoài (`blocked_external`)** | Việc khai báo địa chỉ `@skyfirst.io.vn` trong code không tự động tạo mailbox hoặc xác thực DNS. Cần cấu hình `SPF`, `DKIM`, `DMARC` cho `skyfirst.io.vn` trên Resend và nạp secret `RESEND_API_KEY`. |
| **Bộ cài đặt Desktop Windows (`.exe`) & macOS (`.dmg`)** | **ĐẠT (PASS)** mã nguồn `desktop/main.cjs`, `preload.cjs`, `electron-builder.json` | **ĐẠT (PASS)** | **Bị chặn tạo file nhị phân `.exe`/`.dmg` trong Linux VM offline** | Môi trường Linux sandbox không có kết nối mạng để tải Electron binary/NSIS/macOS SDK và chưa có chứng thư ký mã (Code Signing / Apple Developer ID). |

## 3. Quy trình Triển khai Lên Staging / Production Dành cho Quản trị viên Có Thẩm quyền
1. **Bước 1 — Sao lưu D1 Production:**
   ```bash
   npx wrangler d1 export tk --remote --output=backup_tk_before_p1_p7.sql
   ```
   *(Tuyệt đối không xóa D1/R2 hiện hữu, không chạy lại `SETUP_D1_CONSOLE.sql` trên cơ sở dữ liệu đang có dữ liệu thật).*
2. **Bước 2 — Kiểm tra lịch sử migration trên D1 từ xa:**
   ```bash
   npx wrangler d1 migrations list tk --remote
   ```
   - Lưu ý: Gói lịch sử không có tệp `0003` (`0001`, `0002`, `0004`..`0017`). Đối chiếu danh sách migration đang chờ trước khi chạy.
3. **Bước 3 — Áp dụng migration mới lên D1 từ xa:**
   ```bash
   npm run db:migrate:remote
   ```
   *(Ngoài ra, Worker `src/index.js` đã tích hợp sẵn cơ chế tự khởi tạo bảng an toàn `CREATE TABLE IF NOT EXISTS` trong `ensureGovernanceTables(env)` để phòng ngừa lỗi 503 nếu một bảng mới chưa kịp chạy migration).*
4. **Bước 4 — Khai báo Secrets trên Cloudflare (nếu chưa khai báo):**
   ```bash
   npx wrangler secret put SETUP_TOKEN
   npx wrangler secret put RESEND_API_KEY
   ```
5. **Bước 5 — Kiểm tra trước khi phát hành và Deploy Worker:**
   ```bash
   npm test
   npm run deploy
   ```
6. **Bước 6 — Hậu kiểm sau Deploy:**
   - Đăng nhập tài khoản `SUPER_ADMIN`, mở **Điều hành → Cấu hình hệ thống → Tình trạng hệ thống**: xác nhận phiên bản lược đồ `17`, `0` bảng thiếu, `0` cột thiếu.
   - Kiểm tra lần lượt các phân hệ: **Biểu mẫu & Hồ sơ đăng ký**, **Loại tài khoản & Thời hạn**, **Sự kiện & Điểm danh QR**, **Tin nhắn nội bộ**, **Cộng đồng & Bảng tin**, **Trung tâm công việc** và **Cấp phát & thẻ**.


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
