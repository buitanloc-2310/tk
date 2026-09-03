# Release 2.0.0 — Long-term Final

Ngày đóng gói: 2026-09-03.

Các lỗi trọng yếu được xử lý trong release này:
- Đồng bộ API CV thành viên (`/api/me/cv`).
- Đồng bộ API thẻ (`/api/me/cards`) và quá trình công tác (`/api/me/history`).
- Sửa cập nhật hồ sơ thành viên dùng đúng `/api/me`.
- Đưa route chỉnh sửa/ngừng/ẩn/hiện membership ra đúng scope backend, không còn route unreachable.
- Bổ sung lifecycle thật cho goal/task/activity/certificate/achievement/card/document/scope và nút tương ứng ở Admin Member Detail.
- Bổ sung route duyệt/từ chối GCN ngoài hệ thống.
- Ẩn hoạt động/thành tích/tài liệu đã ẩn khỏi giao diện thành viên.
- Bổ sung `account_request_profiles` bằng migration 0008 để lưu học tập/công tác của đơn đăng ký mà không ALTER bảng production cũ.
- Cache-bust app.js/styles.css trong index để giảm khả năng trình duyệt giữ frontend cũ sau deploy.
- Thêm script kiểm tra release và cảnh báo không chạy bootstrap SQL cũ trên production.

Release đã qua:
- `node --check public/app.js`
- `node --check src/index.js`
- áp dụng toàn bộ migrations lên SQLite trống
- compile/EXPLAIN 144 SQL statement tĩnh từ Worker trên schema sau migration
- kiểm tra binding D1/R2/Worker trong `wrangler.jsonc`
- kiểm tra các endpoint CV/history/cards và route lifecycle trọng yếu.

Lưu ý: kiểm tra local/static không thể thay thế smoke test trên Cloudflare production với dữ liệu thật. Sau deploy, dùng checklist trong README để test một hồ sơ thử trước khi vận hành rộng.


## v2 hotfix — Account requests
- Tự tạo bảng phụ `account_request_profiles` nếu production D1 chưa chạy migration 0008.
- Sửa lỗi `REQUEST_FAILED` tại trang Yêu cầu cấp tài khoản.
- Áp dụng self-heal cho gửi yêu cầu công khai, danh sách quản trị và thao tác duyệt/từ chối/yêu cầu bổ sung.
