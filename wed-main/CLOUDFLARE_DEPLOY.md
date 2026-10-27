# Hướng Dẫn Triển Khai, Vận Hành & Khôi Phục — Sky First Network (Cloudflare Pages + D1 + R2)

## 1. Cấu hình Bindings chính thức trên Cloudflare Pages (`wrangler.jsonc`)
Dự án giữ nguyên định danh tài nguyên trên Cloudflare theo `wrangler.jsonc`:
- **Cloudflare Pages Project**: `wed`
- **D1 Database Binding**: `DB` → database `wed` (`database_id`: `942c7ed9-fd5e-458c-a71f-977269a4ec34`)
- **R2 Bucket Binding**: `MEDIA` → bucket `wed`
- **Build Command**: `npm run build` | **Build Output Directory**: `dist`
- **Biến môi trường (Secrets / Environment Variables)**:
  - `FIREBASE_PROJECT_ID`: `skyfirstnetwork`
  - `FIREBASE_SERVICE_ACCOUNT_JSON` *(Secret)*: JSON Service Account của Firebase để tạo/đặt lại mật khẩu quản trị viên từ máy chủ.
  - `RESEND_API_KEY` *(Secret, tùy chọn)*: Khóa API dịch vụ gửi thư Resend. Nếu chưa cấu hình, mọi biểu mẫu vẫn lưu bình thường và thư được xếp hàng an toàn ở trạng thái `unconfigured` trong `website_email_outbox`.
  - `MAIL_FROM` *(Tùy chọn)*: Địa chỉ gửi thư định danh, ví dụ `Sky First Network <support@skyfirst.io.vn>`.

## 2. Chạy Migration D1 (An toàn trên cả DB mới và DB `wed` đang vận hành)
Tất cả các câu lệnh SQL trong `migrations/` đều sử dụng `CREATE TABLE IF NOT EXISTS` và `CREATE INDEX IF NOT EXISTS`, tuyệt đối không có `DROP TABLE` hay `TRUNCATE`. Ngoài ra, các hàm `ensure()` trong `functions/api/*` tự động kiểm tra `PRAGMA table_info(...)` và chạy `ALTER TABLE ... ADD COLUMN` cho các bảng đã tồn tại từ phiên bản cũ (`0010`–`0014`) trước khi tạo chỉ mục mới.

*(Chỉ thực hiện trên môi trường thật sau khi quản trị viên phê duyệt và đã tạo bản sao lưu)*:
```bash
# Áp dụng trên môi trường thử nghiệm cục bộ trước:
npx wrangler d1 execute wed --local --file=./migrations/0001_initial_schema.sql
npx wrangler d1 execute wed --local --file=./migrations/0002_system_automation_analytics.sql

# Khi đã được phê duyệt áp dụng lên D1 remote (`wed`):
npx wrangler d1 execute wed --remote --file=./migrations/0001_initial_schema.sql
npx wrangler d1 execute wed --remote --file=./migrations/0002_system_automation_analytics.sql
```

## 3. Triển khai lên Cloudflare Pages (`wed`)
```bash
npm ci
npm run build
npx wrangler pages deploy dist --project-name=wed
```

## 4. Quy trình Sao lưu & Khôi phục (Rollback)
1. **Sao lưu trực tiếp trong Admin**:
   - Mở `/admin` → **Trung tâm Cấu hình** → tab **Sao Lưu & Khôi Phục**.
   - Bấm **+ Tạo bản sao lưu ngay**: Hệ thống xuất toàn bộ `website_cms_documents`, `website_forms`, `website_admin_records` kèm mã băm toàn vẹn **SHA-256** vào bảng `website_backups`.
2. **Khôi phục an toàn (Rollback)**:
   - Chọn bản sao lưu muốn khôi phục trong danh sách → nhập chính xác cụm từ xác nhận `KHOI_PHUC_DU_LIEU`.
   - Hệ thống kiểm tra mã băm SHA-256, **tự động tạo một bản sao lưu dự phòng của trạng thái hiện tại (`pre_restore_auto`)**, sau đó khôi phục dữ liệu và ghi nhật ký vào `website_admin_audit`.
