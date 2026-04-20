# Chrome Bridge CHANGELOG

All changes to the Claude Chrome Bridge capabilities, versioned.

Format: `version` (ISO date + increment). Claude Chrome checks `bridgeVersion`
via `GET /capabilities` and re-loads PLAYBOOK.md when it changes.

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
