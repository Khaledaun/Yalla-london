-- RLS Batch A — enable Row Level Security on 6 advisor-flagged tables.
--
-- Convention: RLS is enabled with NO policies. The Supabase service_role
-- bypasses RLS by default, so the Prisma client (which uses DATABASE_URL
-- with service-role credentials) keeps working unchanged. The
-- anon/authenticated roles get blocked from these tables — they were
-- never read directly from the browser anyway (verified via codebase
-- audit: no `supabase.from('<table>')` calls reach these).
--
-- Highest priority is `google_drive_accounts` — currently leaks OAuth
-- access/refresh tokens. The other five are cron/agent infrastructure
-- with no expected impact.
--
-- Idempotent: ENABLE ROW LEVEL SECURITY is safe to re-run.

ALTER TABLE "google_drive_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "daily_briefings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chrome_audit_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "unsplash_cache" ENABLE ROW LEVEL SECURITY;
