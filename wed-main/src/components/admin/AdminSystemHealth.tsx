import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Loader2, RefreshCw, XCircle, ExternalLink, HelpCircle, Play } from 'lucide-react';
import { testFirestoreConnection } from '../../lib/firebase';
import { listMedia } from '../../lib/firebase';
import { adminApi } from '../../lib/firebase';
import { useDataContext } from '../../context/DataContext';

type HealthStatus = 'normal' | 'warning' | 'error' | 'unverifiable';
type HealthItem = {
  id: string;
  name: string;
  status: HealthStatus;
  detail: string;
  checkedAt?: string;
  href?: string;
};

const cleanPath = (v: any) => ('/' + String(v || '').replace(/^\/+|\/+$/g, '')).replace(/\/{2,}/g, '/');

const STATUS_BADGE: Record<HealthStatus, { label: string; className: string; icon: React.ReactNode }> = {
  normal: {
    label: 'Bình thường',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="text-emerald-600 shrink-0" size={18} />,
  },
  warning: {
    label: 'Cần chú ý',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: <AlertTriangle className="text-amber-600 shrink-0" size={18} />,
  },
  error: {
    label: 'Lỗi',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: <XCircle className="text-rose-600 shrink-0" size={18} />,
  },
  unverifiable: {
    label: 'Không thể kiểm tra',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: <HelpCircle className="text-slate-500 shrink-0" size={18} />,
  },
};

export const AdminSystemHealth: React.FC = () => {
  const { firebaseSyncStatus, firebaseSyncMessage, siteConfig, customPages, programs, newsArticles, networkUnits } = useDataContext();
  const [results, setResults] = useState<HealthItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningAuto, setRunningAuto] = useState(false);
  const [autoSummary, setAutoSummary] = useState<string>('');

  const check = async () => {
    setLoading(true);
    const nowIso = new Date().toLocaleString('vi-VN');
    try {
      const [cms, media, forms, redirects, sysHealth] = await Promise.allSettled([
        testFirestoreConnection(),
        listMedia(),
        adminApi('/api/forms?admin=1'),
        adminApi('/api/admin-records?kind=redirects'),
        adminApi('/api/system?action=health'),
      ]);

      const out: HealthItem[] = [];

      // Merge server-side health checks from /api/system?action=health first
      if (sysHealth.status === 'fulfilled' && Array.isArray((sysHealth.value as any)?.checks)) {
        for (const item of (sysHealth.value as any).checks) {
          out.push({
            id: item.id || item.name,
            name: item.name,
            status: (item.status as HealthStatus) || 'normal',
            detail: item.detail,
            checkedAt: item.checkedAt ? new Date(item.checkedAt).toLocaleString('vi-VN') : nowIso,
          });
        }
      } else {
        out.push({
          id: 'd1-conn',
          name: 'Kết nối dữ liệu Cloudflare D1',
          status: cms.status === 'fulfilled' && cms.value.ok ? 'normal' : 'error',
          detail: cms.status === 'fulfilled' ? cms.value.message : 'Không kết nối được dịch vụ dữ liệu D1.',
          checkedAt: nowIso,
        });
      }

      const globalConfigIssues: string[] = [];
      if (!String(siteConfig.email || '').includes('@')) globalConfigIssues.push('email liên hệ chính');
      if (!String(siteConfig.hotline || '').trim()) globalConfigIssues.push('hotline');
      if (!(siteConfig.taxonomyCategories || []).some((x) => x.visible !== false)) globalConfigIssues.push('taxonomy');
      if (!(siteConfig.navigationGroups || []).length) globalConfigIssues.push('menu điều hướng');
      out.push({
        id: 'global-config',
        name: 'Cấu hình toàn cục & Nhận diện',
        status: globalConfigIssues.length ? 'warning' : 'normal',
        detail: globalConfigIssues.length
          ? `Thiếu hoặc cần kiểm tra: ${globalConfigIssues.join(', ')}.`
          : 'Email, hotline, danh mục chuyên mục và menu điều hướng đã có cấu hình đầy đủ.',
        checkedAt: nowIso,
        href: '/admin/chinh-sua-website',
      });

      const mediaItems = media.status === 'fulfilled' ? media.value.items || [] : [];
      if (!out.some((x) => x.id === 'r2')) {
        out.push({
          id: 'r2-client',
          name: 'Thư viện Media / R2',
          status: media.status === 'fulfilled' ? 'normal' : 'unverifiable',
          detail:
            media.status === 'fulfilled'
              ? `Đã kết nối. ${mediaItems.length} tệp trong trang đầu được kiểm tra.`
              : 'Không thể kiểm tra trực tiếp kho Media từ phiên hiện tại.',
          checkedAt: nowIso,
          href: '/admin/media',
        });
      }

      const publishedPages = customPages.filter((x) => x.isPublished !== false);
      const publishedNews = newsArticles.filter((x) => x.isPublished !== false);
      const publishedPrograms = programs.filter((x) => x.isPublished !== false);
      const slugRows = [
        ...publishedPages.map((x) => ({ slug: x.slug, type: 'Trang', title: x.title })),
        ...publishedNews.map((x) => ({ slug: x.slug, type: 'Tin', title: x.title })),
        ...publishedPrograms.map((x) => ({ slug: x.slug, type: 'Chương trình', title: x.title })),
      ].filter((x) => x.slug);
      const seen = new Map<string, number>();
      for (const x of slugRows) {
        const k = String(x.slug).trim().toLowerCase();
        seen.set(k, (seen.get(k) || 0) + 1);
      }
      const dup = [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k);
      if (!out.some((x) => x.id === 'slugs')) {
        out.push({
          id: 'slugs-client',
          name: 'Kiểm tra trùng lặp đường dẫn (Slug)',
          status: dup.length ? 'error' : 'normal',
          detail: dup.length
            ? `Phát hiện ${dup.length} slug trùng: ${dup.slice(0, 5).join(', ')}`
            : 'Không phát hiện slug trùng trong nội dung đang xuất bản.',
          checkedAt: nowIso,
          href: '/admin/trang',
        });
      }

      const pageSlugs = new Set(
        customPages
          .filter((x) => x.isPublished !== false)
          .map((x) => String(x.slug || '').trim())
          .filter(Boolean)
      );
      const navItems = (siteConfig.navigationGroups || []).flatMap((g: any) => (Array.isArray(g.items) ? g.items : []));
      const brokenNav = navItems.filter((x: any) => x?.page === 'custom-page' && x?.slug && !pageSlugs.has(String(x.slug)));
      out.push({
        id: 'nav-links',
        name: 'Liên kết menu nội bộ',
        status: brokenNav.length ? 'warning' : 'normal',
        detail: brokenNav.length
          ? `${brokenNav.length} liên kết menu trỏ tới trang chưa xuất bản: ${brokenNav
              .slice(0, 4)
              .map((x: any) => x.label || x.slug)
              .join(' • ')}`
          : 'Tất cả liên kết trang tĩnh trong menu đều có trang công khai tương ứng.',
        checkedAt: nowIso,
        href: '/admin/menu',
      });

      const missingSeo = [
        ...publishedPages.filter((x) => !x.seoTitle?.trim() || !x.seoDescription?.trim()).map((x) => x.title),
        ...publishedNews.filter((x) => !x.seoTitle?.trim() || !x.seoDescription?.trim()).map((x) => x.title),
      ];
      out.push({
        id: 'seo-check',
        name: 'Metadata SEO nội dung xuất bản',
        status: missingSeo.length ? 'warning' : 'normal',
        detail: missingSeo.length
          ? `${missingSeo.length} trang/bài viết đang dùng SEO tự động từ tiêu đề/tóm tắt. Ví dụ: ${missingSeo.slice(0, 3).join(' • ')}`
          : 'Tất cả trang/bài viết đã khai báo SEO title & description riêng.',
        checkedAt: nowIso,
        href: '/admin/trang',
      });

      const missingAlt = publishedNews.filter((x) => x.imageUrl && !String(x.imageAlt || x.imageDescription || '').trim());
      out.push({
        id: 'image-alt',
        name: 'Văn bản thay thế (ALT) hình ảnh bài viết',
        status: missingAlt.length ? 'warning' : 'normal',
        detail: missingAlt.length
          ? `${missingAlt.length} bài viết có ảnh bìa nhưng chưa điền ALT riêng (đang dùng tiêu đề bài làm ALT dự phòng).`
          : 'Tất cả bài viết có ảnh đều đã có ALT mô tả.',
        checkedAt: nowIso,
        href: '/admin/bai-dang',
      });

      const formItems = forms.status === 'fulfilled' ? (forms.value as any).items || [] : [];
      const now = Date.now();
      const expired = formItems.filter(
        (f: any) => f.status === 'open' && f.settings?.closeAt && new Date(f.settings.closeAt).getTime() < now
      );
      if (!out.some((x) => x.id === 'forms')) {
        out.push({
          id: 'forms-client',
          name: 'Thời hạn đóng/mở Biểu mẫu chương trình',
          status: forms.status !== 'fulfilled' ? 'unverifiable' : expired.length ? 'warning' : 'normal',
          detail:
            forms.status !== 'fulfilled'
              ? 'Không thể kiểm tra danh sách biểu mẫu.'
              : expired.length
              ? `${expired.length} biểu mẫu đã qua thời hạn đóng và sẵn sàng tự động chuyển trạng thái.`
              : `Đang quản lý ${formItems.length} biểu mẫu hoạt động bình thường.`,
          checkedAt: nowIso,
          href: '/admin/forms',
        });
      }

      const redirectItems =
        redirects.status === 'fulfilled'
          ? ((redirects.value as any).items || []).filter((x: any) => String(x.active).toLowerCase() === 'true')
          : [];
      const edges = new Map<string, string>();
      for (const r of redirectItems) {
        if (r.fromPath && r.toPath) edges.set(cleanPath(r.fromPath), cleanPath(r.toPath));
      }
      let loops = 0;
      for (const start of edges.keys()) {
        const visited = new Set<string>();
        let cur = start;
        while (edges.has(cur)) {
          if (visited.has(cur)) {
            loops++;
            break;
          }
          visited.add(cur);
          cur = edges.get(cur)!;
          if (visited.size > 50) {
            loops++;
            break;
          }
        }
      }
      out.push({
        id: 'redirects-loop',
        name: 'Chuyển hướng 301 & Vòng lặp đường dẫn',
        status: redirects.status !== 'fulfilled' ? 'unverifiable' : loops ? 'error' : 'normal',
        detail:
          redirects.status !== 'fulfilled'
            ? 'Không tải được danh sách redirect.'
            : loops
            ? `Phát hiện ${loops} đường dẫn nằm trong vòng lặp chuyển hướng.`
            : `${redirectItems.length} redirect đang hoạt động; không có vòng lặp.`,
        checkedAt: nowIso,
        href: '/admin/redirect',
      });

      const allContent = JSON.stringify({ siteConfig, customPages, programs, newsArticles, networkUnits });
      const orphan = mediaItems.filter((m) => m.url && !allContent.includes(m.url));
      out.push({
        id: 'orphan-media',
        name: 'Tệp Media chưa gắn vào bài viết/trang',
        status: orphan.length ? 'warning' : 'normal',
        detail: orphan.length
          ? `${orphan.length}/${mediaItems.length} tệp ở trang đầu chưa được tham chiếu trực tiếp. Hệ thống giữ nguyên, không tự xóa.`
          : 'Tất cả tệp Media kiểm tra đều đang được sử dụng.',
        checkedAt: nowIso,
        href: '/admin/media',
      });

      setResults(out);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAutomations = async () => {
    setRunningAuto(true);
    try {
      const res: any = await adminApi('/api/system?action=run-automations', { method: 'POST', body: JSON.stringify({}) });
      const pubCount = res?.published?.publishedCount || 0;
      const closedCount = res?.closedFormsCount || 0;
      setAutoSummary(
        `Đã chạy tác vụ tự động lúc ${new Date().toLocaleTimeString('vi-VN')}: Xuất bản hẹn giờ ${pubCount} mục, tự động đóng ${closedCount} biểu mẫu hết hạn.`
      );
      await check();
    } catch (e: any) {
      setAutoSummary(e?.message || 'Không thể chạy tác vụ tự động.');
    } finally {
      setRunningAuto(false);
    }
  };

  useEffect(() => {
    void check();
  }, []);

  const counts = {
    normal: results.filter((r) => r.status === 'normal').length,
    warning: results.filter((r) => r.status === 'warning').length,
    error: results.filter((r) => r.status === 'error').length,
    unverifiable: results.filter((r) => r.status === 'unverifiable').length,
  };

  return (
    <section className="max-w-6xl space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900">Bảng Kiểm Tra Sức Khỏe Hệ Thống (System Health)</h2>
          <p className="text-xs text-slate-500 mt-1">
            Kiểm tra thời gian thực kết nối Cloudflare D1, kho Media R2, cấu hình Email & hàng đợi Outbox, biểu mẫu chương trình, SEO, slug trùng lặp và chuyển hướng 301.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={runningAuto}
            onClick={handleRunAutomations}
            className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-2 text-xs font-bold transition disabled:opacity-50"
          >
            <Play size={14} />
            <span>{runningAuto ? 'Đang chạy tự động hóa...' : 'Chạy tác vụ tự động ngay'}</span>
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void check()}
            className="inline-flex items-center justify-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Kiểm tra lại</span>
          </button>
        </div>
      </header>

      {autoSummary && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-semibold text-sky-900">
          {autoSummary}
        </div>
      )}

      {/* 4 Status Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['normal', 'warning', 'error', 'unverifiable'] as HealthStatus[]).map((st) => (
          <div key={st} className={`rounded-2xl border p-4 ${STATUS_BADGE[st].className}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">{STATUS_BADGE[st].label}</span>
              {STATUS_BADGE[st].icon}
            </div>
            <div className="mt-2 text-2xl font-black">{counts[st]}</div>
          </div>
        ))}
      </div>

      {loading && (
        <p role="status" className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Loader2 size={16} className="animate-spin text-sky-600" />
          Đang kiểm tra toàn bộ hạng mục vận hành…
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {results.map((item) => {
          const badge = STATUS_BADGE[item.status] || STATUS_BADGE.normal;
          return (
            <article
              key={item.id}
              className={`border rounded-2xl bg-white p-5 shadow-2xs ${
                item.status === 'error'
                  ? 'border-rose-200'
                  : item.status === 'warning'
                  ? 'border-amber-200'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{item.name}</h3>
                  {item.checkedAt && (
                    <span className="text-[10px] text-slate-400">Kiểm tra lúc: {item.checkedAt}</span>
                  )}
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.className}`}>
                  {badge.icon}
                  <span>{badge.label}</span>
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">{item.detail}</p>
              {item.href && item.status !== 'normal' && (
                <a
                  href={item.href}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#0B66C3] hover:underline"
                >
                  Mở khu vực xử lý <ExternalLink size={12} />
                </a>
              )}
            </article>
          );
        })}
      </div>

      <div className="border border-slate-200 bg-white rounded-2xl p-5">
        <h3 className="text-sm font-bold text-slate-900">Trạng thái đồng bộ dữ liệu CMS</h3>
        <p className={`text-xs mt-1.5 ${firebaseSyncStatus === 'error' ? 'text-rose-700' : 'text-slate-600'}`}>
          {firebaseSyncMessage}
        </p>
      </div>
    </section>
  );
};
