-- Migration: Add Perplexity Computer task management models
-- Date: 2026-03-14
-- Purpose: Enable structured task management for Perplexity Computer integration
-- Safety: All CREATE TABLE IF NOT EXISTS + ALTER TABLE ADD COLUMN IF NOT EXISTS (idempotent)

-- PerplexityTask — Main task record for Perplexity Computer actions
CREATE TABLE IF NOT EXISTS "perplexity_tasks" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "siteId" TEXT,
  "category" TEXT NOT NULL DEFAULT 'research',
  "taskType" TEXT NOT NULL DEFAULT 'general',
  "title" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "status" TEXT NOT NULL DEFAULT 'queued',
  "scheduledFor" TIMESTAMP,
  "startedAt" TIMESTAMP,
  "completedAt" TIMESTAMP,
  "resultSummary" TEXT,
  "resultData" JSONB,
  "errorMessage" TEXT,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "maxRetries" INTEGER NOT NULL DEFAULT 2,
  "estimatedCredits" INTEGER NOT NULL DEFAULT 10,
  "actualCredits" INTEGER,
  "parentTaskId" TEXT,
  "tags" TEXT[] DEFAULT '{}',
  "metadata" JSONB DEFAULT '{}',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "perplexity_tasks_status_idx" ON "perplexity_tasks"("status");
CREATE INDEX IF NOT EXISTS "perplexity_tasks_siteId_idx" ON "perplexity_tasks"("siteId");
CREATE INDEX IF NOT EXISTS "perplexity_tasks_category_idx" ON "perplexity_tasks"("category");
CREATE INDEX IF NOT EXISTS "perplexity_tasks_scheduledFor_idx" ON "perplexity_tasks"("scheduledFor");
CREATE INDEX IF NOT EXISTS "perplexity_tasks_createdAt_idx" ON "perplexity_tasks"("createdAt");
CREATE INDEX IF NOT EXISTS "perplexity_tasks_parentTaskId_idx" ON "perplexity_tasks"("parentTaskId");

-- PerplexitySchedule — Recurring task schedules
CREATE TABLE IF NOT EXISTS "perplexity_schedules" (
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
  "lastRunAt" TIMESTAMP,
  "nextRunAt" TIMESTAMP,
  "runCount" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB DEFAULT '{}',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "perplexity_schedules_enabled_idx" ON "perplexity_schedules"("enabled");
CREATE INDEX IF NOT EXISTS "perplexity_schedules_nextRunAt_idx" ON "perplexity_schedules"("nextRunAt");
