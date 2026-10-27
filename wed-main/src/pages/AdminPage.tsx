import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowDown, ArrowLeft, ArrowUp, BarChart3, BellRing, Building2, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronUp, Clock, Cloud, Columns3, Edit2, ExternalLink, Eye, EyeOff, FileText, Gem, Globe, Handshake, History, Image, Layers, Layout, Lock, LogOut, Mail, Menu, MessageSquare, PanelBottom, PanelLeftClose, PanelLeftOpen, PenTool, Plus, RefreshCw, Save, Settings, ShieldCheck, Sparkles, Trash2, UserCheck, Users, X } from 'lucide-react';
import { useDataContext } from '../context/DataContext';
import { AdminManagerActionRef, AdminUser, CustomPage, PageRoute, SiteConfig } from '../types';
import { StandalonePageEditor } from '../components/admin/StandalonePageEditor';
import { AdminSettings } from '../components/admin/AdminSettings';
import { AdminProgramsManager } from '../components/admin/AdminProgramsManager';
import { AdminUnitsManager } from '../components/admin/AdminUnitsManager';
import { AdminNewsManager } from '../components/admin/AdminNewsManager';
import { AdminRecordsManager } from '../components/admin/AdminRecordsManager';
import { AdminRemoteDataManager } from '../components/admin/AdminRemoteDataManager';
import { AdminAboutManager } from '../components/admin/AdminAboutManager';
import { AdminVisualWebsiteEditor } from '../components/admin/AdminVisualWebsiteEditor';
import { AdminSystemHealth } from '../components/admin/AdminSystemHealth';
import { AdminFormsManager } from '../components/admin/AdminFormsManager';
import { canOpenAdminTab, getAdminProfile, logoutFirebase, signInWithEmailPasswordReal, subscribeToAuthChanges } from '../lib/firebase';
import { ImageUrlInput } from '../components/UIPrimitives';
















interface AdminPageProps {
  onNavigate: (route: PageRoute) => void;
  onShowToast: (message: string) => void;
  initialTab?: string;
  initialSlug?: string;
}

export type AdminTab =
  | 'visual-editor'
  | 'system-health'
  | 'layout'
  | 'programs'
  | 'units'
  | 'posts'
  | 'pages'
  | 'comments'
  | 'forms'
  | 'registrations'
  | 'participants'
  | 'contacts'
  | 'certificates'
  | 'partners'
  | 'contributions'
  | 'events'
  | 'opportunities'
  | 'documents'
  | 'people'
  | 'impact'
  | 'transparency'
  | 'notifications'
  | 'redirects'
  | 'email-templates'
  | 'integrations'
  | 'media'
  | 'menus'
  | 'logs'
  | 'settings';

interface MenuItemConfig {
  id: AdminTab;
  label: string;
  icon: React.ReactNode;
  largeIcon: React.ReactNode;
}

// Primary Admin Sidebar focused on Sky First Network editorial, programs, forms, media, and system management
// (Out-of-scope standalone modules like Certificates and Contributions are hidden from primary navigation while keeping DB/API intact)
const MENU_ITEMS: MenuItemConfig[] = [
  { id: 'visual-editor', label: 'Chỉnh sửa Website', icon: <Globe size={18} />, largeIcon: <Globe size={24} /> },
  { id: 'system-health', label: 'Tình trạng hệ thống', icon: <AlertCircle size={18} />, largeIcon: <AlertCircle size={24} /> },
  { id: 'layout', label: 'Quản lý Trang chủ', icon: <Layout size={18} />, largeIcon: <Layout size={24} /> },
  { id: 'posts', label: 'Bài đăng & Tin tức', icon: <PenTool size={18} />, largeIcon: <PenTool size={24} /> },
  { id: 'programs', label: 'Chương trình & Hoạt động', icon: <Layers size={18} />, largeIcon: <Layers size={24} /> },
  { id: 'forms', label: 'Form Builder Chương trình', icon: <FileText size={18} />, largeIcon: <FileText size={24} /> },
  { id: 'registrations', label: 'Đơn đăng ký', icon: <UserCheck size={18} />, largeIcon: <UserCheck size={24} /> },
  { id: 'pages', label: 'Trang tĩnh', icon: <FileText size={18} />, largeIcon: <FileText size={24} /> },
  { id: 'units', label: 'Đơn vị trực thuộc', icon: <Building2 size={18} />, largeIcon: <Building2 size={24} /> },
  { id: 'media', label: 'Thư viện Media', icon: <Image size={18} />, largeIcon: <Image size={24} /> },
  { id: 'menus', label: 'Menu & Nội dung toàn cục', icon: <Menu size={18} />, largeIcon: <Menu size={24} /> },
  { id: 'contacts', label: 'Liên hệ gửi về', icon: <Mail size={18} />, largeIcon: <Mail size={24} /> },
  { id: 'comments', label: 'Bình luận bài viết', icon: <MessageSquare size={18} />, largeIcon: <MessageSquare size={24} /> },
  { id: 'participants', label: 'Danh sách Tham gia', icon: <Users size={18} />, largeIcon: <Users size={24} /> },
  { id: 'events', label: 'Sự kiện', icon: <CalendarDays size={18} />, largeIcon: <CalendarDays size={24} /> },
  { id: 'opportunities', label: 'Cơ hội đang mở', icon: <Sparkles size={18} />, largeIcon: <Sparkles size={24} /> },
  { id: 'documents', label: 'Tài liệu công khai', icon: <FileText size={18} />, largeIcon: <FileText size={24} /> },
  { id: 'people', label: 'Nhân sự công khai', icon: <Users size={18} />, largeIcon: <Users size={24} /> },
  { id: 'partners', label: 'Đối tác & Đồng hành', icon: <Handshake size={18} />, largeIcon: <Handshake size={24} /> },
  { id: 'impact', label: 'Số liệu & Tác động', icon: <BarChart3 size={18} />, largeIcon: <BarChart3 size={24} /> },
  { id: 'transparency', label: 'Công khai & Minh bạch', icon: <ShieldCheck size={18} />, largeIcon: <ShieldCheck size={24} /> },
  { id: 'notifications', label: 'Thông báo', icon: <BellRing size={18} />, largeIcon: <BellRing size={24} /> },
  { id: 'redirects', label: 'Redirect & URL', icon: <ExternalLink size={18} />, largeIcon: <ExternalLink size={24} /> },
  { id: 'email-templates', label: 'Mẫu Email', icon: <Mail size={18} />, largeIcon: <Mail size={24} /> },
  { id: 'logs', label: 'Nhật ký hệ thống', icon: <History size={18} />, largeIcon: <History size={24} /> },
  { id: 'settings', label: 'Trung tâm Cấu hình', icon: <Settings size={18} />, largeIcon: <Settings size={24} /> },
];

export const AdminPage: React.FC<AdminPageProps> = ({
  onNavigate,
  onShowToast,
  initialTab,
  initialSlug,
}) => {
  const {
    adminUsers,
    addAdminUser,
    customPages,
    updateCustomPage,
    addCustomPage,
    deleteCustomPage,
    siteConfig,
    updateSiteConfig,
    programs,
    updateProgram,
    addProgram,
    deleteProgram,
    networkUnits,
    updateNetworkUnit,
    addNetworkUnit,
    deleteNetworkUnit,
    newsArticles,
    updateNewsArticle,
    addNewsArticle,
    deleteNewsArticle,
    teamMembers,
    corePillars,
    timeline,
    isFirebaseConfigured,
    firebaseSyncStatus,
    fetchDataFromFirestore,
  } = useDataContext();

  const [currentAdminUser, setCurrentAdminUser] = useState<AdminUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() =>
    subscribeToAuthChanges(async (firebaseUser) => {
      if (!firebaseUser) {
        setCurrentAdminUser(null);
        setCheckingSession(false);
        return;
      }
      try {
        const profile = (await getAdminProfile(firebaseUser.uid)) as AdminUser | null;
        if (!profile || profile.status !== 'active') {
          await logoutFirebase();
          setCurrentAdminUser(null);
        } else {
          setCurrentAdminUser(profile);
          void fetchDataFromFirestore();
        }
      } catch (error) {
        setCurrentAdminUser(null);
        onShowToast(
          error instanceof Error
            ? error.message
            : 'Không thể xác minh phiên quản trị. Vui lòng đăng nhập lại.'
        );
      } finally {
        setCheckingSession(false);
      }
    }),
  []);

  const handleLogout = async () => {
    try {
      await logoutFirebase();
    } catch (error) {
      console.warn('Logout error:', error);
    }
    setCurrentAdminUser(null);
    onShowToast('Đã đăng xuất khỏi trang quản trị website Sky First Network.');
  };

  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    if (initialTab && MENU_ITEMS.some((menuItem) => menuItem.id === initialTab)) {
      return initialTab as AdminTab;
    }
    return 'posts';
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const programsActionRef = useRef<AdminManagerActionRef | null>(null);
  const unitsActionRef = useRef<AdminManagerActionRef | null>(null);
  const newsActionRef = useRef<AdminManagerActionRef | null>(null);

  const [programsViewMode, setProgramsViewMode] = useState<'list' | 'edit'>('list');
  const [unitsViewMode, setUnitsViewMode] = useState<'list' | 'edit'>('list');
  const [newsViewMode, setNewsViewMode] = useState<'list' | 'edit'>('list');

  const [editingPage, setEditingPage] = useState<CustomPage | null>(() => {
    if (initialSlug) {
      return customPages.find((page) => page.slug === initialSlug || page.id === initialSlug) || null;
    }
    return null;
  });

  const [pageToDelete, setPageToDelete] = useState<CustomPage | null>(null);

  const currentMenuItem = MENU_ITEMS.find((item) => item.id === activeTab) || MENU_ITEMS[0];

  const displayPages = customPages.filter(
    (page) =>
      !['home', 'programs', 'units', 'news', 'certificate', 'sponsor'].includes(page.slug) &&
      !['page-home', 'page-programs', 'page-units', 'page-news', 'page-certificate', 'page-sponsor'].includes(page.id)
  );

  const getDisplayUrl = (page: CustomPage) => {
    if (page.slug === 'about') return '/about';
    if (page.slug === 'contact') return '/contact';
    return `/${page.slug}`;
  };

  const handleStartCreatePage = () => {
    const newId = `page-${Date.now()}`;
    const newPage: CustomPage = {
      id: newId,
      slug: '',
      title: 'Trang thông tin mới',
      summary: '',
      content: '',
      contentFormatted: '',
      imageUrl: '',
      isPublished: false,
      publishedAt: new Date().toLocaleDateString('vi-VN'),
      author: 'Ban Quản trị Sky First Network',
      views: 0,
      type: 'custom',
      showInFooter: false,
    };
    addCustomPage(newPage);
    setEditingPage(newPage);
    onShowToast('Đã khởi tạo trang mới ở trạng thái Bản nháp.');
  };

  const handleStartEditPage = (page: CustomPage) => {
    setEditingPage(page);
  };

  const handleTogglePublishStatus = (page: CustomPage, event: React.MouseEvent) => {
    event.stopPropagation();
    const newStatus = page.isPublished === false;
    updateCustomPage(page.id, { isPublished: newStatus });
    onShowToast(
      newStatus
        ? `Đã xuất bản trang "${page.title}"!`
        : `Đã chuyển trang "${page.title}" về Bản nháp!`
    );
  };

  const handleDeletePage = (page: CustomPage, event: React.MouseEvent) => {
    event.stopPropagation();
    setPageToDelete(page);
  };

  const handleConfirmDelete = () => {
    if (!pageToDelete) return;
    deleteCustomPage(pageToDelete.id);
    onShowToast(`Đã xóa trang "${pageToDelete.title}"!`);
    setPageToDelete(null);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-500">
        Đang xác minh phiên quản trị...
      </div>
    );
  }

  if (!currentAdminUser) {
    return (
      <AdminLogin
        adminUsers={adminUsers}
        addAdminUser={addAdminUser}
        onLoginSuccess={(user) => setCurrentAdminUser(user)}
        onNavigateHome={() => onNavigate('home')}
        onShowToast={onShowToast}
      />
    );
  }

  if (editingPage && (editingPage.slug === 'about' || editingPage.id === 'page-about')) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
          <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setEditingPage(null)}
                className="inline-flex shrink-0 items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
              >
                ← Quay lại
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-black text-slate-900 sm:text-base">
                  Quản lý Trang Giới thiệu
                </h1>
                <p className="hidden text-[11px] text-slate-500 sm:block">
                  Nội dung, hành trình, đội ngũ, trụ cột và giá trị cốt lõi
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('about')}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-sky-700"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">Xem trang công khai</span>
              <span className="sm:hidden">Xem trang</span>
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
          <AdminAboutManager
            teamMembers={teamMembers}
            corePillars={corePillars}
            timeline={timeline}
            onUpdateTeamMember={() => {}}
            onAddTeamMember={() => {}}
            onDeleteTeamMember={() => {}}
            onUpdateCorePillar={() => {}}
            onNavigate={onNavigate}
            onShowToast={onShowToast}
          />
        </main>
      </div>
    );
  }

  if (editingPage) {
    return (
      <StandalonePageEditor
        page={editingPage}
        onSave={async (updates) => {
          const saved = await updateCustomPage(editingPage.id, updates);
          setEditingPage((previous) => (previous ? { ...previous, ...updates } : null));
          return saved;
        }}
        onClose={() => setEditingPage(null)}
        onShowToast={onShowToast}
        existingSlugs={customPages
          .filter((p) => p.id !== editingPage.id)
          .map((p) => p.slug)
          .filter(Boolean)}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      <aside
        className={`sticky top-0 z-20 flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200 ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-slate-200 px-4">
          {!isSidebarCollapsed ? (
            <div className="flex min-w-0 items-center gap-2.5 overflow-hidden">
              <div className="h-8 w-8 shrink-0 rounded-xl border border-slate-200 bg-white p-0.5 shadow-xs">
                <img
                  src="/brand/sky-first-network-web.png"
                  alt="Sky First Network"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="truncate">
                <span className="block truncate text-sm font-extrabold tracking-tight text-slate-900">
                  Quản trị Sky First
                </span>
                <span className="block truncate text-[11px] text-slate-400">
                  CMS & Cấu hình hệ thống
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto">
              <div className="h-8 w-8 rounded-xl border border-slate-200 bg-white p-0.5 shadow-xs">
                <img
                  src="/brand/sky-first-network-web.png"
                  alt="Sky First Network"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          )}

          <button
            type="button"
            id="admin-btn-toggle-sidebar"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
            title={isSidebarCollapsed ? 'Mở rộng thanh menu' : 'Thu gọn thanh menu'}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {MENU_ITEMS.filter((item) =>
            canOpenAdminTab(currentAdminUser, item.id)
          ).map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                id={`menu-item-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
                  isActive
                    ? 'border border-sky-200/80 bg-sky-50 text-sky-700 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                } ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start'}`}
                title={item.label}
              >
                <span className={`shrink-0 ${isActive ? 'text-sky-600' : 'text-slate-400'}`}>
                  {item.icon}
                </span>
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              id="menu-item-view-site"
              onClick={() => onNavigate('home')}
              className={`flex flex-1 items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600 ${
                isSidebarCollapsed ? 'justify-center px-0' : ''
              }`}
              title="Xem website"
            >
              <Globe size={16} className="shrink-0 text-slate-400" />
              {!isSidebarCollapsed && <span>Xem website</span>}
            </button>

            <button
              type="button"
              id="menu-item-logout-sidebar"
              onClick={handleLogout}
              className="shrink-0 rounded-xl border border-transparent p-2.5 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              title="Đăng xuất khỏi trang quản trị"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-extrabold text-slate-900">
              {currentMenuItem.label}
            </h1>
            <p className="truncate text-xs text-slate-500">
              {activeTab === 'pages'
                ? `Tổng số ${displayPages.length} trang thông tin trong hệ thống`
                : activeTab === 'programs'
                ? `Quản lý ${programs.length} chương trình & dự án cộng đồng`
                : activeTab === 'units'
                ? `Hệ thống ${networkUnits.length} đơn vị trực thuộc`
                : activeTab === 'posts'
                ? `Tổng số ${newsArticles.length} bài đăng và thông báo`
                : activeTab === 'settings'
                ? 'Trung tâm cấu hình 18 nhóm, tự động hóa, email, thống kê, sao lưu & phân quyền'
                : 'Không gian quản trị dữ liệu chính thức Sky First Network'}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {activeTab === 'pages' && (
              <button
                type="button"
                id="admin-btn-create-page"
                onClick={handleStartCreatePage}
                className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-sky-700"
              >
                <Plus size={15} />
                <span>Thêm trang mới</span>
              </button>
            )}

            {activeTab === 'programs' && programsViewMode === 'list' && (
              <button
                type="button"
                id="admin-btn-create-program"
                onClick={() => programsActionRef.current?.handleCreateNew()}
                className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-sky-700"
              >
                <Plus size={15} />
                <span>Thêm chương trình</span>
              </button>
            )}

            {activeTab === 'units' && unitsViewMode === 'list' && (
              <button
                type="button"
                id="admin-btn-create-unit"
                onClick={() => unitsActionRef.current?.handleCreateNew()}
                className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-sky-700"
              >
                <Plus size={15} />
                <span>Thêm đơn vị</span>
              </button>
            )}

            {activeTab === 'posts' && newsViewMode === 'list' && (
              <button
                type="button"
                id="admin-btn-create-news"
                onClick={() => newsActionRef.current?.handleCreateNew()}
                className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-sky-700"
              >
                <Plus size={15} />
                <span>Viết bài mới</span>
              </button>
            )}

            <div className="hidden items-center md:flex">
              {isFirebaseConfigured && firebaseSyncStatus === 'synced' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>Đã đồng bộ D1</span>
                </button>
              ) : firebaseSyncStatus === 'syncing' ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200/80 bg-sky-50 px-2.5 py-1.5 text-xs font-bold text-sky-700">
                  <RefreshCw size={13} className="animate-spin text-sky-600" />
                  <span>Đang đồng bộ...</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  <Cloud size={13} className="text-slate-500" />
                  <span>Máy chủ sẵn sàng</span>
                </button>
              )}
            </div>

            <div className="border-l border-slate-200 pl-2">
              <button
                type="button"
                id="btn-admin-header-logout"
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 shadow-2xs transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-6xl p-6">
          {siteConfig.siteStatus === 'closed' && (
            <div className="mb-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-xs sm:flex-row">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 shrink-0 animate-ping rounded-full bg-amber-500" />
                <div>
                  <span className="block text-xs font-black">
                    Website Hiện Đang Ở Chế Độ Đóng ({siteConfig.closedReasonText || 'Bảo trì / Biên tập'})
                  </span>
                  <span className="mt-0.5 block text-[11px] text-amber-800">
                    Trang quản trị vẫn hoạt động bình thường.
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  id="btn-admin-reopen-site"
                  onClick={() => {
                    updateSiteConfig({ siteStatus: 'active' });
                    onShowToast('Đã mở lại website công khai thành công!');
                  }}
                  className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700"
                >
                  Mở lại Website
                </button>
                {activeTab !== 'settings' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 transition hover:bg-amber-100"
                  >
                    Cấu hình
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'pages' && (
            <div className="space-y-4">
              {displayPages.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                  <FileText size={40} className="mx-auto mb-3 text-slate-300" />
                  <h3 className="mb-1 text-base font-bold text-slate-800">Chưa có trang thông tin nào</h3>
                  <p className="mb-5 text-xs text-slate-500">Bắt đầu tạo trang đầu tiên để bổ sung thông tin cho website.</p>
                  <button
                    type="button"
                    onClick={handleStartCreatePage}
                    className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-sky-700"
                  >
                    <Plus size={15} />
                    <span>Thêm mới</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                  <div className="grid grid-cols-12 gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <div className="col-span-12 sm:col-span-5">Tên trang</div>
                    <div className="hidden sm:col-span-2 sm:block">Nhãn</div>
                    <div className="hidden sm:col-span-2 sm:block">Người xuất bản</div>
                    <div className="hidden text-right sm:col-span-3 sm:block">Ngày xuất bản</div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {displayPages.map((page) => (
                      <div
                        key={page.id}
                        id={`page-row-${page.id}`}
                        onClick={() => handleStartEditPage(page)}
                        className="group relative grid cursor-pointer grid-cols-12 items-center gap-4 px-5 py-4 transition hover:bg-sky-50/40"
                      >
                        <div className="col-span-12 pr-2 sm:col-span-5">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${
                                page.isPublished !== false ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                            />
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-bold text-slate-900 transition group-hover:text-sky-600">
                                {page.title || 'Trang chưa đặt tên'}
                              </h3>
                              <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500">
                                {getDisplayUrl(page)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="hidden flex-wrap items-center gap-1 sm:col-span-2 sm:flex">
                          {page.showInFooter !== false ? (
                            <span className="shrink-0 rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                              Chân trang
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>

                        <div className="hidden truncate text-xs text-slate-600 sm:col-span-2 sm:block">
                          {page.author || 'Ban Quản trị Sky First Network'}
                        </div>

                        <div className="hidden items-center justify-end sm:col-span-3 sm:flex">
                          <div className="text-right group-hover:hidden">
                            <span className="block text-xs text-slate-500">{page.publishedAt || 'Hôm nay'}</span>
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                page.isPublished !== false
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {page.isPublished !== false ? 'Đã xuất bản' : 'Bản nháp'}
                            </span>
                          </div>
                          <div className="hidden items-center gap-1 group-hover:flex">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleStartEditPage(page);
                              }}
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 shadow-2xs transition hover:bg-white hover:text-sky-600"
                              title="Chỉnh sửa trang"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => handleTogglePublishStatus(page, event)}
                              className={`rounded-lg border bg-white p-1.5 shadow-2xs transition ${
                                page.isPublished !== false
                                  ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                                  : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {page.isPublished !== false ? <Clock size={15} /> : <CheckCircle2 size={15} />}
                            </button>
                            <button
                              type="button"
                              onClick={(event) => handleDeletePage(page, event)}
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 shadow-2xs transition hover:bg-white hover:text-rose-600"
                              title="Xóa trang"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'visual-editor' &&
            canOpenAdminTab(currentAdminUser, 'visual-editor') && (
              <AdminVisualWebsiteEditor onShowToast={onShowToast} onNavigate={onNavigate} />
            )}

          {activeTab === 'system-health' &&
            canOpenAdminTab(currentAdminUser, 'system-health') && (
              <AdminSystemHealth />
            )}

          {activeTab === 'programs' && (
            <AdminProgramsManager
              programs={programs}
              onUpdateProgram={updateProgram}
              onAddProgram={addProgram}
              onDeleteProgram={deleteProgram}
              onNavigate={onNavigate}
              onShowToast={onShowToast}
              actionRef={programsActionRef}
              onViewModeChange={setProgramsViewMode}
            />
          )}

          {activeTab === 'units' && (
            <AdminUnitsManager
              units={networkUnits}
              onUpdateUnit={updateNetworkUnit}
              onAddUnit={addNetworkUnit}
              onDeleteUnit={deleteNetworkUnit}
              onNavigate={onNavigate}
              onShowToast={onShowToast}
              actionRef={unitsActionRef}
              onViewModeChange={setUnitsViewMode}
            />
          )}

          {activeTab === 'posts' && (
            <AdminNewsManager
              articles={newsArticles}
              onUpdateArticle={updateNewsArticle}
              onAddArticle={addNewsArticle}
              onDeleteArticle={deleteNewsArticle}
              onNavigate={onNavigate}
              onShowToast={onShowToast}
              initialSlug={initialSlug}
              actionRef={newsActionRef}
              onViewModeChange={setNewsViewMode}
            />
          )}

          {activeTab === 'layout' && (
            <AdminLayoutManager
              onNavigate={onNavigate}
              onShowToast={onShowToast}
              onSwitchTab={(tab) => setActiveTab(tab as AdminTab)}
            />
          )}

          {activeTab === 'forms' && <AdminFormsManager onShowToast={onShowToast} />}

          {(['comments', 'contacts', 'media', 'registrations', 'participants'] as AdminTab[]).includes(
            activeTab
          ) && (
            <AdminRemoteDataManager
              kind={activeTab as 'comments' | 'contacts' | 'media' | 'forms' | 'registrations' | 'participants'}
              onShowToast={onShowToast}
            />
          )}

          {([
            'certificates',
            'partners',
            'contributions',
            'events',
            'opportunities',
            'documents',
            'people',
            'impact',
            'transparency',
            'notifications',
            'redirects',
            'email-templates',
            'integrations',
            'logs',
          ] as AdminTab[]).includes(activeTab) && (
            <AdminRecordsManager kind={activeTab} onShowToast={onShowToast} />
          )}

          {activeTab === 'menus' && <AdminGlobalContentManager onShowToast={onShowToast} />}

          {activeTab === 'settings' && (
            <AdminSettings onShowToast={onShowToast} onNavigate={onNavigate} />
          )}
        </div>
      </main>

      {pageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Trash2 size={20} />
            </div>
            <h3 className="mb-1 text-base font-bold text-slate-900">Xác nhận xóa trang?</h3>
            <p className="mb-6 text-xs leading-relaxed text-slate-600">
              Bạn có chắc chắn muốn xóa trang <strong>"{pageToDelete.title}"</strong>?
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPageToDelete(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700"
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


// --- Consolidated from src/components/admin/AdminLogin.tsx ---

interface AdminLoginProps{adminUsers:AdminUser[];addAdminUser:(u:AdminUser)=>void;onLoginSuccess:(u:AdminUser)=>void;onNavigateHome:()=>void;onShowToast:(m:string)=>void;}
const ROOT='skyfirst.ec@gmail.com';
export const AdminLogin:React.FC<AdminLoginProps>=({onLoginSuccess,onNavigateHome,onShowToast})=>{
 const[email,setEmail]=useState('');const[password,setPassword]=useState('');const[loading,setLoading]=useState(false);const[error,setError]=useState('');const[forgot,setForgot]=useState(false);
 const[checking,setChecking]=useState(true);const[setup,setSetup]=useState(false);const[name,setName]=useState('');const[confirm,setConfirm]=useState('');const[showPass,setShowPass]=useState(false);
 const check=async()=>{setChecking(true);setError('');try{const r=await fetch('/api/admin-auth/bootstrap',{cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw new Error(d.error||'Không kiểm tra được trạng thái hệ thống.');setSetup(Boolean(d.needsSetup));if(d.needsSetup)setEmail(ROOT)}catch(e:any){setError(e.message||'Không kiểm tra được trạng thái hệ thống.')}finally{setChecking(false)}};
 useEffect(()=>{void check()},[]);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();if(loading)return;setLoading(true);setError('');try{const fb=await signInWithEmailPasswordReal(email,password);const profile=await getAdminProfile(fb.uid) as AdminUser|null;if(!profile||profile.status!=='active'){await logoutFirebase();throw new Error('Tài khoản này chưa được cấp quyền quản trị website.')}onLoginSuccess({...profile,lastLogin:new Date().toISOString()});onShowToast('Đăng nhập quản trị thành công.')}catch(err:any){const code=err?.code||'';setError(code==='auth/invalid-credential'?'Email hoặc mật khẩu không chính xác.':String(err?.message||'Không thể đăng nhập.'))}finally{setLoading(false)}};
 const bootstrap=async(e:React.FormEvent)=>{e.preventDefault();if(loading)return;setLoading(true);setError('');try{const r=await fetch('/api/admin-auth/bootstrap',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,password,confirmPassword:confirm}),cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw new Error(d.error||'Không thể khởi tạo hệ thống.');const fb=await signInWithEmailPasswordReal(ROOT,password);const profile=await getAdminProfile(fb.uid) as AdminUser|null;if(!profile)throw new Error('Tài khoản đã tạo nhưng chưa đọc được hồ sơ D1.');setSetup(false);onLoginSuccess({...profile,lastLogin:new Date().toISOString()});onShowToast('Khởi tạo Chủ sở hữu hệ thống thành công. Chế độ khởi tạo đã đóng.')}catch(e:any){setError(e.message||'Không thể khởi tạo hệ thống.');await check()}finally{setLoading(false)}};
 const gen=()=>{const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';const a=new Uint32Array(18);crypto.getRandomValues(a);const p=Array.from(a,x=>chars[x%chars.length]).join('')+'Aa7';setPassword(p);setConfirm(p);setShowPass(true)};
 return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4"><div className="w-full max-w-md"><div className="bg-white border border-slate-200 rounded-3xl shadow-xl p-8"><div className="flex justify-center mb-5"><img src="/brand/sky-first-network-web.png" className="h-20 w-auto object-contain" alt="Sky First Network"/></div>{checking?<><h1 className="text-xl font-black text-center">Đang kiểm tra hệ thống</h1><p className="text-sm text-slate-500 text-center mt-2">Đang đối chiếu Firebase Authentication và D1…</p></>:setup?<><div className="flex justify-center mb-3"><ShieldCheck className="text-sky-700" size={30}/></div><h1 className="text-2xl font-black text-center text-slate-900">Thiết lập Chủ sở hữu</h1><p className="text-sm text-slate-500 text-center mt-2 mb-6">Chỉ xuất hiện khi Firebase chưa có tài khoản Root. Sau khi tạo thành công, chế độ này tự đóng.</p>{error&&<div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}<form onSubmit={bootstrap} className="space-y-4"><label className="block text-sm font-semibold">Email tối cao<input value={ROOT} readOnly className="mt-1 w-full p-3 border rounded-xl bg-slate-100 text-slate-600"/></label><label className="block text-sm font-semibold">Tên hiển thị<input value={name} onChange={e=>setName(e.target.value)} required className="mt-1 w-full p-3 border rounded-xl"/></label><label className="block text-sm font-semibold">Mật khẩu<div className="mt-1 flex border rounded-xl"><input value={password} onChange={e=>setPassword(e.target.value)} type={showPass?'text':'password'} required className="w-full p-3 outline-none"/><button type="button" onClick={()=>setShowPass(v=>!v)} className="px-3">{showPass?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label><label className="block text-sm font-semibold">Xác nhận mật khẩu<input value={confirm} onChange={e=>setConfirm(e.target.value)} type={showPass?'text':'password'} required className="mt-1 w-full p-3 border rounded-xl"/></label><button type="button" onClick={gen} className="w-full rounded-xl border py-2.5 font-semibold">Tạo mật khẩu mạnh</button><button disabled={loading} className="w-full rounded-xl bg-[#0F2B5B] text-white py-3 font-bold disabled:opacity-60">{loading?'Đang khởi tạo…':'Khởi tạo Chủ sở hữu hệ thống'}</button></form></>:<><h1 className="text-2xl font-black text-center text-slate-900">Đăng nhập quản trị</h1><p className="text-sm text-slate-500 text-center mt-2 mb-6">Sky First Network</p>{error&&<div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}<form onSubmit={submit} className="space-y-4"><label className="block text-sm font-semibold">Email<div className="mt-1 flex items-center border rounded-xl px-3"><Mail size={17}/><input value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="username" required className="w-full p-3 outline-none"/></div></label><label className="block text-sm font-semibold">Mật khẩu<div className="mt-1 flex items-center border rounded-xl px-3"><Lock size={17}/><input value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete="current-password" required className="w-full p-3 outline-none"/></div></label><button disabled={loading} className="w-full rounded-xl bg-[#0F2B5B] text-white py-3 font-bold disabled:opacity-60">{loading?'Đang đăng nhập...':'Đăng nhập'}</button></form><button onClick={()=>setForgot(true)} className="w-full mt-3 text-sm font-semibold text-sky-700">Quên mật khẩu?</button></>}</div><button onClick={onNavigateHome} className="mx-auto mt-5 flex items-center gap-2 text-sm text-slate-500"><ArrowLeft size={15}/>Quay lại website</button>{forgot&&<div className="fixed inset-0 bg-slate-950/50 flex items-center justify-center p-4 z-50"><div className="bg-white max-w-md rounded-2xl p-6 relative"><button onClick={()=>setForgot(false)} className="absolute right-4 top-4"><X size={18}/></button><h2 className="text-xl font-black mb-3">Quên mật khẩu?</h2><p className="text-sm text-slate-600">Vui lòng liên hệ Chủ sở hữu hệ thống để được xác minh và đặt lại mật khẩu.</p><button onClick={()=>setForgot(false)} className="mt-5 w-full rounded-xl bg-[#0F2B5B] text-white py-2.5 font-bold">Đóng</button></div></div>}</div></div>
}


// --- Consolidated from src/components/admin/AdminLayoutManager.tsx ---


interface AdminLayoutProps {
  onNavigate?: (page: PageRoute) => void;
  onShowToast?: (msg: string) => void;
  onSwitchTab?: (tabId: string) => void;
}

type SectionKey = 'hero'|'direction'|'pillars'|'programs'|'units'|'certificate'|'values'|'news'|'transparency'|'cta';

const LABELS: Record<SectionKey,string> = {
  hero:'Đầu trang', direction:'Định hướng 2026', pillars:'05 Trụ cột hoạt động', programs:'Chương trình & hoạt động',
  units:'Đơn vị trực thuộc', certificate:'Xác thực GCN', values:'06 Giá trị cốt lõi', news:'Tin tức & hoạt động', transparency:'Thông tin minh bạch', cta:'Kêu gọi tham gia & đồng hành'
};
const DEFAULT_ORDER: SectionKey[] = ['hero','pillars','news','programs','values','certificate','transparency','units','cta'];

export const AdminLayoutManager: React.FC<AdminLayoutProps> = ({ onShowToast, onSwitchTab }) => {
  const { siteConfig, updateSiteConfig } = useDataContext();
  const [editing, setEditing] = useState<SectionKey|null>(null);
  const [draft, setDraft] = useState<Record<string,string>>({});
  const sections = siteConfig.homeSections || {};
  const order = useMemo(() => {
    const saved=(siteConfig.homeSectionOrder||[]).filter((x): x is SectionKey => x!=='direction'&&DEFAULT_ORDER.includes(x as SectionKey));
    return [...new Set(saved), ...DEFAULT_ORDER.filter(x=>!saved.includes(x))];
  }, [siteConfig.homeSectionOrder]);

  const toggle = async (key:SectionKey) => {
    const next={...sections,[key]:sections[key]===false};
    const ok=await updateSiteConfig({homeSections:next});
    onShowToast?.(ok?`${next[key] ? 'Đã hiện' : 'Đã ẩn'} “${LABELS[key]}” trên Trang chủ.`:'Chưa thể lưu thay đổi bố cục lên máy chủ.');
  };
  const move = async (key:SectionKey, dir:-1|1) => {
    const i=order.indexOf(key), j=i+dir; if(j<0||j>=order.length) return;
    const next=[...order]; [next[i],next[j]]=[next[j],next[i]];
    const ok=await updateSiteConfig({homeSectionOrder:next});
    if(!ok) onShowToast?.('Chưa thể lưu thứ tự bố cục lên máy chủ.');
  };
  const open = (key:SectionKey) => {
    const data:Record<SectionKey,Record<string,string>>={
      hero:{heroBadge:siteConfig.heroBadge||'',heroHeading:siteConfig.heroHeading||'',heroSubtext:siteConfig.heroSubtext||'',heroImageUrl:siteConfig.heroImageUrl||'',heroImageFit:siteConfig.heroImageFit||'cover',heroButton1Text:siteConfig.heroButton1Text||'',heroButton1Url:siteConfig.heroButton1Url||'',heroButton2Text:siteConfig.heroButton2Text||'',heroButton2Url:siteConfig.heroButton2Url||''},
      direction:{directionLabel:siteConfig.directionLabel||'',directionPillarsCount:siteConfig.directionPillarsCount||'05',directionPillarsLabel:siteConfig.directionPillarsLabel||'Trụ cột hoạt động',directionValuesCount:siteConfig.directionValuesCount||'06',directionValuesLabel:siteConfig.directionValuesLabel||'Giá trị cốt lõi',directionText:siteConfig.directionText||''},
      pillars:{pillarsHeading:siteConfig.pillarsHeading||'',pillarsSubtext:siteConfig.pillarsSubtext||''},
      programs:{programsLabel:siteConfig.programsLabel||'',programsHeading:siteConfig.programsHeading||''},
      units:{unitsLabel:siteConfig.unitsLabel||'',unitsHeading:siteConfig.unitsHeading||'',unitsIntro:siteConfig.unitsIntro||''},
      certificate:{certificateLabel:siteConfig.certificateLabel||'',certificateHeading:siteConfig.certificateHeading||'',certificateText:siteConfig.certificateText||'',certificateButtonText:siteConfig.certificateButtonText||'',certificateButtonUrl:siteConfig.certificateButtonUrl||''},
      values:{valuesLabel:siteConfig.valuesLabel||'',valuesHeading:siteConfig.valuesHeading||''},
      news:{newsLabel:siteConfig.newsLabel||'',newsHeading:siteConfig.newsHeading||''},
      transparency:{transparencyHeading:siteConfig.transparencyHeading||'',transparencyText:siteConfig.transparencyText||'',transparencyButtonText:siteConfig.transparencyButtonText||'',transparencyButtonUrl:siteConfig.transparencyButtonUrl||''},
      cta:{ctaHeading:siteConfig.ctaHeading||'',ctaSubtext:siteConfig.ctaSubtext||'',ctaButtonText:siteConfig.ctaButtonText||'',ctaButtonUrl:siteConfig.ctaButtonUrl||'',ctaSecondaryButtonText:siteConfig.ctaSecondaryButtonText||'',ctaSecondaryButtonUrl:siteConfig.ctaSecondaryButtonUrl||''},
    };
    setDraft(data[key]); setEditing(key);
  };
  const save=async()=>{ if(!editing)return; const ok=await updateSiteConfig(draft as Partial<SiteConfig>); onShowToast?.(ok?`Đã lưu nội dung “${LABELS[editing]}” và đồng bộ lên website.`:`Chưa lưu được “${LABELS[editing]}” lên máy chủ. Vui lòng thử lại.`); if(ok)setEditing(null); };

  return <div className="space-y-6">
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-extrabold text-slate-900">Quản lý Trang chủ</h2>
      <p className="mt-1 text-sm text-slate-500">Các khối dưới đây là dữ liệu thật của Trang chủ. Có thể sửa nội dung, ẩn/hiện và đổi thứ tự hiển thị.</p>
    </div>

    <div className="space-y-3">
      {order.map((key,i)=><div key={key} className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="w-9 h-9 rounded-xl bg-slate-100 grid place-items-center font-black text-slate-600">{String(i+1).padStart(2,'0')}</div>
        <div className="flex-1 min-w-0"><div className="font-extrabold text-slate-900">{LABELS[key]}</div><div className="text-xs text-slate-500 mt-1">{sections[key]===false?'Đang ẩn khỏi Trang chủ':'Đang hiển thị trên Trang chủ'}</div></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={()=>move(key,-1)} disabled={i===0} className="p-2 rounded-lg border border-slate-200 disabled:opacity-30" title="Di chuyển lên"><ArrowUp size={16}/></button>
          <button onClick={()=>move(key,1)} disabled={i===order.length-1} className="p-2 rounded-lg border border-slate-200 disabled:opacity-30" title="Di chuyển xuống"><ArrowDown size={16}/></button>
          <button onClick={()=>toggle(key)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold flex items-center gap-2">{sections[key]===false?<><Eye size={16}/>Hiện</>:<><EyeOff size={16}/>Ẩn</>}</button>
          <button onClick={()=>open(key)} className="px-3 py-2 rounded-lg bg-[#0B5FB4] text-white text-sm font-bold">Chỉnh sửa nội dung</button>
          {key==='programs'&&<button onClick={()=>onSwitchTab?.('programs')} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold">Quản lý chương trình</button>}
          {key==='units'&&<button onClick={()=>onSwitchTab?.('units')} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold">Quản lý đơn vị</button>}
          {key==='news'&&<button onClick={()=>onSwitchTab?.('posts')} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold">Quản lý tin tức</button>}
        </div>
      </div>)}
    </div>

    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      Chân trang, menu điều hướng, 05 trụ cột và 06 giá trị cốt lõi được chỉnh tại mục “Nội dung toàn cục”.
    </div>

    {editing && <div className="fixed inset-0 z-[100] bg-slate-950/45 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[88vh] overflow-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-5 flex justify-between items-center"><div><div className="text-xs uppercase tracking-wider text-[#0B5FB4] font-black">Trang chủ</div><h3 className="text-xl font-extrabold">{LABELS[editing]}</h3></div><button onClick={()=>setEditing(null)} className="p-2"><X size={20}/></button></div>
        <div className="p-5 space-y-4">
          {Object.entries(draft).map(([k,v])=>k==='heroImageFit'?<label key={k} className="block text-sm font-semibold">Cách hiển thị ảnh<select value={v} onChange={e=>setDraft({...draft,[k]:e.target.value})} className="block w-full border rounded-xl p-3 mt-2"><option value="cover">Phủ khung (ảnh hoạt động)</option><option value="contain">Giữ toàn bộ (logo, poster)</option></select></label>:k==='heroImageUrl'?<ImageUrlInput key={k} label="Ảnh banner trang chủ" value={v} onChange={url=>setDraft({...draft,[k]:url})}/>:<label key={k} className="block"><span className="block text-sm font-bold text-slate-700 mb-1">{fieldLabel(k)}</span>{isLong(k)?<textarea aria-label={fieldLabel(k)} rows={4} value={v} onChange={e=>setDraft({...draft,[k]:e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-sky-500"/>:<input aria-label={fieldLabel(k)} value={v} onChange={e=>setDraft({...draft,[k]:e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-sky-500"/>}</label>)}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-5 flex justify-end gap-2"><button onClick={()=>setEditing(null)} className="px-4 py-2 rounded-xl border border-slate-200 font-bold">Hủy</button><button onClick={save} className="px-4 py-2 rounded-xl bg-[#0B5FB4] text-white font-bold flex items-center gap-2"><Save size={16}/>Lưu thay đổi</button></div>
      </div>
    </div>}
  </div>;
};

function isLong(k:string){return ['heroHeading','heroSubtext','directionText','pillarsSubtext','unitsIntro','certificateText','transparencyText'].includes(k)}
export function fieldLabel(k:string){
  const m:Record<string,string>={heroBadge:'Nhãn đầu trang',heroHeading:'Tiêu đề chính',heroSubtext:'Mô tả',heroButton1Text:'Nút 1',heroButton1Url:'Liên kết nút 1',heroButton2Text:'Nút 2',heroButton2Url:'Liên kết nút 2',directionLabel:'Nhãn định hướng',directionText:'Nội dung định hướng',directionPillarsCount:'Số trụ cột',directionPillarsLabel:'Nhãn số trụ cột',directionValuesCount:'Số giá trị',directionValuesLabel:'Nhãn số giá trị',pillarsHeading:'Nhãn trụ cột',pillarsSubtext:'Tiêu đề khối',programsLabel:'Nhãn chương trình',programsHeading:'Tiêu đề chương trình',unitsLabel:'Nhãn đơn vị',unitsHeading:'Tiêu đề đơn vị',unitsIntro:'Mô tả đơn vị',certificateLabel:'Nhãn tra cứu',certificateHeading:'Tiêu đề tra cứu',certificateText:'Mô tả tra cứu',certificateButtonText:'Chữ trên nút',certificateButtonUrl:'Liên kết nút',valuesLabel:'Nhãn giá trị cốt lõi',valuesHeading:'Tiêu đề giá trị cốt lõi',newsLabel:'Nhãn tin tức',newsHeading:'Tiêu đề tin tức',transparencyHeading:'Tiêu đề minh bạch',transparencyText:'Nội dung minh bạch',transparencyButtonText:'Chữ trên nút',transparencyButtonUrl:'Liên kết nút'}; return m[k]||k;
}


// --- Consolidated from src/components/admin/AdminGlobalContentManager.tsx ---

export const AdminGlobalContentManager:React.FC<{onShowToast:(m:string)=>void}>=({onShowToast})=>{
  const {siteConfig,updateSiteConfig,corePillars,updateCorePillar}=useDataContext();
  const [draft,setDraft]=useState(()=>JSON.parse(JSON.stringify(siteConfig)));
  const groups=draft.navigationGroups||[];
  const values=draft.coreValues||[];
  const quick=draft.footerQuickLinks||[];
  const contacts=draft.footerContacts||[];
  const portals=draft.footerPortals||[];
  const legal=draft.footerLegalLinks||[];
  const organization=draft.organizationInfo||[];
  const taxonomy=draft.taxonomyCategories||[];
  const save=async()=>{const ok=await updateSiteConfig(draft);onShowToast(ok?'Đã lưu nội dung toàn cục và đồng bộ lên website.':'Chưa lưu được nội dung. Kiểm tra quyền hoặc kết nối rồi thử lại.');};
  const set=(k:string,v:any)=>setDraft((d:any)=>({...d,[k]:v}));
  const move=(arr:any[],i:number,dir:number)=>{const n=[...arr],j=i+dir;if(j<0||j>=n.length)return arr;[n[i],n[j]]=[n[j],n[i]];return n};
  return <div className="space-y-6 max-w-6xl">
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between"><div><h2 className="text-xl font-black">Nội dung toàn cục</h2><p className="text-xs text-slate-500 mt-1">Chỉnh các thành phần xuất hiện trên nhiều trang: menu, chân trang, trụ cột và giá trị cốt lõi.</p></div><button onClick={save} className="px-4 py-2.5 rounded-xl bg-[#0F2B5B] text-white font-bold text-sm inline-flex items-center gap-2"><Save size={16}/>Lưu toàn bộ</button></div>

    <Card icon={<Menu size={18}/>} title="Menu điều hướng">
      <div className="space-y-4">{groups.map((g:any,gi:number)=><div key={gi} className="border rounded-2xl p-4 bg-slate-50"><div className="flex gap-2 items-center"><input value={g.label} onChange={e=>{const n=[...groups];n[gi]={...g,label:e.target.value};set('navigationGroups',n)}} className="flex-1 border rounded-xl px-3 py-2 font-bold"/><button onClick={()=>set('navigationGroups',move(groups,gi,-1))} className="p-2 border rounded-lg"><ChevronUp size={16}/></button><button onClick={()=>set('navigationGroups',move(groups,gi,1))} className="p-2 border rounded-lg"><ChevronDown size={16}/></button><button onClick={()=>set('navigationGroups',groups.filter((_:any,i:number)=>i!==gi))} className="p-2 border rounded-lg text-rose-600"><Trash2 size={16}/></button></div><div className="mt-3 space-y-2">{(g.items||[]).map((it:any,ii:number)=><div key={ii} className="grid md:grid-cols-12 gap-2 rounded-xl border border-slate-200 bg-white p-2"><input value={it.label} onChange={e=>{const n=JSON.parse(JSON.stringify(groups));n[gi].items[ii].label=e.target.value;set('navigationGroups',n)}} className="md:col-span-3 border rounded-lg px-3 py-2 text-sm font-bold" placeholder="Tên menu"/><input value={it.page||''} onChange={e=>{const n=JSON.parse(JSON.stringify(groups));n[gi].items[ii].page=e.target.value;set('navigationGroups',n)}} className="md:col-span-2 border rounded-lg px-3 py-2 text-sm" placeholder="Route"/><input value={it.slug||''} onChange={e=>{const n=JSON.parse(JSON.stringify(groups));n[gi].items[ii].slug=e.target.value;set('navigationGroups',n)}} className="md:col-span-2 border rounded-lg px-3 py-2 text-sm" placeholder="Slug"/><input value={it.description||''} onChange={e=>{const n=JSON.parse(JSON.stringify(groups));n[gi].items[ii].description=e.target.value;set('navigationGroups',n)}} className="md:col-span-4 border rounded-lg px-3 py-2 text-sm" placeholder="Mô tả ngắn hiển thị trong menu"/><button onClick={()=>{const n=JSON.parse(JSON.stringify(groups));n[gi].items=n[gi].items.filter((_:any,i:number)=>i!==ii);set('navigationGroups',n)}} className="md:col-span-1 p-2 text-rose-600"><Trash2 size={16}/></button></div>)}<button onClick={()=>{const n=JSON.parse(JSON.stringify(groups));n[gi].items=[...(n[gi].items||[]),{label:'Mục mới',page:'custom-page',slug:''}];set('navigationGroups',n)}} className="text-sm font-bold text-sky-700 inline-flex items-center gap-1"><Plus size={15}/>Thêm menu con</button></div></div>)}<button onClick={()=>set('navigationGroups',[...groups,{label:'Nhóm mới',items:[]}])} className="px-3 py-2 rounded-xl border font-bold text-sm inline-flex items-center gap-2"><Plus size={15}/>Thêm nhóm menu</button></div>
    </Card>

    <Card icon={<Gem size={18}/>} title="Số liệu nổi bật trang chủ">
      <p className="mb-4 text-xs leading-5 text-slate-500">Mỗi ô có giá trị đích và hiệu ứng riêng. Public chỉ bắt đầu đếm sau khi dữ liệu CMS thật đã tải; reload mới chạy lại.</p>
      <div className="grid gap-3 lg:grid-cols-2">{[
        ['membersCount','membersLabel','membersSubtext','Thành viên'],['communityProjects','projectsLabel','projectsSubtext','Chương trình & hoạt động'],['provincesCount','provincesLabel','provincesSubtext','Địa bàn hoạt động'],['volunteerHours','hoursLabel','hoursSubtext','Giờ hoạt động'],
      ].map(([valueKey,labelKey,subKey,fallback])=>{const cfg=(draft.counterAnimation||{})[valueKey]||{};const patch=(v:any)=>set('counterAnimation',{...(draft.counterAnimation||{}),[valueKey]:{...cfg,...v}});return <div key={valueKey} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <div className="grid gap-2 sm:grid-cols-2"><input value={(draft.stats as any)?.[valueKey]||''} onChange={e=>set('stats',{...(draft.stats||{}),[valueKey]:e.target.value})} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xl font-black" placeholder="0"/><input value={(draft.stats as any)?.[labelKey]||fallback} onChange={e=>set('stats',{...(draft.stats||{}),[labelKey]:e.target.value})} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" placeholder={fallback}/></div>
        <div className="grid gap-2 sm:grid-cols-3"><label className="text-xs font-bold text-slate-600">Thời gian (giây)<input type="number" min="0.25" max="60" step="0.25" value={cfg.durationSeconds??10} onChange={e=>patch({durationSeconds:Number(e.target.value)})} className="mt-1 w-full rounded-lg border px-3 py-2"/></label><label className="text-xs font-bold text-slate-600">Kiểu chạy<select value={cfg.mode||'smooth'} onChange={e=>patch({mode:e.target.value})} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="smooth">Mượt</option><option value="even">Chẵn</option><option value="large">Bước lớn</option><option value="small">Bước nhỏ</option><option value="custom">Tùy chỉnh bước</option></select></label><label className="text-xs font-bold text-slate-600">Bước nhảy<input type="number" min="1" value={cfg.step??1} onChange={e=>patch({step:Number(e.target.value)})} className="mt-1 w-full rounded-lg border px-3 py-2"/></label></div>
        <div className="grid gap-2 sm:grid-cols-3"><label className="text-xs font-bold text-slate-600">Cỡ số<select value={cfg.fontSize||'large'} onChange={e=>patch({fontSize:e.target.value})} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="small">Nhỏ</option><option value="medium">Vừa</option><option value="large">Lớn</option><option value="xlarge">Rất lớn</option><option value="custom">Tùy chỉnh</option></select></label><label className="text-xs font-bold text-slate-600">Easing<select value={cfg.easing||'smooth'} onChange={e=>patch({easing:e.target.value})} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="linear">Linear</option><option value="ease-out">Ease-out</option><option value="smooth">Smooth</option></select></label><label className="text-xs font-bold text-slate-600">Định dạng<select value={cfg.numberFormat||'vi'} onChange={e=>patch({numberFormat:e.target.value})} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="vi">10.000</option><option value="plain">10000</option><option value="en">10,000</option></select></label></div>
        <div className="grid gap-2 sm:grid-cols-3"><input value={cfg.prefix||''} onChange={e=>patch({prefix:e.target.value})} className="rounded-lg border px-3 py-2 text-sm" placeholder="Tiền tố"/><input value={cfg.suffix||''} onChange={e=>patch({suffix:e.target.value})} className="rounded-lg border px-3 py-2 text-sm" placeholder="Hậu tố"/><input value={cfg.customFontSize||''} onChange={e=>patch({customFontSize:e.target.value})} className="rounded-lg border px-3 py-2 text-sm" placeholder="Cỡ tùy chỉnh: 32px"/></div>
        <input value={(draft.stats as any)?.[subKey]||''} onChange={e=>set('stats',{...(draft.stats||{}),[subKey]:e.target.value})} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs" placeholder="Dòng mô tả nhỏ"/>
      </div>})}</div>
    </Card>

    <Card icon={<Columns3 size={18}/>} title="05 trụ cột hoạt động">
      <div className="grid lg:grid-cols-2 gap-3">{corePillars.map((p:any,i:number)=><div key={i} className="border rounded-xl p-3 space-y-2"><input value={p.title} onChange={e=>updateCorePillar(i,{title:e.target.value})} className="w-full border rounded-lg px-3 py-2 font-bold"/><textarea value={p.shortDesc} onChange={e=>updateCorePillar(i,{shortDesc:e.target.value,fullDesc:e.target.value})} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm"/></div>)}</div>
    </Card>

    <Card icon={<Gem size={18}/>} title="06 giá trị cốt lõi">
      <div className="grid lg:grid-cols-2 gap-3">{values.map((v:any,i:number)=><div key={i} className="border rounded-xl p-3 space-y-2"><input value={v.name} onChange={e=>{const n=[...values];n[i]={...v,name:e.target.value};set('coreValues',n)}} className="w-full border rounded-lg px-3 py-2 font-bold"/><textarea value={v.desc} onChange={e=>{const n=[...values];n[i]={...v,desc:e.target.value};set('coreValues',n)}} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm"/></div>)}</div>
    </Card>

    <Card icon={<Gem size={18}/>} title="Design System & hiệu ứng"><div className="grid md:grid-cols-3 gap-3"><input value={draft.designSystem?.primary||'#0B66C3'} onChange={e=>set('designSystem',{...(draft.designSystem||{}),primary:e.target.value})} className="border rounded-xl px-3 py-2" placeholder="Màu chính"/><input value={draft.designSystem?.navy||'#071B3A'} onChange={e=>set('designSystem',{...(draft.designSystem||{}),navy:e.target.value})} className="border rounded-xl px-3 py-2" placeholder="Navy"/><input value={draft.designSystem?.accent||'#22D3EE'} onChange={e=>set('designSystem',{...(draft.designSystem||{}),accent:e.target.value})} className="border rounded-xl px-3 py-2" placeholder="Accent"/><input value={draft.designSystem?.radius||'24px'} onChange={e=>set('designSystem',{...(draft.designSystem||{}),radius:e.target.value})} className="border rounded-xl px-3 py-2" placeholder="Radius"/><input value={draft.designSystem?.container||'1200px'} onChange={e=>set('designSystem',{...(draft.designSystem||{}),container:e.target.value})} className="border rounded-xl px-3 py-2" placeholder="Container"/><select value={draft.designSystem?.motion||'balanced'} onChange={e=>set('designSystem',{...(draft.designSystem||{}),motion:e.target.value})} className="border rounded-xl px-3 py-2"><option value="reduced">Giảm hiệu ứng</option><option value="balanced">Cân bằng</option><option value="rich">Nhiều hiệu ứng</option></select></div><p className="mt-3 text-xs text-slate-500">Website vẫn tôn trọng prefers-reduced-motion của thiết bị, kể cả khi chọn nhiều hiệu ứng.</p></Card>

    <Card icon={<Menu size={18}/>} title="Thông báo toàn website"><div className="grid md:grid-cols-2 gap-3"><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={!!draft.announcement?.enabled} onChange={e=>set('announcement',{...(draft.announcement||{}),enabled:e.target.checked})}/>Bật announcement bar</label><select value={draft.announcement?.tone||'info'} onChange={e=>set('announcement',{...(draft.announcement||{}),tone:e.target.value})} className="border rounded-xl px-3 py-2"><option value="info">Thông tin</option><option value="success">Tích cực</option><option value="warning">Quan trọng</option></select><input value={draft.announcement?.text||''} onChange={e=>set('announcement',{...(draft.announcement||{}),text:e.target.value})} className="md:col-span-2 border rounded-xl px-3 py-2" placeholder="Nội dung thông báo"/><input value={draft.announcement?.buttonLabel||''} onChange={e=>set('announcement',{...(draft.announcement||{}),buttonLabel:e.target.value})} className="border rounded-xl px-3 py-2" placeholder="Tên nút"/><input value={draft.announcement?.buttonUrl||''} onChange={e=>set('announcement',{...(draft.announcement||{}),buttonUrl:e.target.value})} className="border rounded-xl px-3 py-2" placeholder="URL nút"/><input type="datetime-local" value={draft.announcement?.startAt||''} onChange={e=>set('announcement',{...(draft.announcement||{}),startAt:e.target.value})} className="border rounded-xl px-3 py-2"/><input type="datetime-local" value={draft.announcement?.endAt||''} onChange={e=>set('announcement',{...(draft.announcement||{}),endAt:e.target.value})} className="border rounded-xl px-3 py-2"/></div></Card>

    <Card icon={<Menu size={18}/>} title="Taxonomy toàn hệ thống"><p className="mb-4 text-xs leading-5 text-slate-500">Nguồn chuyên mục dùng chung cho các module. Có thể thêm, sửa, ẩn và sắp xếp.</p><EditorList title="Lĩnh vực / Chuyên mục" rows={taxonomy} fields={['id','label','visible']} onChange={n=>set('taxonomyCategories',n)}/></Card>

    <Card icon={<Gem size={18}/>} title="Thông tin Mạng lưới">
      <p className="mb-4 text-xs leading-5 text-slate-500">Mỗi dòng có thể sửa, thêm, xóa, kéo thứ tự hoặc tạm ẩn. Một trường trống không làm mất cả khối thông tin.</p>
      <EditorList title="Thông tin tổ chức & minh bạch" rows={organization} fields={['label','value','url','visible']} onChange={n=>set('organizationInfo',n)}/>
    </Card>

    <Card icon={<PanelBottom size={18}/>} title="Chân trang">
      <EditorList title="Liên kết nhanh" rows={quick} fields={['label','url']} onChange={n=>set('footerQuickLinks',n)}/>
      <EditorList title="Liên hệ & Kết nối" rows={contacts} fields={['label','value','url','icon']} onChange={n=>set('footerContacts',n)}/>
      <EditorList title="Các cổng Sky First" rows={portals} fields={['label','domain','url','icon']} onChange={n=>set('footerPortals',n)}/>
      <EditorList title="Liên kết pháp lý & hệ thống" rows={legal} fields={['label','url']} onChange={n=>set('footerLegalLinks',n)}/>
      <div className="mt-4"><label className="text-xs font-bold text-slate-700">Dòng bản quyền</label><input value={draft.footerCopyright||''} onChange={e=>set('footerCopyright',e.target.value)} className="mt-1 w-full border rounded-xl px-3 py-2"/></div>
    </Card>
  </div>
}
const Card:React.FC<{title:string;icon:React.ReactNode;children:React.ReactNode}>=({title,icon,children})=><section className="bg-white border border-slate-200 rounded-2xl p-5"><h3 className="font-black text-slate-900 flex items-center gap-2 mb-4">{icon}{title}</h3>{children}</section>;
const EditorList:React.FC<{title:string;rows:any[];fields:string[];onChange:(n:any[])=>void}>=({title,rows,fields,onChange})=><div className="mb-5"><div className="flex items-center justify-between mb-2"><h4 className="text-sm font-bold">{title}</h4><button onClick={()=>onChange([...rows,Object.fromEntries(fields.map(f=>[f,f==='visible'?true:'']))])} className="text-xs font-bold text-sky-700 inline-flex items-center gap-1"><Plus size={14}/>Thêm</button></div><div className="space-y-2">{rows.map((r:any,i:number)=><div key={i} className={`grid gap-2 ${fields.length>=4?'lg:grid-cols-4':'lg:grid-cols-2'} items-center`}>{fields.map(f=>f==='visible'?<label key={f} className="flex h-[42px] items-center gap-2 rounded-lg border bg-white px-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={r[f]!==false} onChange={e=>{const n=[...rows];n[i]={...r,[f]:e.target.checked};onChange(n)}}/>Hiển thị</label>:<input key={f} value={String(r[f]??'')} onChange={e=>{const n=[...rows];n[i]={...r,[f]:e.target.value};onChange(n)}} className="border rounded-lg px-3 py-2 text-sm" placeholder={f}/>) }<div className="lg:col-span-full flex justify-end gap-1"><button onClick={()=>onChange(moveLocal(rows,i,-1))} className="p-1.5 border rounded"><ChevronUp size={14}/></button><button onClick={()=>onChange(moveLocal(rows,i,1))} className="p-1.5 border rounded"><ChevronDown size={14}/></button><button onClick={()=>onChange(rows.filter((_:any,j:number)=>j!==i))} className="p-1.5 border rounded text-rose-600"><Trash2 size={14}/></button></div></div>)}</div></div>;
function moveLocal(arr:any[],i:number,d:number){const n=[...arr],j=i+d;if(j<0||j>=n.length)return arr;[n[i],n[j]]=[n[j],n[i]];return n}
