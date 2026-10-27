import React, { CSSProperties, ErrorInfo, ReactNode, useEffect, useId, useState, useRef } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ExternalLink, Home, Image as ImageIcon, Images, Loader2, RotateCcw, Search, SkipForward, Sparkles, UploadCloud, X, ZoomIn } from 'lucide-react';
import { IntroConfig } from '../types';
import { sanitizeHtml } from '../utils/contentUtils';
import { MEDIA_ACCEPT, MediaItem, listMedia, uploadMedia } from '../lib/firebase';


// -----------------------------------------------------------------------------
// ErrorBoundary
// -----------------------------------------------------------------------------

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    try {
      const prev = JSON.parse(sessionStorage.getItem('sfn_runtime_errors') || '[]');
      const next = [{ at: new Date().toISOString(), message: String(error?.message || 'Runtime error').slice(0, 300) }, ...prev].slice(0, 20);
      sessionStorage.setItem('sfn_runtime_errors', JSON.stringify(next));
    } catch {}
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-2xs">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-900">
                Đã xảy ra sự cố hiển thị
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Hệ thống đã ghi nhận lỗi và bảo vệ phiên làm việc của bạn an toàn. Vui lòng tải lại trang hoặc quay về trang chủ.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 bg-[#0284C7] hover:bg-[#0369A1] text-white font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
              >
                <RotateCcw size={14} />
                <span>Tải lại trang</span>
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
              >
                <Home size={14} />
                <span>Về trang chủ</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// -----------------------------------------------------------------------------
// Toast
// -----------------------------------------------------------------------------

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  if (!message) return null;
  const isError = /không|lỗi|thất bại|hết hạn|chưa được|từ chối|mã \d+/i.test(message);
  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-5 duration-200 max-w-[min(92vw,460px)]">
      <div className={`${isError ? 'bg-rose-950 border-rose-400/50' : 'bg-[#062A67] border-sky-400/40'} text-white px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 text-xs sm:text-sm font-medium`}>
        {isError ? <AlertCircle size={18} className="text-rose-300 shrink-0" /> : <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />}
        <span>{message}</span>
        <button onClick={onClose} className="ml-2 text-slate-300 hover:text-white transition p-1" aria-label="Đóng thông báo">
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// ImageLightboxModal — Xem ảnh gốc full tỷ lệ & phóng to (Áp dụng cho mọi ảnh, kể cả A4/poster dài)
// -----------------------------------------------------------------------------

export const ImageLightboxModal: React.FC<{
  src: string | null;
  alt?: string;
  caption?: string;
  credit?: string;
  onClose: () => void;
}> = ({ src, alt, caption, credit, onClose }) => {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!src) return;
    setZoomed(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Xem ảnh gốc'}
      className="fixed inset-0 z-[250] bg-slate-950/90 backdrop-blur-md flex flex-col justify-between p-3 sm:p-6 overflow-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-slate-900/80 border border-white/15 rounded-2xl px-4 py-2.5 text-white backdrop-blur">
        <div className="min-w-0 truncate text-xs sm:text-sm font-bold">
          {alt || 'Xem toàn bộ ảnh gốc (Giữ nguyên tỷ lệ 100%)'}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setZoomed((z) => !z)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-bold transition"
          >
            <ZoomIn size={14} />
            <span>{zoomed ? 'Vừa màn hình' : 'Phóng to 100%'}</span>
          </button>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 px-3 py-1.5 text-xs font-bold transition"
          >
            <ExternalLink size={14} />
            <span>Mở ảnh gốc</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng xem ảnh"
            className="rounded-xl bg-white/10 hover:bg-rose-600 p-1.5 transition"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div
        className="my-auto flex flex-col items-center justify-center py-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <img
          src={src}
          alt={alt || ''}
          onClick={() => setZoomed((z) => !z)}
          className={`transition-all duration-200 rounded-xl shadow-2xl cursor-zoom-in ${
            zoomed
              ? 'max-w-none w-auto h-auto cursor-zoom-out'
              : 'max-w-full max-h-[82vh] w-auto h-auto object-contain'
          }`}
        />
        {(caption || credit) && (
          <div className="mt-3 max-w-2xl text-center text-xs sm:text-sm text-slate-200 bg-slate-900/75 px-4 py-2 rounded-xl border border-white/10">
            {caption && <p>{caption}</p>}
            {credit && <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-sky-300">Nguồn / Tác giả: {credit}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// ImagePlaceholder — Mặc định hiển thị TOÀN BỘ ẢNH & GIỮ NGUYÊN TỶ LỆ GỐC (không tự cắt ảnh)
// Chỉ dùng cover khi người biên tập chủ động truyền objectFit="cover"
// -----------------------------------------------------------------------------

interface ImagePlaceholderProps {
  sizeText?: string;
  description?: string;
  aspectRatio?: 'video' | 'square' | '4/3' | '21/9' | '3/2' | 'auto';
  className?: string;
  theme?: string;
  imageUrl?: string;
  objectFit?: 'original' | 'contain' | 'cover';
  objectPosition?: string;
  enableLightbox?: boolean;
}

export const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({
  sizeText = '',
  description = 'Sky First Network',
  aspectRatio = 'auto',
  className = '',
  theme = 'sky',
  imageUrl,
  objectFit = 'original',
  objectPosition = 'center',
  enableLightbox = true,
}) => {
  const [failed, setFailed] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => setFailed(false), [imageUrl]);

  // Mặc định: giữ nguyên tỷ lệ gốc (original / contain), không tự cắt nội dung ảnh (kể cả ảnh dọc A4, poster, infographic)
  const isExplicitCover = objectFit === 'cover';
  const aspectClass = isExplicitCover
    ? ({
        video: 'aspect-video',
        square: 'aspect-square',
        '4/3': 'aspect-[4/3]',
        '21/9': 'aspect-[21/9]',
        '3/2': 'aspect-[3/2]',
        auto: 'aspect-video',
      }[aspectRatio] || 'aspect-video')
    : 'min-h-[140px]';

  if (imageUrl && !failed) {
    return (
      <>
        <div
          className={`group relative overflow-hidden rounded-2xl ${
            theme === 'navy' ? 'bg-[#102C51]' : 'bg-slate-50 border border-slate-100'
          } ${isExplicitCover ? aspectClass : ''} ${className}`}
        >
          <img
            src={imageUrl}
            alt={description}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            onClick={enableLightbox ? (e) => { e.stopPropagation(); setLightboxOpen(true); } : undefined}
            className={
              isExplicitCover
                ? 'w-full h-full absolute inset-0 object-cover cursor-zoom-in'
                : 'block w-auto max-w-full h-auto mx-auto object-contain cursor-zoom-in'
            }
            style={{ objectPosition }}
          />
          {enableLightbox && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(true);
              }}
              title="Xem ảnh gốc đầy đủ"
              aria-label="Phóng to xem ảnh gốc"
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity absolute bottom-2.5 right-2.5 z-10 inline-flex items-center gap-1 rounded-xl bg-slate-900/75 hover:bg-slate-900 text-white px-2.5 py-1.5 text-[11px] font-bold backdrop-blur-xs shadow-md"
            >
              <ZoomIn size={13} />
              <span className="hidden sm:inline">Xem ảnh gốc</span>
            </button>
          )}
        </div>
        {lightboxOpen && (
          <ImageLightboxModal
            src={imageUrl}
            alt={description}
            caption={description !== 'Sky First Network' ? description : undefined}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <div
      className={`relative min-h-[200px] overflow-hidden rounded-2xl ${
        theme === 'navy' ? 'bg-[#102C51]' : 'bg-slate-100'
      } ${className}`}
    >
      <div className="flex flex-col justify-center items-center gap-4 p-7 text-center sf-image-fallback min-h-[200px]">
        <div className="bg-white/95 rounded-2xl p-4 w-[65%] max-w-[220px] shadow-xs">
          <img
            src="/brand/sky-first-network-web.png"
            alt="Sky First Network"
            className="w-full h-auto object-contain"
          />
        </div>
        <p className={`text-[11px] tracking-[.1em] font-bold uppercase ${theme === 'navy' ? 'text-sky-100' : 'text-slate-500'}`}>
          {sizeText ? `${description}` : 'Giáo dục · Người trẻ · Cộng đồng'}
        </p>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// HomepageIntroOverlay — Luồng Video Intro khi mở/tải lại trang chủ (Mục 5)
// - Mở/tải lại trang chủ: video intro bắt đầu từ đầu (muted để tuân thủ chính sách autoplay trình duyệt)
// - Video kết thúc (hoặc fallback khi chưa có file video): logo Sky First Network xuất hiện tinh tế rồi chuyển mượt vào trang chủ
// - Có nút "Bỏ qua Intro" hoạt động tức thì, không khóa thao tác người dùng
// - Tôn trọng prefers-reduced-motion
// - Chuyển trang con SPA không phát lại; mở trực tiếp URL bài viết/trang con không bị chặn
// -----------------------------------------------------------------------------

export const HomepageIntroOverlay: React.FC<{
  config?: IntroConfig;
  siteName?: string;
  defaultLogoUrl?: string;
  onFinish: () => void;
}> = ({ config, siteName = 'Sky First Network', defaultLogoUrl = '/brand/sky-first-network-web.png', onFinish }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [phase, setPhase] = useState<'video' | 'logo' | 'exiting'>('video');
  const [videoFailed, setVideoFailed] = useState(false);

  const logoSrc = config?.logoUrl || defaultLogoUrl || '/brand/sky-first-network-web.png';
  const videoUrl = String(config?.videoUrl || '').trim();
  const skipLabel = config?.skipLabel || 'Bỏ qua Intro';
  const allowSkip = config?.allowSkip !== false;
  const respectReducedMotion = config?.respectReducedMotion !== false;
  const tagline = config?.tagline || 'Kết nối tri thức · Phát triển người trẻ · Lan tỏa giá trị cộng đồng';
  const logoRevealMs = Math.max(
    500,
    Math.min(
      5000,
      config?.logoRevealDurationMs != null
        ? Number(config.logoRevealDurationMs)
        : Number(config?.logoRevealSeconds ?? 1.4) * 1000
    )
  );
  const maxDurationMs = Math.max(
    1500,
    Math.min(
      20000,
      config?.maxWaitDurationMs != null
        ? Number(config.maxWaitDurationMs)
        : Number(config?.durationSeconds ?? 4.5) * 1000
    )
  );

  useEffect(() => {
    if (respectReducedMotion && typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      onFinish();
      return;
    }

    // Nếu không có videoUrl hoặc video lỗi -> chuyển thẳng sang pha hiển thị logo thương hiệu tinh tế
    if (!videoUrl || videoFailed) {
      setPhase('logo');
      const t1 = window.setTimeout(() => setPhase('exiting'), logoRevealMs);
      const t2 = window.setTimeout(() => onFinish(), logoRevealMs + 450);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }

    // Có videoUrl: bắt đầu phát từ đầu (currentTime = 0)
    const v = videoRef.current;
    if (v) {
      try {
        v.currentTime = 0;
        const playPromise = v.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            // Trình duyệt chặn autoplay hoặc lỗi nguồn video -> chuyển sang pha logo dự phòng
            setVideoFailed(true);
          });
        }
      } catch {
        setVideoFailed(true);
      }
    }

    // Bảo vệ timeout tối đa nếu video tải chậm
    const fallbackTimer = window.setTimeout(() => {
      setPhase((current) => (current === 'video' ? 'logo' : current));
    }, maxDurationMs);

    return () => window.clearTimeout(fallbackTimer);
  }, [videoUrl, videoFailed, logoRevealMs, maxDurationMs, onFinish]);

  useEffect(() => {
    if (phase !== 'logo') return;
    const t1 = window.setTimeout(() => setPhase('exiting'), logoRevealMs);
    const t2 = window.setTimeout(() => onFinish(), logoRevealMs + 450);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [phase, logoRevealMs, onFinish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFinish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFinish]);

  return (
    <div
      role="region"
      aria-label="Giới thiệu mở đầu Sky First Network"
      className={`fixed inset-0 z-[180] flex flex-col items-center justify-center bg-[#061A3A] text-white transition-opacity duration-500 ${
        phase === 'exiting' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background subtle brand aura */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#0B66C3]/30 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
      </div>

      {/* Nút Bỏ qua Intro luôn hiển thị (khi allowSkip=true) và phản hồi tức thì */}
      {allowSkip && (
      <div className="absolute top-5 right-5 z-30">
        <button
          type="button"
          onClick={onFinish}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-slate-950/55 hover:bg-white hover:text-[#061A3A] px-4 py-2.5 text-xs sm:text-sm font-black tracking-wide backdrop-blur-md shadow-xl transition"
        >
          <span>{skipLabel}</span>
          <SkipForward size={15} />
        </button>
      </div>
      )}

      {/* Pha 1: Video Intro (nếu được cấu hình URL video hợp lệ) */}
      {phase === 'video' && videoUrl && !videoFailed && (
        <div className="relative z-10 w-full h-full flex items-center justify-center p-4">
          <video
            ref={videoRef}
            src={videoUrl}
            muted
            playsInline
            preload="auto"
            onEnded={() => setPhase('logo')}
            onError={() => setVideoFailed(true)}
            className="max-h-[82vh] max-w-[92vw] w-auto h-auto rounded-3xl shadow-2xl object-contain"
          />
        </div>
      )}

      {/* Pha 2: Logo Sky First Network xuất hiện tinh tế trước khi vào Trang chủ */}
      {(phase === 'logo' || phase === 'exiting' || !videoUrl || videoFailed) && (
        <div className="relative z-20 flex flex-col items-center text-center px-6 max-w-xl animate-in fade-in zoom-in-95 duration-500">
          <div className="rounded-[32px] bg-white p-6 sm:p-8 shadow-[0_28px_80px_rgba(0,0,0,0.4)] border border-sky-200/30">
            <img
              src={logoSrc}
              alt={siteName}
              className="h-16 sm:h-24 w-auto max-w-[280px] object-contain mx-auto"
            />
          </div>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-white/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200">
            <Sparkles size={13} />
            <span>{siteName}</span>
          </div>
          <p className="mt-3 text-sm sm:text-base font-medium text-slate-200 leading-relaxed">
            {tagline}
          </p>
        </div>
      )}
    </div>
  );
};

// --- Consolidated from EntityColorSystem.tsx ---

/**
 * Shared colour system for roles, titles, units, categories, tags and statuses.
 * It stays lightweight: colour metadata lives with the existing CMS document,
 * so rendering a badge never triggers a separate D1/Firestore query.
 */
export const ENTITY_COLOR_PRESETS = [
  '#0284C7', '#2563EB', '#1D4ED8', '#4F46E5', '#7C3AED', '#9333EA',
  '#C026D3', '#DB2777', '#E11D48', '#DC2626', '#EA580C', '#D97706',
  '#CA8A04', '#65A30D', '#16A34A', '#059669', '#0D9488', '#0891B2',
  '#475569', '#334155', '#0F766E', '#0369A1', '#6D28D9', '#BE123C',
] as const;

const FALLBACK_COLOR = '#0284C7';

const normalizeHex = (value?: string | null): string | null => {
  if (!value) return null;
  const raw = value.trim();
  const short = /^#([0-9a-f]{3})$/i.exec(raw);
  if (short) {
    const [r, g, b] = short[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toUpperCase();
  return null;
};

export const sanitizeEntityColor = (value?: string | null): string | undefined =>
  normalizeHex(value) || undefined;

const normalizeLabel = (input?: string | null): string =>
  String(input || '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('vi-VN');

const hashString = (input: string): number => {
  // FNV-1a 32-bit: deterministic and stable across refreshes/devices.
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

export const getDeterministicEntityColor = (label?: string | null): string => {
  const normalized = normalizeLabel(label);
  if (!normalized) return FALLBACK_COLOR;
  return ENTITY_COLOR_PRESETS[hashString(normalized) % ENTITY_COLOR_PRESETS.length];
};

export const resolveEntityColor = (label?: string | null, override?: string | null): string =>
  normalizeHex(override) || getDeterministicEntityColor(label);

export const getSemanticStatusColor = (status?: string | null): string => {
  const key = normalizeLabel(status);
  const semantic: Record<string, string> = {
    open: '#059669',
    active: '#059669',
    published: '#2563EB',
    approved: '#059669',
    completed: '#0D9488',
    upcoming: '#D97706',
    reviewing: '#2563EB',
    needs_info: '#D97706',
    draft: '#64748B',
    closed: '#64748B',
    inactive: '#64748B',
    rejected: '#DC2626',
    revoked: '#DC2626',
  };
  return semantic[key] || getDeterministicEntityColor(key || 'status');
};

const hexToRgb = (hex: string): [number, number, number] => {
  const clean = normalizeHex(hex) || FALLBACK_COLOR;
  return [
    Number.parseInt(clean.slice(1, 3), 16),
    Number.parseInt(clean.slice(3, 5), 16),
    Number.parseInt(clean.slice(5, 7), 16),
  ];
};

const rgbToHex = ([r, g, b]: [number, number, number]): string =>
  `#${[r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();

const mix = (a: string, b: string, weightOfB: number): string => {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const w = Math.max(0, Math.min(1, weightOfB));
  return rgbToHex([
    ar * (1 - w) + br * w,
    ag * (1 - w) + bg * w,
    ab * (1 - w) + bb * w,
  ]);
};

const channelLuminance = (channel: number): number => {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
};

const contrast = (a: string, b: string): number => {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
};

const readableTextOnTint = (base: string, background: string): string => {
  for (let amount = 0.12; amount <= 0.88; amount += 0.08) {
    const candidate = mix(base, '#000000', amount);
    if (contrast(candidate, background) >= 4.5) return candidate;
  }
  return '#111827';
};

export interface EntityBadgePalette {
  base: string;
  background: string;
  border: string;
  text: string;
  solidText: '#FFFFFF' | '#111827';
}

export const getEntityBadgePalette = (
  label?: string | null,
  override?: string | null,
): EntityBadgePalette => {
  const base = resolveEntityColor(label, override);
  const background = mix(base, '#FFFFFF', 0.88);
  const border = mix(base, '#FFFFFF', 0.62);
  const text = readableTextOnTint(base, background);
  const solidText = contrast(base, '#FFFFFF') >= contrast(base, '#111827') ? '#FFFFFF' : '#111827';
  return { base, background, border, text, solidText };
};

export const getEntityBadgeStyle = (
  label?: string | null,
  override?: string | null,
): CSSProperties => {
  const palette = getEntityBadgePalette(label, override);
  return {
    backgroundColor: palette.background,
    borderColor: palette.border,
    color: palette.text,
  };
};

interface EntityBadgeProps {
  label: string;
  color?: string | null;
  className?: string;
  solid?: boolean;
  title?: string;
}

export const EntityBadge: React.FC<EntityBadgeProps> = ({
  label,
  color,
  className = '',
  solid = false,
  title,
}) => {
  const palette = getEntityBadgePalette(label, color);
  return (
    <span
      title={title || label}
      className={`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[11px] font-black leading-5 ${className}`}
      style={
        solid
          ? { backgroundColor: palette.base, borderColor: palette.base, color: palette.solidText }
          : { backgroundColor: palette.background, borderColor: palette.border, color: palette.text }
      }
    >
      <span className="whitespace-normal break-words">{label}</span>
    </span>
  );
};

interface EntityColorPickerProps {
  label?: string;
  entityLabel: string;
  value?: string | null;
  onChange: (value: string | undefined) => void;
  helperText?: string;
  fallbackColor?: string;
}

export const EntityColorPicker: React.FC<EntityColorPickerProps> = ({
  label = 'Màu nhận diện',
  entityLabel,
  value,
  onChange,
  helperText = 'Để Tự động nếu muốn hệ thống gán màu ổn định theo tên. Cùng một nhãn luôn nhận cùng màu.',
  fallbackColor,
}) => {
  const custom = sanitizeEntityColor(value);
  const fallback = sanitizeEntityColor(fallbackColor);
  const resolved = custom || fallback || resolveEntityColor(entityLabel);

  return (
    <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-black uppercase tracking-wide text-slate-600">{label}</div>
          <div className="mt-1 text-[10px] leading-4 text-slate-500">{helperText}</div>
        </div>
        <EntityBadge label={entityLabel || 'Chưa đặt tên'} color={custom || fallback} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative h-9 w-11 overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm" title="Chọn màu tùy chỉnh">
          <input
            type="color"
            aria-label={`Chọn ${label.toLowerCase()}`}
            value={resolved}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            className="absolute -inset-1 h-12 w-14 cursor-pointer border-0 bg-transparent p-0"
          />
        </label>

        {ENTITY_COLOR_PRESETS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            aria-label={`Dùng màu ${color}`}
            title={color}
            className={`h-7 w-7 rounded-full border-2 shadow-sm transition hover:scale-110 ${
              custom === color ? 'border-slate-900 ring-2 ring-slate-300' : 'border-white'
            }`}
            style={{ backgroundColor: color }}
          />
        ))}

        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-100"
          title="Bỏ màu tùy chỉnh và dùng màu tự động ổn định"
        >
          <RotateCcw size={12} /> Tự động
        </button>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-slate-500">
        <code className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-700">{custom || `AUTO → ${resolved}`}</code>
        <span>•</span>
        <span>không tạo truy vấn riêng cho màu</span>
      </div>
    </div>
  );
};

// --- Consolidated from RichTextRenderer.tsx ---

interface RichTextRendererProps {
  content: string | string[];
  className?: string;
}

export const RichTextRenderer: React.FC<RichTextRendererProps> = ({ content, className = '' }) => {
  const text = Array.isArray(content) ? content.join('\n\n') : content;
  if (!text) return null;

  // The CMS rich editor stores HTML. Sanitize at the render boundary so pasted
  // Word/Docs content can be displayed without exposing script/event injection.
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return <div className={`prose-slate max-w-none ${className}`} dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }} />;
  }

  const lines = text.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let listBuffer: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = (key: string) => {
    if (!listBuffer) return null;
    const { type, items } = listBuffer;
    listBuffer = null;

    if (type === 'ul') {
      return (
        <ul key={key} className="space-y-2 my-4 pl-5 list-disc text-slate-700">
          {items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineFormatted(item)}
            </li>
          ))}
        </ul>
      );
    } else {
      return (
        <ol key={key} className="space-y-2 my-4 pl-5 list-decimal text-slate-700">
          {items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineFormatted(item)}
            </li>
          ))}
        </ol>
      );
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Check list item
    if (/^[-*•]\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^[-*•]\s+/, '');
      if (listBuffer && listBuffer.type === 'ul') {
        listBuffer.items.push(itemText);
      } else {
        if (listBuffer) renderedElements.push(flushList(`list-before-${idx}`));
        listBuffer = { type: 'ul', items: [itemText] };
      }
      return;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^\d+\.\s+/, '');
      if (listBuffer && listBuffer.type === 'ol') {
        listBuffer.items.push(itemText);
      } else {
        if (listBuffer) renderedElements.push(flushList(`list-before-${idx}`));
        listBuffer = { type: 'ol', items: [itemText] };
      }
      return;
    }

    // Flush any pending list before rendering other block elements
    if (listBuffer) {
      renderedElements.push(flushList(`list-${idx}`));
    }

    // Empty line
    if (!trimmed) {
      return;
    }

    // Horizontal rule
    if (/^---|\*\*\*|___$/.test(trimmed)) {
      renderedElements.push(<hr key={idx} className="my-6 border-slate-200" />);
      return;
    }

    // Headings
    if (trimmed.startsWith('#### ')) {
      renderedElements.push(
        <h4 key={idx} className="text-base sm:text-lg font-bold text-slate-900 mt-5 mb-2 tracking-tight">
          {renderInlineFormatted(trimmed.slice(5))}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith('### ')) {
      renderedElements.push(
        <h3 key={idx} className="text-lg sm:text-xl font-bold text-slate-900 mt-6 mb-2.5 tracking-tight">
          {renderInlineFormatted(trimmed.slice(4))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      renderedElements.push(
        <h2 key={idx} className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-7 mb-3 tracking-tight border-b border-slate-100 pb-1.5">
          {renderInlineFormatted(trimmed.slice(3))}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith('# ')) {
      renderedElements.push(
        <h1 key={idx} className="text-2xl sm:text-3xl font-black text-slate-900 mt-8 mb-4 tracking-tight">
          {renderInlineFormatted(trimmed.slice(2))}
        </h1>
      );
      return;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      renderedElements.push(
        <blockquote
          key={idx}
          className="border-l-4 border-[#0284C7] bg-sky-50/60 pl-4 py-3 my-4 rounded-r-xl text-slate-700 italic font-medium"
        >
          {renderInlineFormatted(trimmed.slice(2))}
        </blockquote>
      );
      return;
    }

    // Regular paragraph
    renderedElements.push(
      <p key={idx} className="my-3 text-slate-700 leading-relaxed text-sm sm:text-base">
        {renderInlineFormatted(trimmed)}
      </p>
    );
  });

  if (listBuffer) {
    renderedElements.push(flushList('list-end'));
  }

  return <div className={`prose-slate max-w-none ${className}`}>{renderedElements}</div>;
};

/**
 * Parses inline formatting:
 * **bold** or <b>bold</b>
 * *italic* or <i>italic</i>
 * <u>underline</u>
 * [text](url)
 */
function renderInlineFormatted(str: string): React.ReactNode {
  // Convert HTML <b>, <i>, <u> tags to normalized markdown tags first
  let text = str
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*');

  // Regex tokenizer to split tokens
  // Matches: **bold**, *italic*, <u>underline</u>, [label](url)
  const regex = /(\*\*.*?\*\*|\*.*?\*|<u>.*?<\/u>|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Bold **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={index} className="italic text-slate-800">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Underline <u>text</u>
    if (part.startsWith('<u>') && part.endsWith('</u>') && part.length >= 7) {
      return (
        <u key={index} className="underline decoration-[#0284C7] decoration-1 underline-offset-2">
          {part.slice(3, -4)}
        </u>
      );
    }

    // Link [label](url)
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#0284C7] hover:underline font-semibold inline-flex items-center gap-0.5"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return part;
  });
}

// --- Consolidated from MediaInputs.tsx ---


// -----------------------------------------------------------------------------
// Preserved component source: ImageUrlInput.tsx
// -----------------------------------------------------------------------------

interface Props{label?:string;value?:string;onChange:(url:string)=>void;helperText?:string;category?:string;placeholder?:string}
export const ImageUrlInput:React.FC<Props>=({label='Ảnh',value='',onChange,helperText,placeholder})=>{
 const id=useId(),inputRef=useRef<HTMLInputElement|null>(null);const [uploading,setUploading]=useState(false),[error,setError]=useState(''),[picker,setPicker]=useState(false),[broken,setBroken]=useState(false);
 const upload=async(file:File)=>{setUploading(true);setError('');try{const d=await uploadMedia(file,true);onChange(d.url);setBroken(false)}catch(e){setError(e instanceof Error?e.message:'Không thể tải ảnh.')}finally{setUploading(false);if(inputRef.current)inputRef.current.value=''}};
 return <div className="space-y-3"><label htmlFor={id} className="text-xs font-bold text-slate-700">{label}</label><div className="flex gap-2 flex-wrap"><input ref={inputRef} type="file" accept={MEDIA_ACCEPT.replace(',application/pdf','')} className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f)}}/><button type="button" disabled={uploading} onClick={()=>inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 disabled:opacity-60">{uploading?<Loader2 size={15} className="animate-spin"/>:<UploadCloud size={15}/>} {uploading?'Đang tải…':'Tải ảnh lên'}</button><button type="button" onClick={()=>setPicker(true)} className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-xs font-semibold"><Images size={15}/>Chọn từ thư viện</button>{value&&<button type="button" onClick={()=>{onChange('');setBroken(false)}} className="border rounded-lg p-2 text-slate-500" aria-label="Gỡ ảnh"><X size={15}/></button>}</div><input id={id} type="text" inputMode="url" value={value} onChange={e=>{onChange(e.target.value);setBroken(false)}} placeholder={placeholder||'Liên kết ảnh hoặc /media/…'} className="w-full border rounded-xl px-3 py-2 text-xs"/>{error&&<p role="alert" className="flex gap-2 text-xs text-rose-700"><AlertCircle size={14}/>{error}</p>}{value&&<div className="bg-slate-50 border rounded-xl p-3">{!broken?<img src={value} alt={`Xem trước ${label.toLowerCase()}`} onError={()=>setBroken(true)} className="max-h-40 w-full object-contain"/>:<p className="text-xs text-amber-700">Ảnh không tải được. Kiểm tra liên kết hoặc chọn một ảnh khác.</p>}</div>}<p className="text-[11px] text-slate-500">{helperText||'Ảnh lưu trong thư viện để sử dụng lại. Tối đa 20 MB; giữ nguyên tệp và tỷ lệ ảnh gốc.'}</p>{picker&&<MediaPicker onClose={()=>setPicker(false)} onSelect={item=>{onChange(item.url);setBroken(false);setPicker(false)}}/>}</div>;
};


// -----------------------------------------------------------------------------
// Preserved component source: MediaPicker.tsx
// -----------------------------------------------------------------------------

export const MediaPicker:React.FC<{onSelect:(item:MediaItem)=>void;onClose:()=>void;imageOnly?:boolean}>=({onSelect,onClose,imageOnly=true})=>{
 const [items,setItems]=useState<MediaItem[]>([]),[cursor,setCursor]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[query,setQuery]=useState('');
 const load=async(next?:string)=>{setBusy(true);setError('');try{const d=await listMedia(next);setItems(prev=>next?[...prev,...d.items]:d.items);setCursor(d.cursor)}catch(e){setError(e instanceof Error?e.message:'Không tải được thư viện.')}finally{setBusy(false)}};
 useEffect(()=>{void load();const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous}},[]);
 useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape)},[onClose]);
 const visible=items.filter(x=>(!imageOnly||x.type.startsWith('image/'))&&(x.name+' '+(x.alt||'')).toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')));
 return <div className="fixed inset-0 z-[200] bg-slate-950/60 p-3 sm:p-7 flex items-center justify-center" onClick={e=>{if(e.target===e.currentTarget)onClose()}}><section role="dialog" aria-modal="true" aria-label="Chọn ảnh từ thư viện" className="bg-white w-full max-w-5xl rounded-2xl max-h-[88vh] overflow-hidden flex flex-col shadow-2xl"><header className="p-5 border-b flex justify-between gap-4"><div><h3 className="font-bold text-lg">Thư viện hình ảnh</h3><p className="text-xs text-slate-500">Chọn một ảnh đã tải lên để tái sử dụng.</p></div><button type="button" aria-label="Đóng thư viện" onClick={onClose}><X size={22}/></button></header><div className="p-5 overflow-auto"><label className="flex border rounded-xl gap-3 items-center p-3 mb-5"><Search size={17}/><input autoFocus aria-label="Tìm ảnh" className="outline-none flex-1 text-sm" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm theo tên hoặc mô tả ảnh…"/></label>{error&&<p role="alert" className="text-rose-700 text-sm mb-4">{error}</p>}<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">{visible.map(item=><button type="button" key={item.key} aria-label={`Chọn ${item.name}`} onClick={()=>onSelect(item)} className="rounded-xl border overflow-hidden text-left hover:border-sky-500 focus:ring-2 focus:ring-sky-500"><div className="aspect-square bg-slate-50 p-2">{item.type.startsWith('image/')?<img src={item.url} alt={item.alt||item.name} loading="lazy" className="w-full h-full object-contain"/>:<ImageIcon className="m-auto"/>}</div><p className="p-2 text-[11px] truncate">{item.name}</p></button>)}</div>{!busy&&!visible.length&&<p className="p-8 text-center text-sm text-slate-500">Chưa có ảnh phù hợp. Tải ảnh tại mục Thư viện hoặc trường ảnh của bài viết.</p>}{busy?<p className="py-5 flex justify-center items-center gap-2"><Loader2 className="animate-spin" size={18}/>Đang tải…</p>:cursor&&<button type="button" onClick={()=>void load(cursor)} className="mt-5 px-4 py-2 border rounded-lg text-sm">Tải thêm ảnh</button>}</div></section></div>;
};
