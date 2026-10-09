# Báo cáo triển khai — Trung Tâm Thành Viên Số Sky First

Ngày cập nhật: 09/10/2026  
Nguồn: `tk-main-fixed-20261009-v3(1).zip`

## Đã thay đổi trong gói nguồn

- Khóa nội dung bắt buộc ở mặt sau thẻ tại cả giao diện thiết kế và API lưu mẫu; nội dung chuẩn được khôi phục khi tải mẫu cũ hoặc đổi chiều thẻ.
- Không cho chỉnh sửa hoặc kéo thả các dòng nội dung đã khóa; QR xác minh không được lưu ở mặt sau.
- Giữ hai kích thước thẻ thực: ngang 86 × 54 mm và dọc 54 × 86 mm; tạo PDF trực tiếp với hai trang, mỗi trang dùng đúng MediaBox theo kích thước thẻ.
- PDF dùng `Blob` từ `canvas.toBlob()` thay vì `canvas.toDataURL()`; ảnh trên thẻ giữ tỉ lệ bằng `preserveAspectRatio="xMidYMid meet"` / `object-fit:contain`.
- Bỏ các nút/tuyến tải ảnh PNG, JPG và SVG dành cho người dùng; giữ thao tác tải PDF hai mặt.
- Thu gọn menu Cá nhân/Điều hành theo nhóm, thêm trạng thái mở/đóng và khôi phục vị trí cuộn khi đổi màn hình.
- Thêm kiểm tra phát hành cho các quy tắc nội dung mặt sau, xuất PDF, điều hướng thu gọn và các luồng API hiện có.

## Kiểm tra đã chạy

- `npm run build`: cú pháp JavaScript Worker và frontend.
- `npm test`: kiểm tra release tĩnh, áp dụng migrations trên SQLite mới, kiểm tra/EXPLAIN các câu SQL tĩnh và kiểm thử tích hợp API trên SQLite giả lập.
- `unzip -t` trên ZIP nguồn đầu vào.

Các kiểm tra chi tiết được thực hiện khi đóng gói; xem kết quả `npm test` ở phiên làm việc kèm theo.

## Giới hạn cần nói rõ

- Chưa triển khai lên Cloudflare và chưa thực hiện smoke test với D1/R2 production.
- Chưa xác nhận bằng trình duyệt thật trên máy tính/điện thoại; kiểm thử hiện có gồm cú pháp, kiểm tra tĩnh và test tích hợp API mô phỏng.
- Mã QR trong PDF còn phụ thuộc endpoint tạo QR và tài nguyên ảnh có thể truy cập tại thời điểm xuất thẻ.
- Các tính năng quản trị thành viên, phân quyền, nhật ký, báo cáo và sao lưu sẵn có được giữ trong source; gói này không tuyên bố đã xây dựng lại toàn bộ các nhóm tính năng đó từ đầu.
