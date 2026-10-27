import React, { useState } from 'react';
import {
  Calendar,
  MapPin,
  Users,
  ArrowRight,
  Search,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useDataContext } from '../context/DataContext';
import { ImagePlaceholder } from '../components/UIPrimitives';
import { EntityBadge, getSemanticStatusColor } from '../components/UIPrimitives';
import { Program, ProgramCategory, PageRoute } from '../types';

interface ProgramsPageProps {
  onSelectProgram: (program: Program) => void;
  onNavigate: (page: PageRoute) => void;
}

export const ProgramsPage: React.FC<ProgramsPageProps> = ({
  onSelectProgram,
}) => {
  const { programs, siteConfig } = useDataContext();
  const [selectedCategory, setSelectedCategory] = useState<ProgramCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const publishedPrograms = programs.filter((p) => p.isPublished !== false);

  const categories: { id: ProgramCategory; label: string; count: number }[] = [
    { id: 'all', label: 'Tất cả chương trình', count: publishedPrograms.length },
    { id: 'education', label: 'Giáo dục & Đào tạo', count: publishedPrograms.filter(p => p.category === 'education').length },
    { id: 'volunteer', label: 'Tình nguyện cộng đồng', count: publishedPrograms.filter(p => p.category === 'volunteer').length },
    { id: 'recruitment', label: 'Tuyển dụng Core Team', count: publishedPrograms.filter(p => p.category === 'recruitment').length },
    { id: 'workshop', label: 'Workshop & Tọa đàm', count: publishedPrograms.filter(p => p.category === 'workshop').length },
  ];

  const filteredPrograms = publishedPrograms.filter((prog) => {
    const matchesCat = selectedCategory === 'all' || prog.category === selectedCategory;
    const matchesQuery =
      prog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prog.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prog.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="space-y-10 py-6 sm:py-10">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-center max-w-3xl mx-auto space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-xs font-black text-[#0284C7]">
            <span>{siteConfig.programsLabel || 'Chương trình & hoạt động'}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            {siteConfig.programsHeading || 'Chương trình hoạt động'}
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-normal">
            {siteConfig.siteDescription || 'Khám phá các chương trình và hoạt động đang được công bố.'}
          </p>
        </motion.div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]"></span>
                <h2 className="text-2xl sm:text-3xl font-black text-[#0284C7] tracking-tight">
                  Danh Sách Dự Án
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Hiển thị {filteredPrograms.length} chương trình đang hoạt động
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm chương trình..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white focus:border-[#0284C7] focus:ring-2 focus:ring-sky-100 outline-none text-xs sm:text-sm font-medium shadow-2xs"
              />
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#0284C7] text-white shadow-sm shadow-sky-500/25'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white text-[#0284C7]' : 'bg-slate-100 text-slate-600'}`}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {filteredPrograms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 sm:gap-7">
            {filteredPrograms.map((prog, prIdx) => (
              <motion.div
                key={prog.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.35, delay: (prIdx % 4) * 0.08 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  <div className="p-3.5 bg-slate-50 border-b border-slate-100">
                    <ImagePlaceholder
                      sizeText={prog.imageSizeText}
                      description={prog.imageDescription || prog.title}
                      aspectRatio="auto"
                      objectFit={prog.imageFit || 'original'}
                      theme={prog.theme || 'sky'}
                      imageUrl={prog.imageUrl}
                    />
                  </div>

                  <div className="p-6 space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <EntityBadge label={prog.categoryLabel} color={prog.categoryColor} className="text-xs" />
                      <EntityBadge
                        label={prog.statusLabel}
                        color={prog.statusColor || getSemanticStatusColor(prog.status)}
                        solid
                        className="text-xs"
                      />
                    </div>

                    <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-[#0284C7] transition leading-snug">
                      {prog.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                      {prog.summary}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-[#0284C7] flex-shrink-0" />
                        <span className="font-medium truncate">{prog.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-[#0284C7] flex-shrink-0" />
                        <span className="font-medium truncate">{prog.location}</span>
                      </div>
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <Users size={14} className="text-[#0284C7] flex-shrink-0" />
                        <span className="font-medium truncate">{prog.targetAudience}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-black text-[#0284C7] uppercase tracking-wider">
                        Quyền Lợi Tiêu Biểu:
                      </div>
                      {(prog.benefits || []).slice(0, 2).map((b, bIdx) => (
                        <div key={bIdx} className="flex items-start gap-1.5 text-xs text-slate-600">
                          <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-1">{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between gap-3">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onSelectProgram(prog)}
                    className="w-full py-3 bg-[#0284C7] hover:bg-[#0369A1] text-white font-extrabold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-sm shadow-sky-500/20"
                  >
                    <span>Xem Lộ trình & Đăng ký</span>
                    <ArrowRight size={14} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 space-y-3">
            <Filter size={32} className="mx-auto text-slate-300" />
            <h3 className="text-base font-bold text-slate-700">Không tìm thấy chương trình phù hợp</h3>
            <p className="text-xs text-slate-500">Vui lòng thử tìm với từ khóa khác hoặc chuyển danh mục.</p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-sky-50 text-[#0284C7] rounded-xl text-xs font-bold hover:bg-sky-100 transition"
            >
              Xem tất cả chương trình
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
