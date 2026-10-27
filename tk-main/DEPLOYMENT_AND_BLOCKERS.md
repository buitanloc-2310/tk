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
