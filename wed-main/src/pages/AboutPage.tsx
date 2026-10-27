import React from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  GraduationCap,
  Heart,
  HeartHandshake,
  Network,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';

import { motion } from 'motion/react';
import { CORE_VALUES } from '../data/baselineData';
import { useDataContext } from '../context/DataContext';
import { ImagePlaceholder } from '../components/UIPrimitives';
import { EntityBadge } from '../components/UIPrimitives';
import { PageRoute } from '../types';

interface AboutPageProps {
  onNavigate: (page: PageRoute) => void;
}

/*
 * Dữ liệu mặc định an toàn.
 * Khi Admin đã lưu customTimeline/customTeam,
 * dữ liệu Admin sẽ được ưu tiên hoàn toàn.
 */
const DEFAULT_TIMELINE: any[] = [
  {
    year: '2025',
    title: 'Khởi nguồn từ giáo dục',
    description:
      'Sky First bắt đầu từ định hướng xây dựng các hoạt động giáo dục, học tập và phát triển năng lực dành cho người trẻ. Đây là giai đoạn đặt nền móng cho tư duy hoạt động, giá trị cốt lõi và định hướng phát triển lâu dài.',
    highlights: [
      'Khởi nguồn từ các hoạt động giáo dục và học tập',
      'Từng bước hình thành định hướng phát triển dành cho người trẻ',
      'Đặt nền móng cho hệ sinh thái Sky First',
    ],
    isCurrent: false,
  },
  {
    year: '2026',
    title: 'Thành lập The Sky First English Club',
    description:
      'The Sky First English Club (SFEC) được thành lập, tập trung xây dựng môi trường học tập, thực hành tiếng Anh và phát triển kỹ năng dành cho người trẻ.',
    highlights: [
      'Thành lập The Sky First English Club (SFEC)',
      'Phát triển hoạt động học tập và thực hành tiếng Anh',
      'Từng bước hoàn thiện mô hình tổ chức và vận hành',
    ],
    isCurrent: false,
  },
  {
    year: '08/2026',
    periodLabel: 'Tháng 08/2026',
    title: 'Sky First Network chính thức vận hành',
    description:
      'Tháng 08/2026, Sky First Network chính thức bước vào giai đoạn vận hành với định hướng giáo dục, phát triển con người và kết nối cộng đồng. Hệ thống tổ chức, nền tảng số và các quy trình vận hành được từng bước chuẩn hóa.',
    highlights: [
      'Sky First Network chính thức bước vào giai đoạn vận hành',
      'Từng bước chuẩn hóa cơ cấu và quy trình hoạt động',
      'Phát triển hệ thống số phục vụ quản trị và cộng đồng',
    ],
    isCurrent: true,
  },
];

const DEFAULT_TEAM: any[] = [
  {
    name: 'Bùi Tấn Lộc',
    role: 'Người sáng lập & Chủ tịch Sky First Network',
    bio:
      'Phụ trách định hướng phát triển, xây dựng hệ thống tổ chức và điều phối các hoạt động của Sky First Network.',
    imageUrl: '',
    imageSizeText: '1:1 (400x400px)',
    imageDescription: 'Ảnh chân dung Bùi Tấn Lộc',
    theme: 'sky',
  },
];

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  const {
    corePillars,
    networkUnits,
    customPages,
  } = useDataContext();

  const pageData: any = customPages.find(
    (p: any) => p.slug === 'about' || p.id === 'page-about'
  );

  /*
   * 1. HERO
   */
  const badgeText =
    pageData?.badge ||
    'MẠNG LƯỚI GIÁO DỤC & PHÁT TRIỂN CỘNG ĐỒNG';

  const titleText =
    pageData?.title ||
    'Về Sky First Network';

  const subtitleText =
    pageData?.summary ||
    'Sky First Network là mạng lưới hoạt động theo định hướng giáo dục, phát triển con người và kết nối cộng đồng; tạo môi trường để người trẻ học tập, phát triển năng lực, tham gia hoạt động xã hội và cùng tạo ra những giá trị tích cực.';

  /*
   * 2. TẦM NHÌN - SỨ MỆNH - TRIẾT LÝ
   */
  const visionBadge =
    pageData?.visionBadge ||
    'Định hướng phát triển';

  const visionTitle =
    pageData?.visionTitle ||
    'Tầm nhìn';

  const visionContent =
    pageData?.visionContent ||
    'Xây dựng một môi trường mở để người trẻ có thể học tập, phát triển năng lực, kết nối và từng bước tạo ra những giá trị tích cực cho cộng đồng.';

  const missionBadge =
    pageData?.missionBadge ||
    'Giá trị chúng tôi theo đuổi';

  const missionTitle =
    pageData?.missionTitle ||
    'Sứ mệnh';

  const missionContent =
    pageData?.missionContent ||
    'Kết nối người trẻ, tri thức, kỹ năng và các nguồn lực phù hợp nhằm tạo thêm cơ hội học tập, trải nghiệm, phát triển và đóng góp cho cộng đồng.';

  const philosophyBadge =
    pageData?.philosophyBadge ||
    'Tinh thần Sky First';

  const philosophyTitle =
    pageData?.philosophyTitle ||
    'Học hỏi · Phát triển · Kết nối';

  const philosophyContent =
    pageData?.philosophyContent ||
    'Sky First khuyến khích tinh thần chủ động học hỏi, dám trải nghiệm, có trách nhiệm với công việc và cùng nhau phát triển thông qua những hoạt động thực tế.';

  /*
   * 3. TRỤ CỘT
   */
  const pillarsSectionTitle =
    pageData?.pillarsSectionTitle ||
    '5 Trụ Cột Hoạt Động';

  const pillarsSectionBadge =
    pageData?.pillarsSectionBadge ||
    'Định hướng hoạt động';

  const activePillars =
    pageData?.customPillars &&
    pageData.customPillars.length > 0
      ? pageData.customPillars
      : corePillars;

  /*
   * 4. GIÁ TRỊ
   */
  const valuesSectionTitle =
    pageData?.valuesSectionTitle ||
    'Giá Trị Cốt Lõi';

  const activeValues =
    pageData?.customValues &&
    pageData.customValues.length > 0
      ? pageData.customValues
      : CORE_VALUES;

  /*
   * 5. TIMELINE
   * Admin customTimeline được ưu tiên.
   */
  const timelineSectionTitle =
    pageData?.timelineSectionTitle ||
    'Hành Trình Phát Triển';

  const timelineSectionBadge =
    pageData?.timelineSectionBadge ||
    '2025 — 2026';

  const activeTimeline =
    pageData?.customTimeline &&
    pageData.customTimeline.length > 0
      ? pageData.customTimeline
      : DEFAULT_TIMELINE;

  /*
   * 6. ĐỘI NGŨ
   * Không dùng teamMembers mặc định cũ để tránh tên giả.
   * Admin customTeam được ưu tiên.
   */
  const teamSectionTitle =
    pageData?.teamSectionTitle ||
    'Đội Ngũ Điều Hành';

  const teamSectionSubtitle =
    pageData?.teamSectionSubtitle ||
    'Sky First Network';

  const activeTeamSource = Array.isArray(pageData?.customTeam)
    ? pageData.customTeam
    : DEFAULT_TEAM;

  // Keep a deterministic display order: hierarchy first, then manual order.
  // Missing fields on legacy CMS records fall back to their existing source order.
  const teamSortMode = pageData?.teamSortMode === 'manual' ? 'manual' : 'priority';
  const activeTeam = activeTeamSource
    .map((member: any, sourceIndex: number) => ({ member, sourceIndex }))
    .sort((a: any, b: any) => {
      if (teamSortMode === 'manual') {
        return (a.member.displayOrder ?? a.sourceIndex) - (b.member.displayOrder ?? b.sourceIndex) ||
          a.sourceIndex - b.sourceIndex;
      }
      return (a.member.rankOrder ?? a.sourceIndex * 10) - (b.member.rankOrder ?? b.sourceIndex * 10) ||
        (a.member.displayOrder ?? a.sourceIndex) - (b.member.displayOrder ?? b.sourceIndex) ||
        a.sourceIndex - b.sourceIndex;
    })
    .map(({ member }: any) => member);

  /*
   * 7. ĐƠN VỊ
   */
  const unitsSectionBadge =
    pageData?.unitsSectionBadge ||
    'Hệ Sinh Thái Sky First';

  const unitsSectionTitle =
    pageData?.unitsSectionTitle ||
    'Đơn vị & chương trình trong hệ sinh thái';

  const unitsButtonLabel =
    pageData?.unitsButtonLabel ||
    'Tìm hiểu hệ sinh thái';

  const unitsButtonUrl =
    pageData?.unitsButtonUrl ||
    '/units';

  /*
   * 8. CTA
   */
  const ctaTitle =
    pageData?.ctaTitle ||
    'Cùng tạo nên những giá trị tích cực';

  const ctaDescription =
    pageData?.ctaDescription ||
    'Khám phá các chương trình, cơ hội tham gia và những hoạt động đang được triển khai trong hệ sinh thái Sky First.';

  const buttonLabel =
    pageData?.buttonLabel ||
    'Tham gia Sky First';

  const buttonUrl =
    pageData?.buttonUrl ||
    '/join';

  const secondaryButtonLabel =
    pageData?.secondaryButtonLabel ||
    'Xem chương trình';

  const secondaryButtonUrl =
    pageData?.secondaryButtonUrl ||
    '/programs';

  const handleButtonClick = (url: string) => {
    if (!url) return;

    if (
      url.startsWith('http://') ||
      url.startsWith('https://')
    ) {
      window.open(
        url,
        '_blank',
        'noopener,noreferrer'
      );
      return;
    }

    const clean = url
      .replace(/^\/+/, '')
      .split('?')[0]
      .split('#')[0] as PageRoute;

    onNavigate(clean || 'home');
  };

  return (
    <main className="overflow-hidden bg-white">

      {/* =====================================================
          HERO
      ====================================================== */}
      <section className="relative overflow-hidden border-b border-slate-100">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#eef9ff_0%,#f8fcff_55%,#ffffff_100%)]" />

        <div className="absolute -left-32 top-[-80px] h-[420px] w-[420px] rounded-full bg-sky-200/30 blur-[100px]" />

        <div className="absolute right-[-120px] top-[-80px] h-[460px] w-[460px] rounded-full bg-blue-200/30 blur-[120px]" />

        <div
          className="absolute inset-0 opacity-[0.2]"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(2,132,199,.22) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            WebkitMaskImage:
              'linear-gradient(to bottom, black, transparent 85%)',
            maskImage:
              'linear-gradient(to bottom, black, transparent 85%)',
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mx-auto max-w-4xl text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/90 px-4 py-2 text-[11px] font-black uppercase tracking-[.16em] text-[#0284C7] shadow-sm backdrop-blur sm:text-xs">
              <Sparkles size={14} />
              {badgeText}
            </div>

            <h1 className="mt-7 text-4xl font-black tracking-[-.05em] text-[#07162E] sm:text-6xl lg:text-[68px] lg:leading-[1.02]">
              {titleText}
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg sm:leading-9">
              {subtitleText}
            </p>

            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => onNavigate('programs')}
                className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0284C7] to-[#2563EB] px-6 py-3.5 text-sm font-black text-white shadow-[0_12px_30px_rgba(2,132,199,.24)] transition hover:-translate-y-0.5"
              >
                Khám phá chương trình
                <ArrowRight
                  size={17}
                  className="transition-transform group-hover:translate-x-1"
                />
              </button>

              <button
                onClick={() => onNavigate('join')}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-black text-slate-800 shadow-sm transition hover:border-sky-200 hover:text-[#0284C7]"
              >
                <Users size={17} />
                Tham gia Sky First
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* =====================================================
          TẦM NHÌN - SỨ MỆNH - TRIẾT LÝ
      ====================================================== */}
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-3">

            <InfoCard
              icon={<Eye size={25} />}
              iconClass="bg-sky-50 text-[#0284C7] border-sky-100"
              badge={visionBadge}
              badgeClass="text-[#0284C7]"
              title={visionTitle}
              text={visionContent}
            />

            <InfoCard
              icon={<Target size={25} />}
              iconClass="bg-emerald-50 text-emerald-600 border-emerald-100"
              badge={missionBadge}
              badgeClass="text-emerald-600"
              title={missionTitle}
              text={missionContent}
            />

            <InfoCard
              icon={<Heart size={25} />}
              iconClass="bg-amber-50 text-amber-600 border-amber-100"
              badge={philosophyBadge}
              badgeClass="text-amber-600"
              title={philosophyTitle}
              text={philosophyContent}
            />

          </div>
        </div>
      </section>

      {/* =====================================================
          TRỤ CỘT
      ====================================================== */}
      <section className="bg-[#F7FAFD] py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <SectionHeading
            badge={pillarsSectionBadge}
            title={pillarsSectionTitle}
            description="Những lĩnh vực Sky First Network tập trung phát triển trong quá trình xây dựng môi trường học tập, trải nghiệm và kết nối dành cho người trẻ."
          />

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {activePillars.map(
              (pillar: any, idx: number) => (
                <motion.article
                  key={
                    pillar.id ||
                    pillar.number ||
                    `${pillar.title}-${idx}`
                  }
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-200 hover:shadow-xl"
                >
                  <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-sky-50 transition-transform duration-500 group-hover:scale-125" />

                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <span className="grid h-10 min-w-10 place-items-center rounded-xl bg-sky-100 px-2 text-sm font-black text-[#0284C7]">
                        {pillar.number ||
                          String(idx + 1).padStart(
                            2,
                            '0'
                          )}
                      </span>

                      <GraduationCap
                        size={22}
                        className="text-sky-400"
                      />
                    </div>

                    <h3 className="mt-8 text-xl font-black tracking-[-.025em] text-slate-950">
                      {pillar.title}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {pillar.fullDesc ||
                        pillar.shortDesc}
                    </p>

                    {Array.isArray(
                      pillar.activities
                    ) &&
                      pillar.activities.length >
                        0 && (
                        <div className="mt-6 border-t border-slate-100 pt-5">
                          <div className="mb-3 text-[10px] font-black uppercase tracking-[.15em] text-slate-400">
                            Hoạt động trọng tâm
                          </div>

                          <ul className="space-y-2">
                            {pillar.activities.map(
                              (
                                activity: string,
                                activityIndex: number
                              ) => (
                                <li
                                  key={
                                    activityIndex
                                  }
                                  className="flex items-start gap-2 text-xs leading-6 text-slate-600"
                                >
                                  <CheckCircle2
                                    size={14}
                                    className="mt-1 shrink-0 text-[#0284C7]"
                                  />
                                  <span>
                                    {activity}
                                  </span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                  </div>
                </motion.article>
              )
            )}
          </div>
        </div>
      </section>

      {/* =====================================================
          GIÁ TRỊ CỐT LÕI
      ====================================================== */}
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <SectionHeading
            badge="Tinh thần Sky First"
            title={valuesSectionTitle}
            description="Những nguyên tắc định hướng cách Sky First tổ chức hoạt động, làm việc cùng nhau và tạo ra giá trị cho cộng đồng."
          />

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeValues.map(
              (value: any, idx: number) => (
                <motion.div
                  key={
                    value.name ||
                    idx
                  }
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-[26px] border border-slate-200 bg-white p-6 transition hover:border-sky-200 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#0284C7]">
                      {String(idx + 1).padStart(
                        2,
                        '0'
                      )}
                    </span>

                    <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-sky-400 to-emerald-400" />
                  </div>

                  <h3 className="mt-5 text-xl font-black text-slate-950">
                    {value.name}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {value.desc}
                  </p>
                </motion.div>
              )
            )}
          </div>
        </div>
      </section>

      {/* =====================================================
          HÀNH TRÌNH PHÁT TRIỂN
      ====================================================== */}
      <section className="relative overflow-hidden bg-[#071B3A] py-20 text-white lg:py-24">

        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-sky-500/15 blur-[100px]" />

        <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-emerald-400/10 blur-[100px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="text-xs font-black uppercase tracking-[.18em] text-sky-300">
                {timelineSectionBadge}
              </div>

              <h2 className="mt-3 text-4xl font-black tracking-[-.045em] sm:text-5xl">
                {timelineSectionTitle}
              </h2>
            </div>

            <div className="max-w-lg text-sm leading-7 text-slate-300">
              Từ những hoạt động giáo dục ban đầu đến quá trình hình thành và vận hành hệ sinh thái Sky First.
            </div>
          </div>

          <div className="relative mt-12">

            <div className="absolute left-[22px] top-0 hidden h-full w-px bg-white/15 md:block" />

            <div className="space-y-5">
              {activeTimeline.map(
                (
                  milestone: any,
                  index: number
                ) => {
                  const label =
                    milestone.periodLabel ||
                    milestone.label ||
                    (String(
                      milestone.year
                    ).includes('/')
                      ? `Tháng ${milestone.year}`
                      : `Năm ${milestone.year}`);

                  return (
                    <motion.article
                      key={
                        milestone.id ||
                        `${milestone.year}-${index}`
                      }
                      initial={{
                        opacity: 0,
                        y: 14,
                      }}
                      whileInView={{
                        opacity: 1,
                        y: 0,
                      }}
                      viewport={{
                        once: true,
                        amount: 0.2,
                      }}
                      transition={{
                        duration: 0.35,
                        delay:
                          index * 0.05,
                      }}
                      className="relative md:pl-16"
                    >
                      <div
                        className={`absolute left-[12px] top-7 hidden h-[21px] w-[21px] rounded-full border-[5px] border-[#071B3A] md:block ${
                          milestone.isCurrent
                            ? 'bg-emerald-400 shadow-[0_0_0_5px_rgba(52,211,153,.12)]'
                            : 'bg-sky-400'
                        }`}
                      />

                      <div
                        className={`rounded-[28px] border p-6 sm:p-7 ${
                          milestone.isCurrent
                            ? 'border-sky-400/40 bg-gradient-to-br from-sky-500/15 via-white/[.07] to-emerald-400/10'
                            : 'border-white/10 bg-white/[.05]'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-black ${
                              milestone.isCurrent
                                ? 'bg-emerald-400 text-[#052C27]'
                                : 'bg-white/10 text-sky-200'
                            }`}
                          >
                            {label}
                          </span>

                          {milestone.isCurrent && (
                            <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[.12em] text-emerald-300">
                              <span className="relative flex h-2.5 w-2.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                              </span>

                              Đang vận hành
                            </span>
                          )}
                        </div>

                        <h3 className="mt-5 text-2xl font-black tracking-[-.025em]">
                          {milestone.title}
                        </h3>

                        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
                          {
                            milestone.description
                          }
                        </p>

                        {Array.isArray(
                          milestone.highlights
                        ) &&
                          milestone.highlights
                            .length > 0 && (
                            <div className="mt-6 grid gap-3 border-t border-white/10 pt-5 md:grid-cols-2 lg:grid-cols-3">
                              {milestone.highlights.map(
                                (
                                  highlight: string,
                                  highlightIndex: number
                                ) => (
                                  <div
                                    key={
                                      highlightIndex
                                    }
                                    className="flex items-start gap-2.5 text-xs leading-6 text-slate-300"
                                  >
                                    <CheckCircle2
                                      size={15}
                                      className="mt-1 shrink-0 text-sky-300"
                                    />
                                    <span>
                                      {
                                        highlight
                                      }
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                      </div>
                    </motion.article>
                  );
                }
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          ĐỘI NGŨ
      ====================================================== */}
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <SectionHeading
            badge={teamSectionSubtitle}
            title={teamSectionTitle}
            description="Thông tin nhân sự được công khai ở mức cần thiết và có thể được cập nhật khi cơ cấu tổ chức thay đổi."
          />

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {activeTeam.map(
              (
                member: any,
                index: number
              ) => (
                <motion.article
                  key={
                    member.id ||
                    member.name ||
                    index
                  }
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200 hover:shadow-xl"
                >
                  <div className="mx-auto flex aspect-square w-full items-center justify-center overflow-hidden rounded-[22px] bg-gradient-to-br from-sky-50 to-slate-100">
                    {member.imageUrl ? (
                      <img
                        src={
                          member.imageUrl
                        }
                        alt={
                          member.name
                        }
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <ImagePlaceholder
                        sizeText={
                          member.imageSizeText ||
                          '1:1 (400x400px)'
                        }
                        description={
                          member.imageDescription ||
                          `Ảnh chân dung ${member.name}`
                        }
                        aspectRatio="square"
                        theme={
                          member.theme ||
                          'sky'
                        }
                        imageUrl={
                          member.imageUrl
                        }
                      />
                    )}
                  </div>

                  <div className="pt-5">
                    <h3 className="text-lg font-black text-slate-950 transition group-hover:text-[#0284C7]">
                      {member.name}
                    </h3>

                    {member.role && (
                      <div className="mt-2 max-w-full">
                        <EntityBadge
                          label={member.role}
                          color={member.roleColor}
                          className="rounded-lg px-2.5 py-1 text-left"
                        />
                      </div>
                    )}

                    {member.unit && (
                      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {member.unit}
                      </p>
                    )}

                    {member.bio && (
                      <p className="mt-4 text-sm leading-7 text-slate-600">
                        {member.bio}
                      </p>
                    )}
                  </div>
                </motion.article>
              )
            )}
          </div>
        </div>
      </section>

      {/* =====================================================
          HỆ SINH THÁI
      ====================================================== */}
      <section className="bg-[#F7FAFD] py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="overflow-hidden rounded-[34px] border border-sky-100 bg-white shadow-[0_20px_55px_rgba(15,94,160,.08)]">

            <div className="grid gap-8 p-7 sm:p-9 lg:grid-cols-[.75fr_1.25fr] lg:p-10">

              <div>
                <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.17em] text-[#0284C7]">
                  <Network size={15} />
                  {unitsSectionBadge}
                </div>

                <h2 className="mt-4 text-3xl font-black tracking-[-.04em] text-slate-950 sm:text-4xl">
                  {unitsSectionTitle}
                </h2>

                <p className="mt-4 text-sm leading-7 text-slate-600">
                  Khám phá những đơn vị và chương trình đang được kết nối trong hệ sinh thái Sky First.
                </p>

                <button
                  onClick={() =>
                    handleButtonClick(
                      unitsButtonUrl
                    )
                  }
                  className="group mt-7 inline-flex items-center gap-2 rounded-2xl bg-[#0284C7] px-5 py-3 text-sm font-black text-white transition hover:bg-[#0369A1]"
                >
                  {unitsButtonLabel}
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {networkUnits
                  .filter(
                    (unit: any) =>
                      unit.isPublished !==
                      false
                  )
                  .map((unit: any) => (
                    <button
                      key={unit.id}
                      type="button"
                      onClick={() =>
                        onNavigate('units')
                      }
                      className="group rounded-[24px] border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg"
                    >
                      <div className="flex items-start gap-4">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-50 text-[#0284C7]">
                          <BookOpen
                            size={21}
                          />
                        </div>

                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[.15em] text-[#0284C7]">
                            {unit.code}
                          </div>

                          <h3 className="mt-1 text-base font-black text-slate-950">
                            {unit.name}
                          </h3>

                          {unit.tagline && (
                            <p className="mt-2 text-xs leading-6 text-slate-500">
                              {
                                unit.tagline
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          MINH BẠCH
      ====================================================== */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 rounded-[30px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-7 sm:p-9 lg:flex-row lg:items-center">

            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-sky-50 text-[#0284C7]">
              <ShieldCheck size={26} />
            </div>

            <div className="flex-1">
              <div className="text-xs font-black uppercase tracking-[.16em] text-[#0284C7]">
                Minh bạch thông tin
              </div>

              <h2 className="mt-2 text-2xl font-black tracking-[-.025em] text-slate-950">
                Vận hành độc lập không đồng nghĩa với có tư cách pháp nhân độc lập
              </h2>

              <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
                Sky First Network hiện được xây dựng và vận hành như một mạng lưới độc lập về tổ chức và định hướng hoạt động, nhưng hiện chưa có tư cách pháp lý độc lập.
              </p>
            </div>

            <button
              onClick={() =>
                window.location.href =
                  '/phap-ly-minh-bach'
              }
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 transition hover:border-sky-200 hover:text-[#0284C7]"
            >
              Tìm hiểu thêm
              <ArrowRight size={16} />
            </button>

          </div>
        </div>
      </section>

      {/* =====================================================
          CTA
      ====================================================== */}
      <section className="pb-20 lg:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-r from-[#0284C7] via-[#087AC5] to-[#2563EB] p-8 text-white shadow-[0_24px_60px_rgba(2,132,199,.22)] sm:p-10 lg:p-12">

            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-[20px]" />

            <div className="absolute -bottom-32 left-[30%] h-80 w-80 rounded-full bg-emerald-300/15 blur-[80px]" />

            <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-center">

              <div className="max-w-2xl">
                <h2 className="text-3xl font-black tracking-[-.04em] sm:text-4xl">
                  {ctaTitle}
                </h2>

                <p className="mt-4 text-sm leading-7 text-sky-100 sm:text-base">
                  {ctaDescription}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {buttonLabel && (
                  <button
                    onClick={() =>
                      handleButtonClick(
                        buttonUrl
                      )
                    }
                    className="rounded-2xl bg-white px-6 py-3.5 text-sm font-black text-[#0284C7] shadow-lg transition hover:-translate-y-0.5"
                  >
                    {buttonLabel}
                  </button>
                )}

                {secondaryButtonLabel && (
                  <button
                    onClick={() =>
                      handleButtonClick(
                        secondaryButtonUrl
                      )
                    }
                    className="rounded-2xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"
                  >
                    {
                      secondaryButtonLabel
                    }
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      </section>

    </main>
  );
};


/* =========================================================
   COMPONENT PHỤ
========================================================= */

interface InfoCardProps {
  icon: React.ReactNode;
  iconClass: string;
  badge: string;
  badgeClass: string;
  title: string;
  text: string;
}

const InfoCard: React.FC<InfoCardProps> = ({
  icon,
  iconClass,
  badge,
  badgeClass,
  title,
  text,
}) => {
  return (
    <motion.article
      whileHover={{
        y: -5,
        scale: 1.005,
      }}
      transition={{ duration: 0.2 }}
      className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm transition hover:border-sky-200 hover:shadow-xl"
    >
      <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-slate-50 transition-transform duration-500 group-hover:scale-125" />

      <div className="relative">
        <div
          className={`grid h-13 w-13 h-[52px] w-[52px] place-items-center rounded-2xl border ${iconClass}`}
        >
          {icon}
        </div>

        <div
          className={`mt-6 text-[11px] font-black uppercase tracking-[.16em] ${badgeClass}`}
        >
          {badge}
        </div>

        <h3 className="mt-2 text-2xl font-black tracking-[-.025em] text-slate-950">
          {title}
        </h3>

        <p className="mt-4 text-sm leading-7 text-slate-600">
          {text}
        </p>
      </div>
    </motion.article>
  );
};


interface SectionHeadingProps {
  badge: string;
  title: string;
  description?: string;
}

const SectionHeading: React.FC<
  SectionHeadingProps
> = ({
  badge,
  title,
  description,
}) => {
  return (
    <div className="max-w-4xl">
      <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-[#0284C7]">
        <Sparkles size={14} />
        {badge}
      </div>

      <h2 className="mt-3 text-4xl font-black tracking-[-.045em] text-slate-950 sm:text-5xl">
        {title}
      </h2>

      {description && (
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
          {description}
        </p>
      )}
    </div>
  );
};
