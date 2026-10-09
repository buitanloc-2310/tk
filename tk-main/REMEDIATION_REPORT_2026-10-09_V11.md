# SKY FIRST MEMBER CENTER — BÁO CÁO KHẮC PHỤC CHUỖI LỖI V11

**Ngày:** 09/10/2026  
**Phạm vi:** rà soát và sửa mã nguồn trong ZIP; kiểm thử cục bộ.  
**Production:** chưa triển khai; chưa có quyền truy cập D1/R2/Worker production trong phiên này.

## 1. Nhận định nguyên nhân dây chuyền

Ảnh người dùng cung cấp hiển thị phiên bản lược đồ **7**, trong khi mã nguồn hiện tại cần lược đồ **16** cùng các bảng/cột cho cấp phát, QR và hồ sơ mở rộng. Đây là nguyên nhân gốc có khả năng cao khiến các tab **Tổng quan, Tạo QR xác minh, Thẻ thành viên, Lịch sử cấp phát** cùng lỗi; endpoint QR trả 503 và xuất PDF cũng thất bại theo vì cần tải QR. Chưa thể xác nhận chính xác những bảng/cột nào đang thiếu trên D1 thật khi chưa đọc được cơ sở dữ liệu production.

## 2. Các sửa đổi V11

1. **Ranh giới lỗi API:** ngoại lệ chưa xử lý được trả thành JSON ổn định, kèm mã tham chiếu và mã lỗi. Thiếu bảng/cột trả `SCHEMA_MIGRATION_REQUIRED` HTTP 503 và hướng dẫn migration, không để frontend cố parse trang lỗi HTML.
2. **Chẩn đoán schema:** endpoint tình trạng hệ thống kiểm tra kết nối DB, 37 bảng lõi và các cột quan trọng, so sánh phiên bản yêu cầu 16; nêu cụ thể bảng/cột thiếu. Một database kết nối được nhưng schema chưa đủ sẽ không được báo là sẵn sàng.
3. **R2 và email trung thực:** kiểm tra đọc danh sách R2 khi binding hỗ trợ; không upload/xóa thử dữ liệu production trong health check. Email được mô tả là đã khai báo khóa nhưng chưa xác minh gửi thực tế.
4. **QR/PDF:** lỗi tải QR đọc thông điệp JSON từ API và chuyển thông báo hữu ích lên luồng xuất PDF; tránh chỉ hiện mã HTTP khô khan.
5. **Dẹp thông báo lặp:** gộp toast giống nhau, giới hạn số lượng toast hiển thị và giới hạn chiều cao khối thông báo.
6. **Giao diện toàn cục:** ngăn tab Cấp phát & thẻ dính/đè nội dung, tách nhãn và trạng thái dịch vụ, xuống dòng nút và chữ dài, giới hạn tràn bảng theo vùng cuộn, thêm khoảng cách đồng nhất và tối ưu màn hình nhỏ. Thông báo lỗi dùng nền đỏ nhạt, dễ đọc.
7. **Cache assets:** nâng phiên bản CSS/JS ở các trang HTML và kiểm tra tự động để tránh tiếp tục sử dụng assets cũ sau phát hành.
8. **Migration:** thêm `0016_schema_health_baseline.sql` để ghi nhận các mốc schema bị bỏ sót ở migration trước; migration này không tự tạo lại dữ liệu hay thay thế những migration chức năng còn pending.
9. **Kiểm thử hồi quy:** mô phỏng thiếu bảng QR, thiếu cột, kiểm tra health không báo email đã gửi khi chưa thử, và kiểm tra thông báo lỗi QR khi luồng tải PDF thất bại.

## 3. Kiểm thử tại chỗ

- `npm run build`: PASS.
- `npm test`: PASS.
- Kiểm tra release: PASS.
- **84/84** kiểm thử tích hợp/API đạt.
- 214 câu SQL tĩnh được quét; toàn bộ migration chạy trên SQLite trống.
- Khi xóa bảng `verification_qr_records` trong môi trường kiểm thử, endpoint trả JSON `SCHEMA_MIGRATION_REQUIRED` HTTP 503; tình trạng hệ thống nêu rõ bảng thiếu.
- Trình duyệt thật và Cloudflare production không được xác minh trong phiên này; không xem việc kiểm tra cú pháp/API là nghiệm thu giao diện live.

## 4. Phải làm trước khi phát hành production

1. Sao lưu D1 production.
2. Xác nhận đúng Cloudflare account/binding (`Worker tk`, D1 `tk`, bucket R2 `tksfn`) và kiểm tra lịch sử bằng `npx wrangler d1 migrations list tk --remote`.
3. Gói nguồn không có migration `0003`; nếu lịch sử remote có khoảng trống/mismatch thì dừng và đối chiếu, không tự tạo migration bù theo phỏng đoán.
4. Chỉ chạy `npm run db:migrate:remote` sau khi đọc lịch sử, backup, xác nhận đúng pending migration và thứ tự. Đọc kết quả đầy đủ rồi kiểm tra health lại.
5. Chỉ chạy `npm run deploy` sau khi migration đã hoàn tất và schema health không còn thiếu bảng/cột.
6. Trên staging hoặc production đã cập nhật, thử bằng tài khoản có quyền phù hợp: bốn tab cấp phát, QR PNG, xác minh công khai, PDF hai mặt, tạo/thu hồi bản ghi, quyền quản trị theo đơn vị, upload/download R2 và email thử có người nhận kiểm soát.

**Không xóa D1, không chạy lại setup SQL để né lỗi schema, không đánh dấu R2 upload/delete hoặc email delivery là PASS khi chưa kiểm chứng.**

## 5. Trạng thái bàn giao

Bản ZIP V11 là mã nguồn đã sửa và kiểm thử cục bộ. Không có thay đổi nào được triển khai hoặc chạy migration trên production trong phiên xử lý này; muốn hết lỗi trên website thật phải triển khai mã nguồn và áp dụng migration an toàn đúng lịch sử database.
