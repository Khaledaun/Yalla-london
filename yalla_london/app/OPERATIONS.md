# Yalla Platform — Operations & Health Monitoring Reference

> Last updated: 2026-02-12

---

## Recent Development Summary (Feb 2026)

### Google Search Console (GSC) Integration — Fixed
- **Problem**: GSC API was returning 403 Forbidden with `sc-domain:` property format
- **Root cause**: The service account was not added as an **owner** on the GSC property
- **Fix**: Added the service account email as a verified owner in GSC settings
- **Verification**: Analytics sync now returns live GSC data (42 queries, real click/impression data)
- **Key file**: `app/api/cron/analytics/route.ts`

### Google Analytics 4 (GA4) Integration — Working
- GA4 Data API enabled and returning data (253 sessions, 240 users, 18,634 pageviews)
- Measurement ID: `G-H7YNG7CH88` confirmed on homepage
- **Key file**: `app/api/cron/analytics/route.ts`

### Healthcheck 503s — Fixed
- **Problem**: 3 cron healthcheck endpoints returned HTTP 503 "unhealthy" even though the services were fine
- **Root cause**: Healthchecks queried `cron_job_logs` table which didn't exist (no migration)
- **Fix**:
  1. Made healthchecks resilient: try cron log query first, fall back to `SELECT 1`
  2. Created migration `20260212000000_add_operational_tables` for missing tables
  3. Fixed `seo/cron` route that used nonexistent `prisma.cronLog` instead of `prisma.cronJobLog`
- **Files changed**:
  - `app/api/cron/daily-content-generate/route.ts`
  - `app/api/cron/seo-agent/route.ts`
  - `app/api/seo/cron/route.ts`
  - `prisma/migrations/20260212000000_add_operational_tables/migration.sql`

### Missing Database Tables — Migration Created
- Tables added: `cron_job_logs`, `site_health_checks`, `url_indexing_status`
- These tables support cron execution tracking, site health snapshots, and URL indexing state
- Migration uses `CREATE TABLE IF NOT EXISTS` for safe re-runs

---

## Health Monitoring Architecture

### Endpoints

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /api/health` | Public | Basic health check (DB, memory, env) |
| `GET /api/admin/health-monitor` | Admin | Full dashboard data (DB, sites, crons, errors) |
| `GET /api/admin/health-monitor/alerts` | Admin | Alert history with severity classification |
| `POST /api/admin/health-monitor/alerts` | Admin | Trigger manual health check + email alert |
| `GET /api/cron/*/&healthcheck=true` | Cron | Per-endpoint health verification |

### Dashboard
- **URL**: `/admin/health-monitoring`
- Auto-refreshes every 30 seconds
- Shows: DB connection, site health cards, cron job status, recent errors, alert summary
- Manual "Run Alert Check" button triggers POST to alerts API + sends email

### Monitored Cron Jobs

| Job Name | Schedule | What It Does |
|---|---|---|
| `daily-content-generate` | Daily 5am UTC | Generates 2 articles/site (EN+AR) |
| `scheduled-publish` | Every 15min | Publishes scheduled content |
| `weekly-topics` | Weekly | Researches new topic proposals |
| `trends-monitor` | Daily | Monitors keyword trends |
| `analytics` | Daily | Syncs GA4 + GSC data |
| `seo-agent` | Daily | Runs SEO audits + IndexNow |
| `seo-health-report` | Weekly | Generates SEO health reports |
| `site-health-check` | Hourly | Collects health metrics per site |
| `daily-publish` | Daily | Alias for scheduled publish |

### Alert Severity Classification

| Severity | Criteria |
|---|---|
| **Critical** | DB connection errors, timeouts, all items in a job failed |
| **Warning** | Partial failures (some items failed), slow responses |
| **Info** | Standard notifications, successful completions |

---

## Troubleshooting Runbook

### Cron Job: `daily-content-generate` fails
1. Check AI provider API keys in Vercel env vars (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`)
2. Verify at least one AI provider is configured in Settings > API Keys
3. Check if topics exist: Admin > Content > Topics Pipeline
4. Check Vercel function logs for timeout (120s limit)
5. **Action**: Re-trigger via `POST /api/cron/daily-content-generate` with `Authorization: Bearer $CRON_SECRET`

### Cron Job: `seo-agent` fails
1. Verify GSC service account is property owner (not just user)
2. Check `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` env vars
3. Verify IndexNow key at `/indexnow-key.txt` returns 200
4. Check Vercel function logs for specific error
5. **Action**: Re-trigger via `POST /api/cron/seo-agent` with cron auth header

### Cron Job: `analytics` fails
1. GA4: Check `GA4_PROPERTY_ID` env var (format: `properties/XXXXXXXXX`)
2. GSC: Verify service account is owner on Search Console property
3. Check `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` are set
4. **Action**: Test via admin dashboard Analytics section

### Database connection fails
1. Check `DATABASE_URL` in Vercel env vars
2. Verify Supabase project is running and not paused
3. Check connection pooler settings (should use port 6543 for pooled connections)
4. Check if IP allowlist is configured in Supabase

### Site returns non-200
1. Check Vercel deployment status
2. Verify domain DNS is pointing to Vercel
3. Check if site is configured in `config/sites.ts`
4. Check Vercel function logs for build/runtime errors

---

## Environment Variables Required

### Core
- `DATABASE_URL` — Supabase pooled connection string
- `DIRECT_URL` — Supabase direct connection string (for migrations)
- `NEXTAUTH_SECRET` — NextAuth session encryption
- `NEXTAUTH_URL` — Base URL for auth callbacks
- `CRON_SECRET` — Bearer token for cron job authentication

### Google Services
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` — GCP service account email
- `GOOGLE_PRIVATE_KEY` — GCP service account private key (PEM format)
- `GA4_PROPERTY_ID` — GA4 property ID (`properties/XXXXXXXXX`)
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` — GA4 measurement ID (`G-XXXXXXXXXX`)

### AI Providers (at least one required)
- `ANTHROPIC_API_KEY` — Claude API key
- `OPENAI_API_KEY` — OpenAI API key
- `GEMINI_API_KEY` — Google Gemini API key

### Notifications
- `ADMIN_EMAILS` — Comma-separated admin email addresses for alerts
- `RESEND_API_KEY` — Resend.com API key for sending alert emails

---

## Database Tables for Monitoring

### `cron_job_logs`
Tracks every cron job execution. Fields: `job_name`, `status`, `started_at`, `completed_at`,
`duration_ms`, `error_message`, `items_processed`, `items_failed`, `sites_processed`, `timed_out`.

### `site_health_checks`
Periodic snapshots of site health. Fields: `site_id`, `health_score` (0-100), SEO metrics,
GSC metrics, GA4 metrics, content metrics, automation metrics, PageSpeed scores.

### `url_indexing_status`
Tracks indexing state per URL. Fields: `site_id`, `url`, `status` (discovered/submitted/indexed/error),
`submitted_indexnow`, `submitted_google_api`, `last_inspected_at`, `inspection_result`.

---

## Health Score Calculation

Site health score (0-100) is calculated from weighted components:
- Content volume and publishing rate
- SEO audit scores
- GSC performance (clicks, impressions, CTR)
- GA4 engagement metrics
- Indexing rate
- Topic pipeline health
- PageSpeed scores (if available)

**Thresholds**: >= 70 = Healthy, 40-69 = Degraded, < 40 = Down
