-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN     "authority_links_json" JSONB,
ADD COLUMN     "featured_longtails_json" JSONB,
ADD COLUMN     "keywords_json" JSONB,
ADD COLUMN     "og_image_id" TEXT,
ADD COLUMN     "page_type" TEXT,
ADD COLUMN     "place_id" TEXT,
ADD COLUMN     "questions_json" JSONB,
ADD COLUMN     "seo_score" INTEGER;

-- AlterTable
ALTER TABLE "ScheduledContent" ADD COLUMN     "authority_links_used" JSONB,
ADD COLUMN     "generation_source" TEXT,
ADD COLUMN     "longtails_used" JSONB,
ADD COLUMN     "page_type" TEXT,
ADD COLUMN     "seo_score" INTEGER,
ADD COLUMN     "topic_proposal_id" TEXT;

-- CreateTable
CREATE TABLE "TopicProposal" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "primary_keyword" TEXT NOT NULL,
    "longtails" TEXT[],
    "featured_longtails" TEXT[],
    "questions" TEXT[],
    "authority_links_json" JSONB NOT NULL,
    "intent" TEXT NOT NULL,
    "suggested_page_type" TEXT NOT NULL,
    "suggested_window_start" TIMESTAMP(3),
    "suggested_window_end" TIMESTAMP(3),
    "source_weights_json" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "confidence_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopicProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RulebookVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "changelog" TEXT NOT NULL,
    "weights_json" JSONB NOT NULL,
    "schema_requirements_json" JSONB NOT NULL,
    "prompts_json" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RulebookVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageTypeRecipe" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required_blocks" TEXT[],
    "optional_blocks" TEXT[],
    "schema_plan_json" JSONB NOT NULL,
    "min_word_count" INTEGER NOT NULL DEFAULT 800,
    "template_prompts_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageTypeRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageAsset" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "cloud_storage_path" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "attribution" TEXT,
    "tags" TEXT[],
    "place_id" TEXT,
    "alt_text" TEXT,
    "title" TEXT,
    "responsive_variants_json" JSONB,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "seo_keywords" TEXT[],
    "auto_assigned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoAsset" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "cloud_storage_path" TEXT NOT NULL,
    "duration_sec" INTEGER,
    "poster_url" TEXT,
    "attribution" TEXT,
    "tags" TEXT[],
    "place_id" TEXT,
    "title" TEXT,
    "description" TEXT,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "auto_assigned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "address" TEXT,
    "official_url" TEXT,
    "short_desc" TEXT,
    "tags" TEXT[],
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "site_id" TEXT,
    "date_range" TEXT NOT NULL,
    "data_json" JSONB NOT NULL,
    "indexed_pages" INTEGER NOT NULL DEFAULT 0,
    "top_queries" JSONB NOT NULL,
    "performance_metrics" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoAuditResult" (
    "id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "breakdown_json" JSONB NOT NULL,
    "suggestions" JSONB NOT NULL,
    "quick_fixes" JSONB NOT NULL,
    "internal_link_offers" JSONB,
    "authority_links_used" JSONB,
    "longtails_coverage" JSONB,
    "audit_version" TEXT NOT NULL DEFAULT '1.0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoAuditResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "theme_id" TEXT,
    "settings_json" JSONB NOT NULL,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteTheme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokens_json" JSONB NOT NULL,
    "preview_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteTheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteMember" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "SiteMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlogPost_page_type_idx" ON "BlogPost"("page_type");

-- CreateIndex
CREATE INDEX "BlogPost_place_id_idx" ON "BlogPost"("place_id");

-- CreateIndex
CREATE INDEX "BlogPost_seo_score_idx" ON "BlogPost"("seo_score");

-- CreateIndex
CREATE INDEX "ScheduledContent_page_type_idx" ON "ScheduledContent"("page_type");

-- CreateIndex
CREATE INDEX "ScheduledContent_topic_proposal_id_idx" ON "ScheduledContent"("topic_proposal_id");

-- CreateIndex
CREATE INDEX "ScheduledContent_seo_score_idx" ON "ScheduledContent"("seo_score");

-- CreateIndex
CREATE INDEX "ScheduledContent_generation_source_idx" ON "ScheduledContent"("generation_source");

-- CreateIndex
CREATE INDEX "TopicProposal_locale_status_idx" ON "TopicProposal"("locale", "status");

-- CreateIndex
CREATE INDEX "TopicProposal_suggested_window_start_suggested_window_end_idx" ON "TopicProposal"("suggested_window_start", "suggested_window_end");

-- CreateIndex
CREATE INDEX "TopicProposal_status_confidence_score_idx" ON "TopicProposal"("status", "confidence_score");

-- CreateIndex
CREATE UNIQUE INDEX "RulebookVersion_version_key" ON "RulebookVersion"("version");

-- CreateIndex
CREATE INDEX "RulebookVersion_is_active_idx" ON "RulebookVersion"("is_active");

-- CreateIndex
CREATE INDEX "RulebookVersion_created_at_idx" ON "RulebookVersion"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "PageTypeRecipe_type_key" ON "PageTypeRecipe"("type");

-- CreateIndex
CREATE INDEX "ImageAsset_place_id_idx" ON "ImageAsset"("place_id");

-- CreateIndex
CREATE INDEX "ImageAsset_tags_idx" ON "ImageAsset"("tags");

-- CreateIndex
CREATE INDEX "ImageAsset_auto_assigned_idx" ON "ImageAsset"("auto_assigned");

-- CreateIndex
CREATE INDEX "VideoAsset_place_id_idx" ON "VideoAsset"("place_id");

-- CreateIndex
CREATE INDEX "VideoAsset_tags_idx" ON "VideoAsset"("tags");

-- CreateIndex
CREATE INDEX "VideoAsset_auto_assigned_idx" ON "VideoAsset"("auto_assigned");

-- CreateIndex
CREATE UNIQUE INDEX "Place_slug_key" ON "Place"("slug");

-- CreateIndex
CREATE INDEX "Place_category_idx" ON "Place"("category");

-- CreateIndex
CREATE INDEX "Place_tags_idx" ON "Place"("tags");

-- CreateIndex
CREATE INDEX "Place_slug_idx" ON "Place"("slug");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_date_range_idx" ON "AnalyticsSnapshot"("date_range");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_created_at_idx" ON "AnalyticsSnapshot"("created_at");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_indexed_pages_idx" ON "AnalyticsSnapshot"("indexed_pages");

-- CreateIndex
CREATE INDEX "SeoAuditResult_content_id_content_type_idx" ON "SeoAuditResult"("content_id", "content_type");

-- CreateIndex
CREATE INDEX "SeoAuditResult_score_idx" ON "SeoAuditResult"("score");

-- CreateIndex
CREATE INDEX "SeoAuditResult_created_at_idx" ON "SeoAuditResult"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "Site_slug_key" ON "Site"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Site_domain_key" ON "Site"("domain");

-- CreateIndex
CREATE INDEX "Site_is_active_idx" ON "Site"("is_active");

-- CreateIndex
CREATE INDEX "Site_slug_idx" ON "Site"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SiteMember_site_id_user_id_key" ON "SiteMember"("site_id", "user_id");

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledContent" ADD CONSTRAINT "ScheduledContent_topic_proposal_id_fkey" FOREIGN KEY ("topic_proposal_id") REFERENCES "TopicProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageAsset" ADD CONSTRAINT "ImageAsset_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAsset" ADD CONSTRAINT "VideoAsset_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "SiteTheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteMember" ADD CONSTRAINT "SiteMember_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;