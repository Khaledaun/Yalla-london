-- DailyBriefing — Stored daily CEO briefing reports
-- Spec: docs/briefing/CEO-DAILY-BRIEFING.md

CREATE TABLE IF NOT EXISTS "daily_briefings" (
  "id"              TEXT PRIMARY KEY,
  "siteId"          TEXT,
  "briefingDate"    DATE NOT NULL,
  "data"            JSONB NOT NULL,
  "renderedHtml"    TEXT,
  "emailSent"       BOOLEAN NOT NULL DEFAULT false,
  "emailMessageId"  TEXT,
  "emailError"      TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint so re-running the briefing on the same day overwrites
-- the existing row instead of duplicating. NULL siteId is treated as a
-- distinct value for the aggregate brief.
CREATE UNIQUE INDEX IF NOT EXISTS "daily_briefings_siteId_briefingDate_key"
  ON "daily_briefings" ("siteId", "briefingDate");

CREATE INDEX IF NOT EXISTS "daily_briefings_briefingDate_idx"
  ON "daily_briefings" ("briefingDate");

CREATE INDEX IF NOT EXISTS "daily_briefings_siteId_briefingDate_idx"
  ON "daily_briefings" ("siteId", "briefingDate");
