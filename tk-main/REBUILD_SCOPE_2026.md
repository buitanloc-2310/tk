# Sky First Member Portal — Rebuild Scope 2026

- Rebuild, not CSS patch stacking. Existing API/data retained where compatible.
- Multi-unit membership; role and permission scoped per unit; users outside shared unit are not discoverable by default.
- Modern responsive workspace and large/full-screen member record.
- Preserve all 15 admin member areas: Thông tin cá nhân; Thông tin SFN; Đơn vị/vai trò; Mục tiêu; Công việc; Hoạt động; GCN; Thành tích; Quá trình công tác; Thẻ; Tài liệu; Tài khoản; Phân quyền; Đánh giá; Nhật ký.
- Login/Register: no Google; registration reuses account-request workflow; all required; education + workplace; automatic under-18 guardian flow.
- Long-term modules: digital identity, public profile/privacy, CV Studio, digital member card, QR center/scanner, directory, organization, activities/check-in, tasks, documents, notifications, support, security, admin/audit.
- Sensitive identity/guardian data never exposed to public profile, QR, CV, card, or public lookup.
- Cloudflare deploy root is exactly tk-main/ with runtime project at tk-main/tk-main/.

## Implemented baseline in this package
- Deployment package normalized to exactly two project levels; root Wrangler points to the production runtime source.
- Modern login/register without Google and without the five homepage-style navigation items.
- Registration keeps the account-request workflow, mandatory identity/education/work/unit data, and automatic guardian section for minors.
- Multi-unit account model and shared-unit directory isolation are enforced by backend API; network-wide visibility remains permission-scoped.
- Authenticated workspace rebuilt with modern sidebar, unit/workspace switcher, ecosystem popover, dashboard identity hero, and unit-scoped member directory.
- Admin member record opens as a near-full-screen workspace and preserves all 15 management areas.
- DOM update helpers are used for dynamic status/directory surfaces to avoid null-innerHTML crashes during async rerenders.
- Existing D1/R2 data APIs and historical records are retained rather than replaced with demo data.

## Final unified implementation — 2026-09-21
- Một baseline duy nhất; không dùng lại fixed-v1/v2 hoặc tầng source cũ.
- Member Workspace mở gần toàn màn hình và giữ đủ 15 phân hệ quản trị hồ sơ.
- Sidebar/topbar/dashboard/admin member list dùng cùng một design system.
- Multi-unit workspace switcher và directory theo phạm vi đơn vị được giữ trong kiến trúc chính.
- Không Google login; không Cổng Học thuật; đăng ký tiếp tục dùng account-request workflow.
- Luồng dưới 18 tuổi vẫn chạy theo ngày sinh nhưng không hiển thị câu chú thích đã yêu cầu xóa.
- Không tạo DOM id membersBox lồng trùng nhau trong render danh sách thành viên.
