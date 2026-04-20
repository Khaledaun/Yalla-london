-- A/B Test model for Chrome Bridge registration + tracking
-- Migration: 20260420_add_ab_test

CREATE TABLE IF NOT EXISTS "ab_tests" (
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
);

CREATE INDEX IF NOT EXISTS "ab_tests_siteId_status_idx" ON "ab_tests"("siteId", "status");
CREATE INDEX IF NOT EXISTS "ab_tests_targetUrl_idx" ON "ab_tests"("targetUrl");
CREATE INDEX IF NOT EXISTS "ab_tests_createdAt_idx" ON "ab_tests"("createdAt");
