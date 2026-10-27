# Ứng dụng Máy tính GFI — Trung tâm Nghiệp vụ Số Sky First (Windows `.exe` & macOS `.dmg`)

## 1. Kiến trúc & Nguyên tắc Đồng bộ Dữ liệu
- Ứng dụng máy tính (`desktop/main.cjs`, `desktop/preload.cjs`, `desktop/electron-builder.json`) kết nối trực tiếp tới hệ thống tài khoản, phiên đăng nhập và dữ liệu được phân quyền của **Trung tâm Nghiệp vụ Số Sky First** (`https://nghiepvu.skyfirst.io.vn`).
- **Không tạo kho dữ liệu nhân sự riêng biệt** và **không nhúng bất kỳ khóa bí mật (secret/token quản trị)** nào vào gói cài đặt.
- Trên Windows, bộ cài NSIS chạy ở quyền người dùng chuẩn (`requestedExecutionLevel: "asInvoker"`, `perMachine: false`), không yêu cầu quyền Administrator của hệ điều hành.
- Trên macOS, cấu hình hỗ trợ cả hai kiến trúc `x64` (Intel) và `arm64` (Apple Silicon).

## 2. Hướng dẫn Build trên Môi trường Đích (Khi có kết nối mạng & OS Toolchain)
1. Cài đặt công cụ đóng gói trên máy build có mạng:
   ```bash
   npm install --save-dev electron electron-builder
   ```
2. Đóng gói bộ cài đặt Windows (`.exe` NSIS installer):
   ```bash
   npx electron-builder --config desktop/electron-builder.json --win nsis --x64
   ```
3. Đóng gói bộ cài đặt macOS (`.dmg` trên máy macOS có chứng thư Apple Developer ID & Notarization nếu phân phối rộng rãi):
   ```bash
   npx electron-builder --config desktop/electron-builder.json --mac dmg --x64 --arm64
   ```

## 3. Giới hạn Môi trường Thực thi Hiện tại (Báo cáo Trung thực)
- Môi trường kiểm toán hiện tại là Linux VM (`Debian GNU/Linux 12`) không có kết nối Internet ra ngoài (sandbox offline) và không có toolchain biên dịch chéo NSIS/macOS SDK hay chứng thư ký mã (Code Signing Certificate / Apple Developer ID).
- Do đó, mã nguồn ứng dụng Desktop và cấu hình build đã được hoàn thiện và kiểm tra cú pháp (`node --check desktop/main.cjs desktop/preload.cjs`), nhưng **không tạo tệp `.exe` hoặc `.dmg` giả** theo đúng quy tắc nghiêm cấm giả lập.
