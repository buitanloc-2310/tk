# CỔNG THÀNH VIÊN SKY FIRST NETWORK — FINAL

Hệ thống nội bộ của **Mạng lưới Giáo dục & Phát triển Cộng đồng Sky First (SFN)**.

## Hạ tầng đã cấu hình
- Worker: `sfn-member-portal`
- Domain: `https://member.skyfirst.io.vn`
- D1 binding: `DB`
- D1 database: `tk`
- D1 ID: `ff630699-cc44-471d-9507-aa94c84468fb`
- R2 binding: `FILES`
- R2 bucket: `tksfn`
- R2 endpoint tham chiếu: `https://c103550d080263ea83d53c458df48170.r2.cloudflarestorage.com/tksfn`

## Điểm chốt của bản này
- Tên hiển thị thống nhất: **CỔNG THÀNH VIÊN SKY FIRST NETWORK**.
- Tài khoản setup đầu tiên là **SUPER_ADMIN hệ thống**, `is_member=0`, không tự động bị tính là thành viên SFN.
- Danh sách Thành viên chỉ lấy `is_member=1`.
- Trang đăng nhập có **YÊU CẦU CẤP TÀI KHOẢN** và **TRA CỨU YÊU CẦU**.
- Yêu cầu cấp tài khoản bắt buộc đầy đủ 100% TTCN: họ tên, tên hiển thị, ngày sinh, giới tính, quốc tịch, CCCD/định danh, ngày/nơi cấp, email, điện thoại, thường trú, tạm trú/nơi ở hiện tại, tên đăng nhập mong muốn và ảnh đại diện.
- Ảnh được nén phía trình duyệt thành WebP (tối đa cạnh 640 px, chất lượng ~78%) trước khi upload R2; Worker từ chối file ảnh sau nén > 900 KB.
- Sau khi gửi, hệ thống cấp mã yêu cầu và thông báo thời gian dự kiến kiểm tra 12–24 giờ, có thể sớm/trễ hơn tùy lưu lượng và khối lượng công việc; người gửi có thể tra cứu trạng thái bằng mã + email.
- Admin có màn hình phê duyệt/từ chối yêu cầu. Khi duyệt, hệ thống tạo hồ sơ thành viên + account MEMBER + mật khẩu tạm và bắt đổi mật khẩu.
- Upload avatar trực tiếp lên R2.
- Admin cấp GCN có thể upload PDF trực tiếp lên R2 (`certificates/...`) hoặc dùng URL ngoài; PDF tối đa 10 MB.
- Thẻ điện tử, xác minh công khai, CV, chứng nhận, thành tích, lịch sử công tác, tài liệu, phân quyền ROLE + SCOPE + PERMISSION giữ nguyên.
- QR/xác minh công khai không trả CCCD, địa chỉ, email hoặc số điện thoại.

## Email phê duyệt
Hệ thống đã có luồng phê duyệt và trạng thái yêu cầu. **Không giả lập gửi email**: Cloudflare Worker này chưa có dịch vụ gửi email outbound/API email được cấp credential. Sau khi duyệt, màn hình quản trị trả tên đăng nhập để quản trị viên gửi thông tin tài khoản qua email chính thức. Khi cấu hình dịch vụ email outbound sau này có thể nối vào luồng này mà không đổi schema yêu cầu.

## Nâng cấp D1 hiện có
Không chạy lại `0001_initial.sql` thủ công. Wrangler sẽ chỉ áp dụng migration chưa chạy:

```bash
npx wrangler d1 migrations apply tk --remote
npx wrangler deploy
```

Migration mới của bản này: `0004_account_requests_r2.sql`.

## R2
`wrangler.jsonc` đã có:

```json
"r2_buckets": [
  { "binding": "FILES", "bucket_name": "tksfn" }
]
```

File được phục vụ qua Worker tại `/files/<object-key>`, vì vậy không cần biến S3 API endpoint thành URL công khai.

## Kiểm tra trước khi đóng gói
- `node --check src/index.js`
- `node --check public/app.js`
- parse `wrangler.jsonc`
- chạy tuần tự migration 0001 → 0004 trên SQLite sạch
