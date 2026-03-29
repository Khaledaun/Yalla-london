-- Migration: Add ApiUsageLog table for AI token monitoring + per-site cost separation
-- Date: 2026-02-26

CREATE TABLE IF NOT EXISTS "api_usage_logs" (
    "id"                TEXT NOT NULL,
    "siteId"            TEXT NOT NULL DEFAULT 'unknown',
    "provider"          TEXT NOT NULL,
    "model"             TEXT NOT NULL,
    "taskType"          TEXT,
    "calledFrom"        TEXT,
    "promptTokens"      INTEGER NOT NULL DEFAULT 0,
    "completionTokens"  INTEGER NOT NULL DEFAULT 0,
    "totalTokens"       INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd"  DOUBLE PRECISION NOT NULL DEFAULT 0,
    "success"           BOOLEAN NOT NULL DEFAULT true,
    "errorMessage"      TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_usage_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "api_usage_logs_siteId_createdAt_idx" ON "api_usage_logs"("siteId", "createdAt");
CREATE INDEX IF NOT EXISTS "api_usage_logs_provider_createdAt_idx" ON "api_usage_logs"("provider", "createdAt");
CREATE INDEX IF NOT EXISTS "api_usage_logs_taskType_createdAt_idx" ON "api_usage_logs"("taskType", "createdAt");
CREATE INDEX IF NOT EXISTS "api_usage_logs_createdAt_idx" ON "api_usage_logs"("createdAt");
