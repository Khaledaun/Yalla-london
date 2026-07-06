-- Content Pipeline Tables
-- These tables are required for the content generation pipeline to function.
-- article_drafts: 8-phase content generation pipeline (research → publish)
-- feature_flags: Dashboard-togglable feature flags
-- model_providers: AI provider configuration (Grok, Claude, OpenAI, Gemini)

-- ArticleDraft — the core content pipeline table
CREATE TABLE IF NOT EXISTS "article_drafts" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "topic_title" TEXT,

    -- Pipeline phase tracking
    "current_phase" TEXT NOT NULL DEFAULT 'research',
    "phase_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "sections_completed" INTEGER NOT NULL DEFAULT 0,
    "sections_total" INTEGER NOT NULL DEFAULT 0,

    -- Phase outputs (populated incrementally as phases complete)
    "research_data" JSONB,
    "outline_data" JSONB,
    "sections_data" JSONB,
    "assembled_html" TEXT,
    "assembled_html_alt" TEXT,
    "seo_meta" JSONB,
    "images_data" JSONB,

    -- Quality scoring
    "quality_score" DOUBLE PRECISION,
    "seo_score" DOUBLE PRECISION,
    "word_count" INTEGER,
    "readability_score" DOUBLE PRECISION,
    "content_depth_score" DOUBLE PRECISION,

    -- Source tracking
    "topic_proposal_id" TEXT,
    "ai_model_used" TEXT,
    "generation_strategy" TEXT,

    -- Bilingual pairing
    "paired_draft_id" TEXT,

    -- Publishing
    "blog_post_id" TEXT,
    "published_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "needs_review" BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "phase_started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "article_drafts_pkey" PRIMARY KEY ("id")
);

-- Indexes for article_drafts
CREATE INDEX IF NOT EXISTS "article_drafts_current_phase_site_id_idx" ON "article_drafts"("current_phase", "site_id");
CREATE INDEX IF NOT EXISTS "article_drafts_current_phase_created_at_idx" ON "article_drafts"("current_phase", "created_at");
CREATE INDEX IF NOT EXISTS "article_drafts_quality_score_idx" ON "article_drafts"("quality_score");
CREATE INDEX IF NOT EXISTS "article_drafts_site_id_current_phase_idx" ON "article_drafts"("site_id", "current_phase");
CREATE INDEX IF NOT EXISTS "article_drafts_created_at_idx" ON "article_drafts"("created_at");
CREATE INDEX IF NOT EXISTS "article_drafts_paired_draft_id_idx" ON "article_drafts"("paired_draft_id");

-- FeatureFlag — dashboard-togglable feature flags
CREATE TABLE IF NOT EXISTS "feature_flags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "feature_flags_name_key" ON "feature_flags"("name");

-- ModelProvider — AI provider configuration
CREATE TABLE IF NOT EXISTS "ModelProvider" (
    "id" TEXT NOT NULL,
    "site_id" TEXT,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "provider_type" TEXT NOT NULL,
    "api_endpoint" TEXT,
    "api_key_encrypted" TEXT,
    "api_version" TEXT,
    "rate_limits_json" JSONB,
    "cost_per_token" DOUBLE PRECISION,
    "capabilities" TEXT[],
    "model_config_json" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_tested_at" TIMESTAMP(3),
    "test_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelProvider_pkey" PRIMARY KEY ("id")
);

-- Seed default feature flags for the content pipeline
INSERT INTO "feature_flags" ("id", "name", "description", "enabled", "created_at", "updated_at")
VALUES
    ('flag_content_pipeline', 'FEATURE_CONTENT_PIPELINE', 'Master toggle for content generation pipeline', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('flag_auto_publishing', 'FEATURE_AUTO_PUBLISHING', 'Automatic daily content publishing', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('flag_topics_research', 'FEATURE_TOPICS_RESEARCH', 'AI-powered topic research and suggestions', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('flag_ai_seo_audit', 'FEATURE_AI_SEO_AUDIT', 'AI-powered SEO audit functionality', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('flag_seo', 'FEATURE_SEO', 'SEO optimization tools and monitoring', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
