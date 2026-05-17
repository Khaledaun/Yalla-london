# Critical Rules Index — 63 Rules by Domain

```
╔══════════════════════════════════════════════════════════════════════╗
║  COMPANION TO: docs/plans/MASTER-BUILD-PLAN.md (v3.1)               ║
║  PURPOSE: Quick-reference index of all 63 critical architecture      ║
║  rules, organized by domain, with file cross-references.             ║
║  USE: Before editing any file, search this index for applicable      ║
║  rules. Ctrl+F the filename to find all rules that affect it.        ║
║  UPDATED: March 11, 2026                                            ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## How to Use This Document

1. **Before editing a file:** Search (Ctrl+F) for the filename → see which rules apply
2. **Before adding a feature:** Read the domain section that matches your work
3. **After a build failure:** Check "Hard Rules" section — most build failures trace to Rules 1-14
4. **After a runtime crash:** Check "Pipeline Rules" and "Anti-Patterns" sections

---

## Quick Reference: Rules by File

| File | Applicable Rules |
|------|-----------------|
| `lib/content-pipeline/select-runner.ts` | #24 (atomic claiming), #25 ($transaction), #33 (post-sanitized titles), #34 (cron stagger) |
| `lib/content-pipeline/phases.ts` | #5 (Arabic tokens), #15 (assembly raw fallback), #26 (fresh budget), #37 (assembly budget) |
| `lib/ops/diagnostic-agent.ts` | #16 (lifetime cap=5), #17 (reject at cap), #15 (assembly threshold=2), #57 (inflates active count) |
| `lib/ops/failure-hooks.ts` | #16 (lifetime cap=5), #17 (reject don't reduce), #18 (never reset assembly) |
| `lib/ai/provider.ts` | #5 (Arabic maxTokens), #8 (PgBouncer pool), #13 (circuit breaker) |
| `lib/seo/orchestrator/pre-publication-gate.ts` | #22 (authenticity=WARNING), #23 (citability=WARNING), #33 (post-sanitized titles) |
| `lib/seo/standards.ts` | #44 (GEO in all prompts), #45 (citability=WARNING) |
| `lib/affiliate/cj-client.ts` | #38 (no click data), #39 (25/min rate limit), #40 (joined filter empty), #43 (FixAction endpoint) |
| `lib/affiliate/cj-sync.ts` | #40 (joined filter), #41 (coverage patterns) |
| `lib/affiliate/monitor.ts` | #38 (no click data), #41 (coverage detection patterns) |
| `lib/campaigns/article-enhancer.ts` | #27 (check still published), #42 (skip active campaigns) |
| `config/sites.ts` | #28 (topic mix 60/40), #29 (no forced Arab angles), #30 (explicit mix ratios), #44 (GEO directives) |
| `middleware.ts` | #52 (?lang=ar → /ar/), #53 (Arabic SSR needed), #54 (site wizard=DB only) |
| `prisma/schema.prisma` | #1 (BlogPost: title_en not title), #2 (seo_score not quality_score), #3 (title_ar required), #4 (not null vs not empty), #47 (ALTER TABLE IF NOT EXISTS) |
| `app/api/cron/*/route.ts` (all crons) | #6 (auth import), #9 (requireAdmin return check), #15 (cron feature flag), #34 (stagger schedules), #58 (pool stagger) |
| `app/api/cron/content-builder-create/route.ts` | #19 (dedup marker before processing), #20 (close on success AND failure), #21 (exclude 4h+ stuck) |
| `app/api/cron/seo-agent/route.ts` | #32 (check ALL CSS classes for related sections) |
| `app/api/cron/content-auto-fix/route.ts` | #32 (related section dedup), #35 (campaign awareness) |
| `app/api/cron/gsc-sync/route.ts` | #10 (dimensions: page+date, NOT page only) |
| `app/api/admin/*/route.ts` (all admin) | #6 (auth import path), #9 (requireAdmin return) |
| `components/language-switcher.tsx` | #37 (router.push, not state), #52 (?lang=ar redirect) |
| `components/site-shell.tsx` | #48 (every query siteId), #51 (zenitha-yachts excluded from topics) |
| `scripts/smoke-test.ts` | #62 (every testType needs function), #63 (built vs forward-looking) |
| `lib/dev-tasks/live-tests.ts` | #62 (every testType mapped), #63 (built=verify real code, future=check prerequisites) |
| `lib/dev-tasks/plan-registry.ts` | #62 (every task needs testType), #63 (status reflects reality) |

---

## Domain 1: Prisma & Database (Rules 1-4, 10-13, 47)

These rules prevent Prisma runtime crashes and data corruption.

| # | Rule | Consequence | Files Affected |
|---|------|-------------|----------------|
| 1 | BlogPost has NO `title` field — use `title_en`/`title_ar` | Prisma crash: "Unknown field 'title'" | Any file querying BlogPost |
| 2 | BlogPost has NO `quality_score` — use `seo_score` | Prisma crash | Any file querying BlogPost |
| 3 | `title_ar`/`content_ar` are REQUIRED (non-nullable) | Constraint violation | Any file creating/updating BlogPost |
| 4 | `{ not: null }` invalid on required fields → use `{ not: "" }` | Prisma crash | content-auto-fix, seo-audit |
| 10 | GSC sync: `dimensions: ["page", "date"]` not `["page"]` | ~7x data overcounting | gsc-sync/route.ts |
| 11 | `[...new Set(array)]` → `[...new Set<string>(array)]` | Returns `unknown[]` | Any file using Set spread |
| 12 | `withPoolRetry<T>` needs explicit `as Array<{...}>` | Type inference loss | content-auto-fix-lite |
| 13 | `Map` from nullable Prisma keys → type the Map explicitly | `unknown` values | Any file building Map from query |
| 47 | `ALTER TABLE ADD COLUMN IF NOT EXISTS` for migrations | Missing columns on existing tables | prisma/migrations/ |

**Anti-pattern:**
```typescript
// WRONG — crashes on BlogPost
prisma.blogPost.findMany({ select: { title: true, quality_score: true } })

// CORRECT
prisma.blogPost.findMany({ select: { title_en: true, seo_score: true } })
```

---

## Domain 2: Authentication & Security (Rules 6, 9, 14)

| # | Rule | Consequence | Files Affected |
|---|------|-------------|----------------|
| 6 | Auth import: `@/lib/admin-middleware` NOT `@/lib/auth/admin` | Build failure: module not found | All API routes |
| 9 | `requireAdmin` return MUST be checked: `if (err) return err` | Auth bypass — unauthenticated access | All admin API routes |
| 14 | Env vars: `INDEXNOW_KEY`, `GOOGLE_PAGESPEED_API_KEY` | Key not found at runtime | seo-agent, performance-audit |

**Anti-pattern:**
```typescript
// WRONG — auth bypass! Return value discarded
await requireAdmin(request);

// CORRECT — auth enforced
const authError = await requireAdmin(request);
if (authError) return authError;
```

---

## Domain 3: AI Provider & Content Generation (Rules 5, 8, 13)

| # | Rule | Consequence | Files Affected |
|---|------|-------------|----------------|
| 5 | Arabic ~2.5x token-dense; `maxTokens: 3500` min | Truncated Arabic content | phases.ts, article-enhancer |
| 7 | Safari needs `res.ok` before `res.json()` | Safari crash on non-JSON response | All fetch() calls in admin pages |
| 8 | `Promise.all` with 15+ queries kills PgBouncer | Connection pool exhaustion | cockpit/route.ts, any dashboard builder |
| 13 | Circuit breaker opens after 3 failures — 5-min cooldown | Wasted retries on dead providers | provider.ts |

**Anti-pattern:**
```typescript
// WRONG — kills connection pool
const [a, b, c, d, e, f, g, h, i, j, k, l, m, n, o] = await Promise.all([...15 queries...]);

// CORRECT — sequential for dashboard builders
const a = await buildMissionControl(siteId);
const b = await buildContentMatrix(siteId);
const c = await buildPipeline(siteId);
```

---

## Domain 4: Content Pipeline (Rules 15-27)

These rules prevent infinite loops, duplicate articles, and wasted AI budget.

| # | Rule | Consequence | Key File |
|---|------|-------------|----------|
| 15 | Assembly raw fallback at `attempts >= 2` | Extra timeout before fallback | phases.ts, diagnostic-agent.ts |
| 16 | Draft lifetime cap = 5 total attempts | Infinite loops if higher | failure-hooks.ts |
| 17 | Diagnostic-agent: reject at cap ≥5, don't reduce | Infinite resurrection | diagnostic-agent.ts |
| 18 | Sweeper never resets assembly timeout drafts | Undoes raw fallback | sweeper.ts |
| 19 | Dedup: write marker BEFORE processing | Duplicate Vercel invocations | content-builder-create |
| 20 | Marker closes on BOTH success AND failure | False failure rate inflation | content-builder-create |
| 21 | Active count excludes 4h+ stuck drafts | Blocked creation from inflated count | content-builder-create |
| 22 | Authenticity check = WARNING not BLOCKER | All auto-generated articles blocked | pre-publication-gate.ts |
| 23 | Citability (GEO) = WARNING-only | Same — blocks everything | pre-publication-gate.ts |
| 24 | Reservoir promotion = atomic claiming (`updateMany`) | Duplicate BlogPosts | select-runner.ts |
| 25 | BlogPost.create + draft.update in `$transaction` | Orphaned data on crash | select-runner.ts |
| 26 | Assembly budget = fresh `Date.now()` after AI call | Stale budget overestimates remaining time | phases.ts |
| 27 | Campaign enhancer verifies article still published | Wasted AI budget on unpublished | article-enhancer.ts |

**Anti-pattern — Infinite Loop:**
```
Draft at attempts=6 → diagnostic-agent reduces by 2 → attempts=4
→ fails twice more → attempts=6 → reduced to 4 → INFINITE LOOP

FIX: At attempts >= 5, REJECT permanently. Never reduce.
```

---

## Domain 5: SEO & Indexing (Rules 28-37, 52-53)

| # | Rule | Consequence | Key File |
|---|------|-------------|----------|
| 28 | Topic mix: 60-70% general + 30-40% niche | Limited search volume | sites.ts, weekly-topics, topic-research |
| 29 | Never force Arab angles on general topics | Narrows audience unnecessarily | sites.ts system prompts |
| 30 | All prompts need explicit mix ratios | AI defaults to all-niche | weekly-topics, grok-live-search |
| 31 | primaryKeywordsEN drives trends + dedup | Missing broader signals | sites.ts |
| 32 | Related injectors check ALL CSS classes | Duplicate related sections | seo-agent, content-auto-fix |
| 33 | Pre-pub gate receives post-sanitized titles | Gate passes, DB stores empty | select-runner.ts |
| 34 | Cron schedules stagger 10+ min | Record collisions | vercel.json |
| 35 | Never submit two sitemaps (www + non-www) | Confuses Google canonical | GSC configuration |
| 36 | GSC removal is temporary — pair with 301 redirect | URLs reappear after ~6 months | middleware.ts |
| 37 | Language switcher = `router.push('/ar/')`, not state | Google can't see client-side state | language-switcher.tsx |
| 52 | `?lang=ar` → `/ar/` prefix (legacy anti-pattern) | Duplicate URLs in Google index | middleware.ts |
| 53 | Arabic SSR required for hreflang compliance | Google sees English at /ar/ URLs | Page layouts (OPEN — KG-032) |

---

## Domain 6: Affiliate System (Rules 38-43)

| # | Rule | Consequence | Key File |
|---|------|-------------|----------|
| 38 | CJ API has NO click data — track locally | Empty dashboard if expecting CJ clicks | cj-client.ts, monitor.ts |
| 39 | CJ rate limit: 25 req/min | API errors, circuit breaker trips | cj-client.ts |
| 40 | `lookupAdvertisers({joined:true})` returns 0 for new accounts | Empty partner list | cj-sync.ts |
| 41 | Coverage detection must match ALL injection patterns | Articles appear uncovered, get re-injected | monitor.ts, content-processor.ts |
| 42 | content-auto-fix skips articles with active campaigns | Campaign enhancer fights auto-fix | content-auto-fix/route.ts |
| 43 | `FixAction` requires `endpoint` not `url` | TypeScript error in cycle-health | cycle-health/route.ts |

---

## Domain 7: GEO / Generative Engine Optimization (Rules 44-46)

| # | Rule | Consequence | Key File |
|---|------|-------------|----------|
| 44 | GEO directives must be in ALL content prompts | Non-GEO content from missed paths | sites.ts, phases.ts, enhance-runner, article-enhancer, scripter |
| 45 | Citability = WARNING-only, never blocks | All articles blocked (AI can't add real stats) | pre-publication-gate.ts |
| 46 | CJ `joined` filter returns 0 for new accounts | Empty affiliate dashboard | cj-sync.ts |

---

## Domain 8: Multi-Site & Deployment (Rules 48-56, 61)

| # | Rule | Consequence | Key File |
|---|------|-------------|----------|
| 48 | Every DB query MUST include siteId | Cross-site data leakage | ALL query files |
| 49 | Use `getSiteConfig(siteId)` for site-specific values | Hardcoded values break multi-site | config/sites.ts consumers |
| 50 | zenitha.luxury = CURATED, exclude from crons | Auto-generated content on portfolio site | All content crons |
| 51 | zenitha-yachts-med excluded from TopicProposal | Yacht site doesn't use content pipeline | trends-monitor, weekly-topics |
| 52 | `?lang=ar` query params are legacy anti-pattern | Duplicate URLs | middleware.ts |
| 53 | Arabic SSR required for hreflang | Google sees English at Arabic URLs | Page layouts |
| 54 | Site wizard = DB only, config needs code deploy | Wizard doesn't update sites.ts or middleware | new-site/builder.ts |
| 55 | Social auto-publish = Twitter only | Other platforms need app review (months) | social/scheduler.ts |
| 56 | Video rendering can't run in Vercel (60s timeout) | Render fails in production | render-engine.ts |
| 61 | Site wizard creates DB records only | Must also update config/sites.ts + middleware | new-site/builder.ts |

---

## Domain 9: Operations & Crons (Rules 57-60)

| # | Rule | Consequence | Key File |
|---|------|-------------|----------|
| 57 | Diagnostic-agent inflates active count | Content creation blocked | content-builder-create |
| 58 | Crons at same minute fight for pool | Connection exhaustion | vercel.json |
| 59 | News admin passes siteId via `?site_id=` | Wrong site data returned | admin/news |
| 60 | Social = manual copy-paste primary workflow | Don't assume auto-publish works | social-calendar |

---

## Domain 10: Development Monitor (Rules 62-63)

| # | Rule | Consequence | Key File |
|---|------|-------------|----------|
| 62 | Every `testType` in plan-registry MUST have matching function in live-tests | "Test not found" errors in cockpit Tasks tab | plan-registry.ts, live-tests.ts |
| 63 | Built-feature tests verify real code (readiness 80-100); forward-looking tests check prerequisites (readiness 0-70) with `howToFix` | Misleading test results | live-tests.ts |

---

## Anti-Patterns Registry (DO NOT DO THESE)

| # | Anti-Pattern | Correct Pattern | Rule |
|---|-------------|----------------|------|
| 1 | `prisma.blogPost.findMany({ select: { title: true } })` | `{ select: { title_en: true } }` | #1 |
| 2 | `{ not: null }` on required String field | `{ not: "" }` | #4 |
| 3 | `await requireAdmin(request)` (discarding return) | `const err = await requireAdmin(req); if (err) return err;` | #9 |
| 4 | `import { requireAdmin } from "@/lib/auth/admin"` | `from "@/lib/admin-middleware"` | #6 |
| 5 | `Promise.all([...15+ DB queries...])` | Sequential loop or batches of 4 | #8 |
| 6 | `setLanguage('ar')` (React state only) | `router.push('/ar/path')` | #37 |
| 7 | `dimensions: ["page"]` in GSC sync | `dimensions: ["page", "date"]` | #10 |
| 8 | `phase_attempts >= 8` as lifetime cap | `>= 5` — higher causes infinite loops | #16 |
| 9 | Sweeper resetting assembly timeout drafts | Skip assembly timeouts in sweeper | #18 |
| 10 | `res.json()` without checking `res.ok` first | `if (!res.ok) throw new Error(...)` then `res.json()` | #7 |
| 11 | Touching `updated_at` on diagnostic-agent fixes | Exclude `[diagnostic-agent*]` from active count | #57 |
| 12 | Two crons scheduled at same `:00` minute | Stagger by 15-30 minutes | #58 |
| 13 | Authenticity/citability gate check as BLOCKER | WARNING only — AI can't add real first-hand signals | #22, #23 |
| 14 | `lookupAdvertisers({ joined: true })` for new CJ accounts | Remove `joined` filter, classify locally | #40 |
| 15 | Budget calculation using stale variable after AI call | `Date.now() - phaseStart` for fresh budget | #26 |

---

*Last updated: March 11, 2026 — 63 rules across 10 domains, 15 anti-patterns*
