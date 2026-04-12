-- Add missing columns to MediaAsset table
-- These fields exist in schema.prisma but were never migrated to the database

ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "site_id" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "folder" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "isVideo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "videoPoster" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "videoVariants" JSONB;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "isHeroVideo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "duration" INTEGER;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS "MediaAsset_site_id_idx" ON "MediaAsset"("site_id");
CREATE INDEX IF NOT EXISTS "MediaAsset_category_idx" ON "MediaAsset"("category");
