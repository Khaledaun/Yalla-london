-- CreateTable: URL indexing status tracking
CREATE TABLE IF NOT EXISTS "url_indexing_status" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "slug" TEXT,
    "status" TEXT NOT NULL DEFAULT 'discovered',
    "coverage_state" TEXT,
    "indexing_state" TEXT,
    "submitted_indexnow" BOOLEAN NOT NULL DEFAULT false,
    "submitted_google_api" BOOLEAN NOT NULL DEFAULT false,
    "submitted_sitemap" BOOLEAN NOT NULL DEFAULT false,
    "last_submitted_at" TIMESTAMP(3),
    "last_inspected_at" TIMESTAMP(3),
    "last_crawled_at" TIMESTAMP(3),
    "inspection_result" JSONB,
    "submission_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "url_indexing_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Cron job execution logs
CREATE TABLE IF NOT EXISTS "cron_job_logs" (
    "id" TEXT NOT NULL,
    "site_id" TEXT,
    "job_name" TEXT NOT NULL,
    "job_type" TEXT NOT NULL DEFAULT 'scheduled',
    "status" TEXT NOT NULL DEFAULT 'running',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "result_summary" JSONB,
    "items_processed" INTEGER NOT NULL DEFAULT 0,
    "items_succeeded" INTEGER NOT NULL DEFAULT 0,
    "items_failed" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "error_stack" TEXT,
    "sites_processed" TEXT[],
    "sites_skipped" TEXT[],
    "timed_out" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cron_job_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Site health check snapshots
CREATE TABLE IF NOT EXISTS "site_health_checks" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "health_score" INTEGER,
    "indexed_pages" INTEGER,
    "total_pages" INTEGER,
    "indexing_rate" DOUBLE PRECISION,
    "gsc_clicks" INTEGER,
    "gsc_impressions" INTEGER,
    "gsc_ctr" DOUBLE PRECISION,
    "gsc_avg_position" DOUBLE PRECISION,
    "ga4_sessions" INTEGER,
    "ga4_bounce_rate" DOUBLE PRECISION,
    "ga4_engagement_rate" DOUBLE PRECISION,
    "ga4_organic_share" DOUBLE PRECISION,
    "total_posts" INTEGER,
    "posts_published" INTEGER,
    "posts_pending" INTEGER,
    "avg_seo_score" DOUBLE PRECISION,
    "last_agent_run" TIMESTAMP(3),
    "last_content_gen" TIMESTAMP(3),
    "pending_proposals" INTEGER,
    "rewrite_queue" INTEGER,
    "pagespeed_mobile" INTEGER,
    "pagespeed_desktop" INTEGER,
    "snapshot_data" JSONB,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "url_indexing_status_site_id_url_key" ON "url_indexing_status"("site_id", "url");
CREATE INDEX IF NOT EXISTS "url_indexing_status_site_id_status_idx" ON "url_indexing_status"("site_id", "status");
CREATE INDEX IF NOT EXISTS "url_indexing_status_site_id_slug_idx" ON "url_indexing_status"("site_id", "slug");
CREATE INDEX IF NOT EXISTS "url_indexing_status_status_idx" ON "url_indexing_status"("status");
CREATE INDEX IF NOT EXISTS "url_indexing_status_last_submitted_at_idx" ON "url_indexing_status"("last_submitted_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cron_job_logs_job_name_started_at_idx" ON "cron_job_logs"("job_name", "started_at");
CREATE INDEX IF NOT EXISTS "cron_job_logs_site_id_job_name_idx" ON "cron_job_logs"("site_id", "job_name");
CREATE INDEX IF NOT EXISTS "cron_job_logs_status_idx" ON "cron_job_logs"("status");
CREATE INDEX IF NOT EXISTS "cron_job_logs_started_at_idx" ON "cron_job_logs"("started_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "site_health_checks_site_id_checked_at_idx" ON "site_health_checks"("site_id", "checked_at");
CREATE INDEX IF NOT EXISTS "site_health_checks_site_id_idx" ON "site_health_checks"("site_id");
CREATE INDEX IF NOT EXISTS "site_health_checks_checked_at_idx" ON "site_health_checks"("checked_at");
