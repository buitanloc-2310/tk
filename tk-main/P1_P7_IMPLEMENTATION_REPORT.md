# BÁO CÁO TRIỂN KHAI VÀ HOÀN THIỆN MÃ NGUỒN TỔNG THỂ (P1–P7, PHỤ LỤC I–VIII, PHỤ LỤC SK & GFI)

**Dự án:** Trung tâm Nghiệp vụ Số Sky First (`https://nghiepvu.skyfirst.io.vn`)  
**Tổ chức:** Mạng lưới Giáo dục và Phát triển Cộng đồng Sky First — Sky First Network  
**Ngày hoàn thiện:** 27/10/2026  

## 1. Tóm tắt Nguyên nhân Gốc của các Lỗi trong Gói Đầu vào & Cách Khắc phục
Khi kiểm toán trực tiếp gói `SkyFirst_Digital_Operations_Center_P1_P7_Release.zip` được giao, chúng tôi xác định 3 điểm đứt gãy kỹ thuật và các nhóm chức năng cần hoàn thiện:
1. **Thiếu tệp migration `migrations/0017_skyfirst_operations_center_p1_p7.sql`:** Các trình kiểm tra `scripts/verify_release.py` và `scripts/validate-center.mjs` cùng mã nguồn `src/index.js` đã tham chiếu tới lược đồ phiên bản 17 (`email_otp_tokens`, `email_delivery_logs`, `legal_consent_records`, `system_config_history`, `support_ticket_assignments`, `support_ticket_messages`, `work_queue_states`, `governance_registry`), nhưng tệp `0017` bị khuyết trong thư mục `migrations/`, làm gãy 54 câu lệnh SQL tĩnh khi kiểm tra từ schema trống.
   - **Khắc phục:** Khôi phục và mở rộng toàn diện `migrations/0017_skyfirst_operations_center_p1_p7.sql` (bao gồm 8 bảng quản trị P1–P7 cùng 29 bảng nghiệp vụ mới cho Phụ lục Tài khoản/Biểu mẫu/Hồ sơ/Chữ ký/Đồng ý dữ liệu, Phụ lục Sự kiện SK và Hệ thống Nhắn tin & Cộng đồng nội bộ GFI, kèm dữ liệu khởi tạo chuẩn hóa cho [Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15](https://chinhphu.vn/?pageid=27160&docid=214590&classid=1&typegroupid=3) và [Nghị định số 356/2025/NĐ-CP](https://vanban.chinhphu.vn/?pageid=27160&docid=216387)).
2. **Thiếu tệp `scripts/fast-check.mjs` và `scripts/verify-release.mjs`:** Được khai báo trong `package.json` (`npm run check`, `npm run build`, `npm test`) nhưng chưa có trong thư mục `scripts/`.
   - **Khắc phục:** Tạo mới `scripts/fast-check.mjs` (kiểm tra cú pháp toàn bộ entrypoint JS bằng `node --check`) và `scripts/verify-release.mjs` (điều phối `scripts/verify_release.py`).
3. **Bổ sung đầy đủ các phân hệ nghiệp vụ theo Phụ lục Bổ sung I–VIII, Phụ lục SK và Siêu yêu cầu GFI trên nền tảng hiện hữu:** Bảo toàn 100% cơ sở dữ liệu D1 (`tk`), kho lưu trữ R2 (`tksfn`), thuật toán băm mật khẩu `PBKDF2-SHA256` (`100000` vòng lặp), giao diện và các chức năng đang hoạt động.

## 2. Danh mục Tệp Đã Thêm Mới hoặc Cập Nhật

| Đường dẫn tệp | Loại thay đổi | Lý do & Nội dung thực hiện |
|---|---|---|
| `migrations/0017_skyfirst_operations_center_p1_p7.sql` | Thêm mới / Khôi phục | Định nghĩa 37 bảng mở rộng (nâng tổng số bảng hệ thống lên 62 bảng), chỉ mục, quyền RBAC mới (`form.manage`, `event.propose`, `event.appraise`, `event.approve`, `event.publish`, `event.checkin`, `content.moderate`) và dữ liệu cấu hình chuẩn cho gói tài khoản, biểu mẫu, chính sách dữ liệu, nhóm cộng đồng và sổ đăng ký quản trị. |
| `src/index.js` | Cập nhật mở rộng | Bổ sung kiểm tra hết hạn tài khoản tại `getSession` và `/api/auth/login`; bảo vệ tệp riêng tư `/files/submissions/*` và `/files/chat/*`; triển khai các nhóm API cho Quản lý loại tài khoản & thời hạn (`/api/public/account-types`, `/api/public/trial-register`, `/api/admin/accounts-center*`), Trình tạo biểu mẫu động & Hồ sơ đăng ký (`/api/public/forms*`, `/api/public/submissions*`, `/api/admin/forms*`, `/api/admin/submissions*`, `/api/admin/policies`, `/api/public/consent/withdraw`), Quản lý sự kiện SK & Điểm danh QR (`/api/public/sk-events*`, `/api/admin/sk-events*`, `/api/sk-attendance/checkin`), Nhắn tin nội bộ (`/api/chat/*`) và Cộng đồng nội bộ (`/api/community/*`); nâng cấp `/api/admin/system-health` kiểm tra đủ 62 bảng lõi. |
| `public/app.js` | Cập nhật mở rộng | Giữ nguyên giao diện hiện hữu; bổ sung điều hướng và màn hình nghiệp vụ dùng tên tiếng Việt tự nhiên (tuyệt đối không hiển thị mã P1–P7): `Tin nhắn nội bộ`, `Cộng đồng & Bảng tin`, `Biểu mẫu & Hồ sơ đăng ký`, `Loại tài khoản & Thời hạn`, `Sự kiện & Điểm danh QR`; tích hợp vùng ký xác nhận vector SVG và 4 chế độ đăng ký/tra cứu trên cổng `/register`. |
| `public/styles.css` | Cập nhật nhỏ | Bổ sung `.badge{white-space:nowrap}` để nhãn trạng thái trong bảng hiển thị gọn gàng trên mọi kích thước màn hình mà không làm thay đổi bố cục cũ. |
| `scripts/fast-check.mjs` | Thêm mới | Kiểm tra cú pháp tức thời (`node --check`) cho toàn bộ tệp JavaScript của Worker và Frontend. |
| `scripts/verify-release.mjs` | Thêm mới | Điểm vào chuẩn cho `npm run build` và `npm run verify`. |
| `scripts/verify_release.py` | Cập nhật mở rộng | Kiểm tra toàn bộ 323 câu lệnh SQL tĩnh trên schema sau khi áp dụng `0001`..`0017`, kiểm tra hợp đồng API mới và xác minh không tồn tại WebRTC/gọi thoại/video hay mã P1–P7 trên UI. |
| `scripts/validate-center.mjs` | Cập nhật & Tối ưu | Tối ưu `DB.batch()` IPC giúp giảm thời gian chạy xuống ~10 giây; mở rộng bộ kiểm thử tích hợp từ 219 lên **344 kịch bản kiểm thử API/nghiệp vụ/phân quyền**. |
| `desktop/main.cjs`, `desktop/preload.cjs`, `desktop/electron-builder.json`, `desktop/README_DESKTOP_BUILD.md` | Thêm mới | Mã nguồn và cấu hình đóng gói Ứng dụng máy tính Windows (`.exe` NSIS `asInvoker`) và macOS (`.dmg` `x64`/`arm64`) sử dụng chung hệ thống xác thực và dữ liệu của GFI. |
