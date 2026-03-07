-- Commerce Engine: Phase 0 Migration
-- Adds 7 new models + extends FeatureFlag, DigitalProduct, Purchase, ProductType

-- ─── Extend ProductType enum with 6 new values ─────────────
ALTER TYPE "ProductType" ADD VALUE IF NOT EXISTS 'WALL_ART';
ALTER TYPE "ProductType" ADD VALUE IF NOT EXISTS 'PRESET';
ALTER TYPE "ProductType" ADD VALUE IF NOT EXISTS 'PLANNER';
ALTER TYPE "ProductType" ADD VALUE IF NOT EXISTS 'STICKER';
ALTER TYPE "ProductType" ADD VALUE IF NOT EXISTS 'WORKSHEET';
ALTER TYPE "ProductType" ADD VALUE IF NOT EXISTS 'EVENT_GUIDE';

-- ─── Extend FeatureFlag — add siteId for per-site flags ────
ALTER TABLE "FeatureFlag" ADD COLUMN IF NOT EXISTS "siteId" TEXT;

-- Drop old unique constraint on name (if exists) and add composite
DROP INDEX IF EXISTS "FeatureFlag_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "FeatureFlag_name_siteId_key" ON "FeatureFlag"("name", "siteId");
CREATE INDEX IF NOT EXISTS "FeatureFlag_siteId_idx" ON "FeatureFlag"("siteId");

-- ─── Extend DigitalProduct — add commerce metadata ─────────
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "tier" INTEGER;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "ontologyCategory" TEXT;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "etsyListingId" TEXT;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "briefId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "digital_products_etsyListingId_key" ON "digital_products"("etsyListingId");
CREATE INDEX IF NOT EXISTS "digital_products_tier_idx" ON "digital_products"("tier");

-- ─── Extend Purchase — add sales channel ───────────────────
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT 'website';
CREATE INDEX IF NOT EXISTS "purchases_channel_idx" ON "purchases"("channel");

-- ─── New: TrendRun ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "trend_runs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trend_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "trend_runs_siteId_runDate_idx" ON "trend_runs"("siteId", "runDate");
CREATE INDEX IF NOT EXISTS "trend_runs_status_idx" ON "trend_runs"("status");

-- ─── New: ProductBrief ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "product_briefs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "siteId" TEXT NOT NULL,
    "trendRunId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "productType" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 2,
    "ontologyCategory" TEXT,
    "targetPrice" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "keywordsJson" JSONB,
    "competitorUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "designNotesJson" JSONB,
    "listingCopyJson" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectionNote" TEXT,
    "digitalProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_briefs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "product_briefs_siteId_status_idx" ON "product_briefs"("siteId", "status");
CREATE INDEX IF NOT EXISTS "product_briefs_tier_idx" ON "product_briefs"("tier");
CREATE INDEX IF NOT EXISTS "product_briefs_trendRunId_idx" ON "product_briefs"("trendRunId");

-- ─── New: EtsyListingDraft ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "etsy_listing_drafts" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "siteId" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "title" VARCHAR(140) NOT NULL,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "quantity" INTEGER NOT NULL DEFAULT 999,
    "section" TEXT,
    "materials" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fileUrl" TEXT,
    "previewImages" JSONB,
    "etsyListingId" TEXT,
    "etsyState" TEXT,
    "etsyUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "reviewNote" TEXT,
    "approvedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "etsy_listing_drafts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "etsy_listing_drafts_briefId_key" ON "etsy_listing_drafts"("briefId");
CREATE INDEX IF NOT EXISTS "etsy_listing_drafts_siteId_status_idx" ON "etsy_listing_drafts"("siteId", "status");

-- ─── New: EtsyShopConfig ───────────────────────────────────
CREATE TABLE IF NOT EXISTS "etsy_shop_configs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "siteId" TEXT NOT NULL,
    "shopId" TEXT,
    "shopName" TEXT,
    "shopUrl" TEXT,
    "accessTokenCredentialId" TEXT,
    "refreshTokenCredentialId" TEXT,
    "apiKeyCredentialId" TEXT,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tokenExpiresAt" TIMESTAMP(3),
    "statsJson" JSONB,
    "connectionStatus" TEXT NOT NULL DEFAULT 'not_connected',
    "lastCsvImportAt" TIMESTAMP(3),
    "lastTestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "etsy_shop_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "etsy_shop_configs_siteId_key" ON "etsy_shop_configs"("siteId");

-- ─── New: ProductPack ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS "product_packs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "siteId" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ar" TEXT,
    "slug" TEXT NOT NULL,
    "description_en" TEXT,
    "description_ar" TEXT,
    "price" INTEGER NOT NULL,
    "compare_price" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cover_image" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_packs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_packs_slug_key" ON "product_packs"("slug");
CREATE INDEX IF NOT EXISTS "product_packs_siteId_idx" ON "product_packs"("siteId");

-- ─── New: CommerceCampaign ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "commerce_campaigns" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commerce_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "commerce_campaigns_siteId_status_idx" ON "commerce_campaigns"("siteId", "status");

-- ─── New: CommerceAlert ────────────────────────────────────
CREATE TABLE IF NOT EXISTS "commerce_alerts" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commerce_alerts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "commerce_alerts_siteId_read_idx" ON "commerce_alerts"("siteId", "read");
CREATE INDEX IF NOT EXISTS "commerce_alerts_type_idx" ON "commerce_alerts"("type");

-- ─── Foreign Keys ──────────────────────────────────────────
ALTER TABLE "product_briefs" ADD CONSTRAINT "product_briefs_trendRunId_fkey"
    FOREIGN KEY ("trendRunId") REFERENCES "trend_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
