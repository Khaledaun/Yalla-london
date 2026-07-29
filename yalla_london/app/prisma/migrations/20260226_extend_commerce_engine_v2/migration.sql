-- Commerce Engine V2: Extended Models + Field Additions
-- Adds: Tenant, TenantIntegration, DistributionAsset, CommerceSettings,
--        CommerceOrder, Payout, PayoutProfileTemplate, TrendSignal,
--        KeywordCluster, CommerceTask
-- Extends: Purchase (fee breakdown, attribution), DigitalProduct (sku, version),
--          EtsyListingDraft (title variants, description blocks, category path)

-- ─── New Tables ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "tenants" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "primaryLanguages" TEXT[] DEFAULT ARRAY['en']::TEXT[],
    "destination" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "brandColorsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_domain_key" ON "tenants"("domain");
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_siteId_key" ON "tenants"("siteId");
CREATE INDEX IF NOT EXISTS "tenants_status_idx" ON "tenants"("status");

CREATE TABLE IF NOT EXISTS "tenant_integrations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "integrationType" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "configJson" JSONB,
    "credentialIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastSyncAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'not_configured',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenant_integrations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tenant_integrations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_integrations_tenantId_integrationType_key" ON "tenant_integrations"("tenantId", "integrationType");
CREATE INDEX IF NOT EXISTS "tenant_integrations_integrationType_idx" ON "tenant_integrations"("integrationType");

CREATE TABLE IF NOT EXISTS "distribution_assets" (
    "id" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "distribution_assets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "distribution_assets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "distribution_assets_tenantId_idx" ON "distribution_assets"("tenantId");
CREATE INDEX IF NOT EXISTS "distribution_assets_siteId_assetType_idx" ON "distribution_assets"("siteId", "assetType");

CREATE TABLE IF NOT EXISTS "commerce_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "commerce_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "commerce_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "commerce_settings_tenantId_key" ON "commerce_settings"("tenantId");

CREATE TABLE IF NOT EXISTS "commerce_orders" (
    "id" TEXT NOT NULL,
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
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "commerce_orders_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "commerce_orders_siteId_orderedAt_idx" ON "commerce_orders"("siteId", "orderedAt");
CREATE INDEX IF NOT EXISTS "commerce_orders_channel_orderedAt_idx" ON "commerce_orders"("channel", "orderedAt");
CREATE INDEX IF NOT EXISTS "commerce_orders_status_idx" ON "commerce_orders"("status");
CREATE INDEX IF NOT EXISTS "commerce_orders_externalOrderId_idx" ON "commerce_orders"("externalOrderId");

CREATE TABLE IF NOT EXISTS "payouts" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "payouts_siteId_createdAt_idx" ON "payouts"("siteId", "createdAt");
CREATE INDEX IF NOT EXISTS "payouts_source_status_idx" ON "payouts"("source", "status");

CREATE TABLE IF NOT EXISTS "payout_profile_templates" (
    "id" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payout_profile_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "trend_signals" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "trendRunId" TEXT,
    "keyword" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "previousValue" DOUBLE PRECISION,
    "changePercent" DOUBLE PRECISION,
    "category" TEXT,
    "seasonality" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trend_signals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "trend_signals_siteId_capturedAt_idx" ON "trend_signals"("siteId", "capturedAt");
CREATE INDEX IF NOT EXISTS "trend_signals_keyword_idx" ON "trend_signals"("keyword");
CREATE INDEX IF NOT EXISTS "trend_signals_source_idx" ON "trend_signals"("source");
CREATE INDEX IF NOT EXISTS "trend_signals_trendRunId_idx" ON "trend_signals"("trendRunId");

CREATE TABLE IF NOT EXISTS "keyword_clusters" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primaryKeyword" TEXT NOT NULL,
    "secondaryKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "longTailKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "totalSearchVolume" INTEGER,
    "avgCompetition" DOUBLE PRECISION,
    "intent" TEXT,
    "buyerIntentScore" DOUBLE PRECISION,
    "seasonality" TEXT,
    "peakMonths" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "briefId" TEXT,
    "productType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "keyword_clusters_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "keyword_clusters_siteId_idx" ON "keyword_clusters"("siteId");
CREATE INDEX IF NOT EXISTS "keyword_clusters_primaryKeyword_idx" ON "keyword_clusters"("primaryKeyword");
CREATE INDEX IF NOT EXISTS "keyword_clusters_intent_idx" ON "keyword_clusters"("intent");

CREATE TABLE IF NOT EXISTS "commerce_tasks" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "assignedTo" TEXT,
    "dueDate" TIMESTAMP(3),
    "briefId" TEXT,
    "campaignId" TEXT,
    "productId" TEXT,
    "listingDraftId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    "blockedReason" TEXT,
    "dependsOn" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "commerce_tasks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "commerce_tasks_siteId_status_idx" ON "commerce_tasks"("siteId", "status");
CREATE INDEX IF NOT EXISTS "commerce_tasks_category_idx" ON "commerce_tasks"("category");
CREATE INDEX IF NOT EXISTS "commerce_tasks_priority_status_idx" ON "commerce_tasks"("priority", "status");
CREATE INDEX IF NOT EXISTS "commerce_tasks_briefId_idx" ON "commerce_tasks"("briefId");
CREATE INDEX IF NOT EXISTS "commerce_tasks_campaignId_idx" ON "commerce_tasks"("campaignId");

-- ─── Extend Existing Tables ─────────────────────────────────

-- Purchase: Add fee breakdown + attribution fields
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "utm_medium" TEXT;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "coupon_code" TEXT;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "attribution_tags" JSONB;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "gross_amount" INTEGER;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "platform_fees" INTEGER;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "processing_fees" INTEGER;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "net_amount" INTEGER;

-- DigitalProduct: Add SKU + version
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "sku" TEXT;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX IF NOT EXISTS "digital_products_sku_key" ON "digital_products"("sku") WHERE "sku" IS NOT NULL;

-- EtsyListingDraft: Add title variants, description blocks, category path
ALTER TABLE "etsy_listing_drafts" ADD COLUMN IF NOT EXISTS "titleVariants" JSONB;
ALTER TABLE "etsy_listing_drafts" ADD COLUMN IF NOT EXISTS "descriptionBlocks" JSONB;
ALTER TABLE "etsy_listing_drafts" ADD COLUMN IF NOT EXISTS "categoryPath" TEXT;
