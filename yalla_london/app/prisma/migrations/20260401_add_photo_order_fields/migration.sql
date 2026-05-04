-- Photo Order System (April 2026)
-- Adds per-article Unsplash photo request fields to BlogPost

ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "photo_order_query" TEXT;
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "photo_order_status" TEXT;

CREATE INDEX IF NOT EXISTS "BlogPost_photo_order_status_idx" ON "BlogPost"("photo_order_status");
