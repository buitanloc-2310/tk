# SKY FIRST MEMBER CENTER — RÀ SOÁT VÀ KHẮC PHỤC V10

**Ngày:** 09/10/2026  
**Phạm vi:** mã nguồn được đóng gói trong bản ZIP; kiểm thử cục bộ.  
**Trạng thái production:** chưa triển khai và chưa xác minh trực tiếp trên Cloudflare production.

## 1. Kết luận nguyên nhân

Ảnh quản trị do người dùng cung cấp hiển thị **phiên bản lược đồ 7**. Mã nguồn đang dùng có các chức năng cấp phát phụ thuộc vào bảng được tạo từ các migration về sau, đặc biệt:

- `0013_one_time_issuance.sql` — thẻ sự kiện/cấp phát một lần.
- `0014_independent_verification_qr.sql` — hồ sơ QR xác minh độc lập.
- `0015_people_work_profile.sql` — thông tin trường học/công việc mở rộng.
- `0016_schema_health_baseline.sql` — bổ sung bản ghi sổ phiên bản sau khi áp dụng các migration trước đó.

Điều này là **nguyên nhân gốc có khả năng cao** giải thích lỗi tải dữ liệu của Tổng quan, Tạo QR xác minh, Thẻ thành viên và Lịch sử cấp phát, cùng lỗi QR HTTP 503 và lỗi xuất PDF vì quy trình PDF bắt buộc tải QR. Tuy nhiên, chưa có quyền đọc D1 production trong phiên xử lý này để xác nhận từng bảng thực tế đang thiếu.

Ngoài ra, migration cũ `0009`, `0011`, `0012`, `0013`, `0014` chưa ghi đầy đủ số phiên bản vào `schema_version`; migration `0016` bổ sung các mốc bị khuyết và mốc 16. Tình trạng schema không còn được đánh giá chỉ bằng con số phiên bản: API kiểm tra cả bảng và các cột lõi.

## 2. Thay đổi đã thực hiện trong mã nguồn

1. **Ranh giới lỗi API:** các exception không còn rơi ra ngoài Worker thành phản hồi HTML/text không rõ nghĩa. Lỗi thiếu bảng/cột trả JSON `SCHEMA_MIGRATION_REQUIRED` HTTP 503; lỗi dịch vụ dữ liệu và lỗi máy chủ có mã tham chiếu để quản trị viên đối chiếu log.
2. **Tình trạng hệ thống:** kiểm tra `SELECT 1`, phiên bản schema, 37 bảng bắt buộc và các cột lõi; báo rõ bảng/cột thiếu. R2 được kiểm tra thao tác đọc danh sách khi có binding. Không tự ghi/xóa thử trong bucket thật.
3. **Email:** chỉ báo khóa nhà cung cấp đã khai báo và ghi rõ gửi email chưa được kiểm thử. Không đánh dấu gửi thành công khi không gửi email thử.
4. **PDF/QR:** khi QR không tải được, lỗi xuất PDF cố gắng hiển thị nội dung lỗi JSON từ API thay vì chỉ “HTTP 503”.
5. **Giao diện:** tab Cấp phát & thẻ tự xuống dòng; toolbar, nút, bảng, thông báo lỗi, thẻ trạng thái và dòng tình trạng dịch vụ có khoảng cách, giới hạn chiều rộng và xuống dòng trên màn hình nhỏ; thêm màu đỏ nhạt cho lỗi thay vì chữ dính vào nội dung.
6. **Cache:** cập nhật phiên bản cache-busting cho CSS trên các trang HTML để trình duyệt không tiếp tục dùng tệp cũ sau khi triển khai.
7. **Kiểm thử hồi quy:** thêm trường hợp giả lập thiếu bảng và kiểm thử thông báo lỗi PDF/QR; mở rộng kiểm tra tình trạng hệ thống và kiểm tra các migration từ schema trống.

## 3. Kết quả kiểm thử cục bộ

- `npm run build`: PASS.
- `npm test`: PASS.
- Bộ kiểm tra release: PASS.
- Kiểm thử tích hợp/API: **84/84 đạt**.
- Kiểm tra migration từ SQLite trống: PASS.
- Kiểm tra lỗi thiếu `verification_qr_records`: trả JSON `SCHEMA_MIGRATION_REQUIRED` HTTP 503, thay vì phản hồi không phải JSON.
- Kiểm tra xuất PDF khi QR lỗi: trả thông báo từ API có ý nghĩa, không chỉ trạng thái HTTP.

Đây là kết quả trên bộ mã nguồn và cơ sở dữ liệu mô phỏng cục bộ; không chứng minh D1/R2/email production đang hoạt động.

## 4. Quy trình cập nhật production an toàn

**Không xóa D1, không chạy lại `SETUP_D1_CONSOLE.sql`, không tạo dữ liệu giả để lấp lỗi.**

1. Sao lưu D1 production từ Cloudflare Dashboard hoặc công cụ sao lưu đã được nhóm vận hành phê duyệt.
2. Tại thư mục gốc có `wrangler.jsonc`, kiểm tra đúng Cloudflare account, Worker `tk`, D1 database `tk` và R2 bucket `tksfn`.
3. Chạy `npx wrangler d1 migrations list tk --remote` để xem lịch sử/pending migration thực tế. Gói nguồn không có file migration `0003`; nếu lịch sử remote có khoảng trống bất thường hoặc báo migration đã áp dụng nhưng schema health vẫn thiếu bảng/cột, **dừng lại để đối chiếu**, không tự tạo migration `0003` theo phỏng đoán.
4. Nếu lịch sử migration xác nhận các migration `0008` đến `0016` đang chờ theo đúng thứ tự, chạy `npm run db:migrate:remote`. Đọc toàn bộ kết quả và kiểm tra schema health lại.
5. Chỉ sau khi migration hoàn tất và đã xác nhận bảng/cột, chạy `npm run deploy` để triển khai Worker cùng assets mới.
6. Đăng nhập bằng tài khoản quản trị hệ thống, mở Tình trạng hệ thống; yêu cầu phiên bản 16, không còn bảng/cột lõi thiếu. Sau đó kiểm tra lần lượt Tổng quan, Tạo QR, Thẻ thành viên, Lịch sử cấp phát, tải QR PNG, mở URL xác minh công khai và tải PDF hai mặt.
7. R2 chỉ được hiển thị là đọc được sau phép thử đọc danh sách; thao tác upload/delete chưa được thử. Email vẫn là “đã cấu hình, chưa kiểm tra gửi” cho đến khi có gửi thử được kiểm soát.

## 5. Những điều chưa thể xác nhận

- Worker production có thực sự trỏ tới đúng bản nguồn mới hay không.
- D1 production thiếu chính xác những migration/bảng/cột nào.
- Quyền đọc/ghi R2 production và khả năng gửi email tới hộp thư nhận thực tế.
- PDF/QR và bố cục trên tất cả kích cỡ màn hình sau khi triển khai thật.

Bản V10 đã sẵn sàng để triển khai có kiểm soát sau khi sao lưu/đối chiếu lịch sử migration. Không ghi nhận thao tác deploy hoặc thay đổi dữ liệu production trong lần xử lý này.
