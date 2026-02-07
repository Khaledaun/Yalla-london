-- Security Audit Fix Migration
-- Adds passwordHash, soft delete, and indexes identified in audit

-- Add passwordHash to User model for bcrypt-based authentication
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;

-- Add soft delete to User model
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Add multi-tenant and soft delete to BlogPost
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "siteId" TEXT;
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Add soft delete to MediaAsset
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Add performance indexes for BlogPost
CREATE INDEX IF NOT EXISTS "BlogPost_siteId_idx" ON "BlogPost"("siteId");
CREATE INDEX IF NOT EXISTS "BlogPost_published_idx" ON "BlogPost"("published");
CREATE INDEX IF NOT EXISTS "BlogPost_category_id_idx" ON "BlogPost"("category_id");
CREATE INDEX IF NOT EXISTS "BlogPost_author_id_idx" ON "BlogPost"("author_id");
CREATE INDEX IF NOT EXISTS "BlogPost_created_at_idx" ON "BlogPost"("created_at");

-- Add performance indexes for MediaAsset
CREATE INDEX IF NOT EXISTS "MediaAsset_file_type_idx" ON "MediaAsset"("file_type");
CREATE INDEX IF NOT EXISTS "MediaAsset_created_at_idx" ON "MediaAsset"("created_at");
