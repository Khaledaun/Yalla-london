-- Duplicate consolidation: when an article is unpublished as a duplicate of a
-- canonical winner, store the winner's slug here so the blog page can issue a
-- permanent 301 redirect to /blog/{canonical_slug}. Preserves accumulated SEO
-- equity instead of returning 404 for the duplicate URL.

ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "canonical_slug" TEXT;
CREATE INDEX IF NOT EXISTS "BlogPost_canonical_slug_idx" ON "BlogPost"("canonical_slug");
