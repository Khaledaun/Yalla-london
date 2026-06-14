# Full System Audit — February 14, 2026

## Bottom Line Up Front

**The content pipeline generates articles that nobody can see.** The blog page only renders hardcoded static content from JSON files. Database-generated articles (from the entire content-builder/selector pipeline) are invisible to users and Google. This is the #1 reason there's no organic traffic despite working infrastructure.

There are also 4 BlogPost.create() calls across the codebase using wrong field names that will crash on execution, affiliate links that are built but never render in articles, and 7 cron jobs that exist but are never scheduled.

---

## Severity Levels

- **SHOWSTOPPER**: Blocks the revenue path entirely. Fix before anything else.
- **CRITICAL**: Will cause crashes or data loss when triggered.
- **HIGH**: Wastes resources or creates confusion.
- **MEDIUM**: Should fix but doesn't block revenue.

---

## SHOWSTOPPER ISSUES (3)

### S1. Blog page renders ONLY static data — database articles are invisible

**File:** `app/blog/[slug]/page.tsx` (line 211)
```typescript
const post = allStaticPosts.find((p) => p.slug === slug && p.published);
```

The page imports from `data/blog-content.ts` and `data/blog-content-extended.ts` (hardcoded JSON). It never queries the Prisma `BlogPost` table. Every article the content pipeline generates, stores in the database, and marks as published — is invisible to users and Google.

**Impact:** Zero revenue possible from generated content. The entire pipeline output is wasted.

**Fix:** Modify `app/blog/[slug]/page.tsx` to query the database first, fall back to static content.

---

### S2. Affiliate links not rendering in articles

**Infrastructure exists:**
- `AffiliatePartner`, `AffiliateAssignment`, `AffiliateWidget` DB models
- Bulk assignment API with targeting engine (755 lines of rules)
- 7 partner categories (hotel, restaurant, activity, ticket, shopping, transport, insurance)
- Placement strategies (top, bottom, inline, sidebar, cta_button, auto)

**But not wired:**
- `BlogPostClient.tsx` has no affiliate injection code
- Content pipeline creates `<div class="affiliate-placeholder">` in HTML but nothing replaces them
- No automatic affiliate assignment during content-selector promotion
- Click/conversion tracking columns exist but are never written to

**Impact:** Even when articles become visible (after S1 fix), they won't earn revenue.

---

### S3. Quality score threshold mismatch blocks articles

- Content builder scoring phase: articles with score >= 50 move to "reservoir"
- Content selector: only picks articles with `quality_score >= 60`
- **Articles scoring 50-59 are stuck forever** — passed by builder, rejected by selector

**Impact:** Could block a significant percentage of generated articles from ever publishing.

---

## CRITICAL ISSUES (6)

### C1. BlogPost.create() with wrong field names — 3 files will crash

**`lib/content-generation-service.ts:94`**
- Missing: `title_ar`, `content_ar`, `category_id`, `author_id` (all REQUIRED)
- Will throw Prisma validation error

**`lib/scheduler/autopilot.ts:312`**
- Missing: `title_ar`, `content_ar`, `category_id`, `author_id` (all REQUIRED)
- Will throw Prisma validation error

**`app/api/admin/editor/save/route.ts:55`**
- Uses completely wrong field names: `title`, `titleAr`, `locale`, `pageType`, `primaryKeyword`, `longTail1`
- BlogPost schema has: `title_en`, `title_ar`, `slug`, `content_en`, `content_ar`
- Will crash with "Unknown field" error

### C2. TopicProposal.create() in content-strategy.ts uses invalid fields

**`lib/seo/content-strategy.ts:226`**
- Uses fields `source` and `description` that don't exist in schema
- Missing required fields: `authority_links_json`, `source_weights_json`
- Will throw Prisma validation error

### C3. TopicProposal research data lost before ArticleDraft

When content-builder creates an ArticleDraft from a TopicProposal, these fields are never transferred:
- `longtails` (long-tail keywords from research)
- `featured_longtails` (2 selected keywords for emphasis)
- `questions` (PAA questions for content)
- `authority_links_json` (source URLs for citations)

The research phase then re-generates this data from scratch, wasting the original research.

### C4. Three cron routes have no maxDuration set

- `app/api/internal/cron/audit-daily/route.ts`
- `app/api/seo/cron/route.ts`
- `app/api/seo/workflow/cron/route.ts`

Without `export const maxDuration = 60`, these can run indefinitely and consume serverless resources.

### C5. SEO agent tries to write to non-existent BlogPost field

**`app/api/cron/seo-agent/route.ts`** tries to update `authority_links_json` on BlogPost records, but this field, while in the schema, may not match what the agent expects. The query `WHERE authority_links_json = null` will always find posts since the pipeline never populates it.

### C6. Editor save route completely broken

**`app/api/admin/editor/save/route.ts`** — the admin article editor — uses a completely different field schema than what BlogPost actually has. Saving an article from the admin editor will crash. This means Khaled cannot manually create articles through the dashboard either.

---

## HIGH ISSUES (7)

### H1. 7 cron jobs exist but are never scheduled

| Route | Purpose | Should Run |
|-------|---------|-----------|
| `auto-generate` | Legacy content generation | Remove or merge |
| `daily-publish` | Create ScheduledContent records | Daily at publish times |
| `real-time-optimization` | Flag low-scoring articles | Daily |
| `seo-health-report` | Weekly SEO summary | Weekly |
| `site-health-check` | Aggregate site health metrics | Daily |
| `audit-daily` | System audit | Daily |
| `seo/workflow/cron` | SEO workflow tasks | Unknown |

### H2. Duplicate indexing (3-4 overlapping routes)

- `/api/cron/google-indexing` (10 AM daily)
- `/api/seo/cron?task=daily` (7:30 AM daily)
- `/api/seo/cron?task=weekly` (8 AM Sunday)
- `/api/seo/workflow/cron` (unscheduled, overlaps when triggered)

URLs get submitted multiple times. Wastes IndexNow quota.

### H3. SEO audits run 4-5 times per day

- `seo-agent` runs 3x daily (7 AM, 1 PM, 8 PM)
- `seo-orchestrator` runs 2x (6 AM daily, 5 AM Sunday)
- `seo/cron` runs 1-2x (7:30 AM daily, 8 AM Sunday)

Excessive. Most audits find nothing new because no new content is being published.

### H4. Silent catch blocks hide failures in 9+ routes

Files with `catch(() => {})` or `catch { }` that swallow errors:
- content-builder, content-selector, daily-content-generate
- fact-verification, london-news, scheduled-publish
- seo-agent, site-health-check, trends-monitor, weekly-topics

Cron jobs report "success" even when critical operations fail silently.

### H5. daily-content-generate bypasses the builder/selector pipeline

`daily-content-generate` creates BlogPosts directly (not through ArticleDraft → reservoir → selector). This means articles from this route skip:
- The 8-phase quality pipeline
- Quality scoring
- Bilingual merging
- The content selector's quality gate

Two parallel content generation paths exist, only one goes through quality control.

### H6. test-connections.html is publicly accessible

No authentication required. Exposes database status, API health, cron job execution. Anyone with the URL can see internal system state and potentially trigger cron jobs with the secret.

### H7. Scheduled-publish reads ScheduledContent but nothing reliably creates those records

`scheduled-publish` runs at 9 AM and 4 PM but depends on `ScheduledContent` records existing. The route that creates these (`daily-publish`) is not scheduled. So `scheduled-publish` runs twice daily and finds nothing to publish.

---

## MEDIUM ISSUES (5)

### M1. Trends monitor only creates English topics (hardcoded `locale: "en"`)

Arabic trending topics are never discovered. Arabaldives site (when activated) would have no trending content.

### M2. Trends monitor duplicate check ignores site_id

`WHERE primary_keyword = keyword` without site_id filter. Could create duplicates when multiple sites are activated.

### M3. Feature flags silently disable cron jobs with 200 response

`FEATURE_AUTO_PUBLISHING`, `FEATURE_TOPIC_RESEARCH` — when false, cron returns success (200). No error logged. Dashboard shows green. But nothing happened.

### M4. URLIndexingStatus and SiteHealthCheck are dead-end tables

Data is written but never triggers actions. No feedback loop from monitoring to remediation.

### M5. Quality gates from CLAUDE.md not enforced in code

SEO score >= 70, content length >= 1,200 words, internal links >= 3 — all defined as blocking gates but none are checked in the publishing flow.

---

## DASHBOARD GAPS (for iPhone-first ADHD owner)

### Missing Critical Features:
1. No "Publish All Ready Articles" button (must click each one)
2. No "Run All Cron Jobs Now" button (must trigger individually)
3. No visual pipeline flow diagram (Kanban view of topics → drafts → published → indexed)
4. No error alert notifications (push/toast — only passive dashboard checking)
5. No live affiliate revenue tracking
6. No bulk topic status updates

### What Works Well:
- Main dashboard is mobile-responsive (thumb-friendly buttons, collapsing grid)
- System health monitoring page with per-job status and re-trigger buttons
- Operations hub with configuration checklist
- Indexing page with live check and manual submission
- SEO dashboard with audit reports

---

## CONTENT PIPELINE — FULL DATA FLOW TRACE

```
WORKING:
  Weekly Topics → TopicProposal ✅ (site_id now set, schema fields fixed)
  Trends Monitor → TopicProposal ✅ (newly connected)
  Content Builder → finds TopicProposal ✅ (OR query for null site_id)
  Content Builder → creates ArticleDraft ✅
  Content Builder → runs 8 phases ✅ (research→outline→drafting→assembly→images→seo→scoring→reservoir)
  Content Selector → finds reservoir drafts ✅ (quality >= 60)
  Content Selector → creates BlogPost ✅ (bilingual merge, correct fields)

BROKEN:
  BlogPost → Public page ❌ (page reads static JSON, not database)
  BlogPost → Affiliate links ❌ (placeholders exist, no injection)
  BlogPost → Sitemap ✅ (sitemap.ts DOES query database — so Google sees URLs but users get 404 for generated content)
```

---

## RECOMMENDED FIX ORDER

### Phase 1: Make articles visible (unblocks revenue)
1. Fix `app/blog/[slug]/page.tsx` to query database (S1)
2. Fix `app/blog/page.tsx` listing to include database articles
3. Fix quality score threshold (S3): align builder and selector at 60

### Phase 2: Make articles earn money
4. Wire affiliate injection into BlogPostClient rendering (S2)
5. Auto-assign affiliates during content-selector promotion

### Phase 3: Fix crashes
6. Fix editor save route field names (C6)
7. Fix content-generation-service.ts missing fields (C1)
8. Fix autopilot.ts missing fields (C1)
9. Fix content-strategy.ts invalid fields (C2)
10. Add maxDuration to 3 routes (C4)

### Phase 4: Clean up operations
11. Consolidate indexing to 1 route
12. Reduce SEO audits from 5x to 2x daily
13. Schedule missing cron jobs or remove dead ones
14. Replace silent catch blocks with proper logging
15. Secure test-connections.html

### Phase 5: Dashboard improvements
16. Add "Publish All Ready" and "Run All Crons" buttons
17. Add pipeline Kanban view
18. Add error notification system

---

## FILES THAT NEED CHANGES (Phase 1-3)

| File | Issue | Priority |
|------|-------|----------|
| `app/blog/[slug]/page.tsx` | Static-only rendering | SHOWSTOPPER |
| `app/blog/page.tsx` | Static-only listing | SHOWSTOPPER |
| `app/blog/[slug]/BlogPostClient.tsx` | No affiliate rendering | SHOWSTOPPER |
| `app/api/cron/content-selector/route.ts` | Add affiliate auto-assignment | SHOWSTOPPER |
| `app/api/cron/content-builder/route.ts` | Quality threshold: 50→60 | SHOWSTOPPER |
| `app/api/admin/editor/save/route.ts` | Wrong field names | CRITICAL |
| `lib/content-generation-service.ts` | Missing required fields | CRITICAL |
| `lib/scheduler/autopilot.ts` | Missing required fields | CRITICAL |
| `lib/seo/content-strategy.ts` | Invalid schema fields | CRITICAL |
| `app/api/internal/cron/audit-daily/route.ts` | No maxDuration | CRITICAL |
| `app/api/seo/cron/route.ts` | No maxDuration | CRITICAL |
| `app/api/seo/workflow/cron/route.ts` | No maxDuration | CRITICAL |
