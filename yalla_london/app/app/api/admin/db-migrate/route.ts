export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  // ── Content Pipeline Core Indexes ──────────────────────────
  article_drafts: [
    'CREATE INDEX IF NOT EXISTS "article_drafts_current_phase_site_id_idx" ON "article_drafts"("current_phase", "site_id")',
    'CREATE INDEX IF NOT EXISTS "article_drafts_current_phase_created_at_idx" ON "article_drafts"("current_phase", "created_at")',
    'CREATE INDEX IF NOT EXISTS "article_drafts_quality_score_idx" ON "article_drafts"("quality_score")',
    'CREATE INDEX IF NOT EXISTS "article_drafts_site_id_current_phase_idx" ON "article_drafts"("site_id", "current_phase")',
    'CREATE INDEX IF NOT EXISTS "article_drafts_created_at_idx" ON "article_drafts"("created_at")',
    'CREATE INDEX IF NOT EXISTS "article_drafts_paired_draft_id_idx" ON "article_drafts"("paired_draft_id")',
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
  ],
  cron_job_logs: [
    'CREATE INDEX IF NOT EXISTS "cron_job_logs_job_name_started_at_idx" ON "cron_job_logs"("job_name", "started_at")',
    'CREATE INDEX IF NOT EXISTS "cron_job_logs_site_id_job_name_idx" ON "cron_job_logs"("site_id", "job_name")',
    'CREATE INDEX IF NOT EXISTS "cron_job_logs_status_idx" ON "cron_job_logs"("status")',
    'CREATE INDEX IF NOT EXISTS "cron_job_logs_started_at_idx" ON "cron_job_logs"("started_at")',
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

  // 0. Create missing enums (must happen before tables that reference them)
  const existingEnums = await getExistingEnums(prisma);
  for (const en of ENUM_STATEMENTS) {
    if (existingEnums.has(en.name)) continue;
    if (budgetLeft() < 3_000) { result.errors.push("Budget exhausted during enum creation"); break; }
    try {
      await prisma.$executeRawUnsafe(
        `DO $$ BEGIN CREATE TYPE "${en.name}" AS ENUM (${en.values.map((v) => `'${v}'`).join(", ")}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      );
      result.enumsCreated.push(en.name);
    } catch (e: any) {
      if (!e.message?.includes("already exists")) {
        result.errors.push(`Enum ${en.name}: ${e.message?.substring(0, 100)}`);
      }
    }
  }

  // 1. Create missing tables
  for (const def of CREATE_TABLE_STATEMENTS) {
    if (budgetLeft() < 3_000) { result.errors.push("Budget exhausted during table creation"); break; }
    if (!existingTables.has(def.table)) {
      try {
        await prisma.$executeRawUnsafe(def.sql);
        result.tablesCreated.push(`${def.table} (${def.model})`);

        // Create indexes for new table
        const tableIndexes = NEW_TABLE_INDEXES[def.table] || [];
        for (const idx of tableIndexes) {
          if (budgetLeft() < 2_000) break;
          try {
            await prisma.$executeRawUnsafe(idx);
            result.indexesCreated.push(idx.match(/\"([^"]+_idx)\"/)?.[1] || idx);
          } catch (e: any) {
            result.errors.push(`Index error: ${e.message?.substring(0, 100)}`);
          }
        }
      } catch (e: any) {
        result.errors.push(
          `Failed to create ${def.table}: ${e.message?.substring(0, 150)}`,
        );
      }
    }
  }

  // 2. Add missing columns to existing tables
  for (const def of EXPECTED_TABLES) {
    if (budgetLeft() < 3_000) { result.errors.push("Budget exhausted during column addition"); break; }
    const tableName = def.table.replace(/"/g, "");
    if (!existingTables.has(tableName)) {
      // Table doesn't exist and isn't in CREATE_TABLE_STATEMENTS — skip
      continue;
    }

    const existingCols = await getExistingColumns(prisma, def.table);

    for (const col of def.columns) {
      if (existingCols.has(col.name)) continue;
      if (budgetLeft() < 2_000) break;

      const nullable = col.nullable !== false ? "" : " NOT NULL";
      const dflt = col.defaultValue ? ` DEFAULT ${col.defaultValue}` : "";
      const sql = `ALTER TABLE ${def.table} ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type}${nullable}${dflt}`;

      try {
        await prisma.$executeRawUnsafe(sql);
        result.columnsAdded.push(`${tableName}.${col.name} (${col.type})`);
      } catch (e: any) {
        result.errors.push(
          `Failed to add ${tableName}.${col.name}: ${e.message?.substring(0, 150)}`,
        );
      }
    }

    // Create indexes for existing tables
    if (def.indexes) {
      for (const idx of def.indexes) {
        if (budgetLeft() < 2_000) break;
        try {
          await prisma.$executeRawUnsafe(idx);
          result.indexesCreated.push(
            idx.match(/\"([^"]+_idx)\"/)?.[1] || "index",
          );
        } catch (e: any) {
          // Most index errors are "already exists" — not critical
          if (!e.message?.includes("already exists")) {
            result.errors.push(`Index error: ${e.message?.substring(0, 100)}`);
          }
        }
      }
    }
  }

  // 3. Create unique constraints
  for (const sql of UNIQUE_CONSTRAINTS) {
    if (budgetLeft() < 2_000) { result.errors.push("Budget exhausted during constraint creation"); break; }
    try {
      await prisma.$executeRawUnsafe(sql);
      result.indexesCreated.push(sql.match(/\"([^"]+_key)\"/)?.[1] || "unique");
    } catch (e: any) {
      if (!e.message?.includes("already exists")) {
        result.errors.push(`Unique constraint: ${e.message?.substring(0, 100)}`);
      }
    }
  }

  // 4. Create foreign keys (after all tables exist)
  for (const fk of FOREIGN_KEYS) {
    if (budgetLeft() < 2_000) { result.errors.push("Budget exhausted during FK creation"); break; }
    try {
      await prisma.$executeRawUnsafe(
        `DO $$ BEGIN ${fk.sql}; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      );
      result.foreignKeysCreated.push(fk.name);
    } catch (e: any) {
      if (!e.message?.includes("already exists")) {
        result.errors.push(`FK ${fk.name}: ${e.message?.substring(0, 100)}`);
      }
    }
  }

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

export async function POST(request: NextRequest) {
  const authError = await checkAuth(request);
  if (authError) return authError;

  const _start = Date.now();
  const BUDGET_MS = 53_000; // 53s budget out of 60s maxDuration
  const budgetLeft = () => BUDGET_MS - (Date.now() - _start);

  try {
    const { prisma } = await import("@/lib/db");

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
