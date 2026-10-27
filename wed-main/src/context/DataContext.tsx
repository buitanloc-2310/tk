import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  db,
  auth,
  isCMSCollectionInitialized,
  isCMSDocumentExcluded,
  mergeCMSCollection,
  isFirebaseConfigured,
  syncDocumentToFirestore,
  deleteDocumentFromFirestore,
  fetchCollectionFromFirestore,
  fetchDocumentFromFirestore,
  fetchCMSBundle,
  createPermanentRedirect,
} from '../lib/firebase';
import {
  NetworkUnit,
  Program,
  NewsArticle,
  Certificate,
  TimelineMilestone,
  CorePillar,
  TeamMember,
  FAQItem,
  SiteConfig,
  CustomPage,
  AdminUser,
  AdminUserRole,
  SiteClosedReason
} from '../types';
import { OFFICIAL_CONTENT_PAGES_2026 } from '../data/baselineData';
import {
  NETWORK_UNITS as DEFAULT_NETWORK_UNITS,
  PROGRAMS_DATA as DEFAULT_PROGRAMS,
  NEWS_DATA as DEFAULT_NEWS,
  CERTIFICATES_DATABASE as DEFAULT_CERTIFICATES,
  TIMELINE_DATA as DEFAULT_TIMELINE,
  CORE_PILLARS as DEFAULT_PILLARS,
  TEAM_DATA as DEFAULT_TEAM,
  FAQS_DATA as DEFAULT_FAQS,
  SFN_STATS as DEFAULT_STATS,
  CORE_VALUES as DEFAULT_CORE_VALUES
} from '../data/baselineData';

const OFFICIAL_MANAGED_SLUGS = new Set<string>([
  ...OFFICIAL_CONTENT_PAGES_2026.map((p) => p.slug).filter((slug) => slug !== 'nha-han-ngu'),
  'about',
  'phap-ly-minh-bach',
]);

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  siteName: 'Sky First Network',
  tagline: 'Mạng lưới Giáo dục & Phát triển Cộng đồng',
  siteDescription: 'Sky First Network được xây dựng như một không gian kết nối các hoạt động giáo dục, phát triển người trẻ, tình nguyện, hợp tác và truyền thông cộng đồng.',
  heroBadge: 'Mạng lưới Giáo dục & Phát triển Cộng đồng',
  heroHeading: 'Kết nối tri thức. Phát triển người trẻ. Lan tỏa giá trị cộng đồng.',
  heroSubtext: 'Sky First Network được xây dựng như một không gian kết nối các hoạt động giáo dục, phát triển người trẻ, tình nguyện, hợp tác và truyền thông cộng đồng.',
  heroImageUrl: '', logoUrl: '/brand/sky-first-network-web.png', email: 'lienhe@skyfirst.io.vn', hotline: '0924 910 210', address: '',
  siteStatus: 'active', closedReason: 'maintenance', closedReasonText: 'Bảo trì website', closedMessage: 'Website Sky First Network đang tạm thời bảo trì và biên tập nội dung.', closedEstimatedReopen: '', closedNoticeType: 'lockscreen',
  stats: { membersCount:'0',membersLabel:'Thành viên',membersSubtext:'Chưa công khai số liệu',provincesCount:'0',provincesLabel:'Địa bàn hoạt động',provincesSubtext:'Chưa công khai số liệu',volunteerHours:'0',hoursLabel:'Giờ hoạt động',hoursSubtext:'Chưa công khai số liệu',communityProjects:'0',projectsLabel:'Chương trình & hoạt động',projectsSubtext:'Chưa công khai số liệu' },
  counterAnimation: {
    membersCount:{durationSeconds:10,mode:'smooth',step:1,easing:'smooth',fontSize:'large',numberFormat:'vi'},
    communityProjects:{durationSeconds:10,mode:'smooth',step:1,easing:'smooth',fontSize:'large',numberFormat:'vi'},
    provincesCount:{durationSeconds:10,mode:'smooth',step:1,easing:'smooth',fontSize:'large',numberFormat:'vi'},
    volunteerHours:{durationSeconds:10,mode:'smooth',step:1,easing:'smooth',fontSize:'large',numberFormat:'vi'},
  },
  taxonomyCategories:[
    {id:'education',label:'Giáo dục & Đào tạo',visible:true},
    {id:'youth',label:'Phát triển Người trẻ',visible:true},
    {id:'community',label:'Tình nguyện & Cộng đồng',visible:true},
    {id:'environment',label:'Môi trường & Phát triển bền vững',visible:true},
    {id:'media',label:'Truyền thông & Lan tỏa',visible:true},
    {id:'partnership',label:'Kết nối & Hợp tác',visible:true},
    {id:'hr',label:'Tuyển dụng & Nhân sự',visible:true},
    {id:'skills',label:'Hội thảo & Kỹ năng',visible:true},
    {id:'research',label:'Nghiên cứu & Đổi mới sáng tạo',visible:true},
    {id:'technology',label:'Công nghệ & Chuyển đổi số',visible:true},
    {id:'culture',label:'Văn hóa & Xã hội',visible:true},
    {id:'event',label:'Sự kiện',visible:true},
    {id:'project',label:'Chương trình & Dự án',visible:true},
    {id:'opportunity',label:'Cơ hội học tập',visible:true},
    {id:'announcement',label:'Thông báo',visible:true},
    {id:'report',label:'Báo cáo & Công khai',visible:true},
    {id:'other',label:'Khác...',visible:true},
  ],
  pillarsHeading:'05 trụ cột hoạt động',
  pillarsSubtext:'Năm hướng hoạt động, cùng phục vụ một mục tiêu phát triển con người và cộng đồng.',
  directionLabel:'Định hướng 2026',

  directionPillarsCount:'05', directionPillarsLabel:'Trụ cột hoạt động', directionValuesCount:'06', directionValuesLabel:'Giá trị cốt lõi',
  coreValues: DEFAULT_CORE_VALUES.map(v => ({name:v.name, desc:v.desc})),
  navigationGroups:[
    {label:'Giới thiệu',items:[
      {label:'Về Sky First Network',page:'custom-page',slug:'sky-first-network-la-gi',description:'Tổng quan về mạng lưới, định hướng và cách Sky First kết nối giáo dục với cộng đồng.'},
      {label:'Tầm nhìn & Sứ mệnh',page:'custom-page',slug:'tam-nhin-su-menh',description:'Định hướng dài hạn, sứ mệnh và những giá trị Sky First theo đuổi.'},
      {label:'Giá trị cốt lõi',page:'custom-page',slug:'gia-tri-cot-loi',description:'Các nguyên tắc định hướng cách mạng lưới tổ chức, phối hợp và phát triển.'},
      {label:'Cơ cấu tổ chức',page:'custom-page',slug:'co-cau-to-chuc',description:'Cách các bộ phận, đơn vị và vai trò trong mạng lưới được tổ chức.'},
      {label:'Ban Điều hành & Con người Sky First',page:'custom-page',slug:'con-nguoi',description:'Đội ngũ, vai trò và hồ sơ được phép công khai.'},
      {label:'Đơn vị trực thuộc',page:'units',description:'Các đơn vị chuyên môn đang hoạt động trong hệ sinh thái Sky First.'},
      {label:'Hành trình phát triển',page:'custom-page',slug:'hanh-trinh-hinh-thanh',description:'Những giai đoạn hình thành, hoàn thiện và mở rộng mạng lưới.'},
      {label:'Báo cáo & Dấu ấn',page:'custom-page',slug:'bao-cao-dau-an',description:'Báo cáo hoạt động, kết quả và các mốc đáng chú ý được công bố.'},
      {label:'Liên hệ',page:'contact',description:'Kênh hỗ trợ, phản hồi và kết nối chính thức.'}
    ]},
    {label:'Hoạt động',items:[
      {label:'Giáo dục & Đào tạo',page:'custom-page',slug:'giao-duc-dao-tao',description:'Học tập, ngoại ngữ, kỹ năng và trải nghiệm giáo dục.'},
      {label:'Phát triển Người trẻ',page:'custom-page',slug:'phat-trien-nguoi-tre',description:'Không gian trải nghiệm, rèn luyện và phát triển năng lực.'},
      {label:'Tình nguyện & Cộng đồng',page:'custom-page',slug:'tinh-nguyen-cong-dong',description:'Hoạt động tình nguyện, chiến dịch cộng đồng và cơ hội đóng góp.'},
      {label:'Môi trường & Phát triển bền vững',page:'custom-page',slug:'moi-truong-phat-trien-ben-vung',description:'Sáng kiến sống xanh, môi trường và phát triển bền vững.'},
      {label:'Nghiên cứu & Đổi mới sáng tạo',page:'custom-page',slug:'nghien-cuu-doi-moi-sang-tao',description:'Nghiên cứu ứng dụng, thử nghiệm ý tưởng và giải pháp mới.'},
      {label:'Chương trình & Dự án',page:'programs',description:'Các chương trình đang triển khai và hồ sơ dự án đã công bố.'},
      {label:'Sự kiện & Hoạt động',page:'custom-page',slug:'su-kien',description:'Sự kiện, hội thảo, chiến dịch và hoạt động nổi bật.'},
      {label:'Kết nối & Hợp tác',page:'custom-page',slug:'ket-noi-hop-tac',description:'Kết nối tổ chức, chuyên gia, đối tác và nguồn lực phù hợp.'},
      {label:'Truyền thông & Lan tỏa',page:'custom-page',slug:'truyen-thong-lan-toa',description:'Chia sẻ câu chuyện, tri thức và những giá trị tích cực.'},
      {label:'Cơ hội đang mở',page:'custom-page',slug:'co-hoi',description:'Các đợt tuyển, chương trình và cơ hội đang nhận đăng ký.'}
    ]},
    {label:'Tra cứu',items:[
      {label:'Tra cứu hồ sơ đăng ký',page:'join',description:'Kiểm tra trạng thái hồ sơ bằng mã được cấp sau khi gửi biểu mẫu.'},
      {label:'Tra cứu chương trình / dự án',page:'programs',description:'Tìm chương trình, dự án và trạng thái hoạt động công khai.'},
      {label:'Công khai & Minh bạch',page:'custom-page',slug:'cong-khai',description:'Hồ sơ công khai, nguồn lực, tiến độ và cập nhật được phép chia sẻ.'},
      {label:'Tài liệu công khai',page:'custom-page',slug:'tai-lieu-cong-khai',description:'Tài liệu, báo cáo và thông tin được công bố trên website.'},
      {label:'Báo cáo hoạt động',page:'custom-page',slug:'bao-cao-hoat-dong',description:'Tổng hợp hoạt động và kết quả theo kỳ công bố.'},
      {label:'Báo cáo tác động',page:'custom-page',slug:'bao-cao-tac-dong',description:'Theo dõi các chỉ số và kết quả tác động đã được xác minh.'},
      {label:'Câu hỏi thường gặp',page:'custom-page',slug:'cau-hoi-thuong-gap',description:'Giải đáp nhanh các câu hỏi phổ biến khi sử dụng website.'}
    ]},
    {label:'Tham gia',items:[
      {label:'Thành viên Sky First',page:'custom-page',slug:'thanh-vien-sky-first',description:'Tìm hiểu hành trình thành viên và các hình thức đồng hành.'},
      {label:'Core Team',page:'custom-page',slug:'core-team',description:'Tham gia đội ngũ nòng cốt vận hành và phát triển mạng lưới.'},
      {label:'Tình nguyện viên',page:'custom-page',slug:'tinh-nguyen-vien',description:'Đóng góp thời gian, kỹ năng và chuyên môn cho hoạt động phù hợp.'},
      {label:'Tình nguyện viên Dạy học',page:'custom-page',slug:'tinh-nguyen-vien-day-hoc',description:'Đồng hành cùng các lớp học và hoạt động giáo dục cộng đồng.'},
      {label:'Cơ hội đang tuyển',page:'custom-page',slug:'co-hoi',description:'Các vị trí, chương trình và đợt tuyển đang mở.'},
      {label:'Tham gia chương trình / sự kiện',page:'join',description:'Chọn biểu mẫu đang mở và gửi hồ sơ trực tuyến.'},
      {label:'Hợp tác & Đồng hành',page:'custom-page',slug:'hop-tac-dong-hanh',description:'Đề xuất phối hợp về chuyên môn, truyền thông, chương trình hoặc nguồn lực.'},
      {label:'Gửi sáng kiến / đề xuất',page:'custom-page',slug:'gui-sang-kien-de-xuat',description:'Gửi ý tưởng, sáng kiến hoặc đề xuất hợp tác đến Sky First.'},
      {label:'Liên hệ',page:'contact',description:'Gửi câu hỏi, phản hồi hoặc nhu cầu kết nối.'}
    ]},
    {label:'Tin tức',items:[
      {label:'Tin Sky First',page:'news',description:'Thông tin mới từ Sky First Network.'},
      {label:'Tin hoạt động',page:'news',description:'Cập nhật chương trình, sự kiện và hoạt động đang diễn ra.'},
      {label:'Giáo dục',page:'news',description:'Nội dung giáo dục, học tập và đào tạo.'},
      {label:'Người trẻ',page:'news',description:'Câu chuyện, cơ hội và góc nhìn dành cho người trẻ.'},
      {label:'Tình nguyện & Cộng đồng',page:'news',description:'Các hoạt động cộng đồng và tình nguyện.'},
      {label:'Môi trường',page:'news',description:'Tin và câu chuyện về môi trường, sống xanh.'},
      {label:'Cơ hội',page:'news',description:'Tuyển thành viên, TNV, sự kiện và cơ hội tham gia.'},
      {label:'Câu chuyện cộng đồng',page:'news',description:'Những câu chuyện và giá trị được lan tỏa từ cộng đồng.'},
      {label:'Thông báo',page:'news',description:'Thông báo chính thức và cập nhật vận hành.'},
      {label:'Bản tin Sky First',page:'news',description:'Bản tin định kỳ và tổng hợp theo chủ đề.'},
      {label:'Thư viện ảnh & Video',page:'custom-page',slug:'thu-vien-anh-video',description:'Ảnh, video và tư liệu truyền thông được phép công khai.'}
    ]}
  ],
  footerQuickLinks:[{label:'Giới thiệu Sky First Network',url:'/sky-first-network-la-gi'},{label:'Tầm nhìn & Sứ mệnh',url:'/tam-nhin-su-menh'},{label:'Giá trị cốt lõi',url:'/gia-tri-cot-loi'},{label:'Cơ cấu tổ chức',url:'/co-cau-to-chuc'},{label:'Lĩnh vực hoạt động',url:'/linh-vuc-hoat-dong'},{label:'Hợp tác & Đồng hành',url:'/hop-tac-dong-hanh'},{label:'Đơn vị trực thuộc',url:'/units'},{label:'Tin tức & Hoạt động',url:'/news'},{label:'Tham gia Sky First Network',url:'/join'}],
  footerContacts:[
    {label:'Liên hệ chung',value:'lienhe@skyfirst.io.vn',url:'mailto:lienhe@skyfirst.io.vn',icon:'mail'},
    {label:'Hợp tác & Đồng hành',value:'hoptac@skyfirst.io.vn',url:'mailto:hoptac@skyfirst.io.vn',icon:'mail'},
    {label:'Nhân sự',value:'nhansu@skyfirst.io.vn',url:'mailto:nhansu@skyfirst.io.vn',icon:'mail'},
    {label:'Tình nguyện viên',value:'tnv@skyfirst.io.vn',url:'mailto:tnv@skyfirst.io.vn',icon:'mail'},
    {label:'Lớp học',value:'lophoc@skyfirst.io.vn',url:'mailto:lophoc@skyfirst.io.vn',icon:'mail'},
    {label:'Truyền thông',value:'truyenthong@skyfirst.io.vn',url:'mailto:truyenthong@skyfirst.io.vn',icon:'mail'},
    {label:'Hotline/Zalo',value:'0924 910 210',url:'tel:0924910210',icon:'phone'}
  ],
  footerPortals:[
    {label:'Website Sky First Network',description:'Cổng thông tin chính thức',domain:'skyfirst.io.vn',url:'https://skyfirst.io.vn/',icon:'globe'},
    {label:'Cổng Chứng nhận',description:'Xác thực các ghi nhận Sky First',domain:'ctt.skyfirst.io.vn',url:'https://ctt.skyfirst.io.vn/',icon:'globe'},
    {label:'Cổng Tình nguyện viên',description:'Không gian dành cho tình nguyện viên',domain:'tnv.skyfirst.io.vn',url:'https://tnv.skyfirst.io.vn/',icon:'heart'},
    {label:'SFEC',description:'Không gian học tập tiếng Anh cộng đồng',domain:'sfec.skyfirst.io.vn',url:'https://sfec.skyfirst.io.vn/',icon:'graduation'}
  ],
  footerLegalLinks:[{label:'Công khai & Minh bạch',url:'/cong-khai'},{label:'Pháp lý & Minh bạch',url:'/phap-ly-minh-bach'},{label:'Chính sách bảo mật',url:'/chinh-sach-bao-mat'},{label:'Điều khoản sử dụng',url:'/dieu-khoan-su-dung'},{label:'Liên hệ',url:'/contact'},{label:'Đăng nhập quản trị',url:'/admin'}],
  organizationInfo:[
    {label:'Tên',value:'Mạng lưới Giáo dục & Phát triển Cộng đồng Sky First',visible:true},
    {label:'Tên tiếng Anh',value:'Sky First Network',visible:true},
    {label:'Đơn vị trực thuộc',value:'VNV – Cộng đồng Tình nguyện Việt Nam',visible:true},
    {label:'Người phụ trách',value:'Bùi Tấn Lộc — Chủ tịch Mạng lưới',visible:true},
    {label:'Biên tập',value:'Đinh Gia Khánh Lộc — Tổng Thư ký',visible:true},
    {label:'Website',value:'skyfirst.io.vn',url:'https://skyfirst.io.vn',visible:true},
    {label:'Hotline/Zalo',value:'0924 910 210',url:'tel:0924910210',visible:true},
    {label:'Email',value:'lienhe@skyfirst.io.vn',url:'mailto:lienhe@skyfirst.io.vn',visible:true}
  ],
  directionText:'Tập trung tái cấu trúc, chuẩn hóa hệ thống quản trị, phát triển Core Team và củng cố nền tảng số.',
  programsLabel:'Chương trình & hoạt động', programsHeading:'Những hoạt động đang được cập nhật',
  unitsLabel:'Đơn vị trực thuộc', unitsHeading:'Hệ sinh thái hoạt động chuyên môn', unitsIntro:'Các đơn vị trực thuộc được giới thiệu bằng tên, logo, lĩnh vực, hoạt động và thông tin liên hệ riêng.',
  certificateLabel:'Xác thực thông tin', certificateHeading:'Trung tâm Xác thực Sky First', certificateText:'Kiểm tra thông tin giấy chứng nhận được ghi nhận trong hệ thống Sky First Network.', certificateButtonText:'Mở trang tra cứu', certificateButtonUrl:'/certificate',
  valuesLabel:'06 giá trị cốt lõi', valuesHeading:'Nguyên tắc định hướng cách mạng lưới vận hành.',
  newsLabel:'Tin tức & hoạt động', newsHeading:'Cập nhật từ mạng lưới',
  transparencyHeading:'Thông tin minh bạch', transparencyText:'Sky First Network hiện được vận hành như một mạng lưới độc lập về tổ chức và định hướng hoạt động, nhưng hiện chưa có tư cách pháp lý độc lập.', transparencyButtonText:'Tìm hiểu thêm', transparencyButtonUrl:'/cong-khai',
  contact:{mainEmail:'lienhe@skyfirst.io.vn',contactEmail:'lienhe@skyfirst.io.vn',phoneHotline:'0924 910 210',phoneExternal:'',workHoursWeekdays:'',workHoursSaturday:'',facebookUrl:'',linkedinUrl:''},
  unitsBannerHeading:'Đơn vị trực thuộc Sky First Network', unitsBannerSubtext:'Các đơn vị trực thuộc có nhận diện và phạm vi hoạt động riêng trong hệ sinh thái Sky First Network.',
  ctaHeading:'Kết nối cùng Sky First Network', ctaSubtext:'Tìm hiểu các hình thức tham gia, tình nguyện, hợp tác và đồng hành cùng các hoạt động phù hợp.', ctaButtonText:'Tham gia',ctaButtonUrl:'/join',ctaSecondaryButtonText:'Liên hệ hợp tác',ctaSecondaryButtonUrl:'/contact',
  heroButton1Text:'Khám phá mạng lưới',heroButton1Url:'/about',heroButton2Text:'Tham gia cùng chúng tôi',heroButton2Url:'/join',heroButton3Text:'',heroButton3Url:'',
  homeSections:{hero:true,direction:true,pillars:true,programs:true,units:true,certificate:false,values:true,news:true,transparency:true,cta:true},
  homeSectionOrder:['hero','pillars','news','programs','values','certificate','transparency','units','cta'],
  footerSlogan:'', footerAboutText:'', footerCopyright:'© 2026. Mạng lưới Giáo dục & Phát triển Cộng đồng Sky First.', footerCertBadgeText:'Xác thực GCN',footerUnitsBadgeText:'Đơn vị trực thuộc',footerSocialFacebook:'',footerSocialInstagram:'',footerSocialTiktok:'',footerSocialLinkedin:'',footerSocialYoutube:'',footerSocialZalo:'',
  intro: {
    enabled: true,
    videoUrl: '',
    posterUrl: '/brand/sky-first-network-logo.png',
    logoUrl: '/brand/sky-first-network-web.png',
    logoRevealDurationMs: 1400,
    maxWaitDurationMs: 8000,
    allowSkip: true,
    skipLabel: 'Bỏ qua Intro',
    playMode: 'every_home_load',
    respectReducedMotion: true,
    fallbackMode: 'logo_fade'
  },
  emailSettings: {
    enabled: false,
    provider: 'none',
    senderName: 'Sky First Network',
    senderEmail: 'lienhe@skyfirst.io.vn',
    replyToEmail: 'lienhe@skyfirst.io.vn',
    adminRecipientEmails: 'lienhe@skyfirst.io.vn',
    apiKeyMasked: '',
    sendOnProgramRegistration: true,
    sendAdminAlertOnRegistration: true,
    sendOnContactSubmission: true,
    sendOnStatusChange: false,
    retryMaxAttempts: 3
  },
  automationSettings: {
    enableScheduledPublishing: true,
    enableAutoCloseExpiredForms: true,
    enableAutoRedirectOnSlugChange: true,
    enableAutoSitemapUpdate: true,
    enableAutoEndedProgramBadge: true,
    autoArchiveOldDraftDays: 0
  },
  seoSettings: {
    titleTemplate: '%s | Sky First Network',
    defaultTitle: 'Sky First Network — Mạng lưới Giáo dục & Phát triển Cộng đồng',
    defaultDescription: 'Sky First Network được xây dựng như một không gian kết nối các hoạt động giáo dục, phát triển người trẻ, tình nguyện, hợp tác và truyền thông cộng đồng.',
    defaultOgImage: '/brand/sky-first-network-logo.png',
    canonicalDomain: 'https://skyfirst.io.vn',
    allowIndexing: true
  }
};

const LEGACY_HOME_ORDER = ['hero','direction','pillars','programs','units','certificate','values','news','transparency'];
const PRODUCTION_HOME_ORDER = ['hero','pillars','news','programs','values','certificate','transparency','units','cta'];
const normalizeHomeSectionOrder=(value?:string[])=>{
  const items=Array.isArray(value)?value.filter(Boolean):[];
  const legacy=items.join('|')===LEGACY_HOME_ORDER.join('|') || items.filter(x=>x!=='direction').join('|')===LEGACY_HOME_ORDER.filter(x=>x!=='direction').join('|');
  if(!items.length||legacy)return [...PRODUCTION_HOME_ORDER];
  const cleaned=items.filter(x=>x!=='direction');
  return [...new Set([...cleaned,...PRODUCTION_HOME_ORDER.filter(x=>!cleaned.includes(x))])];
};

export const DEFAULT_ADMIN_USERS: AdminUser[] = [];

const BASE_CUSTOM_PAGES: CustomPage[] = [
  {id:'page-about',slug:'about',title:'Về Sky First Network',summary:'Tổng quan về Mạng lưới Giáo dục & Phát triển Cộng đồng Sky First.',content:'Sky First Network là một mạng lưới hoạt động theo định hướng giáo dục, phát triển con người và kết nối cộng đồng.',contentFormatted:'Sky First Network là một mạng lưới hoạt động theo định hướng giáo dục, phát triển con người và kết nối cộng đồng.\n\nMạng lưới được xây dựng như một không gian chung để người trẻ học tập, phát triển năng lực, tham gia hoạt động xã hội, thử sức trong các vai trò tổ chức và sử dụng kiến thức, kỹ năng của mình để tạo ra giá trị tích cực cho cộng đồng.',isPublished:true,publishedAt:'08/09/2026',author:'Sky First Network',type:'about',showInFooter:true,visionBadge:'Tầm nhìn',visionTitle:'Tầm nhìn',visionContent:'Nội dung tầm nhìn được cập nhật theo tài liệu chính thức của Sky First Network.',missionBadge:'Sứ mệnh',missionTitle:'Sứ mệnh',missionContent:'Nội dung sứ mệnh được cập nhật theo tài liệu chính thức của Sky First Network.',philosophyBadge:'Giá trị cốt lõi',philosophyTitle:'06 giá trị cốt lõi',philosophyContent:'Giáo dục; Cộng đồng; Trách nhiệm; Chủ động và phát triển; Kết nối và hợp tác; Bền vững.'},
  {id:'page-certificate',slug:'certificate',title:'Trung tâm Xác thực Sky First',badge:'TRUNG TÂM XÁC THỰC SKY FIRST',summary:'Xác thực thông tin và trạng thái các ghi nhận được quản lý trên hệ thống Sky First.',content:'Trang tra cứu giúp đối chiếu thông tin Giấy chứng nhận đã được ghi nhận trong hệ thống.',contentFormatted:'Trang tra cứu giúp đối chiếu thông tin Giấy chứng nhận đã được ghi nhận trong hệ thống Sky First Network.',isPublished:true,publishedAt:'08/09/2026',author:'Sky First Network',type:'certificate',showInFooter:true,certSearchLabel:'Mã Giấy chứng nhận',certSearchPlaceholder:'Nhập mã Giấy chứng nhận',certGuidanceNote:'Thông tin hiển thị dựa trên dữ liệu đã được ghi nhận trong hệ thống.',certSearchButtonLabel:'Tra cứu',certResetButtonLabel:'Làm mới',certFeature1Title:'Mã định danh',certFeature1Desc:'Mỗi bản ghi sử dụng một mã để phục vụ việc đối chiếu thông tin.',certFeature2Title:'Thông tin đã ghi nhận',certFeature2Desc:'Kết quả tra cứu phản ánh dữ liệu đang được lưu trong hệ thống.',certFeature3Title:'Hỗ trợ',certFeature3Desc:'Nếu cần hỗ trợ hoặc phát hiện thông tin chưa chính xác, vui lòng liên hệ Sky First Network.',certCtaTitle:'Bạn cần hỗ trợ về Giấy chứng nhận?',certCtaDescription:'Gửi yêu cầu qua kênh hỗ trợ để được tiếp nhận và kiểm tra.',certCtaButtonLabel:'Liên hệ hỗ trợ',certCtaButtonUrl:'/contact'},
  {id:'page-join',slug:'join',title:'Tham gia Sky First Network',summary:'Tìm hiểu các hình thức tham gia phù hợp.',content:'Sky First Network mở các hình thức tham gia theo từng chương trình, hoạt động và nhu cầu nhân sự được công bố.',contentFormatted:'Sky First Network mở các hình thức tham gia theo từng chương trình, hoạt động và nhu cầu nhân sự được công bố.',isPublished:true,publishedAt:'08/09/2026',author:'Sky First Network',type:'join',showInFooter:true},
  {id:'page-contact',slug:'contact',title:'Liên hệ',summary:'Các kênh liên hệ chính thức của Sky First Network.',content:'Email liên hệ chính: lienhe@skyfirst.io.vn\nEmail Nhân sự: nhansu@skyfirst.io.vn\nEmail Hợp tác: hoptac@skyfirst.io.vn\nEmail Truyền thông: truyenthong@skyfirst.io.vn\nĐiện thoại/Zalo: 0924 910 210',contentFormatted:'Email liên hệ chính: lienhe@skyfirst.io.vn\nEmail Nhân sự: nhansu@skyfirst.io.vn\nEmail Hợp tác: hoptac@skyfirst.io.vn\nEmail Truyền thông: truyenthong@skyfirst.io.vn\nĐiện thoại/Zalo: 0924 910 210',isPublished:true,publishedAt:'08/09/2026',author:'Sky First Network',type:'contact',showInFooter:true},
  {id:'page-transparency',slug:'phap-ly-minh-bach',title:'Pháp lý & Minh bạch',summary:'Thông tin về cách Sky First Network được tổ chức và vận hành.',content:'Sky First Network hiện được vận hành như một mạng lưới độc lập về tổ chức và định hướng hoạt động, nhưng hiện chưa có tư cách pháp lý độc lập.',contentFormatted:'Sky First Network hiện được vận hành như một mạng lưới độc lập về tổ chức và định hướng hoạt động, nhưng hiện chưa có tư cách pháp lý độc lập.',isPublished:true,publishedAt:'08/09/2026',author:'Sky First Network',type:'legal',showInFooter:true},
  {id:'page-events-center',slug:'su-kien',title:'Sự kiện & Hoạt động',badge:'EVENT CENTER',summary:'Lịch sự kiện, hoạt động và các chương trình đang được công bố.',content:'Thông tin sự kiện được quản lý tập trung trong CMS và tự động hiển thị theo trạng thái công khai.',contentFormatted:'Thông tin sự kiện được quản lý tập trung trong CMS và tự động hiển thị theo trạng thái công khai.',isPublished:true,publishedAt:'06/10/2026',author:'Sky First Network',type:'custom',showInFooter:false},
  {id:'page-opportunity-center',slug:'co-hoi',title:'Cơ hội đang mở',badge:'OPPORTUNITY CENTER',summary:'Các cơ hội thành viên, tình nguyện, lớp học, sự kiện và chương trình đang nhận đăng ký.',content:'Trạng thái cơ hội được quản lý theo thời gian mở và đóng trên hệ thống.',contentFormatted:'Trạng thái cơ hội được quản lý theo thời gian mở và đóng trên hệ thống.',isPublished:true,publishedAt:'06/10/2026',author:'Sky First Network',type:'custom',showInFooter:false},
  {id:'page-people-center',slug:'con-nguoi',title:'Con người Sky First',badge:'PEOPLE',summary:'Hồ sơ đội ngũ và những vai trò được phép công khai trên website.',content:'Thông tin cá nhân chỉ xuất hiện khi được cho phép công khai trong CMS.',contentFormatted:'Thông tin cá nhân chỉ xuất hiện khi được cho phép công khai trong CMS.',isPublished:true,publishedAt:'06/10/2026',author:'Sky First Network',type:'custom',showInFooter:false},
  {id:'page-public-transparency',slug:'cong-khai',title:'Công khai & Minh bạch',badge:'CỔNG CÔNG KHAI',summary:'Không gian tập trung các hồ sơ, tài liệu, báo cáo và dữ liệu được phép công khai của Sky First Network.',content:'Các nội dung tại Cổng Công khai được quản trị theo trạng thái xuất bản. Chỉ dữ liệu đã được phép công khai mới hiển thị; dữ liệu cá nhân và thông tin nội bộ không được tự động đưa ra ngoài.',contentFormatted:'Các nội dung tại Cổng Công khai được quản trị theo trạng thái xuất bản. Chỉ dữ liệu đã được phép công khai mới hiển thị; dữ liệu cá nhân và thông tin nội bộ không được tự động đưa ra ngoài.',isPublished:true,publishedAt:'06/10/2026',author:'Sky First Network',type:'custom',showInFooter:true,pageBlocks:[{id:'transparency-stats',type:'stats',title:'Thông tin công khai theo từng hoạt động',background:'soft',stats:[{value:'—',label:'Dự án/Chương trình công khai',note:'Cập nhật từ CMS'},{value:'—',label:'Báo cáo & tài liệu',note:'Cập nhật từ CMS'},{value:'—',label:'Cập nhật minh bạch',note:'Cập nhật từ CMS'}]},{id:'transparency-cta',type:'cta',title:'Bạn cần kiểm tra một hồ sơ cụ thể?',body:'Sử dụng các mục Tra cứu, Tài liệu công khai hoặc liên hệ đầu mối phụ trách để được hướng dẫn.',buttonLabel:'Tài liệu công khai',buttonUrl:'/tai-lieu-cong-khai',secondaryButtonLabel:'Liên hệ',secondaryButtonUrl:'/contact',background:'navy'}]},
  {id:'page-privacy',slug:'chinh-sach-bao-mat',title:'Chính sách bảo mật',summary:'Nguyên tắc tiếp nhận và bảo vệ thông tin người dùng trên website Sky First Network.',content:'Sky First Network chỉ tiếp nhận thông tin cần thiết cho mục đích người dùng chủ động gửi, như liên hệ, đăng ký hoặc bình luận. Website không yêu cầu người dùng cung cấp mật khẩu, mã OTP hay thông tin định danh nhạy cảm qua biểu mẫu công khai.\n\nThông tin liên hệ được sử dụng để tiếp nhận và xử lý yêu cầu phù hợp. Email dùng khi gửi bình luận chỉ phục vụ quản lý và phản hồi khi cần, không hiển thị công khai.\n\nCác dữ liệu nội bộ, hồ sơ cá nhân và thông tin chưa được phép công khai không được đưa lên website. Khi cần hỗ trợ về dữ liệu hoặc nội dung đã gửi, vui lòng liên hệ lienhe@skyfirst.io.vn.',contentFormatted:'Sky First Network chỉ tiếp nhận thông tin cần thiết cho mục đích người dùng chủ động gửi, như liên hệ, đăng ký hoặc bình luận. Website không yêu cầu người dùng cung cấp mật khẩu, mã OTP hay thông tin định danh nhạy cảm qua biểu mẫu công khai.\n\nThông tin liên hệ được sử dụng để tiếp nhận và xử lý yêu cầu phù hợp. Email dùng khi gửi bình luận chỉ phục vụ quản lý và phản hồi khi cần, không hiển thị công khai.\n\nCác dữ liệu nội bộ, hồ sơ cá nhân và thông tin chưa được phép công khai không được đưa lên website. Khi cần hỗ trợ về dữ liệu hoặc nội dung đã gửi, vui lòng liên hệ lienhe@skyfirst.io.vn.',isPublished:true,publishedAt:'11/09/2026',author:'Sky First Network',type:'legal',showInFooter:true},
  {id:'page-terms',slug:'dieu-khoan-su-dung',title:'Điều khoản sử dụng',summary:'Nguyên tắc sử dụng nội dung và các chức năng công khai của website Sky First Network.',content:'Website Sky First Network cung cấp thông tin về Mạng lưới, chương trình, hoạt động, đơn vị trực thuộc và các tiện ích công khai theo dữ liệu được cập nhật tại từng thời điểm. Người dùng cần sử dụng các chức năng website đúng mục đích và không gửi nội dung giả mạo, xâm phạm quyền riêng tư hoặc gây ảnh hưởng đến hoạt động của hệ thống.\n\nThông tin về chương trình, tuyển chọn, hợp tác và giấy chứng nhận chỉ có giá trị theo trạng thái hiển thị và dữ liệu được ghi nhận trên hệ thống chính thức. Nội dung cũ có thể được cập nhật khi hoạt động thay đổi.\n\nSky First Network hiện chưa phải là một pháp nhân độc lập; các nội dung và chức danh trên website phục vụ nhận diện, quản trị và vận hành Mạng lưới, không phải bằng chứng về tư cách pháp nhân. Nếu cần làm rõ thông tin, vui lòng liên hệ kênh chính thức của Sky First Network.',contentFormatted:'Website Sky First Network cung cấp thông tin về Mạng lưới, chương trình, hoạt động, đơn vị trực thuộc và các tiện ích công khai theo dữ liệu được cập nhật tại từng thời điểm. Người dùng cần sử dụng các chức năng website đúng mục đích và không gửi nội dung giả mạo, xâm phạm quyền riêng tư hoặc gây ảnh hưởng đến hoạt động của hệ thống.\n\nThông tin về chương trình, tuyển chọn, hợp tác và giấy chứng nhận chỉ có giá trị theo trạng thái hiển thị và dữ liệu được ghi nhận trên hệ thống chính thức. Nội dung cũ có thể được cập nhật khi hoạt động thay đổi.\n\nSky First Network hiện chưa phải là một pháp nhân độc lập; các nội dung và chức danh trên website phục vụ nhận diện, quản trị và vận hành Mạng lưới, không phải bằng chứng về tư cách pháp nhân. Nếu cần làm rõ thông tin, vui lòng liên hệ kênh chính thức của Sky First Network.',isPublished:true,publishedAt:'11/09/2026',author:'Sky First Network',type:'legal',showInFooter:true},
  {id:'content-04',slug:'tam-nhin',title:'Tầm nhìn',summary:'Định hướng dài hạn của Sky First Network.',content:'Nội dung được cập nhật theo tài liệu chính thức của Sky First Network.',contentFormatted:'Nội dung được cập nhật theo tài liệu chính thức của Sky First Network.',isPublished:true,publishedAt:'08/09/2026',author:'Sky First Network',type:'custom',showInFooter:false},
  {id:'content-05',slug:'su-menh',title:'Sứ mệnh',summary:'Sứ mệnh của Sky First Network.',content:'Nội dung được cập nhật theo tài liệu chính thức của Sky First Network.',contentFormatted:'Nội dung được cập nhật theo tài liệu chính thức của Sky First Network.',isPublished:true,publishedAt:'08/09/2026',author:'Sky First Network',type:'custom',showInFooter:false},
  {id:'content-06',slug:'gia-tri-cot-loi',title:'Giá trị cốt lõi',summary:'Sáu giá trị định hướng cách mạng lưới vận hành.',content:'Giáo dục; Cộng đồng; Trách nhiệm; Chủ động và phát triển; Kết nối và hợp tác; Bền vững.',contentFormatted:'Giáo dục; Cộng đồng; Trách nhiệm; Chủ động và phát triển; Kết nối và hợp tác; Bền vững.',isPublished:true,publishedAt:'08/09/2026',author:'Sky First Network',type:'custom',showInFooter:false},
  {id:'content-08',slug:'linh-vuc-hoat-dong',title:'Lĩnh vực hoạt động',summary:'Năm trụ cột hoạt động của Sky First Network.',content:'Giáo dục & Đào tạo; Phát triển Người trẻ; Tình nguyện & Cộng đồng; Kết nối & Hợp tác; Truyền thông & Lan tỏa.',contentFormatted:'Giáo dục & Đào tạo; Phát triển Người trẻ; Tình nguyện & Cộng đồng; Kết nối & Hợp tác; Truyền thông & Lan tỏa.',isPublished:true,publishedAt:'08/09/2026',author:'Sky First Network',type:'custom',showInFooter:false},
  {id:'content-13',slug:'co-cau-to-chuc',title:'Cơ cấu tổ chức',summary:'Mô hình tổ chức và bộ máy vận hành hiện tại.',content:'Ban Chấp hành; Ban Nhân sự; Ban Truyền thông; Ban Đối ngoại & Sự kiện; Văn phòng; cùng các đơn vị trực thuộc.',contentFormatted:'Ban Chấp hành; Ban Nhân sự; Ban Truyền thông; Ban Đối ngoại & Sự kiện; Văn phòng; cùng các đơn vị trực thuộc.',isPublished:true,publishedAt:'08/09/2026',author:'Sky First Network',type:'custom',showInFooter:false},
  {id:'content-14',slug:'don-vi-truc-thuoc',title:'Đơn vị trực thuộc',summary:'Các đơn vị trực thuộc Sky First Network.',content:'Trong giai đoạn hiện tại, đơn vị trực thuộc được xác định rõ và có nền tảng hoạt động là Câu lạc bộ Tiếng Anh The Sky First (SFEC).',contentFormatted:'Trong giai đoạn hiện tại, đơn vị trực thuộc được xác định rõ và có nền tảng hoạt động là Câu lạc bộ Tiếng Anh The Sky First (SFEC).',isPublished:true,publishedAt:'08/09/2026',author:'Sky First Network',type:'custom',showInFooter:false},
  {id:'content-19',slug:'tham-gia-mang-luoi',title:'Tham gia Sky First Network',summary:'Các hình thức tham gia được công bố theo từng thời điểm.',content:'Người quan tâm có thể tham gia theo các chương trình, đợt tuyển thành viên, tình nguyện viên hoặc hình thức khác được công bố tại từng thời điểm.',contentFormatted:'Người quan tâm có thể tham gia theo các chương trình, đợt tuyển thành viên, tình nguyện viên hoặc hình thức khác được công bố tại từng thời điểm.',isPublished:true,publishedAt:'08/09/2026',author:'Sky First Network',type:'custom',showInFooter:false},
  {id:'content-21',slug:'hinh-thuc-hop-tac',title:'Các hình thức hợp tác',summary:'Những hướng hợp tác có thể đề xuất.',content:'Cá nhân và đơn vị có thể đề xuất hợp tác về giáo dục, chuyên môn, truyền thông, nguồn lực, sự kiện hoặc các hoạt động cộng đồng phù hợp.',contentFormatted:'Cá nhân và đơn vị có thể đề xuất hợp tác về giáo dục, chuyên môn, truyền thông, nguồn lực, sự kiện hoặc các hoạt động cộng đồng phù hợp.',isPublished:true,publishedAt:'08/09/2026',author:'Sky First Network',type:'custom',showInFooter:false},
  {id:'content-25',slug:'tai-lieu-cong-khai',title:'Tài liệu công khai',summary:'Tài liệu được phép chia sẻ công khai.',content:'Tài liệu công khai được quản lý theo trạng thái xuất bản. Tài liệu nội bộ không được tự động công khai.',contentFormatted:'Tài liệu công khai được quản lý theo trạng thái xuất bản. Tài liệu nội bộ không được tự động công khai.',isPublished:true,publishedAt:'08/09/2026',author:'Sky First Network',type:'custom',showInFooter:false},
  {id:'content-29',slug:'nhan-dien-thuong-hieu',title:'Logo & quy chuẩn nhận diện',summary:'Nguyên tắc sử dụng nhận diện Sky First Network và các đơn vị.',content:'Giữ nguyên tỷ lệ, màu sắc, đường nét và bố cục logo chính thức; không tự vẽ lại, đổi màu, bóp méo hoặc cắt mất thành phần quan trọng.',contentFormatted:'Giữ nguyên tỷ lệ, màu sắc, đường nét và bố cục logo chính thức; không tự vẽ lại, đổi màu, bóp méo hoặc cắt mất thành phần quan trọng.',isPublished:true,publishedAt:'08/09/2026',author:'Sky First Network',type:'custom',showInFooter:false},
  {id:'content-32',slug:'nguyen-tac-khong-cong-khai',title:'Nội dung không công khai',summary:'Nguyên tắc kiểm soát thông tin trước khi xuất bản.',content:'Không công khai dữ liệu cá nhân không cần thiết, thông tin nội bộ, chức danh chưa xác nhận, số liệu chưa kiểm chứng, đối tác chưa được phép hoặc dữ liệu thử nghiệm như dữ liệu thật.',contentFormatted:'Không công khai dữ liệu cá nhân không cần thiết, thông tin nội bộ, chức danh chưa xác nhận, số liệu chưa kiểm chứng, đối tác chưa được phép hoặc dữ liệu thử nghiệm như dữ liệu thật.',isPublished:true,publishedAt:'08/09/2026',author:'Sky First Network',type:'custom',showInFooter:false}
];

const mergedOfficialPages = [...BASE_CUSTOM_PAGES];
for (const official of OFFICIAL_CONTENT_PAGES_2026) {
  const index = mergedOfficialPages.findIndex((p) => p.slug === official.slug);
  if (index >= 0) mergedOfficialPages[index] = { ...mergedOfficialPages[index], ...official, id: mergedOfficialPages[index].id };
  else mergedOfficialPages.push(official);
}
const officialBySlug = (slug: string) => OFFICIAL_CONTENT_PAGES_2026.find((p) => p.slug === slug);
const aboutPage = mergedOfficialPages.find((p) => p.slug === 'about');
if (aboutPage) {
  const intro = officialBySlug('sky-first-network-la-gi');
  const vision = officialBySlug('tam-nhin');
  const mission = officialBySlug('su-menh');
  const values = officialBySlug('gia-tri-cot-loi');
  aboutPage.content = intro?.content || aboutPage.content;
  aboutPage.contentFormatted = intro?.contentFormatted || aboutPage.contentFormatted;
  aboutPage.summary = intro?.summary || aboutPage.summary;
  aboutPage.visionContent = vision?.content || aboutPage.visionContent;
  aboutPage.missionContent = mission?.content || aboutPage.missionContent;
  aboutPage.philosophyContent = values?.content || aboutPage.philosophyContent;
}
export const DEFAULT_CUSTOM_PAGES: CustomPage[] = mergedOfficialPages;

const mergeOfficialPages = (incoming: CustomPage[]): CustomPage[] => {
  const bySlug = new Map<string, CustomPage>();
  for (const page of incoming) bySlug.set(page.slug, page);

  for (const baseline of DEFAULT_CUSTOM_PAGES.filter(page=>!isCMSDocumentExcluded('custom_pages',page.id))) {
    const existing = bySlug.get(baseline.slug);
    if (!existing) {
      bySlug.set(baseline.slug, baseline);
      continue;
    }
    if (OFFICIAL_MANAGED_SLUGS.has(baseline.slug)) {
      bySlug.set(baseline.slug, { ...baseline, ...existing, id: existing.id || baseline.id });
    }
  }

  return Array.from(bySlug.values());
};

export interface DataContextType {
  siteConfig: SiteConfig;
  networkUnits: NetworkUnit[];
  programs: Program[];
  newsArticles: NewsArticle[];
  certificates: Record<string, Certificate>;
  timeline: TimelineMilestone[];
  corePillars: CorePillar[];
  teamMembers: TeamMember[];
  faqs: FAQItem[];
  customPages: CustomPage[];
  adminUsers: AdminUser[];

  // Update methods
  updateSiteConfig: (updates: Partial<SiteConfig>) => Promise<boolean>;
  
  // Admin Users
  addAdminUser: (user: AdminUser) => void;
  updateAdminUser: (id: string, updates: Partial<AdminUser>) => void;
  deleteAdminUser: (id: string) => void;
  
  // Units
  updateNetworkUnit: (id: string, updates: Partial<NetworkUnit>) => Promise<boolean>;
  addNetworkUnit: (unit: NetworkUnit) => Promise<boolean>;
  deleteNetworkUnit: (id: string) => Promise<boolean>;

  // Programs
  updateProgram: (id: string, updates: Partial<Program>) => Promise<boolean>;
  addProgram: (program: Program) => Promise<boolean>;
  deleteProgram: (id: string) => Promise<boolean>;

  // News
  updateNewsArticle: (id: string, updates: Partial<NewsArticle>) => Promise<boolean>;
  addNewsArticle: (article: NewsArticle) => Promise<boolean>;
  deleteNewsArticle: (id: string) => Promise<boolean>;

  // Certificates
  updateCertificate: (code: string, updates: Partial<Certificate>) => void;
  addCertificate: (certificate: Certificate) => void;
  deleteCertificate: (code: string) => void;

  // Custom Pages
  updateCustomPage: (id: string, updates: Partial<CustomPage>) => Promise<boolean>;
  addCustomPage: (page: CustomPage) => Promise<boolean>;
  deleteCustomPage: (id: string) => Promise<boolean>;

  // Core Pillars
  updateCorePillar: (index: number, updates: Partial<CorePillar>) => void;

  // Team
  updateTeamMember: (index: number, updates: Partial<TeamMember>) => void;
  addTeamMember: (member: TeamMember) => void;
  deleteTeamMember: (index: number) => void;

  // FAQs
  updateFAQ: (index: number, updates: Partial<FAQItem>) => void;
  addFAQ: (faq: FAQItem) => void;
  deleteFAQ: (index: number) => void;

  // Timeline
  updateTimeline: (index: number, updates: Partial<TimelineMilestone>) => void;
  addTimeline: (milestone: TimelineMilestone) => void;
  deleteTimeline: (index: number) => void;

  // Tools
  resetToDefaults: () => void;
  exportDataJSON: () => string;
  importDataJSON: (jsonString: string) => boolean;

  // Firebase Database Sync
  isFirebaseConfigured: boolean;
  isFirebaseSyncing: boolean;
  isPublicDataReady: boolean;
  firebaseSyncStatus: 'synced' | 'syncing' | 'error' | 'not_configured' | 'idle';
  firebaseSyncMessage: string;
  uploadAllDataToFirestore: () => Promise<{ success: boolean; message: string }>;
  fetchDataFromFirestore: () => Promise<{ success: boolean; message: string }>;
}

const DataContext = createContext<DataContextType | null>(null);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Cloud data is authoritative. Bundled defaults are only the initial render/fallback;
  // browser storage is deliberately not used as a second CMS database.
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const siteConfigRef = useRef<SiteConfig>(DEFAULT_SITE_CONFIG);
  useEffect(() => { siteConfigRef.current = siteConfig; }, [siteConfig]);
  const [networkUnits, setNetworkUnits] = useState<NetworkUnit[]>(DEFAULT_NETWORK_UNITS);
  const [programs, setPrograms] = useState<Program[]>(DEFAULT_PROGRAMS);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>(DEFAULT_NEWS);
  const [certificates, setCertificates] = useState<Record<string, Certificate>>(DEFAULT_CERTIFICATES);
  const [timeline, setTimeline] = useState<TimelineMilestone[]>(DEFAULT_TIMELINE);
  const [corePillars, setCorePillars] = useState<CorePillar[]>(DEFAULT_PILLARS);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(DEFAULT_TEAM);
  const [faqs, setFaqs] = useState<FAQItem[]>(DEFAULT_FAQS);
  const [customPages, setCustomPages] = useState<CustomPage[]>(DEFAULT_CUSTOM_PAGES);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(DEFAULT_ADMIN_USERS);

  // ==========================================
  // FIREBASE FIRESTORE SYNC STATE & LOGIC
  // ==========================================
  // Coalesce rapid editor keystrokes into one cloud write per document.
  // Publish/delete actions bypass this queue and await the server before reporting success.
  const pendingCloudWrites = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const scheduleCloudSync = (collectionName: string, docId: string, data: unknown) => {
    if (!isFirebaseConfigured || !db) return;
    const key = `${collectionName}/${docId}`;
    const previous = pendingCloudWrites.current.get(key);
    if (previous) clearTimeout(previous);
    const timer = setTimeout(() => {
      pendingCloudWrites.current.delete(key);
      void syncDocumentToFirestore(collectionName, docId, data).then(ok=>{setFirebaseSyncStatus(ok?'synced':'error');setFirebaseSyncMessage(ok?'Đã lưu nội dung lên máy chủ.':'Chưa lưu được nội dung. Giữ trang này và thử Lưu lại.');});
    }, 700);
    pendingCloudWrites.current.set(key, timer);
  };
  const cancelPendingCloudSync = (collectionName: string, docId: string) => {
    const key = `${collectionName}/${docId}`;
    const timer = pendingCloudWrites.current.get(key);
    if (timer) clearTimeout(timer);
    pendingCloudWrites.current.delete(key);
  };

  const [isFirebaseSyncing, setIsFirebaseSyncing] = useState(false);
  const [isPublicDataReady, setIsPublicDataReady] = useState(false);
  const [firebaseSyncStatus, setFirebaseSyncStatus] = useState<
    'synced' | 'syncing' | 'error' | 'not_configured' | 'idle'
  >(isFirebaseConfigured ? 'idle' : 'not_configured');
  const [firebaseSyncMessage, setFirebaseSyncMessage] = useState<string>(
    isFirebaseConfigured
      ? 'Dịch vụ dữ liệu sẵn sàng'
      : 'Dịch vụ dữ liệu chưa sẵn sàng'
  );

  const uploadAllDataToFirestore = async (): Promise<{ success: boolean; message: string }> => {
    if (!isFirebaseConfigured || !db) {
      return {
        success: false,
        message: 'Dịch vụ đồng bộ dữ liệu chưa được cấu hình.',
      };
    }

    setIsFirebaseSyncing(true);
    setFirebaseSyncStatus('syncing');
    setFirebaseSyncMessage('Đang đồng bộ dữ liệu lên máy chủ...');

    try {
      // 1. Site Config
      if (!(await syncDocumentToFirestore('site_config', 'current', siteConfig))) throw new Error('SYNC_FAILED');

      // 2. Core pillars
      if (!(await syncDocumentToFirestore('cms_modules', 'core_pillars', { items: corePillars }))) throw new Error('SYNC_FAILED');

      // 3. Custom Pages
      for (const page of customPages) {
        if (!(await syncDocumentToFirestore('custom_pages', page.id, page))) throw new Error('SYNC_FAILED');
      }

      // 4. Programs
      for (const program of programs) {
        if (!(await syncDocumentToFirestore('programs', program.id, program))) throw new Error('SYNC_FAILED');
      }

      // 5. Network Units
      for (const unit of networkUnits) {
        if (!(await syncDocumentToFirestore('network_units', unit.id, unit))) throw new Error('SYNC_FAILED');
      }

      // 6. News Articles
      for (const article of newsArticles) {
        if (!(await syncDocumentToFirestore('news_articles', article.id, article))) throw new Error('SYNC_FAILED');
      }

      // 7. Remaining public CMS modules
      if (!(await syncDocumentToFirestore('cms_modules', 'timeline', { items: timeline }))) throw new Error('SYNC_FAILED');
      if (!(await syncDocumentToFirestore('cms_modules', 'team_members', { items: teamMembers }))) throw new Error('SYNC_FAILED');
      if (!(await syncDocumentToFirestore('cms_modules', 'faqs', { items: faqs }))) throw new Error('SYNC_FAILED');
      for (const certificate of Object.values(certificates) as Certificate[]) {
        if (!(await syncDocumentToFirestore('certificates', certificate.code, certificate))) throw new Error('SYNC_FAILED');
      }

      // Admin accounts are managed by the dedicated D1 admin-auth API, never by the CMS store.

      setIsFirebaseSyncing(false);
      setFirebaseSyncStatus('synced');
      const msg = `Đã lưu lên D1 thành công: ${customPages.length} trang, ${programs.length} chương trình, ${networkUnits.length} đơn vị, ${newsArticles.length} bài viết!`;
      setFirebaseSyncMessage(msg);
      return { success: true, message: msg };
    } catch (error: any) {
      setIsFirebaseSyncing(false);
      setFirebaseSyncStatus('error');
      const errMsg = 'Không thể lưu dữ liệu lên máy chủ. Vui lòng thử lại.';
      setFirebaseSyncMessage(errMsg);
      return { success: false, message: errMsg };
    }
  };

  const fetchDataFromFirestore = async (): Promise<{ success: boolean; message: string }> => {
    if (!isFirebaseConfigured || !db) {
      return {
        success: false,
        message: 'Dịch vụ đồng bộ dữ liệu chưa được cấu hình.',
      };
    }

    setIsFirebaseSyncing(true);
    setFirebaseSyncStatus('syncing');
    setFirebaseSyncMessage('Đang tải dữ liệu mới nhất...');

    try {
      // 1. Site Config
      const configData = await fetchDocumentFromFirestore<SiteConfig>('site_config','current');
      if (configData) {
        setSiteConfig((prev) => ({
          ...prev,
          ...configData,
          homeSections: { ...prev.homeSections, ...(configData.homeSections || {}) },
          homeSectionOrder: normalizeHomeSectionOrder(configData.homeSectionOrder),
        }));
      }

      // 2. Core pillars: read from the server; never overwrite remote data during a fetch
      const pillarsSnap = await fetchDocumentFromFirestore<any>('cms_modules','core_pillars');
      if (pillarsSnap) {
        const items = pillarsSnap?.items;
        if (Array.isArray(items)) setCorePillars(items as CorePillar[]);
      }

      // 3. Custom Pages
      const pages = await fetchCollectionFromFirestore<CustomPage>('custom_pages');
      if (pages.length > 0 || isCMSCollectionInitialized('custom_pages')) {
        setCustomPages(mergeOfficialPages(pages));
      }

      // 4. Programs
      const progs = await fetchCollectionFromFirestore<Program>('programs');
      if (progs.length > 0 || isCMSCollectionInitialized('programs')) {
        setPrograms(progs);
      }

      // 5. Network Units
      const units = await fetchCollectionFromFirestore<NetworkUnit>('network_units');
      if (units.length > 0 || isCMSCollectionInitialized('network_units')) {
        setNetworkUnits(mergeCMSCollection('network_units',DEFAULT_NETWORK_UNITS,units));
      }

      // 6. News Articles
      const news = await fetchCollectionFromFirestore<NewsArticle>('news_articles');
      if (news.length > 0 || isCMSCollectionInitialized('news_articles')) {
        setNewsArticles(news);
      }

      // Admin directory is intentionally not loaded through the CMS endpoint.

      setIsFirebaseSyncing(false);
      setFirebaseSyncStatus('synced');
      const msg = 'Đã tải dữ liệu mới nhất.';
      setFirebaseSyncMessage(msg);
      return { success: true, message: msg };
    } catch (error: any) {
      setIsFirebaseSyncing(false);
      setFirebaseSyncStatus('error');
      const errMsg = 'Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại.';
      setFirebaseSyncMessage(errMsg);
      return { success: false, message: errMsg };
    }
  };

  // Realtime snapshots are ignored until the initial server read finishes.
  // This prevents a cached/stale first snapshot from replacing newer initial state.
  const remoteReadyRef = useRef(false);

  // Nạp dữ liệu public theo một bundle duy nhất để giảm số lần đọc D1 trên mỗi lần mở trang.
  // Public response có cache ở edge; Admin có token vẫn nhận dữ liệu mới nhất.
  useEffect(() => {
    let isMounted = true;
    const loadD1Data = async () => {
      try {
        setIsFirebaseSyncing(true); setFirebaseSyncStatus('syncing'); setFirebaseSyncMessage('Đang đồng bộ dữ liệu website...');
        const bundle = await fetchCMSBundle();
        if (!isMounted) return;
        const first = (name:string) => Array.isArray(bundle?.[name]?.items) ? bundle[name].items : [];
        const configItems = first('site_config');
        const moduleItems = first('cms_modules');
        const findModule = (id:string) => moduleItems.find((item:any) => item?.id === id);
        const remoteConfig = configItems.find((item:any) => item?.id === 'current') || configItems[0];
        if(remoteConfig) setSiteConfig(prev=>({...prev,...remoteConfig,homeSections:{...prev.homeSections,...(remoteConfig.homeSections||{})},homeSectionOrder:normalizeHomeSectionOrder(remoteConfig.homeSectionOrder)}));
        const pillars=findModule('core_pillars'); if(Array.isArray(pillars?.items)) setCorePillars(pillars.items);
        const timelineData=findModule('timeline'); if(Array.isArray(timelineData?.items)) setTimeline(timelineData.items);
        const teamData=findModule('team_members'); if(Array.isArray(teamData?.items)) setTeamMembers(teamData.items);
        const faqsData=findModule('faqs'); if(Array.isArray(faqsData?.items)) setFaqs(faqsData.items);
        const remotePages=first('custom_pages') as CustomPage[];
        const remotePrograms=first('programs') as Program[];
        const remoteUnits=first('network_units') as NetworkUnit[];
        const remoteNews=first('news_articles') as NewsArticle[];
        if(remotePages.length || isCMSCollectionInitialized('custom_pages')) setCustomPages(mergeOfficialPages(remotePages));
        if(remotePrograms.length || isCMSCollectionInitialized('programs')) setPrograms(remotePrograms);
        if(remoteUnits.length || isCMSCollectionInitialized('network_units')) setNetworkUnits(mergeCMSCollection('network_units',DEFAULT_NETWORK_UNITS,remoteUnits));
        if(remoteNews.length || isCMSCollectionInitialized('news_articles')) setNewsArticles(remoteNews);
        remoteReadyRef.current=true; setFirebaseSyncStatus('synced'); setFirebaseSyncMessage('Đã đồng bộ dữ liệu.');
      } catch {
        if(isMounted){setFirebaseSyncStatus('error');setFirebaseSyncMessage('Không thể kết nối dịch vụ dữ liệu lúc này.');}
      } finally {
        if(isMounted){setIsFirebaseSyncing(false);setIsPublicDataReady(true);}
      }
    };
    void loadD1Data();
    const timer=window.setInterval(()=>{ if(document.visibilityState==='visible'&&!auth?.currentUser&&pendingCloudWrites.current.size===0) void loadD1Data(); },60000);
    return()=>{isMounted=false;window.clearInterval(timer)};
  }, []);

  // Methods
  const updateSiteConfig = async (updates: Partial<SiteConfig>): Promise<boolean> => {
    const prev = siteConfigRef.current;
    const next: SiteConfig = {
      ...prev,
      ...updates,
      stats: updates.stats ? { ...prev.stats, ...updates.stats } : prev.stats,
      contact: updates.contact ? { ...prev.contact, ...updates.contact } : prev.contact,
    };
    if (isFirebaseConfigured && db) {
      const ok = await syncDocumentToFirestore('site_config', 'current', next);
      if (!ok) return false;
    }
    siteConfigRef.current = next;
    setSiteConfig(next);
    return true;
  };

  const updateNetworkUnit = async (id: string, updates: Partial<NetworkUnit>): Promise<boolean> => {
    const current = networkUnits.find((u) => u.id === id); if (!current) return false;
    const target = { ...current, ...updates };
    setNetworkUnits(prev => prev.map(u => u.id === id ? target : u));
    if (Object.prototype.hasOwnProperty.call(updates, 'isPublished') && isFirebaseConfigured && db) {
      cancelPendingCloudSync('network_units', id);
      const ok=await syncDocumentToFirestore('network_units', id, target);if(!ok){setNetworkUnits(prev=>prev.map(item=>item.id===id?{...item,isPublished:current.isPublished}:item));}return ok;
    }
    scheduleCloudSync('network_units', id, target);
    return true;
  };
  const addNetworkUnit = async (unit: NetworkUnit): Promise<boolean> => {
    if (isFirebaseConfigured && db && !(await syncDocumentToFirestore('network_units', unit.id, unit))) return false;
    setNetworkUnits(prev => [unit, ...prev]); return true;
  };
  const deleteNetworkUnit = async (id: string): Promise<boolean> => {
    cancelPendingCloudSync('network_units', id);
    if (isFirebaseConfigured && db && !(await deleteDocumentFromFirestore('network_units', id))) return false;
    setNetworkUnits(prev => prev.filter(u => u.id !== id)); return true;
  };

  const slugChanged=(before?:string,after?:string)=>Boolean(before&&after&&before.replace(/^\/+|\/+$/g,'')!==after.replace(/^\/+|\/+$/g,''));

  const updateProgram = async (id: string, updates: Partial<Program>): Promise<boolean> => {
    const current = programs.find(p => p.id === id); if (!current) return false;
    const target={...current,...updates};
    const redirectNeeded=current.isPublished===true&&slugChanged((current as any).slug,(target as any).slug);
    setPrograms(prev=>prev.map(p=>p.id===id?target:p));
    if ((Object.prototype.hasOwnProperty.call(updates, 'isPublished')||redirectNeeded) && isFirebaseConfigured && db) {
      cancelPendingCloudSync('programs', id);
      const ok=await syncDocumentToFirestore('programs', id, target);
      if(!ok){setPrograms(prev=>prev.map(item=>item.id===id?current:item));return false;}
      if(redirectNeeded)try{await createPermanentRedirect(`/du-an/${(current as any).slug}`,`/du-an/${(target as any).slug}`,`Chuyển hướng chương trình: ${current.title}`)}catch{}
      return true;
    }
    scheduleCloudSync('programs', id, target);
    return true;
  };
  const addProgram = async (program: Program): Promise<boolean> => {
    if (isFirebaseConfigured && db && !(await syncDocumentToFirestore('programs', program.id, program))) return false;
    setPrograms(prev=>[program,...prev]); return true;
  };
  const deleteProgram = async (id: string): Promise<boolean> => {
    cancelPendingCloudSync('programs', id);
    if (isFirebaseConfigured && db && !(await deleteDocumentFromFirestore('programs', id))) return false;
    setPrograms(prev=>prev.filter(p=>p.id!==id)); return true;
  };

  const updateNewsArticle = async (id: string, updates: Partial<NewsArticle>): Promise<boolean> => {
    const current = newsArticles.find((item) => item.id === id); if (!current) return false;
    const target = { ...current, ...updates };
    const redirectNeeded=current.isPublished===true&&slugChanged((current as any).slug,(target as any).slug);
    setNewsArticles((prev) => prev.map((item) => (item.id === id ? target : item)));
    if ((Object.prototype.hasOwnProperty.call(updates, 'isPublished')||redirectNeeded) && isFirebaseConfigured && db) {
      cancelPendingCloudSync('news_articles', id);
      const ok=await syncDocumentToFirestore('news_articles', id, target);
      if(!ok){setNewsArticles(prev=>prev.map(item=>item.id===id?current:item));return false;}
      if(redirectNeeded)try{await createPermanentRedirect(`/tin-tuc/${(current as any).slug}`,`/tin-tuc/${(target as any).slug}`,`Chuyển hướng bài viết: ${current.title}`)}catch{}
      return true;
    }
    scheduleCloudSync('news_articles', id, target);
    return true;
  };

  const addNewsArticle = async (article: NewsArticle): Promise<boolean> => {
    if (isFirebaseConfigured && db && !(await syncDocumentToFirestore('news_articles', article.id, article))) return false;
    setNewsArticles(prev=>[article,...prev]); return true;
  };
  const deleteNewsArticle = async (id: string): Promise<boolean> => {
    cancelPendingCloudSync('news_articles', id);
    if (isFirebaseConfigured && db && !(await deleteDocumentFromFirestore('news_articles', id))) return false;
    setNewsArticles(prev=>prev.filter(a=>a.id!==id)); return true;
  };

  const updateCertificate = (code: string, updates: Partial<Certificate>) => {
    setCertificates((prev) => {
      const existing = prev[code]; if (!existing) return prev;
      const target = { ...existing, ...updates };
      if (isFirebaseConfigured && db) void syncDocumentToFirestore('certificates', code, target);
      return { ...prev, [code]: target };
    });
  };

  const addCertificate = (certificate: Certificate) => {
    setCertificates((prev) => ({ ...prev, [certificate.code]: certificate }));
    if (isFirebaseConfigured && db) void syncDocumentToFirestore('certificates', certificate.code, certificate);
  };

  const deleteCertificate = (code: string) => {
    setCertificates((prev) => {
      const next = { ...prev };
      delete next[code];
      if (isFirebaseConfigured && db) void deleteDocumentFromFirestore('certificates', code);
      return next;
    });
  };

  const updateCorePillar = (index: number, updates: Partial<CorePillar>) => {
    setCorePillars((prev) => {
      const next = prev.map((p, i) => (i === index ? { ...p, ...updates } : p));
      if (isFirebaseConfigured && db) {
        syncDocumentToFirestore('cms_modules', 'core_pillars', { items: next });
      }
      return next;
    });
  };

  const persistModule = (id: string, items: unknown[]) => { if (isFirebaseConfigured && db) void syncDocumentToFirestore('cms_modules', id, { items }); };
  const updateTeamMember = (index: number, updates: Partial<TeamMember>) => setTeamMembers(prev => { const next=prev.map((m,i)=>i===index?{...m,...updates}:m); persistModule('team_members',next); return next; });
  const addTeamMember = (member: TeamMember) => setTeamMembers(prev => { const next=[...prev,member]; persistModule('team_members',next); return next; });
  const deleteTeamMember = (index: number) => setTeamMembers(prev => { const next=prev.filter((_,i)=>i!==index); persistModule('team_members',next); return next; });
  const updateFAQ = (index: number, updates: Partial<FAQItem>) => setFaqs(prev => { const next=prev.map((f,i)=>i===index?{...f,...updates}:f); persistModule('faqs',next); return next; });
  const addFAQ = (faq: FAQItem) => setFaqs(prev => { const next=[...prev,faq]; persistModule('faqs',next); return next; });
  const deleteFAQ = (index: number) => setFaqs(prev => { const next=prev.filter((_,i)=>i!==index); persistModule('faqs',next); return next; });
  const updateTimeline = (index: number, updates: Partial<TimelineMilestone>) => setTimeline(prev => { const next=prev.map((t,i)=>i===index?{...t,...updates}:t); persistModule('timeline',next); return next; });
  const addTimeline = (milestone: TimelineMilestone) => setTimeline(prev => { const next=[...prev,milestone]; persistModule('timeline',next); return next; });
  const deleteTimeline = (index: number) => setTimeline(prev => { const next=prev.filter((_,i)=>i!==index); persistModule('timeline',next); return next; });

  // Custom Page methods
  const updateCustomPage = async (id: string, updates: Partial<CustomPage>): Promise<boolean> => {
    const current = customPages.find((item) => item.id === id); if (!current) return false;
    const target = { ...current, ...updates };
    const redirectNeeded=current.isPublished===true&&slugChanged(current.slug,target.slug);
    setCustomPages((prev) => prev.map((item) => (item.id === id ? target : item)));
    if ((Object.prototype.hasOwnProperty.call(updates, 'isPublished')||redirectNeeded) && isFirebaseConfigured && db) {
      cancelPendingCloudSync('custom_pages', id);
      const ok=await syncDocumentToFirestore('custom_pages', id, target);
      if(!ok){setCustomPages(prev=>prev.map(item=>item.id===id?current:item));return false;}
      if(redirectNeeded)try{await createPermanentRedirect(`/${current.slug}`,`/${target.slug}`,`Chuyển hướng trang: ${current.title}`)}catch{}
      return true;
    }
    scheduleCloudSync('custom_pages', id, target);
    return true;
  };

  const addCustomPage = async (page: CustomPage): Promise<boolean> => {
    if (isFirebaseConfigured && db && !(await syncDocumentToFirestore('custom_pages', page.id, page))) return false;
    setCustomPages(prev=>[page,...prev]); return true;
  };
  const deleteCustomPage = async (id: string): Promise<boolean> => {
    cancelPendingCloudSync('custom_pages', id);
    if (isFirebaseConfigured && db && !(await deleteDocumentFromFirestore('custom_pages', id))) return false;
    setCustomPages(prev=>prev.filter(p=>p.id!==id)); return true;
  };

  // Admin User methods
  const addAdminUser = (user: AdminUser) => {
    const email = user.email.trim().toLowerCase();
    const pending = user.id.startsWith('invite:');
    const normalized = pending ? { ...user, id: `invite:${email}`, email } : { ...user, email };
    setAdminUsers((prev) => [normalized, ...prev.filter((u) => u.id !== normalized.id)]);
    if (isFirebaseConfigured && db) {
      if (pending) syncDocumentToFirestore('admin_invites', email, { email, name:user.name, role:user.role, status:user.status, note:user.note || '', createdAt:user.createdAt });
      else syncDocumentToFirestore('admin_users', user.id, normalized);
    }
  };

  const updateAdminUser = (id: string, updates: Partial<AdminUser>) => {
    setAdminUsers((prev) => {
      const next = prev.map((u) => (u.id === id ? { ...u, ...updates } : u));
      const target = next.find((u) => u.id === id);
      if (target && isFirebaseConfigured && db) {
        if (id.startsWith('invite:')) {
          const email = target.email.trim().toLowerCase();
          syncDocumentToFirestore('admin_invites', email, { email, name:target.name, role:target.role, status:target.status, note:target.note || '', createdAt:target.createdAt });
        } else syncDocumentToFirestore('admin_users', id, target);
      }
      return next;
    });
  };

  const deleteAdminUser = (id: string) => {
    setAdminUsers((prev) => {
      const target = prev.find((u) => u.id === id);
      if (isFirebaseConfigured && db) {
        if (id.startsWith('invite:') && target) deleteDocumentFromFirestore('admin_invites', target.email.trim().toLowerCase());
        else deleteDocumentFromFirestore('admin_users', id);
      }
      return prev.filter((u) => u.id !== id);
    });
  };

  const resetToDefaults = () => {
    setSiteConfig(DEFAULT_SITE_CONFIG);
    setNetworkUnits(DEFAULT_NETWORK_UNITS);
    setPrograms(DEFAULT_PROGRAMS);
    setNewsArticles(DEFAULT_NEWS);
    setCertificates(DEFAULT_CERTIFICATES);
    setTimeline(DEFAULT_TIMELINE);
    setCorePillars(DEFAULT_PILLARS);
    setTeamMembers(DEFAULT_TEAM);
    setFaqs(DEFAULT_FAQS);
    setCustomPages(DEFAULT_CUSTOM_PAGES);
    setAdminUsers(DEFAULT_ADMIN_USERS);
  };

  const exportDataJSON = () => {
    const fullData = {
      siteConfig,
      networkUnits,
      programs,
      newsArticles,
      certificates,
      timeline,
      corePillars,
      teamMembers,
      faqs,
      customPages,
      exportedAt: new Date().toISOString(),
      version: '2.0',
    };
    return JSON.stringify(fullData, null, 2);
  };

  const importDataJSON = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.siteConfig) setSiteConfig(data.siteConfig);
      if (data.networkUnits) setNetworkUnits(data.networkUnits);
      if (data.programs) setPrograms(data.programs);
      if (data.newsArticles) setNewsArticles(data.newsArticles);
      if (data.certificates) setCertificates(data.certificates);
      if (data.timeline) setTimeline(data.timeline);
      if (data.corePillars) setCorePillars(data.corePillars);
      if (data.teamMembers) setTeamMembers(data.teamMembers);
      if (data.faqs) setFaqs(data.faqs);
      if (data.customPages) setCustomPages(data.customPages);
      return true;
    } catch (e) {
      console.error('Failed to import JSON', e);
      return false;
    }
  };

  return (
    <DataContext.Provider
      value={{
        siteConfig,
        networkUnits,
        programs,
        newsArticles,
        certificates,
        timeline,
        corePillars,
        teamMembers,
        faqs,
        customPages,
        adminUsers,
        updateSiteConfig,
        addAdminUser,
        updateAdminUser,
        deleteAdminUser,
        updateNetworkUnit,
        addNetworkUnit,
        deleteNetworkUnit,
        updateProgram,
        addProgram,
        deleteProgram,
        updateNewsArticle,
        addNewsArticle,
        deleteNewsArticle,
        updateCertificate,
        addCertificate,
        deleteCertificate,
        updateCustomPage,
        addCustomPage,
        deleteCustomPage,
        updateCorePillar,
        updateTeamMember,
        addTeamMember,
        deleteTeamMember,
        updateFAQ,
        addFAQ,
        deleteFAQ,
        updateTimeline,
        addTimeline,
        deleteTimeline,
        resetToDefaults,
        exportDataJSON,
        importDataJSON,
        isFirebaseConfigured,
        isFirebaseSyncing,
        isPublicDataReady,
        firebaseSyncStatus,
        firebaseSyncMessage,
        uploadAllDataToFirestore,
        fetchDataFromFirestore,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
};
