import { uploadMedia } from '../../lib/firebase';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Image as ImageIcon,
  Users,
  Power,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Shield,
  Code2,
  PenTool,
  Plus,
  Trash2,
  Edit2,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  KeyRound,
  Wrench,
  Edit3,
  RefreshCw,
  ShieldCheck,
  Search,
  Database,
  Cloud,
  CloudUpload,
  CloudDownload,
  AlertCircle,
  Info,
  Play,
  BarChart3,
  Send,
  Archive,
  Globe,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { ImageUrlInput } from '../../components/UIPrimitives';
import { useDataContext } from '../../context/DataContext';
import {
  AdminUser,
  AdminUserRole,
  SiteClosedReason,
  PageRoute,
  IntroSettings,
  EmailSystemSettings,
  AutomationSystemSettings,
  SeoSystemSettings,
  AdminCapability,
} from '../../types';
import {
  listAdminAccounts,
  createAdminAccount,
  updateAdminAccount,
  deleteAdminAccount,
  resetAdminPassword,
} from '../../lib/firebase';
import { adminApi } from '../../lib/firebase';
import { ALL_CAPABILITIES, ROLE_CAPABILITIES } from '../../lib/firebase';

interface AdminSettingsProps {
  onShowToast: (msg: string) => void;
  onNavigate?: (page: PageRoute) => void;
}

const CONFIG_GROUPS_18 = [
  { id: '2.1', code: 'brand_identity', title: 'Nhận diện & Thông tin chung', desc: 'Tên website, mô tả, logo sáng/tối, favicon, thông tin liên hệ và bản quyền chân trang', scope: 'public' },
  { id: '2.2', code: 'design_tokens', title: 'Giao diện & Design Tokens', desc: 'Bảng màu thương hiệu (#061A3A, #0B66C3), font chữ, khoảng cách khối, độ bo góc', scope: 'public' },
  { id: '2.3', code: 'intro_motion', title: 'Trang chủ, Intro Video & Hiệu ứng', desc: 'Bật/tắt video intro, URL video, thời lượng logo, nút bỏ qua, tôn trọng prefers-reduced-motion', scope: 'public' },
  { id: '2.4', code: 'navigation', title: 'Điều hướng, Header, Footer & Menu', desc: 'Cấu trúc menu đa cấp, nút CTA chính trên thanh điều hướng, liên kết chân trang', scope: 'public' },
  { id: '2.5', code: 'pages_builder', title: 'Trang & Bố cục (Visual Builder)', desc: 'Thư viện khối chuẩn, bố cục trang chủ, lịch sử phiên bản và khôi phục trang', scope: 'public' },
  { id: '2.6', code: 'editorial_cms', title: 'Tin tức, Bài viết & Biên tập Gutenberg', desc: 'Chuyên mục, bài nổi bật, hẹn giờ xuất bản, lưu nháp tự động và mặc định hiển thị ảnh nguyên bản', scope: 'public' },
  { id: '2.7', code: 'programs_activities', title: 'Chương trình & Hoạt động', desc: 'Trạng thái chương trình, gắn biểu mẫu độc lập (formId), hiển thị hạn đăng ký', scope: 'public' },
  { id: '2.8', code: 'forms_registrations', title: 'Biểu mẫu & Đăng ký (Form Builder)', desc: 'Cấu hình trường, điều kiện hiển thị, snapshot lịch sử đơn, chống gửi trùng và xuất CSV', scope: 'public' },
  { id: '2.9', code: 'email_notifications', title: 'Email, Thông báo & Hàng đợi Outbox', desc: 'Nhà cung cấp email, người gửi, biến mẫu an toàn, xem trước không gửi thật, hàng đợi gửi lại', scope: 'secret' },
  { id: '2.10', code: 'automation_rules', title: 'Tự động hóa & Quy tắc vận hành', desc: 'Tự động xuất bản đúng giờ, tự động đóng form hết hạn, tự tạo redirect 301 khi đổi slug', scope: 'admin' },
  { id: '2.11', code: 'media_images', title: 'Media & Hình ảnh nguyên bản', desc: 'Hiển thị đầy đủ tỷ lệ gốc (original/contain), không tự cắt ảnh dọc/A4, hỗ trợ Lightbox phóng to', scope: 'public' },
  { id: '2.12', code: 'seo_sharing', title: 'SEO, Chia sẻ mạng xã hội & Sitemap', desc: 'Mẫu tiêu đề SEO, ảnh OG mặc định, tự động loại trang nháp/noIndex khỏi sitemap.xml', scope: 'public' },
  { id: '2.13', code: 'analytics_metrics', title: 'Thống kê truy cập & Số liệu thủ công', desc: 'Tách bạch bộ đếm lượt xem tự động (lọc bot & /admin) và số liệu nhập thủ công có nguồn/ghi chú', scope: 'admin' },
  { id: '2.14', code: 'security_antispam', title: 'Bảo mật, Chống spam & Kiểm soát truy cập', desc: 'Honeypot chống bot, giới hạn tần suất gửi đơn, bảo vệ tài khoản Chủ sở hữu hệ thống', scope: 'admin' },
  { id: '2.15', code: 'rbac_permissions', title: 'Người dùng, Vai trò & Phân quyền chi tiết', desc: 'Phân quyền theo vai trò kết hợp bảng quyền chi tiết (Capabilities) kiểm tra tại máy chủ', scope: 'admin' },
  { id: '2.16', code: 'backup_recovery', title: 'Sao lưu, Phiên bản & Khôi phục (SHA-256)', desc: 'Tạo bản sao lưu toàn diện có mã băm SHA-256, kiểm tra tính toàn vẹn và khôi phục an toàn', scope: 'admin' },
  { id: '2.17', code: 'integrations', title: 'Tích hợp dịch vụ ngoài', desc: 'Kết nối Cloudflare D1, R2 Media, Firebase Authentication và dịch vụ gửi thư', scope: 'secret' },
  { id: '2.18', code: 'maintenance_diagnostics', title: 'Bảo trì, Chẩn đoán & Sức khỏe hệ thống', desc: 'Chế độ bảo trì trang công khai (giữ /admin hoạt động 100%) và kiểm tra 4 mức trạng thái', scope: 'admin' },
];

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  onShowToast,
  onNavigate,
}) => {
  const {
    siteConfig,
    updateSiteConfig,
    adminUsers: contextAdminUsers,
    customPages,
    programs,
    networkUnits,
    newsArticles,
    isFirebaseConfigured,
    isFirebaseSyncing,
    firebaseSyncStatus,
    firebaseSyncMessage,
    uploadAllDataToFirestore,
    fetchDataFromFirestore,
  } = useDataContext();

  const [configSearch, setConfigSearch] = useState('');
  const [activeCenterTab, setActiveCenterTab] = useState<
    'overview' | 'brand-intro' | 'email-outbox' | 'automation-seo' | 'analytics' | 'backup' | 'users' | 'maintenance'
  >('overview');

  // ==========================================
  // 1. NHẬN DIỆN & VIDEO INTRO STATE
  // ==========================================
  const [logoUrl, setLogoUrl] = useState(siteConfig.logoUrl || '');
  const [siteName, setSiteName] = useState(siteConfig.siteName || '');
  const [siteDescription, setSiteDescription] = useState(
    siteConfig.siteDescription || siteConfig.tagline || ''
  );
  const [tagline, setTagline] = useState(siteConfig.tagline || '');

  const [introConfig, setIntroConfig] = useState<IntroSettings>(() => ({
    enabled: siteConfig.intro?.enabled !== false,
    videoUrl: siteConfig.intro?.videoUrl || '/brand/sky-first-intro.mp4',
    posterUrl: siteConfig.intro?.posterUrl || '/brand/sky-first-network-logo.png',
    logoUrl: siteConfig.intro?.logoUrl || '/brand/sky-first-network-web.png',
    logoRevealDurationMs: siteConfig.intro?.logoRevealDurationMs || 1400,
    maxWaitDurationMs: siteConfig.intro?.maxWaitDurationMs || 8000,
    allowSkip: siteConfig.intro?.allowSkip !== false,
    skipLabel: siteConfig.intro?.skipLabel || 'Bỏ qua Intro',
    playMode: siteConfig.intro?.playMode || 'every_home_load',
    respectReducedMotion: siteConfig.intro?.respectReducedMotion !== false,
    fallbackMode: siteConfig.intro?.fallbackMode || 'logo_fade',
  }));

  // ==========================================
  // 2. EMAIL & OUTBOX QUEUE STATE
  // ==========================================
  const [emailSettings, setEmailSettings] = useState<EmailSystemSettings>(() => ({
    enabled: Boolean(siteConfig.emailSettings?.enabled),
    provider: siteConfig.emailSettings?.provider || 'none',
    senderName: siteConfig.emailSettings?.senderName || 'Sky First Network',
    senderEmail: siteConfig.emailSettings?.senderEmail || 'lienhe@skyfirst.io.vn',
    replyToEmail: siteConfig.emailSettings?.replyToEmail || 'lienhe@skyfirst.io.vn',
    adminRecipientEmails: siteConfig.emailSettings?.adminRecipientEmails || 'lienhe@skyfirst.io.vn',
    apiKeyMasked: siteConfig.emailSettings?.apiKeyMasked || '',
    sendOnProgramRegistration: siteConfig.emailSettings?.sendOnProgramRegistration !== false,
    sendAdminAlertOnRegistration: siteConfig.emailSettings?.sendAdminAlertOnRegistration !== false,
    sendOnContactSubmission: siteConfig.emailSettings?.sendOnContactSubmission !== false,
    sendOnStatusChange: Boolean(siteConfig.emailSettings?.sendOnStatusChange),
    retryMaxAttempts: siteConfig.emailSettings?.retryMaxAttempts || 3,
  }));
  const [newEmailApiKey, setNewEmailApiKey] = useState('');
  const [outboxItems, setOutboxItems] = useState<any[]>([]);
  const [outboxLoading, setOutboxLoading] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('lienhe@skyfirst.io.vn');
  const [previewSubject, setPreviewSubject] = useState('[{{site_name}}] Xác nhận đăng ký {{program_title}} - Mã {{submission_id}}');
  const [previewBody, setPreviewBody] = useState(
    'Xin chào {{applicant_name}},\n\nBan Tổ chức {{site_name}} đã ghi nhận đơn đăng ký của bạn cho chương trình "{{program_title}}" (Mã hồ sơ: {{submission_id}}) vào lúc {{submitted_at}}.\n\nMọi thắc mắc xin liên hệ: {{contact_email}}.'
  );
  const [previewResult, setPreviewResult] = useState<{ subject: string; body: string; allowedVariables: string[] } | null>(null);

  // ==========================================
  // 3. TỰ ĐỘNG HÓA & SEO STATE
  // ==========================================
  const [automationSettings, setAutomationSettings] = useState<AutomationSystemSettings>(() => ({
    enableScheduledPublishing: siteConfig.automationSettings?.enableScheduledPublishing !== false,
    enableAutoCloseExpiredForms: siteConfig.automationSettings?.enableAutoCloseExpiredForms !== false,
    enableAutoRedirectOnSlugChange: siteConfig.automationSettings?.enableAutoRedirectOnSlugChange !== false,
    enableAutoSitemapUpdate: siteConfig.automationSettings?.enableAutoSitemapUpdate !== false,
    enableAutoEndedProgramBadge: siteConfig.automationSettings?.enableAutoEndedProgramBadge !== false,
    autoArchiveOldDraftDays: siteConfig.automationSettings?.autoArchiveOldDraftDays || 0,
  }));

  const [seoSettings, setSeoSettings] = useState<SeoSystemSettings>(() => ({
    titleTemplate: siteConfig.seoSettings?.titleTemplate || '%s | Sky First Network',
    defaultTitle: siteConfig.seoSettings?.defaultTitle || 'Sky First Network — Mạng lưới Giáo dục & Phát triển Cộng đồng',
    defaultDescription:
      siteConfig.seoSettings?.defaultDescription ||
      'Sky First Network kết nối các hoạt động giáo dục, phát triển người trẻ, tình nguyện và truyền thông cộng đồng.',
    defaultOgImage: siteConfig.seoSettings?.defaultOgImage || '/brand/sky-first-network-logo.png',
    canonicalDomain: siteConfig.seoSettings?.canonicalDomain || 'https://skyfirst.io.vn',
    allowIndexing: siteConfig.seoSettings?.allowIndexing !== false,
  }));

  // ==========================================
  // 4. THỐNG KÊ TRUY CẬP (TỰ ĐỘNG VS THỦ CÔNG)
  // ==========================================
  const [analyticsData, setAnalyticsData] = useState<{
    totalAutoViews: number;
    byPage: any[];
    byDay: any[];
    manualEntries: any[];
  }>({ totalAutoViews: 0, byPage: [], byDay: [], manualEntries: [] });
  const [manualLabel, setManualLabel] = useState('');
  const [manualValue, setManualValue] = useState('');
  const [manualSource, setManualSource] = useState('');
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualNote, setManualNote] = useState('');

  // ==========================================
  // 5. SAO LƯU & KHÔI PHỤC (SHA-256)
  // ==========================================
  const [backups, setBackups] = useState<any[]>([]);
  const [backupLabel, setBackupLabel] = useState('');
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const [backupBusy, setBackupBusy] = useState(false);

  // ==========================================
  // 6. TÀI KHOẢN & PHÂN QUYỀN CHI TIẾT
  // ==========================================
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(contextAdminUsers);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AdminUserRole>('all');
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<AdminUser | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState<AdminUserRole>('admin');
  const [userPermissions, setUserPermissions] = useState<AdminCapability[]>(ROLE_CAPABILITIES.admin);
  const [userStatus, setUserStatus] = useState<'active' | 'inactive'>('active');
  const [userNote, setUserNote] = useState('');
  const [emailError, setEmailError] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userPasswordConfirm, setUserPasswordConfirm] = useState('');
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [showUserPasswordConfirm, setShowUserPasswordConfirm] = useState(false);
  const [userSaving, setUserSaving] = useState(false);

  // ==========================================
  // 7. TRẠNG THÁI ĐÓNG / MỞ WEBSITE
  // ==========================================
  const [siteStatus, setSiteStatus] = useState<'active' | 'closed'>(siteConfig.siteStatus || 'active');
  const [closedReason, setClosedReason] = useState<SiteClosedReason>(siteConfig.closedReason || 'maintenance');
  const [closedReasonText, setClosedReasonText] = useState(
    siteConfig.closedReasonText || 'Bảo trì & Nâng cấp hệ thống định kỳ'
  );
  const [closedMessage, setClosedMessage] = useState(
    siteConfig.closedMessage ||
      'Website Sky First Network đang tạm thời đóng để nâng cấp và biên tập nội dung mới. Chúng tôi sẽ sớm quay trở lại!'
  );
  const [closedEstimatedReopen, setClosedEstimatedReopen] = useState(
    siteConfig.closedEstimatedReopen || 'Dự kiến hoàn tất trong ngày'
  );
  const [closedNoticeType, setClosedNoticeType] = useState<'banner' | 'lockscreen'>(
    siteConfig.closedNoticeType || 'lockscreen'
  );

  const refreshAdminUsers = async () => {
    setAdminUsersLoading(true);
    try {
      const rows = await listAdminAccounts();
      setAdminUsers(rows as AdminUser[]);
    } catch (e: any) {
      onShowToast(e?.message || 'Không tải được danh sách quản trị.');
    } finally {
      setAdminUsersLoading(false);
    }
  };

  const loadOutbox = async () => {
    setOutboxLoading(true);
    try {
      const res: any = await adminApi('/api/system?action=email-outbox');
      setOutboxItems(Array.isArray(res?.items) ? res.items : []);
    } catch {
      setOutboxItems([]);
    } finally {
      setOutboxLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const res: any = await adminApi('/api/system?action=analytics');
      if (res?.ok) {
        setAnalyticsData({
          totalAutoViews: Number(res.totalAutoViews || 0),
          byPage: Array.isArray(res.byPage) ? res.byPage : [],
          byDay: Array.isArray(res.byDay) ? res.byDay : [],
          manualEntries: Array.isArray(res.manualEntries) ? res.manualEntries : [],
        });
      }
    } catch {}
  };

  const loadBackups = async () => {
    try {
      const res: any = await adminApi('/api/system?action=backups');
      setBackups(Array.isArray(res?.items) ? res.items : []);
    } catch {}
  };

  useEffect(() => {
    refreshAdminUsers();
    loadOutbox();
    loadAnalytics();
    loadBackups();
  }, []);

  const filteredGroups = useMemo(() => {
    const q = configSearch.trim().toLowerCase();
    if (!q) return CONFIG_GROUPS_18;
    return CONFIG_GROUPS_18.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.desc.toLowerCase().includes(q) ||
        g.code.toLowerCase().includes(q) ||
        g.id.includes(q)
    );
  }, [configSearch]);

  const handleSaveBrandAndIntro = async () => {
    const ok = await updateSiteConfig({
      logoUrl: logoUrl.trim(),
      siteName: siteName.trim(),
      siteDescription: siteDescription.trim(),
      tagline: tagline.trim() || siteDescription.trim(),
      intro: introConfig,
    });
    onShowToast(
      ok
        ? 'Đã lưu Nhận diện thương hiệu & Cấu hình Video Intro.'
        : 'Chưa lưu được cấu hình. Hãy kiểm tra quyền hoặc kết nối.'
    );
  };

  const handleSaveEmailConfig = async () => {
    const masked =
      newEmailApiKey.trim().length > 4
        ? `••••••••${newEmailApiKey.trim().slice(-4)}`
        : emailSettings.apiKeyMasked;
    const nextEmail: EmailSystemSettings = {
      ...emailSettings,
      apiKeyMasked: masked,
    };
    setEmailSettings(nextEmail);
    setNewEmailApiKey('');
    const ok = await updateSiteConfig({ emailSettings: nextEmail });
    onShowToast(
      ok
        ? 'Đã lưu cấu hình Email & Thông báo (Khóa bí mật đã được che an toàn).'
        : 'Không thể lưu cấu hình Email.'
    );
  };

  const handlePreviewEmail = async () => {
    try {
      const res: any = await adminApi('/api/system?action=email-preview', {
        method: 'POST',
        body: JSON.stringify({
          subjectTemplate: previewSubject,
          bodyTemplate: previewBody,
        }),
      });
      if (res?.ok) {
        setPreviewResult({
          subject: res.renderedSubject,
          body: res.renderedBody,
          allowedVariables: res.allowedVariables || [],
        });
      }
    } catch (e: any) {
      onShowToast(e?.message || 'Không thể xem trước mẫu email.');
    }
  };

  const handleSendTestEmail = async () => {
    try {
      const res: any = await adminApi('/api/system?action=email-test', {
        method: 'POST',
        body: JSON.stringify({ recipientEmail: testEmailRecipient }),
      });
      onShowToast(res?.message || 'Đã ghi nhận yêu cầu gửi email thử.');
      await loadOutbox();
    } catch (e: any) {
      onShowToast(e?.message || 'Không thể tạo email thử.');
    }
  };

  const handleRetryOutboxItem = async (id: string) => {
    try {
      const res: any = await adminApi('/api/system?action=email-retry', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });
      onShowToast(`Đã cập nhật trạng thái hàng đợi: ${res?.status || 'queued'}`);
      await loadOutbox();
    } catch (e: any) {
      onShowToast(e?.message || 'Không thể thử gửi lại email.');
    }
  };

  const handleSaveAutomationAndSeo = async () => {
    const ok = await updateSiteConfig({
      automationSettings,
      seoSettings,
    });
    onShowToast(
      ok
        ? 'Đã lưu cấu hình Tự động hóa & SEO toàn hệ thống.'
        : 'Không thể lưu cấu hình Tự động hóa & SEO.'
    );
  };

  const handleRunAutomationsNow = async () => {
    try {
      const res: any = await adminApi('/api/system?action=run-automations', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      onShowToast(
        `Đã thực thi tự động hóa: Xuất bản ${res?.published?.publishedCount || 0} mục đến hạn, đóng ${
          res?.closedFormsCount || 0
        } biểu mẫu quá hạn.`
      );
    } catch (e: any) {
      onShowToast(e?.message || 'Không thể chạy tác vụ tự động.');
    }
  };

  const handleAddManualAnalytics = async () => {
    if (!manualLabel.trim()) {
      onShowToast('Vui lòng nhập tên chỉ số thống kê thủ công.');
      return;
    }
    try {
      await adminApi('/api/system?action=analytics-manual', {
        method: 'POST',
        body: JSON.stringify({
          metricLabel: manualLabel.trim(),
          metricValue: Number(manualValue || 0),
          source: manualSource.trim() || 'Báo cáo Ban Điều hành',
          recordedDate: manualDate,
          note: manualNote.trim(),
        }),
      });
      setManualLabel('');
      setManualValue('');
      setManualSource('');
      setManualNote('');
      onShowToast('Đã lưu bản ghi số liệu thủ công (tách biệt với số đếm tự động).');
      await loadAnalytics();
    } catch (e: any) {
      onShowToast(e?.message || 'Không thể thêm số liệu thủ công.');
    }
  };

  const handleDeleteManualAnalytics = async (id: string) => {
    try {
      await adminApi(`/api/system?action=analytics-manual&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      onShowToast('Đã xóa bản ghi số liệu thủ công.');
      await loadAnalytics();
    } catch (e: any) {
      onShowToast(e?.message || 'Không thể xóa bản ghi.');
    }
  };

  const handleCreateBackup = async () => {
    setBackupBusy(true);
    try {
      const res: any = await adminApi('/api/system?action=backup-create', {
        method: 'POST',
        body: JSON.stringify({
          label: backupLabel.trim() || `Sao lưu hệ thống ${new Date().toLocaleString('vi-VN')}`,
        }),
      });
      setBackupLabel('');
      onShowToast(`Đã tạo bản sao lưu thành công (SHA-256: ${String(res?.sha256 || '').slice(0, 12)}...).`);
      await loadBackups();
    } catch (e: any) {
      onShowToast(e?.message || 'Không thể tạo bản sao lưu.');
    } finally {
      setBackupBusy(false);
    }
  };

  const handleConfirmRestoreBackup = async () => {
    if (!restoreConfirmId) return;
    setBackupBusy(true);
    try {
      await adminApi('/api/system?action=backup-restore', {
        method: 'POST',
        body: JSON.stringify({
          id: restoreConfirmId,
          confirmText: restoreConfirmText.trim(),
        }),
      });
      onShowToast('Đã khôi phục dữ liệu từ bản sao lưu và tự động tạo điểm lưu dự phòng trước khi ghi đè!');
      setRestoreConfirmId(null);
      setRestoreConfirmText('');
      await fetchDataFromFirestore();
      await loadBackups();
    } catch (e: any) {
      onShowToast(e?.message || 'Khôi phục thất bại.');
    } finally {
      setBackupBusy(false);
    }
  };

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const item = await uploadMedia(file, true);
      setLogoUrl(item.url);
      onShowToast('Đã tải logo vào thư viện. Bấm Lưu để áp dụng.');
    } catch (error) {
      onShowToast(error instanceof Error ? error.message : 'Không tải được logo.');
    } finally {
      e.target.value = '';
    }
  };

  const generateAdminPassword = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%_-';
    const bytes = new Uint32Array(18);
    crypto.getRandomValues(bytes);
    const generated = Array.from(bytes, (n) => alphabet[n % alphabet.length]).join('');
    setUserPassword(generated);
    setUserPasswordConfirm(generated);
    setShowUserPassword(true);
    setShowUserPasswordConfirm(true);
    setEmailError('');
  };
  const passwordChecks = {
    length: userPassword.length >= 10,
    upper: /[A-Z]/.test(userPassword),
    lower: /[a-z]/.test(userPassword),
    digit: /[0-9]/.test(userPassword),
  };
  const passwordStrong =
    passwordChecks.length && passwordChecks.upper && passwordChecks.lower && passwordChecks.digit;

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserEmail('');
    setUserName('');
    setUserRole('admin');
    setUserPermissions(ROLE_CAPABILITIES.admin);
    setUserStatus('active');
    setUserNote('');
    setEmailError('');
    setUserPassword('');
    setUserPasswordConfirm('');
    setShowUserPassword(false);
    setShowUserPasswordConfirm(false);
    setUserModalOpen(true);
  };

  const handleOpenEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setUserEmail(user.email);
    setUserName(user.name);
    setUserRole(user.role);
    setUserPermissions(
      Array.isArray(user.permissions) && user.permissions.length > 0
        ? user.permissions
        : ROLE_CAPABILITIES[user.role] || ROLE_CAPABILITIES.editor
    );
    setUserStatus(user.status);
    setUserNote(user.note || '');
    setEmailError('');
    setUserPassword('');
    setUserPasswordConfirm('');
    setShowUserPassword(false);
    setShowUserPasswordConfirm(false);
    setUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (userSaving) return;
    const trimmedEmail = userEmail.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Địa chỉ email không hợp lệ');
      return;
    }
    if (!editingUser && !passwordStrong) {
      setEmailError('Mật khẩu cần ít nhất 10 ký tự, có chữ hoa, chữ thường và số.');
      return;
    }
    if (editingUser && userPassword && !passwordStrong) {
      setEmailError('Mật khẩu mới cần ít nhất 10 ký tự, có chữ hoa, chữ thường và số.');
      return;
    }
    if (userPassword && userPassword !== userPasswordConfirm) {
      setEmailError('Xác nhận mật khẩu chưa trùng khớp.');
      return;
    }
    setUserSaving(true);
    setEmailError('');
    try {
      if (editingUser) {
        await updateAdminAccount(editingUser.id, {
          name: userName.trim() || trimmedEmail.split('@')[0],
          role: userRole,
          status: userStatus,
          note: userNote.trim(),
          permissions: userPermissions,
        });
        if (userPassword) await resetAdminPassword(editingUser.id, userPassword);
        onShowToast(
          userPassword
            ? `Đã cập nhật tài khoản, quyền hạn và đặt lại mật khẩu ${trimmedEmail}.`
            : `Đã cập nhật tài khoản và quyền hạn ${trimmedEmail}.`
        );
      } else {
        await createAdminAccount({
          email: trimmedEmail,
          password: userPassword,
          name: userName.trim() || trimmedEmail.split('@')[0],
          role: userRole,
          status: userStatus,
          note: userNote.trim(),
          permissions: userPermissions,
        });
        onShowToast(`Đã tạo tài khoản quản trị ${trimmedEmail}.`);
      }
      await refreshAdminUsers();
      setUserModalOpen(false);
      setUserPassword('');
      setUserPasswordConfirm('');
    } catch (e: any) {
      setEmailError(e?.message || 'Không thể lưu tài khoản quản trị.');
    } finally {
      setUserSaving(false);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    try {
      await deleteAdminAccount(deleteConfirmUser.id);
      onShowToast(`Đã xóa tài khoản ${deleteConfirmUser.email}`);
      await refreshAdminUsers();
      setDeleteConfirmUser(null);
    } catch (e: any) {
      onShowToast(e?.message || 'Không thể xóa tài khoản quản trị.');
    }
  };

  const handleSaveSiteStatus = async () => {
    const ok = await updateSiteConfig({
      siteStatus,
      closedReason,
      closedReasonText: closedReasonText.trim(),
      closedMessage: closedMessage.trim(),
      closedEstimatedReopen: closedEstimatedReopen.trim(),
      closedNoticeType,
    });
    if (!ok) {
      onShowToast('Thay đổi chưa ghi được lên máy chủ.');
      return;
    }
    onShowToast(
      siteStatus === 'closed'
        ? 'Đã chuyển website sang chế độ Bảo trì (Trang /admin vẫn hoạt động 100%).'
        : 'Đã mở website công khai hoạt động bình thường.'
    );
  };

  const filteredUsers = adminUsers.filter((u) => {
    const matchSearch =
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.name.toLowerCase().includes(userSearch.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const getRoleBadge = (role: AdminUserRole) => {
    switch (role) {
      case 'developer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Code2 size={13} />
            <span>Lập trình viên</span>
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Shield size={13} />
            <span>Quản trị viên</span>
          </span>
        );
      case 'editor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <PenTool size={13} />
            <span>Biên tập viên</span>
          </span>
        );
    }
  };

  const toggleCapability = (cap: AdminCapability) => {
    setUserPermissions((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* THANH ĐIỀU HƯỚNG TRUNG TÂM CẤU HÌNH TOÀN DIỆN (18 NHÓM PHỤ LỤC VIII)      */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Sliders className="text-sky-600" size={20} />
              <span>Trung Tâm Cấu Hình Hệ Thống & Tự Động Hóa (18 Nhóm Cấu Hình)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Quản trị tập trung nhận diện, video intro, email & hàng đợi outbox, tự động hóa hẹn giờ, SEO, thống kê truy cập, sao lưu SHA-256 và phân quyền chi tiết.
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={configSearch}
              onChange={(e) => setConfigSearch(e.target.value)}
              placeholder="Tìm nhanh cài đặt (vd: intro, email, seo, backup)..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
          {[
            { id: 'overview', label: '18 Nhóm Cấu Hình' },
            { id: 'brand-intro', label: 'Nhận Diện & Video Intro' },
            { id: 'email-outbox', label: 'Email & Hàng Đợi Outbox' },
            { id: 'automation-seo', label: 'Tự Động Hóa & SEO' },
            { id: 'analytics', label: 'Thống Kê Truy Cập' },
            { id: 'backup', label: 'Sao Lưu & Khôi Phục' },
            { id: 'users', label: 'Tài Khoản & Phân Quyền' },
            { id: 'maintenance', label: 'Bảo Trì & Đồng Bộ D1' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCenterTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeCenterTab === tab.id
                  ? 'bg-[#071B3A] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: BẢNG ĐIỀU KHIỂN 18 NHÓM CẤU HÌNH (CÓ TÌM KIẾM & METADATA)          */}
      {/* ========================================================================= */}
      {activeCenterTab === 'overview' && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Danh mục 18 nhóm cấu hình chuẩn hóa ({filteredGroups.length}/18 nhóm)
            </h3>
            <span className="text-[11px] text-slate-500">
              Phân tách rõ: <b className="text-emerald-700">public</b> • <b className="text-sky-700">admin</b> • <b className="text-rose-700">secret</b>
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredGroups.map((g) => (
              <div
                key={g.id}
                className="rounded-xl border border-slate-200 p-4 hover:border-sky-300 transition bg-slate-50/40 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                      Nhóm {g.id} • {g.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        g.scope === 'secret'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : g.scope === 'admin'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {g.scope}
                    </span>
                  </div>
                  <h4 className="text-xs font-extrabold text-slate-900">{g.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{g.desc}</p>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (['2.1', '2.3'].includes(g.id)) setActiveCenterTab('brand-intro');
                      else if (g.id === '2.9') setActiveCenterTab('email-outbox');
                      else if (['2.10', '2.12'].includes(g.id)) setActiveCenterTab('automation-seo');
                      else if (g.id === '2.13') setActiveCenterTab('analytics');
                      else if (g.id === '2.15') setActiveCenterTab('users');
                      else if (g.id === '2.16') setActiveCenterTab('backup');
                      else setActiveCenterTab('maintenance');
                    }}
                    className="text-[11px] font-bold text-[#0B66C3] hover:underline"
                  >
                    Mở cấu hình →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: NHẬN DIỆN THƯƠNG HIỆU & VIDEO INTRO TRANG CHỦ                      */}
      {/* ========================================================================= */}
      {(activeCenterTab === 'brand-intro' || activeCenterTab === 'overview') && (
        <section
          id="section-brand"
          className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-8"
        >
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ImageIcon className="text-sky-600" size={18} />
              <span>Nhóm 2.1 & 2.3 — Nhận Diện Thương Hiệu & Video Intro Trang Chủ</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cấu hình logo, tên website, mô tả thương hiệu và luồng phát Video Intro khi mở/tải lại trang chủ (`/`).
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Logo Thương Hiệu
                </label>
                <ImageUrlInput
                  label="Logo đang sử dụng"
                  value={logoUrl}
                  onChange={setLogoUrl}
                  helperText="Tải logo trực tiếp hoặc chọn từ thư viện Media."
                />
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition">
                    <ImageIcon size={14} />
                    <span>Tải ảnh từ thiết bị</span>
                    <input type="file" accept="image/*" onChange={handleLogoFileUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên Gọi Website <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 font-bold rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Khẩu hiệu / Miêu tả ngắn
                  </label>
                  <input
                    type="text"
                    value={siteDescription}
                    onChange={(e) => setSiteDescription(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              {/* Cấu hình Video Intro */}
              <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Cấu hình Video Intro Trang Chủ (Mục 5 Đặc tả)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Phát từ đầu khi mở/tải lại trang chủ → hiện logo Sky First Network → vào trang chủ. Không phát lại khi chuyển trang nội bộ, không chặn URL bài viết.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={introConfig.enabled}
                      onChange={(e) => setIntroConfig((p) => ({ ...p, enabled: e.target.checked }))}
                    />
                    <span>Bật Intro</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Đường dẫn Video Intro (MP4/WebM)
                    </label>
                    <input
                      type="text"
                      value={introConfig.videoUrl}
                      onChange={(e) => setIntroConfig((p) => ({ ...p, videoUrl: e.target.value }))}
                      placeholder="/brand/sky-first-intro.mp4"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Logo xuất hiện sau khi Video kết thúc
                    </label>
                    <input
                      type="text"
                      value={introConfig.logoUrl}
                      onChange={(e) => setIntroConfig((p) => ({ ...p, logoUrl: e.target.value }))}
                      placeholder="/brand/sky-first-network-web.png"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Thời lượng hiển thị Logo (ms)
                    </label>
                    <input
                      type="number"
                      min={500}
                      max={5000}
                      step={100}
                      value={introConfig.logoRevealDurationMs}
                      onChange={(e) =>
                        setIntroConfig((p) => ({ ...p, logoRevealDurationMs: Number(e.target.value || 1400) }))
                      }
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Chế độ phát Intro
                    </label>
                    <select
                      value={introConfig.playMode}
                      onChange={(e) => setIntroConfig((p) => ({ ...p, playMode: e.target.value as any }))}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white"
                    >
                      <option value="every_home_load">Mỗi khi mở / tải lại Trang chủ</option>
                      <option value="once_per_session">Một lần mỗi phiên truy cập</option>
                      <option value="disabled">Tắt</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-1 text-xs">
                  <label className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={introConfig.allowSkip}
                      onChange={(e) => setIntroConfig((p) => ({ ...p, allowSkip: e.target.checked }))}
                    />
                    <span>Hiển thị nút "{introConfig.skipLabel || 'Bỏ qua Intro'}"</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={introConfig.respectReducedMotion}
                      onChange={(e) => setIntroConfig((p) => ({ ...p, respectReducedMotion: e.target.checked }))}
                    />
                    <span>Tôn trọng prefers-reduced-motion</span>
                  </label>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveBrandAndIntro}
                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition inline-flex items-center gap-2"
              >
                <Save size={16} />
                <span>Lưu Nhận Diện & Cấu Hình Intro</span>
              </button>
            </div>

            <div className="lg:col-span-5 bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Eye size={14} className="text-sky-600" />
                <span>Xem Trước Nhận Diện Thương Hiệu</span>
              </h4>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <img
                    src={logoUrl || '/brand/sky-first-network-web.png'}
                    alt="Logo"
                    className="h-11 w-auto object-contain"
                  />
                  <div>
                    <div className="font-extrabold text-sm text-slate-900">{siteName || 'Sky First Network'}</div>
                    <div className="text-[11px] text-slate-500">{siteDescription}</div>
                  </div>
                </div>
              </div>
              <div className="bg-[#061A3A] text-white p-5 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300 block">
                  Xem trước màn hình Intro & Chân trang
                </span>
                <img
                  src={introConfig.logoUrl || logoUrl || '/brand/sky-first-network-web.png'}
                  alt="Logo Intro"
                  className="h-12 w-auto object-contain"
                />
                <p className="text-xs text-slate-300">
                  Chế độ Intro: <b>{introConfig.enabled ? 'Đang bật' : 'Đang tắt'}</b> • Thời lượng hiển thị Logo:{' '}
                  <b>{introConfig.logoRevealDurationMs}ms</b>
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CẤU HÌNH EMAIL, THÔNG BÁO & HÀNG ĐỢI OUTBOX (MỤC III PHỤ LỤC VIII) */}
      {/* ========================================================================= */}
      {(activeCenterTab === 'email-outbox' || activeCenterTab === 'overview') && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Mail className="text-sky-600" size={18} />
                <span>Nhóm 2.9 — Hệ Thống Email, Biến Mẫu An Toàn & Hàng Đợi Outbox</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Không bao giờ báo gửi email thành công giả tạo. Nếu chưa cấu hình nhà cung cấp dịch vụ gửi thư, đơn đăng ký vẫn được lưu an toàn và bản ghi email được xếp vào hàng đợi với trạng thái rõ ràng.
              </p>
            </div>
            <button
              type="button"
              onClick={loadOutbox}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={13} className={outboxLoading ? 'animate-spin' : ''} />
              <span>Làm mới Outbox ({outboxItems.length})</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cấu hình dịch vụ & người gửi */}
            <div className="space-y-4 rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  1. Cấu hình dịch vụ gửi thư & Người nhận quản trị
                </h4>
                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={emailSettings.enabled}
                    onChange={(e) => setEmailSettings((p) => ({ ...p, enabled: e.target.checked }))}
                  />
                  <span>Bật dịch vụ gửi Email</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nhà cung cấp dịch vụ</label>
                  <select
                    value={emailSettings.provider}
                    onChange={(e) => setEmailSettings((p) => ({ ...p, provider: e.target.value as any }))}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="none">Chưa cấu hình (Chỉ lưu Hàng đợi Outbox)</option>
                    <option value="resend">Resend API</option>
                    <option value="cloudflare_email">Cloudflare Email Workers</option>
                    <option value="webhook">Webhook HTTP bảo mật</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Tên người gửi (Sender Name)</label>
                  <input
                    type="text"
                    value={emailSettings.senderName}
                    onChange={(e) => setEmailSettings((p) => ({ ...p, senderName: e.target.value }))}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Email gửi đi (Sender Email)</label>
                  <input
                    type="email"
                    value={emailSettings.senderEmail}
                    onChange={(e) => setEmailSettings((p) => ({ ...p, senderEmail: e.target.value }))}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Email nhận thông báo nội bộ</label>
                  <input
                    type="text"
                    value={emailSettings.adminRecipientEmails}
                    onChange={(e) => setEmailSettings((p) => ({ ...p, adminRecipientEmails: e.target.value }))}
                    placeholder="lienhe@skyfirst.io.vn, nhansu@skyfirst.io.vn"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  API Key / Secret (Đã che an toàn: {emailSettings.apiKeyMasked || 'Chưa đặt'})
                </label>
                <input
                  type="password"
                  value={newEmailApiKey}
                  onChange={(e) => setNewEmailApiKey(e.target.value)}
                  placeholder="Nhập khóa API mới nếu muốn thay đổi (không trả khóa thô về trình duyệt)"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={emailSettings.sendOnProgramRegistration}
                    onChange={(e) =>
                      setEmailSettings((p) => ({ ...p, sendOnProgramRegistration: e.target.checked }))
                    }
                  />
                  <span>Gửi xác nhận cho người đăng ký</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={emailSettings.sendAdminAlertOnRegistration}
                    onChange={(e) =>
                      setEmailSettings((p) => ({ ...p, sendAdminAlertOnRegistration: e.target.checked }))
                    }
                  />
                  <span>Báo cho Admin khi có đơn mới</span>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveEmailConfig}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Lưu cấu hình Email</span>
                </button>
                <div className="flex items-center gap-1.5">
                  <input
                    type="email"
                    value={testEmailRecipient}
                    onChange={(e) => setTestEmailRecipient(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono w-44"
                  />
                  <button
                    type="button"
                    onClick={handleSendTestEmail}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1"
                  >
                    <Send size={12} />
                    <span>Gửi email thử</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Xem trước mẫu Email với danh sách biến an toàn */}
            <div className="space-y-3 rounded-2xl border border-slate-200 p-5 bg-slate-50/50">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                2. Kiểm tra & Xem trước Mẫu Email (Không gửi thật)
              </h4>
              <p className="text-[11px] text-slate-500">
                Chỉ chấp nhận các biến trong danh sách cho phép: <code>{'{{site_name}}'}</code>,{' '}
                <code>{'{{program_title}}'}</code>, <code>{'{{applicant_name}}'}</code>,{' '}
                <code>{'{{applicant_email}}'}</code>, <code>{'{{submission_id}}'}</code>,{' '}
                <code>{'{{submitted_at}}'}</code>, <code>{'{{contact_email}}'}</code>.
              </p>
              <input
                type="text"
                value={previewSubject}
                onChange={(e) => setPreviewSubject(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
              />
              <textarea
                rows={4}
                value={previewBody}
                onChange={(e) => setPreviewBody(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white"
              />
              <button
                type="button"
                onClick={handlePreviewEmail}
                className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold rounded-xl"
              >
                Xem trước nội dung kết xuất
              </button>
              {previewResult && (
                <div className="rounded-xl border border-sky-200 bg-white p-3.5 text-xs space-y-1.5">
                  <div className="font-bold text-slate-900">Tiêu đề: {previewResult.subject}</div>
                  <pre className="whitespace-pre-wrap font-sans text-slate-700 text-[11px] leading-relaxed">
                    {previewResult.body}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Bảng Hàng Đợi Email Outbox */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
              3. Hàng đợi Email & Nhật ký trạng thái (website_email_outbox)
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="py-2.5 px-3">Sự kiện</th>
                    <th className="py-2.5 px-3">Người nhận</th>
                    <th className="py-2.5 px-3">Tiêu đề</th>
                    <th className="py-2.5 px-3">Trạng thái</th>
                    <th className="py-2.5 px-3">Chi tiết / Lỗi</th>
                    <th className="py-2.5 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {outboxItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        Chưa có bản ghi nào trong hàng đợi Email Outbox.
                      </td>
                    </tr>
                  ) : (
                    outboxItems.slice(0, 12).map((item) => (
                      <tr key={item.id}>
                        <td className="py-2.5 px-3 font-mono text-[11px]">{item.event_type}</td>
                        <td className="py-2.5 px-3 font-mono">{item.recipient_email}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{item.subject}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === 'sent'
                                ? 'bg-emerald-50 text-emerald-700'
                                : item.status === 'failed'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-amber-50 text-amber-800'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-500">{item.last_error || '—'}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRetryOutboxItem(item.id)}
                            className="text-[11px] font-bold text-sky-600 hover:underline"
                          >
                            Thử lại ({item.attempts || 0})
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TỰ ĐỘNG HÓA & SEO / SITEMAP (MỤC IV, V, VI, VII PHỤ LỤC VIII)      */}
      {/* ========================================================================= */}
      {(activeCenterTab === 'automation-seo' || activeCenterTab === 'overview') && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="text-sky-600" size={18} />
                <span>Nhóm 2.10 & 2.12 — Tự Động Hóa Vận Hành & Cấu Hình SEO / Sitemap</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Hẹn giờ xuất bản bài viết/chương trình, tự động đóng form khi qua hạn `closeAt`, tự tạo Redirect 301 khi đổi slug và đồng bộ `sitemap.xml`.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRunAutomationsNow}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#071B3A] text-white text-xs font-bold hover:bg-slate-800"
            >
              <Play size={14} />
              <span>Chạy kiểm tra tự động hóa ngay</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-200 p-5 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Quy tắc Tự động hóa (Idempotent & Ghi nhật ký)
              </h4>
              {[
                {
                  key: 'enableScheduledPublishing',
                  label: 'Tự động xuất bản bài viết, trang, chương trình khi đến giờ hẹn (scheduledAt)',
                },
                {
                  key: 'enableAutoCloseExpiredForms',
                  label: 'Tự động đóng biểu mẫu đăng ký khi qua hạn đóng đơn (closeAt)',
                },
                {
                  key: 'enableAutoRedirectOnSlugChange',
                  label: 'Tự động tạo bản ghi Redirect 301 khi đổi đường dẫn (slug) nội dung đã xuất bản',
                },
                {
                  key: 'enableAutoSitemapUpdate',
                  label: 'Tự động cập nhật sitemap.xml (chỉ gồm trang công khai, loại trừ bản nháp & noIndex)',
                },
                {
                  key: 'enableAutoEndedProgramBadge',
                  label: 'Tự động hiển thị trạng thái Đã kết thúc khi chương trình qua hạn kết thúc',
                },
              ].map((rule) => (
                <label key={rule.key} className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean((automationSettings as any)[rule.key])}
                    onChange={(e) =>
                      setAutomationSettings((p) => ({ ...p, [rule.key]: e.target.checked }))
                    }
                    className="mt-0.5"
                  />
                  <span className="font-medium">{rule.label}</span>
                </label>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200 p-5 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Cấu hình SEO Mặc định & Chia sẻ Mạng xã hội
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Mẫu tiêu đề (Title Template)</label>
                  <input
                    type="text"
                    value={seoSettings.titleTemplate}
                    onChange={(e) => setSeoSettings((p) => ({ ...p, titleTemplate: e.target.value }))}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Canonical Domain</label>
                  <input
                    type="text"
                    value={seoSettings.canonicalDomain}
                    onChange={(e) => setSeoSettings((p) => ({ ...p, canonicalDomain: e.target.value }))}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Mô tả Meta mặc định</label>
                <textarea
                  rows={2}
                  value={seoSettings.defaultDescription}
                  onChange={(e) => setSeoSettings((p) => ({ ...p, defaultDescription: e.target.value }))}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveAutomationAndSeo}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5"
              >
                <Save size={14} />
                <span>Lưu Tự Động Hóa & SEO</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: THỐNG KÊ TRUY CẬP TỰ ĐỘNG & SỐ LIỆU THỦ CÔNG (MỤC 11 & VIII)       */}
      {/* ========================================================================= */}
      {(activeCenterTab === 'analytics' || activeCenterTab === 'overview') && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="text-sky-600" size={18} />
                <span>Nhóm 2.13 — Thống Kê Truy Cập Tự Động & Số Liệu Nhập Thủ Công</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tách bạch minh bạch giữa <strong>Số đếm tự động</strong> (tự động loại trừ bot và các thao tác trong <code>/admin</code>) và <strong>Số liệu nhập thủ công</strong> (có nguồn, ngày, ghi chú và người nhập).
              </p>
            </div>
            <button
              type="button"
              onClick={loadAnalytics}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={13} />
              <span>Cập nhật số liệu</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Cột Trái: Số đếm tự động */}
            <div className="lg:col-span-6 rounded-2xl border border-sky-200 bg-sky-50/30 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-sky-900">
                  1. Lượt xem ghi nhận tự động (Auto Pageviews)
                </span>
                <span className="px-3 py-1 rounded-full bg-sky-600 text-white text-xs font-black">
                  Tổng: {analyticsData.totalAutoViews} lượt xem
                </span>
              </div>
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-600">Trang / Bài viết được xem nhiều nhất:</div>
                {analyticsData.byPage.length === 0 ? (
                  <p className="text-xs text-slate-400">Chưa có lượt truy cập tự động nào được ghi nhận.</p>
                ) : (
                  <div className="divide-y divide-slate-200/70 rounded-xl border border-slate-200 bg-white">
                    {analyticsData.byPage.slice(0, 6).map((row, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3.5 py-2 text-xs">
                        <span className="font-mono text-slate-700 truncate">{row.path}</span>
                        <span className="font-black text-sky-700">{row.views} lượt</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cột Phải: Số liệu nhập thủ công có nguồn & ghi chú */}
            <div className="lg:col-span-6 rounded-2xl border border-slate-200 p-5 space-y-4">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                2. Bổ sung số liệu thống kê thủ công (Có kiểm chứng nguồn)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={manualLabel}
                  onChange={(e) => setManualLabel(e.target.value)}
                  placeholder="Tên chỉ số (vd: Người tham dự sự kiện Offline)"
                  className="text-xs px-3 py-2 rounded-xl border border-slate-300"
                />
                <input
                  type="number"
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                  placeholder="Giá trị số (vd: 450)"
                  className="text-xs px-3 py-2 rounded-xl border border-slate-300"
                />
                <input
                  type="text"
                  value={manualSource}
                  onChange={(e) => setManualSource(e.target.value)}
                  placeholder="Nguồn đối chiếu (vd: Danh sách điểm danh BTC)"
                  className="text-xs px-3 py-2 rounded-xl border border-slate-300"
                />
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="text-xs px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  placeholder="Ghi chú minh bạch..."
                  className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-300"
                />
                <button
                  type="button"
                  onClick={handleAddManualAnalytics}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl shrink-0"
                >
                  + Lưu số liệu
                </button>
              </div>

              {analyticsData.manualEntries.length > 0 && (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 max-h-44 overflow-y-auto">
                  {analyticsData.manualEntries.map((m) => (
                    <div key={m.id} className="p-2.5 text-xs flex items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900">
                          {m.metric_label}: <span className="text-emerald-700">{m.metric_value}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Nguồn: {m.source || '—'} • Ngày: {m.recorded_date} • Nhập bởi: {m.created_by}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteManualAnalytics(m.id)}
                        className="text-rose-600 hover:underline text-[11px] font-bold"
                      >
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SAO LƯU & KHÔI PHỤC DỮ LIỆU SHA-256 (MỤC X PHỤ LỤC VIII)          */}
      {/* ========================================================================= */}
      {(activeCenterTab === 'backup' || activeCenterTab === 'overview') && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Archive className="text-sky-600" size={18} />
                <span>Nhóm 2.16 — Sao Lưu Toàn Diện (SHA-256) & Khôi Phục An Toàn</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mỗi bản sao lưu bao gồm cấu hình, trang, bài viết, chương trình, đơn vị và biểu mẫu kèm mã kiểm tra toàn vẹn SHA-256. Khi khôi phục, hệ thống tự động tạo bản sao lưu trạng thái hiện tại trước khi ghi đè.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={backupLabel}
                onChange={(e) => setBackupLabel(e.target.value)}
                placeholder="Nhãn bản sao lưu (tùy chọn)..."
                className="text-xs px-3 py-2 rounded-xl border border-slate-300 w-56"
              />
              <button
                type="button"
                disabled={backupBusy}
                onClick={handleCreateBackup}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shrink-0"
              >
                + Tạo bản sao lưu ngay
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-2.5 px-4">Tên bản sao lưu</th>
                  <th className="py-2.5 px-4">Mã toàn vẹn SHA-256</th>
                  <th className="py-2.5 px-4">Dung lượng</th>
                  <th className="py-2.5 px-4">Người tạo / Thời gian</th>
                  <th className="py-2.5 px-4 text-right">Khôi phục</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      Chưa có bản sao lưu nào. Hãy bấm "+ Tạo bản sao lưu ngay" để lưu điểm khôi phục đầu tiên.
                    </td>
                  </tr>
                ) : (
                  backups.map((b) => (
                    <tr key={b.id}>
                      <td className="py-3 px-4 font-bold text-slate-900">{b.label}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {String(b.sha256 || '').slice(0, 18)}…
                      </td>
                      <td className="py-3 px-4">{Math.round(Number(b.size_bytes || 0) / 1024)} KB</td>
                      <td className="py-3 px-4 text-[11px] text-slate-500">
                        {b.created_by} • {new Date(b.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setRestoreConfirmId(b.id);
                            setRestoreConfirmText('');
                          }}
                          className="px-3 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 font-bold text-[11px] hover:bg-amber-100"
                        >
                          Khôi phục bản này
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {restoreConfirmId && (
            <div className="rounded-2xl border border-rose-300 bg-rose-50/70 p-4 space-y-3">
              <div className="text-xs font-bold text-rose-900">
                Xác nhận khôi phục bản sao lưu <code>{restoreConfirmId}</code>: Vui lòng nhập chính xác cụm từ{' '}
                <code className="bg-white px-1.5 py-0.5 rounded border border-rose-300">KHOI_PHUC_DU_LIEU</code> để xác nhận.
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={restoreConfirmText}
                  onChange={(e) => setRestoreConfirmText(e.target.value)}
                  placeholder="Nhập KHOI_PHUC_DU_LIEU"
                  className="text-xs px-3 py-2 rounded-xl border border-rose-300 bg-white font-mono"
                />
                <button
                  type="button"
                  disabled={backupBusy || restoreConfirmText.trim() !== 'KHOI_PHUC_DU_LIEU'}
                  onClick={handleConfirmRestoreBackup}
                  className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl disabled:opacity-50"
                >
                  Xác nhận khôi phục
                </button>
                <button
                  type="button"
                  onClick={() => setRestoreConfirmId(null)}
                  className="px-3 py-2 text-xs font-bold text-slate-600"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: TÀI KHOẢN & PHÂN QUYỀN CHI TIẾT (NHÓM 2.15)                        */}
      {/* ========================================================================= */}
      {(activeCenterTab === 'users' || activeCenterTab === 'overview') && (
        <section
          id="section-users"
          className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="text-sky-600" size={18} />
                <span>Nhóm 2.15 — Tài Khoản Quản Trị & Phân Quyền Chi Tiết (RBAC + Capabilities)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Quản lý tài khoản theo phân cấp <strong>Chủ sở hữu hệ thống → Lập trình viên → Quản trị viên → Biên tập viên</strong> kèm quyền chi tiết kiểm tra ở cả Giao diện và API Máy chủ.
              </p>
            </div>

            <button
              type="button"
              id="btn-add-admin-user"
              onClick={handleOpenAddUser}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition shrink-0"
            >
              <Plus size={16} />
              <span>Thêm tài khoản quản trị</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Tìm theo email hoặc Họ tên..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {(['all', 'admin', 'developer', 'editor'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    roleFilter === r
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  {r === 'all'
                    ? `Tất cả (${adminUsers.length})`
                    : r === 'admin'
                    ? 'Quản trị viên'
                    : r === 'developer'
                    ? 'Lập trình viên'
                    : 'Biên tập viên'}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Email quản trị</th>
                  <th className="py-3 px-4">Họ tên / Nhiệm vụ</th>
                  <th className="py-3 px-4">Vai trò & Quyền chi tiết</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      {adminUsersLoading ? 'Đang tải danh sách tài khoản...' : 'Không tìm thấy tài khoản quản trị phù hợp.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-sky-50/30 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{user.email}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{user.name}</div>
                        {user.note && <div className="text-[10px] text-slate-400">{user.note}</div>}
                      </td>
                      <td className="py-3.5 px-4">
                        {user.is_root_owner ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-violet-50 text-violet-800 border border-violet-200">
                            <ShieldCheck size={13} />
                            <span>Chủ sở hữu hệ thống (Toàn quyền)</span>
                          </span>
                        ) : (
                          <div className="space-y-1">
                            {getRoleBadge(user.role)}
                            {Array.isArray(user.permissions) && user.permissions.length > 0 && (
                              <div className="text-[10px] text-slate-500">
                                {user.permissions.length} quyền chi tiết được cấp
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {user.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Hoạt động</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            <span>Tạm khóa</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditUser(user)}
                            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                            title="Chỉnh sửa quyền & mật khẩu"
                          >
                            <Edit2 size={14} />
                          </button>
                          {!user.is_root_owner && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmUser(user)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Xóa tài khoản"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: ĐÓNG / MỞ WEBSITE BẢO TRÌ & ĐỒNG BỘ DỮ LIỆU D1                    */}
      {/* ========================================================================= */}
      {(activeCenterTab === 'maintenance' || activeCenterTab === 'overview') && (
        <>
          <section
            id="section-status"
            className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6"
          >
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Power className="text-sky-600" size={18} />
                <span>Nhóm 2.18 — Chế Độ Bảo Trì Website & Banner Thông Báo</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Khi đóng website, khách truy cập công khai sẽ thấy Banner hoặc Màn hình thông báo trạng thái. <strong>Ngay cả khi website đóng, trang /admin vẫn hoạt động bình thường 100%.</strong>
              </p>
            </div>

            <div
              className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                siteStatus === 'closed'
                  ? 'bg-rose-50/60 border-rose-300'
                  : 'bg-emerald-50/60 border-emerald-300'
              }`}
            >
              <div>
                <div className="text-sm font-black text-slate-900">
                  Trạng thái hiện tại: {siteStatus === 'closed' ? 'ĐANG ĐÓNG BẢO TRÌ' : 'ĐANG MỞ CÔNG KHAI'}
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  {siteStatus === 'closed'
                    ? 'Chỉ quản trị viên truy cập /admin mới làm việc được; khách công khai thấy màn hình thông báo.'
                    : 'Mọi trang công khai hoạt động bình thường.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSiteStatus('active')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold ${
                    siteStatus === 'active'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-slate-700 border border-slate-300'
                  }`}
                >
                  Mở Website
                </button>
                <button
                  type="button"
                  onClick={() => setSiteStatus('closed')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold ${
                    siteStatus === 'closed'
                      ? 'bg-rose-600 text-white'
                      : 'bg-white text-slate-700 border border-slate-300'
                  }`}
                >
                  Đóng Bảo Trì
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu đề thông báo bảo trì</label>
                <input
                  type="text"
                  value={closedReasonText}
                  onChange={(e) => setClosedReasonText(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Thời gian dự kiến mở lại</label>
                <input
                  type="text"
                  value={closedEstimatedReopen}
                  onChange={(e) => setClosedEstimatedReopen(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Thông điệp chi tiết</label>
              <textarea
                rows={2}
                value={closedMessage}
                onChange={(e) => setClosedMessage(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-300"
              />
            </div>

            <button
              type="button"
              onClick={handleSaveSiteStatus}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2"
            >
              <Save size={15} />
              <span>Lưu Trạng Thái Bảo Trì</span>
            </button>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Database className="text-amber-500" size={18} />
                  <span>Nhóm 2.17 — Đồng Bộ Cơ Sở Dữ Liệu Cloudflare D1</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{firebaseSyncMessage}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const res = await uploadAllDataToFirestore();
                    onShowToast(res.message);
                  }}
                  disabled={isFirebaseSyncing}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5"
                >
                  <CloudUpload size={14} />
                  <span>Đồng bộ lên D1</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await fetchDataFromFirestore();
                    onShowToast(res.message);
                  }}
                  disabled={isFirebaseSyncing}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl inline-flex items-center gap-1.5"
                >
                  <CloudDownload size={14} />
                  <span>Tải lại từ D1</span>
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL THÊM / SỬA TÀI KHOẢN QUẢN TRỊ & BẢNG QUYỀN CHI TIẾT                  */}
      {/* ========================================================================= */}
      {userModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full my-4 max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingUser ? 'Chỉnh sửa tài khoản & Phân quyền chi tiết' : 'Thêm tài khoản quản trị mới'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={userEmail}
                  readOnly={!!editingUser}
                  onChange={(e) => {
                    if (!editingUser) setUserEmail(e.target.value);
                    setEmailError('');
                  }}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Họ tên hiển thị</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            {emailError && <div className="text-xs font-bold text-rose-600">{emailError}</div>}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  {editingUser ? 'Đặt lại mật khẩu (để trống nếu giữ nguyên)' : 'Mật khẩu ban đầu *'}
                </label>
                <button
                  type="button"
                  onClick={generateAdminPassword}
                  className="text-[11px] font-bold text-sky-700 inline-flex items-center gap-1"
                >
                  <KeyRound size={12} /> Tạo mật khẩu mạnh
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type={showUserPassword ? 'text' : 'password'}
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder="Tối thiểu 10 ký tự"
                    className="w-full text-xs px-3 py-2 pr-9 rounded-xl border border-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showUserPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showUserPasswordConfirm ? 'text' : 'password'}
                    value={userPasswordConfirm}
                    onChange={(e) => setUserPasswordConfirm(e.target.value)}
                    placeholder="Xác nhận mật khẩu"
                    className="w-full text-xs px-3 py-2 pr-9 rounded-xl border border-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserPasswordConfirm((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showUserPasswordConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Vai trò chính</label>
                <select
                  value={userRole}
                  disabled={Boolean(editingUser?.is_root_owner)}
                  onChange={(e) => {
                    const nextRole = e.target.value as AdminUserRole;
                    setUserRole(nextRole);
                    setUserPermissions(ROLE_CAPABILITIES[nextRole] || ROLE_CAPABILITIES.editor);
                  }}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="admin">Quản trị viên (Admin)</option>
                  <option value="developer">Lập trình viên (Developer)</option>
                  <option value="editor">Biên tập viên (Editor)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Trạng thái</label>
                <select
                  value={userStatus}
                  disabled={Boolean(editingUser?.is_root_owner)}
                  onChange={(e) => setUserStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Tạm khóa</option>
                </select>
              </div>
            </div>

            {/* Bảng quyền chi tiết (Capabilities) */}
            <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50 space-y-2">
              <div className="text-xs font-bold text-slate-800">
                Bảng phân quyền chi tiết (Capabilities kiểm tra tại API máy chủ):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALL_CAPABILITIES.map((cap) => (
                  <label key={cap.id} className="flex items-start gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={Boolean(editingUser?.is_root_owner)}
                      checked={Boolean(editingUser?.is_root_owner) || userPermissions.includes(cap.id)}
                      onChange={() => toggleCapability(cap.id)}
                      className="mt-0.5"
                    />
                    <span>
                      <b className="text-slate-800">{cap.label}</b>
                      <span className="block text-[10px] text-slate-500">{cap.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú phân công</label>
              <input
                type="text"
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={userSaving}
                onClick={handleSaveUser}
                className="px-5 py-2 bg-sky-600 text-white text-xs font-bold rounded-xl"
              >
                {userSaving ? 'Đang lưu...' : 'Lưu tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Xác nhận xóa tài khoản?</h3>
            <p className="text-xs text-slate-600">
              Bạn có chắc chắn muốn xóa quyền truy cập của <strong>{deleteConfirmUser.email}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
