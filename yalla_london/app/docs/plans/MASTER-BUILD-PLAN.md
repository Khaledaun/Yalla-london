# Zenitha.Luxury — Master Build Plan

## Claude Code Session Prompt (Read Before Every Session)

**Version:** March 11, 2026 — v3.2 (Full cron chain + security audit applied)
**Platform:** Yalla London v1.0 + Zenitha Yachts
**Entity:** Zenitha.Luxury LLC (Delaware)
**Owner:** Khaled N. Aun, Founder

-----

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
1. Schema validation — every field exists in `prisma/schema.prisma`
1. Import verification — all paths resolve (canonical auth: `@/lib/admin-middleware`)
1. Data flow trace — producer → consumer → what fields does consumer expect?
1. Multi-site scoping — every query has `siteId` in WHERE clause

-----

## 1. STRATEGIC DIRECTION

### The Three Stages

**STAGE A: INFRASTRUCTURE COMPLETION (NOW)**
Complete, harden, and stabilize the entire engine. Fix every gap, fragility, and missing connection. The machine must be bulletproof before building on it.

**STAGE B: CAPABILITY BUILDING (NEXT — after Stage A is 100%)**
Enhance and complete the platform's creative, intelligence, and marketing capabilities. These power ALL sites, so they're built once on the shared engine before launching new sites.

8 workstreams (Khaled's priority order):

1. Design Engine — Finalize photo generation, video creation, social media content, viral video tools
1. PDF System — Complete PDF generator, template design, lead magnet management
1. Etsy Integration — Connect design system to Etsy storefront with AI-managed listings
1. Website Builder Enhancement — Encode all past errors/lessons so new sites build fast
1. Zenitha.Luxury Website — Portfolio/authority site for the umbrella company
1. Social Media & Email Marketing — Full integration across all platforms + email automation
1. Business Intelligence Layer — Partnership discovery, competitive intel, deal/opportunity finder, trend database that feeds content prompts
1. Dashboard Redesign — Better visibility, mobile-first, ADHD-friendly (not urgent)

**STAGE C: SITE BUILDING (LATER — after Stage B capabilities ready)**
Deploy and build new sites on the proven, fully-capable engine. Order:

1. Zenitha Yachts (already built — deploy only)
1. Zenitha.Luxury (umbrella company — curated, NOT auto-generated)
1. Arabaldives (Arabic-first Maldives)
1. Yalla Riviera, Yalla Istanbul, Yalla Thailand

**Why this sequence:** Stage A fixes the machine. Stage B gives the machine superpowers. Stage C uses the supercharged machine to build fast. Each new site benefits from ALL prior improvements.

### Cross-Stage Principle

Throughout ALL stages: keep cron jobs healthy, maintain automation, ensure multi-site functionality, and build continuous self-learning and self-healing into every system.

### The Building Skeleton Prompt (Stage C Reference)

When Stage C begins, every new site build MUST follow this skeleton based on lessons learned from building Yalla London and Zenitha Yachts:

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

-----

## 2. CURRENT PLATFORM STATUS (March 11, 2026)

### Live Metrics

- **80 pages indexed** by Google (209 not indexed — 9 different reasons)
- **34 clicks/day**, 1,557 impressions/day
- Top query at position 3.4
- Sitemap: 115 pages discovered, status "Success"
- Booking.com UK declined CJ affiliate (normal for new publishers — reapply at 500+ sessions/month)

### What's Working End-to-End ✅

Content pipeline (topics → 8-phase → reservoir → BlogPost bilingual with affiliates), pre-publication gate (16 checks), per-content-type quality gates, SEO agent (IndexNow ×3 engines), AI reliability (circuit breaker + last-defense + phase-aware budgets), AI cost tracking, cockpit mission control (7 tabs, mobile-first), departures board, per-page audit, cycle health analyzer (grade A-F), system health audit (47 checks), cache-first sitemap (<200ms), unified indexing status, crawl freshness validator, per-site activation controller, cron resilience (feature flags + alerting + rate limiting), named author profiles (E-E-A-T), title sanitization + cannibalization detection, content-auto-fix (orphan resolution, thin unpublish, duplicate detection, broken links, never-submitted catch-up), GEO optimization (all prompts + citability gate), CJ affiliate (9-phase hardened with SID tracking), GSC sync (per-day, no overcounting), aggregated report v2 (6-component scoring), topic diversification (60-70% general + 30-40% niche), `?lang=ar` → `/ar/` 301 redirect, URL-based language switcher, SEO URL hygiene (full audit clean), news pipeline (multi-site, budget-guarded), design system (98%, 13/13 components), website builder wizard (95%), Zenitha Yachts (68+ files, hermetically separated, built—pending deploy), login rate limiting (5/15min + exponential backoff), cookie consent banner (bilingual, 4 categories).

**Fragility Audit Rounds (Mar 11, 3 rounds, 27 fixes total):**
- **Round 1 (10 fixes):** Math.random()→crypto in task-runner, discovery-monitor standardized imports, select-runner dedup marker timing, content-auto-fix skip <2h articles, site-keywords hardcoded fallback, safeHtmlTruncate tag-breaking fix
- **Round 2 (10 fixes):** /api/sitemap/generate POST auth gap closed, 9 unbounded Prisma queries capped (indexing-summary ×3, content-strategy, dynamic-internal-linking, indexing-service ×3)
- **Round 3 (7 fixes):** affiliate inject query siteId+take:200, campaign-executor feature flag (wrong field names), campaign-executor onCronFailure hook, cron-feature-guard 4 new entries, analytics POST handler, shop/products siteId scoping
- **Security audit (Round 3):** 633+ admin routes auth-verified, 0 auth bypasses, 0 XSS, 0 info disclosure on public APIs, all dangerouslySetInnerHTML sanitized. Content pipeline 5/5 critical paths fully hardened. **Grade: A+ (Excellent)**
- **Cron chain audit (33 files):** 12/33 fully production-ready (all 8 checks pass), 2 fixed in Round 3 (campaign-executor, analytics), 19 unaudited (need 8-check rubric), 5 schedule collisions at `:00` minute, 6 orphan cron files not scheduled in vercel.json

### Known Gaps (Stage A — Fix Before Building)

|# |Gap                                                             |Severity|Phase|Status|
|--|----------------------------------------------------------------|--------|-----|------|
|1 |GA4 dashboard returns 0s (MCP works, need API wiring)           |MEDIUM  |A.1  |Open  |
|2 |Affiliate click tracking (no JS handler, model exists)          |MEDIUM  |A.1  |Open  |
|3 |Per-site OG images don't exist (code references `{slug}-og.jpg`)|MEDIUM  |A.1  |Open  |
|4 |~~Login rate limiting~~ (5/15min + exponential backoff)          |~~MEDIUM~~|~~A.1~~|**DONE**|
|5 |**CJ models lack siteId** (CjCommission, CjClickEvent, CjOffer) |**HIGH**|A.2  |Open  |
|6 |Arabic SSR (KG-032) — `/ar/` serves English HTML server-side    |MEDIUM  |A.2  |Open  |
|7 |Feature flags not wired to all runtime behavior                 |LOW     |A.2  |Open  |
|8 |Social media APIs (only Twitter auto-publish feasible)          |LOW     |A.3  |Open  |
|9 |~~Cookie consent banner~~ (bilingual, 4 categories, in layout)   |~~MEDIUM~~|~~A.3~~|**DONE**|
|10|16+ orphan Prisma models                                        |LOW     |A.4  |Open  |
|11|19 unaudited crons need 8-check rubric — see Cron Audit Table §7.1|MEDIUM  |A.2  |Open  |
|12|5 crons fire at `:00` (analytics, gsc-sync, seo-orch, seo-agent, content-gen)|MEDIUM|A.2|Open|
|13|6 orphan cron files not in vercel.json (content-freshness, daily-seo-audit, fact-verification, google-indexing, process-indexing-queue, seo-agent-intelligence)|LOW|A.4|Open|

-----

## 3. STAGE A: INFRASTRUCTURE COMPLETION PHASES

### Phase A.1: Revenue Visibility (CURRENT PRIORITY)

**Goal:** Khaled can see traffic and revenue on his phone.

|Task                    |What                                      |Existing (DO NOT rebuild)                 |
|------------------------|------------------------------------------|------------------------------------------|
|GA4 dashboard wiring    |GA4 Data API → cockpit panels             |MCP server works; ApiUsageLog tracks costs|
|Affiliate click tracking|JS click handler → AffiliateClick DB write|Model exists; CJ has SID tracking         |
|Revenue dashboard panel |Clicks, conversions, earnings per site    |Affiliate-HQ has 6 tabs                   |
|OG images               |5 branded social sharing images           |Path configured in root layout            |
|Login rate limiting     |DB/Redis throttle on admin login          |Rate limiting middleware exists (4 tiers) |

### Phase A.2: Multi-Site Hardening

**Goal:** Engine is safe for multiple active sites.

|Task                    |What                                                                     |Blocker?                |
|------------------------|-------------------------------------------------------------------------|------------------------|
|CJ schema migration     |Add siteId to CjCommission, CjClickEvent, CjOffer                       |**YES — blocks site #2**|
|Arabic SSR              |Server-render Arabic HTML at `/ar/` routes                               |Blocks Arabic SEO       |
|Feature flags completion|Wire remaining to runtime behavior                                        |No                      |
|Brand templates         |Templates for non-London sites                                           |No                      |
|Cron schedule stagger   |Move gsc-sync/:00→:05, seo-orch/:00→:10, content-gen/:00→:20 (keep analytics at :00)|No (pool risk)|
|Full cron audit         |Apply 8-check rubric to 19 unaudited crons (see §7.1 below)             |No (operational risk)   |
|Orphan cron cleanup     |6 files: content-freshness, daily-seo-audit, fact-verification, google-indexing, process-indexing-queue, seo-agent-intelligence — delete or schedule|No|

### Phase A.3: Compliance & Social

|Task                  |What                   |
|----------------------|-----------------------|
|Cookie consent banner |EU/UK legal requirement|
|GDPR deletion flow    |Data deletion endpoint |
|Twitter/X auto-publish|Wire API keys          |
|SendGrid integration  |Wire email campaigns   |

### Phase A.4: Cleanup

|Task                |What                         |
|--------------------|-----------------------------|
|Orphan Prisma models|Audit and remove 16+ unused  |
|Dead admin buttons  |Wire remaining non-functional|
|Test suite expansion|Cover all fragility patterns |

-----

## 4. STAGE B: CAPABILITY BUILDING (8 Workstreams)

**Guiding principles for ALL Stage B work:**

- Every feature must work across ALL sites (multi-site from day one)
- Every new cron must have: 53s budget guard, CRON_SECRET, checkCronEnabled(), CronJobLog
- Every new API route must have: withAdminAuth, siteId scoping, no empty catches
- Self-healing: systems detect their own failures and attempt recovery before alerting
- Self-learning: systems track what works (engagement, conversions, costs) and adjust

### B.1: Design Engine Enhancement

**Goal:** Full creative studio — AI-generated photos, videos, social content, viral videos. All multi-site branded.

|Component                   |Current State                                        |What to Build                                                                                           |
|----------------------------|-----------------------------------------------------|--------------------------------------------------------------------------------------------------------|
|Brand Provider              |✅ Working (all 6 sites)                              |No changes needed                                                                                       |
|Brand Kit Generator         |✅ Working (ZIP export)                               |No changes needed                                                                                       |
|Design Studio (Konva canvas)|✅ Working                                            |Add AI image generation (DALL-E/Midjourney API)                                                         |
|Media Picker                |✅ Working (Library/Upload/Unsplash)                  |Add AI-generated tab                                                                                    |
|SVG Exporter                |✅ Working                                            |No changes needed                                                                                       |
|Photo Generation            |❌ Not built                                          |AI prompt → branded photo with site colors/watermark                                                    |
|Video Templates             |✅ 2 templates (destination-highlight, hotel-showcase)|Add: viral short-form, social story, product showcase, before/after                                     |
|Render Engine (Remotion)    |✅ Working                                            |Add queue system (video render CANNOT run in Vercel 60s — needs external worker or Remotion Cloud)      |
|Social Content Generator    |✅ Scripter agent generates text                      |Add: image + text combos, carousel templates, story templates per platform                              |
|Viral Video Tools           |❌ Not built                                          |Trending format templates, hook library, caption overlay engine, multi-platform export (9:16, 1:1, 16:9)|

**CAUTION:** Video rendering CANNOT happen in Vercel functions. Options: Remotion Cloud ($), external worker on Railway/Render, or pre-render and cache. Plan for this before building.

**New cron needed:** `design-auto-generate` — auto-creates social assets when new article publishes (slot: 12:00 UTC)

### B.2: PDF System Completion

**Goal:** Professional PDF lead magnets for email capture, downloadable guides per site.

|Component              |Current State                     |What to Build                                                                                                    |
|-----------------------|----------------------------------|-----------------------------------------------------------------------------------------------------------------|
|HTML-to-PDF (Puppeteer)|✅ Working (lib/pdf/html-to-pdf.ts)|No changes needed                                                                                                |
|PdfGuide model         |✅ In Prisma schema                |Wire to admin UI                                                                                                 |
|PdfDownload model      |✅ In Prisma schema                |Wire to tracking                                                                                                 |
|PDF templates          |❌ Mock only                       |Design 5-7 templates: city guide, restaurant guide, itinerary, packing list, halal guide, yacht charter checklist|
|Template designer      |❌ Not built                       |Visual editor for non-technical template creation (drag-drop sections, brand colors auto-applied)                |
|Lead capture flow      |❌ Not built                       |Email gate → PDF download → subscriber list → email sequence                                                     |
|Per-site branding      |✅ Brand Provider supports it      |Auto-apply site colors/fonts/logo to all PDFs                                                                    |
|Admin management       |❌ PDF admin page exists but mock  |Wire CRUD to PdfGuide model, download analytics                                                                  |

**CAUTION:** Puppeteer on Vercel needs `@sparticuz/chromium`. Already wired in `lib/pdf/html-to-pdf.ts`.

### B.3: Etsy Integration

**Goal:** Sell digital travel products (printable guides, planners, wall art) generated by the design system, managed by AI.

|Component         |Current State                                         |What to Build                                                                      |
|------------------|------------------------------------------------------|-----------------------------------------------------------------------------------|
|Etsy API client   |❌ Not built (old etsy-sync cron was deleted as orphan)|NEW client: OAuth, listings CRUD, inventory sync                                   |
|Product generator |❌ Not built                                           |Design system → Etsy-ready product images (mockups, previews)                      |
|Listing management|❌ Not built                                           |AI writes titles, descriptions, tags optimized for Etsy SEO                        |
|Inventory sync    |❌ Not built                                           |Track sales, auto-replenish digital inventory, pricing optimization                |
|Admin page        |❌ Not built                                           |`/admin/etsy` — listings, sales, analytics, bulk actions                           |
|AI management     |❌ Not built                                           |Auto-optimize underperforming listings (title/tags/price A/B), seasonal adjustments|

**NOTE:** The old `etsy-sync` cron was deleted as an orphan. A NEW integration must be built from scratch — do not resurrect the old code.

**New cron needed:** `etsy-sync` — sync listings, sales, reviews (slot: 2:00 UTC)

### B.4: Website Builder Enhancement

**Goal:** Encode ALL lessons from building Yalla London and Zenitha Yachts so new sites build in hours, not weeks.

|Component                |Current State                           |What to Build                                                                                      |
|-------------------------|----------------------------------------|---------------------------------------------------------------------------------------------------|
|New-site wizard          |✅ 95% ready (8-step, creates DB records)|Add: auto-generate config/sites.ts entry, auto-update middleware.ts domain map                     |
|Site research integration|✅ 5/5 reports exist                     |Wizard pulls from research report to pre-fill prompts, keywords, affiliate partners                |
|Error knowledge base     |❌ Not built                             |Encode all 61 critical rules as automated checks that run during site build                        |
|Template library         |❌ Only Yalla London template            |Create site archetypes: travel blog, yacht platform, curated portfolio, e-commerce                 |
|Pre-flight checklist     |❌ Manual only                           |Automated: DNS check, SSL verify, sitemap test, IndexNow ping, sample content generation, SEO audit|
|Post-launch monitoring   |❌ Not built                             |First-48h watchdog: check cron health, content generation, indexing submission, error rates        |

### B.5: Zenitha.Luxury Website

**Goal:** Professional portfolio site establishing Zenitha.Luxury LLC as the parent brand. Authority builder for E-E-A-T.

|Aspect          |Decision                                                             |
|----------------|---------------------------------------------------------------------|
|Site type       |CURATED — hand-crafted content, NOT auto-generated                   |
|Content         |Company story, portfolio of sites, team, press, contact              |
|Content pipeline|EXCLUDED from all auto-generation crons                              |
|Design          |Premium, minimal, editorial (Condé Nast Traveller inspiration)       |
|Pages           |Home, About, Portfolio (all sites), Team, Press/Media, Contact, Legal|
|SEO value       |Organization schema, brand authority backlinks to all child sites    |
|Revenue         |None directly — authority/trust builder for the network              |

**CRITICAL:** zenitha.luxury must be EXCLUDED from: weekly-topics, daily-content-generate, trends-monitor, content-builder, content-selector, affiliate-injection, content-auto-fix. It gets its own curated content workflow.

### B.6: Social Media & Email Marketing Integration

**Goal:** Automated content distribution across social platforms + email nurture sequences.

|Component             |Current State                              |What to Build                                                       |
|----------------------|-------------------------------------------|--------------------------------------------------------------------|
|Social Calendar UI    |✅ Working (week/month view)                |No changes needed                                                   |
|Social Scheduler lib  |✅ Working (lib/social/scheduler.ts)        |No changes needed                                                   |
|Twitter/X auto-publish|✅ Code ready (needs API keys)              |Wire API keys, test, enable                                         |
|Instagram             |✅ Scheduled, ❌ no auto-publish             |Graph API integration (needs Meta app review, 6-8 weeks)            |
|TikTok                |✅ Scheduled, ❌ no auto-publish             |Manual workflow primary; explore TikTok Creator API                 |
|LinkedIn              |✅ Scheduled, ❌ no auto-publish             |Manual workflow primary; explore LinkedIn API                       |
|Email builder         |✅ Working (block-based, Outlook-compatible)|No changes needed                                                   |
|Email sender          |✅ Working (SMTP/Resend/SendGrid)           |Wire SendGrid API key                                               |
|Email campaigns       |✅ Admin page exists                        |Wire to real subscriber list + sequences                            |
|Subscriber management |❌ Basic only                               |Segmentation (by site, language, interest), opt-in forms on articles|
|Auto-post on publish  |❌ Not built                                |When BlogPost publishes → auto-create social posts for each platform|
|Email digest          |❌ Not built                                |Weekly digest of new articles per site to subscribers               |
|UTM tracking          |❌ Not built                                |Track which social posts / emails drive affiliate clicks            |

**New cron needed:** `email-digest` — weekly subscriber digest (slot: 14:00 UTC Sunday)

### B.7: Business Intelligence Layer

**Goal:** AI-powered intelligence system that finds partnerships, competitive opportunities, deals, and trends — feeds insights directly into content prompts and operational decisions.

|Component                |What It Does                                                                                                                                                   |
|-------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|
|Partnership Discovery    |Scans travel industry for potential affiliate partners, broker relationships, co-marketing opportunities. Ranks by commission rate, brand fit, audience overlap|
|Competitive Intelligence |Monitors competitor sites (content gaps, keyword rankings, new features, pricing changes). Identifies uncontested niches                                       |
|Deal & Opportunity Finder|Tracks seasonal deals, new hotel openings, event calendars, airline route launches. Feeds trending topics to content pipeline                                  |
|Trend Database           |Aggregates: Google Trends, social media trends, travel booking data, seasonal patterns. Per-destination, per-audience                                          |
|Informative Operations DB|Centralizes: revenue per article, cost per article, best-performing content types, optimal publish times, top-converting affiliate partners                    |
|Prompt Enrichment        |Feeds real data into content generation prompts: "Hotel X just opened in London" → topic proposal, "Summer halal food festival" → timely article               |
|Platform Intelligence    |Tracks per-platform performance: which social platform drives most affiliate clicks, which email subject lines get opens, which article formats convert        |

**New cron needed:** `intelligence-scan` — weekly scan across all modules (slot: 23:00 UTC Sunday)

### B.8: Dashboard Redesign (Not Urgent)

**Goal:** Better visibility, cleaner layout, faster decisions for ADHD mobile-first usage.

**Defer this until:** Stage B workstreams 1-7 are complete. The dashboard redesign should incorporate all new capabilities (design studio, Etsy, BI, email) into a coherent interface.

-----

## 5. STAGE C: SITE BUILDING

### Site Build Order

1. **Zenitha Yachts** — Already built (68+ files). Deploy only. Run Prisma migration.
1. **zenitha.luxury** — Built in Stage B.5 as capability work.
1. **Arabaldives** — Arabic-first Maldives. Needs Arabic SSR (Phase A.2) fixed first.
1. **Yalla Riviera** — French Riviera + yacht charters (20% commission). High-value.
1. **Yalla Istanbul** — Highest revenue ceiling per site research.
1. **Yalla Thailand** — Strong GCC travel pipeline, 40M+ annual tourists.

-----

## 6. CRITICAL ARCHITECTURE RULES (65 Total)

### Hard Rules (1-14)

|# |Rule                                                             |Consequence         |
|--|-----------------------------------------------------------------|--------------------|
|1 |BlogPost has NO `title` — use `title_en`/`title_ar`              |Prisma crash        |
|2 |BlogPost has NO `quality_score` — use `seo_score`                |Prisma crash        |
|3 |`title_ar`/`content_ar` are REQUIRED (non-nullable)              |Constraint violation|
|4 |Prisma `{ not: null }` invalid on required fields → `{ not: "" }`|Crash               |
|5 |Arabic ~2.5x token-dense; `maxTokens: 3500` min                  |Truncation          |
|6 |Auth import: `@/lib/admin-middleware` (NOT `@/lib/auth/admin`)   |Build failure       |
|7 |Safari needs `res.ok` before `res.json()`                        |Safari crash        |
|8 |`Promise.all` with 15+ queries kills PgBouncer                   |Pool exhaustion     |
|9 |`requireAdmin` return MUST be checked: `if (err) return err`     |Auth bypass         |
|10|GSC sync: `dimensions: ["page", "date"]` not `["page"]`          |~7x overcounting    |
|11|`[...new Set(array)]` → `[...new Set<string>(array)]`            |`unknown[]`         |
|12|`withPoolRetry<T>` needs explicit `as Array<{...}>`              |Type loss           |
|13|`Map` from nullable Prisma keys → type the Map explicitly        |`unknown` values    |
|14|Env vars: `INDEXNOW_KEY`, `GOOGLE_PAGESPEED_API_KEY`             |Key not found       |

### Pipeline Rules (15-27)

15: Assembly raw fallback at `attempts >= 2` (match phases.ts AND diagnostic-agent.ts). 16: Draft lifetime cap = 5 (higher = infinite loops). 17: Diagnostic-agent: reject at cap ≥5, don't reduce. 18: Sweeper never resets assembly timeout drafts. 19: Dedup: write marker BEFORE processing. 20: Marker closes on BOTH success AND failure. 21: Active count excludes 4h+ stuck drafts. 22: Authenticity check = WARNING not BLOCKER. 23: Citability (GEO) = WARNING-only. 24: Reservoir promotion = atomic claiming. 25: BlogPost.create + draft.update in $transaction. 26: Assembly budget = fresh Date.now() after AI call. 27: Campaign enhancer verifies article still published.

### SEO & Indexing Rules (28-37)

28: Topic mix 60-70% general + 30-40% niche. 29: Never force Arab angles on general topics. 30: All prompts need explicit mix ratios. 31: primaryKeywordsEN drives trends + dedup. 32: Related injectors check ALL CSS classes. 33: Pre-pub gate receives post-sanitized titles. 34: Cron schedules stagger 10+ min. 35: Never submit two sitemaps (www + non-www). 36: GSC removal is temporary — pair with 301. 37: Language switcher = `router.push`, not state.

### Affiliate Rules (38-43)

38: CJ API has no clicks data — track locally. 39: CJ rate limit 25/min. 40: `lookupAdvertisers({joined:true})` returns 0 for new accounts. 41: Coverage must match ALL injection patterns. 42: content-auto-fix skips articles with active campaigns. 43: FixAction requires `endpoint` not `url`.

### GEO Rules (44-47)

44: GEO in ALL prompts. 45: Citability = WARNING-only. 46: CJ joined filter returns 0 for new accounts. 47: `ALTER TABLE ADD COLUMN IF NOT EXISTS` for migrations.

### Multi-Site & URL Rules (48-56)

48: Every query MUST include siteId. 49: Use getSiteConfig(). 50: zenitha.luxury = CURATED, exclude from crons. 51: zenitha-yachts-med excluded from TopicProposal. 52: `?lang=ar` → `/ar/` prefix (legacy anti-pattern). 53: Arabic SSR required for hreflang. 54: Site wizard = DB only, config needs code deploy. 55: Social auto-publish = Twitter only. 56: Video rendering can't run in Vercel (60s).

### Operations Rules (57-61)

57: Diagnostic-agent inflates active count — exclude `[diagnostic-agent*]` drafts. 58: Crons at same minute fight for pool — stagger 15-30 min. 59: News admin passes siteId via `?site_id=`. 60: Social = manual copy-paste primary workflow. 61: Site wizard = DB records only, code deploy still needed. 62: `checkCronEnabled(jobName)` is THE standard for feature flag guards — never use manual Prisma queries against FeatureFlag (field names differ). 63: FeatureFlag schema has `name` + `enabled` fields — NOT `key` + `isActive`. 64: Every `bulkInjectAffiliates()` and similar bulk operations MUST accept and filter by siteId — unbounded cross-site queries are CRITICAL vulnerabilities. 65: All new crons MUST be added to `CRON_FLAG_MAP` in `lib/cron-feature-guard.ts`.

-----

## 7. CRON SCHEDULE

|Time        |Job                                   |
|------------|--------------------------------------|
|3:00        |Analytics sync                        |
|4:00 Mon    |Weekly topics                         |
|5:00        |Daily content                         |
|5:00 Sun    |SEO orchestrator (weekly)             |
|6:00        |Trends + SEO daily + London news      |
|7:00        |SEO agent run 1                       |
|7:30        |SEO cron daily                        |
|8:00 Sun    |SEO cron weekly                       |
|8:30        |Content builder + selector            |
|9:15        |Scheduled publish AM + Google indexing|
|9:25        |Affiliate injection                   |
|10:00       |Subscriber emails                     |
|11:00       |Verify indexing + content-auto-fix    |
|:00 every 2h|Diagnostic sweep                      |
|:15 every 2h|Schedule executor                     |
|13:00       |SEO agent run 2                       |
|16:15       |Scheduled publish PM                  |
|18:30       |Content-auto-fix-lite                 |
|20:00       |SEO agent run 3                       |
|22:00       |Site health check                     |

**Available:** 2:00, 12:00, 14:00-15:00, 17:00, 19:00, 21:00, 23:00

### 7.1 Cron Audit Status (33 route files — March 11, 2026)

**12 PRODUCTION-READY** (all 8 checks pass): affiliate-injection, analytics, content-auto-fix, content-auto-fix-lite, content-builder, content-builder-create, content-selector, daily-content-generate, diagnostic-sweep, seo-agent, trends-monitor, weekly-topics

**19 UNAUDITED** (need 8-check rubric applied):

|Cron File|In vercel.json?|Priority|
|---------|:---:|--------|
|scheduled-publish|✅|HIGH — publishes content|
|seo-orchestrator|✅|HIGH — weekly SEO sweep|
|sweeper|✅|HIGH — pipeline cleanup|
|seo-audit-runner|✅|MEDIUM|
|seo-deep-review|✅|MEDIUM|
|social|✅|MEDIUM|
|subscriber-emails|✅|MEDIUM|
|schedule-executor|✅|MEDIUM|
|site-health-check|✅|MEDIUM|
|gsc-sync|✅|MEDIUM|
|campaign-executor|✅|DONE (Round 3)|
|london-news|✅|LOW — already has checkCronEnabled|
|reserve-publisher|❌ orphan|LOW — assess if needed|
|verify-indexing|❌ orphan|LOW — assess if needed|
|content-freshness|❌ orphan|LOW — likely dead code|
|daily-seo-audit|❌ orphan|LOW — likely dead code|
|fact-verification|❌ orphan|LOW — likely dead code|
|google-indexing|❌ orphan|LOW — likely dead code|
|process-indexing-queue|❌ orphan|LOW — likely dead code|
|seo-agent-intelligence|❌ orphan|LOW — likely dead code|

**8-CHECK RUBRIC** (every cron must pass all 8):
1. Budget guard (`BUDGET_MS` + check before expensive ops)
2. Feature flag (`checkCronEnabled(jobName)`)
3. CRON_SECRET auth (allow if unset, reject if set+mismatched)
4. POST handler (for departures board "Do Now")
5. Dedup guard (check CronJobLog for recent run within 60s)
6. `logCronExecution()` on both success and failure
7. `onCronFailure()` in catch block (best-effort)
8. No empty catch blocks (all log with `[job-name]` context)

-----

## 8. KEY FILES

|File                                          |Purpose                                              |
|----------------------------------------------|-----------------------------------------------------|
|`config/sites.ts`                             |5+1 site configs + AI prompts + GEO                  |
|`lib/seo/standards.ts`                        |SEO thresholds — SINGLE SOURCE OF TRUTH (v2026-03-10)|
|`lib/seo/orchestrator/pre-publication-gate.ts`|16-check quality gate                                |
|`lib/content-pipeline/phases.ts`              |8-phase content pipeline                             |
|`lib/content-pipeline/select-runner.ts`       |Content selector (atomic + $transaction)             |
|`lib/ai/provider.ts`                          |AI provider + circuit breaker + cost tracking        |
|`lib/ops/diagnostic-agent.ts`                 |Auto-remediation (cap 5)                             |
|`lib/seo/indexing-summary.ts`                 |Unified indexing status                              |
|`lib/affiliate/cj-client.ts`                  |CJ API (rate limit 25/min)                           |
|`components/site-shell.tsx`                   |Hermetic site separation                             |
|`middleware.ts`                               |Multi-tenant + `?lang=ar` redirect                   |
|`prisma/schema.prisma`                        |103+ models                                          |
|`vercel.json`                                 |24+ crons (staggered)                                |
|`scripts/smoke-test.ts`                       |84+ tests                                            |

-----

## 9. OWNER CONTEXT

**Khaled N. Aun** — Non-technical, ADHD, iPhone-first, can't see terminal.

Dashboard = reality. Manual steps = won't happen. Business terms first. Status every response. Bad news first. Ship > perfect.

**Financial freedom is the goal.** Content → traffic → affiliate clicks → revenue.

**Current:** 80 indexed, 34 clicks/day, 1,557 impressions — early traction is real. Revenue visibility is #1 gap.

-----

*v3.2 — March 11, 2026 — 3 stages, 8 capability workstreams, 65 rules, 33 cron files (12 audited-ready), 16 pre-pub checks, 103+ models, security A+*
