# Solidity & Trust: 4-Week Implementation Plan

Based on the audit report's framework: stop measuring by features built, start measuring by functions verified.

---

## Phase 0: Frozen Baseline (This Session)

### Task 0.1: Generate `BASELINE-REPORT.md`
Query the live DB via Prisma and produce exact counts:
- TopicProposals by status
- ArticleDrafts by phase (1-8 + reservoir)
- BlogPosts published (total + per siteId)
- Last successful cron run per job (from CronJobLog)
- URLIndexingStatus by status
- Average SEO score of published BlogPosts
- BlogPosts with score < 60
- Open Known Gaps count (from AUDIT-LOG.md)
- Smoke test score
- TypeScript errors: 0 (confirmed)

**Deliverable:** `docs/BASELINE-REPORT.md` with timestamped numbers

### Task 0.2: Dashboard Trust Audit
Scan every admin page and classify as:
- REAL DATA (shows DB-backed content)
- MOCK/DEAD (shows hardcoded, Math.random(), or placeholder data)

Add classification list to BASELINE-REPORT.md

---

## Phase 1: Test Infrastructure (Week 1-2)

### Task 1.1: Build `scripts/health-probe.ts`
HTTP-based API health checker that:
- Hits each critical API endpoint with real requests
- Validates response shape (not just status 200)
- Outputs a clear table: `[endpoint] → [expected] → [PASS/FAIL] → [actual]`
- Designed to run on every deploy

**Endpoints to probe (~25):**
- `GET /api/admin/cockpit` → pipeline + indexing + sites data
- `GET /api/admin/content-matrix` → articles list with gate status
- `GET /api/admin/ai-config` → provider status
- `GET /api/admin/departures` → cron schedule
- `GET /api/admin/cycle-health` → diagnostics
- `GET /api/admin/aggregated-report` → 9-section report
- `GET /api/admin/affiliate-hq` → revenue + partners
- `GET /api/admin/ai-costs` → token usage
- `GET /api/admin/content-indexing` → indexing status
- `GET /api/admin/feature-flags` → flags from DB
- `POST /api/admin/topic-research` → AI topic generation
- `GET /api/admin/seo-audit` → SEO health
- `GET /api/content/blog/[slug]` → published article shape
- `GET /api/yachts` → yacht listing
- All cron endpoints (GET, verify they respond without crashing)

### Task 1.2: Build `scripts/db-consistency.ts`
Database health checker that:
- Every BlogPost has valid siteId (not null, not "undefined")
- Every BlogPost has category_id
- No TopicProposal stuck in "generating" > 2 hours
- No ArticleDraft stuck in same phase > 48 hours
- No URLIndexingStatus with no corresponding BlogPost
- CronJobLog last 7 days: failure rate per cron (< 20% threshold)
- No duplicate BlogPost slugs within same siteId

**Output:** Phone-readable scorecard with emoji status indicators

### Task 1.3: Wire GA4 Dashboard API (KG-035)
The MCP bridge works (Claude Code can query GA4). But the cockpit API still returns 0s for traffic.
- Wire `fetchGA4Metrics()` into cockpit `buildTraffic()` with real data
- Add 7-day and 30-day session/user/pageview numbers
- Add top 5 pages by views
- Add traffic source breakdown

---

## Phase 2: Close Open Known Gaps (Week 2-3)

### Task 2.1: Kill Mock Data Pages (KG-045)
Audit and fix every admin page that shows fake data:
- Replace Math.random() metrics with real DB queries or honest empty states
- Replace hardcoded arrays with API fetches
- Show "No data yet" instead of fake numbers

### Task 2.2: Wire Dead Buttons (KG-046)
Fix all non-functional admin buttons:
- Article Create/Edit navigation
- Media View/Download handlers
- Upload buttons
- Any onClick={} or TODO handlers

### Task 2.3: Fix Broken Navigation (KG-047)
- Sidebar links to non-existent pages → either create page or mark `comingSoon: true`
- Verify every sidebar link resolves to a real page

### Task 2.4: Cron Failure Alerts (KG-036)
- Wire email notification on cron failure (sender already built: `lib/email/sender.ts`)
- 4-hour dedup cooldown (already in code, verify it works)
- Plain-English error message using `lib/error-interpreter.ts`

### Task 2.5: URL Hardcoding Cleanup (KG-021)
- Find and replace remaining ~30 hardcoded URL fallbacks
- All must use `getSiteDomain(getDefaultSiteId())` or `getBaseUrl()`

---

## Phase 3: 5-Chain Verification (Week 3-4)

### Task 3.1: Chain 1 — Content Machine
Manual end-to-end test:
1. Create 1 topic via admin
2. Trigger content-builder
3. Verify ArticleDraft advances through phases
4. Trigger select-runner
5. Verify pre-pub gate fires
6. Verify BlogPost created with status "published"
7. Verify visible at /blog/[slug]

Fix any breakage found. Document result.

### Task 3.2: Chain 2 — SEO & Indexing
1. Take published BlogPost from Chain 1
2. Verify URLIndexingStatus record exists
3. Trigger seo/cron
4. Verify status changes to "submitted"
5. Verify /api/indexnow-key returns key
6. Verify article appears in sitemap.xml

### Task 3.3: Chain 3 — Dashboard Reality
1. Open cockpit on mobile viewport
2. Verify article counts match DB
3. Verify indexing numbers match URLIndexingStatus
4. Verify all buttons work (Create, Publish, Re-queue)
5. Verify feature flags persist after refresh

### Task 3.4: Chain 4 — Affiliate Revenue Attribution
1. Open published article on live site
2. Verify affiliate links have correct UTM params
3. Verify SID tracking format: `{siteId}_{slug}`
4. Verify CjClickEvent records created on click

### Task 3.5: Chain 5 — Cron Automation (48h Unattended Test)
1. Record current counts
2. Wait 48 hours
3. Check CronJobLog for all 24 crons
4. Verify counts changed (new drafts/posts)
5. Verify no silent failures

---

## Phase 4: Operating Rules (Ongoing)

### Rule Implementation
1. **Single-scope sessions** — every future Claude Code session starts with one sentence: "Today I am verifying [X]"
2. **Definition of Done = test output** — health-probe PASS + db-consistency clean + visual confirmation
3. **No new features until KGs closed** — enforce via plan-registry.ts
4. **One fix per commit** — reference KG ID in commit message
5. **Cockpit = source of truth** — must show 100% real data before anything else gets built

---

## Success Criteria

| Week | Deliverable | Measurable Outcome |
|------|------------|-------------------|
| 1 | BASELINE-REPORT.md + health-probe.ts | Exact numbers documented. Probe runs. |
| 2 | db-consistency.ts + GA4 wired + mock data killed | Dashboard shows real traffic. Consistency check runs. |
| 3 | All KG items closed. Dead buttons fixed. | Cockpit 100% real data. 0 dead buttons. |
| 4 | All 5 chains verified PASS. 48h unattended test. | System operates without intervention. Full chain report. |

---

## Files to Create/Modify

| File | Action | Phase |
|------|--------|-------|
| `docs/BASELINE-REPORT.md` | CREATE | 0 |
| `scripts/health-probe.ts` | CREATE | 1 |
| `scripts/db-consistency.ts` | CREATE | 1 |
| `app/api/admin/cockpit/route.ts` | MODIFY (GA4 wiring) | 1 |
| Multiple admin pages | MODIFY (kill mock data) | 2 |
| Multiple admin pages | MODIFY (wire dead buttons) | 2 |
| `components/admin/mophy/mophy-admin-layout.tsx` | MODIFY (fix nav links) | 2 |
| `lib/email/sender.ts` + cron routes | MODIFY (failure alerts) | 2 |
| ~30 files with hardcoded URLs | MODIFY (dynamic fallbacks) | 2 |
| `docs/CHAIN-TEST-RESULTS.md` | CREATE | 3 |
