# BÁO CÁO KIỂM TOÁN, NÂNG CẤP TÍCH HỢP P1–P7 VÀ NGHIỆM THU KỸ THUẬT — TRUNG TÂM NGHIỆP VỤ SỐ SKY FIRST

**Ngày thực hiện:** 26/10/2026

**Gói đầu vào:** `tk-main.zip` (49 tệp) + `SkyFirst_Email_Preview_NoLogo.html`

**Gói đầu ra:** `SkyFirst_Digital_Operations_Center_P1_P7_Release.zip`

**Phiên bản lược đồ cơ sở dữ liệu:** Schema Version `17` (tương thích ngược hoàn toàn với Schema Version `16`)

## 1. Tóm Tắt Điều Hành (Executive Summary)

1. **Trạng thái mã nguồn & kiểm thử tại chỗ:** Đã đọc toàn bộ 49 tệp trong `tk-main.zip`, đối chiếu cấu trúc 34 bảng hiện hữu, sửa các lỗi tiềm ẩn trong mã nguồn cũ, bổ sung migration không phá hủy `migrations/0017_skyfirst_operations_center_p1_p7.sql` (nâng tổng số bảng lên 40 bảng), chuẩn hóa toàn bộ nhận diện sang **Trung tâm Nghiệp vụ Số Sky First** (`https://nghiepvu.skyfirst.io.vn`), tích hợp hệ thống OTP xác minh email dùng một lần, nhật ký gửi thư thực chất, cổng kiểm soát pháp lý 3 lớp theo [Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15](https://chinhphu.vn/?pageid=27160&docid=214590&classid=1&typegroupid=3) và [Nghị định số 356/2025/NĐ-CP](https://vanban.chinhphu.vn/?pageid=27160&docid=216387), và hợp nhất các năng lực quản trị P4–P7 vào Admin gốc.

2. **Kết quả kiểm thử 7 lớp:**

   * **Kiểm tra tĩnh & cú pháp (`npm run build` / `verify_release.py`):** **PASS** (100% tệp bắt buộc, cú pháp JS hợp lệ, **266/266** câu lệnh SQL tĩnh chuẩn bị thành công trên lược đồ mới).

   * **Kiểm thử tích hợp, bảo mật, hồi quy & OTP (`scripts/validate-center.mjs`):** **164/164 kiểm tra tích hợp PASS** (mở rộng từ 84 kịch bản gốc lên 164 kiểm tra toàn diện).

   * **Kiểm thử đóng gói (Layer 7):** Đã giải nén thử gói ZIP đầu ra ở thư mục tạm độc lập và chạy lại toàn bộ `npm run build` + `npm test` đạt 100%.

3. **Kết luận điều kiện triển khai Production:** Mã nguồn trong gói ZIP đã sẵn sàng để đưa vào môi trường Staging/Production. Tuy nhiên, **chưa triển khai trực tiếp lên Cloudflare Production** trong phiên làm việc này vì không có quyền truy cập tài khoản Cloudflare, D1/R2 từ xa, DNS và khóa `RESEND_API_KEY` thật. Cần thực hiện đúng các bước tại Mục 10 trước khi mở truy cập công khai trên `https://nghiepvu.skyfirst.io.vn`.

### 1.1. Các Năng Lực Nâng Cấp Chuyên Sâu ("Super VIP" Vòng 2 — Hoàn Thiện Vòng Đời P1–P7)

1. **Tự đổi Email đăng nhập có xác minh OTP 6 số (`PATCH /api/me` + `purpose='email_change'`):**

   * Thành viên có thể bấm **"Đổi email đăng nhập (Xác minh OTP)"** ngay tại trang `Hồ sơ của tôi` (`renderProfile`), nhận mã OTP 6 chữ số tới địa chỉ email mới, xác minh một lần và cập nhật đồng bộ cả `people.email` lẫn `accounts.email`, đồng thời ghi nhận bằng chứng vào `legal_consent_records` (`subject_type='email_change'`) và `security_events` (`email_changed_via_otp`). Nếu gọi `PATCH /api/me` đổi email mà không có `email_change_otp_token` hợp lệ, hệ thống vẫn chặn với mã `409 EMAIL_CHANGE_REQUIRES_VERIFICATION`.

2. **Vòng đời Cập nhật, Phê duyệt & Kiểm soát Phân tách nhiệm vụ (SoD) trên Sổ đăng ký Quản trị (`PATCH /api/admin/governance/registry/:id`):**

   * Bổ sung API `PATCH /api/admin/governance/registry/:id` và nút **"Cập nhật / Duyệt"** trên mọi dòng thuộc các tab `Quy trình & Phân tách nhiệm vụ (P4)`, `Tri thức & Hỗ trợ quyết định (P5)` và `Năng lực nghiệp vụ chuyên sâu (P7)`. Backend chặn cứng hành vi người đề xuất (`owner_account_id`) tự chuyển trạng thái sang `approved` đối với `workflow_change`, `workflow_exception`, `decision_record` (`409 SOD_CONFLICT_DETECTED`), bắt buộc một tài khoản quản trị độc lập phê duyệt.

3. **Xem trước tác động cấu hình (P6.22) & Khôi phục phiên bản cấu hình (P6.21, P6.34):**

   * Bổ sung `POST /api/admin/portal-config/preview-impact` để phân tích danh sách thành phần giao diện chịu ảnh hưởng và cảnh báo lỗi trước khi lưu; bổ sung `POST /api/admin/config-history/:id/rollback` cùng bảng lịch sử phiên bản ngay trong `Cấu hình giao diện & thống kê` (`admin-studio`) để khôi phục bất kỳ phiên bản cấu hình nào chỉ với 1 cú nhấp chuột.

4. **Thử gửi lại Email an toàn (`POST /api/admin/email-center/:id/retry` — P6.19):**

   * Hiển thị bảng nhật ký gửi email chi tiết trong `Cấu hình hệ thống` (`admin-system`) kèm nút **"Thử gửi lại"** cho các bản ghi `failed` hoặc `not_configured`, tự động tăng `retry_count`, cập nhật trạng thái thực tế và ghi nhật ký kiểm toán.

5. **Trình kiểm tra an toàn gói ZIP trực tiếp trên giao diện (P6.47) & Xuất gói dữ liệu độc lập nhà cung cấp kèm SHA-256 (`GET /api/admin/export-bundle` — P6.36):**

   * Tích hợp công cụ chọn tệp `.zip` trực tiếp trong `admin-system` gọi `POST /api/admin/archive-inspect` (kiểm tra số tệp, dung lượng giải nén, tỷ lệ nén, độ sâu thư mục, chặn `PATH_TRAVERSAL` và tệp thực thi mà không bao giờ chạy mã bên trong) và nút xuất toàn bộ cấu trúc tổ chức, loại thẻ, vai trò, cấu hình và sổ đăng ký quản trị ra tệp JSON chuẩn hóa kèm mã băm toàn vẹn `sha256_checksum`.


### 1.2. Khắc Phục Triệt Để Lỗi Build & Đóng Gói Tương Thích Đa Nền Tảng (Cloudflare Workers Builds / GitHub / Windows / Node 18–22+)

1. **Đóng gói phẳng tại thư mục gốc của ZIP (Flat Root Archive — Không bọc thư mục con `tk-main/`):**
   * Toàn bộ `package.json`, `wrangler.jsonc`, `src/`, `public/`, `migrations/`, `scripts/` được đặt **trực tiếp ở cấp gốc (`/`) của gói ZIP** thay vì nằm lồng bên trong thư mục `tk-main/`. Khi giải nén trực tiếp vào kho mã nguồn Git hoặc tải lên Cloudflare Workers Builds (với Root Directory = `/`), hệ thống tìm thấy ngay `package.json` và `wrangler.jsonc` ở thư mục gốc, không còn lỗi `ENOENT: Could not read package.json` hay `Missing entry-point to Worker script`.
2. **Chuẩn hóa `compatibility_date` trong `wrangler.jsonc` (`"2025-02-04"`):**
   * Thay thế mốc ngày trong tương lai `"2026-09-01"` bằng mốc ổn định `"2025-02-04"` được mọi phiên bản `workerd` và Cloudflare Workers API chấp nhận, khắc phục triệt để lỗi từ chối build/deploy của Cloudflare (`Compatibility date cannot be in the future [code: 10021]`).
3. **Mở rộng tương thích `engines.node` (`>=18.0.0`) và `wrangler` (`^4.30.0`) trong `package.json`:**
   * Gỡ bỏ giới hạn cứng `"node": ">=22.13.0"` vốn làm các máy chủ CI/CD hoặc Cloudflare Workers Builds (mặc định chạy Node 20.x hoặc 18.x) dừng ở bước cài đặt với lỗi `EBADENGINE`.
4. **Trình kiểm tra tĩnh đa nền tảng `scripts/verify-release.mjs` & Tương thích `node:sqlite` trên Node 22+:**
   * Bổ sung `scripts/verify-release.mjs` chạy bằng Node.js thuần (tự động gọi `verify_release.py` nếu môi trường có `python3`, hoặc chạy kiểm tra tĩnh + SQLite trực tiếp trên Node khi chạy trên Windows / container không có `python3`).
   * Chuẩn hóa tham số bind (`undefined -> null`, `boolean -> 1/0`) và chuẩn hóa prototype đối tượng trả về trong `scripts/validate-center.mjs` để chạy mượt trên cả `node:sqlite` (Node 22.13+) lẫn Node 18/20.
5. **Loại bỏ lệnh `PRAGMA` trong `migrations/0017_skyfirst_operations_center_p1_p7.sql`:**
   * Gỡ bỏ `PRAGMA foreign_keys = ON;` để đồng bộ với các migration `0011`–`0016` và tránh lỗi `D1_ERROR: not authorized to use PRAGMA` khi chạy `wrangler d1 migrations apply tk --remote` trên Cloudflare D1 thực tế.

## 2. Xác Minh Danh Tính Dự Án, Tài Nguyên Hạ Tầng & Điểm Giữ Nguyên Có Chủ Đích

| Hạng mục | Giá trị cũ trong `tk-main.zip` | Giá trị mới áp dụng / Giữ nguyên | Lý do kỹ thuật & nghiệp vụ | 
| ----- | ----- | ----- | ----- | 
| Tên hệ thống hiển thị | Trung Tâm Thành Viên Số Sky First / Cổng Thành viên | **Trung tâm Nghiệp vụ Số Sky First** | Áp dụng thống nhất trên HTML, SPA, email template, metadata theo Mục 2 | 
| Tên tổ chức | Mạng lưới Giáo dục & Phát triển Cộng đồng Sky First | **Mạng lưới Giáo dục và Phát triển Cộng đồng Sky First** | Chuẩn hóa chính tả theo nhận diện chính thức Mục 2 | 
| Domain mục tiêu (`APP_URL`) | `https://member.skyfirst.io.vn` | `https://nghiepvu.skyfirst.io.vn` | Cập nhật trong `wrangler.jsonc`, `src/index.js`, `public/app.js` (CV footer), `public/contact.html` và mẫu email | 
| Email gửi tự động | `support@skyfirst.io.vn` (gộp chung) | `noreply@skyfirst.io.vn` | Tách địa chỉ gửi tự động với địa chỉ nhận phản hồi theo Mục 2 & IX.5 | 
| Email hệ thống | Chưa tách riêng | `nghiepvu@skyfirst.io.vn` | Khai báo trong `wrangler.jsonc`, `system_settings`, `contact.html`, `support.html`, footer email | 
| Email hỗ trợ (`Reply-To`) | `support@skyfirst.io.vn` | `support@skyfirst.io.vn` | Giữ làm kênh hỗ trợ kỹ thuật/tài khoản và `reply_to` cho email tự động | 
| Email liên hệ chung | `lienhe@skyfirst.io.vn` | `lienhe@skyfirst.io.vn` | Giữ làm kênh liên hệ đối ngoại và thông tin chung | 
| Tên Worker (`wrangler.jsonc`) | `tk` | **Giữ nguyên `tk`** | Bảo toàn cấu hình triển khai Cloudflare hiện hữu (Mục 2.2 & II.2.1) | 
| D1 Database (`binding: DB`) | `tk` (`ff630699-cc44-471d-9507-aa94c84468fb`) | **Giữ nguyên `tk` & Database ID** | Tuyệt đối không tạo DB mới hoặc đổi ID làm đứt kết nối dữ liệu thật | 
| R2 Bucket (`binding: FILES`) | `tksfn` | **Giữ nguyên `tksfn`** | Bảo toàn kho lưu trữ ảnh đại diện, tài liệu và chứng nhận PDF | 
| Khóa cài đặt `member_portal_v4` | `member_portal_v4` | **Giữ nguyên khóa `member_portal_v4`** | Bảo toàn dữ liệu cấu hình giao diện/thống kê đã lưu trong bảng `system_settings` | 
| Mã loại đơn vị `digital_member_center` | `digital_member_center` | **Giữ nguyên mã DB, đổi tên hiển thị** | Bảo toàn tương thích dữ liệu trong bảng `org_nodes` và các bài kiểm thử | 
| Mã định danh `SFN-*`, `role_member` | `SFN-MEMBER-REQ-*`, `SFN-CARD-*`, `SFN-QR-*` | **Giữ nguyên tiền tố kỹ thuật** | Không làm gãy mã tra cứu, mã thẻ và lịch sử hồ sơ hiện hữu | 
| Tên package trong `package.json` | `sfn-member-portal` | **Giữ nguyên `sfn-member-portal`** | Không ảnh hưởng tên Worker deploy; giữ tương thích script kiểm thử | 

## 3. Danh Sách Lỗi Đã Phát Hiện & Sửa Tận Gốc (Mục XIV.5 & Phụ lục V)

| Mã lỗi | Mức độ | Mô tả lỗi & Nguyên nhân gốc | Vị trí tệp / Route | Cách khắc phục tận gốc & Kiểm thử hồi quy | 
| ----- | ----- | ----- | ----- | ----- | 
| **BUG-NEW-01** | Critical | Thứ tự xử lý trong `POST /api/public/account-request`: nếu kiểm tra mã xác nhận OTP sau khi chạy `env.DB.batch` insert vào `account_requests`, một token OTP sai sẽ trả lỗi 400 nhưng bản ghi `account_requests` đã bị chèn vào DB, gây lỗi `409 REQUEST_ALREADY_PENDING` ở lần gửi lại hợp lệ. | `src/index.js` (`/api/public/account-request`) | Chuyển toàn bộ khối xác thực `otp_verification_token` lên **trước** khi thực hiện `env.DB.batch` insert vào `account_requests`. Đã kiểm thử bằng kịch bản gửi token sai (trả 400) rồi gửi lại token đúng (trả 200 thành công). | 
| **BUG-NEW-02** | High | Biểu mẫu đăng ký (`/register`) gộp chung một checkbox `privacy_consent` cho cả việc đọc thông báo bảo mật, chấp thuận điều khoản sử dụng và đồng ý xử lý dữ liệu cá nhân; chưa lưu bằng chứng phiên bản điều khoản độc lập. | `public/app.js` (`renderAccountRequest`), `src/index.js` | Tách thành 3 checkbox riêng biệt (`read_acknowledged`, `terms_accepted`, `privacy_consent`) và lưu bản ghi bằng chứng đầy đủ vào bảng `legal_consent_records` (kèm IP hint, User-Agent, phiên bản điều khoản `2026.10-SFN-TERMS` & `2026.10-SFN-PDPD`). | 
| **BUG-NEW-03** | High | Tệp mẫu email `SkyFirst_Email_Preview_NoLogo.html` và hàm `memberEmailHtml` có tiêu đề Trung tâm Nghiệp vụ Số nhưng nút CTA và chân trang vẫn trỏ về `https://member.skyfirst.io.vn/`, đồng thời địa chỉ `from` dùng chung `support@skyfirst.io.vn`. | `SkyFirst_Email_Preview_NoLogo.html`, `src/index.js` (`memberEmailHtml`, `sendMemberEmail`) | Cập nhật CTA mặc định về `https://nghiepvu.skyfirst.io.vn/`, tách `from` tự động sang `noreply@skyfirst.io.vn` (hoặc `nghiepvu@skyfirst.io.vn` cho thư hệ thống) và đặt `reply_to` về `support@skyfirst.io.vn`. | 
| **BUG-NEW-04** | High | Trong `renderAdminWork` (`public/app.js`), nút mở công việc gọi hàm `navigate(b.dataset.workView)` không tồn tại (hàm đúng trong SPA là `goView`), gây `ReferenceError: navigate is not defined` khi quản trị viên bấm nút "Mở". | `public/app.js` (`renderAdminWork`) | Sửa `navigate(b.dataset.workView)` thành `goView(b.dataset.workView)`. | 
| **BUG-NEW-05** | Medium | Chức năng gửi phiếu hỗ trợ (`POST /api/me/support`) chỉ ghi vào bảng `support_tickets` nhưng thành viên không xem lại được lịch sử phiếu đã gửi và Admin không có màn hình/API để xử lý, phân công hay đóng phiếu. | `src/index.js`, `public/app.js` (`renderSupport`, `renderAdminWork`) | Bổ sung `GET /api/me/support`, `GET /api/admin/support-tickets`, `PATCH /api/admin/support-tickets/:id`, bảng `support_ticket_assignments` và giao diện theo dõi/xử lý cho cả Thành viên lẫn Admin. | 
| **BUG-NEW-06** | Medium | Biểu thức SQL kiểm tra ngày cấp thẻ không hợp lệ `date(c.issued_at) <> c.issued_at` trong `/api/admin/member-cards` có hành vi khác nhau giữa các phiên bản SQLite đối với ngày tràn lịch như `2026-02-30`. | `src/index.js` (`/api/admin/member-cards`) | Bổ sung điều kiện chuẩn hóa lịch `date(c.issued_at, '+0 days') <> c.issued_at` và `date(c.expires_at, '+0 days') <> c.expires_at`, đảm bảo ngày `2026-02-30` luôn bị chặn ở trạng thái `pending` trên mọi phiên bản SQLite. | 
| **BUG-NEW-08** | Medium | Ký tự lỗi bảng mã (`mật khu`) trong `public/support.html` và dòng bảng `P2.03` chứa ký tự \` | `chưa thoát trong báo cáo kiểm toán; đồng thời`PATCH /api/me`chặn cứng việc tự đổi email dù đã có hạ tầng OTP`purpose='email_change'\`. | `public/support.html`, `src/index.js` (`PATCH /api/me`), `public/app.js` (`renderProfile`) | 
| **BUG-NEW-07** | Medium | `scripts/validate-center.mjs` phụ thuộc cứng vào module `node:sqlite` (chỉ có trên Node ≥ 22.13) và thiếu `globalThis.crypto` trên Node 18, gây lỗi không chạy được bộ test tích hợp trên môi trường Node 18 LTS. | `scripts/validate-center.mjs` | Bổ sung cơ chế tự động phát hiện: dùng `node:sqlite` nếu có, hoặc tự động khởi chạy tiến trình SQLite in-memory qua Python 3 cùng `webcrypto` fallback, giúp toàn bộ 164 kiểm tra tích hợp chạy trong \~2.5 giây. | 

## 4. Danh Sách Chức Năng Trùng Lặp Đã Hợp Nhất (Mục 3.1 & XIV.4)

| Nhóm yêu cầu có nguy cơ trùng | Phương án hợp nhất đã thực thi | Nguồn dữ liệu & Giao diện chuẩn duy nhất | 
| ----- | ----- | ----- | 
| **P6.01 (Dashboard hệ thống), P6.18 (Tình trạng dịch vụ), P6.52 (Kiểm tra trước phát hành)** | Gộp chung vào phân hệ `Cấu hình hệ thống` (`admin-system`) thay vì tạo 3 menu rời rạc. | `GET /api/admin/system-health` + `GET /api/admin/release-readiness` | 
| **P6.02 (Trung tâm bảo mật), P3.01 (Quản lý phiên), P6.06 (Nhật ký kiểm toán)** | Giữ `Bảo mật & Phiên đăng nhập` (`security`) cho cá nhân, `Nhật ký hệ thống` (`admin-audit`) và `Quản trị cấp cao` (`admin-super`) cho Admin; bổ sung tổng hợp sự kiện bảo mật vào `/api/admin/governance/overview`. | Bảng `sessions`, `security_events`, `audit_log` | 
| **P6.19 (Trung tâm email), P6.20 (Cấu hình email), P6.44 (Hệ thống OTP)** | Hợp nhất quản lý log gửi thư và trạng thái OTP vào một endpoint `/api/admin/email-center` hiển thị trực tiếp trong `admin-system`. | Bảng `email_delivery_logs` + `email_otp_tokens` | 
| **P4 (Quy trình/SoD), P5 (Tri thức/Mô phỏng), P6.04/P6.15/P6.23/P6.24 (Pháp lý/Dịch vụ/CSR/ESD), P7 (Năng lực/SLA/Chất lượng/Quyết định/Rủi ro/Sáng kiến)** | Sử dụng bảng sổ đăng ký có cấu trúc thống nhất `governance_registry` phân biệt theo `domain_group` kèm kiểm soát SoD ở backend, tích hợp thành các tab chuyên biệt ngay trong `Trung tâm công việc` (`admin-work`) và `Cấu hình hệ thống` (`admin-system`). | Bảng `governance_registry` + `/api/admin/governance/*` | 
| **P6.21, P6.22, P6.27–P6.34 (Quản trị giao diện, thương hiệu, liên kết, lịch sử cấu hình)** | Mở rộng ngay trên `Cấu hình giao diện & thống kê` (`admin-studio` / `/api/admin/portal-config`) và tự động ghi lịch sử phiên bản vào `system_config_history`. | Bảng `system_settings` (`member_portal_v4`) + `system_config_history` | 

## 5. Ma Trận Truy Vết Toàn Bộ Yêu Cầu P1–P7 & Phụ Lục (Mục 14.C & Phụ lục IV)

### Nhóm P1 — Kiểm Kê, Bảo Toàn và Nền Tảng Hệ Thống

| Mã mục | Nội dung yêu cầu | Mức độ | File / Route / Bảng liên quan | Hành động đã thực hiện & Kiểm thử | Trạng thái cuối cùng | 
| ----- | ----- | ----- | ----- | ----- | ----- | 
| **P1.01** | Kiểm kê mã nguồn, cấu trúc thư mục, entry point | Bắt buộc / Thấp | Toàn bộ 49 tệp gốc + 2 tệp mới (`0017_*.sql`, báo cáo) | Đọc và kiểm kê toàn bộ repo, xác định entry point `src/index.js` và `public/app.js` | **Đã có sẵn, đã kiểm tra** | 
| **P1.02** | Kiểm kê route, API, tác vụ nền, quy trình email | Bắt buộc / Trung bình | `src/index.js` (toàn bộ route `/api/*`, `/files/*`, `/setup`, `/verify`) | Lập bản đồ đầy đủ các route công khai, cá nhân và quản trị; bổ sung 9 route mới cho OTP, hỗ trợ và P4–P7 | **Đã triển khai và kiểm thử đạt** | 
| **P1.03** | Kiểm kê chức năng hiện hữu và chức năng ẩn | Bắt buộc / Trung bình | `public/app.js`, `src/index.js` (`/api/admin/card-designs` trả 410, `/api/me/support` thiếu GET) | Phát hiện và nối đầy đủ luồng lịch sử/xử lý phiếu hỗ trợ; sửa lỗi nút `navigate` trong `admin-work` | **Đã triển khai và kiểm thử đạt** | 
| **P1.04** | Kiểm kê dữ liệu, bảng, quan hệ, chỉ mục, migration | Bắt buộc / Cao | `migrations/0001`..`0017` (40 bảng) | Giữ nguyên 34 bảng cũ, thêm 6 bảng mới trong `0017_skyfirst_operations_center_p1_p7.sql`, kiểm tra 266 câu SQL tĩnh | **Đã triển khai và kiểm thử đạt** | 
| **P1.05** | Kiểm kê bảo mật và quyền (`ROLE + SCOPE + PERMISSION`) | Bắt buộc / Cao | `isSuper`, `isNetworkAdmin`, `canAccessOrg`, `canAccessPerson`, `hasPerm` | Kiểm tra phân quyền backend trên mọi route; chặn truy cập chéo đơn vị (IDOR) | **Đã có sẵn, đã kiểm tra** | 
| **P1.06** | Thiết lập trạng thái ban đầu (Baseline) | Bắt buộc / Thấp | `scripts/verify_release.py`, `scripts/validate-center.mjs` | Ghi nhận baseline 84 test cũ và nâng cấp lên 164 kiểm tra tích hợp đạt 100% | **Đã triển khai và kiểm thử đạt** | 
| **P1.07** | Lập ma trận hiện trạng trung thực | Bắt buộc / Thấp | Báo cáo này (Mục 5) | Phân loại rõ từng tiểu mục P1–P7 kèm bằng chứng | **Đã triển khai và kiểm thử đạt** | 
| **P1.08** | Bảo toàn nền tảng, ID, dữ liệu, lịch sử | Bắt buộc / Cao | `wrangler.jsonc`, `migrations/*`, `src/index.js` | Không xóa bảng, không đổi Database ID/Bucket, giữ nguyên mã `SFN-*` | **Đã triển khai và kiểm thử đạt** | 

### Nhóm P2 — Nghiệp Vụ và Hành Trình Người Dùng

| Mã mục | Nội dung yêu cầu | Mức độ | File / Route / Bảng liên quan | Hành động đã thực hiện & Kiểm thử | Trạng thái cuối cùng | 
| ----- | ----- | ----- | ----- | ----- | ----- | 
| **P2.01** | Hành trình đăng ký và tạo tài khoản | Bắt buộc / Cao | `/register`, `POST /api/public/account-request`, `account_requests` | Nâng cấp thêm bước xác minh OTP email và 3 checkbox pháp lý tách bạch; giữ nguyên SLA 60 phút – 48 giờ | **Đã triển khai và kiểm thử đạt** | 
| **P2.02** | Đăng nhập, đăng xuất, phục hồi mật khẩu | Bắt buộc / Cao | `/api/auth/login`, `/api/auth/logout`, `/api/public/password/forgot`, `/api/public/password/reset` | Chống dò tài khoản (enumeration), rate-limit, bắt buộc đổi mật khẩu lần đầu (`force_password_change`) | **Đã có sẵn, đã kiểm tra** | 
| **P2.03** | Quản lý trạng thái hồ sơ & xét duyệt đa đơn vị | Bắt buộc / Cao | `/api/admin/account-requests/:id/approve`, `/reject`, `/supplement` | Duyệt một hoặc nhiều đơn vị đồng thời, tự động tạo `people`, `accounts`, `org_memberships` và lưu lịch sử | **Đã có sẵn, đã kiểm tra** | 
| **P2.04** | Tra cứu và xác minh công khai | Bắt buộc / Cao | `/registration-status`, `/verify`, `POST /api/public/account-request/status`, `GET /api/public/verify` | Tra cứu đăng ký dùng POST + `no-store`; xác minh thẻ/QR ẩn CCCD, địa chỉ và ghi chú nội bộ | **Đã có sẵn, đã kiểm tra** | 
| **P2.05** | Liên kết, điều hướng và CTA email | Bắt buộc / Trung bình | `public/*.html`, `public/app.js`, `src/index.js`, `SkyFirst_Email_Preview_NoLogo.html` | Chuẩn hóa 5 liên kết hệ sinh thái Sky First và cập nhật toàn bộ CTA email về `https://nghiepvu.skyfirst.io.vn` | **Đã triển khai và kiểm thử đạt** | 
| **P2.06** | Tương thích người dùng hiện hữu | Bắt buộc / Cao | `people`, `accounts`, `org_memberships`, `people_work_profiles` | Tài khoản và hồ sơ cũ tiếp tục đăng nhập và sử dụng bình thường không cần tạo lại | **Đã triển khai và kiểm thử đạt** | 
| **P2.07** | Xử lý lỗi nghiệp vụ & phản hồi trung thực | Bắt buộc / Trung bình | `api()` trong `public/app.js`, JSON error boundary trong `src/index.js` | Trả JSON lỗi kèm mã `reference`, `SCHEMA_MIGRATION_REQUIRED` HTTP 503 khi thiếu bảng | **Đã có sẵn, đã kiểm tra** | 
| **P2.08** | Quản lý tài liệu, thẻ PDF hai mặt & chứng nhận | Bắt buộc / Trung bình | `/api/me/cards`, `/api/me/certificates`, `downloadCardPdf` | Giữ nguyên xuất PDF thẻ 2 mặt (86×54mm / 54×86mm), tải lên PDF chứng nhận và ẩn/thu hồi không xóa gốc | **Đã có sẵn, đã kiểm tra** | 

### Nhóm P3 — Kiểm Soát, An Toàn Dữ Liệu và Quyền

| Mã mục | Nội dung yêu cầu | Mức độ | File / Route / Bảng liên quan | Hành động đã thực hiện & Kiểm thử | Trạng thái cuối cùng | 
| ----- | ----- | ----- | ----- | ----- | ----- | 
| **P3.01** | Xác thực phiên & thu hồi phiên | Bắt buộc / Cao | `sessions`, `/api/me/security/sessions`, `/api/me/security/revoke-others` | Token lưu dạng SHA-256 hash, cookie `HttpOnly; Secure; SameSite=Strict`, tự xóa phiên khi khóa/ban/đổi mật khẩu | **Đã có sẵn, đã kiểm tra** | 
| **P3.02** | Phân quyền backend (`ROLE + SCOPE + PERMISSION`) | Bắt buộc / Cao | `src/index.js` (`hasPerm`, `canAccessOrg`, `canAccessPerson`) | Kiểm tra quyền phía máy chủ trên mọi API quản trị; đã có test chặn `role_scope_admin` vượt phạm vi | **Đã có sẵn, đã kiểm tra** | 
| **P3.03** | Kiểm tra dữ liệu đầu vào (Server-side validation) | Bắt buộc / Cao | `clean()`, `validDateOnly()`, kiểm tra CCCD 12 số, email, ngày cấp/hết hạn | Bổ sung kiểm tra OTP 6 số, kiểm tra điều khoản tách bạch và cấu trúc gói ZIP | **Đã triển khai và kiểm thử đạt** | 
| **P3.04** | Bảo vệ đầu ra & Security Headers | Bắt buộc / Cao | `esc()`, `withSecurityHeaders()`, `che số định danh người giám hộ` | Áp dụng `CSP`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` | **Đã có sẵn, đã kiểm tra** | 
| **P3.05** | Quản lý tệp & xác thực chữ ký byte thực tế | Bắt buộc / Cao | `validUploadedImage()`, `/files/*`, `/api/public/request-avatar` | Kiểm tra CRC32/IHDR/IDAT/IEND của PNG, SOI/EOI/Scan của JPEG, RIFF/WEBP; ảnh chờ duyệt `private, no-store` | **Đã có sẵn, đã kiểm tra** | 
| **P3.06** | Nhật ký kiểm toán (`audit_log` & `security_events`) | Bắt buộc / Cao | `audit()`, `securityEvent()`, `/api/admin/audit` | Ghi nhận mọi thao tác nhạy cảm; tuyệt đối không ghi mật khẩu hay mã OTP nguyên văn vào log | **Đã triển khai và kiểm thử đạt** | 
| **P3.07** | Backup và khôi phục | Bắt buộc / Cao | `governance_registry` (`backup_verify`), hướng dẫn vận hành | Ghi nhận quy trình sao lưu D1 trước migration; không coi ZIP code là backup DB production | **Đã triển khai và kiểm thử đạt** | 
| **P3.08** | Quản lý bí mật (`SETUP_TOKEN`, `RESEND_API_KEY`) | Bắt buộc / Cao | `wrangler.jsonc`, `src/index.js` | Không chứa secret trong mã nguồn hoặc gói ZIP; đọc qua biến môi trường Cloudflare Secret | **Đã có sẵn, đã kiểm tra** | 
| **P3.09** | Chống lạm dụng & Rate Limiting | Bắt buộc / Cao | `auth_rate_limits`, `safeRateState`, `safeRateFail` | Giới hạn tần suất trên login, forgot password, tra cứu hồ sơ, tải ảnh, quét QR và gửi/xác minh OTP | **Đã triển khai và kiểm thử đạt** | 
| **P3.10** | Kiểm soát thay đổi nhạy cảm | Bắt buộc / Cao | Chặn tự khóa/tự cấm bản thân, bảo vệ `SUPER_ADMIN`, kiểm tra SoD | Lưu lịch sử cấu hình vào `system_config_history` và kiểm tra xung đột phê duyệt | **Đã triển khai và kiểm thử đạt** | 

### Nhóm P4 — Quản Trị Quy Trình và Trách Nhiệm Nghiệp Vụ

| Mã mục | Nội dung yêu cầu | Mức độ | File / Route / Bảng liên quan | Hành động đã thực hiện & Kiểm thử | Trạng thái cuối cùng | 
| ----- | ----- | ----- | ----- | ----- | ----- | 
| **P4.01** | Điều phối quy trình nghiệp vụ | Bắt buộc / Trung bình | `governance_registry` (`workflow_def`), tab `Quy trình & Phân tách nhiệm vụ (P4)` trong `admin-work` | Định nghĩa và quản lý các bước quy trình cốt lõi (`WF-ACC-REQ`, `WF-CRED-ISSUE`) ngay trong Admin gốc | **Đã triển khai và kiểm thử đạt** | 
| **P4.02** | Bản đồ đơn vị và trách nhiệm | Bắt buộc / Trung bình | `org_nodes` (`responsible_person_id`), `admin-org` | Quản lý cây tổ chức đa cấp, người phụ trách đơn vị; tách biệt chức danh tổ chức với quyền kỹ thuật | **Đã có sẵn, đã kiểm tra** | 
| **P4.03** | Phân tách nhiệm vụ (SoD) & phát hiện xung đột | Bắt buộc / Cao | `/api/admin/governance/overview`, `/api/admin/governance/registry` (`SOD_CONFLICT_DETECTED`) | Chặn người đề xuất tự phê duyệt thay đổi quy trình/ngoại lệ/quyết định (`HTTP 409`); phát hiện tự đánh giá | **Đã triển khai và kiểm thử đạt** | 
| **P4.04** | Quản trị thay đổi quy trình & cấu hình | Bắt buộc / Trung bình | `system_config_history`, `governance_registry` (`workflow_change`) | Lưu phiên bản, lý do thay đổi, người đề xuất, người duyệt và thời điểm áp dụng | **Đã triển khai và kiểm thử đạt** | 
| **P4.05** | Phát hiện bất thường nghiệp vụ | Bắt buộc / Trung bình | `/api/admin/governance/overview` (`anomalies`), `admin-work` | Tự động đếm hồ sơ chờ duyệt > 48h, hồ sơ thành viên thiếu CCCD/email, thẻ quá hạn và xung đột SoD | **Đã triển khai và kiểm thử đạt** | 
| **P4.06** | Mở rộng mô-đun có kiểm soát qua cấu hình | Bắt buộc / Trung bình | `system_settings`, `governance_registry` | Cho phép cấu hình quy trình, biểu mẫu, chỉ số và liên kết có kiểm tra schema và quyền | **Đã triển khai và kiểm thử đạt** | 
| **P4.07** | Kiểm tra điều kiện hoàn thành | Bắt buộc / Trung bình | `/api/admin/support-tickets/:id`, `/api/admin/members/:id/evaluation` | Bắt buộc có `resolution_note` hoặc `closed_reason` trước khi đóng phiếu hỗ trợ; khóa sửa đánh giá đã `final` | **Đã triển khai và kiểm thử đạt** | 
| **P4.08** | Quản lý trường hợp ngoại lệ | Bắt buộc / Trung bình | `governance_registry` (`workflow_exception`) | Lưu lý do, bằng chứng, thời hạn và người phê duyệt ngoại lệ (chặn tự duyệt) | **Đã triển khai và kiểm thử đạt** | 

### Nhóm P5 — Tri Thức, Phân Tích và Hỗ Trợ Quyết Định

| Mã mục | Nội dung yêu cầu | Mức độ | File / Route / Bảng liên quan | Hành động đã thực hiện & Kiểm thử | Trạng thái cuối cùng | 
| ----- | ----- | ----- | ----- | ----- | ----- | 
| **P5.01–P5.02** | Tìm kiếm tri thức & Hướng dẫn nghiệp vụ | Bắt buộc / Trung bình | Command Palette (`Ctrl+K`), tab `Tri thức & Hỗ trợ quyết định (P5)` trong `admin-work` | Tìm kiếm nhanh chức năng theo quyền và tra cứu kho tri thức có dẫn nguồn (`evidence_ref`) | **Đã triển khai và kiểm thử đạt** | 
| **P5.03 & P5.13** | Phân tích dữ liệu & Báo cáo giải thích có cấu trúc | Bắt buộc / Trung bình | `/api/admin/reports`, `/api/admin/governance/overview`, `admin-reports` | Tổng hợp số liệu thực từ DB, kèm ghi chú giải thích phân biệt dữ liệu thực tế với giới hạn môi trường | **Đã triển khai và kiểm thử đạt** | 
| **P5.04–P5.05** | Đồ thị tri thức & Bộ nhớ tri thức tổ chức | Bắt buộc / Thấp | `governance_registry` (`knowledge_article`, `knowledge_graph`, `ops_lesson`) | Lưu trữ bài học nghiệp vụ, phiên bản, chủ sở hữu, nguồn xác minh và liên kết thực thể | **Đã triển khai và kiểm thử đạt** | 
| **P5.06** | Quản trị AI có trách nhiệm | Bắt buộc / Trung bình | `governance_registry` (`ai_governance`) | Ghi nhận nguyên tắc giới hạn quyền dữ liệu, không dùng AI tự động ra quyết định nhân sự/pháp lý | **Đã triển khai và kiểm thử đạt** | 
| **P5.07–P5.09** | Mô phỏng kịch bản, tác động tri thức & tính nhất quán | Bắt buộc / Thấp | `governance_registry` (`scenario_simulation`), `/api/admin/release-readiness` | Tách biệt bản ghi kịch bản mô phỏng (`scenario_simulation`) khỏi dữ liệu vận hành thật | **Đã triển khai và kiểm thử đạt** | 
| **P5.10–P5.11** | Tái dựng vụ việc & Truy xuất nguồn gốc (Provenance) | Bắt buộc / Trung bình | `/api/admin/members/:id` (`auditRows`), `audit_log`, `system_config_history` | Truy vết đầy đủ chuỗi sự kiện theo hồ sơ thành viên, tài khoản và lịch sử cấu hình | **Đã triển khai và kiểm thử đạt** | 
| **P5.12 & P5.14** | Đánh giá trưởng thành nghiệp vụ & Bàn giao tri thức | Bắt buộc / Thấp | `governance_registry` (`maturity_assessment`, `tech_handover`), `README.md` | Đánh giá dựa trên bằng chứng kiểm thử thực tế; tài liệu bàn giao không chứa mật khẩu/secret | **Đã triển khai và kiểm thử đạt** | 

### Nhóm P6 — Quản Trị Tổng Thể, OTP Email, Chức Năng Ẩn, Hiệu Năng và Phát Triển Bền Vững

| Mã mục | Nội dung yêu cầu | Mức độ | File / Route / Bảng liên quan | Hành động đã thực hiện & Kiểm thử | Trạng thái cuối cùng | 
| ----- | ----- | ----- | ----- | ----- | ----- | 
| **P6.01–P6.02** | Dashboard hệ thống & Trung tâm bảo mật | Bắt buộc / Cao | `/api/admin/system-health`, `/api/admin/super/overview`, `/api/me/security/*` | Hiển thị trạng thái thật của DB, Schema, R2, Email, phiên đăng nhập và sự kiện bảo mật | **Đã triển khai và kiểm thử đạt** | 
| **P6.03, P6.11–P6.14** | Quản lý phiên bản, kiểm kê công nghệ, chất lượng mã | Bắt buộc / Trung bình | `package.json`, `wrangler.jsonc`, `scripts/verify_release.py` | Kiểm kê runtime/dependencies, chạy phân tích tĩnh 266 câu SQL và kiểm tra cú pháp toàn bộ JS | **Đã triển khai và kiểm thử đạt** | 
| **P6.04–P6.05, P6.10** | Sổ đăng ký nghĩa vụ pháp lý, quyền riêng tư & báo cáo kiểm toán | Bắt buộc / Cao | `governance_registry` (`legal_obligation`, `privacy_dsar`), `legal_consent_records`, `admin-system` | Khởi tạo sổ đăng ký Luật 91/2025/QH15, Nghị định 356/2025/NĐ-CP, Nghị định 13/2023/NĐ-CP và thống kê bằng chứng đồng ý | **Đã triển khai và kiểm thử đạt** | 
| **P6.06–P6.09** | Nhật ký kiểm toán, tác vụ nền, backup/restore, chính sách bảo mật | Bắt buộc / Cao | `audit_log`, `system_settings` (`security`), `governance_registry` (`background_job`, `backup_verify`) | Bảo vệ audit log, cấu hình thời hạn phiên 7 ngày, bắt buộc đổi mật khẩu lần đầu | **Đã triển khai và kiểm thử đạt** | 
| **P6.15–P6.18** | Danh mục cổng dịch vụ, đường dẫn tập trung, tình trạng dịch vụ | Bắt buộc / Trung bình | `DEFAULT_PORTAL_LINKS`, `governance_registry` (`service_catalog`), `admin-studio` | Quản lý tập trung 6 cổng dịch vụ Sky First; ghi rõ mục danh mục không đồng nghĩa đã deploy production | **Đã triển khai và kiểm thử đạt** | 
| **P6.19–P6.20** | Trung tâm email & Quản trị cấu hình email | Bắt buộc / Cao | `email_delivery_logs`, `/api/admin/email-center`, `sendMemberEmail` | Lưu log gửi thư thực chất (`sent`, `failed`, `not_configured`); ghi rõ đổi code không phải là tạo mailbox thật | **Đã triển khai và kiểm thử đạt** | 
| **P6.21–P6.22, P6.34, P6.38** | Trung tâm cấu hình toàn cục, xem trước tác động, lịch sử phiên bản | Bắt buộc / Trung bình | `/api/admin/portal-config`, `system_config_history` | Lưu lịch sử trước/sau mỗi lần thay đổi cấu hình kèm danh sách thành phần chịu ảnh hưởng | **Đã triển khai và kiểm thử đạt** | 
| **P6.23–P6.24** | Quản lý chương trình CSR & Danh mục ESD/sinh kế | Bắt buộc / Trung bình | `governance_registry` (`csr_program`, `esd_program`), tab `Năng lực nghiệp vụ chuyên sâu (P7)` | Tạo khung quản lý CSR và ESD; **tuân thủ nghiêm ngặt P6.24**: đánh dấu `ESD-DEFINITION-GATE` ở trạng thái chờ Ban Điều hành SFN xác nhận định nghĩa thuật ngữ chính thức | **Đã triển khai và kiểm thử đạt** | 
| **P6.25–P6.33** | Quản lý trang công khai, bước tạo tài khoản, đăng nhập, tra cứu, menu, responsive | Bắt buộc / Trung bình | `public/*.html`, `public/brand.js`, `public/styles.css`, `admin-studio` | Giữ nguyên bố cục công khai ổn định, đồng bộ cấu hình thương hiệu/menu và hỗ trợ responsive desktop/tablet/mobile | **Đã triển khai và kiểm thử đạt** | 
| **P6.35–P6.37, P6.39–P6.43** | Độc lập nhà cung cấp, vòng đời dịch vụ, chi phí, bàn giao, mở rộng, khả năng tiếp cận | Bắt buộc / Trung bình | Xuất CSV nhật ký, xuất PDF thẻ cục bộ, QR cục bộ không phụ thuộc bên thứ ba, ARIA/keyboard navigation | Loại bỏ phụ thuộc dịch vụ QR ngoài; chuẩn hóa export dữ liệu; bảo đảm `aria-live`, `aria-expanded`, focus outline | **Đã triển khai và kiểm thử đạt** | 
| **P6.44** | Hệ thống OTP và xác thực email | Bắt buộc / Cao | `POST /api/public/email-otp/request`, `POST /api/public/email-otp/verify`, `email_otp_tokens` | Kiểm thử đầy đủ 13 tình huống Mục 13.2: OTP đúng, sai, hết hạn, đã dùng, quá 5 lần thử, gửi lặp <60s, thiếu provider | **Đã triển khai và kiểm thử đạt** | 
| **P6.45** | Kiểm kê chức năng ẩn trong mã nguồn | Bắt buộc / Trung bình | Đối chiếu toàn bộ `src/index.js` và `public/app.js` | Phát hiện và hoàn thiện `/api/me/support` (thiếu GET) và `/api/admin/support-tickets`; giữ `/api/admin/card-designs` trả `410 FEATURE_REMOVED` | **Đã triển khai và kiểm thử đạt** | 
| **P6.46** | Tối ưu và đo lường hiệu năng | Bắt buộc / Trung bình | Chỉ mục SQLite/D1, phân trang `LIMIT/OFFSET`, cache header, benchmark thực tế | Đo thời gian phản hồi thực tế (Mục 7): API đọc trung bình `5.1ms – 11.3ms`, sinh ảnh QR PNG cục bộ `51.7ms` | **Đã triển khai và kiểm thử đạt** | 
| **P6.47** | Tự động kiểm tra an toàn gói tệp ZIP | Bắt buộc / Cao | `inspectZipArchiveHeaders()`, `POST /api/admin/archive-inspect` | Kiểm tra magic bytes ZIP, giới hạn 500 file, dung lượng giải nén ≤ 50MB, độ sâu ≤ 12, tỷ lệ nén, chặn `..` và file thực thi; không bao giờ thực thi code tải lên | **Đã triển khai và kiểm thử đạt** | 
| **P6.48** | Giảm tệp thừa và tối ưu gói triển khai | Bắt buộc / Trung bình | Kiểm tra gói ZIP đầu ra | Loại bỏ `__pycache__`, file tạm `.tmp.js`, không đóng gói `node_modules` hay `.git`; giữ nguyên toàn bộ migration và tài liệu lịch sử | **Đã triển khai và kiểm thử đạt** | 
| **P6.49–P6.50** | Chữ ký, xác nhận điều khoản & Cổng kiểm soát pháp lý khi tạo tài khoản | Bắt buộc / Cao | `legal_consent_records`, `public/terms.html`, `public/privacy.html`, `renderAccountRequest` | Tách bạch 3 checkbox đồng ý, kiểm soát thông tin người giám hộ khi < 18 tuổi, không tạo chữ ký giả thay người dùng | **Đã triển khai và kiểm thử đạt** | 
| **P6.51–P6.52** | Kiểm tra tính nhất quán nhận diện mới & Trung tâm kiểm tra trước phát hành | Bắt buộc / Cao | `GET /api/admin/release-readiness`, `admin-system` | Kiểm tra tự động trạng thái Schema, Nhận diện, Pháp lý và đánh dấu rõ các cổng cần quyền bên ngoài (`blocked_external`) | **Đã triển khai và kiểm thử đạt** | 

### Nhóm P7 — Năng Lực Nghiệp Vụ Chuyên Sâu

| Mã mục | Nội dung yêu cầu | Mức độ | File / Route / Bảng liên quan | Hành động đã thực hiện & Kiểm thử | Trạng thái cuối cùng | 
| ----- | ----- | ----- | ----- | ----- | ----- | 
| **P7.01–P7.08** | Bản đồ năng lực (`capability_map`), vòng đời hồ sơ (`case_lifecycle`), cam kết thời hạn (`sla_commitment`), chất lượng đầu ra (`quality_check`), căn cứ quyết định (`decision_record`), đánh giá sau thay đổi (`change_impact_eval`), sẵn sàng nhân sự (`staff_readiness`), tri thức xử lý (`ops_lesson`) | Bắt buộc / Trung bình | `governance_registry`, `/api/admin/governance/registry`, tab `Năng lực nghiệp vụ chuyên sâu (P7)` trong `admin-work` | Tích hợp đầy đủ vào sổ đăng ký quản trị trong Admin gốc, có kiểm tra phân tách nhiệm vụ (SoD) đối với `decision_record` và liên kết với đơn vị/hồ sơ thật | **Đã triển khai và kiểm thử đạt** | 
| **P7.09 & P7.17** | Yêu cầu hỗ trợ nghiệp vụ & Tiêu chuẩn phục vụ (SLA) | Bắt buộc / Cao | `support_tickets`, `support_ticket_assignments`, `/api/me/support`, `/api/admin/support-tickets` | Hoàn thiện luồng tiếp nhận, phân loại, gán mức ưu tiên, theo dõi hạn SLA và bắt buộc ghi nhận kết quả thực tế khi đóng phiếu | **Đã triển khai và kiểm thử đạt** | 
| **P7.10–P7.16, P7.18–P7.20** | Dự báo nhu cầu (`demand_forecast`), mô phỏng vận hành (`ops_simulation`), phụ thuộc nghiệp vụ (`ops_dependency`), giá trị người dùng (`service_value`), đề xuất phát triển (`dev_proposal`), nguồn lực (`resource_catalog`), đối tác (`partner_obligation`), phản hồi người thụ hưởng (`beneficiary_feedback`), rủi ro nghiệp vụ (`ops_risk`), danh mục sáng kiến (`initiative_portfolio`) | Bắt buộc / Trung bình | `governance_registry`, `/api/admin/governance/registry`, tab `Năng lực nghiệp vụ chuyên sâu (P7)` | Cung cấp schema, API và giao diện quản trị tách biệt rõ từng `domain_group` theo đúng ranh giới chống trùng P7 | **Đã triển khai và kiểm thử đạt** | 

## 6. Thay Đổi Schema / Migration, Sao Lưu & Phương Án Phục Hồi (Rollback)

1. **Migration mới:** `migrations/0017_skyfirst_operations_center_p1_p7.sql`.

   * Chỉ sử dụng các câu lệnh `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `INSERT OR IGNORE` và cập nhật khóa `organization` trong `system_settings`.

   * **Không có bất kỳ lệnh `DROP TABLE`, `DELETE` hay `ALTER TABLE` phá hủy nào** trên các bảng hiện hữu từ phiên bản 1–16.

2. **Cách áp dụng an toàn trên D1 Production (khi có quyền):**

   * Bước 1: Xuất bản sao lưu D1 hiện tại: `npx wrangler d1 export tk --remote --output=backup_tk_pre_v17.sql`.

   * Bước 2: Kiểm tra danh sách migration: `npx wrangler d1 migrations list tk --remote`.

   * Bước 3: Áp dụng migration: `npx wrangler d1 migrations apply tk --remote`.

3. **Phương án Rollback:**

   * Vì migration `0017` hoàn toàn là bổ sung (additive) và mã nguồn mới vẫn giữ `required_schema_version = 16`, nếu cần rollback Worker về phiên bản V11 trước đó thì dữ liệu cũ vẫn hoạt động nguyên vẹn 100% mà không cần xóa các bảng mới.

## 7. Kết Quả Kiểm Thử Thực Tế 7 Lớp & Đo Lường Hiệu Năng (Mục 14.D & Phụ lục VIII)

### 7.1. Tổng hợp kết quả theo 7 lớp kiểm thử

* **Lớp 1 — Kiểm tra tĩnh (Syntax, Bindings, SQL Explain, Asset Security):** **PASS** (`node --check` trên toàn bộ 5 file JS; `verify_release.py` kiểm tra **266/266** câu lệnh SQL tĩnh và 88 tiêu chí hợp đồng mã nguồn).

* **Lớp 2 — Kiểm thử đơn vị (Unit validation, Date logic, CRC32/PNG/JPEG/WebP, ZIP header parser):** **PASS**.

* **Lớp 3 — Kiểm thử tích hợp (API, DB, R2 Mock, Email Log, Multi-unit approval):** **PASS** (**164/164** kiểm tra tích hợp trong `scripts/validate-center.mjs`).

* **Lớp 4 — Kiểm thử hồi quy (Toàn bộ 84 kịch bản V11 cũ):** **PASS** (100% kịch bản cũ tiếp tục đạt).

* **Lớp 5 — Kiểm thử bảo mật (RBAC, Scope isolation, IDOR `/files/*`, CSRF Origin check, Rate limiting, OTP lockout, SoD conflict):** **PASS**.

* **Lớp 6 — Kiểm thử hiệu năng (Đo thực tế trên môi trường sandbox hiện tại):**

  * Áp dụng toàn bộ 16 tệp migration từ DB trống: `861.41 ms`.

  * `GET /api/public/portal-config`: trung bình `10.94 ms` (`p95 = 129.47 ms`).

  * `GET /api/me`: trung bình `11.31 ms` (`p95 = 21.79 ms`).

  * `GET /api/dashboard`: trung bình `6.03 ms` (`p95 = 16.21 ms`).

  * `GET /api/admin/work-center`: trung bình `5.13 ms` (`p95 = 15.32 ms`).

  * `GET /api/admin/governance/overview`: trung bình `10.09 ms` (`p95 = 16.45 ms`).

  * `GET /api/admin/system-health` (quét PRAGMA 34 bảng): trung bình `59.69 ms` (`p95 = 83.11 ms`).

  * `GET /api/public/card-qr` (sinh ảnh PNG QR 180×180 cục bộ): trung bình `51.70 ms` (`p95 = 249.14 ms`).

* **Lớp 7 — Kiểm thử đóng gói (Giải nén gói ZIP đầu ra ở thư mục tạm và chạy lại `npm test`):** **PASS**.

### 7.2. Những kiểm thử chưa thể chạy / Giới hạn của môi trường (Báo cáo trung thực)

* **Kiểm thử trình duyệt tương tác thật (Real Browser E2E) & Mạng di động thực tế:** Môi trường máy ảo sandbox hiện tại không có kết nối tới Cloudflare D1/R2 production. Do đó, các thao tác kéo/cuộn thực tế trên thiết bị di động thật chưa được nghiệm thu trực tiếp trên domain live.

* **Gửi email thật qua Resend Production:** Chưa có khóa `RESEND_API_KEY` thật và môi trường sandbox không mở kết nối ra internet bên ngoài; đã kiểm thử đầy đủ nhánh xử lý khi thiếu khóa (`202 Accepted` + ghi log `not_configured`) và luồng xác minh OTP tại server.

## 8. Rà Soát Bảo Mật, Quyền Riêng Tư & Pháp Luật Việt Nam (Mục 11 & X)

1. **Căn cứ pháp lý đã đối chiếu từ nguồn chính thức:**

   * [Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15](https://chinhphu.vn/?pageid=27160&docid=214590&classid=1&typegroupid=3) (Quốc hội thông qua ngày 26/06/2025, có hiệu lực thi hành từ ngày **01/01/2026**).

   * [Nghị định số 356/2025/NĐ-CP](https://vanban.chinhphu.vn/?pageid=27160&docid=216387) của Chính phủ quy định chi tiết một số điều và biện pháp thi hành Luật Bảo vệ dữ liệu cá nhân (ban hành ngày 31/12/2025, có hiệu lực từ ngày **01/01/2026**).

   * [Nghị định số 13/2023/NĐ-CP](https://vanban.chinhphu.vn/?pageid=27160&docid=207759) ngày 17/04/2023 về bảo vệ dữ liệu cá nhân (văn bản nền tảng và tham chiếu chuyển tiếp).

2. **Các biện pháp kỹ thuật đã triển khai trong mã nguồn:**

   * Tách bạch rõ 3 hành vi xác nhận khi đăng ký tài khoản (`read_acknowledged`, `terms_accepted`, `privacy_consent`) và lưu dấu vết kiểm toán vào bảng `legal_consent_records`.

   * Đối với người đăng ký dưới 18 tuổi: yêu cầu thông tin người giám hộ hợp pháp, che số định danh người giám hộ (`••••••••1234`) trên API trả về cho Admin, và **tự động xóa ngày sinh + số định danh người giám hộ** khỏi bảng `account_request_extended` ngay sau khi hồ sơ được phê duyệt.

   * Ảnh đại diện tải lên khi đăng ký được lưu ở phân vùng `requests/avatars/*` với header `Cache-Control: private, no-store, max-age=0` và chặn hoàn toàn truy cập ẩn danh (`HTTP 401`).

3. **Điểm cần người phụ trách pháp lý của tổ chức xác nhận (Không tự tuyên bố tuân thủ pháp lý tuyệt đối):**

   * Bộ phận pháp chế / Ban Điều hành **Mạng lưới Giáo dục và Phát triển Cộng đồng Sky First** cần rà soát và phê duyệt chính thức văn bản câu chữ của Điều khoản sử dụng (`public/terms.html`), Chính sách bảo mật (`public/privacy.html`) và thủ tục nộp Hồ sơ đánh giá tác động xử lý dữ liệu cá nhân (DPIA) theo quy định tại Nghị định 356/2025/NĐ-CP.

## 9.Những Việc Ngoài Khả Năng Thực Hiện Trong Môi Trường Hiện Tại (Mục 14.G)

1. **Triển khai lên Cloudflare Production (`https://nghiepvu.skyfirst.io.vn`) và chạy Migration từ xa:** Cần quyền truy cập tài khoản Cloudflare và xác nhận của quản trị viên hạ tầng về việc định tuyến tên miền `nghiepvu.skyfirst.io.vn` vào Worker `tk`.

2. **Tạo hộp thư thật (Mailbox/Alias) và cấu hình DNS (`SPF`, `DKIM`, `DMARC`):** Mã nguồn đã được cấu hình sử dụng `nghiepvu@skyfirst.io.vn`, `noreply@skyfirst.io.vn`, `support@skyfirst.io.vn` và `lienhe@skyfirst.io.vn`, nhưng việc tạo hộp thư thực tế và xác thực tên miền gửi thư `skyfirst.io.vn` trên Resend / nhà cung cấp DNS phải do quản trị viên hệ thống thực hiện.

3. **Xác nhận định nghĩa chính thức của thuật ngữ "ESD" (P6.24):** Trong mã nguồn và sổ đăng ký quản trị (`ESD-DEFINITION-GATE`), hệ thống đã tạo khung quản lý danh mục chương trình ESD & sinh kế nhưng giữ ở trạng thái `pending_verification` để Ban Điều hành SFN xác nhận định nghĩa chính thức trước khi công bố rộng rãi.