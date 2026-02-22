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
};

// ─── Unique Constraints ──────────────────────────────────────────────────────
const UNIQUE_CONSTRAINTS: string[] = [
  'CREATE UNIQUE INDEX IF NOT EXISTS "yachts_externalId_source_key" ON "yachts"("externalId", "source")',
  'CREATE UNIQUE INDEX IF NOT EXISTS "yachts_slug_siteId_key" ON "yachts"("slug", "siteId")',
  'CREATE UNIQUE INDEX IF NOT EXISTS "yacht_destinations_slug_siteId_key" ON "yacht_destinations"("slug", "siteId")',
  'CREATE UNIQUE INDEX IF NOT EXISTS "charter_inquiries_referenceNumber_key" ON "charter_inquiries"("referenceNumber")',
  'CREATE UNIQUE INDEX IF NOT EXISTS "charter_itineraries_slug_siteId_key" ON "charter_itineraries"("slug", "siteId")',
  'CREATE UNIQUE INDEX IF NOT EXISTS "pdf_guides_slug_key" ON "pdf_guides"("slug")',
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

async function migrateDatabase(prisma: any): Promise<MigrateResult> {
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
    if (!existingTables.has(def.table)) {
      try {
        await prisma.$executeRawUnsafe(def.sql);
        result.tablesCreated.push(`${def.table} (${def.model})`);

        // Create indexes for new table
        const tableIndexes = NEW_TABLE_INDEXES[def.table] || [];
        for (const idx of tableIndexes) {
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
    const tableName = def.table.replace(/"/g, "");
    if (!existingTables.has(tableName)) {
      // Table doesn't exist and isn't in CREATE_TABLE_STATEMENTS — skip
      continue;
    }

    const existingCols = await getExistingColumns(prisma, def.table);

    for (const col of def.columns) {
      if (existingCols.has(col.name)) continue;

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
    return NextResponse.json(
      {
        success: false,
        error: e.message || "Scan failed",
        hint: "Check DATABASE_URL and that the database is reachable",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await checkAuth(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");

    // Scan first
    const before = await scanDatabase(prisma);

    // Migrate
    const result = await migrateDatabase(prisma);

    // Scan after to verify
    const after = await scanDatabase(prisma);

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
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        success: false,
        error: e.message || "Migration failed",
        hint: "Check DATABASE_URL and ensure the database user has CREATE/ALTER permissions",
      },
      { status: 500 },
    );
  }
}
