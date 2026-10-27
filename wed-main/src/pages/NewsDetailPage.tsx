import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  Tag,
  ArrowLeft,
  Copy,
  ChevronRight,
  AlertTriangle,
  BookOpen,
  ZoomIn,
  Quote,
  Play,
} from 'lucide-react';
import { useDataContext } from '../context/DataContext';
import { PageRoute, NewsArticle, PageBlock } from '../types';
import { getArticleSlug, sanitizeHtml } from '../utils/contentUtils';
import { ImageLightboxModal } from '../components/UIPrimitives';
import { EntityBadge } from '../components/UIPrimitives';
import { RichTextRenderer } from '../components/UIPrimitives';
interface NewsDetailPageProps {
  newsSlugOrId: string;
  onNavigate: (route: PageRoute) => void;
  onShowToast: (message: string) => void;
  onSelectArticle?: (article: NewsArticle) => void;
}

const youtubeEmbed = (value?: string) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    if (!['youtube.com', 'www.youtube.com', 'youtu.be'].includes(u.hostname)) return '';
    let id = '';
    if (u.hostname === 'youtu.be') id = u.pathname.slice(1);
    else id = u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop() || '';
    return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : '';
  } catch {
    return '';
  }
};

export const NewsDetailPage: React.FC<NewsDetailPageProps> = ({
  newsSlugOrId,
  onNavigate,
  onShowToast,
  onSelectArticle,
}) => {
  const { newsArticles, isPublicDataReady } = useDataContext();
  const [lightboxImg, setLightboxImg] = useState<{ src: string; alt?: string; caption?: string; credit?: string } | null>(null);

  const article = newsArticles.find(
    (a) =>
      getArticleSlug(a) === newsSlugOrId ||
      a.id === newsSlugOrId ||
      (a.slug && a.slug === newsSlugOrId)
  );

  if (!isPublicDataReady) {
    return (
      <div className="min-h-[70vh] bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse">
          <div className="h-5 w-32 rounded bg-slate-100" />
          <div className="mt-7 h-10 w-4/5 rounded-xl bg-slate-100" />
          <div className="mt-5 h-24 rounded-2xl bg-slate-100" />
          <div className="mt-6 aspect-video rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!article || article.isPublished === false) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4 shadow-sm">
          <AlertTriangle size={32} />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Không Tìm Thấy Bài Viết</h1>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Bài viết tin tức hoặc thông báo này có thể đã được gỡ bỏ hoặc chuyển sang địa chỉ mới.
        </p>
        <button
          type="button"
          onClick={() => {
            onNavigate('news');
            window.history.pushState({}, '', '/news');
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-sm rounded-xl shadow-sm transition"
        >
          <ArrowLeft size={16} />
          <span>Xem Danh Sách Tin Tức</span>
        </button>
      </div>
    );
  }

  const currentSlug = getArticleSlug(article);
  const fullPublicUrl = typeof window !== 'undefined' ? `${window.location.origin}/tin-tuc/${currentSlug}` : `/tin-tuc/${currentSlug}`;

  const handleCopyUrl = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullPublicUrl);
      onShowToast(`Đã sao chép liên kết bài viết: /tin-tuc/${currentSlug}`);
    }
  };

  const rawContent = article.contentFormatted || (Array.isArray(article.content) ? article.content.join('\n\n') : article.content);

  const renderArticleBlock = (block: PageBlock) => {
    if (block.hidden) return null;
    if (block.type === 'divider') return <hr key={block.id} className="my-6 border-slate-200" />;
    if (block.type === 'heading') {
      const TagName = block.headingLevel || 'h2';
      return (
        <TagName key={block.id} className="font-extrabold text-slate-900 mt-6 mb-3 tracking-tight text-xl sm:text-2xl">
          {block.title || block.body}
        </TagName>
      );
    }
    if (block.type === 'quote') {
      return (
        <blockquote key={block.id} className="my-5 rounded-r-2xl border-l-4 border-[#0284C7] bg-sky-50/70 p-4 sm:p-5 italic text-slate-700">
          <Quote size={18} className="text-[#0284C7] mb-1" />
          <p className="leading-relaxed">{block.body}</p>
          {block.title && <footer className="mt-2 text-xs font-bold not-italic text-slate-500">— {block.title}</footer>}
        </blockquote>
      );
    }
    if (block.type === 'callout') {
      const toneClass =
        block.calloutTone === 'warning'
          ? 'border-amber-200 bg-amber-50 text-amber-950'
          : block.calloutTone === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
          : 'border-sky-200 bg-sky-50 text-slate-900';
      return (
        <div key={block.id} className={`my-5 rounded-2xl border p-4 sm:p-5 ${toneClass}`}>
          {block.title && <h4 className="font-extrabold text-sm sm:text-base mb-1.5">{block.title}</h4>}
          {block.body && <p className="text-sm leading-relaxed whitespace-pre-line">{block.body}</p>}
        </div>
      );
    }
    if (block.type === 'image' && block.imageUrl) {
      const fit = block.imageFit || 'original';
      return (
        <figure key={block.id} className="my-6">
          <div
            className={`group relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 ${
              fit === 'cover' ? 'aspect-video' : ''
            }`}
          >
            <img
              src={block.imageUrl}
              alt={block.alt || block.caption || article.title}
              onClick={() => setLightboxImg({ src: block.imageUrl!, alt: block.alt || block.caption, caption: block.caption, credit: block.credit })}
              style={{ objectPosition: `${block.focalX ?? 50}% ${block.focalY ?? 50}%` }}
              className={
                fit === 'cover'
                  ? 'h-full w-full object-cover cursor-zoom-in'
                  : 'block h-auto w-auto max-w-full mx-auto object-contain cursor-zoom-in'
              }
            />
          </div>
          {(block.caption || block.credit) && (
            <figcaption className="mt-2.5 text-center text-xs text-slate-500">
              {block.caption && <span>{block.caption}</span>}
              {block.caption && block.credit && <br />}
              {block.credit && <span className="font-bold uppercase tracking-wider text-[11px]">ẢNH/NGUỒN: {block.credit}</span>}
            </figcaption>
          )}
        </figure>
      );
    }
    if (block.type === 'gallery' && (block.items || []).length > 0) {
      return (
        <div key={block.id} className="my-6 space-y-3">
          {block.title && <h3 className="font-bold text-slate-900">{block.title}</h3>}
          <div className="grid gap-3 sm:grid-cols-2">
            {(block.items || []).map((it, idx) =>
              it.imageUrl ? (
                <figure key={idx} className="rounded-2xl border border-slate-100 bg-slate-50 p-2">
                  <img
                    src={it.imageUrl}
                    alt={it.title || `${article.title} - ảnh ${idx + 1}`}
                    onClick={() => setLightboxImg({ src: it.imageUrl!, alt: it.title, caption: it.body })}
                    className="block h-auto w-auto max-w-full mx-auto rounded-xl object-contain cursor-zoom-in"
                  />
                  {(it.title || it.body) && (
                    <figcaption className="mt-2 text-center text-xs text-slate-500">{it.title || it.body}</figcaption>
                  )}
                </figure>
              ) : null
            )}
          </div>
        </div>
      );
    }
    if (block.type === 'video' && block.videoUrl) {
      const embed = youtubeEmbed(block.videoUrl);
      return (
        <div key={block.id} className="my-6">
          {block.title && <h3 className="font-bold text-slate-900 mb-2">{block.title}</h3>}
          {embed ? (
            <div className="aspect-video overflow-hidden rounded-2xl bg-black">
              <iframe src={embed} title={block.title || 'Video'} className="h-full w-full" allowFullScreen />
            </div>
          ) : (
            <video controls preload="metadata" poster={block.posterUrl} className="w-full rounded-2xl bg-black">
              <source src={block.videoUrl} />
            </video>
          )}
        </div>
      );
    }
    if (block.type === 'list') {
      const lines = String(block.body || '').split('\n').map((s) => s.trim()).filter(Boolean);
      const ListTag = block.listType === 'ol' ? 'ol' : 'ul';
      return (
        <ListTag key={block.id} className={`my-4 pl-6 space-y-1.5 text-slate-700 ${block.listType === 'ol' ? 'list-decimal' : 'list-disc'}`}>
          {lines.map((l, idx) => (
            <li key={idx}>{l}</li>
          ))}
        </ListTag>
      );
    }
    return (
      <div
        key={block.id}
        className="formatted-content prose prose-slate max-w-none my-4"
        dangerouslySetInnerHTML={{
          __html: sanitizeHtml(block.body?.includes('<') ? block.body : String(block.body || '').replace(/\n/g, '<br/>')),
        }}
      />
    );
  };

  return (
    <div className="bg-slate-50/50 min-h-screen pb-20">
      {/* Top Header / Breadcrumb Bar */}
      <div className="bg-white border-b border-slate-200/80 sticky top-16 sm:top-20 z-20 backdrop-blur-md bg-white/95">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
            <button
              onClick={() => {
                onNavigate('home');
                window.history.pushState({}, '', '/home');
              }}
              className="hover:text-[#0284C7] font-medium"
            >
              Trang chủ
            </button>
            <ChevronRight size={12} className="text-slate-400 shrink-0" />
            <button
              onClick={() => {
                onNavigate('news');
                window.history.pushState({}, '', '/news');
              }}
              className="hover:text-[#0284C7] font-medium"
            >
              Tin tức & Hoạt động
            </button>
            <ChevronRight size={12} className="text-slate-400 shrink-0" />
            <span className="text-slate-900 font-bold truncate max-w-[200px] sm:max-w-xs">{article.title}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
              title="Sao chép URL bài viết"
            >
              <Copy size={13} />
              <span className="hidden sm:inline">Sao chép URL</span>
            </button>
          </div>
        </div>
      </div>

      {/* Article Content Container */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-xs space-y-6">
          {/* Category & Meta */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <EntityBadge label={article.categoryLabel} color={article.categoryColor} className="uppercase tracking-wider" />
              <span className="text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded-md text-[11px]">/tin-tuc/{currentSlug}</span>
            </div>

            <div className="flex items-center gap-4 text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar size={13} className="text-[#0284C7]" />
                {article.date}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={13} className="text-amber-500" />
                {article.readTime}
              </span>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">{article.title}</h1>

          {/* Summary Quote / Lede */}
          {article.summary && (
            <div className="p-4 sm:p-5 bg-sky-50/60 rounded-2xl border-l-4 border-[#0284C7] text-slate-700 font-medium text-sm sm:text-base leading-relaxed">
              {article.summary}
            </div>
          )}

          {/* Feature Cover Image: mặc định hiển thị toàn bộ ảnh gốc không cắt, có nút Xem ảnh gốc / Phóng to */}
          {article.heroImageMode !== 'hidden' && article.imageUrl && (
            <figure className="pt-2">
              <div
                className={`group relative w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 ${
                  article.imageFit === 'cover' ? 'aspect-video' : ''
                }`}
              >
                <img
                  src={article.imageUrl}
                  alt={article.imageAlt || article.title}
                  onClick={() =>
                    setLightboxImg({
                      src: article.imageUrl!,
                      alt: article.imageAlt || article.title,
                      caption: article.imageCaption || article.imageDescription,
                      credit: article.imageCredit,
                    })
                  }
                  style={{ objectPosition: `${article.imageFocalX ?? 50}% ${article.imageFocalY ?? 50}%` }}
                  className={
                    article.imageFit === 'cover'
                      ? 'h-full w-full object-cover cursor-zoom-in'
                      : 'mx-auto block h-auto w-auto max-w-full object-contain cursor-zoom-in'
                  }
                  loading="eager"
                />
                <button
                  type="button"
                  onClick={() =>
                    setLightboxImg({
                      src: article.imageUrl!,
                      alt: article.imageAlt || article.title,
                      caption: article.imageCaption || article.imageDescription,
                      credit: article.imageCredit,
                    })
                  }
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-xl bg-slate-900/75 hover:bg-slate-900 text-white px-3 py-1.5 text-xs font-bold backdrop-blur-xs"
                >
                  <ZoomIn size={14} />
                  <span>Xem ảnh gốc</span>
                </button>
              </div>
              {(article.imageCaption || article.imageDescription || article.imageCredit) && (
                <figcaption className="mt-3 text-center text-xs leading-5 text-slate-500">
                  {(article.imageCaption || article.imageDescription) && <span>{article.imageCaption || article.imageDescription}</span>}
                  {(article.imageCaption || article.imageDescription) && article.imageCredit && <br />}
                  {article.imageCredit && (
                    <span className="font-bold uppercase tracking-wide">
                      ẢNH/NGUỒN:{' '}
                      {article.imageSourceUrl ? (
                        <a href={article.imageSourceUrl} target="_blank" rel="noreferrer" className="text-[#0284C7] hover:underline">
                          {article.imageCredit}
                        </a>
                      ) : (
                        article.imageCredit
                      )}
                    </span>
                  )}
                </figcaption>
              )}
            </figure>
          )}

          {/* Main Body: RichTextRenderer + Gutenberg PageBlocks + Uncropped Gallery */}
          <div
            className="pt-4 text-slate-800 leading-relaxed space-y-4"
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.tagName === 'IMG') {
                const img = target as HTMLImageElement;
                if (img.src) setLightboxImg({ src: img.src, alt: img.alt });
              }
            }}
          >
            {rawContent && <RichTextRenderer content={rawContent} />}
            {(article.pageBlocks || []).map(renderArticleBlock)}
            {(article.galleryImages || []).filter(Boolean).length > 0 && (
              <section className="mt-10">
                <h2 className="mb-4 text-xl font-black text-slate-900">Hình ảnh liên quan</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(article.galleryImages || []).filter(Boolean).map((src, idx) => (
                    <figure key={idx} className="group relative rounded-2xl border border-slate-100 bg-slate-50 p-2 flex items-center justify-center">
                      <img
                        src={src}
                        alt={`${article.title} - ảnh ${idx + 1}`}
                        loading="lazy"
                        onClick={() => setLightboxImg({ src, alt: `${article.title} - ảnh ${idx + 1}` })}
                        className="block h-auto w-auto max-w-full rounded-xl object-contain cursor-zoom-in"
                      />
                    </figure>
                  ))}
                </div>
              </section>
            )}
          </div>

          {(article.source || article.canonicalUrl) && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <b>Nguồn:</b>{' '}
              {article.canonicalUrl ? (
                <a href={article.canonicalUrl} target="_blank" rel="noreferrer" className="ml-1 font-bold text-[#0284C7] hover:underline">
                  {article.source || 'Nguồn tham khảo'}
                </a>
              ) : (
                <span className="ml-1">{article.source}</span>
              )}
            </div>
          )}

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <Tag size={14} className="text-slate-400 mr-1" />
              {article.tags.map((tag, idx) => (
                <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold hover:bg-slate-200 transition">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-600">
            <span>Thông tin được đăng tải trên website Sky First Network.</span>
            <div className="flex items-center gap-2">
              <a href="#binh-luan" className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-100 transition">
                Bình luận
              </a>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="px-3 py-1.5 bg-white border border-slate-200 text-[#0284C7] font-bold rounded-lg hover:bg-sky-50 transition"
              >
                Chia sẻ bài viết
              </button>
            </div>
          </div>
        </div>

        <NewsComments articleId={article.id} enabled={article.allowComments !== false} />

        {/* Related articles (prioritizing same category or shared tags) */}
        <div className="mt-10 space-y-4">
          <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen size={20} className="text-[#0284C7]" />
            Tin Tức Liên Quan Từ Mạng Lưới
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {newsArticles
              .filter((n) => n.id !== article.id && n.isPublished !== false)
              .sort((a, b) => {
                const scoreA = (a.category === article.category ? 2 : 0) + (a.tags || []).filter((t) => (article.tags || []).includes(t)).length;
                const scoreB = (b.category === article.category ? 2 : 0) + (b.tags || []).filter((t) => (article.tags || []).includes(t)).length;
                return scoreB - scoreA;
              })
              .slice(0, 3)
              .map((other) => {
                const otherSlug = getArticleSlug(other);
                return (
                  <div
                    key={other.id}
                    onClick={() => {
                      window.history.pushState({}, '', `/tin-tuc/${otherSlug}`);
                      if (onSelectArticle) onSelectArticle(other);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-sky-300 hover:shadow-xs transition cursor-pointer group space-y-2"
                  >
                    <EntityBadge label={other.categoryLabel} color={other.categoryColor} className="px-2 py-0.5 text-[10px]" />
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#0284C7] transition line-clamp-2 leading-snug">
                      {other.title}
                    </h4>
                    <span className="text-[11px] text-slate-400 block">{other.date}</span>
                  </div>
                );
              })}
          </div>
        </div>
      </article>

      <ImageLightboxModal
        src={lightboxImg?.src || null}
        alt={lightboxImg?.alt}
        caption={lightboxImg?.caption}
        credit={lightboxImg?.credit}
        onClose={() => setLightboxImg(null)}
      />
    </div>
  );
};

// --- Consolidated from NewsComments.tsx ---
import { MessageCircle, Send, Loader2, ShieldCheck } from 'lucide-react';

interface Props { articleId: string; enabled?: boolean; }
interface CommentRow { id:string; name:string; content:string; created_at:string; }

export const NewsComments: React.FC<Props> = ({ articleId, enabled = true }) => {
  const [items,setItems]=useState<CommentRow[]>([]);
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [content,setContent]=useState('');
  const [loading,setLoading]=useState(true);
  const [sending,setSending]=useState(false);
  const [notice,setNotice]=useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r=await fetch(`/api/comments?articleId=${encodeURIComponent(articleId)}`,{cache:'no-store'});
      const d=await r.json().catch(()=>({}));
      setItems(Array.isArray(d?.items)?d.items:[]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ if(enabled) void load(); },[articleId,enabled]);
  const count=useMemo(()=>items.length,[items]);

  if(!enabled) return null;
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault(); setSending(true); setNotice('');
    try{
      const r=await fetch('/api/comments',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({articleId,name,email,content})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok||!d?.ok) throw new Error(d?.error||'Không thể gửi bình luận.');
      setContent(''); setNotice(d?.message||'Bình luận đã được gửi và đang chờ duyệt.');
    }catch(err:any){setNotice(err?.message||'Không thể gửi bình luận.');}
    finally{setSending(false);}
  };

  return <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7" id="binh-luan">
    <div className="flex items-center justify-between gap-3 mb-5"><div><div className="flex items-center gap-2 text-slate-900 font-black text-lg"><MessageCircle size={20} className="text-sky-600"/>Bình luận</div><p className="text-xs text-slate-500 mt-1">{count} bình luận đã được duyệt</p></div><ShieldCheck size={20} className="text-emerald-600"/></div>
    {loading?<div className="py-6 text-sm text-slate-500 flex items-center gap-2"><Loader2 size={16} className="animate-spin"/>Đang tải bình luận...</div>:items.length===0?<p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Chưa có bình luận được duyệt.</p>:<div className="space-y-3 mb-6">{items.map(x=><div key={x.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-slate-900">{x.name}</strong><span className="text-[11px] text-slate-400">{x.created_at?new Date(x.created_at+'Z').toLocaleString('vi-VN'):''}</span></div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{x.content}</p></div>)}</div>}
    <form onSubmit={submit} className="space-y-3 border-t border-slate-100 pt-5"><div className="grid sm:grid-cols-2 gap-3"><input required maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Họ và tên" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-500"/><input type="email" maxLength={160} value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email (không hiển thị công khai)" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-500"/></div><textarea required maxLength={2000} rows={4} value={content} onChange={e=>setContent(e.target.value)} placeholder="Viết bình luận..." className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-500"/><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><p className="text-[11px] text-slate-500">Bình luận sẽ được hiển thị sau khi quản trị viên duyệt.</p><button disabled={sending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60">{sending?<Loader2 size={15} className="animate-spin"/>:<Send size={15}/>}Gửi bình luận</button></div>{notice&&<p className="text-xs font-semibold text-sky-700">{notice}</p>}</form>
  </section>;
};
