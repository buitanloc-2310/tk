import { ImageUrlInput } from '../../components/UIPrimitives';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Monitor,
  Smartphone,
  Tablet,
  Save,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Undo2,
  Redo2,
  History,
  Layout,
  Menu as MenuIcon,
  PanelBottom,
  FileText,
  Palette,
  Sparkles,
  CheckCircle2,
  Clock,
  GripVertical,
} from 'lucide-react';
import { HomePage } from '../../pages/HomePage';
import { useDataContext } from '../../context/DataContext';
import { CustomPage, PageBlock, PageBlockType, PageRoute, SiteConfig } from '../../types';
import { adminApi } from '../../lib/firebase';
import { fieldLabel, generateSlug } from '../../utils/contentUtils';

type SectionKey =
  | 'hero'
  | 'pillars'
  | 'programs'
  | 'units'
  | 'values'
  | 'news'
  | 'transparency'
  | 'cta';

type Device = 'desktop' | 'tablet' | 'mobile';
type BuilderTarget = 'home' | 'header' | 'footer' | 'design' | 'page';

const fields: Record<SectionKey, (keyof SiteConfig)[]> = {
  hero: [
    'heroBadge',
    'heroHeading',
    'heroSubtext',
    'heroImageUrl',
    'heroImageFit',
    'heroButton1Text',
    'heroButton1Url',
    'heroButton2Text',
    'heroButton2Url',
  ],
  pillars: ['pillarsHeading', 'pillarsSubtext'],
  programs: ['programsLabel', 'programsHeading'],
  units: ['unitsLabel', 'unitsHeading', 'unitsIntro'],
  values: ['valuesLabel', 'valuesHeading'],
  news: ['newsLabel', 'newsHeading'],
  transparency: ['transparencyHeading', 'transparencyText', 'transparencyButtonText', 'transparencyButtonUrl'],
  cta: ['ctaHeading', 'ctaSubtext', 'ctaButtonText', 'ctaButtonUrl', 'ctaSecondaryButtonText', 'ctaSecondaryButtonUrl'],
};

const labels: Record<SectionKey, string> = {
  hero: 'Đầu trang (Hero)',
  pillars: '05 Trụ cột hoạt động',
  programs: 'Chương trình & hoạt động',
  units: 'Đơn vị trực thuộc',
  values: '06 Giá trị cốt lõi',
  news: 'Tin tức & hoạt động',
  transparency: 'Thông tin minh bạch',
  cta: 'Kêu gọi tham gia (CTA)',
};

const DEFAULT_HOME_ORDER: SectionKey[] = ['hero', 'pillars', 'news', 'programs', 'values', 'transparency', 'units', 'cta'];

const widths: Record<Device, string> = {
  desktop: '100%',
  tablet: '820px',
  mobile: '390px',
};

const BLOCK_TEMPLATES: { label: string; desc: string; block: Omit<PageBlock, 'id'> }[] = [
  {
    label: 'Khối Giới thiệu & Thông điệp',
    desc: 'Tiêu đề lớn kèm đoạn văn trình bày editorial thanh lịch',
    block: {
      type: 'text',
      title: 'Tầm nhìn & Định hướng Hoạt động',
      body: 'Sky First Network kết nối tri thức, tạo không gian rèn luyện cho người trẻ và lan tỏa giá trị thiết thực đến cộng đồng.',
      background: 'white',
      align: 'left',
      width: 'normal',
      spacing: 'normal',
    },
  },
  {
    label: 'Khối Hình ảnh chuẩn tỷ lệ gốc',
    desc: 'Hiển thị toàn bộ ảnh poster/A4/ngang kèm chú thích và nguồn',
    block: {
      type: 'image',
      title: 'Hình ảnh hoạt động',
      imageUrl: '/brand/sky-first-network-web.png',
      imageFit: 'original',
      caption: 'Hình ảnh chính thức được bảo toàn 100% tỷ lệ gốc.',
      credit: 'Sky First Network',
      background: 'soft',
      align: 'center',
      width: 'wide',
    },
  },
  {
    label: 'Khối Số liệu Tác động (Stats 4 cột)',
    desc: 'Trình bày 4 chỉ số nổi bật của chương trình hoặc đơn vị',
    block: {
      type: 'stats',
      title: 'Dấu ấn hoạt động',
      stats: [
        { value: '05', label: 'Trụ cột trọng tâm', note: 'Giáo dục & Cộng đồng' },
        { value: '06', label: 'Giá trị cốt lõi', note: 'Định hướng xuyên suốt' },
        { value: '100%', label: 'Minh bạch thông tin', note: 'Cập nhật công khai' },
        { value: '2026', label: 'Giai đoạn chuẩn hóa', note: 'Vận hành hệ thống' },
      ],
      background: 'navy',
      align: 'left',
      width: 'wide',
    },
  },
  {
    label: 'Khối Kêu gọi Hành động (CTA)',
    desc: 'Khối kêu gọi đăng ký tham gia hoặc liên hệ hợp tác',
    block: {
      type: 'cta',
      title: 'Cùng Sky First Network tạo giá trị bền vững',
      body: 'Đăng ký tham gia các chương trình giáo dục, tình nguyện hoặc gửi đề xuất hợp tác ngay hôm nay.',
      buttonLabel: 'Tham gia ngay',
      buttonUrl: '/join',
      secondaryButtonLabel: 'Liên hệ hợp tác',
      secondaryButtonUrl: '/contact',
      background: 'sky',
      align: 'left',
      width: 'wide',
    },
  },
  {
    label: 'Khối Trích dẫn (Editorial Quote)',
    desc: 'Trích dẫn thông điệp cốt lõi hoặc chia sẻ từ Ban điều hành',
    block: {
      type: 'quote',
      title: 'Thông điệp Sky First Network',
      body: '“Sky is not the limit – it’s just the beginning. Mỗi điểm đạt được hôm nay là nền tảng cho bước trưởng thành tiếp theo.”',
      background: 'soft',
      align: 'left',
      width: 'normal',
    },
  },
];

export const AdminVisualWebsiteEditor: React.FC<{
  onShowToast: (m: string) => void;
  onNavigate: (p: PageRoute) => void;
}> = ({ onShowToast, onNavigate }) => {
  const { siteConfig, updateSiteConfig, customPages, updateCustomPage, addCustomPage } = useDataContext();
  const [device, setDevice] = useState<Device>('desktop');
  const [target, setTarget] = useState<BuilderTarget>('home');
  const [selectedPageId, setSelectedPageId] = useState<string>(() => customPages[0]?.id || '');

  // Undo / Redo stack for SiteConfig & Page editing
  const [configHistory, setConfigHistory] = useState<SiteConfig[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const [editing, setEditing] = useState<SectionKey | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Page Builder states when target === 'page'
  const activePage = useMemo(
    () => customPages.find((p) => p.id === selectedPageId || p.slug === selectedPageId) || customPages[0],
    [customPages, selectedPageId]
  );
  const [pageBlocks, setPageBlocks] = useState<PageBlock[]>(() => activePage?.pageBlocks || []);
  const [pageTitle, setPageTitle] = useState<string>(() => activePage?.title || '');
  const [pageSummary, setPageSummary] = useState<string>(() => activePage?.summary || '');
  const [pagePublished, setPagePublished] = useState<boolean>(() => activePage?.isPublished !== false);
  const [dragBlockIdx, setDragBlockIdx] = useState<number | null>(null);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [showRevisions, setShowRevisions] = useState(false);

  useEffect(() => {
    if (activePage) {
      setPageBlocks(Array.isArray(activePage.pageBlocks) ? activePage.pageBlocks : []);
      setPageTitle(activePage.title || '');
      setPageSummary(activePage.summary || '');
      setPagePublished(activePage.isPublished !== false);
    }
  }, [activePage?.id]);

  const recordConfigSnapshot = (cfg: SiteConfig) => {
    const next = configHistory.slice(0, historyIndex + 1);
    next.push(JSON.parse(JSON.stringify(cfg)));
    if (next.length > 25) next.shift();
    setConfigHistory(next);
    setHistoryIndex(next.length - 1);
  };

  useEffect(() => {
    if (configHistory.length === 0) {
      recordConfigSnapshot(siteConfig);
    }
  }, []);

  const handleUndo = async () => {
    if (historyIndex > 0) {
      const prev = configHistory[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      await updateSiteConfig(prev);
      onShowToast('Đã hoàn tác (Undo) thay đổi thiết kế.');
    }
  };

  const handleRedo = async () => {
    if (historyIndex < configHistory.length - 1) {
      const next = configHistory[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      await updateSiteConfig(next);
      onShowToast('Đã làm lại (Redo) thay đổi thiết kế.');
    }
  };

  const homeOrder = useMemo(() => {
    const saved = (siteConfig.homeSectionOrder || []).filter((x): x is SectionKey => DEFAULT_HOME_ORDER.includes(x as SectionKey));
    return [...new Set(saved), ...DEFAULT_HOME_ORDER.filter((x) => !saved.includes(x))];
  }, [siteConfig.homeSectionOrder]);

  const moveHomeSection = async (key: SectionKey, dir: -1 | 1) => {
    const i = homeOrder.indexOf(key);
    const j = i + dir;
    if (j < 0 || j >= homeOrder.length) return;
    const next = [...homeOrder];
    [next[i], next[j]] = [next[j], next[i]];
    recordConfigSnapshot({ ...siteConfig, homeSectionOrder: next });
    await updateSiteConfig({ homeSectionOrder: next });
    onShowToast('Đã cập nhật thứ tự khối trên Trang chủ.');
  };

  const toggleHomeSection = async (key: SectionKey) => {
    const sections = siteConfig.homeSections || {};
    const next = { ...sections, [key]: sections[key] === false };
    recordConfigSnapshot({ ...siteConfig, homeSections: next });
    await updateSiteConfig({ homeSections: next });
    onShowToast(`${next[key] ? 'Đã hiện' : 'Đã ẩn'} khối "${labels[key]}" trên Trang chủ.`);
  };

  const editSection = (key: SectionKey) => {
    const d: Record<string, string> = {};
    fields[key].forEach((k) => (d[String(k)] = String((siteConfig as any)[k] ?? '')));
    setDraft(d);
    setEditing(key);
  };

  const saveSection = async () => {
    if (!editing) return;
    setSaving(true);
    const merged = { ...siteConfig, ...(draft as Partial<SiteConfig>) };
    recordConfigSnapshot(merged);
    const ok = await updateSiteConfig(draft as Partial<SiteConfig>);
    setSaving(false);
    if (ok) {
      onShowToast('Đã lưu thay đổi khối Trang chủ.');
      setEditing(null);
    } else {
      onShowToast('Chưa thể lưu. Nội dung vẫn còn trong trình chỉnh sửa.');
    }
  };

  const handleCreatePageFromTemplate = async (withTemplate: boolean) => {
    const title = prompt('Nhập tiêu đề trang mới:', 'Trang nội dung mới');
    if (!title || !title.trim()) return;
    const newId = `page-${Date.now()}`;
    const slug = generateSlug(title);
    const initialBlocks: PageBlock[] = withTemplate
      ? BLOCK_TEMPLATES.slice(0, 3).map((tpl, i) => ({
          ...JSON.parse(JSON.stringify(tpl.block)),
          id: `blk-${Date.now()}-${i}`,
        }))
      : [];
    const newPage: CustomPage = {
      id: newId,
      slug,
      title: title.trim(),
      summary: 'Trang được tạo từ Trình thiết kế Website trực quan.',
      content: '',
      contentFormatted: '',
      pageBlocks: initialBlocks,
      isPublished: false,
      editorialStatus: 'draft',
      publishedAt: new Date().toLocaleDateString('vi-VN'),
      author: 'Ban Quản trị Sky First Network',
      type: 'custom',
      showInFooter: false,
    };
    await addCustomPage(newPage);
    setSelectedPageId(newId);
    setTarget('page');
    onShowToast(`Đã khởi tạo trang "${title}" (${withTemplate ? 'từ mẫu bố cục' : 'trang trống'}) ở chế độ Bản nháp.`);
  };

  const saveActivePageBlocks = async (publishOverride?: boolean) => {
    if (!activePage) return;
    setSaving(true);
    const pub = publishOverride !== undefined ? publishOverride : pagePublished;
    const ok = await updateCustomPage(activePage.id, {
      title: pageTitle,
      summary: pageSummary,
      pageBlocks,
      isPublished: pub,
      editorialStatus: pub ? 'published' : 'draft',
    });
    setSaving(false);
    setPagePublished(pub);
    onShowToast(
      ok
        ? pub
          ? `Đã xuất bản trang "${pageTitle}" công khai!`
          : `Đã lưu bản nháp trang "${pageTitle}".`
        : 'Không thể lưu trang.'
    );
  };

  const saveBlockAsReusableTemplate = async (blk: PageBlock) => {
    const name = prompt('Đặt tên cho mẫu khối dùng lại:', blk.title || `Mẫu khối ${blk.type}`);
    if (!name) return;
    const currentTemplates = siteConfig.reusableBlockTemplates || [];
    const savedBlock: PageBlock = {
      ...JSON.parse(JSON.stringify(blk)),
      id: `tpl-${Date.now()}`,
      title: name,
    };
    await updateSiteConfig({ reusableBlockTemplates: [...currentTemplates, savedBlock] });
    onShowToast(`Đã lưu "${name}" vào thư viện mẫu khối dùng lại.`);
  };

  const loadRevisions = async () => {
    const entityType = target === 'page' && activePage ? 'cms:custom_pages' : 'cms:site_config';
    const entityId = target === 'page' && activePage ? activePage.id : 'current';
    try {
      const d = await adminApi(
        `/api/system?action=revisions&entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`
      );
      setRevisions(d.items || []);
      setShowRevisions(true);
    } catch (e: any) {
      onShowToast(e.message || 'Không tải được lịch sử phiên bản.');
    }
  };

  const restoreRevision = async (revId: string) => {
    try {
      const d = await adminApi('/api/system?action=restore-revision', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ revisionId: revId }),
      });
      if (d?.ok) {
        onShowToast('Đã khôi phục phiên bản trước thành công! Tải lại dữ liệu...');
        setShowRevisions(false);
        window.location.reload();
      }
    } catch (e: any) {
      onShowToast(e.message);
    }
  };

  const deviceButtons = useMemo(
    () => [
      { id: 'desktop' as Device, label: 'Desktop', icon: <Monitor size={15} /> },
      { id: 'tablet' as Device, label: 'Tablet', icon: <Tablet size={15} /> },
      { id: 'mobile' as Device, label: 'Mobile', icon: <Smartphone size={15} /> },
    ],
    []
  );

  return (
    <div className="min-h-full bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
      {/* Top Visual Builder Bar */}
      <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-sky-50 text-[#0B66C3]">
            <Pencil size={17} />
          </div>
          <div>
            <div className="font-extrabold text-sm text-slate-900">Trình Thiết Kế Website Trực Quan (Visual Website Builder)</div>
            <p className="text-[11px] text-slate-500">
              Chỉnh sửa Trang chủ, Header/Menu, Footer, Hệ màu/Typography và các Trang nội dung theo khối.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 disabled:opacity-35 hover:bg-slate-50"
            title="Hoàn tác (Undo)"
          >
            <Undo2 size={15} />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={historyIndex >= configHistory.length - 1}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 disabled:opacity-35 hover:bg-slate-50"
            title="Làm lại (Redo)"
          >
            <Redo2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => void loadRevisions()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <History size={14} /> Lịch sử phiên bản
          </button>

          <div className="flex rounded-xl border border-slate-200 p-1 bg-slate-50">
            {deviceButtons.map((x) => (
              <button
                key={x.id}
                aria-label={x.label}
                aria-pressed={device === x.id}
                onClick={() => setDevice(x.id)}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                  device === x.id ? 'bg-white text-sky-700 shadow-2xs' : 'text-slate-500'
                }`}
              >
                {x.icon}
                <span className="hidden sm:inline">{x.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B66C3] text-white px-3.5 py-2 text-xs font-bold"
          >
            <ExternalLink size={14} /> Mở Website
          </button>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'home' as BuilderTarget, label: 'Bố cục Trang chủ', icon: <Layout size={14} /> },
            { id: 'page' as BuilderTarget, label: 'Thiết kế Trang nội dung & Khối', icon: <FileText size={14} /> },
            { id: 'header' as BuilderTarget, label: 'Header & Menu điều hướng', icon: <MenuIcon size={14} /> },
            { id: 'footer' as BuilderTarget, label: 'Footer & Chân trang', icon: <PanelBottom size={14} /> },
            { id: 'design' as BuilderTarget, label: 'Màu sắc, Font, Khoảng cách & Intro', icon: <Palette size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTarget(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                target === tab.id
                  ? 'bg-[#071B3A] text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleCreatePageFromTemplate(true)}
            className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700"
          >
            <Plus size={13} /> Tạo trang từ mẫu
          </button>
          <button
            type="button"
            onClick={() => void handleCreatePageFromTemplate(false)}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700"
          >
            <Plus size={13} /> Trang trống
          </button>
        </div>
      </div>

      {/* Mode 1: Trang chủ */}
      {target === 'home' && (
        <div>
          <div className="bg-white border-b border-slate-200 p-4 space-y-3">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Sắp xếp, Ẩn/Hiện và Chỉnh sửa trực tiếp các khối trên Trang chủ
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {homeOrder.map((k, idx) => {
                const isHidden = siteConfig.homeSections?.[k] === false;
                return (
                  <div
                    key={k}
                    className={`rounded-xl border p-3 flex items-center justify-between gap-2 ${
                      isHidden ? 'border-slate-200 bg-slate-50 opacity-60' : 'border-sky-200 bg-sky-50/40'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="text-[10px] font-black text-sky-700">#{idx + 1}</span>
                      <div className="text-xs font-bold text-slate-900 truncate">{labels[k]}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => void moveHomeSection(k, -1)}
                        disabled={idx === 0}
                        className="p-1 rounded border bg-white disabled:opacity-30"
                        title="Lên"
                      >
                        <ChevronUp size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void moveHomeSection(k, 1)}
                        disabled={idx === homeOrder.length - 1}
                        className="p-1 rounded border bg-white disabled:opacity-30"
                        title="Xuống"
                      >
                        <ChevronDown size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleHomeSection(k)}
                        className="px-2 py-1 rounded border bg-white text-[10px] font-bold"
                      >
                        {isHidden ? 'Hiện' : 'Ẩn'}
                      </button>
                      <button
                        type="button"
                        onClick={() => editSection(k)}
                        className="px-2 py-1 rounded bg-[#0B66C3] text-white text-[10px] font-bold"
                      >
                        Sửa
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="overflow-auto p-4">
            <div
              className="mx-auto overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-xl transition-all"
              style={{ width: widths[device], maxWidth: '100%' }}
            >
              {device === 'desktop' ? (
                <HomePage onNavigate={() => {}} visualEditMode onEditSection={editSection} />
              ) : (
                <iframe
                  key={JSON.stringify(siteConfig)}
                  src="/"
                  title="Xem trước website theo kích thước thiết bị"
                  style={{ width: '100%', height: '820px', border: 0 }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Thiết kế Trang nội dung & Khối (Visual Page & Block Builder) */}
      {target === 'page' && (
        <div className="grid lg:grid-cols-12 min-h-[760px]">
          {/* Left Panel: Page & Block Controls */}
          <div className="lg:col-span-5 border-r border-slate-200 bg-white p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[840px]">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 block">
                Chọn trang đang chỉnh sửa
              </label>
              <select
                value={activePage?.id || ''}
                onChange={(e) => setSelectedPageId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold"
              >
                {customPages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} (/{p.slug}) · {p.isPublished === false ? 'Bản nháp' : 'Đã xuất bản'}
                  </option>
                ))}
              </select>
            </div>

            {activePage && (
              <>
                <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Tiêu đề trang
                    <input
                      value={pageTitle}
                      onChange={(e) => setPageTitle(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
                    />
                  </label>
                  <label className="block text-xs font-bold text-slate-700">
                    Tóm tắt mở đầu
                    <textarea
                      rows={2}
                      value={pageSummary}
                      onChange={(e) => setPageSummary(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void saveActivePageBlocks(false)}
                      className="flex-1 rounded-xl border border-slate-300 bg-white py-2 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5"
                    >
                      <Clock size={14} className="text-amber-600" /> Lưu nháp
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void saveActivePageBlocks(true)}
                      className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2 text-xs font-extrabold text-white flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 size={14} /> Xuất bản
                    </button>
                  </div>
                </div>

                {/* Thư viện Mẫu khối dựng sẵn & Mẫu khối dùng lại */}
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Chèn nhanh từ Thư viện Mẫu Khối
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {BLOCK_TEMPLATES.map((tpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          setPageBlocks((prev) => [
                            ...prev,
                            {
                              ...JSON.parse(JSON.stringify(tpl.block)),
                              id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                            },
                          ])
                        }
                        className="text-left rounded-xl border border-slate-200 hover:border-sky-300 bg-slate-50/70 hover:bg-sky-50/50 p-2.5 transition"
                      >
                        <div className="text-xs font-bold text-slate-900">+ {tpl.label}</div>
                        <div className="text-[11px] text-slate-500">{tpl.desc}</div>
                      </button>
                    ))}
                    {(siteConfig.reusableBlockTemplates || []).map((savedTpl) => (
                      <button
                        key={savedTpl.id}
                        type="button"
                        onClick={() =>
                          setPageBlocks((prev) => [
                            ...prev,
                            {
                              ...JSON.parse(JSON.stringify(savedTpl)),
                              id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                            },
                          ])
                        }
                        className="text-left rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5"
                      >
                        <div className="text-xs font-bold text-emerald-900">+ [Mẫu đã lưu] {savedTpl.title}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Danh sách khối của trang */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Các khối trên trang ({pageBlocks.length} khối · Kéo thả để sắp xếp)
                  </div>
                  {pageBlocks.map((blk, idx) => (
                    <div
                      key={blk.id}
                      draggable
                      onDragStart={() => setDragBlockIdx(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragBlockIdx !== null && dragBlockIdx !== idx) {
                          const next = [...pageBlocks];
                          const [picked] = next.splice(dragBlockIdx, 1);
                          next.splice(idx, 0, picked);
                          setPageBlocks(next);
                        }
                        setDragBlockIdx(null);
                      }}
                      className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="cursor-grab inline-flex items-center gap-1 text-xs font-black text-slate-700">
                          <GripVertical size={13} /> #{idx + 1} · {blk.type.toUpperCase()}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void saveBlockAsReusableTemplate(blk)}
                            className="px-2 py-1 rounded border text-[10px] font-bold text-emerald-700"
                            title="Lưu khối này thành mẫu dùng lại"
                          >
                            Lưu mẫu
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const copy = {
                                ...JSON.parse(JSON.stringify(blk)),
                                id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                              };
                              const next = [...pageBlocks];
                              next.splice(idx + 1, 0, copy);
                              setPageBlocks(next);
                            }}
                            className="p-1 rounded border text-slate-600"
                            title="Nhân bản khối"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPageBlocks((prev) => prev.filter((x) => x.id !== blk.id))}
                            className="p-1 rounded border border-rose-200 text-rose-600"
                            title="Xóa khối"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <input
                        value={blk.title || ''}
                        onChange={(e) =>
                          setPageBlocks((prev) => prev.map((x) => (x.id === blk.id ? { ...x, title: e.target.value } : x)))
                        }
                        placeholder="Tiêu đề khối..."
                        className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold"
                      />

                      {blk.type !== 'divider' && blk.type !== 'stats' && (
                        <textarea
                          rows={2}
                          value={blk.body || ''}
                          onChange={(e) =>
                            setPageBlocks((prev) => prev.map((x) => (x.id === blk.id ? { ...x, body: e.target.value } : x)))
                          }
                          placeholder="Nội dung văn bản của khối..."
                          className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                        />
                      )}

                      {blk.type === 'image' && (
                        <ImageUrlInput
                          label="Hình ảnh khối (Giữ nguyên tỷ lệ gốc)"
                          value={blk.imageUrl || ''}
                          onChange={(url) =>
                            setPageBlocks((prev) => prev.map((x) => (x.id === blk.id ? { ...x, imageUrl: url } : x)))
                          }
                        />
                      )}

                      {/* Tuỳ chỉnh Màu nền, Căn lề, Độ rộng & Hiệu ứng của khối */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <select
                          value={blk.background || 'white'}
                          onChange={(e) =>
                            setPageBlocks((prev) =>
                              prev.map((x) => (x.id === blk.id ? { ...x, background: e.target.value as any } : x))
                            )
                          }
                          className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold"
                        >
                          <option value="white">Nền Trắng</option>
                          <option value="soft">Nền Xám nhẹ</option>
                          <option value="sky">Nền Xanh nhạt</option>
                          <option value="navy">Nền Navy đậm</option>
                        </select>
                        <select
                          value={blk.align || 'left'}
                          onChange={(e) =>
                            setPageBlocks((prev) =>
                              prev.map((x) => (x.id === blk.id ? { ...x, align: e.target.value as any } : x))
                            )
                          }
                          className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold"
                        >
                          <option value="left">Căn trái</option>
                          <option value="center">Căn giữa</option>
                          <option value="right">Căn phải</option>
                        </select>
                        <select
                          value={blk.width || 'normal'}
                          onChange={(e) =>
                            setPageBlocks((prev) =>
                              prev.map((x) => (x.id === blk.id ? { ...x, width: e.target.value as any } : x))
                            )
                          }
                          className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold"
                        >
                          <option value="normal">Khung chuẩn</option>
                          <option value="wide">Khung rộng</option>
                          <option value="full">Toàn chiều ngang</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right Panel: Live Responsive Preview */}
          <div className="lg:col-span-7 bg-slate-100 p-4 overflow-auto">
            <div
              className="mx-auto rounded-2xl border border-slate-300 bg-white shadow-xl p-6 space-y-5 transition-all"
              style={{ width: widths[device], maxWidth: '100%' }}
            >
              <div className="border-b border-slate-100 pb-4">
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-black text-[#0284C7]">
                  <Sparkles size={12} /> Xem trước trực tiếp ({device})
                </span>
                <h1 className="mt-3 text-2xl sm:text-3xl font-black text-slate-900">{pageTitle || 'Tiêu đề trang'}</h1>
                {pageSummary && <p className="mt-2 text-sm text-slate-600 leading-relaxed">{pageSummary}</p>}
              </div>

              {pageBlocks.map((b) => (
                <section
                  key={b.id}
                  className={`rounded-2xl p-5 border border-slate-100 ${
                    b.background === 'navy'
                      ? 'bg-[#071B3A] text-white'
                      : b.background === 'sky'
                      ? 'bg-sky-50 text-slate-900'
                      : b.background === 'soft'
                      ? 'bg-slate-50 text-slate-900'
                      : 'bg-white text-slate-900'
                  } ${b.align === 'center' ? 'text-center' : b.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {b.title && <h3 className="text-lg font-black">{b.title}</h3>}
                  {b.body && <p className="mt-2 text-sm opacity-85 whitespace-pre-line">{b.body}</p>}
                  {b.imageUrl && (
                    <img
                      src={b.imageUrl}
                      alt={b.alt || b.title || ''}
                      className="mt-3 max-h-72 w-auto max-w-full mx-auto object-contain rounded-xl"
                    />
                  )}
                </section>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mode 3: Header & Menu */}
      {target === 'header' && (
        <div className="p-5 bg-white space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-black text-base text-slate-900">Thiết kế Header, Logo & Thanh điều hướng</h3>
              <p className="text-xs text-slate-500">Chỉnh sửa logo, tên thương hiệu, thanh thông báo đầu trang và cấu trúc nhóm menu.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <ImageUrlInput
              label="Logo Header chính thức"
              value={siteConfig.logoUrl || '/brand/sky-first-network-web.png'}
              onChange={(logoUrl) => void updateSiteConfig({ logoUrl })}
            />
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Tên hiển thị Website
                <input
                  value={siteConfig.siteName || ''}
                  onChange={(e) => void updateSiteConfig({ siteName: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"
                />
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 pt-2">
                <input
                  type="checkbox"
                  checked={Boolean(siteConfig.announcement?.enabled)}
                  onChange={(e) =>
                    void updateSiteConfig({
                      announcement: { ...(siteConfig.announcement || {}), enabled: e.target.checked },
                    })
                  }
                />
                Bật thanh Thông báo nhanh (Announcement Bar) trên đỉnh Header
              </label>
              <input
                value={siteConfig.announcement?.text || ''}
                onChange={(e) =>
                  void updateSiteConfig({
                    announcement: { ...(siteConfig.announcement || {}), text: e.target.value },
                  })
                }
                placeholder="Nội dung thanh thông báo..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* Mode 4: Footer */}
      {target === 'footer' && (
        <div className="p-5 bg-white space-y-4">
          <h3 className="font-black text-base text-slate-900">Thiết kế Chân trang (Footer) & Thông tin tổ chức</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block text-xs font-bold text-slate-700">
              Mô tả giới thiệu ở Chân trang
              <textarea
                rows={3}
                value={siteConfig.footerAboutText || siteConfig.siteDescription || ''}
                onChange={(e) => void updateSiteConfig({ footerAboutText: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </label>
            <label className="block text-xs font-bold text-slate-700">
              Dòng bản quyền (Copyright)
              <input
                value={siteConfig.footerCopyright || ''}
                onChange={(e) => void updateSiteConfig({ footerCopyright: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </label>
          </div>
        </div>
      )}

      {/* Mode 5: Design System & Video Intro */}
      {target === 'design' && (
        <div className="p-5 bg-white space-y-6">
          <div>
            <h3 className="font-black text-base text-slate-900">Hệ màu nhận diện, Typography, Chuyển động & Video Intro</h3>
            <p className="text-xs text-slate-500">
              Giữ nền tảng xanh dương / xanh lá đặc trưng của Sky First Network; tùy chỉnh độ bo góc, mật độ hiển thị và luồng Video Intro trang chủ.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="block text-xs font-bold text-slate-700">
              Màu chủ đạo (Primary Sky Blue)
              <input
                value={siteConfig.designSystem?.primary || '#0B66C3'}
                onChange={(e) =>
                  void updateSiteConfig({
                    designSystem: { ...(siteConfig.designSystem || {}), primary: e.target.value },
                  })
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono"
              />
            </label>
            <label className="block text-xs font-bold text-slate-700">
              Màu nền thương hiệu (Deep Navy)
              <input
                value={siteConfig.designSystem?.navy || '#071B3A'}
                onChange={(e) =>
                  void updateSiteConfig({
                    designSystem: { ...(siteConfig.designSystem || {}), navy: e.target.value },
                  })
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono"
              />
            </label>
            <label className="block text-xs font-bold text-slate-700">
              Mức hiệu ứng chuyển động (Motion)
              <select
                value={siteConfig.designSystem?.motion || 'balanced'}
                onChange={(e) =>
                  void updateSiteConfig({
                    designSystem: { ...(siteConfig.designSystem || {}), motion: e.target.value as any },
                  })
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
              >
                <option value="balanced">Cân bằng, mượt & tinh tế (Khuyên dùng)</option>
                <option value="reduced">Tối giản hiệu ứng</option>
                <option value="rich">Chuyển động nổi bật</option>
              </select>
            </label>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-900">Cấu hình Video Intro khi Mở / Tải lại Trang chủ</h4>
                <p className="text-xs text-slate-600">
                  Mở/tải lại trang chủ sẽ phát video từ đầu → hiện logo Sky First Network → vào trang chủ. Có nút Bỏ qua Intro và không chặn link bài viết/trang con.
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold">
                <input
                  type="checkbox"
                  checked={siteConfig.intro?.enabled !== false}
                  onChange={(e) =>
                    void updateSiteConfig({
                      intro: { ...(siteConfig.intro || {}), enabled: e.target.checked },
                    })
                  }
                />
                Bật Intro Trang chủ
              </label>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <label className="text-xs font-bold text-slate-700 sm:col-span-2">
                URL Video Intro (MP4/WebM từ kho R2 Media — để trống sẽ dùng hiệu ứng xuất hiện Logo tinh tế)
                <input
                  value={siteConfig.intro?.videoUrl || ''}
                  onChange={(e) =>
                    void updateSiteConfig({
                      intro: { ...(siteConfig.intro || {}), videoUrl: e.target.value },
                    })
                  }
                  placeholder="/media/website/... hoặc để trống dùng Logo Intro"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                />
              </label>
              <label className="text-xs font-bold text-slate-700">
                Thời lượng hiện Logo (giây)
                <input
                  type="number"
                  step="0.2"
                  min="0.6"
                  max="5"
                  value={siteConfig.intro?.logoRevealSeconds ?? 1.4}
                  onChange={(e) =>
                    void updateSiteConfig({
                      intro: { ...(siteConfig.intro || {}), logoRevealSeconds: Number(e.target.value) },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Drawer chỉnh sửa trực tiếp khối Trang chủ */}
      {editing && (
        <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/30">
          <div className="h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-white p-5">
              <div>
                <p className="text-[11px] font-bold uppercase text-sky-600">Đang chỉnh trực tiếp</p>
                <h3 className="font-extrabold">{labels[editing]}</h3>
              </div>
              <button onClick={() => setEditing(null)} className="rounded-lg p-2 hover:bg-slate-100">
                ×
              </button>
            </div>
            <div className="space-y-4 p-5">
              {Object.entries(draft).map(([k, v]) =>
                k === 'heroImageFit' ? (
                  <label key={k} className="block text-sm font-semibold">
                    Cách hiển thị ảnh
                    <select
                      value={v || 'original'}
                      onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                      className="block w-full border rounded-xl p-3 mt-2"
                    >
                      <option value="original">Original — Giữ nguyên tỷ lệ gốc 100%</option>
                      <option value="contain">Contain — Vừa khung, không cắt</option>
                      <option value="cover">Cover — Phủ khung</option>
                    </select>
                  </label>
                ) : k === 'heroImageUrl' ? (
                  <ImageUrlInput
                    key={k}
                    label="Ảnh banner trang chủ"
                    value={v}
                    onChange={(url) => setDraft({ ...draft, [k]: url })}
                  />
                ) : (
                  <label key={k} className="block">
                    <span className="mb-1 block text-xs font-bold text-slate-600">{fieldLabel(k)}</span>
                    {/Text|Subtext|Intro|Heading/.test(k) ? (
                      <textarea
                        aria-label={fieldLabel(k)}
                        rows={3}
                        value={v}
                        onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                      />
                    ) : (
                      <input
                        aria-label={fieldLabel(k)}
                        value={v}
                        onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                      />
                    )}
                  </label>
                )
              )}
            </div>
            <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-white p-4">
              <button onClick={() => setEditing(null)} className="rounded-xl border px-4 py-2 text-xs font-bold">
                Hủy
              </button>
              <button
                disabled={saving}
                onClick={() => void saveSection()}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                <Save size={15} />
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Khôi phục phiên bản */}
      {showRevisions && (
        <div className="fixed inset-0 z-[120] bg-slate-950/55 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <header className="p-4 border-b flex items-center justify-between">
              <h3 className="font-black text-sm">Lịch sử phiên bản & Khôi phục</h3>
              <button onClick={() => setShowRevisions(false)} className="text-xs font-bold text-slate-500">
                Đóng
              </button>
            </header>
            <div className="max-h-80 overflow-y-auto divide-y p-3">
              {revisions.length === 0 ? (
                <p className="p-6 text-center text-xs text-slate-500">Chưa có bản lưu phiên bản nào.</p>
              ) : (
                revisions.map((r) => (
                  <div key={r.id} className="py-2.5 px-2 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{r.version_label || r.id}</div>
                      <div className="text-[11px] text-slate-500">{r.created_at} · bởi {r.created_by}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void restoreRevision(r.id)}
                      className="rounded-lg bg-sky-50 border border-sky-200 px-3 py-1.5 text-xs font-bold text-sky-700"
                    >
                      Khôi phục
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
