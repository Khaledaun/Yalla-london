-- Claude Chrome Bridge — ChromeAuditReport model
-- Migration: 20260420_add_chrome_audit_report
-- Creates: chrome_audit_reports table for per-page audit uploads

CREATE TABLE IF NOT EXISTS "chrome_audit_reports" (
  "id"                  TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "siteId"              TEXT NOT NULL,
  "pageUrl"             TEXT NOT NULL,
  "pageSlug"            TEXT,
  "auditType"           TEXT NOT NULL,
  "severity"            TEXT NOT NULL DEFAULT 'info',
  "status"              TEXT NOT NULL DEFAULT 'new',
  "findings"            JSONB NOT NULL,
  "interpretedActions"  JSONB NOT NULL,
  "rawData"             JSONB,
  "reportMarkdown"      TEXT,
  "reportPath"          TEXT,
  "agentTaskId"         TEXT,
  "uploadedBy"          TEXT NOT NULL DEFAULT 'chrome-bridge',
  "uploadedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt"          TIMESTAMP(3),
  "fixedAt"             TIMESTAMP(3),

  CONSTRAINT "chrome_audit_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "chrome_audit_reports_siteId_auditType_idx"
  ON "chrome_audit_reports"("siteId", "auditType");
CREATE INDEX IF NOT EXISTS "chrome_audit_reports_siteId_status_idx"
  ON "chrome_audit_reports"("siteId", "status");
CREATE INDEX IF NOT EXISTS "chrome_audit_reports_uploadedAt_idx"
  ON "chrome_audit_reports"("uploadedAt");
CREATE INDEX IF NOT EXISTS "chrome_audit_reports_pageSlug_idx"
  ON "chrome_audit_reports"("pageSlug");
