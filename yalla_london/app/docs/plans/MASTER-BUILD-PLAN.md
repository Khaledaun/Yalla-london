# Zenitha.Luxury — Master Build Plan

## Claude Code Session Prompt (Read Before Every Session)

**Version:** March 11, 2026 — v2.1
**Platform:** Yalla London v1.0 + Zenitha Yachts
**Entity:** Zenitha.Luxury LLC (Delaware)
**Owner:** Khaled N. Aun, Founder

---

## 0. MANDATORY BUILD CYCLE

Every change follows this cycle. No exceptions. No shortcuts.

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  PLAN   │ →  │  BUILD  │ →  │  AUDIT  │ →  │   LOG   │ →  │   FIX   │ →  │   LOG   │
│         │    │         │    │ (5 pass)│    │ CLAUDE  │    │ findings│    │ CLAUDE  │
│ Scope & │    │ Code &  │    │         │    │  .md    │    │         │    │  .md    │
│ impact  │    │ compile │    │         │    │         │    │         │    │         │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
                                  ↑                                            │
                                  └────────── REPEAT until 0 findings ─────────┘
```

**AUDIT means 5 parallel checks:**

1. TypeScript compilation — ZERO errors
2. Schema validation — every field exists in `prisma/schema.prisma`
3. Import verification — all paths resolve (canonical auth: `@/lib/admin-middleware`)
4. Data flow trace — producer → consumer → what fields does consumer expect?
5. Multi-site scoping — every query has `siteId` in WHERE clause

**Verification Tools (use these — they already exist):**

| Tool | Path | What It Tests |
|------|------|---------------|
| Smoke Tests | `npx tsx scripts/smoke-test.ts` | 99 tests / 16 categories |
| Cockpit Smoke | `npx tsx scripts/cockpit-smoke-test.ts` | 45 cockpit-specific tests |
| Test Connections | `public/test-connections.html` | 7 live API panels |
| System Health | `/api/admin/system-health-audit` | 47 checks / 12 sections |
| Cycle Health | `/api/admin/cycle-health` | Evidence-based diagnostics (grade A-F) |
| Aggregated Report | `/api/admin/aggregated-report` | 9-section composite report (6-component scoring) |
| Per-Page Audit | `/api/admin/per-page-audit` | Per-URL indexing + GSC data |
| Master Audit CLI | `npm run audit:master -- --site=yalla-london` | Full SEO audit engine |
| Audit Export | `/api/admin/audit-export` | JSON dump of all metrics |

---

## 1. STRATEGIC DIRECTION

### The Two Stages

**STAGE A: INFRASTRUCTURE COMPLETION (NOW)**
Complete, harden, and stabilize the entire engine. Fix every gap, every fragility, every missing connection. The machine must be bulletproof before we build new sites on it.

**STAGE B: SITE BUILDING (LATER — after Stage A is 100%)**
Build new sites on the proven engine. Order:

1. Zenitha Yachts (already built — deploy + Prisma migration)
2. Zenitha.Luxury (umbrella company site — curated, NOT auto-generated content)
3. Arabaldives (Arabic-first Maldives)
4. Yalla Riviera, Yalla Istanbul, Yalla Thailand

**Why this order matters:** Yachts is already built (68+ files). Zenitha.Luxury is the parent brand presence. Arabaldives tests the Arabic-first pipeline. The remaining three scale what's proven.

### The Building Skeleton Prompt (Stage B Reference)

When Stage B begins, every new site build MUST follow this skeleton based on lessons learned from building Yalla London and Zenitha Yachts:

```
NEW SITE BUILD SKELETON (use when Stage B starts)
═══════════════════════════════════════════════════

Pre-Build Checklist:
□ Site research report exists in docs/site-research/
□ Site config added to config/sites.ts (domain, siteId, prompts, keywords, affiliate partners)
□ Domain added to middleware.ts domain mappings (www + non-www)
□ Domain added to next.config.js (image remotePatterns + CORS origins)
□ Per-site OG image created at public/images/{slug}-og.jpg
□ Per-site branding folder at public/branding/{siteId}/
□ Site added to vercel.json rewrites (if needed)
□ DNS pointed to Vercel + domain added in Vercel dashboard
□ CJ schema has siteId fields (migration from Stage A Phase 2)

Build Phases (in order):
1. Database: Site record + SiteSettings + 30 seed TopicProposals
2. Brand: CSS custom properties file ({site}-tokens.css), brand kit via brand-provider.ts
3. Shell: SiteShell detection for site-specific header/footer (follow zenitha pattern)
4. Pages: Public pages with generateMetadata(), hreflang, canonical, JSON-LD
5. Admin: Site-specific admin pages (if needed — yacht pattern for complex sites)
6. SEO: llms.txt content, sitemap inclusion, IndexNow integration, audit config
7. Content: Verify pipeline generates content for new siteId, verify affiliate injection
8. Audit: 6-dimension audit (imports, APIs, Prisma, SEO, auth, siteId scoping)

Lessons Encoded:
- SiteShell pattern for hermetic separation (components/site-shell.tsx)
- CSS custom properties for design tokens, NOT Tailwind config changes
- All DB queries MUST include siteId — no exceptions
- Language switcher uses URL navigation (router.push), not React state
- Arabic routes need server-side rendering (not client-only rewrite)
- zenitha.luxury is CURATED — exclude from content pipeline crons
- zenitha-yachts-med is EXCLUDED from TopicProposal generation loop
- Video rendering CANNOT run in Vercel functions (60s timeout)
- Puppeteer PDF needs @sparticuz/chromium on Vercel
- New site wizard creates DB records but config/sites.ts still needs code update
- After build: run smoke tests, verify 0 TS errors, trace full data flow

Site-Specific Cautions:
- Zenitha Yachts: Already built (68+ files). Deploy only. Run Prisma migration.
- zenitha.luxury: Curated parent brand. EXCLUDE from ALL auto-generation crons.
- Arabaldives: Arabic-first. Needs Arabic SSR (KG-032) fixed first.
- Yalla Riviera: Yacht charter commissions (20% on $5K-50K) — high-value opportunity.
- Yalla Istanbul: Highest revenue ceiling per site research.
- Yalla Thailand: Strong GCC travel pipeline, 40M+ annual tourists.
```

---

## 2. CURRENT PLATFORM STATUS (March 11, 2026)

### Live Metrics

- **80 pages indexed** by Google (209 not indexed — 9 different reasons)
- **34 clicks/day**, 1,557 impressions/day
- Top query at position 3.4
- Sitemap: 115 pages discovered, status "Success"
- Booking.com UK declined CJ affiliate (normal for new publishers — reapply at 500+ sessions/month)

### What's Working End-to-End

Content pipeline (topics → 8-phase → reservoir → BlogPost bilingual with affiliates), pre-publication gate (16 checks), per-content-type quality gates, SEO agent (IndexNow ×3 engines), AI reliability (circuit breaker + last-defense + phase-aware budgets), AI cost tracking, cockpit mission control (7 tabs, mobile-first), departures board, per-page audit, cycle health analyzer (grade A-F), system health audit (47 checks), cache-first sitemap (<200ms), unified indexing status, crawl freshness validator, per-site activation controller, cron resilience (feature flags + alerting + rate limiting), named author profiles (E-E-A-T), title sanitization + cannibalization detection, content-auto-fix (orphan resolution, thin unpublish, duplicate detection, broken links, never-submitted catch-up), GEO optimization (all prompts + citability gate), CJ affiliate (9-phase hardened with SID tracking), GSC sync (per-day, no overcounting), aggregated report v2 (6-component scoring), topic diversification (60-70% general + 30-40% niche), `?lang=ar` → `/ar/` 301 redirect, URL-based language switcher, SEO URL hygiene (full audit clean), news pipeline (multi-site, budget-guarded), design system (98%, 13/13 components), website builder wizard (95%), Zenitha Yachts (68+ files, hermetically separated, built—pending deploy).

### Known Gaps (Stage A — Fix Before Building)

| # | Gap | Severity | Phase |
|---|-----|----------|-------|
| 1 | GA4 dashboard returns 0s (MCP works, need API wiring) | MEDIUM | A.1 |
| 2 | Affiliate click tracking (no JS handler, model exists) | MEDIUM | A.1 |
| 3 | Per-site OG images don't exist (code references `{slug}-og.jpg`) | MEDIUM | A.1 |
| 4 | Login rate limiting (no brute-force protection) | MEDIUM | A.1 |
| 5 | **CJ models lack siteId** (CjCommission, CjClickEvent, CjOffer) | **HIGH** | A.2 |
| 6 | Arabic SSR (KG-032) — `/ar/` serves English HTML server-side | MEDIUM | A.2 |
| 7 | Feature flags not wired to all runtime behavior | LOW | A.2 |
| 8 | Social media APIs (only Twitter auto-publish feasible) | LOW | A.3 |
| 9 | Cookie consent banner (EU legal) | MEDIUM | A.3 |
| 10 | 16+ orphan Prisma models | LOW | A.4 |

---

## 3. STAGE A: INFRASTRUCTURE COMPLETION PHASES

### Phase A.1: Revenue Visibility (CURRENT PRIORITY)

**Goal:** Khaled can see traffic and revenue on his phone.

| Task | What | Existing (DO NOT rebuild) | Verification |
|------|------|--------------------------|-------------|
| GA4 dashboard wiring | GA4 Data API → cockpit panels | MCP server works; `scripts/mcp-google-server.ts` | Cockpit Tab 1 shows real traffic numbers |
| Affiliate click tracking | JS click handler → AffiliateClick DB write | Model exists; CJ has SID tracking | `test-connections.html` Affiliate panel shows clicks |
| Revenue dashboard panel | Clicks, conversions, earnings per site | Affiliate-HQ has 6 tabs | `/admin/affiliate-hq` Revenue tab shows real data |
| OG images | 5 branded social sharing images | Path configured in root layout | Share URL on social → shows branded image |
| Login rate limiting | DB/Redis throttle on admin login | Rate limiting middleware exists (4 tiers) | `test-connections.html` auth panel + smoke test |

**Testability for Phase A.1:**
- GA4: `/api/admin/cockpit` returns non-zero `traffic.sessions` → cycle-health check detects "GA4 not connected" if 0
- Clicks: New smoke test verifying `AffiliateClick.create()` schema fields exist
- OG: `curl -I https://www.yalla-london.com/images/yalla-london-og.jpg` returns 200
- Rate limit: Smoke test verifying login endpoint returns 429 after N attempts

### Phase A.2: Multi-Site Hardening

**Goal:** Engine is safe for multiple active sites.

| Task | What | Blocker? | Verification |
|------|------|----------|-------------|
| CJ schema migration | Add siteId to CjCommission, CjClickEvent, CjOffer | **YES — blocks site #2** | `npx prisma validate` + smoke test for CJ siteId |
| Arabic SSR | Server-render Arabic HTML at `/ar/` routes | Blocks Arabic SEO | `curl https://www.yalla-london.com/ar/about` returns Arabic HTML |
| Feature flags completion | Wire remaining to runtime behavior | No | Feature flags page shows real toggle effects |
| Brand templates | Templates for non-London sites | No | `/api/admin/brand-kit?siteId=arabaldives` returns valid kit |
| Connection pool audit | Verify no cron collisions remain | No | 24h cron log shows 0 pool exhaustion errors |

### Phase A.3: Compliance & Social

| Task | What | Verification |
|------|------|-------------|
| Cookie consent banner | EU/UK legal requirement | All public pages show consent banner |
| GDPR deletion flow | Data deletion endpoint | POST `/api/admin/gdpr/delete` returns success |
| Twitter/X auto-publish | Wire API keys | Social calendar shows "Published" status after cron |
| SendGrid integration | Wire email campaigns | `/admin/cockpit` email center shows "Provider: Active" |

### Phase A.4: Cleanup

| Task | What | Verification |
|------|------|-------------|
| Orphan Prisma models | Audit and remove 16+ unused | `prisma/schema.prisma` model count reduced; smoke test passes |
| Dead admin buttons | Wire remaining non-functional | No `TODO` or `// not implemented` in admin page onClick handlers |
| Test suite expansion | Cover all fragility patterns | `npx tsx scripts/smoke-test.ts` → 120+ tests, 0 FAIL |

---

## 4. CRITICAL ARCHITECTURE RULES (61 Total)

### Hard Rules (1-14)

| # | Rule | Consequence |
|---|------|-------------|
| 1 | BlogPost has NO `title` — use `title_en`/`title_ar` | Prisma crash |
| 2 | BlogPost has NO `quality_score` — use `seo_score` | Prisma crash |
| 3 | `title_ar`/`content_ar` are REQUIRED (non-nullable) | Constraint violation |
| 4 | Prisma `{ not: null }` invalid on required fields → `{ not: "" }` | Crash |
| 5 | Arabic ~2.5x token-dense; `maxTokens: 3500` min | Truncation |
| 6 | Auth import: `@/lib/admin-middleware` (NOT `@/lib/auth/admin`) | Build failure |
| 7 | Safari needs `res.ok` before `res.json()` | Safari crash |
| 8 | `Promise.all` with 15+ queries kills PgBouncer | Pool exhaustion |
| 9 | `requireAdmin` return MUST be checked: `if (err) return err` | Auth bypass |
| 10 | GSC sync: `dimensions: ["page", "date"]` not `["page"]` | ~7x overcounting |
| 11 | `[...new Set(array)]` → `[...new Set<string>(array)]` | `unknown[]` |
| 12 | `withPoolRetry<T>` needs explicit `as Array<{...}>` | Type loss |
| 13 | `Map` from nullable Prisma keys → type the Map explicitly | `unknown` values |
| 14 | Env vars: `INDEXNOW_KEY`, `GOOGLE_PAGESPEED_API_KEY` | Key not found |

### Pipeline Rules (15-27)

15: Assembly raw fallback at `attempts >= 2` (match phases.ts AND diagnostic-agent.ts).
16: Draft lifetime cap = 5 (higher = infinite loops).
17: Diagnostic-agent: reject at cap ≥5, don't reduce.
18: Sweeper never resets assembly timeout drafts.
19: Dedup: write marker BEFORE processing.
20: Marker closes on BOTH success AND failure.
21: Active count excludes 4h+ stuck drafts.
22: Authenticity check = WARNING not BLOCKER.
23: Citability (GEO) = WARNING-only.
24: Reservoir promotion = atomic claiming.
25: BlogPost.create + draft.update in $transaction.
26: Assembly budget = fresh Date.now() after AI call.
27: Campaign enhancer verifies article still published.

### SEO & Indexing Rules (28-37)

28: Topic mix 60-70% general + 30-40% niche.
29: Never force Arab angles on general topics.
30: All prompts need explicit mix ratios.
31: primaryKeywordsEN drives trends + dedup.
32: Related injectors check ALL CSS classes.
33: Pre-pub gate receives post-sanitized titles.
34: Cron schedules stagger 10+ min.
35: Never submit two sitemaps (www + non-www).
36: GSC removal is temporary — pair with 301.
37: Language switcher = `router.push`, not state.

### Affiliate Rules (38-43)

38: CJ API has no clicks data — track locally.
39: CJ rate limit 25/min.
40: `lookupAdvertisers({joined:true})` returns 0 for new accounts.
41: Coverage must match ALL injection patterns.
42: content-auto-fix skips articles with active campaigns.
43: FixAction requires `endpoint` not `url`.

### GEO Rules (44-47)

44: GEO in ALL prompts.
45: Citability = WARNING-only.
46: CJ joined filter returns 0 for new accounts.
47: `ALTER TABLE ADD COLUMN IF NOT EXISTS` for migrations.

### Multi-Site & URL Rules (48-56)

48: Every query MUST include siteId.
49: Use getSiteConfig().
50: zenitha.luxury = CURATED, exclude from crons.
51: zenitha-yachts-med excluded from TopicProposal.
52: `?lang=ar` → `/ar/` prefix (legacy anti-pattern).
53: Arabic SSR required for hreflang.
54: Site wizard = DB only, config needs code deploy.
55: Social auto-publish = Twitter only.
56: Video rendering can't run in Vercel (60s).

### Operations Rules (57-61)

57: Diagnostic-agent inflates active count — exclude `[diagnostic-agent*]` drafts.
58: Crons at same minute fight for pool — stagger 15-30 min.
59: News admin passes siteId via `?site_id=`.
60: Social = manual copy-paste primary workflow.
61: Site wizard = DB records only, code deploy still needed.

---

## 5. CRON SCHEDULE

| Time | Job |
|------|-----|
| 3:00 | Analytics sync |
| 4:00 Mon | Weekly topics |
| 5:00 | Daily content |
| 5:00 Sun | SEO orchestrator (weekly) |
| 6:00 | Trends + SEO daily + London news |
| 7:00 | SEO agent run 1 |
| 7:30 | SEO cron daily |
| 8:00 Sun | SEO cron weekly |
| 8:30 | Content builder + selector |
| 9:15 | Scheduled publish AM + Google indexing |
| 9:25 | Affiliate injection |
| 10:00 | Subscriber emails |
| 11:00 | Verify indexing + content-auto-fix |
| :00 every 2h | Diagnostic sweep |
| :15 every 2h | Schedule executor |
| 13:00 | SEO agent run 2 |
| 16:15 | Scheduled publish PM |
| 18:30 | Content-auto-fix-lite |
| 20:00 | SEO agent run 3 |
| 22:00 | Site health check |

**Available slots:** 2:00, 12:00, 14:00-15:00, 17:00, 19:00, 21:00, 23:00

---

## 6. KEY FILES

| File | Purpose |
|------|---------|
| `config/sites.ts` | 5+1 site configs + AI prompts + GEO |
| `lib/seo/standards.ts` | SEO thresholds — SINGLE SOURCE OF TRUTH (v2026-03-10) |
| `lib/seo/orchestrator/pre-publication-gate.ts` | 16-check quality gate |
| `lib/content-pipeline/phases.ts` | 8-phase content pipeline |
| `lib/content-pipeline/select-runner.ts` | Content selector (atomic + $transaction) |
| `lib/ai/provider.ts` | AI provider + circuit breaker + cost tracking |
| `lib/ops/diagnostic-agent.ts` | Auto-remediation (cap 5) |
| `lib/seo/indexing-summary.ts` | Unified indexing status |
| `lib/affiliate/cj-client.ts` | CJ API (rate limit 25/min) |
| `components/site-shell.tsx` | Hermetic site separation |
| `middleware.ts` | Multi-tenant + `?lang=ar` redirect |
| `prisma/schema.prisma` | 103+ models |
| `vercel.json` | 24+ crons (staggered) |
| `scripts/smoke-test.ts` | 99+ tests |

---

## 7. OWNER CONTEXT

**Khaled N. Aun** — Non-technical, ADHD, iPhone-first, can't see terminal.

Dashboard = reality. Manual steps = won't happen. Business terms first. Status every response. Bad news first. Ship > perfect.

**Financial freedom is the goal.** Content → traffic → affiliate clicks → revenue.

**Current:** 80 indexed, 34 clicks/day, 1,557 impressions — early traction is real. Revenue visibility is #1 gap.

---

*v2.1 — March 11, 2026 — 61 rules, 24+ crons, 16 pre-pub checks, 103+ models*
