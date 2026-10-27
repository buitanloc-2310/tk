import React, { useState, useEffect } from 'react';
import { useDataContext } from '../../context/DataContext';
import {
  FileText,
  Plus,
  Trash2,
  Edit2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  Calendar,
  User,
  Clock,
  Tag,
  Save,
  Link as LinkIcon,
  Sparkles,
  Image as ImageIcon,
  MessageSquare,
  Search,
  History,
  Globe,
} from 'lucide-react';
import { NewsArticle, PageRoute, AdminManagerActionRef } from '../../types';
import { ImageUrlInput } from '../../components/UIPrimitives';
import { EntityBadge, EntityColorPicker } from '../../components/UIPrimitives';
import { createUniqueSlug, generateSlug, getArticleSlug } from '../../utils/contentUtils';
import { RichTextEditor } from './RichTextEditor';
import { adminApi } from '../../lib/firebase';

interface AdminNewsManagerProps {
  articles: NewsArticle[];
  onUpdateArticle: (id: string, updates: Partial<NewsArticle>) => Promise<boolean> | boolean | void;
  onAddArticle: (article: NewsArticle) => Promise<boolean>;
  onDeleteArticle: (id: string) => Promise<boolean>;
  onNavigate: (route: PageRoute) => void;
  onShowToast: (msg: string) => void;
  initialSlug?: string;
  actionRef?: React.MutableRefObject<AdminManagerActionRef | null>;
  onViewModeChange?: (mode: 'list' | 'edit') => void;
}

export const AdminNewsManager: React.FC<AdminNewsManagerProps> = ({
  articles,
  onUpdateArticle,
  onAddArticle,
  onDeleteArticle,
  onNavigate,
  onShowToast,
  initialSlug,
  actionRef,
  onViewModeChange,
}) => {
  const { siteConfig } = useDataContext();
  const taxonomyOptions = (siteConfig.taxonomyCategories || []).filter((x: any) => x.visible !== false);
  const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [articleToDelete, setArticleToDelete] = useState<NewsArticle | null>(null);
  const [dirty, setDirty] = useState(false);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [showRevisions, setShowRevisions] = useState(false);

  useEffect(() => {
    if (initialSlug) {
      const target = articles.find((a) => a.slug === initialSlug || a.id === initialSlug);
      if (target) {
        setSelectedArticleId(target.id);
        setViewMode('edit');
      }
    }
  }, [initialSlug, articles]);

  const activeArticle = articles.find((a) => a.id === selectedArticleId) || articles[0];

  // Cảnh báo khi rời trang có thay đổi chưa lưu
  useEffect(() => {
    if (viewMode !== 'edit' || !dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [viewMode, dirty]);

  const loadRevisions = async (articleId: string) => {
    try {
      const d = await adminApi(`/api/system?action=revisions&entityType=cms:news_articles&entityId=${encodeURIComponent(articleId)}`);
      setRevisions(d.items || []);
    } catch {
      setRevisions([]);
    }
  };

  const restoreRevision = async (revId: string) => {
    try {
      const d = await adminApi('/api/system?action=restore-revision', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ revisionId: revId }),
      });
      if (d?.item && activeArticle) {
        await onUpdateArticle(activeArticle.id, d.item);
        onShowToast('Đã khôi phục phiên bản bài viết thành công.');
        setShowRevisions(false);
      }
    } catch (e: any) {
      onShowToast(e.message || 'Không thể khôi phục phiên bản.');
    }
  };

  const handleCreateNew = async () => {
    const newId = `news-${Date.now()}`;
    const initialTitle = 'Tiêu Đề Bài Viết Tin Tức Mới';
    const initialSlug = createUniqueSlug(initialTitle, articles.map((x) => x.slug || ''));

    const newArticle: NewsArticle = {
      id: newId,
      slug: initialSlug,
      title: initialTitle,
      category: 'announcement',
      categoryLabel: 'Thông báo',
      date: new Date().toLocaleDateString('vi-VN'),
      summary: 'Đoạn tóm tắt mở đầu (Sapo) giới thiệu ngắn gọn các điểm cốt lõi của bài viết.',
      content: 'Nội dung chi tiết của bài viết được trình bày ở đây với đầy đủ thông tin, luận điểm và hình ảnh minh họa.',
      contentFormatted:
        '<h2>Tiêu đề phần 1</h2><p>Nội dung chi tiết của bài viết được trình bày ở đây với đầy đủ thông tin, luận điểm và hình ảnh minh họa.</p><h2>Tiêu đề phần 2</h2><p>Tiếp tục triển khai các nội dung quan trọng tiếp theo.</p>',
      pageBlocks: [],
      author: 'Sky First Network',
      publishedAt: new Date().toISOString().split('T')[0],
      readTime: '3 phút đọc',
      imageUrl: '',
      imageFit: 'original',
      imageDescription: 'Ảnh minh họa bài viết tin tức',
      tags: [],
      isPublished: false,
      editorialStatus: 'draft',
      allowComments: true,
      source: '',
    };

    const created = await onAddArticle(newArticle);
    if (!created) {
      onShowToast('Chưa thể tạo bài viết trên máy chủ.');
      return;
    }
    setSelectedArticleId(newId);
    setViewMode('edit');
    setDirty(false);
    onShowToast('Đã tạo bài viết mới ở chế độ Bản nháp! Đang mở trình biên tập.');
  };

  useEffect(() => {
    if (actionRef) {
      actionRef.current = { handleCreateNew };
    }
    return () => {
      if (actionRef) actionRef.current = null;
    };
  }, [actionRef, articles]);

  useEffect(() => {
    onViewModeChange?.(viewMode);
  }, [viewMode, onViewModeChange]);

  const handleEditClick = (article: NewsArticle) => {
    setSelectedArticleId(article.id);
    setDirty(false);
    setViewMode('edit');
  };

  const handleTogglePublish = async (article: NewsArticle, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = article.isPublished === false;
    const saved = await onUpdateArticle(article.id, {
      isPublished: nextState,
      editorialStatus: nextState ? 'published' : 'draft',
    });
    if (saved === false) {
      onShowToast('Chưa thể cập nhật trạng thái trên máy chủ.');
      return;
    }
    onShowToast(
      nextState
        ? `Đã xuất bản bài viết "${article.title}" lên website chính!`
        : `Đã chuyển bài viết "${article.title}" về Bản nháp!`
    );
  };

  const handleConfirmDelete = async () => {
    if (!articleToDelete) return;
    const deleted = await onDeleteArticle(articleToDelete.id);
    if (!deleted) {
      onShowToast('Chưa thể xóa bài viết trên máy chủ.');
      return;
    }
    onShowToast(`Đã xóa bài viết: ${articleToDelete.title}`);
    setArticleToDelete(null);
    if (selectedArticleId === articleToDelete.id) {
      setSelectedArticleId(null);
      setViewMode('list');
    }
  };

  const filteredArticles = articles.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.slug && a.slug.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter === 'published') return a.isPublished !== false;
    if (statusFilter === 'draft') return a.isPublished === false;
    return true;
  });

  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200 p-4">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm bài viết theo tiêu đề, chuyên mục, slug..."
              className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2 text-xs sm:text-sm outline-none focus:border-sky-500"
            />
          </div>
          <div className="flex items-center gap-2">
            {(['all', 'published', 'draft'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
                  statusFilter === st ? 'bg-[#0284C7] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {st === 'all' ? 'Tất cả' : st === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
              </button>
            ))}
          </div>
        </div>

        {filteredArticles.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <FileText size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800 mb-1">Chưa có bài đăng nào</h3>
            <p className="text-xs text-slate-500 mb-5">
              Bắt đầu tạo bài viết tin tức hoặc thông báo đầu tiên cho website Sky First Network.
            </p>
            <button
              type="button"
              id="news-btn-create-first"
              onClick={handleCreateNew}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition shadow-xs inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus size={15} />
              <span>Thêm mới</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
              <div className="col-span-12 sm:col-span-5">Tiêu đề bài đăng</div>
              <div className="hidden sm:block sm:col-span-2">Nhãn</div>
              <div className="hidden sm:block sm:col-span-2">Tác giả & Thời gian đọc</div>
              <div className="hidden sm:block sm:col-span-3 text-right">Trạng thái & Hành động</div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredArticles.map((article) => {
                const isDraft = article.isPublished === false;
                const slug = getArticleSlug(article);
                const displayUrl = `/tin-tuc/${slug}`;

                return (
                  <div
                    key={article.id}
                    id={`news-row-${article.id}`}
                    onClick={() => handleEditClick(article)}
                    className="group grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-sky-50/40 cursor-pointer transition relative"
                  >
                    <div className="col-span-12 sm:col-span-5 pr-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            !isDraft ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          title={!isDraft ? 'Đã xuất bản' : 'Bản nháp'}
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition truncate">
                            {article.title || 'Bài viết chưa đặt tên'}
                          </h3>
                          <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">{displayUrl}</p>
                        </div>
                      </div>
                    </div>

                    <div className="hidden sm:flex sm:col-span-2 items-center flex-wrap gap-1">
                      <EntityBadge
                        label={article.categoryLabel || article.category || 'Tin tức'}
                        color={article.categoryColor}
                        className="rounded-md px-2 py-0.5 text-[10px]"
                      />
                    </div>

                    <div className="hidden sm:block sm:col-span-2 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium truncate">
                        <User size={12} className="text-[#0284C7] shrink-0" />
                        <span className="truncate">{article.author || 'Ban Truyền thông Sky First Network'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mt-0.5 truncate">
                        <Clock size={12} className="shrink-0" />
                        <span className="truncate">{article.readTime || '3 phút đọc'}</span>
                      </div>
                    </div>

                    <div className="hidden sm:flex sm:col-span-3 items-center justify-end">
                      <div className="group-hover:hidden text-right">
                        <span
                          className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            !isDraft ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {!isDraft ? 'Đã xuất bản' : article.scheduledPublishAt ? 'Hẹn giờ xuất bản' : 'Bản nháp'}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">{article.publishedAt || 'Hôm nay'}</span>
                      </div>

                      <div className="hidden group-hover:flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(article);
                          }}
                          className="p-1.5 text-slate-600 hover:text-sky-600 hover:bg-white rounded-lg transition shadow-2xs border border-slate-200 cursor-pointer"
                          title="Chỉnh sửa chi tiết bài viết"
                        >
                          <Edit2 size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleTogglePublish(article, e)}
                          className={`p-1.5 rounded-lg transition shadow-2xs border cursor-pointer ${
                            !isDraft
                              ? 'text-amber-600 hover:bg-amber-50 border-amber-200 bg-white'
                              : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200 bg-white'
                          }`}
                          title={!isDraft ? 'Chuyển về Bản nháp' : 'Xuất bản bài viết công khai'}
                        >
                          {!isDraft ? <Clock size={15} /> : <CheckCircle2 size={15} />}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.history.pushState({}, '', displayUrl);
                            onNavigate('news-detail');
                          }}
                          className="p-1.5 text-slate-600 hover:text-[#0284C7] hover:bg-white rounded-lg transition shadow-2xs border border-slate-200 cursor-pointer"
                          title="Xem bài viết trên website"
                        >
                          <Eye size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setArticleToDelete(article);
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition shadow-2xs border border-slate-200 bg-white cursor-pointer"
                          title="Xóa bài viết"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {articleToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle size={26} />
              </div>
              <h3 className="text-lg font-black text-slate-900">Xác Nhận Xóa Bài Đăng?</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Bạn có chắc chắn muốn xóa bài viết <strong>{articleToDelete.title}</strong>?
              </p>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setArticleToDelete(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Xóa vĩnh viễn
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!activeArticle) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-sm text-slate-500">Không tìm thấy dữ liệu bài đăng.</p>
        <button
          type="button"
          onClick={() => setViewMode('list')}
          className="mt-4 px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-xl"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const isDraft = activeArticle.isPublished === false;
  const currentSlug = getArticleSlug(activeArticle);
  const displayUrl = `/tin-tuc/${currentSlug}`;

  const patchArticle = (updates: Partial<NewsArticle>) => {
    setDirty(true);
    void onUpdateArticle(activeArticle.id, updates);
  };

  const handleSave = async (publishState?: boolean) => {
    const finalPublishState = publishState !== undefined ? publishState : !isDraft;
    // Cảnh báo trước khi xuất bản nếu thiếu tiêu đề, ảnh hoặc SEO
    if (finalPublishState && !activeArticle.title?.trim()) {
      onShowToast('Cảnh báo: Vui lòng nhập tiêu đề bài viết trước khi xuất bản.');
      return;
    }
    const saved = await onUpdateArticle(activeArticle.id, {
      isPublished: finalPublishState,
      editorialStatus: finalPublishState ? 'published' : activeArticle.editorialStatus || 'draft',
    });
    if (saved === false) {
      onShowToast('Chưa thể lưu lên máy chủ. Nội dung vẫn được giữ để bạn thử lại.');
      return;
    }
    setDirty(false);
    if (finalPublishState) {
      onShowToast(`Đã lưu và xuất bản bài viết "${activeArticle.title}" lên website chính!`);
    } else {
      onShowToast(`Đã lưu bản nháp bài viết "${activeArticle.title}"!`);
    }
  };

  const rawContent =
    activeArticle.contentFormatted ||
    (Array.isArray(activeArticle.content) ? activeArticle.content.join('\n\n') : activeArticle.content);

  return (
    <div className="fixed inset-0 z-50 bg-[#F8FAFC] text-slate-900 flex flex-col font-sans overflow-y-auto">
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (dirty && !confirm('Bạn có thay đổi vừa chỉnh sửa. Quay lại danh sách?')) return;
              setViewMode('list');
            }}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition flex items-center gap-2 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Quay lại danh sách</span>
          </button>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition ${
                !isDraft
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {!isDraft ? (
                <>
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>Đã xuất bản</span>
                </>
              ) : (
                <>
                  <Clock size={13} className="text-amber-600" />
                  <span>Bản nháp</span>
                </>
              )}
            </span>

            <span className="text-xs text-sky-700 font-mono bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200 font-bold hidden sm:inline">
              {displayUrl}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => {
              void loadRevisions(activeArticle.id);
              setShowRevisions(true);
            }}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            title="Lịch sử phiên bản & Khôi phục"
          >
            <History size={14} />
            <span className="hidden md:inline">Phiên bản</span>
          </button>

          <button
            type="button"
            onClick={() => {
              window.history.pushState({}, '', displayUrl);
              onNavigate('news-detail');
            }}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Eye size={14} />
            <span className="hidden sm:inline">Xem Trước</span>
          </button>

          {isDraft ? (
            <>
              <button
                type="button"
                onClick={() => handleSave(false)}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Save size={15} className="text-[#0284C7]" />
                <span>LƯU NHÁP</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 size={15} />
                <span>XUẤT BẢN</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleSave(false)}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Clock size={14} className="text-amber-600" />
                <span>Chuyển về Nháp</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave(true)}
                className="px-4 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-extrabold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Save size={15} />
                <span>LƯU THAY ĐỔI</span>
              </button>
            </>
          )}
        </div>
      </header>

      <main className="max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6 flex-1">
        {/* KHỐI 1: TIÊU ĐỀ, ĐƯỜNG DẪN & LỊCH XUẤT BẢN */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <LinkIcon size={15} className="text-[#0284C7]" />
              Khối 1: Tiêu đề, Chuyên mục, Thẻ & Lịch xuất bản
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">/tin-tuc/:slug</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Tiêu Đề Bài Viết / Bản Tin <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={activeArticle.title}
                onChange={(e) => {
                  const title = e.target.value;
                  patchArticle({
                    title,
                    slug: activeArticle.isPublished === true ? activeArticle.slug : generateSlug(title),
                  });
                }}
                placeholder="Nhập tiêu đề bài viết..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                  <LinkIcon size={13} className="text-[#0284C7]" />
                  Đường Dẫn Tĩnh (Slug)
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2.5 py-2 rounded-xl border border-slate-200 shrink-0">
                    /tin-tuc/
                  </span>
                  <input
                    type="text"
                    value={activeArticle.slug || generateSlug(activeArticle.title)}
                    onChange={(e) => patchArticle({ slug: generateSlug(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-[#0284C7]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Chuyên Mục Bài Viết</label>
                <select
                  value={activeArticle.category}
                  onChange={(e) => {
                    const category = e.target.value;
                    const found = taxonomyOptions.find((x: any) => x.id === category);
                    patchArticle({ category, categoryLabel: found?.label || category });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                >
                  {taxonomyOptions.map((x: any) => (
                    <option key={x.id} value={x.id}>
                      {x.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Trạng Thái Quy Trình Biên Tập
                </label>
                <select
                  value={activeArticle.editorialStatus || (activeArticle.isPublished ? 'published' : 'draft')}
                  onChange={(e) => patchArticle({ editorialStatus: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="draft">Bản nháp (Draft)</option>
                  <option value="pending_review">Chờ duyệt (Pending Review)</option>
                  <option value="approved">Đã duyệt chờ đăng (Approved)</option>
                  <option value="published">Đã xuất bản (Published)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Hẹn Giờ Tự Động Xuất Bản (Tùy chọn)
                </label>
                <input
                  type="datetime-local"
                  value={activeArticle.scheduledPublishAt || ''}
                  onChange={(e) => patchArticle({ scheduledPublishAt: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>
            </div>

            <EntityColorPicker
              label="Màu chuyên mục bài viết"
              entityLabel={activeArticle.categoryLabel || activeArticle.category || 'Tin tức'}
              value={activeArticle.categoryColor}
              onChange={(categoryColor) => patchArticle({ categoryColor })}
            />

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <Tag size={13} className="text-[#0284C7]" />
                Thẻ Nhãn (Tags - Phân cách bằng dấu phẩy)
              </label>
              <input
                type="text"
                value={activeArticle.tags?.join(', ') || ''}
                onChange={(e) => {
                  const tagsArr = e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean);
                  patchArticle({ tags: tagsArr });
                }}
                placeholder="Ví dụ: Thông Báo, Tình Nguyện, Sky First Network 2026"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* KHỐI 2: TÁC GIẢ & THỜI GIAN */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <User size={13} className="text-[#0284C7]" /> Tác Giả / Đơn Vị Đăng
              </label>
              <input
                type="text"
                value={activeArticle.author}
                onChange={(e) => patchArticle({ author: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <Calendar size={13} className="text-[#0284C7]" /> Ngày Xuất Bản
              </label>
              <input
                type="date"
                value={activeArticle.publishedAt || ''}
                onChange={(e) => patchArticle({ publishedAt: e.target.value, date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <Clock size={13} className="text-[#0284C7]" /> Thời Gian Đọc
              </label>
              <input
                type="text"
                value={activeArticle.readTime}
                onChange={(e) => patchArticle({ readTime: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900">
            <input
              type="checkbox"
              checked={Boolean(activeArticle.isFeatured)}
              onChange={(e) => patchArticle({ isFeatured: e.target.checked })}
            />
            Ghim là bài đăng nổi bật trên Trang chủ & Trang Tin tức
          </label>
        </div>

        {/* KHỐI 3: HÌNH ẢNH ĐẠI DIỆN (GIỮ NGUYÊN TỶ LỆ GỐC MẶC ĐỊNH) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <ImageIcon size={15} className="text-[#0284C7]" />
              Khối 3: Hình Ảnh Đại Diện & Thư Viện Ảnh (Mặc định giữ nguyên tỷ lệ gốc)
            </h2>
          </div>

          <ImageUrlInput
            label="Ảnh đại diện bài viết"
            value={activeArticle.imageUrl || ''}
            onChange={(url) => patchArticle({ imageUrl: url })}
            helperText="Mặc định hiển thị đầy đủ 100% ảnh gốc (kể cả ảnh dọc A4, infographic, poster). Chỉ cắt khi bạn chủ động chọn Cover."
          />

          <div className="grid sm:grid-cols-2 gap-3">
            <input
              value={activeArticle.imageDescription || ''}
              onChange={(e) => patchArticle({ imageDescription: e.target.value, imageCaption: e.target.value })}
              placeholder="Chú thích ảnh hiển thị dưới ảnh..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
            <input
              value={activeArticle.imageAlt || ''}
              onChange={(e) => patchArticle({ imageAlt: e.target.value })}
              placeholder="Văn bản thay thế (Alt text cho SEO & trợ năng)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
            <input
              value={activeArticle.imageCredit || ''}
              onChange={(e) => patchArticle({ imageCredit: e.target.value })}
              placeholder="Nguồn / Tác giả ảnh"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
            <select
              value={activeArticle.imageFit || 'original'}
              onChange={(e) => patchArticle({ imageFit: e.target.value as any })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
            >
              <option value="original">Original — Hiển thị đầy đủ ảnh gốc, giữ nguyên tỷ lệ</option>
              <option value="contain">Contain — Vừa khung, không bao giờ cắt ảnh</option>
              <option value="cover">Cover — Chủ động phủ khung 16:9</option>
            </select>
          </div>
        </div>

        {/* KHỐI 4: ĐOẠN SAPO & TRÌNH SOẠN THẢO KIỂU WORDPRESS GUTENBERG */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Đoạn Sapo / Tóm Tắt Mở Đầu
            </label>
            <textarea
              rows={3}
              value={activeArticle.summary}
              onChange={(e) => patchArticle({ summary: e.target.value })}
              placeholder="Nhập đoạn sapo tóm tắt mở đầu bài viết..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 leading-relaxed"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              Trình Soạn Thảo Nội Dung & Khối Kiểu WordPress Gutenberg
            </label>
            <RichTextEditor
              id="news-content-editor"
              value={rawContent}
              onChange={(html) => patchArticle({ contentFormatted: html, content: html })}
              blocks={activeArticle.pageBlocks || []}
              onBlocksChange={(pageBlocks) => patchArticle({ pageBlocks })}
              placeholder="Viết trực tiếp tại đây, kéo thả ảnh từ máy tính vào bài hoặc bấm (+ Thêm khối)..."
              minHeight="420px"
            />
          </div>
        </div>

        {/* KHỐI 5: SEO, METADATA CHIA SẺ & NGUỒN TIN */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Globe size={15} className="text-[#0284C7]" />
              Khối 5: SEO, Chia Sẻ Mạng Xã Hội & Bình Luận
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-bold text-slate-700">SEO Title (Mặc định lấy tiêu đề bài)</span>
              <input
                value={activeArticle.seoTitle || ''}
                onChange={(e) => patchArticle({ seoTitle: e.target.value })}
                placeholder={activeArticle.title}
                className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-700">Nguồn trích dẫn / Canonical URL</span>
              <input
                value={activeArticle.source || ''}
                onChange={(e) => patchArticle({ source: e.target.value })}
                placeholder="Sky First Network / Ban Truyền Thông"
                className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-bold text-slate-700">SEO Description (Mặc định lấy đoạn Sapo)</span>
              <textarea
                rows={2}
                value={activeArticle.seoDescription || ''}
                onChange={(e) => patchArticle({ seoDescription: e.target.value })}
                placeholder={activeArticle.summary}
                className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={activeArticle.allowComments ?? true}
                onChange={(e) => patchArticle({ allowComments: e.target.checked })}
                className="w-4 h-4 rounded text-sky-600"
              />
              <span>Cho phép độc giả gửi bình luận (qua kiểm duyệt)</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(activeArticle.noIndex)}
                onChange={(e) => patchArticle({ noIndex: e.target.checked })}
                className="w-4 h-4 rounded text-amber-600"
              />
              <span>Ẩn khỏi công cụ tìm kiếm & Sitemap (noIndex)</span>
            </label>
          </div>
        </div>
      </main>

      {showRevisions && (
        <div className="fixed inset-0 z-[120] bg-slate-950/55 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <header className="p-4 border-b flex items-center justify-between">
              <h3 className="font-black text-sm">Lịch sử phiên bản bài viết</h3>
              <button type="button" onClick={() => setShowRevisions(false)} className="text-xs font-bold text-slate-500">
                Đóng
              </button>
            </header>
            <div className="max-h-96 overflow-y-auto divide-y p-3">
              {revisions.length === 0 ? (
                <p className="p-6 text-center text-xs text-slate-500">Chưa có bản lưu lịch sử nào cho bài viết này.</p>
              ) : (
                revisions.map((r) => (
                  <div key={r.id} className="py-3 px-2 flex items-center justify-between gap-3">
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
