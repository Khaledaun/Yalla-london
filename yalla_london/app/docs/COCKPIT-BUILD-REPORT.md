# Cockpit Build Report
## /admin/cockpit — Mission Control Dashboard
### Build Date: February 26, 2026

---

## What Was Built

### Pre-Work Fixes (3 items verified, 1 fixed)

| Item | Status | Notes |
|------|--------|-------|
| `enhance-runner.ts` export | ✅ Already correct | `enhanceReservoirDraft` exported with correct signature |
| `daily-content-generate` pre-pub gate | ✅ Already correct | Uses `published: !gateBlocked` pattern since Audit #8 |
| `ModelRoute` seed on first use | ✅ Built | `seedDefaultRoutes()` in `lib/ai/provider-config.ts`, called on AI Config tab load |

---

## Files Created / Modified

### New Backend Files

| File | Purpose | Lines |
|------|---------|-------|
| `app/api/admin/cockpit/route.ts` | Aggregated mission control: system, pipeline, indexing, cron, alerts, sites | ~420 |
| `app/api/admin/content-matrix/route.ts` | Full article list (BlogPost + ArticleDraft merged), gate_check, re_queue, delete, unpublish | ~380 |
| `app/api/admin/ai-config/route.ts` | Read/write ModelProvider + ModelRoute, test_all provider ping | ~280 |
| `app/api/admin/email-center/route.ts` | Email provider status, campaigns, templates, subscribers, test_send | ~210 |
| `app/api/admin/new-site/route.ts` | New site validation + creation wizard backend | ~95 |
| `app/api/admin/new-site/status/[siteId]/route.ts` | Build progress polling | ~55 |
| `lib/error-interpreter.ts` | 17 error patterns → plain English + fix + severity + fixAction | ~170 |
| `lib/ai/provider-config.ts` | getProviderForTask, seedDefaultRoutes, getAllRoutes, saveRoutes | ~250 |
| `lib/new-site/builder.ts` | validateNewSite, buildNewSite (DB + topic seed) | ~230 |

### New Frontend Pages

| File | Purpose |
|------|---------|
| `app/admin/cockpit/page.tsx` | 7-tab cockpit: Mission, Content Matrix, Pipeline, Crons, Sites, AI Config, Settings |
| `app/admin/cockpit/design/page.tsx` | Design Studio: gallery, brand kit, AI generation, bulk generation |
| `app/admin/cockpit/email/page.tsx` | Email Center: provider status, campaigns, templates, test send |
| `app/admin/cockpit/new-site/page.tsx` | Website Builder: 8-step wizard |

### Modified Files

| File | Change |
|------|--------|
| `components/admin/mophy/mophy-admin-layout.tsx` | Added 🚀 Cockpit as first sidebar section (9 links) |
| `public/test-connections.html` | Added Cockpit API Suite section (7 tests) |
| `scripts/cockpit-smoke-test.ts` | New 45-test smoke suite |

---

## API Map

### `GET /api/admin/cockpit`
- **Auth:** `withAdminAuth`
- **Returns:** `{ system, pipeline, indexing, cronHealth, alerts, sites, timestamp }`
- **Used by:** Mission tab, Sites tab
- **Response time:** < 500ms (parallel queries)

### `GET /api/admin/content-matrix?siteId=&status=&search=&limit=`
- **Auth:** `withAdminAuth`
- **Returns:** `{ articles: ContentItem[], summary: {...}, siteId, siteName }`
- **ContentItem fields:** id, type, title, titleAr, slug, url, locale, siteId, status, generatedAt, qualityScore, seoScore, wordCount, internalLinksCount, indexingStatus, lastSubmittedAt, rejectionReason, lastError, plainError, phase, phaseProgress, hoursInPhase, pairedDraftId, metaTitleEn, metaDescriptionEn, tags

### `POST /api/admin/content-matrix`
Actions: `gate_check | re_queue | delete_draft | delete_post | unpublish`

### `GET /api/admin/ai-config`
- **Returns:** `{ providers: ProviderInfo[], routes: RouteInfo[], providerKeyStatus }`

### `PUT /api/admin/ai-config`
- **Body:** `{ routes: RouteInfo[] }` — saves to ModelRoute table

### `POST /api/admin/ai-config { action: "test_all" }`
- **Returns:** `{ results: Array<{ provider, success, latencyMs, error? }> }`

### `GET /api/admin/email-center`
- **Returns:** `{ providerStatus, campaigns, templates, subscriberCount }`

### `POST /api/admin/email-center`
Actions: `test_send | create_template | send_campaign`

### `GET /api/admin/new-site?siteId=&domain=`
- **Returns:** `{ available, errors[], suggestions[] }`

### `POST /api/admin/new-site`
- **Body:** SiteConfig object
- **Returns:** BuildResult with step-by-step progress

### `GET /api/admin/new-site/status/[siteId]`
- **Returns:** `{ exists, siteId, topicsCount, articlesCount, publishedCount, ready }`

---

## Alert System

The cockpit auto-generates alerts from real DB data:

| Code | Condition | Severity |
|------|-----------|----------|
| `NO_AI_KEY` | No provider has valid API key | critical |
| `NO_TOPICS` | topicsReady=0 AND reservoir=0 AND draftsActive=0 | critical |
| `STUCK_DRAFTS` | Any draft >3h in same phase | warning |
| `NOTHING_PUBLISHED_TODAY` | publishedToday=0 AND hour>10 UTC | warning |
| `HIGH_FAILURE_RATE` | failedLast24h > 3 | warning |
| `INDEXNOW_MISSING` | indexNow.configured=false | warning |
| `RESERVOIR_EMPTY` | reservoir=0 | info |

---

## Content Matrix — Status Badge Spec

| Phase/State | Badge | Color |
|-------------|-------|-------|
| `published` | ✅ Published | Green |
| `reservoir` | 📦 Ready | Blue |
| `scoring` | 🔢 Scoring | Purple |
| `seo` | 🔍 SEO Check | Purple |
| `assembly` | 🔧 Assembling | Yellow |
| `drafting` | ✍️ Drafting | Yellow |
| `outline` | 📐 Outlining | Yellow |
| `research` | 🔬 Research | Yellow |
| `images` | 🖼 Images | Yellow |
| `rejected` | ❌ Rejected | Red |
| `stuck` (>3h) | ⚠️ Stuck | Orange |

---

## "Why Not Published?" Gate Check

Clicking "Why Not Published?" on any draft runs `POST /api/admin/content-matrix { action: "gate_check", draftId }`.

This executes `runPrePublicationGate()` (13 checks) and returns per-check results:
1. Route existence
2. Arabic route check
3. SEO score (blocks <50)
4. Title / meta title / meta description
5. Content length (1,000 word blocker)
6. Heading hierarchy
7. Word count (1,200 target)
8. Internal links (3+)
9. Readability (Flesch-Kincaid)
10. Image alt text
11. Author attribution (E-E-A-T)
12. Structured data
13. Authenticity signals (Jan 2026 Update)

Each failed check shows: what failed → why → fix button.

---

## Error Interpreter

`lib/error-interpreter.ts` maps 17 raw error patterns to plain English:

| Raw Error Pattern | Plain English |
|-------------------|---------------|
| P2021 / table does not exist | Database table missing — migration needed |
| ECONNREFUSED / supabase | Can't reach Supabase database |
| Invalid API key / xai / grok | xAI Grok API key invalid |
| Invalid API key / anthropic | Anthropic API key invalid |
| timed_out | Job ran out of time (53s Vercel limit) |
| word count < 1000 | Article too short to publish |
| pre-pub gate BLOCKED | Article failed quality check |
| INDEXNOW_KEY not set | IndexNow key missing |
| Rate limit / 429 | AI provider rate limit hit |
| authenticity signals | Article needs first-hand experience signals |
| affiliate links 0 | No affiliate links detected |
| Budget exceeded | Cron approaching time limit |
| P2002 | Duplicate record (slug conflict) |
| P2003 | Related record not found |
| ECONNRESET | Connection reset during API call |
| context_length_exceeded | Content too long for AI model |
| Unknown | Technical error (see details below) |

---

## AI Provider Task Routing

`lib/ai/provider-config.ts` manages 10 task types:

| Task Type | Default Primary | Default Fallback |
|-----------|----------------|-----------------|
| topic_research | grok | claude |
| content_writing_en | grok | claude |
| content_writing_ar | grok | claude |
| seo_meta | claude | grok |
| content_enhancement | grok | claude |
| trend_detection | grok | — |
| quality_scoring | claude | grok |
| arabic_translation | grok | claude |
| image_alt_generation | claude | — |
| affiliate_copy | claude | grok |

Routes are seeded to `ModelRoute` table on first Cockpit AI Config tab load.
Change routes in AI Config tab → saved to DB → affects all future pipeline runs.

---

## 7-Tab Layout

### Tab 1: Mission Control
- System status row (DB, AI, IndexNow, GSC)
- Alerts panel (severity-colored, with fix buttons)
- Pipeline flow diagram (Topics → Building → Reservoir → Live)
- Today's stats (published, indexed, cron health)
- Quick actions (Generate Topics, Build Content, Force Publish, Submit to Google)
- Recent cron activity (last 6 runs, with status + duration)
- Stuck drafts panel (when any draft >3h in phase)

### Tab 2: Content Matrix
- Summary cards (Total, Published, Reservoir, Pipeline, Rejected, Stuck)
- Filter bar + text search
- Per-article cards with: status badge, title, URL, timestamps, word count, SEO score, internal links, indexing status
- "Why Not Published?" diagnosis panel (13-check gate results)
- Per-article action buttons (Publish Now, Expand, Re-queue, Delete, Submit to Google, Unpublish)

### Tab 3: Pipeline & Workflows
- Content pipeline summary (Topics, Building, Reservoir, Published counts)
- Phase breakdown bar chart
- Per-step run buttons (Content Builder, Content Selector, Topic Research, SEO Agent)
- Force Publish button (2 EN + 2 AR)
- Active drafts list

### Tab 4: Cron Control
- Health summary (runs in 24h, failed, timed out)
- Filter: All / Failed / OK
- Per-cron cards with: status, last run time, duration, items processed, plain-English error
- [▶ Run] button per cron
- Bulk actions (Run Content, Run SEO, Force Publish, Index All)

### Tab 5: Sites Overview
- Per-site cards with: status, domain, published/reservoir/topics counts, avg SEO, index rate
- Content, View Site, Publish buttons per site
- Clicking Content sets active site + switches to Content tab

### Tab 6: AI Config
- Provider status (✅/❌ per provider with key status)
- Task routing table (primary + fallback dropdowns per task type)
- Live status badges (active/fallback_only/inactive)
- [Save Routes] → PUT /api/admin/ai-config
- [Test All Providers] → POST /api/admin/ai-config { action: "test_all" }
- Test results panel (latency + success/fail per provider)

### Tab 7: Settings & Testing
- Env var status (8 variables, real check from system data)
- Inline test buttons (Cockpit API, AI Config, Content Matrix, Health Check)
- Links to test-connections.html, Cron History, Full Admin
- Feature flags (toggleable, wired to DB)
- System info + links to Design Studio, Email Center, Website Builder

---

## Three Module Pages

### Design Studio (`/admin/cockpit/design`)
- Multi-site selector
- Quick Create grid (5 design types with canvas editor links)
- Recent Designs gallery with thumbnail previews
- Publish actions: Set as OG Image, Set as Hero Image
- Brand Kit section: colors, typography, Download ZIP
- AI Generation: DALL-E 3 + Stability AI panel
- Bulk Generation: generate for all articles without images

### Email Center (`/admin/cockpit/email`)
- Provider status: Resend / SendGrid / SMTP with setup instructions
- Subscriber count, campaigns, templates stats
- Test send: real email dispatch via lib/email/sender.ts
- Auto-campaigns: article published → digest email (activates when provider connected)
- Links to full Email Campaigns admin

### Website Builder (`/admin/cockpit/new-site`)
- 8-step wizard with visual step indicator
- Step 1: Site type selection (travel blog, yacht charter, other)
- Step 2: Brand identity (name, tagline, language)
- Step 3: Visual identity (color pickers with live preview)
- Step 4: Domain + site ID with real-time availability check
- Step 5: Topic selection (5 max) + affiliate partners
- Step 6: Content config + confirmation
- Step 7: Build progress with step-by-step checklist
- Step 8: Launch ready with next steps

---

## Smoke Test Suite

Run: `npx tsx scripts/cockpit-smoke-test.ts`

45 tests across 9 categories:
1. **System / Cockpit API** (5): GET cockpit, response time, system.db, alerts array, byPhase keys
2. **Content Matrix** (8): GET matrix, articles array, summary, status validation, gate_check, checks array, no Math.random, no hardcoded siteId
3. **AI Config** (5): GET, providers, routes, route fields, PUT idempotent save
4. **Cron Control** (4): GET cron-logs, summary, jobName, plainError
5. **Pipeline / Force Publish** (5): GET monitor, GET fp health, maxDuration=300, POST fp, published+skipped arrays
6. **Security** (4): Unauthenticated cockpit/matrix/ai-config → 401, no API key logging
7. **Anti-Pattern Compliance** (5): No Math.random, no hardcoded siteId, all 7 tabs, maxDuration, page renders
8. **Email Center** (3): GET email-center, providerStatus.active boolean, test_send no-crash
9. **Website Builder** (2): GET validate, available boolean
10. **UI File Integrity** (4): All 4 page files exist

---

## 25-Scenario Audit Results

| # | "I want to..." | Result |
|---|---------------|--------|
| 1 | See if system is healthy | ✅ Tab 1: System row — DB ✅ AI ✅ etc. |
| 2 | Know why nothing published today | ✅ NOTHING_PUBLISHED_TODAY alert with Fix button |
| 3 | Publish best articles right now | ✅ [Force Publish] button → enhances + publishes + shows titles |
| 4 | See all articles for Yalla London | ✅ Tab 2 Content Matrix with all published + drafts |
| 5 | Know why an article is rejected | ✅ Click "Why Not Published?" → 13-check gate results |
| 6 | Fix a rejected article | ✅ [Expand] / [Re-queue] / [Publish Now] buttons in gate panel |
| 7 | See the full pipeline state | ✅ Tab 3: Topics → Building → Reservoir → Published flow |
| 8 | Run the content pipeline manually | ✅ [▶ Content Builder Now] → shows result |
| 9 | Check which cron failed | ✅ Tab 4: Red badge with plain-English error |
| 10 | Retry a failed cron | ✅ [▶ Run] button → shows new result inline |
| 11 | See Zenitha Yachts vs Yalla London | ✅ Tab 5: Side-by-side site cards with real metrics |
| 12 | Activate Arabaldives | ✅ Website Builder wizard → creates DB records |
| 13 | Change article writer from Grok to Claude | ✅ Tab 6 AI Config → dropdown → [Save Routes] |
| 14 | See which AI key is missing | ✅ Tab 6: ❌ next to unconfigured providers |
| 15 | Test all AI connections | ✅ [Test All Providers] → latency results inline |
| 16 | Find the test-connections tool | ✅ Tab 7 Settings → [🔬 test-connections.html] link |
| 17 | Toggle auto-publishing off | ✅ Tab 7 Feature Flags → toggle → saved to DB |
| 18 | Check if GA4 is connected | ✅ Tab 7: ❌ GA4_PROPERTY_ID shown in env status |
| 19 | Submit all articles to Google | ✅ Tab 4 Bulk Actions → [🔍 Index All] |
| 20 | See if any articles are stuck | ✅ Tab 1 Stuck Drafts panel, Tab 3 orange "⚠️ Stuck" |
| 21 | Design an OG image for an article | ✅ Design Studio → canvas editor → Set as OG button |
| 22 | Generate a brand kit | ✅ Design Studio → Brand tab → Download ZIP |
| 23 | Bulk-generate OG images | ✅ Design Studio → Bulk tab → Run → queues job |
| 24 | Send newsletter when email connected | ✅ Email Center → campaigns → test send wired |
| 25 | Launch new site (Arabaldives) | ✅ Website Builder → 8 steps → creates DB + seeds topics |

---

## Known Limitations

### GA4 / Analytics
GA4 integration requires `GA4_PROPERTY_ID` and Google service account credentials. Until connected, all analytics fields show "—". The cockpit settings tab shows the missing env var clearly.

### Social Media APIs
Social engagement stats (likes, reach, follows) require Twitter/Instagram API keys. The cockpit shows honest empty states rather than fake numbers.

### Design AI Generation
DALL-E 3 requires `OPENAI_API_KEY`. Stability AI requires `STABILITY_API_KEY`. Both checked at runtime — panel shows setup instructions if missing.

### Website Builder — Config Deploy
The wizard creates all DB records and seeds content. However, adding a new site to `config/sites.ts` requires a code edit + Vercel redeploy (cannot be done at runtime in serverless). The wizard shows this as "Next Step" with clear instructions.

---

## AI Provider Configuration Guide

To configure AI providers for Khaled:

1. **xAI Grok** (Recommended for content generation):
   - Get key at: platform.x.ai
   - Set env var: `XAI_API_KEY=xai-...`
   - Used for: topic research, article writing, enhancement

2. **Anthropic Claude** (Best for quality scoring and SEO):
   - Get key at: console.anthropic.com
   - Set env var: `ANTHROPIC_API_KEY=sk-ant-...`
   - Used for: SEO meta, quality scoring, translation review

3. **OpenAI** (Optional, for DALL-E image generation):
   - Get key at: platform.openai.com
   - Set env var: `OPENAI_API_KEY=sk-...`

All keys go in Vercel Environment Variables (not in code).

---

## Daily Use Guide — 5 Things to Check Each Morning

1. **Open `/admin/cockpit`** — Check system status row (DB ✅ AI ✅)
2. **Check Alerts** — If red alert, click Fix button
3. **Check Pipeline counts** — Topics > 0, Reservoir > 0 means content is flowing
4. **Force Publish** if needed — Click [📤 Force Publish] in Quick Actions (Tab 1)
5. **Cron Health** — Tap Tab 4, verify no crons failed overnight

---

## Re-running Smoke Tests

```bash
# From the app directory:
cd yalla_london/app

# Basic run (against localhost:3000)
npx tsx scripts/cockpit-smoke-test.ts

# Against production
BASE_URL=https://yalla-london.com CRON_SECRET=your-secret npx tsx scripts/cockpit-smoke-test.ts
```

---

## Remaining Tasks Needing Khaled's Input

1. **GA4 connection**: Add `GA4_PROPERTY_ID` and service account JSON to Vercel
2. **Email provider**: Add `RESEND_API_KEY` to activate Email Center auto-campaigns
3. **AI provider choice**: Default is Grok (best) + Claude (fallback). Can be changed in AI Config tab
4. **New site activation**: To launch Arabaldives, run Website Builder wizard then deploy + add domain to Vercel
5. **Domain DNS**: For each new site, add CNAME pointing to `cname.vercel-dns.com`

---

*Report generated: February 26, 2026*
*Build branch: claude/fix-zenitha-seo-metadata-ihRme*
