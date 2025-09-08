
-- Phase 4B Database Schema Extensions
-- Add tables for topic management, content pipeline, and analytics

-- Topic Proposals Table
CREATE TABLE IF NOT EXISTS "TopicProposal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "keywords" TEXT[],
    "searchIntent" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopicProposal_pkey" PRIMARY KEY ("id")
);

-- SEO Audits Table
CREATE TABLE IF NOT EXISTS "SeoAudit" (
    "id" TEXT NOT NULL,
    "contentId" TEXT,
    "url" TEXT,
    "score" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "issues" JSONB,
    "recommendations" JSONB,
    "metrics" JSONB,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "auditType" TEXT NOT NULL DEFAULT 'content',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoAudit_pkey" PRIMARY KEY ("id")
);

-- Analytics Snapshots Table
CREATE TABLE IF NOT EXISTS "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "metrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- Activity Log Table (Enhanced)
CREATE TABLE IF NOT EXISTS "ActivityLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "details" JSONB,
    "performedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS "TopicProposal_status_idx" ON "TopicProposal"("status");
CREATE INDEX IF NOT EXISTS "TopicProposal_category_idx" ON "TopicProposal"("category");
CREATE INDEX IF NOT EXISTS "TopicProposal_locale_idx" ON "TopicProposal"("locale");
CREATE INDEX IF NOT EXISTS "TopicProposal_priority_idx" ON "TopicProposal"("priority");
CREATE INDEX IF NOT EXISTS "TopicProposal_createdAt_idx" ON "TopicProposal"("createdAt");

CREATE INDEX IF NOT EXISTS "SeoAudit_contentId_idx" ON "SeoAudit"("contentId");
CREATE INDEX IF NOT EXISTS "SeoAudit_score_idx" ON "SeoAudit"("score");
CREATE INDEX IF NOT EXISTS "SeoAudit_passed_idx" ON "SeoAudit"("passed");
CREATE INDEX IF NOT EXISTS "SeoAudit_createdAt_idx" ON "SeoAudit"("createdAt");

CREATE INDEX IF NOT EXISTS "AnalyticsSnapshot_date_idx" ON "AnalyticsSnapshot"("date");

CREATE INDEX IF NOT EXISTS "ActivityLog_action_idx" ON "ActivityLog"("action");
CREATE INDEX IF NOT EXISTS "ActivityLog_entityType_idx" ON "ActivityLog"("entityType");
CREATE INDEX IF NOT EXISTS "ActivityLog_entityId_idx" ON "ActivityLog"("entityId");
CREATE INDEX IF NOT EXISTS "ActivityLog_performedBy_idx" ON "ActivityLog"("performedBy");
CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- Add foreign key constraints
ALTER TABLE "SeoAudit" ADD CONSTRAINT "SeoAudit_contentId_fkey" 
    FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE SET NULL ON UPDATE CASCADE;
