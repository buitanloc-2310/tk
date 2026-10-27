import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, ChevronDown, Clock, Edit3, Facebook, FileText, FlaskConical, FolderKanban, Globe2, GraduationCap, Handshake, HeartHandshake, Home, Info, Instagram, Leaf, Link as LinkIcon, Mail, Megaphone, Menu, MessageCircle, Newspaper, Phone, RefreshCw, ScanSearch, Search, ShieldCheck, Sparkles, UserRoundPlus, Users, Wrench, X } from 'lucide-react';
import { useDataContext } from '../context/DataContext';
import { PageRoute, SiteConfig } from '../types';
import { getArticleSlug, getProgramSlug } from '../utils/contentUtils';




interface NavbarProps {
  currentPage: PageRoute;
  onNavigate: (page: PageRoute, slug?: string) => void;
}

type MenuItem = { label: string; page: PageRoute; slug?: string; description?: string };
type MenuGroup = { label: string; items: MenuItem[] };

const activityIcons = [GraduationCap, Users, HeartHandshake, Leaf, FlaskConical, FolderKanban, CalendarDays, Handshake, Megaphone];
const menuIcon = (label: string) => {
  const x = label.toLocaleLowerCase('vi');
  if (x.includes('tra cứu')) return ScanSearch;
  if (x.includes('thành viên') || x.includes('core team') || x.includes('tình nguyện')) return Users;
  if (x.includes('hợp tác') || x.includes('đồng hành')) return Handshake;
  if (x.includes('tin') || x.includes('bản tin') || x.includes('thông báo')) return Newspaper;
  if (x.includes('tài liệu') || x.includes('báo cáo')) return FileText;
  if (x.includes('giáo dục')) return GraduationCap;
  if (x.includes('môi trường')) return Leaf;
  if (x.includes('nghiên cứu')) return FlaskConical;
  return Sparkles;
};

// Filter out standalone out-of-scope modules (/certificate, /sponsor) from default public menus
const filterPublicMenuItems = (items: MenuItem[] = []) =>
  items.filter(
    (item) =>
      item.page !== 'certificate' &&
      item.page !== 'sponsor' &&
      item.slug !== 'certificate' &&
      item.slug !== 'sponsor'
  );

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const { siteConfig, programs, newsArticles, customPages } = useDataContext();
  const rawGroups: MenuGroup[] = (siteConfig.navigationGroups || []) as MenuGroup[];
  const groups: MenuGroup[] = useMemo(
    () =>
      rawGroups
        .map((g) => ({ ...g, items: filterPublicMenuItems(g.items) }))
        .filter((g) => g.items.length > 0),
    [rawGroups]
  );

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);
  const [openDesktopGroup, setOpenDesktopGroup] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const closeTimer = useRef<number | undefined>(undefined);
  const cancelClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = undefined;
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpenDesktopGroup(null), 300);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDesktopGroup(null);
        setSearchOpen(false);
        setMobileOpen(false);
      }
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (openDesktopGroup && !target.closest('[data-sf-menu-root]')) setOpenDesktopGroup(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
      cancelClose();
    };
  }, [openDesktopGroup]);

  const activityGroup = useMemo(() => groups.find((g) => g.label === 'Hoạt động'), [groups]);
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('vi');
    if (q.length < 2) return [] as { label: string; meta: string; page: PageRoute; slug?: string }[];
    const normalize = (v: unknown) => String(v || '').toLocaleLowerCase('vi');
    const rows: [string, string, PageRoute, string?][] = [];
    for (const p of programs.filter((x) => x.isPublished !== false))
      if ([p.title, p.summary, p.categoryLabel].some((v) => normalize(v).includes(q)))
        rows.push([p.title, p.categoryLabel || 'Chương trình', 'program-detail', getProgramSlug(p)]);
    for (const n of newsArticles.filter((x) => x.isPublished !== false))
      if ([n.title, n.summary, n.categoryLabel].some((v) => normalize(v).includes(q)))
        rows.push([n.title, n.categoryLabel || 'Tin tức', 'news-detail', getArticleSlug(n)]);
    for (const p of customPages.filter((x) => x.isPublished !== false && x.slug !== 'certificate' && x.slug !== 'sponsor'))
      if ([p.title, p.summary, p.badge].some((v) => normalize(v).includes(q)))
        rows.push([p.title, p.badge || 'Trang thông tin', 'custom-page', p.slug]);
    return rows.slice(0, 10).map(([label, meta, page, slug]) => ({ label, meta, page, slug }));
  }, [searchQuery, programs, newsArticles, customPages]);

  const go = (page: PageRoute, slug?: string) => {
    onNavigate(page, slug);
    setMobileOpen(false);
    setOpenDesktopGroup(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderStandardDropdown = (group: MenuGroup) => {
    const open = openDesktopGroup === group.label;
    const isLarge = group.items.length > 6;
    const HeaderIcon =
      group.label === 'Giới thiệu'
        ? Info
        : group.label === 'Tin tức'
        ? Newspaper
        : group.label === 'Tra cứu'
        ? ScanSearch
        : group.label === 'Tham gia'
        ? UserRoundPlus
        : Sparkles;
    return (
      <div
        key={group.label}
        className="relative"
        data-sf-menu-root
        onMouseEnter={() => {
          cancelClose();
          setOpenDesktopGroup(group.label);
        }}
        onMouseLeave={scheduleClose}
      >
        <button
          onClick={() => setOpenDesktopGroup(open ? null : group.label)}
          aria-expanded={open}
          className="px-4 py-2.5 rounded-2xl text-[15px] font-semibold text-slate-700 hover:text-[#0B66C3] hover:bg-sky-50 transition flex items-center gap-1.5"
        >
          <HeaderIcon size={16} />
          {group.label}
          <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-[80]" onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
            <div className={`${isLarge ? 'w-[720px]' : 'w-[430px]'} rounded-[26px] border border-slate-200/80 bg-white shadow-[0_28px_70px_rgba(15,23,42,.18)] p-3`}>
              <div className="mb-2 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#0B66C3] shadow-sm">
                  <HeaderIcon size={17} />
                </span>
                <div>
                  <div className="font-black text-slate-950">{group.label}</div>
                  <div className="text-[11px] text-slate-500">Chọn nội dung bạn muốn khám phá</div>
                </div>
              </div>
              <div className={`grid gap-1 ${isLarge ? 'grid-cols-2' : ''}`}>
                {group.items.map((item) => {
                  const Icon = menuIcon(item.label);
                  return (
                    <button
                      key={`${item.label}-${item.slug || item.page}`}
                      onClick={() => go(item.page, item.slug)}
                      className="w-full px-3 py-3 rounded-2xl text-left hover:bg-sky-50 transition group flex gap-3 items-start"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-50 text-[#0B66C3] group-hover:bg-white">
                        <Icon size={16} />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-extrabold text-slate-900 group-hover:text-[#0B66C3]">{item.label}</span>
                        {item.description && (
                          <span className="mt-1 block text-[11px] leading-4 font-medium text-slate-500 line-clamp-2">
                            {item.description}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200/80">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-[76px] flex items-center justify-between gap-5">
          <button
            onClick={() => go('home')}
            className="flex items-center min-w-0 text-left"
            aria-label={`${siteConfig.siteName || 'Sky First Network'} - Trang chủ`}
          >
            {siteConfig.logoUrl ? (
              <img
                src={siteConfig.logoUrl}
                alt={siteConfig.siteName || 'Sky First Network'}
                className="h-10 sm:h-[50px] w-auto object-contain"
              />
            ) : (
              <span className="font-black text-slate-900">{siteConfig.siteName || 'Sky First Network'}</span>
            )}
          </button>

          <nav
            className="hidden lg:flex flex-1 items-center justify-center gap-4 xl:gap-7 px-4"
            data-sf-menu-root
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <button
              onClick={() => go('home')}
              className={`px-4 py-2.5 rounded-2xl text-[15px] font-semibold transition flex items-center gap-1.5 ${
                currentPage === 'home' ? 'text-[#0B66C3] bg-sky-50' : 'text-slate-700 hover:text-[#0B66C3] hover:bg-sky-50'
              }`}
            >
              <Home size={16} />
              Trang chủ
            </button>
            {groups
              .filter((g) => g.label !== 'Đơn vị trực thuộc')
              .map((group) => {
                if (group.label !== 'Hoạt động') return renderStandardDropdown(group);
                const open = openDesktopGroup === group.label;
                const items = activityGroup?.items || [];
                const first = items.slice(0, 5);
                const second = items.slice(5);
                return (
                  <div
                    key={group.label}
                    className="relative"
                    data-sf-menu-root
                    onMouseEnter={() => {
                      cancelClose();
                      setOpenDesktopGroup(group.label);
                    }}
                    onMouseLeave={scheduleClose}
                  >
                    <button
                      onClick={() => setOpenDesktopGroup(open ? null : group.label)}
                      aria-expanded={open}
                      className="px-4 py-2.5 rounded-2xl text-[15px] font-semibold text-slate-700 hover:text-[#0B66C3] hover:bg-sky-50 transition flex items-center gap-1.5"
                    >
                      {group.label}
                      <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && (
                      <div
                        className="fixed left-1/2 -translate-x-1/2 top-[70px] pt-5 z-[80] w-[min(1120px,calc(100vw-48px))]"
                        onMouseEnter={cancelClose}
                        onMouseLeave={scheduleClose}
                      >
                        <div className="grid grid-cols-[1fr_1fr_.72fr] gap-0 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_34px_90px_rgba(15,23,42,.20)]">
                          <section className="p-6 border-r border-slate-100">
                            <div className="mb-4 flex items-start gap-3">
                              <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-[#0B66C3]">
                                <Sparkles size={19} />
                              </div>
                              <div>
                                <p className="font-black text-slate-950">Lĩnh vực hoạt động</p>
                                <p className="text-xs text-slate-500 mt-0.5">Các mảng trọng tâm đang được triển khai</p>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              {first.map((item, i) => {
                                const Icon = activityIcons[i] || BookOpen;
                                return (
                                  <button
                                    key={item.label}
                                    onClick={() => go(item.page, item.slug)}
                                    className="w-full flex items-start gap-3 rounded-2xl p-3 text-left hover:bg-sky-50 transition group"
                                  >
                                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-50 text-[#0B66C3] group-hover:bg-white">
                                      <Icon size={18} />
                                    </span>
                                    <span>
                                      <span className="block font-extrabold text-slate-900 group-hover:text-[#0B66C3]">{item.label}</span>
                                      <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">
                                        {item.description || 'Khám phá nội dung, chương trình và hoạt động liên quan.'}
                                      </span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </section>
                          <section className="p-6 border-r border-slate-100">
                            <div className="mb-4 flex items-start gap-3">
                              <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
                                <FolderKanban size={19} />
                              </div>
                              <div>
                                <p className="font-black text-slate-950">Khám phá hoạt động</p>
                                <p className="text-xs text-slate-500 mt-0.5">Chương trình, sự kiện và cơ hội kết nối</p>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              {second.map((item, idx) => {
                                const Icon = activityIcons[idx + 5] || ArrowRight;
                                return (
                                  <button
                                    key={item.label}
                                    onClick={() => go(item.page, item.slug)}
                                    className="w-full flex items-start gap-3 rounded-2xl p-3 text-left hover:bg-sky-50 transition group"
                                  >
                                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-50 text-[#0B66C3] group-hover:bg-white">
                                      <Icon size={18} />
                                    </span>
                                    <span>
                                      <span className="block font-extrabold text-slate-900 group-hover:text-[#0B66C3]">{item.label}</span>
                                      <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">
                                        {item.description || 'Xem nội dung đang được công bố trên hệ thống.'}
                                      </span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            <button
                              onClick={() => go('programs')}
                              className="mt-4 w-full rounded-2xl bg-sky-50 px-4 py-3 text-sm font-extrabold text-[#0B66C3] hover:bg-sky-100 transition"
                            >
                              Xem tất cả hoạt động <ArrowRight size={15} className="inline ml-1" />
                            </button>
                          </section>
                          <aside className="p-6 bg-gradient-to-b from-[#F7FBFF] to-white">
                            <p className="text-[11px] uppercase tracking-[.15em] font-black text-[#0B66C3]">Điểm đến nhanh</p>
                            <div className="mt-4 rounded-[22px] bg-gradient-to-br from-[#071B3A] via-[#0B4D96] to-[#0796E6] p-5 text-white overflow-hidden relative">
                              <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full border-[18px] border-white/10" />
                              <div className="relative">
                                <HeartHandshake size={26} className="text-cyan-200" />
                                <h3 className="mt-4 text-xl font-black">Cùng tạo giá trị cho cộng đồng</h3>
                                <p className="mt-2 text-xs leading-5 text-sky-100">
                                  Khám phá các chương trình, dự án và cơ hội đang mở của Sky First Network.
                                </p>
                                <button
                                  onClick={() => go('join')}
                                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#0B4D96]"
                                >
                                  Tham gia <ArrowRight size={14} />
                                </button>
                              </div>
                            </div>
                          </aside>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={() => {
                setSearchOpen(true);
                setOpenDesktopGroup(null);
              }}
              className="p-3 rounded-2xl border border-slate-200 text-slate-600 hover:text-[#0B66C3] hover:bg-sky-50"
              aria-label="Tìm kiếm toàn website"
            >
              <Search size={19} />
            </button>
            <button
              onClick={() => go('join')}
              className="hidden xl:inline-flex items-center gap-2 rounded-2xl bg-[#0B66C3] px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-[#084F99] transition"
            >
              <UserRoundPlus size={17} />
              Tham gia
              <ArrowRight size={15} />
            </button>
          </div>

          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden p-2.5 rounded-xl border border-slate-200 text-slate-700"
            aria-label="Mở menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white max-h-[calc(100vh-76px)] overflow-y-auto">
          <div className="px-4 py-4 space-y-2">
            <button onClick={() => go('home')} className="w-full text-left px-4 py-3 rounded-xl font-bold bg-slate-50">
              Trang chủ
            </button>
            {groups
              .filter((g) => g.label !== 'Đơn vị trực thuộc')
              .map((group) => (
                <div key={group.label} className="border border-slate-200 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setOpenMobileGroup(openMobileGroup === group.label ? null : group.label)}
                    className="w-full flex items-center justify-between px-4 py-3.5 font-bold text-slate-800"
                  >
                    {group.label}
                    <ChevronDown size={17} className={`transition ${openMobileGroup === group.label ? 'rotate-180' : ''}`} />
                  </button>
                  {openMobileGroup === group.label && (
                    <div className="border-t border-slate-100 bg-slate-50 p-2">
                      {group.items.map((item) => (
                        <button
                          key={`${item.label}-${item.slug || item.page}`}
                          onClick={() => go(item.page, item.slug)}
                          className="w-full px-3 py-3 rounded-xl text-left hover:bg-white"
                        >
                          <span className="block text-sm font-bold text-slate-900">{item.label}</span>
                          {item.description && <span className="block mt-1 text-[11px] leading-4 text-slate-500">{item.description}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            <button onClick={() => go('join')} className="w-full px-4 py-3 rounded-xl bg-[#0B66C3] text-white text-sm font-black">
              Tham gia cùng Sky First
            </button>
            <button onClick={() => go('admin')} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">
              Đăng nhập quản trị
            </button>
          </div>
        </div>
      )}

      {searchOpen && (
        <div
          className="fixed inset-0 z-[120] bg-slate-950/45 backdrop-blur-sm p-4 sm:p-8"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSearchOpen(false);
          }}
        >
          <div className="mx-auto mt-[7vh] max-w-2xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_35px_100px_rgba(15,23,42,.35)]">
            <div className="flex items-center gap-3 border-b border-slate-100 p-4 sm:p-5">
              <Search className="text-[#0B66C3]" size={20} />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm bài viết, dự án, trang thông tin..."
                className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-slate-400"
              />
              <button onClick={() => setSearchOpen(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100">
                <X size={19} />
              </button>
            </div>
            <div className="max-h-[58vh] overflow-y-auto p-3">
              {searchQuery.trim().length < 2 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Nhập ít nhất 2 ký tự để tìm nhanh trong bài viết, chương trình và trang công khai.
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">Chưa tìm thấy nội dung phù hợp.</div>
              ) : (
                searchResults.map((r, i) => (
                  <button
                    key={`${r.page}-${r.slug}-${i}`}
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery('');
                      go(r.page, r.slug);
                    }}
                    className="w-full rounded-2xl p-4 text-left hover:bg-sky-50 transition"
                  >
                    <span className="block text-[11px] font-black uppercase tracking-wider text-[#0B66C3]">{r.meta}</span>
                    <span className="mt-1 block font-extrabold text-slate-900">{r.label}</span>
                  </button>
                ))
              )}
            </div>
            <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-[11px] text-slate-500">
              Tìm kiếm trong nội dung đang được công khai trên website.
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

interface FooterProps {
  onNavigate: (page: PageRoute, slug?: string) => void;
}
const iconMap: Record<string, any> = {
  mail: Mail,
  phone: Phone,
  facebook: Facebook,
  instagram: Instagram,
  message: MessageCircle,
  users: Users,
  heart: HeartHandshake,
  globe: Globe2,
  graduation: GraduationCap,
  link: LinkIcon,
};

function resolveInternal(url: string): { page: PageRoute; slug?: string } | null {
  if (!url.startsWith('/')) return null;
  if (url === '/') return { page: 'home' };
  const parts = url.replace(/^\/+|\/+$/g, '').split('/');
  if ((parts[0] === 'page' || parts[0] === 'trang') && parts[1])
    return { page: 'custom-page', slug: decodeURIComponent(parts.slice(1).join('/')) };
  const direct: Record<string, PageRoute> = {
    home: 'home',
    about: 'about',
    programs: 'programs',
    units: 'units',
    news: 'news',
    certificate: 'certificate',
    sponsor: 'sponsor',
    join: 'join',
    contact: 'contact',
    admin: 'admin',
  };
  if (direct[parts[0]]) return { page: direct[parts[0]] };
  return { page: 'custom-page', slug: decodeURIComponent(parts.join('/')) };
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { siteConfig } = useDataContext();
  const contacts = siteConfig.footerContacts || [];
  const portals = (siteConfig.footerPortals || []).filter((p: any) => !String(p.domain || '').includes('ctt.'));
  const legal = siteConfig.footerLegalLinks || [];
  const org = (siteConfig.organizationInfo || []).filter((x: any) => x.visible !== false && String(x.value || '').trim());
  const groups = siteConfig.navigationGroups || [];
  const intro = filterPublicMenuItems(groups.find((g: any) => g.label === 'Giới thiệu')?.items || []).slice(0, 6);
  const join = filterPublicMenuItems(groups.find((g: any) => g.label === 'Tham gia')?.items || []).slice(0, 5);
  const go = (url: string, e: React.MouseEvent) => {
    const t = resolveInternal(url);
    if (!t) return;
    e.preventDefault();
    onNavigate(t.page, t.slug);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const LinkRow = ({ label, url }: { label: string; url: string }) => (
    <a
      href={url}
      onClick={(e) => (resolveInternal(url) ? go(url, e) : undefined)}
      target={!resolveInternal(url) && /^https?:/i.test(url) ? '_blank' : undefined}
      rel={!resolveInternal(url) && /^https?:/i.test(url) ? 'noopener noreferrer' : undefined}
      className="text-[13px] leading-5 text-slate-400 transition hover:text-white"
    >
      {label}
    </a>
  );
  return (
    <footer className="bg-[#06152F] text-slate-300">
      <div className="mx-auto max-w-[1380px] px-4 py-9 sm:px-6 lg:px-8 lg:py-10">
        {org.length > 0 && (
          <section className="mb-8 rounded-[22px] border border-white/10 bg-white/[.035] p-5">
            <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[.16em] text-sky-300">
              <ShieldCheck size={14} />
              Thông tin Mạng lưới
            </div>
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
              {org.map((x: any, i: number) => (
                <div key={`${x.label}-${i}`} className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{x.label}</div>
                  {x.url ? (
                    <a href={x.url} className="mt-1 block break-words text-[13px] font-semibold text-slate-200 hover:text-sky-300">
                      {x.value}
                    </a>
                  ) : (
                    <div className="mt-1 break-words text-[13px] font-semibold text-slate-200">{x.value}</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
        <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-[1.15fr_.8fr_.9fr_1.05fr]">
          <div>
            <img
              src={siteConfig.logoUrl || '/brand/sky-first-network-web.png'}
              alt={siteConfig.siteName || 'Sky First Network'}
              className="h-12 w-auto max-w-[190px] object-contain object-left"
            />
            <p className="mt-3 max-w-sm text-[13px] leading-6 text-slate-400">
              {siteConfig.footerAboutText || siteConfig.siteDescription}
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-xs font-black uppercase tracking-[.12em] text-white">Khám phá</h4>
            <div className="grid gap-2">
              {intro.map((x: any) => (
                <LinkRow key={x.label} label={x.label} url={x.slug ? `/${x.slug}` : `/${x.page}`} />
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-xs font-black uppercase tracking-[.12em] text-white">Hoạt động & Tham gia</h4>
            <div className="grid gap-2">
              {join.map((x: any) => (
                <LinkRow key={x.label} label={x.label} url={x.slug ? `/${x.slug}` : `/${x.page}`} />
              ))}
              <LinkRow label="Chương trình & Dự án" url="/programs" />
              <LinkRow label="Tài liệu công khai" url="/tai-lieu-cong-khai" />
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-xs font-black uppercase tracking-[.12em] text-white">Liên hệ</h4>
            <div className="grid gap-2">
              {contacts
                .filter((x: any) => x.url?.startsWith('mailto:') || x.url?.startsWith('tel:'))
                .slice(0, 5)
                .map((x: any) => {
                  const Icon = iconMap[x.icon || 'link'] || LinkIcon;
                  return (
                    <a key={x.label + x.url} href={x.url} className="flex items-center gap-2.5 rounded-xl px-1 py-1 text-slate-400 hover:text-white">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/5 text-sky-300">
                        <Icon size={13} />
                      </span>
                      <span className="min-w-0">
                        <b className="block text-[11px] text-slate-200">{x.label}</b>
                        <span className="block break-all text-[11px]">{x.value}</span>
                      </span>
                    </a>
                  );
                })}
            </div>
          </div>
        </div>
        {portals.length > 0 && (
          <section className="mt-8 border-t border-white/10 pt-6">
            <h4 className="mb-4 text-xs font-black uppercase tracking-[.12em] text-white">Hệ sinh thái số Sky First</h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {portals.map((x: any) => {
                const Icon = iconMap[x.icon || 'link'] || LinkIcon;
                return (
                  <a
                    key={x.label + x.url}
                    href={x.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex min-h-[92px] items-start gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-3.5 transition hover:-translate-y-0.5 hover:border-sky-400/30 hover:bg-white/[.06]"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-400/10 text-sky-300">
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block text-[12px] leading-5 text-white">{x.label}</b>
                      <span className="mt-1 block text-[10px] leading-4 text-slate-500">
                        {x.description || 'Truy cập nền tảng Sky First'}
                      </span>
                    </span>
                    <ArrowUpRight size={13} className="shrink-0 text-slate-600 group-hover:text-sky-300" />
                  </a>
                );
              })}
            </div>
          </section>
        )}
        <div className="mt-7 flex flex-col gap-3 border-t border-white/10 pt-5 text-[11px] text-slate-500 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {legal.map((x: any) => (
              <LinkRow key={x.label + x.url} label={x.label} url={x.url} />
            ))}
          </div>
          <p>{siteConfig.footerCopyright || '© 2026. Mạng lưới Giáo dục & Phát triển Cộng đồng Sky First.'}</p>
        </div>
      </div>
    </footer>
  );
};

// --- Consolidated from SiteStatusNotices.tsx ---

// -----------------------------------------------------------------------------
// Preserved component source: SiteClosedNotice.tsx
// -----------------------------------------------------------------------------

interface SiteClosedNoticeProps {
  siteConfig: SiteConfig;
  onNavigateToAdmin?: () => void;
  onNavigateToContact?: () => void;
}

export const SiteClosedNotice: React.FC<SiteClosedNoticeProps> = ({
  siteConfig,
}) => {
  const reasonText =
    siteConfig.closedReasonText ||
    (siteConfig.closedReason === 'editing'
      ? 'Hệ thống đang trong quá trình biên tập nội dung'
      : siteConfig.closedReason === 'upgrading'
      ? 'Hệ thống đang nâng cấp tính năng & cơ sở hạ tầng'
      : 'Hệ thống đang bảo trì định kỳ');

  const getReasonIcon = () => {
    switch (siteConfig.closedReason) {
      case 'editing':
        return <Edit3 className="w-8 h-8 text-amber-600" />;
      case 'upgrading':
        return <RefreshCw className="w-8 h-8 text-sky-600 animate-spin-slow" />;
      default:
        return <Wrench className="w-8 h-8 text-rose-600" />;
    }
  };

  const getBadgeColor = () => {
    switch (siteConfig.closedReason) {
      case 'editing':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'upgrading':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      default:
        return 'bg-rose-100 text-rose-800 border-rose-300';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-sky-500 selection:text-white">
      {/* Background radial glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00A3FF] to-[#2563EB] flex items-center justify-center font-black text-white text-lg shadow-md shadow-sky-500/20 overflow-hidden">
            {siteConfig.logoUrl ? (
              <img
                src={siteConfig.logoUrl}
                alt={siteConfig.siteName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>S</span>
            )}
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-tight text-white">
              {siteConfig.siteName || 'Sky First Network'}
            </h1>
            <p className="text-[11px] text-slate-400 font-medium -mt-0.5">
              {siteConfig.siteDescription || siteConfig.tagline || 'Mạng lưới Giáo dục & Phát triển Cộng đồng'}
            </p>
          </div>
        </div>
      </header>

      {/* Main Center Announcement Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="max-w-2xl w-full bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 sm:p-10 shadow-2xl text-center relative overflow-hidden">
          {/* Subtle top indicator */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-sky-500" />

          {/* Status Icon & Badge */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900/80 border border-slate-700/80 shadow-inner mb-5">
            {getReasonIcon()}
          </div>

          <div className="mb-4">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold border tracking-wide uppercase ${getBadgeColor()}`}
            >
              {siteConfig.closedReason === 'editing'
                ? 'Đang Biên Tập Nội Dung'
                : siteConfig.closedReason === 'upgrading'
                ? 'Đang Nâng Cấp Hệ Thống'
                : 'Đang Bảo Trì Website'}
            </span>
          </div>

          {/* Main Title */}
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-snug mb-3">
            {reasonText}
          </h2>

          {/* Description Message */}
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal mb-8 max-w-lg mx-auto">
            {siteConfig.closedMessage ||
              'Website hiện đang tạm thời đóng để đội ngũ kỹ thuật và ban biên tập chuẩn hóa dữ liệu mới. Mọi dịch vụ và tiện ích sẽ sớm trở lại hoạt động bình thường.'}
          </p>

          {/* Key Details Grid: Estimated reopen & Hotline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-8 text-left max-w-lg mx-auto">
            <div className="bg-slate-900/70 border border-slate-700/70 rounded-2xl p-3.5 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                <Clock size={18} />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
                  Dự kiến hoàn thành
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-100 block mt-0.5">
                  {siteConfig.closedEstimatedReopen || 'Đang cập nhật thời gian'}
                </span>
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-700/70 rounded-2xl p-3.5 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 shrink-0">
                <Phone size={18} />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
                  Đường dây hỗ trợ
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-100 block mt-0.5">
                  {siteConfig.hotline || '0924 910 210'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {siteConfig.email && (
              <a
                href={`mailto:${siteConfig.email}`}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-sky-600/25 transition flex items-center justify-center gap-2"
              >
                <Mail size={15} />
                <span>Gửi Email hỗ trợ ({siteConfig.email})</span>
              </a>
            )}

            {siteConfig.hotline && (
              <a
                href={`tel:${siteConfig.hotline.replace(/\s+/g, '')}`}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-700/70 hover:bg-slate-700 text-slate-200 hover:text-white text-xs sm:text-sm font-semibold rounded-xl border border-slate-600 transition flex items-center justify-center gap-2"
              >
                <Phone size={15} className="text-slate-400" />
                <span>Gọi Hotline</span>
              </a>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 py-3 text-center text-xs text-slate-500">
        <p>
          {siteConfig.siteName || 'Sky First Network'} • Thông báo tạm dừng hoạt động
        </p>
      </footer>
    </div>
  );
};


// -----------------------------------------------------------------------------
// Preserved component source: SiteClosedTopBanner.tsx
// -----------------------------------------------------------------------------

interface SiteClosedTopBannerProps {
  siteConfig: SiteConfig;
  onNavigateToAdmin?: () => void;
}

export const SiteClosedTopBanner: React.FC<SiteClosedTopBannerProps> = ({
  siteConfig,
}) => {
  if (siteConfig.siteStatus !== 'closed') return null;

  const reasonLabel =
    siteConfig.closedReason === 'editing'
      ? 'Đang biên tập nội dung'
      : siteConfig.closedReason === 'upgrading'
      ? 'Đang nâng cấp hệ thống'
      : 'Đang bảo trì định kỳ';

  const reasonDetail =
    siteConfig.closedReasonText ||
    siteConfig.closedMessage ||
    'Website hiện đang tạm đóng một số tính năng để cập nhật dữ liệu mới.';

  return (
    <aside aria-label="Thông báo trạng thái hệ thống" className="bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 text-white text-xs py-2.5 px-4 shadow-md sticky top-0 z-50 transition-all border-b border-white/15">
      <div className="max-w-7xl mx-auto flex items-center justify-center text-center">
        <div className="flex items-center gap-2.5 flex-wrap justify-center">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-white font-black text-[10px] tracking-wider uppercase backdrop-blur-xs">
            {siteConfig.closedReason === 'editing' ? (
              <Edit3 size={11} />
            ) : siteConfig.closedReason === 'upgrading' ? (
              <RefreshCw size={11} />
            ) : (
              <Wrench size={11} />
            )}
            <span>{reasonLabel}</span>
          </span>

          <span className="font-semibold text-white/95 text-xs sm:text-sm">
            {reasonDetail}
          </span>

          {siteConfig.closedEstimatedReopen && (
            <span className="text-white/85 text-[11px] sm:text-xs font-medium bg-black/15 px-2 py-0.5 rounded-md">
              (Dự kiến: {siteConfig.closedEstimatedReopen})
            </span>
          )}
        </div>
      </div>
    </aside>
  );
};
