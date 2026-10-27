import React, { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  Save,
  X,
  ChevronUp,
  ChevronDown,
  Copy,
  Download,
  Eye,
  History,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Lock,
} from 'lucide-react';
import { adminApi } from '../../lib/firebase';
import { useDataContext } from '../../context/DataContext';

type Field = {
  id: string;
  type: string;
  label: string;
  description?: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  showWhen?: { fieldId: string; equals: string };
};

type Form = {
  id: string;
  slug: string;
  title: string;
  description: string;
  program_id?: string;
  status: string;
  version?: number;
  lifecycleState?: string;
  fields: Field[];
  settings: any;
};

const FIELD_TYPES: { id: string; label: string }[] = [
  { id: 'text', label: 'Văn bản ngắn (Text)' },
  { id: 'textarea', label: 'Văn bản dài (Textarea)' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Số điện thoại / Zalo' },
  { id: 'number', label: 'Số (Number)' },
  { id: 'birth_year', label: 'Năm sinh (YYYY)' },
  { id: 'date', label: 'Ngày tháng (Date)' },
  { id: 'datetime', label: 'Ngày & Giờ (Datetime)' },
  { id: 'select', label: 'Chọn một (Dropdown)' },
  { id: 'radio', label: 'Chọn một (Radio)' },
  { id: 'checkbox', label: 'Chọn nhiều (Checkbox)' },
  { id: 'url', label: 'Liên kết URL / Portfolio' },
  { id: 'file', label: 'Tải tệp CV / Hồ sơ (PDF/Ảnh)' },
  { id: 'image', label: 'Tải hình ảnh' },
  { id: 'section', label: 'Tiêu đề nhóm câu hỏi' },
  { id: 'guide', label: 'Mô tả hướng dẫn' },
  { id: 'consent', label: 'Cam kết / Đồng ý điều khoản' },
];

const blank = (): Form => ({
  id: `form-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  slug: '',
  title: '',
  description: '',
  program_id: '',
  status: 'draft',
  fields: [
    { id: 'full_name', type: 'text', label: 'Họ và tên', required: true, placeholder: 'Nhập họ và tên' },
    { id: 'email', type: 'email', label: 'Email liên hệ', required: true, placeholder: 'ban@example.com' },
    { id: 'phone', type: 'phone', label: 'Số điện thoại / Zalo', required: true, placeholder: '09xx xxx xxx' },
    { id: 'consent', type: 'consent', label: 'Tôi xác nhận thông tin đã cung cấp là chính xác.', required: true },
  ],
  settings: {
    confirmationTitle: 'Đã nhận hồ sơ',
    confirmationMessage: 'Hồ sơ của bạn đã được tiếp nhận. Vui lòng lưu mã hồ sơ để tra cứu.',
    sendConfirmationEmail: true,
    preventDuplicateEmail: true,
  },
});

export const AdminFormsManager: React.FC<{ onShowToast: (m: string) => void }> = ({ onShowToast }) => {
  const { programs } = useDataContext();
  const [items, setItems] = useState<Form[]>([]);
  const [edit, setEdit] = useState<Form | null>(null);
  const [previewForm, setPreviewForm] = useState<Form | null>(null);
  const [submissionsModal, setSubmissionsModal] = useState<Form | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [subSearch, setSubSearch] = useState('');
  const [subStatusFilter, setSubStatusFilter] = useState('all');
  const [revisions, setRevisions] = useState<any[]>([]);
  const [showRevisions, setShowRevisions] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const load = async () => {
    try {
      const d = await adminApi('/api/forms?admin=1');
      setItems(d.items || []);
    } catch (e: any) {
      onShowToast(e.message);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const set = (k: keyof Form, v: any) => setEdit((x) => (x ? { ...x, [k]: v } : x));

  const save = async () => {
    if (!edit) return;
    setSaving(true);
    try {
      await adminApi('/api/forms?admin=1', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(edit),
      });
      setEdit(null);
      await load();
      onShowToast('Đã lưu biểu mẫu độc lập và tạo bản lưu phiên bản.');
    } catch (e: any) {
      onShowToast(e.message);
    } finally {
      setSaving(false);
    }
  };

  const quickToggleStatus = async (f: Form) => {
    const nextStatus = f.status === 'open' ? 'closed' : 'open';
    try {
      await adminApi('/api/forms?admin=1', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...f, status: nextStatus }),
      });
      await load();
      onShowToast(nextStatus === 'open' ? `Đã mở nhận đơn cho "${f.title}"` : `Đã đóng nhận đơn cho "${f.title}"`);
    } catch (e: any) {
      onShowToast(e.message);
    }
  };

  const del = async (id: string) => {
    if (!confirm('Xóa biểu mẫu này? Toàn bộ hồ sơ thuộc biểu mẫu cũng sẽ bị xóa.')) return;
    await adminApi('/api/forms', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await load();
    onShowToast('Đã xóa biểu mẫu.');
  };

  const openSubmissions = async (f: Form) => {
    setSubmissionsModal(f);
    try {
      const d = await adminApi(`/api/forms?admin=1&submissions=1&formId=${encodeURIComponent(f.id)}`);
      setSubmissions(d.items || []);
    } catch (e: any) {
      onShowToast(e.message || 'Không tải được danh sách hồ sơ.');
    }
  };

  const updateSubmissionStatus = async (submissionId: string, status: string) => {
    try {
      await adminApi('/api/forms', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ submissionId, status }),
      });
      setSubmissions((prev) => prev.map((s) => (s.id === submissionId ? { ...s, status } : s)));
      onShowToast('Đã cập nhật trạng thái hồ sơ.');
    } catch (e: any) {
      onShowToast(e.message);
    }
  };

  const exportCsv = async (f: Form) => {
    try {
      const d = await adminApi(`/api/forms?admin=1&submissions=1&formId=${encodeURIComponent(f.id)}`);
      const rows = d.items || [];
      // Hợp nhất danh sách cột từ cả cấu trúc hiện tại lẫn fieldSnapshot lịch sử để không mất dữ liệu cũ
      const colMap = new Map<string, string>();
      for (const field of f.fields || []) {
        if (field.type !== 'section' && field.type !== 'guide') colMap.set(field.id, field.label || field.id);
      }
      for (const r of rows) {
        for (const snap of r.fieldSnapshot || []) {
          if (!colMap.has(snap.id)) colMap.set(snap.id, `${snap.label || snap.id} (Lịch sử)`);
        }
      }
      const fieldIds = [...colMap.keys()];
      const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const header = ['Mã hồ sơ', 'Trạng thái', 'Phiên bản Form', 'Họ tên', 'Email', 'Điện thoại', 'Ngày gửi', ...fieldIds.map((id) => colMap.get(id) || id)];
      const csv = [
        header.map(esc).join(','),
        ...rows.map((r: any) =>
          [
            r.application_code,
            r.status,
            `v${r.form_version || 1}`,
            r.applicant_name,
            r.applicant_email,
            r.applicant_phone,
            r.created_at,
            ...fieldIds.map((id) => (Array.isArray(r.answers?.[id]) ? r.answers[id].join(' | ') : r.answers?.[id])),
          ]
            .map(esc)
            .join(',')
        ),
      ].join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${f.slug || 'form'}-submissions.csv`;
      a.click();
      URL.revokeObjectURL(url);
      onShowToast(`Đã xuất ${rows.length} hồ sơ CSV (giữ nguyên cả các trường lịch sử).`);
    } catch (e: any) {
      onShowToast(e.message || 'Không thể xuất CSV.');
    }
  };

  const openRevisions = async (formId: string) => {
    setShowRevisions(formId);
    try {
      const d = await adminApi(`/api/system?action=revisions&entityType=form&entityId=${encodeURIComponent(formId)}`);
      setRevisions(d.items || []);
    } catch {
      setRevisions([]);
    }
  };

  const restoreRevision = async (revisionId: string) => {
    try {
      await adminApi('/api/system?action=restore-revision', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ revisionId }),
      });
      setShowRevisions(null);
      await load();
      onShowToast('Đã khôi phục phiên bản biểu mẫu thành công.');
    } catch (e: any) {
      onShowToast(e.message);
    }
  };

  const field = (i: number, p: Partial<Field>) =>
    setEdit((x) => (x ? { ...x, fields: x.fields.map((f, n) => (n === i ? { ...f, ...p } : f)) } : x));
  const duplicateField = (i: number) =>
    setEdit((x) => {
      if (!x) return x;
      const src = x.fields[i];
      if (!src) return x;
      const copy: Field = {
        ...JSON.parse(JSON.stringify(src)),
        id: `${src.id}_copy_${Date.now().toString().slice(-4)}`,
        label: `${src.label} (Bản sao)`,
      };
      const next = [...x.fields];
      next.splice(i + 1, 0, copy);
      return { ...x, fields: next };
    });
  const remove = (i: number) => setEdit((x) => (x ? { ...x, fields: x.fields.filter((_, n) => n !== i) } : x));
  const move = (i: number, d: number) =>
    setEdit((x) => {
      if (!x) return x;
      const a = [...x.fields],
        j = i + d;
      if (j < 0 || j >= a.length) return x;
      [a[i], a[j]] = [a[j], a[i]];
      return { ...x, fields: a };
    });
  const reorder = (from: number, to: number) =>
    setEdit((x) => {
      if (!x || from === to || from < 0 || to < 0 || from >= x.fields.length || to >= x.fields.length) return x;
      const fields = [...x.fields];
      const [picked] = fields.splice(from, 1);
      fields.splice(to, 0, picked);
      return { ...x, fields };
    });

  const filteredSubmissions = submissions.filter((s) => {
    const matchStatus = subStatusFilter === 'all' || s.status === subStatusFilter;
    const matchQ = !subSearch.trim() || JSON.stringify(s).toLowerCase().includes(subSearch.trim().toLowerCase());
    return matchStatus && matchQ;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-end gap-3 bg-white border border-slate-200 rounded-2xl p-5">
        <div>
          <h2 className="text-xl font-black text-slate-900">Form Builder Độc Lập Cho Từng Chương Trình</h2>
          <p className="text-xs text-slate-500 mt-1">
            Mỗi chương trình có biểu mẫu riêng gắn bằng ID ổn định. Sửa biểu mẫu sau khi đã có đơn vẫn giữ nguyên ngữ nghĩa dữ liệu cũ.
          </p>
        </div>
        <button
          onClick={() => setEdit(blank())}
          className="rounded-xl bg-[#0F2B5B] text-white px-4 py-2.5 font-bold text-xs sm:text-sm flex gap-2 items-center"
        >
          <Plus size={16} /> Tạo biểu mẫu mới
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white divide-y">
        {items.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">Chưa có biểu mẫu.</div>
        ) : (
          items.map((f) => {
            const linkedProg = programs.find((p) => p.id === f.program_id || p.formId === f.id);
            return (
              <div key={f.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition">
                <button onClick={() => setEdit(f)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{f.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        f.status === 'open'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : f.status === 'closed'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {f.status === 'open' ? 'Đang mở' : f.status === 'closed' ? 'Đã đóng' : 'Bản nháp'} · v{f.version || 1}
                    </span>
                    {linkedProg && (
                      <span className="px-2 py-0.5 rounded-md bg-sky-50 text-[#0284C7] text-[10px] font-bold border border-sky-200">
                        Gắn với: {linkedProg.title}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    ID: <code className="font-mono text-slate-700">{f.id}</code> · Slug: /{f.slug} · {f.fields?.length || 0} trường
                  </div>
                </button>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => void openSubmissions(f)}
                    className="px-3 py-1.5 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 text-xs font-bold"
                  >
                    Đơn đăng ký
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewForm(f)}
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white"
                    title="Xem trước biểu mẫu"
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void quickToggleStatus(f)}
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white"
                    title={f.status === 'open' ? 'Đóng nhận đơn' : 'Mở nhận đơn'}
                  >
                    {f.status === 'open' ? <Lock size={15} className="text-amber-600" /> : <CheckCircle2 size={15} className="text-emerald-600" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => void openRevisions(f.id)}
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white"
                    title="Khôi phục phiên bản trước"
                  >
                    <History size={15} />
                  </button>
                  <button
                    type="button"
                    title="Xuất hồ sơ CSV"
                    onClick={() => void exportCsv(f)}
                    className="p-2 rounded-xl border border-slate-200 text-sky-700 hover:bg-white"
                  >
                    <Download size={15} />
                  </button>
                  <button
                    type="button"
                    title="Nhân bản thành biểu mẫu riêng"
                    onClick={() =>
                      setEdit({
                        ...JSON.parse(JSON.stringify(f)),
                        id: `form-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        slug: `${f.slug}-ban-sao`,
                        title: `${f.title} (Bản sao độc lập)`,
                        program_id: '',
                        status: 'draft',
                      })
                    }
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white"
                  >
                    <Copy size={15} />
                  </button>
                  <button type="button" onClick={() => void del(f.id)} className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Chỉnh sửa Biểu mẫu */}
      {edit && (
        <div className="fixed inset-0 z-[120] bg-slate-950/60 p-3 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
            <header className="p-5 border-b flex justify-between items-center">
              <div>
                <h3 className="font-black text-lg">{edit.title || 'Biểu mẫu mới'}</h3>
                <p className="text-xs text-slate-500">
                  ID ổn định: <code className="font-mono">{edit.id}</code> · Kéo thả để sắp xếp trường, nhân bản hoặc đặt điều kiện hiển thị.
                </p>
              </div>
              <button onClick={() => setEdit(null)}>
                <X />
              </button>
            </header>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                <label className="text-xs font-bold text-slate-700">
                  Tên biểu mẫu *
                  <input
                    className="mt-1 w-full border rounded-xl p-2.5 text-sm"
                    placeholder="Tên biểu mẫu"
                    value={edit.title}
                    onChange={(e) => set('title', e.target.value)}
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Đường dẫn tĩnh (Slug) *
                  <input
                    className="mt-1 w-full border rounded-xl p-2.5 text-sm font-mono"
                    placeholder="slug-bieu-mau"
                    value={edit.slug}
                    onChange={(e) => set('slug', e.target.value)}
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Gắn với Chương trình độc lập (Tùy chọn)
                  <select
                    className="mt-1 w-full border rounded-xl p-2.5 text-sm"
                    value={edit.program_id || ''}
                    onChange={(e) => set('program_id', e.target.value)}
                  >
                    <option value="">-- Biểu mẫu dùng chung / Chọn chương trình --</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.id})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Trạng thái biểu mẫu
                  <select
                    className="mt-1 w-full border rounded-xl p-2.5 text-sm font-bold"
                    value={edit.status}
                    onChange={(e) => set('status', e.target.value)}
                  >
                    <option value="draft">Bản nháp (Chưa nhận đơn)</option>
                    <option value="open">Đang mở nhận đơn</option>
                    <option value="closed">Đã đóng nhận đơn</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-700 md:col-span-2">
                  Mô tả biểu mẫu
                  <textarea
                    className="mt-1 w-full border rounded-xl p-2.5 text-sm"
                    rows={2}
                    placeholder="Mô tả hướng dẫn dành cho người đăng ký..."
                    value={edit.description}
                    onChange={(e) => set('description', e.target.value)}
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="font-black text-sm text-slate-800">Cấu hình Vòng đời, Thông báo & Tự động hóa của Biểu mẫu</div>
                <div className="mt-3 grid md:grid-cols-2 gap-3">
                  <label className="text-xs font-bold">
                    Thời điểm mở tự động
                    <input
                      type="datetime-local"
                      value={edit.settings?.openAt || ''}
                      onChange={(e) => set('settings', { ...(edit.settings || {}), openAt: e.target.value })}
                      className="mt-1 w-full border rounded-xl p-2.5 bg-white"
                    />
                  </label>
                  <label className="text-xs font-bold">
                    Thời điểm đóng tự động
                    <input
                      type="datetime-local"
                      value={edit.settings?.closeAt || ''}
                      onChange={(e) => set('settings', { ...(edit.settings || {}), closeAt: e.target.value })}
                      className="mt-1 w-full border rounded-xl p-2.5 bg-white"
                    />
                  </label>
                  <label className="text-xs font-bold">
                    Giới hạn số lượng hồ sơ tối đa
                    <input
                      type="number"
                      min="1"
                      value={edit.settings?.maxSubmissions || ''}
                      onChange={(e) => set('settings', { ...(edit.settings || {}), maxSubmissions: e.target.value })}
                      className="mt-1 w-full border rounded-xl p-2.5 bg-white"
                      placeholder="Để trống = không giới hạn"
                    />
                  </label>
                  <label className="text-xs font-bold">
                    Email quản trị nhận cảnh báo khi có đơn mới
                    <input
                      type="email"
                      value={edit.settings?.adminNotificationAddress || ''}
                      onChange={(e) =>
                        set('settings', {
                          ...(edit.settings || {}),
                          adminNotificationAddress: e.target.value,
                          notifyAdminEmail: Boolean(e.target.value),
                        })
                      }
                      className="mt-1 w-full border rounded-xl p-2.5 bg-white"
                      placeholder="lienhe@skyfirst.io.vn"
                    />
                  </label>
                  <label className="text-xs font-bold md:col-span-2">
                    Thông báo xác nhận sau khi gửi thành công
                    <input
                      value={edit.settings?.confirmationMessage || ''}
                      onChange={(e) => set('settings', { ...(edit.settings || {}), confirmationMessage: e.target.value })}
                      className="mt-1 w-full border rounded-xl p-2.5 bg-white"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <h4 className="font-black text-sm">Danh sách trường dữ liệu ({edit.fields.length} trường)</h4>
                <button
                  type="button"
                  onClick={() =>
                    setEdit((x) =>
                      x
                        ? {
                            ...x,
                            fields: [
                              ...x.fields,
                              { id: `field_${Date.now()}`, type: 'text', label: 'Câu hỏi mới', required: false },
                            ],
                          }
                        : x
                    )
                  }
                  className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-xs font-bold text-sky-700"
                >
                  + Thêm trường mới
                </button>
              </div>

              {edit.fields.map((f, i) => (
                <div
                  key={f.id}
                  onDragOver={(e) => {
                    if (dragIndex !== null) {
                      e.preventDefault();
                      setDragOverIndex(i);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIndex !== null) reorder(dragIndex, i);
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  data-field-index={i}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  className={`rounded-2xl border p-4 grid md:grid-cols-12 gap-3 transition-all ${
                    dragOverIndex === i ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-200' : 'border-slate-200 bg-white'
                  } ${dragIndex === i ? 'opacity-50' : ''}`}
                >
                  <div className="md:col-span-12 flex items-center justify-between border-b border-slate-100 pb-2">
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', String(i));
                        setDragIndex(i);
                      }}
                      className="cursor-grab active:cursor-grabbing rounded-lg border px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                      ⠿ Kéo sắp xếp · Trường #{i + 1} ({f.id})
                    </button>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => move(i, -1)} className="p-1.5 border rounded-lg" title="Lên">
                        <ChevronUp size={14} />
                      </button>
                      <button type="button" onClick={() => move(i, 1)} className="p-1.5 border rounded-lg" title="Xuống">
                        <ChevronDown size={14} />
                      </button>
                      <button type="button" onClick={() => duplicateField(i)} className="p-1.5 border rounded-lg text-sky-700" title="Nhân bản trường">
                        <Copy size={14} />
                      </button>
                      <button type="button" onClick={() => remove(i)} className="p-1.5 border border-rose-200 rounded-lg text-rose-600" title="Xóa trường">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <input
                    className="border rounded-xl p-2.5 text-xs font-bold md:col-span-4"
                    placeholder="Tên trường / Câu hỏi"
                    value={f.label}
                    onChange={(e) => field(i, { label: e.target.value })}
                  />
                  <select
                    className="border rounded-xl p-2.5 text-xs font-bold md:col-span-3"
                    value={f.type}
                    onChange={(e) => field(i, { type: e.target.value })}
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="border rounded-xl p-2.5 text-xs md:col-span-3"
                    placeholder="Placeholder gợi ý..."
                    value={f.placeholder || ''}
                    onChange={(e) => field(i, { placeholder: e.target.value })}
                  />
                  <label className="md:col-span-2 flex items-center gap-1.5 text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={Boolean(f.required)}
                      onChange={(e) => field(i, { required: e.target.checked })}
                    />
                    Bắt buộc
                  </label>

                  <input
                    className="border rounded-xl p-2 text-xs md:col-span-12"
                    placeholder="Mô tả hướng dẫn chi tiết cho câu hỏi này (tùy chọn)..."
                    value={f.description || ''}
                    onChange={(e) => field(i, { description: e.target.value })}
                  />

                  {['select', 'radio', 'checkbox'].includes(f.type) && (
                    <input
                      className="border rounded-xl p-2.5 text-xs md:col-span-12"
                      placeholder="Các lựa chọn, phân cách bằng dấu | (Ví dụ: Ban Truyền thông | Ban Nhân sự | Khác)"
                      value={(f.options || []).join(' | ')}
                      onChange={(e) =>
                        field(i, {
                          options: e.target.value
                            .split('|')
                            .map((x) => x.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  )}

                  <div className="md:col-span-12 grid gap-2 sm:grid-cols-2 rounded-xl bg-slate-50 p-3">
                    <label className="text-[11px] font-bold">
                      Điều kiện hiển thị: Chỉ hiện khi trường
                      <select
                        value={f.showWhen?.fieldId || ''}
                        onChange={(e) =>
                          field(i, {
                            showWhen: e.target.value ? { fieldId: e.target.value, equals: f.showWhen?.equals || '' } : undefined,
                          })
                        }
                        className="mt-1 w-full border rounded-lg p-2 bg-white"
                      >
                        <option value="">Luôn hiển thị</option>
                        {edit.fields
                          .filter((_, n) => n !== i)
                          .filter((x) => x.type !== 'section' && x.type !== 'guide')
                          .map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.label}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="text-[11px] font-bold">
                      Có giá trị bằng
                      <input
                        value={f.showWhen?.equals || ''}
                        disabled={!f.showWhen?.fieldId}
                        onChange={(e) =>
                          field(i, {
                            showWhen: f.showWhen?.fieldId ? { fieldId: f.showWhen.fieldId, equals: e.target.value } : undefined,
                          })
                        }
                        className="mt-1 w-full border rounded-lg p-2 bg-white disabled:bg-slate-100"
                        placeholder="VD: Khác"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <footer className="p-4 border-t flex justify-between items-center">
              <button
                type="button"
                onClick={() => setPreviewForm(edit)}
                className="px-4 py-2 border border-sky-200 bg-sky-50 text-sky-700 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Eye size={15} /> Xem trước luồng
              </button>
              <div className="flex gap-2">
                <button onClick={() => setEdit(null)} className="px-4 py-2 border rounded-xl text-xs font-bold">
                  Hủy
                </button>
                <button
                  disabled={saving}
                  onClick={() => void save()}
                  className="px-5 py-2 bg-[#0F2B5B] text-white rounded-xl text-xs font-bold flex items-center gap-2"
                >
                  <Save size={15} /> {saving ? 'Đang lưu...' : 'Lưu biểu mẫu'}
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}

      {/* Modal Xem trước Biểu mẫu */}
      {previewForm && (
        <div className="fixed inset-0 z-[130] bg-slate-950/60 p-4 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <header className="p-4 border-b flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-700">Chế độ Xem trước (Preview)</span>
                <h3 className="font-black text-base text-slate-900">{previewForm.title}</h3>
              </div>
              <button onClick={() => setPreviewForm(null)}>
                <X size={18} />
              </button>
            </header>
            <div className="p-6 overflow-y-auto space-y-4">
              {previewForm.description && <p className="text-xs text-slate-600">{previewForm.description}</p>}
              {(previewForm.fields || []).map((f) => (
                <div key={f.id} className="space-y-1">
                  {f.type === 'section' ? (
                    <h4 className="font-black text-sm text-slate-900 pt-2 border-t">{f.label}</h4>
                  ) : f.type === 'guide' ? (
                    <div className="rounded-xl bg-sky-50 border border-sky-100 p-3 text-xs text-slate-700">
                      <b>{f.label}:</b> {f.description}
                    </div>
                  ) : (
                    <>
                      <label className="block text-xs font-bold text-slate-700">
                        {f.label} {f.required && <span className="text-rose-500">*</span>}
                      </label>
                      {f.description && <p className="text-[11px] text-slate-500">{f.description}</p>}
                      <input
                        disabled
                        placeholder={f.placeholder || `Trường kiểu ${f.type}`}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem / Lọc / Tìm kiếm / Xuất Danh sách đăng ký theo biểu mẫu */}
      {submissionsModal && (
        <div className="fixed inset-0 z-[130] bg-slate-950/60 p-4 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
            <header className="p-4 border-b flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  Danh sách hồ sơ đăng ký: {submissionsModal.title} ({filteredSubmissions.length} hồ sơ)
                </h3>
                <p className="text-xs text-slate-500">
                  Dữ liệu lịch sử được bảo toàn nguyên vẹn qua snapshot trường ngay cả khi câu hỏi biểu mẫu thay đổi.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void exportCsv(submissionsModal)}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Download size={14} /> Xuất CSV
                </button>
                <button onClick={() => setSubmissionsModal(null)}>
                  <X size={18} />
                </button>
              </div>
            </header>

            <div className="p-3 border-b bg-slate-50 flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  placeholder="Tìm theo mã hồ sơ, tên, email, câu trả lời..."
                  className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs"
                />
              </div>
              <select
                value={subStatusFilter}
                onChange={(e) => setSubStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="received">Mới tiếp nhận</option>
                <option value="reviewing">Đang xem xét</option>
                <option value="accepted">Đã duyệt / Tiếp nhận</option>
                <option value="rejected">Từ chối</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto divide-y p-4">
              {filteredSubmissions.length === 0 ? (
                <p className="p-8 text-center text-xs text-slate-500">Chưa có hồ sơ phù hợp.</p>
              ) : (
                filteredSubmissions.map((s) => {
                  const snapLabels = new Map<string, string>(
                    (s.fieldSnapshot || []).map((x: any) => [String(x.id), String(x.label || x.id)])
                  );
                  return (
                    <div key={s.id} className="py-3.5 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-[#0284C7]">{s.application_code}</span>
                          <span className="font-bold text-xs text-slate-900">{s.applicant_name || 'Ứng viên'}</span>
                          <span className="text-xs text-slate-500">{s.applicant_email}</span>
                          <span className="text-[11px] text-slate-400">· Form v{s.form_version || 1} · {s.created_at}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {(['received', 'reviewing', 'accepted', 'rejected'] as const).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => void updateSubmissionStatus(s.id, st)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                                s.status === st
                                  ? 'bg-[#0284C7] text-white border-[#0284C7]'
                                  : 'bg-white text-slate-600 border-slate-200'
                              }`}
                            >
                              {st === 'received' ? 'Mới' : st === 'reviewing' ? 'Đang xét' : st === 'accepted' ? 'Duyệt' : 'Từ chối'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 bg-slate-50 rounded-xl p-3 text-xs">
                        {Object.entries(s.answers || {}).map(([k, val]) => (
                          <div key={k} className="min-w-0">
                            <span className="text-[10px] font-bold text-slate-400 block">
                              {snapLabels.get(k) || k}
                            </span>
                            <span className="font-medium text-slate-800 break-words">
                              {Array.isArray(val) ? val.join(', ') : String(val ?? '—')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Lịch sử phiên bản Biểu mẫu */}
      {showRevisions && (
        <div className="fixed inset-0 z-[130] bg-slate-950/60 p-4 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <header className="p-4 border-b flex items-center justify-between">
              <h3 className="font-black text-sm">Khôi phục phiên bản Biểu mẫu</h3>
              <button onClick={() => setShowRevisions(null)}>
                <X size={16} />
              </button>
            </header>
            <div className="max-h-80 overflow-y-auto divide-y p-3">
              {revisions.length === 0 ? (
                <p className="p-6 text-center text-xs text-slate-500">Chưa có phiên bản cũ nào được lưu.</p>
              ) : (
                revisions.map((r) => (
                  <div key={r.id} className="py-2.5 px-2 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold">{r.version_label || r.id}</div>
                      <div className="text-[11px] text-slate-400">{r.created_at}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void restoreRevision(r.id)}
                      className="px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-xs font-bold text-sky-700"
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
