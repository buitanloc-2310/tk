# Website Chính Thức — Sky First Network (`skyfirst.io.vn`)

Gói dự án hoàn chỉnh, đã kiểm toán, nâng cấp và tối ưu của **Mạng lưới Giáo dục & Phát triển Cộng đồng Sky First (Sky First Network)**, vận hành trên nền tảng **Cloudflare Pages + Cloudflare D1 (SQLite) + Cloudflare R2 (Media) + Firebase Authentication (Xác thực Quản trị)**.

## 1. Kiến trúc & Số lượng tệp bàn giao (68 tệp chuẩn hóa)
- **Tổng số tệp bàn giao**: **68 tệp** (nằm chính xác trong ngưỡng yêu cầu `50 ≤ tổng số tệp ≤ 70`, không tính `node_modules`).
- **Đã loại bỏ**: Thư mục lồng trùng lặp `wed-main/wed-main/` (99 tệp thừa), 23 tệp component cũ không còn được import và 8 tệp cấu hình dư thừa.
- **Bảo toàn dữ liệu & tương thích**: Tất cả các bảng D1 (`website_cms_documents`, `website_forms`, `website_form_submissions`, `website_registrations`, `website_participants`, `website_media_metadata`, `website_admin_users`, `website_admin_audit`, `website_admin_records`, `website_comments`, `website_contacts`) được giữ nguyên tương thích ngược 100%, bổ sung thêm các bảng vận hành mới bằng `CREATE TABLE IF NOT EXISTS` và `ALTER TABLE ADD COLUMN` an toàn.

## 2. Các nâng cấp trọng tâm trong phiên bản này
1. **Giữ nguyên bản sắc thương hiệu Sky First Network**:
   - Bảo toàn tông màu Navy sâu (`#061A3A`, `#071B3A`), Xanh dương chủ đạo (`#0B66C3`, `#0284C7`), điểm nhấn Cyan/Emerald, bố cục biên tập hiện đại và tài sản thương hiệu trong `public/brand/`.
   - Tối ưu chuyển động mượt mà với CSS transitions nhẹ, tôn trọng `prefers-reduced-motion`.
2. **Video Intro Trang chủ (`HomepageIntroOverlay`)**:
   - Khi mở hoặc tải lại `/` hoặc `/home`: phát video intro từ đầu -> kết thúc hiển thị hiệu ứng xuất hiện logo Sky First Network -> chuyển vào trang chủ.
   - Có nút **Bỏ qua Intro**, không phát lại khi điều hướng nội bộ giữa các trang con, không chặn khi người dùng mở trực tiếp URL bài viết/chương trình, và tự động chuyển sang hiệu ứng hiện logo nếu trình duyệt chặn autoplay hoặc chưa tải video.
3. **Sửa triệt để lỗi cắt hình ảnh & Lightbox toàn hệ thống**:
   - Mặc định hiển thị đầy đủ tỷ lệ gốc của mọi hình ảnh (`objectFit='original'`, `aspectRatio='auto'`), không tự ý cắt ảnh dọc/A4/poster bằng `object-fit: cover`.
   - Hỗ trợ bấm vào ảnh để mở **Lightbox** xem kích thước gốc và phóng to (`1x` – `2.5x`).
4. **Trình soạn thảo bài viết kiểu WordPress Gutenberg (`RichTextEditor.tsx`, `AdminNewsManager.tsx`)**:
   - Hỗ trợ viết trực tiếp kết hợp khay `+ Thêm khối`, kéo thả sắp xếp khối, kéo thả ảnh trực tiếp từ máy tính vào nội dung, chèn ảnh ngay tại vị trí con trỏ, đầy đủ các khối (H2/H3/H4, đoạn văn, danh sách, trích dẫn, bảng, đường phân cách, ảnh + chú thích/nguồn, thư viện ảnh, video, hộp nội dung nổi bật), hoàn tác/làm lại, hẹn giờ xuất bản và cảnh báo rời trang khi chưa lưu.
5. **Trình thiết kế Website trực quan (`AdminVisualWebsiteEditor.tsx`)**:
   - Chỉnh sửa trực quan Trang chủ, Header, Footer, Menu, Design Tokens và các trang; thêm/xóa/nhân bản/di chuyển khối; lưu mẫu khối dùng lại; xem trước Desktop/Tablet/Mobile; hoàn tác/làm lại 30 bước và khôi phục lịch sử phiên bản (`website_revisions`).
6. **Form Builder độc lập cho từng Chương trình**:
   - Mỗi chương trình gắn `formId` độc lập (`website_forms.program_id`), hỗ trợ điều kiện hiển thị (`showWhen`), tự động đóng khi hết hạn `closeAt`, lưu snapshot cấu trúc trường tại thời điểm nộp (`field_snapshot_json`) để sửa form về sau không làm lệch dữ liệu cũ, chống gửi trùng và xuất CSV.
7. **Trung tâm Cấu hình 18 Nhóm, Hàng đợi Email Outbox, Tự động hóa, Thống kê & Sao lưu SHA-256**:
   - Quản trị tập trung 18 nhóm cấu hình có tìm kiếm cài đặt, hàng đợi `website_email_outbox` (xem trước mẫu với whitelist biến an toàn, gửi email thử, thử gửi lại có kiểm soát), tách bạch thống kê pageview tự động (đã lọc bot & `/admin`) với số liệu nhập thủ công, kiểm tra sức khỏe 4 mức trạng thái, và sao lưu/khôi phục có kiểm tra mã băm SHA-256 (`KHOI_PHUC_DU_LIEU`).

## 3. Hướng dẫn cài đặt, chạy cục bộ & kiểm thử
```bash
# 1. Cài đặt phụ thuộc (khi ở môi trường có kết nối npm registry)
npm install

# 2. Chạy bộ kiểm thử tự động toàn diện (15 kịch bản Backend, RBAC, CMS, Form, Email, Analytics, Backup)
node --test tests/backend.test.mjs

# 3. Chạy trình kiểm tra tính toàn vẹn gói phát hành (kiểm tra số lượng tệp 50-70, cú pháp Functions, biên dịch TS/TSX, slug)
python3 scripts/verify_release.py

# 4. Chạy máy chủ phát triển hoặc đóng gói bản build production
npm run dev
npm run build
```

Xem chi tiết hướng dẫn triển khai Cloudflare Pages, D1, R2 và quy trình sao lưu/khôi phục tại `CLOUDFLARE_DEPLOY.md` và báo cáo kiểm toán nghiệm thu tại `FINAL_RELEASE_AUDIT.md`.
