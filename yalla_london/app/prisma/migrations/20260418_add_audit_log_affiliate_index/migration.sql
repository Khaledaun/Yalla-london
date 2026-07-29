-- Affiliate click visibility fix: dashboard now unifies CjClickEvent (CJ links)
-- with AuditLog action=AFFILIATE_CLICK_DIRECT (Travelpayouts/Stay22/Vrbo-fallback
-- clicks that have no CjLink record).
--
-- Without this partial index, the JSONB path filter on details->>'siteId' forces
-- a sequential scan on the full audit_log table. audit_log grows ~100-500 rows/day
-- from cron failures and other actions; within a month the dashboard count queries
-- would take several seconds per refresh.

CREATE INDEX IF NOT EXISTS "audit_log_affiliate_click_direct_idx"
  ON "audit_log" ((details->>'siteId'), action, timestamp)
  WHERE action = 'AFFILIATE_CLICK_DIRECT';

-- Also index the action + timestamp pair for cross-site queries (cockpit, reports)
CREATE INDEX IF NOT EXISTS "audit_log_affiliate_click_timestamp_idx"
  ON "audit_log" (action, timestamp)
  WHERE action = 'AFFILIATE_CLICK_DIRECT';
