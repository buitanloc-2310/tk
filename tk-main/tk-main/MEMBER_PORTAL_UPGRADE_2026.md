# Sky First Member Portal — Member Identity Upgrade

## Đã tích hợp trong bản này
- Login mới theo nhận diện Member Identity: bố cục hai vùng, motif quỹ đạo/logo Sky First, responsive desktop/mobile.
- Logo nguồn do Sky First cung cấp được dùng làm logo portal.
- Màn hình đăng nhập không hiển thị lỗi kỹ thuật nội bộ.
- Tra cứu yêu cầu chỉ trả về mã yêu cầu, trạng thái và phản hồi cần thiết ở UI; không đưa CCCD/số điện thoại lên màn tra cứu.
- Email xác nhận yêu cầu tự động từ `nhansu@skyfirst.io.vn` (khi secret email provider được cấu hình).
- Nút tra cứu trong email dẫn tới `https://member.skyfirst.io.vn/`.
- Email tự động ghi rõ không phản hồi; hỗ trợ qua `support@skyfirst.io.vn`.
- Thông báo yêu cầu mới gửi tới hộp tiếp nhận Nhân sự `nhansu.sfn@gmail.com`.
- Email thông báo Nhân sự không chứa CCCD/ảnh giấy tờ nhạy cảm.
- Chuẩn hóa website chính về `https://skyfirst.io.vn` (không www) và email hỗ trợ.

## Cấu hình triển khai email
Tạo Worker secret `RESEND_API_KEY` trong môi trường triển khai. Không ghi API key vào source hoặc wrangler.jsonc.
Domain `skyfirst.io.vn` và địa chỉ gửi `nhansu@skyfirst.io.vn` phải được nhà cung cấp email xác minh trước khi gửi production.

## Scope tiếp tục đã chốt
Member Identity; hồ sơ số; kho giấy tờ; Public Profile Builder; CV Studio; Digital Member Card; QR/Scanner/Verify; timeline; directory; organization; activities/check-in; notifications; account/security; Admin Center; export PDF/PNG chuẩn.
