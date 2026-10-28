# BÁO CÁO KIỂM TOÁN, CHỈNH SỬA BIỂU MẪU ĐĂNG KÝ, CHUẨN HÓA ĐIỀU KHOẢN & HOÀN THIỆN WEBSITE
**Hệ thống:** Trung tâm Nghiệp vụ Số Sky First (`https://nghiepvu.skyfirst.io.vn`)
**Tổ chức:** Mạng lưới Giáo dục và Phát triển Cộng đồng Sky First — Sky First Network
**Email hệ thống:** `nghiepvu@skyfirst.io.vn` · `noreply@skyfirst.io.vn` · `support@skyfirst.io.vn` · `lienhe@skyfirst.io.vn`

## I. TỔNG QUAN CÁC HẠNG MỤC ĐÃ XỬ LÝ TRỰC TIẾP TRÊN MÃ NGUỒN

| Nhóm yêu cầu | Nội dung xử lý tại nguồn | Tệp mã nguồn thay đổi | Kết quả kiểm chứng |
|---|---|---|---|
| **1. Xóa toàn bộ chữ `GFI` & dấu vết tên không liên quan** | Quét toàn bộ HTML, JS, SQL, template email, cấu hình và tài liệu; xóa/thay thế triệt để mọi chuỗi `GFI` thành tên thống nhất **Trung tâm Nghiệp vụ Số Sky First** | `src/index.js`, `public/app.js`, `migrations/0017_skyfirst_operations_center_p1_p7.sql`, `migrations/0018_gfi_schema_column_reconciliation.sql`, `desktop/*` | Quét regex `\bGFI\b` trên toàn bộ mã nguồn web, API, HTML, SQL và DOM thực tế: **0 kết quả (`PASS`)** |
| **2. Hoàn thiện Điều khoản sử dụng (`terms.html` & dữ liệu điều khoản)** | Xóa toàn bộ dòng hiển thị `Phiên bản: 2026.10-SFN-TERMS`, `Hiệu lực: 2026-01-01` và nội dung về `chữ ký số` / `chứng thư số công cộng`; viết lại đầy đủ 8 điều khoản quản lý thành viên, nhân sự và nghiệp vụ nội bộ | `public/terms.html`, `public/app.js`, `src/index.js`, `migrations/0017_skyfirst_operations_center_p1_p7.sql` | Kiểm tra tự động trong `verify_release.py` và DOM trình duyệt: **0 dòng mã phiên bản/ngày hiệu lực thừa, 0 nội dung chữ ký số (`PASS`)** |
| **3. Đổi tên “Hồ sơ Thành viên (12 tháng / 01 năm)” → “Hồ sơ Đăng ký”** | Đổi tên hiển thị tại tiêu đề trang `/register`, nút tab, tiêu đề Bước 03 (`HỒ SƠ ĐĂNG KÝ`) và thanh tiến trình 4 bước (`03 Hồ sơ Đăng ký`); không gắn thời hạn `12 tháng` / `01 năm` vào tên biểu mẫu; giữ nguyên `#requestForm` và toàn bộ dữ liệu cũ | `public/app.js` (`renderAccountRequest`, `initRegistrationWizard`) | Kiểm thử Chromium E2E xác nhận tiến trình 4 bước: `01 Thông tin cá nhân` → `02 Học tập & công việc` → `03 Hồ sơ Đăng ký` → `04 Xác nhận & gửi` (**`PASS`**) |
| **4. Xóa 2 loại hồ sơ công khai sai (“Tài khoản Dùng thử (24 giờ / 48 giờ)” & “Biểu mẫu Trực tuyến & Chữ ký Xác nhận”)** | Xóa hoàn toàn 2 nút tab `data-pub-reg-mode="trial"` và `data-pub-reg-mode="dynamic_forms"` cùng nhánh render phân loại đăng ký công khai riêng trong `bindPublicRegModes()`; bảo toàn chức năng quản lý thời hạn tài khoản trong Admin (`renderAdminAccountLifecycle`) | `public/app.js` (`renderAccountRequest`, `bindPublicRegModes`) | Người đăng ký công khai không tự chọn loại/thời hạn tài khoản; chức năng cấp và gia hạn tài khoản trong Admin hoạt động bình thường (**`PASS`**) |
| **5. Bước 04 — Xác nhận & gửi (Ký trực tiếp hoặc Tải tệp xác nhận)** | Tích hợp 2 phương thức xác nhận thay thế nhau ngay tại Bước 04 của `#requestForm`: (1) **Ký trực tiếp trên giao diện** (`#regStep4SigCanvas`) hoặc (2) **Tải tệp xác nhận lên hệ thống** (`POST /api/public/request-confirmation-file`, kiểm tra magic bytes PDF/PNG/JPG/WEBP ≤ 5MB, lưu riêng tư tại `/files/requests/confirmations/*`) | `public/app.js`, `src/index.js`, `migrations/0018_gfi_schema_column_reconciliation.sql` | Kiểm thử tải tệp giả mạo bị chặn `400`, tệp PDF chuẩn lưu thành công `201`, truy cập ẩn danh vào `/files/requests/confirmations/*` bị chặn `401` (**`PASS`**) |
| **6. Gỡ hoàn toàn khu vực tải `.exe` / `.dmg` khỏi trang đăng nhập công khai** | Xóa hoàn toàn khối `.auth-desktop-downloads`, nút tải `.exe`, nút tải `.dmg` và sự kiện `#openDesktopDownloadModalBtn` khỏi `renderLogin()`; giữ nguyên tệp `.exe`/`.dmg` trong gói phát hành và trang Cấu hình hệ thống của Admin | `public/app.js` (`renderLogin`) | Kiểm thử Chromium E2E xác nhận `hasExeOnLogin = false` (**`PASS`**) |
| **7. Hoàn thiện Hoạt động & Sự kiện Công khai, Trang Chi tiết, Tải minh chứng riêng tư & Đồng bộ Điểm danh QR với Lịch sử Thành viên** | Bổ sung `GET /api/public/sk-events/:id`, `POST /api/public/sk-events/:id/upload-asset` (`/files/events/private/*`), `POST /api/public/sk-events/:id/status-lookup` và hàm `syncSkEventToMemberActivityHistory` đồng bộ tự động kết quả điểm danh QR vào `/api/me/activities` & `/api/me/cv` | `src/index.js`, `public/app.js`, `scripts/validate-center.mjs` | Kiểm thử đầu-cuối (Tạo sự kiện → Duyệt độc lập → Công bố → Mở đăng ký → Xem chi tiết → Tải minh chứng riêng tư → Đăng ký → Điểm danh QR → Cập nhật `/api/me/activities` & `/api/me/cv`): **`PASS`** |

## II. KẾT QUẢ KIỂM THỬ THỰC TẾ THEO 16 TIÊU CHÍ BẮT BUỘC (MỤC VII)

| Tiêu chí | Nội dung kiểm chứng | Kết quả |
|---|---|---|
| **1** | Mục “Hồ sơ Thành viên (12 tháng / 01 năm)” đã được đổi tên thành “Hồ sơ Đăng ký”; biểu mẫu gốc `#requestForm` vẫn tồn tại | **PASS** |
| **2** | Mục “Tài khoản Dùng thử (24 giờ / 48 giờ)” đã được loại bỏ khỏi lựa chọn hồ sơ công khai | **PASS** |
| **3** | Mục “Biểu mẫu Trực tuyến & Chữ ký Xác nhận” đã được loại bỏ khỏi lựa chọn hồ sơ công khai | **PASS** |
| **4** | Không còn logic phân loại đăng ký riêng sai khiến ba loại hồ sơ xuất hiện lại | **PASS** |
| **5** | Biểu mẫu đăng ký có đúng 4 bước (`01 Thông tin cá nhân`, `02 Học tập & công việc`, `03 Hồ sơ Đăng ký`, `04 Xác nhận & gửi`) | **PASS** |
| **6** | Các trường thông tin ở Bước 01 (12 trường) và Bước 02 (7 trường + hỗ trợ tự điền khi chọn `Không còn theo học` / `Chưa đi làm`) đầy đủ và hoạt động | **PASS** |
| **7** | Bước 03 tiếp tục sử dụng chính biểu mẫu chọn đơn vị và ảnh đại diện hiện có dưới tên “Hồ sơ Đăng ký” | **PASS** |
| **8** | Bước 04 hỗ trợ 2 lựa chọn thay thế nhau: **Ký trực tiếp trên giao diện** hoặc **Tải tệp xác nhận lên hệ thống** | **PASS** |
| **9** | Hồ sơ được gửi, lưu vào `account_requests` / `account_request_extended` và tiếp nhận bình thường | **PASS** |
| **10** | Dữ liệu hồ sơ cũ không bị mất hoặc bị gán sai do đổi tên | **PASS** |
| **11** | Trang đăng nhập công khai (`renderLogin`) không còn khu vực tải `.exe` hoặc `.dmg` | **PASS** |
| **12** | Không còn nút hoặc liên kết tải bản cài đặt thuộc khu vực đã gỡ trên giao diện đăng nhập công khai | **PASS** |
| **13** | Đăng nhập, đăng xuất, khôi phục mật khẩu, đổi mật khẩu lần đầu và xác thực hiện có hoạt động đầy đủ | **PASS** |
| **14** | Chức năng quản lý tài khoản và thời hạn (`24h`, `48h`, `12 tháng / 01 năm`, `nhân sự`) trong Admin không bị xóa nhầm | **PASS** |
| **15** | Giao diện trên máy tính (`1440×900`) và màn hình nhỏ không phát sinh lỗi bố cục hoặc lỗi console | **PASS** |
| **16** | Toàn bộ kiểm thử mã nguồn, tĩnh (`348` câu SQL tĩnh trong `verify_release.py`) và tích hợp API (`431/431` kịch bản trong `validate-center.mjs`) đạt 100% | **PASS** |

## III. ĐỐI CHIẾU THAM KHẢO CÁC CỔNG DỊCH VỤ & THÔNG TIN SINH VIÊN ĐẠI HỌC (MỤC IV)
Hệ thống đã tham khảo mô hình tổ chức nghiệp vụ công khai của [Cổng dịch vụ sinh viên HCMUE](https://dichvucong.hcmue.edu.vn/), [Cổng thông tin sinh viên HCMUE](https://ctsv.hcmue.edu.vn/), [Cổng dịch vụ người học HCMUTE](https://sao.hcmute.edu.vn/), [Cổng thông tin đào tạo UIT](https://portal.uit.edu.vn/), [Website chính thức USSH](https://hcmussh.edu.vn/) và [Cổng MyBK HCMUT](https://mybk.hcmut.edu.vn/) ở các khía cạnh:
- Phân tách rõ khu vực thông tin/tra cứu công khai với khu vực hồ sơ nội bộ sau đăng nhập (các phân hệ nội bộ sau đăng nhập của các trường yêu cầu tài khoản sinh viên/giảng viên nên chỉ tham khảo cấu trúc danh mục dịch vụ công khai, không sao chép giao diện hay giả định quy trình nội bộ).
- Chuẩn hóa mã định danh thành viên, theo dõi trạng thái xử lý hồ sơ theo từng bước có nhật ký kiểm chứng, và đồng bộ kết quả điểm danh hoạt động/sự kiện QR trực tiếp vào hồ sơ hoạt động và CV thành viên.
