import React, { useEffect, useState } from 'react';
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Copy,
  ExternalLink,
  Sparkles,
  Send,
  AlertTriangle,
  Award,
  ChevronRight,
  UploadCloud,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useDataContext } from '../context/DataContext';
import { PageRoute, Program } from '../types';
import { getProgramSlug } from '../utils/contentUtils';
import { getSemanticStatusColor, EntityBadge } from '../components/UIPrimitives';
import { ImagePlaceholder, ImageLightboxModal } from '../components/UIPrimitives';

interface ProgramDetailPageProps {
  programSlugOrId: string;
  onNavigate: (route: PageRoute) => void;
  onShowToast: (message: string) => void;
  onSelectProgram?: (program: Program) => void;
}

export const ProgramDetailPage: React.FC<ProgramDetailPageProps> = ({
  programSlugOrId,
  onNavigate,
  onShowToast,
  onSelectProgram,
}) => {
  const { programs, isPublicDataReady } = useDataContext();
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const program = programs.find(
    (p) =>
      getProgramSlug(p) === programSlugOrId ||
      p.id === programSlugOrId ||
      (p.slug && p.slug === programSlugOrId)
  );

  // Dynamic independent Form Builder state for this specific program
  const [dynamicForm, setDynamicForm] = useState<any | null>(null);
  const [dynamicFormClosedError, setDynamicFormClosedError] = useState<string>('');
  const [dynamicAnswers, setDynamicAnswers] = useState<Record<string, any>>({});
  const [uploadingField, setUploadingField] = useState<string>('');

  // Fallback legacy form states (used only if no custom Form Builder form is linked)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [organization, setOrganization] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [motivation, setMotivation] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [applicationCode, setApplicationCode] = useState('');
  const [confirmationText, setConfirmationText] = useState('');

  useEffect(() => {
    setDynamicForm(null);
    setDynamicFormClosedError('');
    setDynamicAnswers({});
    setIsSuccess(false);
    if (!program) return;

    const q = program.formId
      ? `id=${encodeURIComponent(program.formId)}`
      : program.formSlug
      ? `slug=${encodeURIComponent(program.formSlug)}`
      : `programId=${encodeURIComponent(program.id)}`;

    fetch(`/api/forms?${q}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (r.ok && d?.ok && d?.item) {
          setDynamicForm(d.item);
        } else if (d?.closed && d?.error) {
          setDynamicFormClosedError(d.error);
        }
      })
      .catch(() => {});
  }, [program?.id, program?.formId, program?.formSlug]);

  if (!isPublicDataReady) {
    return (
      <div className="min-h-[70vh] bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 animate-pulse">
          <div className="h-5 w-40 rounded bg-slate-100" />
          <div className="mt-8 h-10 w-4/5 rounded-xl bg-slate-100" />
          <div className="mt-4 h-5 w-3/5 rounded bg-slate-100" />
          <div className="mt-8 aspect-video w-full rounded-[28px] bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!program || program.isPublished === false) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4 shadow-sm">
          <AlertTriangle size={32} />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Không Tìm Thấy Chương Trình</h1>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Đường dẫn chương trình hoặc dự án này có thể đã thay đổi hoặc đang được điều chỉnh trong hệ thống.
        </p>
        <button
          type="button"
          onClick={() => {
            onNavigate('programs');
            window.history.pushState({}, '', '/programs');
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-sm rounded-xl shadow-sm transition"
        >
          <ArrowLeft size={16} />
          <span>Xem Tất Cả Chương Trình & Dự Án</span>
        </button>
      </div>
    );
  }

  const nowMs = Date.now();
  const registrationOpenMs = program.registrationOpenAt ? new Date(program.registrationOpenAt).getTime() : 0;
  const registrationCloseMs = program.registrationCloseAt ? new Date(program.registrationCloseAt).getTime() : 0;
  const canRegister =
    !dynamicFormClosedError &&
    program.status === 'open' &&
    program.registrationEnabled !== false &&
    (!registrationOpenMs || nowMs >= registrationOpenMs) &&
    (!registrationCloseMs || nowMs <= registrationCloseMs);
  const registrationClosedReason =
    dynamicFormClosedError ||
    (program.registrationEnabled === false
      ? 'Chương trình chưa bật nhận đăng ký.'
      : registrationOpenMs && nowMs < registrationOpenMs
      ? 'Đăng ký chưa mở.'
      : registrationCloseMs && nowMs > registrationCloseMs
      ? 'Đăng ký đã kết thúc.'
      : 'Chương trình hiện không nhận đăng ký.');

  const currentSlug = getProgramSlug(program);
  const fullPublicUrl = typeof window !== 'undefined' ? `${window.location.origin}/du-an/${currentSlug}` : `/du-an/${currentSlug}`;

  const handleCopyUrl = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullPublicUrl);
      onShowToast(`Đã sao chép liên kết dự án: /du-an/${currentSlug}`);
    }
  };

  const isFieldVisible = (f: any) => {
    const rule = f?.showWhen;
    if (!rule?.fieldId) return true;
    const current = dynamicAnswers[rule.fieldId];
    return Array.isArray(current)
      ? current.map(String).includes(String(rule.equals ?? ''))
      : String(current ?? '') === String(rule.equals ?? '');
  };

  const uploadDynamicFile = async (field: any, file: File) => {
    if (!dynamicForm) return;
    setUploadingField(field.id);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch(
        `/api/forms?upload=1&formId=${encodeURIComponent(dynamicForm.id)}&fieldId=${encodeURIComponent(field.id)}`,
        { method: 'POST', body: fd }
      );
      const d = await r.json();
      if (!r.ok || !d?.ok) throw new Error(d?.error || 'Không thể tải tệp.');
      setDynamicAnswers((prev) => ({ ...prev, [field.id]: d.url }));
      onShowToast('Đã tải tệp đính kèm thành công.');
    } catch (e: any) {
      onShowToast(e.message || 'Không thể tải tệp.');
    } finally {
      setUploadingField('');
    }
  };

  const handleDynamicFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dynamicForm) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          formId: dynamicForm.id,
          programId: program.id,
          programTitle: program.title,
          answers: dynamicAnswers,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) throw new Error(data?.error || 'Không thể gửi biểu mẫu đăng ký.');
      setApplicationCode(data.applicationCode || 'ĐÃ TIẾP NHẬN');
      setConfirmationText(data.message || dynamicForm.settings?.confirmationMessage || 'Hồ sơ đăng ký đã được tiếp nhận.');
      setIsSuccess(true);
      onShowToast(data.message || 'Đã gửi đơn đăng ký thành công!');
    } catch (err: any) {
      onShowToast(err.message || 'Không thể gửi biểu mẫu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canRegister) {
      onShowToast(registrationClosedReason);
      return;
    }
    if (!fullName.trim() || !email.trim() || !phone.trim() || !organization.trim() || !motivation.trim()) {
      onShowToast('Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
      return;
    }
    if (!agreeTerms) {
      onShowToast('Vui lòng xác nhận cam kết tham gia chương trình');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          programId: program.id,
          programTitle: program.title,
          fullName,
          email,
          phone,
          organization,
          birthYear,
          portfolioUrl,
          motivation,
          consent: agreeTerms,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) throw new Error(data?.error || 'Không thể gửi hồ sơ đăng ký.');
      setApplicationCode(data.applicationCode || 'ĐÃ TIẾP NHẬN');
      setConfirmationText(data?.message || 'Hồ sơ đăng ký đã được tiếp nhận.');
      setIsSuccess(true);
      onShowToast(data?.message || 'Hồ sơ đăng ký đã được tiếp nhận.');
    } catch (error: any) {
      onShowToast(error?.message || 'Không thể gửi hồ sơ đăng ký. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setOrganization('');
    setBirthYear('');
    setPortfolioUrl('');
    setMotivation('');
    setAgreeTerms(false);
    setDynamicAnswers({});
    setIsSuccess(false);
  };

  const scrollToRegister = () => {
    const el = document.getElementById('dang-ky-form');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="bg-slate-50/50 min-h-screen pb-20">
      <div className="bg-white border-b border-slate-200/80 sticky top-16 sm:top-20 z-20 backdrop-blur-md bg-white/95">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
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
                onNavigate('programs');
                window.history.pushState({}, '', '/programs');
              }}
              className="hover:text-[#0284C7] font-medium"
            >
              Chương trình & Dự án
            </button>
            <ChevronRight size={12} className="text-slate-400 shrink-0" />
            <span className="text-slate-900 font-bold truncate max-w-[200px] sm:max-w-xs">{program.title}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
              title="Sao chép liên kết URL dự án này"
            >
              <Copy size={13} />
              <span className="hidden sm:inline">Sao chép link</span>
            </button>
            {canRegister && (
              <button
                type="button"
                onClick={scrollToRegister}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold rounded-lg shadow-sm transition"
              >
                <Send size={13} />
                <span>Đăng ký ngay</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <EntityBadge label={program.categoryLabel} color={program.categoryColor} className="uppercase tracking-wide text-xs" />
                <EntityBadge label={program.statusLabel} color={program.statusColor || getSemanticStatusColor(program.status)} solid className="text-xs" />
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                {program.title}
              </h1>

              <p className="text-base text-slate-600 leading-relaxed font-normal">{program.summary}</p>

              {/* Cover Image: giữ nguyên tỷ lệ ảnh gốc theo mặc định */}
              <div className="pt-2">
                <ImagePlaceholder
                  imageUrl={program.imageUrl}
                  sizeText="Tỷ lệ ảnh gốc"
                  description={`Hình ảnh dự án: ${program.title}`}
                  aspectRatio="auto"
                  objectFit={program.imageFit || 'original'}
                  theme={program.theme || 'sky'}
                  className="rounded-2xl overflow-hidden shadow-xs"
                />
              </div>

              {(program.goalValue || program.startAt || program.endAt) && (
                <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-wider text-sky-700">Tiến độ chương trình</div>
                      <div className="mt-1 text-2xl font-black text-slate-900">
                        {program.currentValue ?? 0}
                        {program.goalLabel ? ` ${program.goalLabel}` : ''}
                      </div>
                    </div>
                    {program.goalValue && (
                      <div className="text-right">
                        <div className="text-[11px] text-slate-500">Mục tiêu</div>
                        <div className="font-black">
                          {program.goalValue}
                          {program.goalLabel ? ` ${program.goalLabel}` : ''}
                        </div>
                      </div>
                    )}
                  </div>
                  {program.goalValue && (
                    <>
                      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-[#0B66C3] transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, ((program.currentValue || 0) / program.goalValue) * 100))}%` }}
                        />
                      </div>
                      <div className="mt-2 text-[11px] font-bold text-slate-500">
                        {Math.min(100, Math.max(0, ((program.currentValue || 0) / program.goalValue) * 100)).toFixed(0)}% hoàn thành
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mb-1">
                    <Calendar size={13} className="text-[#0284C7]" /> Thời gian
                  </span>
                  <p className="text-xs font-bold text-slate-900">{program.date}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mb-1">
                    <MapPin size={13} className="text-rose-500" /> Địa điểm
                  </span>
                  <p className="text-xs font-bold text-slate-900 truncate" title={program.location}>
                    {program.location}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mb-1">
                    <Users size={13} className="text-emerald-500" /> Đối tượng
                  </span>
                  <p className="text-xs font-bold text-slate-900 truncate" title={program.targetAudience}>
                    {program.targetAudience}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mb-1">
                    <Clock size={13} className="text-amber-500" /> Chỉ tiêu
                  </span>
                  <p className="text-xs font-bold text-slate-900">
                    {program.spotsLeft ? `${program.spotsLeft} suất mở` : 'Theo đợt'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]" />
                Mô Tả Chi Tiết & Mục Tiêu Dự Án
              </h2>
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">{program.description}</p>
            </div>

            {program.timeline && program.timeline.length > 0 && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Clock size={20} className="text-[#0284C7]" />
                  Lộ Trình Triển Khai Chi Tiết
                </h2>
                <div className="space-y-3 pt-2">
                  {program.timeline.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs sm:text-sm text-slate-700"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#0284C7] text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5 shadow-2xs">
                        {idx + 1}
                      </div>
                      <span className="font-medium leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {program.benefits && program.benefits.length > 0 && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
                  <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Award size={18} className="text-emerald-600" />
                    Quyền Lợi Tham Gia
                  </h3>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700">
                    {program.benefits.map((b, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span className="leading-snug">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {program.requirements && program.requirements.length > 0 && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
                  <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Sparkles size={18} className="text-sky-600" />
                    Yêu Cầu & Tiêu Chí
                  </h3>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700">
                    {program.requirements.map((r, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-sky-500 shrink-0 mt-1.5" />
                        <span className="leading-snug">{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {(program.galleryImages || []).filter(Boolean).length > 0 && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
                <div className="mb-5">
                  <div className="text-xs font-black uppercase tracking-[.16em] text-sky-700">Hình ảnh chương trình</div>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">Thư viện hoạt động</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(program.galleryImages || []).filter(Boolean).map((src, idx) => (
                    <figure key={idx} className="rounded-2xl border border-slate-100 bg-slate-50 p-2 flex items-center justify-center">
                      <img
                        src={src}
                        alt={`${program.title} - ảnh ${idx + 1}`}
                        loading="lazy"
                        onClick={() => setLightboxSrc(src)}
                        className="block h-auto w-auto max-w-full rounded-xl object-contain cursor-zoom-in"
                      />
                    </figure>
                  ))}
                </div>
              </section>
            )}

            {/* Registration Form Section: ưu tiên Biểu mẫu độc lập từ Form Builder của chương trình */}
            {canRegister ? (
              <div id="dang-ky-form" className="bg-white rounded-3xl p-6 sm:p-10 border-2 border-sky-500/30 shadow-lg shadow-sky-500/5 scroll-mt-28 space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 text-[#0284C7] rounded-full text-xs font-black mb-2">
                    <Send size={13} />
                    <span>{dynamicForm ? 'BIỂU MẪU CHƯƠNG TRÌNH ĐỘC LẬP' : 'CỔNG ĐĂNG KÝ TRỰC TUYẾN'}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {dynamicForm?.title || 'Đơn Đăng Ký Tham Gia Dự Án'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    {dynamicForm?.description || 'Vui lòng điền thông tin chính xác để đơn vị phụ trách chương trình tiếp nhận và liên hệ.'}
                  </p>
                </div>

                {isSuccess ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 sm:p-8 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-500/25">
                      <CheckCircle2 size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-emerald-900">Gửi Đơn Đăng Ký Thành Công!</h3>
                      <p className="text-xs sm:text-sm text-emerald-700 mt-1">{confirmationText}</p>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-emerald-200 max-w-sm mx-auto">
                      <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Mã hồ sơ tiếp nhận</span>
                      <span className="text-lg font-mono font-black text-emerald-700">{applicationCode}</span>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
                      >
                        Đăng ký hồ sơ khác
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate('programs');
                          window.history.pushState({}, '', '/programs');
                        }}
                        className="px-4 py-2 bg-[#0284C7] text-white rounded-xl text-xs font-bold hover:bg-[#0369A1] transition"
                      >
                        Khám phá thêm dự án
                      </button>
                    </div>
                  </motion.div>
                ) : dynamicForm ? (
                  <form onSubmit={handleDynamicFormSubmit} className="space-y-4">
                    <div className="p-3.5 bg-sky-50/70 rounded-xl border border-sky-100 flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">Chương trình đăng ký:</span>
                      <span className="font-extrabold text-[#0284C7]">{program.title}</span>
                    </div>

                    {(dynamicForm.fields || []).filter(isFieldVisible).map((f: any) => {
                      if (f.type === 'section') {
                        return (
                          <div key={f.id} className="pt-3 border-t border-slate-100">
                            <h3 className="font-black text-base text-slate-900">{f.label}</h3>
                            {f.description && <p className="text-xs text-slate-500 mt-1">{f.description}</p>}
                          </div>
                        );
                      }
                      if (f.type === 'guide') {
                        return (
                          <div key={f.id} className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-600 leading-relaxed">
                            <strong className="block text-slate-800 mb-1">{f.label}</strong>
                            {f.description || f.placeholder}
                          </div>
                        );
                      }
                      if (f.type === 'consent') {
                        return (
                          <label key={f.id} className="flex items-start gap-2.5 pt-1 text-xs text-slate-700">
                            <input
                              type="checkbox"
                              required={Boolean(f.required)}
                              checked={Boolean(dynamicAnswers[f.id])}
                              onChange={(e) => setDynamicAnswers((prev) => ({ ...prev, [f.id]: e.target.checked }))}
                              className="mt-0.5 w-4 h-4 rounded-sm text-[#0284C7]"
                            />
                            <span>
                              {f.label} {f.required && <span className="text-rose-500">*</span>}
                            </span>
                          </label>
                        );
                      }
                      if (['file', 'image'].includes(f.type)) {
                        return (
                          <div key={f.id}>
                            <label className="text-xs font-bold text-slate-700 block mb-1">
                              {f.label} {f.required && <span className="text-rose-500">*</span>}
                            </label>
                            {f.description && <p className="text-[11px] text-slate-500 mb-1.5">{f.description}</p>}
                            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3.5">
                              <span className="inline-flex items-center gap-2 text-xs font-bold text-sky-700">
                                <UploadCloud size={15} />
                                {uploadingField === f.id ? 'Đang tải tệp...' : 'Chọn tệp CV / Hồ sơ (PDF, JPG, PNG, WebP ≤ 5MB)'}
                              </span>
                              <input
                                type="file"
                                accept={f.type === 'image' ? 'image/jpeg,image/png,image/webp' : 'image/jpeg,image/png,image/webp,application/pdf'}
                                className="block mt-2 text-xs"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) void uploadDynamicFile(f, file);
                                }}
                              />
                              {dynamicAnswers[f.id] && <div className="mt-1.5 text-xs font-bold text-emerald-700">✓ Đã đính kèm tệp</div>}
                            </div>
                          </div>
                        );
                      }
                      if (f.type === 'select') {
                        return (
                          <div key={f.id}>
                            <label className="text-xs font-bold text-slate-700 block mb-1">
                              {f.label} {f.required && <span className="text-rose-500">*</span>}
                            </label>
                            {f.description && <p className="text-[11px] text-slate-500 mb-1">{f.description}</p>}
                            <select
                              required={Boolean(f.required)}
                              value={dynamicAnswers[f.id] || ''}
                              onChange={(e) => setDynamicAnswers((prev) => ({ ...prev, [f.id]: e.target.value }))}
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm"
                            >
                              <option value="">Chọn...</option>
                              {(f.options || []).map((o: string) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      }
                      if (f.type === 'radio') {
                        return (
                          <div key={f.id}>
                            <label className="text-xs font-bold text-slate-700 block mb-1.5">
                              {f.label} {f.required && <span className="text-rose-500">*</span>}
                            </label>
                            <div className="grid sm:grid-cols-2 gap-2">
                              {(f.options || []).map((o: string) => (
                                <label key={o} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2.5 text-xs">
                                  <input
                                    type="radio"
                                    name={f.id}
                                    required={Boolean(f.required)}
                                    checked={dynamicAnswers[f.id] === o}
                                    onChange={() => setDynamicAnswers((prev) => ({ ...prev, [f.id]: o }))}
                                  />
                                  <span>{o}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      if (f.type === 'checkbox') {
                        const arr = Array.isArray(dynamicAnswers[f.id]) ? dynamicAnswers[f.id] : [];
                        return (
                          <div key={f.id}>
                            <label className="text-xs font-bold text-slate-700 block mb-1.5">
                              {f.label} {f.required && <span className="text-rose-500">*</span>}
                            </label>
                            <div className="grid sm:grid-cols-2 gap-2">
                              {(f.options || []).map((o: string) => (
                                <label key={o} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2.5 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={arr.includes(o)}
                                    onChange={(e) =>
                                      setDynamicAnswers((prev) => ({
                                        ...prev,
                                        [f.id]: e.target.checked ? [...arr, o] : arr.filter((x: string) => x !== o),
                                      }))
                                    }
                                  />
                                  <span>{o}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      const htmlType =
                        ['email', 'date', 'time', 'number'].includes(f.type)
                          ? f.type
                          : f.type === 'datetime'
                          ? 'datetime-local'
                          : f.type === 'url'
                          ? 'url'
                          : f.type === 'phone'
                          ? 'tel'
                          : 'text';
                      return (
                        <div key={f.id}>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            {f.label} {f.required && <span className="text-rose-500">*</span>}
                          </label>
                          {f.description && <p className="text-[11px] text-slate-500 mb-1">{f.description}</p>}
                          {f.type === 'textarea' ? (
                            <textarea
                              rows={4}
                              required={Boolean(f.required)}
                              placeholder={f.placeholder || ''}
                              value={dynamicAnswers[f.id] || ''}
                              onChange={(e) => setDynamicAnswers((prev) => ({ ...prev, [f.id]: e.target.value }))}
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm"
                            />
                          ) : (
                            <input
                              type={htmlType}
                              required={Boolean(f.required)}
                              placeholder={f.placeholder || (f.type === 'birth_year' ? 'VD: 2004' : '')}
                              value={dynamicAnswers[f.id] || ''}
                              onChange={(e) => setDynamicAnswers((prev) => ({ ...prev, [f.id]: e.target.value }))}
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm"
                            />
                          )}
                        </div>
                      );
                    })}

                    <button
                      type="submit"
                      disabled={isSubmitting || Boolean(uploadingField)}
                      className="w-full py-3.5 bg-[#0284C7] hover:bg-[#0369A1] text-white font-extrabold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Send size={16} />
                      <span>{isSubmitting ? 'Đang gửi biểu mẫu...' : 'Gửi Đơn Đăng Ký'}</span>
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    <div className="p-3.5 bg-sky-50/70 rounded-xl border border-sky-100 flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">Chương trình đăng ký:</span>
                      <span className="font-extrabold text-[#0284C7]">{program.title}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Họ và tên <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Ví dụ: Nguyễn Minh Anh"
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Email liên hệ <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="ban@example.com"
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Số điện thoại / Zalo <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="09xx xxx xxx"
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Trường học / Đơn vị công tác <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={organization}
                          onChange={(e) => setOrganization(e.target.value)}
                          placeholder="Ví dụ: ĐH Quốc Gia TP.HCM"
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Năm sinh (tùy chọn)</label>
                        <input
                          type="text"
                          value={birthYear}
                          onChange={(e) => setBirthYear(e.target.value)}
                          placeholder="Ví dụ: 2004"
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Link CV / Hồ sơ / Facebook (tùy chọn)</label>
                        <input
                          type="url"
                          value={portfolioUrl}
                          onChange={(e) => setPortfolioUrl(e.target.value)}
                          placeholder="https://facebook.com/..."
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Lý do tham gia & Mục tiêu của bạn <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={motivation}
                        onChange={(e) => setMotivation(e.target.value)}
                        placeholder="Chia sẻ lý do bạn mong muốn đồng hành cùng dự án này..."
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm"
                      />
                    </div>

                    <div className="flex items-start gap-2.5 pt-1">
                      <input
                        type="checkbox"
                        id="agreeTerms"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded-sm text-[#0284C7]"
                      />
                      <label htmlFor="agreeTerms" className="text-xs text-slate-600 leading-relaxed select-none">
                        Tôi cam kết thông tin cung cấp là chính xác, đồng thời sẵn sàng tham gia đầy đủ các buổi tập huấn và hoạt động theo quy chế của Sky First Network.
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 bg-[#0284C7] hover:bg-[#0369A1] text-white font-extrabold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Send size={16} />
                      <span>{isSubmitting ? 'Đang gửi hồ sơ...' : 'Nộp Đơn Đăng Ký Dự Án'}</span>
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div id="dang-ky-form" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs scroll-mt-28">
                <div className="flex items-start gap-3">
                  <Clock size={20} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="font-black text-slate-900">Chương trình hiện không nhận đăng ký</h2>
                    <p className="mt-1 text-sm text-slate-600">{registrationClosedReason}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Chia Sẻ Dự Án Này</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Lan tỏa cơ hội ý nghĩa này đến bạn bè, câu lạc bộ hoặc đội nhóm tình nguyện của bạn.
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={fullPublicUrl}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-3 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl text-xs font-bold transition shrink-0"
                  title="Sao chép"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Chương Trình Cùng Mạng Lưới</h3>

              <div className="space-y-3">
                {programs
                  .filter((p) => p.id !== program.id && p.isPublished !== false)
                  .slice(0, 3)
                  .map((otherProg) => {
                    const otherSlug = getProgramSlug(otherProg);
                    return (
                      <div
                        key={otherProg.id}
                        onClick={() => {
                          window.history.pushState({}, '', `/du-an/${otherSlug}`);
                          if (onSelectProgram) onSelectProgram(otherProg);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="p-3 bg-slate-50 hover:bg-sky-50/60 rounded-2xl border border-slate-100 hover:border-sky-200 transition cursor-pointer group space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <EntityBadge label={otherProg.categoryLabel} color={otherProg.categoryColor} className="px-2 py-0.5 text-[10px]" />
                          <span className="text-slate-400">{otherProg.date}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#0284C7] transition line-clamp-2 leading-snug">
                          {otherProg.title}
                        </h4>
                      </div>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={() => {
                  onNavigate('programs');
                  window.history.pushState({}, '', '/programs');
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition text-center block"
              >
                Xem tất cả chương trình
              </button>
            </div>
          </div>
        </div>
      </div>

      <ImageLightboxModal src={lightboxSrc} alt={program.title} onClose={() => setLightboxSrc(null)} />
    </div>
  );
};
