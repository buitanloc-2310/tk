import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Building2,
  GraduationCap,
  HeartHandshake,
  Megaphone,
  Network,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

import { PageRoute, Program, NewsArticle, CounterAnimationConfig } from '../types';
import { EntityBadge } from '../components/UIPrimitives';
import { useDataContext } from '../context/DataContext';

const AnimatedStat: React.FC<{ value: string; config?: CounterAnimationConfig }> = ({ value, config }) => {
  const [shown, setShown] = useState('0');
  const lastTarget = useRef<string>('');
  useEffect(() => {
    const raw = String(value ?? '').trim();
    if (!raw || raw === lastTarget.current) return;
    const match = raw.match(/-?[\d.,]+/);
    if (!match) {
      setShown(raw);
      lastTarget.current = raw;
      return;
    }
    const numeric = Number(match[0].replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(numeric)) {
      setShown(raw);
      lastTarget.current = raw;
      return;
    }
    lastTarget.current = raw;
    const prefix = config?.prefix ?? raw.slice(0, raw.indexOf(match[0]));
    const suffix = config?.suffix ?? raw.slice(raw.indexOf(match[0]) + match[0].length);
    const format = (n: number) => {
      const rounded = Math.round(n);
      const body =
        config?.numberFormat === 'plain'
          ? String(rounded)
          : config?.numberFormat === 'en'
          ? rounded.toLocaleString('en-US')
          : rounded.toLocaleString('vi-VN');
      return `${prefix}${body}${suffix}`;
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || numeric === 0) {
      setShown(format(numeric));
      return;
    }
    setShown(format(0));
    const duration = Math.max(0.25, Math.min(60, Number(config?.durationSeconds || 10))) * 1000;
    const mode = config?.mode || 'smooth';
    const baseStep = Math.max(1, Math.abs(Number(config?.step || 1)));
    const step =
      mode === 'large'
        ? Math.max(baseStep, Math.ceil(Math.abs(numeric) / 50))
        : mode === 'small'
        ? Math.max(1, Math.ceil(Math.abs(numeric) / 500))
        : mode === 'even'
        ? Math.max(2, baseStep)
        : baseStep;
    const ease = (t: number) =>
      config?.easing === 'linear' ? t : config?.easing === 'ease-out' ? 1 - Math.pow(1 - t, 3) : t * t * (3 - 2 * t);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      let current = numeric * ease(progress);
      if (mode !== 'smooth' && progress < 1) current = Math.floor(current / step) * step;
      current = numeric >= 0 ? Math.min(numeric, Math.max(0, current)) : Math.max(numeric, Math.min(0, current));
      setShown(format(progress >= 1 ? numeric : current));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [
    value,
    config?.durationSeconds,
    config?.mode,
    config?.step,
    config?.easing,
    config?.prefix,
    config?.suffix,
    config?.numberFormat,
  ]);
  const size =
    config?.fontSize === 'small'
      ? '1.25rem'
      : config?.fontSize === 'medium'
      ? '1.5rem'
      : config?.fontSize === 'xlarge'
      ? '2.25rem'
      : config?.fontSize === 'custom'
      ? config.customFontSize || '1.75rem'
      : '1.75rem';
  return (
    <span className="tabular-nums" style={{ fontSize: size }}>
      {shown}
    </span>
  );
};

interface HomePageProps {
  onNavigate: (page: PageRoute, slug?: string) => void;
  onSelectProgram?: (program: Program) => void;
  onSelectArticle?: (article: NewsArticle) => void;
  visualEditMode?: boolean;
  onEditSection?: (section: Key) => void;
}

type Key =
  | 'hero'
  | 'direction'
  | 'pillars'
  | 'programs'
  | 'units'
  | 'certificate'
  | 'values'
  | 'news'
  | 'transparency'
  | 'cta';

const DEFAULT_ORDER: Key[] = [
  'hero',
  'pillars',
  'news',
  'programs',
  'values',
  'transparency',
  'units',
  'cta',
];

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onSelectProgram,
  onSelectArticle,
  visualEditMode = false,
  onEditSection,
}) => {
  const { programs, networkUnits, newsArticles, siteConfig, corePillars } = useDataContext();

  const publishedPrograms = programs.filter((p) => p.isPublished !== false).slice(0, 5);
  const publishedUnits = networkUnits.filter((u) => u.isPublished !== false).slice(0, 8);

  const publishedNews = newsArticles
    .filter((n) => n.isPublished !== false)
    .sort((a, b) => Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)))
    .slice(0, 8);
  const featuredNews = publishedNews.find((n) => n.isFeatured) || publishedNews[0];
  const standardNews = publishedNews.filter((n) => n.id !== featuredNews?.id).slice(0, 6);

  const visible = siteConfig.homeSections || {};

  const saved = (siteConfig.homeSectionOrder || []).filter(
    (x): x is Key => DEFAULT_ORDER.includes(x as Key) && x !== 'direction' && x !== 'certificate'
  );

  const order: Key[] = [...new Set<Key>(saved), ...DEFAULT_ORDER.filter((x) => !saved.includes(x))];

  const pillarIcons = [GraduationCap, Users, HeartHandshake, Network, Megaphone];

  const pillars = corePillars.slice(0, 5).map((p, i) => [p.title, p.shortDesc, pillarIcons[i] || GraduationCap] as const);

  const values = siteConfig.coreValues || [];

  const section: Record<Key, React.ReactNode> = {
    hero: (
      <section className="sf-home-hero relative overflow-hidden bg-[#061A3A] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-[#0B66C3]/20 blur-3xl" />
          <div className="absolute right-[-130px] top-[80px] h-[520px] w-[520px] rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-[linear-gradient(165deg,transparent_0%,transparent_48%,rgba(14,165,233,.14)_49%,rgba(14,165,233,.04)_72%,transparent_73%)]" />
        </div>
        <div className="relative mx-auto max-w-[1500px] px-5 pb-8 pt-14 sm:px-6 lg:px-8 lg:pb-10 lg:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-[.95fr_1.05fr] lg:gap-14">
            <div className="max-w-3xl">
              <p className="mb-6 text-[11px] font-black uppercase tracking-[.24em] text-cyan-300">
                {siteConfig.heroBadge || siteConfig.siteName}
              </p>
              <h1 className="text-[42px] font-black leading-[1.08] tracking-[-.045em] sm:text-5xl lg:text-[64px]">
                {siteConfig.heroHeading || 'Kết nối tri thức. Phát triển người trẻ. Lan tỏa giá trị cộng đồng.'}
              </h1>
              <p className="mt-6 max-w-2xl text-sm leading-8 text-slate-300 sm:text-base">{siteConfig.heroSubtext}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={() => navigateUrl(siteConfig.heroButton1Url || '/about', onNavigate)}
                  className="inline-flex items-center gap-3 rounded-2xl bg-[#078DE3] px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-sky-950/20 transition hover:-translate-y-0.5 hover:bg-[#0B9AED]"
                >
                  {siteConfig.heroButton1Text || 'Khám phá mạng lưới'}
                  <ArrowRight size={17} />
                </button>
                <button
                  onClick={() => navigateUrl(siteConfig.heroButton2Url || '/join', onNavigate)}
                  className="inline-flex items-center gap-3 rounded-2xl border border-white/35 bg-white/5 px-5 py-3.5 text-sm font-black text-white backdrop-blur transition hover:bg-white/10"
                >
                  {siteConfig.heroButton2Text || 'Tham gia cùng chúng tôi'}
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>

            <div className="sf-hero-visual relative min-h-[360px] overflow-hidden rounded-[36px] border border-white/15 bg-gradient-to-br from-[#0B315E]/80 via-[#0B4D96]/70 to-[#071B3A] p-6 shadow-[0_30px_90px_rgba(0,0,0,.25)] sm:min-h-[420px]">
              {siteConfig.heroImageUrl ? (
                <div className="relative z-10 flex h-full min-h-[310px] items-center justify-center overflow-hidden rounded-3xl">
                  <img
                    src={siteConfig.heroImageUrl}
                    alt={siteConfig.heroHeading || siteConfig.siteName}
                    className={
                      siteConfig.heroImageFit === 'cover'
                        ? 'h-full w-full object-cover rounded-3xl'
                        : 'block h-auto max-h-[420px] w-auto max-w-full object-contain rounded-3xl mx-auto'
                    }
                  />
                </div>
              ) : (
                <>
                  <div className="absolute inset-0 opacity-90">
                    <div className="absolute left-[8%] top-[14%] h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_28px_8px_rgba(103,232,249,.32)]" />
                    <div className="absolute right-[12%] top-[18%] h-3 w-3 rotate-45 border-2 border-white/80" />
                    <div className="absolute left-[45%] top-[8%] h-28 w-28 rounded-full border border-cyan-300/25" />
                    <div className="absolute bottom-[-80px] left-[14%] h-[300px] w-[300px] rounded-full border-[34px] border-sky-300/10" />
                    <div className="absolute bottom-[-110px] right-[-35px] h-[340px] w-[340px] rounded-full border-[42px] border-cyan-300/10" />
                  </div>
                  <div className="relative z-10 flex h-full min-h-[310px] flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[.15em] text-cyan-100">
                        <Sparkles size={13} /> Sky First Network
                      </div>
                      <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/10 text-cyan-200">
                        <Network size={22} />
                      </div>
                    </div>
                    <div className="mx-auto w-full max-w-[520px]">
                      <div className="relative mx-auto h-44 max-w-[430px]">
                        <div className="absolute bottom-0 left-1/2 h-32 w-[82%] -translate-x-1/2 rounded-[50%] border-[10px] border-cyan-300/80 border-t-transparent rotate-[-7deg]" />
                        <div className="absolute bottom-3 left-1/2 h-28 w-[70%] -translate-x-1/2 rounded-[50%] border-[8px] border-sky-100/90 border-t-transparent rotate-[7deg]" />
                        <div className="absolute left-1/2 top-0 -translate-x-1/2 text-center">
                          <Sparkles className="mx-auto text-cyan-300" size={38} />
                          <p className="mt-3 text-2xl font-black tracking-tight">Giáo dục · Người trẻ · Cộng đồng</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-bold text-slate-200">
                      <span className="rounded-xl bg-white/7 px-3 py-2">Học tập</span>
                      <span className="rounded-xl bg-white/7 px-3 py-2">Kết nối</span>
                      <span className="rounded-xl bg-white/7 px-3 py-2">Đóng góp</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-9 grid overflow-hidden rounded-[26px] border border-white/15 bg-[#071B3A]/80 shadow-2xl backdrop-blur sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['membersCount', siteConfig.stats.membersCount, siteConfig.stats.membersLabel || 'Thành viên', Users],
              ['communityProjects', siteConfig.stats.communityProjects, siteConfig.stats.projectsLabel || 'Chương trình & hoạt động', BookOpen],
              ['provincesCount', siteConfig.stats.provincesCount, siteConfig.stats.provincesLabel || 'Địa bàn hoạt động', Network],
              ['volunteerHours', siteConfig.stats.volunteerHours, siteConfig.stats.hoursLabel || 'Giờ hoạt động', HeartHandshake],
            ].map(([key, value, label, Icon]: any, index) => (
              <div
                key={String(label)}
                className={`flex items-center gap-4 px-5 py-4 ${index ? 'border-t border-white/10 sm:border-t-0 sm:border-l' : ''}`}
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/8 text-cyan-300">
                  <Icon size={19} />
                </span>
                <div>
                  <p className="font-black leading-none">
                    <AnimatedStat value={String(value ?? '0')} config={(siteConfig.counterAnimation as any)?.[key]} />
                  </p>
                  <p className="mt-1.5 text-xs text-slate-300">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),

    direction: null,
    certificate: null,

    pillars: (
      <section className="relative overflow-hidden bg-white py-20 lg:py-28">
        <div className="pointer-events-none absolute right-[-120px] top-[-80px] h-[360px] w-[360px] rounded-full bg-sky-100/40 blur-[100px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 grid gap-6 lg:grid-cols-[.55fr_1.45fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-xs font-black uppercase tracking-[.17em] text-[#0B5FB4]">
                <Sparkles size={14} />
                {siteConfig.pillarsHeading || 'Lĩnh vực hoạt động'}
              </div>
            </div>

            <div>
              <h2 className="max-w-4xl text-4xl font-black tracking-[-.045em] text-slate-950 sm:text-5xl lg:text-[54px] lg:leading-[1.05]">
                {siteConfig.pillarsSubtext || 'Những lĩnh vực Sky First Network tập trung phát triển.'}
              </h2>

              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-500">
                Mỗi lĩnh vực là một hướng kết nối giữa học tập, trải nghiệm, kỹ năng và giá trị cộng đồng.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {pillars.map(([title, desc, Icon], i) => (
              <article
                key={String(title)}
                className="group relative min-h-[300px] overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-sky-200 hover:shadow-[0_18px_45px_rgba(15,94,160,.11)]"
              >
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-50 transition-transform duration-500 group-hover:scale-125" />

                <div className="relative flex items-start justify-between">
                  <span className="text-xs font-black tracking-[.14em] text-slate-400">0{i + 1}</span>

                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-sky-50 to-cyan-50 text-[#0B5FB4] ring-1 ring-sky-100 transition group-hover:scale-105">
                    <Icon size={22} />
                  </span>
                </div>

                <div className="relative mt-20">
                  <h3 className="text-xl font-black tracking-[-.02em] text-slate-950">{title}</h3>

                  <p className="mt-3 text-sm leading-7 text-slate-500">{desc}</p>
                </div>

                <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-[#0B5FB4] to-emerald-400 transition-all duration-300 group-hover:w-full" />
              </article>
            ))}
          </div>
        </div>
      </section>
    ),

    programs: (
      <section className="relative overflow-hidden bg-[#F5F9FD] py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="text-xs font-black uppercase tracking-[.18em] text-[#0B5FB4]">
                {siteConfig.programsLabel || 'Chương trình & hoạt động'}
              </div>
              <h2 className="mt-2 text-3xl font-black tracking-[-.04em] text-slate-950 sm:text-4xl">
                {siteConfig.programsHeading || 'Bảng tin hoạt động'}
              </h2>
            </div>
            <button onClick={() => onNavigate('programs')} className="group inline-flex items-center gap-2 font-black text-[#0B5FB4]">
              Xem tất cả <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
          {publishedPrograms.length === 0 ? (
            <div className="rounded-[26px] border border-dashed border-slate-300 bg-white p-10 text-slate-500">
              Chưa có chương trình được công bố.
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
              {(() => {
                const lead = publishedPrograms[0] as any;
                return (
                  <article
                    onClick={() => onSelectProgram?.(lead)}
                    className="group cursor-pointer overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm"
                  >
                    {/* Hiển thị toàn bộ ảnh theo tỷ lệ gốc mặc định, không cắt mất chữ trên poster/A4 */}
                    <div className="overflow-hidden bg-slate-50 flex items-center justify-center min-h-[220px]">
                      {lead.imageUrl ? (
                        <img
                          src={lead.imageUrl}
                          alt={lead.title}
                          className={
                            lead.imageFit === 'cover'
                              ? 'aspect-video w-full object-cover transition duration-500 group-hover:scale-[1.02]'
                              : 'block h-auto max-h-[540px] w-auto max-w-full mx-auto object-contain transition duration-500'
                          }
                        />
                      ) : (
                        <div className="grid h-56 w-full place-items-center text-sky-300">
                          <BookOpen size={52} />
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <EntityBadge label={lead.categoryLabel || 'Hoạt động'} color={lead.categoryColor} />
                      <h3 className="mt-3 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{lead.title}</h3>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{lead.summary}</p>
                      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                        <span>{lead.date || 'Đang cập nhật'}</span>
                        <span className="font-black text-[#0B5FB4]">Xem chi tiết →</span>
                      </div>
                    </div>
                  </article>
                );
              })()}
              <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
                {publishedPrograms.slice(1, 5).map((p: any, i) => (
                  <button
                    key={p.id}
                    onClick={() => onSelectProgram?.(p)}
                    className={`group flex w-full items-center gap-4 p-4 text-left hover:bg-sky-50/70 transition ${
                      i ? 'border-t border-slate-100' : ''
                    }`}
                  >
                    <div className="h-24 w-36 shrink-0 overflow-hidden rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center p-1">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.title}
                          className={p.imageFit === 'cover' ? 'h-full w-full object-cover' : 'max-h-full max-w-full object-contain'}
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-sky-300">
                          <GraduationCap size={28} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-black uppercase tracking-[.12em] text-[#0B66C3]">
                        {p.categoryLabel || 'Hoạt động'}
                      </div>
                      <h3 className="mt-1 line-clamp-2 text-base font-black leading-5 text-slate-950 group-hover:text-[#0B66C3]">
                        {p.title}
                      </h3>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">{p.summary}</p>
                    </div>
                    <ArrowRight size={17} className="shrink-0 text-slate-300 group-hover:text-[#0B66C3]" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    ),

    units: (
      <section className="bg-white py-12 lg:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[.18em] text-[#0B5FB4]">
                {siteConfig.unitsLabel || 'Đơn vị trực thuộc'}
              </div>
              <h2 className="mt-2 text-3xl font-black tracking-[-.04em] text-slate-950 sm:text-4xl">
                {siteConfig.unitsHeading || 'Hệ sinh thái hoạt động chuyên môn'}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">{siteConfig.unitsIntro}</p>
            </div>
            <button onClick={() => onNavigate('units')} className="inline-flex items-center gap-2 text-sm font-black text-[#0B5FB4]">
              Xem hệ sinh thái <ArrowRight size={16} />
            </button>
          </div>
          <div className="mt-7 flex gap-4 overflow-x-auto pb-2 snap-x">
            {publishedUnits.map((u: any) => (
              <article
                key={u.id}
                className="group flex min-w-[310px] max-w-[430px] flex-1 snap-start items-center gap-4 rounded-[22px] border border-slate-200 bg-white p-4 hover:border-sky-200 hover:shadow-lg transition"
              >
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-2">
                  {u.imageUrl ? (
                    <img src={u.imageUrl} alt={u.name} className="h-full w-full object-contain" />
                  ) : (
                    <Building2 className="text-[#0B5FB4]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-black text-slate-900">{u.name}</h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{u.tagline}</p>
                  <div className="mt-2 text-[10px] font-bold uppercase tracking-wide text-[#0B66C3]">
                    {u.categoryLabel || 'Đơn vị chuyên môn'}
                  </div>
                </div>
                <ArrowUpRight size={18} className="shrink-0 text-slate-300 group-hover:text-[#0B5FB4]" />
              </article>
            ))}
          </div>
        </div>
      </section>
    ),

    values: (
      <section className="bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="text-xs font-black uppercase tracking-[.18em] text-[#0B5FB4]">
              {siteConfig.valuesLabel || 'Giá trị cốt lõi'}
            </div>

            <h2 className="mt-3 text-4xl font-black tracking-[-.04em] text-slate-950 sm:text-5xl">{siteConfig.valuesHeading}</h2>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v, i) => (
              <div
                key={v.name}
                className="group rounded-[26px] border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#0B5FB4]">0{i + 1}</span>

                  <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-sky-400 to-emerald-400" />
                </div>

                <h3 className="mt-5 text-xl font-black text-slate-950">{v.name}</h3>

                <p className="mt-3 text-sm leading-7 text-slate-500">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),

    news: (
      <section className="bg-[#F5F9FD] py-16 lg:py-20">
        <div className="mx-auto max-w-[1380px] px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="text-xs font-black uppercase tracking-[.18em] text-[#0B5FB4]">
                {siteConfig.newsLabel || 'Tin tức & hoạt động'}
              </div>
              <h2 className="mt-2 text-3xl font-black tracking-[-.04em] text-slate-950 sm:text-4xl">
                {siteConfig.newsHeading || 'Cập nhật từ mạng lưới'}
              </h2>
            </div>
            <button onClick={() => onNavigate('news')} className="group inline-flex items-center gap-2 text-sm font-black text-[#0B5FB4]">
              Xem tất cả tin <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
          {publishedNews.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-8 text-slate-500">
              Chưa có tin tức được công bố.
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="grid gap-4 sm:grid-cols-2">
                {standardNews.map((n: any) => (
                  <article
                    key={n.id}
                    onClick={() => onSelectArticle?.(n)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') onSelectArticle?.(n);
                    }}
                    className="group cursor-pointer rounded-[22px] border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    {n.imageUrl && (
                      <div className="mb-4 overflow-hidden rounded-2xl bg-slate-50 border border-slate-100">
                        <img
                          src={n.imageUrl}
                          alt={n.imageAlt || n.imageDescription || n.title}
                          className="block h-auto w-auto max-w-full mx-auto object-contain"
                        />
                      </div>
                    )}
                    <div className="text-[11px] font-bold text-slate-400">
                      {n.categoryLabel || 'Tin Sky First'} · {n.publishedAt}
                    </div>
                    <h3 className="mt-2 text-lg font-black leading-snug text-slate-950">{n.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{n.summary}</p>
                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#0B5FB4]">
                      Đọc bài <ArrowRight size={14} />
                    </div>
                  </article>
                ))}
              </div>
              {featuredNews && (
                <aside className="order-first lg:order-none lg:sticky lg:top-[96px] lg:self-start rounded-[26px] border border-sky-200 bg-white p-5 shadow-[0_18px_55px_rgba(7,27,58,.08)]">
                  <div className="inline-flex rounded-full bg-sky-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-[#0B66C3]">
                    Nổi bật
                  </div>
                  {featuredNews.imageUrl && (
                    <div className="mt-4 overflow-hidden rounded-2xl bg-slate-50 border border-slate-100">
                      <img
                        src={featuredNews.imageUrl}
                        alt={featuredNews.imageAlt || featuredNews.imageDescription || featuredNews.title}
                        className="block h-auto w-auto max-w-full mx-auto object-contain"
                      />
                    </div>
                  )}
                  <div className="mt-4 text-[11px] font-bold text-slate-400">
                    {featuredNews.categoryLabel || 'Tin Sky First'} · {featuredNews.publishedAt}
                  </div>
                  <h3 className="mt-2 text-xl font-black leading-snug text-slate-950">{featuredNews.title}</h3>
                  <p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-500">{featuredNews.summary}</p>
                  <button
                    onClick={() => onSelectArticle?.(featuredNews)}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#0B5FB4]"
                  >
                    Đọc bài nổi bật <ArrowRight size={14} />
                  </button>
                </aside>
              )}
            </div>
          )}
        </div>
      </section>
    ),

    transparency: (
      <section className="bg-white py-14 lg:py-18">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 rounded-[30px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-7 sm:p-9 lg:flex-row lg:items-center">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-sky-50 text-[#0B5FB4] ring-1 ring-sky-100">
              <ShieldCheck size={25} />
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-black tracking-[-.025em] text-slate-950">{siteConfig.transparencyHeading}</h2>

              <p className="mt-2 max-w-3xl leading-7 text-slate-500">{siteConfig.transparencyText}</p>
            </div>

            <button
              onClick={() => navigateUrl(siteConfig.transparencyButtonUrl || '/phap-ly-minh-bach', onNavigate)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-black text-slate-800 transition hover:border-sky-200 hover:text-[#0B5FB4]"
            >
              {siteConfig.transparencyButtonText || 'Tìm hiểu thêm'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>
    ),

    cta: (
      <section className="bg-white px-4 py-14 sm:px-6 lg:px-8 lg:py-18">
        <div className="mx-auto max-w-[1380px] overflow-hidden rounded-[30px] bg-[#071B3A] px-6 py-9 text-white shadow-[0_20px_60px_rgba(7,27,58,.14)] sm:px-9 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:px-12 lg:py-11">
          <div className="max-w-3xl">
            <div className="text-[11px] font-black uppercase tracking-[.18em] text-sky-300">Kết nối & Đồng hành</div>
            <h2 className="mt-3 text-3xl font-black tracking-[-.035em] sm:text-4xl">
              {siteConfig.ctaHeading || 'Kết nối cùng Sky First Network'}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">{siteConfig.ctaSubtext}</p>
          </div>
          <div className="mt-6 flex shrink-0 flex-wrap gap-3 lg:mt-0 lg:justify-end">
            <button
              onClick={() => navigateUrl(siteConfig.ctaButtonUrl || '/join', onNavigate)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-[#071B3A] transition hover:-translate-y-0.5"
            >
              {siteConfig.ctaButtonText || 'Tham gia'}
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigateUrl(siteConfig.ctaSecondaryButtonUrl || '/contact', onNavigate)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
            >
              {siteConfig.ctaSecondaryButtonText || 'Liên hệ hợp tác'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>
    ),
  };

  return (
    <main className="bg-white">
      {order
        .filter((k) => k !== 'direction' && k !== 'certificate' && visible[k] !== false)
        .map((k) => (
          <div key={k} className={visualEditMode ? 'relative visual-editor-section' : undefined}>
            {visualEditMode && (
              <button
                type="button"
                onClick={() => onEditSection?.(k)}
                className="absolute right-5 top-5 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border border-sky-200 bg-white text-sky-700 shadow-lg hover:bg-sky-50"
                title={`Chỉnh sửa ${k}`}
                aria-label={`Chỉnh sửa ${k}`}
              >
                ✎
              </button>
            )}
            {section[k]}
          </div>
        ))}
      {Array.isArray((siteConfig as any).customHomeBlocks) &&
        ((siteConfig as any).customHomeBlocks as any[]).map((b: any) => (
          <section
            key={b.id}
            className={`px-4 py-12 sm:px-6 lg:px-8 ${
              b.background === 'navy'
                ? 'bg-[#071B3A] text-white'
                : b.background === 'soft'
                ? 'bg-[#F4F8FC] text-slate-900'
                : 'bg-white text-slate-900'
            }`}
          >
            <div className="mx-auto max-w-[1380px]">
              {b.subtitle && (
                <div className="text-[11px] font-black uppercase tracking-[.16em] text-[#0B66C3]">
                  {b.subtitle}
                </div>
              )}
              {b.title && <h2 className="mt-2 text-2xl sm:text-3xl font-black">{b.title}</h2>}
              {b.body && <p className="mt-3 text-sm sm:text-base leading-7 opacity-90 whitespace-pre-line">{b.body}</p>}
              {b.imageUrl && (
                <div className="mt-5 overflow-hidden rounded-2xl">
                  <img src={b.imageUrl} alt={b.imageAlt || b.title || ''} className="w-full h-auto object-contain max-h-[540px]" />
                </div>
              )}
              {b.buttonLabel && (
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => navigateUrl(b.buttonUrl || '/contact', onNavigate)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0B66C3] px-5 py-2.5 text-xs sm:text-sm font-black text-white"
                  >
                    <span>{b.buttonLabel}</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </div>
          </section>
        ))}
    </main>
  );
};

function navigateUrl(url: string, onNavigate: (page: PageRoute, slug?: string) => void) {
  const map: Record<string, PageRoute> = {
    '/': 'home',
    '/about': 'about',
    '/join': 'join',
    '/certificate': 'certificate',
    '/programs': 'programs',
    '/units': 'units',
    '/news': 'news',
    '/contact': 'contact',
  };

  if (map[url]) {
    onNavigate(map[url]);
  } else {
    try {
      const target = new URL(url, window.location.origin);
      if (!['http:', 'https:'].includes(target.protocol)) return;
      if (target.origin === window.location.origin) {
        const path = target.pathname.split('/').filter(Boolean);
        if (path[0] === 'tin-tuc' && path[1]) {
          onNavigate('news-detail', decodeURIComponent(path[1]));
          return;
        }
        if (path[0] === 'du-an' && path[1]) {
          onNavigate('program-detail', decodeURIComponent(path[1]));
          return;
        }
        if (path.length === 1) {
          onNavigate('custom-page', decodeURIComponent(path[0]));
          return;
        }
      }
      window.location.assign(target.href);
    } catch {
      return;
    }
  }
}
