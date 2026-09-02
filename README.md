# CỔNG THÀNH VIÊN SKY FIRST NETWORK — OFFICIAL

Bản chính thức dùng:
- D1: `tk` — `ff630699-cc44-471d-9507-aa94c84468fb`
- R2: `tksfn` — binding `FILES`
- Domain: `https://member.skyfirst.io.vn`

## Kiến trúc tài khoản
- Super Admin là **tài khoản quản trị hệ thống**, không tự động là Thành viên SFN.
- Bảng `people` vẫn chứa hồ sơ định danh kỹ thuật cho mọi tài khoản vì `accounts.person_id` là khóa bắt buộc của schema hiện hữu.
- Một người chỉ xuất hiện trong danh sách **Thành viên** khi tài khoản có role `MEMBER`.
- Quyền quản trị theo `ROLE + SCOPE + PERMISSION`. `SCOPE_ADMIN` chỉ truy cập thành viên thuộc node được giao và các node con.

## Yêu cầu cấp tài khoản
Người chưa có tài khoản có thể gửi yêu cầu tại trang đăng nhập. Tất cả trường TTCN và ảnh đại diện đều bắt buộc. Ảnh được nén WebP phía trình duyệt trước khi lưu vào R2. Sau khi gửi, hệ thống cấp mã tra cứu và thông báo thời gian dự kiến 12–24 giờ (có thể sớm/trễ hơn tùy khối lượng công việc). Việc gửi email tự động không được giả lập khi chưa cấu hình dịch vụ gửi mail.

## GCN và R2
Admin có thể upload PDF GCN trực tiếp lên R2 `tksfn` (tối đa 10 MB/file) hoặc dùng URL ngoài. Metadata + mã xác minh được lưu D1; GCN cấp xong xuất hiện trong tài khoản thành viên.

## Triển khai
Nếu D1 hiện tại đã có dữ liệu, **không chạy lại 0001 thủ công**. Khi dùng Wrangler migrations, chỉ chạy:

```bash
npx wrangler d1 migrations apply tk --remote
npx wrangler deploy
```

Các migration dùng `IF NOT EXISTS`/`INSERT OR IGNORE` để giữ dữ liệu hiện có. `0005_official_permissions_scope.sql` bổ sung quyền cho Network Admin/Scoped Admin và không xóa tài khoản Super Admin.

## Kiểm tra sau deploy
1. Đăng nhập Super Admin cũ.
2. Mở Yêu cầu cấp tài khoản.
3. Gửi thử một yêu cầu → duyệt → đăng nhập bằng tài khoản thành viên mới.
4. Mở hồ sơ thành viên → cấp thẻ → xác minh.
5. Cấp GCN + upload PDF → kiểm tra GCN xuất hiện trong tài khoản thành viên.
6. Upload/đổi avatar → kiểm tra WebP trên R2.
