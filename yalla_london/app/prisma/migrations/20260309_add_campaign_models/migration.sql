-- Campaign Agent Models
-- CreateTable: campaigns
CREATE TABLE IF NOT EXISTS "campaigns" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "config" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "completedItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "skippedItems" INTEGER NOT NULL DEFAULT 0,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "lastError" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "maxItemsPerRun" INTEGER NOT NULL DEFAULT 3,
    "maxAiCostUsd" DOUBLE PRECISION,
    "currentCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable: campaign_items
CREATE TABLE IF NOT EXISTS "campaign_items" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "blogPostId" TEXT,
    "articleDraftId" TEXT,
    "targetUrl" TEXT,
    "targetTitle" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "beforeSnapshot" JSONB,
    "afterSnapshot" JSONB,
    "operationsApplied" JSONB,
    "changes" JSONB,
    "error" TEXT,
    "aiCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "campaigns_siteId_status_idx" ON "campaigns"("siteId", "status");
CREATE INDEX IF NOT EXISTS "campaigns_status_priority_idx" ON "campaigns"("status", "priority");
CREATE INDEX IF NOT EXISTS "campaigns_createdAt_idx" ON "campaigns"("createdAt");
CREATE INDEX IF NOT EXISTS "campaign_items_campaignId_status_idx" ON "campaign_items"("campaignId", "status");
CREATE INDEX IF NOT EXISTS "campaign_items_blogPostId_idx" ON "campaign_items"("blogPostId");
CREATE INDEX IF NOT EXISTS "campaign_items_status_idx" ON "campaign_items"("status");

-- AddForeignKey
ALTER TABLE "campaign_items" ADD CONSTRAINT "campaign_items_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
