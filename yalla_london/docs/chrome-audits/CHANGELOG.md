# Chrome Bridge CHANGELOG

## 2026-04-20.18 — Sitewide audit response + meta cleanup tool

**First audit cycle complete.** Report `cmo7o396r0000l204khl2b9dl` (sitewide/critical, 5 findings, 6 actions) processed end-to-end: uploaded → viewer → Apply Fix → CLI pick-up → fixes committed.

**Fixes from audit findings:**
- **Finding #1 (meta pollution):** new `POST /api/admin/fix-redirected-meta` endpoint strips `[REDIRECTED to /target-slug]` prefix from BlogPost meta fields. Dry-run mode via `?dryRun=1`. Auth: requireAdminOrCron.
- **Finding #2 (affiliate coverage):** confirmed existing `affiliate-injection` cron already handles 16 brands × 6 sites, including Booking.com + GetYourGuide. When a CJ advertiser becomes JOINED, cron auto-wraps body mentions on next run. No code change needed; Khaled needs to apply on CJ dashboard.
- **Finding #4 (three 500 endpoints):** already fixed earlier this session (`d0dbb0d` + `fd21720`):
  - `/gsc/coverage-summary`: removed invalid Prisma orderBy, sort client-side
  - `/overview` + `/page/[id]`: graceful fallback when ChromeAuditReport table missing (table was missing in prod until migration ran mid-session)
- **Finding #6 (playbook traffic floor):** documented in Revenue + Monetization pillar — `/revenue` classifier needs ≥200 organic clicks/month; below that, use affiliate family endpoints instead.

**Findings not auto-fixed (defer to human):**
- **#1b (redirect decisions):** per-page judgment needed which slug is canonical
- **#2a (CJ applications):** manual in CJ dashboard (priority: Booking.com UK, GetYourGuide, Agoda UK, Hotels.com UK, IHG)
- **#3 (29 not_indexed rewrites):** content work, per-article rewriting with E-E-A-T signals
- **#5 (Excellence Collection $0 EPC):** data hygiene — one-click DB edit or verify attribution

**To mark report fixed:**
```
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://www.yalla-london.com/api/admin/chrome-audits \
  -d '{"reportId":"cmo7o396r0000l204khl2b9dl","action":"mark_fixed"}'
```
Or tap "Mark Fixed" on the viewer card at `/admin/chrome-audits`.

---

All changes to the Claude Chrome Bridge capabilities, versioned.

Format: `version` (ISO date + increment). Claude Chrome checks `bridgeVersion`
via `GET /capabilities` and re-loads PLAYBOOK.md when it changes.

---

## 2026-04-20.17 — Affiliate research + activities (Phase 7.6 — Phase 7 COMPLETE)

**4 new endpoints:**
- `GET /affiliate/gaps?siteId=X&limit=N` — scans published BlogPost.content_en
  for 16 known brand patterns (Booking.com, Agoda, HalalBooking, Vrbo,
  GetYourGuide, Viator, Klook, Tiqets, Skyscanner, Boatbookings, The Fork,
  OpenTable, Stay22, Kayak, Airbnb, Hotels.com). Counts mentions vs
  affiliate-wrapped references. Returns topGapBrands + topArticlesByGap
  ranked by unlinked mention count.

- `GET /affiliate/recommendations?siteId=X&days=N` — synthesizes affiliate
  program recommendations from 4 signals:
  1. GSC intent volume (top 100 queries classified into hotel/activity/
     flight/restaurant/yacht/car/insurance via regex patterns)
  2. Existing coverage (which categories have JOINED CjAdvertisers)
  3. Curated program catalog with typical EPC values
  4. Priority scoring: high-intent volume + no coverage + high EPC = HIGH

- `GET /affiliate/commission-trends?siteId=X&days=N` — aggregates CjCommission
  by advertiser + ISO week. Classifies each partner:
  - `declining` — last 3 weeks down ≥50% vs prior 3 weeks
  - `rising` — last 3 weeks up ≥50% with ≥$5 commission
  - `inactive` — no commissions in last 3 weeks (but previously earned)
  - `new` — only one week of data
  - `stable` — everything else

- `GET /affiliate/approval-queue` — CjAdvertiser state overview
  (JOINED/PENDING/DECLINED/NOT_JOINED). Flags stuck-pending applications
  (>30d in PENDING). Ranks high-EPC (threeMonthEpc>$2) unconverted
  advertisers for priority application. Groups joined by category for
  coverage visibility.

**Phase 7 complete.** All 6 sub-phases shipped: DataForSEO (7.1), A/B
testing (7.2), impact measurement (7.3), expanded GSC (7.4), expanded GA4
(7.5), affiliate research (7.6).

---

## 2026-04-20.16 — Expanded GA4 (Phase 7.5)

**Added to `lib/seo/ga4-data-api.ts`:**
- `runGA4CustomReport(body, propertyIdOverride?)` — exposes runReport() for
  arbitrary GA4 Data API queries with the shared auth pipeline
- `runGA4RealtimeReport(body, propertyIdOverride?)` — same for realtime
  (different endpoint: `:runRealtimeReport`, max 30-min lookback)

**New endpoints:**
- `GET /ga4/channels?siteId=X&days=N` — traffic acquisition by default
  channel group + source/medium. Session count, engagement rate, bounce
  rate per channel.
- `GET /ga4/conversions?siteId=X&days=N&eventName=X` — event count
  breakdown. Calculates `affiliateConversionRate` = affiliate_click / page_view.
- `GET /ga4/realtime?siteId=X` — active users in last 30 min. Total + by
  country + top pages being viewed + top sources sending traffic now.
- `GET /ga4/funnel?siteId=X&pagePath=X` — per-page engagement funnel
  (session_start → page_view → scroll → affiliate_click) with rates.
  Aggregate mode (omit pagePath) ranks worst performers (≥20 sessions +
  ≥70% bounce).

**Multi-site:** All endpoints respect
`GA4_PROPERTY_ID_<SITE_UPPER>` env var override. Graceful 503 degradation
when credentials missing.

---

## 2026-04-20.15 — Expanded GSC (Phase 7.4)

**Added:**
- `GET /gsc/inspect?url=X&siteId=X` — single-URL URL Inspection API wrapper.
  Auto-interprets verdict: "not indexed" → critical finding, "crawled but not
  indexed" → critical Google quality signal + E-E-A-T remediation (relatedKG:
  KG-058), canonical mismatch → warning + audit.
- `GET /gsc/breakdown?siteId=X&days=N&by=device|country|date|searchAppearance|page|query`
  Multi-dimensional Search Analytics slicing. Detects patterns hidden in
  aggregate: mobile-vs-desktop CTR gap, Gulf-vs-UK split, week-over-week trends.
- `GET /gsc/coverage-summary?siteId=X` — coverage report derived from
  URLIndexingStatus DB (GSC Coverage UI is NOT API-accessible). Surfaces:
  indexingRate, top 15 coverage_state buckets (detects "Crawled — currently
  not indexed"), chronic failures (≥15 attempts), deindexed URLs.

**Documented limitations:**
- GSC Coverage report UI, Manual Actions, Security Issues are NOT exposed
  via GSC API. For those, configure GSC email notifications.

---

## 2026-04-20.14 — Impact measurement (Phase 7.3 — learning loop closed)

**Added:**
- `GET /api/admin/chrome-bridge/impact?reportId=X` — single-audit impact
- `GET /api/admin/chrome-bridge/impact?siteId=X&days=30` — aggregate view
  across all fixed audits in window

**Measures** (7, 14, 30-day windows before vs after `fixedAt`):
- GSC clicks / impressions / avg CTR / avg position delta
- Affiliate clicks (via SID parse)
- Commission total (via metadata.sid match)
- CTR lift %, position delta (negative = improved rank)

**Verdict rules (7d primary window):**
- `confirmed_improvement` — CTR lift ≥10% OR position improved ≥1 OR
  commission increased by >$0.50
- `regression` — CTR dropped ≥10% OR position worsened ≥1 position
- `insufficient_data` — <3 days since fix, or <20 total impressions
- `no_change` — neither signal detected

**Aggregate response** includes `verdictCounts` + `improvementRate` =
confirmed / (measured - insufficient_data). Claude Chrome queries this to
update its prediction model: which past interventions actually worked.

---

## 2026-04-20.13 — A/B testing infrastructure (Phase 7.2)

**Added:**
- New Prisma model `AbTest` + migration `20260420_add_ab_test`:
  Fields for variantA/B (JSON), trafficSplit, primaryMetric (click|conversion|
  scroll_depth|engagement), per-variant counters (impressions/clicks/conversions),
  status (active|paused|concluded|archived), winner, confidence, reportId
  (link back to ChromeAuditReport that proposed the test).
- `lib/chrome-bridge/ab-test-stats.ts` — z-test for two-proportion difference.
  Standard normal CDF via Abramowitz & Stegun approximation. Returns lift,
  z-score, p-value, confidence, winner ("A"|"B"|"tie"|"inconclusive"),
  sampleSufficient flag (min 100 impressions per arm).
- `GET /ab-test?siteId=X&status=active` — list with live stats
- `POST /ab-test` — register new test (Zod-validated). Blocks duplicate active
  tests on same URL+variantType. content_section requires targetSelector.
- `GET /ab-test/[id]` — detail + live stats
- `POST /ab-test/[id]` body `{ action: "conclude" }` — computes winner at 95%
  confidence threshold, sets status=concluded, returns recommendation.
- `PATCH /ab-test/[id]` — pause/resume/notes/manual-winner override
- `POST /ab-test/track` — **public tracking beacon** (no auth) called from
  frontend with `{ testId, variant, event }`. Atomic Prisma increment.
  Rate-limited to 1 hit/minute/IP/event-type to prevent counter inflation.

**Variant types:**
- `title`, `meta_description` — limited SEO value (bots see default)
- `affiliate_cta` — **RECOMMENDED** (direct revenue impact)
- `hero`, `content_section` — UX-level conversion improvements

**Integration hint:** POST /ab-test returns an integrationHint string —
frontend must read cookie `ab_<testId>=A|B`, render matching variant, fire
tracking beacon. Cookie assignment happens at the page level (not yet in
middleware — Phase 7.2b if needed).

---

## 2026-04-20.12 — DataForSEO integration (Phase 7.1)

**Added:**
- `lib/chrome-bridge/dataforseo.ts` — typed API client with HTTP Basic Auth,
  20s timeout, graceful degradation. Two functions exported:
  - `fetchSERP(keyword, locationCode, languageCode)` — top 10 organic + SERP
    features (featured snippet, PAA, related searches, AI Overview citations)
  - `fetchKeywordMetrics(keywords[], locationCode, languageCode)` — search
    volume + CPC + competition for up to 100 keywords per call
- `GET /api/admin/chrome-bridge/serp?keyword=X&locationCode=N`
  Returns top 10 organic, competitor domains, our ranking (if any), our AIO
  citation status, PAA questions. Auto-generated findings flag:
  - Not in top 10 (warning, propose content creation)
  - Ranked #6-10 (info, push-to-top-5 opportunity)
  - AI Overview appears but we're not cited (warning, AIO citability fix)
  - PAA questions we should answer as H2s
- `GET /api/admin/chrome-bridge/keyword-research?keywords=a,b,c`
  Returns search volume + CPC + competition + monthly trends. Highlights
  top by volume + top by CPC (high commercial intent).

**Env vars:** `DATAFORSEO_LOGIN` + `DATAFORSEO_PASSWORD` (API password from
dashboard, not UI login). Cost ~$0.33/mo at typical audit volume.

**Graceful degradation:** Endpoints return 503 with actionable hint when
env vars not set. Capabilities manifest flips `competitorSerp` and
`keywordResearch` feature flags to reflect config status.

**Curated location codes:** LOCATION_CODES map covers UK/US/UAE/KSA/Egypt/
Jordan/Kuwait/Qatar/France/Italy/Turkey/Thailand/Maldives for quick lookup
without needing DataForSEO location reference.

---

## 2026-04-20.11 — Arabic SSR compliance checker (Phase 6 complete)

**Added:**
- `GET /api/admin/chrome-bridge/arabic-ssr?siteId=X&limit=N` (batch mode)
- `GET /api/admin/chrome-bridge/arabic-ssr?url=X` (single-URL mode)

**Closes KG-032.** `/ar/` routes that render English server-side violate
hreflang promises and prevent Arabic indexing. This endpoint detects the
failure across a batch of pages.

**5 checks per URL (all must pass):**
1. `<html lang="ar">` present in initial HTML
2. `<html>` or `<body>` has `dir="rtl"`
3. Body text sample (first 3000 chars, after stripping tags/scripts/styles)
   is ≥20% Arabic characters (Unicode blocks U+0600..U+06FF, U+0750..U+077F,
   U+FB50..U+FDFF, U+FE70..U+FEFF)
4. `<title>` tag contains at least one Arabic character
5. At least one H1 or H2 contains Arabic characters

**Default batch scan:**
- `/ar/`, `/ar/about`, `/ar/contact`, `/ar/blog` (static routes)
- N recent published BlogPosts (max 30) at `/ar/blog/<slug>`

Parallel fetch (6 concurrent, 10s timeout each). Custom
Accept-Language: ar,en;q=0.5 in case middleware relies on it. Follows
redirects. HTTP errors surfaced in `fetchErrors` category.

**Why:** Manual verification of KG-032 was impossible for non-technical
audit. Now Claude Chrome runs `GET /arabic-ssr?siteId=yalla-london` and
sees exactly which pages serve English despite the /ar/ URL.

**Phase 6 complete.** 5 audit-depth endpoints shipped:
schema (6.1), broken-links (6.2), rejected-drafts (6.3), errors (6.4),
arabic-ssr (6.5).

---

## 2026-04-20.10 — Error log / 404 inference (Phase 6.4)

**Added:**
- `GET /api/admin/chrome-bridge/errors?siteId=X&days=N`
  URL errors inferred from existing DB state — no Vercel Logs API required.

**3 data sources synthesized:**
1. `indexingErrors` — URLIndexingStatus rows with status="error" or last_error set.
   Clustered by normalized error pattern so the top failure mode surfaces.
2. `sitemapOrphans` — URLs in GSC impressions (last N days) where the
   inferred blog slug is NOT in the published BlogPost table. Indicates
   legacy URLs users are hitting via Google but the content was unpublished/deleted.
   Sorted by impressions (most-hit orphans first = biggest user-visible 404 risk).
3. `cronFailuresWithHttpErrors` — CronJobLog entries with 404/500/502/503/504/
   ECONNREFUSED in error_message. Signals crawler, indexer, or external fetch issues.

**Why:** Lets Claude Chrome answer "what's broken from a user's perspective?"
without needing Vercel Logs access or external uptime monitoring.

---

## 2026-04-20.9 — Rejected drafts pattern mining (Phase 6.3)

**Added:**
- `GET /api/admin/chrome-bridge/rejected-drafts?siteId=X&days=N&limit=N`
  Diagnoses why the pipeline kills articles. Normalizes `last_error`
  messages (collapses IDs/numbers/durations to `<id>`, `<n>`, `<duration>`,
  `<url>`) so "timeout 12s" and "timeout 15s" fold into one bucket.

**Returns:**
- `topErrorPatterns` — clustered error buckets with count, avg phase_attempts,
  example raw errors, example keywords (easy to find representative drafts)
- `summary.rejectionRate` — rejections / (rejections + published) in window
- `summary.maxRecoveriesExceededCount` — rule 125 cap violations
- `repeatedTopicIds` — topics rejected ≥2 times (structural problem, not transient)
- `localeCounts` — EN vs AR rejection split (language-specific issues surface)
- `recentVelocity` — last 14 days of daily rejection counts (trend detection)
- `recent[]` — 30 most recent rejected drafts with sanitized last_error

---

## 2026-04-20.8 — Broken internal links map (Phase 6.2)

**Added:**
- `GET /api/admin/chrome-bridge/broken-links?siteId=X&limit=N`
  Scans published BlogPost.content_en for `<a href="...\/blog\/<slug>...">`
  references. DB-only — no HTTP fetches.

**Detection:**
- `brokenLinks` — references to slugs that don't exist as a published BlogPost
  (typos, unpublished destinations, hallucinated slugs from AI generation)
- `topBrokenTargets` — most-referenced broken slug (often a cluster problem)
- `orphanPages` — published articles ≥7d old with 0 inbound internal links
  (poor topical authority signal)
- `weaklyLinked` — pages with only 1 inbound link (needs reinforcement)

Skips self-references. 7-day grace window prevents newly-published
articles from appearing as orphans.

---

## 2026-04-20.7 — Schema/JSON-LD validator (Phase 6.1)

**Added:**
- `GET /api/admin/chrome-bridge/schema?url=X` — fetches page HTML, extracts
  all `<script type="application/ld+json">` blocks, validates each.

**Checks:**
- JSON parse errors (critical — breaks rich results eligibility)
- Missing @context
- Missing required fields per type (Article: headline/author/datePublished;
  Organization: name/url; BreadcrumbList: itemListElement; Product: name/offers;
  Person: name; ImageObject: url; VideoObject: name/thumbnailUrl/uploadDate;
  Place: name; Trip: name/itinerary)
- Deprecated types flagged (FAQPage restricted, HowTo, CourseInfo,
  ClaimReview, EstimatedSalary, LearningVideo, SpecialAnnouncement,
  VehicleListing, PracticeProblems, SitelinksSearchBox)
- Blog/news pages missing Article/BlogPosting/NewsArticle schema

Handles `@graph` arrays and top-level arrays of items. Returns findings
and interpretedActions in Chrome Bridge standard format.

---

## 2026-04-20.6 — Lighthouse endpoint (Phase 5 complete)

**Added:**
- `GET /api/admin/chrome-bridge/lighthouse?url=X&strategy=mobile|desktop`
  Wraps PageSpeed Insights v5 (via existing `lib/performance/site-auditor.auditPage`).
  Returns:
  - Core Web Vitals: LCP, INP, CLS, FCP, TBT, Speed Index — each with
    `rating: "good" | "needs-improvement" | "poor"` based on Google 2026 thresholds
  - Category scores: performance, accessibility, best-practices, seo
  - Top 10 diagnostics from Lighthouse
  - `findings[]` + `interpretedActions[]` in the standard Chrome Bridge format
    so the response drops straight into POST /report without re-interpretation

**Thresholds (Google 2026):**
- LCP: ≤2.5s good, ≤4s needs-improvement, >4s poor
- INP: ≤200ms good, ≤500ms needs-improvement, >500ms poor
- CLS: ≤0.1 good, ≤0.25 needs-improvement, >0.25 poor
- Performance score: ≥90 target, <80 warn, <50 critical
- Accessibility score: ≥90 target (WCAG AA), <70 critical

**Why:** Claude Chrome can now correlate visual/UX findings from its browser
session with objective Core Web Vitals data. Close the "page feels slow" /
"numbers say it's slow" loop with one endpoint call per page audit.

**Phase 5 complete.** 5 commits shipped: awareness layer (5.1), revenue (5.2),
audit memory (5.3), topic opportunities (5.4), Lighthouse (5.5).

---

## 2026-04-20.5 — Topic opportunities

**Added:**
- `GET /api/admin/chrome-bridge/opportunities?siteId=X&days=N&limit=N`
  Three content-calendar signals synthesized:
  1. **TopicProposal queue** — pending/ready/queued topics sorted by
     confidence_score. Includes featured_longtails, intent, pageType,
     planned_at, evergreen flag, suggestedWindow.
  2. **GSC near-miss queries** — live GSC API call via `getTopKeywords()`,
     filtered to position 11-30 with ≥50 impressions. Each row classified:
     "page-2 breakthrough (high impact)" (pos ≤15, impressions ≥200),
     "page-2 breakthrough", "page-3 long-tail", "low-rank".
  3. **Content gaps** — `primaryKeywordsEN/AR` from site config that have NO
     matching published BlogPost (token-based slug/title match, excluding
     common stop words like "best", "top", year tokens).

**Why:** "What should I write next?" is the #2 audit question after "why
isn't this page ranking?" Now answered from live data, not speculation.

---

## 2026-04-20.4 — Audit memory

**Added:**
- `GET /api/admin/chrome-bridge/history?siteId=X&pageUrl=X&auditType=T&limit=N`
  Returns chronological ChromeAuditReport history. When `pageUrl` is provided
  and ≥2 reports exist, also computes a `delta` between the two most recent:
  - `resolved` — findings in the previous report but NOT in the latest
  - `recurring` — findings present in both (same pillar + normalized issue)
  - `newFindings` — findings only in the latest
- Normalization strips numeric values before matching so "CTR 0.8%" and
  "CTR 1.2%" count as the same recurring finding.
- Response also includes `statusCounts`, `severityCounts`, `fixRate`.

**Why:** Closes the learning loop. Claude Chrome can now see whether a
past audit's fix actually worked, or whether the same issue keeps
returning (indicating a structural problem, not a per-audit fix).

---

## 2026-04-20.3 — Revenue attribution

**Added:**
- `GET /api/admin/chrome-bridge/revenue?siteId=X&days=N&limit=N` — per-page
  affiliate attribution. Joins BlogPost → CjClickEvent (via SID parse from
  sessionId) → CjCommission (via metadata.sid). Returns per-page: organic
  clicks/impressions, affiliate clicks, commission count + total, EPC,
  conversion rate, hasAffiliateLinks flag, and classification:
  - `earner` — has commissions or affiliate clicks
  - `dead_weight` — ≥20 organic clicks, 0 affiliate clicks, has affiliate links
  - `unmonetized` — no affiliate links injected in content
  - `fresh` — <14 days old (excluded from classification)
  - `cold` — nothing happening yet
- Response also surfaces `topEarners` (top 10 by commission), `deadWeight`
  (ranked by wasted traffic), `unmonetized` (ranked by impressions).
- `GET /page/[id]` now includes `revenue` block with 30d affiliate clicks,
  commission count + total, EPC, recent commissions. Claude Chrome sees
  page earnings inline with SEO / indexing / enhancement log.

**Why:** The #1 blind spot in page audits was "is this page even earning?"
Claude Chrome can now differentiate traffic optimization (dead_weight —
monetize first) from monetization optimization (unmonetized — inject
affiliates first) from protect-mode (top earners — don't disturb).

---

## 2026-04-20.2 — Awareness layer

**Added:**
- `GET /api/admin/chrome-bridge/capabilities` — self-documenting manifest endpoint with endpoint schemas, feature flags, env availability, and session-start instructions
- `lib/chrome-bridge/manifest.ts` — single source of truth for exposed endpoints and versions
- `_hints` field standard on bridge responses — every response now includes `{ version, playbookVersion, suggested: string[], playbook, capabilities, viewer }` so Claude Chrome stays aware of new capabilities without re-reading the playbook between sessions
- PLAYBOOK.md now has versioned YAML frontmatter (`version: 2026-04-20`) so Claude Chrome can detect when the playbook has changed

**Why:** Keeps Claude Chrome sessions aligned as the bridge expands. When a new
endpoint ships, the capabilities manifest is updated + the version bumps, and
Claude sees the new capability on the next session without manual intervention.

---

## 2026-04-20.1 — Initial release

**Added:**
- Bearer-token auth with admin-session fallback (`lib/agents/bridge-auth.ts`)
- `ChromeAuditReport` Prisma model + migration for report persistence
- 11 bridge endpoints (9 read + 2 write):
  - `GET /` (self-doc index)
  - `GET /sites` (active sites + config)
  - `GET /overview` (cross-site snapshot)
  - `GET /pages` (published pages + GSC 7d)
  - `GET /page/[id]` (deep dive)
  - `GET /action-logs` (unified log view)
  - `GET /cycle-health` (pipeline signals)
  - `GET /aggregated-report` (latest SEO audits)
  - `GET /gsc` (GSC top pages/keywords/sitemaps)
  - `GET /ga4` (GA4 metrics)
  - `POST /report` (audit upload)
  - `POST /triage` (log triage upload)
- `lib/chrome-bridge/interpret.ts` — 5 pure interpretation functions
  (CTR vs position, GA4 engagement, indexing failures, page content, action log clustering)
- `lib/chrome-bridge/types.ts` — Zod schemas for findings and actions
- `lib/chrome-bridge/helpers.ts` — report path builder, AgentTask creator,
  CronJobLog writer, CEO Inbox alert
- `docs/chrome-audits/PLAYBOOK.md` — 5-pillar auditor methodology + thresholds
- `scripts/mcp-platform-server.ts` — 6 Chrome Bridge MCP tools
- `/admin/chrome-audits` — iPhone-first viewer with Apply Fix / Dismiss / Mark
  Reviewed / Mark Fixed actions that queue `AgentTask` records for CLI pick-up

**Why:** Give Claude Chrome a read/write surface into the platform so it can
audit per-page and sitewide, while keeping Claude Code CLI as the executor for
applied fixes. Reports land in a DB + markdown-backed store that the owner
reviews from iPhone.

---

## Planned — Phase 5 continuation (2026-04-20.3+)

- `GET /revenue?siteId=X&days=N` — per-page affiliate clicks / commissions / EPC
- `GET /history?siteId=X&pageUrl=X` — past audit reports for a URL (memory loop)
- `GET /opportunities?siteId=X` — TopicProposal queue + GSC near-miss queries
- `GET /lighthouse?url=X&strategy=mobile|desktop` — PageSpeed API wrapper

## Planned — Phase 6 (2026-04-21+)

- `GET /schema?url=X` — JSON-LD validator
- `GET /broken-links?siteId=X` — dead internal links + orphan pages
- `GET /rejected-drafts?siteId=X` — pattern-mine pipeline rejections
- `GET /errors?siteId=X` — 404 / error log from Vercel logs
- `GET /arabic-ssr?siteId=X` — per-page SSR compliance check (closes KG-032)

## Planned — Phase 7 (needs decisions)

- `GET /serp?keyword=X` — competitor SERP via DataForSEO (~$10/mo)
- `GET /screenshot?url=X&viewport=mobile|desktop` — needs Browserless (~$15/mo) or defer
- `GET /replay?url=X` — Microsoft Clarity session URLs (free, needs install)
- `POST /ab-test` — register and track A/B tests
- `GET /impact?reportId=X` — measure CTR/bounce delta after applied fix
