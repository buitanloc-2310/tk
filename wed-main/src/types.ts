/// <reference types="vite/client" />
export type PageRoute =
  | 'home'
  | 'about'
  | 'programs'
  | 'units'
  | 'sponsor'
  | 'contact'
  | 'news'
  | 'certificate'
  | 'join'
  | 'admin'
  | 'program-detail'
  | 'news-detail'
  | 'custom-page';

export type ProgramCategory = 'all' | 'education' | 'volunteer' | 'recruitment' | 'workshop';
export type ProgramStatus = 'open' | 'upcoming' | 'closed';

export type AdminUserRole = 'developer' | 'admin' | 'editor';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminUserRole;
  createdAt: string;
  status: 'active' | 'inactive';
  permissions?: string[];
  note?: string;
  lastLogin?: string;
  is_root_owner?: number | boolean;
}

export type SiteClosedReason = 'maintenance' | 'editing' | 'upgrading' | 'custom';

export interface CounterAnimationConfig {
  durationSeconds?: number;
  mode?: 'smooth' | 'even' | 'large' | 'small' | 'custom';
  step?: number;
  easing?: 'linear' | 'ease-out' | 'smooth';
  fontSize?: 'small' | 'medium' | 'large' | 'xlarge' | 'custom';
  customFontSize?: string;
  prefix?: string;
  suffix?: string;
  numberFormat?: 'vi' | 'plain' | 'en';
}

export interface IntroConfig {
  enabled?: boolean;
  videoUrl?: string;
  logoUrl?: string;
  durationSeconds?: number;
  logoRevealSeconds?: number;
  skipLabel?: string;
  tagline?: string;
  transitionStyle?: 'fade' | 'zoom' | 'minimal';
}

export interface EmailConfig {
  senderName?: string;
  fromAddress?: string;
  replyToAddress?: string;
  adminNotifyAddress?: string;
  provider?: 'none' | 'resend' | 'custom_webhook' | 'cloudflare_email' | 'webhook';
  mode?: 'live' | 'test';
  enabled?: boolean;
  senderEmail?: string;
  replyToEmail?: string;
  adminRecipientEmails?: string;
  apiKeyMasked?: string;
  sendOnProgramRegistration?: boolean;
  sendAdminAlertOnRegistration?: boolean;
  sendOnContactSubmission?: boolean;
  sendOnStatusChange?: boolean;
  retryMaxAttempts?: number;
  rateLimitPerHour?: number;
  brandColor?: string;
  footerText?: string;
}

export interface AutomationConfig {
  autoSaveDrafts?: boolean;
  autoSaveIntervalSeconds?: number;
  warnUnsavedChanges?: boolean;
  createRevisionBeforePublish?: boolean;
  enableScheduledPublishing?: boolean;
  autoCloseExpiredForms?: boolean;
  autoUpdateSitemap?: boolean;
  reviewCycleDays?: number;
  notifyEditorialChanges?: boolean;
  aiAssistEnabled?: boolean;
}

export interface SeoGlobalConfig {
  defaultTitleSuffix?: string;
  defaultDescription?: string;
  defaultOgImageUrl?: string;
  canonicalDomain?: string;
  robotsIndexing?: 'allow' | 'noindex';
  organizationType?: string;
  autoGenerateMeta?: boolean;
}

export interface SiteConfig {
  siteName: string;
  tagline: string;
  siteDescription?: string;
  heroBadge: string;
  heroHeading: string;
  heroSubtext: string;
  heroImageUrl?: string;
  heroImageFit?: 'original' | 'contain' | 'cover';
  logoUrl?: string;
  email?: string;
  hotline?: string;
  address?: string;
  siteStatus?: 'active' | 'closed';
  closedReason?: SiteClosedReason;
  closedReasonText?: string;
  closedMessage?: string;
  closedEstimatedReopen?: string;
  closedNoticeType?: 'banner' | 'lockscreen';
  intro?: IntroSettings;
  emailSettings?: EmailSystemSettings;
  automationSettings?: AutomationSystemSettings;
  seoSettings?: SeoSystemSettings;
  stats: {
    membersCount: string;
    membersSubtext: string;
    membersLabel?: string;
    provincesCount: string;
    provincesSubtext: string;
    provincesLabel?: string;
    volunteerHours: string;
    hoursSubtext: string;
    hoursLabel?: string;
    communityProjects: string;
    projectsSubtext: string;
    projectsLabel?: string;
  };
  counterAnimation?: {
    membersCount?: CounterAnimationConfig;
    communityProjects?: CounterAnimationConfig;
    provincesCount?: CounterAnimationConfig;
    volunteerHours?: CounterAnimationConfig;
  };
  taxonomyCategories?: { id: string; label: string; visible?: boolean }[];
  contactRouting?: { topic: string; email: string; label?: string }[];
  pillarsHeading?: string;
  pillarsSubtext?: string;
  contact: {
    mainEmail: string;
    contactEmail: string;
    phoneHotline: string;
    phoneExternal: string;
    workHoursWeekdays: string;
    workHoursSaturday: string;
    facebookUrl: string;
    linkedinUrl: string;
  };
  unitsBannerHeading: string;
  unitsBannerSubtext: string;
  ctaHeading: string;
  ctaSubtext: string;
  ctaButtonText?: string;
  ctaButtonUrl?: string;
  ctaSecondaryButtonText?: string;
  ctaSecondaryButtonUrl?: string;
  heroButton1Text?: string;
  heroButton1Url?: string;
  heroButton2Text?: string;
  heroButton2Url?: string;
  heroButton3Text?: string;
  heroButton3Url?: string;
  homeSections?: {
    hero?: boolean;
    direction?: boolean;
    pillars?: boolean;
    programs?: boolean;
    units?: boolean;
    certificate?: boolean;
    values?: boolean;
    news?: boolean;
    transparency?: boolean;
    cta?: boolean;
  };
  homeSectionOrder?: string[];
  directionLabel?: string;
  directionText?: string;
  pillarsIntro?: string;
  programsLabel?: string;
  programsHeading?: string;
  unitsLabel?: string;
  unitsHeading?: string;
  unitsIntro?: string;
  certificateLabel?: string;
  certificateHeading?: string;
  certificateText?: string;
  certificateButtonText?: string;
  certificateButtonUrl?: string;
  valuesLabel?: string;
  valuesHeading?: string;
  coreValues?: { name: string; desc: string }[];
  directionPillarsCount?: string;
  directionPillarsLabel?: string;
  directionValuesCount?: string;
  directionValuesLabel?: string;
  newsLabel?: string;
  newsHeading?: string;
  transparencyHeading?: string;
  transparencyText?: string;
  transparencyButtonText?: string;
  transparencyButtonUrl?: string;
  footerSlogan?: string;
  footerAboutText?: string;
  footerCopyright?: string;
  footerCertBadgeText?: string;
  footerUnitsBadgeText?: string;
  footerSocialFacebook?: string;
  footerSocialInstagram?: string;
  footerSocialTiktok?: string;
  footerSocialLinkedin?: string;
  footerSocialYoutube?: string;
  footerSocialZalo?: string;
  navigationGroups?: { label: string; items: { label: string; page: PageRoute; slug?: string; description?: string }[] }[];
  footerQuickLinks?: { label: string; url: string }[];
  footerContacts?: { label: string; value: string; url: string; icon?: string }[];
  footerPortals?: { label: string; domain: string; url: string; icon?: string; description?: string }[];
  footerLegalLinks?: { label: string; url: string }[];
  organizationInfo?: { label: string; value: string; url?: string; icon?: string; visible?: boolean }[];
  designSystem?: { primary?: string; navy?: string; accent?: string; radius?: string; container?: string; fontFamily?: string; spacing?: 'compact' | 'normal' | 'relaxed'; motion?: 'reduced' | 'balanced' | 'rich'; defaultImageDisplay?: 'original' | 'contain' | 'cover' };
  announcement?: { enabled?: boolean; text?: string; buttonLabel?: string; buttonUrl?: string; startAt?: string; endAt?: string; tone?: 'info' | 'success' | 'warning' };
  reusableBlockTemplates?: PageBlock[];
}

export interface NetworkUnit {
  id: string;
  code: string;
  name: string;
  tagline: string;
  slug?: string;
  isPublished?: boolean;
  category: string;
  categoryLabel: string;
  leader: {
    name: string;
    title: string;
    color?: string;
  };
  description: string;
  mission: string;
  functions: string[];
  keyProjects: string[];
  contact: {
    address: string;
    email: string;
    phone: string;
    portal?: string;
  };
  theme: string;
  badgeColor?: string;
  imageDescription: string;
  imageSizeText: string;
  imageUrl?: string;
  isFlagship?: boolean;
}

export interface Program {
  id: string;
  slug?: string;
  isPublished?: boolean;
  title: string;
  category: string;
  categoryLabel: string;
  status: ProgramStatus;
  statusLabel: string;
  summary: string;
  description: string;
  imageSizeText: string;
  imageDescription: string;
  imageUrl?: string;
  imageFit?: 'original' | 'contain' | 'cover';
  galleryImages?: string[];
  formId?: string;
  formSlug?: string;
  registrationEnabled?: boolean;
  registrationOpenAt?: string;
  registrationCloseAt?: string;
  registrationAutoAccept?: boolean;
  registrationReceiptSubject?: string;
  registrationReceiptBody?: string;
  registrationAcceptedSubject?: string;
  registrationAcceptedBody?: string;
  theme: string;
  categoryColor?: string;
  statusColor?: string;
  date: string;
  location: string;
  targetAudience: string;
  spotsLeft?: number;
  timeline: string[];
  benefits: string[];
  requirements: string[];
  campaignType?: 'program' | 'campaign' | 'event' | 'opportunity';
  startAt?: string;
  endAt?: string;
  goalValue?: number;
  currentValue?: number;
  goalLabel?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  partnerNames?: string[];
  impactMetrics?: { value: string; label: string }[];
  updates?: { date: string; title: string; body: string }[];
  publicReportUrl?: string;
}

export interface NewsArticle {
  id: string;
  slug?: string;
  isPublished?: boolean;
  editorialStatus?: 'draft' | 'pending_review' | 'approved' | 'published';
  scheduledPublishAt?: string;
  title: string;
  category: 'event' | 'community' | 'training' | 'announcement' | string;
  categoryLabel: string;
  date: string;
  publishedAt?: string;
  author: string;
  readTime: string;
  summary: string;
  content: string[] | string;
  contentFormatted?: string;
  imageSizeText?: string;
  imageDescription?: string;
  imageUrl?: string;
  galleryImages?: string[];
  isFeatured?: boolean;
  theme?: string;
  categoryColor?: string;
  tags: string[];
  source?: string;
  allowComments?: boolean;
  pageBlocks?: PageBlock[];
  imageAlt?: string;
  imageCaption?: string;
  imageCredit?: string;
  imageSourceUrl?: string;
  heroImageMode?: '16:9' | 'original' | 'hidden';
  imageFit?: 'original' | 'contain' | 'cover';
  imageFocalX?: number;
  imageFocalY?: number;
  seoTitle?: string;
  seoDescription?: string;
  ogImageUrl?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
}

export interface Certificate {
  code: string;
  isPublished?: boolean;
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  programTitle: string;
  programType: 'Khóa Đào Tạo' | 'Chiến Dịch Tình Nguyện' | 'Chứng Nhận Cống Hiến' | 'Khen Thưởng Thành Tích';
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  status: 'valid' | 'test' | 'revoked';
  grade?: string;
  hoursCompleted?: number;
  certificateType?: string;
  sourceSystem?: string;
  role?: string;
  verificationUrl: string;
  signatory: {
    name: string;
    title: string;
  };
}

export interface GalleryItem {
  id: string;
  title: string;
  category: 'volunteer' | 'training' | 'workshop' | 'event';
  categoryLabel: string;
  imageUrl: string;
  date: string;
  location: string;
  description: string;
}

export interface TimelineMilestone {
  year: string;
  title: string;
  description: string;
  highlights: string[];
  isCurrent?: boolean;
}

export interface CorePillar {
  number: string;
  title: string;
  shortDesc: string;
  fullDesc: string;
  iconName: string;
  activities: string[];
  imageUrl?: string;
}

export interface TeamPosition {
  id: string;
  title: string;
  unit?: string;
  rankOrder: number;
  displayOrder: number;
  color?: string;
  isActive?: boolean;
}

export interface TeamMember {
  id?: string;
  name: string;
  role: string;
  unit?: string;
  rankOrder?: number;
  displayOrder?: number;
  bio: string;
  imageSizeText: string;
  imageDescription: string;
  imageUrl?: string;
  roleColor?: string;
  theme: string;
}

export interface FAQItem {
  question: string;
  answer: string;
  category: 'general' | 'volunteer' | 'education' | 'cert';
}

export interface CoreValueItem {
  name: string;
  desc: string;
  badge?: string;
  theme?: string;
}

export type PageBlockType =
  | 'heading'
  | 'text'
  | 'list'
  | 'callout'
  | 'image'
  | 'video'
  | 'stats'
  | 'cta'
  | 'quote'
  | 'divider'
  | 'html'
  | 'gallery'
  | 'timeline'
  | 'logos'
  | 'accordion'
  | 'tabs'
  | 'table'
  | 'documents'
  | 'people'
  | 'campaign'
  | 'funding'
  | 'transparency'
  | 'map'
  | 'embed'
  | 'marquee';

export interface PageBlock {
  id: string;
  type: PageBlockType;
  headingLevel?: 'h2' | 'h3' | 'h4';
  listType?: 'ul' | 'ol';
  calloutTone?: 'info' | 'success' | 'warning';
  title?: string;
  body?: string;
  imageUrl?: string;
  alt?: string;
  caption?: string;
  credit?: string;
  videoUrl?: string;
  posterUrl?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  secondaryButtonLabel?: string;
  secondaryButtonUrl?: string;
  stats?: { value: string; label: string; note?: string }[];
  background?: 'white' | 'soft' | 'navy' | 'sky';
  align?: 'left' | 'center' | 'right';
  spacing?: 'compact' | 'normal' | 'relaxed';
  textColor?: string;
  fontFamily?: string;
  hidden?: boolean;
  sourceUrl?: string;
  items?: { title?: string; body?: string; imageUrl?: string; url?: string; label?: string; value?: string }[];
  columns?: 1 | 2 | 3 | 4;
  animation?: 'none' | 'fade' | 'slide' | 'zoom' | 'reveal';
  width?: 'normal' | 'wide' | 'full';
  mobileHidden?: boolean;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  imageFit?: 'original' | 'contain' | 'cover';
  focalX?: number;
  focalY?: number;
}

export interface CustomPage {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  contentFormatted?: string;
  imageUrl?: string;
  secondaryImageUrl?: string;
  imageFit?: 'original' | 'contain' | 'cover';
  imageFocalX?: number;
  imageFocalY?: number;
  pageBlocks?: PageBlock[];
  isPublished?: boolean;
  editorialStatus?: 'draft' | 'pending_review' | 'approved' | 'published';
  scheduledPublishAt?: string;
  publishedAt?: string;
  author?: string;
  views?: number;
  type?: 'about' | 'contact' | 'faq' | 'custom' | 'legal' | 'programs' | 'units' | 'certificate' | 'sponsor' | 'join';
  showInFooter?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  ogImageUrl?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  badge?: string;
  subtitle?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  secondaryButtonLabel?: string;
  secondaryButtonUrl?: string;
  visionBadge?: string;
  visionTitle?: string;
  visionContent?: string;
  missionBadge?: string;
  missionTitle?: string;
  missionContent?: string;
  philosophyBadge?: string;
  philosophyTitle?: string;
  philosophyContent?: string;
  pillarsSectionTitle?: string;
  pillarsSectionBadge?: string;
  customPillars?: CorePillar[];
  valuesSectionTitle?: string;
  customValues?: CoreValueItem[];
  timelineSectionTitle?: string;
  timelineSectionBadge?: string;
  customTimeline?: TimelineMilestone[];
  teamSectionTitle?: string;
  teamSectionSubtitle?: string;
  customTeam?: TeamMember[];
  customPositions?: TeamPosition[];
  teamSortMode?: 'priority' | 'manual';
  unitsSectionBadge?: string;
  unitsSectionTitle?: string;
  unitsButtonLabel?: string;
  unitsButtonUrl?: string;
  ctaTitle?: string;
  ctaDescription?: string;
  ctaButtonLabel?: string;
  ctaButtonUrl?: string;
  ctaSecondaryButtonLabel?: string;
  ctaSecondaryButtonUrl?: string;
  address?: string;
  hotline?: string;
  secondaryHotline?: string;
  email?: string;
  secondaryEmail?: string;
  workHoursWeekdays?: string;
  workHoursSaturday?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
  contactFormTitle?: string;
  contactSubmitButtonLabel?: string;
  contactSubmitButtonUrl?: string;
  contactFormDescription?: string;
  contactUnitsTitle?: string;
  contactUnitsSubtitle?: string;
  contactFaqTitle?: string;
  contactFaq1Q?: string;
  contactFaq1A?: string;
  contactFaq2Q?: string;
  contactFaq2A?: string;
  contactFaq3Q?: string;
  contactFaq3A?: string;
  contactFaq4Q?: string;
  contactFaq4A?: string;
  contactCtaTitle?: string;
  contactCtaDescription?: string;
  certSearchLabel?: string;
  certSearchPlaceholder?: string;
  certGuidanceNote?: string;
  certSearchButtonLabel?: string;
  certResetButtonLabel?: string;
  certFeature1Title?: string;
  certFeature1Desc?: string;
  certFeature2Title?: string;
  certFeature2Desc?: string;
  certFeature3Title?: string;
  certFeature3Desc?: string;
  certCtaTitle?: string;
  certCtaDescription?: string;
  certCtaButtonLabel?: string;
  certCtaButtonUrl?: string;
  certStatIssuedMode?: 'auto' | 'manual';
  certStatIssuedManual?: string;
  certStatValidMode?: 'auto' | 'manual';
  certStatValidManual?: string;
  certStatProgramsMode?: 'auto' | 'manual';
  certStatProgramsManual?: string;
  certStatUpdatedMode?: 'auto' | 'manual';
  certStatUpdatedManual?: string;
  sponsorRecipientEntity?: string;
  sponsorGoalAmount?: string;
  sponsorReceivedAmount?: string;
  sponsorPublicLedgerUrl?: string;
  sponsorBankName?: string;
  sponsorBankId?: string;
  sponsorBankAccount?: string;
  sponsorAccountHolder?: string;
  sponsorBankBranch?: string;
  sponsorTransferSyntax?: string;
  sponsorQrCodeUrl?: string;
  sponsorQrCodeTitle?: string;
  sponsorQrCodeSubtitle?: string;
  sponsorDonationNotice?: string;
  sponsorSuggestedAmounts?: string;
  sponsorHotline?: string;
  sponsorEmail?: string;
  sponsorCopyButtonLabel?: string;
  sponsorContactLeadTitle?: string;
  sponsorContactHeading?: string;
  sponsorContactDescription?: string;
  sponsorContactButtonLabel?: string;
  sponsorContactButtonUrl?: string;
  sponsorUnitsButtonLabel?: string;
  sponsorUnitsButtonUrl?: string;
  sponsorContactHotline?: string;
  sponsorContactEmail?: string;
  sponsorCtaTitle?: string;
  sponsorCtaDescription?: string;
  sponsorHeroPrimaryButtonLabel?: string;
  sponsorHeroPrimaryButtonUrl?: string;
  sponsorHeroSecondaryButtonLabel?: string;
  sponsorHeroSecondaryButtonUrl?: string;
  sponsorCommitmentHeading?: string;
  sponsorCommitmentSubtitle?: string;
  sponsorCommit1Title?: string;
  sponsorCommit1Desc?: string;
  sponsorCommit2Title?: string;
  sponsorCommit2Desc?: string;
  sponsorCommit3Title?: string;
  sponsorCommit3Desc?: string;
  sponsorCommit4Title?: string;
  sponsorCommit4Desc?: string;
  sponsorPackagesHeading?: string;
  sponsorPackagesSubtitle?: string;
  sponsorPkg1Title?: string;
  sponsorPkg1Badge?: string;
  sponsorPkg1Unit?: string;
  sponsorPkg1Desc?: string;
  sponsorPkg1Impact?: string;
  sponsorPkg2Title?: string;
  sponsorPkg2Badge?: string;
  sponsorPkg2Unit?: string;
  sponsorPkg2Desc?: string;
  sponsorPkg2Impact?: string;
  sponsorPkg3Title?: string;
  sponsorPkg3Badge?: string;
  sponsorPkg3Unit?: string;
  sponsorPkg3Desc?: string;
  sponsorPkg3Impact?: string;
  sponsorPkg4Title?: string;
  sponsorPkg4Badge?: string;
  sponsorPkg4Unit?: string;
  sponsorPkg4Desc?: string;
  sponsorPkg4Impact?: string;
  sponsorFaqHeading?: string;
  sponsorFaqSubtitle?: string;
  sponsorFaq1Q?: string;
  sponsorFaq1A?: string;
  sponsorFaq2Q?: string;
  sponsorFaq2A?: string;
  sponsorFaq3Q?: string;
  sponsorFaq3A?: string;
  sponsorFaq4Q?: string;
  sponsorFaq4A?: string;
  joinHotline?: string;
  joinHotlineTitle?: string;
  joinEmail?: string;
  joinEmailTitle?: string;
  joinAddress?: string;
  joinAddressTitle?: string;
  joinRolesHeading?: string;
  joinRolesSubtitle?: string;
  joinRole1Title?: string;
  joinRole1Tag?: string;
  joinRole1Description?: string;
  joinRole1Period?: string;
  joinRole1ButtonLabel?: string;
  joinRole1ButtonUrl?: string;
  joinRole1Highlight1?: string;
  joinRole1Highlight2?: string;
  joinRole1Highlight3?: string;
  joinRole1Highlight4?: string;
  joinRole2Title?: string;
  joinRole2Tag?: string;
  joinRole2Description?: string;
  joinRole2Period?: string;
  joinRole2ButtonLabel?: string;
  joinRole2ButtonUrl?: string;
  joinRole2Highlight1?: string;
  joinRole2Highlight2?: string;
  joinRole2Highlight3?: string;
  joinRole2Highlight4?: string;
  joinRole3Title?: string;
  joinRole3Tag?: string;
  joinRole3Description?: string;
  joinRole3Period?: string;
  joinRole3ButtonLabel?: string;
  joinRole3ButtonUrl?: string;
  joinRole3Highlight1?: string;
  joinRole3Highlight2?: string;
  joinRole3Highlight3?: string;
  joinRole3Highlight4?: string;
  joinCtaHeading?: string;
  joinCtaDescription?: string;
  joinCtaButtonLabel?: string;
  joinCtaButtonUrl?: string;
  joinFaqHeading?: string;
  joinFaqSubtitle?: string;
  joinFaq1Q?: string;
  joinFaq1A?: string;
  joinFaq2Q?: string;
  joinFaq2A?: string;
  joinFaq3Q?: string;
  joinFaq3A?: string;
  joinFaq4Q?: string;
  joinFaq4A?: string;
}

export interface AdminManagerActionRef {
  handleCreateNew: () => void;
}


export type AdminCapability =
  | 'content.edit'
  | 'content.publish'
  | 'forms.manage'
  | 'submissions.view'
  | 'records.manage'
  | 'media.manage'
  | 'website.visualEdit'
  | 'settings.manage'
  | 'users.manage'
  | 'system.manage';

export interface IntroSettings extends IntroConfig {
  posterUrl?: string;
  logoRevealDurationMs?: number;
  maxWaitDurationMs?: number;
  allowSkip?: boolean;
  playMode?: 'every_home_load' | 'once_per_session' | 'disabled';
  respectReducedMotion?: boolean;
  fallbackMode?: 'logo_fade' | 'skip_immediately';
}

export interface EmailSystemSettings extends EmailConfig {
  provider?: 'none' | 'resend' | 'cloudflare_email' | 'webhook';
  senderName?: string;
  senderEmail?: string;
  replyToEmail?: string;
  adminRecipientEmails?: string;
  apiKeyMasked?: string;
  sendOnProgramRegistration?: boolean;
  sendAdminAlertOnRegistration?: boolean;
  sendOnContactSubmission?: boolean;
  sendOnStatusChange?: boolean;
  retryMaxAttempts?: number;
}

export interface AutomationSystemSettings extends AutomationConfig {
  enableScheduledPublishing?: boolean;
  enableAutoCloseExpiredForms?: boolean;
  enableAutoRedirectOnSlugChange?: boolean;
  enableAutoSitemapUpdate?: boolean;
  enableAutoEndedProgramBadge?: boolean;
  autoArchiveOldDraftDays?: number;
}

export interface SeoSystemSettings extends SeoGlobalConfig {
  titleTemplate?: string;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultOgImage?: string;
  canonicalDomain?: string;
  allowIndexing?: boolean;
}
