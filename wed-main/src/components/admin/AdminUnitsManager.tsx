import React, { useState } from 'react';
import { useDataContext } from '../../context/DataContext';
import {
  Building2,
  Plus,
  Trash2,
  Edit2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  Save,
  Send,
  Link as LinkIcon,
  Sparkles,
  Users,
  Mail,
  Phone,
  MapPin,
  Globe,
  Award,
  FileText,
  Image as ImageIcon,
  Check,
  Clock
} from 'lucide-react';
import { NetworkUnit, PageRoute, AdminManagerActionRef } from '../../types';
import { ImageUrlInput } from '../../components/UIPrimitives';
import { EntityBadge } from '../../components/UIPrimitives';
import { EntityColorPicker } from '../../components/UIPrimitives';

interface AdminUnitsManagerProps {
  units: NetworkUnit[];
  onUpdateUnit: (id: string, updates: Partial<NetworkUnit>) => Promise<boolean>;
  onAddUnit: (unit: NetworkUnit) => Promise<boolean>;
  onDeleteUnit: (id: string) => Promise<boolean>;
  onNavigate: (route: PageRoute) => void;
  onShowToast: (msg: string) => void;
  actionRef?: React.MutableRefObject<AdminManagerActionRef | null>;
  onViewModeChange?: (mode: 'list' | 'edit') => void;
}

export const AdminUnitsManager: React.FC<AdminUnitsManagerProps> = ({
  units,
  onUpdateUnit,
  onAddUnit,
  onDeleteUnit,
  onNavigate,
  onShowToast,
  actionRef,
  onViewModeChange,
}) => {
  const {siteConfig}=useDataContext();
  const taxonomyOptions=(siteConfig.taxonomyCategories||[]).filter((x:any)=>x.visible!==false);
  const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [unitToDelete, setUnitToDelete] = useState<NetworkUnit | null>(null);

  // States for repeatable arrays
  const [newFunctionItem, setNewFunctionItem] = useState('');
  const [newProjectItem, setNewProjectItem] = useState('');

  const activeUnit = units.find((u) => u.id === selectedUnitId) || units[0];

  const publishedCount = units.filter((u) => u.isPublished !== false).length;
  const draftCount = units.filter((u) => u.isPublished === false).length;

  const handleCreateNew = async () => {
    const newId = `unit-${Date.now()}`;
    const newUnit: NetworkUnit = {
      id: newId,
      code: 'UNIT',
      name: 'Đơn Vị Trực Thuộc Mới',
      tagline: 'Tiên Phong Sáng Tạo - Kết Nối Nguồn Lực Phụng Sự',
      category: 'education',
      categoryLabel: 'Giáo dục & Đào tạo',
      theme: 'sky',
      isPublished: true,
      isFlagship: false,
      leader: {
        name: '',
        title: 'Trưởng Ban Chấp hành Đơn Vị'
      },
      description: '',
      mission: 'Kiến tạo môi trường phát triển toàn diện và trao quyền cho thanh niên Việt Nam.',
      imageUrl: '',
      imageDescription: 'Không gian làm việc và hoạt động của đơn vị',
      imageSizeText: 'Giữ nguyên tỷ lệ ảnh gốc',
      functions: [
        'Nghiên cứu và phát triển các mô hình giáo dục thực nghiệm',
        'Tổ chức các hội thảo chuyên môn và chương trình tập huấn kỹ năng',
        'Điều phối các dự án cộng đồng và chiến dịch thanh niên'
      ],
      keyProjects: [
        'Dự án Nâng cao Năng lực Số cho Thanh niên',
        'Chiến dịch Tình nguyện Cộng đồng Thường niên'
      ],
      contact: {
        address: '',
        email: 'lienhe@skyfirst.io.vn',
        phone: '0924 910 210',
        portal: 'https://skyfirst.network'
      }
    };

    const created = await onAddUnit(newUnit);
    if (!created) { onShowToast('Chưa thể tạo đơn vị trên máy chủ.'); return; }
    setSelectedUnitId(newId);
    setViewMode('edit');
    onShowToast('Đã tạo đơn vị trực thuộc mới! Đang mở trình chỉnh sửa chi tiết.');
  };

  // Expose handleCreateNew via actionRef
  React.useEffect(() => {
    if (actionRef) {
      actionRef.current = {
        handleCreateNew,
      };
    }
    return () => {
      if (actionRef) actionRef.current = null;
    };
  }, [actionRef, units]);

  // Notify parent of viewMode changes
  React.useEffect(() => {
    onViewModeChange?.(viewMode);
  }, [viewMode, onViewModeChange]);

  const handleEditClick = (unit: NetworkUnit) => {
    setSelectedUnitId(unit.id);
    setViewMode('edit');
  };

  const handleTogglePublish = async (unit: NetworkUnit, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = unit.isPublished === false;
    const saved = await onUpdateUnit(unit.id, { isPublished: nextState });
    if (!saved) { onShowToast('Chưa thể cập nhật trạng thái trên máy chủ.'); return; }
    onShowToast(
      nextState
        ? `Đã xuất bản đơn vị "${unit.name}" lên website chính!`
        : `Đã chuyển đơn vị "${unit.name}" về Bản nháp!`
    );
  };

  const handleConfirmDelete = async () => {
    if (!unitToDelete) return;
    const deleted = await onDeleteUnit(unitToDelete.id);
    if (!deleted) { onShowToast('Chưa thể xóa trên máy chủ.'); return; }
    onShowToast(`Đã xóa đơn vị: ${unitToDelete.name}`);
    setUnitToDelete(null);
    if (selectedUnitId === unitToDelete.id) {
      setSelectedUnitId(null);
      setViewMode('list');
    }
  };

  const filteredUnits = units.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.leader.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'published') return u.isPublished !== false;
    if (statusFilter === 'draft') return u.isPublished === false;
    return true;
  });

  // =========================================================================
  // 1. CHẾ ĐỘ DANH SÁCH (LIST VIEW) - ĐỒNG BỘ CHUẨN XÁC VỚI MỤC TRANG
  // =========================================================================
  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {/* Bảng danh sách các đơn vị */}
        {filteredUnits.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <Building2 size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Chưa có đơn vị nào
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Bắt đầu tạo đơn vị trực thuộc đầu tiên trong hệ sinh thái Tên chủ tài khoản đã được xác nhận.
            </p>
            <button
              type="button"
              id="units-btn-create-first"
              onClick={handleCreateNew}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition shadow-xs inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus size={15} />
              <span>Thêm mới</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Tiêu đề các cột trong bảng danh sách */}
            <div className="grid grid-cols-12 gap-4 px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
              <div className="col-span-12 sm:col-span-5">Mã & Tên đơn vị trực thuộc</div>
              <div className="hidden sm:block sm:col-span-2">Nhãn</div>
              <div className="hidden sm:block sm:col-span-2">Lãnh đạo / Phụ trách</div>
              <div className="hidden sm:block sm:col-span-3 text-right">Trạng thái & Hành động</div>
            </div>

            {/* Các hàng dữ liệu đơn vị */}
            <div className="divide-y divide-slate-100">
              {filteredUnits.map((unit) => {
                const isDraft = unit.isPublished === false;
                const displayUrl = `/units`;

                return (
                  <div
                    key={unit.id}
                    id={`unit-row-${unit.id}`}
                    onClick={() => handleEditClick(unit)}
                    className="group grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-sky-50/40 cursor-pointer transition relative"
                  >
                    {/* Cột 1: Mã đơn vị, Tên đầy đủ, Slogan & URL */}
                    <div className="col-span-12 sm:col-span-5 pr-2">
                      <div className="flex items-center gap-2.5">
                        {/* Trạng thái Nháp / Đăng */}
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            !isDraft ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          title={!isDraft ? 'Đã xuất bản' : 'Bản nháp'}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-[#0284C7] bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200 shrink-0">
                              {unit.code}
                            </span>
                            <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition truncate">
                              {unit.name || 'Đơn vị chưa đặt tên'}
                            </h3>
                          </div>
                          <p className="text-[11px] text-slate-500 italic truncate mt-0.5">
                            "{unit.tagline || 'Đơn vị trực thuộc hệ sinh thái Tên chủ tài khoản đã được xác nhận'}"
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Cột 2: Nhãn (Tách riêng biệt thành một cột) */}
                    <div className="hidden sm:flex sm:col-span-2 items-center flex-wrap gap-1">
                      {unit.isFlagship && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 shrink-0">
                          Nòng cốt
                        </span>
                      )}
                      {unit.categoryLabel && (
                        <EntityBadge label={unit.categoryLabel} color={unit.badgeColor} className="rounded-md px-2 py-0.5 text-[10px]" />
                      )}
                      {!unit.isFlagship && !unit.categoryLabel && (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>

                    {/* Cột 3: Người phụ trách & Chức vụ */}
                    <div className="hidden sm:block sm:col-span-2 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 text-slate-800 font-medium truncate">
                        <Users size={12} className="text-[#0284C7] shrink-0" />
                        <span className="truncate">{unit.leader?.name || 'Ban Lãnh Đạo'}</span>
                      </div>
                      <div className="mt-1">
                        <EntityBadge label={unit.leader?.title || 'Phụ trách đơn vị'} color={unit.leader?.color} className="rounded-md px-2 py-0.5 text-[10px]" />
                      </div>
                    </div>

                    {/* Cột 3: Lĩnh vực & Cụm Action Icons khi hover */}
                    <div className="hidden sm:flex sm:col-span-3 items-center justify-end">
                      {/* Trạng thái bình thường */}
                      <div className="group-hover:hidden text-right">
                        <span
                          className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            !isDraft
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {!isDraft ? 'Đã xuất bản' : 'Bản nháp'}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {unit.categoryLabel || 'Chuyên môn'}
                        </span>
                      </div>

                      {/* Khi rê chuột đến (group-hover): Hiện các icon thao tác */}
                      <div className="hidden group-hover:flex items-center gap-1">
                        {/* 1. Icon Chỉnh sửa */}
                        <button
                          type="button"
                          id={`btn-edit-unit-${unit.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(unit);
                          }}
                          className="p-1.5 text-slate-600 hover:text-sky-600 hover:bg-white rounded-lg transition shadow-2xs border border-slate-200 cursor-pointer"
                          title="Chỉnh sửa chi tiết đơn vị"
                        >
                          <Edit2 size={15} />
                        </button>

                        {/* 2. Icon Nháp hoặc Đăng */}
                        <button
                          type="button"
                          id={`btn-toggle-publish-unit-${unit.id}`}
                          onClick={(e) => handleTogglePublish(unit, e)}
                          className={`p-1.5 rounded-lg transition shadow-2xs border cursor-pointer ${
                            !isDraft
                              ? 'text-amber-600 hover:bg-amber-50 border-amber-200 bg-white'
                              : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200 bg-white'
                          }`}
                          title={!isDraft ? 'Chuyển về Bản nháp' : 'Xuất bản đơn vị công khai'}
                        >
                          {!isDraft ? <Clock size={15} /> : <CheckCircle2 size={15} />}
                        </button>

                        {/* 3. Icon Xem trang công khai */}
                        <button
                          type="button"
                          id={`btn-view-public-unit-${unit.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            window.history.pushState({}, '', '/units');
                            onNavigate('units');
                          }}
                          className="p-1.5 text-slate-600 hover:text-[#0284C7] hover:bg-white rounded-lg transition shadow-2xs border border-slate-200 cursor-pointer"
                          title="Xem trên trang các đơn vị"
                        >
                          <Eye size={15} />
                        </button>

                        {/* 4. Icon Xóa */}
                        <button
                          type="button"
                          id={`btn-delete-unit-${unit.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setUnitToDelete(unit);
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition shadow-2xs border border-slate-200 bg-white cursor-pointer"
                          title="Xóa đơn vị"
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

        {/* Modal xác nhận xóa */}
        {unitToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle size={26} />
              </div>
              <h3 className="text-lg font-black text-slate-900">
                Xác Nhận Xóa Đơn Vị?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Bạn có chắc chắn muốn xóa đơn vị <strong>{unitToDelete.name} ({unitToDelete.code})</strong>? Đơn vị này sẽ không còn hiển thị trong danh sách 5 đơn vị trực thuộc trên trang chính.
              </p>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setUnitToDelete(null)}
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

  // =========================================================================
  // 2. CHẾ ĐỘ CHỈNH SỬA CHI TIẾT (EDIT VIEW) - ĐỘC LẬP THEO CẤU TRÚC TRANG CHÍNH
  // =========================================================================
  if (!activeUnit) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-sm text-slate-500">Không tìm thấy dữ liệu đơn vị.</p>
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

  const isDraft = activeUnit.isPublished === false;

  const handleSave = async (publishState?: boolean) => {
    const finalPublishState = publishState !== undefined ? publishState : !isDraft;
    const saved = await onUpdateUnit(activeUnit.id, { isPublished: finalPublishState });
    if (!saved) { onShowToast('Chưa thể lưu lên máy chủ. Nội dung vẫn được giữ để bạn thử lại.'); return; }
    if (finalPublishState) {
      onShowToast(`Đã lưu và xuất bản đơn vị "${activeUnit.name}" lên website chính!`);
    } else {
      onShowToast(`Đã lưu các chỉnh sửa của đơn vị "${activeUnit.name}" (Bản nháp)!`);
    }
  };

  const handleAddFunction = () => {
    if (!newFunctionItem.trim()) return;
    const updated = [...(activeUnit.functions || []), newFunctionItem.trim()];
    onUpdateUnit(activeUnit.id, { functions: updated });
    setNewFunctionItem('');
  };

  const handleRemoveFunction = (index: number) => {
    const updated = (activeUnit.functions || []).filter((_, i) => i !== index);
    onUpdateUnit(activeUnit.id, { functions: updated });
  };

  const handleUpdateFunction = (index: number, val: string) => {
    const updated = [...(activeUnit.functions || [])];
    updated[index] = val;
    onUpdateUnit(activeUnit.id, { functions: updated });
  };

  const handleAddProject = () => {
    if (!newProjectItem.trim()) return;
    const updated = [...(activeUnit.keyProjects || []), newProjectItem.trim()];
    onUpdateUnit(activeUnit.id, { keyProjects: updated });
    setNewProjectItem('');
  };

  const handleRemoveProject = (index: number) => {
    const updated = (activeUnit.keyProjects || []).filter((_, i) => i !== index);
    onUpdateUnit(activeUnit.id, { keyProjects: updated });
  };

  const handleUpdateProject = (index: number, val: string) => {
    const updated = [...(activeUnit.keyProjects || [])];
    updated[index] = val;
    onUpdateUnit(activeUnit.id, { keyProjects: updated });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F8FAFC] text-slate-900 flex flex-col font-sans overflow-y-auto">
      {/* 1. THANH TIÊU ĐỀ ĐỘC LẬP (STICKY HEADER) */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="editor-btn-back-units"
            onClick={() => setViewMode('list')}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition flex items-center gap-2 text-xs font-bold cursor-pointer"
            title="Quay lại danh sách đơn vị"
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

            <span className="text-xs text-sky-700 font-bold bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200 hidden sm:inline">
              Mã: {activeUnit.code}
            </span>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Nút xem trang công khai */}
          <button
            type="button"
            id="editor-btn-view-unit"
            onClick={() => {
              window.history.pushState({}, '', '/units');
              onNavigate('units');
            }}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            title="Xem trên trang các đơn vị"
          >
            <Eye size={14} />
            <span className="hidden sm:inline">Xem Trên Website</span>
          </button>

          {isDraft ? (
            <>
              {/* Đang ở trạng thái Bản nháp: Lưu chỉnh sửa hoặc Đăng bài */}
              <button
                type="button"
                id="editor-btn-save-draft-unit"
                onClick={() => handleSave(false)}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                title="Lưu lại các chỉnh sửa (giữ ở trạng thái Bản nháp)"
              >
                <Save size={15} className="text-[#0284C7]" />
                <span>LƯU CHỈNH SỬA</span>
              </button>

              <button
                type="button"
                id="editor-btn-publish-unit"
                onClick={() => handleSave(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Xuất bản đơn vị để hiển thị chính thức trên website"
              >
                <CheckCircle2 size={15} />
                <span>ĐĂNG ĐƠN VỊ</span>
              </button>
            </>
          ) : (
            <>
              {/* Đã xuất bản: Có thể chuyển về Bản nháp hoặc Lưu các thay đổi */}
              <button
                type="button"
                id="editor-btn-unpublish-unit"
                onClick={() => handleSave(false)}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
                title="Chuyển đơn vị về trạng thái Bản nháp"
              >
                <Clock size={14} className="text-amber-600" />
                <span>Chuyển về Nháp</span>
              </button>

              <button
                type="button"
                id="editor-btn-save-unit"
                onClick={() => handleSave(true)}
                className="px-4 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-extrabold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Lưu các thay đổi và áp dụng trực tiếp lên website chính"
              >
                <Save size={15} />
                <span>LƯU THAY ĐỔI</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* 2. THÂN SOẠN THẢO VỚI CÁC KHỐI, CÁC Ô NHƯ CẤU TRÚC TRANG CHÍNH */}
      <main className="max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6 flex-1">
        {/* KHỐI 1: NHẬN DIỆN & THÔNG TIN CƠ BẢN ĐƠN VỊ */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Building2 size={15} className="text-[#0284C7]" />
              Khối 1: Nhận Diện & Thông Tin Cơ Bản Đơn Vị
            </h2>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={activeUnit.isFlagship ?? false}
                onChange={(e) => onUpdateUnit(activeUnit.id, { isFlagship: e.target.checked })}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
              />
              <span>Đơn vị Nòng Cốt (Flagship)</span>
            </label>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Mã Đơn Vị (Code) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={activeUnit.code}
                  onChange={(e) => onUpdateUnit(activeUnit.id, { code: e.target.value.toUpperCase() })}
                  placeholder="Ví dụ: ENGLISH-CLUB"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-[#0284C7] focus:outline-hidden focus:border-sky-500 font-mono"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Tên Đầy Đủ Của Đơn Vị <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={activeUnit.name}
                  onChange={(e) => onUpdateUnit(activeUnit.id, { name: e.target.value })}
                  placeholder="Ví dụ: Câu lạc bộ Tiếng Anh The Sky First"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Khẩu Hiệu Định Vị / Slogan
              </label>
              <input
                type="text"
                value={activeUnit.tagline}
                onChange={(e) => onUpdateUnit(activeUnit.id, { tagline: e.target.value })}
                placeholder="Ví dụ: Tiên Phong Kiến Tạo - Khơi Nguồn Tri Thức Thực Nghiệm"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-sky-500 italic"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Lĩnh Vực Hoạt Động
                </label>
                <select
                  value={activeUnit.category}
                  onChange={(e) => {
                    const val=e.target.value;
                    const found=taxonomyOptions.find((x:any)=>x.id===val);
                    onUpdateUnit(activeUnit.id,{category:val,categoryLabel:found?.label||val});
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-sky-500"
                >
                  {taxonomyOptions.map((x:any)=><option key={x.id} value={x.id}>{x.label}</option>)}
                </select>
              </div>

              <EntityColorPicker
                label="Màu nhận diện đơn vị"
                entityLabel={activeUnit.categoryLabel || activeUnit.name}
                value={activeUnit.badgeColor}
                onChange={(badgeColor) => onUpdateUnit(activeUnit.id, { badgeColor })}
                helperText="Không giới hạn 4-5 màu. Để Tự động để màu ổn định theo tên lĩnh vực/đơn vị."
              />
            </div>
          </div>
        </div>

        {/* KHỐI 2: HÌNH ẢNH VĂN PHÒNG & NHẬN DIỆN */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <ImageIcon size={15} className="text-[#0284C7]" />
              Khối 2: Hình Ảnh Đại Diện Văn Phòng & Hoạt Động (không khóa tỉ lệ)
            </h2>
            <span className="text-[11px] text-slate-400">Ảnh gốc</span>
          </div>

          <div className="space-y-3">
            <ImageUrlInput
              label="Ảnh hoạt động đơn vị"
              value={activeUnit.imageUrl || ''}
              onChange={(url) => onUpdateUnit(activeUnit.id, { imageUrl: url })}
              helperText="1200x675px (không khóa tỉ lệ)"
              category="general"
              placeholder="Chọn ảnh từ kho Media hoặc tải ảnh lên"
            />

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Mô Tả / Chú Thích Ảnh
              </label>
              <input
                type="text"
                value={activeUnit.imageDescription || ''}
                onChange={(e) => onUpdateUnit(activeUnit.id, { imageDescription: e.target.value })}
                placeholder="Hình ảnh văn phòng làm việc và không gian thảo luận của đơn vị"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* KHỐI 3: BAN ĐIỀU HÀNH & LÃNH ĐẠO ĐƠN VỊ */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Users size={15} className="text-[#0284C7]" />
              Khối 3: Ban Chấp hành & Lãnh Đạo Đơn Vị
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Họ Và Tên Người Phụ Trách
              </label>
              <input
                type="text"
                value={activeUnit.leader?.name || ''}
                onChange={(e) =>
                  onUpdateUnit(activeUnit.id, {
                    leader: { ...activeUnit.leader, name: e.target.value }
                  })
                }
                placeholder="Ví dụ: ThS. Nguyễn Văn A"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Chức Danh / Vai Trò Điều Hành
              </label>
              <input
                type="text"
                value={activeUnit.leader?.title || ''}
                onChange={(e) =>
                  onUpdateUnit(activeUnit.id, {
                    leader: { ...activeUnit.leader, title: e.target.value }
                  })
                }
                placeholder="Ví dụ: Giám Đốc Trung Tâm / Trưởng Ban Chuyên Môn"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-sky-500"
              />
            </div>
          </div>

          <EntityColorPicker
            label="Màu chức danh người phụ trách"
            entityLabel={activeUnit.leader?.title || activeUnit.leader?.name || 'Người phụ trách'}
            value={activeUnit.leader?.color}
            onChange={(color) =>
              onUpdateUnit(activeUnit.id, {
                leader: { ...activeUnit.leader, color }
              })
            }
          />
        </div>

        {/* KHỐI 4: GIỚI THIỆU TỔNG QUAN & SỨ MỆNH CỐT LÕI */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <FileText size={15} className="text-[#0284C7]" />
              Khối 4: Giới Thiệu Tổng Quan & Sứ Mệnh Cốt Lõi
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Mô Tả Tổng Quan Vai Trò & Chức Năng
              </label>
              <textarea
                rows={3}
                value={activeUnit.description}
                onChange={(e) => onUpdateUnit(activeUnit.id, { description: e.target.value })}
                placeholder="Trình bày tổng quan về định hướng, mảng chuyên môn và cách thức đơn vị vận hành..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-sky-500 leading-relaxed font-normal"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Sứ Mệnh Hoạt Động & Cam Kết Giá Trị
              </label>
              <textarea
                rows={3}
                value={activeUnit.mission}
                onChange={(e) => onUpdateUnit(activeUnit.id, { mission: e.target.value })}
                placeholder="Sứ mệnh cốt lõi mà đơn vị phụng sự cho thanh niên và cộng đồng..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-sky-500 leading-relaxed font-normal"
              />
            </div>
          </div>
        </div>

        {/* KHỐI 5: CHỨC NĂNG & NHIỆM VỤ TRỌNG TÂM (FUNCTIONS) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <CheckCircle2 size={15} className="text-[#0284C7]" />
              Khối 5: Chức Năng & Nhiệm Vụ Trọng Tâm (Functions)
            </h2>
            <span className="text-[11px] text-slate-400">
              {activeUnit.functions?.length || 0} nhiệm vụ
            </span>
          </div>

          {/* Danh sách nhiệm vụ */}
          <div className="space-y-2.5">
            {activeUnit.functions && activeUnit.functions.length > 0 ? (
              activeUnit.functions.map((fn, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-sky-50 text-[#0284C7] border border-sky-200 text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={fn}
                    onChange={(e) => handleUpdateFunction(idx, e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-sky-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveFunction(idx)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    title="Xóa nhiệm vụ này"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">Chưa thiết lập nhiệm vụ nào.</p>
            )}
          </div>

          {/* Thêm nhiệm vụ mới */}
          <div className="pt-2 flex items-center gap-2">
            <input
              type="text"
              value={newFunctionItem}
              onChange={(e) => setNewFunctionItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFunction())}
              placeholder="Nhập nhiệm vụ mới (ví dụ: Tổ chức diễn đàn học thuật định kỳ)..."
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-sky-500"
            />
            <button
              type="button"
              onClick={handleAddFunction}
              className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-[#0284C7] border border-sky-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus size={14} />
              <span>Thêm Nhiệm Vụ</span>
            </button>
          </div>
        </div>

        {/* KHỐI 6: DỰ ÁN & HOẠT ĐỘNG TIÊU BIỂU (KEY PROJECTS) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Award size={15} className="text-[#0284C7]" />
              Khối 6: Dự Án & Hoạt Động Tiêu Biểu (Key Projects)
            </h2>
            <span className="text-[11px] text-slate-400">
              {activeUnit.keyProjects?.length || 0} dự án
            </span>
          </div>

          {/* Danh sách dự án trọng điểm */}
          <div className="space-y-2.5">
            {activeUnit.keyProjects && activeUnit.keyProjects.length > 0 ? (
              activeUnit.keyProjects.map((prj, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs font-bold flex items-center justify-center shrink-0">
                    <Check size={13} />
                  </span>
                  <input
                    type="text"
                    value={prj}
                    onChange={(e) => handleUpdateProject(idx, e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-sky-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveProject(idx)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    title="Xóa dự án này"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">Chưa thiết lập dự án tiêu biểu nào.</p>
            )}
          </div>

          {/* Thêm dự án mới */}
          <div className="pt-2 flex items-center gap-2">
            <input
              type="text"
              value={newProjectItem}
              onChange={(e) => setNewProjectItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddProject())}
              placeholder="Nhập tên dự án tiêu biểu mới..."
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-sky-500"
            />
            <button
              type="button"
              onClick={handleAddProject}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus size={14} />
              <span>Thêm Dự Án</span>
            </button>
          </div>
        </div>

        {/* KHỐI 7: THÔNG TIN LIÊN HỆ & CỔNG THÔNG TIN (CONTACT) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Mail size={15} className="text-[#0284C7]" />
              Khối 7: Thông Tin Đầu Mối Liên Hệ & Website
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <MapPin size={13} className="text-[#0284C7]" />
                Địa chỉ liên hệ công khai (nếu có)
              </label>
              <input
                type="text"
                value={activeUnit.contact?.address || ''}
                onChange={(e) =>
                  onUpdateUnit(activeUnit.id, {
                    contact: { ...activeUnit.contact, address: e.target.value }
                  })
                }
                placeholder=""
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <Mail size={13} className="text-[#0284C7]" />
                Email Tiếp Nhận
              </label>
              <input
                type="text"
                value={activeUnit.contact?.email || ''}
                onChange={(e) =>
                  onUpdateUnit(activeUnit.id, {
                    contact: { ...activeUnit.contact, email: e.target.value }
                  })
                }
                placeholder="lienhe@skyfirst.io.vn"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <Phone size={13} className="text-[#0284C7]" />
                Số Điện Thoại / Hotline
              </label>
              <input
                type="text"
                value={activeUnit.contact?.phone || ''}
                onChange={(e) =>
                  onUpdateUnit(activeUnit.id, {
                    contact: { ...activeUnit.contact, phone: e.target.value }
                  })
                }
                placeholder="0924 910 210"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <Globe size={13} className="text-[#0284C7]" />
                Website / Portal URL
              </label>
              <input
                type="text"
                value={activeUnit.contact?.portal || ''}
                onChange={(e) =>
                  onUpdateUnit(activeUnit.id, {
                    contact: { ...activeUnit.contact, portal: e.target.value }
                  })
                }
                placeholder="https://skyfirst.network"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-[#0284C7] focus:outline-hidden focus:border-sky-500"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
