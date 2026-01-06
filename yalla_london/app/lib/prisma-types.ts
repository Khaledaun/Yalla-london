/**
 * Prisma Model Type Definitions
 *
 * Fallback types that match the Prisma schema for when the Prisma client
 * isn't fully generated (e.g., during builds without database access).
 *
 * These types should match the models defined in prisma/schema.prisma
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum SkillCategory {
  ENGINEERING = 'ENGINEERING',
  AI_ML = 'AI_ML',
  DESIGN = 'DESIGN',
  DATA = 'DATA',
  CONTENT = 'CONTENT',
  MARKETING = 'MARKETING',
  PSYCHOLOGY = 'PSYCHOLOGY',
  BUSINESS = 'BUSINESS',
  TRAVEL = 'TRAVEL',
}

export enum Proficiency {
  LEARNING = 'LEARNING',
  PROFICIENT = 'PROFICIENT',
  EXPERT = 'EXPERT',
  THOUGHT_LEADER = 'THOUGHT_LEADER',
}

export enum CreditRole {
  AUTHOR = 'AUTHOR',
  CO_AUTHOR = 'CO_AUTHOR',
  EDITOR = 'EDITOR',
  CONTRIBUTOR = 'CONTRIBUTOR',
  PHOTOGRAPHER = 'PHOTOGRAPHER',
  RESEARCHER = 'RESEARCHER',
  ADVISOR = 'ADVISOR',
}

export enum SubscriberStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  UNSUBSCRIBED = 'UNSUBSCRIBED',
  BOUNCED = 'BOUNCED',
  COMPLAINED = 'COMPLAINED',
}

export enum PartnerType {
  HOTEL = 'HOTEL',
  EXPERIENCE = 'EXPERIENCE',
  INSURANCE = 'INSURANCE',
  FLIGHT = 'FLIGHT',
  TRANSFER = 'TRANSFER',
  EQUIPMENT = 'EQUIPMENT',
}

export enum ConversionStatus {
  PENDING = 'PENDING',
  BOOKED = 'BOOKED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  PAID = 'PAID',
}

export enum LeadType {
  NEWSLETTER = 'NEWSLETTER',
  GUIDE_DOWNLOAD = 'GUIDE_DOWNLOAD',
  TRIP_INQUIRY = 'TRIP_INQUIRY',
  QUOTE_REQUEST = 'QUOTE_REQUEST',
  CONSULTATION = 'CONSULTATION',
  CONTACT = 'CONTACT',
}

export enum LeadStatus {
  NEW = 'NEW',
  QUALIFIED = 'QUALIFIED',
  CONTACTED = 'CONTACTED',
  ENGAGED = 'ENGAGED',
  CONVERTED = 'CONVERTED',
  SOLD = 'SOLD',
  UNQUALIFIED = 'UNQUALIFIED',
  UNSUBSCRIBED = 'UNSUBSCRIBED',
}

export enum ProductType {
  PDF_GUIDE = 'PDF_GUIDE',
  SPREADSHEET = 'SPREADSHEET',
  TEMPLATE = 'TEMPLATE',
  BUNDLE = 'BUNDLE',
  MEMBERSHIP = 'MEMBERSHIP',
}

export enum PurchaseStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

// ============================================================================
// MODEL TYPES
// ============================================================================

export interface TeamMember {
  id: string;
  site_id: string | null;
  user_id: string | null;
  name_en: string;
  name_ar: string | null;
  slug: string;
  title_en: string;
  title_ar: string | null;
  bio_en: string;
  bio_ar: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  email_public: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface Skill {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string | null;
  category: SkillCategory;
  description_en: string | null;
  description_ar: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface TeamMemberExpertise {
  id: string;
  team_member_id: string;
  skill_id: string;
  proficiency: Proficiency;
  years_experience: number | null;
  description_en: string | null;
  description_ar: string | null;
  is_primary: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface ContentCredit {
  id: string;
  team_member_id: string;
  content_type: string;
  content_id: string;
  role: CreditRole;
  contribution: string | null;
  created_at: Date;
}

export interface BlogPost {
  id: string;
  title_en: string;
  title_ar: string;
  slug: string;
  excerpt_en: string | null;
  excerpt_ar: string | null;
  content_en: string;
  content_ar: string;
  featured_image: string | null;
  published: boolean;
  category_id: string;
  author_id: string;
  meta_title_en: string | null;
  meta_title_ar: string | null;
  meta_description_en: string | null;
  meta_description_ar: string | null;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  page_type: string | null;
  keywords_json: any | null;
  questions_json: any | null;
  authority_links_json: any | null;
  featured_longtails_json: any | null;
  seo_score: number | null;
  og_image_id: string | null;
  place_id: string | null;
}

export interface Category {
  id: string;
  name_en: string;
  name_ar: string;
  slug: string;
  description_en: string | null;
  description_ar: string | null;
  image_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Site {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  theme_id: string | null;
  settings_json: any;
  homepage_json: any | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  default_locale: string;
  direction: string;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  features_json: any | null;
}

export interface User {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  role: string;
  permissions: string[];
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscriber {
  id: string;
  site_id: string | null;
  email: string;
  status: SubscriberStatus;
  source: string | null;
  preferences_json: any | null;
  metadata_json: any | null;
  double_optin_token: string | null;
  double_optin_sent_at: Date | null;
  confirmed_at: Date | null;
  unsubscribed_at: Date | null;
  unsubscribe_reason: string | null;
  last_campaign_sent: Date | null;
  engagement_score: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface Domain {
  id: string;
  site_id: string;
  hostname: string;
  is_primary: boolean;
  verified: boolean;
  verified_at: Date | null;
  verification_token: string | null;
  verification_method: string | null;
  ssl_status: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Lead {
  id: string;
  site_id: string;
  email: string;
  name: string | null;
  phone: string | null;
  lead_type: LeadType;
  lead_source: string | null;
  interests_json: any | null;
  budget_range: string | null;
  travel_dates: string | null;
  party_size: number | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  landing_page: string | null;
  score: number;
  score_factors: any | null;
  status: LeadStatus;
  assigned_to: string | null;
  value: number | null;
  sold_to: string | null;
  sold_at: Date | null;
  marketing_consent: boolean;
  consent_ip: string | null;
  consent_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface PageView {
  id: string;
  site_id: string;
  path: string;
  page_type: string | null;
  content_id: string | null;
  session_id: string;
  visitor_id: string | null;
  duration: number | null;
  scroll_depth: number | null;
  referrer: string | null;
  utm_source: string | null;
  viewed_at: Date;
}

export interface DigitalProduct {
  id: string;
  site_id: string | null;
  name_en: string;
  name_ar: string | null;
  slug: string;
  description_en: string;
  description_ar: string | null;
  price: number;
  compare_price: number | null;
  currency: string;
  product_type: ProductType;
  file_url: string | null;
  file_size: number | null;
  cover_image: string | null;
  features_json: any | null;
  is_active: boolean;
  featured: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Purchase {
  id: string;
  site_id: string;
  product_id: string;
  customer_email: string;
  customer_name: string | null;
  amount: number;
  currency: string;
  payment_provider: string | null;
  payment_id: string | null;
  status: PurchaseStatus;
  download_token: string;
  download_count: number;
  download_limit: number;
  utm_source: string | null;
  utm_campaign: string | null;
  created_at: Date;
  completed_at: Date | null;
}

// Comparison/Resort types (for completeness)
export interface Resort {
  id: string;
  site_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  price_range: string | null;
  rating: number | null;
  image_url: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Comparison {
  id: string;
  site_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ComparisonResort {
  id: string;
  comparison_id: string;
  resort_id: string;
  position: number;
  notes: string | null;
  created_at: Date;
}

// AffiliatePartner and AffiliateClick for tenant scoping
export interface AffiliatePartner {
  id: string;
  siteId: string;
  name: string;
  slug: string;
  partner_type: string;
  api_endpoint: string | null;
  api_key_encrypted: string | null;
  commission_rate: number | null;
  contact_info: any | null;
  is_active: boolean;
  last_sync_at: Date | null;
  sync_status: string | null;
  createdById: string;
  updatedById: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface AffiliateClick {
  id: string;
  site_id: string;
  partner_id: string;
  resort_id: string | null;
  product_id: string | null;
  article_id: string | null;
  link_type: string | null;
  session_id: string;
  visitor_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  landing_page: string | null;
  user_agent: string | null;
  device_type: string | null;
  country_code: string | null;
  clicked_at: Date;
}

export interface Conversion {
  id: string;
  site_id: string;
  click_id: string;
  partner_id: string;
  booking_ref: string | null;
  booking_value: number;
  commission: number;
  currency: string;
  status: ConversionStatus;
  check_in: Date | null;
  check_out: Date | null;
  converted_at: Date;
  confirmed_at: Date | null;
  paid_at: Date | null;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  activity_type: string;
  activity_data: any | null;
  created_at: Date;
}
