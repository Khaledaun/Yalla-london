-- Performance indexes to reduce Supabase CPU from 80%+
-- Root cause: full table scans on ArticleDraft (790+ rows), CronJobLog (growing daily),
-- and URLIndexingStatus (200+ rows) due to missing compound indexes on hot query patterns.

-- ArticleDraft: build-runner queries every 15 min with site_id + current_phase + updated_at
CREATE INDEX IF NOT EXISTS "article_drafts_site_id_current_phase_updated_at_idx"
  ON "article_drafts" ("site_id", "current_phase", "updated_at");

-- ArticleDraft: diagnostic-agent recovery checks with site_id + current_phase + phase_attempts
CREATE INDEX IF NOT EXISTS "article_drafts_site_id_current_phase_phase_attempts_idx"
  ON "article_drafts" ("site_id", "current_phase", "phase_attempts");

-- CronJobLog: CEO Inbox + cycle-health check last run status per job
CREATE INDEX IF NOT EXISTS "cron_job_logs_job_name_status_started_at_idx"
  ON "cron_job_logs" ("job_name", "status", "started_at" DESC);

-- CronJobLog: aggregated-report counts failed runs in last 24h
CREATE INDEX IF NOT EXISTS "cron_job_logs_status_started_at_idx"
  ON "cron_job_logs" ("status", "started_at" DESC);

-- URLIndexingStatus: stale submission detection (site_id + status + last_submitted_at)
CREATE INDEX IF NOT EXISTS "url_indexing_status_site_id_status_last_submitted_at_idx"
  ON "url_indexing_status" ("site_id", "status", "last_submitted_at" DESC);

-- URLIndexingStatus: process-indexing-queue finds unsubmitted pages
CREATE INDEX IF NOT EXISTS "url_indexing_status_site_id_submitted_indexnow_idx"
  ON "url_indexing_status" ("site_id", "submitted_indexnow");
