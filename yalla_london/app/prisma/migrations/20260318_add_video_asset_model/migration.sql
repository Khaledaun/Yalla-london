-- Video Asset Registry — centralized catalog for all video clips
CREATE TABLE IF NOT EXISTS "video_assets" (
    "id" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "siteId" TEXT,
    "source" TEXT NOT NULL,
    "canvaDesignId" TEXT,
    "canvaPageIndex" INTEGER,
    "collectionName" TEXT,
    "originalUrl" TEXT,
    "thumbnailUrl" TEXT,
    "exportedUrl" TEXT,
    "width" INTEGER NOT NULL DEFAULT 1080,
    "height" INTEGER NOT NULL DEFAULT 1920,
    "format" TEXT NOT NULL DEFAULT 'vertical',
    "durationSeconds" INTEGER,
    "locationTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sceneTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "moodTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contentFormat" TEXT NOT NULL DEFAULT 'raw-footage',
    "seasonTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "textOverlay" TEXT,
    "matchedArticles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'untagged',
    "authenticity" TEXT NOT NULL DEFAULT 'stock',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_assets_pkey" PRIMARY KEY ("id")
);

-- Unique asset code
CREATE UNIQUE INDEX IF NOT EXISTS "video_assets_assetCode_key" ON "video_assets"("assetCode");

-- Performance indexes
CREATE INDEX IF NOT EXISTS "video_assets_siteId_idx" ON "video_assets"("siteId");
CREATE INDEX IF NOT EXISTS "video_assets_status_idx" ON "video_assets"("status");
CREATE INDEX IF NOT EXISTS "video_assets_source_idx" ON "video_assets"("source");
CREATE INDEX IF NOT EXISTS "video_assets_collectionName_idx" ON "video_assets"("collectionName");
CREATE INDEX IF NOT EXISTS "video_assets_locationTags_idx" ON "video_assets" USING GIN ("locationTags");
CREATE INDEX IF NOT EXISTS "video_assets_sceneTags_idx" ON "video_assets" USING GIN ("sceneTags");
CREATE INDEX IF NOT EXISTS "video_assets_authenticity_idx" ON "video_assets"("authenticity");
