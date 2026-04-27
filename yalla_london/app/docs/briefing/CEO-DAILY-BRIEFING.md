# CEO Daily Briefing System

**Owner:** Khaled
**Sender domain:** Yalla London via Resend
**Status:** Built April 27, 2026

This document is the canonical spec for the CEO daily briefing system. Future
Claude Code sessions read this when the user references "the briefing", "daily
brief", "morning brief", or any of the section names below.

## Schedule (Vercel cron, UTC)

| Time UTC | Time Jerusalem (DST/IDT) | Time Jerusalem (standard/IST) | Job |
|---|---|---|---|
| 04:30 | 07:30 | 06:30 | `audit-roundup` cron — runs all tests, executes auto-fixes |
| 05:00 | 08:00 | 07:00 | `daily-briefing` cron — assembles + emails the briefing |

DST drift: Vercel cron is UTC-only, so during Israeli winter (UTC+2) the
briefing arrives 1 hour earlier in local time. Acceptable trade-off vs.
maintaining two schedules.

## What runs at 04:30 UTC

The existing `audit-roundup` cron (rescheduled from `0 7,19` to `30 4 * * *`
plus an evening run at `30 16`):

1. Pulls the audit-roundup aggregator for every active site
2. Filters findings to fixability=auto + roiScore ≥ 50
3. Executes top 10 highest-ROI fixes
4. Logs each fix to `AutoFixLog` with before/after snapshots
5. Anything not auto-fixed gets classified:
   - **Campaign-eligible** → enqueued to the campaign system (CampaignItem)
   - **Simple but needs schedule** → ScheduledContent entry with target time
   - **Needs CEO approval** → CEO Inbox alert with details

The 30-minute gap before 05:00 UTC ensures fixes complete before briefing
assembly reads their results.

## What runs at 05:00 UTC

New `daily-briefing` cron assembles the briefing from these sources, runs
once per active site (and once aggregated for all sites), and emails the CEO
via Resend.

### Sections in the email (in order)

| # | Section | Source | Format |
|---|---|---|---|
| 1 | **Executive summary** | Aggregated grade across all sites | Plain text |
| 2 | **Tests run** | CronJobLog last 24h, list of audits + outcomes | Table |
| 3 | **Website status (per site)** | publicAudit grade + dimension scores | Table |
| 4 | **GSC update + notifications** | GscPagePerformance last 7d delta vs prior 7d, top movers | Sparkline + table |
| 5 | **GA4 numbers + brief explanation** | GA4 Data API: sessions, users, pageviews, top pages | Bar chart |
| 6 | **System logs deep audit (24h)** | CronJobLog clustered by job_name + status | Severity-coded list |
| 7 | **EN vs AR comparison** | BlogPost + GscPagePerformance grouped by language | Side-by-side bars |
| 8 | **Traffic sources + countries** | GA4 traffic-sources tool | Donut + bar chart |
| 9 | **Affiliate clicks + revenue** | CjClickEvent + CjCommission last 7d / 30d | Sparkline |
| 10 | **Affiliate health** | runLinkHealthAudit summary | Severity-coded list |
| 11 | **Affiliate comparisons** | Per-partner: clicks, conversions, revenue, content type | Comparison table |
| 12 | **Affiliate trends** | 30-day moving averages + week-over-week delta | Sparklines |
| 13 | **Latest affiliate link updates** | CjLink updatedAt last 24h | List |
| 14 | **A/B testing results** | AbTest model with active/recently-completed tests | Confidence + winner |
| 15 | **Technical issues** | failedCrons + cycleHealth + queueMonitor critical/high | Plain language |
| 16 | **Fixes applied (24h)** | AutoFixLog last 24h grouped by fixType | Table |
| 17 | **Validation steps** | Per fix: how to confirm it worked | List |
| 18 | **KPIs and progress** | Comparison vs SiteKpiConfig targets | Bar chart with target line |
| 19 | **Per-site deep dive** | Niche, destination, business landscape, SEO/AIO/GEO algo notes, dedicated improvement plan | Section per active site |

### Charts/visual aids used in email

ASCII block characters (`▁▂▃▄▅▆▇█`) for sparklines and bar charts. Email
clients render Unicode reliably; SVG is unreliable (Outlook desktop strips
it). Tables use HTML in the React Email template.

## CEO-set KPIs

Stored in `SiteSettings` under category `briefing-kpis` per site. CEO updates
via `POST /api/admin/briefing-kpis`. Defaults seeded from CLAUDE.md "Business
KPIs" table:

| KPI | 30-day target | 90-day target |
|---|---|---|
| `indexedPages` | 20 | 50 |
| `organicSessions` | 200 | 1000 |
| `avgCtr` | 0.030 | 0.045 |
| `lcpSeconds` | 2.5 | 2.0 |
| `visitorToLead` | 0.015 | 0.030 |
| `contentVelocityPerDay` | 2 | 3 |
| `revenuePerVisitDelta` | 1.0 | 1.2 |

The CEO can also set `customKpis: Array<{ name, target30d, target90d, unit }>`
per site. The briefing surfaces both default + custom.

## Storage and retrieval

Each briefing run writes to the `DailyBriefing` Prisma model:

| Field | Purpose |
|---|---|
| `id` | cuid |
| `siteId` | null = aggregate, otherwise per-site brief |
| `briefingDate` | Date — unique per (siteId, date) |
| `data` | Json — full structured briefing data, all 19 sections |
| `renderedHtml` | rendered email HTML string |
| `emailSent` | boolean |
| `emailMessageId` | Resend message ID |
| `emailError` | populated when send fails |
| `createdAt` | timestamp |

Retention: keep 90 days. content-auto-fix-lite Section 14 (new) cleans older
records.

## How the CEO interacts with the briefing

After the email arrives, the CEO can ask Claude Code anything about it:

| User says | Claude does |
|---|---|
| "Show me yesterday's briefing" | Calls `briefing_get(date='yesterday')` MCP tool |
| "Why did GSC drop on Tuesday?" | Calls `briefing_get(date='2026-04-21')` then explains the GSC section |
| "What was in the EN vs AR comparison?" | Pulls section 7 from the JSON `data` field |
| "Re-explain the per-site deep dive for Yalla London" | Pulls section 19 |
| "What fixes ran yesterday?" | Pulls section 16 + AutoFixLog |
| "Show raw data behind the affiliate comparison" | Pulls section 11 + CjCommission rows backing it |

## Section taxonomy keywords

These are the canonical keywords. When the CEO says any of them, future
Claude sessions know which section is being referenced:

- "executive summary" → §1
- "tests run", "audit results" → §2
- "site status", "website status" → §3
- "GSC", "search console", "indexing notifications" → §4
- "GA4", "analytics", "sessions", "users" → §5
- "system logs", "cron failures", "log audit" → §6
- "EN vs AR", "Arabic comparison", "language split" → §7
- "traffic sources", "countries", "geo distribution" → §8
- "affiliate clicks", "affiliate revenue" → §9
- "affiliate health", "link health" → §10
- "affiliate comparison", "partner comparison" → §11
- "affiliate trends", "revenue trend" → §12
- "affiliate link updates", "new affiliate links" → §13
- "A/B testing", "AB results" → §14
- "technical issues", "what's broken" → §15
- "fixes applied", "auto-fixes" → §16
- "validation", "verify the fix" → §17
- "KPIs", "progress", "kpi vs target" → §18
- "per-site deep dive", "Yalla London status", "niche analysis", "SEO/AIO/GEO algo updates" → §19

## Files involved

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | DailyBriefing model |
| `lib/briefing/builder.ts` | Assembles all 19 sections from data sources |
| `lib/briefing/kpi.ts` | Reads + writes per-site KPI config |
| `emails/daily-briefing.tsx` | React Email template |
| `app/api/cron/daily-briefing/route.ts` | Cron handler, runs at 05:00 UTC |
| `app/api/admin/briefing-kpis/route.ts` | CEO-facing KPI config endpoint |
| `scripts/mcp-platform-server.ts` | Adds `briefing_get` tool |
| `vercel.json` | Reschedules audit-roundup, adds daily-briefing cron |

## Testing protocol

After merge, in a fresh session:
1. CEO says "test the daily briefing"
2. Claude invokes the cron via `run_cron('/api/cron/daily-briefing')`
3. Briefing runs synchronously, writes to `DailyBriefing` table, attempts email send
4. Claude reports back: section counts, render success, email message ID
5. CEO confirms receipt of email, reports any rendering issues
6. Claude pulls raw section data to verify accuracy

## SEO/AIO/GEO algorithm watch (section 19 substance)

This section is the strategic differentiator vs. a generic ops report.
Each per-site deep dive includes:
- Recent Google algorithm updates affecting this niche (researched + summarized)
- AI Overview citation rate trend (from GSC + zero-click rate proxy)
- Competitor movement (when competitive-research data is available)
- Content gaps based on near-miss queries (position 11-30 in GSC)
- Specific 7-day improvement plan with expected GSC delta

Source for algorithm updates: weekly-policy-monitor cron + `lib/seo/standards.ts`
ALGORITHM_CONTEXT field. Cross-referenced with last 30 days of changes.
