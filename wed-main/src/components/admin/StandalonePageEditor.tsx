
import React, { useRef, useState } from 'react';
import { ArrowLeft, Award, Building2, Calendar, Check, CheckCircle2, Clock, Compass, Copy, CreditCard, ExternalLink, Eye, FileText, Gift, Globe, GraduationCap, HeartHandshake, HelpCircle, Image as ImageIcon, Layers, Link as LinkIcon, Mail, MapPin, Megaphone, MessageSquare, Milestone, Phone, Plus, QrCode, RotateCcw, Save, Search, Send, ShieldCheck, Sparkles, Trash2, TrendingUp, Upload, User, UserPlus, Users } from 'lucide-react';
import { CorePillar, CoreValueItem, CustomPage, PageBlock, PageBlockType, TeamMember, TimelineMilestone } from '../../types';
import { CORE_PILLARS, CORE_VALUES, TEAM_DATA, TIMELINE_DATA } from '../../data/baselineData';
import { createUniqueSlug, generateSlug } from '../../utils/contentUtils';
import { EntityColorPicker, ImageUrlInput } from '../../components/UIPrimitives';
import { RichTextEditor } from './RichTextEditor';
import { uploadMedia } from '../../lib/firebase';





interface StandalonePageEditorProps {
  page: CustomPage;
  onSave: (updatedPage: Partial<CustomPage>) => Promise<boolean> | boolean | void;
  onClose: () => void;
  onShowToast: (message: string) => void;
  existingSlugs?: string[];
}

export const StandalonePageEditor: React.FC<StandalonePageEditorProps> = ({
  page,
  onSave,
  onClose,
  onShowToast,
  existingSlugs = [],
}) => {
  // Page Type flags
  const isAboutPage = page.slug === 'about' || page.type === 'about';
  const isCertificatePage = page.slug === 'certificate' || page.type === 'certificate';
  const isSponsorPage = page.slug === 'sponsor' || page.type === 'sponsor';
  const isJoinPage = page.slug === 'join' || page.type === 'join';
  const isContactPage = page.slug === 'contact' || page.type === 'contact';

  // 1. Common Basic States
  const [title, setTitle] = useState(page.title || '');
  const [slug, setSlug] = useState(page.slug || '');
  const [slugTouched, setSlugTouched] = useState(Boolean(page.isPublished));
  React.useEffect(() => { if (!slugTouched) setSlug(generateSlug(title)); }, [title, slugTouched]);
  const [badge, setBadge] = useState(page.badge || '');
  const [summary, setSummary] = useState(page.summary || '');
  const [content, setContent] = useState(page.contentFormatted || page.content || '');
  const [imageUrl, setImageUrl] = useState(page.imageUrl || '');
  const [imageFit,setImageFit]=useState<'original'|'contain'|'cover'>(page.imageFit||'original');
  const [imageFocalX,setImageFocalX]=useState<number>(Number.isFinite(page.imageFocalX)?Number(page.imageFocalX):50);
  const [imageFocalY,setImageFocalY]=useState<number>(Number.isFinite(page.imageFocalY)?Number(page.imageFocalY):50);
  const [secondaryImageUrl, setSecondaryImageUrl] = useState(page.secondaryImageUrl || '');
  const [pageBlocks, setPageBlocks] = useState<PageBlock[]>(Array.isArray(page.pageBlocks) ? page.pageBlocks : []);
  const [seoTitle,setSeoTitle]=useState(page.seoTitle||'');
  const [seoDescription,setSeoDescription]=useState(page.seoDescription||'');
  const [ogImageUrl,setOgImageUrl]=useState(page.ogImageUrl||'');
  const [canonicalUrl,setCanonicalUrl]=useState(page.canonicalUrl||'');
  const [noIndex,setNoIndex]=useState(Boolean(page.noIndex));
  const addPageBlock = (type: PageBlockType) => {
    const id = `block-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    const base: PageBlock = { id, type, background: 'white', align: 'left' };
    if (type === 'stats') base.stats = [{ value: '0', label: 'Chỉ số' }];
    if (type === 'cta') { base.title = 'Lời kêu gọi hành động'; base.buttonLabel = 'Tìm hiểu thêm'; base.buttonUrl = '/contact'; }
    setPageBlocks((prev) => [...prev, base]);
  };
  const updatePageBlock = (id: string, updates: Partial<PageBlock>) => setPageBlocks((prev) => prev.map((b) => b.id === id ? { ...b, ...updates } : b));
  const movePageBlock = (index: number, dir: -1 | 1) => setPageBlocks((prev) => { const next=[...prev]; const target=index+dir; if(target<0||target>=next.length)return prev; [next[index],next[target]]=[next[target],next[index]]; return next; });
  const deletePageBlock = (id: string) => setPageBlocks((prev) => prev.filter((b) => b.id !== id));
  const [author, setAuthor] = useState(page.author || 'Ban Quản trị Sky First Network');
  const [publishedAt, setPublishedAt] = useState(
    page.publishedAt || new Date().toLocaleDateString('vi-VN')
  );
  const [isPublished, setIsPublished] = useState<boolean>(page.isPublished === true);
  const [showInFooter, setShowInFooter] = useState<boolean>(page.showInFooter !== false);

  // Common Action Buttons (Tên nút và liên kết trỏ đến)
  const [buttonLabel, setButtonLabel] = useState(page.buttonLabel || '');
  const [buttonUrl, setButtonUrl] = useState(page.buttonUrl || '');
  const [secondaryButtonLabel, setSecondaryButtonLabel] = useState(page.secondaryButtonLabel || '');
  const [secondaryButtonUrl, setSecondaryButtonUrl] = useState(page.secondaryButtonUrl || '');

  // 2. About Page specific states
  const [visionBadge, setVisionBadge] = useState(page.visionBadge || 'Định Hướng Chiến Lược');
  const [visionTitle, setVisionTitle] = useState(page.visionTitle || 'Tầm Nhìn 2030');
  const [visionContent, setVisionContent] = useState(
    page.visionContent ||
      'Nội dung tầm nhìn được cập nhật theo tài liệu chính thức của Sky First Network.'
  );
  const [missionBadge, setMissionBadge] = useState(page.missionBadge || 'Mục Tiêu Hành Động');
  const [missionTitle, setMissionTitle] = useState(page.missionTitle || 'Sứ Mệnh Phụng Sự');
  const [missionContent, setMissionContent] = useState(
    page.missionContent ||
      'Nội dung sứ mệnh được cập nhật theo tài liệu chính thức của Sky First Network.'
  );
  const [philosophyBadge, setPhilosophyBadge] = useState(page.philosophyBadge || 'Giá Trị Cốt Lõi');
  const [philosophyTitle, setPhilosophyTitle] = useState(page.philosophyTitle || 'Triết Lý Cốt Lõi');
  const [philosophyContent, setPhilosophyContent] = useState(
    page.philosophyContent ||
      '"Học để Phụng sự - Phụng sự để Trưởng thành". Sự tiến bộ của từng cá nhân gắn liền mật thiết với giá trị mà bạn đem lại cho cộng đồng xung quanh.'
  );
  // About Page: Pillars
  const [pillarsSectionTitle, setPillarsSectionTitle] = useState(
    page.pillarsSectionTitle || '5 Trụ Cột Hoạt Động Cốt Lõi'
  );
  const [pillarsSectionBadge, setPillarsSectionBadge] = useState(
    page.pillarsSectionBadge || 'Định Hướng Chiến Lược'
  );
  const [customPillars, setCustomPillars] = useState<CorePillar[]>(
    page.customPillars && page.customPillars.length > 0 ? page.customPillars : [...CORE_PILLARS]
  );

  // About Page: Values
  const [valuesSectionTitle, setValuesSectionTitle] = useState(
    page.valuesSectionTitle || 'Giá Trị Cốt Lõi'
  );
  const [customValues, setCustomValues] = useState<CoreValueItem[]>(
    page.customValues && page.customValues.length > 0 ? page.customValues : [...CORE_VALUES]
  );

  // About Page: Timeline
  const [timelineSectionTitle, setTimelineSectionTitle] = useState(
    page.timelineSectionTitle || 'Hành Trình Phát Triển'
  );
  const [timelineSectionBadge, setTimelineSectionBadge] = useState(
    page.timelineSectionBadge || '2024 - 2026'
  );
  const [customTimeline, setCustomTimeline] = useState<TimelineMilestone[]>(
    page.customTimeline && page.customTimeline.length > 0 ? page.customTimeline : [...TIMELINE_DATA]
  );

  // About Page: Team
  const [teamSectionTitle, setTeamSectionTitle] = useState(
    page.teamSectionTitle || 'Đội Ngũ Lãnh Đạo'
  );
  const [teamSectionSubtitle, setTeamSectionSubtitle] = useState(
    page.teamSectionSubtitle || 'Ban Chấp hành Sky First Network'
  );
  const [customTeam, setCustomTeam] = useState<TeamMember[]>(
    Array.isArray(page.customTeam) ? page.customTeam : [...TEAM_DATA]
  );

  // About Page: Units
  const [unitsSectionBadge, setUnitsSectionBadge] = useState(
    page.unitsSectionBadge || 'Hệ Thống Đơn Vị Trực Thuộc'
  );
  const [unitsSectionTitle, setUnitsSectionTitle] = useState(
    page.unitsSectionTitle || 'Đơn vị trực thuộc Sky First Network'
  );
  const [unitsButtonLabel, setUnitsButtonLabel] = useState(
    page.unitsButtonLabel || 'Xem chi tiết tất cả đơn vị'
  );
  const [unitsButtonUrl, setUnitsButtonUrl] = useState(page.unitsButtonUrl || '/units');
  const [ctaTitle, setCtaTitle] = useState(page.ctaTitle || 'Kết nối cùng Sky First Network');
  const [ctaDescription, setCtaDescription] = useState(
    page.ctaDescription ||
      'Dù bạn là học viên, tình nguyện viên hay đối tác tổ chức, cánh cửa của Sky First Network luôn rộng mở đón chào bạn.'
  );

  // 3. Certificate Page specific states
  const [certSearchLabel, setCertSearchLabel] = useState(
    page.certSearchLabel || 'Mã Tra Cứu Chứng Nhận'
  );
  const [certSearchPlaceholder, setCertSearchPlaceholder] = useState(
    page.certSearchPlaceholder || 'Nhập mã Giấy chứng nhận'
  );
  const [certGuidanceNote, setCertGuidanceNote] = useState(
    page.certGuidanceNote ||
      'Hệ thống tra cứu tự động đối chiếu mã số với cơ sở dữ liệu số hóa hệ thống Giấy chứng nhận theo thời gian thực.'
  );
  const [certSearchButtonLabel, setCertSearchButtonLabel] = useState(
    page.certSearchButtonLabel || 'Tra Cứu'
  );
  const [certResetButtonLabel, setCertResetButtonLabel] = useState(
    page.certResetButtonLabel || 'Làm mới'
  );
  const [certFeature1Title, setCertFeature1Title] = useState(
    page.certFeature1Title || 'Mã Định Danh Duy Nhất'
  );
  const [certFeature1Desc, setCertFeature1Desc] = useState(
    page.certFeature1Desc ||
      'Mỗi Giấy chứng nhận được ghi nhận bằng một mã phục vụ việc tra cứu và đối chiếu thông tin.'
  );
  const [certFeature2Title, setCertFeature2Title] = useState(
    page.certFeature2Title || 'Lưu Trữ Trong Hệ Thống'
  );
  const [certFeature2Desc, setCertFeature2Desc] = useState(
    page.certFeature2Desc ||
      'Hồ sơ được lưu trữ trên cơ sở dữ liệu số của Sky First Network phục vụ việc đối chiếu thông tin.'
  );
  const [certFeature3Title, setCertFeature3Title] = useState(
    page.certFeature3Title || 'Hỗ Trợ Nhanh Chóng'
  );
  const [certFeature3Desc, setCertFeature3Desc] = useState(
    page.certFeature3Desc ||
      'Cần xác minh bổ sung hoặc chỉnh sửa thông tin, vui lòng gửi yêu cầu qua trang Liên hệ.'
  );
  const [certCtaTitle, setCertCtaTitle] = useState(
    page.certCtaTitle || 'Bạn cần hỗ trợ tra cứu hoặc cấp lại chứng nhận?'
  );
  const [certCtaDescription, setCertCtaDescription] = useState(
    page.certCtaDescription ||
      'Đội ngũ điều phối và kỹ thuật viên hệ thống Giấy chứng nhận luôn sẵn sàng giải đáp và xử lý yêu cầu xác minh thông tin.'
  );
  const [certCtaButtonLabel, setCertCtaButtonLabel] = useState(
    page.certCtaButtonLabel || 'Gửi Yêu Cầu Hỗ Trợ'
  );
  const [certCtaButtonUrl, setCertCtaButtonUrl] = useState(
    page.certCtaButtonUrl || '/contact'
  );

  const [certStatIssuedMode,setCertStatIssuedMode]=useState<'auto'|'manual'>(page.certStatIssuedMode||'auto');
  const [certStatIssuedManual,setCertStatIssuedManual]=useState(page.certStatIssuedManual||'');
  const [certStatValidMode,setCertStatValidMode]=useState<'auto'|'manual'>(page.certStatValidMode||'auto');
  const [certStatValidManual,setCertStatValidManual]=useState(page.certStatValidManual||'');
  const [certStatProgramsMode,setCertStatProgramsMode]=useState<'auto'|'manual'>(page.certStatProgramsMode||'auto');
  const [certStatProgramsManual,setCertStatProgramsManual]=useState(page.certStatProgramsManual||'');
  const [certStatUpdatedMode,setCertStatUpdatedMode]=useState<'auto'|'manual'>(page.certStatUpdatedMode||'auto');
  const [certStatUpdatedManual,setCertStatUpdatedManual]=useState(page.certStatUpdatedManual||'');

  // 4. Sponsor Page specific states
  // 4.1 Hero Buttons
  const [sponsorHeroPrimaryButtonLabel, setSponsorHeroPrimaryButtonLabel] = useState(
    page.sponsorHeroPrimaryButtonLabel || 'Đăng Ký Tài Trợ Ngay'
  );
  const [sponsorHeroPrimaryButtonUrl, setSponsorHeroPrimaryButtonUrl] = useState(
    page.sponsorHeroPrimaryButtonUrl || '/contact'
  );
  const [sponsorHeroSecondaryButtonLabel, setSponsorHeroSecondaryButtonLabel] = useState(
    page.sponsorHeroSecondaryButtonLabel || 'Thông Tin Chuyển Khoản'
  );
  const [sponsorHeroSecondaryButtonUrl, setSponsorHeroSecondaryButtonUrl] = useState(
    page.sponsorHeroSecondaryButtonUrl || '#thong-tin-chuyen-khoan'
  );

  // 4.2 Commitments
  const [sponsorCommitmentHeading, setSponsorCommitmentHeading] = useState(
    page.sponsorCommitmentHeading || '4 Cam Kết Minh Bạch Dành Cho Nhà Tài Trợ'
  );
  const [sponsorCommitmentSubtitle, setSponsorCommitmentSubtitle] = useState(
    page.sponsorCommitmentSubtitle ||
      'Mọi nguồn lực quý báu được quý đối tác gửi gắm đều được quản lý với tiêu chuẩn trách nhiệm cao nhất.'
  );
  const [sponsorCommit1Title, setSponsorCommit1Title] = useState(
    page.sponsorCommit1Title || 'Minh bạch theo thông tin được xác nhận'
  );
  const [sponsorCommit1Desc, setSponsorCommit1Desc] = useState(
    page.sponsorCommit1Desc ||
      'Cập nhật thu - chi rõ ràng theo từng dự án cụ thể, lưu trữ chứng từ hóa đơn đầy đủ và minh bạch.'
  );
  const [sponsorCommit2Title, setSponsorCommit2Title] = useState(
    page.sponsorCommit2Title || 'Giấy chứng nhận'
  );
  const [sponsorCommit2Desc, setSponsorCommit2Desc] = useState(
    page.sponsorCommit2Desc ||
      'Việc ghi nhận hoặc cấp Giấy chứng nhận, nếu có, phụ thuộc vào từng chương trình và thông tin được công bố chính thức.'
  );
  const [sponsorCommit3Title, setSponsorCommit3Title] = useState(
    page.sponsorCommit3Title || 'Báo Cáo Tác Động Thực'
  );
  const [sponsorCommit3Desc, setSponsorCommit3Desc] = useState(
    page.sponsorCommit3Desc ||
      'Gửi tận tay nhà tài trợ báo cáo hình ảnh, video và số liệu thụ hưởng thực tế sau khi dự án hoàn thành.'
  );
  const [sponsorCommit4Title, setSponsorCommit4Title] = useState(
    page.sponsorCommit4Title || 'Lan Tỏa Truyền Thông'
  );
  const [sponsorCommit4Desc, setSponsorCommit4Desc] = useState(
    page.sponsorCommit4Desc ||
      'Đồng hành cùng Trung tâm Truyền thông hoạt động truyền thông để tôn vinh những nghĩa cử nhân văn đến cộng đồng người trẻ.'
  );

  // 4.3 Packages
  const [sponsorPackagesHeading, setSponsorPackagesHeading] = useState(
    page.sponsorPackagesHeading || 'Các hình thức đồng hành cùng Sky First Network'
  );
  const [sponsorPackagesSubtitle, setSponsorPackagesSubtitle] = useState(
    page.sponsorPackagesSubtitle ||
      'Lựa chọn hình thức đồng hành phù hợp với mục tiêu của chương trình và khả năng của bên đóng góp.'
  );
  const [sponsorPkg1Title, setSponsorPkg1Title] = useState(
    page.sponsorPkg1Title || 'Học Bổng Tri Thức & Kỹ Năng'
  );
  const [sponsorPkg1Badge, setSponsorPkg1Badge] = useState(
    page.sponsorPkg1Badge || 'BẢO TRỢ ĐÀO TẠO'
  );
  const [sponsorPkg1Unit, setSponsorPkg1Unit] = useState(
    page.sponsorPkg1Unit || ''
  );
  const [sponsorPkg1Desc, setSponsorPkg1Desc] = useState(
    page.sponsorPkg1Desc ||
      'Tài trợ học bổng các khóa đào tạo kỹ năng thực chiến, chuyển đổi số và công nghệ cho học sinh, sinh viên có hoàn cảnh khó khăn hoặc tài năng trẻ.'
  );
  const [sponsorPkg1Impact, setSponsorPkg1Impact] = useState(
    page.sponsorPkg1Impact ||
      ''
  );

  const [sponsorPkg2Title, setSponsorPkg2Title] = useState(
    page.sponsorPkg2Title || 'Chiến Dịch Phụng Sự Cộng Đồng'
  );
  const [sponsorPkg2Badge, setSponsorPkg2Badge] = useState(
    page.sponsorPkg2Badge || 'TÁC ĐỘNG XÃ HỘI'
  );
  const [sponsorPkg2Unit, setSponsorPkg2Unit] = useState(
    page.sponsorPkg2Unit || 'Đồng hành cùng hoạt động tình nguyện (Tình nguyện)'
  );
  const [sponsorPkg2Desc, setSponsorPkg2Desc] = useState(
    page.sponsorPkg2Desc ||
      'Bảo trợ kinh phí tổ chức các chiến dịch thiện nguyện quy mô lớn: Chiến dịch Mùa Hè Xanh, Tình Nguyện Đông Xuân, Xây dựng Tủ sách Vùng cao và Khám bệnh lưu động.'
  );
  const [sponsorPkg2Impact, setSponsorPkg2Impact] = useState(
    page.sponsorPkg2Impact ||
      'Trực tiếp mang tri thức, nước sạch và quà tặng thiết thực đến các điểm trường nghèo khó.'
  );

  const [sponsorPkg3Title, setSponsorPkg3Title] = useState(
    page.sponsorPkg3Title || 'Tài Trợ Hiện Vật & Cơ Sở Hạ Tầng'
  );
  const [sponsorPkg3Badge, setSponsorPkg3Badge] = useState(
    page.sponsorPkg3Badge || 'HỖ TRỢ THIẾT BỊ'
  );
  const [sponsorPkg3Unit, setSponsorPkg3Unit] = useState(
    page.sponsorPkg3Unit || 'Đồng hành cùng hoạt động truyền thông & hệ thống Giấy chứng nhận'
  );
  const [sponsorPkg3Desc, setSponsorPkg3Desc] = useState(
    page.sponsorPkg3Desc ||
      'Hỗ trợ máy tính, thiết bị âm thanh, phòng hội thảo, tài khoản phần mềm, sách giáo khoa hoặc phương tiện di chuyển phục vụ công tác xã hội.'
  );
  const [sponsorPkg3Impact, setSponsorPkg3Impact] = useState(
    page.sponsorPkg3Impact ||
      'Tối ưu hóa nguồn lực vận hành, nâng cao chất lượng trải nghiệm học tập và công tác thiện nguyện.'
  );

  const [sponsorPkg4Title, setSponsorPkg4Title] = useState(
    page.sponsorPkg4Title || 'Hợp tác dài hạn'
  );
  const [sponsorPkg4Badge, setSponsorPkg4Badge] = useState(
    page.sponsorPkg4Badge || 'ĐỒNG HÀNH TOÀN DIỆN'
  );
  const [sponsorPkg4Unit, setSponsorPkg4Unit] = useState(
    page.sponsorPkg4Unit || 'Đồng hành cùng Ban Chấp hành Sky First Network'
  );
  const [sponsorPkg4Desc, setSponsorPkg4Desc] = useState(
    page.sponsorPkg4Desc ||
      'Trao đổi và thống nhất phạm vi hợp tác phù hợp theo từng chương trình hoặc nhu cầu thực tế.'
  );
  const [sponsorPkg4Impact, setSponsorPkg4Impact] = useState(
    page.sponsorPkg4Impact ||
      'Có thể trao đổi hình thức đồng hành dài hạn phù hợp với từng chương trình.'
  );

  // 4.4 Bank details & contacts
  const [sponsorRecipientEntity, setSponsorRecipientEntity] = useState(page.sponsorRecipientEntity || '');
  const [sponsorGoalAmount, setSponsorGoalAmount] = useState(page.sponsorGoalAmount || '');
  const [sponsorReceivedAmount, setSponsorReceivedAmount] = useState(page.sponsorReceivedAmount || '');
  const [sponsorPublicLedgerUrl, setSponsorPublicLedgerUrl] = useState(page.sponsorPublicLedgerUrl || '');
  const [sponsorBankName, setSponsorBankName] = useState(page.sponsorBankName || '');
  const [sponsorBankId, setSponsorBankId] = useState(page.sponsorBankId || '');
  const [sponsorBankAccount, setSponsorBankAccount] = useState(
    page.sponsorBankAccount || ''
  );
  const [sponsorAccountHolder, setSponsorAccountHolder] = useState(
    page.sponsorAccountHolder || ''
  );
  const [sponsorBankBranch, setSponsorBankBranch] = useState(
    page.sponsorBankBranch || ''
  );
  const [sponsorTransferSyntax, setSponsorTransferSyntax] = useState(
    page.sponsorTransferSyntax || 'DONG GOP [HO TEN]'
  );
  const [sponsorQrCodeUrl, setSponsorQrCodeUrl] = useState(
    page.sponsorQrCodeUrl || ''
  );
  const [sponsorQrCodeTitle, setSponsorQrCodeTitle] = useState(
    page.sponsorQrCodeTitle || 'Mã QR chuyển khoản'
  );
  const [sponsorDonationNotice, setSponsorDonationNotice] = useState(page.sponsorDonationNotice || 'Vui lòng kiểm tra đúng tên người nhận, ngân hàng, số tài khoản, số tiền và nội dung trước khi xác nhận chuyển khoản. Sky First Network không tự động xác nhận đã nhận tiền chỉ dựa trên việc quét mã.');
  const [sponsorSuggestedAmounts, setSponsorSuggestedAmounts] = useState(page.sponsorSuggestedAmounts || '50000,100000,200000,500000');
  const [sponsorQrCodeSubtitle, setSponsorQrCodeSubtitle] = useState(
    page.sponsorQrCodeSubtitle || 'Quét bằng mọi ứng dụng Ngân hàng & Ví điện tử'
  );
  const [sponsorCopyButtonLabel, setSponsorCopyButtonLabel] = useState(
    page.sponsorCopyButtonLabel || 'Sao chép số tài khoản'
  );
  const [sponsorHotline, setSponsorHotline] = useState(page.sponsorHotline || '0924 910 210');
  const [sponsorEmail, setSponsorEmail] = useState(page.sponsorEmail || 'hoptac@skyfirst.io.vn');
  const [sponsorContactLeadTitle, setSponsorContactLeadTitle] = useState(
    page.sponsorContactLeadTitle || 'Ban Đối ngoại & Sự kiện'
  );
  const [sponsorContactHeading, setSponsorContactHeading] = useState(
    page.sponsorContactHeading || 'Đồng hành & Hợp tác cùng Sky First Network'
  );
  const [sponsorContactDescription, setSponsorContactDescription] = useState(
    page.sponsorContactDescription ||
      'Quý doanh nghiệp, tổ chức và cá nhân vui lòng liên hệ Ban Đối ngoại & Sự kiện để trao đổi phạm vi đồng hành, mục đích sử dụng nguồn lực và phương thức công khai thông tin phù hợp.'
  );
  const [sponsorContactButtonLabel, setSponsorContactButtonLabel] = useState(
    page.sponsorContactButtonLabel || 'Gửi Đề Xuất Tại Trang Liên Hệ'
  );
  const [sponsorContactButtonUrl, setSponsorContactButtonUrl] = useState(
    page.sponsorContactButtonUrl || '/contact'
  );
  const [sponsorUnitsButtonLabel, setSponsorUnitsButtonLabel] = useState(
    page.sponsorUnitsButtonLabel || 'Xem đơn vị trực thuộc'
  );
  const [sponsorUnitsButtonUrl, setSponsorUnitsButtonUrl] = useState(
    page.sponsorUnitsButtonUrl || '/units'
  );
  const [sponsorContactHotline, setSponsorContactHotline] = useState(
    page.sponsorContactHotline || '0924 910 210'
  );
  const [sponsorContactEmail, setSponsorContactEmail] = useState(
    page.sponsorContactEmail || 'hoptac@skyfirst.io.vn'
  );

  // 4.5 FAQs
  const [sponsorFaqHeading, setSponsorFaqHeading] = useState(
    page.sponsorFaqHeading || 'Câu hỏi thường gặp về hợp tác & đồng hành'
  );
  const [sponsorFaqSubtitle, setSponsorFaqSubtitle] = useState(
    page.sponsorFaqSubtitle || 'GIẢI ĐÁP THẮC MẮC'
  );
  const [sponsorFaq1Q, setSponsorFaq1Q] = useState(
    page.sponsorFaq1Q || 'Cá nhân có thể đề xuất đồng hành cùng Sky First Network không?'
  );
  const [sponsorFaq1A, setSponsorFaq1A] = useState(
    page.sponsorFaq1A ||
      'Cá nhân hoặc đơn vị có thể gửi đề xuất đồng hành. Phạm vi, hình thức và đầu mối tiếp nhận được thống nhất theo từng chương trình cụ thể.'
  );
  const [sponsorFaq2Q, setSponsorFaq2Q] = useState(
    page.sponsorFaq2Q || 'Làm sao tôi có thể kiểm tra tính minh bạch của số tiền đã tài trợ?'
  );
  const [sponsorFaq2A, setSponsorFaq2A] = useState(
    page.sponsorFaq2A ||
      'Thông tin về tiếp nhận nguồn lực, tài chính hoặc quyền lợi đồng hành chỉ được công bố khi có cơ chế, phạm vi và tài liệu xác nhận phù hợp.'
  );
  const [sponsorFaq3Q, setSponsorFaq3Q] = useState(
    page.sponsorFaq3Q || 'Nhà tài trợ có được cấp Giấy Chứng Nhận chính thức không?'
  );
  const [sponsorFaq3A, setSponsorFaq3A] = useState(
    page.sponsorFaq3A ||
      'Việc ghi nhận hoặc cấp Giấy chứng nhận, nếu có, phụ thuộc vào từng chương trình và thông tin được công bố chính thức.'
  );
  const [sponsorFaq4Q, setSponsorFaq4Q] = useState(
    page.sponsorFaq4Q || 'Doanh nghiệp có được khấu trừ thuế TNDN cho khoản tài trợ này không?'
  );
  const [sponsorFaq4A, setSponsorFaq4A] = useState(
    page.sponsorFaq4A ||
      'Mọi nội dung hợp tác cần được xem xét theo phạm vi thực tế và quy định áp dụng; website không mặc định cam kết tư cách pháp lý, chứng từ hoặc ưu đãi cho bên đồng hành.'
  );

  // 4.6 Quick CTA
  const [sponsorCtaTitle, setSponsorCtaTitle] = useState(
    page.sponsorCtaTitle || 'Bạn muốn trao đổi trực tiếp cùng Ban Chấp hành Sky First Network?'
  );
  const [sponsorCtaDescription, setSponsorCtaDescription] = useState(
    page.sponsorCtaDescription ||
      'Vui lòng gọi hotline đối ngoại hoặc đặt lịch hẹn gặp trực tiếp tại Sky First Network.'
  );

  // 5. Join Page specific states
  const [joinRolesHeading, setJoinRolesHeading] = useState(
    page.joinRolesHeading || 'Các Nhóm Đối Tượng Tham Gia Sky First Network'
  );
  const [joinRolesSubtitle, setJoinRolesSubtitle] = useState(
    page.joinRolesSubtitle || 'Lựa chọn hình thức đóng góp và đồng hành phù hợp với năng lực và mục tiêu cá nhân'
  );

  const [joinRole1Title, setJoinRole1Title] = useState(
    page.joinRole1Title || 'Tình Nguyện Viên Chiến Dịch (hoạt động tình nguyện)'
  );
  const [joinRole1Tag, setJoinRole1Tag] = useState(page.joinRole1Tag || 'TÌNH NGUYỆN VIÊN');
  const [joinRole1Description, setJoinRole1Description] = useState(
    page.joinRole1Description ||
      'Tham gia trực tiếp các chiến dịch xã hội, mùa hè xanh, tiếp sức mùa thi và các hoạt động cộng đồng vì sự phát triển của thanh thiếu niên.'
  );
  const [joinRole1Period, setJoinRole1Period] = useState(
    page.joinRole1Period || 'Linh hoạt theo từng chiến dịch'
  );
  const [joinRole1ButtonLabel, setJoinRole1ButtonLabel] = useState(
    page.joinRole1ButtonLabel || 'Đăng Ký Tình Nguyện Viên'
  );
  const [joinRole1ButtonUrl, setJoinRole1ButtonUrl] = useState(
    page.joinRole1ButtonUrl || '/contact'
  );
  const [joinRole1Highlight1, setJoinRole1Highlight1] = useState(
    page.joinRole1Highlight1 || 'Thông tin ghi nhận hoặc Giấy chứng nhận theo từng chương trình, nếu có'
  );
  const [joinRole1Highlight2, setJoinRole1Highlight2] = useState(
    page.joinRole1Highlight2 || 'Linh hoạt đăng ký theo từng sự kiện và quỹ thời gian cá nhân'
  );
  const [joinRole1Highlight3, setJoinRole1Highlight3] = useState(
    page.joinRole1Highlight3 || 'Được tập huấn kỹ năng điều phối, an toàn và sơ cấp cứu thực tế'
  );
  const [joinRole1Highlight4, setJoinRole1Highlight4] = useState(
    page.joinRole1Highlight4 || 'Môi trường năng động kết nối bạn bè khắp các trường Đại học/THPT'
  );

  const [joinRole2Title, setJoinRole2Title] = useState(
    page.joinRole2Title || 'Thành Viên Ban Chấp hành & Core Team'
  );
  const [joinRole2Tag, setJoinRole2Tag] = useState(page.joinRole2Tag || 'Core Team Sky First Network');
  const [joinRole2Description, setJoinRole2Description] = useState(
    page.joinRole2Description ||
      'Tham gia các vai trò được công bố theo từng đợt tuyển và nhu cầu thực tế của mạng lưới.'
  );
  const [joinRole2Period, setJoinRole2Period] = useState(
    page.joinRole2Period || 'Nhiệm kỳ cam kết 06 - 12 tháng'
  );
  const [joinRole2ButtonLabel, setJoinRole2ButtonLabel] = useState(
    page.joinRole2ButtonLabel || 'Ứng Tuyển Ban Chấp hành'
  );
  const [joinRole2ButtonUrl, setJoinRole2ButtonUrl] = useState(
    page.joinRole2ButtonUrl || '/contact'
  );
  const [joinRole2Highlight1, setJoinRole2Highlight1] = useState(
    page.joinRole2Highlight1 || 'Được rèn luyện tư duy lãnh đạo, quản trị dự án chuyên nghiệp'
  );
  const [joinRole2Highlight2, setJoinRole2Highlight2] = useState(
    page.joinRole2Highlight2 || 'Chứng nhận bổ nhiệm và thư giới thiệu từ Ban Chấp hành Sky First Network'
  );
  const [joinRole2Highlight3, setJoinRole2Highlight3] = useState(
    page.joinRole2Highlight3 || 'Đào tạo nội bộ chuyên sâu cùng các cố vấn và chuyên gia đầu ngành'
  );
  const [joinRole2Highlight4, setJoinRole2Highlight4] = useState(
    page.joinRole2Highlight4 || 'Cơ hội tham gia các hoạt động phù hợp theo phân công'
  );

  const [joinRole3Title, setJoinRole3Title] = useState(
    page.joinRole3Title || 'Tổ Chức Đối Tác & Bảo Trợ Đồng Hành'
  );
  const [joinRole3Tag, setJoinRole3Tag] = useState(page.joinRole3Tag || 'ĐỐI TÁC CHIẾN LƯỢC');
  const [joinRole3Description, setJoinRole3Description] = useState(
    page.joinRole3Description ||
      'Dành cho CLB/Đội/Nhóm, Đoàn Thanh niên, các trường THPT, Đại học và Doanh nghiệp mong muốn kết nối nguồn lực cùng phát triển cộng đồng.'
  );
  const [joinRole3Period, setJoinRole3Period] = useState(
    page.joinRole3Period || 'Theo chương trình / thỏa thuận phù hợp'
  );
  const [joinRole3ButtonLabel, setJoinRole3ButtonLabel] = useState(
    page.joinRole3ButtonLabel || 'Gửi Đề Xuất Hợp Tác'
  );
  const [joinRole3ButtonUrl, setJoinRole3ButtonUrl] = useState(
    page.joinRole3ButtonUrl || '/contact'
  );
  const [joinRole3Highlight1, setJoinRole3Highlight1] = useState(
    page.joinRole3Highlight1 || 'Đồng tổ chức các sự kiện giáo dục, hướng nghiệp quy mô lớn'
  );
  const [joinRole3Highlight2, setJoinRole3Highlight2] = useState(
    page.joinRole3Highlight2 || 'Bảo trợ kỹ thuật xác thực chứng nhận số miễn phí qua hệ thống hệ thống Giấy chứng nhận'
  );
  const [joinRole3Highlight3, setJoinRole3Highlight3] = useState(
    page.joinRole3Highlight3 || 'Tối ưu hóa nguồn lực truyền thông đa kênh tiếp cận học sinh - sinh viên'
  );
  const [joinRole3Highlight4, setJoinRole3Highlight4] = useState(
    page.joinRole3Highlight4 || 'Hỗ trợ kết nối chuyên gia, diễn giả và ban giám khảo chất lượng'
  );

  const [joinCtaHeading, setJoinCtaHeading] = useState(
    page.joinCtaHeading || 'Bạn Cần Trao Đổi Chi Tiết Về Cơ Hội Gia Nhập Hoặc Đề Xuất Dự Án?'
  );
  const [joinCtaDescription, setJoinCtaDescription] = useState(
    page.joinCtaDescription ||
      'Hệ thống tiếp nhận hồ sơ tập trung của Ban Nhân sự và Ban Đối ngoại & Sự kiện sẵn sàng hỗ trợ phản hồi trong vòng 24 giờ làm việc.'
  );
  const [joinCtaButtonLabel, setJoinCtaButtonLabel] = useState(
    page.joinCtaButtonLabel || 'Đến trang Liên hệ'
  );
  const [joinCtaButtonUrl, setJoinCtaButtonUrl] = useState(page.joinCtaButtonUrl || '/contact');
  const [joinHotline, setJoinHotline] = useState(page.joinHotline || '0924 910 210');
  const [joinHotlineTitle, setJoinHotlineTitle] = useState(page.joinHotlineTitle || 'Hotline Điều Phối');
  const [joinEmail, setJoinEmail] = useState(page.joinEmail || 'nhansu@skyfirst.io.vn');
  const [joinEmailTitle, setJoinEmailTitle] = useState(page.joinEmailTitle || 'Email Tuyển Dụng & Nhân Sự');
  const [joinAddress, setJoinAddress] = useState(
    page.joinAddress || ''
  );
  const [joinAddressTitle, setJoinAddressTitle] = useState(page.joinAddressTitle || 'Văn Phòng Mạng Lưới');

  // Join FAQs states
  const [joinFaqHeading, setJoinFaqHeading] = useState(
    page.joinFaqHeading || 'Câu Hỏi Thường Gặp Về Tham gia Sky First Network'
  );
  const [joinFaqSubtitle, setJoinFaqSubtitle] = useState(
    page.joinFaqSubtitle || 'GIẢI ĐÁP THẮC MẮC ỨNG VIÊN & ĐỐI TÁC'
  );
  const [joinFaq1Q, setJoinFaq1Q] = useState(
    page.joinFaq1Q || 'Ai có thể đăng ký làm Tình nguyện viên của Sky First Network?'
  );
  const [joinFaq1A, setJoinFaq1A] = useState(
    page.joinFaq1A || 'Mọi bạn trẻ (học sinh THPT, sinh viên, cựu sinh viên và người đi làm) có tinh thần trách nhiệm, yêu thích hoạt động cộng đồng và mong muốn cống hiến đều có thể đăng ký tham gia các chiến dịch hoạt động tình nguyện.'
  );
  const [joinFaq2Q, setJoinFaq2Q] = useState(
    page.joinFaq2Q || 'Ứng tuyển vào Ban Chấp hành có yêu cầu kinh nghiệm trước không?'
  );
  const [joinFaq2A, setJoinFaq2A] = useState(
    page.joinFaq2A || 'Sky First Network đánh giá cao thái độ học hỏi, sự chủ động và tinh thần cam kết. Yêu cầu cụ thể được công bố theo từng vị trí hoặc đợt tuyển.'
  );
  const [joinFaq3Q, setJoinFaq3Q] = useState(
    page.joinFaq3Q || 'Giấy chứng nhận sau mỗi chương trình có giá trị như thế nào?'
  );
  const [joinFaq3A, setJoinFaq3A] = useState(
    page.joinFaq3A || 'Mỗi Giấy chứng nhận được ghi nhận trong hệ thống có mã phục vụ việc tra cứu và đối chiếu thông tin. Website không tự khẳng định giá trị sử dụng của Giấy chứng nhận đối với bên thứ ba.'
  );
  const [joinFaq4Q, setJoinFaq4Q] = useState(
    page.joinFaq4Q || 'Quy trình tiếp nhận và phản hồi hồ sơ đăng ký mất bao lâu?'
  );
  const [joinFaq4A, setJoinFaq4A] = useState(
    page.joinFaq4A || 'Sau khi bạn gửi thông tin qua form hoặc email, Ban Nhân sự sẽ gửi thư xác nhận tự động và liên hệ lại trong vòng 24 - 48 giờ làm việc để xếp lịch phỏng vấn/trao đổi trực tiếp.'
  );

  // 6. Contact Page specific states
  const [email, setEmail] = useState(page.email || 'lienhe@skyfirst.io.vn');
  const [secondaryEmail, setSecondaryEmail] = useState(
    page.secondaryEmail || 'lienhe@skyfirst.io.vn'
  );
  const [hotline, setHotline] = useState(page.hotline || '0924 910 210');
  const [secondaryHotline, setSecondaryHotline] = useState(
    page.secondaryHotline || '0912 838 xxx (Đối ngoại)'
  );
  const [workHoursWeekdays, setWorkHoursWeekdays] = useState(
    page.workHoursWeekdays || '08:30 - 18:00'
  );
  const [workHoursSaturday, setWorkHoursSaturday] = useState(
    page.workHoursSaturday || '08:30 - 12:00'
  );
  const [facebookUrl, setFacebookUrl] = useState(
    page.facebookUrl || ''
  );
  const [linkedinUrl, setLinkedinUrl] = useState(
    page.linkedinUrl || 'https://linkedin.com/company/skyfirstnetwork'
  );
  const [contactFormTitle, setContactFormTitle] = useState(
    page.contactFormTitle || 'Gửi Tin Nhắn Đến Ban Chấp hành'
  );
  const [contactFormDescription, setContactFormDescription] = useState(
    page.contactFormDescription ||
      'Vui lòng điền đầy đủ các thông tin bên dưới. Hệ thống sẽ điều phối thư đến đúng phòng ban và đơn vị liên quan.'
  );
  const [contactSubmitButtonLabel, setContactSubmitButtonLabel] = useState(
    page.contactSubmitButtonLabel || 'Gửi tin nhắn'
  );
  const [contactUnitsTitle, setContactUnitsTitle] = useState(
    page.contactUnitsTitle || 'Đầu mối đơn vị trực thuộc'
  );
  const [contactUnitsSubtitle, setContactUnitsSubtitle] = useState(
    page.contactUnitsSubtitle || 'Liên hệ chuyên biệt theo từng mảng chuyên môn của mạng lưới:'
  );
  const [contactFaqTitle, setContactFaqTitle] = useState(
    page.contactFaqTitle || 'Câu Hỏi Thường Gặp Về Liên Hệ'
  );
  const [contactFaq1Q, setContactFaq1Q] = useState(
    page.contactFaq1Q || 'Thời gian Ban Chấp hành Sky First Network tiếp nhận và phản hồi email là bao lâu?'
  );
  const [contactFaq1A, setContactFaq1A] = useState(
    page.contactFaq1A ||
      'Toàn bộ thư từ và yêu cầu kết nối qua hòm thư điện tử hoặc biểu mẫu trực tuyến đều được phân loại và phản hồi chính thức trong vòng 24 - 48 giờ làm việc.'
  );
  const [contactFaq2Q, setContactFaq2Q] = useState(
    page.contactFaq2Q || 'Tôi muốn đặt lịch làm việc trực tiếp tại Sky First Network thì cần làm gì?'
  );
  const [contactFaq2A, setContactFaq2A] = useState(
    page.contactFaq2A ||
      'Quý đối tác hoặc các bạn trẻ vui lòng gửi thông tin trước qua biểu mẫu bên dưới hoặc gọi tới hotline điều phối (0924 910 210) trước ít nhất 01 ngày làm việc để ban thư ký sắp xếp tiếp đón chu đáo.'
  );
  const [contactFaq3Q, setContactFaq3Q] = useState(
    page.contactFaq3Q || 'Làm thế nào để liên hệ trực tiếp với người phụ trách từng đơn vị trực thuộc?'
  );
  const [contactFaq3A, setContactFaq3A] = useState(
    page.contactFaq3A ||
      'Bạn có thể chọn trực tiếp đơn vị mong muốn (Câu lạc bộ Tiếng Anh The Sky First hoặc Nhà Hán Ngữ) tại mục "Đơn vị muốn kết nối" trong biểu mẫu liên hệ, thông tin sẽ được tự động gửi tới email nội bộ của trưởng đơn vị đó.'
  );
  const [contactFaq4Q, setContactFaq4Q] = useState(page.contactFaq4Q || '');
  const [contactFaq4A, setContactFaq4A] = useState(page.contactFaq4A || '');
  const [contactCtaTitle, setContactCtaTitle] = useState(
    page.contactCtaTitle || 'Bạn quan tâm đến các chương trình & dự án cụ thể?'
  );
  const [contactCtaDescription, setContactCtaDescription] = useState(
    page.contactCtaDescription ||
      'Khám phá danh sách các chương trình và hoạt động đang được công bố đang mở đăng ký.'
  );

  // URL display logic matching website routing
  const getDisplayUrl = () => {
    if (page.slug === 'about') return '/about';
    if (page.slug === 'contact') return '/contact';
    if (['certificate', 'sponsor', 'join'].includes(page.slug)) {
      return `/${page.slug}`;
    }
    return `/${slug || page.slug}`;
  };

  const handleSave = async (publishState?: boolean) => {
    const finalPublishState = publishState !== undefined ? publishState : isPublished;

    if (!title.trim()) {
      onShowToast('Vui lòng nhập tiêu đề cho trang!');
      return false;
    }

    const finalSlug = page.slug ? (slug.trim() || page.slug) : createUniqueSlug(slug.trim() || title, existingSlugs, page.slug);

    const saved = await onSave({
      title: title.trim(),
      slug: finalSlug,
      badge: badge.trim(),
      summary: summary.trim(),
      content: content.trim(),
      contentFormatted: content.trim(),
      imageUrl: imageUrl.trim(),
      imageFit,
      imageFocalX,
      imageFocalY,
      secondaryImageUrl: secondaryImageUrl.trim(),
      pageBlocks,
      seoTitle:seoTitle.trim(),
      seoDescription:seoDescription.trim(),
      ogImageUrl:ogImageUrl.trim(),
      canonicalUrl:canonicalUrl.trim(),
      noIndex,
      author: author.trim() || 'Ban Quản trị Sky First Network',
      publishedAt: publishedAt || new Date().toLocaleDateString('vi-VN'),
      isPublished: finalPublishState,
      showInFooter: showInFooter,
      // General Button fields
      buttonLabel: buttonLabel.trim(),
      buttonUrl: buttonUrl.trim(),
      secondaryButtonLabel: secondaryButtonLabel.trim(),
      secondaryButtonUrl: secondaryButtonUrl.trim(),
      // About fields
      visionBadge: visionBadge.trim(),
      visionTitle: visionTitle.trim(),
      visionContent: visionContent.trim(),
      missionBadge: missionBadge.trim(),
      missionTitle: missionTitle.trim(),
      missionContent: missionContent.trim(),
      philosophyBadge: philosophyBadge.trim(),
      philosophyTitle: philosophyTitle.trim(),
      philosophyContent: philosophyContent.trim(),
      pillarsSectionTitle: pillarsSectionTitle.trim(),
      pillarsSectionBadge: pillarsSectionBadge.trim(),
      customPillars,
      valuesSectionTitle: valuesSectionTitle.trim(),
      customValues,
      timelineSectionTitle: timelineSectionTitle.trim(),
      timelineSectionBadge: timelineSectionBadge.trim(),
      customTimeline,
      teamSectionTitle: teamSectionTitle.trim(),
      teamSectionSubtitle: teamSectionSubtitle.trim(),
      customTeam,
      unitsSectionBadge: unitsSectionBadge.trim(),
      unitsSectionTitle: unitsSectionTitle.trim(),
      unitsButtonLabel: unitsButtonLabel.trim(),
      unitsButtonUrl: unitsButtonUrl.trim(),
      ctaTitle: ctaTitle.trim(),
      ctaDescription: ctaDescription.trim(),
      // Certificate fields
      certSearchLabel: certSearchLabel.trim(),
      certSearchPlaceholder: certSearchPlaceholder.trim(),
      certGuidanceNote: certGuidanceNote.trim(),
      certSearchButtonLabel: certSearchButtonLabel.trim(),
      certResetButtonLabel: certResetButtonLabel.trim(),
      certFeature1Title: certFeature1Title.trim(),
      certFeature1Desc: certFeature1Desc.trim(),
      certFeature2Title: certFeature2Title.trim(),
      certFeature2Desc: certFeature2Desc.trim(),
      certFeature3Title: certFeature3Title.trim(),
      certFeature3Desc: certFeature3Desc.trim(),
      certCtaTitle: certCtaTitle.trim(),
      certCtaDescription: certCtaDescription.trim(),
      certCtaButtonLabel: certCtaButtonLabel.trim(),
      certCtaButtonUrl: certCtaButtonUrl.trim(),
      certStatIssuedMode,
      certStatIssuedManual: certStatIssuedManual.trim(),
      certStatValidMode,
      certStatValidManual: certStatValidManual.trim(),
      certStatProgramsMode,
      certStatProgramsManual: certStatProgramsManual.trim(),
      certStatUpdatedMode,
      certStatUpdatedManual: certStatUpdatedManual.trim(),
      // Sponsor fields
      sponsorHeroPrimaryButtonLabel: sponsorHeroPrimaryButtonLabel.trim(),
      sponsorHeroPrimaryButtonUrl: sponsorHeroPrimaryButtonUrl.trim(),
      sponsorHeroSecondaryButtonLabel: sponsorHeroSecondaryButtonLabel.trim(),
      sponsorHeroSecondaryButtonUrl: sponsorHeroSecondaryButtonUrl.trim(),
      sponsorCommitmentHeading: sponsorCommitmentHeading.trim(),
      sponsorCommitmentSubtitle: sponsorCommitmentSubtitle.trim(),
      sponsorCommit1Title: sponsorCommit1Title.trim(),
      sponsorCommit1Desc: sponsorCommit1Desc.trim(),
      sponsorCommit2Title: sponsorCommit2Title.trim(),
      sponsorCommit2Desc: sponsorCommit2Desc.trim(),
      sponsorCommit3Title: sponsorCommit3Title.trim(),
      sponsorCommit3Desc: sponsorCommit3Desc.trim(),
      sponsorCommit4Title: sponsorCommit4Title.trim(),
      sponsorCommit4Desc: sponsorCommit4Desc.trim(),
      sponsorPackagesHeading: sponsorPackagesHeading.trim(),
      sponsorPackagesSubtitle: sponsorPackagesSubtitle.trim(),
      sponsorPkg1Title: sponsorPkg1Title.trim(),
      sponsorPkg1Badge: sponsorPkg1Badge.trim(),
      sponsorPkg1Unit: sponsorPkg1Unit.trim(),
      sponsorPkg1Desc: sponsorPkg1Desc.trim(),
      sponsorPkg1Impact: sponsorPkg1Impact.trim(),
      sponsorPkg2Title: sponsorPkg2Title.trim(),
      sponsorPkg2Badge: sponsorPkg2Badge.trim(),
      sponsorPkg2Unit: sponsorPkg2Unit.trim(),
      sponsorPkg2Desc: sponsorPkg2Desc.trim(),
      sponsorPkg2Impact: sponsorPkg2Impact.trim(),
      sponsorPkg3Title: sponsorPkg3Title.trim(),
      sponsorPkg3Badge: sponsorPkg3Badge.trim(),
      sponsorPkg3Unit: sponsorPkg3Unit.trim(),
      sponsorPkg3Desc: sponsorPkg3Desc.trim(),
      sponsorPkg3Impact: sponsorPkg3Impact.trim(),
      sponsorPkg4Title: sponsorPkg4Title.trim(),
      sponsorPkg4Badge: sponsorPkg4Badge.trim(),
      sponsorPkg4Unit: sponsorPkg4Unit.trim(),
      sponsorPkg4Desc: sponsorPkg4Desc.trim(),
      sponsorPkg4Impact: sponsorPkg4Impact.trim(),
      sponsorRecipientEntity: sponsorRecipientEntity.trim(),
      sponsorGoalAmount: sponsorGoalAmount.trim(),
      sponsorReceivedAmount: sponsorReceivedAmount.trim(),
      sponsorPublicLedgerUrl: sponsorPublicLedgerUrl.trim(),
      sponsorBankName: sponsorBankName.trim(),
      sponsorBankId: sponsorBankId.trim(),
      sponsorBankAccount: sponsorBankAccount.trim(),
      sponsorAccountHolder: sponsorAccountHolder.trim(),
      sponsorBankBranch: sponsorBankBranch.trim(),
      sponsorTransferSyntax: sponsorTransferSyntax.trim(),
      sponsorQrCodeUrl: sponsorQrCodeUrl.trim(),
      sponsorQrCodeTitle: sponsorQrCodeTitle.trim(),
      sponsorQrCodeSubtitle: sponsorQrCodeSubtitle.trim(),
      sponsorDonationNotice: sponsorDonationNotice.trim(),
      sponsorSuggestedAmounts: sponsorSuggestedAmounts.trim(),
      sponsorCopyButtonLabel: sponsorCopyButtonLabel.trim(),
      sponsorHotline: sponsorHotline.trim(),
      sponsorEmail: sponsorEmail.trim(),
      sponsorContactLeadTitle: sponsorContactLeadTitle.trim(),
      sponsorContactHeading: sponsorContactHeading.trim(),
      sponsorContactDescription: sponsorContactDescription.trim(),
      sponsorContactButtonLabel: sponsorContactButtonLabel.trim(),
      sponsorContactButtonUrl: sponsorContactButtonUrl.trim(),
      sponsorUnitsButtonLabel: sponsorUnitsButtonLabel.trim(),
      sponsorUnitsButtonUrl: sponsorUnitsButtonUrl.trim(),
      sponsorContactHotline: sponsorContactHotline.trim(),
      sponsorContactEmail: sponsorContactEmail.trim(),
      sponsorFaqHeading: sponsorFaqHeading.trim(),
      sponsorFaqSubtitle: sponsorFaqSubtitle.trim(),
      sponsorFaq1Q: sponsorFaq1Q.trim(),
      sponsorFaq1A: sponsorFaq1A.trim(),
      sponsorFaq2Q: sponsorFaq2Q.trim(),
      sponsorFaq2A: sponsorFaq2A.trim(),
      sponsorFaq3Q: sponsorFaq3Q.trim(),
      sponsorFaq3A: sponsorFaq3A.trim(),
      sponsorFaq4Q: sponsorFaq4Q.trim(),
      sponsorFaq4A: sponsorFaq4A.trim(),
      sponsorCtaTitle: sponsorCtaTitle.trim(),
      sponsorCtaDescription: sponsorCtaDescription.trim(),
      // Join fields
      joinRolesHeading: joinRolesHeading.trim(),
      joinRolesSubtitle: joinRolesSubtitle.trim(),
      joinRole1Title: joinRole1Title.trim(),
      joinRole1Tag: joinRole1Tag.trim(),
      joinRole1Description: joinRole1Description.trim(),
      joinRole1Period: joinRole1Period.trim(),
      joinRole1ButtonLabel: joinRole1ButtonLabel.trim(),
      joinRole1ButtonUrl: joinRole1ButtonUrl.trim(),
      joinRole1Highlight1: joinRole1Highlight1.trim(),
      joinRole1Highlight2: joinRole1Highlight2.trim(),
      joinRole1Highlight3: joinRole1Highlight3.trim(),
      joinRole1Highlight4: joinRole1Highlight4.trim(),
      joinRole2Title: joinRole2Title.trim(),
      joinRole2Tag: joinRole2Tag.trim(),
      joinRole2Description: joinRole2Description.trim(),
      joinRole2Period: joinRole2Period.trim(),
      joinRole2ButtonLabel: joinRole2ButtonLabel.trim(),
      joinRole2ButtonUrl: joinRole2ButtonUrl.trim(),
      joinRole2Highlight1: joinRole2Highlight1.trim(),
      joinRole2Highlight2: joinRole2Highlight2.trim(),
      joinRole2Highlight3: joinRole2Highlight3.trim(),
      joinRole2Highlight4: joinRole2Highlight4.trim(),
      joinRole3Title: joinRole3Title.trim(),
      joinRole3Tag: joinRole3Tag.trim(),
      joinRole3Description: joinRole3Description.trim(),
      joinRole3Period: joinRole3Period.trim(),
      joinRole3ButtonLabel: joinRole3ButtonLabel.trim(),
      joinRole3ButtonUrl: joinRole3ButtonUrl.trim(),
      joinRole3Highlight1: joinRole3Highlight1.trim(),
      joinRole3Highlight2: joinRole3Highlight2.trim(),
      joinRole3Highlight3: joinRole3Highlight3.trim(),
      joinRole3Highlight4: joinRole3Highlight4.trim(),
      joinCtaHeading: joinCtaHeading.trim(),
      joinCtaDescription: joinCtaDescription.trim(),
      joinCtaButtonLabel: joinCtaButtonLabel.trim(),
      joinCtaButtonUrl: joinCtaButtonUrl.trim(),
      joinHotline: joinHotline.trim(),
      joinHotlineTitle: joinHotlineTitle.trim(),
      joinEmail: joinEmail.trim(),
      joinEmailTitle: joinEmailTitle.trim(),
      joinAddress: joinAddress.trim(),
      joinAddressTitle: joinAddressTitle.trim(),
      joinFaqHeading: joinFaqHeading.trim(),
      joinFaqSubtitle: joinFaqSubtitle.trim(),
      joinFaq1Q: joinFaq1Q.trim(),
      joinFaq1A: joinFaq1A.trim(),
      joinFaq2Q: joinFaq2Q.trim(),
      joinFaq2A: joinFaq2A.trim(),
      joinFaq3Q: joinFaq3Q.trim(),
      joinFaq3A: joinFaq3A.trim(),
      joinFaq4Q: joinFaq4Q.trim(),
      joinFaq4A: joinFaq4A.trim(),
      // Contact fields
      email: email.trim(),
      secondaryEmail: secondaryEmail.trim(),
      hotline: hotline.trim(),
      secondaryHotline: secondaryHotline.trim(),
      workHoursWeekdays: workHoursWeekdays.trim(),
      workHoursSaturday: workHoursSaturday.trim(),
      facebookUrl: facebookUrl.trim(),
      linkedinUrl: linkedinUrl.trim(),
      contactFormTitle: contactFormTitle.trim(),
      contactFormDescription: contactFormDescription.trim(),
      contactSubmitButtonLabel: contactSubmitButtonLabel.trim(),
      contactUnitsTitle: contactUnitsTitle.trim(),
      contactUnitsSubtitle: contactUnitsSubtitle.trim(),
      contactFaqTitle: contactFaqTitle.trim(),
      contactFaq1Q: contactFaq1Q.trim(),
      contactFaq1A: contactFaq1A.trim(),
      contactFaq2Q: contactFaq2Q.trim(),
      contactFaq2A: contactFaq2A.trim(),
      contactFaq3Q: contactFaq3Q.trim(),
      contactFaq3A: contactFaq3A.trim(),
      contactFaq4Q: contactFaq4Q.trim(),
      contactFaq4A: contactFaq4A.trim(),
      contactCtaTitle: contactCtaTitle.trim(),
      contactCtaDescription: contactCtaDescription.trim(),
    });

    setIsPublished(finalPublishState);

    if (saved === false) {
      onShowToast('Chưa thể lưu lên máy chủ. Nội dung đang được giữ trên thiết bị để bạn thử lại.');
      return false;
    }
    if (finalPublishState) {
      onShowToast(`Đã lưu và xuất bản trang "${title.trim()}" thành công lên website chính!`);
    } else {
      onShowToast(`Đã lưu các chỉnh sửa của trang "${title.trim()}" (Bản nháp)!`);
    }
    return true;
  };

  const handlePreview = async () => {
    const ok=await handleSave(isPublished);
    if(!ok)return;
    const previewSlug=page.slug ? (slug.trim()||page.slug) : createUniqueSlug(slug.trim()||title,existingSlugs,page.slug);
    window.open(`/${encodeURI(previewSlug)}?cmsPreview=1&cmsPreviewId=${encodeURIComponent(page.id)}`,'_blank','noopener');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      {/* 1. Thanh Tiêu Đề Độc Lập (Header) */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="editor-btn-back"
            onClick={onClose}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition flex items-center gap-2 text-xs font-bold"
            title="Quay lại danh sách trang"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Quay lại danh sách</span>
          </button>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition ${
                isPublished
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {isPublished ? (
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

            <span className="text-xs text-sky-700 font-mono bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200 font-bold hidden sm:inline">
              {getDisplayUrl()}
            </span>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center gap-2 sm:gap-3">
          {!isPublished && <button type="button" onClick={()=>void handlePreview()} className="px-3 py-2 bg-white hover:bg-sky-50 text-[#0B66C3] border border-sky-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5" title="Lưu bản nháp hiện tại và xem bằng đúng giao diện public">
            <Eye size={15}/><span className="hidden sm:inline">XEM TRƯỚC</span>
          </button>}
          {!isPublished ? (
            <>
              {/* Trang đang ở trạng thái Bản nháp: Cần ấn lưu để lưu các chỉnh sửa, và ấn đăng bài thì bài mới được xuất bản */}
              <button
                type="button"
                id="editor-btn-save-draft"
                onClick={() => handleSave(false)}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                title="Lưu lại các chỉnh sửa (giữ ở trạng thái Bản nháp)"
              >
                <Save size={15} className="text-[#0284C7]" />
                <span>LƯU CHỈNH SỬA</span>
              </button>

              <button
                type="button"
                id="editor-btn-publish"
                onClick={() => handleSave(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Xuất bản trang để hiển thị chính thức trên website"
              >
                <CheckCircle2 size={15} />
                <span>ĐĂNG BÀI</span>
              </button>
            </>
          ) : (
            <>
              {/* Trang đã xuất bản: Có thể chuyển về Bản nháp hoặc Lưu các thay đổi lên trang chính */}
              <button
                type="button"
                id="editor-btn-unpublish"
                onClick={() => handleSave(false)}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
                title="Chuyển trang về trạng thái Bản nháp (gỡ khỏi website chính)"
              >
                <Clock size={14} className="text-amber-600" />
                <span>Chuyển về Nháp</span>
              </button>

              <button
                type="button"
                id="editor-btn-save"
                onClick={() => handleSave(true)}
                className="px-4 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-extrabold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Lưu các thay đổi và áp dụng trực tiếp lên website chính"
              >
                <Save size={15} />
                <span>LƯU TRANG</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* 2. Thân Soạn Thảo (Main Editor) */}
      <main className="max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6 flex-1">
        {/* KHỐI 0: CÀI ĐẶT ĐƯỜNG DẪN & XUẤT BẢN */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Thông tin xuất bản & Đường dẫn trang
            </h2>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showInFooter}
                onChange={(e) => setShowInFooter(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
              />
              <span>Hiển thị liên kết tại Chân trang (Footer)</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mb-1.5">
                <LinkIcon size={14} className="text-[#0284C7]" />
                Đường dẫn tĩnh (Slug)
              </label>
              <input
                type="text"
                id="editor-input-slug"
                value={slug}
                onChange={(e) => { setSlugTouched(true); setSlug(generateSlug(e.target.value)); }}
                placeholder="vi-du-duong-dan"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mb-1.5">
                <User size={14} className="text-[#0284C7]" />
                Người xuất bản
              </label>
              <input
                type="text"
                id="editor-input-author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Ban Quản trị Sky First Network"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mb-1.5">
                <Calendar size={14} className="text-[#0284C7]" />
                Ngày xuất bản
              </label>
              <input
                type="text"
                id="editor-input-publishedAt"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                placeholder="01/01/2026"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* RENDER CÁC TRƯỜNG ĐẶC THÙ THEO ĐÚNG CẤU TRÚC TỪNG TRANG */}
        {isAboutPage && (
          <AboutEditorFields
            badge={badge}
            setBadge={setBadge}
            title={title}
            setTitle={setTitle}
            summary={summary}
            setSummary={setSummary}
            visionBadge={visionBadge}
            setVisionBadge={setVisionBadge}
            visionTitle={visionTitle}
            setVisionTitle={setVisionTitle}
            visionContent={visionContent}
            setVisionContent={setVisionContent}
            missionBadge={missionBadge}
            setMissionBadge={setMissionBadge}
            missionTitle={missionTitle}
            setMissionTitle={setMissionTitle}
            missionContent={missionContent}
            setMissionContent={setMissionContent}
            philosophyBadge={philosophyBadge}
            setPhilosophyBadge={setPhilosophyBadge}
            philosophyTitle={philosophyTitle}
            setPhilosophyTitle={setPhilosophyTitle}
            philosophyContent={philosophyContent}
            setPhilosophyContent={setPhilosophyContent}
            pillarsSectionTitle={pillarsSectionTitle}
            setPillarsSectionTitle={setPillarsSectionTitle}
            pillarsSectionBadge={pillarsSectionBadge}
            setPillarsSectionBadge={setPillarsSectionBadge}
            customPillars={customPillars}
            setCustomPillars={setCustomPillars}
            valuesSectionTitle={valuesSectionTitle}
            setValuesSectionTitle={setValuesSectionTitle}
            customValues={customValues}
            setCustomValues={setCustomValues}
            timelineSectionTitle={timelineSectionTitle}
            setTimelineSectionTitle={setTimelineSectionTitle}
            timelineSectionBadge={timelineSectionBadge}
            setTimelineSectionBadge={setTimelineSectionBadge}
            customTimeline={customTimeline}
            setCustomTimeline={setCustomTimeline}
            teamSectionTitle={teamSectionTitle}
            setTeamSectionTitle={setTeamSectionTitle}
            teamSectionSubtitle={teamSectionSubtitle}
            setTeamSectionSubtitle={setTeamSectionSubtitle}
            customTeam={customTeam}
            setCustomTeam={setCustomTeam}
            unitsSectionBadge={unitsSectionBadge}
            setUnitsSectionBadge={setUnitsSectionBadge}
            unitsSectionTitle={unitsSectionTitle}
            setUnitsSectionTitle={setUnitsSectionTitle}
            unitsButtonLabel={unitsButtonLabel}
            setUnitsButtonLabel={setUnitsButtonLabel}
            unitsButtonUrl={unitsButtonUrl}
            setUnitsButtonUrl={setUnitsButtonUrl}
            ctaTitle={ctaTitle}
            setCtaTitle={setCtaTitle}
            ctaDescription={ctaDescription}
            setCtaDescription={setCtaDescription}
            buttonLabel={buttonLabel}
            setButtonLabel={setButtonLabel}
            buttonUrl={buttonUrl}
            setButtonUrl={setButtonUrl}
            secondaryButtonLabel={secondaryButtonLabel}
            setSecondaryButtonLabel={setSecondaryButtonLabel}
            secondaryButtonUrl={secondaryButtonUrl}
            setSecondaryButtonUrl={setSecondaryButtonUrl}
          />
        )}

        {isCertificatePage && (
          <CertificateEditorFields
            badge={badge}
            setBadge={setBadge}
            title={title}
            setTitle={setTitle}
            summary={summary}
            setSummary={setSummary}
            certSearchLabel={certSearchLabel}
            setCertSearchLabel={setCertSearchLabel}
            certSearchPlaceholder={certSearchPlaceholder}
            setCertSearchPlaceholder={setCertSearchPlaceholder}
            certGuidanceNote={certGuidanceNote}
            setCertGuidanceNote={setCertGuidanceNote}
            certSearchButtonLabel={certSearchButtonLabel}
            setCertSearchButtonLabel={setCertSearchButtonLabel}
            certResetButtonLabel={certResetButtonLabel}
            setCertResetButtonLabel={setCertResetButtonLabel}
            certFeature1Title={certFeature1Title}
            setCertFeature1Title={setCertFeature1Title}
            certFeature1Desc={certFeature1Desc}
            setCertFeature1Desc={setCertFeature1Desc}
            certFeature2Title={certFeature2Title}
            setCertFeature2Title={setCertFeature2Title}
            certFeature2Desc={certFeature2Desc}
            setCertFeature2Desc={setCertFeature2Desc}
            certFeature3Title={certFeature3Title}
            setCertFeature3Title={setCertFeature3Title}
            certFeature3Desc={certFeature3Desc}
            setCertFeature3Desc={setCertFeature3Desc}
            certCtaTitle={certCtaTitle}
            setCertCtaTitle={setCertCtaTitle}
            certCtaDescription={certCtaDescription}
            setCertCtaDescription={setCertCtaDescription}
            certCtaButtonLabel={certCtaButtonLabel}
            setCertCtaButtonLabel={setCertCtaButtonLabel}
            certCtaButtonUrl={certCtaButtonUrl}
            setCertCtaButtonUrl={setCertCtaButtonUrl}
            certStatIssuedMode={certStatIssuedMode}
            setCertStatIssuedMode={setCertStatIssuedMode}
            certStatIssuedManual={certStatIssuedManual}
            setCertStatIssuedManual={setCertStatIssuedManual}
            certStatValidMode={certStatValidMode}
            setCertStatValidMode={setCertStatValidMode}
            certStatValidManual={certStatValidManual}
            setCertStatValidManual={setCertStatValidManual}
            certStatProgramsMode={certStatProgramsMode}
            setCertStatProgramsMode={setCertStatProgramsMode}
            certStatProgramsManual={certStatProgramsManual}
            setCertStatProgramsManual={setCertStatProgramsManual}
            certStatUpdatedMode={certStatUpdatedMode}
            setCertStatUpdatedMode={setCertStatUpdatedMode}
            certStatUpdatedManual={certStatUpdatedManual}
            setCertStatUpdatedManual={setCertStatUpdatedManual}
            contentFormatted={content}
            setContentFormatted={setContent}
          />
        )}

        {isSponsorPage && (
          <SponsorEditorFields
            badge={badge}
            setBadge={setBadge}
            title={title}
            setTitle={setTitle}
            summary={summary}
            setSummary={setSummary}
            sponsorHeroPrimaryButtonLabel={sponsorHeroPrimaryButtonLabel}
            setSponsorHeroPrimaryButtonLabel={setSponsorHeroPrimaryButtonLabel}
            sponsorHeroPrimaryButtonUrl={sponsorHeroPrimaryButtonUrl}
            setSponsorHeroPrimaryButtonUrl={setSponsorHeroPrimaryButtonUrl}
            sponsorHeroSecondaryButtonLabel={sponsorHeroSecondaryButtonLabel}
            setSponsorHeroSecondaryButtonLabel={setSponsorHeroSecondaryButtonLabel}
            sponsorHeroSecondaryButtonUrl={sponsorHeroSecondaryButtonUrl}
            setSponsorHeroSecondaryButtonUrl={setSponsorHeroSecondaryButtonUrl}
            // Commitments
            sponsorCommitmentHeading={sponsorCommitmentHeading}
            setSponsorCommitmentHeading={setSponsorCommitmentHeading}
            sponsorCommitmentSubtitle={sponsorCommitmentSubtitle}
            setSponsorCommitmentSubtitle={setSponsorCommitmentSubtitle}
            sponsorCommit1Title={sponsorCommit1Title}
            setSponsorCommit1Title={setSponsorCommit1Title}
            sponsorCommit1Desc={sponsorCommit1Desc}
            setSponsorCommit1Desc={setSponsorCommit1Desc}
            sponsorCommit2Title={sponsorCommit2Title}
            setSponsorCommit2Title={setSponsorCommit2Title}
            sponsorCommit2Desc={sponsorCommit2Desc}
            setSponsorCommit2Desc={setSponsorCommit2Desc}
            sponsorCommit3Title={sponsorCommit3Title}
            setSponsorCommit3Title={setSponsorCommit3Title}
            sponsorCommit3Desc={sponsorCommit3Desc}
            setSponsorCommit3Desc={setSponsorCommit3Desc}
            sponsorCommit4Title={sponsorCommit4Title}
            setSponsorCommit4Title={setSponsorCommit4Title}
            sponsorCommit4Desc={sponsorCommit4Desc}
            setSponsorCommit4Desc={setSponsorCommit4Desc}
            // Packages
            sponsorPackagesHeading={sponsorPackagesHeading}
            setSponsorPackagesHeading={setSponsorPackagesHeading}
            sponsorPackagesSubtitle={sponsorPackagesSubtitle}
            setSponsorPackagesSubtitle={setSponsorPackagesSubtitle}
            sponsorPkg1Title={sponsorPkg1Title}
            setSponsorPkg1Title={setSponsorPkg1Title}
            sponsorPkg1Badge={sponsorPkg1Badge}
            setSponsorPkg1Badge={setSponsorPkg1Badge}
            sponsorPkg1Unit={sponsorPkg1Unit}
            setSponsorPkg1Unit={setSponsorPkg1Unit}
            sponsorPkg1Desc={sponsorPkg1Desc}
            setSponsorPkg1Desc={setSponsorPkg1Desc}
            sponsorPkg1Impact={sponsorPkg1Impact}
            setSponsorPkg1Impact={setSponsorPkg1Impact}
            sponsorPkg2Title={sponsorPkg2Title}
            setSponsorPkg2Title={setSponsorPkg2Title}
            sponsorPkg2Badge={sponsorPkg2Badge}
            setSponsorPkg2Badge={setSponsorPkg2Badge}
            sponsorPkg2Unit={sponsorPkg2Unit}
            setSponsorPkg2Unit={setSponsorPkg2Unit}
            sponsorPkg2Desc={sponsorPkg2Desc}
            setSponsorPkg2Desc={setSponsorPkg2Desc}
            sponsorPkg2Impact={sponsorPkg2Impact}
            setSponsorPkg2Impact={setSponsorPkg2Impact}
            sponsorPkg3Title={sponsorPkg3Title}
            setSponsorPkg3Title={setSponsorPkg3Title}
            sponsorPkg3Badge={sponsorPkg3Badge}
            setSponsorPkg3Badge={setSponsorPkg3Badge}
            sponsorPkg3Unit={sponsorPkg3Unit}
            setSponsorPkg3Unit={setSponsorPkg3Unit}
            sponsorPkg3Desc={sponsorPkg3Desc}
            setSponsorPkg3Desc={setSponsorPkg3Desc}
            sponsorPkg3Impact={sponsorPkg3Impact}
            setSponsorPkg3Impact={setSponsorPkg3Impact}
            sponsorPkg4Title={sponsorPkg4Title}
            setSponsorPkg4Title={setSponsorPkg4Title}
            sponsorPkg4Badge={sponsorPkg4Badge}
            setSponsorPkg4Badge={setSponsorPkg4Badge}
            sponsorPkg4Unit={sponsorPkg4Unit}
            setSponsorPkg4Unit={setSponsorPkg4Unit}
            sponsorPkg4Desc={sponsorPkg4Desc}
            setSponsorPkg4Desc={setSponsorPkg4Desc}
            sponsorPkg4Impact={sponsorPkg4Impact}
            setSponsorPkg4Impact={setSponsorPkg4Impact}
            // Bank details
            sponsorRecipientEntity={sponsorRecipientEntity}
            setSponsorRecipientEntity={setSponsorRecipientEntity}
            sponsorGoalAmount={sponsorGoalAmount}
            setSponsorGoalAmount={setSponsorGoalAmount}
            sponsorReceivedAmount={sponsorReceivedAmount}
            setSponsorReceivedAmount={setSponsorReceivedAmount}
            sponsorPublicLedgerUrl={sponsorPublicLedgerUrl}
            setSponsorPublicLedgerUrl={setSponsorPublicLedgerUrl}
            sponsorBankName={sponsorBankName}
            setSponsorBankName={setSponsorBankName}
            sponsorBankId={sponsorBankId}
            setSponsorBankId={setSponsorBankId}
            sponsorBankBranch={sponsorBankBranch}
            setSponsorBankBranch={setSponsorBankBranch}
            sponsorBankAccount={sponsorBankAccount}
            setSponsorBankAccount={setSponsorBankAccount}
            sponsorAccountHolder={sponsorAccountHolder}
            setSponsorAccountHolder={setSponsorAccountHolder}
            sponsorTransferSyntax={sponsorTransferSyntax}
            setSponsorTransferSyntax={setSponsorTransferSyntax}
            sponsorQrCodeUrl={sponsorQrCodeUrl}
            setSponsorQrCodeUrl={setSponsorQrCodeUrl}
            sponsorQrCodeTitle={sponsorQrCodeTitle}
            setSponsorQrCodeTitle={setSponsorQrCodeTitle}
            sponsorQrCodeSubtitle={sponsorQrCodeSubtitle}
            setSponsorQrCodeSubtitle={setSponsorQrCodeSubtitle}
            sponsorDonationNotice={sponsorDonationNotice}
            setSponsorDonationNotice={setSponsorDonationNotice}
            sponsorSuggestedAmounts={sponsorSuggestedAmounts}
            setSponsorSuggestedAmounts={setSponsorSuggestedAmounts}
            sponsorCopyButtonLabel={sponsorCopyButtonLabel}
            setSponsorCopyButtonLabel={setSponsorCopyButtonLabel}
            sponsorHotline={sponsorHotline}
            setSponsorHotline={setSponsorHotline}
            sponsorEmail={sponsorEmail}
            setSponsorEmail={setSponsorEmail}
            sponsorContactLeadTitle={sponsorContactLeadTitle}
            setSponsorContactLeadTitle={setSponsorContactLeadTitle}
            // Contact
            sponsorContactHeading={sponsorContactHeading}
            setSponsorContactHeading={setSponsorContactHeading}
            sponsorContactDescription={sponsorContactDescription}
            setSponsorContactDescription={setSponsorContactDescription}
            sponsorContactButtonLabel={sponsorContactButtonLabel}
            setSponsorContactButtonLabel={setSponsorContactButtonLabel}
            sponsorContactButtonUrl={sponsorContactButtonUrl}
            setSponsorContactButtonUrl={setSponsorContactButtonUrl}
            sponsorUnitsButtonLabel={sponsorUnitsButtonLabel}
            setSponsorUnitsButtonLabel={setSponsorUnitsButtonLabel}
            sponsorUnitsButtonUrl={sponsorUnitsButtonUrl}
            setSponsorUnitsButtonUrl={setSponsorUnitsButtonUrl}
            sponsorContactHotline={sponsorContactHotline}
            setSponsorContactHotline={setSponsorContactHotline}
            sponsorContactEmail={sponsorContactEmail}
            setSponsorContactEmail={setSponsorContactEmail}
            // FAQs
            sponsorFaqHeading={sponsorFaqHeading}
            setSponsorFaqHeading={setSponsorFaqHeading}
            sponsorFaqSubtitle={sponsorFaqSubtitle}
            setSponsorFaqSubtitle={setSponsorFaqSubtitle}
            sponsorFaq1Q={sponsorFaq1Q}
            setSponsorFaq1Q={setSponsorFaq1Q}
            sponsorFaq1A={sponsorFaq1A}
            setSponsorFaq1A={setSponsorFaq1A}
            sponsorFaq2Q={sponsorFaq2Q}
            setSponsorFaq2Q={setSponsorFaq2Q}
            sponsorFaq2A={sponsorFaq2A}
            setSponsorFaq2A={setSponsorFaq2A}
            sponsorFaq3Q={sponsorFaq3Q}
            setSponsorFaq3Q={setSponsorFaq3Q}
            sponsorFaq3A={sponsorFaq3A}
            setSponsorFaq3A={setSponsorFaq3A}
            sponsorFaq4Q={sponsorFaq4Q}
            setSponsorFaq4Q={setSponsorFaq4Q}
            sponsorFaq4A={sponsorFaq4A}
            setSponsorFaq4A={setSponsorFaq4A}
            // Quick CTA
            sponsorCtaTitle={sponsorCtaTitle}
            setSponsorCtaTitle={setSponsorCtaTitle}
            sponsorCtaDescription={sponsorCtaDescription}
            setSponsorCtaDescription={setSponsorCtaDescription}
            buttonLabel={buttonLabel}
            setButtonLabel={setButtonLabel}
            buttonUrl={buttonUrl}
            setButtonUrl={setButtonUrl}
            secondaryButtonLabel={secondaryButtonLabel}
            setSecondaryButtonLabel={setSecondaryButtonLabel}
            secondaryButtonUrl={secondaryButtonUrl}
            setSecondaryButtonUrl={setSecondaryButtonUrl}
            // Rich text content
            contentFormatted={content}
            setContentFormatted={setContent}
          />
        )}

        {isJoinPage && (
          <JoinEditorFields
            badge={badge}
            setBadge={setBadge}
            title={title}
            setTitle={setTitle}
            summary={summary}
            setSummary={setSummary}
            joinRolesHeading={joinRolesHeading}
            setJoinRolesHeading={setJoinRolesHeading}
            joinRolesSubtitle={joinRolesSubtitle}
            setJoinRolesSubtitle={setJoinRolesSubtitle}
            joinRole1Title={joinRole1Title}
            setJoinRole1Title={setJoinRole1Title}
            joinRole1Tag={joinRole1Tag}
            setJoinRole1Tag={setJoinRole1Tag}
            joinRole1Description={joinRole1Description}
            setJoinRole1Description={setJoinRole1Description}
            joinRole1Period={joinRole1Period}
            setJoinRole1Period={setJoinRole1Period}
            joinRole1ButtonLabel={joinRole1ButtonLabel}
            setJoinRole1ButtonLabel={setJoinRole1ButtonLabel}
            joinRole1ButtonUrl={joinRole1ButtonUrl}
            setJoinRole1ButtonUrl={setJoinRole1ButtonUrl}
            joinRole1Highlight1={joinRole1Highlight1}
            setJoinRole1Highlight1={setJoinRole1Highlight1}
            joinRole1Highlight2={joinRole1Highlight2}
            setJoinRole1Highlight2={setJoinRole1Highlight2}
            joinRole1Highlight3={joinRole1Highlight3}
            setJoinRole1Highlight3={setJoinRole1Highlight3}
            joinRole1Highlight4={joinRole1Highlight4}
            setJoinRole1Highlight4={setJoinRole1Highlight4}
            joinRole2Title={joinRole2Title}
            setJoinRole2Title={setJoinRole2Title}
            joinRole2Tag={joinRole2Tag}
            setJoinRole2Tag={setJoinRole2Tag}
            joinRole2Description={joinRole2Description}
            setJoinRole2Description={setJoinRole2Description}
            joinRole2Period={joinRole2Period}
            setJoinRole2Period={setJoinRole2Period}
            joinRole2ButtonLabel={joinRole2ButtonLabel}
            setJoinRole2ButtonLabel={setJoinRole2ButtonLabel}
            joinRole2ButtonUrl={joinRole2ButtonUrl}
            setJoinRole2ButtonUrl={setJoinRole2ButtonUrl}
            joinRole2Highlight1={joinRole2Highlight1}
            setJoinRole2Highlight1={setJoinRole2Highlight1}
            joinRole2Highlight2={joinRole2Highlight2}
            setJoinRole2Highlight2={setJoinRole2Highlight2}
            joinRole2Highlight3={joinRole2Highlight3}
            setJoinRole2Highlight3={setJoinRole2Highlight3}
            joinRole2Highlight4={joinRole2Highlight4}
            setJoinRole2Highlight4={setJoinRole2Highlight4}
            joinRole3Title={joinRole3Title}
            setJoinRole3Title={setJoinRole3Title}
            joinRole3Tag={joinRole3Tag}
            setJoinRole3Tag={setJoinRole3Tag}
            joinRole3Description={joinRole3Description}
            setJoinRole3Description={setJoinRole3Description}
            joinRole3Period={joinRole3Period}
            setJoinRole3Period={setJoinRole3Period}
            joinRole3ButtonLabel={joinRole3ButtonLabel}
            setJoinRole3ButtonLabel={setJoinRole3ButtonLabel}
            joinRole3ButtonUrl={joinRole3ButtonUrl}
            setJoinRole3ButtonUrl={setJoinRole3ButtonUrl}
            joinRole3Highlight1={joinRole3Highlight1}
            setJoinRole3Highlight1={setJoinRole3Highlight1}
            joinRole3Highlight2={joinRole3Highlight2}
            setJoinRole3Highlight2={setJoinRole3Highlight2}
            joinRole3Highlight3={joinRole3Highlight3}
            setJoinRole3Highlight3={setJoinRole3Highlight3}
            joinRole3Highlight4={joinRole3Highlight4}
            setJoinRole3Highlight4={setJoinRole3Highlight4}
            joinCtaHeading={joinCtaHeading}
            setJoinCtaHeading={setJoinCtaHeading}
            joinCtaDescription={joinCtaDescription}
            setJoinCtaDescription={setJoinCtaDescription}
            joinCtaButtonLabel={joinCtaButtonLabel}
            setJoinCtaButtonLabel={setJoinCtaButtonLabel}
            joinCtaButtonUrl={joinCtaButtonUrl}
            setJoinCtaButtonUrl={setJoinCtaButtonUrl}
            joinEmail={joinEmail}
            setJoinEmail={setJoinEmail}
            joinEmailTitle={joinEmailTitle}
            setJoinEmailTitle={setJoinEmailTitle}
            joinHotline={joinHotline}
            setJoinHotline={setJoinHotline}
            joinHotlineTitle={joinHotlineTitle}
            setJoinHotlineTitle={setJoinHotlineTitle}
            joinAddress={joinAddress}
            setJoinAddress={setJoinAddress}
            joinAddressTitle={joinAddressTitle}
            setJoinAddressTitle={setJoinAddressTitle}
            contentFormatted={content}
            setContentFormatted={setContent}
          />
        )}

        {isContactPage && (
          <ContactEditorFields
            badge={badge}
            setBadge={setBadge}
            title={title}
            setTitle={setTitle}
            summary={summary}
            setSummary={setSummary}
            email={email}
            setEmail={setEmail}
            secondaryEmail={secondaryEmail}
            setSecondaryEmail={setSecondaryEmail}
            hotline={hotline}
            setHotline={setHotline}
            secondaryHotline={secondaryHotline}
            setSecondaryHotline={setSecondaryHotline}
            workHoursWeekdays={workHoursWeekdays}
            setWorkHoursWeekdays={setWorkHoursWeekdays}
            workHoursSaturday={workHoursSaturday}
            setWorkHoursSaturday={setWorkHoursSaturday}
            facebookUrl={facebookUrl}
            setFacebookUrl={setFacebookUrl}
            linkedinUrl={linkedinUrl}
            setLinkedinUrl={setLinkedinUrl}
            contactFormTitle={contactFormTitle}
            setContactFormTitle={setContactFormTitle}
            contactFormDescription={contactFormDescription}
            setContactFormDescription={setContactFormDescription}
            contactSubmitButtonLabel={contactSubmitButtonLabel}
            setContactSubmitButtonLabel={setContactSubmitButtonLabel}
            contactUnitsTitle={contactUnitsTitle}
            setContactUnitsTitle={setContactUnitsTitle}
            contactUnitsSubtitle={contactUnitsSubtitle}
            setContactUnitsSubtitle={setContactUnitsSubtitle}
            contactFaqTitle={contactFaqTitle}
            setContactFaqTitle={setContactFaqTitle}
            contactFaq1Q={contactFaq1Q}
            setContactFaq1Q={setContactFaq1Q}
            contactFaq1A={contactFaq1A}
            setContactFaq1A={setContactFaq1A}
            contactFaq2Q={contactFaq2Q}
            setContactFaq2Q={setContactFaq2Q}
            contactFaq2A={contactFaq2A}
            setContactFaq2A={setContactFaq2A}
            contactFaq3Q={contactFaq3Q}
            setContactFaq3Q={setContactFaq3Q}
            contactFaq3A={contactFaq3A}
            setContactFaq3A={setContactFaq3A}
            contactFaq4Q={contactFaq4Q}
            setContactFaq4Q={setContactFaq4Q}
            contactFaq4A={contactFaq4A}
            setContactFaq4A={setContactFaq4A}
            contactCtaTitle={contactCtaTitle}
            setContactCtaTitle={setContactCtaTitle}
            contactCtaDescription={contactCtaDescription}
            setContactCtaDescription={setContactCtaDescription}
            buttonLabel={buttonLabel}
            setButtonLabel={setButtonLabel}
            buttonUrl={buttonUrl}
            setButtonUrl={setButtonUrl}
            secondaryButtonLabel={secondaryButtonLabel}
            setSecondaryButtonLabel={setSecondaryButtonLabel}
            secondaryButtonUrl={secondaryButtonUrl}
            setSecondaryButtonUrl={setSecondaryButtonUrl}
          />
        )}

        {!isAboutPage && !isCertificatePage && !isSponsorPage && !isJoinPage && !isContactPage && (
          <StandardEditorFields
            badge={badge}
            setBadge={setBadge}
            title={title}
            setTitle={setTitle}
            summary={summary}
            setSummary={setSummary}
            imageUrl={imageUrl}
            setImageUrl={setImageUrl}
            imageFit={imageFit}
            setImageFit={setImageFit}
            imageFocalX={imageFocalX}
            setImageFocalX={setImageFocalX}
            imageFocalY={imageFocalY}
            setImageFocalY={setImageFocalY}
            contentFormatted={content}
            setContentFormatted={setContent}
            secondaryImageUrl={secondaryImageUrl}
            setSecondaryImageUrl={setSecondaryImageUrl}
            buttonLabel={buttonLabel}
            setButtonLabel={setButtonLabel}
            buttonUrl={buttonUrl}
            setButtonUrl={setButtonUrl}
            secondaryButtonLabel={secondaryButtonLabel}
            setSecondaryButtonLabel={setSecondaryButtonLabel}
            secondaryButtonUrl={secondaryButtonUrl}
            setSecondaryButtonUrl={setSecondaryButtonUrl}
          />
        )}

        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4"><div><h2 className="text-sm font-black text-slate-900">SEO & Chia sẻ mạng xã hội</h2><p className="mt-1 text-xs text-slate-500">Thiết lập riêng cho trang; để trống sẽ dùng thông tin chung của website.</p></div><div className="grid gap-3 sm:grid-cols-2"><input value={seoTitle} onChange={e=>setSeoTitle(e.target.value)} placeholder="SEO title" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/><input value={canonicalUrl} onChange={e=>setCanonicalUrl(e.target.value)} placeholder="Canonical URL" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/><textarea value={seoDescription} onChange={e=>setSeoDescription(e.target.value)} rows={3} placeholder="Meta description" className="sm:col-span-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/><input value={ogImageUrl} onChange={e=>setOgImageUrl(e.target.value)} placeholder="OG image URL từ Media Library" className="sm:col-span-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/><label className="sm:col-span-2 flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={noIndex} onChange={e=>setNoIndex(e.target.checked)}/>Không cho công cụ tìm kiếm index trang này</label></div></section>

        {!isAboutPage && !isCertificatePage && !isSponsorPage && !isJoinPage && !isContactPage && (
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-sm font-black text-slate-900">Page Builder</h2>
                <p className="mt-1 text-xs text-slate-500">Thêm, sắp xếp và chỉnh các khối nội dung mà không cần sửa code.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['text','image','video','stats','cta','quote','divider','html','gallery','timeline','logos','accordion','tabs','table','documents','people','campaign','funding','transparency','map','embed','marquee'] as PageBlockType[]).map((type) => (
                  <button key={type} type="button" onClick={() => addPageBlock(type)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-700 hover:border-sky-300 hover:bg-sky-50">+ {type}</button>
                ))}
              </div>
            </div>

            {pageBlocks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">Chưa có block. Nội dung cũ phía trên vẫn được giữ nguyên; thêm block khi cần dựng landing page.</div>
            ) : (
              <div className="space-y-4">
                {pageBlocks.map((block, index) => (
                  <article key={block.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2"><span className="rounded-md bg-slate-900 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white">{block.type}</span><span className="text-xs text-slate-400">#{index + 1}</span></div>
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => movePageBlock(index,-1)} disabled={index===0} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold disabled:opacity-30">↑</button>
                        <button type="button" onClick={() => movePageBlock(index,1)} disabled={index===pageBlocks.length-1} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold disabled:opacity-30">↓</button>
                        <button type="button" onClick={() => deletePageBlock(block.id)} className="rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-bold text-rose-600">Xóa</button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {!['divider'].includes(block.type) && <input value={block.title || ''} onChange={(e)=>updatePageBlock(block.id,{title:e.target.value})} placeholder="Tiêu đề block (không bắt buộc)" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400" />}
                      <select value={block.background || 'white'} onChange={(e)=>updatePageBlock(block.id,{background:e.target.value as PageBlock['background']})} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="white">Nền trắng</option><option value="soft">Nền xám nhạt</option><option value="sky">Nền xanh nhạt</option><option value="navy">Nền navy</option></select>
                    </div>

                    {['text','quote','html'].includes(block.type) && <textarea value={block.body || ''} onChange={(e)=>updatePageBlock(block.id,{body:e.target.value})} rows={block.type==='html'?7:4} placeholder={block.type==='html'?'HTML an toàn (script sẽ bị loại bỏ)':'Nội dung'} className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400" />}

                    {block.type === 'image' && <div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><ImageUrlInput label="Ảnh trong nội dung" value={block.imageUrl||''} onChange={url=>updatePageBlock(block.id,{imageUrl:url})} helperText="Tải trực tiếp lên R2, chọn từ Media Library hoặc dán URL." category="media" placeholder="Chọn hoặc tải ảnh"/></div><input value={block.alt || ''} onChange={(e)=>updatePageBlock(block.id,{alt:e.target.value})} placeholder="Alt text" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"/><input value={block.caption || ''} onChange={(e)=>updatePageBlock(block.id,{caption:e.target.value})} placeholder="Chú thích ảnh" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"/><input value={block.credit || ''} onChange={(e)=>updatePageBlock(block.id,{credit:e.target.value})} placeholder="Nguồn/Tác giả ảnh" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"/><input value={block.sourceUrl || ''} onChange={(e)=>updatePageBlock(block.id,{sourceUrl:e.target.value})} placeholder="URL nguồn ảnh (nếu có)" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"/><label className="text-xs font-bold text-slate-600">Cách hiển thị<select value={block.imageFit||'original'} onChange={e=>updatePageBlock(block.id,{imageFit:e.target.value as PageBlock['imageFit']})} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option value="original">Original — giữ tỷ lệ gốc</option><option value="contain">Fit — vừa khung, không cắt</option><option value="cover">Cover — phủ khung</option></select></label><div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold text-slate-600">Focal X<input type="number" min="0" max="100" value={block.focalX??50} onChange={e=>updatePageBlock(block.id,{focalX:Number(e.target.value)})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"/></label><label className="text-xs font-bold text-slate-600">Focal Y<input type="number" min="0" max="100" value={block.focalY??50} onChange={e=>updatePageBlock(block.id,{focalY:Number(e.target.value)})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"/></label></div></div>}

                    {block.type === 'video' && <div className="mt-3 grid gap-3 sm:grid-cols-2"><input value={block.videoUrl || ''} onChange={(e)=>updatePageBlock(block.id,{videoUrl:e.target.value})} placeholder="URL MP4/WebM hoặc YouTube" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"/><input value={block.posterUrl || ''} onChange={(e)=>updatePageBlock(block.id,{posterUrl:e.target.value})} placeholder="Poster ảnh (không bắt buộc)" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"/></div>}

                    {block.type === 'cta' && <div className="mt-3 grid gap-3 sm:grid-cols-2"><input value={block.buttonLabel || ''} onChange={(e)=>updatePageBlock(block.id,{buttonLabel:e.target.value})} placeholder="Tên nút" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"/><input value={block.buttonUrl || ''} onChange={(e)=>updatePageBlock(block.id,{buttonUrl:e.target.value})} placeholder="URL nút" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"/></div>}

                    {block.type === 'stats' && <div className="mt-3 space-y-2">{(block.stats || []).map((stat,statIndex)=><div key={statIndex} className="grid gap-2 sm:grid-cols-[.55fr_1fr_1fr_auto]"><input value={stat.value} onChange={(e)=>{const stats=[...(block.stats||[])];stats[statIndex]={...stats[statIndex],value:e.target.value};updatePageBlock(block.id,{stats})}} placeholder="100+" className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"/><input value={stat.label} onChange={(e)=>{const stats=[...(block.stats||[])];stats[statIndex]={...stats[statIndex],label:e.target.value};updatePageBlock(block.id,{stats})}} placeholder="Nhãn" className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"/><input value={stat.note||''} onChange={(e)=>{const stats=[...(block.stats||[])];stats[statIndex]={...stats[statIndex],note:e.target.value};updatePageBlock(block.id,{stats})}} placeholder="Ghi chú" className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"/><button type="button" onClick={()=>updatePageBlock(block.id,{stats:(block.stats||[]).filter((_,i)=>i!==statIndex)})} className="rounded-lg border border-rose-200 bg-white px-3 text-xs font-bold text-rose-600">×</button></div>)}<button type="button" onClick={()=>updatePageBlock(block.id,{stats:[...(block.stats||[]),{value:'0',label:'Chỉ số'}]})} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold">+ Thêm chỉ số</button></div>}
                    {['gallery','timeline','logos','accordion','tabs','table','documents','people','campaign','funding','transparency','marquee'].includes(block.type) && <div className="mt-3 space-y-2"><div className="text-[11px] font-bold text-slate-500">Danh sách item của block — có thể thêm, xóa và sắp xếp bằng nội dung bên dưới.</div>{(block.items||[]).map((item,itemIndex)=><div key={itemIndex} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_1fr_auto]"><input value={item.title||''} onChange={e=>{const items=[...(block.items||[])];items[itemIndex]={...items[itemIndex],title:e.target.value};updatePageBlock(block.id,{items})}} placeholder="Tiêu đề / nhãn" className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"/><input value={item.body||''} onChange={e=>{const items=[...(block.items||[])];items[itemIndex]={...items[itemIndex],body:e.target.value};updatePageBlock(block.id,{items})}} placeholder="Mô tả / giá trị" className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"/><input value={item.imageUrl||item.url||''} onChange={e=>{const items=[...(block.items||[])];items[itemIndex]={...items[itemIndex],url:e.target.value,imageUrl:e.target.value};updatePageBlock(block.id,{items})}} placeholder="URL ảnh/file/link" className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"/><button type="button" onClick={()=>updatePageBlock(block.id,{items:(block.items||[]).filter((_,i)=>i!==itemIndex)})} className="rounded-lg border border-rose-200 bg-white px-3 text-xs font-bold text-rose-600">×</button></div>)}<button type="button" onClick={()=>updatePageBlock(block.id,{items:[...(block.items||[]),{title:'Mục mới',body:''}]})} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold">+ Thêm item</button></div>}
                    {['map','embed'].includes(block.type) && <div className="mt-3 grid gap-3 sm:grid-cols-2"><input value={block.sourceUrl||block.videoUrl||''} onChange={e=>updatePageBlock(block.id,{sourceUrl:e.target.value,videoUrl:e.target.value})} placeholder={block.type==='map'?'URL bản đồ':'URL embed an toàn'} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"/><input value={block.body||''} onChange={e=>updatePageBlock(block.id,{body:e.target.value})} placeholder="Mô tả" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"/></div>}
                    <div className="mt-3 grid gap-3 sm:grid-cols-4"><select value={block.width||'normal'} onChange={e=>updatePageBlock(block.id,{width:e.target.value as PageBlock['width']})} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"><option value="normal">Rộng chuẩn</option><option value="wide">Rộng</option><option value="full">Toàn chiều rộng</option></select><select value={block.animation||'none'} onChange={e=>updatePageBlock(block.id,{animation:e.target.value as PageBlock['animation']})} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"><option value="none">Không hiệu ứng</option><option value="fade">Fade</option><option value="slide">Slide</option><option value="zoom">Zoom</option><option value="reveal">Reveal</option></select><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={block.mobileHidden===true} onChange={e=>updatePageBlock(block.id,{mobileHidden:e.target.checked})}/>Ẩn mobile</label><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={block.hidden===true} onChange={e=>updatePageBlock(block.id,{hidden:e.target.checked})}/>Ẩn public</label></div>

                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

// --- Consolidated from EditorFieldsBundle.tsx ---







// -----------------------------------------------------------------------------
// AboutEditorFields.tsx
// -----------------------------------------------------------------------------

interface AboutEditorFieldsProps {
  // 1. Hero
  badge: string;
  setBadge: (val: string) => void;
  title: string;
  setTitle: (val: string) => void;
  summary: string;
  setSummary: (val: string) => void;

  // 2. Vision, Mission, Philosophy
  visionBadge: string;
  setVisionBadge: (val: string) => void;
  visionTitle: string;
  setVisionTitle: (val: string) => void;
  visionContent: string;
  setVisionContent: (val: string) => void;

  missionBadge: string;
  setMissionBadge: (val: string) => void;
  missionTitle: string;
  setMissionTitle: (val: string) => void;
  missionContent: string;
  setMissionContent: (val: string) => void;

  philosophyBadge: string;
  setPhilosophyBadge: (val: string) => void;
  philosophyTitle: string;
  setPhilosophyTitle: (val: string) => void;
  philosophyContent: string;
  setPhilosophyContent: (val: string) => void;

  // 3. Core Pillars
  pillarsSectionTitle: string;
  setPillarsSectionTitle: (val: string) => void;
  pillarsSectionBadge: string;
  setPillarsSectionBadge: (val: string) => void;
  customPillars: CorePillar[];
  setCustomPillars: (val: CorePillar[]) => void;

  // 4. Core Values
  valuesSectionTitle: string;
  setValuesSectionTitle: (val: string) => void;
  customValues: CoreValueItem[];
  setCustomValues: (val: CoreValueItem[]) => void;

  // 5. Timeline
  timelineSectionTitle: string;
  setTimelineSectionTitle: (val: string) => void;
  timelineSectionBadge: string;
  setTimelineSectionBadge: (val: string) => void;
  customTimeline: TimelineMilestone[];
  setCustomTimeline: (val: TimelineMilestone[]) => void;

  // 6. Leadership Team
  teamSectionTitle: string;
  setTeamSectionTitle: (val: string) => void;
  teamSectionSubtitle: string;
  setTeamSectionSubtitle: (val: string) => void;
  customTeam: TeamMember[];
  setCustomTeam: (val: TeamMember[]) => void;

  // 7. Units section
  unitsSectionBadge: string;
  setUnitsSectionBadge: (val: string) => void;
  unitsSectionTitle: string;
  setUnitsSectionTitle: (val: string) => void;
  unitsButtonLabel: string;
  setUnitsButtonLabel: (val: string) => void;
  unitsButtonUrl: string;
  setUnitsButtonUrl: (val: string) => void;

  // 8. CTA section
  ctaTitle: string;
  setCtaTitle: (val: string) => void;
  ctaDescription: string;
  setCtaDescription: (val: string) => void;
  buttonLabel: string;
  setButtonLabel: (val: string) => void;
  buttonUrl: string;
  setButtonUrl: (val: string) => void;
  secondaryButtonLabel: string;
  setSecondaryButtonLabel: (val: string) => void;
  secondaryButtonUrl: string;
  setSecondaryButtonUrl: (val: string) => void;
}

export const AboutEditorFields: React.FC<AboutEditorFieldsProps> = ({
  badge,
  setBadge,
  title,
  setTitle,
  summary,
  setSummary,
  visionBadge,
  setVisionBadge,
  visionTitle,
  setVisionTitle,
  visionContent,
  setVisionContent,
  missionBadge,
  setMissionBadge,
  missionTitle,
  setMissionTitle,
  missionContent,
  setMissionContent,
  philosophyBadge,
  setPhilosophyBadge,
  philosophyTitle,
  setPhilosophyTitle,
  philosophyContent,
  setPhilosophyContent,
  pillarsSectionTitle,
  setPillarsSectionTitle,
  pillarsSectionBadge,
  setPillarsSectionBadge,
  customPillars,
  setCustomPillars,
  valuesSectionTitle,
  setValuesSectionTitle,
  customValues,
  setCustomValues,
  timelineSectionTitle,
  setTimelineSectionTitle,
  timelineSectionBadge,
  setTimelineSectionBadge,
  customTimeline,
  setCustomTimeline,
  teamSectionTitle,
  setTeamSectionTitle,
  teamSectionSubtitle,
  setTeamSectionSubtitle,
  customTeam,
  setCustomTeam,
  unitsSectionBadge,
  setUnitsSectionBadge,
  unitsSectionTitle,
  setUnitsSectionTitle,
  unitsButtonLabel,
  setUnitsButtonLabel,
  unitsButtonUrl,
  setUnitsButtonUrl,
  ctaTitle,
  setCtaTitle,
  ctaDescription,
  setCtaDescription,
  buttonLabel,
  setButtonLabel,
  buttonUrl,
  setButtonUrl,
  secondaryButtonLabel,
  setSecondaryButtonLabel,
  secondaryButtonUrl,
  setSecondaryButtonUrl,
}) => {
  // Handlers for Pillars
  const handleUpdatePillar = (index: number, updated: Partial<CorePillar>) => {
    const next = [...customPillars];
    next[index] = { ...next[index], ...updated };
    setCustomPillars(next);
  };

  const handleAddPillar = () => {
    const nextIndex = customPillars.length + 1;
    const newPillar: CorePillar = {
      number: nextIndex < 10 ? `0${nextIndex}` : `${nextIndex}`,
      title: 'Trụ Cột Hoạt Động Mới',
      shortDesc: 'Mô tả ngắn gọn về định hướng trụ cột hoạt động này.',
      fullDesc: 'Mô tả chi tiết các chương trình, hoạt động triển khai của trụ cột.',
      iconName: 'Sparkles',
      activities: ['Hoạt động triển khai chính 1', 'Hoạt động triển khai chính 2'],
    };
    setCustomPillars([...customPillars, newPillar]);
  };

  const handleDeletePillar = (index: number) => {
    setCustomPillars(customPillars.filter((_, i) => i !== index));
  };

  const handleResetPillars = () => {
    setCustomPillars([...CORE_PILLARS]);
  };

  // Handlers for Core Values
  const handleUpdateValue = (index: number, updated: Partial<CoreValueItem>) => {
    const next = [...customValues];
    next[index] = { ...next[index], ...updated };
    setCustomValues(next);
  };

  const handleAddValue = () => {
    const newValue: CoreValueItem = {
      name: 'Giá trị mới (Core Value)',
      desc: 'Mô tả ý nghĩa và cam kết thực hiện của giá trị này đối với cộng đồng.',
      badge: 'bg-sky-50 text-sky-700 border-sky-200',
    };
    setCustomValues([...customValues, newValue]);
  };

  const handleDeleteValue = (index: number) => {
    setCustomValues(customValues.filter((_, i) => i !== index));
  };

  const handleResetValues = () => {
    setCustomValues([...CORE_VALUES]);
  };

  // Handlers for Timeline
  const handleUpdateMilestone = (index: number, updated: Partial<TimelineMilestone>) => {
    const next = [...customTimeline];
    next[index] = { ...next[index], ...updated };
    setCustomTimeline(next);
  };

  const handleAddMilestone = () => {
    const currentYear = new Date().getFullYear().toString();
    const newMilestone: TimelineMilestone = {
      year: currentYear,
      title: 'Cột mốc phát triển mới',
      description: 'Mô tả những thành tựu và dấu ấn quan trọng đạt được trong giai đoạn này.',
      highlights: ['Điểm nổi bật trọng tâm 1', 'Điểm nổi bật trọng tâm 2'],
      isCurrent: false,
    };
    setCustomTimeline([...customTimeline, newMilestone]);
  };

  const handleDeleteMilestone = (index: number) => {
    setCustomTimeline(customTimeline.filter((_, i) => i !== index));
  };

  const handleResetTimeline = () => {
    setCustomTimeline([...TIMELINE_DATA]);
  };

  // Handlers for Team Members
  const handleUpdateMember = (index: number, updated: Partial<TeamMember>) => {
    const next = [...customTeam];
    next[index] = { ...next[index], ...updated };
    setCustomTeam(next);
  };

  const handleAddMember = () => {
    const newMember: TeamMember = {
      name: 'Thành viên Lãnh đạo Mới',
      role: 'Chức vụ / Vai trò Ban Chấp hành',
      bio: 'Tóm tắt kinh nghiệm làm việc, năng lực chuyên môn và đóng góp cho mạng lưới.',
      imageUrl: '',
      imageSizeText: '1:1 (400x400px)',
      imageDescription: 'Ảnh chân dung thành viên',
      theme: 'sky',
    };
    setCustomTeam([...customTeam, newMember]);
  };

  const handleDeleteMember = (index: number) => {
    setCustomTeam(customTeam.filter((_, i) => i !== index));
  };

  const handleResetTeam = () => {
    setCustomTeam([...TEAM_DATA]);
  };

  return (
    <div className="space-y-6">
      {/* 1. KHỐI ĐẦU TRANG (HERO BANNER) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              Khối 1: Khối Đầu Trang (Hero Banner - /about)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Phần mở đầu trang Giới Thiệu
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Huy hiệu nổi bật (Badge)
          </label>
          <input
            type="text"
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            placeholder="VD: HỆ SINH THÁI GIÁO DỤC Sky First Network 2026"
            className="w-full text-xs font-bold text-[#0284C7] px-3 py-2 bg-sky-50/50 border border-sky-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Tiêu đề trang <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Về Sky First Network"
            className="w-full text-xl sm:text-2xl font-black text-slate-900 border border-slate-200 rounded-xl px-4 py-3 focus:border-[#0284C7] focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Đoạn văn mở đầu (Tóm tắt giới thiệu chung)
          </label>
          <textarea
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Nhập đoạn văn mở đầu trang giới thiệu..."
            className="w-full text-xs sm:text-sm text-slate-700 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden leading-relaxed"
          />
        </div>
      </div>

      {/* 2. KHỐI TẦM NHÌN, SỨ MỆNH & TRIẾT LÝ HOẠT ĐỘNG (3 THẺ) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Compass size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              Khối 2: Tầm Nhìn, Sứ Mệnh & Triết Lý Hoạt Động (3 Thẻ)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            3 thẻ định hướng trung tâm
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Thẻ 1: Tầm Nhìn */}
          <div className="p-4 rounded-xl bg-sky-50/50 border border-sky-100 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0284C7]"></span>
              <span className="text-xs font-extrabold text-[#0284C7]">Thẻ 1: TẦM NHÌN</span>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Nhãn phụ</label>
              <input
                type="text"
                value={visionBadge}
                onChange={(e) => setVisionBadge(e.target.value)}
                placeholder="Định Hướng Chiến Lược"
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Tiêu đề thẻ</label>
              <input
                type="text"
                value={visionTitle}
                onChange={(e) => setVisionTitle(e.target.value)}
                placeholder="Tầm Nhìn 2030"
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Nội dung chi tiết</label>
              <textarea
                rows={4}
                value={visionContent}
                onChange={(e) => setVisionContent(e.target.value)}
                placeholder="Nhập nội dung tầm nhìn..."
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg leading-relaxed"
              />
            </div>
          </div>

          {/* Thẻ 2: Sứ Mệnh */}
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span className="text-xs font-extrabold text-emerald-700">Thẻ 2: SỨ MỆNH</span>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Nhãn phụ</label>
              <input
                type="text"
                value={missionBadge}
                onChange={(e) => setMissionBadge(e.target.value)}
                placeholder="Mục Tiêu Hành Động"
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Tiêu đề thẻ</label>
              <input
                type="text"
                value={missionTitle}
                onChange={(e) => setMissionTitle(e.target.value)}
                placeholder="Sứ Mệnh Phụng Sự"
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Nội dung chi tiết</label>
              <textarea
                rows={4}
                value={missionContent}
                onChange={(e) => setMissionContent(e.target.value)}
                placeholder="Nhập nội dung sứ mệnh..."
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg leading-relaxed"
              />
            </div>
          </div>

          {/* Thẻ 3: Triết Lý */}
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-600"></span>
              <span className="text-xs font-extrabold text-amber-700">Thẻ 3: TRIẾT LÝ HOẠT ĐỘNG</span>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Nhãn phụ</label>
              <input
                type="text"
                value={philosophyBadge}
                onChange={(e) => setPhilosophyBadge(e.target.value)}
                placeholder="Kim Chỉ Nam"
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Tiêu đề thẻ</label>
              <input
                type="text"
                value={philosophyTitle}
                onChange={(e) => setPhilosophyTitle(e.target.value)}
                placeholder="Triết Lý Cốt Lõi"
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Nội dung chi tiết</label>
              <textarea
                rows={4}
                value={philosophyContent}
                onChange={(e) => setPhilosophyContent(e.target.value)}
                placeholder="Nhập nội dung triết lý..."
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg leading-relaxed"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. KHỐI 5 TRỤ CỘT HOẠT ĐỘNG CỐT LÕI */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              Khối 3: 5 Trụ Cột Hoạt Động Cốt Lõi
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetPillars}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Khôi phục mặc định</span>
            </button>
            <button
              type="button"
              onClick={handleAddPillar}
              className="text-xs font-bold text-[#0284C7] bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200 transition flex items-center gap-1 cursor-pointer"
            >
              <Plus size={13} />
              <span>Thêm trụ cột</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tiêu đề khối trụ cột
            </label>
            <input
              type="text"
              value={pillarsSectionTitle}
              onChange={(e) => setPillarsSectionTitle(e.target.value)}
              placeholder="5 Trụ Cột Hoạt Động Cốt Lõi"
              className="w-full text-xs font-bold text-slate-900 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Huy hiệu phụ khối trụ cột
            </label>
            <input
              type="text"
              value={pillarsSectionBadge}
              onChange={(e) => setPillarsSectionBadge(e.target.value)}
              placeholder="Định Hướng Chiến Lược"
              className="w-full text-xs font-bold text-[#0284C7] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Danh sách các trụ cột */}
        <div className="space-y-4 pt-2">
          {customPillars.map((pillar, pIdx) => (
            <div
              key={pIdx}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-sky-300 transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-sky-100 text-[#0284C7] font-black text-xs flex items-center justify-center">
                    {pillar.number || `0${pIdx + 1}`}
                  </span>
                  <span className="text-xs font-black text-slate-800">
                    Trụ cột #{pIdx + 1}: {pillar.title || 'Chưa đặt tiêu đề'}
                  </span>
                </div>
                {customPillars.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeletePillar(pIdx)}
                    className="text-slate-400 hover:text-rose-500 p-1 transition cursor-pointer"
                    title="Xóa trụ cột này"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Số thứ tự (Mã)
                  </label>
                  <input
                    type="text"
                    value={pillar.number}
                    onChange={(e) => handleUpdatePillar(pIdx, { number: e.target.value })}
                    placeholder="01"
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold font-mono"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Tiêu đề trụ cột
                  </label>
                  <input
                    type="text"
                    value={pillar.title}
                    onChange={(e) => handleUpdatePillar(pIdx, { title: e.target.value })}
                    placeholder="VD: Giáo dục & Đào tạo"
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Mô tả nội dung chi tiết
                </label>
                <textarea
                  rows={2}
                  value={pillar.fullDesc || pillar.shortDesc}
                  onChange={(e) =>
                    handleUpdatePillar(pIdx, {
                      fullDesc: e.target.value,
                      shortDesc: e.target.value,
                    })
                  }
                  placeholder="Nhập mô tả triển khai trụ cột này..."
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Hoạt động trọng tâm (Mỗi dòng là một hoạt động)
                </label>
                <textarea
                  rows={3}
                  value={pillar.activities ? pillar.activities.join('\n') : ''}
                  onChange={(e) =>
                    handleUpdatePillar(pIdx, {
                      activities: e.target.value
                        .split('\n')
                        .map((s) => s.trim())
                        .filter((s) => s.length > 0),
                    })
                  }
                  placeholder="Khóa rèn luyện Kỹ năng Lãnh đạo Trẻ (Youth Leadership)&#10;Chuỗi Workshop Kỹ năng mềm & Ứng dụng Công nghệ"
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono leading-relaxed"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. KHỐI GIÁ TRỊ CỐT LÕI (5 CORE VALUES) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <Award size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              Khối 4: Giá Trị Cốt Lõi (5 Core Values)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetValues}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Khôi phục mặc định</span>
            </button>
            <button
              type="button"
              onClick={handleAddValue}
              className="text-xs font-bold text-[#0284C7] bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200 transition flex items-center gap-1 cursor-pointer"
            >
              <Plus size={13} />
              <span>Thêm giá trị</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Tiêu đề khối giá trị
          </label>
          <input
            type="text"
            value={valuesSectionTitle}
            onChange={(e) => setValuesSectionTitle(e.target.value)}
            placeholder="Giá Trị Cốt Lõi"
            className="w-full text-xs font-bold text-slate-900 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {customValues.map((val, vIdx) => (
            <div
              key={vIdx}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-[#0284C7] bg-sky-100 px-2 py-0.5 rounded">
                  0{vIdx + 1}
                </span>
                {customValues.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteValue(vIdx)}
                    className="text-slate-400 hover:text-rose-500 p-1 transition cursor-pointer"
                    title="Xóa giá trị này"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tên giá trị cốt lõi
                </label>
                <input
                  type="text"
                  value={val.name}
                  onChange={(e) => handleUpdateValue(vIdx, { name: e.target.value })}
                  placeholder="Tận tâm (Dedication)"
                  className="w-full text-xs px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Mô tả ý nghĩa
                </label>
                <textarea
                  rows={2}
                  value={val.desc}
                  onChange={(e) => handleUpdateValue(vIdx, { desc: e.target.value })}
                  placeholder="Hành động vì lợi ích cộng đồng..."
                  className="w-full text-xs px-2 py-1.5 bg-white border border-slate-200 rounded-lg leading-relaxed"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. KHỐI HÀNH TRÌNH PHÁT TRIỂN (TIMELINE CỘT MỐC) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <Milestone size={16} className="text-emerald-600" />
            <h3 className="text-sm font-extrabold text-slate-900">
              Khối 5: Hành Trình & Cột Mốc Phát Triển (Timeline)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetTimeline}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Khôi phục mặc định</span>
            </button>
            <button
              type="button"
              onClick={handleAddMilestone}
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition flex items-center gap-1 cursor-pointer"
            >
              <Plus size={13} />
              <span>Thêm cột mốc</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tiêu đề khối hành trình
            </label>
            <input
              type="text"
              value={timelineSectionTitle}
              onChange={(e) => setTimelineSectionTitle(e.target.value)}
              placeholder="Hành Trình Phát Triển"
              className="w-full text-xs font-bold text-slate-900 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Giai đoạn / Khoảng thời gian
            </label>
            <input
              type="text"
              value={timelineSectionBadge}
              onChange={(e) => setTimelineSectionBadge(e.target.value)}
              placeholder="2024 - 2026"
              className="w-full text-xs font-bold text-emerald-700 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
            />
          </div>
        </div>

        <div className="space-y-4 pt-2">
          {customTimeline.map((milestone, mIdx) => (
            <div
              key={mIdx}
              className={`p-4 rounded-xl border transition space-y-3 ${
                milestone.isCurrent
                  ? 'border-sky-300 bg-sky-50/40 shadow-xs'
                  : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-slate-800 text-white rounded-lg text-xs font-bold font-mono">
                    Năm {milestone.year}
                  </span>
                  <span className="text-xs font-black text-slate-800">{milestone.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={milestone.isCurrent || false}
                      onChange={(e) =>
                        handleUpdateMilestone(mIdx, { isCurrent: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-sky-600"
                    />
                    <span>Đang vận hành (Current)</span>
                  </label>
                  {customTimeline.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteMilestone(mIdx)}
                      className="text-slate-400 hover:text-rose-500 p-1 transition cursor-pointer"
                      title="Xóa cột mốc này"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Năm</label>
                  <input
                    type="text"
                    value={milestone.year}
                    onChange={(e) => handleUpdateMilestone(mIdx, { year: e.target.value })}
                    placeholder="2026"
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Tiêu đề cột mốc
                  </label>
                  <input
                    type="text"
                    value={milestone.title}
                    onChange={(e) => handleUpdateMilestone(mIdx, { title: e.target.value })}
                    placeholder="Chuẩn hóa & vận hành hệ thống số Sky First Network"
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Mô tả chi tiết cột mốc
                </label>
                <textarea
                  rows={2}
                  value={milestone.description}
                  onChange={(e) =>
                    handleUpdateMilestone(mIdx, { description: e.target.value })
                  }
                  placeholder="Nhập mô tả các cột mốc trong năm..."
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Các điểm nổi bật (Mỗi dòng 1 ý)
                </label>
                <textarea
                  rows={3}
                  value={milestone.highlights ? milestone.highlights.join('\n') : ''}
                  onChange={(e) =>
                    handleUpdateMilestone(mIdx, {
                      highlights: e.target.value
                        .split('\n')
                        .map((s) => s.trim())
                        .filter((s) => s.length > 0),
                    })
                  }
                  placeholder="Ban hành Quy chuẩn Giao diện & Thương hiệu Sky First Network 2026&#10;Ra mắt Website và Cổng Tình nguyện viên"
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono leading-relaxed"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. KHỐI BAN CHẤP HÀNH & ĐỘI NGŨ SKY FIRST NETWORK */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              Khối 6: Ban Chấp hành & Đội ngũ Sky First Network
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetTeam}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Khôi phục mặc định</span>
            </button>
            <button
              type="button"
              onClick={handleAddMember}
              className="text-xs font-bold text-[#0284C7] bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200 transition flex items-center gap-1 cursor-pointer"
            >
              <Plus size={13} />
              <span>Thêm thành viên</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tiêu đề khối lãnh đạo
            </label>
            <input
              type="text"
              value={teamSectionTitle}
              onChange={(e) => setTeamSectionTitle(e.target.value)}
              placeholder="Đội Ngũ Lãnh Đạo"
              className="w-full text-xs font-bold text-slate-900 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Phụ đề / Ghi chú khối
            </label>
            <input
              type="text"
              value={teamSectionSubtitle}
              onChange={(e) => setTeamSectionSubtitle(e.target.value)}
              placeholder="Ban Chấp hành Sky First Network"
              className="w-full text-xs text-slate-700 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {customTeam.map((member, mIdx) => (
            <div
              key={mIdx}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-sky-300 transition space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  {/* Xem trước ảnh đại diện */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0 flex items-center justify-center">
                    {member.imageUrl ? (
                      <img
                        src={member.imageUrl}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold text-center px-1">
                        Chưa có ảnh
                      </span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Họ và tên
                      </label>
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => handleUpdateMember(mIdx, { name: e.target.value })}
                        placeholder="VD: Nguyễn Minh Tân Lợi"
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Chức vụ / Vai trò
                      </label>
                      <input
                        type="text"
                        value={member.role}
                        onChange={(e) => handleUpdateMember(mIdx, { role: e.target.value })}
                        placeholder="VD: Thành viên Ban Chấp hành"
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[#0284C7] font-bold"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteMember(mIdx)}
                    className="text-slate-400 hover:text-rose-500 p-1 transition cursor-pointer"
                    title="Xóa thành viên này"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <EntityColorPicker
                  label="Màu chức danh"
                  entityLabel={member.role || member.name || 'Chức danh'}
                  value={member.roleColor}
                  onChange={(roleColor) => handleUpdateMember(mIdx, { roleColor })}
                />

                <ImageUrlInput label="Ảnh chân dung" value={member.imageUrl || ''} onChange={(v)=>handleUpdateMember(mIdx,{imageUrl:v})} helperText="Tải ảnh chân dung trực tiếp từ thiết bị."/>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Tiểu sử tóm tắt (Bio)
                  </label>
                  <textarea
                    rows={2}
                    value={member.bio}
                    onChange={(e) => handleUpdateMember(mIdx, { bio: e.target.value })}
                    placeholder="Tóm tắt kinh nghiệm và đóng góp..."
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg leading-relaxed"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. KHỐI HỆ THỐNG ĐƠN VỊ TRỰC THUỘC */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              Khối 7: Hệ Thống Đơn Vị Trực Thuộc (Quick Link - /about)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Khối giới thiệu 5 đơn vị thành viên
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nhãn phụ khối đơn vị
            </label>
            <input
              type="text"
              value={unitsSectionBadge}
              onChange={(e) => setUnitsSectionBadge(e.target.value)}
              placeholder="HỆ THỐNG ĐƠN VỊ TRỰC THUỘC"
              className="w-full text-xs font-bold text-[#0284C7] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tiêu đề khối đơn vị
            </label>
            <input
              type="text"
              value={unitsSectionTitle}
              onChange={(e) => setUnitsSectionTitle(e.target.value)}
              placeholder="Đơn vị trực thuộc Sky First Network"
              className="w-full text-xs font-bold text-slate-900 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <span className="text-xs font-extrabold text-slate-700 block">
            Cấu hình nút điều hướng đến trang Đơn vị
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Tên nút bấm
              </label>
              <input
                type="text"
                value={unitsButtonLabel}
                onChange={(e) => setUnitsButtonLabel(e.target.value)}
                placeholder="Xem chi tiết tất cả đơn vị"
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Liên kết trỏ đến
              </label>
              <input
                type="text"
                value={unitsButtonUrl}
                onChange={(e) => setUnitsButtonUrl(e.target.value)}
                placeholder="/units"
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 8. KHỐI KÊU GỌI HÀNH ĐỘNG (CTA BANNER CUỐI TRANG) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Megaphone size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              Khối 8: Khối Kêu Gọi Hành Động (CTA Banner Cuối Trang - /about)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Banner nổi bật màu xanh cuối trang
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tiêu đề banner CTA
            </label>
            <input
              type="text"
              value={ctaTitle}
              onChange={(e) => setCtaTitle(e.target.value)}
              placeholder="Kết nối cùng Sky First Network"
              className="w-full text-sm font-black text-slate-900 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Đoạn văn mô tả banner CTA
            </label>
            <textarea
              rows={2}
              value={ctaDescription}
              onChange={(e) => setCtaDescription(e.target.value)}
              placeholder="Dù bạn là học viên, tình nguyện viên hay đối tác tổ chức..."
              className="w-full text-xs text-slate-700 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden leading-relaxed"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nút chính */}
            <div className="p-3.5 rounded-xl bg-sky-50/50 border border-sky-100 space-y-2.5">
              <span className="text-xs font-extrabold text-[#0284C7] block">
                Nút hành động chính 1
              </span>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tên nút
                </label>
                <input
                  type="text"
                  value={buttonLabel}
                  onChange={(e) => setButtonLabel(e.target.value)}
                  placeholder="Tham gia ngay"
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Liên kết trỏ đến
                </label>
                <input
                  type="text"
                  value={buttonUrl}
                  onChange={(e) => setButtonUrl(e.target.value)}
                  placeholder="/join"
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>

            {/* Nút phụ */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <span className="text-xs font-extrabold text-slate-700 block">
                Nút hành động phụ 2
              </span>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tên nút
                </label>
                <input
                  type="text"
                  value={secondaryButtonLabel}
                  onChange={(e) => setSecondaryButtonLabel(e.target.value)}
                  placeholder="Xem chương trình"
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Liên kết trỏ đến
                </label>
                <input
                  type="text"
                  value={secondaryButtonUrl}
                  onChange={(e) => setSecondaryButtonUrl(e.target.value)}
                  placeholder="/programs"
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


// -----------------------------------------------------------------------------
// CertificateEditorFields.tsx
// -----------------------------------------------------------------------------

interface CertificateEditorFieldsProps {
  badge: string;
  setBadge: (val: string) => void;
  title: string;
  setTitle: (val: string) => void;
  summary: string;
  setSummary: (val: string) => void;
  certSearchLabel: string;
  setCertSearchLabel: (val: string) => void;
  certSearchPlaceholder: string;
  setCertSearchPlaceholder: (val: string) => void;
  certGuidanceNote: string;
  setCertGuidanceNote: (val: string) => void;
  certSearchButtonLabel: string;
  setCertSearchButtonLabel: (val: string) => void;
  certResetButtonLabel: string;
  setCertResetButtonLabel: (val: string) => void;
  // Khối 3: 3 Cột Quy Chuẩn Minh Bạch
  certFeature1Title: string;
  setCertFeature1Title: (val: string) => void;
  certFeature1Desc: string;
  setCertFeature1Desc: (val: string) => void;
  certFeature2Title: string;
  setCertFeature2Title: (val: string) => void;
  certFeature2Desc: string;
  setCertFeature2Desc: (val: string) => void;
  certFeature3Title: string;
  setCertFeature3Title: (val: string) => void;
  certFeature3Desc: string;
  setCertFeature3Desc: (val: string) => void;
  // Khối 4: Kêu Gọi Hành Động / CTA Banner
  certCtaTitle: string;
  setCertCtaTitle: (val: string) => void;
  certCtaDescription: string;
  setCertCtaDescription: (val: string) => void;
  certCtaButtonLabel: string;
  setCertCtaButtonLabel: (val: string) => void;
  certCtaButtonUrl: string;
  setCertCtaButtonUrl: (val: string) => void;
  certStatIssuedMode: 'auto'|'manual';
  setCertStatIssuedMode: (val: 'auto'|'manual') => void;
  certStatIssuedManual: string;
  setCertStatIssuedManual: (val: string) => void;
  certStatValidMode: 'auto'|'manual';
  setCertStatValidMode: (val: 'auto'|'manual') => void;
  certStatValidManual: string;
  setCertStatValidManual: (val: string) => void;
  certStatProgramsMode: 'auto'|'manual';
  setCertStatProgramsMode: (val: 'auto'|'manual') => void;
  certStatProgramsManual: string;
  setCertStatProgramsManual: (val: string) => void;
  certStatUpdatedMode: 'auto'|'manual';
  setCertStatUpdatedMode: (val: 'auto'|'manual') => void;
  certStatUpdatedManual: string;
  setCertStatUpdatedManual: (val: string) => void;
  // Khối 5: Soạn thảo nội dung quy chuẩn / hướng dẫn bổ sung
  contentFormatted: string;
  setContentFormatted: (val: string) => void;
}

export const CertificateEditorFields: React.FC<CertificateEditorFieldsProps> = ({
  badge,
  setBadge,
  title,
  setTitle,
  summary,
  setSummary,
  certSearchLabel,
  setCertSearchLabel,
  certSearchPlaceholder,
  setCertSearchPlaceholder,
  certGuidanceNote,
  setCertGuidanceNote,
  certSearchButtonLabel,
  setCertSearchButtonLabel,
  certResetButtonLabel,
  setCertResetButtonLabel,
  certFeature1Title,
  setCertFeature1Title,
  certFeature1Desc,
  setCertFeature1Desc,
  certFeature2Title,
  setCertFeature2Title,
  certFeature2Desc,
  setCertFeature2Desc,
  certFeature3Title,
  setCertFeature3Title,
  certFeature3Desc,
  setCertFeature3Desc,
  certCtaTitle,
  setCertCtaTitle,
  certCtaDescription,
  setCertCtaDescription,
  certCtaButtonLabel,
  setCertCtaButtonLabel,
  certCtaButtonUrl,
  setCertCtaButtonUrl,
  certStatIssuedMode,
  setCertStatIssuedMode,
  certStatIssuedManual,
  setCertStatIssuedManual,
  certStatValidMode,
  setCertStatValidMode,
  certStatValidManual,
  setCertStatValidManual,
  certStatProgramsMode,
  setCertStatProgramsMode,
  certStatProgramsManual,
  setCertStatProgramsManual,
  certStatUpdatedMode,
  setCertStatUpdatedMode,
  certStatUpdatedManual,
  setCertStatUpdatedManual,
  contentFormatted,
  setContentFormatted,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. KHỐI ĐẦU TRANG (HERO BANNER) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              1. Khối Đầu Trang (Hero Banner - /certificate)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Tiêu đề và giới thiệu đầu trang tra cứu
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Huy hiệu nổi bật (Badge)
          </label>
          <input
            type="text"
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            placeholder="XÁC THỰC GIẤY CHỨNG NHẬN"
            className="w-full text-xs font-bold text-[#0284C7] px-3 py-2 bg-sky-50/50 border border-sky-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Tiêu đề trang <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Xác thực GCN"
            className="w-full text-xl sm:text-2xl font-black text-slate-900 border border-slate-200 rounded-xl px-4 py-3 focus:border-[#0284C7] focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Đoạn văn mở đầu (Mô tả giới thiệu phụ)
          </label>
          <textarea
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Nhập mã định danh trên Giấy chứng nhận để xác thực tính toàn vẹn..."
            className="w-full text-xs sm:text-sm text-slate-700 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden leading-relaxed"
          />
        </div>
      </div>

      {/* 2. KHUNG TÌM KIẾM & TRA CỨU CHỨNG NHẬN hệ thống Giấy chứng nhận */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              2. Khung Tra Cứu Chứng Nhận Điện Tử hệ thống Giấy chứng nhận
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Hộp công cụ nhập mã & tìm kiếm chứng nhận trên website
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nhãn ô tìm kiếm (Label)
            </label>
            <input
              type="text"
              value={certSearchLabel}
              onChange={(e) => setCertSearchLabel(e.target.value)}
              placeholder="Mã Tra Cứu Chứng Nhận"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Gợi ý nhập trong ô (Placeholder)
            </label>
            <input
              type="text"
              value={certSearchPlaceholder}
              onChange={(e) => setCertSearchPlaceholder(e.target.value)}
              placeholder="Nhập mã Giấy chứng nhận"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
              <Search size={14} className="text-[#0284C7]" />
              Tên nút Tra Cứu
            </label>
            <input
              type="text"
              value={certSearchButtonLabel}
              onChange={(e) => setCertSearchButtonLabel(e.target.value)}
              placeholder="Tra Cứu"
              className="w-full text-xs px-3 py-2 bg-sky-50 border border-sky-200 text-[#0284C7] font-bold rounded-xl focus:outline-hidden"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
              <RotateCcw size={14} className="text-slate-500" />
              Tên nút Làm Mới
            </label>
            <input
              type="text"
              value={certResetButtonLabel}
              onChange={(e) => setCertResetButtonLabel(e.target.value)}
              placeholder="Làm mới"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl focus:outline-hidden"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
            <ShieldCheck size={14} className="text-emerald-600" />
            Đoạn ghi chú hướng dẫn & bảo đảm tính toàn vẹn
          </label>
          <textarea
            rows={2}
            value={certGuidanceNote}
            onChange={(e) => setCertGuidanceNote(e.target.value)}
            placeholder="Hệ thống tra cứu tự động đối chiếu mã số với cơ sở dữ liệu số hóa hệ thống Giấy chứng nhận theo thời gian thực."
            className="w-full text-xs text-slate-700 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden leading-relaxed"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div><h3 className="text-sm font-extrabold text-slate-900">3. Nguồn dữ liệu thống kê GCN</h3><p className="mt-1 text-[11px] text-slate-500">Mỗi chỉ số có thể dùng dữ liệu tự động từ aggregate cache hoặc nhập thủ công độc lập. Chọn Tự động để khôi phục dữ liệu hệ thống.</p></div>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ['GCN đã phát hành',certStatIssuedMode,setCertStatIssuedMode,certStatIssuedManual,setCertStatIssuedManual,'VD: 1250'],
            ['Đang hợp lệ',certStatValidMode,setCertStatValidMode,certStatValidManual,setCertStatValidManual,'VD: 1210'],
            ['Chương trình có GCN',certStatProgramsMode,setCertStatProgramsMode,certStatProgramsManual,setCertStatProgramsManual,'VD: 18'],
            ['Cập nhật gần nhất',certStatUpdatedMode,setCertStatUpdatedMode,certStatUpdatedManual,setCertStatUpdatedManual,'VD: 07/10/2026']
          ].map(([label,mode,setMode,manual,setManual,placeholder]:any)=><div key={label} className="rounded-xl border border-slate-200 p-4"><div className="text-xs font-black">{label}</div><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={()=>setMode('auto')} className={`rounded-lg border px-3 py-2 text-xs font-bold ${mode==='auto'?'border-sky-500 bg-sky-50 text-sky-700':'border-slate-200'}`}>Tự động</button><button type="button" onClick={()=>setMode('manual')} className={`rounded-lg border px-3 py-2 text-xs font-bold ${mode==='manual'?'border-sky-500 bg-sky-50 text-sky-700':'border-slate-200'}`}>Nhập thủ công</button></div>{mode==='manual'&&<><input value={manual} onChange={(e)=>setManual(e.target.value)} placeholder={placeholder} className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"/><button type="button" onClick={()=>{setMode('auto');setManual('')}} className="mt-2 text-[11px] font-black text-[#0B66C3] hover:underline">↺ Khôi phục dữ liệu tự động</button></>}{mode==='auto'&&<div className="mt-3 text-[11px] text-emerald-700">Đang dùng dữ liệu tự động từ aggregate cache.</div>}</div>)}
        </div>
      </div>

      {/* 4. KHỐI 3 CỘT QUY CHUẨN MINH BẠCH & TIÊU CHUẨN CHỨNG NHẬN */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-600" />
            <h3 className="text-sm font-extrabold text-slate-900">
              4. Khối 3 Cột Quy Chuẩn Minh Bạch (Tiêu Chuẩn hệ thống Giấy chứng nhận)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            3 tiêu chuẩn xác thực nằm ở phần dưới của trang tra cứu
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Cột 1 */}
          <div className="p-4 rounded-xl bg-sky-50/50 border border-sky-100 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0284C7]">
              <ShieldCheck size={15} />
              <span>Cột 1: Mã Định Danh Duy Nhất</span>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Tiêu đề</label>
              <input
                type="text"
                value={certFeature1Title}
                onChange={(e) => setCertFeature1Title(e.target.value)}
                placeholder="Mã Định Danh Duy Nhất"
                className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-lg focus:border-[#0284C7] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Nội dung mô tả</label>
              <textarea
                rows={3}
                value={certFeature1Desc}
                onChange={(e) => setCertFeature1Desc(e.target.value)}
                placeholder="Mỗi chứng nhận được cấp một mã số duy nhất theo định dạng mã Giấy chứng nhận..."
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:border-[#0284C7] focus:outline-hidden leading-relaxed"
              />
            </div>
          </div>

          {/* Cột 2 */}
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <CheckCircle2 size={15} />
              <span>Cột 2: Lưu Trữ Trong Hệ Thống</span>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Tiêu đề</label>
              <input
                type="text"
                value={certFeature2Title}
                onChange={(e) => setCertFeature2Title(e.target.value)}
                placeholder="Lưu Trữ Trong Hệ Thống"
                className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-lg focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Nội dung mô tả</label>
              <textarea
                rows={3}
                value={certFeature2Desc}
                onChange={(e) => setCertFeature2Desc(e.target.value)}
                placeholder="Hồ sơ được lưu trữ trên cơ sở dữ liệu số của Sky First Network phục vụ đối chiếu..."
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:border-emerald-600 focus:outline-hidden leading-relaxed"
              />
            </div>
          </div>

          {/* Cột 3 */}
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
              <Sparkles size={15} />
              <span>Cột 3: Hỗ Trợ Nhanh Chóng</span>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Tiêu đề</label>
              <input
                type="text"
                value={certFeature3Title}
                onChange={(e) => setCertFeature3Title(e.target.value)}
                placeholder="Hỗ Trợ Nhanh Chóng"
                className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-lg focus:border-amber-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Nội dung mô tả</label>
              <textarea
                rows={3}
                value={certFeature3Desc}
                onChange={(e) => setCertFeature3Desc(e.target.value)}
                placeholder="Cần xác minh bổ sung hoặc chỉnh sửa thông tin, vui lòng gửi yêu cầu..."
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:border-amber-600 focus:outline-hidden leading-relaxed"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. KHỐI KÊU GỌI HÀNH ĐỘNG / LIÊN HỆ HỖ TRỢ XÁC MINH (BOTTOM CTA) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              4. Khối Kêu Gọi Hành Động & Hỗ Trợ Xác Minh (Bottom Banner)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Banner nổi bật hỗ trợ giải đáp hoặc đối soát hồ sơ
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tiêu đề Banner Hỗ Trợ
            </label>
            <input
              type="text"
              value={certCtaTitle}
              onChange={(e) => setCertCtaTitle(e.target.value)}
              placeholder="Bạn cần hỗ trợ tra cứu hoặc cấp lại chứng nhận?"
              className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Đoạn mô tả phụ
            </label>
            <textarea
              rows={2}
              value={certCtaDescription}
              onChange={(e) => setCertCtaDescription(e.target.value)}
              placeholder="Đội ngũ điều phối và kỹ thuật viên hệ thống Giấy chứng nhận luôn sẵn sàng giải đáp và xử lý yêu cầu xác minh thông tin..."
              className="w-full text-xs text-slate-700 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <LinkIcon size={14} className="text-[#0284C7]" />
                Tên nút bấm hành động
              </label>
              <input
                type="text"
                value={certCtaButtonLabel}
                onChange={(e) => setCertCtaButtonLabel(e.target.value)}
                placeholder="Gửi Yêu Cầu Hỗ Trợ"
                className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <LinkIcon size={14} className="text-slate-500" />
                Đường dẫn liên kết trỏ đến (URL)
              </label>
              <input
                type="text"
                value={certCtaButtonUrl}
                onChange={(e) => setCertCtaButtonUrl(e.target.value)}
                placeholder="/contact"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. SOẠN THẢO NỘI DUNG QUY CHUẨN / HƯỚNG DẪN BỔ SUNG (RICH TEXT) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-slate-700" />
            <h3 className="text-sm font-extrabold text-slate-900">
              5. Nội Dung Quy Chuẩn / Hướng Dẫn Bổ Sung (Tùy chọn)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Soạn văn bản/quy chế xuất hiện thêm trên trang chứng nhận
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Bạn có thể nhập nội dung văn bản giới thiệu quy chế cấp chứng nhận, tiêu chuẩn đối chiếu hệ thống Giấy chứng nhận hoặc dán trực tiếp từ văn bản Word, Docs (tự động giữ nguyên định dạng in đậm, danh sách, bảng biểu).
        </p>

        <div>
          <RichTextEditor
            id="editor-cert-content"
            value={contentFormatted}
            onChange={setContentFormatted}
            placeholder="Nhập hoặc dán nội dung quy chuẩn chứng nhận hệ thống Giấy chứng nhận..."
            minHeight="220px"
          />
        </div>
      </div>
    </div>
  );
};


// -----------------------------------------------------------------------------
// ContactEditorFields.tsx
// -----------------------------------------------------------------------------

interface ContactEditorFieldsProps {
  badge: string;
  setBadge: (val: string) => void;
  title: string;
  setTitle: (val: string) => void;
  summary: string;
  setSummary: (val: string) => void;
  // 4 Key Contact Cards
  email: string;
  setEmail: (val: string) => void;
  secondaryEmail: string;
  setSecondaryEmail: (val: string) => void;
  hotline: string;
  setHotline: (val: string) => void;
  secondaryHotline: string;
  setSecondaryHotline: (val: string) => void;
  workHoursWeekdays: string;
  setWorkHoursWeekdays: (val: string) => void;
  workHoursSaturday: string;
  setWorkHoursSaturday: (val: string) => void;
  facebookUrl: string;
  setFacebookUrl: (val: string) => void;
  linkedinUrl: string;
  setLinkedinUrl: (val: string) => void;
  // Form details
  contactFormTitle: string;
  setContactFormTitle: (val: string) => void;
  contactFormDescription: string;
  setContactFormDescription: (val: string) => void;
  contactSubmitButtonLabel: string;
  setContactSubmitButtonLabel: (val: string) => void;
  // Units Directory (Right column top)
  contactUnitsTitle: string;
  setContactUnitsTitle: (val: string) => void;
  contactUnitsSubtitle: string;
  setContactUnitsSubtitle: (val: string) => void;
  // FAQs (Right column bottom)
  contactFaqTitle: string;
  setContactFaqTitle: (val: string) => void;
  contactFaq1Q: string;
  setContactFaq1Q: (val: string) => void;
  contactFaq1A: string;
  setContactFaq1A: (val: string) => void;
  contactFaq2Q: string;
  setContactFaq2Q: (val: string) => void;
  contactFaq2A: string;
  setContactFaq2A: (val: string) => void;
  contactFaq3Q: string;
  setContactFaq3Q: (val: string) => void;
  contactFaq3A: string;
  setContactFaq3A: (val: string) => void;
  contactFaq4Q: string;
  setContactFaq4Q: (val: string) => void;
  contactFaq4A: string;
  setContactFaq4A: (val: string) => void;
  // Bottom banner details
  contactCtaTitle: string;
  setContactCtaTitle: (val: string) => void;
  contactCtaDescription: string;
  setContactCtaDescription: (val: string) => void;
  buttonLabel: string;
  setButtonLabel: (val: string) => void;
  buttonUrl: string;
  setButtonUrl: (val: string) => void;
  secondaryButtonLabel: string;
  setSecondaryButtonLabel: (val: string) => void;
  secondaryButtonUrl: string;
  setSecondaryButtonUrl: (val: string) => void;
}

export const ContactEditorFields: React.FC<ContactEditorFieldsProps> = ({
  badge,
  setBadge,
  title,
  setTitle,
  summary,
  setSummary,
  email,
  setEmail,
  secondaryEmail,
  setSecondaryEmail,
  hotline,
  setHotline,
  secondaryHotline,
  setSecondaryHotline,
  workHoursWeekdays,
  setWorkHoursWeekdays,
  workHoursSaturday,
  setWorkHoursSaturday,
  facebookUrl,
  setFacebookUrl,
  linkedinUrl,
  setLinkedinUrl,
  contactFormTitle,
  setContactFormTitle,
  contactFormDescription,
  setContactFormDescription,
  contactSubmitButtonLabel,
  setContactSubmitButtonLabel,
  contactUnitsTitle,
  setContactUnitsTitle,
  contactUnitsSubtitle,
  setContactUnitsSubtitle,
  contactFaqTitle,
  setContactFaqTitle,
  contactFaq1Q,
  setContactFaq1Q,
  contactFaq1A,
  setContactFaq1A,
  contactFaq2Q,
  setContactFaq2Q,
  contactFaq2A,
  setContactFaq2A,
  contactFaq3Q,
  setContactFaq3Q,
  contactFaq3A,
  setContactFaq3A,
  contactFaq4Q,
  setContactFaq4Q,
  contactFaq4A,
  setContactFaq4A,
  contactCtaTitle,
  setContactCtaTitle,
  contactCtaDescription,
  setContactCtaDescription,
  buttonLabel,
  setButtonLabel,
  buttonUrl,
  setButtonUrl,
  secondaryButtonLabel,
  setSecondaryButtonLabel,
  secondaryButtonUrl,
  setSecondaryButtonUrl,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Khối Đầu Trang (Hero Banner) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              1. Khối Đầu Trang (Hero Banner - /contact)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Phần mở đầu trang Liên Hệ Với Chúng Tôi
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Huy hiệu nổi bật (Badge)
          </label>
          <input
            type="text"
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            placeholder="KẾT NỐI & HỢP TÁC CÙNG Sky First Network"
            className="w-full text-xs font-bold text-[#0284C7] px-3 py-2 bg-sky-50/50 border border-sky-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Tiêu đề trang <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Liên Hệ Với Chúng Tôi"
            className="w-full text-xl sm:text-2xl font-black text-slate-900 border border-slate-200 rounded-xl px-4 py-3 focus:border-[#0284C7] focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Đoạn văn mở đầu (Mô tả giới thiệu phụ)
          </label>
          <textarea
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Ban Chấp hành Sky First Network luôn sẵn sàng lắng nghe, tư vấn và đồng hành..."
            className="w-full text-xs sm:text-sm text-slate-700 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden leading-relaxed"
          />
        </div>
      </div>

      {/* 2. Khối Kênh Tiếp Nhận & Kết Nối Trực Tiếp (4 Thẻ Thông Tin) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              2. Kênh Tiếp Nhận & Kết Nối Trực Tiếp (4 Thẻ Thông Tin)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            4 Thẻ tiếp nhận: Email, Hotline, Giờ làm việc và Mạng xã hội
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Thẻ 1: Email */}
          <div className="p-4 rounded-xl bg-sky-50/40 border border-sky-100 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#0284C7]">
              <Mail size={14} />
              <span>Thẻ 1: Hòm thư điện tử (Email)</span>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Email chính thức
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="lienhe@skyfirst.io.vn"
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Email phụ / Tiếp nhận chung
              </label>
              <input
                type="text"
                value={secondaryEmail}
                onChange={(e) => setSecondaryEmail(e.target.value)}
                placeholder="lienhe@skyfirst.io.vn"
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono focus:outline-hidden"
              />
            </div>
          </div>

          {/* Thẻ 2: Hotline */}
          <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-100 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-700">
              <Phone size={14} />
              <span>Thẻ 2: Tổng đài tiếp nhận (Hotline)</span>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Hotline chính (Điều phối chung)
              </label>
              <input
                type="text"
                value={hotline}
                onChange={(e) => setHotline(e.target.value)}
                placeholder="0924 910 210"
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Hotline phụ / Ban Đối ngoại
              </label>
              <input
                type="text"
                value={secondaryHotline}
                onChange={(e) => setSecondaryHotline(e.target.value)}
                placeholder="0912 838 xxx (Đối ngoại)"
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono focus:outline-hidden"
              />
            </div>
          </div>

          {/* Thẻ 3: Thời Gian Làm Việc */}
          <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-100 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-700">
              <Clock size={14} />
              <span>Thẻ 3: Khung giờ làm việc</span>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Thứ 2 - Thứ 6
              </label>
              <input
                type="text"
                value={workHoursWeekdays}
                onChange={(e) => setWorkHoursWeekdays(e.target.value)}
                placeholder="08:30 - 18:00"
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Thứ 7
              </label>
              <input
                type="text"
                value={workHoursSaturday}
                onChange={(e) => setWorkHoursSaturday(e.target.value)}
                placeholder="08:30 - 12:00"
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>
          </div>

          {/* Thẻ 4: Mạng Xã Hội */}
          <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-100 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-700">
              <Globe size={14} />
              <span>Thẻ 4: Mạng xã hội Sky First Network</span>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Facebook Fanpage
              </label>
              <input
                type="text"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                placeholder="https://..."
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Instagram của Sky First Network
              </label>
              <input
                type="text"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/company/skyfirstnetwork"
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Khối Biểu Mẫu Gửi Tin Nhắn Trực Tuyến */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Send size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              3. Cấu Hình Biểu Mẫu Gửi Tin Nhắn Trực Tuyến
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Form tiếp nhận thư gửi trực tiếp đến ban điều hành (Cột trái)
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tiêu đề biểu mẫu
            </label>
            <input
              type="text"
              value={contactFormTitle}
              onChange={(e) => setContactFormTitle(e.target.value)}
              placeholder="Gửi Tin Nhắn Đến Ban Chấp hành"
              className="w-full text-sm font-black text-slate-900 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Đoạn mô tả hướng dẫn
            </label>
            <textarea
              rows={2}
              value={contactFormDescription}
              onChange={(e) => setContactFormDescription(e.target.value)}
              placeholder="Vui lòng điền đầy đủ các thông tin bên dưới. Hệ thống sẽ điều phối thư đến đúng phòng ban và đơn vị liên quan."
              className="w-full text-xs text-slate-700 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tên nút gửi tin nhắn
            </label>
            <input
              type="text"
              value={contactSubmitButtonLabel}
              onChange={(e) => setContactSubmitButtonLabel(e.target.value)}
              placeholder="Gửi tin nhắn"
              className="w-full text-xs px-3 py-2 bg-[#0284C7] text-white font-bold rounded-xl focus:outline-hidden"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Biểu mẫu gửi tin nhắn thực hiện gửi trực tiếp và hiển thị màn hình thông báo phản hồi tự động.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Khối Đầu mối đơn vị trực thuộc (Cột phải trên) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              4. Khối Đầu mối đơn vị trực thuộc (Cột Phải Trên)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Danh bạ chuyên biệt từng đơn vị Câu lạc bộ Tiếng Anh The Sky First hoặc Nhà Hán Ngữ
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tiêu đề khối đơn vị
            </label>
            <input
              type="text"
              value={contactUnitsTitle}
              onChange={(e) => setContactUnitsTitle(e.target.value)}
              placeholder="Đầu mối đơn vị trực thuộc"
              className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Dòng mô tả phụ
            </label>
            <input
              type="text"
              value={contactUnitsSubtitle}
              onChange={(e) => setContactUnitsSubtitle(e.target.value)}
              placeholder="Liên hệ chuyên biệt theo từng mảng chuyên môn của mạng lưới:"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
            />
          </div>
        </div>

        <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-100 text-xs text-slate-600 space-y-1">
          <div className="font-bold text-[#0284C7] flex items-center gap-1">
            <Building2 size={13} />
            <span>Tự động đồng bộ hóa cùng Hệ Sinh Thái Mạng Lưới:</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Danh sách các đơn vị trực thuộc (Câu lạc bộ Tiếng Anh The Sky First hoặc Nhà Hán Ngữ) cùng email và số điện thoại phụ trách được liên kết tự động từ mục Quản Lý Đơn Vị Mạng Lưới để người gửi có thể bấm chọn kết nối ngay lập tức.
          </p>
        </div>
      </div>

      {/* 5. Khối Câu Hỏi Thường Gặp Về Liên Hệ (Contact FAQs) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <HelpCircle size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              5. Khối Câu Hỏi Thường Gặp Về Liên Hệ (Contact FAQs - Cột Phải Dưới)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Hộp mở/đóng giải đáp thắc mắc liên hệ
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Tiêu đề khối FAQ
          </label>
          <input
            type="text"
            value={contactFaqTitle}
            onChange={(e) => setContactFaqTitle(e.target.value)}
            placeholder="Câu Hỏi Thường Gặp Về Liên Hệ"
            className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
          />
        </div>

        <div className="space-y-4 pt-2">
          {/* FAQ 1 */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-[#0284C7]">Câu hỏi 1:</span>
            <input
              type="text"
              value={contactFaq1Q}
              onChange={(e) => setContactFaq1Q(e.target.value)}
              placeholder="Thời gian Ban Chấp hành Sky First Network tiếp nhận và phản hồi email là bao lâu?"
              className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
            />
            <textarea
              rows={2}
              value={contactFaq1A}
              onChange={(e) => setContactFaq1A(e.target.value)}
              placeholder="Toàn bộ thư từ và yêu cầu kết nối..."
              className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden leading-relaxed"
            />
          </div>

          {/* FAQ 2 */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-[#0284C7]">Câu hỏi 2:</span>
            <input
              type="text"
              value={contactFaq2Q}
              onChange={(e) => setContactFaq2Q(e.target.value)}
              placeholder="Tôi muốn đặt lịch làm việc trực tiếp tại Sky First Network thì cần làm gì?"
              className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
            />
            <textarea
              rows={2}
              value={contactFaq2A}
              onChange={(e) => setContactFaq2A(e.target.value)}
              placeholder="Quý đối tác hoặc các bạn trẻ vui lòng gửi thông tin trước qua biểu mẫu..."
              className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden leading-relaxed"
            />
          </div>

          {/* FAQ 3 */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-[#0284C7]">Câu hỏi 3:</span>
            <input
              type="text"
              value={contactFaq3Q}
              onChange={(e) => setContactFaq3Q(e.target.value)}
              placeholder="Làm thế nào để liên hệ trực tiếp với người phụ trách từng đơn vị trực thuộc?"
              className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
            />
            <textarea
              rows={2}
              value={contactFaq3A}
              onChange={(e) => setContactFaq3A(e.target.value)}
              placeholder="Bạn có thể chọn trực tiếp đơn vị mong muốn (Câu lạc bộ Tiếng Anh The Sky First hoặc Nhà Hán Ngữ)..."
              className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden leading-relaxed"
            />
          </div>

          {/* FAQ 4 (Tùy chọn) */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-slate-500">Câu hỏi 4 (Tùy chọn thêm):</span>
            <input
              type="text"
              value={contactFaq4Q}
              onChange={(e) => setContactFaq4Q(e.target.value)}
              placeholder="Nhập câu hỏi thường gặp số 4 (nếu có)..."
              className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
            />
            <textarea
              rows={2}
              value={contactFaq4A}
              onChange={(e) => setContactFaq4A(e.target.value)}
              placeholder="Nhập câu trả lời giải đáp..."
              className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* 6. Khối Điều Hướng Chương Trình & Dự Án (Banner cuối trang) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Compass size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              6. Khối Điều Hướng Chương Trình & Dự Án (Banner Cuối Trang)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Banner chân trang điều hướng đến chương trình & tài trợ
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tiêu đề banner
            </label>
            <input
              type="text"
              value={contactCtaTitle}
              onChange={(e) => setContactCtaTitle(e.target.value)}
              placeholder="Bạn quan tâm đến các chương trình & dự án cụ thể?"
              className="w-full text-sm font-black text-slate-900 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Đoạn văn mô tả
            </label>
            <textarea
              rows={2}
              value={contactCtaDescription}
              onChange={(e) => setContactCtaDescription(e.target.value)}
              placeholder="Khám phá danh sách các chương trình và hoạt động đang được công bố đang mở đăng ký."
              className="w-full text-xs text-slate-700 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden leading-relaxed"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nút 1 */}
            <div className="p-3.5 rounded-xl bg-sky-50/50 border border-sky-100 space-y-2.5">
              <span className="text-xs font-extrabold text-[#0284C7] block">
                Nút hành động 1 (Xem Chương Trình)
              </span>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tên nút
                </label>
                <input
                  type="text"
                  value={buttonLabel}
                  onChange={(e) => setButtonLabel(e.target.value)}
                  placeholder="Xem Chương Trình"
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Liên kết trỏ đến
                </label>
                <input
                  type="text"
                  value={buttonUrl}
                  onChange={(e) => setButtonUrl(e.target.value)}
                  placeholder="/programs"
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>

            {/* Nút 2 */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <span className="text-xs font-extrabold text-slate-700 block">
                Nút hành động 2 (Trang Tài Trợ)
              </span>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tên nút
                </label>
                <input
                  type="text"
                  value={secondaryButtonLabel}
                  onChange={(e) => setSecondaryButtonLabel(e.target.value)}
                  placeholder="Trang Tài Trợ"
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Liên kết trỏ đến
                </label>
                <input
                  type="text"
                  value={secondaryButtonUrl}
                  onChange={(e) => setSecondaryButtonUrl(e.target.value)}
                  placeholder="/sponsor"
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


// -----------------------------------------------------------------------------
// JoinEditorFields.tsx
// -----------------------------------------------------------------------------

interface JoinEditorFieldsProps {
  badge: string;
  setBadge: (val: string) => void;
  title: string;
  setTitle: (val: string) => void;
  summary: string;
  setSummary: (val: string) => void;
  // Roles section header
  joinRolesHeading: string;
  setJoinRolesHeading: (val: string) => void;
  joinRolesSubtitle: string;
  setJoinRolesSubtitle: (val: string) => void;
  // Role 1: hoạt động tình nguyện
  joinRole1Title: string;
  setJoinRole1Title: (val: string) => void;
  joinRole1Tag: string;
  setJoinRole1Tag: (val: string) => void;
  joinRole1Description: string;
  setJoinRole1Description: (val: string) => void;
  joinRole1Period: string;
  setJoinRole1Period: (val: string) => void;
  joinRole1ButtonLabel: string;
  setJoinRole1ButtonLabel: (val: string) => void;
  joinRole1ButtonUrl: string;
  setJoinRole1ButtonUrl: (val: string) => void;
  joinRole1Highlight1: string;
  setJoinRole1Highlight1: (val: string) => void;
  joinRole1Highlight2: string;
  setJoinRole1Highlight2: (val: string) => void;
  joinRole1Highlight3: string;
  setJoinRole1Highlight3: (val: string) => void;
  joinRole1Highlight4: string;
  setJoinRole1Highlight4: (val: string) => void;
  // Role 2: Core Team
  joinRole2Title: string;
  setJoinRole2Title: (val: string) => void;
  joinRole2Tag: string;
  setJoinRole2Tag: (val: string) => void;
  joinRole2Description: string;
  setJoinRole2Description: (val: string) => void;
  joinRole2Period: string;
  setJoinRole2Period: (val: string) => void;
  joinRole2ButtonLabel: string;
  setJoinRole2ButtonLabel: (val: string) => void;
  joinRole2ButtonUrl: string;
  setJoinRole2ButtonUrl: (val: string) => void;
  joinRole2Highlight1: string;
  setJoinRole2Highlight1: (val: string) => void;
  joinRole2Highlight2: string;
  setJoinRole2Highlight2: (val: string) => void;
  joinRole2Highlight3: string;
  setJoinRole2Highlight3: (val: string) => void;
  joinRole2Highlight4: string;
  setJoinRole2Highlight4: (val: string) => void;
  // Role 3: Partner
  joinRole3Title: string;
  setJoinRole3Title: (val: string) => void;
  joinRole3Tag: string;
  setJoinRole3Tag: (val: string) => void;
  joinRole3Description: string;
  setJoinRole3Description: (val: string) => void;
  joinRole3Period: string;
  setJoinRole3Period: (val: string) => void;
  joinRole3ButtonLabel: string;
  setJoinRole3ButtonLabel: (val: string) => void;
  joinRole3ButtonUrl: string;
  setJoinRole3ButtonUrl: (val: string) => void;
  joinRole3Highlight1: string;
  setJoinRole3Highlight1: (val: string) => void;
  joinRole3Highlight2: string;
  setJoinRole3Highlight2: (val: string) => void;
  joinRole3Highlight3: string;
  setJoinRole3Highlight3: (val: string) => void;
  joinRole3Highlight4: string;
  setJoinRole3Highlight4: (val: string) => void;
  // CTA Banner
  joinCtaHeading: string;
  setJoinCtaHeading: (val: string) => void;
  joinCtaDescription: string;
  setJoinCtaDescription: (val: string) => void;
  joinCtaButtonLabel: string;
  setJoinCtaButtonLabel: (val: string) => void;
  joinCtaButtonUrl: string;
  setJoinCtaButtonUrl: (val: string) => void;
  // Contact info (3 cards)
  joinEmail: string;
  setJoinEmail: (val: string) => void;
  joinEmailTitle: string;
  setJoinEmailTitle: (val: string) => void;
  joinHotline: string;
  setJoinHotline: (val: string) => void;
  joinHotlineTitle: string;
  setJoinHotlineTitle: (val: string) => void;
  joinAddress: string;
  setJoinAddress: (val: string) => void;
  joinAddressTitle: string;
  setJoinAddressTitle: (val: string) => void;
  // Quy chế / Hướng dẫn ứng tuyển chi tiết
  contentFormatted: string;
  setContentFormatted: (val: string) => void;
}

export const JoinEditorFields: React.FC<JoinEditorFieldsProps> = ({
  badge,
  setBadge,
  title,
  setTitle,
  summary,
  setSummary,
  joinRolesHeading,
  setJoinRolesHeading,
  joinRolesSubtitle,
  setJoinRolesSubtitle,
  joinRole1Title,
  setJoinRole1Title,
  joinRole1Tag,
  setJoinRole1Tag,
  joinRole1Description,
  setJoinRole1Description,
  joinRole1Period,
  setJoinRole1Period,
  joinRole1ButtonLabel,
  setJoinRole1ButtonLabel,
  joinRole1ButtonUrl,
  setJoinRole1ButtonUrl,
  joinRole1Highlight1,
  setJoinRole1Highlight1,
  joinRole1Highlight2,
  setJoinRole1Highlight2,
  joinRole1Highlight3,
  setJoinRole1Highlight3,
  joinRole1Highlight4,
  setJoinRole1Highlight4,
  joinRole2Title,
  setJoinRole2Title,
  joinRole2Tag,
  setJoinRole2Tag,
  joinRole2Description,
  setJoinRole2Description,
  joinRole2Period,
  setJoinRole2Period,
  joinRole2ButtonLabel,
  setJoinRole2ButtonLabel,
  joinRole2ButtonUrl,
  setJoinRole2ButtonUrl,
  joinRole2Highlight1,
  setJoinRole2Highlight1,
  joinRole2Highlight2,
  setJoinRole2Highlight2,
  joinRole2Highlight3,
  setJoinRole2Highlight3,
  joinRole2Highlight4,
  setJoinRole2Highlight4,
  joinRole3Title,
  setJoinRole3Title,
  joinRole3Tag,
  setJoinRole3Tag,
  joinRole3Description,
  setJoinRole3Description,
  joinRole3Period,
  setJoinRole3Period,
  joinRole3ButtonLabel,
  setJoinRole3ButtonLabel,
  joinRole3ButtonUrl,
  setJoinRole3ButtonUrl,
  joinRole3Highlight1,
  setJoinRole3Highlight1,
  joinRole3Highlight2,
  setJoinRole3Highlight2,
  joinRole3Highlight3,
  setJoinRole3Highlight3,
  joinRole3Highlight4,
  setJoinRole3Highlight4,
  joinCtaHeading,
  setJoinCtaHeading,
  joinCtaDescription,
  setJoinCtaDescription,
  joinCtaButtonLabel,
  setJoinCtaButtonLabel,
  joinCtaButtonUrl,
  setJoinCtaButtonUrl,
  joinEmail,
  setJoinEmail,
  joinEmailTitle,
  setJoinEmailTitle,
  joinHotline,
  setJoinHotline,
  joinHotlineTitle,
  setJoinHotlineTitle,
  joinAddress,
  setJoinAddress,
  joinAddressTitle,
  setJoinAddressTitle,
  contentFormatted,
  setContentFormatted,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Khối Đầu Trang (Hero Banner - /join) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              1. Khối Đầu Trang (Hero Banner - /join)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Phần mở đầu trang Tham Gia Sky First Network
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Huy hiệu nổi bật (Badge)
          </label>
          <input
            type="text"
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            placeholder="THAM GIA & HỢP TÁC"
            className="w-full text-xs font-bold text-[#0284C7] px-3 py-2 bg-sky-50/50 border border-sky-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Tiêu đề trang <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Gia Nhập Mạng Lưới Sky First"
            className="w-full text-xl sm:text-2xl font-black text-slate-900 border border-slate-200 rounded-xl px-4 py-3 focus:border-[#0284C7] focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Đoạn văn mở đầu (Mô tả giới thiệu phụ)
          </label>
          <textarea
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Dù bạn muốn cống hiến với vai trò Tình nguyện viên..."
            className="w-full text-xs sm:text-sm text-slate-700 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden leading-relaxed"
          />
        </div>
      </div>

      {/* 2. Cấu Hình 3 Nhóm Đối Tượng Gia Nhập */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <UserPlus size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              2. Cấu Hình 3 Nhóm Đối Tượng Gia Nhập (/join)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Tiêu đề khối & chi tiết 3 thẻ vai trò
          </span>
        </div>

        {/* Section Heading & Subtitle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Tiêu đề khối 3 nhóm đối tượng
            </label>
            <input
              type="text"
              value={joinRolesHeading}
              onChange={(e) => setJoinRolesHeading(e.target.value)}
              placeholder="Các Nhóm Đối Tượng Tham Gia Sky First Network"
              className="w-full text-xs font-black text-slate-900 px-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Dòng mô tả phụ đề
            </label>
            <input
              type="text"
              value={joinRolesSubtitle}
              onChange={(e) => setJoinRolesSubtitle(e.target.value)}
              placeholder="Lựa chọn hình thức đóng góp và đồng hành phù hợp..."
              className="w-full text-xs text-slate-700 px-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Nhóm 1: Tình nguyện viên */}
        <div className="p-5 rounded-2xl bg-emerald-50/40 border border-emerald-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs">
              <HeartHandshake size={18} className="text-emerald-600" />
              <span>NHÓM 1: TÌNH NGUYỆN VIÊN CHIẾN DỊCH (hoạt động tình nguyện)</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
              {joinRole1Tag || 'TÌNH NGUYỆN VIÊN'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Tiêu đề vai trò
              </label>
              <input
                type="text"
                value={joinRole1Title}
                onChange={(e) => setJoinRole1Title(e.target.value)}
                placeholder="Tình Nguyện Viên Chiến Dịch (hoạt động tình nguyện)"
                className="w-full text-xs font-black text-slate-900 px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Nhãn phân loại (Tag)
              </label>
              <input
                type="text"
                value={joinRole1Tag}
                onChange={(e) => setJoinRole1Tag(e.target.value)}
                placeholder="TÌNH NGUYỆN VIÊN"
                className="w-full text-xs font-bold text-emerald-700 px-3 py-2 bg-white border border-emerald-200 rounded-xl focus:outline-hidden uppercase"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Đoạn văn mô tả vai trò
              </label>
              <textarea
                rows={2}
                value={joinRole1Description}
                onChange={(e) => setJoinRole1Description(e.target.value)}
                placeholder="Tham gia trực tiếp các chiến dịch xã hội..."
                className="w-full text-xs text-slate-700 px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Thời gian / Nhiệm kỳ
              </label>
              <input
                type="text"
                value={joinRole1Period}
                onChange={(e) => setJoinRole1Period(e.target.value)}
                placeholder="Linh hoạt theo từng chiến dịch"
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Tên nút bấm
              </label>
              <input
                type="text"
                value={joinRole1ButtonLabel}
                onChange={(e) => setJoinRole1ButtonLabel(e.target.value)}
                placeholder="Đăng Ký Tình Nguyện Viên"
                className="w-full text-xs px-3 py-2 bg-emerald-600 text-white font-bold rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 mb-1">
                <LinkIcon size={13} className="text-emerald-600" />
                Liên kết trỏ đến
              </label>
              <input
                type="text"
                value={joinRole1ButtonUrl}
                onChange={(e) => setJoinRole1ButtonUrl(e.target.value)}
                placeholder="/contact"
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden font-mono"
              />
            </div>
          </div>

          {/* 4 Highlights of Role 1 */}
          <div className="pt-3 border-t border-emerald-200/60 space-y-2">
            <label className="block text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
              4 Quyền Lợi & Điểm Nổi Bật (Highlights):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-black text-emerald-600 w-4">1.</span>
                <input
                  type="text"
                  value={joinRole1Highlight1}
                  onChange={(e) => setJoinRole1Highlight1(e.target.value)}
                  placeholder="Điểm nổi bật 1..."
                  className="w-full text-xs text-slate-800 bg-transparent focus:outline-hidden"
                />
              </div>
              <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-black text-emerald-600 w-4">2.</span>
                <input
                  type="text"
                  value={joinRole1Highlight2}
                  onChange={(e) => setJoinRole1Highlight2(e.target.value)}
                  placeholder="Điểm nổi bật 2..."
                  className="w-full text-xs text-slate-800 bg-transparent focus:outline-hidden"
                />
              </div>
              <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-black text-emerald-600 w-4">3.</span>
                <input
                  type="text"
                  value={joinRole1Highlight3}
                  onChange={(e) => setJoinRole1Highlight3(e.target.value)}
                  placeholder="Điểm nổi bật 3..."
                  className="w-full text-xs text-slate-800 bg-transparent focus:outline-hidden"
                />
              </div>
              <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-black text-emerald-600 w-4">4.</span>
                <input
                  type="text"
                  value={joinRole1Highlight4}
                  onChange={(e) => setJoinRole1Highlight4(e.target.value)}
                  placeholder="Điểm nổi bật 4..."
                  className="w-full text-xs text-slate-800 bg-transparent focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Nhóm 2: Core Team */}
        <div className="p-5 rounded-2xl bg-sky-50/40 border border-sky-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sky-800 font-extrabold text-xs">
              <UserPlus size={18} className="text-[#0284C7]" />
              <span>NHÓM 2: THÀNH VIÊN BAN ĐIỀU HÀNH & CORE TEAM</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-[#0284C7] border border-sky-200 uppercase">
              {joinRole2Tag || 'Core Team Sky First Network'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Tiêu đề vai trò
              </label>
              <input
                type="text"
                value={joinRole2Title}
                onChange={(e) => setJoinRole2Title(e.target.value)}
                placeholder="Thành Viên Ban Chấp hành & Core Team"
                className="w-full text-xs font-black text-slate-900 px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Nhãn phân loại (Tag)
              </label>
              <input
                type="text"
                value={joinRole2Tag}
                onChange={(e) => setJoinRole2Tag(e.target.value)}
                placeholder="Core Team Sky First Network"
                className="w-full text-xs font-bold text-sky-700 px-3 py-2 bg-white border border-sky-200 rounded-xl focus:outline-hidden uppercase"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Đoạn văn mô tả vai trò
              </label>
              <textarea
                rows={2}
                value={joinRole2Description}
                onChange={(e) => setJoinRole2Description(e.target.value)}
                placeholder="Trực tiếp tham gia quản trị, xây dựng nội dung..."
                className="w-full text-xs text-slate-700 px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Thời gian / Nhiệm kỳ
              </label>
              <input
                type="text"
                value={joinRole2Period}
                onChange={(e) => setJoinRole2Period(e.target.value)}
                placeholder="Nhiệm kỳ cam kết 06 - 12 tháng"
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Tên nút bấm
              </label>
              <input
                type="text"
                value={joinRole2ButtonLabel}
                onChange={(e) => setJoinRole2ButtonLabel(e.target.value)}
                placeholder="Ứng Tuyển Ban Chấp hành"
                className="w-full text-xs px-3 py-2 bg-[#0284C7] text-white font-bold rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 mb-1">
                <LinkIcon size={13} className="text-[#0284C7]" />
                Liên kết trỏ đến
              </label>
              <input
                type="text"
                value={joinRole2ButtonUrl}
                onChange={(e) => setJoinRole2ButtonUrl(e.target.value)}
                placeholder="/contact"
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden font-mono"
              />
            </div>
          </div>

          {/* 4 Highlights of Role 2 */}
          <div className="pt-3 border-t border-sky-200/60 space-y-2">
            <label className="block text-[11px] font-bold text-sky-900 uppercase tracking-wider">
              4 Quyền Lợi & Điểm Nổi Bật (Highlights):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-sky-200">
                <span className="text-[10px] font-black text-[#0284C7] w-4">1.</span>
                <input
                  type="text"
                  value={joinRole2Highlight1}
                  onChange={(e) => setJoinRole2Highlight1(e.target.value)}
                  placeholder="Điểm nổi bật 1..."
                  className="w-full text-xs text-slate-800 bg-transparent focus:outline-hidden"
                />
              </div>
              <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-sky-200">
                <span className="text-[10px] font-black text-[#0284C7] w-4">2.</span>
                <input
                  type="text"
                  value={joinRole2Highlight2}
                  onChange={(e) => setJoinRole2Highlight2(e.target.value)}
                  placeholder="Điểm nổi bật 2..."
                  className="w-full text-xs text-slate-800 bg-transparent focus:outline-hidden"
                />
              </div>
              <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-sky-200">
                <span className="text-[10px] font-black text-[#0284C7] w-4">3.</span>
                <input
                  type="text"
                  value={joinRole2Highlight3}
                  onChange={(e) => setJoinRole2Highlight3(e.target.value)}
                  placeholder="Điểm nổi bật 3..."
                  className="w-full text-xs text-slate-800 bg-transparent focus:outline-hidden"
                />
              </div>
              <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-sky-200">
                <span className="text-[10px] font-black text-[#0284C7] w-4">4.</span>
                <input
                  type="text"
                  value={joinRole2Highlight4}
                  onChange={(e) => setJoinRole2Highlight4(e.target.value)}
                  placeholder="Điểm nổi bật 4..."
                  className="w-full text-xs text-slate-800 bg-transparent focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Nhóm 3: Đối Tác */}
        <div className="p-5 rounded-2xl bg-amber-50/40 border border-amber-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs">
              <Building2 size={18} className="text-amber-600" />
              <span>NHÓM 3: TỔ CHỨC ĐỐI TÁC & BẢO TRỢ ĐỒNG HÀNH</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 uppercase">
              {joinRole3Tag || 'ĐỐI TÁC CHIẾN LƯỢC'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Tiêu đề vai trò
              </label>
              <input
                type="text"
                value={joinRole3Title}
                onChange={(e) => setJoinRole3Title(e.target.value)}
                placeholder="Tổ Chức Đối Tác & Bảo Trợ Đồng Hành"
                className="w-full text-xs font-black text-slate-900 px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Nhãn phân loại (Tag)
              </label>
              <input
                type="text"
                value={joinRole3Tag}
                onChange={(e) => setJoinRole3Tag(e.target.value)}
                placeholder="ĐỐI TÁC CHIẾN LƯỢC"
                className="w-full text-xs font-bold text-amber-700 px-3 py-2 bg-white border border-amber-200 rounded-xl focus:outline-hidden uppercase"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Đoạn văn mô tả vai trò
              </label>
              <textarea
                rows={2}
                value={joinRole3Description}
                onChange={(e) => setJoinRole3Description(e.target.value)}
                placeholder="Dành cho CLB/Đội/Nhóm, Đoàn Thanh niên..."
                className="w-full text-xs text-slate-700 px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Thời gian / Nhiệm kỳ
              </label>
              <input
                type="text"
                value={joinRole3Period}
                onChange={(e) => setJoinRole3Period(e.target.value)}
                placeholder="Theo chương trình / thỏa thuận phù hợp"
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Tên nút bấm
              </label>
              <input
                type="text"
                value={joinRole3ButtonLabel}
                onChange={(e) => setJoinRole3ButtonLabel(e.target.value)}
                placeholder="Gửi Đề Xuất Hợp Tác"
                className="w-full text-xs px-3 py-2 bg-amber-600 text-white font-bold rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 mb-1">
                <LinkIcon size={13} className="text-amber-600" />
                Liên kết trỏ đến
              </label>
              <input
                type="text"
                value={joinRole3ButtonUrl}
                onChange={(e) => setJoinRole3ButtonUrl(e.target.value)}
                placeholder="/contact"
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden font-mono"
              />
            </div>
          </div>

          {/* 4 Highlights of Role 3 */}
          <div className="pt-3 border-t border-amber-200/60 space-y-2">
            <label className="block text-[11px] font-bold text-amber-900 uppercase tracking-wider">
              4 Quyền Lợi & Điểm Nổi Bật (Highlights):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-amber-200">
                <span className="text-[10px] font-black text-amber-600 w-4">1.</span>
                <input
                  type="text"
                  value={joinRole3Highlight1}
                  onChange={(e) => setJoinRole3Highlight1(e.target.value)}
                  placeholder="Điểm nổi bật 1..."
                  className="w-full text-xs text-slate-800 bg-transparent focus:outline-hidden"
                />
              </div>
              <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-amber-200">
                <span className="text-[10px] font-black text-amber-600 w-4">2.</span>
                <input
                  type="text"
                  value={joinRole3Highlight2}
                  onChange={(e) => setJoinRole3Highlight2(e.target.value)}
                  placeholder="Điểm nổi bật 2..."
                  className="w-full text-xs text-slate-800 bg-transparent focus:outline-hidden"
                />
              </div>
              <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-amber-200">
                <span className="text-[10px] font-black text-amber-600 w-4">3.</span>
                <input
                  type="text"
                  value={joinRole3Highlight3}
                  onChange={(e) => setJoinRole3Highlight3(e.target.value)}
                  placeholder="Điểm nổi bật 3..."
                  className="w-full text-xs text-slate-800 bg-transparent focus:outline-hidden"
                />
              </div>
              <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-amber-200">
                <span className="text-[10px] font-black text-amber-600 w-4">4.</span>
                <input
                  type="text"
                  value={joinRole3Highlight4}
                  onChange={(e) => setJoinRole3Highlight4(e.target.value)}
                  placeholder="Điểm nổi bật 4..."
                  className="w-full text-xs text-slate-800 bg-transparent focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Khối Trao Đổi Chi Tiết Về Cơ Hội Gia Nhập (CTA Banner) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              3. Khối Trao Đổi Chi Tiết Về Cơ Hội Gia Nhập (CTA Banner)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Banner nổi bật trên trang Gia Nhập
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tiêu đề khối
            </label>
            <input
              type="text"
              value={joinCtaHeading}
              onChange={(e) => setJoinCtaHeading(e.target.value)}
              placeholder="Bạn Cần Trao Đổi Chi Tiết Về Cơ Hội Gia Nhập Hoặc Đề Xuất Dự Án?"
              className="w-full text-sm font-black text-slate-900 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Đoạn văn mô tả
            </label>
            <textarea
              rows={2}
              value={joinCtaDescription}
              onChange={(e) => setJoinCtaDescription(e.target.value)}
              placeholder="Hệ thống tiếp nhận hồ sơ tập trung của Ban Nhân sự và Ban Đối ngoại & Sự kiện..."
              className="w-full text-xs text-slate-700 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tên nút bấm
              </label>
              <input
                type="text"
                value={joinCtaButtonLabel}
                onChange={(e) => setJoinCtaButtonLabel(e.target.value)}
                placeholder="Đến trang Liên hệ"
                className="w-full text-xs px-3 py-2 bg-[#0284C7] text-white font-bold rounded-xl focus:outline-hidden"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <LinkIcon size={14} className="text-[#0284C7]" />
                Liên kết trỏ đến
              </label>
              <input
                type="text"
                value={joinCtaButtonUrl}
                onChange={(e) => setJoinCtaButtonUrl(e.target.value)}
                placeholder="/contact"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Thông Tin Tiếp Nhận & Kết Nối (3 Thẻ Cuối Trang) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              4. Thông Tin Tiếp Nhận & Kết Nối (3 Hộp Cuối Trang)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            3 hộp thông tin liên hệ điều phối
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Email */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 mb-1">
                <Mail size={13} className="text-[#0284C7]" />
                Tiêu đề hộp 1
              </label>
              <input
                type="text"
                value={joinEmailTitle}
                onChange={(e) => setJoinEmailTitle(e.target.value)}
                placeholder="Email Tuyển Dụng & Nhân Sự"
                className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">
                Địa chỉ Email
              </label>
              <input
                type="text"
                value={joinEmail}
                onChange={(e) => setJoinEmail(e.target.value)}
                placeholder="nhansu@skyfirst.io.vn"
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
          </div>

          {/* Hotline */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 mb-1">
                <Phone size={13} className="text-emerald-600" />
                Tiêu đề hộp 2
              </label>
              <input
                type="text"
                value={joinHotlineTitle}
                onChange={(e) => setJoinHotlineTitle(e.target.value)}
                placeholder="Hotline Điều Phối"
                className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">
                Số điện thoại
              </label>
              <input
                type="text"
                value={joinHotline}
                onChange={(e) => setJoinHotline(e.target.value)}
                placeholder="0924 910 210"
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
          </div>

          {/* Address */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 mb-1">
                <MapPin size={13} className="text-rose-500" />
                Tiêu đề hộp 3
              </label>
              <input
                type="text"
                value={joinAddressTitle}
                onChange={(e) => setJoinAddressTitle(e.target.value)}
                placeholder="Văn Phòng Mạng Lưới"
                className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">
                Địa điểm
              </label>
              <input
                type="text"
                value={joinAddress}
                onChange={(e) => setJoinAddress(e.target.value)}
                placeholder=""
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. Hướng Dẫn & Quy Chế Ứng Tuyển Chi Tiết (Tùy chọn) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              Hướng Dẫn & Quy Chế Ứng Tuyển Chi Tiết (Tùy chọn)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Hiển thị khối văn bản hướng dẫn bổ sung trên trang /join
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Nội dung chi tiết (tự động giữ định dạng in đậm, in nghiêng, danh sách, bảng biểu khi dán từ Word, Docs)
          </label>
          <RichTextEditor
            id="editor-join-content"
            value={contentFormatted}
            onChange={setContentFormatted}
            placeholder="Nhập hoặc dán quy trình tuyển chọn 3 bước, tiêu chuẩn ứng viên hoặc quy chế hoạt động..."
            minHeight="220px"
          />
        </div>
      </div>
    </div>
  );
};


// -----------------------------------------------------------------------------
// SponsorEditorFields.tsx
// -----------------------------------------------------------------------------

interface SponsorEditorFieldsProps {
  // 1. Hero
  badge: string;
  setBadge: (val: string) => void;
  title: string;
  setTitle: (val: string) => void;
  summary: string;
  setSummary: (val: string) => void;
  sponsorHeroPrimaryButtonLabel: string;
  setSponsorHeroPrimaryButtonLabel: (val: string) => void;
  sponsorHeroPrimaryButtonUrl: string;
  setSponsorHeroPrimaryButtonUrl: (val: string) => void;
  sponsorHeroSecondaryButtonLabel: string;
  setSponsorHeroSecondaryButtonLabel: (val: string) => void;
  sponsorHeroSecondaryButtonUrl: string;
  setSponsorHeroSecondaryButtonUrl: (val: string) => void;

  // 2. Commitments
  sponsorCommitmentHeading: string;
  setSponsorCommitmentHeading: (val: string) => void;
  sponsorCommitmentSubtitle: string;
  setSponsorCommitmentSubtitle: (val: string) => void;
  sponsorCommit1Title: string;
  setSponsorCommit1Title: (val: string) => void;
  sponsorCommit1Desc: string;
  setSponsorCommit1Desc: (val: string) => void;
  sponsorCommit2Title: string;
  setSponsorCommit2Title: (val: string) => void;
  sponsorCommit2Desc: string;
  setSponsorCommit2Desc: (val: string) => void;
  sponsorCommit3Title: string;
  setSponsorCommit3Title: (val: string) => void;
  sponsorCommit3Desc: string;
  setSponsorCommit3Desc: (val: string) => void;
  sponsorCommit4Title: string;
  setSponsorCommit4Title: (val: string) => void;
  sponsorCommit4Desc: string;
  setSponsorCommit4Desc: (val: string) => void;

  // 3. Packages
  sponsorPackagesHeading: string;
  setSponsorPackagesHeading: (val: string) => void;
  sponsorPackagesSubtitle: string;
  setSponsorPackagesSubtitle: (val: string) => void;
  sponsorPkg1Title: string;
  setSponsorPkg1Title: (val: string) => void;
  sponsorPkg1Badge: string;
  setSponsorPkg1Badge: (val: string) => void;
  sponsorPkg1Unit: string;
  setSponsorPkg1Unit: (val: string) => void;
  sponsorPkg1Desc: string;
  setSponsorPkg1Desc: (val: string) => void;
  sponsorPkg1Impact: string;
  setSponsorPkg1Impact: (val: string) => void;

  sponsorPkg2Title: string;
  setSponsorPkg2Title: (val: string) => void;
  sponsorPkg2Badge: string;
  setSponsorPkg2Badge: (val: string) => void;
  sponsorPkg2Unit: string;
  setSponsorPkg2Unit: (val: string) => void;
  sponsorPkg2Desc: string;
  setSponsorPkg2Desc: (val: string) => void;
  sponsorPkg2Impact: string;
  setSponsorPkg2Impact: (val: string) => void;

  sponsorPkg3Title: string;
  setSponsorPkg3Title: (val: string) => void;
  sponsorPkg3Badge: string;
  setSponsorPkg3Badge: (val: string) => void;
  sponsorPkg3Unit: string;
  setSponsorPkg3Unit: (val: string) => void;
  sponsorPkg3Desc: string;
  setSponsorPkg3Desc: (val: string) => void;
  sponsorPkg3Impact: string;
  setSponsorPkg3Impact: (val: string) => void;

  sponsorPkg4Title: string;
  setSponsorPkg4Title: (val: string) => void;
  sponsorPkg4Badge: string;
  setSponsorPkg4Badge: (val: string) => void;
  sponsorPkg4Unit: string;
  setSponsorPkg4Unit: (val: string) => void;
  sponsorPkg4Desc: string;
  setSponsorPkg4Desc: (val: string) => void;
  sponsorPkg4Impact: string;
  setSponsorPkg4Impact: (val: string) => void;

  // 4. Bank Account Details
  sponsorRecipientEntity: string;
  setSponsorRecipientEntity: (val: string) => void;
  sponsorGoalAmount: string;
  setSponsorGoalAmount: (val: string) => void;
  sponsorReceivedAmount: string;
  setSponsorReceivedAmount: (val: string) => void;
  sponsorPublicLedgerUrl: string;
  setSponsorPublicLedgerUrl: (val: string) => void;
  sponsorBankName: string;
  setSponsorBankName: (val: string) => void;
  sponsorBankId: string;
  setSponsorBankId: (val: string) => void;
  sponsorBankBranch: string;
  setSponsorBankBranch: (val: string) => void;
  sponsorBankAccount: string;
  setSponsorBankAccount: (val: string) => void;
  sponsorAccountHolder: string;
  setSponsorAccountHolder: (val: string) => void;
  sponsorTransferSyntax: string;
  setSponsorTransferSyntax: (val: string) => void;
  sponsorCopyButtonLabel: string;
  setSponsorCopyButtonLabel: (val: string) => void;
  sponsorHotline: string;
  setSponsorHotline: (val: string) => void;
  sponsorEmail: string;
  setSponsorEmail: (val: string) => void;
  sponsorContactLeadTitle: string;
  setSponsorContactLeadTitle: (val: string) => void;

  // QR Code Chuyển Khoản Tiếp Nhận Tài Trợ
  sponsorQrCodeUrl: string;
  setSponsorQrCodeUrl: (val: string) => void;
  sponsorQrCodeTitle: string;
  setSponsorQrCodeTitle: (val: string) => void;
  sponsorQrCodeSubtitle: string;
  setSponsorQrCodeSubtitle: (val: string) => void;
  sponsorDonationNotice: string;
  setSponsorDonationNotice: (val: string) => void;
  sponsorSuggestedAmounts: string;
  setSponsorSuggestedAmounts: (val: string) => void;

  // 5. Section 5: Đồng Hành & Hợp Tác
  sponsorContactHeading: string;
  setSponsorContactHeading: (val: string) => void;
  sponsorContactDescription: string;
  setSponsorContactDescription: (val: string) => void;
  sponsorContactButtonLabel: string;
  setSponsorContactButtonLabel: (val: string) => void;
  sponsorContactButtonUrl: string;
  setSponsorContactButtonUrl: (val: string) => void;
  sponsorUnitsButtonLabel: string;
  setSponsorUnitsButtonLabel: (val: string) => void;
  sponsorUnitsButtonUrl: string;
  setSponsorUnitsButtonUrl: (val: string) => void;
  sponsorContactHotline: string;
  setSponsorContactHotline: (val: string) => void;
  sponsorContactEmail: string;
  setSponsorContactEmail: (val: string) => void;

  // 6. Section 6: FAQs
  sponsorFaqHeading: string;
  setSponsorFaqHeading: (val: string) => void;
  sponsorFaqSubtitle: string;
  setSponsorFaqSubtitle: (val: string) => void;
  sponsorFaq1Q: string;
  setSponsorFaq1Q: (val: string) => void;
  sponsorFaq1A: string;
  setSponsorFaq1A: (val: string) => void;
  sponsorFaq2Q: string;
  setSponsorFaq2Q: (val: string) => void;
  sponsorFaq2A: string;
  setSponsorFaq2A: (val: string) => void;
  sponsorFaq3Q: string;
  setSponsorFaq3Q: (val: string) => void;
  sponsorFaq3A: string;
  setSponsorFaq3A: (val: string) => void;
  sponsorFaq4Q: string;
  setSponsorFaq4Q: (val: string) => void;
  sponsorFaq4A: string;
  setSponsorFaq4A: (val: string) => void;

  // 7. Section 7: Quick CTA
  sponsorCtaTitle: string;
  setSponsorCtaTitle: (val: string) => void;
  sponsorCtaDescription: string;
  setSponsorCtaDescription: (val: string) => void;
  buttonLabel: string;
  setButtonLabel: (val: string) => void;
  buttonUrl: string;
  setButtonUrl: (val: string) => void;
  secondaryButtonLabel: string;
  setSecondaryButtonLabel: (val: string) => void;
  secondaryButtonUrl: string;
  setSecondaryButtonUrl: (val: string) => void;

  // 8. Rich text content
  contentFormatted: string;
  setContentFormatted: (val: string) => void;
}

export const SponsorEditorFields: React.FC<SponsorEditorFieldsProps> = ({
  badge,
  setBadge,
  title,
  setTitle,
  summary,
  setSummary,
  sponsorHeroPrimaryButtonLabel,
  setSponsorHeroPrimaryButtonLabel,
  sponsorHeroPrimaryButtonUrl,
  setSponsorHeroPrimaryButtonUrl,
  sponsorHeroSecondaryButtonLabel,
  setSponsorHeroSecondaryButtonLabel,
  sponsorHeroSecondaryButtonUrl,
  setSponsorHeroSecondaryButtonUrl,
  // 2. Commitments
  sponsorCommitmentHeading,
  setSponsorCommitmentHeading,
  sponsorCommitmentSubtitle,
  setSponsorCommitmentSubtitle,
  sponsorCommit1Title,
  setSponsorCommit1Title,
  sponsorCommit1Desc,
  setSponsorCommit1Desc,
  sponsorCommit2Title,
  setSponsorCommit2Title,
  sponsorCommit2Desc,
  setSponsorCommit2Desc,
  sponsorCommit3Title,
  setSponsorCommit3Title,
  sponsorCommit3Desc,
  setSponsorCommit3Desc,
  sponsorCommit4Title,
  setSponsorCommit4Title,
  sponsorCommit4Desc,
  setSponsorCommit4Desc,
  // 3. Packages
  sponsorPackagesHeading,
  setSponsorPackagesHeading,
  sponsorPackagesSubtitle,
  setSponsorPackagesSubtitle,
  sponsorPkg1Title,
  setSponsorPkg1Title,
  sponsorPkg1Badge,
  setSponsorPkg1Badge,
  sponsorPkg1Unit,
  setSponsorPkg1Unit,
  sponsorPkg1Desc,
  setSponsorPkg1Desc,
  sponsorPkg1Impact,
  setSponsorPkg1Impact,
  sponsorPkg2Title,
  setSponsorPkg2Title,
  sponsorPkg2Badge,
  setSponsorPkg2Badge,
  sponsorPkg2Unit,
  setSponsorPkg2Unit,
  sponsorPkg2Desc,
  setSponsorPkg2Desc,
  sponsorPkg2Impact,
  setSponsorPkg2Impact,
  sponsorPkg3Title,
  setSponsorPkg3Title,
  sponsorPkg3Badge,
  setSponsorPkg3Badge,
  sponsorPkg3Unit,
  setSponsorPkg3Unit,
  sponsorPkg3Desc,
  setSponsorPkg3Desc,
  sponsorPkg3Impact,
  setSponsorPkg3Impact,
  sponsorPkg4Title,
  setSponsorPkg4Title,
  sponsorPkg4Badge,
  setSponsorPkg4Badge,
  sponsorPkg4Unit,
  setSponsorPkg4Unit,
  sponsorPkg4Desc,
  setSponsorPkg4Desc,
  sponsorPkg4Impact,
  setSponsorPkg4Impact,
  // 4. Bank Details
  sponsorRecipientEntity,
  setSponsorRecipientEntity,
  sponsorGoalAmount,
  setSponsorGoalAmount,
  sponsorReceivedAmount,
  setSponsorReceivedAmount,
  sponsorPublicLedgerUrl,
  setSponsorPublicLedgerUrl,
  sponsorBankName,
  setSponsorBankName,
  sponsorBankId,
  setSponsorBankId,
  sponsorBankBranch,
  setSponsorBankBranch,
  sponsorBankAccount,
  setSponsorBankAccount,
  sponsorAccountHolder,
  setSponsorAccountHolder,
  sponsorTransferSyntax,
  setSponsorTransferSyntax,
  sponsorCopyButtonLabel,
  setSponsorCopyButtonLabel,
  sponsorHotline,
  setSponsorHotline,
  sponsorEmail,
  setSponsorEmail,
  sponsorContactLeadTitle,
  setSponsorContactLeadTitle,
  // QR Code
  sponsorQrCodeUrl,
  setSponsorQrCodeUrl,
  sponsorQrCodeTitle,
  setSponsorQrCodeTitle,
  sponsorQrCodeSubtitle,
  setSponsorQrCodeSubtitle,
  sponsorDonationNotice,
  setSponsorDonationNotice,
  sponsorSuggestedAmounts,
  setSponsorSuggestedAmounts,
  // 5. Contact Section
  sponsorContactHeading,
  setSponsorContactHeading,
  sponsorContactDescription,
  setSponsorContactDescription,
  sponsorContactButtonLabel,
  setSponsorContactButtonLabel,
  sponsorContactButtonUrl,
  setSponsorContactButtonUrl,
  sponsorUnitsButtonLabel,
  setSponsorUnitsButtonLabel,
  sponsorUnitsButtonUrl,
  setSponsorUnitsButtonUrl,
  sponsorContactHotline,
  setSponsorContactHotline,
  sponsorContactEmail,
  setSponsorContactEmail,
  // 6. FAQs
  sponsorFaqHeading,
  setSponsorFaqHeading,
  sponsorFaqSubtitle,
  setSponsorFaqSubtitle,
  sponsorFaq1Q,
  setSponsorFaq1Q,
  sponsorFaq1A,
  setSponsorFaq1A,
  sponsorFaq2Q,
  setSponsorFaq2Q,
  sponsorFaq2A,
  setSponsorFaq2A,
  sponsorFaq3Q,
  setSponsorFaq3Q,
  sponsorFaq3A,
  setSponsorFaq3A,
  sponsorFaq4Q,
  setSponsorFaq4Q,
  sponsorFaq4A,
  setSponsorFaq4A,
  // 7. Quick CTA
  sponsorCtaTitle,
  setSponsorCtaTitle,
  sponsorCtaDescription,
  setSponsorCtaDescription,
  buttonLabel,
  setButtonLabel,
  buttonUrl,
  setButtonUrl,
  secondaryButtonLabel,
  setSecondaryButtonLabel,
  secondaryButtonUrl,
  setSecondaryButtonUrl,
  // 8. Rich text content
  contentFormatted,
  setContentFormatted,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadQr=async(file:File)=>{try{const item=await uploadMedia(file,true);setSponsorQrCodeUrl(item.url);}catch(error){alert(error instanceof Error?error.message:'Không tải được ảnh QR.');}};
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {const file=e.target.files?.[0];if(file)void uploadQr(file);};

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {e.preventDefault();setIsDragging(false);const file=e.dataTransfer.files?.[0];if(file)void uploadQr(file);};

  const handleGenerateVietQR = () => {
    const bankId = sponsorBankId.trim();
    const account = sponsorBankAccount.replace(/[^0-9A-Za-z]/g, '');
    if (!bankId || !account) {
      alert('Vui lòng nhập Mã ngân hàng VietQR và số tài khoản trước khi tạo mã.');
      return;
    }
    const params = new URLSearchParams();
    if (sponsorAccountHolder.trim()) params.set('accountName', sponsorAccountHolder.trim());
    if (sponsorTransferSyntax.trim()) params.set('addInfo', sponsorTransferSyntax.trim().slice(0, 25));
    const generatedUrl = `https://img.vietqr.io/image/${encodeURIComponent(bankId)}-${encodeURIComponent(account)}-compact2.png?${params.toString()}`;
    setSponsorQrCodeUrl(generatedUrl);
  };

  return (
    <div className="space-y-6">
      {/* 1. KHỐI ĐẦU TRANG (HERO BANNER) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              1. Khối Đầu Trang (Hero Banner - /sponsor)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Phần mở đầu trang Tài Trợ & Đồng Hành Doanh Nghiệp
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Huy hiệu nổi bật (Badge)
          </label>
          <input
            type="text"
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            placeholder="TÀI TRỢ & ĐỒNG HÀNH DOANH NGHIỆP"
            className="w-full text-xs font-bold text-[#0284C7] px-3 py-2 bg-sky-50/50 border border-sky-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Tiêu đề trang <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Hợp tác & Đồng hành cùng Tên chủ tài khoản đã được xác nhận"
            className="w-full text-xl sm:text-2xl font-black text-slate-900 border border-slate-200 rounded-xl px-4 py-3 focus:border-[#0284C7] focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Đoạn văn mở đầu (Mô tả giới thiệu phụ)
          </label>
          <textarea
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Tên chủ tài khoản đã được xác nhận trân trọng mọi sự chung tay từ Quý Doanh nghiệp, Tổ chức và Nhà hảo tâm..."
            className="w-full text-xs sm:text-sm text-slate-700 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden leading-relaxed"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div className="p-3.5 bg-sky-50/40 rounded-xl border border-sky-100 space-y-2">
            <span className="text-xs font-bold text-[#0284C7] block">Nút hành động chính (Hero Button 1)</span>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Tên nút</label>
              <input
                type="text"
                value={sponsorHeroPrimaryButtonLabel}
                onChange={(e) => setSponsorHeroPrimaryButtonLabel(e.target.value)}
                placeholder="Đăng Ký Tài Trợ Ngay"
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Đường dẫn URL</label>
              <input
                type="text"
                value={sponsorHeroPrimaryButtonUrl}
                onChange={(e) => setSponsorHeroPrimaryButtonUrl(e.target.value)}
                placeholder="/contact"
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-slate-700 block">Nút hành động phụ (Hero Button 2)</span>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Tên nút</label>
              <input
                type="text"
                value={sponsorHeroSecondaryButtonLabel}
                onChange={(e) => setSponsorHeroSecondaryButtonLabel(e.target.value)}
                placeholder="Thông Tin Chuyển Khoản"
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Đường dẫn URL / Neo trang</label>
              <input
                type="text"
                value={sponsorHeroSecondaryButtonUrl}
                onChange={(e) => setSponsorHeroSecondaryButtonUrl(e.target.value)}
                placeholder="#thong-tin-chuyen-khoan"
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. KHỐI 4 CAM KẾT MINH BẠCH DÀNH CHO NHÀ TÀI TRỢ */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-600" />
            <h3 className="text-sm font-extrabold text-slate-900">
              2. 4 Cam Kết Minh Bạch Dành Cho Nhà Tài Trợ
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Các trụ cột bảo chứng uy tín và trách nhiệm xã hội
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tiêu đề khối cam kết
            </label>
            <input
              type="text"
              value={sponsorCommitmentHeading}
              onChange={(e) => setSponsorCommitmentHeading(e.target.value)}
              placeholder="4 Cam Kết Minh Bạch Dành Cho Nhà Tài Trợ"
              className="w-full text-sm font-black text-slate-900 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Đoạn văn mô tả khối cam kết
            </label>
            <input
              type="text"
              value={sponsorCommitmentSubtitle}
              onChange={(e) => setSponsorCommitmentSubtitle(e.target.value)}
              placeholder="Mọi nguồn lực quý báu được quý đối tác gửi gắm đều được quản lý với tiêu chuẩn trách nhiệm cao nhất."
              className="w-full text-xs text-slate-700 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          {/* Cam kết 1 */}
          <div className="p-4 rounded-xl border border-sky-100 bg-sky-50/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#0284C7]">
              <FileText size={15} />
              <span>Cam Kết 1 (Sao Kê)</span>
            </div>
            <input
              type="text"
              value={sponsorCommit1Title}
              onChange={(e) => setSponsorCommit1Title(e.target.value)}
              placeholder="Minh bạch theo thông tin được xác nhận"
              className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
            />
            <textarea
              rows={2}
              value={sponsorCommit1Desc}
              onChange={(e) => setSponsorCommit1Desc(e.target.value)}
              placeholder="Cập nhật thu - chi rõ ràng theo từng dự án cụ thể..."
              className="w-full text-xs text-slate-600 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
            />
          </div>

          {/* Cam kết 2 */}
          <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-700">
              <Award size={15} />
              <span>Cam Kết 2 (Chứng Nhận Số)</span>
            </div>
            <input
              type="text"
              value={sponsorCommit2Title}
              onChange={(e) => setSponsorCommit2Title(e.target.value)}
              placeholder="Giấy chứng nhận"
              className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
            />
            <textarea
              rows={2}
              value={sponsorCommit2Desc}
              onChange={(e) => setSponsorCommit2Desc(e.target.value)}
              placeholder="Cấp Giấy chứng nhận tri ân điện tử có mã định danh..."
              className="w-full text-xs text-slate-600 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
            />
          </div>

          {/* Cam kết 3 */}
          <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-extrabold text-amber-700">
              <TrendingUp size={15} />
              <span>Cam Kết 3 (Báo Cáo Tác Động)</span>
            </div>
            <input
              type="text"
              value={sponsorCommit3Title}
              onChange={(e) => setSponsorCommit3Title(e.target.value)}
              placeholder="Báo Cáo Tác Động Thực"
              className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
            />
            <textarea
              rows={2}
              value={sponsorCommit3Desc}
              onChange={(e) => setSponsorCommit3Desc(e.target.value)}
              placeholder="Gửi tận tay nhà tài trợ báo cáo hình ảnh, video..."
              className="w-full text-xs text-slate-600 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
            />
          </div>

          {/* Cam kết 4 */}
          <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-700">
              <Sparkles size={15} />
              <span>Cam Kết 4 (Lan Tỏa Truyền Thông)</span>
            </div>
            <input
              type="text"
              value={sponsorCommit4Title}
              onChange={(e) => setSponsorCommit4Title(e.target.value)}
              placeholder="Lan Tỏa Truyền Thông"
              className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
            />
            <textarea
              rows={2}
              value={sponsorCommit4Desc}
              onChange={(e) => setSponsorCommit4Desc(e.target.value)}
              placeholder="Đồng hành cùng Trung tâm Truyền thông hoạt động truyền thông..."
              className="w-full text-xs text-slate-600 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* 3. KHỐI CÁC GÓI & HÌNH THỨC ĐỒNG HÀNH (4 GÓI TÀI TRỢ) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <HeartHandshake size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              3. Các hình thức đồng hành cùng Tên chủ tài khoản đã được xác nhận
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            4 gói tài trợ tiêu chuẩn với quyền lợi và mục tiêu rõ ràng
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tiêu đề khối gói tài trợ
            </label>
            <input
              type="text"
              value={sponsorPackagesHeading}
              onChange={(e) => setSponsorPackagesHeading(e.target.value)}
              placeholder="Các hình thức đồng hành cùng Tên chủ tài khoản đã được xác nhận"
              className="w-full text-sm font-black text-slate-900 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Đoạn văn mô tả khối gói tài trợ
            </label>
            <input
              type="text"
              value={sponsorPackagesSubtitle}
              onChange={(e) => setSponsorPackagesSubtitle(e.target.value)}
              placeholder="Lựa chọn hình thức đóng góp phù hợp với định hướng phát triển..."
              className="w-full text-xs text-slate-700 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
            />
          </div>
        </div>

        <div className="space-y-4 pt-2 border-t border-slate-100">
          {/* Gói 1 */}
          <div className="p-4 rounded-2xl border border-sky-200 bg-sky-50/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black text-[#0284C7]">
                <GraduationCap size={16} />
                <span>Gói 1: Học Bổng Tri Thức & Kỹ Năng</span>
              </div>
              <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">Bảo trợ đào tạo</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tên gói</label>
                <input
                  type="text"
                  value={sponsorPkg1Title}
                  onChange={(e) => setSponsorPkg1Title(e.target.value)}
                  className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Huy hiệu</label>
                <input
                  type="text"
                  value={sponsorPkg1Badge}
                  onChange={(e) => setSponsorPkg1Badge(e.target.value)}
                  className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Đơn vị phụ trách</label>
                <input
                  type="text"
                  value={sponsorPkg1Unit}
                  onChange={(e) => setSponsorPkg1Unit(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Mô tả nội dung tài trợ</label>
                <textarea
                  rows={2}
                  value={sponsorPkg1Desc}
                  onChange={(e) => setSponsorPkg1Desc(e.target.value)}
                  className="w-full text-xs text-slate-700 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Hiệu quả cam kết</label>
                <textarea
                  rows={2}
                  value={sponsorPkg1Impact}
                  onChange={(e) => setSponsorPkg1Impact(e.target.value)}
                  className="w-full text-xs text-slate-700 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Gói 2 */}
          <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-800">
                <Users size={16} />
                <span>Gói 2: Chiến Dịch Phụng Sự Cộng Đồng</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Tác động xã hội</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tên gói</label>
                <input
                  type="text"
                  value={sponsorPkg2Title}
                  onChange={(e) => setSponsorPkg2Title(e.target.value)}
                  className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Huy hiệu</label>
                <input
                  type="text"
                  value={sponsorPkg2Badge}
                  onChange={(e) => setSponsorPkg2Badge(e.target.value)}
                  className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Đơn vị phụ trách</label>
                <input
                  type="text"
                  value={sponsorPkg2Unit}
                  onChange={(e) => setSponsorPkg2Unit(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Mô tả nội dung tài trợ</label>
                <textarea
                  rows={2}
                  value={sponsorPkg2Desc}
                  onChange={(e) => setSponsorPkg2Desc(e.target.value)}
                  className="w-full text-xs text-slate-700 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Hiệu quả cam kết</label>
                <textarea
                  rows={2}
                  value={sponsorPkg2Impact}
                  onChange={(e) => setSponsorPkg2Impact(e.target.value)}
                  className="w-full text-xs text-slate-700 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Gói 3 */}
          <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black text-amber-800">
                <Gift size={16} />
                <span>Gói 3: Tài Trợ Hiện Vật & Cơ Sở Hạ Tầng</span>
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Hỗ trợ thiết bị</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tên gói</label>
                <input
                  type="text"
                  value={sponsorPkg3Title}
                  onChange={(e) => setSponsorPkg3Title(e.target.value)}
                  className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Huy hiệu</label>
                <input
                  type="text"
                  value={sponsorPkg3Badge}
                  onChange={(e) => setSponsorPkg3Badge(e.target.value)}
                  className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Đơn vị phụ trách</label>
                <input
                  type="text"
                  value={sponsorPkg3Unit}
                  onChange={(e) => setSponsorPkg3Unit(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Mô tả nội dung tài trợ</label>
                <textarea
                  rows={2}
                  value={sponsorPkg3Desc}
                  onChange={(e) => setSponsorPkg3Desc(e.target.value)}
                  className="w-full text-xs text-slate-700 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Hiệu quả cam kết</label>
                <textarea
                  rows={2}
                  value={sponsorPkg3Impact}
                  onChange={(e) => setSponsorPkg3Impact(e.target.value)}
                  className="w-full text-xs text-slate-700 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Gói 4 */}
          <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black text-purple-800">
                <TrendingUp size={16} />
                <span>Gói 4: Hợp tác dài hạn</span>
              </div>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">Đồng hành toàn diện</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tên gói</label>
                <input
                  type="text"
                  value={sponsorPkg4Title}
                  onChange={(e) => setSponsorPkg4Title(e.target.value)}
                  className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Huy hiệu</label>
                <input
                  type="text"
                  value={sponsorPkg4Badge}
                  onChange={(e) => setSponsorPkg4Badge(e.target.value)}
                  className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Đơn vị phụ trách</label>
                <input
                  type="text"
                  value={sponsorPkg4Unit}
                  onChange={(e) => setSponsorPkg4Unit(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Mô tả nội dung tài trợ</label>
                <textarea
                  rows={2}
                  value={sponsorPkg4Desc}
                  onChange={(e) => setSponsorPkg4Desc(e.target.value)}
                  className="w-full text-xs text-slate-700 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Hiệu quả cam kết</label>
                <textarea
                  rows={2}
                  value={sponsorPkg4Impact}
                  onChange={(e) => setSponsorPkg4Impact(e.target.value)}
                  className="w-full text-xs text-slate-700 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. THÔNG TIN TÀI KHOẢN TIẾP NHẬN TÀI TRỢ */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              4. Thông Tin Tài Khoản Ngân Hàng Tiếp Nhận
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Thẻ tài khoản ngân hàng hiển thị trên website
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Chủ thể/đơn vị tiếp nhận nguồn lực</label>
            <input type="text" value={sponsorRecipientEntity} onChange={(e)=>setSponsorRecipientEntity(e.target.value)} placeholder="Bắt buộc ghi rõ chủ thể thực tế đứng tên tài khoản tiếp nhận" className="w-full text-xs px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl font-bold focus:outline-hidden" />
            <p className="mt-1 text-[10px] leading-4 text-slate-500">Thông tin này hiển thị cạnh QR để tránh hiểu nhầm đơn vị nào trực tiếp tiếp nhận tiền.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Mục tiêu chiến dịch (VNĐ)</label>
            <input inputMode="numeric" value={sponsorGoalAmount} onChange={(e)=>setSponsorGoalAmount(e.target.value.replace(/\D/g,''))} placeholder="100000000" className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:outline-hidden" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Đã ghi nhận/đối soát (VNĐ)</label>
            <input inputMode="numeric" value={sponsorReceivedAmount} onChange={(e)=>setSponsorReceivedAmount(e.target.value.replace(/\D/g,''))} placeholder="0" className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:outline-hidden" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Liên kết công khai/đối soát (nếu có)</label>
            <input type="url" value={sponsorPublicLedgerUrl} onChange={(e)=>setSponsorPublicLedgerUrl(e.target.value)} placeholder="https://..." className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Ngân hàng thụ hưởng
            </label>
            <input
              type="text"
              value={sponsorBankName}
              onChange={(e) => setSponsorBankName(e.target.value)}
              placeholder="Ngân hàng Quân Đội (MB Bank)"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Chi nhánh ngân hàng
            </label>
            <input
              type="text"
              value={sponsorBankBranch}
              onChange={(e) => setSponsorBankBranch(e.target.value)}
              placeholder="Chi nhánh TP. Hồ Chí Minh"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Số tài khoản tiếp nhận
            </label>
            <input
              type="text"
              value={sponsorBankAccount}
              onChange={(e) => setSponsorBankAccount(e.target.value)}
              placeholder="Chỉ nhập khi có thông tin tiếp nhận đã được xác nhận"
              className="w-full text-xs px-3 py-2 bg-sky-50 border border-sky-200 font-mono font-bold text-[#0284C7] rounded-xl focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Mã ngân hàng VietQR</label>
            <input type="text" value={sponsorBankId} onChange={(e)=>setSponsorBankId(e.target.value)} placeholder="Ví dụ: MB, VCB, BIDV..." className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 font-mono font-bold rounded-xl focus:outline-hidden" />
            <p className="text-[10px] text-slate-400 mt-1">Bắt buộc khi dùng chức năng tạo mã tự động. Không tự suy đoán ngân hàng từ tên để tránh tạo sai mã nhận tiền.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tên chủ tài khoản
            </label>
            <input
              type="text"
              value={sponsorAccountHolder}
              onChange={(e) => setSponsorAccountHolder(e.target.value)}
              placeholder="Tên chủ tài khoản đã được xác nhận"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 uppercase font-black text-slate-900 rounded-xl focus:outline-hidden"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Cú pháp chuyển khoản mẫu
            </label>
            <input
              type="text"
              value={sponsorTransferSyntax}
              onChange={(e) => setSponsorTransferSyntax(e.target.value)}
              placeholder="TAITRO [HọTên/TênDoanhNghiệp] [SốĐiệnThoại]"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 font-mono font-semibold rounded-xl focus:outline-hidden"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
              <Copy size={13} className="text-[#0284C7]" />
              Tên nút sao chép STK
            </label>
            <input
              type="text"
              value={sponsorCopyButtonLabel}
              onChange={(e) => setSponsorCopyButtonLabel(e.target.value)}
              placeholder="Sao chép số tài khoản"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 font-bold rounded-xl focus:outline-hidden"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
              <Phone size={13} className="text-emerald-600" />
              Hotline tiếp nhận tài trợ
            </label>
            <input
              type="text"
              value={sponsorHotline}
              onChange={(e) => setSponsorHotline(e.target.value)}
              placeholder="0924 910 210"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 font-mono rounded-xl focus:outline-hidden"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
              <Mail size={13} className="text-[#0284C7]" />
              Hòm thư tiếp nhận tài trợ
            </label>
            <input
              type="text"
              value={sponsorEmail}
              onChange={(e) => setSponsorEmail(e.target.value)}
              placeholder="hoptac@skyfirst.io.vn"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 font-mono rounded-xl focus:outline-hidden"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
              <Users size={13} className="text-sky-600" />
              Đầu mối phụ trách tiếp nhận
            </label>
            <input
              type="text"
              value={sponsorContactLeadTitle}
              onChange={(e) => setSponsorContactLeadTitle(e.target.value)}
              placeholder="Ban Đối ngoại & Sự kiện"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 font-bold rounded-xl focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 space-y-4">
        <div><label className="block text-xs font-bold text-slate-800 mb-1.5">Cảnh báo an toàn hiển thị công khai</label><textarea rows={3} value={sponsorDonationNotice} onChange={(e)=>setSponsorDonationNotice(e.target.value)} className="w-full text-xs px-3 py-2 bg-white border border-amber-200 rounded-xl" /></div>
        <div><label className="block text-xs font-bold text-slate-800 mb-1.5">Mức tiền gợi ý (VNĐ, phân cách bằng dấu phẩy)</label><input value={sponsorSuggestedAmounts} onChange={(e)=>setSponsorSuggestedAmounts(e.target.value)} placeholder="50000,100000,200000,500000" className="w-full text-xs px-3 py-2 bg-white border border-amber-200 rounded-xl font-mono" /></div>
      </div>

      {/* 5. KHỐI MÃ QR CHUYỂN KHOẢN TIẾP NHẬN TÀI TRỢ (VIETQR / NGÂN HÀNG) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center">
              <QrCode size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                5. Khối Mã QR Chuyển Khoản Tiếp Nhận Tài Trợ (VietQR / Ngân Hàng)
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Tải lên ảnh QR chuyển khoản hoặc sinh tự động mã VietQR liên kết theo số tài khoản
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateVietQR}
              className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-[#0284C7] text-xs font-bold rounded-xl border border-sky-200 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Tự động tạo đường dẫn VietQR chuẩn từ thông tin ngân hàng và STK bên trên"
            >
              <Sparkles size={13} />
              <span>Tạo nhanh VietQR từ STK</span>
            </button>
            {sponsorQrCodeUrl && (
              <button
                type="button"
                onClick={() => setSponsorQrCodeUrl('')}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl border border-rose-200 transition flex items-center gap-1 cursor-pointer"
                title="Xóa mã QR hiện tại"
              >
                <Trash2 size={13} />
                <span>Xóa QR</span>
              </button>
            )}
          </div>
        </div>

        {/* Cấu hình tiêu đề và phụ đề trên thẻ QR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tiêu đề trên thẻ mã QR
            </label>
            <input
              type="text"
              value={sponsorQrCodeTitle}
              onChange={(e) => setSponsorQrCodeTitle(e.target.value)}
              placeholder="Mã QR chuyển khoản"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden font-semibold text-slate-800"
            />
            <p className="text-[10px] text-slate-400 mt-1">Dòng chữ in đậm phía trên mã QR</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Dòng hướng dẫn / phụ đề dưới thẻ QR
            </label>
            <input
              type="text"
              value={sponsorQrCodeSubtitle}
              onChange={(e) => setSponsorQrCodeSubtitle(e.target.value)}
              placeholder="Quét bằng ứng dụng ngân hàng có hỗ trợ mã chuyển khoản phù hợp"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden text-slate-800"
            />
            <p className="text-[10px] text-slate-400 mt-1">Hướng dẫn quét mã cho nhà hảo tâm</p>
          </div>
        </div>

        {/* Hai phương thức chèn ảnh QR: Tải tệp lên (Drag-and-Drop / File Upload) hoặc Nhập URL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
          {/* Cột trái: Tải ảnh & Nhập liên kết */}
          <div className="lg:col-span-7 space-y-4">
            {/* Vùng tải tệp lên (Hỗ trợ kéo thả & click tải tệp) */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <Upload size={14} className="text-[#0284C7]" />
                Tải ảnh mã QR lên từ thiết bị (Hỗ trợ Kéo & Thả)
              </label>
              
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                  isDragging 
                    ? 'border-[#0284C7] bg-sky-50/70 scale-[1.01]' 
                    : 'border-slate-300 hover:border-sky-400 hover:bg-slate-50/60 bg-slate-50/30'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-full bg-sky-100 text-[#0284C7] flex items-center justify-center">
                  <Upload size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Nhấn để chọn tệp ảnh QR hoặc kéo thả vào đây
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Hỗ trợ định dạng PNG, JPG, WEBP, SVG (tối đa 5MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Các gợi ý thao tác nhanh */}
            <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <Sparkles size={13} className="text-amber-600" />
                Mẹo sử dụng VietQR tự động:
              </div>
              <p className="text-[11px] text-amber-800/90 leading-relaxed">
                Nhấn nút <strong>"Tạo nhanh VietQR từ STK"</strong> để hệ thống tự động đồng bộ mã QR chuẩn Ngân hàng Nhà nước (NAPAS 247) theo số tài khoản và chủ tài khoản đã khai báo ở mục 4.
              </p>
            </div>
          </div>

          {/* Cột phải: Khung xem trước trực tiếp (Live QR Preview Card) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-900/95 rounded-2xl border border-slate-800 text-center text-white">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-sky-400 mb-3 block">
              Xem trước hiển thị trên trang (/sponsor)
            </span>

            {/* Thẻ QR chuẩn giống trên trang thực tế */}
            <div className="w-full max-w-[210px] bg-white p-4 rounded-2xl shadow-xl flex flex-col items-center justify-center text-slate-900 border-2 border-sky-400 space-y-1.5">
              <div className="text-[11px] font-black text-[#0284C7] uppercase tracking-wide">
                {sponsorQrCodeTitle || 'Mã QR chuyển khoản'}
              </div>

              <div className="w-36 h-36 bg-white rounded-xl border border-slate-100 flex items-center justify-center p-1 overflow-hidden shadow-2xs">
                {sponsorQrCodeUrl ? (
                  <img
                    src={sponsorQrCodeUrl}
                    alt="Xem trước mã QR"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-300 p-2">
                    <QrCode size={40} className="stroke-[1.5]" />
                    <span className="text-[9px] text-slate-400 mt-1 font-semibold">Chưa có mã QR</span>
                  </div>
                )}
              </div>

              <div className="text-[10px] text-slate-500 font-medium leading-tight">
                {sponsorQrCodeSubtitle || 'Quét bằng ứng dụng ngân hàng có hỗ trợ mã chuyển khoản phù hợp'}
              </div>
            </div>

            <div className="mt-3 text-[11px] text-slate-300 font-mono flex items-center gap-1.5">
              <Check size={13} className="text-emerald-400" />
              <span>{sponsorQrCodeUrl ? 'Đã nạp mã QR sẵn sàng hiển thị' : 'Đang để trống'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. KHỐI ĐỒNG HÀNH & HỢP TÁC CÙNG SKY FIRST NETWORK (MỤC 6 TRÊN TRANG) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <HeartHandshake size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              6. Khối Đồng hành & Hợp tác cùng Tên chủ tài khoản đã được xác nhận
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Khung trung tâm điều hướng liên hệ tài trợ
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tiêu đề khối
            </label>
            <input
              type="text"
              value={sponsorContactHeading}
              onChange={(e) => setSponsorContactHeading(e.target.value)}
              placeholder="Đồng hành & Hợp tác cùng Tên chủ tài khoản đã được xác nhận"
              className="w-full text-sm font-black text-slate-900 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Đoạn văn mô tả hướng dẫn
            </label>
            <textarea
              rows={2}
              value={sponsorContactDescription}
              onChange={(e) => setSponsorContactDescription(e.target.value)}
              placeholder="Quý Doanh nghiệp, Tổ chức và Quý Nhà tài trợ vui lòng liên hệ..."
              className="w-full text-xs text-slate-700 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            {/* Nút 1 */}
            <div className="p-3.5 rounded-xl bg-sky-50/50 border border-sky-100 space-y-2.5">
              <span className="text-xs font-extrabold text-[#0284C7] block">
                Nút hành động 1 (Gửi đề xuất)
              </span>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tên nút
                </label>
                <input
                  type="text"
                  value={sponsorContactButtonLabel}
                  onChange={(e) => setSponsorContactButtonLabel(e.target.value)}
                  placeholder="Gửi Đề Xuất Tại Trang Liên Hệ"
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Liên kết trỏ đến
                </label>
                <input
                  type="text"
                  value={sponsorContactButtonUrl}
                  onChange={(e) => setSponsorContactButtonUrl(e.target.value)}
                  placeholder="/contact"
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>

            {/* Nút 2 */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <span className="text-xs font-extrabold text-slate-700 block">
                Nút hành động 2 (Xem 5 đơn vị)
              </span>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tên nút
                </label>
                <input
                  type="text"
                  value={sponsorUnitsButtonLabel}
                  onChange={(e) => setSponsorUnitsButtonLabel(e.target.value)}
                  placeholder="Xem đơn vị trực thuộc"
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Liên kết trỏ đến
                </label>
                <input
                  type="text"
                  value={sponsorUnitsButtonUrl}
                  onChange={(e) => setSponsorUnitsButtonUrl(e.target.value)}
                  placeholder="/units"
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <Phone size={13} className="text-[#0284C7]" />
                Hotline Đối Ngoại
              </label>
              <input
                type="text"
                value={sponsorContactHotline}
                onChange={(e) => setSponsorContactHotline(e.target.value)}
                placeholder="0924 910 210"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 font-mono rounded-xl focus:outline-hidden"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <Mail size={13} className="text-[#0284C7]" />
                Email Đối Ngoại
              </label>
              <input
                type="text"
                value={sponsorContactEmail}
                onChange={(e) => setSponsorContactEmail(e.target.value)}
                placeholder="hoptac@skyfirst.io.vn"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 font-mono rounded-xl focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 7. CÂU HỎI THƯỜNG GẶP VỀ TÀI TRỢ (FAQS) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <HelpCircle size={16} className="text-amber-600" />
            <h3 className="text-sm font-extrabold text-slate-900">
              7. Câu hỏi thường gặp về hợp tác & đồng hành (FAQs)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Giải đáp 4 câu hỏi thường gặp về minh bạch, chứng nhận và pháp lý
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tiêu đề khối FAQ
            </label>
            <input
              type="text"
              value={sponsorFaqHeading}
              onChange={(e) => setSponsorFaqHeading(e.target.value)}
              placeholder="Câu hỏi thường gặp về hợp tác & đồng hành"
              className="w-full text-sm font-black text-slate-900 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Huy hiệu danh mục
            </label>
            <input
              type="text"
              value={sponsorFaqSubtitle}
              onChange={(e) => setSponsorFaqSubtitle(e.target.value)}
              placeholder="GIẢI ĐÁP THẮC MẮC"
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
            />
          </div>
        </div>

        <div className="space-y-4 pt-2 border-t border-slate-100">
          {/* FAQ 1 */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <span className="text-xs font-bold text-slate-700 block">Câu hỏi 1: Đóng góp cá nhân</span>
            <input
              type="text"
              value={sponsorFaq1Q}
              onChange={(e) => setSponsorFaq1Q(e.target.value)}
              placeholder="Cá nhân có thể đề xuất đồng hành cùng Tên chủ tài khoản đã được xác nhận không?"
              className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
            />
            <textarea
              rows={2}
              value={sponsorFaq1A}
              onChange={(e) => setSponsorFaq1A(e.target.value)}
              placeholder="Cá nhân hoặc đơn vị có thể gửi đề xuất đồng hành..."
              className="w-full text-xs text-slate-600 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
            />
          </div>

          {/* FAQ 2 */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <span className="text-xs font-bold text-slate-700 block">Câu hỏi 2: Kiểm tra tính minh bạch</span>
            <input
              type="text"
              value={sponsorFaq2Q}
              onChange={(e) => setSponsorFaq2Q(e.target.value)}
              placeholder="Làm sao tôi có thể kiểm tra tính minh bạch của số tiền đã tài trợ?"
              className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
            />
            <textarea
              rows={2}
              value={sponsorFaq2A}
              onChange={(e) => setSponsorFaq2A(e.target.value)}
              placeholder="Chỉ công bố thông tin tài chính khi có dữ liệu và cơ chế được xác nhận."
              className="w-full text-xs text-slate-600 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
            />
          </div>

          {/* FAQ 3 */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <span className="text-xs font-bold text-slate-700 block">Câu hỏi 3: Cấp Giấy Chứng Nhận</span>
            <input
              type="text"
              value={sponsorFaq3Q}
              onChange={(e) => setSponsorFaq3Q(e.target.value)}
              placeholder="Nhà tài trợ có được cấp Giấy Chứng Nhận chính thức không?"
              className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
            />
            <textarea
              rows={2}
              value={sponsorFaq3A}
              onChange={(e) => setSponsorFaq3A(e.target.value)}
              placeholder="Có. Toàn bộ nhà tài trợ và đối tác đồng hành đều được Ban Quản lý Chứng nhận Số (hệ thống Giấy chứng nhận)..."
              className="w-full text-xs text-slate-600 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
            />
          </div>

          {/* FAQ 4 */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <span className="text-xs font-bold text-slate-700 block">Câu hỏi 4: Khấu trừ thuế TNDN</span>
            <input
              type="text"
              value={sponsorFaq4Q}
              onChange={(e) => setSponsorFaq4Q(e.target.value)}
              placeholder="Doanh nghiệp có được khấu trừ thuế TNDN cho khoản tài trợ này không?"
              className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
            />
            <textarea
              rows={2}
              value={sponsorFaq4A}
              onChange={(e) => setSponsorFaq4A(e.target.value)}
              placeholder="Nội dung hợp tác được xem xét theo từng trường hợp cụ thể."
              className="w-full text-xs text-slate-600 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* 8. KHỐI TRAO ĐỔI TRỰC TIẾP (BANNER CUỐI TRANG - QUICK CTA) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              8. Khối Trao Đổi Trực Tiếp (Banner Cuối Trang)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Banner chân trang điều hướng xem đơn vị hoặc tham gia
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tiêu đề banner
            </label>
            <input
              type="text"
              value={sponsorCtaTitle}
              onChange={(e) => setSponsorCtaTitle(e.target.value)}
              placeholder="Bạn muốn trao đổi trực tiếp cùng Ban Chấp hành Tên chủ tài khoản đã được xác nhận?"
              className="w-full text-sm font-black text-slate-900 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Đoạn văn mô tả banner
            </label>
            <textarea
              rows={2}
              value={sponsorCtaDescription}
              onChange={(e) => setSponsorCtaDescription(e.target.value)}
              placeholder="Vui lòng gọi hotline đối ngoại hoặc đặt lịch hẹn gặp trực tiếp tại Tên chủ tài khoản đã được xác nhận."
              className="w-full text-xs text-slate-700 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden leading-relaxed"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nút 1 */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <span className="text-xs font-extrabold text-slate-700 block">
                Nút hành động 1 (Xem các đơn vị)
              </span>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tên nút
                </label>
                <input
                  type="text"
                  value={buttonLabel}
                  onChange={(e) => setButtonLabel(e.target.value)}
                  placeholder="Xem các đơn vị"
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Liên kết trỏ đến
                </label>
                <input
                  type="text"
                  value={buttonUrl}
                  onChange={(e) => setButtonUrl(e.target.value)}
                  placeholder="/units"
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>

            {/* Nút 2 */}
            <div className="p-3.5 rounded-xl bg-sky-50/50 border border-sky-100 space-y-2.5">
              <span className="text-xs font-extrabold text-[#0284C7] block">
                Nút hành động 2 (Tham gia Tên chủ tài khoản đã được xác nhận)
              </span>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tên nút
                </label>
                <input
                  type="text"
                  value={secondaryButtonLabel}
                  onChange={(e) => setSecondaryButtonLabel(e.target.value)}
                  placeholder="Tham gia Tên chủ tài khoản đã được xác nhận"
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Liên kết trỏ đến
                </label>
                <input
                  type="text"
                  value={secondaryButtonUrl}
                  onChange={(e) => setSecondaryButtonUrl(e.target.value)}
                  placeholder="/join"
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 9. NỘI DUNG THƯ NGỎ / QUY CHẾ VẬN ĐỘNG TÀI TRỢ BỔ SUNG (TÙY CHỌN) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-slate-700" />
            <h3 className="text-sm font-extrabold text-slate-900">
              9. Thư Ngỏ / Quy Chế Vận Động Tài Trợ Bổ Sung (Tùy chọn)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Soạn văn bản/quy chế xuất hiện thêm trên trang tài trợ
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Bạn có thể nhập thư ngỏ kêu gọi tài trợ của Ban Chấp hành Tên chủ tài khoản đã được xác nhận, quy chế tiếp nhận và quản lý nguồn quỹ hoặc dán trực tiếp từ Word, Docs (tự động giữ nguyên định dạng in đậm, danh sách, bảng biểu).
        </p>

        <div>
          <RichTextEditor
            id="editor-sponsor-content"
            value={contentFormatted}
            onChange={setContentFormatted}
            placeholder="Nhập hoặc dán thư ngỏ, quy chế tài trợ..."
            minHeight="240px"
          />
        </div>
      </div>
    </div>
  );
};


// -----------------------------------------------------------------------------
// StandardEditorFields.tsx
// -----------------------------------------------------------------------------

interface StandardEditorFieldsProps {
  badge: string;
  setBadge: (val: string) => void;
  title: string;
  setTitle: (val: string) => void;
  summary: string;
  setSummary: (val: string) => void;
  imageUrl: string;
  setImageUrl: (val: string) => void;
  imageFit: 'original'|'contain'|'cover';
  setImageFit: (val:'original'|'contain'|'cover')=>void;
  imageFocalX:number; setImageFocalX:(val:number)=>void;
  imageFocalY:number; setImageFocalY:(val:number)=>void;
  contentFormatted: string;
  setContentFormatted: (val: string) => void;
  secondaryImageUrl: string;
  setSecondaryImageUrl: (val: string) => void;
  buttonLabel: string;
  setButtonLabel: (val: string) => void;
  buttonUrl: string;
  setButtonUrl: (val: string) => void;
  secondaryButtonLabel: string;
  setSecondaryButtonLabel: (val: string) => void;
  secondaryButtonUrl: string;
  setSecondaryButtonUrl: (val: string) => void;
}

export const StandardEditorFields: React.FC<StandardEditorFieldsProps> = ({
  badge,
  setBadge,
  title,
  setTitle,
  summary,
  setSummary,
  imageUrl,
  setImageUrl,
  imageFit,setImageFit,imageFocalX,setImageFocalX,imageFocalY,setImageFocalY,
  contentFormatted,
  setContentFormatted,
  secondaryImageUrl,
  setSecondaryImageUrl,
  buttonLabel,
  setButtonLabel,
  buttonUrl,
  setButtonUrl,
  secondaryButtonLabel,
  setSecondaryButtonLabel,
  secondaryButtonUrl,
  setSecondaryButtonUrl,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Khối Đầu Trang */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              1. Khối Đầu Trang (Tiêu Đề & Giới Thiệu)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Hiển thị ở phần đầu trang bài viết / thông tin
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Huy hiệu nổi bật (Badge)
          </label>
          <input
            type="text"
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            placeholder="VD: HỎI ĐÁP & HỖ TRỢ hoặc QUY CHẾ HOẠT ĐỘNG"
            className="w-full text-xs font-bold text-[#0284C7] px-3 py-2 bg-sky-50/50 border border-sky-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Tiêu đề trang <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nhập tiêu đề trang..."
            className="w-full text-xl sm:text-2xl font-black text-slate-900 border border-slate-200 rounded-xl px-4 py-3 focus:border-[#0284C7] focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Đoạn tóm tắt / Mở đầu trang
          </label>
          <textarea
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Nhập đoạn văn tóm tắt nội dung chính của trang..."
            className="w-full text-xs sm:text-sm text-slate-700 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden leading-relaxed"
          />
        </div>
      </div>

      {/* 2. Hình Ảnh Đại Diện / Banner Đầu Trang */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ImageIcon size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              2. Hình Ảnh Đại Diện (Banner Đầu Trang)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Chèn ảnh bằng liên kết URL
          </span>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
            <LinkIcon size={14} className="text-[#0284C7]" />
            Đường dẫn liên kết hình ảnh (URL)
          </label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="/media/... hoặc https://..."
            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden font-mono"
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-3"><label className="text-xs font-bold text-slate-600">Cách hiển thị<select value={imageFit} onChange={e=>setImageFit(e.target.value as 'original'|'contain'|'cover')} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"><option value="original">Original — tỷ lệ gốc</option><option value="contain">Fit — không cắt</option><option value="cover">Cover — phủ khung</option></select></label><label className="text-xs font-bold text-slate-600">Focal X<input type="number" min="0" max="100" value={imageFocalX} onChange={e=>setImageFocalX(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"/></label><label className="text-xs font-bold text-slate-600">Focal Y<input type="number" min="0" max="100" value={imageFocalY} onChange={e=>setImageFocalY(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"/></label></div>
          {imageUrl && (
            <div className={`mt-3 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 ${imageFit==='cover'?'aspect-video':imageFit==='contain'?'h-64':''}`}>
              <img src={imageUrl} alt="Banner preview" style={{objectPosition:`${imageFocalX}% ${imageFocalY}%`}} className={imageFit==='cover'?'w-full h-full object-cover':imageFit==='contain'?'w-full h-full object-contain':'block max-w-full h-auto mx-auto'} onError={(e) => {(e.target as HTMLElement).style.display = 'none';}} />
            </div>
          )}
        </div>
      </div>

      {/* 3. Nội Dung Văn Bản Chi Tiết */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              3. Nội Dung Văn Bản Chi Tiết
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Tự động giữ nguyên định dạng khi dán từ Word, Docs hoặc Website khác
          </span>
        </div>

        <div>
          <RichTextEditor
            id="editor-standard-content"
            value={contentFormatted}
            onChange={setContentFormatted}
            placeholder="Soạn thảo nội dung bài viết chi tiết hoặc dán trực tiếp từ nơi khác..."
            minHeight="320px"
          />
        </div>
      </div>

      {/* 4. Hình Ảnh Minh Họa Bổ Sung */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ImageIcon size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              4. Hình Ảnh Minh Họa Bổ Sung (Dưới Bài Viết)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Chèn ảnh bằng liên kết URL (tùy chọn)
          </span>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
            <LinkIcon size={14} className="text-[#0284C7]" />
            Đường dẫn liên kết hình ảnh phụ (URL)
          </label>
          <input
            type="text"
            value={secondaryImageUrl}
            onChange={(e) => setSecondaryImageUrl(e.target.value)}
            placeholder="/media/... hoặc https://..."
            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0284C7] focus:outline-hidden font-mono"
          />
          {secondaryImageUrl && (
            <div className="mt-3 h-48 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
              <img
                src={secondaryImageUrl}
                alt="Secondary preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* 5. Các Nút Bấm Hành Động Trên Trang */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <LinkIcon size={16} className="text-[#0284C7]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              5. Các Nút Bấm Hành Động Trên Trang
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Các nút điều hướng ở cuối nội dung trang
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Nút 1 */}
          <div className="p-3.5 rounded-xl bg-sky-50/50 border border-sky-100 space-y-2.5">
            <span className="text-xs font-extrabold text-[#0284C7] block">
              Nút hành động chính 1
            </span>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Tên nút
              </label>
              <input
                type="text"
                value={buttonLabel}
                onChange={(e) => setButtonLabel(e.target.value)}
                placeholder="VD: Gửi câu hỏi cho chúng tôi"
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Liên kết trỏ đến
              </label>
              <input
                type="text"
                value={buttonUrl}
                onChange={(e) => setButtonUrl(e.target.value)}
                placeholder="/contact"
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>

          {/* Nút 2 */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <span className="text-xs font-extrabold text-slate-700 block">
              Nút hành động phụ 2
            </span>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Tên nút
              </label>
              <input
                type="text"
                value={secondaryButtonLabel}
                onChange={(e) => setSecondaryButtonLabel(e.target.value)}
                placeholder="VD: Tra cứu chứng nhận"
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Liên kết trỏ đến
              </label>
              <input
                type="text"
                value={secondaryButtonUrl}
                onChange={(e) => setSecondaryButtonUrl(e.target.value)}
                placeholder="/certificate"
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
