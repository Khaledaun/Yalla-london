-- Unsplash API response cache table
-- 24h TTL caching to stay within demo tier (50 req/hr)
-- Production tier (5,000 req/hr) still benefits from caching to reduce latency

CREATE TABLE IF NOT EXISTS "unsplash_cache" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "cache_key" TEXT NOT NULL,
  "response_data" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expires_at" TIMESTAMPTZ NOT NULL,

  CONSTRAINT "unsplash_cache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "unsplash_cache_cache_key_key" ON "unsplash_cache"("cache_key");
CREATE INDEX IF NOT EXISTS "unsplash_cache_cache_key_idx" ON "unsplash_cache"("cache_key");
CREATE INDEX IF NOT EXISTS "unsplash_cache_expires_at_idx" ON "unsplash_cache"("expires_at");
