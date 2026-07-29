# Known Gaps & Fixes — Platform Knowledge Base

> Last updated: 2026-03-14 | Active gaps: 7 | Rules: 80 | Sessions analyzed: 25+ | Audits completed: 15+

## How This File Works

This file is the **CEO Agent's institutional memory** — a consolidated knowledge base extracted from the entire CLAUDE.md development history. It serves three purposes:

1. **Prevent regression** — every critical rule is a bug that was found and fixed. Breaking a rule means re-introducing that bug.
2. **Track unresolved work** — active gaps are the known issues that need attention before full production readiness.
3. **Accelerate onboarding** — any new session can read this file to understand what works, what doesn't, and what patterns to follow.

**Update protocol:** After every development session that introduces new rules, resolves gaps, or discovers new issues, update this file. The CLAUDE.md session history is the source of truth; this file is the distilled index.

---

## Active Known Gaps (Unresolved)

| ID | Area | Issue | Severity | Since | Notes |
|----|------|-------|----------|-------|-------|
| KG-020 | Schema | 31 orphan Prisma models never referenced in code | LOW | Feb 2026 | Documented, removal deferred — needs `prisma validate` in full env |
| KG-053 | Social | Engagement stats (likes, shares, reach) require platform API integration | LOW | Feb 2026 | Returns null honestly; manual copy-paste workflow for non-Twitter |
| KG-054 | Content | Hotels/experiences/recommendations pages have static hardcoded data, no affiliate tracking | MEDIUM | Feb 2026 | Not DB-driven yet |
| KG-055 | AI Providers | Gemini account frozen — re-add when billing reactivated | LOW | Mar 2026 | Provider removed from chain |
| KG-056 | AI Providers | Perplexity quota exhausted — re-add when replenished | LOW | Mar 2026 | Provider deactivated |
| KG-057 | Social | OAuth flow UI for self-service social account linking not built | MEDIUM | Mar 2026 | Currently requires API calls to link accounts |
| KG-058 | Content | Author profiles are AI-generated personas, not real humans | MEDIUM | Mar 2026 | `author-rotation.ts` uses TeamMember profiles; adequate for E-E-A-T but not ideal |

---

## Resolved Gaps (Reference)

| ID | Area | Issue | Fix Applied | Session |
|----|------|-------|-------------|---------|
| KG-019 | SEO | Duplicate IndexNow submission (seo-agent + seo/cron both submitted) | seo-agent discovers only; seo/cron submits with backoff | Feb 18 |
| KG-020 | Schema | PdfGuide/PdfDownload models missing from Prisma | Added 8 new models in design system migration | Feb 20 |
| KG-021 | Config | ~30 hardcoded URL fallbacks in API routes | Replaced with `getSiteDomain(getDefaultSiteId())` across 16+ files | Feb 18 |
| KG-022 | Config | 30+ hardcoded email addresses | Dynamic `hello@${domain}` from site config | Feb 18 |
| KG-023 | Security | XSS via dangerouslySetInnerHTML (9 public + 6 admin instances) | All wrapped with `sanitizeHtml()` / `sanitizeSvg()` | Feb 18 |
| KG-024 | Security | No rate limiting on admin login | 5 attempts/15min + progressive delays, 429 Retry-After | Mar 11 |
| KG-025 | Pipeline | Race conditions in topic claiming | Atomic `updateMany` + "generating" status | Feb 18 |
| KG-026 | Security | Missing CSP headers | False positive — already in next.config.js | Feb 18 |
| KG-027 | Design | Only Yalla London brand template | `getBrandProfile()` returns correct brand for all 6 sites | Mar 9 |
| KG-028 | Auth | CRON_SECRET bypass (crons failed when unset) | Standard pattern: allow if unset, reject only if set+mismatch | Feb 18 |
| KG-029 | Dead Code | daily-publish 280-line dead cron | Replaced with 55-line deprecation stub | Feb 18 |
| KG-030 | Pipeline | Build-runner processed only first active site | Now loops ALL active sites with per-site budget | Feb 18 |
| KG-031 | Multi-Site | Trends monitor only processed first site | Loops all active sites with per-site dedup | Feb 18 |
| KG-032 | SEO | No Arabic SSR — hreflang mismatch | `serverLocale` prop on BlogPostClient; SSR now returns Arabic HTML | Mar 11 |
| KG-033 | Content | Related articles were static-only | DB query + static merged; DB results prioritized | Feb 18 |
| KG-034 | Affiliates | Affiliate injection London-only | Per-site destination URLs for all 5 sites | Feb 18 |
| KG-035 | Dashboard | GA4 not connected (dashboard returned 0s) | `buildTraffic()` calls `fetchGA4Metrics()`, MCP bridge functional | Mar 9 |
| KG-036 | Dashboard | No cron failure alerts | Email on failure with error interpretation, 4h dedup cooldown | Mar 6 |
| KG-037 | Pipeline | Scheduled-publish POST bypassed quality gate | Full pre-publication gate added, fail-closed | Feb 18 |
| KG-038 | SEO | IndexNow 24h window too short | Extended to 7 days | Feb 18 |
| KG-039 | Multi-Site | Blog slug globally unique (cross-site collision) | Queries scoped by siteId | Feb 18 |
| KG-040 | Security | Unauthenticated database routes | `requireAdmin` on all 7 handlers | Feb 18 |
| KG-041 | Security | Admin setup password reset bypass | 403 when admin already exists | Feb 18 |
| KG-042 | Security | 7 public mutation APIs | `requireAdmin` on all | Feb 18 |
| KG-043 | Observability | 34 empty catch blocks | Central + per-file logging with module tags | Feb 18 |
| KG-044 | SEO | Static metadata URLs on 5 pages | `generateMetadata()` + `getBaseUrl()` | Feb 18 |
| KG-045 | Dashboard | 13+ admin pages showed mock/fake data | Purged across multiple audit rounds | Feb-Mar |
| KG-046 | Dashboard | 14+ admin buttons were dead (no handlers) | All wired with onClick handlers | Feb-Mar |
| KG-047 | Navigation | Broken sidebar links to nonexistent pages | Fixed or marked `comingSoon: true` | Mar 11 |
| KG-048 | Security | Analytics API exposed raw credentials | Replaced with boolean `_configured` indicators | Feb 18 |
| KG-049 | Pipeline | content-generator.ts crash (missing category_id) | Find-or-create default "General" category | Feb 18 |
| KG-050 | Security | 4 remaining XSS vectors | Sanitized with `sanitizeHtml()`/`sanitizeSvg()` | Feb 18 |
| KG-051 | Data | Math.random() fake metrics in 3 places | Eliminated; replaced with real data or zero defaults | Feb 18 |
| KG-052 | SEO | Meta description min mismatch (70 vs 120) | Aligned gate to 120 chars matching standards.ts | Feb 20 |
| CJ-001 | Affiliates | CJ models had no siteId field | Added siteId to CjCommission, CjClickEvent, CjOffer + backfill | Mar 11 |
| GSC-001 | Analytics | GSC numbers ~7x overcounted | Changed to per-day storage with `dimensions: ["page", "date"]` | Mar 9 |

---

## Critical Rules (Must-Follow Patterns)

### Infrastructure Rules (1-27)

| # | Rule | One-Line Summary |
|---|------|-----------------|
| 1 | BlogPost has no `title` field | Always use `title_en`/`title_ar`; never `select: { title: true }` on BlogPost |
| 2 | BlogPost has no `quality_score` | Use `seo_score`; `quality_score` exists only on ArticleDraft |
| 3 | Prisma null comparisons on required fields crash | Use `{ not: "" }` not `{ not: null }` on non-nullable String fields |
| 4 | BlogPost `title_ar`/`content_ar` are required | Always provide fallback values (English text); never send `null` |
| 5 | Arabic text is ~2.5x more token-dense | Use `maxTokens: 3500` minimum for Arabic content generation |
| 6 | Assembly needs raw fallback after first timeout | `attempts>=1` triggers instant HTML concatenation instead of AI call |
| 7 | Content-builder dedup: write marker BEFORE processing | Act-then-check prevents duplicate Vercel invocations |
| 8 | Sweeper must never reset assembly timeout drafts | Resetting undoes raw fallback protection |
| 9 | Dashboard builders must run sequentially | `Promise.all` with 15+ queries exhausts Supabase PgBouncer pool |
| 10 | Canonical auth import: `@/lib/admin-middleware` | Never use `@/lib/auth/admin` — it does not exist |
| 11 | PageSpeed env var: `GOOGLE_PAGESPEED_API_KEY` | Always include alongside `PAGESPEED_API_KEY` and `PSI_API_KEY` |
| 12 | Safari requires `res.ok` before `res.json()` | Safari throws on non-JSON error responses |
| 13 | Circuit breaker: 3 failures, 5-min cooldown | Don't retry dead providers; half-open probe after cooldown |
| 14 | Dedup marker must close on BOTH success AND failure | Unclosed markers cause false failure rate inflation |
| 15 | Cron feature flag guard: `checkCronEnabled(jobName)` | Reads FeatureFlag DB table; disables crons without code deploy |
| 16 | IndexNow submits to 3 engines independently | Bing, Yandex, api.indexnow.org — one failure doesn't block others |
| 17 | `cleanTitle()` must run on ALL BlogPost creation paths | Prevents slug-style titles from reaching production |
| 18 | Map from Prisma with nullable keys: type explicitly | TypeScript infers `unknown`; filter null keys or type the Map |
| 19 | GSC sync: `dimensions: ["page", "date"]` | `["page"]` alone causes ~7x overcounting via aggregated totals |
| 20 | `withPoolRetry<T>` loses type inference | Add explicit `as Array<{...}>` type assertion at call sites |
| 21 | `[...new Set(array)]` returns `unknown[]` | Use `[...new Set<string>(array)]` with explicit generic |
| 22 | `ensureUrlTracked()` must track Arabic `/ar/` variants | Arabic URLs only discovered at daily sync if not tracked on publish |
| 23 | Authenticity check: WARNING not BLOCKER | AI content rarely has 3+ first-hand signals; publish first, enhance later |
| 24 | Draft lifetime cap is 5 (not 8) | Higher cap caused infinite loops with diagnostic-agent resurrection |
| 25 | Diagnostic-agent must NOT reduce attempts past cap | If `phase_attempts >= 5`, reject — don't reduce by 2 |
| 26 | Active draft count excludes stuck drafts (4h window) | Stuck drafts don't count against 2-active-draft limit |
| 27 | Campaign prompts: 6K chars max, 4500 maxTokens | Larger prompts cause all providers to timeout |

### Pipeline Rules (28-38)

| # | Rule | One-Line Summary |
|---|------|-----------------|
| 28 | Reservoir promotion: atomic claiming with `updateMany` | Prevents duplicate BlogPosts from concurrent content-selector runs |
| 29 | BlogPost.create + ArticleDraft.update: use `$transaction` | Crash between operations orphans data; transaction ensures atomicity |
| 30 | All recovery handlers: check lifetime cap FIRST | Resetting to 0 defeats the cap; check `>= 5` before ANY reduction |
| 31 | Assembly raw fallback: `>= 2` everywhere | `phases.ts` checks `>= 2`; diagnostic-agent must match |
| 32 | Related section injectors: check ALL CSS classes | Both `"related-articles"` AND `"related-link"` — prevent duplicate sections |
| 33 | Pre-pub gate receives post-sanitized titles | `cleanTitle()` can strip to empty; gate must check what will be stored |
| 34 | Campaign enhancer: verify article still published | Content-auto-fix may unpublish between campaign creation and execution |
| 35 | Content-auto-fix: skip articles with active campaigns | Query `CampaignItem` before unpublishing to avoid conflicts |
| 36 | Cron schedules: stagger by 10+ minutes | Simultaneous crons cause BlogPost record collisions |
| 37 | Assembly budget: recalculate after AI call | Use `Date.now() - phaseStart` for fresh budget, not stale input value |
| 38 | Content-selector: dedup guard via CronJobLog (60s) | Vercel can invoke the same cron endpoint twice simultaneously |

### Security Rules (39-43, 79-80)

| # | Rule | One-Line Summary |
|---|------|-----------------|
| 39 | `requireAdmin` return MUST be checked | `const authError = await requireAdmin(req); if (authError) return authError;` |
| 40 | Coverage detection: match ALL injection patterns | Check `affiliate-recommendation`, `rel="sponsored"`, `affiliate-cta-block`, `data-affiliate-id` |
| 41 | CJ API does NOT provide clicks/impressions | Track clicks locally via `CjClickEvent`; never query CJ for click data |
| 42 | `FixAction` requires `endpoint`, `payload`, `label`, `description` | Match exact type definition in cycle-health/route.ts |
| 43 | CJ API rate limit: 25 req/min | Use rate limiter in `cj-client.ts`; circuit breaker after 3 failures |
| 79 | Verify routes are in deployed Next.js app directory | Security tools may surface files in artifact/build directories |
| 80 | Feature flags and rate limiters are NOT auth substitutes | `requireAdmin()` must be FIRST guard — before flags, before rate limiting |

### SEO/AIO/GEO Rules (44-56)

| # | Rule | One-Line Summary |
|---|------|-----------------|
| 44 | GEO directives in ALL content generation prompts | sites.ts, phases.ts, enhance-runner.ts, article-enhancer.ts, scripter.ts |
| 45 | Citability check: WARNING-only | Never block publication for low citability; AI can't add real statistics |
| 46 | CJ `lookupAdvertisers({ joined: true })`: 0 for new accounts | Fetch all statuses and classify locally |
| 47 | `ALTER TABLE ADD COLUMN IF NOT EXISTS` for migrations | `CREATE TABLE IF NOT EXISTS` skips existing tables; columns need ALTER |
| 48 | Topic mix: 60-70% general + 30-40% niche | General luxury keywords have 10-50x more search volume |
| 49 | Never force Arab/Islamic angles on general topics | Universal guide that mentions halal options, not Arab-specific framing |
| 50 | All topic prompts: include explicit mix ratios | AI defaults to most specific angle without "3-4 general, 1-2 niche" |
| 51 | primaryKeywordsEN drives trends monitoring AND dedup | Expanding from 4 to 12 keywords broadens market signal tracking |
| 52 | Never submit two sitemaps for www and non-www | Confuses Google about canonical domain |
| 53 | GSC URL removal is temporary (~6 months) | Always pair with permanent 301 redirect in code |
| 54 | Language switchers must change the URL | `router.push('/ar/path')` not `setLanguage('ar')`; Google can't see state |
| 55 | `?lang=ar` is a legacy anti-pattern | Correct pattern is `/ar/` URL prefix; redirect any `?lang=` URLs |
| 56 | Arabic SSR required for hreflang compliance | Server must return Arabic HTML based on `x-locale` header |

### Multi-Site & Compliance Rules (57-78)

| # | Rule | One-Line Summary |
|---|------|-----------------|
| 57 | Diagnostic-agent `updated_at` inflates active count | Exclude drafts with `[diagnostic-agent*]` or `MAX_RECOVERIES_EXCEEDED` |
| 58 | Crons at same minute: connection pool conflict | Stagger by 15-30 minutes; `:00`, `:15`, `:30` pattern |
| 59 | News admin: pass siteId via `?site_id=` query param | Matches cockpit pattern; not `x-site-id` header |
| 60 | Social auto-publish: only Twitter/X possible | Instagram/TikTok/LinkedIn require months-long app review |
| 61 | New site wizard: DB only, still needs code deploy | `config/sites.ts`, `middleware.ts`, Vercel domain, DNS all manual |
| 62 | Every testType needs matching function in live-tests.ts | Missing functions cause "test not found" in Development Monitor |
| 63 | Built feature tests: verify real code patterns | Future feature tests: check prerequisites, return readiness 0-70 |
| 64 | `OR: [{ siteId }, { siteId: null }]` for backward compat | Includes both scoped records AND legacy unscoped records |
| 65 | Arabic SSR: `serverLocale` prop, not just headers | Client components don't see headers; server passes prop |
| 66 | GDPR: TWO distinct deletion endpoints | `/api/admin/gdpr` (admin auth) vs `/api/gdpr/delete` (public, email-based) |
| 67 | Twitter: exactly 4 env vars | `TWITTER_API_KEY`, `_SECRET`, `_ACCESS_TOKEN`, `_ACCESS_TOKEN_SECRET` |
| 68 | CJ siteId backfill uses SPLIT_PART | SID format `{siteId}_{slug}`; extracts siteId from sessionId |
| 69 | Smoke test count is official metric | Track in plan-registry.ts; currently 131 tests across 29 categories |
| 70 | Verify Prisma field names against schema.prisma | `metadata` vs `details`, `contactEmail` vs `email` cause silent crashes |
| 71 | GDPR catch blocks: especially dangerous if empty | Silent failure = reports success while data remains = compliance violation |
| 72 | Function accepts param but doesn't wire it: trace to storage | `runDealDiscovery(siteId?)` accepted but never stored = dead param |
| 73 | `hasSubstantiveContent`: check BOTH languages with OR | noindex on English URL can suppress Arabic hreflang pair |
| 74 | `buildRevenue()`: must include siteId scoping | Revenue data is most sensitive cross-site leak |
| 75 | GDPR: dynamic per-site contact information | Never hardcode one site's email in a platform-wide endpoint |
| 76 | Check vercel.json for cron conflicts before adding | Minimum 5-minute stagger between heavy DB-writing crons |
| 77 | `comingSoon: true` without `href` prevents 404s | Renders as non-clickable div; avoids 404 while surfacing feature |
| 78 | `new Set(array)`: include explicit generic | `new Set<string>(array)` preserves type safety on `.has()` |

---

## Anti-Patterns Registry

| Pattern | Why It's Bad | Correct Alternative |
|---------|-------------|-------------------|
| `catch {}` (empty catch block) | Silent failures invisible to dashboard owner; GDPR violations if deletion fails silently | `catch (err) { console.warn("[module-name] failed:", err.message) }` |
| `@/lib/prisma` import | Non-canonical path; some files had wrong path | `const { prisma } = await import("@/lib/db")` |
| `@/lib/auth/admin` import | Path does not exist; causes build failures | `import { requireAdmin } from "@/lib/admin-middleware"` |
| `{ not: null }` on required Prisma field | Crashes at runtime on non-nullable String fields | `{ not: "" }` for required String fields |
| `select: { title: true }` on BlogPost | Field doesn't exist; Prisma runtime crash | `select: { title_en: true }` (or `title_ar`) |
| `Promise.all` for 15+ DB queries | Exhausts Supabase PgBouncer connection pool | Serialize dashboard builders; sequential for-loop |
| `Math.random()` for IDs or fake data | Insecure IDs; misleading metrics shown to owner | `crypto.getRandomValues()` / `crypto.randomUUID()`; show real data or empty state |
| Hardcoded `"yalla-london"` siteId | Breaks multi-site; returns wrong data for other sites | `getDefaultSiteId()` from `config/sites.ts` |
| Hardcoded `"yalla-london.com"` domain | Wrong canonical URLs for other sites | `getSiteDomain(siteId)` or `getBaseUrl()` |
| `requireAdmin(request)` without checking return | Auth bypass — unauthenticated users access admin routes | `const authError = await requireAdmin(req); if (authError) return authError;` |
| `dangerouslySetInnerHTML` without sanitization | XSS vulnerability in public and admin pages | Wrap with `sanitizeHtml()` from `@/lib/html-sanitizer` |
| Assembly retry without raw fallback | Infinite timeout loop; draft never completes | After `attempts >= 2`, use raw HTML concatenation (instant) |
| `setLanguage('ar')` for language switching | URL doesn't change; Google can't discover Arabic pages | `router.push('/ar/path')` — URL-based navigation |
| `dimensions: ["page"]` in GSC sync | Returns 7-day aggregated totals; ~7x overcounting | `dimensions: ["page", "date"]` for per-day breakdowns |
| Global CJ revenue queries (no siteId filter) | Cross-site financial data leakage | `OR: [{ siteId: { in: activeSiteIds } }, { siteId: null }]` |
| Authenticity signals as BLOCKER in pre-pub gate | AI content never has 3+ first-hand signals; blocks ALL publishing | WARNING severity; campaign enhancer adds signals post-publish |

---

## Platform Capabilities Map

### Content Pipeline (PRODUCTION)

| Capability | Status | Key Files | KPI Impact |
|-----------|--------|-----------|------------|
| Topic Generation (Weekly + Trends) | Production | `api/cron/weekly-topics`, `api/cron/trends-monitor` | Content velocity |
| 8-Phase Article Builder | Production | `lib/content-pipeline/phases.ts`, `api/cron/content-builder-create` | Content velocity |
| Content Selector (Reservoir to BlogPost) | Production | `lib/content-pipeline/select-runner.ts` | Indexed pages |
| 16-Check Pre-Publication Gate | Production | `lib/seo/orchestrator/pre-publication-gate.ts` | Content quality |
| Per-Content-Type Quality Gates | Production | `lib/seo/standards.ts` (CONTENT_TYPE_THRESHOLDS) | Quality enforcement |
| Content Auto-Fix (14 sections) | Production | `api/cron/content-auto-fix`, `api/cron/content-auto-fix-lite` | Automated remediation |
| Diagnostic Agent (every 2h) | Production | `lib/ops/diagnostic-agent.ts` | Stuck draft recovery |
| Title Sanitization + Cannibalization | Production | `lib/content-pipeline/select-runner.ts` (cleanTitle, Jaccard) | Duplicate prevention |
| AI Circuit Breaker + Last Defense | Production | `lib/ai/provider.ts`, `lib/ai/last-defense.ts` | Pipeline resilience |
| AI Cost Tracking (all providers) | Production | `lib/ai/provider.ts` (logUsage), `api/admin/ai-costs` | Cost visibility |
| Campaign Enhancement System | Production | `lib/campaigns/article-enhancer.ts`, `lib/campaigns/campaign-runner.ts` | Post-publish quality |
| Named Author Profiles (E-E-A-T) | Production | `lib/content-pipeline/author-rotation.ts` | E-E-A-T compliance |

### SEO & Indexing (PRODUCTION)

| Capability | Status | Key Files | KPI Impact |
|-----------|--------|-----------|------------|
| IndexNow Multi-Engine (Bing, Yandex, Registry) | Production | `lib/seo/indexing-service.ts` | Indexed pages |
| Schema Injection (Article, Product, Place, etc.) | Production | `lib/seo/schema-injector.ts` | Rich results |
| SEO Agent (3x daily) | Production | `api/cron/seo-agent` | Meta optimization |
| GSC Sync (per-day storage) | Production | `api/cron/gsc-sync` | Analytics accuracy |
| Cache-First Sitemap (<200ms) | Production | `lib/sitemap-cache.ts` | Crawl efficiency |
| Unified Indexing Status | Production | `lib/seo/indexing-summary.ts` | Status accuracy |
| Master Audit Engine (CLI) | Production | `lib/master-audit/index.ts`, `scripts/master-audit.ts` | SEO health monitoring |
| Weekly Policy Monitor | Production | `scripts/weekly-policy-monitor.ts` | Standards compliance |
| Crawl Freshness Validator | Production | `lib/master-audit/validators/crawl-freshness.ts` | Stale crawl detection |
| GEO / Citability Optimization | Production | Check 16 in pre-pub gate; GEO directives in all prompts | AI search visibility |
| Arabic SSR (hreflang compliant) | Production | `serverLocale` prop in BlogPostClient | Arabic SEO |

### Dashboard & Admin (PRODUCTION)

| Capability | Status | Key Files | KPI Impact |
|-----------|--------|-----------|------------|
| Cockpit (7 tabs, mobile-first) | Production | `app/admin/cockpit/page.tsx` | Owner visibility |
| Departures Board | Production | `app/admin/departures` | Cron monitoring |
| Cycle Health Analyzer (17 checks) | Production | `api/admin/cycle-health` | Evidence-based diagnostics |
| Per-Page Audit | Production | `api/admin/per-page-audit` | Page-level SEO |
| Aggregated Report v2 (6-component scoring) | Production | `api/admin/aggregated-report` | Overall health grade |
| Affiliate HQ (6 tabs) | Production | `app/admin/affiliate-hq` | Revenue visibility |
| AI Cost Dashboard | Production | `app/admin/ai-costs` | Budget control |
| Action Logging | Production | `api/admin/action-logs` | Audit trail |
| Error Interpreter | Production | `lib/error-interpreter.ts` | Plain English errors |

### Affiliate Integration (PRODUCTION)

| Capability | Status | Key Files | KPI Impact |
|-----------|--------|-----------|------------|
| CJ Client + Circuit Breaker | Production | `lib/affiliate/cj-client.ts` | Revenue |
| SID Revenue Attribution | Production | `lib/affiliate/link-tracker.ts` | Per-article revenue |
| Affiliate Injection (per-site) | Production | `api/cron/affiliate-injection` | Link coverage |
| Deal Discovery (per-site) | Production | `lib/affiliate/deal-discovery.ts` | Offer freshness |
| Commission Sync | Production | `lib/affiliate/cj-sync.ts` | Revenue tracking |
| MCP CJ Server (7 tools) | Production | `scripts/mcp-cj-server.ts` | Claude Code access |

### Design System (BUILT — 98% READY)

| Capability | Status | Key Files | KPI Impact |
|-----------|--------|-----------|------------|
| Brand Provider (all 6 sites) | Built | `lib/design/brand-provider.ts` | Brand consistency |
| Email Builder + Sender (3 providers) | Built | `lib/email/sender.ts`, `lib/email/renderer.ts` | Email marketing |
| PDF Generation (Puppeteer) | Built | `lib/pdf/html-to-pdf.ts` | Lead generation |
| Video Studio (Remotion, 2 templates) | Built | `lib/video/render-engine.ts` | Social content |
| 4-Agent Content Engine | Built | `lib/content-engine/researcher.ts` + ideator + scripter + analyst | Content ideation |
| Brand Kit Generator (ZIP export) | Built | `lib/design/brand-kit-generator.ts` | Brand assets |
| Social Calendar | Built | `app/admin/social-calendar` | Social scheduling |

### Zenitha Yachts (BUILT — PENDING DEPLOY)

| Capability | Status | Key Files | KPI Impact |
|-----------|--------|-----------|------------|
| 8 Prisma Models + 8 Enums | Built | `prisma/schema.prisma` | Data layer |
| 14 Public Pages (search, detail, planner) | Built | `app/yachts/`, `app/destinations/`, `app/itineraries/` | Traffic |
| 11 Admin Pages + 7 API Routes | Built | `app/admin/yachts/`, `api/admin/yachts/` | Fleet management |
| SEO Compliance (JSON-LD, metadata, hreflang) | Built | All `[slug]` pages | Search visibility |
| Hermetic Site Shell | Built | `components/site-shell.tsx` | Site isolation |

### Infrastructure (PRODUCTION)

| Capability | Status | Key Files | KPI Impact |
|-----------|--------|-----------|------------|
| Multi-Tenant Middleware | Production | `middleware.ts` | Site routing |
| Cron Resilience (feature flags + alerting) | Production | `lib/cron-feature-guard.ts`, `lib/ops/failure-hooks.ts` | Uptime |
| Per-Site Activation Controller | Production | `api/admin/site-settings` | Site configuration |
| Rate Limiting (4 tiers) | Production | Middleware layer | Security |
| GDPR Compliance (2 endpoints) | Production | `api/gdpr/delete`, `api/admin/gdpr` | Legal compliance |
| Cookie Consent (bilingual) | Production | `CookieConsentBanner` in `app/layout.tsx` | GDPR |
| New Site Wizard (8 steps) | Production | `app/admin/cockpit/new-site` | Site creation |
| MCP Google Server (8 tools) | Production | `scripts/mcp-google-server.ts` | Analytics access |

### Planned (NOT BUILT)

| Capability | Status | Key Files | KPI Impact |
|-----------|--------|-----------|------------|
| Instagram/TikTok/LinkedIn Auto-Publish | Planned | N/A — API restrictions | Social reach |
| Engagement Metrics (likes, shares, reach) | Planned | N/A — platform APIs needed | Social analytics |
| E-Commerce (Stripe, Etsy) | Planned | Models exist, no endpoints | Revenue diversification |
| AI Image Generation | Planned | Canvas editor exists, no AI gen | Visual content |
| Zenitha.Luxury Parent Brand | Planned | N/A — curated, not auto-generated | Brand authority |

---

## Learning Log

| Date | What We Learned | Impact |
|------|----------------|--------|
| Feb 15 | Mobile-first dashboard is critical for ADHD owner | Rebuilt entire admin for iPhone usability |
| Feb 16 | CRON_SECRET mandatory check blocked all production topic generation | Removed mandatory check; standard pattern established |
| Feb 16 | Day-of-week bug: vercel.json Mon=1, JS code checked Sun=0 | Weekly topics never fired; timezone/day alignment critical |
| Feb 18 | 7 hardcoded "yalla-london" fallbacks broke multi-site | Created `getDefaultSiteId()` / `getDefaultSiteName()` helpers |
| Feb 18 | FAQPage/HowTo schema types deprecated by Google | Replaced with Article schema; updated generator |
| Feb 18 | 7 admin API routes exposed financial data without auth | Added `requireAdmin` to all; security audit essential |
| Feb 18 | `@/lib/prisma` import path doesn't exist | Standardized 37 files to `@/lib/db`; canonical convention |
| Feb 18 | Pipeline race conditions allowed duplicate BlogPosts | Atomic claiming with `updateMany` + transaction |
| Feb 18 | 34 empty catch blocks violated engineering standards | Central logging in failure-hooks + per-file fixes |
| Feb 19 | Google Jan 2026 "Authenticity Update" changed E-E-A-T signals | First-hand experience now #1 signal; added checks 12-13 |
| Feb 19 | Quality gate thresholds misaligned across 4 files | Unified to 70 in standards.ts, phases.ts, select-runner.ts |
| Feb 20 | No BreadcrumbList structured data on any page | Added to 9 layouts with dynamic siteId |
| Feb 20 | OG image hardcoded `/og-image.jpg` for all sites | Dynamic per-site via `app/api/og/route.tsx` |
| Feb 21 | Master audit engine needed risk scanners for spam policies | Built 3 scanners: scaled content, reputation, expired domain |
| Feb 21 | Zenitha Yachts required full hermetic separation | SiteShell pattern with CSS custom properties, not Tailwind |
| Feb 26 | Cockpit must be single mobile-first mission control | 7-tab layout with all operations accessible from iPhone |
| Feb 26 | Assembly phase timeout caused infinite loops | Raw HTML fallback after first timeout; sweeper must not reset |
| Feb 26 | Per-content-type gates needed (news 150w vs blog 1000w) | `CONTENT_TYPE_THRESHOLDS` with URL-based type detection |
| Mar 4 | `@/lib/auth/admin` doesn't exist; caused 5 build failures | Canonical path is `@/lib/admin-middleware` |
| Mar 4 | BlogPost `title` field crashes Prisma (field is `title_en`) | Every BlogPost select/query must use `title_en`/`title_ar` |
| Mar 4 | Supabase PgBouncer pool exhausted by parallel dashboard queries | Serialized all 5 builders; sequential for-loop for sites |
| Mar 5 | Arabic content ~2.5x more token-dense than English | Raised Arabic maxTokens from 2000 to 3500 minimum |
| Mar 5 | First AI provider consumed 100% budget, leaving 0 for fallbacks | Capped first provider at 50% (or 70% for large budgets) |
| Mar 5 | Sweeper reset `phase_attempts` to 0, defeating lifetime cap | Changed to increment; permanent failure at 10 total attempts |
| Mar 6 | 7 orphan crons wasted resources | Deleted: auto-generate, autopilot, commerce-trends, etc. |
| Mar 9 | GSC `dimensions: ["page"]` caused ~7x metric overcounting | Changed to `dimensions: ["page", "date"]` for per-day storage |
| Mar 9 | Authenticity check as BLOCKER prevented ALL auto-publishing | Downgraded to WARNING; publish first, enhance later |
| Mar 9 | Stuck drafts counted as "active", blocking new creation | Exclude drafts not updated in 4+ hours from active count |
| Mar 9 | Reservoir promotion race: two selectors create duplicate posts | Atomic claiming with `updateMany` + `$transaction` |
| Mar 10 | CJ `lookupAdvertisers({ joined: true })` returns 0 for new accounts | Removed filter; fetch all statuses and classify locally |
| Mar 10 | 70%+ topics were Arab-focused, limiting search volume | Rebalanced to 60-70% general + 30-40% niche |
| Mar 10 | AI-referred traffic converts 4.4x higher than organic | Added GEO/citability directives to all content prompts |
| Mar 10 | Duplicate sitemaps (www + non-www) confused Google | Removed non-www sitemap; kept canonical www version |
| Mar 10 | Language switcher only changed React state, not URL | Changed to `router.push('/ar/path')` for URL-based navigation |
| Mar 11 | Diagnostic-agent touching `updated_at` inflated active count | Exclude diagnostic-agent-touched drafts from active queries |
| Mar 11 | CJ models had no siteId — cross-site revenue leakage | Added siteId to CjCommission, CjClickEvent, CjOffer |
| Mar 11 | Arabic SSR: client components don't see middleware headers | Pass `serverLocale` prop from server component to client |
| Mar 11 | GDPR endpoint used wrong Prisma field names (metadata vs details) | Verified all field names against schema.prisma before writing |
| Mar 11 | `requireAdmin` return value discarded = auth bypass | Must check: `const authError = await requireAdmin(req); if (authError) return authError;` |
| Mar 11 | `buildRevenue()` CJ queries had no siteId filter | Added scoping with `OR: [{ siteId: { in: activeSiteIds } }, { siteId: null }]` |
| Mar 12 | CJ Publisher account fully activated; Vrbo approved | All 3 env vars configured; crons will auto-sync advertisers |

---

## Pre-Publication Gate Summary (16 Checks)

| # | Check | Severity | Description |
|---|-------|----------|-------------|
| 1 | Route existence | Blocker | Target URL returns 200 |
| 2 | Arabic route | Blocker | `/ar/` variant exists |
| 3 | SEO minimums | Blocker | Title, meta title (30-60), meta description (120-160), content length |
| 4 | SEO score | Blocker/Warn | <50 blocks, <70 warns |
| 5 | Heading hierarchy | Warning | 1 H1, 2+ H2, no skipped levels |
| 6 | Word count | Blocker | 1,000 min (blog), 150-400 (news/info/guide) |
| 7 | Internal links | Warning | 3 minimum (blog), 1 (other types) |
| 8 | Readability | Warning | Flesch-Kincaid grade <=12 |
| 9 | Image alt text | Warning | All images must have alt |
| 10 | Author attribution | Warning | E-E-A-T requirement |
| 11 | Structured data | Warning | Valid JSON-LD present |
| 12 | Authenticity signals | Warning | 3+ experience markers, <=1 generic phrase |
| 13 | Affiliate links | Warning | 2+ booking/affiliate links |
| 14 | AIO readiness | Warning | Direct answer first 80 words, question H2s |
| 15 | Internal link ratio | Warning | Ratio check |
| 16 | Citability / GEO | Warning | 3+ stats, 2+ attributions, self-contained paragraphs |

---

## Key File Reference

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Master project instructions — source of truth |
| `docs/known-gaps-and-fixes.md` | This file — consolidated knowledge base |
| `docs/AUDIT-LOG.md` | Persistent audit findings tracking |
| `docs/FUNCTIONING-ROADMAP.md` | 8-phase path to healthy platform |
| `docs/DEVELOPMENT-STANDARDS.md` | SEO/AIO/E-E-A-T development standards |
| `docs/NEW-WEBSITE-WORKFLOW.md` | 8-phase workflow for launching new sites |
| `lib/seo/standards.ts` | Centralized SEO thresholds — single source of truth |
| `lib/seo/orchestrator/pre-publication-gate.ts` | 16-check quality gate |
| `lib/content-pipeline/phases.ts` | 8-phase article builder |
| `lib/content-pipeline/select-runner.ts` | Reservoir to BlogPost promotion |
| `lib/ai/provider.ts` | AI provider chain with circuit breaker |
| `lib/ops/diagnostic-agent.ts` | Stuck draft auto-remediation |
| `lib/admin-middleware.ts` | Canonical auth: `requireAdmin`, `withAdminAuth` |
| `config/sites.ts` | 6-site configuration (brands, keywords, prompts) |
| `scripts/smoke-test.ts` | 131 tests across 29 categories |
| `lib/dev-tasks/plan-registry.ts` | Development Monitor task registry |
| `lib/dev-tasks/live-tests.ts` | 160 test functions for Development Monitor |
