-- CJ Affiliate Tables — Standalone (run in Supabase SQL Editor)
-- Safe: all IF NOT EXISTS / EXCEPTION WHEN duplicate_object

-- Enums
DO $$ BEGIN CREATE TYPE "NetworkStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AdvertiserStatus" AS ENUM ('JOINED', 'PENDING', 'NOT_JOINED', 'DECLINED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AdvertiserPriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CjLinkType" AS ENUM ('TEXT', 'BANNER', 'PRODUCT', 'DEEP'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CjLanguage" AS ENUM ('EN', 'AR'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'LOCKED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PlacementType" AS ENUM ('INLINE', 'SIDEBAR', 'BANNER', 'CTA', 'CARD', 'COMPARISON_TABLE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "RotationStrategy" AS ENUM ('RANDOM', 'HIGHEST_EPC', 'NEWEST', 'MANUAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PlacementCondition" AS ENUM ('CATEGORY_MATCH', 'TAG_MATCH', 'LANGUAGE_MATCH', 'URL_MATCH', 'KEYWORD_MATCH'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ClickDevice" AS ENUM ('DESKTOP', 'MOBILE', 'TABLET'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SyncType" AS ENUM ('ADVERTISERS', 'LINKS', 'PRODUCTS', 'COMMISSIONS', 'DEALS'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CjSyncStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tables
CREATE TABLE IF NOT EXISTS "affiliate_networks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "apiBaseUrl" TEXT,
    "apiTokenEnvVar" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "status" "NetworkStatus" NOT NULL DEFAULT 'ACTIVE',
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "affiliate_networks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "affiliate_networks_slug_key" ON "affiliate_networks"("slug");

CREATE TABLE IF NOT EXISTS "cj_advertisers" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
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
    CONSTRAINT "cj_advertisers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "cj_advertisers_networkId_externalId_key" ON "cj_advertisers"("networkId", "externalId");
CREATE INDEX IF NOT EXISTS "cj_advertisers_status_idx" ON "cj_advertisers"("status");

CREATE TABLE IF NOT EXISTS "cj_links" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cj_links_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "cj_links_advertiserId_idx" ON "cj_links"("advertiserId");

CREATE TABLE IF NOT EXISTS "cj_offers" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cj_offers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "cj_commissions" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "linkId" TEXT,
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
    CONSTRAINT "cj_commissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "cj_commissions_networkId_externalId_key" ON "cj_commissions"("networkId", "externalId");

CREATE TABLE IF NOT EXISTS "cj_placements" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PlacementType" NOT NULL DEFAULT 'INLINE',
    "pagePattern" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "maxLinks" INTEGER NOT NULL DEFAULT 3,
    "rotationStrategy" "RotationStrategy" NOT NULL DEFAULT 'HIGHEST_EPC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cj_placements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "cj_placements_slug_key" ON "cj_placements"("slug");

CREATE TABLE IF NOT EXISTS "cj_placement_rules" (
    "id" TEXT NOT NULL,
    "placementId" TEXT NOT NULL,
    "condition" "PlacementCondition" NOT NULL DEFAULT 'CATEGORY_MATCH',
    "value" TEXT NOT NULL,
    "advertiserId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cj_placement_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "cj_click_events" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "sessionId" TEXT,
    "pageUrl" TEXT NOT NULL,
    "userAgent" TEXT,
    "country" TEXT,
    "device" "ClickDevice" NOT NULL DEFAULT 'DESKTOP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cj_click_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "cj_click_events_createdAt_idx" ON "cj_click_events"("createdAt");

CREATE TABLE IF NOT EXISTS "cj_sync_logs" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "syncType" "SyncType" NOT NULL,
    "status" "CjSyncStatus" NOT NULL DEFAULT 'SUCCESS',
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cj_sync_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "cj_sync_logs_createdAt_idx" ON "cj_sync_logs"("createdAt");

-- Foreign Keys
DO $$ BEGIN ALTER TABLE "cj_advertisers" ADD CONSTRAINT "cj_advertisers_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "affiliate_networks"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "cj_links" ADD CONSTRAINT "cj_links_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "affiliate_networks"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "cj_links" ADD CONSTRAINT "cj_links_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "cj_advertisers"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "cj_offers" ADD CONSTRAINT "cj_offers_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "affiliate_networks"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "cj_offers" ADD CONSTRAINT "cj_offers_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "cj_advertisers"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "cj_commissions" ADD CONSTRAINT "cj_commissions_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "affiliate_networks"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "cj_commissions" ADD CONSTRAINT "cj_commissions_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "cj_advertisers"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "cj_commissions" ADD CONSTRAINT "cj_commissions_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "cj_links"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "cj_placement_rules" ADD CONSTRAINT "cj_placement_rules_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "cj_placements"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "cj_click_events" ADD CONSTRAINT "cj_click_events_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "cj_links"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "cj_sync_logs" ADD CONSTRAINT "cj_sync_logs_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "affiliate_networks"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
