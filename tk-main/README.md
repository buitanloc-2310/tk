# TRUNG TÂM NGHIỆP VỤ SỐ SKY FIRST — PHIÊN BẢN TÍCH HỢP TOÀN DIỆN P1–P7

Hệ thống quản trị nghiệp vụ, hồ sơ số, thẻ xác minh, quy trình và tuân thủ của **Mạng lưới Giáo dục và Phát triển Cộng đồng Sky First** trên hạ tầng Cloudflare Workers + D1 + R2.

## 1. Danh tính chính thức của hệ thống
- **Tên hệ thống:** Trung tâm Nghiệp vụ Số Sky First
- **Tên tổ chức:** Mạng lưới Giáo dục và Phát triển Cộng đồng Sky First
- **Domain mục tiêu:** `https://nghiepvu.skyfirst.io.vn`
- **Email hệ thống:** `nghiepvu@skyfirst.io.vn`
- **Email gửi tự động:** `noreply@skyfirst.io.vn`
- **Email hỗ trợ:** `support@skyfirst.io.vn`
- **Email liên hệ:** `lienhe@skyfirst.io.vn`

## 2. Hạ tầng kỹ thuật bảo toàn (Không tự ý thay đổi ID/Binding)
- **Worker name (`wrangler.jsonc`):** `tk`
- **D1 binding:** `DB` (`database_name`: `tk`, `database_id`: `ff630699-cc44-471d-9507-aa94c84468fb`)
- **R2 binding:** `FILES` (`bucket_name`: `tksfn`)
- **Thuật toán băm mật khẩu:** PBKDF2-SHA256 (`100000` vòng lặp)
- **Phiên bản lược đồ mục tiêu:** Schema Version `17` (tương thích ngược với Schema Version `16`)

> **Cảnh báo an toàn dữ liệu & triển khai:**
> - Không xóa D1/R2 hiện hữu, không chạy lại `SETUP_D1_CONSOLE.sql` hay `0001_initial.sql` trên database đang có dữ liệu thật.
> - Trước khi gắn hoặc triển khai lên domain `https://nghiepvu.skyfirst.io.vn`, người có thẩm quyền phải xác nhận rõ trên Cloudflare Dashboard xem Worker `tk` và D1 `tk` đang phục vụ cổng cũ (`member.skyfirst.io.vn`) chuyển đổi sang `nghiepvu.skyfirst.io.vn` hay là tài nguyên tách biệt.
> - Việc cập nhật địa chỉ email gửi trong mã nguồn không đồng nghĩa với việc đã tạo mailbox/alias hoặc cấu hình bản ghi DNS (`SPF`, `DKIM`, `DMARC`) trên nhà cung cấp dịch vụ email.

## 3. Các nâng cấp trọng tâm trong bản P1–P7
1. **Nhận diện & Email chuẩn hóa (Mục 2 & IX):**
   - Toàn bộ tiêu đề, giao diện công khai (`index.html`, `contact.html`, `privacy.html`, `terms.html`, `support.html`, `setup.html`, `verify.html`), `brand.js`, `app.js`, footer CV và mẫu email HTML (`SkyFirst_Email_Preview_NoLogo.html` + `memberEmailHtml`) được cập nhật sang **Trung tâm Nghiệp vụ Số Sky First** và `https://nghiepvu.skyfirst.io.vn`.
   - Tách bạch rõ `noreply@skyfirst.io.vn` (gửi tự động), `nghiepvu@skyfirst.io.vn` (email hệ thống), `support@skyfirst.io.vn` (hỗ trợ/reply-to) và `lienhe@skyfirst.io.vn` (liên hệ chung).
2. **Hệ thống OTP Email & Nhật ký Gửi thư Thực chất (P6.19, P6.20, P6.44, Mục 13.2):**
   - Endpoint `POST /api/public/email-otp/request` và `POST /api/public/email-otp/verify`.
   - Mã OTP 6 chữ số chỉ lưu bản băm SHA-256 (`otp_hash`) trong bảng `email_otp_tokens`, thời hạn 10 phút, dùng 1 lần (`used_at`), giới hạn tối đa 5 lần nhập sai (`max_attempts`), thời gian chờ gửi lại 60 giây và giới hạn tần suất theo IP/Email.
   - Bảng `email_delivery_logs` lưu trạng thái thực tế từ nhà cung cấp (`sent`, `failed`, `not_configured`); tuyệt đối không báo gửi thành công giả khi thiếu `RESEND_API_KEY` hoặc khi API trả lỗi.
3. **Cổng Kiểm soát Pháp lý & Dữ liệu Cá nhân (Mục 11, P6.04, P6.49, P6.50):**
   - Đối chiếu [Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15](https://chinhphu.vn/?pageid=27160&docid=214590&classid=1&typegroupid=3) và [Nghị định số 356/2025/NĐ-CP](https://vanban.chinhphu.vn/?pageid=27160&docid=216387) (cùng có hiệu lực từ 01/01/2026).
   - Tách bạch 3 nhóm xác nhận trong luồng đăng ký và lưu bằng chứng vào bảng `legal_consent_records`: (1) Xác nhận đã đọc thông báo bảo mật, (2) Chấp thuận Điều khoản sử dụng, (3) Đồng ý xử lý dữ liệu cá nhân theo mục đích cụ thể & cam kết tính chính xác.
   - Phân biệt rõ xác nhận checkbox/OTP với chữ ký điện tử; kiểm soát thông tin người giám hộ đối với người dưới 18 tuổi và tự động xóa số định danh người giám hộ khỏi bảng mở rộng sau khi phê duyệt.
4. **Hợp nhất Năng lực Quản trị Quy trình (P4), Tri thức (P5), Hệ thống (P6) & Nghiệp vụ Chuyên sâu (P7) vào Một Admin Duy Nhất:**
   - Hoàn thiện luồng xử lý phiếu hỗ trợ nghiệp vụ (`GET /api/me/support`, `GET /api/admin/support-tickets`, `PATCH /api/admin/support-tickets/:id`) kèm theo dõi SLA và kết quả giải quyết (P7.09, P7.17).
   - Bổ sung động cơ quản trị hợp nhất (`/api/admin/governance/overview`, `/api/admin/governance/registry`) tích hợp trực tiếp vào `Trung tâm công việc`, `Báo cáo & thống kê` và `Cấu hình hệ thống` trong Admin gốc: kiểm soát phân tách nhiệm vụ (SoD), phát hiện bất thường nghiệp vụ (>48h chờ duyệt, hồ sơ thiếu dữ liệu, thẻ hết hạn), quản lý lịch sử phiên bản cấu hình (`system_config_history`), sổ đăng ký pháp lý, danh mục cổng dịch vụ, khung CSR/ESD (đánh dấu cổng xác nhận định nghĩa ESD của SFN), kiểm tra an toàn gói nén ZIP (`/api/admin/archive-inspect`) và cổng kiểm tra trước phát hành (`/api/admin/release-readiness`).

## 4. Kiểm thử & Triển khai An toàn

### Chạy kiểm thử cục bộ
```bash
npm run build
npm test
```
(`scripts/validate-center.mjs` hỗ trợ tự động cả Node ≥ 22 `node:sqlite` lẫn cầu nối SQLite trên Node 18+).

### Quy trình triển khai lên Staging / Production (Chỉ thực hiện khi có quyền)
1. **Sao lưu D1:** Xuất bản sao lưu D1 hiện tại trước khi chạy bất kỳ thay đổi nào.
2. **Kiểm tra lịch sử migration từ xa:**
   ```bash
   npx wrangler d1 migrations list tk --remote
   ```
   Đối chiếu danh sách migration (`0001`, `0002`, `0004`..`0017`). Không chạy lại migration cũ đã áp dụng.
3. **Áp dụng migration mới:**
   ```bash
   npx wrangler d1 migrations apply tk --remote
   ```
4. **Cấu hình Secrets:**
   ```bash
   npx wrangler secret put SETUP_TOKEN
   npx wrangler secret put RESEND_API_KEY
   ```
5. **Deploy Worker:**
   ```bash
   npx wrangler deploy
   ```
