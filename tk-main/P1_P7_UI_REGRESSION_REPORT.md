# BÁO CÁO KIỂM TRA GIAO DIỆN TRƯỚC/SAU & ĐÁP ỨNG ĐA MÀN HÌNH (UI REGRESSION REPORT)

**Hệ thống:** Trung tâm Nghiệp vụ Số Sky First (`https://nghiepvu.skyfirst.io.vn`)  
**Công cụ kiểm chứng trực quan:** Headless Chromium (`155.0.8059.79`) qua giao thức Chrome DevTools Protocol (CDP)  

## 1. Đối chiếu 10 Câu hỏi Kiểm soát Giao diện Bắt buộc (Mục XI)
1. **Trang nào bị ảnh hưởng?**
   - Trang công khai `/register` (bổ sung thanh chuyển đổi 4 chế độ đăng ký: Hồ sơ thành viên 12 tháng/01 năm, Tài khoản dùng thử 24h/48h, Biểu mẫu trực tuyến kèm vùng ký xác nhận và Sự kiện công khai) và không gian làm việc sau đăng nhập `index.html` / `public/app.js` (bổ sung 2 mục Cá nhân và 3 mục Điều hành).
2. **Thành phần nào thay đổi?**
   - Danh mục menu bên trái (`#personalNav`, `#adminNav`) và vùng nội dung động `#content` khi chuyển sang các màn hình nghiệp vụ mới; bổ sung quy tắc `.badge{white-space:nowrap}` trong `public/styles.css`.
3. **Vì sao cần thay đổi?**
   - Để cung cấp giao diện sử dụng thực tế cho toàn bộ các chức năng thuộc Phụ lục Bổ sung I–VI (Loại tài khoản, Biểu mẫu động, Hồ sơ, Tệp, Chữ ký, Chính sách), Phụ lục SK (Quản lý sự kiện & Điểm danh QR) và Siêu yêu cầu GFI (Nhắn tin nội bộ & Cộng đồng nội bộ).
4. **Những thành phần nào được giữ nguyên 100%?**
   - Giữ nguyên toàn bộ trang Đăng nhập (`renderLogin`), Tra cứu trạng thái (`renderRegistrationStatus`), Xác minh thẻ công khai (`verify.html`), các trang thông tin (`contact.html`, `privacy.html`, `terms.html`, `support.html`, `setup.html`), cấu trúc Sidebar, Topbar, bảng màu nhận diện xanh navy/xanh dương/cyan của Sky First, trình xuất thẻ PDF 2 mặt và toàn bộ các màn hình thành viên/quản trị hiện hữu.
5. **Đã kiểm tra desktop và mobile chưa?**
   - Đã kiểm tra và chụp ảnh trực quan trên đầy đủ 4 kích thước viewport bắt buộc:
     - Desktop lớn: `1440 × 900`
     - Laptop: `1366 × 768`
     - Tablet: `768 × 1024`
     - Mobile: `390 × 844`
6. **Đã kiểm tra các trạng thái tải, rỗng, lỗi và thành công chưa?**
   - Mọi màn hình mới đều có trạng thái đang tải (`Đang tải dữ liệu...`), trạng thái rỗng (`.empty`), thông báo lỗi rõ ràng (`.service-warning` / `toast`) và thông báo xác nhận thành công.
7. **Có làm thay đổi route, menu hoặc hành trình cũ không?**
   - Không. Mọi route và mục điều hướng cũ (`home`, `profile`, `journey`, `goals`, `tasks`, `activities`, `certificates`, `achievements`, `evaluations`, `history`, `documents`, `cards`, `cv`, `notifications`, `calendar`, `security`, `support`, `admin-requests`, `admin-calendar`, `admin-issuance`, `admin-members`, `admin-org`, `admin-audit`, `admin-work`, `admin-reports`, `admin-super`, `admin-studio`, `admin-system`) đều giữ nguyên định danh và hành vi.
8. **Có xuất hiện mã P hoặc tên kỹ thuật trên UI không?**
   - **Tuyệt đối không.** Đã kiểm tra tự động bằng biểu thức chính quy `\bP[1-7](?:[.\-–][0-9A-Za-z]+)?\b` trên cả mã nguồn lẫn văn bản DOM thực tế của toàn bộ 13 màn hình được chụp ảnh trong Chromium: **0 trường hợp xuất hiện mã P1–P7**. Các nhãn trạng thái đều được Việt hóa tự nhiên (`Đã công bố`, `Đang mở đăng ký`, `Đang hoạt động`, `Đã xuất bản`).
9. **Có dữ liệu giả hoặc nút chưa có xử lý không?**
   - Không. Toàn bộ số liệu thẻ thống kê đều truy vấn trực tiếp từ cơ sở dữ liệu D1/SQLite; mọi nút bấm và biểu mẫu đều gắn sự kiện gọi API thật và cập nhật lại giao diện.
10. **Có bằng chứng trực quan trước và sau không?**
    - Có đầy đủ bộ ảnh chụp màn hình Baseline (trước khi sửa) và After (sau khi hoàn thiện) được kiểm tra trực quan:
      - Baseline: `baseline_01_login_1440x900.png`, `baseline_02_register_1440x900.png`, `baseline_03_dashboard_1440x900.png`, `baseline_04_dashboard_mobile_390x844.png`, `baseline_05_admin_work_1440x900.png`.
      - Sau nâng cấp (4 viewports & toàn bộ phân hệ): `after_01_login_1440x900.png`, `after_02_register_dynamic_form_1440x900.png`, `after_03_dashboard_1440x900.png`, `after_04_dashboard_laptop_1366x768.png`, `after_05_dashboard_tablet_768x1024.png`, `after_06_dashboard_mobile_390x844.png`, `after_07_admin_accounts_lifecycle_1440x900.png`, `after_08_admin_forms_builder_1440x900.png`, `after_09_admin_sk_events_qr_1440x900.png`, `after_10_internal_chat_1440x900.png`, `after_11_internal_community_1440x900.png`, `after_12_admin_work_center_1440x900.png`, `after_13_admin_system_health_1440x900.png`.
