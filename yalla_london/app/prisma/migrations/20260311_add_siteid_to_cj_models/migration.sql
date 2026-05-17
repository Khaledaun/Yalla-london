-- Migration: Add siteId to CJ affiliate models for per-site data isolation
-- Required before launching any second site on the platform (Stage B blocker)
-- Safe: all new columns are nullable, no data loss

-- CjCommission: track which site generated each commission (via SID attribution)
ALTER TABLE "cj_commissions" ADD COLUMN IF NOT EXISTS "siteId" TEXT;
CREATE INDEX IF NOT EXISTS "cj_commissions_siteId_idx" ON "cj_commissions"("siteId");

-- CjClickEvent: track which site each click originated from
ALTER TABLE "cj_click_events" ADD COLUMN IF NOT EXISTS "siteId" TEXT;
CREATE INDEX IF NOT EXISTS "cj_click_events_siteId_createdAt_idx" ON "cj_click_events"("siteId", "createdAt");

-- CjOffer: allow per-site deal targeting (null = available to all sites)
ALTER TABLE "cj_offers" ADD COLUMN IF NOT EXISTS "siteId" TEXT;
CREATE INDEX IF NOT EXISTS "cj_offers_siteId_idx" ON "cj_offers"("siteId");

-- Backfill: attempt to populate siteId from existing sessionId field (format: siteId_articleSlug)
-- Only updates rows where sessionId contains an underscore (indicating SID format)
UPDATE "cj_click_events"
SET "siteId" = SPLIT_PART("sessionId", '_', 1)
WHERE "sessionId" IS NOT NULL
  AND "sessionId" LIKE '%_%'
  AND "siteId" IS NULL;
