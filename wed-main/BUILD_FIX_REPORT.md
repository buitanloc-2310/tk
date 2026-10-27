# Báo cáo sửa lỗi build Cloudflare Pages — 27/10/2026

## Thay đổi đã thực hiện

1. Khóa `esbuild` ở phiên bản `0.25.12` trong `devDependencies`, tương thích với dependency range `^0.25.0` của Vite 6.4.3 trong lockfile hiện có và tránh để một phiên bản mới hơn được chọn ngoài ý muốn.
2. Đồng bộ metadata `version` ở phần đầu `package-lock.json` và `packages[""]` với `package.json` (`2026.2.0`).
3. Đồng bộ `packages[""].devDependencies.esbuild` với `package.json`.
4. Giữ nguyên các phiên bản, integrity hashes và các gói nền tảng `@esbuild/*` đã có trong lockfile; không tự bịa checksum và không nâng cấp hàng loạt dependency.

## Xác minh được trong môi trường hiện tại

- `package.json` và metadata root trong `package-lock.json` khớp nhau.
- Lockfile đã có entry `node_modules/esbuild` phiên bản `0.25.12` và các package nền tảng `@esbuild/*` cùng phiên bản.
- Thư mục mã nguồn có `src/components/UIPrimitives.tsx`; `src/pages/AdminPage.tsx` dùng đường dẫn import tương đối `../components/UIPrimitives`.
- Không triển khai lên production và không chạy migration lên D1 remote.

## Giới hạn kiểm chứng

Môi trường làm việc này không phân giải được `registry.npmjs.org`, vì vậy `npm ci` không thể tải dependency để chạy xác minh thực tế. Do đó, không tuyên bố `npm ci`, TypeScript hoặc Vite build đã PASS. Sau khi đưa bản sửa lên repository, cần chạy lại `npm ci` và `npm run build` trong Cloudflare hoặc một môi trường có kết nối npm registry. Nếu lỗi vẫn báo yêu cầu `esbuild@0.28.2`, cần xác minh chính xác `Root directory`, `package.json` và `package-lock.json` đang được Cloudflare dùng — vì dependency manifest trong gói này ghim Vite-compatible `esbuild@0.25.12`.

## Bổ sung sửa lỗi tĩnh trong mã nguồn

- Bổ sung import `SiteConfig` ở `SiteChrome.tsx` và `AdminPage.tsx`.
- Bổ sung import type `Certificate` và component `RichTextRenderer` cho `CustomPageDetail.tsx`.
- Bổ sung import `RichTextEditor` trong `StandalonePageEditor.tsx`.
- Bổ sung import `CSSProperties` và `useId` trong `UIPrimitives.tsx`.
- Cập nhật các kiểu cấu hình lồng trong `SiteConfig` để khớp các trường mở rộng đang có trong dữ liệu mặc định/CMS: `IntroSettings`, `EmailSystemSettings`, `AutomationSystemSettings`, `SeoSystemSettings`. Mở rộng kiểu `EmailConfig.provider` để phù hợp với các provider đã được dùng trong cấu hình hệ thống.

Các sửa đổi trên là sửa lỗi import/khai báo kiểu nhìn thấy từ kiểm tra tĩnh, nhưng **chưa được xác nhận bằng `npm run lint` trong môi trường có đủ dependency**.
- Bổ sung `useRef` và `useEffect`/`useMemo` ở các tệp đang sử dụng hook trực tiếp nhưng chưa import.
- Chuyển `vite.config.ts` từ `__dirname` (không có mặc định trong ESM) sang `fileURLToPath(import.meta.url)`.
- Chuẩn hóa kiểu `File[]` ở các thao tác chọn/kéo thả/dán tệp trong trình soạn thảo.

## Kết quả chạy thử trong môi trường hiện tại

- `node --test tests/backend.test.mjs`: **PASS — 17 tests, 0 failures** (bao gồm suite root và các subtests).
- `node --check` trên 17 Cloudflare Pages Functions: **PASS**.
- `python3 scripts/verify_release.py`: **17 Functions PASS; 167 relative imports/named exports được kiểm tra, 0 đường dẫn/import gãy; tổng 69 tệp**. Script dừng ở bước TypeScript/React vì thiếu `@babel/core` trong môi trường hiện tại.
- `npm ci`: **CHƯA THỂ XÁC MINH**. Môi trường không phân giải được `registry.npmjs.org`; vì thế thư viện không tải được.
- `npm run lint`: **CHƯA THỂ XÁC MINH ĐẦY ĐỦ** do thiếu các package của dự án (`react`, `vite`, `@types/react`...). Lỗi TypeScript phát sinh khi thiếu dependency không được xem là kết quả kiểm tra sạch.
- `npm run build`: **CHƯA THỂ XÁC MINH** vì chưa cài được Vite; lệnh báo `vite: not found`.

Không có thao tác triển khai production, thay đổi Cloudflare binding hoặc truy cập dữ liệu D1 remote.

## Đối chiếu với log Cloudflare

Log Cloudflare được cung cấp ghi `Found wrangler.json file`, trong khi gói nguồn đang sửa có `wrangler.jsonc`. Đây là khác biệt tên tệp cần đối chiếu với mục **Root directory** trong cấu hình Pages và thư mục đã commit. Nếu sau khi cập nhật gói này Cloudflare vẫn báo đang đọc `wrangler.json` hoặc vẫn yêu cầu `esbuild@0.28.2`, nhiều khả năng Pages đang cài dependency từ một manifest/lockfile khác với hai tệp đã đồng bộ trong gói này. Khi đó cần chỉnh đúng root directory/thư mục dự án được Pages build; không nên thêm bừa các gói vào lockfile khác.
