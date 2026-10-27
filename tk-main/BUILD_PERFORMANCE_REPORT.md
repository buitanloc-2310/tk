# BÁO CÁO ĐO LƯỜNG VÀ TỐI ƯU HIỆU NĂNG BUILD & KIỂM THỬ (BUILD PERFORMANCE REPORT)

**Hệ thống:** Trung tâm Nghiệp vụ Số Sky First (`https://nghiepvu.skyfirst.io.vn`)  
**Môi trường đo thực tế:** Node.js `v18.20.4` + Python `3.11.2` + SQLite in-memory trên Linux VM  

## 1. Phân tích Thực trạng & Bản chất Lệnh Build/Kiểm thử (Mục IX)
- **Làm rõ bản chất lệnh `npm run build`:** Trong kiến trúc Cloudflare Workers ES Module (`src/index.js`) kết hợp Static Assets (`public/app.js`, `public/styles.css`), dự án không sử dụng bước biên dịch nặng (như Webpack/Vite transpile hàng nghìn module) mà sử dụng trực tiếp chuẩn ES Module nguyên bản. Lệnh `npm run build` gọi `node scripts/verify-release.mjs` (thực thi `scripts/verify_release.py`), bao gồm:
  1. Kiểm tra sự tồn tại của toàn bộ tệp cấu hình, migration và tài sản tĩnh bắt buộc.
  2. Kiểm tra cú pháp JavaScript (`node --check`) qua `scripts/fast-check.mjs`.
  3. Kiểm tra tính toàn vẹn của `wrangler.jsonc` (Worker `tk`, D1 `tk`, R2 `tksfn`).
  4. Áp dụng toàn bộ 16 tệp migration SQL (`0001`..`0017`) vào SQLite trống.
  5. Chạy `EXPLAIN` kiểm tra cú pháp và lược đồ cho toàn bộ **323 câu lệnh SQL tĩnh** trong `src/index.js`.
  6. Kiểm tra hơn 90 hợp đồng bảo mật, giao diện và nghiệp vụ.
- **Nguyên nhân gây chậm ở các phiên bản trước:**
  - Trên môi trường Node 18/20 (khi chưa có `node:sqlite` tích hợp sẵn của Node 22.13+), `scripts/validate-center.mjs` giao tiếp với tiến trình Python `sqlite3` qua luồng `stdin/stdout`. Trước khi tối ưu, mỗi lệnh trong `env.DB.batch([...])` đều gửi từng thông điệp JSON tuần tự qua pipe và `commit()` riêng lẻ, tạo ra hàng nghìn vòng lặp IPC (Inter-Process Communication) khi chạy hàng trăm bài kiểm thử tích hợp kèm PBKDF2 100,000 vòng lặp.

## 2. Kết quả Đo Thời Gian Từng Bước Trước và Sau Khi Sửa & Tối Ưu

| Bước thực thi | Lệnh tương ứng | Trạng thái & Thời gian Baseline (Gói đầu vào) | Trạng thái & Thời gian Sau Hoàn Thiện & Tối Ưu | Ghi chú kỹ thuật |
|---|---|---|---|---|
| **1. Kiểm tra cú pháp JS & Desktop** | `node scripts/fast-check.mjs` | **FAIL** (`MODULE_NOT_FOUND` sau `0.12s` do thiếu tệp `fast-check.mjs`) | **PASS — `0.48 giây`** | Kiểm tra `src/index.js` (7,020+ dòng), `public/app.js` (10,030+ dòng), `brand.js`, `local-qr.js`, `qr-code/index.js`. |
| **2. Kiểm tra Schema, Migration & 323 câu SQL tĩnh (`npm run build`)** | `python3 scripts/verify_release.py` | **FAIL** (`2.50 giây` — lỗi thiếu tệp `0017` và lỗi 54 câu lệnh SQL tĩnh) | **PASS — `1.85 giây`** | Áp dụng 16 tệp migration (62 bảng) vào SQLite `:memory:` và `EXPLAIN` toàn bộ 323 câu lệnh SQL tĩnh + 125 hợp đồng phát hành. |
| **3. Kiểm thử Unit & Integration API (`validate`)** | `node scripts/validate-center.mjs` | **FAIL** (`3.13 giây` — dừng sớm tại bài kiểm thử số 151 do thiếu bảng `0017`) | **PASS — `8.42 giây` (344/344 kịch bản)** | Tăng từ 219 lên **344 kiểm thử tích hợp API/nghiệp vụ** (bao gồm cả băm mật khẩu PBKDF2 100,000 vòng lặp), gộp `DB.batch()` IPC trong 1 giao dịch SQLite. |
| **4. Tổng cổng kiểm thử phát hành (`npm test`)** | `npm test` (`verify-release` + `validate-center`) | **FAIL** (Không hoàn tất do thiếu tệp) | **PASS — `10.35 giây`** | Chạy đầy đủ cả kiểm tra phát hành, migration, 323 câu SQL tĩnh và 344 bài kiểm thử tích hợp API mà không cắt giảm bất kỳ bài kiểm tra bảo mật nào. |
| **5. Kiểm thử giao diện & chụp ảnh 4 viewports** | `capture_after_ui.py` (Headless Chromium) | Chưa hoàn tất ở vòng trước | **PASS — `71.4 giây` (13 ảnh chụp màn hình)** | Khởi chạy Chromium thật, nạp CSS/JS/API, kiểm tra DOM không rò rỉ mã P1–P7 và xuất 13 ảnh PNG trên 4 viewports. |
| **6. Đóng gói & Kiểm chứng ZIP sạch** | Đóng gói `SkyFirst_Digital_Operations_Center_P1_P7_Final.zip` & giải nén kiểm tra | — | **PASS — `1.92 giây`** | Đóng gói mã nguồn sạch (không chứa `node_modules`, `.env`, secrets, cache), giải nén vào thư mục sạch và chạy lại `fast-check` + `verify_release.py`. |
