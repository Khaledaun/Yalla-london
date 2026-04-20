export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrCron } from "@/lib/admin-middleware";

/**
 * Database Migration Endpoint
 *
 * GET  → Scan for missing tables and columns (read-only)
 * POST → Create missing tables and add missing columns
 *
 * Auth: Admin session cookie OR CRON_SECRET bearer token
 */

// ─── Auth ──────────────────────────────────────────────────────────────────
async function checkAuth(request: NextRequest): Promise<NextResponse | null> {
  return requireAdminOrCron(request);
}

// ─── Schema Definition ─────────────────────────────────────────────────────
// Each entry maps a Prisma model to its Postgres table and expected columns.
// Only columns that are known to be missing in production are listed here;
// we also include full CREATE TABLE statements for entirely missing tables.

interface ColumnDef {
  name: string;
  type: string; // Postgres type
  nullable?: boolean;
  defaultValue?: string;
}

interface TableDef {
  table: string;
  model: string;
  columns: ColumnDef[];
  indexes?: string[]; // Raw CREATE INDEX IF NOT EXISTS statements
}

const EXPECTED_TABLES: TableDef[] = [
  // ── BlogPost ────────────────────────────────────
  {
    table: '"BlogPost"',
    model: "BlogPost",
    columns: [
      { name: "siteId", type: "TEXT", nullable: true },
      { name: "deletedAt", type: "TIMESTAMPTZ", nullable: true },
      { name: "page_type", type: "TEXT", nullable: true },
      { name: "keywords_json", type: "JSONB", nullable: true },
      { name: "questions_json", type: "JSONB", nullable: true },
      { name: "authority_links_json", type: "JSONB", nullable: true },
      { name: "featured_longtails_json", type: "JSONB", nullable: true },
      { name: "seo_score", type: "INTEGER", nullable: true },
      { name: "og_image_id", type: "TEXT", nullable: true },
      { name: "place_id", type: "TEXT", nullable: true },
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS "BlogPost_siteId_idx" ON "BlogPost"("siteId")',
      'CREATE INDEX IF NOT EXISTS "BlogPost_siteId_published_idx" ON "BlogPost"("siteId", "published")',
      'CREATE INDEX IF NOT EXISTS "BlogPost_siteId_created_at_idx" ON "BlogPost"("siteId", "created_at")',
      'CREATE INDEX IF NOT EXISTS "BlogPost_page_type_idx" ON "BlogPost"("page_type")',
      'CREATE INDEX IF NOT EXISTS "BlogPost_seo_score_idx" ON "BlogPost"("seo_score")',
      'CREATE INDEX IF NOT EXISTS "BlogPost_place_id_idx" ON "BlogPost"("place_id")',
    ],
  },
  // ── ScheduledContent ────────────────────────────
  {
    table: '"ScheduledContent"',
    model: "ScheduledContent",
    columns: [
      { name: "content_id", type: "TEXT", nullable: true },
      { name: "site_id", type: "TEXT", nullable: true },
      { name: "page_type", type: "TEXT", nullable: true },
      { name: "topic_proposal_id", type: "TEXT", nullable: true },
      { name: "seo_score", type: "INTEGER", nullable: true },
      { name: "generation_source", type: "TEXT", nullable: true },
      { name: "authority_links_used", type: "JSONB", nullable: true },
      { name: "longtails_used", type: "JSONB", nullable: true },
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS "ScheduledContent_content_id_idx" ON "ScheduledContent"("content_id")',
      'CREATE INDEX IF NOT EXISTS "ScheduledContent_site_id_idx" ON "ScheduledContent"("site_id")',
      'CREATE INDEX IF NOT EXISTS "ScheduledContent_scheduled_time_idx" ON "ScheduledContent"("scheduled_time")',
      'CREATE INDEX IF NOT EXISTS "ScheduledContent_status_idx" ON "ScheduledContent"("status")',
    ],
  },
  // ── SeoReport ──────────────────────────────────
  {
    table: '"seo_reports"',
    model: "SeoReport",
    columns: [
      { name: "site_id", type: "TEXT", nullable: true },
      { name: "periodStart", type: "TIMESTAMPTZ", nullable: true },
      { name: "periodEnd", type: "TIMESTAMPTZ", nullable: true },
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS "seo_reports_site_id_idx" ON "seo_reports"("site_id")',
      'CREATE INDEX IF NOT EXISTS "seo_reports_site_id_reportType_idx" ON "seo_reports"("site_id", "reportType")',
      'CREATE INDEX IF NOT EXISTS "seo_reports_reportType_generatedAt_idx" ON "seo_reports"("reportType", "generatedAt")',
    ],
  },
  // ── InformationSection ──────────────────────────
  {
    table: '"information_sections"',
    model: "InformationSection",
    columns: [
      { name: "siteId", type: "TEXT", nullable: true },
      { name: "deletedAt", type: "TIMESTAMPTZ", nullable: true },
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS "information_sections_siteId_idx" ON "information_sections"("siteId")',
    ],
  },
  // ── InformationArticle ──────────────────────────
  {
    table: '"information_articles"',
    model: "InformationArticle",
    columns: [
      { name: "siteId", type: "TEXT", nullable: true },
      { name: "deletedAt", type: "TIMESTAMPTZ", nullable: true },
      { name: "page_type", type: "TEXT", nullable: true, defaultValue: "'article'" },
      { name: "seo_score", type: "INTEGER", nullable: true, defaultValue: "0" },
      { name: "faq_questions", type: "JSONB", nullable: true },
      { name: "keywords", type: "TEXT[]", nullable: true, defaultValue: "'{}'" },
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS "information_articles_siteId_idx" ON "information_articles"("siteId")',
      'CREATE INDEX IF NOT EXISTS "information_articles_siteId_published_idx" ON "information_articles"("siteId", "published")',
    ],
  },
  // ── CJ Offers — add siteId ──────────────────────────
  {
    table: '"cj_offers"',
    model: "CjOffer",
    columns: [
      { name: "siteId", type: "TEXT", nullable: true },
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS "cj_offers_siteId_idx" ON "cj_offers"("siteId")',
    ],
  },
  // ── CJ Commissions — add siteId ──────────────────────────
  {
    table: '"cj_commissions"',
    model: "CjCommission",
    columns: [
      { name: "siteId", type: "TEXT", nullable: true },
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS "cj_commissions_siteId_idx" ON "cj_commissions"("siteId")',
    ],
  },
  // ── CJ Click Events — add siteId ──────────────────────────
  {
    table: '"cj_click_events"',
    model: "CjClickEvent",
    columns: [
      { name: "siteId", type: "TEXT", nullable: true },
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS "cj_click_events_siteId_idx" ON "cj_click_events"("siteId")',
      'CREATE INDEX IF NOT EXISTS "cj_click_events_siteId_createdAt_idx" ON "cj_click_events"("siteId", "createdAt")',
    ],
  },
  // ── ArticleDraft — hardening sprint fields ──────────────────────────
  {
    table: '"article_drafts"',
    model: "ArticleDraft",
    columns: [
      { name: "trace_id", type: "TEXT", nullable: true },
    ],
    indexes: [],
  },
  // ── BlogPost — hardening sprint fields ──────────────────────────
  {
    table: '"BlogPost"',
    model: "BlogPost (hardening)",
    columns: [
      { name: "trace_id", type: "TEXT", nullable: true },
      { name: "source_pipeline", type: "TEXT", nullable: true },
      { name: "enhancement_log", type: "JSONB", nullable: true },
      { name: "photo_order_query", type: "TEXT", nullable: true },
      { name: "photo_order_status", type: "TEXT", nullable: true },
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS "BlogPost_photo_order_status_idx" ON "BlogPost"("photo_order_status")',
    ],
  },
  // ── MediaAsset — missing columns from schema ───────────────────────
  {
    table: '"MediaAsset"',
    model: "MediaAsset",
    columns: [
      { name: "site_id", type: "TEXT", nullable: true },
      { name: "category", type: "TEXT", nullable: true },
      { name: "folder", type: "TEXT", nullable: true },
      { name: "isVideo", type: "BOOLEAN NOT NULL DEFAULT false", nullable: false },
      { name: "videoPoster", type: "TEXT", nullable: true },
      { name: "videoVariants", type: "JSONB", nullable: true },
      { name: "isHeroVideo", type: "BOOLEAN NOT NULL DEFAULT false", nullable: false },
      { name: "duration", type: "INTEGER", nullable: true },
      { name: "deletedAt", type: "TIMESTAMP(3)", nullable: true },
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS "MediaAsset_site_id_idx" ON "MediaAsset"("site_id")',
      'CREATE INDEX IF NOT EXISTS "MediaAsset_category_idx" ON "MediaAsset"("category")',
    ],
  },
  // ── Subscriber Name Fields (migration: 20260317_add_subscriber_name_fields) ──
  {
    table: '"Subscriber"',
    model: "Subscriber",
    columns: [
      { name: "first_name", type: "TEXT", nullable: true },
      { name: "last_name", type: "TEXT", nullable: true },
    ],
    indexes: [],
  },
  // ── FeatureFlag — add siteId when table pre-existed without it ──────────────
  // UNIQUE_CONSTRAINTS references feature_flags("siteId") — must exist before Step 3
  {
    table: '"feature_flags"',
    model: "FeatureFlag",
    columns: [
      { name: "siteId", type: "TEXT", nullable: true },
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS "feature_flags_siteId_idx" ON "feature_flags"("siteId")',
    ],
  },
  // ── SiteSettings — add siteId/category when table pre-existed without them ──
  // UNIQUE_CONSTRAINTS references site_settings("siteId","category") — must exist before Step 3
  {
    table: '"site_settings"',
    model: "SiteSettings",
    columns: [
      { name: "siteId", type: "TEXT", nullable: true },
      { name: "category", type: "TEXT", nullable: true },
    ],
    indexes: [],
  },
  // ── pdf_guides — add slug when table pre-existed without it ──────────────────
  // UNIQUE_CONSTRAINTS references pdf_guides("slug") — must exist before Step 3
  // PdfGuide was initially created via early db-migrate run; slug was added later
  {
    table: '"pdf_guides"',
    model: "PdfGuide",
    columns: [
      { name: "slug", type: "TEXT", nullable: true },
    ],
    indexes: [],
  },
  // ── PromptTemplate — add version when table pre-existed without it ────────────
  // UNIQUE_CONSTRAINTS references PromptTemplate("name","version") — must exist before Step 3
  {
    table: '"PromptTemplate"',
    model: "PromptTemplate",
    columns: [
      { name: "version", type: "TEXT", nullable: true, defaultValue: "'1.0'" },
    ],
    indexes: [],
  },
];

// ─── Enum Definitions ──────────────────────────────────────────────────────
// Must be created BEFORE tables that reference them.
// Uses DO $$ ... EXCEPTION ... END $$ pattern to silently skip if already exists.
const ENUM_STATEMENTS: { name: string; values: string[] }[] = [
  { name: "YachtType", values: ["SAILBOAT", "CATAMARAN", "MOTOR_YACHT", "GULET", "SUPERYACHT", "POWER_CATAMARAN"] },
  { name: "YachtSource", values: ["NAUSYS", "MMK", "CHARTER_INDEX", "MANUAL"] },
  { name: "InquiryStatus", values: ["NEW", "CONTACTED", "QUALIFIED", "SENT_TO_BROKER", "BOOKED", "LOST"] },
  { name: "AvailabilityStatus", values: ["AVAILABLE", "BOOKED", "HOLD", "MAINTENANCE"] },
  { name: "ReviewStatus", values: ["PENDING", "APPROVED", "REJECTED"] },
  { name: "DestinationRegion", values: ["MEDITERRANEAN", "ARABIAN_GULF", "RED_SEA", "INDIAN_OCEAN", "CARIBBEAN", "SOUTHEAST_ASIA"] },
  { name: "SyncStatus", values: ["RUNNING", "COMPLETED", "FAILED"] },
  { name: "ItineraryDifficulty", values: ["EASY", "MODERATE", "ADVANCED"] },
  { name: "ConversionStatus", values: ["PENDING", "BOOKED", "COMPLETED", "CANCELLED", "PAID"] },
  { name: "SubscriberStatus", values: ["PENDING", "CONFIRMED", "UNSUBSCRIBED", "BOUNCED", "COMPLAINED"] },
  // CJ Affiliate enums
  { name: "NetworkStatus", values: ["ACTIVE", "PAUSED", "DISABLED"] },
  { name: "AdvertiserStatus", values: ["JOINED", "PENDING", "NOT_JOINED", "DECLINED"] },
  { name: "AdvertiserPriority", values: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
  { name: "CjLinkType", values: ["TEXT", "BANNER", "PRODUCT", "DEEP"] },
  { name: "CjLanguage", values: ["EN", "AR"] },
  { name: "CommissionStatus", values: ["PENDING", "APPROVED", "DECLINED", "LOCKED"] },
  { name: "PlacementType", values: ["INLINE", "SIDEBAR", "BANNER", "CTA", "CARD", "COMPARISON_TABLE"] },
  { name: "RotationStrategy", values: ["RANDOM", "HIGHEST_EPC", "NEWEST", "MANUAL"] },
  { name: "PlacementCondition", values: ["CATEGORY_MATCH", "TAG_MATCH", "LANGUAGE_MATCH", "URL_MATCH", "KEYWORD_MATCH"] },
  { name: "ClickDevice", values: ["DESKTOP", "MOBILE", "TABLET"] },
  { name: "SyncType", values: ["ADVERTISERS", "LINKS", "PRODUCTS", "COMMISSIONS", "DEALS"] },
  { name: "CjSyncStatus", values: ["SUCCESS", "PARTIAL", "FAILED"] },
  // Team & Expertise enums
  { name: "SkillCategory", values: ["ENGINEERING", "AI_ML", "DESIGN", "DATA", "CONTENT", "MARKETING", "PSYCHOLOGY", "BUSINESS", "TRAVEL"] },
  { name: "Proficiency", values: ["LEARNING", "PROFICIENT", "EXPERT", "THOUGHT_LEADER"] },
  { name: "CreditRole", values: ["AUTHOR", "CO_AUTHOR", "EDITOR", "CONTRIBUTOR", "PHOTOGRAPHER", "RESEARCHER", "ADVISOR"] },
  // Affiliate & Revenue enums
  { name: "PartnerType", values: ["HOTEL", "EXPERIENCE", "INSURANCE", "FLIGHT", "TRANSFER", "EQUIPMENT"] },
  // Lead/CRM enums
  { name: "LeadType", values: ["NEWSLETTER", "GUIDE_DOWNLOAD", "TRIP_INQUIRY", "QUOTE_REQUEST", "CONSULTATION", "CONTACT"] },
  { name: "LeadStatus", values: ["NEW", "QUALIFIED", "CONTACTED", "ENGAGED", "CONVERTED", "SOLD", "UNQUALIFIED", "UNSUBSCRIBED"] },
  // Digital Products enums
  { name: "ProductType", values: ["PDF_GUIDE", "SPREADSHEET", "TEMPLATE", "BUNDLE", "MEMBERSHIP", "WALL_ART", "PRESET", "PLANNER", "STICKER", "WORKSHEET", "EVENT_GUIDE"] },
  { name: "PurchaseStatus", values: ["PENDING", "COMPLETED", "FAILED", "REFUNDED"] },
];

// Full CREATE TABLE statements for tables that might be entirely missing
const CREATE_TABLE_STATEMENTS: { table: string; model: string; sql: string }[] = [
  {
    table: "news_items",
    model: "NewsItem",
    sql: `CREATE TABLE IF NOT EXISTS "news_items" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "headline_en" TEXT NOT NULL,
  "headline_ar" TEXT NOT NULL,
  "summary_en" TEXT NOT NULL,
  "summary_ar" TEXT NOT NULL,
  "announcement_en" TEXT NOT NULL,
  "announcement_ar" TEXT NOT NULL,
  "source_name" TEXT NOT NULL,
  "source_url" TEXT NOT NULL,
  "source_logo" TEXT,
  "featured_image" TEXT,
  "image_alt_en" TEXT,
  "image_alt_ar" TEXT,
  "image_credit" TEXT,
  "news_category" TEXT NOT NULL,
  "relevance_score" INTEGER NOT NULL DEFAULT 50,
  "is_major" BOOLEAN NOT NULL DEFAULT false,
  "urgency" TEXT NOT NULL DEFAULT 'normal',
  "event_start_date" TIMESTAMPTZ,
  "event_end_date" TIMESTAMPTZ,
  "expires_at" TIMESTAMPTZ,
  "meta_title_en" TEXT,
  "meta_title_ar" TEXT,
  "meta_description_en" TEXT,
  "meta_description_ar" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT '{}',
  "keywords" TEXT[] NOT NULL DEFAULT '{}',
  "related_article_slugs" TEXT[] NOT NULL DEFAULT '{}',
  "related_shop_slugs" TEXT[] NOT NULL DEFAULT '{}',
  "affiliate_link_ids" TEXT[] NOT NULL DEFAULT '{}',
  "agent_source" TEXT,
  "agent_notes" TEXT,
  "research_log" JSONB,
  "updates_info_article" BOOLEAN NOT NULL DEFAULT false,
  "affected_info_slugs" TEXT[] NOT NULL DEFAULT '{}',
  "siteId" TEXT,
  "published_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
  },
  {
    table: "news_research_logs",
    model: "NewsResearchLog",
    sql: `CREATE TABLE IF NOT EXISTS "news_research_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "run_type" TEXT NOT NULL DEFAULT 'daily',
  "status" TEXT NOT NULL DEFAULT 'running',
  "sources_checked" TEXT[] NOT NULL DEFAULT '{}',
  "items_found" INTEGER NOT NULL DEFAULT 0,
  "items_published" INTEGER NOT NULL DEFAULT 0,
  "items_skipped" INTEGER NOT NULL DEFAULT 0,
  "facts_flagged" INTEGER NOT NULL DEFAULT 0,
  "duration_ms" INTEGER,
  "error_message" TEXT,
  "result_summary" JSONB,
  "siteId" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
  },
  {
    table: "fact_entries",
    model: "FactEntry",
    sql: `CREATE TABLE IF NOT EXISTS "fact_entries" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "article_type" TEXT NOT NULL,
  "article_slug" TEXT NOT NULL,
  "fact_text_en" TEXT NOT NULL,
  "fact_text_ar" TEXT,
  "fact_location" TEXT,
  "category" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "confidence_score" INTEGER DEFAULT 0,
  "last_verified_at" TIMESTAMPTZ,
  "next_check_at" TIMESTAMPTZ,
  "verification_count" INTEGER NOT NULL DEFAULT 0,
  "source_url" TEXT,
  "source_name" TEXT,
  "source_type" TEXT,
  "source_last_checked" TIMESTAMPTZ,
  "original_value" TEXT,
  "current_value" TEXT,
  "updated_value" TEXT,
  "update_applied" BOOLEAN NOT NULL DEFAULT false,
  "update_applied_at" TIMESTAMPTZ,
  "agent_notes" TEXT,
  "verification_log" JSONB,
  "siteId" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
  },
  {
    table: "information_sections",
    model: "InformationSection",
    sql: `CREATE TABLE IF NOT EXISTS "information_sections" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "name_en" TEXT NOT NULL,
  "name_ar" TEXT NOT NULL,
  "description_en" TEXT,
  "description_ar" TEXT,
  "icon" TEXT,
  "featured_image" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 1,
  "published" BOOLEAN NOT NULL DEFAULT true,
  "subsections" JSONB,
  "siteId" TEXT,
  "deletedAt" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
  },
  {
    table: "information_categories",
    model: "InformationCategory",
    sql: `CREATE TABLE IF NOT EXISTS "information_categories" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "name_en" TEXT NOT NULL,
  "name_ar" TEXT NOT NULL,
  "description_en" TEXT,
  "description_ar" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
  },
  {
    table: "information_articles",
    model: "InformationArticle",
    sql: `CREATE TABLE IF NOT EXISTS "information_articles" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "section_id" TEXT NOT NULL,
  "category_id" TEXT NOT NULL,
  "title_en" TEXT NOT NULL,
  "title_ar" TEXT NOT NULL,
  "excerpt_en" TEXT,
  "excerpt_ar" TEXT,
  "content_en" TEXT NOT NULL,
  "content_ar" TEXT NOT NULL,
  "featured_image" TEXT,
  "reading_time" INTEGER NOT NULL DEFAULT 5,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "meta_title_en" TEXT,
  "meta_title_ar" TEXT,
  "meta_description_en" TEXT,
  "meta_description_ar" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT '{}',
  "keywords" TEXT[] NOT NULL DEFAULT '{}',
  "page_type" TEXT DEFAULT 'article',
  "seo_score" INTEGER DEFAULT 0,
  "faq_questions" JSONB,
  "siteId" TEXT,
  "deletedAt" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // YACHT CHARTER MODELS (Zenitha Yachts)
  // ════════════════════════════════════════════════════════════════════════

  {
    table: "yachts",
    model: "Yacht",
    sql: `CREATE TABLE IF NOT EXISTS "yachts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "externalId" TEXT,
  "source" "YachtSource" NOT NULL DEFAULT 'MANUAL',
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "type" "YachtType" NOT NULL DEFAULT 'SAILBOAT',
  "length" DECIMAL(6,2),
  "beam" DECIMAL(5,2),
  "draft" DECIMAL(4,2),
  "yearBuilt" INTEGER,
  "builder" TEXT,
  "model" TEXT,
  "cabins" INTEGER NOT NULL DEFAULT 0,
  "berths" INTEGER NOT NULL DEFAULT 0,
  "bathrooms" INTEGER NOT NULL DEFAULT 0,
  "crewSize" INTEGER NOT NULL DEFAULT 0,
  "pricePerWeekLow" DECIMAL(10,2),
  "pricePerWeekHigh" DECIMAL(10,2),
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "description_en" TEXT,
  "description_ar" TEXT,
  "features" JSONB,
  "images" JSONB,
  "waterSports" JSONB,
  "halalCateringAvailable" BOOLEAN NOT NULL DEFAULT false,
  "familyFriendly" BOOLEAN NOT NULL DEFAULT false,
  "crewIncluded" BOOLEAN NOT NULL DEFAULT false,
  "homePort" TEXT,
  "cruisingArea" TEXT,
  "rating" DECIMAL(3,2),
  "reviewCount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'active',
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "siteId" TEXT NOT NULL,
  "destinationId" TEXT,
  "lastSyncedAt" TIMESTAMP(3),
  "syncHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "yacht_destinations",
    model: "YachtDestination",
    sql: `CREATE TABLE IF NOT EXISTS "yacht_destinations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "region" "DestinationRegion" NOT NULL,
  "country" TEXT,
  "description_en" TEXT,
  "description_ar" TEXT,
  "seasonStart" TEXT,
  "seasonEnd" TEXT,
  "bestMonths" JSONB,
  "heroImage" TEXT,
  "galleryImages" JSONB,
  "averagePricePerWeek" DECIMAL(10,2),
  "highlights" JSONB,
  "weatherInfo" JSONB,
  "marinas" JSONB,
  "siteId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "charter_inquiries",
    model: "CharterInquiry",
    sql: `CREATE TABLE IF NOT EXISTS "charter_inquiries" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "referenceNumber" TEXT,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "whatsappNumber" TEXT,
  "destination" TEXT,
  "preferredDates" JSONB,
  "guestCount" INTEGER NOT NULL DEFAULT 2,
  "childrenCount" INTEGER NOT NULL DEFAULT 0,
  "budget" DECIMAL(10,2),
  "budgetCurrency" TEXT NOT NULL DEFAULT 'EUR',
  "yachtTypePreference" "YachtType",
  "preferences" JSONB,
  "experienceLevel" TEXT NOT NULL DEFAULT 'first_time',
  "languagePreference" TEXT NOT NULL DEFAULT 'en',
  "contactPreference" TEXT NOT NULL DEFAULT 'email',
  "message" TEXT,
  "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
  "brokerAssigned" TEXT,
  "brokerNotes" TEXT,
  "source" TEXT,
  "utmSource" TEXT,
  "utmMedium" TEXT,
  "utmCampaign" TEXT,
  "yachtId" TEXT,
  "siteId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "yacht_availability",
    model: "YachtAvailability",
    sql: `CREATE TABLE IF NOT EXISTS "yacht_availability" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "yachtId" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "status" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
  "priceForPeriod" DECIMAL(10,2),
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "source" "YachtSource" NOT NULL,
  "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "yacht_reviews",
    model: "YachtReview",
    sql: `CREATE TABLE IF NOT EXISTS "yacht_reviews" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "yachtId" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "authorEmail" TEXT,
  "rating" INTEGER NOT NULL,
  "title" TEXT,
  "content_en" TEXT,
  "content_ar" TEXT,
  "charterDate" TIMESTAMP(3),
  "destination" TEXT,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
  "siteId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "charter_itineraries",
    model: "CharterItinerary",
    sql: `CREATE TABLE IF NOT EXISTS "charter_itineraries" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title_en" TEXT NOT NULL,
  "title_ar" TEXT,
  "slug" TEXT NOT NULL,
  "destinationId" TEXT NOT NULL,
  "duration" INTEGER NOT NULL,
  "difficulty" "ItineraryDifficulty" NOT NULL DEFAULT 'EASY',
  "description_en" TEXT,
  "description_ar" TEXT,
  "stops" JSONB NOT NULL,
  "recommendedYachtTypes" JSONB,
  "estimatedCost" DECIMAL(10,2),
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "bestSeason" TEXT,
  "heroImage" TEXT,
  "siteId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "broker_partners",
    model: "BrokerPartner",
    sql: `CREATE TABLE IF NOT EXISTS "broker_partners" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyName" TEXT NOT NULL,
  "contactName" TEXT,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "website" TEXT,
  "commissionRate" DECIMAL(5,2),
  "destinations" JSONB,
  "status" TEXT NOT NULL DEFAULT 'active',
  "totalLeadsSent" INTEGER NOT NULL DEFAULT 0,
  "totalBookings" INTEGER NOT NULL DEFAULT 0,
  "siteId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "yacht_sync_logs",
    model: "YachtSyncLog",
    sql: `CREATE TABLE IF NOT EXISTS "yacht_sync_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "source" "YachtSource" NOT NULL,
  "syncType" TEXT NOT NULL DEFAULT 'incremental',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "yachtsProcessed" INTEGER NOT NULL DEFAULT 0,
  "yachtsCreated" INTEGER NOT NULL DEFAULT 0,
  "yachtsUpdated" INTEGER NOT NULL DEFAULT 0,
  "yachtsDeactivated" INTEGER NOT NULL DEFAULT 0,
  "errors" JSONB,
  "status" "SyncStatus" NOT NULL DEFAULT 'RUNNING',
  "siteId" TEXT NOT NULL
)`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // DESIGN SYSTEM MODELS
  // ════════════════════════════════════════════════════════════════════════

  {
    table: "designs",
    model: "Design",
    sql: `CREATE TABLE IF NOT EXISTS "designs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL,
  "category" TEXT,
  "site" TEXT NOT NULL,
  "canvasData" JSONB NOT NULL,
  "thumbnail" TEXT,
  "exportedUrls" JSONB,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "tags" TEXT[],
  "isTemplate" BOOLEAN NOT NULL DEFAULT false,
  "templateId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "pdf_guides",
    model: "PdfGuide",
    sql: `CREATE TABLE IF NOT EXISTS "pdf_guides" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "site" TEXT NOT NULL,
  "style" TEXT NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'en',
  "contentSections" JSONB NOT NULL,
  "htmlContent" TEXT,
  "pdfUrl" TEXT,
  "coverDesignId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "price" DOUBLE PRECISION DEFAULT 0,
  "isGated" BOOLEAN NOT NULL DEFAULT false,
  "downloads" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "pdf_downloads",
    model: "PdfDownload",
    sql: `CREATE TABLE IF NOT EXISTS "pdf_downloads" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "pdfGuideId" TEXT NOT NULL,
  "leadId" TEXT,
  "email" TEXT,
  "ip" TEXT,
  "userAgent" TEXT,
  "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "email_templates",
    model: "EmailTemplate",
    sql: `CREATE TABLE IF NOT EXISTS "email_templates" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "site" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "subject" TEXT,
  "htmlContent" TEXT NOT NULL,
  "jsonContent" JSONB,
  "thumbnail" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "email_campaigns",
    model: "EmailCampaign",
    sql: `CREATE TABLE IF NOT EXISTS "email_campaigns" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "site" TEXT NOT NULL,
  "templateId" TEXT,
  "subject" TEXT NOT NULL,
  "htmlContent" TEXT NOT NULL,
  "recipientCount" INTEGER NOT NULL DEFAULT 0,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "openCount" INTEGER NOT NULL DEFAULT 0,
  "clickCount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "scheduledAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "video_projects",
    model: "VideoProject",
    sql: `CREATE TABLE IF NOT EXISTS "video_projects" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "site" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'en',
  "scenes" JSONB NOT NULL,
  "compositionCode" TEXT,
  "prompt" TEXT,
  "duration" INTEGER NOT NULL,
  "fps" INTEGER NOT NULL DEFAULT 30,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "thumbnail" TEXT,
  "exportedUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "content_pipelines",
    model: "ContentPipeline",
    sql: `CREATE TABLE IF NOT EXISTS "content_pipelines" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'researching',
  "topic" TEXT,
  "language" TEXT NOT NULL DEFAULT 'en',
  "researchData" JSONB,
  "contentAngles" JSONB,
  "scripts" JSONB,
  "analysisData" JSONB,
  "generatedPosts" JSONB,
  "generatedArticleId" TEXT,
  "generatedEmailId" TEXT,
  "generatedVideoIds" JSONB,
  "generatedDesignIds" JSONB,
  "feedForwardApplied" JSONB,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "content_performance",
    model: "ContentPerformance",
    sql: `CREATE TABLE IF NOT EXISTS "content_performance" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "pipelineId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "postUrl" TEXT,
  "publishedAt" TIMESTAMP(3),
  "impressions" INTEGER NOT NULL DEFAULT 0,
  "engagements" INTEGER NOT NULL DEFAULT 0,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "shares" INTEGER NOT NULL DEFAULT 0,
  "saves" INTEGER NOT NULL DEFAULT 0,
  "comments" INTEGER NOT NULL DEFAULT 0,
  "conversionRate" DOUBLE PRECISION,
  "grade" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  // ── ApiUsageLog ─────────────────────────────────
  {
    table: "api_usage_logs",
    model: "ApiUsageLog",
    sql: `CREATE TABLE IF NOT EXISTS "api_usage_logs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "siteId" TEXT NOT NULL DEFAULT 'unknown',
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "taskType" TEXT,
  "calledFrom" TEXT,
  "promptTokens" INTEGER NOT NULL DEFAULT 0,
  "completionTokens" INTEGER NOT NULL DEFAULT 0,
  "totalTokens" INTEGER NOT NULL DEFAULT 0,
  "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "api_usage_logs_pkey" PRIMARY KEY ("id")
)`,
  },
  {
    table: "seo_audit_reports",
    model: "SeoAuditReport",
    sql: `CREATE TABLE IF NOT EXISTS "seo_audit_reports" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "siteId" TEXT NOT NULL,
  "healthScore" INTEGER NOT NULL DEFAULT 0,
  "totalFindings" INTEGER NOT NULL DEFAULT 0,
  "criticalCount" INTEGER NOT NULL DEFAULT 0,
  "highCount" INTEGER NOT NULL DEFAULT 0,
  "mediumCount" INTEGER NOT NULL DEFAULT 0,
  "lowCount" INTEGER NOT NULL DEFAULT 0,
  "report" JSONB NOT NULL,
  "summary" TEXT,
  "triggeredBy" TEXT NOT NULL DEFAULT 'manual',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seo_audit_reports_pkey" PRIMARY KEY ("id")
)`,
  },
  // ── GSC Page Performance ──────────────────────────
  {
    table: "gsc_page_performance",
    model: "GscPagePerformance",
    sql: `CREATE TABLE IF NOT EXISTS "gsc_page_performance" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "site_id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "impressions" INTEGER NOT NULL DEFAULT 0,
  "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gsc_page_performance_pkey" PRIMARY KEY ("id")
)`,
  },
  // ── Performance Audits ────────────────────────────
  {
    table: "performance_audits",
    model: "PerformanceAuditResult",
    sql: `CREATE TABLE IF NOT EXISTS "performance_audits" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "siteId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "strategy" TEXT NOT NULL DEFAULT 'mobile',
  "performanceScore" DOUBLE PRECISION,
  "accessibilityScore" DOUBLE PRECISION,
  "bestPracticesScore" DOUBLE PRECISION,
  "seoScore" DOUBLE PRECISION,
  "lcpMs" DOUBLE PRECISION,
  "clsScore" DOUBLE PRECISION,
  "inpMs" DOUBLE PRECISION,
  "fcpMs" DOUBLE PRECISION,
  "tbtMs" DOUBLE PRECISION,
  "speedIndex" DOUBLE PRECISION,
  "diagnostics" JSONB,
  "runId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "performance_audits_pkey" PRIMARY KEY ("id")
)`,
  },
  // ── Auto Fix Logs ─────────────────────────────────
  {
    table: "auto_fix_logs",
    model: "AutoFixLog",
    sql: `CREATE TABLE IF NOT EXISTS "auto_fix_logs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "siteId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "fixType" TEXT NOT NULL,
  "agent" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auto_fix_logs_pkey" PRIMARY KEY ("id")
)`,
  },
  // ── Dev Tasks ─────────────────────────────────────
  {
    table: "dev_tasks",
    model: "DevTask",
    sql: `CREATE TABLE IF NOT EXISTS "dev_tasks" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "siteId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "dueDate" TIMESTAMP(3),
  "source" TEXT NOT NULL DEFAULT 'manual',
  "sourceRef" TEXT,
  "actionLabel" TEXT,
  "actionApi" TEXT,
  "actionPayload" JSONB,
  "completedAt" TIMESTAMP(3),
  "completedBy" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dev_tasks_pkey" PRIMARY KEY ("id")
)`,
  },
  // ── System Diagnostics ────────────────────────────
  {
    table: "system_diagnostics",
    model: "SystemDiagnostic",
    sql: `CREATE TABLE IF NOT EXISTS "system_diagnostics" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "siteId" TEXT,
  "runId" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "groups" TEXT[],
  "totalTests" INTEGER NOT NULL DEFAULT 0,
  "passed" INTEGER NOT NULL DEFAULT 0,
  "warnings" INTEGER NOT NULL DEFAULT 0,
  "failed" INTEGER NOT NULL DEFAULT 0,
  "healthScore" INTEGER NOT NULL DEFAULT 0,
  "verdict" TEXT NOT NULL DEFAULT 'unknown',
  "results" JSONB NOT NULL,
  "envStatus" JSONB,
  "recommendations" JSONB,
  "fixesAttempted" INTEGER NOT NULL DEFAULT 0,
  "fixesSucceeded" INTEGER NOT NULL DEFAULT 0,
  "durationMs" INTEGER,
  "ranBy" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "system_diagnostics_pkey" PRIMARY KEY ("id")
)`,
  },
  // ── Audit Runs (Master Audit Engine) ──────────────
  {
    table: "audit_runs",
    model: "AuditRun",
    sql: `CREATE TABLE IF NOT EXISTS "audit_runs" (
  "id" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "mode" TEXT NOT NULL DEFAULT 'full',
  "triggeredBy" TEXT NOT NULL DEFAULT 'scheduled',
  "totalUrls" INTEGER NOT NULL DEFAULT 0,
  "processedUrls" INTEGER NOT NULL DEFAULT 0,
  "currentBatch" INTEGER NOT NULL DEFAULT 0,
  "totalBatches" INTEGER NOT NULL DEFAULT 0,
  "urlInventory" JSONB,
  "crawlResults" JSONB,
  "sitemapXml" TEXT,
  "totalIssues" INTEGER NOT NULL DEFAULT 0,
  "p0Count" INTEGER NOT NULL DEFAULT 0,
  "p1Count" INTEGER NOT NULL DEFAULT 0,
  "p2Count" INTEGER NOT NULL DEFAULT 0,
  "healthScore" INTEGER,
  "hardGatesPassed" BOOLEAN,
  "hardGatesJson" JSONB,
  "softGatesJson" JSONB,
  "reportMarkdown" TEXT,
  "fixPlanMarkdown" TEXT,
  "configSnapshot" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  CONSTRAINT "audit_runs_pkey" PRIMARY KEY ("id")
)`,
  },
  // ── Audit Issues (Master Audit Engine) ────────────
  {
    table: "audit_issues",
    model: "AuditIssue",
    sql: `CREATE TABLE IF NOT EXISTS "audit_issues" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "auditRunId" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "evidence" JSONB,
  "suggestedFix" JSONB,
  "status" TEXT NOT NULL DEFAULT 'open',
  "ignoredAt" TIMESTAMP(3),
  "ignoredBy" TEXT,
  "fixedAt" TIMESTAMP(3),
  "fixedInRunId" TEXT,
  "fingerprint" TEXT NOT NULL,
  "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "detectionCount" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_issues_pkey" PRIMARY KEY ("id")
)`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // CONTENT PIPELINE CORE MODELS
  // ════════════════════════════════════════════════════════════════════════

  {
    table: "article_drafts",
    model: "ArticleDraft",
    sql: `CREATE TABLE IF NOT EXISTS "article_drafts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT NOT NULL,
  "keyword" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'en',
  "topic_title" TEXT,
  "current_phase" TEXT NOT NULL DEFAULT 'research',
  "phase_attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "sections_completed" INTEGER NOT NULL DEFAULT 0,
  "sections_total" INTEGER NOT NULL DEFAULT 0,
  "research_data" JSONB,
  "outline_data" JSONB,
  "sections_data" JSONB,
  "assembled_html" TEXT,
  "assembled_html_alt" TEXT,
  "seo_meta" JSONB,
  "images_data" JSONB,
  "quality_score" DOUBLE PRECISION,
  "seo_score" DOUBLE PRECISION,
  "word_count" INTEGER,
  "readability_score" DOUBLE PRECISION,
  "content_depth_score" DOUBLE PRECISION,
  "topic_proposal_id" TEXT,
  "ai_model_used" TEXT,
  "generation_strategy" TEXT,
  "paired_draft_id" TEXT,
  "blog_post_id" TEXT,
  "published_at" TIMESTAMP(3),
  "rejection_reason" TEXT,
  "needs_review" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "phase_started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3)
)`,
  },
  {
    table: "topic_proposals",
    model: "TopicProposal",
    sql: `CREATE TABLE IF NOT EXISTS "topic_proposals" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT,
  "title" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "primary_keyword" TEXT NOT NULL,
  "longtails" TEXT[] NOT NULL DEFAULT '{}',
  "featured_longtails" TEXT[] NOT NULL DEFAULT '{}',
  "questions" TEXT[] NOT NULL DEFAULT '{}',
  "authority_links_json" JSONB NOT NULL DEFAULT '{}',
  "intent" TEXT NOT NULL,
  "suggested_page_type" TEXT NOT NULL,
  "suggested_window_start" TIMESTAMP(3),
  "suggested_window_end" TIMESTAMP(3),
  "source_weights_json" JSONB NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'planned',
  "confidence_score" DOUBLE PRECISION,
  "planned_at" TIMESTAMP(3),
  "evergreen" BOOLEAN NOT NULL DEFAULT true,
  "season" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // MONITORING & OPERATIONS MODELS
  // ════════════════════════════════════════════════════════════════════════

  {
    table: "url_indexing_status",
    model: "URLIndexingStatus",
    sql: `CREATE TABLE IF NOT EXISTS "url_indexing_status" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "slug" TEXT,
  "status" TEXT NOT NULL DEFAULT 'discovered',
  "coverage_state" TEXT,
  "indexing_state" TEXT,
  "submitted_indexnow" BOOLEAN NOT NULL DEFAULT false,
  "submitted_google_api" BOOLEAN NOT NULL DEFAULT false,
  "submitted_sitemap" BOOLEAN NOT NULL DEFAULT false,
  "last_submitted_at" TIMESTAMP(3),
  "last_inspected_at" TIMESTAMP(3),
  "last_crawled_at" TIMESTAMP(3),
  "inspection_result" JSONB,
  "submission_attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "cron_job_logs",
    model: "CronJobLog",
    sql: `CREATE TABLE IF NOT EXISTS "cron_job_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT,
  "job_name" TEXT NOT NULL,
  "job_type" TEXT NOT NULL DEFAULT 'scheduled',
  "status" TEXT NOT NULL DEFAULT 'running',
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  "duration_ms" INTEGER,
  "result_summary" JSONB,
  "items_processed" INTEGER NOT NULL DEFAULT 0,
  "items_succeeded" INTEGER NOT NULL DEFAULT 0,
  "items_failed" INTEGER NOT NULL DEFAULT 0,
  "error_message" TEXT,
  "error_stack" TEXT,
  "sites_processed" TEXT[] NOT NULL DEFAULT '{}',
  "sites_skipped" TEXT[] NOT NULL DEFAULT '{}',
  "timed_out" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "site_health_checks",
    model: "SiteHealthCheck",
    sql: `CREATE TABLE IF NOT EXISTS "site_health_checks" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT NOT NULL,
  "health_score" INTEGER,
  "indexed_pages" INTEGER,
  "total_pages" INTEGER,
  "indexing_rate" DOUBLE PRECISION,
  "gsc_clicks" INTEGER,
  "gsc_impressions" INTEGER,
  "gsc_ctr" DOUBLE PRECISION,
  "gsc_avg_position" DOUBLE PRECISION,
  "ga4_sessions" INTEGER,
  "ga4_bounce_rate" DOUBLE PRECISION,
  "ga4_engagement_rate" DOUBLE PRECISION,
  "ga4_organic_share" DOUBLE PRECISION,
  "total_posts" INTEGER,
  "posts_published" INTEGER,
  "posts_pending" INTEGER,
  "avg_seo_score" DOUBLE PRECISION,
  "last_agent_run" TIMESTAMP(3),
  "last_content_gen" TIMESTAMP(3),
  "pending_proposals" INTEGER,
  "rewrite_queue" INTEGER,
  "pagespeed_mobile" INTEGER,
  "pagespeed_desktop" INTEGER,
  "snapshot_data" JSONB,
  "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // AI CONFIGURATION MODELS
  // ════════════════════════════════════════════════════════════════════════

  {
    table: "model_providers",
    model: "ModelProvider",
    sql: `CREATE TABLE IF NOT EXISTS "model_providers" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT,
  "name" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "provider_type" TEXT NOT NULL,
  "api_endpoint" TEXT,
  "api_key_encrypted" TEXT,
  "api_version" TEXT,
  "rate_limits_json" JSONB,
  "cost_per_token" DOUBLE PRECISION,
  "capabilities" TEXT[] NOT NULL DEFAULT '{}',
  "model_config_json" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_tested_at" TIMESTAMP(3),
  "test_status" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "model_routes",
    model: "ModelRoute",
    sql: `CREATE TABLE IF NOT EXISTS "model_routes" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT,
  "route_name" TEXT NOT NULL,
  "primary_provider_id" TEXT NOT NULL,
  "fallback_provider_id" TEXT,
  "routing_rules_json" JSONB NOT NULL DEFAULT '{}',
  "cost_optimization" BOOLEAN NOT NULL DEFAULT false,
  "quality_threshold" DOUBLE PRECISION,
  "max_retries" INTEGER NOT NULL DEFAULT 3,
  "timeout_seconds" INTEGER NOT NULL DEFAULT 30,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "feature_flags",
    model: "FeatureFlag",
    sql: `CREATE TABLE IF NOT EXISTS "feature_flags" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "siteId" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // AFFILIATE & REVENUE TRACKING MODELS
  // ════════════════════════════════════════════════════════════════════════

  {
    table: "affiliate_clicks",
    model: "AffiliateClick",
    sql: `CREATE TABLE IF NOT EXISTS "affiliate_clicks" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT NOT NULL,
  "partner_id" TEXT NOT NULL,
  "resort_id" TEXT,
  "product_id" TEXT,
  "article_id" TEXT,
  "link_type" TEXT,
  "session_id" TEXT NOT NULL,
  "visitor_id" TEXT,
  "utm_source" TEXT,
  "utm_medium" TEXT,
  "utm_campaign" TEXT,
  "utm_content" TEXT,
  "utm_term" TEXT,
  "referrer" TEXT,
  "landing_page" TEXT,
  "user_agent" TEXT,
  "device_type" TEXT,
  "country_code" TEXT,
  "clicked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "conversions",
    model: "Conversion",
    sql: `CREATE TABLE IF NOT EXISTS "conversions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT NOT NULL,
  "click_id" TEXT NOT NULL UNIQUE,
  "partner_id" TEXT NOT NULL,
  "booking_ref" TEXT,
  "booking_value" INTEGER NOT NULL,
  "commission" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" "ConversionStatus" NOT NULL DEFAULT 'PENDING',
  "check_in" TIMESTAMP(3),
  "check_out" TIMESTAMP(3),
  "converted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmed_at" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3)
)`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // CJ AFFILIATE NETWORK MODELS
  // ════════════════════════════════════════════════════════════════════════

  {
    table: "affiliate_networks",
    model: "AffiliateNetwork",
    sql: `CREATE TABLE IF NOT EXISTS "affiliate_networks" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "apiBaseUrl" TEXT,
  "apiTokenEnvVar" TEXT NOT NULL,
  "publisherId" TEXT NOT NULL,
  "status" "NetworkStatus" NOT NULL DEFAULT 'ACTIVE',
  "config" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "cj_advertisers",
    model: "CjAdvertiser",
    sql: `CREATE TABLE IF NOT EXISTS "cj_advertisers" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "networkId" TEXT NOT NULL REFERENCES "affiliate_networks"("id") ON DELETE CASCADE,
  "externalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "programUrl" TEXT,
  "category" TEXT,
  "status" "AdvertiserStatus" NOT NULL DEFAULT 'PENDING',
  "commissionRate" TEXT,
  "sevenDayEpc" DOUBLE PRECISION,
  "threeMonthEpc" DOUBLE PRECISION,
  "cookieDuration" INTEGER,
  "priority" "AdvertiserPriority" NOT NULL DEFAULT 'MEDIUM',
  "lastSynced" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("networkId", "externalId")
)`,
  },
  {
    table: "cj_links",
    model: "CjLink",
    sql: `CREATE TABLE IF NOT EXISTS "cj_links" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "networkId" TEXT NOT NULL REFERENCES "affiliate_networks"("id") ON DELETE CASCADE,
  "advertiserId" TEXT NOT NULL REFERENCES "cj_advertisers"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "destinationUrl" TEXT NOT NULL,
  "affiliateUrl" TEXT NOT NULL,
  "linkType" "CjLinkType" NOT NULL DEFAULT 'TEXT',
  "category" TEXT,
  "language" "CjLanguage" NOT NULL DEFAULT 'EN',
  "placement" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "impressions" INTEGER NOT NULL DEFAULT 0,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "conversions" INTEGER NOT NULL DEFAULT 0,
  "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lastClickAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "cj_offers",
    model: "CjOffer",
    sql: `CREATE TABLE IF NOT EXISTS "cj_offers" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "networkId" TEXT NOT NULL REFERENCES "affiliate_networks"("id") ON DELETE CASCADE,
  "advertiserId" TEXT NOT NULL REFERENCES "cj_advertisers"("id") ON DELETE CASCADE,
  "externalId" TEXT,
  "title" TEXT NOT NULL,
  "titleAr" TEXT,
  "description" TEXT,
  "descriptionAr" TEXT,
  "affiliateUrl" TEXT NOT NULL,
  "imageUrl" TEXT,
  "price" DOUBLE PRECISION,
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "category" TEXT NOT NULL,
  "subcategory" TEXT,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "validFrom" TIMESTAMP(3),
  "validTo" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isPriceDropped" BOOLEAN NOT NULL DEFAULT false,
  "isNewArrival" BOOLEAN NOT NULL DEFAULT false,
  "previousPrice" DOUBLE PRECISION,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "cj_commissions",
    model: "CjCommission",
    sql: `CREATE TABLE IF NOT EXISTS "cj_commissions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "networkId" TEXT NOT NULL REFERENCES "affiliate_networks"("id") ON DELETE CASCADE,
  "advertiserId" TEXT NOT NULL REFERENCES "cj_advertisers"("id") ON DELETE CASCADE,
  "linkId" TEXT REFERENCES "cj_links"("id") ON DELETE SET NULL,
  "externalId" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "saleAmount" DOUBLE PRECISION NOT NULL,
  "commissionAmount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
  "eventDate" TIMESTAMP(3) NOT NULL,
  "lockDate" TIMESTAMP(3),
  "publishDate" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("networkId", "externalId")
)`,
  },
  {
    table: "cj_click_events",
    model: "CjClickEvent",
    sql: `CREATE TABLE IF NOT EXISTS "cj_click_events" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "linkId" TEXT NOT NULL REFERENCES "cj_links"("id") ON DELETE CASCADE,
  "sessionId" TEXT,
  "pageUrl" TEXT NOT NULL,
  "userAgent" TEXT,
  "country" TEXT,
  "device" "ClickDevice" NOT NULL DEFAULT 'DESKTOP',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "cj_sync_logs",
    model: "CjSyncLog",
    sql: `CREATE TABLE IF NOT EXISTS "cj_sync_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "networkId" TEXT NOT NULL REFERENCES "affiliate_networks"("id") ON DELETE CASCADE,
  "syncType" "SyncType" NOT NULL,
  "status" "CjSyncStatus" NOT NULL DEFAULT 'SUCCESS',
  "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
  "recordsCreated" INTEGER NOT NULL DEFAULT 0,
  "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
  "errors" JSONB,
  "duration" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "cj_placements",
    model: "CjPlacement",
    sql: `CREATE TABLE IF NOT EXISTS "cj_placements" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "type" "PlacementType" NOT NULL DEFAULT 'INLINE',
  "pagePattern" TEXT NOT NULL,
  "position" TEXT NOT NULL,
  "maxLinks" INTEGER NOT NULL DEFAULT 3,
  "rotationStrategy" "RotationStrategy" NOT NULL DEFAULT 'HIGHEST_EPC',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "config" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "cj_placement_rules",
    model: "CjPlacementRule",
    sql: `CREATE TABLE IF NOT EXISTS "cj_placement_rules" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "placementId" TEXT NOT NULL REFERENCES "cj_placements"("id") ON DELETE CASCADE,
  "condition" "PlacementCondition" NOT NULL DEFAULT 'CATEGORY_MATCH',
  "value" TEXT NOT NULL,
  "advertiserId" TEXT,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // SUBSCRIBER & EMAIL MODELS
  // ════════════════════════════════════════════════════════════════════════

  {
    table: "subscribers",
    model: "Subscriber",
    sql: `CREATE TABLE IF NOT EXISTS "subscribers" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT,
  "email" TEXT NOT NULL,
  "status" "SubscriberStatus" NOT NULL DEFAULT 'PENDING',
  "source" TEXT,
  "preferences_json" JSONB,
  "metadata_json" JSONB,
  "double_optin_token" TEXT UNIQUE,
  "double_optin_sent_at" TIMESTAMP(3),
  "confirmed_at" TIMESTAMP(3),
  "unsubscribed_at" TIMESTAMP(3),
  "unsubscribe_reason" TEXT,
  "last_campaign_sent" TIMESTAMP(3),
  "engagement_score" DOUBLE PRECISION,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // SEO AUDIT ACTIONS
  // ════════════════════════════════════════════════════════════════════════

  {
    table: "seo_audit_actions",
    model: "SeoAuditAction",
    sql: `CREATE TABLE IF NOT EXISTS "seo_audit_actions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "auditId" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "actionItemId" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "autoFixable" BOOLEAN NOT NULL DEFAULT false,
  "fixType" TEXT NOT NULL,
  "affectedUrls" TEXT[] NOT NULL DEFAULT '{}',
  "executionLog" JSONB,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // TEAM & AUTHOR MODELS
  // ════════════════════════════════════════════════════════════════════════

  {
    table: "team_members",
    model: "TeamMember",
    sql: `CREATE TABLE IF NOT EXISTS "team_members" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT,
  "user_id" TEXT,
  "name_en" TEXT NOT NULL,
  "name_ar" TEXT,
  "slug" TEXT NOT NULL UNIQUE,
  "title_en" TEXT NOT NULL,
  "title_ar" TEXT,
  "bio_en" TEXT NOT NULL,
  "bio_ar" TEXT,
  "avatar_url" TEXT,
  "cover_image_url" TEXT,
  "email_public" TEXT,
  "linkedin_url" TEXT,
  "twitter_url" TEXT,
  "instagram_url" TEXT,
  "website_url" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_featured" BOOLEAN NOT NULL DEFAULT false,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "site_settings",
    model: "SiteSettings",
    sql: `CREATE TABLE IF NOT EXISTS "site_settings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siteId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "config" JSONB NOT NULL DEFAULT '{}',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },

  // ── Auth Models ─────────────────────────────────────────────────────────────
  {
    table: "users",
    model: "User",
    sql: `CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT,
  "email" TEXT NOT NULL UNIQUE,
  "emailVerified" TIMESTAMP(3),
  "image" TEXT,
  "passwordHash" TEXT,
  "role" TEXT NOT NULL DEFAULT 'viewer',
  "permissions" TEXT[] DEFAULT '{}',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "deletedAt" TIMESTAMP(3),
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "accounts",
    model: "Account",
    sql: `CREATE TABLE IF NOT EXISTS "accounts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  UNIQUE("provider", "providerAccountId")
)`,
  },
  {
    table: "sessions",
    model: "Session",
    sql: `CREATE TABLE IF NOT EXISTS "sessions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionToken" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "verificationtokens",
    model: "VerificationToken",
    sql: `CREATE TABLE IF NOT EXISTS "verificationtokens" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "expires" TIMESTAMP(3) NOT NULL,
  UNIQUE("identifier", "token")
)`,
  },

  // ── Core Content Models ─────────────────────────────────────────────────────
  {
    table: "Category",
    model: "Category",
    sql: `CREATE TABLE IF NOT EXISTS "Category" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name_en" TEXT NOT NULL,
  "name_ar" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "description_en" TEXT,
  "description_ar" TEXT,
  "image_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "BlogPost",
    model: "BlogPost",
    sql: `CREATE TABLE IF NOT EXISTS "BlogPost" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title_en" TEXT NOT NULL,
  "title_ar" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "excerpt_en" TEXT,
  "excerpt_ar" TEXT,
  "content_en" TEXT NOT NULL,
  "content_ar" TEXT NOT NULL,
  "featured_image" TEXT,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "category_id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "meta_title_en" TEXT,
  "meta_title_ar" TEXT,
  "meta_description_en" TEXT,
  "meta_description_ar" TEXT,
  "tags" TEXT[] DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "page_type" TEXT,
  "keywords_json" JSONB,
  "questions_json" JSONB,
  "authority_links_json" JSONB,
  "featured_longtails_json" JSONB,
  "seo_score" INTEGER,
  "og_image_id" TEXT,
  "place_id" TEXT,
  "siteId" TEXT,
  "deletedAt" TIMESTAMP(3)
)`,
  },
  {
    table: "Recommendation",
    model: "Recommendation",
    sql: `CREATE TABLE IF NOT EXISTS "Recommendation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name_en" TEXT NOT NULL,
  "name_ar" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description_en" TEXT NOT NULL,
  "description_ar" TEXT NOT NULL,
  "address_en" TEXT NOT NULL,
  "address_ar" TEXT NOT NULL,
  "phone" TEXT,
  "website" TEXT,
  "price_range" TEXT,
  "rating" DOUBLE PRECISION,
  "images" TEXT[] DEFAULT '{}',
  "features_en" TEXT[] DEFAULT '{}',
  "features_ar" TEXT[] DEFAULT '{}',
  "booking_url" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "published" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "ContentGeneration",
    model: "ContentGeneration",
    sql: `CREATE TABLE IF NOT EXISTS "ContentGeneration" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "prompt" TEXT NOT NULL,
  "response" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "used" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "ScheduledContent",
    model: "ScheduledContent",
    sql: `CREATE TABLE IF NOT EXISTS "ScheduledContent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "category" TEXT,
  "tags" TEXT[] DEFAULT '{}',
  "metadata" JSONB,
  "scheduled_time" TIMESTAMP(3) NOT NULL,
  "published_time" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'pending',
  "platform" TEXT,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "content_id" TEXT,
  "site_id" TEXT,
  "page_type" TEXT,
  "topic_proposal_id" TEXT,
  "seo_score" INTEGER,
  "generation_source" TEXT,
  "authority_links_used" JSONB,
  "longtails_used" JSONB
)`,
  },
  {
    table: "SocialEmbed",
    model: "SocialEmbed",
    sql: `CREATE TABLE IF NOT EXISTS "SocialEmbed" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "platform" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "embed_id" TEXT NOT NULL,
  "thumbnail" TEXT,
  "title" TEXT,
  "description" TEXT,
  "author" TEXT,
  "aspect_ratio" TEXT NOT NULL DEFAULT '16:9',
  "metadata" JSONB,
  "status" TEXT NOT NULL DEFAULT 'active',
  "usage_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "MediaAsset",
    model: "MediaAsset",
    sql: `CREATE TABLE IF NOT EXISTS "MediaAsset" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "filename" TEXT NOT NULL,
  "original_name" TEXT NOT NULL,
  "cloud_storage_path" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "file_type" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "file_size" INTEGER NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "alt_text" TEXT,
  "title" TEXT,
  "description" TEXT,
  "tags" TEXT[] DEFAULT '{}',
  "license_info" TEXT,
  "responsive_urls" JSONB,
  "usage_map" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "site_id" TEXT,
  "category" TEXT,
  "folder" TEXT,
  "isVideo" BOOLEAN NOT NULL DEFAULT false,
  "videoPoster" TEXT,
  "videoVariants" JSONB,
  "isHeroVideo" BOOLEAN NOT NULL DEFAULT false,
  "duration" INTEGER,
  "deletedAt" TIMESTAMP(3)
)`,
  },
  {
    table: "HomepageBlock",
    model: "HomepageBlock",
    sql: `CREATE TABLE IF NOT EXISTS "HomepageBlock" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "type" TEXT NOT NULL,
  "title_en" TEXT,
  "title_ar" TEXT,
  "content_en" TEXT,
  "content_ar" TEXT,
  "config" JSONB,
  "media_id" TEXT,
  "position" INTEGER NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "version" TEXT NOT NULL DEFAULT 'draft',
  "language" TEXT NOT NULL DEFAULT 'both',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "heroVideoId" TEXT,
  "heroVideoPoster" TEXT,
  "heroVideoAutoplay" BOOLEAN NOT NULL DEFAULT true,
  "heroVideoMuted" BOOLEAN NOT NULL DEFAULT true,
  "heroVideoLoop" BOOLEAN NOT NULL DEFAULT true
)`,
  },
  {
    table: "HomepageVersion",
    model: "HomepageVersion",
    sql: `CREATE TABLE IF NOT EXISTS "HomepageVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "version_id" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "blocks_data" JSONB NOT NULL,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "DatabaseBackup",
    model: "DatabaseBackup",
    sql: `CREATE TABLE IF NOT EXISTS "DatabaseBackup" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "backup_name" TEXT NOT NULL,
  "backup_size" TEXT NOT NULL,
  "cloud_storage_path" TEXT NOT NULL,
  "backup_type" TEXT NOT NULL,
  "tables_count" INTEGER,
  "records_count" INTEGER,
  "status" TEXT NOT NULL,
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "ApiSettings",
    model: "ApiSettings",
    sql: `CREATE TABLE IF NOT EXISTS "ApiSettings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "key_name" TEXT NOT NULL UNIQUE,
  "key_value" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_tested" TIMESTAMP(3),
  "test_status" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "ContentScheduleRule",
    model: "ContentScheduleRule",
    sql: `CREATE TABLE IF NOT EXISTS "ContentScheduleRule" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "frequency_hours" INTEGER NOT NULL DEFAULT 24,
  "auto_publish" BOOLEAN NOT NULL DEFAULT false,
  "min_hours_between" INTEGER NOT NULL DEFAULT 6,
  "max_posts_per_day" INTEGER NOT NULL DEFAULT 4,
  "preferred_times" TEXT[] DEFAULT '{}',
  "categories" TEXT[] DEFAULT '{}',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
)`,
  },

  // ── SEO Models ──────────────────────────────────────────────────────────────
  {
    table: "seo_meta",
    model: "SeoMeta",
    sql: `CREATE TABLE IF NOT EXISTS "seo_meta" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "pageId" TEXT NOT NULL UNIQUE,
  "url" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "canonical" TEXT,
  "metaKeywords" TEXT,
  "ogTitle" TEXT,
  "ogDescription" TEXT,
  "ogImage" TEXT,
  "ogType" TEXT NOT NULL DEFAULT 'website',
  "twitterTitle" TEXT,
  "twitterDescription" TEXT,
  "twitterImage" TEXT,
  "twitterCard" TEXT NOT NULL DEFAULT 'summary_large_image',
  "robotsMeta" TEXT NOT NULL DEFAULT 'index,follow',
  "schemaType" TEXT,
  "structuredData" JSONB,
  "hreflangAlternates" JSONB,
  "seoScore" INTEGER NOT NULL DEFAULT 0,
  "lastAuditAt" TIMESTAMP(3),
  "auditIssues" TEXT[] DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "seo_redirects",
    model: "SeoRedirect",
    sql: `CREATE TABLE IF NOT EXISTS "seo_redirects" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sourceUrl" TEXT NOT NULL UNIQUE,
  "targetUrl" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL DEFAULT 301,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "seo_internal_links",
    model: "SeoInternalLink",
    sql: `CREATE TABLE IF NOT EXISTS "seo_internal_links" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sourcePageId" TEXT NOT NULL,
  "targetPageId" TEXT NOT NULL,
  "anchorText" TEXT NOT NULL,
  "context" TEXT,
  "relevanceScore" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "seo_keywords",
    model: "SeoKeyword",
    sql: `CREATE TABLE IF NOT EXISTS "seo_keywords" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "keyword" TEXT NOT NULL UNIQUE,
  "searchVolume" INTEGER,
  "competition" DOUBLE PRECISION,
  "difficulty" INTEGER,
  "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "seo_content_analysis",
    model: "SeoContentAnalysis",
    sql: `CREATE TABLE IF NOT EXISTS "seo_content_analysis" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "contentId" TEXT NOT NULL UNIQUE,
  "readabilityScore" DOUBLE PRECISION,
  "keywordDensity" JSONB,
  "sentimentScore" DOUBLE PRECISION,
  "analysisResult" JSONB,
  "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "seo_reports",
    model: "SeoReport",
    sql: `CREATE TABLE IF NOT EXISTS "seo_reports" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT,
  "reportType" TEXT NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "data" JSONB NOT NULL,
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3)
)`,
  },
  {
    table: "seo_health_metrics",
    model: "SeoHealthMetric",
    sql: `CREATE TABLE IF NOT EXISTS "seo_health_metrics" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "pageId" TEXT,
  "url" TEXT,
  "metricName" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "seo_page_metrics",
    model: "SeoPageMetric",
    sql: `CREATE TABLE IF NOT EXISTS "seo_page_metrics" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "pageId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "lcp" DOUBLE PRECISION,
  "fid" DOUBLE PRECISION,
  "cls" DOUBLE PRECISION,
  "fcp" DOUBLE PRECISION,
  "tti" DOUBLE PRECISION,
  "indexed" BOOLEAN,
  "lastCrawled" TIMESTAMP(3),
  "mobileFriendly" BOOLEAN,
  "updatedAt" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "seo_sitemap_entries",
    model: "SeoSitemapEntry",
    sql: `CREATE TABLE IF NOT EXISTS "seo_sitemap_entries" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "url" TEXT NOT NULL UNIQUE,
  "lastModified" TIMESTAMP(3) NOT NULL,
  "changeFrequency" TEXT,
  "priority" DOUBLE PRECISION,
  "sitemapType" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "seo_hreflang_entries",
    model: "SeoHreflangEntry",
    sql: `CREATE TABLE IF NOT EXISTS "seo_hreflang_entries" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "pageId" TEXT NOT NULL,
  "lang" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "seo_structured_data",
    model: "SeoStructuredData",
    sql: `CREATE TABLE IF NOT EXISTS "seo_structured_data" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "pageId" TEXT NOT NULL,
  "schemaType" TEXT NOT NULL,
  "jsonData" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
)`,
  },

  // ── Phase 4 Models ──────────────────────────────────────────────────────────
  {
    table: "RulebookVersion",
    model: "RulebookVersion",
    sql: `CREATE TABLE IF NOT EXISTS "RulebookVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "version" TEXT NOT NULL UNIQUE,
  "changelog" TEXT NOT NULL,
  "weights_json" JSONB NOT NULL,
  "schema_requirements_json" JSONB NOT NULL,
  "prompts_json" JSONB NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "PageTypeRecipe",
    model: "PageTypeRecipe",
    sql: `CREATE TABLE IF NOT EXISTS "PageTypeRecipe" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "type" TEXT NOT NULL UNIQUE,
  "required_blocks" TEXT[] NOT NULL,
  "optional_blocks" TEXT[] NOT NULL,
  "schema_plan_json" JSONB NOT NULL,
  "min_word_count" INTEGER NOT NULL DEFAULT 800,
  "template_prompts_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "ImageAsset",
    model: "ImageAsset",
    sql: `CREATE TABLE IF NOT EXISTS "ImageAsset" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "url" TEXT NOT NULL,
  "cloud_storage_path" TEXT NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "attribution" TEXT,
  "tags" TEXT[] NOT NULL,
  "place_id" TEXT,
  "alt_text" TEXT,
  "title" TEXT,
  "responsive_variants_json" JSONB,
  "usage_count" INTEGER NOT NULL DEFAULT 0,
  "seo_keywords" TEXT[] NOT NULL,
  "auto_assigned" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "VideoAsset",
    model: "VideoAsset",
    sql: `CREATE TABLE IF NOT EXISTS "VideoAsset" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "url" TEXT NOT NULL,
  "cloud_storage_path" TEXT NOT NULL,
  "duration_sec" INTEGER,
  "poster_url" TEXT,
  "attribution" TEXT,
  "tags" TEXT[] NOT NULL,
  "place_id" TEXT,
  "title" TEXT,
  "description" TEXT,
  "usage_count" INTEGER NOT NULL DEFAULT 0,
  "auto_assigned" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "Place",
    model: "Place",
    sql: `CREATE TABLE IF NOT EXISTS "Place" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "category" TEXT NOT NULL,
  "lat" DOUBLE PRECISION,
  "lng" DOUBLE PRECISION,
  "address" TEXT,
  "official_url" TEXT,
  "short_desc" TEXT,
  "tags" TEXT[] NOT NULL,
  "metadata_json" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "AnalyticsSnapshot",
    model: "AnalyticsSnapshot",
    sql: `CREATE TABLE IF NOT EXISTS "AnalyticsSnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT,
  "date_range" TEXT NOT NULL,
  "data_json" JSONB NOT NULL,
  "indexed_pages" INTEGER NOT NULL DEFAULT 0,
  "top_queries" JSONB NOT NULL,
  "performance_metrics" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "SeoAuditResult",
    model: "SeoAuditResult",
    sql: `CREATE TABLE IF NOT EXISTS "SeoAuditResult" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "content_id" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "breakdown_json" JSONB NOT NULL,
  "suggestions" JSONB NOT NULL,
  "quick_fixes" JSONB NOT NULL,
  "internal_link_offers" JSONB,
  "authority_links_used" JSONB,
  "longtails_coverage" JSONB,
  "audit_version" TEXT NOT NULL DEFAULT '1.0',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "MediaEnrichment",
    model: "MediaEnrichment",
    sql: `CREATE TABLE IF NOT EXISTS "MediaEnrichment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "media_id" TEXT NOT NULL UNIQUE,
  "alt_text_original" TEXT,
  "alt_text_enhanced" TEXT,
  "title_enhanced" TEXT,
  "description_enhanced" TEXT,
  "tags_ai" TEXT[] NOT NULL,
  "color_palette" JSONB,
  "composition_data" JSONB,
  "accessibility_score" INTEGER,
  "seo_optimized" BOOLEAN NOT NULL DEFAULT false,
  "processing_status" TEXT NOT NULL DEFAULT 'pending',
  "ai_metadata" JSONB,
  "content_type" TEXT,
  "use_case" TEXT,
  "mood" TEXT,
  "destination_tags" TEXT[] NOT NULL,
  "objects_detected" TEXT[] NOT NULL,
  "text_detected" TEXT,
  "brand_compliance" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "PromptTemplate",
    model: "PromptTemplate",
    sql: `CREATE TABLE IF NOT EXISTS "PromptTemplate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "template_en" TEXT NOT NULL,
  "template_ar" TEXT,
  "variables" JSONB NOT NULL,
  "version" TEXT NOT NULL DEFAULT '1.0',
  "locale_overrides" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" TEXT,
  "usage_count" INTEGER NOT NULL DEFAULT 0,
  "last_used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  UNIQUE("name", "version")
)`,
  },

  // ── Multi-Site Models ───────────────────────────────────────────────────────
  {
    table: "Site",
    model: "Site",
    sql: `CREATE TABLE IF NOT EXISTS "Site" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "domain" TEXT UNIQUE,
  "theme_id" TEXT,
  "settings_json" JSONB NOT NULL,
  "homepage_json" JSONB,
  "logo_url" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "default_locale" TEXT NOT NULL DEFAULT 'en',
  "direction" TEXT NOT NULL DEFAULT 'ltr',
  "favicon_url" TEXT,
  "primary_color" TEXT DEFAULT '#0C4A6E',
  "secondary_color" TEXT DEFAULT '#0EA5E9',
  "features_json" JSONB
)`,
  },
  {
    table: "SiteTheme",
    model: "SiteTheme",
    sql: `CREATE TABLE IF NOT EXISTS "SiteTheme" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "tokens_json" JSONB NOT NULL,
  "preview_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "SiteMember",
    model: "SiteMember",
    sql: `CREATE TABLE IF NOT EXISTS "SiteMember" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  UNIQUE("site_id", "user_id")
)`,
  },

  // ── Enterprise Models ───────────────────────────────────────────────────────
  {
    table: "AuditLog",
    model: "AuditLog",
    sql: `CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "resource" TEXT,
  "resourceId" TEXT,
  "details" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "errorMessage" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "AnalyticsEvent",
    model: "AnalyticsEvent",
    sql: `CREATE TABLE IF NOT EXISTS "AnalyticsEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventName" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'engagement',
  "label" TEXT,
  "value" DOUBLE PRECISION,
  "userId" TEXT,
  "sessionId" TEXT,
  "properties" JSONB,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "referer" TEXT
)`,
  },
  {
    table: "SystemMetrics",
    model: "SystemMetrics",
    sql: `CREATE TABLE IF NOT EXISTS "SystemMetrics" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "metricName" TEXT NOT NULL,
  "metricValue" DOUBLE PRECISION NOT NULL,
  "metricUnit" TEXT,
  "tags" JSONB,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "UserSession",
    model: "UserSession",
    sql: `CREATE TABLE IF NOT EXISTS "UserSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL UNIQUE,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "TopicPolicy",
    model: "TopicPolicy",
    sql: `CREATE TABLE IF NOT EXISTS "TopicPolicy" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT,
  "name" TEXT NOT NULL,
  "policy_type" TEXT NOT NULL,
  "rules_json" JSONB NOT NULL,
  "quotas_json" JSONB,
  "priorities_json" JSONB,
  "auto_approval_rules" JSONB,
  "violation_actions" TEXT[] NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effective_until" TIMESTAMP(3),
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "ConsentLog",
    model: "ConsentLog",
    sql: `CREATE TABLE IF NOT EXISTS "ConsentLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT,
  "subscriber_id" TEXT NOT NULL,
  "consent_type" TEXT NOT NULL,
  "consent_version" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "legal_basis" TEXT NOT NULL,
  "processing_purposes" TEXT[] NOT NULL,
  "data_categories" TEXT[] NOT NULL,
  "consent_text" TEXT,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "Event",
    model: "Event",
    sql: `CREATE TABLE IF NOT EXISTS "Event" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title_en" TEXT NOT NULL,
  "title_ar" TEXT,
  "description_en" TEXT NOT NULL,
  "description_ar" TEXT,
  "date" TIMESTAMP(3) NOT NULL,
  "time" TEXT NOT NULL,
  "venue" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "price" TEXT NOT NULL,
  "image" TEXT,
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "bookingUrl" TEXT NOT NULL,
  "affiliateTag" TEXT,
  "ticketProvider" TEXT,
  "vipAvailable" BOOLEAN NOT NULL DEFAULT false,
  "soldOut" BOOLEAN NOT NULL DEFAULT false,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "published" BOOLEAN NOT NULL DEFAULT true,
  "siteId" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
)`,
  },

  // ── @@map Models (Config/Commerce/Tracking) ─────────────────────────────────
  {
    table: "credentials",
    model: "Credential",
    sql: `CREATE TABLE IF NOT EXISTS "credentials" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "encrypted_value" TEXT NOT NULL,
  "last_used_at" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "site_config",
    model: "SiteConfig",
    sql: `CREATE TABLE IF NOT EXISTS "site_config" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT NOT NULL UNIQUE,
  "config_json" JSONB NOT NULL,
  "seo_config_json" JSONB,
  "theme_config_json" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "content_imports",
    model: "ContentImport",
    sql: `CREATE TABLE IF NOT EXISTS "content_imports" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT,
  "source" TEXT NOT NULL,
  "source_url" TEXT,
  "import_type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "total_items" INTEGER NOT NULL DEFAULT 0,
  "processed_items" INTEGER NOT NULL DEFAULT 0,
  "failed_items" INTEGER NOT NULL DEFAULT 0,
  "error_log" JSONB,
  "mapping_config" JSONB,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "skills",
    model: "Skill",
    sql: `CREATE TABLE IF NOT EXISTS "skills" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "config_json" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "usage_count" INTEGER NOT NULL DEFAULT 0,
  "last_used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "team_member_expertise",
    model: "TeamMemberExpertise",
    sql: `CREATE TABLE IF NOT EXISTS "team_member_expertise" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "team_member_id" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "level" TEXT NOT NULL DEFAULT 'intermediate',
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "content_credits",
    model: "ContentCredit",
    sql: `CREATE TABLE IF NOT EXISTS "content_credits" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "team_member_id" TEXT NOT NULL,
  "content_id" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "domains",
    model: "Domain",
    sql: `CREATE TABLE IF NOT EXISTS "domains" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT,
  "domain" TEXT NOT NULL UNIQUE,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "ssl_status" TEXT NOT NULL DEFAULT 'pending',
  "dns_status" TEXT NOT NULL DEFAULT 'pending',
  "verification_token" TEXT,
  "verified_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "tracking_partners",
    model: "TrackingPartner",
    sql: `CREATE TABLE IF NOT EXISTS "tracking_partners" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT,
  "name" TEXT NOT NULL,
  "partner_type" TEXT NOT NULL,
  "tracking_id" TEXT,
  "config_json" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "leads",
    model: "Lead",
    sql: `CREATE TABLE IF NOT EXISTS "leads" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "phone" TEXT,
  "source" TEXT NOT NULL,
  "source_url" TEXT,
  "status" TEXT NOT NULL DEFAULT 'new',
  "score" INTEGER NOT NULL DEFAULT 0,
  "tags" TEXT[] DEFAULT '{}',
  "metadata" JSONB,
  "assigned_to" TEXT,
  "converted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "lead_activities",
    model: "LeadActivity",
    sql: `CREATE TABLE IF NOT EXISTS "lead_activities" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "lead_id" TEXT NOT NULL,
  "activity_type" TEXT NOT NULL,
  "description" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "page_views",
    model: "PageView",
    sql: `CREATE TABLE IF NOT EXISTS "page_views" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT,
  "url" TEXT NOT NULL,
  "referrer" TEXT,
  "user_agent" TEXT,
  "ip_hash" TEXT,
  "session_id" TEXT,
  "duration_ms" INTEGER,
  "scroll_depth" DOUBLE PRECISION,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "digital_products",
    model: "DigitalProduct",
    sql: `CREATE TABLE IF NOT EXISTS "digital_products" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "price" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "product_type" TEXT NOT NULL,
  "file_url" TEXT,
  "preview_url" TEXT,
  "metadata" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  UNIQUE("site_id", "slug")
)`,
  },
  {
    table: "purchases",
    model: "Purchase",
    sql: `CREATE TABLE IF NOT EXISTS "purchases" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT,
  "product_id" TEXT NOT NULL,
  "customer_email" TEXT NOT NULL,
  "customer_name" TEXT,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "payment_provider" TEXT,
  "payment_id" TEXT,
  "download_count" INTEGER NOT NULL DEFAULT 0,
  "max_downloads" INTEGER NOT NULL DEFAULT 5,
  "expires_at" TIMESTAMP(3),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "campaigns",
    model: "Campaign",
    sql: `CREATE TABLE IF NOT EXISTS "campaigns" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siteId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "config" JSONB NOT NULL DEFAULT '{}',
  "priority" INTEGER NOT NULL DEFAULT 5,
  "totalItems" INTEGER NOT NULL DEFAULT 0,
  "completedItems" INTEGER NOT NULL DEFAULT 0,
  "failedItems" INTEGER NOT NULL DEFAULT 0,
  "skippedItems" INTEGER NOT NULL DEFAULT 0,
  "runCount" INTEGER NOT NULL DEFAULT 0,
  "lastRunAt" TIMESTAMP(3),
  "lastError" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "pausedAt" TIMESTAMP(3),
  "maxItemsPerRun" INTEGER NOT NULL DEFAULT 3,
  "maxAiCostUsd" DOUBLE PRECISION,
  "currentCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "campaign_items",
    model: "CampaignItem",
    sql: `CREATE TABLE IF NOT EXISTS "campaign_items" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "blogPostId" TEXT,
  "articleDraftId" TEXT,
  "targetUrl" TEXT,
  "targetTitle" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "beforeSnapshot" JSONB,
  "afterSnapshot" JSONB,
  "operationsApplied" JSONB,
  "changes" JSONB,
  "error" TEXT,
  "aiCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "billing_entities",
    model: "BillingEntity",
    sql: `CREATE TABLE IF NOT EXISTS "billing_entities" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "stripe_customer_id" TEXT UNIQUE,
  "stripe_account_id" TEXT,
  "default_currency" TEXT NOT NULL DEFAULT 'GBP',
  "country" TEXT NOT NULL DEFAULT 'GB',
  "vat_number" TEXT,
  "address_json" JSONB,
  "metadata_json" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "subscriptions",
    model: "Subscription",
    sql: `CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT,
  "customer_email" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "provider" TEXT,
  "provider_subscription_id" TEXT,
  "current_period_start" TIMESTAMP(3),
  "current_period_end" TIMESTAMP(3),
  "cancel_at" TIMESTAMP(3),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "payment_methods",
    model: "PaymentMethod",
    sql: `CREATE TABLE IF NOT EXISTS "payment_methods" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT,
  "customer_email" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_payment_method_id" TEXT,
  "type" TEXT NOT NULL,
  "last_four" TEXT,
  "brand" TEXT,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "trend_runs",
    model: "TrendRun",
    sql: `CREATE TABLE IF NOT EXISTS "trend_runs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siteId" TEXT NOT NULL,
  "runDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "nichesJson" JSONB,
  "trendsJson" JSONB,
  "opportunitiesJson" JSONB,
  "aiProvider" TEXT,
  "aiModel" TEXT,
  "promptTokens" INTEGER NOT NULL DEFAULT 0,
  "completionTokens" INTEGER NOT NULL DEFAULT 0,
  "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "durationMs" INTEGER,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "product_briefs",
    model: "ProductBrief",
    sql: `CREATE TABLE IF NOT EXISTS "product_briefs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siteId" TEXT NOT NULL,
  "trendRunId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "productType" TEXT NOT NULL DEFAULT 'TEMPLATE',
  "tier" INTEGER NOT NULL DEFAULT 1,
  "ontologyCategory" TEXT NOT NULL,
  "targetPrice" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "keywordsJson" JSONB,
  "competitorUrls" JSONB,
  "designNotesJson" JSONB,
  "listingCopyJson" JSONB,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "approvedAt" TIMESTAMP(3),
  "approvedBy" TEXT,
  "rejectionNote" TEXT,
  "digitalProductId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "etsy_listing_drafts",
    model: "EtsyListingDraft",
    sql: `CREATE TABLE IF NOT EXISTS "etsy_listing_drafts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siteId" TEXT NOT NULL,
  "briefId" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "titleVariants" JSONB,
  "description" TEXT NOT NULL,
  "descriptionBlocks" JSONB,
  "tags" TEXT[] DEFAULT '{}',
  "categoryPath" TEXT,
  "price" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "quantity" INTEGER NOT NULL DEFAULT 999,
  "section" TEXT,
  "materials" TEXT[] DEFAULT '{}',
  "fileUrl" TEXT,
  "previewImages" JSONB,
  "etsyListingId" TEXT UNIQUE,
  "etsyState" TEXT,
  "etsyUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "reviewNote" TEXT,
  "approvedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "lastSyncAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "etsy_shop_configs",
    model: "EtsyShopConfig",
    sql: `CREATE TABLE IF NOT EXISTS "etsy_shop_configs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siteId" TEXT NOT NULL UNIQUE,
  "shopId" TEXT,
  "shopName" TEXT,
  "shopUrl" TEXT,
  "accessTokenCredentialId" TEXT,
  "refreshTokenCredentialId" TEXT,
  "apiKeyCredentialId" TEXT,
  "scopes" TEXT[] DEFAULT '{}',
  "tokenExpiresAt" TIMESTAMP(3),
  "statsJson" JSONB,
  "lastCsvImportAt" TIMESTAMP(3),
  "connectionStatus" TEXT NOT NULL DEFAULT 'not_connected',
  "lastTestedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "product_packs",
    model: "ProductPack",
    sql: `CREATE TABLE IF NOT EXISTS "product_packs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siteId" TEXT NOT NULL,
  "name_en" TEXT NOT NULL,
  "name_ar" TEXT,
  "slug" TEXT NOT NULL UNIQUE,
  "description_en" TEXT NOT NULL,
  "description_ar" TEXT,
  "price" INTEGER NOT NULL,
  "compare_price" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "productIds" TEXT[] DEFAULT '{}',
  "cover_image" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "commerce_campaigns",
    model: "CommerceCampaign",
    sql: `CREATE TABLE IF NOT EXISTS "commerce_campaigns" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siteId" TEXT NOT NULL,
  "briefId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "utmSource" TEXT,
  "utmMedium" TEXT,
  "utmCampaign" TEXT NOT NULL,
  "couponCode" TEXT,
  "discountPercent" INTEGER,
  "tasksJson" JSONB,
  "resultsJson" JSONB,
  "status" TEXT NOT NULL DEFAULT 'planned',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "commerce_alerts",
    model: "CommerceAlert",
    sql: `CREATE TABLE IF NOT EXISTS "commerce_alerts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siteId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'info',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "productId" TEXT,
  "briefId" TEXT,
  "campaignId" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "actionUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "tenants",
    model: "Tenant",
    sql: `CREATE TABLE IF NOT EXISTS "tenants" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "domain" TEXT NOT NULL UNIQUE,
  "siteId" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'en',
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "primaryLanguages" TEXT[] DEFAULT '{"en"}',
  "destination" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "logoUrl" TEXT,
  "faviconUrl" TEXT,
  "brandColorsJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "tenant_integrations",
    model: "TenantIntegration",
    sql: `CREATE TABLE IF NOT EXISTS "tenant_integrations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "integrationType" TEXT NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT false,
  "configJson" JSONB,
  "credentialIds" TEXT[] DEFAULT '{}',
  "lastSyncAt" TIMESTAMP(3),
  "syncStatus" TEXT NOT NULL DEFAULT 'not_configured',
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("tenantId", "integrationType")
)`,
  },
  {
    table: "distribution_assets",
    model: "DistributionAsset",
    sql: `CREATE TABLE IF NOT EXISTS "distribution_assets" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "assetType" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT,
  "size" INTEGER,
  "growthRate" DOUBLE PRECISION,
  "engagementRate" DOUBLE PRECISION,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "commerce_settings",
    model: "CommerceSettings",
    sql: `CREATE TABLE IF NOT EXISTS "commerce_settings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL UNIQUE,
  "etsyEnabled" BOOLEAN NOT NULL DEFAULT false,
  "websiteShopEnabled" BOOLEAN NOT NULL DEFAULT true,
  "pinterestEnabled" BOOLEAN NOT NULL DEFAULT false,
  "autoPublishToEtsy" BOOLEAN NOT NULL DEFAULT false,
  "growthBlueprintUnlocked" BOOLEAN NOT NULL DEFAULT false,
  "etsyShopName" TEXT,
  "etsyShopUrl" TEXT,
  "shopAboutCopy" TEXT,
  "shopPoliciesJson" JSONB,
  "brandVoice" TEXT,
  "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
  "pricingBandsJson" JSONB,
  "minMonthlySales" INTEGER NOT NULL DEFAULT 50,
  "minMonthlyRevenue" INTEGER NOT NULL DEFAULT 100000,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "commerce_orders",
    model: "CommerceOrder",
    sql: `CREATE TABLE IF NOT EXISTS "commerce_orders" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siteId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "externalOrderId" TEXT,
  "customerEmail" TEXT,
  "customerName" TEXT,
  "grossAmount" INTEGER NOT NULL,
  "platformFees" INTEGER NOT NULL DEFAULT 0,
  "processingFees" INTEGER NOT NULL DEFAULT 0,
  "netAmount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "productId" TEXT,
  "productName" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "utmSource" TEXT,
  "utmMedium" TEXT,
  "utmCampaign" TEXT,
  "couponCode" TEXT,
  "attributionTags" JSONB,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3)
)`,
  },
  {
    table: "payouts",
    model: "Payout",
    sql: `CREATE TABLE IF NOT EXISTS "payouts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siteId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "externalPayoutId" TEXT,
  "grossAmount" INTEGER NOT NULL,
  "fees" INTEGER NOT NULL DEFAULT 0,
  "netAmount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "payoutProfileId" TEXT,
  "bankLast4" TEXT,
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "scheduledAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "payout_profile_templates",
    model: "PayoutProfileTemplate",
    sql: `CREATE TABLE IF NOT EXISTS "payout_profile_templates" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "legalEntityName" TEXT NOT NULL,
  "entityType" TEXT NOT NULL DEFAULT 'LLC',
  "taxId" TEXT,
  "beneficiaryAddress" TEXT NOT NULL,
  "domesticBankName" TEXT NOT NULL,
  "domesticRoutingAba" TEXT NOT NULL,
  "domesticAccountType" TEXT NOT NULL DEFAULT 'Checking',
  "domesticAccountNumber" TEXT NOT NULL,
  "intlSwiftBic" TEXT,
  "intlAba" TEXT,
  "intlAccountNumber" TEXT,
  "intermediaryBank" TEXT,
  "intermediarySwift" TEXT,
  "intermediaryAba" TEXT,
  "beneficiaryBankAccount" TEXT,
  "wireReference" TEXT,
  "bankAddress" TEXT,
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" TIMESTAMP(3),
  "lastValidatedAt" TIMESTAMP(3),
  "validationIssues" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "trend_signals",
    model: "TrendSignal",
    sql: `CREATE TABLE IF NOT EXISTS "trend_signals" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT,
  "source" TEXT NOT NULL,
  "signal_type" TEXT NOT NULL,
  "keyword" TEXT NOT NULL,
  "strength" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "data_json" JSONB,
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "keyword_clusters",
    model: "KeywordCluster",
    sql: `CREATE TABLE IF NOT EXISTS "keyword_clusters" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT,
  "name" TEXT NOT NULL,
  "primary_keyword" TEXT NOT NULL,
  "keywords" TEXT[] NOT NULL,
  "search_volume" INTEGER,
  "difficulty" INTEGER,
  "content_ids" TEXT[] DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "commerce_tasks",
    model: "CommerceTask",
    sql: `CREATE TABLE IF NOT EXISTS "commerce_tasks" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT,
  "task_type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "priority" INTEGER NOT NULL DEFAULT 1,
  "assigned_to" TEXT,
  "due_date" TIMESTAMP(3),
  "metadata" JSONB,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
)`,
  },

  // ── Premium Backend Models ──────────────────────────────────────────────────
  {
    table: "BackgroundJob",
    model: "BackgroundJob",
    sql: `CREATE TABLE IF NOT EXISTS "BackgroundJob" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT,
  "job_name" TEXT NOT NULL,
  "job_type" TEXT NOT NULL,
  "schedule_cron" TEXT,
  "parameters_json" JSONB,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "duration_ms" INTEGER,
  "result_json" JSONB,
  "error_message" TEXT,
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "max_retries" INTEGER NOT NULL DEFAULT 3,
  "next_run_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "ExitIntentImpression",
    model: "ExitIntentImpression",
    sql: `CREATE TABLE IF NOT EXISTS "ExitIntentImpression" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "site_id" TEXT,
  "session_id" TEXT NOT NULL,
  "page_url" TEXT NOT NULL,
  "user_agent" TEXT,
  "impression_type" TEXT NOT NULL,
  "trigger_event" TEXT NOT NULL,
  "shown_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "action_taken" TEXT,
  "action_taken_at" TIMESTAMP(3),
  "conversion_value" DOUBLE PRECISION,
  "ttl_expires_at" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "UserExtended",
    model: "UserExtended",
    sql: `CREATE TABLE IF NOT EXISTS "UserExtended" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL UNIQUE,
  "site_memberships" JSONB,
  "feature_preferences" JSONB,
  "notification_settings" JSONB,
  "last_activity_at" TIMESTAMP(3),
  "activity_streak" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "SitePremium",
    model: "SitePremium",
    sql: `CREATE TABLE IF NOT EXISTS "SitePremium" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siteId" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "domain" TEXT UNIQUE,
  "theme_id" TEXT,
  "settings_json" JSONB NOT NULL,
  "logo_url" TEXT,
  "favicon_url" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "locale_settings" JSONB,
  "brand_settings" JSONB,
  "seo_settings" JSONB,
  "analytics_settings" JSONB,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3)
)`,
  },
  {
    table: "SiteThemePremium",
    model: "SiteThemePremium",
    sql: `CREATE TABLE IF NOT EXISTS "SiteThemePremium" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siteId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "tokens_json" JSONB NOT NULL,
  "preview_url" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT false,
  "version" TEXT NOT NULL DEFAULT '1.0.0',
  "parent_theme_id" TEXT,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3)
)`,
  },
  {
    table: "HomepageVersionPremium",
    model: "HomepageVersionPremium",
    sql: `CREATE TABLE IF NOT EXISTS "HomepageVersionPremium" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siteId" TEXT NOT NULL,
  "version_id" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "blocks_data" JSONB NOT NULL,
  "diff_from_previous" JSONB,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "is_draft" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3)
)`,
  },
  {
    table: "AuditLogPremium",
    model: "AuditLogPremium",
    sql: `CREATE TABLE IF NOT EXISTS "AuditLogPremium" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siteId" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "resource" TEXT,
  "resourceId" TEXT,
  "details" JSONB,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "error_message" TEXT,
  "trace_id" TEXT,
  "reversible" BOOLEAN NOT NULL DEFAULT false,
  "reverse_operation" JSONB,
  "reversed_at" TIMESTAMP(3),
  "reversed_by" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "ChangePremium",
    model: "ChangePremium",
    sql: `CREATE TABLE IF NOT EXISTS "ChangePremium" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siteId" TEXT NOT NULL,
  "operation_id" TEXT NOT NULL UNIQUE,
  "operation_type" TEXT NOT NULL,
  "table_name" TEXT NOT NULL,
  "record_id" TEXT,
  "old_data" JSONB,
  "new_data" JSONB,
  "diff_data" JSONB,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "applied_at" TIMESTAMP(3),
  "reverted_at" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "SiteMemberPremium",
    model: "SiteMemberPremium",
    sql: `CREATE TABLE IF NOT EXISTS "SiteMemberPremium" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siteId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "permissions" JSONB,
  "access_level" TEXT NOT NULL DEFAULT 'standard',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "invited_at" TIMESTAMP(3),
  "joined_at" TIMESTAMP(3),
  "last_access_at" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  UNIQUE("siteId", "userId")
)`,
  },
  {
    table: "AffiliatePartner",
    model: "AffiliatePartner",
    sql: `CREATE TABLE IF NOT EXISTS "AffiliatePartner" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siteId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "partner_type" TEXT NOT NULL,
  "api_endpoint" TEXT,
  "api_key_encrypted" TEXT,
  "commission_rate" DOUBLE PRECISION,
  "contact_info" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_sync_at" TIMESTAMP(3),
  "sync_status" TEXT,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  UNIQUE("siteId", "slug")
)`,
  },
  {
    table: "AffiliateWidget",
    model: "AffiliateWidget",
    sql: `CREATE TABLE IF NOT EXISTS "AffiliateWidget" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siteId" TEXT NOT NULL,
  "partner_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "widget_type" TEXT NOT NULL,
  "config_json" JSONB NOT NULL,
  "preview_url" TEXT,
  "placement_rules" JSONB,
  "auto_placement" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3)
)`,
  },
  {
    table: "AffiliateAssignment",
    model: "AffiliateAssignment",
    sql: `CREATE TABLE IF NOT EXISTS "AffiliateAssignment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siteId" TEXT NOT NULL,
  "partner_id" TEXT NOT NULL,
  "widget_id" TEXT,
  "content_id" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "placement_data" JSONB,
  "auto_assigned" BOOLEAN NOT NULL DEFAULT false,
  "priority" INTEGER NOT NULL DEFAULT 1,
  "impressions" INTEGER NOT NULL DEFAULT 0,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "conversions" INTEGER NOT NULL DEFAULT 0,
  "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "Agreement",
    model: "Agreement",
    sql: `CREATE TABLE IF NOT EXISTS "Agreement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siteId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "agreement_type" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "version" TEXT NOT NULL DEFAULT '1.0',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "effective_date" TIMESTAMP(3),
  "expiry_date" TIMESTAMP(3),
  "signatures" JSONB,
  "signed_at" TIMESTAMP(3),
  "signed_by" TEXT,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3)
)`,
  },
  {
    table: "JobRun",
    model: "JobRun",
    sql: `CREATE TABLE IF NOT EXISTS "JobRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siteId" TEXT NOT NULL,
  "job_name" TEXT NOT NULL,
  "job_type" TEXT NOT NULL,
  "schedule_cron" TEXT,
  "parameters_json" JSONB,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "duration_ms" INTEGER,
  "result_json" JSONB,
  "error_message" TEXT,
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "max_retries" INTEGER NOT NULL DEFAULT 3,
  "next_retry_at" TIMESTAMP(3),
  "next_run_at" TIMESTAMP(3),
  "createdById" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
)`,
  },
  {
    table: "perplexity_tasks",
    model: "PerplexityTask",
    sql: `CREATE TABLE IF NOT EXISTS "perplexity_tasks" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "siteId" TEXT,
  "category" TEXT NOT NULL DEFAULT 'research',
  "taskType" TEXT NOT NULL DEFAULT 'general',
  "title" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "status" TEXT NOT NULL DEFAULT 'queued',
  "scheduledFor" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "resultSummary" TEXT,
  "resultData" JSONB,
  "errorMessage" TEXT,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "maxRetries" INTEGER NOT NULL DEFAULT 2,
  "estimatedCredits" INTEGER NOT NULL DEFAULT 10,
  "actualCredits" INTEGER,
  "parentTaskId" TEXT,
  "scheduleId" TEXT,
  "tags" TEXT[] DEFAULT '{}',
  "metadata" JSONB DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },
  {
    table: "perplexity_schedules",
    model: "PerplexitySchedule",
    sql: `CREATE TABLE IF NOT EXISTS "perplexity_schedules" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "siteId" TEXT,
  "category" TEXT NOT NULL,
  "taskType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "promptTemplate" TEXT NOT NULL,
  "cronExpression" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "estimatedCredits" INTEGER NOT NULL DEFAULT 10,
  "tags" TEXT[] DEFAULT '{}',
  "lastRunAt" TIMESTAMP(3),
  "nextRunAt" TIMESTAMP(3),
  "runCount" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // CEO + CTO AGENT PLATFORM MODELS (migration: 20260327_add_agent_platform_models)
  // ════════════════════════════════════════════════════════════════════════

  {
    table: "conversations",
    model: "Conversation",
    sql: `CREATE TABLE IF NOT EXISTS "conversations" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "siteId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "externalId" TEXT,
  "contactName" TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "leadId" TEXT,
  "subscriberId" TEXT,
  "inquiryId" TEXT,
  "opportunityId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "summary" TEXT,
  "sentiment" TEXT,
  "tags" TEXT[] DEFAULT '{}',
  "metadata" JSONB,
  "lastMessageAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
)`,
  },
  {
    table: "messages",
    model: "Message",
    sql: `CREATE TABLE IF NOT EXISTS "messages" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "conversationId" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "contentType" TEXT NOT NULL DEFAULT 'text',
  "mediaUrls" TEXT[] DEFAULT '{}',
  "senderName" TEXT,
  "agentId" TEXT,
  "toolsUsed" TEXT[] DEFAULT '{}',
  "confidence" DOUBLE PRECISION,
  "approved" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
)`,
  },
  {
    table: "agent_tasks",
    model: "AgentTask",
    sql: `CREATE TABLE IF NOT EXISTS "agent_tasks" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "agentType" TEXT NOT NULL,
  "taskType" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "description" TEXT NOT NULL,
  "input" JSONB,
  "output" JSONB,
  "changes" TEXT[] DEFAULT '{}',
  "testsRun" TEXT[] DEFAULT '{}',
  "findings" TEXT[] DEFAULT '{}',
  "followUps" TEXT[] DEFAULT '{}',
  "errorMessage" TEXT,
  "durationMs" INTEGER,
  "siteId" TEXT,
  "assignedTo" TEXT,
  "dueAt" TIMESTAMP(3),
  "conversationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "agent_tasks_pkey" PRIMARY KEY ("id")
)`,
  },
  {
    table: "crm_opportunities",
    model: "CrmOpportunity",
    sql: `CREATE TABLE IF NOT EXISTS "crm_opportunities" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "siteId" TEXT NOT NULL,
  "leadId" TEXT,
  "inquiryId" TEXT,
  "subscriberId" TEXT,
  "contactName" TEXT NOT NULL,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "stage" TEXT NOT NULL DEFAULT 'new',
  "value" DOUBLE PRECISION,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "source" TEXT,
  "lostReason" TEXT,
  "nextAction" TEXT,
  "nextActionAt" TIMESTAMP(3),
  "assignedTo" TEXT,
  "tags" TEXT[] DEFAULT '{}',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "crm_opportunities_pkey" PRIMARY KEY ("id")
)`,
  },
  {
    table: "interaction_logs",
    model: "InteractionLog",
    sql: `CREATE TABLE IF NOT EXISTS "interaction_logs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "siteId" TEXT NOT NULL,
  "opportunityId" TEXT,
  "conversationId" TEXT,
  "leadId" TEXT,
  "channel" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "interactionType" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "sentiment" TEXT,
  "agentId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "interaction_logs_pkey" PRIMARY KEY ("id")
)`,
  },
  {
    table: "retention_sequences",
    model: "RetentionSequence",
    sql: `CREATE TABLE IF NOT EXISTS "retention_sequences" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "siteId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "triggerEvent" TEXT NOT NULL,
  "steps" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "retention_sequences_pkey" PRIMARY KEY ("id")
)`,
  },
  {
    table: "retention_progress",
    model: "RetentionProgress",
    sql: `CREATE TABLE IF NOT EXISTS "retention_progress" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "sequenceId" TEXT NOT NULL,
  "subscriberId" TEXT NOT NULL,
  "currentStep" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'active',
  "lastSentAt" TIMESTAMP(3),
  "nextSendAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "retention_progress_pkey" PRIMARY KEY ("id")
)`,
  },
  {
    table: "finance_events",
    model: "FinanceEvent",
    sql: `CREATE TABLE IF NOT EXISTS "finance_events" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "siteId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "externalId" TEXT,
  "amount" DOUBLE PRECISION,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "contactEmail" TEXT,
  "opportunityId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "agentAction" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "finance_events_pkey" PRIMARY KEY ("id")
)`,
  },
  // ── Unsplash Cache (migration: 20260324_unsplash_cache) ─────────────────
  {
    table: "unsplash_cache",
    model: "UnsplashCache",
    sql: `CREATE TABLE IF NOT EXISTS "unsplash_cache" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "cache_key" TEXT NOT NULL,
  "response_data" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expires_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "unsplash_cache_pkey" PRIMARY KEY ("id")
)`,
  },
  // ── Google Drive Accounts (migration: 20260328_add_google_drive_account) ─
  {
    table: "google_drive_accounts",
    model: "GoogleDriveAccount",
    sql: `CREATE TABLE IF NOT EXISTS "google_drive_accounts" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "email" TEXT NOT NULL,
  "displayName" TEXT NOT NULL DEFAULT '',
  "photoUrl" TEXT,
  "accessToken" TEXT NOT NULL,
  "refreshToken" TEXT NOT NULL,
  "tokenExpiresAt" TIMESTAMPTZ NOT NULL,
  "rootFolderId" TEXT DEFAULT 'root',
  "siteId" TEXT,
  "label" TEXT,
  "folderMappings" JSONB DEFAULT '{}',
  "lastSyncAt" TIMESTAMPTZ,
  "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "google_drive_accounts_pkey" PRIMARY KEY ("id")
)`,
  },
  // ── Video Assets (migration: 20260318_add_video_asset_model) ────────────
  {
    table: "video_assets",
    model: "VideoAsset",
    sql: `CREATE TABLE IF NOT EXISTS "video_assets" (
  "id" TEXT NOT NULL,
  "assetCode" TEXT NOT NULL,
  "siteId" TEXT,
  "source" TEXT NOT NULL,
  "title" TEXT,
  "description" TEXT,
  "duration" DOUBLE PRECISION,
  "width" INTEGER,
  "height" INTEGER,
  "thumbnailUrl" TEXT,
  "previewUrl" TEXT,
  "downloadUrl" TEXT,
  "fileSize" BIGINT,
  "mimeType" TEXT,
  "locationTags" TEXT[] DEFAULT '{}',
  "sceneTags" TEXT[] DEFAULT '{}',
  "moodTags" TEXT[] DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'untagged',
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt" TIMESTAMPTZ,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "video_assets_pkey" PRIMARY KEY ("id")
)`,
  },
  {
    table: "chrome_audit_reports",
    model: "ChromeAuditReport",
    sql: `CREATE TABLE IF NOT EXISTS "chrome_audit_reports" (
  "id"                  TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "siteId"              TEXT NOT NULL,
  "pageUrl"             TEXT NOT NULL,
  "pageSlug"            TEXT,
  "auditType"           TEXT NOT NULL,
  "severity"            TEXT NOT NULL DEFAULT 'info',
  "status"              TEXT NOT NULL DEFAULT 'new',
  "findings"            JSONB NOT NULL,
  "interpretedActions"  JSONB NOT NULL,
  "rawData"             JSONB,
  "reportMarkdown"      TEXT,
  "reportPath"          TEXT,
  "agentTaskId"         TEXT,
  "uploadedBy"          TEXT NOT NULL DEFAULT 'chrome-bridge',
  "uploadedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt"          TIMESTAMP(3),
  "fixedAt"             TIMESTAMP(3),
  CONSTRAINT "chrome_audit_reports_pkey" PRIMARY KEY ("id")
)`,
  },
  {
    table: "ab_tests",
    model: "AbTest",
    sql: `CREATE TABLE IF NOT EXISTS "ab_tests" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "siteId"          TEXT NOT NULL,
  "targetUrl"       TEXT NOT NULL,
  "variantType"     TEXT NOT NULL,
  "targetSelector"  TEXT,
  "variantA"        JSONB NOT NULL,
  "variantB"        JSONB NOT NULL,
  "trafficSplit"    DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "primaryMetric"   TEXT NOT NULL DEFAULT 'click',
  "impressionsA"    INTEGER NOT NULL DEFAULT 0,
  "impressionsB"    INTEGER NOT NULL DEFAULT 0,
  "clicksA"         INTEGER NOT NULL DEFAULT 0,
  "clicksB"         INTEGER NOT NULL DEFAULT 0,
  "conversionsA"    INTEGER NOT NULL DEFAULT 0,
  "conversionsB"    INTEGER NOT NULL DEFAULT 0,
  "status"          TEXT NOT NULL DEFAULT 'active',
  "winner"          TEXT,
  "confidence"      DOUBLE PRECISION,
  "reportId"        TEXT,
  "notes"           TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "concludedAt"     TIMESTAMP(3),
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ab_tests_pkey" PRIMARY KEY ("id")
)`,
  },
];

// Indexes for newly created tables
const NEW_TABLE_INDEXES: Record<string, string[]> = {
  news_items: [
    'CREATE INDEX IF NOT EXISTS "news_items_status_idx" ON "news_items"("status")',
    'CREATE INDEX IF NOT EXISTS "news_items_news_category_idx" ON "news_items"("news_category")',
    'CREATE INDEX IF NOT EXISTS "news_items_is_major_idx" ON "news_items"("is_major")',
    'CREATE INDEX IF NOT EXISTS "news_items_published_at_idx" ON "news_items"("published_at")',
    'CREATE INDEX IF NOT EXISTS "news_items_expires_at_idx" ON "news_items"("expires_at")',
    'CREATE INDEX IF NOT EXISTS "news_items_siteId_idx" ON "news_items"("siteId")',
    'CREATE INDEX IF NOT EXISTS "news_items_siteId_status_idx" ON "news_items"("siteId", "status")',
  ],
  news_research_logs: [
    'CREATE INDEX IF NOT EXISTS "news_research_logs_run_type_idx" ON "news_research_logs"("run_type")',
    'CREATE INDEX IF NOT EXISTS "news_research_logs_created_at_idx" ON "news_research_logs"("created_at")',
    'CREATE INDEX IF NOT EXISTS "news_research_logs_siteId_idx" ON "news_research_logs"("siteId")',
  ],
  fact_entries: [
    'CREATE INDEX IF NOT EXISTS "fact_entries_article_type_slug_idx" ON "fact_entries"("article_type", "article_slug")',
    'CREATE INDEX IF NOT EXISTS "fact_entries_status_idx" ON "fact_entries"("status")',
    'CREATE INDEX IF NOT EXISTS "fact_entries_next_check_at_idx" ON "fact_entries"("next_check_at")',
    'CREATE INDEX IF NOT EXISTS "fact_entries_category_idx" ON "fact_entries"("category")',
    'CREATE INDEX IF NOT EXISTS "fact_entries_siteId_idx" ON "fact_entries"("siteId")',
  ],
  information_sections: [
    'CREATE INDEX IF NOT EXISTS "information_sections_siteId_idx" ON "information_sections"("siteId")',
    'CREATE INDEX IF NOT EXISTS "information_sections_published_idx" ON "information_sections"("published")',
    'CREATE INDEX IF NOT EXISTS "information_sections_sort_order_idx" ON "information_sections"("sort_order")',
  ],
  information_categories: [],
  information_articles: [
    'CREATE INDEX IF NOT EXISTS "information_articles_section_id_idx" ON "information_articles"("section_id")',
    'CREATE INDEX IF NOT EXISTS "information_articles_category_id_idx" ON "information_articles"("category_id")',
    'CREATE INDEX IF NOT EXISTS "information_articles_siteId_idx" ON "information_articles"("siteId")',
    'CREATE INDEX IF NOT EXISTS "information_articles_siteId_published_idx" ON "information_articles"("siteId", "published")',
    'CREATE INDEX IF NOT EXISTS "information_articles_published_idx" ON "information_articles"("published")',
    'CREATE INDEX IF NOT EXISTS "information_articles_page_type_idx" ON "information_articles"("page_type")',
    'CREATE INDEX IF NOT EXISTS "information_articles_seo_score_idx" ON "information_articles"("seo_score")',
    'CREATE INDEX IF NOT EXISTS "information_articles_created_at_idx" ON "information_articles"("created_at")',
  ],

  // ── Yacht Charter Indexes ───────────────────────────────────
  yachts: [
    'CREATE INDEX IF NOT EXISTS "yachts_siteId_idx" ON "yachts"("siteId")',
    'CREATE INDEX IF NOT EXISTS "yachts_destinationId_idx" ON "yachts"("destinationId")',
    'CREATE INDEX IF NOT EXISTS "yachts_type_idx" ON "yachts"("type")',
    'CREATE INDEX IF NOT EXISTS "yachts_status_siteId_idx" ON "yachts"("status", "siteId")',
    'CREATE INDEX IF NOT EXISTS "yachts_pricePerWeekLow_idx" ON "yachts"("pricePerWeekLow")',
    'CREATE INDEX IF NOT EXISTS "yachts_halalCateringAvailable_idx" ON "yachts"("halalCateringAvailable")',
  ],
  yacht_destinations: [
    'CREATE INDEX IF NOT EXISTS "yacht_destinations_siteId_idx" ON "yacht_destinations"("siteId")',
    'CREATE INDEX IF NOT EXISTS "yacht_destinations_region_idx" ON "yacht_destinations"("region")',
  ],
  charter_inquiries: [
    'CREATE INDEX IF NOT EXISTS "charter_inquiries_siteId_idx" ON "charter_inquiries"("siteId")',
    'CREATE INDEX IF NOT EXISTS "charter_inquiries_status_idx" ON "charter_inquiries"("status")',
    'CREATE INDEX IF NOT EXISTS "charter_inquiries_email_idx" ON "charter_inquiries"("email")',
    'CREATE INDEX IF NOT EXISTS "charter_inquiries_createdAt_idx" ON "charter_inquiries"("createdAt")',
  ],
  yacht_availability: [
    'CREATE INDEX IF NOT EXISTS "yacht_availability_yachtId_idx" ON "yacht_availability"("yachtId")',
    'CREATE INDEX IF NOT EXISTS "yacht_availability_startDate_endDate_idx" ON "yacht_availability"("startDate", "endDate")',
    'CREATE INDEX IF NOT EXISTS "yacht_availability_status_idx" ON "yacht_availability"("status")',
  ],
  yacht_reviews: [
    'CREATE INDEX IF NOT EXISTS "yacht_reviews_yachtId_idx" ON "yacht_reviews"("yachtId")',
    'CREATE INDEX IF NOT EXISTS "yacht_reviews_siteId_idx" ON "yacht_reviews"("siteId")',
    'CREATE INDEX IF NOT EXISTS "yacht_reviews_status_idx" ON "yacht_reviews"("status")',
  ],
  charter_itineraries: [
    'CREATE INDEX IF NOT EXISTS "charter_itineraries_siteId_idx" ON "charter_itineraries"("siteId")',
    'CREATE INDEX IF NOT EXISTS "charter_itineraries_destinationId_idx" ON "charter_itineraries"("destinationId")',
  ],
  broker_partners: [
    'CREATE INDEX IF NOT EXISTS "broker_partners_siteId_idx" ON "broker_partners"("siteId")',
  ],
  yacht_sync_logs: [
    'CREATE INDEX IF NOT EXISTS "yacht_sync_logs_siteId_idx" ON "yacht_sync_logs"("siteId")',
    'CREATE INDEX IF NOT EXISTS "yacht_sync_logs_source_idx" ON "yacht_sync_logs"("source")',
    'CREATE INDEX IF NOT EXISTS "yacht_sync_logs_startedAt_idx" ON "yacht_sync_logs"("startedAt")',
  ],

  // ── CJ Affiliate Indexes ────────────────────────────────────
  cj_advertisers: [
    'CREATE INDEX IF NOT EXISTS "cj_advertisers_status_idx" ON "cj_advertisers"("status")',
    'CREATE INDEX IF NOT EXISTS "cj_advertisers_category_idx" ON "cj_advertisers"("category")',
    'CREATE INDEX IF NOT EXISTS "cj_advertisers_priority_idx" ON "cj_advertisers"("priority")',
    'CREATE INDEX IF NOT EXISTS "cj_advertisers_threeMonthEpc_idx" ON "cj_advertisers"("threeMonthEpc")',
  ],
  cj_links: [
    'CREATE INDEX IF NOT EXISTS "cj_links_networkId_idx" ON "cj_links"("networkId")',
    'CREATE INDEX IF NOT EXISTS "cj_links_advertiserId_idx" ON "cj_links"("advertiserId")',
    'CREATE INDEX IF NOT EXISTS "cj_links_isActive_idx" ON "cj_links"("isActive")',
    'CREATE INDEX IF NOT EXISTS "cj_links_category_idx" ON "cj_links"("category")',
    'CREATE INDEX IF NOT EXISTS "cj_links_linkType_idx" ON "cj_links"("linkType")',
  ],
  cj_offers: [
    'CREATE INDEX IF NOT EXISTS "cj_offers_networkId_idx" ON "cj_offers"("networkId")',
    'CREATE INDEX IF NOT EXISTS "cj_offers_advertiserId_idx" ON "cj_offers"("advertiserId")',
    'CREATE INDEX IF NOT EXISTS "cj_offers_isActive_idx" ON "cj_offers"("isActive")',
    'CREATE INDEX IF NOT EXISTS "cj_offers_category_idx" ON "cj_offers"("category")',
  ],
  cj_commissions: [
    'CREATE INDEX IF NOT EXISTS "cj_commissions_advertiserId_idx" ON "cj_commissions"("advertiserId")',
    'CREATE INDEX IF NOT EXISTS "cj_commissions_status_idx" ON "cj_commissions"("status")',
    'CREATE INDEX IF NOT EXISTS "cj_commissions_eventDate_idx" ON "cj_commissions"("eventDate")',
  ],
  cj_click_events: [
    'CREATE INDEX IF NOT EXISTS "cj_click_events_linkId_createdAt_idx" ON "cj_click_events"("linkId", "createdAt")',
    'CREATE INDEX IF NOT EXISTS "cj_click_events_createdAt_idx" ON "cj_click_events"("createdAt")',
  ],
  cj_sync_logs: [
    'CREATE INDEX IF NOT EXISTS "cj_sync_logs_networkId_idx" ON "cj_sync_logs"("networkId")',
    'CREATE INDEX IF NOT EXISTS "cj_sync_logs_syncType_idx" ON "cj_sync_logs"("syncType")',
    'CREATE INDEX IF NOT EXISTS "cj_sync_logs_createdAt_idx" ON "cj_sync_logs"("createdAt")',
  ],
  cj_placements: [
    'CREATE INDEX IF NOT EXISTS "cj_placements_isActive_idx" ON "cj_placements"("isActive")',
  ],
  cj_placement_rules: [
    'CREATE INDEX IF NOT EXISTS "cj_placement_rules_placementId_idx" ON "cj_placement_rules"("placementId")',
  ],

  // ── Design System Indexes ───────────────────────────────────
  designs: [
    'CREATE INDEX IF NOT EXISTS "designs_site_type_idx" ON "designs"("site", "type")',
    'CREATE INDEX IF NOT EXISTS "designs_status_idx" ON "designs"("status")',
    'CREATE INDEX IF NOT EXISTS "designs_isTemplate_idx" ON "designs"("isTemplate")',
    'CREATE INDEX IF NOT EXISTS "designs_createdAt_idx" ON "designs"("createdAt")',
  ],
  pdf_guides: [
    'CREATE INDEX IF NOT EXISTS "pdf_guides_site_idx" ON "pdf_guides"("site")',
    'CREATE INDEX IF NOT EXISTS "pdf_guides_status_idx" ON "pdf_guides"("status")',
    'CREATE INDEX IF NOT EXISTS "pdf_guides_slug_idx" ON "pdf_guides"("slug")',
  ],
  pdf_downloads: [
    'CREATE INDEX IF NOT EXISTS "pdf_downloads_pdfGuideId_idx" ON "pdf_downloads"("pdfGuideId")',
    'CREATE INDEX IF NOT EXISTS "pdf_downloads_email_idx" ON "pdf_downloads"("email")',
  ],
  email_templates: [
    'CREATE INDEX IF NOT EXISTS "email_templates_site_type_idx" ON "email_templates"("site", "type")',
    'CREATE INDEX IF NOT EXISTS "email_templates_isDefault_idx" ON "email_templates"("isDefault")',
  ],
  email_campaigns: [
    'CREATE INDEX IF NOT EXISTS "email_campaigns_site_idx" ON "email_campaigns"("site")',
    'CREATE INDEX IF NOT EXISTS "email_campaigns_status_idx" ON "email_campaigns"("status")',
    'CREATE INDEX IF NOT EXISTS "email_campaigns_scheduledAt_idx" ON "email_campaigns"("scheduledAt")',
  ],
  video_projects: [
    'CREATE INDEX IF NOT EXISTS "video_projects_site_idx" ON "video_projects"("site")',
    'CREATE INDEX IF NOT EXISTS "video_projects_status_idx" ON "video_projects"("status")',
    'CREATE INDEX IF NOT EXISTS "video_projects_category_idx" ON "video_projects"("category")',
  ],
  content_pipelines: [
    'CREATE INDEX IF NOT EXISTS "content_pipelines_site_idx" ON "content_pipelines"("site")',
    'CREATE INDEX IF NOT EXISTS "content_pipelines_status_idx" ON "content_pipelines"("status")',
    'CREATE INDEX IF NOT EXISTS "content_pipelines_createdAt_idx" ON "content_pipelines"("createdAt")',
  ],
  content_performance: [
    'CREATE INDEX IF NOT EXISTS "content_performance_pipelineId_idx" ON "content_performance"("pipelineId")',
    'CREATE INDEX IF NOT EXISTS "content_performance_platform_idx" ON "content_performance"("platform")',
    'CREATE INDEX IF NOT EXISTS "content_performance_grade_idx" ON "content_performance"("grade")',
  ],

  // ── API Usage Log Indexes ─────────────────────────────────
  api_usage_logs: [
    'CREATE INDEX IF NOT EXISTS "api_usage_logs_siteId_createdAt_idx" ON "api_usage_logs"("siteId", "createdAt")',
    'CREATE INDEX IF NOT EXISTS "api_usage_logs_provider_createdAt_idx" ON "api_usage_logs"("provider", "createdAt")',
    'CREATE INDEX IF NOT EXISTS "api_usage_logs_taskType_createdAt_idx" ON "api_usage_logs"("taskType", "createdAt")',
    'CREATE INDEX IF NOT EXISTS "api_usage_logs_createdAt_idx" ON "api_usage_logs"("createdAt")',
  ],

  // ── SEO Audit Report Indexes ─────────────────────────────
  seo_audit_reports: [
    'CREATE INDEX IF NOT EXISTS "seo_audit_reports_siteId_createdAt_idx" ON "seo_audit_reports"("siteId", "createdAt")',
  ],

  // ── GSC Page Performance Indexes ───────────────────────
  gsc_page_performance: [
    'CREATE UNIQUE INDEX IF NOT EXISTS "gsc_page_performance_site_id_url_date_key" ON "gsc_page_performance"("site_id", "url", "date")',
    'CREATE INDEX IF NOT EXISTS "gsc_page_performance_site_id_date_idx" ON "gsc_page_performance"("site_id", "date")',
    'CREATE INDEX IF NOT EXISTS "gsc_page_performance_site_id_url_idx" ON "gsc_page_performance"("site_id", "url")',
  ],

  // ── Performance Audits Indexes ─────────────────────────
  performance_audits: [
    'CREATE INDEX IF NOT EXISTS "performance_audits_siteId_createdAt_idx" ON "performance_audits"("siteId", "createdAt")',
    'CREATE INDEX IF NOT EXISTS "performance_audits_runId_idx" ON "performance_audits"("runId")',
    'CREATE INDEX IF NOT EXISTS "performance_audits_url_strategy_idx" ON "performance_audits"("url", "strategy")',
  ],

  // ── Auto Fix Logs Indexes ──────────────────────────────
  auto_fix_logs: [
    'CREATE INDEX IF NOT EXISTS "auto_fix_logs_siteId_createdAt_idx" ON "auto_fix_logs"("siteId", "createdAt")',
    'CREATE INDEX IF NOT EXISTS "auto_fix_logs_fixType_idx" ON "auto_fix_logs"("fixType")',
    'CREATE INDEX IF NOT EXISTS "auto_fix_logs_targetId_idx" ON "auto_fix_logs"("targetId")',
  ],

  // ── Dev Tasks Indexes ──────────────────────────────────
  dev_tasks: [
    'CREATE INDEX IF NOT EXISTS "dev_tasks_siteId_status_idx" ON "dev_tasks"("siteId", "status")',
    'CREATE INDEX IF NOT EXISTS "dev_tasks_priority_status_idx" ON "dev_tasks"("priority", "status")',
    'CREATE INDEX IF NOT EXISTS "dev_tasks_dueDate_idx" ON "dev_tasks"("dueDate")',
    'CREATE INDEX IF NOT EXISTS "dev_tasks_source_sourceRef_idx" ON "dev_tasks"("source", "sourceRef")',
  ],

  // ── System Diagnostics Indexes ─────────────────────────
  system_diagnostics: [
    'CREATE UNIQUE INDEX IF NOT EXISTS "system_diagnostics_runId_key" ON "system_diagnostics"("runId")',
    'CREATE INDEX IF NOT EXISTS "system_diagnostics_siteId_created_at_idx" ON "system_diagnostics"("siteId", "created_at")',
    'CREATE INDEX IF NOT EXISTS "system_diagnostics_verdict_idx" ON "system_diagnostics"("verdict")',
  ],

  // ── Audit Runs Indexes ─────────────────────────────────
  audit_runs: [
    'CREATE INDEX IF NOT EXISTS "audit_runs_siteId_status_idx" ON "audit_runs"("siteId", "status")',
    'CREATE INDEX IF NOT EXISTS "audit_runs_siteId_startedAt_idx" ON "audit_runs"("siteId", "startedAt")',
  ],

  // ── Audit Issues Indexes ───────────────────────────────
  audit_issues: [
    'CREATE INDEX IF NOT EXISTS "audit_issues_siteId_status_idx" ON "audit_issues"("siteId", "status")',
    'CREATE INDEX IF NOT EXISTS "audit_issues_auditRunId_idx" ON "audit_issues"("auditRunId")',
    'CREATE INDEX IF NOT EXISTS "audit_issues_fingerprint_idx" ON "audit_issues"("fingerprint")',
    'CREATE INDEX IF NOT EXISTS "audit_issues_siteId_category_idx" ON "audit_issues"("siteId", "category")',
    'CREATE INDEX IF NOT EXISTS "audit_issues_siteId_severity_idx" ON "audit_issues"("siteId", "severity")',
  ],

  // ── Unsplash Cache Indexes ─────────────────────────────────
  unsplash_cache: [
    'CREATE UNIQUE INDEX IF NOT EXISTS "unsplash_cache_cache_key_key" ON "unsplash_cache"("cache_key")',
    'CREATE INDEX IF NOT EXISTS "unsplash_cache_cache_key_idx" ON "unsplash_cache"("cache_key")',
    'CREATE INDEX IF NOT EXISTS "unsplash_cache_expires_at_idx" ON "unsplash_cache"("expires_at")',
  ],
  // ── Google Drive Account Indexes ───────────────────────────
  google_drive_accounts: [
    'CREATE UNIQUE INDEX IF NOT EXISTS "google_drive_accounts_email_key" ON "google_drive_accounts"("email")',
    'CREATE INDEX IF NOT EXISTS "google_drive_accounts_siteId_idx" ON "google_drive_accounts"("siteId")',
  ],
  // ── Video Asset Indexes ────────────────────────────────────
  video_assets: [
    'CREATE UNIQUE INDEX IF NOT EXISTS "video_assets_assetCode_key" ON "video_assets"("assetCode")',
    'CREATE INDEX IF NOT EXISTS "video_assets_siteId_idx" ON "video_assets"("siteId")',
    'CREATE INDEX IF NOT EXISTS "video_assets_status_idx" ON "video_assets"("status")',
    'CREATE INDEX IF NOT EXISTS "video_assets_source_idx" ON "video_assets"("source")',
  ],

  // ── Content Pipeline Core Indexes ──────────────────────────
  article_drafts: [
    'CREATE INDEX IF NOT EXISTS "article_drafts_current_phase_site_id_idx" ON "article_drafts"("current_phase", "site_id")',
    'CREATE INDEX IF NOT EXISTS "article_drafts_current_phase_created_at_idx" ON "article_drafts"("current_phase", "created_at")',
    'CREATE INDEX IF NOT EXISTS "article_drafts_quality_score_idx" ON "article_drafts"("quality_score")',
    'CREATE INDEX IF NOT EXISTS "article_drafts_site_id_current_phase_idx" ON "article_drafts"("site_id", "current_phase")',
    'CREATE INDEX IF NOT EXISTS "article_drafts_created_at_idx" ON "article_drafts"("created_at")',
    'CREATE INDEX IF NOT EXISTS "article_drafts_paired_draft_id_idx" ON "article_drafts"("paired_draft_id")',
    // Compound indexes for build-runner (migration: 20260321_add_performance_indexes)
    'CREATE INDEX IF NOT EXISTS "article_drafts_site_id_current_phase_updated_at_idx" ON "article_drafts"("site_id", "current_phase", "updated_at")',
    'CREATE INDEX IF NOT EXISTS "article_drafts_site_id_current_phase_phase_attempts_idx" ON "article_drafts"("site_id", "current_phase", "phase_attempts")',
  ],
  topic_proposals: [
    'CREATE INDEX IF NOT EXISTS "topic_proposals_site_id_idx" ON "topic_proposals"("site_id")',
    'CREATE INDEX IF NOT EXISTS "topic_proposals_site_id_status_idx" ON "topic_proposals"("site_id", "status")',
    'CREATE INDEX IF NOT EXISTS "topic_proposals_site_id_locale_status_idx" ON "topic_proposals"("site_id", "locale", "status")',
    'CREATE INDEX IF NOT EXISTS "topic_proposals_locale_status_idx" ON "topic_proposals"("locale", "status")',
    'CREATE INDEX IF NOT EXISTS "topic_proposals_status_confidence_score_idx" ON "topic_proposals"("status", "confidence_score")',
    'CREATE INDEX IF NOT EXISTS "topic_proposals_planned_at_idx" ON "topic_proposals"("planned_at")',
  ],

  // ── Monitoring Indexes ─────────────────────────────────────
  url_indexing_status: [
    'CREATE INDEX IF NOT EXISTS "url_indexing_status_site_id_status_idx" ON "url_indexing_status"("site_id", "status")',
    'CREATE INDEX IF NOT EXISTS "url_indexing_status_site_id_slug_idx" ON "url_indexing_status"("site_id", "slug")',
    'CREATE INDEX IF NOT EXISTS "url_indexing_status_status_idx" ON "url_indexing_status"("status")',
    'CREATE INDEX IF NOT EXISTS "url_indexing_status_last_submitted_at_idx" ON "url_indexing_status"("last_submitted_at")',
    // Compound indexes for process-indexing-queue (migration: 20260321_add_performance_indexes)
    'CREATE INDEX IF NOT EXISTS "url_indexing_status_site_id_status_last_submitted_at_idx" ON "url_indexing_status"("site_id", "status", "last_submitted_at" DESC)',
    'CREATE INDEX IF NOT EXISTS "url_indexing_status_site_id_submitted_indexnow_idx" ON "url_indexing_status"("site_id", "submitted_indexnow")',
  ],
  cron_job_logs: [
    'CREATE INDEX IF NOT EXISTS "cron_job_logs_job_name_started_at_idx" ON "cron_job_logs"("job_name", "started_at")',
    'CREATE INDEX IF NOT EXISTS "cron_job_logs_site_id_job_name_idx" ON "cron_job_logs"("site_id", "job_name")',
    'CREATE INDEX IF NOT EXISTS "cron_job_logs_status_idx" ON "cron_job_logs"("status")',
    'CREATE INDEX IF NOT EXISTS "cron_job_logs_started_at_idx" ON "cron_job_logs"("started_at")',
    // Compound indexes for CEO Inbox + cycle-health (migration: 20260321_add_performance_indexes)
    'CREATE INDEX IF NOT EXISTS "cron_job_logs_job_name_status_started_at_idx" ON "cron_job_logs"("job_name", "status", "started_at" DESC)',
    'CREATE INDEX IF NOT EXISTS "cron_job_logs_status_started_at_idx" ON "cron_job_logs"("status", "started_at" DESC)',
  ],
  site_health_checks: [
    'CREATE INDEX IF NOT EXISTS "site_health_checks_site_id_checked_at_idx" ON "site_health_checks"("site_id", "checked_at")',
    'CREATE INDEX IF NOT EXISTS "site_health_checks_site_id_idx" ON "site_health_checks"("site_id")',
    'CREATE INDEX IF NOT EXISTS "site_health_checks_checked_at_idx" ON "site_health_checks"("checked_at")',
  ],

  // ── AI Config Indexes ──────────────────────────────────────
  model_providers: [
    'CREATE INDEX IF NOT EXISTS "model_providers_site_id_idx" ON "model_providers"("site_id")',
    'CREATE INDEX IF NOT EXISTS "model_providers_provider_type_idx" ON "model_providers"("provider_type")',
    'CREATE INDEX IF NOT EXISTS "model_providers_is_active_idx" ON "model_providers"("is_active")',
  ],
  model_routes: [
    'CREATE INDEX IF NOT EXISTS "model_routes_site_id_idx" ON "model_routes"("site_id")',
    'CREATE INDEX IF NOT EXISTS "model_routes_route_name_idx" ON "model_routes"("route_name")',
    'CREATE INDEX IF NOT EXISTS "model_routes_is_active_idx" ON "model_routes"("is_active")',
  ],
  feature_flags: [
    'CREATE INDEX IF NOT EXISTS "feature_flags_siteId_idx" ON "feature_flags"("siteId")',
  ],

  // ── Affiliate & Revenue Indexes ────────────────────────────
  affiliate_clicks: [
    'CREATE INDEX IF NOT EXISTS "affiliate_clicks_site_id_clicked_at_idx" ON "affiliate_clicks"("site_id", "clicked_at")',
    'CREATE INDEX IF NOT EXISTS "affiliate_clicks_partner_id_idx" ON "affiliate_clicks"("partner_id")',
    'CREATE INDEX IF NOT EXISTS "affiliate_clicks_session_id_idx" ON "affiliate_clicks"("session_id")',
  ],
  conversions: [
    'CREATE INDEX IF NOT EXISTS "conversions_site_id_converted_at_idx" ON "conversions"("site_id", "converted_at")',
    'CREATE INDEX IF NOT EXISTS "conversions_status_idx" ON "conversions"("status")',
  ],

  // ── Subscriber Indexes ─────────────────────────────────────
  subscribers: [
    'CREATE INDEX IF NOT EXISTS "subscribers_site_id_idx" ON "subscribers"("site_id")',
    'CREATE INDEX IF NOT EXISTS "subscribers_status_idx" ON "subscribers"("status")',
    'CREATE INDEX IF NOT EXISTS "subscribers_source_idx" ON "subscribers"("source")',
    'CREATE INDEX IF NOT EXISTS "subscribers_created_at_idx" ON "subscribers"("created_at")',
  ],

  // ── SEO Audit Actions Indexes ──────────────────────────────
  seo_audit_actions: [
    'CREATE INDEX IF NOT EXISTS "seo_audit_actions_siteId_status_idx" ON "seo_audit_actions"("siteId", "status")',
    'CREATE INDEX IF NOT EXISTS "seo_audit_actions_auditId_idx" ON "seo_audit_actions"("auditId")',
  ],

  // ── Team Members Indexes ───────────────────────────────────
  team_members: [
    'CREATE INDEX IF NOT EXISTS "team_members_site_id_is_active_idx" ON "team_members"("site_id", "is_active")',
    'CREATE INDEX IF NOT EXISTS "team_members_is_featured_idx" ON "team_members"("is_featured")',
  ],

  // ── Auth Indexes ────────────────────────────────────────────────────────
  users: [
    'CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role")',
    'CREATE INDEX IF NOT EXISTS "users_isActive_idx" ON "users"("isActive")',
    'CREATE INDEX IF NOT EXISTS "users_createdAt_idx" ON "users"("createdAt")',
  ],
  accounts: [
    'CREATE INDEX IF NOT EXISTS "accounts_userId_idx" ON "accounts"("userId")',
  ],
  sessions: [
    'CREATE INDEX IF NOT EXISTS "sessions_userId_idx" ON "sessions"("userId")',
  ],

  // ── Core Content Indexes ────────────────────────────────────────────────
  BlogPost: [
    'CREATE INDEX IF NOT EXISTS "BlogPost_siteId_idx" ON "BlogPost"("siteId")',
    'CREATE INDEX IF NOT EXISTS "BlogPost_category_id_idx" ON "BlogPost"("category_id")',
    'CREATE INDEX IF NOT EXISTS "BlogPost_author_id_idx" ON "BlogPost"("author_id")',
    'CREATE INDEX IF NOT EXISTS "BlogPost_published_idx" ON "BlogPost"("published")',
    'CREATE INDEX IF NOT EXISTS "BlogPost_siteId_published_idx" ON "BlogPost"("siteId", "published")',
    'CREATE INDEX IF NOT EXISTS "BlogPost_created_at_idx" ON "BlogPost"("created_at")',
    'CREATE INDEX IF NOT EXISTS "BlogPost_page_type_idx" ON "BlogPost"("page_type")',
    'CREATE INDEX IF NOT EXISTS "BlogPost_seo_score_idx" ON "BlogPost"("seo_score")',
  ],
  ScheduledContent: [
    'CREATE INDEX IF NOT EXISTS "ScheduledContent_site_id_idx" ON "ScheduledContent"("site_id")',
    'CREATE INDEX IF NOT EXISTS "ScheduledContent_status_idx" ON "ScheduledContent"("status")',
    'CREATE INDEX IF NOT EXISTS "ScheduledContent_scheduled_time_idx" ON "ScheduledContent"("scheduled_time")',
    'CREATE INDEX IF NOT EXISTS "ScheduledContent_content_type_idx" ON "ScheduledContent"("content_type")',
  ],
  MediaAsset: [
    'CREATE INDEX IF NOT EXISTS "MediaAsset_site_id_idx" ON "MediaAsset"("site_id")',
    'CREATE INDEX IF NOT EXISTS "MediaAsset_file_type_idx" ON "MediaAsset"("file_type")',
    'CREATE INDEX IF NOT EXISTS "MediaAsset_category_idx" ON "MediaAsset"("category")',
    'CREATE INDEX IF NOT EXISTS "MediaAsset_created_at_idx" ON "MediaAsset"("created_at")',
  ],
  ContentGeneration: [
    'CREATE INDEX IF NOT EXISTS "ContentGeneration_type_idx" ON "ContentGeneration"("type")',
    'CREATE INDEX IF NOT EXISTS "ContentGeneration_language_idx" ON "ContentGeneration"("language")',
  ],
  Event: [
    'CREATE INDEX IF NOT EXISTS "Event_siteId_idx" ON "Event"("siteId")',
    'CREATE INDEX IF NOT EXISTS "Event_category_idx" ON "Event"("category")',
    'CREATE INDEX IF NOT EXISTS "Event_date_idx" ON "Event"("date")',
    'CREATE INDEX IF NOT EXISTS "Event_published_idx" ON "Event"("published")',
    'CREATE INDEX IF NOT EXISTS "Event_featured_idx" ON "Event"("featured")',
  ],

  // ── SEO Indexes ─────────────────────────────────────────────────────────
  seo_meta: [
    'CREATE INDEX IF NOT EXISTS "seo_meta_seoScore_idx" ON "seo_meta"("seoScore")',
    'CREATE INDEX IF NOT EXISTS "seo_meta_schemaType_idx" ON "seo_meta"("schemaType")',
  ],
  seo_redirects: [
    'CREATE INDEX IF NOT EXISTS "seo_redirects_enabled_idx" ON "seo_redirects"("enabled")',
  ],
  seo_internal_links: [
    'CREATE INDEX IF NOT EXISTS "seo_internal_links_sourcePageId_idx" ON "seo_internal_links"("sourcePageId")',
    'CREATE INDEX IF NOT EXISTS "seo_internal_links_targetPageId_idx" ON "seo_internal_links"("targetPageId")',
  ],
  seo_reports: [
    'CREATE INDEX IF NOT EXISTS "seo_reports_site_id_idx" ON "seo_reports"("site_id")',
    'CREATE INDEX IF NOT EXISTS "seo_reports_site_id_reportType_idx" ON "seo_reports"("site_id", "reportType")',
    'CREATE INDEX IF NOT EXISTS "seo_reports_reportType_generatedAt_idx" ON "seo_reports"("reportType", "generatedAt")',
  ],
  seo_health_metrics: [
    'CREATE INDEX IF NOT EXISTS "seo_health_metrics_pageId_idx" ON "seo_health_metrics"("pageId")',
    'CREATE INDEX IF NOT EXISTS "seo_health_metrics_metricName_idx" ON "seo_health_metrics"("metricName")',
  ],
  seo_page_metrics: [
    'CREATE INDEX IF NOT EXISTS "seo_page_metrics_pageId_idx" ON "seo_page_metrics"("pageId")',
  ],
  seo_sitemap_entries: [
    'CREATE INDEX IF NOT EXISTS "seo_sitemap_entries_sitemapType_idx" ON "seo_sitemap_entries"("sitemapType")',
  ],
  seo_hreflang_entries: [
    'CREATE INDEX IF NOT EXISTS "seo_hreflang_entries_pageId_idx" ON "seo_hreflang_entries"("pageId")',
    'CREATE INDEX IF NOT EXISTS "seo_hreflang_entries_lang_idx" ON "seo_hreflang_entries"("lang")',
  ],
  seo_structured_data: [
    'CREATE INDEX IF NOT EXISTS "seo_structured_data_pageId_idx" ON "seo_structured_data"("pageId")',
    'CREATE INDEX IF NOT EXISTS "seo_structured_data_schemaType_idx" ON "seo_structured_data"("schemaType")',
  ],

  // ── Phase 4 Indexes ─────────────────────────────────────────────────────
  ImageAsset: [
    'CREATE INDEX IF NOT EXISTS "ImageAsset_place_id_idx" ON "ImageAsset"("place_id")',
  ],
  VideoAsset: [
    'CREATE INDEX IF NOT EXISTS "VideoAsset_place_id_idx" ON "VideoAsset"("place_id")',
  ],
  Place: [
    'CREATE INDEX IF NOT EXISTS "Place_category_idx" ON "Place"("category")',
  ],
  AnalyticsSnapshot: [
    'CREATE INDEX IF NOT EXISTS "AnalyticsSnapshot_site_id_idx" ON "AnalyticsSnapshot"("site_id")',
    'CREATE INDEX IF NOT EXISTS "AnalyticsSnapshot_created_at_idx" ON "AnalyticsSnapshot"("created_at")',
  ],
  SeoAuditResult: [
    'CREATE INDEX IF NOT EXISTS "SeoAuditResult_content_id_idx" ON "SeoAuditResult"("content_id")',
    'CREATE INDEX IF NOT EXISTS "SeoAuditResult_content_type_idx" ON "SeoAuditResult"("content_type")',
  ],
  MediaEnrichment: [
    'CREATE INDEX IF NOT EXISTS "MediaEnrichment_processing_status_idx" ON "MediaEnrichment"("processing_status")',
  ],
  PromptTemplate: [
    'CREATE INDEX IF NOT EXISTS "PromptTemplate_category_idx" ON "PromptTemplate"("category")',
    'CREATE INDEX IF NOT EXISTS "PromptTemplate_is_active_idx" ON "PromptTemplate"("is_active")',
  ],

  // ── Multi-Site Indexes ──────────────────────────────────────────────────
  Site: [
    'CREATE INDEX IF NOT EXISTS "Site_is_active_idx" ON "Site"("is_active")',
  ],
  SiteMember: [
    'CREATE INDEX IF NOT EXISTS "SiteMember_site_id_idx" ON "SiteMember"("site_id")',
    'CREATE INDEX IF NOT EXISTS "SiteMember_user_id_idx" ON "SiteMember"("user_id")',
  ],

  // ── Enterprise Indexes ──────────────────────────────────────────────────
  AuditLog: [
    'CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId")',
    'CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action")',
    'CREATE INDEX IF NOT EXISTS "AuditLog_resource_idx" ON "AuditLog"("resource")',
    'CREATE INDEX IF NOT EXISTS "AuditLog_timestamp_idx" ON "AuditLog"("timestamp")',
  ],
  AnalyticsEvent: [
    'CREATE INDEX IF NOT EXISTS "AnalyticsEvent_eventName_idx" ON "AnalyticsEvent"("eventName")',
    'CREATE INDEX IF NOT EXISTS "AnalyticsEvent_category_idx" ON "AnalyticsEvent"("category")',
    'CREATE INDEX IF NOT EXISTS "AnalyticsEvent_timestamp_idx" ON "AnalyticsEvent"("timestamp")',
    'CREATE INDEX IF NOT EXISTS "AnalyticsEvent_sessionId_idx" ON "AnalyticsEvent"("sessionId")',
  ],
  SystemMetrics: [
    'CREATE INDEX IF NOT EXISTS "SystemMetrics_metricName_idx" ON "SystemMetrics"("metricName")',
    'CREATE INDEX IF NOT EXISTS "SystemMetrics_timestamp_idx" ON "SystemMetrics"("timestamp")',
  ],
  UserSession: [
    'CREATE INDEX IF NOT EXISTS "UserSession_userId_idx" ON "UserSession"("userId")',
    'CREATE INDEX IF NOT EXISTS "UserSession_isActive_idx" ON "UserSession"("isActive")',
    'CREATE INDEX IF NOT EXISTS "UserSession_expiresAt_idx" ON "UserSession"("expiresAt")',
  ],
  TopicPolicy: [
    'CREATE INDEX IF NOT EXISTS "TopicPolicy_site_id_idx" ON "TopicPolicy"("site_id")',
    'CREATE INDEX IF NOT EXISTS "TopicPolicy_is_active_idx" ON "TopicPolicy"("is_active")',
  ],
  ConsentLog: [
    'CREATE INDEX IF NOT EXISTS "ConsentLog_site_id_idx" ON "ConsentLog"("site_id")',
    'CREATE INDEX IF NOT EXISTS "ConsentLog_subscriber_id_idx" ON "ConsentLog"("subscriber_id")',
    'CREATE INDEX IF NOT EXISTS "ConsentLog_timestamp_idx" ON "ConsentLog"("timestamp")',
  ],

  // ── Commerce/Config Indexes ─────────────────────────────────────────────
  credentials: [
    'CREATE INDEX IF NOT EXISTS "credentials_site_id_idx" ON "credentials"("site_id")',
    'CREATE INDEX IF NOT EXISTS "credentials_type_idx" ON "credentials"("type")',
    'CREATE INDEX IF NOT EXISTS "credentials_status_idx" ON "credentials"("status")',
  ],
  content_imports: [
    'CREATE INDEX IF NOT EXISTS "content_imports_site_id_idx" ON "content_imports"("site_id")',
    'CREATE INDEX IF NOT EXISTS "content_imports_status_idx" ON "content_imports"("status")',
  ],
  leads: [
    'CREATE INDEX IF NOT EXISTS "leads_site_id_idx" ON "leads"("site_id")',
    'CREATE INDEX IF NOT EXISTS "leads_email_idx" ON "leads"("email")',
    'CREATE INDEX IF NOT EXISTS "leads_status_idx" ON "leads"("status")',
    'CREATE INDEX IF NOT EXISTS "leads_created_at_idx" ON "leads"("created_at")',
  ],
  lead_activities: [
    'CREATE INDEX IF NOT EXISTS "lead_activities_lead_id_idx" ON "lead_activities"("lead_id")',
    'CREATE INDEX IF NOT EXISTS "lead_activities_activity_type_idx" ON "lead_activities"("activity_type")',
  ],
  page_views: [
    'CREATE INDEX IF NOT EXISTS "page_views_site_id_idx" ON "page_views"("site_id")',
    'CREATE INDEX IF NOT EXISTS "page_views_url_idx" ON "page_views"("url")',
    'CREATE INDEX IF NOT EXISTS "page_views_created_at_idx" ON "page_views"("created_at")',
    'CREATE INDEX IF NOT EXISTS "page_views_session_id_idx" ON "page_views"("session_id")',
  ],
  digital_products: [
    'CREATE INDEX IF NOT EXISTS "digital_products_site_id_idx" ON "digital_products"("site_id")',
    'CREATE INDEX IF NOT EXISTS "digital_products_product_type_idx" ON "digital_products"("product_type")',
    'CREATE INDEX IF NOT EXISTS "digital_products_is_active_idx" ON "digital_products"("is_active")',
  ],
  purchases: [
    'CREATE INDEX IF NOT EXISTS "purchases_site_id_idx" ON "purchases"("site_id")',
    'CREATE INDEX IF NOT EXISTS "purchases_product_id_idx" ON "purchases"("product_id")',
    'CREATE INDEX IF NOT EXISTS "purchases_customer_email_idx" ON "purchases"("customer_email")',
    'CREATE INDEX IF NOT EXISTS "purchases_status_idx" ON "purchases"("status")',
    'CREATE INDEX IF NOT EXISTS "purchases_created_at_idx" ON "purchases"("created_at")',
  ],
  campaigns: [
    'CREATE INDEX IF NOT EXISTS "campaigns_siteId_status_idx" ON "campaigns"("siteId", "status")',
    'CREATE INDEX IF NOT EXISTS "campaigns_status_priority_idx" ON "campaigns"("status", "priority")',
    'CREATE INDEX IF NOT EXISTS "campaigns_createdAt_idx" ON "campaigns"("createdAt")',
  ],
  campaign_items: [
    'CREATE INDEX IF NOT EXISTS "campaign_items_campaignId_status_idx" ON "campaign_items"("campaignId", "status")',
    'CREATE INDEX IF NOT EXISTS "campaign_items_blogPostId_idx" ON "campaign_items"("blogPostId")',
    'CREATE INDEX IF NOT EXISTS "campaign_items_status_idx" ON "campaign_items"("status")',
  ],
  trend_runs: [
    'CREATE INDEX IF NOT EXISTS "trend_runs_siteId_runDate_idx" ON "trend_runs"("siteId", "runDate")',
    'CREATE INDEX IF NOT EXISTS "trend_runs_status_idx" ON "trend_runs"("status")',
  ],
  etsy_listing_drafts: [
    'CREATE INDEX IF NOT EXISTS "etsy_listing_drafts_siteId_status_idx" ON "etsy_listing_drafts"("siteId", "status")',
    'CREATE INDEX IF NOT EXISTS "etsy_listing_drafts_etsyListingId_idx" ON "etsy_listing_drafts"("etsyListingId")',
  ],
  commerce_campaigns: [
    'CREATE INDEX IF NOT EXISTS "commerce_campaigns_siteId_status_idx" ON "commerce_campaigns"("siteId", "status")',
    'CREATE INDEX IF NOT EXISTS "commerce_campaigns_startDate_idx" ON "commerce_campaigns"("startDate")',
  ],
  commerce_alerts: [
    'CREATE INDEX IF NOT EXISTS "commerce_alerts_siteId_read_createdAt_idx" ON "commerce_alerts"("siteId", "read", "createdAt")',
    'CREATE INDEX IF NOT EXISTS "commerce_alerts_type_idx" ON "commerce_alerts"("type")',
  ],
  commerce_orders: [
    'CREATE INDEX IF NOT EXISTS "commerce_orders_siteId_orderedAt_idx" ON "commerce_orders"("siteId", "orderedAt")',
    'CREATE INDEX IF NOT EXISTS "commerce_orders_channel_orderedAt_idx" ON "commerce_orders"("channel", "orderedAt")',
    'CREATE INDEX IF NOT EXISTS "commerce_orders_status_idx" ON "commerce_orders"("status")',
    'CREATE INDEX IF NOT EXISTS "commerce_orders_externalOrderId_idx" ON "commerce_orders"("externalOrderId")',
  ],
  trend_signals: [
    'CREATE INDEX IF NOT EXISTS "trend_signals_site_id_idx" ON "trend_signals"("site_id")',
    'CREATE INDEX IF NOT EXISTS "trend_signals_keyword_idx" ON "trend_signals"("keyword")',
    'CREATE INDEX IF NOT EXISTS "trend_signals_source_idx" ON "trend_signals"("source")',
  ],
  keyword_clusters: [
    'CREATE INDEX IF NOT EXISTS "keyword_clusters_site_id_idx" ON "keyword_clusters"("site_id")',
    'CREATE INDEX IF NOT EXISTS "keyword_clusters_primary_keyword_idx" ON "keyword_clusters"("primary_keyword")',
    'CREATE INDEX IF NOT EXISTS "keyword_clusters_status_idx" ON "keyword_clusters"("status")',
  ],
  commerce_tasks: [
    'CREATE INDEX IF NOT EXISTS "commerce_tasks_site_id_idx" ON "commerce_tasks"("site_id")',
    'CREATE INDEX IF NOT EXISTS "commerce_tasks_status_idx" ON "commerce_tasks"("status")',
    'CREATE INDEX IF NOT EXISTS "commerce_tasks_task_type_idx" ON "commerce_tasks"("task_type")',
  ],
  distribution_assets: [
    'CREATE INDEX IF NOT EXISTS "distribution_assets_site_id_idx" ON "distribution_assets"("site_id")',
    'CREATE INDEX IF NOT EXISTS "distribution_assets_design_id_idx" ON "distribution_assets"("design_id")',
    'CREATE INDEX IF NOT EXISTS "distribution_assets_channel_idx" ON "distribution_assets"("channel")',
    'CREATE INDEX IF NOT EXISTS "distribution_assets_status_idx" ON "distribution_assets"("status")',
  ],

  // ── Premium Backend Indexes ─────────────────────────────────────────────
  BackgroundJob: [
    'CREATE INDEX IF NOT EXISTS "BackgroundJob_site_id_idx" ON "BackgroundJob"("site_id")',
    'CREATE INDEX IF NOT EXISTS "BackgroundJob_job_type_idx" ON "BackgroundJob"("job_type")',
    'CREATE INDEX IF NOT EXISTS "BackgroundJob_status_idx" ON "BackgroundJob"("status")',
    'CREATE INDEX IF NOT EXISTS "BackgroundJob_next_run_at_idx" ON "BackgroundJob"("next_run_at")',
  ],
  ExitIntentImpression: [
    'CREATE INDEX IF NOT EXISTS "ExitIntentImpression_site_id_idx" ON "ExitIntentImpression"("site_id")',
    'CREATE INDEX IF NOT EXISTS "ExitIntentImpression_session_id_idx" ON "ExitIntentImpression"("session_id")',
    'CREATE INDEX IF NOT EXISTS "ExitIntentImpression_shown_at_idx" ON "ExitIntentImpression"("shown_at")',
  ],
  SitePremium: [
    'CREATE INDEX IF NOT EXISTS "SitePremium_is_active_idx" ON "SitePremium"("is_active")',
    'CREATE INDEX IF NOT EXISTS "SitePremium_createdById_idx" ON "SitePremium"("createdById")',
  ],
  SiteThemePremium: [
    'CREATE INDEX IF NOT EXISTS "SiteThemePremium_siteId_idx" ON "SiteThemePremium"("siteId")',
    'CREATE INDEX IF NOT EXISTS "SiteThemePremium_is_active_idx" ON "SiteThemePremium"("is_active")',
  ],
  HomepageVersionPremium: [
    'CREATE INDEX IF NOT EXISTS "HomepageVersionPremium_siteId_idx" ON "HomepageVersionPremium"("siteId")',
    'CREATE INDEX IF NOT EXISTS "HomepageVersionPremium_published_idx" ON "HomepageVersionPremium"("published")',
  ],
  AuditLogPremium: [
    'CREATE INDEX IF NOT EXISTS "AuditLogPremium_siteId_idx" ON "AuditLogPremium"("siteId")',
    'CREATE INDEX IF NOT EXISTS "AuditLogPremium_action_idx" ON "AuditLogPremium"("action")',
    'CREATE INDEX IF NOT EXISTS "AuditLogPremium_timestamp_idx" ON "AuditLogPremium"("timestamp")',
    'CREATE INDEX IF NOT EXISTS "AuditLogPremium_userId_idx" ON "AuditLogPremium"("userId")',
  ],
  ChangePremium: [
    'CREATE INDEX IF NOT EXISTS "ChangePremium_siteId_idx" ON "ChangePremium"("siteId")',
    'CREATE INDEX IF NOT EXISTS "ChangePremium_status_idx" ON "ChangePremium"("status")',
    'CREATE INDEX IF NOT EXISTS "ChangePremium_table_name_idx" ON "ChangePremium"("table_name")',
  ],
  SiteMemberPremium: [
    'CREATE INDEX IF NOT EXISTS "SiteMemberPremium_siteId_idx" ON "SiteMemberPremium"("siteId")',
    'CREATE INDEX IF NOT EXISTS "SiteMemberPremium_userId_idx" ON "SiteMemberPremium"("userId")',
    'CREATE INDEX IF NOT EXISTS "SiteMemberPremium_is_active_idx" ON "SiteMemberPremium"("is_active")',
  ],
  AffiliatePartner: [
    'CREATE INDEX IF NOT EXISTS "AffiliatePartner_siteId_idx" ON "AffiliatePartner"("siteId")',
    'CREATE INDEX IF NOT EXISTS "AffiliatePartner_is_active_idx" ON "AffiliatePartner"("is_active")',
  ],
  AffiliateWidget: [
    'CREATE INDEX IF NOT EXISTS "AffiliateWidget_siteId_idx" ON "AffiliateWidget"("siteId")',
    'CREATE INDEX IF NOT EXISTS "AffiliateWidget_partner_id_idx" ON "AffiliateWidget"("partner_id")',
    'CREATE INDEX IF NOT EXISTS "AffiliateWidget_is_active_idx" ON "AffiliateWidget"("is_active")',
  ],
  AffiliateAssignment: [
    'CREATE INDEX IF NOT EXISTS "AffiliateAssignment_siteId_idx" ON "AffiliateAssignment"("siteId")',
    'CREATE INDEX IF NOT EXISTS "AffiliateAssignment_partner_id_idx" ON "AffiliateAssignment"("partner_id")',
    'CREATE INDEX IF NOT EXISTS "AffiliateAssignment_content_id_idx" ON "AffiliateAssignment"("content_id")',
    'CREATE INDEX IF NOT EXISTS "AffiliateAssignment_is_active_idx" ON "AffiliateAssignment"("is_active")',
  ],
  Agreement: [
    'CREATE INDEX IF NOT EXISTS "Agreement_siteId_idx" ON "Agreement"("siteId")',
    'CREATE INDEX IF NOT EXISTS "Agreement_agreement_type_idx" ON "Agreement"("agreement_type")',
    'CREATE INDEX IF NOT EXISTS "Agreement_status_idx" ON "Agreement"("status")',
  ],
  JobRun: [
    'CREATE INDEX IF NOT EXISTS "JobRun_siteId_idx" ON "JobRun"("siteId")',
    'CREATE INDEX IF NOT EXISTS "JobRun_job_type_idx" ON "JobRun"("job_type")',
    'CREATE INDEX IF NOT EXISTS "JobRun_status_idx" ON "JobRun"("status")',
    'CREATE INDEX IF NOT EXISTS "JobRun_next_run_at_idx" ON "JobRun"("next_run_at")',
  ],
  perplexity_tasks: [
    'CREATE INDEX IF NOT EXISTS "perplexity_tasks_status_idx" ON "perplexity_tasks"("status")',
    'CREATE INDEX IF NOT EXISTS "perplexity_tasks_siteId_idx" ON "perplexity_tasks"("siteId")',
    'CREATE INDEX IF NOT EXISTS "perplexity_tasks_category_idx" ON "perplexity_tasks"("category")',
    'CREATE INDEX IF NOT EXISTS "perplexity_tasks_scheduledFor_idx" ON "perplexity_tasks"("scheduledFor")',
    'CREATE INDEX IF NOT EXISTS "perplexity_tasks_createdAt_idx" ON "perplexity_tasks"("createdAt")',
    'CREATE INDEX IF NOT EXISTS "perplexity_tasks_parentTaskId_idx" ON "perplexity_tasks"("parentTaskId")',
  ],
  perplexity_schedules: [
    'CREATE INDEX IF NOT EXISTS "perplexity_schedules_enabled_idx" ON "perplexity_schedules"("enabled")',
    'CREATE INDEX IF NOT EXISTS "perplexity_schedules_nextRunAt_idx" ON "perplexity_schedules"("nextRunAt")',
  ],
  // CEO + CTO Agent Platform indexes (migration: 20260327_add_agent_platform_models)
  conversations: [
    'CREATE INDEX IF NOT EXISTS "conversations_siteId_status_idx" ON "conversations"("siteId", "status")',
    'CREATE INDEX IF NOT EXISTS "conversations_externalId_channel_idx" ON "conversations"("externalId", "channel")',
    'CREATE INDEX IF NOT EXISTS "conversations_leadId_idx" ON "conversations"("leadId")',
    'CREATE INDEX IF NOT EXISTS "conversations_opportunityId_idx" ON "conversations"("opportunityId")',
  ],
  messages: [
    'CREATE INDEX IF NOT EXISTS "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt")',
  ],
  agent_tasks: [
    'CREATE INDEX IF NOT EXISTS "agent_tasks_agentType_status_idx" ON "agent_tasks"("agentType", "status")',
    'CREATE INDEX IF NOT EXISTS "agent_tasks_siteId_idx" ON "agent_tasks"("siteId")',
    'CREATE INDEX IF NOT EXISTS "agent_tasks_dueAt_status_idx" ON "agent_tasks"("dueAt", "status")',
  ],
  crm_opportunities: [
    'CREATE INDEX IF NOT EXISTS "crm_opportunities_siteId_stage_idx" ON "crm_opportunities"("siteId", "stage")',
    'CREATE INDEX IF NOT EXISTS "crm_opportunities_nextActionAt_idx" ON "crm_opportunities"("nextActionAt")',
    'CREATE INDEX IF NOT EXISTS "crm_opportunities_leadId_idx" ON "crm_opportunities"("leadId")',
  ],
  interaction_logs: [
    'CREATE INDEX IF NOT EXISTS "interaction_logs_siteId_createdAt_idx" ON "interaction_logs"("siteId", "createdAt")',
    'CREATE INDEX IF NOT EXISTS "interaction_logs_opportunityId_idx" ON "interaction_logs"("opportunityId")',
    'CREATE INDEX IF NOT EXISTS "interaction_logs_leadId_idx" ON "interaction_logs"("leadId")',
  ],
  retention_sequences: [
    'CREATE INDEX IF NOT EXISTS "retention_sequences_siteId_active_idx" ON "retention_sequences"("siteId", "active")',
  ],
  retention_progress: [
    'CREATE INDEX IF NOT EXISTS "retention_progress_nextSendAt_status_idx" ON "retention_progress"("nextSendAt", "status")',
  ],
  finance_events: [
    'CREATE INDEX IF NOT EXISTS "finance_events_siteId_eventType_idx" ON "finance_events"("siteId", "eventType")',
    'CREATE INDEX IF NOT EXISTS "finance_events_externalId_idx" ON "finance_events"("externalId")',
  ],
  chrome_audit_reports: [
    'CREATE INDEX IF NOT EXISTS "chrome_audit_reports_siteId_auditType_idx" ON "chrome_audit_reports"("siteId", "auditType")',
    'CREATE INDEX IF NOT EXISTS "chrome_audit_reports_siteId_status_idx" ON "chrome_audit_reports"("siteId", "status")',
    'CREATE INDEX IF NOT EXISTS "chrome_audit_reports_uploadedAt_idx" ON "chrome_audit_reports"("uploadedAt")',
    'CREATE INDEX IF NOT EXISTS "chrome_audit_reports_pageSlug_idx" ON "chrome_audit_reports"("pageSlug")',
  ],
  ab_tests: [
    'CREATE INDEX IF NOT EXISTS "ab_tests_siteId_status_idx" ON "ab_tests"("siteId", "status")',
    'CREATE INDEX IF NOT EXISTS "ab_tests_targetUrl_idx" ON "ab_tests"("targetUrl")',
    'CREATE INDEX IF NOT EXISTS "ab_tests_createdAt_idx" ON "ab_tests"("createdAt")',
  ],
};

// ─── Unique Constraints ──────────────────────────────────────────────────────
const UNIQUE_CONSTRAINTS: string[] = [
  'CREATE UNIQUE INDEX IF NOT EXISTS "yachts_externalId_source_key" ON "yachts"("externalId", "source")',
  'CREATE UNIQUE INDEX IF NOT EXISTS "yachts_slug_siteId_key" ON "yachts"("slug", "siteId")',
  'CREATE UNIQUE INDEX IF NOT EXISTS "yacht_destinations_slug_siteId_key" ON "yacht_destinations"("slug", "siteId")',
  'CREATE UNIQUE INDEX IF NOT EXISTS "charter_inquiries_referenceNumber_key" ON "charter_inquiries"("referenceNumber")',
  'CREATE UNIQUE INDEX IF NOT EXISTS "charter_itineraries_slug_siteId_key" ON "charter_itineraries"("slug", "siteId")',
  'CREATE UNIQUE INDEX IF NOT EXISTS "pdf_guides_slug_key" ON "pdf_guides"("slug")',
  // Content pipeline + monitoring
  'CREATE UNIQUE INDEX IF NOT EXISTS "url_indexing_status_site_id_url_key" ON "url_indexing_status"("site_id", "url")',
  'CREATE UNIQUE INDEX IF NOT EXISTS "feature_flags_name_siteId_key" ON "feature_flags"("name", "siteId")',
  'CREATE UNIQUE INDEX IF NOT EXISTS "subscribers_site_id_email_key" ON "subscribers"("site_id", "email")',
  'CREATE UNIQUE INDEX IF NOT EXISTS "site_settings_siteId_category_key" ON "site_settings"("siteId", "category")',
  // Auth
  'CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId")',
  'CREATE UNIQUE INDEX IF NOT EXISTS "verificationtokens_identifier_token_key" ON "verificationtokens"("identifier", "token")',
  // Core Content
  'CREATE UNIQUE INDEX IF NOT EXISTS "BlogPost_slug_siteId_key" ON "BlogPost"("slug", "siteId")',
  // SEO
  'CREATE UNIQUE INDEX IF NOT EXISTS "seo_meta_pageId_key" ON "seo_meta"("pageId")',
  'CREATE UNIQUE INDEX IF NOT EXISTS "seo_content_analysis_contentId_key" ON "seo_content_analysis"("contentId")',
  // Multi-site
  'CREATE UNIQUE INDEX IF NOT EXISTS "SiteMember_site_id_user_id_key" ON "SiteMember"("site_id", "user_id")',
  // Commerce
  'CREATE UNIQUE INDEX IF NOT EXISTS "digital_products_site_id_slug_key" ON "digital_products"("site_id", "slug")',
  'CREATE UNIQUE INDEX IF NOT EXISTS "tenant_integrations_tenantId_integrationType_key" ON "tenant_integrations"("tenantId", "integrationType")',
  // Premium
  'CREATE UNIQUE INDEX IF NOT EXISTS "SiteMemberPremium_siteId_userId_key" ON "SiteMemberPremium"("siteId", "userId")',
  'CREATE UNIQUE INDEX IF NOT EXISTS "AffiliatePartner_siteId_slug_key" ON "AffiliatePartner"("siteId", "slug")',
  'CREATE UNIQUE INDEX IF NOT EXISTS "PromptTemplate_name_version_key" ON "PromptTemplate"("name", "version")',
];

// ─── Foreign Keys ────────────────────────────────────────────────────────────
// Applied AFTER all tables are created. Each uses DO $$ BEGIN ... EXCEPTION ... END $$
// to skip silently if the constraint already exists.
const FOREIGN_KEYS: { name: string; sql: string }[] = [
  // Yacht Charter FKs
  { name: "yachts_destinationId_fkey", sql: 'ALTER TABLE "yachts" ADD CONSTRAINT "yachts_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "yacht_destinations"("id") ON DELETE SET NULL ON UPDATE CASCADE' },
  { name: "charter_inquiries_yachtId_fkey", sql: 'ALTER TABLE "charter_inquiries" ADD CONSTRAINT "charter_inquiries_yachtId_fkey" FOREIGN KEY ("yachtId") REFERENCES "yachts"("id") ON DELETE SET NULL ON UPDATE CASCADE' },
  { name: "yacht_availability_yachtId_fkey", sql: 'ALTER TABLE "yacht_availability" ADD CONSTRAINT "yacht_availability_yachtId_fkey" FOREIGN KEY ("yachtId") REFERENCES "yachts"("id") ON DELETE CASCADE ON UPDATE CASCADE' },
  { name: "yacht_reviews_yachtId_fkey", sql: 'ALTER TABLE "yacht_reviews" ADD CONSTRAINT "yacht_reviews_yachtId_fkey" FOREIGN KEY ("yachtId") REFERENCES "yachts"("id") ON DELETE CASCADE ON UPDATE CASCADE' },
  { name: "charter_itineraries_destinationId_fkey", sql: 'ALTER TABLE "charter_itineraries" ADD CONSTRAINT "charter_itineraries_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "yacht_destinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE' },
  // Design System FKs
  { name: "pdf_downloads_pdfGuideId_fkey", sql: 'ALTER TABLE "pdf_downloads" ADD CONSTRAINT "pdf_downloads_pdfGuideId_fkey" FOREIGN KEY ("pdfGuideId") REFERENCES "pdf_guides"("id") ON DELETE RESTRICT ON UPDATE CASCADE' },
  { name: "content_performance_pipelineId_fkey", sql: 'ALTER TABLE "content_performance" ADD CONSTRAINT "content_performance_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "content_pipelines"("id") ON DELETE RESTRICT ON UPDATE CASCADE' },
  // Audit Engine FKs
  { name: "audit_issues_auditRunId_fkey", sql: 'ALTER TABLE "audit_issues" ADD CONSTRAINT "audit_issues_auditRunId_fkey" FOREIGN KEY ("auditRunId") REFERENCES "audit_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE' },
  // Model Route FK
  { name: "model_routes_primary_provider_id_fkey", sql: 'ALTER TABLE "model_routes" ADD CONSTRAINT "model_routes_primary_provider_id_fkey" FOREIGN KEY ("primary_provider_id") REFERENCES "model_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE' },
  // Auth FKs
  { name: "accounts_userId_fkey", sql: 'ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE' },
  { name: "sessions_userId_fkey", sql: 'ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE' },
  // Core Content FKs
  { name: "BlogPost_category_id_fkey", sql: 'ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE' },
  { name: "BlogPost_author_id_fkey", sql: 'ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE' },
  // SEO FKs
  { name: "seo_internal_links_sourcePageId_fkey", sql: 'ALTER TABLE "seo_internal_links" ADD CONSTRAINT "seo_internal_links_sourcePageId_fkey" FOREIGN KEY ("sourcePageId") REFERENCES "seo_meta"("pageId") ON DELETE CASCADE ON UPDATE CASCADE' },
  { name: "seo_internal_links_targetPageId_fkey", sql: 'ALTER TABLE "seo_internal_links" ADD CONSTRAINT "seo_internal_links_targetPageId_fkey" FOREIGN KEY ("targetPageId") REFERENCES "seo_meta"("pageId") ON DELETE CASCADE ON UPDATE CASCADE' },
  { name: "seo_content_analysis_contentId_fkey", sql: 'ALTER TABLE "seo_content_analysis" ADD CONSTRAINT "seo_content_analysis_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "seo_meta"("pageId") ON DELETE CASCADE ON UPDATE CASCADE' },
  { name: "seo_health_metrics_pageId_fkey", sql: 'ALTER TABLE "seo_health_metrics" ADD CONSTRAINT "seo_health_metrics_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "seo_meta"("pageId") ON DELETE SET NULL ON UPDATE CASCADE' },
  { name: "seo_page_metrics_pageId_fkey", sql: 'ALTER TABLE "seo_page_metrics" ADD CONSTRAINT "seo_page_metrics_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "seo_meta"("pageId") ON DELETE CASCADE ON UPDATE CASCADE' },
  { name: "seo_hreflang_entries_pageId_fkey", sql: 'ALTER TABLE "seo_hreflang_entries" ADD CONSTRAINT "seo_hreflang_entries_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "seo_meta"("pageId") ON DELETE CASCADE ON UPDATE CASCADE' },
  { name: "seo_structured_data_pageId_fkey", sql: 'ALTER TABLE "seo_structured_data" ADD CONSTRAINT "seo_structured_data_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "seo_meta"("pageId") ON DELETE CASCADE ON UPDATE CASCADE' },
  // Commerce FKs
  { name: "lead_activities_lead_id_fkey", sql: 'ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE' },
  { name: "purchases_product_id_fkey", sql: 'ALTER TABLE "purchases" ADD CONSTRAINT "purchases_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "digital_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE' },
  { name: "campaign_items_campaignId_fkey", sql: 'ALTER TABLE "campaign_items" ADD CONSTRAINT "campaign_items_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE' },
  { name: "tenant_integrations_tenantId_fkey", sql: 'ALTER TABLE "tenant_integrations" ADD CONSTRAINT "tenant_integrations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE' },
  // Premium FKs
  { name: "AffiliateWidget_partner_id_fkey", sql: 'ALTER TABLE "AffiliateWidget" ADD CONSTRAINT "AffiliateWidget_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "AffiliatePartner"("id") ON DELETE CASCADE ON UPDATE CASCADE' },
  { name: "AffiliateAssignment_partner_id_fkey", sql: 'ALTER TABLE "AffiliateAssignment" ADD CONSTRAINT "AffiliateAssignment_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "AffiliatePartner"("id") ON DELETE CASCADE ON UPDATE CASCADE' },
  // Team member FKs
  { name: "team_member_expertise_team_member_id_fkey", sql: 'ALTER TABLE "team_member_expertise" ADD CONSTRAINT "team_member_expertise_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE' },
  { name: "content_credits_team_member_id_fkey", sql: 'ALTER TABLE "content_credits" ADD CONSTRAINT "content_credits_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getExistingTables(prisma: any): Promise<Set<string>> {
  const rows: { table_name: string }[] = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `;
  return new Set(rows.map((r) => r.table_name));
}

async function getExistingColumns(
  prisma: any,
  tableName: string,
): Promise<Set<string>> {
  const clean = tableName.replace(/"/g, "");
  const rows: { column_name: string }[] = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${clean}
  `;
  return new Set(rows.map((r) => r.column_name));
}

// ─── Scan (GET) ─────────────────────────────────────────────────────────────

interface ScanResult {
  missingTables: { table: string; model: string }[];
  missingColumns: { table: string; model: string; column: string; type: string }[];
  missingEnums: string[];
  missingIndexes: number;
  existingTables: string[];
  totalChecked: number;
}

async function getExistingEnums(prisma: any): Promise<Set<string>> {
  try {
    const rows: { typname: string }[] = await prisma.$queryRaw`
      SELECT t.typname FROM pg_type t
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typtype = 'e'
    `;
    return new Set(rows.map((r) => r.typname));
  } catch {
    return new Set();
  }
}

async function scanDatabase(prisma: any): Promise<ScanResult> {
  const existingTables = await getExistingTables(prisma);
  const existingEnums = await getExistingEnums(prisma);

  const missingTables: ScanResult["missingTables"] = [];
  const missingTableNames = new Set<string>();
  const missingColumns: ScanResult["missingColumns"] = [];
  const missingEnums: string[] = [];
  let missingIndexCount = 0;

  // Check for missing enums
  for (const en of ENUM_STATEMENTS) {
    if (!existingEnums.has(en.name)) {
      missingEnums.push(en.name);
    }
  }

  // Check for entirely missing tables (from CREATE_TABLE_STATEMENTS)
  for (const def of CREATE_TABLE_STATEMENTS) {
    if (!existingTables.has(def.table)) {
      missingTables.push({ table: def.table, model: def.model });
      missingTableNames.add(def.table);
    }
  }

  // Check for missing columns on existing tables (from EXPECTED_TABLES)
  for (const def of EXPECTED_TABLES) {
    const tableName = def.table.replace(/"/g, "");
    if (!existingTables.has(tableName)) {
      // Entire table is missing — skip column checks, add if not already tracked
      if (!missingTableNames.has(tableName)) {
        missingTables.push({ table: tableName, model: def.model });
        missingTableNames.add(tableName);
      }
      continue;
    }

    const existingCols = await getExistingColumns(prisma, def.table);
    for (const col of def.columns) {
      if (!existingCols.has(col.name)) {
        missingColumns.push({
          table: tableName,
          model: def.model,
          column: col.name,
          type: col.type,
        });
      }
    }
  }

  // Estimate missing indexes (we can't easily check index existence via information_schema alone)
  for (const def of EXPECTED_TABLES) {
    if (def.indexes) missingIndexCount += def.indexes.length;
  }
  for (const table in NEW_TABLE_INDEXES) {
    missingIndexCount += NEW_TABLE_INDEXES[table].length;
  }

  return {
    missingTables,
    missingColumns,
    missingEnums,
    missingIndexes: missingIndexCount,
    existingTables: Array.from(existingTables).sort(),
    totalChecked:
      CREATE_TABLE_STATEMENTS.length +
      EXPECTED_TABLES.reduce((n, t) => n + t.columns.length, 0),
  };
}

// ─── Migrate (POST) ────────────────────────────────────────────────────────

interface MigrateResult {
  enumsCreated: string[];
  tablesCreated: string[];
  columnsAdded: string[];
  indexesCreated: string[];
  foreignKeysCreated: string[];
  errors: string[];
}

async function migrateDatabase(prisma: any, budgetLeft: () => number = () => 999_999): Promise<MigrateResult> {
  const result: MigrateResult = {
    enumsCreated: [],
    tablesCreated: [],
    columnsAdded: [],
    indexesCreated: [],
    foreignKeysCreated: [],
    errors: [],
  };

  const existingTables = await getExistingTables(prisma);

  // Helper: execute a batch of SQL statements in a SINGLE connection
  // This prevents connection pool exhaustion (P2024) by reducing the number
  // of individual $executeRawUnsafe calls from hundreds to a handful.
  async function executeBatch(statements: string[], label: string): Promise<{ executed: number; errors: string[] }> {
    if (statements.length === 0) return { executed: 0, errors: [] };
    const batchErrors: string[] = [];
    let executed = 0;

    // Execute in chunks of 20 statements per single SQL call
    const CHUNK_SIZE = 20;
    for (let i = 0; i < statements.length; i += CHUNK_SIZE) {
      if (budgetLeft() < 3_000) { batchErrors.push(`Budget exhausted during ${label}`); break; }
      const chunk = statements.slice(i, i + CHUNK_SIZE);
      const combinedSql = chunk.join(";\n") + ";";
      try {
        await prisma.$executeRawUnsafe(combinedSql);
        executed += chunk.length;
      } catch (e: any) {
        // If batch fails, fall back to one-by-one for this chunk
        for (const stmt of chunk) {
          if (budgetLeft() < 2_000) break;
          try {
            await prisma.$executeRawUnsafe(stmt);
            executed++;
          } catch (e2: any) {
            const msg = e2.message?.substring(0, 100) || String(e2);
            if (!msg.includes("already exists") && !msg.includes("duplicate")) {
              batchErrors.push(`${label}: ${msg}`);
            }
          }
        }
      }
    }
    return { executed, errors: batchErrors };
  }

  // 0. Create missing enums (must happen before tables that reference them)
  const existingEnums = await getExistingEnums(prisma);
  const enumStatements: string[] = [];
  const enumNames: string[] = [];
  for (const en of ENUM_STATEMENTS) {
    if (existingEnums.has(en.name)) continue;
    enumStatements.push(
      `DO $$ BEGIN CREATE TYPE "${en.name}" AS ENUM (${en.values.map((v) => `'${v}'`).join(", ")}); EXCEPTION WHEN duplicate_object THEN NULL; END $$`
    );
    enumNames.push(en.name);
  }
  const enumResult = await executeBatch(enumStatements, "enum creation");
  result.enumsCreated = enumNames.slice(0, enumResult.executed);
  result.errors.push(...enumResult.errors);

  // 1. Create missing tables (one at a time — CREATE TABLE can be large)
  for (const def of CREATE_TABLE_STATEMENTS) {
    if (budgetLeft() < 3_000) { result.errors.push("Budget exhausted during table creation"); break; }
    if (!existingTables.has(def.table)) {
      try {
        await prisma.$executeRawUnsafe(def.sql);
        result.tablesCreated.push(`${def.table} (${def.model})`);

        // Batch indexes for this new table
        const tableIndexes = NEW_TABLE_INDEXES[def.table] || [];
        if (tableIndexes.length > 0) {
          const idxResult = await executeBatch(tableIndexes, `indexes for ${def.table}`);
          result.indexesCreated.push(...tableIndexes.slice(0, idxResult.executed).map(idx => idx.match(/\"([^"]+_idx)\"/)?.[1] || "index"));
          result.errors.push(...idxResult.errors);
        }
      } catch (e: any) {
        result.errors.push(`Failed to create ${def.table}: ${e.message?.substring(0, 150)}`);
      }
    }
  }

  // 2. Add missing columns — collect all ALTER TABLE statements, then batch
  const alterStatements: string[] = [];
  const alterLabels: string[] = [];
  const indexStatements: string[] = [];

  for (const def of EXPECTED_TABLES) {
    if (budgetLeft() < 3_000) { result.errors.push("Budget exhausted during column scan"); break; }
    const tableName = def.table.replace(/"/g, "");
    if (!existingTables.has(tableName)) continue;

    const existingCols = await getExistingColumns(prisma, def.table);

    for (const col of def.columns) {
      if (existingCols.has(col.name)) continue;
      const nullable = col.nullable !== false ? "" : " NOT NULL";
      const dflt = col.defaultValue ? ` DEFAULT ${col.defaultValue}` : "";
      alterStatements.push(`ALTER TABLE ${def.table} ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type}${nullable}${dflt}`);
      alterLabels.push(`${tableName}.${col.name} (${col.type})`);
    }

    if (def.indexes) {
      indexStatements.push(...def.indexes);
    }
  }

  // Execute ALTER TABLE batch
  const alterResult = await executeBatch(alterStatements, "column addition");
  result.columnsAdded = alterLabels.slice(0, alterResult.executed);
  result.errors.push(...alterResult.errors);

  // Execute index batch
  const idxResult = await executeBatch(indexStatements, "index creation");
  result.indexesCreated.push(...indexStatements.slice(0, idxResult.executed).map(idx => idx.match(/\"([^"]+_idx)\"/)?.[1] || "index"));
  result.errors.push(...idxResult.errors);

  // 3. Create unique constraints — batch
  const ucResult = await executeBatch(UNIQUE_CONSTRAINTS, "unique constraints");
  result.indexesCreated.push(...UNIQUE_CONSTRAINTS.slice(0, ucResult.executed).map(sql => sql.match(/\"([^"]+_key)\"/)?.[1] || "unique"));
  result.errors.push(...ucResult.errors);

  // 4. Create foreign keys — batch
  const fkStatements = FOREIGN_KEYS.map(fk => `DO $$ BEGIN ${fk.sql}; EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  const fkNames = FOREIGN_KEYS.map(fk => fk.name);
  const fkResult = await executeBatch(fkStatements, "foreign keys");
  result.foreignKeysCreated = fkNames.slice(0, fkResult.executed);
  result.errors.push(...fkResult.errors);

  return result;
}

// ─── Route Handlers ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authError = await checkAuth(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const scan = await scanDatabase(prisma);

    return NextResponse.json({
      success: true,
      action: "scan",
      ...scan,
      summary: {
        missingEnums: scan.missingEnums.length,
        missingTables: scan.missingTables.length,
        missingColumns: scan.missingColumns.length,
        needsMigration:
          scan.missingEnums.length > 0 || scan.missingTables.length > 0 || scan.missingColumns.length > 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("[db-migrate] Scan failed:", e);
    return NextResponse.json(
      {
        success: false,
        error: "Scan failed",
        hint: "Check DATABASE_URL and that the database is reachable",
      },
      { status: 500 },
    );
  }
}

// ─── Prisma Migration Deploy ──────────────────────────────────────────────
// Reads migration SQL files from prisma/migrations/ and applies any that
// haven't been recorded in the _prisma_migrations table.
// Equivalent to `npx prisma migrate deploy` but works from serverless.
async function runPrismaMigrations(_request: NextRequest) {
  const start = Date.now();
  const results: { applied: string[]; skipped: string[]; errors: string[] } = {
    applied: [],
    skipped: [],
    errors: [],
  };

  try {
    const { prisma } = await import("@/lib/db");
    const fs = await import("fs");
    const path = await import("path");

    // Ensure _prisma_migrations table exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" VARCHAR(36) NOT NULL PRIMARY KEY,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      )
    `);

    // Find migration directories
    const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
    if (!fs.existsSync(migrationsDir)) {
      return NextResponse.json({
        success: false,
        error: "Prisma migrations directory not found on this server. Migration files are not bundled by Vercel. Use 'Scan Schema' + 'Fix All' instead, or run 'npx prisma migrate deploy' from a local terminal connected to the production database.",
      }, { status: 400 });
    }

    const dirs = fs.readdirSync(migrationsDir, { withFileTypes: true })
      .filter((d: any) => d.isDirectory() && !d.name.startsWith("_"))
      .map((d: any) => d.name)
      .sort(); // Alphabetical = chronological for timestamped dirs

    // Get already-applied migrations
    const applied = await prisma.$queryRawUnsafe(
      `SELECT "migration_name" FROM "_prisma_migrations" WHERE "rolled_back_at" IS NULL`
    ) as { migration_name: string }[];
    const appliedSet = new Set(applied.map((r) => r.migration_name));

    for (const dir of dirs) {
      if (appliedSet.has(dir)) {
        results.skipped.push(dir);
        continue;
      }

      const sqlPath = path.join(migrationsDir, dir, "migration.sql");
      if (!fs.existsSync(sqlPath)) {
        results.skipped.push(`${dir} (no migration.sql)`);
        continue;
      }

      // Budget check — don't start a migration if we're running low
      if (Date.now() - start > 45_000) {
        results.errors.push(`${dir}: skipped (budget exhausted after 45s)`);
        break;
      }

      try {
        const sql = fs.readFileSync(sqlPath, "utf-8");
        const migrationId = require("crypto").randomUUID();

        // Record migration as started
        await prisma.$executeRawUnsafe(
          `INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "started_at", "applied_steps_count")
           VALUES ($1, $2, $3, now(), 0)`,
          migrationId,
          require("crypto").createHash("sha256").update(sql).digest("hex"),
          dir
        );

        // Execute the migration SQL
        // Split on semicolons but handle IF NOT EXISTS and DO $$ blocks
        const statements = sql
          .split(/;\s*$/m)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0);

        let stepsApplied = 0;
        for (const stmt of statements) {
          try {
            await prisma.$executeRawUnsafe(stmt);
            stepsApplied++;
          } catch (stmtErr: any) {
            const msg = stmtErr?.message || String(stmtErr);
            // Skip "already exists" errors (idempotent migrations)
            if (msg.includes("already exists") || msg.includes("duplicate")) {
              stepsApplied++;
              continue;
            }
            throw stmtErr;
          }
        }

        // Mark as completed
        await prisma.$executeRawUnsafe(
          `UPDATE "_prisma_migrations" SET "finished_at" = now(), "applied_steps_count" = $1 WHERE "id" = $2`,
          stepsApplied,
          migrationId
        );

        results.applied.push(dir);
      } catch (migErr: any) {
        const msg = migErr?.message || String(migErr);
        results.errors.push(`${dir}: ${msg.slice(0, 200)}`);
        console.error(`[db-migrate] Prisma migration ${dir} failed:`, msg);
      }
    }

    return NextResponse.json({
      success: results.errors.length === 0,
      action: "prisma-migrate",
      applied: results.applied,
      skipped: results.skipped,
      errors: results.errors,
      totalMigrations: dirs.length,
      alreadyApplied: results.skipped.length,
      newlyApplied: results.applied.length,
      durationMs: Date.now() - start,
    });
  } catch (e: any) {
    console.error("[db-migrate] Prisma migration deploy failed:", e);
    return NextResponse.json({
      success: false,
      error: "Prisma migration deploy failed",
      details: e?.message?.slice(0, 300),
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await checkAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  // ── Prisma Migration Deploy ─────────────────────────────────────────────
  // Runs pending Prisma migration SQL files from prisma/migrations/
  // This is equivalent to `npx prisma migrate deploy` but runs from serverless
  if (action === "prisma-migrate") {
    return runPrismaMigrations(request);
  }

  const _start = Date.now();
  const BUDGET_MS = 53_000; // 53s budget out of 60s maxDuration
  const budgetLeft = () => BUDGET_MS - (Date.now() - _start);

  try {
    const { prisma } = await import("@/lib/db");

    // Ensure connection pool is ready (prevents P2024 on cold start)
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await prisma.$executeRawUnsafe("SELECT 1");
        break;
      } catch (connErr) {
        if (attempt === 2) throw connErr;
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // Scan first
    const before = await scanDatabase(prisma);

    // Migrate (pass budget checker so it can bail early if running out of time)
    const result = await migrateDatabase(prisma, budgetLeft);

    // Scan after to verify (only if budget permits)
    let after = { missingTables: [] as any[], missingColumns: [] as any[] };
    if (budgetLeft() > 5_000) {
      const afterScan = await scanDatabase(prisma);
      after = { missingTables: afterScan.missingTables, missingColumns: afterScan.missingColumns };
    }

    return NextResponse.json({
      success: true,
      action: "migrate",
      before: {
        missingTables: before.missingTables.length,
        missingColumns: before.missingColumns.length,
      },
      after: {
        missingTables: after.missingTables.length,
        missingColumns: after.missingColumns.length,
      },
      result,
      durationMs: Date.now() - _start,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("[db-migrate] Migration failed:", e);
    return NextResponse.json(
      {
        success: false,
        error: "Migration failed",
        hint: "Check DATABASE_URL and ensure the database user has CREATE/ALTER permissions",
      },
      { status: 500 },
    );
  }
}
