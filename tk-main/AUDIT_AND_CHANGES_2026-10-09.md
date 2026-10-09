# Biên bản rà soát và thay đổi — Sky First Member Center

Ngày: 09/10/2026  
Phạm vi: bản mã nguồn ZIP người dùng gửi trong cuộc trò chuyện, chỉnh sửa trên bản sao làm việc. Không triển khai lên website đang hoạt động.

## Những thay đổi đã thực hiện trong bản này

1. Chuẩn hóa danh sách liên kết thành đúng năm nền tảng: Trang Thông Tin Điện Tử Sky First; Cổng Thông Tin Số Sky First; Trung Tâm Tình Nguyện Viên Sky First; Trung Tâm Học Tập Số Sky First; Trung Tâm Thư Điện Tử Sky First. Menu hiển thị tên thương hiệu, không in tên miền thành dòng chữ riêng.
2. Chuẩn hóa cách xử lý dữ liệu liên kết cũ hoặc thiếu để tránh giữ lại tên cũ như “Cổng SFEC” hoặc nhầm tên với tên miền. Các liên kết được giới hạn trong hệ tên miền Sky First và kiểm tra khớp tên miền.
3. Bổ sung màn hình cấu hình thương hiệu/quản trị giao diện cho tên website, logo tải lên, màu sắc, kiểu chữ, cỡ chữ, độ bo góc, chiều rộng nội dung, mô tả, các liên kết nền tảng và một số chỉ số/nhãn trên trang chủ.
4. Bổ sung API tải ảnh thương hiệu vào kho lưu trữ của hệ thống; kiểm tra kiểu tệp, chữ ký tệp, dung lượng và kích thước ảnh trước khi lưu. Ảnh hiển thị từ cấu hình được giới hạn ở tệp cục bộ/nội bộ.
5. Loại bỏ giao diện thiết kế mẫu thẻ, mục “Mẫu thẻ & cấu hình”, các điều khiển thiết kế và phần CSS riêng của trình thiết kế. API cũ cho trình thiết kế trả về trạng thái tính năng đã ngừng sử dụng; dữ liệu/mẫu lịch sử trong cơ sở dữ liệu không bị xóa.
6. Giữ quy trình cấp thẻ thành viên và cấp thẻ theo sự kiện, lịch sử cấp phát, xuất thẻ hiện hữu và luồng mã QR xác minh độc lập. Quy trình cấp theo sự kiện không nhận URL ảnh người nhận và không tự tạo tài khoản thành viên.
7. Củng cố kiểm tra đường dẫn ảnh cục bộ, chuẩn hóa cách hiển thị tên thương hiệu trên trang xác minh và các trang thông tin công khai; thêm bộ quy tắc bảo vệ chung vào phản hồi của Worker.
8. Cập nhật phiên bản đường dẫn CSS/JavaScript để tránh trình duyệt giữ bản giao diện cũ sau khi cập nhật.
9. Bổ sung kiểm tra tự động để phát hiện nguồn ảnh trực tiếp từ máy chủ bên ngoài trong HTML/CSS/JavaScript công khai và bảo đảm các trang công khai dùng bộ nhận diện/cấu hình chung.

## Kết quả kiểm tra đã chạy

- `npm test`: bản hậu kiểm cuối cùng đạt 80/80 kịch bản tích hợp/API; migration áp dụng được trên SQLite trống và 214 câu truy vấn SQL tĩnh đã được kiểm tra. Số liệu này thay thế kết quả 57/57 và 208 truy vấn ở vòng audit trước.
- `npm run build`: đạt; lệnh build hiện tại chủ yếu là kiểm tra cú pháp JavaScript (`node --check`), không phải quá trình biên dịch toàn diện.
- Các kịch bản thử kiểm tra tải ảnh PNG hợp lệ vào kho lưu trữ giả lập và chặn ảnh không hợp lệ, cấu hình thương hiệu/đường dẫn, chuẩn hóa danh mục nền tảng cũ, quy trình QR độc lập, ngừng API trình thiết kế, lớp bảo vệ phản hồi và các tiêu chí an toàn khác.
- Kiểm tra tĩnh không tìm thấy nguồn ảnh trực tiếp từ máy chủ ngoài trong HTML/CSS/JavaScript công khai. Đây không phải bằng chứng kiểm thử mọi dữ liệu động hay mọi phản hồi trong môi trường thật.

## Giới hạn còn lại — không được coi là đã hoàn thành

1. Chưa kiểm thử xuyên suốt bằng trình duyệt thật. Lần chạy thử Chromium tự động không hoàn tất nên không được xem là bằng chứng UI đã được nghiệm thu.
2. Chưa kiểm tra trực tiếp môi trường đang hoạt động, dữ liệu D1/R2 thật hoặc việc cập nhật từ xa. Không có thay đổi nào được triển khai lên production trong công việc này.
3. Phần quản lý nội dung hiện tại mới bao gồm cấu hình thương hiệu, một số thiết lập giao diện, danh mục nền tảng và các nhãn/nội dung trang chủ. Chưa phải hệ thống quản lý mọi trang đầy đủ với bản nháp, xem trước, đăng, lịch sử phiên bản và khôi phục cho toàn bộ nội dung.
4. Chưa triển khai riêng toàn bộ các mục cá nhân và quản trị mới được đề xuất nếu phía mã nguồn chưa có luồng nghiệp vụ thật. Không nên thêm menu rỗng hoặc số liệu giả chỉ để khớp danh sách.
5. Chưa kiểm thử đầy đủ trên nhiều trình duyệt, thiết bị, mạng yếu, dung lượng dữ liệu lớn, khả năng tiếp cận và quy trình sao lưu/khôi phục từ bản sao thật.
6. Cần tiếp tục đối chiếu tất cả các phát hiện nghi vấn trong bản yêu cầu tổng thể với mã nguồn hiện tại, kiểm tra từng quy trình đầu cuối và lập danh sách lỗi tồn đọng trước khi nghiệm thu.

## Kết luận

Bản này có các sửa đổi mã nguồn và kiểm thử đã nêu, nhưng chưa đủ cơ sở để tuyên bố toàn bộ phạm vi tái cấu trúc đã hoàn thành hoặc website production đã hoạt động tốt. Chỉ triển khai sau khi kiểm thử trình duyệt và nghiệm thu các luồng thực tế, sao lưu dữ liệu, xác nhận cấu hình môi trường và có quyền triển khai.


## Hậu kiểm bảo mật và luồng đăng ký (09/10/2026)
- Danh sách thẻ quản trị được giới hạn theo cây đơn vị mà tài khoản có quyền truy cập.
- QR xác minh độc lập và thẻ sự kiện được giới hạn cho quản trị Mạng lưới cho đến khi dữ liệu có trường phạm vi đơn vị.
- Xác minh thẻ tính cả ngày cấp, ngày hết hạn và trạng thái thu hồi/sử dụng.
- Ảnh đăng ký được kiểm tra cấu trúc nội dung, giữ riêng tư/no-store khi chờ duyệt và chỉ chuyển sang URL ảnh thành viên sau khi hồ sơ được phê duyệt.
- Phê duyệt nhiều đơn vị tạo membership cho tất cả đơn vị đã chọn; yêu cầu chỉ được duyệt bởi tài khoản có quyền trên toàn bộ các đơn vị đó.
- Thông tin học tập/công việc mở rộng được hiển thị cho người xét duyệt và lưu lại trong `people_work_profiles`; thông tin định danh người giám hộ được xóa khỏi bảng mở rộng sau khi duyệt.
- Tra cứu trạng thái có rate limit và frontend chuyển sang POST; token đặt lại mật khẩu và tham số tra cứu được xóa khỏi thanh địa chỉ sau khi đọc.
- Trang xác minh có trạng thái lỗi có thể thử lại nếu fetch bị lỗi mạng/timeout.


## Kết quả sửa lỗi tiếp theo (09/10/2026 — hậu kiểm cuối)

- Đã thêm kiểm tra phạm vi đơn vị đối với danh sách thẻ thành viên quản trị; kiểm thử hồi quy xác nhận quản trị viên giới hạn phạm vi không nhận được thẻ ngoài phạm vi.
- Đã giới hạn API QR xác minh độc lập, thông tin cấp phát một lần và tổng quan cấp phát toàn mạng cho quản trị viên Mạng lưới có quyền phù hợp, do các bản ghi này chưa có trường phạm vi đơn vị.
- Đã dùng trạng thái hiệu lực tính từ ngày cấp/ngày hết hạn ở luồng xác minh và lọc thẻ; ngày sai định dạng hoặc ngày cấp trong tương lai không được báo hợp lệ.
- Đã kiểm tra cấu trúc byte/định dạng ảnh thực tế khi tải ảnh đăng ký và ảnh hồ sơ; ảnh chờ duyệt được đánh dấu riêng tư, `no-store`, yêu cầu phiên đăng nhập và kiểm tra quyền theo hồ sơ.
- Đã bổ sung rate limit cho tra cứu trạng thái hồ sơ; thay tra cứu frontend sang POST và xóa tham số nhạy cảm khỏi thanh địa chỉ sau khi đọc. Chính sách `Referrer-Policy` được chuyển sang `no-referrer`.
- Đã sửa phê duyệt hồ sơ nhiều đơn vị để tạo membership ở các đơn vị đã chọn, với yêu cầu người duyệt có quyền trên tất cả đơn vị đích; thông tin học tập/công việc được lưu vào hồ sơ thành viên.
- Đã che số định danh người giám hộ ở phía máy chủ; giao diện duyệt hiển thị thêm trường hồ sơ mở rộng.
- Đã sửa trang xác minh để có timeout, thông báo lỗi mạng và nút thử lại; thêm kiểm tra ngày cho cấp phát một lần và cấp thẻ hàng loạt.
- Kiểm tra cuối: `npm test` đạt (80/80 API/integration checks, 214 câu SQL tĩnh và migration từ SQLite trống); `npm run build` đạt.

## Các điều kiện cần xác minh trước khi triển khai từ xa

- Chưa truy cập hay thay đổi Cloudflare production. Cần xác nhận Worker `tk`, D1 `tk` và R2 `tksfn` trong `wrangler.jsonc` chính là các tài nguyên dành cho Member Center; không thay tên tài nguyên chỉ dựa vào tên package npm.
- Gói hiện không chứa migration `0003`. Bộ kiểm thử áp dụng đúng tập migration đang đóng gói lên cơ sở dữ liệu SQLite trống, nhưng điều đó không thay thế việc đối chiếu bảng lịch sử migration của D1 production. Cần backup và kiểm tra lịch sử remote trước khi áp dụng migration `0015`.
- Chưa có nghiệm thu giao diện xuyên suốt trên trình duyệt thật hoặc thử với D1/R2/email thật. Kiểm thử ảnh có xác thực chữ ký/cấu trúc, không phải công cụ quét mã độc hoặc trình giải mã ảnh toàn diện.
