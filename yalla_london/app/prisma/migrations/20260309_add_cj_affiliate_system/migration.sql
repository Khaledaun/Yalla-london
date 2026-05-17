-- CreateEnum
CREATE TYPE "NetworkStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED');
CREATE TYPE "AdvertiserStatus" AS ENUM ('JOINED', 'PENDING', 'NOT_JOINED', 'DECLINED');
CREATE TYPE "AdvertiserPriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
CREATE TYPE "CjLinkType" AS ENUM ('TEXT', 'BANNER', 'PRODUCT', 'DEEP');
CREATE TYPE "CjLanguage" AS ENUM ('EN', 'AR');
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'LOCKED');
CREATE TYPE "PlacementType" AS ENUM ('INLINE', 'SIDEBAR', 'BANNER', 'CTA', 'CARD', 'COMPARISON_TABLE');
CREATE TYPE "RotationStrategy" AS ENUM ('RANDOM', 'HIGHEST_EPC', 'NEWEST', 'MANUAL');
CREATE TYPE "PlacementCondition" AS ENUM ('CATEGORY_MATCH', 'TAG_MATCH', 'LANGUAGE_MATCH', 'URL_MATCH', 'KEYWORD_MATCH');
CREATE TYPE "ClickDevice" AS ENUM ('DESKTOP', 'MOBILE', 'TABLET');
CREATE TYPE "SyncType" AS ENUM ('ADVERTISERS', 'LINKS', 'PRODUCTS', 'COMMISSIONS', 'DEALS');
CREATE TYPE "CjSyncStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED');

-- CreateTable: affiliate_networks
CREATE TABLE "affiliate_networks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "apiBaseUrl" TEXT,
    "apiTokenEnvVar" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "status" "NetworkStatus" NOT NULL DEFAULT 'ACTIVE',
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "affiliate_networks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "affiliate_networks_slug_key" ON "affiliate_networks"("slug");

-- CreateTable: cj_advertisers
CREATE TABLE "cj_advertisers" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cj_advertisers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cj_advertisers_networkId_externalId_key" ON "cj_advertisers"("networkId", "externalId");
CREATE INDEX "cj_advertisers_status_idx" ON "cj_advertisers"("status");
CREATE INDEX "cj_advertisers_category_idx" ON "cj_advertisers"("category");
CREATE INDEX "cj_advertisers_priority_idx" ON "cj_advertisers"("priority");
CREATE INDEX "cj_advertisers_threeMonthEpc_idx" ON "cj_advertisers"("threeMonthEpc");

-- CreateTable: cj_links
CREATE TABLE "cj_links" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cj_links_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cj_links_networkId_idx" ON "cj_links"("networkId");
CREATE INDEX "cj_links_advertiserId_idx" ON "cj_links"("advertiserId");
CREATE INDEX "cj_links_isActive_idx" ON "cj_links"("isActive");
CREATE INDEX "cj_links_category_idx" ON "cj_links"("category");
CREATE INDEX "cj_links_linkType_idx" ON "cj_links"("linkType");

-- CreateTable: cj_offers
CREATE TABLE "cj_offers" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cj_offers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cj_offers_networkId_idx" ON "cj_offers"("networkId");
CREATE INDEX "cj_offers_advertiserId_idx" ON "cj_offers"("advertiserId");
CREATE INDEX "cj_offers_isActive_idx" ON "cj_offers"("isActive");
CREATE INDEX "cj_offers_category_idx" ON "cj_offers"("category");
CREATE INDEX "cj_offers_validTo_idx" ON "cj_offers"("validTo");
CREATE INDEX "cj_offers_isPriceDropped_idx" ON "cj_offers"("isPriceDropped");
CREATE INDEX "cj_offers_isNewArrival_idx" ON "cj_offers"("isNewArrival");

-- CreateTable: cj_commissions
CREATE TABLE "cj_commissions" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cj_commissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cj_commissions_networkId_externalId_key" ON "cj_commissions"("networkId", "externalId");
CREATE INDEX "cj_commissions_advertiserId_idx" ON "cj_commissions"("advertiserId");
CREATE INDEX "cj_commissions_linkId_idx" ON "cj_commissions"("linkId");
CREATE INDEX "cj_commissions_status_idx" ON "cj_commissions"("status");
CREATE INDEX "cj_commissions_eventDate_idx" ON "cj_commissions"("eventDate");

-- CreateTable: cj_placements
CREATE TABLE "cj_placements" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cj_placements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cj_placements_slug_key" ON "cj_placements"("slug");
CREATE INDEX "cj_placements_isActive_idx" ON "cj_placements"("isActive");

-- CreateTable: cj_placement_rules
CREATE TABLE "cj_placement_rules" (
    "id" TEXT NOT NULL,
    "placementId" TEXT NOT NULL,
    "condition" "PlacementCondition" NOT NULL DEFAULT 'CATEGORY_MATCH',
    "value" TEXT NOT NULL,
    "advertiserId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cj_placement_rules_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cj_placement_rules_placementId_idx" ON "cj_placement_rules"("placementId");

-- CreateTable: cj_click_events
CREATE TABLE "cj_click_events" (
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
CREATE INDEX "cj_click_events_linkId_createdAt_idx" ON "cj_click_events"("linkId", "createdAt");
CREATE INDEX "cj_click_events_createdAt_idx" ON "cj_click_events"("createdAt");

-- CreateTable: cj_sync_logs
CREATE TABLE "cj_sync_logs" (
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
CREATE INDEX "cj_sync_logs_networkId_idx" ON "cj_sync_logs"("networkId");
CREATE INDEX "cj_sync_logs_syncType_idx" ON "cj_sync_logs"("syncType");
CREATE INDEX "cj_sync_logs_createdAt_idx" ON "cj_sync_logs"("createdAt");

-- AddForeignKey constraints
ALTER TABLE "cj_advertisers" ADD CONSTRAINT "cj_advertisers_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "affiliate_networks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cj_links" ADD CONSTRAINT "cj_links_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "affiliate_networks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cj_links" ADD CONSTRAINT "cj_links_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "cj_advertisers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cj_offers" ADD CONSTRAINT "cj_offers_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "affiliate_networks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cj_offers" ADD CONSTRAINT "cj_offers_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "cj_advertisers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cj_commissions" ADD CONSTRAINT "cj_commissions_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "affiliate_networks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cj_commissions" ADD CONSTRAINT "cj_commissions_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "cj_advertisers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cj_commissions" ADD CONSTRAINT "cj_commissions_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "cj_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cj_click_events" ADD CONSTRAINT "cj_click_events_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "cj_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cj_sync_logs" ADD CONSTRAINT "cj_sync_logs_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "affiliate_networks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cj_placement_rules" ADD CONSTRAINT "cj_placement_rules_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "cj_placements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: CJ Affiliate Network
INSERT INTO "affiliate_networks" ("id", "name", "slug", "apiBaseUrl", "apiTokenEnvVar", "publisherId", "status", "config", "createdAt", "updatedAt")
VALUES (
    'cj-network-001',
    'CJ Affiliate',
    'cj-affiliate',
    'https://advertiser-lookup.api.cj.com',
    'CJ_API_TOKEN',
    '7895467',
    'ACTIVE',
    '{"graphqlEndpoint": "https://graphql.api.cj.com/graphql", "linkSearchUrl": "https://link-search.api.cj.com/v2/link-search", "productSearchUrl": "https://product-search.api.cj.com/v2/product-search", "commissionDetailUrl": "https://commission-detail.api.cj.com/v3/commissions"}',
    NOW(),
    NOW()
);

-- Seed: 8 Pending Advertisers
INSERT INTO "cj_advertisers" ("id", "networkId", "externalId", "name", "category", "status", "commissionRate", "threeMonthEpc", "priority", "createdAt", "updatedAt") VALUES
('cj-adv-booking',     'cj-network-001', '4297311', 'Booking.com UK',                    'Hotel',    'PENDING', 'Lead: 4%',           317.81, 'CRITICAL', NOW(), NOW()),
('cj-adv-expedia',     'cj-network-001', '1874913', 'Expedia, Inc',                      'Vacation', 'PENDING', NULL,                 61.67,  'HIGH',     NOW(), NOW()),
('cj-adv-ihg',         'cj-network-001', '4381309', 'IHG Europe',                        'Hotel',    'PENDING', 'Sale: 3%',           119.34, 'HIGH',     NOW(), NOW()),
('cj-adv-kayak',       'cj-network-001', '5144910', 'KAYAK US',                          'Travel',   'PENDING', '$0.08-$1.69',        8.53,   'MEDIUM',   NOW(), NOW()),
('cj-adv-lastminute',  'cj-network-001', '7195567', 'lastminute.com INT',                'Travel',   'PENDING', 'Sale: 1%',           2.94,   'LOW',      NOW(), NOW()),
('cj-adv-qatar',       'cj-network-001', '3014150', 'Qatar Airways',                     'Air',      'PENDING', 'Sale: 2%',           64.34,  'HIGH',     NOW(), NOW()),
('cj-adv-tripadvisor', 'cj-network-001', '2942540', 'TripAdvisor Commerce Campaign',     'Hotel',    'PENDING', 'Sale: 4%-40%',       12.40,  'HIGH',     NOW(), NOW()),
('cj-adv-vrbo',        'cj-network-001', '2691607', 'Vrbo',                              'Vacation', 'PENDING', 'Sale: 2%',           25.38,  'MEDIUM',   NOW(), NOW());

-- Seed: Default Placements
INSERT INTO "cj_placements" ("id", "slug", "name", "type", "pagePattern", "position", "maxLinks", "rotationStrategy", "isActive", "createdAt", "updatedAt") VALUES
('cj-pl-blog-inline',      'blog-inline',        'Blog Inline Links',        'INLINE',            '/blog/*',                    'after-paragraph-3',         3, 'HIGHEST_EPC',   true, NOW(), NOW()),
('cj-pl-blog-sidebar',     'blog-sidebar',       'Blog Sidebar Widget',      'SIDEBAR',           '/blog/*',                    'sidebar-top',               2, 'HIGHEST_EPC',   true, NOW(), NOW()),
('cj-pl-guide-cta',        'guide-cta',          'Guide CTA Blocks',         'CTA',               '/guides/*',                  'after-each-section',        4, 'HIGHEST_EPC',   true, NOW(), NOW()),
('cj-pl-homepage-featured', 'homepage-featured', 'Homepage Featured Offers',  'CARD',              '/',                          'featured-offers-section',   4, 'MANUAL',        true, NOW(), NOW()),
('cj-pl-cat-hotels',       'category-hotels',    'Hotel Category Banner',    'BANNER',            '/blog/category/hotels*',     'top-banner',                1, 'HIGHEST_EPC',   true, NOW(), NOW()),
('cj-pl-cat-dining',       'category-dining',    'Dining Category Banner',   'BANNER',            '/blog/category/dining*',     'top-banner',                1, 'HIGHEST_EPC',   true, NOW(), NOW()),
('cj-pl-cat-transport',    'category-transport',  'Transport Category Banner','BANNER',            '/blog/category/transport*',  'top-banner',                1, 'HIGHEST_EPC',   true, NOW(), NOW()),
('cj-pl-footer-global',    'footer-global',       'Footer Global Links',     'INLINE',            '*',                          'footer',                    6, 'HIGHEST_EPC',   true, NOW(), NOW()),
('cj-pl-exp-inline',       'experience-inline',   'Experience Inline Links',  'INLINE',            '/experiences/*',             'inline',                    3, 'HIGHEST_EPC',   true, NOW(), NOW()),
('cj-pl-hot-deals',        'hot-deals-homepage',  'Hot Deals Homepage',       'CARD',              '/',                          'below-hero',                3, 'NEWEST',        true, NOW(), NOW());

-- Seed: Feature Flags for CJ Affiliate System
-- Default: all enabled (true) — can be toggled from admin dashboard
INSERT INTO "feature_flags" ("id", "name", "enabled", "description", "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'FEATURE_AFFILIATE_ENABLED',         true, 'Master kill switch for entire CJ affiliate system', NOW(), NOW()),
(gen_random_uuid(), 'FEATURE_AFFILIATE_AUTO_INJECT',     true, 'Auto-inject affiliate links when articles are published', NOW(), NOW()),
(gen_random_uuid(), 'FEATURE_AFFILIATE_TRACKING',        true, 'Track affiliate link clicks and impressions', NOW(), NOW()),
(gen_random_uuid(), 'FEATURE_AFFILIATE_DEAL_DISCOVERY',  true, 'Automated deal finding across joined advertisers', NOW(), NOW()),
(gen_random_uuid(), 'FEATURE_AFFILIATE_COMMISSIONS',     true, 'Sync commission data from CJ API', NOW(), NOW()),
(gen_random_uuid(), 'CRON_AFFILIATE_SYNC_ADVERTISERS',   true, 'Enable affiliate advertiser sync cron', NOW(), NOW()),
(gen_random_uuid(), 'CRON_AFFILIATE_SYNC_COMMISSIONS',   true, 'Enable affiliate commission sync cron', NOW(), NOW()),
(gen_random_uuid(), 'CRON_AFFILIATE_DISCOVER_DEALS',     true, 'Enable affiliate deal discovery cron', NOW(), NOW()),
(gen_random_uuid(), 'CRON_AFFILIATE_REFRESH_LINKS',      true, 'Enable affiliate link refresh cron', NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;
