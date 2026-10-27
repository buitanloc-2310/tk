import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  ArrowRight,
  Sparkles,
  Search,
  Tag,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useDataContext } from '../context/DataContext';
import { ImagePlaceholder } from '../components/UIPrimitives';
import { EntityBadge } from '../components/UIPrimitives';
import { NewsArticle, PageRoute } from '../types';

interface NewsPageProps {
  onSelectArticle: (article: NewsArticle) => void;
  onNavigate: (page: PageRoute) => void;
}

const PAGE_SIZE = 9;

export const NewsPage: React.FC<NewsPageProps> = ({
  onSelectArticle,
}) => {
  const { newsArticles, siteConfig } = useDataContext();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pageIndex, setPageIndex] = useState<number>(1);

  const publicArticles = useMemo(
    () =>
      newsArticles
        .filter((article) => article.isPublished !== false)
        .sort((a, b) => Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured))),
    [newsArticles]
  );

  const categories = useMemo(() => {
    const map = new Map<string, { id: string; label: string; count: number }>();
    for (const a of publicArticles) {
      const id = a.category || 'general';
      const label = a.categoryLabel || id;
      const cur = map.get(id) || { id, label, count: 0 };
      cur.count += 1;
      map.set(id, cur);
    }
    return [{ id: 'all', label: 'Tất cả chuyên mục', count: publicArticles.length }, ...map.values()];
  }, [publicArticles]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const a of publicArticles) {
      for (const t of a.tags || []) {
        if (t && t.trim()) s.add(t.trim());
      }
    }
    return [...s].slice(0, 20);
  }, [publicArticles]);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('vi');
    return publicArticles.filter((a) => {
      const catOk = selectedCategory === 'all' || a.category === selectedCategory;
      const tagOk = !selectedTag || (a.tags || []).includes(selectedTag);
      const qOk =
        !q ||
        [a.title, a.summary, a.categoryLabel, ...(a.tags || [])]
          .some((v) => String(v || '').toLocaleLowerCase('vi').includes(q));
      return catOk && tagOk && qOk;
    });
  }, [publicArticles, selectedCategory, selectedTag, searchQuery]);

  const featuredArticle =
    selectedCategory === 'all' && !selectedTag && !searchQuery.trim()
      ? filteredArticles.find((a) => a.isFeatured) || filteredArticles[0]
      : null;

  const listSource = featuredArticle
    ? filteredArticles.filter((a) => a.id !== featuredArticle.id)
    : filteredArticles;

  const totalPages = Math.max(1, Math.ceil(listSource.length / PAGE_SIZE));
  const currentPage = Math.min(pageIndex, totalPages);
  const paginatedArticles = listSource.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-10 py-6 sm:py-10">
      {/* Main Page Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-xs font-black text-[#0284C7]">
            <Sparkles size={13} />
            <span>{siteConfig.newsLabel || 'Tin tức & hoạt động'}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            {siteConfig.newsHeading || 'Tin tức & hoạt động'}
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-normal">
            {siteConfig.siteDescription || 'Cập nhật tin tức, bản tin và thông báo chính thức từ Mạng lưới Sky First.'}
          </p>
        </div>

        {/* Bộ lọc Danh mục, Thẻ (Tags) & Tìm kiếm */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setPageIndex(1);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? 'bg-[#0284C7] text-white shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${selectedCategory === cat.id ? 'bg-white/20 text-white' : 'bg-white text-slate-500'}`}>
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPageIndex(1);
                }}
                placeholder="Tìm kiếm bài viết, chủ đề..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-4 py-2 text-xs sm:text-sm outline-none focus:bg-white focus:border-[#0284C7]"
              />
            </div>
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 mr-1">
                <Tag size={12} /> Thẻ:
              </span>
              {selectedTag && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTag('');
                    setPageIndex(1);
                  }}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                >
                  Bỏ lọc #{selectedTag} ×
                </button>
              )}
              {allTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setSelectedTag(selectedTag === t ? '' : t);
                    setPageIndex(1);
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                    selectedTag === t
                      ? 'bg-[#0284C7] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 1. BÀI VIẾT NỔI BẬT */}
      {featuredArticle && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h2 className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">Bản Tin Nổi Bật</h2>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.35 }}
              className="p-6 sm:p-8 rounded-3xl bg-white border border-sky-150 shadow-2xs hover:shadow-lg transition-all"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6">
                  <ImagePlaceholder
                    sizeText={featuredArticle.imageSizeText}
                    description={featuredArticle.imageAlt || featuredArticle.imageDescription || featuredArticle.title}
                    aspectRatio="auto"
                    objectFit={featuredArticle.imageFit || 'original'}
                    theme={featuredArticle.theme}
                    imageUrl={featuredArticle.imageUrl}
                  />
                </div>

                <div className="lg:col-span-6 space-y-4">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <EntityBadge label={featuredArticle.categoryLabel} color={featuredArticle.categoryColor} />
                    <span className="flex items-center gap-1.5 font-medium text-slate-600">
                      <Calendar size={14} className="text-[#0284C7]" />
                      {featuredArticle.date}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5 font-medium text-slate-600">
                      <Clock size={14} className="text-[#0284C7]" />
                      {featuredArticle.readTime}
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">{featuredArticle.title}</h3>

                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">{featuredArticle.summary}</p>

                  <div className="pt-2">
                    <button
                      onClick={() => onSelectArticle(featuredArticle)}
                      className="px-6 py-3 bg-[#0284C7] hover:bg-[#0369A1] text-white font-extrabold text-xs sm:text-sm rounded-xl transition flex items-center gap-2 shadow-sm shadow-sky-500/20"
                    >
                      <span>Đọc toàn bộ bài viết</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* 2. DANH SÁCH BÀI VIẾT & PHÂN TRANG */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]"></span>
            <h2 className="text-xl sm:text-2xl font-black text-[#0284C7] tracking-tight">Danh Sách Bản Tin</h2>
          </div>
          <span className="text-xs font-semibold text-slate-400">{filteredArticles.length} bài viết</span>
        </div>

        {paginatedArticles.length === 0 && !featuredArticle ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
            Chưa có bài viết phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-7">
            {paginatedArticles.map((article, nIdx) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.3, delay: (nIdx % 3) * 0.06 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-lg transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="p-3.5 bg-slate-50 border-b border-slate-100">
                    <ImagePlaceholder
                      sizeText={article.imageSizeText}
                      description={article.imageAlt || article.imageDescription || article.title}
                      aspectRatio="auto"
                      objectFit={article.imageFit || 'original'}
                      theme={article.theme}
                      imageUrl={article.imageUrl}
                    />
                  </div>

                  <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <EntityBadge label={article.categoryLabel} color={article.categoryColor} className="px-2.5 py-0.5" />
                      <span className="font-medium text-slate-500">{article.date}</span>
                    </div>

                    <h3 className="font-bold text-base text-slate-900 group-hover:text-[#0284C7] transition line-clamp-2 leading-snug">
                      {article.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 leading-relaxed font-normal">{article.summary}</p>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <button
                    onClick={() => onSelectArticle(article)}
                    className="w-full py-2.5 rounded-xl border border-sky-200 text-[#0284C7] hover:bg-sky-50 hover:border-sky-300 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5"
                  >
                    <span>Đọc chi tiết</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPageIndex((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Trước
            </button>
            <span className="text-xs font-bold text-slate-600 px-3">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPageIndex((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 disabled:opacity-40"
            >
              Tiếp <ChevronRight size={14} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
