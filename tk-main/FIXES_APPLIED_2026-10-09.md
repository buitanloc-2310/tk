# Báo cáo sửa lỗi — Sky First Member Center

**Ngày:** 09/10/2026  
**Đối tượng:** `SkyFirst_Member_Center_AUDIT_FIX_20261009(1).zip`  
**Phương pháp:** chỉnh sửa bản sao mã nguồn, thêm kiểm thử hồi quy, chạy bộ kiểm tra tại chỗ và đóng gói lại. Không triển khai lên Cloudflare production.

## Các lỗi đã sửa trong bản nguồn

### 1. Phân quyền theo đơn vị
- Lọc danh sách thẻ thành viên theo các đơn vị mà tài khoản quản trị được phép truy cập.
- Các API QR xác minh độc lập, cấp phát một lần và tổng quan cấp phát được giới hạn cho quản trị Mạng lưới có quyền phù hợp, vì dữ liệu đó hiện chưa có phạm vi đơn vị rõ ràng.
- Kiểm tra quyền của người duyệt đối với toàn bộ đơn vị mà người đăng ký lựa chọn trước khi tạo tư cách thành viên.

### 2. Trạng thái và ngày hiệu lực giấy tờ
- Trạng thái xác minh tính ngày cấp, ngày hết hạn, trạng thái thu hồi/sử dụng.
- Ngày sai định dạng hoặc ngày cấp nằm trong tương lai không được xem là giấy tờ hợp lệ.
- Thêm kiểm tra ngày cấp/ngày hết hạn cho cấp phát một lần và cấp thẻ hàng loạt; lọc trạng thái trong danh sách/tổng quan quản trị theo ngày hiệu lực thực tế.

### 3. Bảo vệ ảnh và tệp hồ sơ
- Tăng cường xác thực byte/định dạng ảnh PNG, JPEG, WebP; không chỉ tin vào `Content-Type` do client gửi.
- Ảnh hồ sơ chờ duyệt được đánh dấu `private, no-store`, yêu cầu phiên đăng nhập và kiểm tra quyền trên hồ sơ tương ứng.
- Khi duyệt, ảnh tạm chỉ được chuyển thành ảnh đại diện thành viên sau khi đã kiểm tra; xóa ảnh tạm sau khi xử lý. Khi bị từ chối, ảnh chờ duyệt được dọn.
- Tệp hồ sơ yêu cầu đăng nhập, không dùng cache công khai cho ảnh riêng tư.

### 4. Phê duyệt và dữ liệu thành viên
- Phê duyệt hồ sơ tạo tư cách thành viên ở tất cả đơn vị được chọn, đơn vị chính vẫn được đặt làm đơn vị chính.
- Bổ sung bảng `people_work_profiles` qua migration `0015_people_work_profile.sql` để lưu trường học và thông tin công việc mở rộng.
- Hiển thị dữ liệu học tập/công việc trong màn hình xét duyệt và hồ sơ thành viên; hỗ trợ sửa thông tin hồ sơ thành viên.
- Che số định danh người giám hộ ngay ở dữ liệu trả về từ máy chủ và loại bỏ các trường định danh nhạy cảm khỏi bảng mở rộng sau khi duyệt.
- Đảm bảo `avatar_url` không nhận `NULL` trong các luồng duyệt/từ chối do cột hiện tại có ràng buộc `NOT NULL`.

### 5. Tra cứu, token và xử lý lỗi
- Tra cứu tình trạng hồ sơ sử dụng POST; bổ sung giới hạn tần suất theo IP và thông tin tra cứu, trả cache `no-store`.
- Xóa token đặt lại mật khẩu và tham số tra cứu khỏi URL ngay sau khi frontend đọc chúng.
- Đặt `Referrer-Policy: no-referrer` để hạn chế rò rỉ token/mã trong thông tin tham chiếu.
- Trang xác minh có timeout, hiển thị thông báo lỗi mạng và cho phép thử lại thay vì mắc kẹt ở trạng thái đang tải.

### 6. Cấu hình và tài liệu
- Thống nhất mô tả Worker hiện cấu hình là `tk`; tên package npm `sfn-member-portal` không tự động là tên Worker production.
- Đánh dấu mô tả Card Studio cũ là tài liệu lịch sử; API trình thiết kế hiện trả trạng thái tính năng đã ngừng.
- Cập nhật biên bản audit để kết quả test cũ 57/57, 208 câu SQL được thay bằng số liệu hậu kiểm cuối.

## Kết quả kiểm thử tại chỗ

- `npm test`: **PASS**.
- Bộ xác thực release: **PASS**.
- Migration áp dụng trên SQLite trống: **PASS**.
- Câu truy vấn SQL tĩnh kiểm tra: **214**.
- Kiểm thử tích hợp/API: **80/80 PASS**.
- `npm run build`: **PASS** (`node --check` cho Worker và frontend JavaScript).
- Bao gồm kiểm thử hồi quy cho phạm vi thẻ, API quản trị toàn mạng, ngày cấp trong tương lai/ngày sai, ảnh hồ sơ riêng tư, giới hạn tra cứu, phê duyệt nhiều đơn vị, hồ sơ học tập/công việc và che định danh người giám hộ.

Cảnh báo duy nhất trong lệnh kiểm thử là cảnh báo thử nghiệm của Node về SQLite; không làm test thất bại.

## Việc chưa thể xác nhận từ ZIP và cần làm trước khi deploy

1. **Không triển khai production:** chưa truy cập Cloudflare thật hoặc sửa dữ liệu từ xa.
2. **Xác nhận binding:** `wrangler.jsonc` hiện trỏ Worker `tk`, D1 `tk` với ID trong file và R2 `tksfn`. Cần xác nhận đúng tài nguyên của dự án và tên miền trước khi deploy.
3. **Migration thiếu `0003`:** gói có `0001`, `0002`, `0004` đến `0015`. Không tự tạo migration bù dựa trên phỏng đoán. Trước khi áp dụng `0015` lên D1 từ xa, backup và đối chiếu `d1 migrations list --remote`/lịch sử migration thực tế.
4. **Nghiệm thu đầu cuối:** cần chạy thử trên staging bằng trình duyệt thật, D1/R2 thật và email thật; xác nhận đăng ký, duyệt, chuyển ảnh, cấp thẻ, xác minh QR, reset mật khẩu, vai trò quản trị và backup/restore.
5. **Phạm vi kiểm tra ảnh:** xác thực chữ ký/cấu trúc định dạng không tương đương quét mã độc hoặc giải mã ảnh đầy đủ. Nếu nhận ảnh không tin cậy ở quy mô lớn, cần thêm bước xử lý ảnh riêng.

## Kết luận

Các lỗi đã nhận diện và tái hiện trong cuộc rà soát được sửa ở bản mã nguồn và có kiểm thử hồi quy. **Bản ZIP này là bản nguồn đã sửa và kiểm thử tại chỗ, không phải xác nhận website production đã được cập nhật hoặc đã đạt nghiệm thu vận hành.**
