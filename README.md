# SFN MEMBER PORTAL — FINAL RELEASE

**Domain dự kiến:** https://member.skyfirst.io.vn  
**D1:** `tk`  
**Database ID:** `ff630699-cc44-471d-9507-aa94c84468fb`

## Bản này đã hoàn thiện
- Logo SFN thật ở login, setup, sidebar, thẻ, CV và trang công khai.
- Không đăng ký công khai; setup chỉ dùng lần đầu.
- Hồ sơ thành viên có chỉnh sửa TTCN, CCCD, giới tính, thường trú, tạm trú.
- Cây tổ chức động nhiều cấp đúng mô hình Mạng lưới.
- Quản trị thành viên: mở từng hồ sơ, cập nhật hồ sơ, vai trò/đơn vị, thành tích, tài liệu, thẻ, tài khoản, phân quyền.
- **Cấp GCN trực tiếp cho thành viên:** cấp xong xuất hiện ngay trong tài khoản của người đó.
- Quản trị reset mật khẩu, khóa/mở tài khoản; không thể xem mật khẩu hiện tại.
- Ví thẻ điện tử nhiều loại, giao diện nhận diện SFN, trang xác minh công khai an toàn.
- CV/Hồ sơ năng lực đẹp với 3 phong cách, lựa chọn CCCD/thường trú/tạm trú trước khi xuất PDF.
- Hoạt động, GCN, thành tích, quá trình công tác, tài liệu, thông báo, hỗ trợ.
- Support/contact/legal hoạt động và đúng thông tin SFN.
- Các cổng SFN là hyperlink mở tab mới.
- Server-side pagination cho danh sách thành viên.
- Audit log và ROLE + SCOPE + PERMISSION.

## Liên hệ chuẩn
- Website: https://www.skyfirst.io.vn
- Cổng Thông tin: https://ctt.skyfirst.io.vn
- Cổng Tình nguyện viên: https://tnv.skyfirst.io.vn
- Cổng Học liệu & Học thuật: https://academic.skyfirst.io.vn
- Email liên hệ: skyfirst.ec@gmail.com
- Email hỗ trợ: hotro.sfn@gmail.com
- Điện thoại/Zalo: 0924 910 210

## Deploy
Nếu D1 `tk` đang có tài khoản Super Admin và migration `0001_initial.sql` đã chạy, **không chạy lại 0001**.

Chạy migration mới an toàn:
```bash
npx wrangler d1 migrations apply tk --remote
```

Sau đó deploy:
```bash
npx wrangler deploy
```

Migration `0002_final_release.sql` chỉ bảo đảm permission/card type mặc định và schema version; không xóa dữ liệu hiện có.

## Lưu ý file GCN
Bản này cho quản trị nhập **đường dẫn PDF GCN** để hiển thị trong tài khoản thành viên. Chưa cấu hình R2 riêng cho Member Portal, vì chưa có bucket/binding được cung cấp. Khi có R2, có thể bổ sung upload file trực tiếp mà không thay cấu trúc D1.
