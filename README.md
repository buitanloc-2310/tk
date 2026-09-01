# SFN MEMBER PORTAL — Source v1.0

Đã cấu hình D1:
- Database: `tk`
- Binding: `DB`
- Database ID: `ff630699-cc44-471d-9507-aa94c84468fb`

## Deploy
1. `npm install`
2. `npx wrangler d1 migrations apply tk --remote`
3. `npx wrangler deploy`
4. Mở Workers.dev/domain. Lần đầu hệ thống tự chuyển tới `/setup`.
5. Tạo Super Admin đầu tiên. Sau đó `/setup` tự khóa và domain mở thẳng màn hình đăng nhập.

## Kiến trúc đã dựng
- Không có đăng ký công khai.
- 1 người = 1 hồ sơ gốc + 1 tài khoản.
- N đơn vị, N vai trò, N thẻ.
- Cây tổ chức nhiều cấp: SFN → BCH/Văn phòng/Ban → đơn vị trực thuộc → cơ cấu con.
- RBAC theo Role + Scope + Permission.
- TTCN gồm giới tính, CCCD, thường trú, tạm trú.
- Mục tiêu tuần/tháng/quý/năm; công việc; hoạt động; GCN; thành tích; quá trình công tác; tài liệu; CV; thông báo; hỗ trợ.
- Thẻ điện tử nhiều loại.
- Audit log.
- Pagination server-side cho danh sách thành viên, phù hợp mục tiêu 10.000 tài khoản.
- `schema_version` để nâng cấp về sau không phải dựng lại D1.

## Bảo mật
- PBKDF2-SHA256, 100.000 iterations.
- Admin không thể xem mật khẩu cũ.
- Session HttpOnly + Secure + SameSite=Strict.
- Không đưa CCCD/địa chỉ vào QR công khai.


## UI finalization v1.1
- Logo SFN trên đăng nhập, sidebar và thẻ điện tử.
- Sidebar cuộn độc lập; Đăng xuất luôn nằm cuối.
- Trung tâm hỗ trợ, Thông tin liên hệ, Điều khoản, Bảo mật là liên kết thật.
- Các cổng SFN mở ở tab mới.
- Bổ sung giao diện Điều hành cơ bản cho Super Admin: Thành viên, Cơ cấu tổ chức, Nhật ký.
- Hoàn thiện các trang Hoạt động, Tài liệu, Thông báo và xuất CV bằng Print/Save PDF.
