-- Hardening Sprint: Add trace_id, source_pipeline, enhancement_log fields
-- Fixes 2, 5, and 7 of the 7-fix hardening sprint

-- BlogPost: source_pipeline for tracking which pipeline created the article
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "source_pipeline" TEXT;

-- BlogPost: trace_id for full lifecycle tracing (links to ArticleDraft.trace_id)
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "trace_id" TEXT;

-- BlogPost: enhancement_log for post-publish modification tracking
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "enhancement_log" JSONB;

-- ArticleDraft: trace_id for lifecycle tracing
ALTER TABLE "article_drafts" ADD COLUMN IF NOT EXISTS "trace_id" TEXT;

-- Backfill trace_id for existing ArticleDrafts that don't have one
-- Using the existing id as a seed for the trace_id
UPDATE "article_drafts" SET "trace_id" = id WHERE "trace_id" IS NULL;

-- Backfill BlogPost trace_id from ArticleDraft where a link exists
UPDATE "BlogPost" bp
SET "trace_id" = ad."trace_id"
FROM "article_drafts" ad
WHERE ad."blog_post_id" = bp.id
  AND bp."trace_id" IS NULL
  AND ad."trace_id" IS NOT NULL;

-- Backfill source_pipeline for existing BlogPosts
UPDATE "BlogPost" SET "source_pipeline" = '8-phase' WHERE "source_pipeline" IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS "BlogPost_trace_id_idx" ON "BlogPost"("trace_id");
CREATE INDEX IF NOT EXISTS "article_drafts_trace_id_idx" ON "article_drafts"("trace_id");
