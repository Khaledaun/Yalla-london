-- Add SEO Meta Data Table
CREATE TABLE IF NOT EXISTS "seo_meta" (
  "id" SERIAL PRIMARY KEY,
  "page_id" VARCHAR(255) UNIQUE NOT NULL,
  "url" VARCHAR(500) UNIQUE,
  "title" VARCHAR(255),
  "description" TEXT,
  "canonical" VARCHAR(500),
  "meta_keywords" TEXT,
  "og_title" VARCHAR(255),
  "og_description" TEXT,
  "og_image" VARCHAR(500),
  "og_type" VARCHAR(100) DEFAULT 'website',
  "twitter_title" VARCHAR(255),
  "twitter_description" TEXT,
  "twitter_image" VARCHAR(500),
  "twitter_card" VARCHAR(100) DEFAULT 'summary_large_image',
  "robots_meta" VARCHAR(100) DEFAULT 'index,follow',
  "schema_type" VARCHAR(100),
  "hreflang_alternates" JSONB,
  "structured_data" JSONB,
  "seo_score" INTEGER DEFAULT 0,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Add SEO Analytics Table
CREATE TABLE IF NOT EXISTS "seo_analytics" (
  "id" SERIAL PRIMARY KEY,
  "page_id" VARCHAR(255) NOT NULL,
  "date" DATE NOT NULL,
  "organic_traffic" INTEGER DEFAULT 0,
  "keyword_rankings" JSONB,
  "core_web_vitals" JSONB,
  "seo_score" INTEGER DEFAULT 0,
  "issues" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_seo_meta_page_id" ON "seo_meta" ("page_id");
CREATE INDEX IF NOT EXISTS "idx_seo_meta_url" ON "seo_meta" ("url");
CREATE INDEX IF NOT EXISTS "idx_seo_meta_updated_at" ON "seo_meta" ("updated_at");
CREATE INDEX IF NOT EXISTS "idx_seo_analytics_page_id" ON "seo_analytics" ("page_id");
CREATE INDEX IF NOT EXISTS "idx_seo_analytics_date" ON "seo_analytics" ("date");
CREATE INDEX IF NOT EXISTS "idx_seo_analytics_page_date" ON "seo_analytics" ("page_id", "date");

-- Add unique constraint for analytics
CREATE UNIQUE INDEX IF NOT EXISTS "idx_seo_analytics_unique" ON "seo_analytics" ("page_id", "date");

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_seo_meta_updated_at 
    BEFORE UPDATE ON "seo_meta" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();




