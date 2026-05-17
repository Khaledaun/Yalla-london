# Yalla London — Merger SEO Safeguard (timing + tripwires + monitoring)

**Date:** 2026-05-13
**Status:** Operator-facing decision framework; layered ON TOP of `docs/yl-migration/migration-runbook-v1.0.md` (which covers the mechanical playbook).
**Trigger for this doc:** Operator captured GSC screenshot 2026-05-13 19:05 — **YL traffic showed a sharp inflection in the prior 7 days** (clicks ≥ 100/day vs ~25/day baseline, impressions > 4.5K/day vs ~1.5K/day baseline, 28-day totals 542 clicks / 32K impressions, CTR ~1.7%). Operator asked: how do we make sure the SEO effort isn't hampered by the merger?

---

## TL;DR (mobile-readable)

1. **Recommendation: do not merge while traffic is inflecting.** Per D39 the merger is already deferred indefinitely; the screenshot is the strongest possible evidence to keep it that way for now. Engineering consolidation is reversible; SEO equity built over 14 months is not. **Stay D39-default until the curve flattens.**

2. **When traffic plateaus (definition below), the merger can ship in a 7-day cutover window** using the existing `migration-runbook-v1.0.md`. That runbook is comprehensive; the gap this doc fills is the SEO-equity-specific tripwire layer + the rollback decision tree.

3. **Before any cutover fires, three gates must close:** (a) baseline capture (live + 30-day rolling), (b) URL-for-URL parity proof on staging, (c) rollback rehearsal. None of the three currently has a green-check.

4. **During cutover + first 30 days post-cutover**, four tripwires monitored daily; any one firing = halt + investigate, two firing = rollback within 4 hours.

5. **Operator decisions you still own** (4) are at the bottom of this doc.

---

## Why now is the wrong time to merge

The GSC screenshot from 2026-05-13 19:05:
- 28-day totals: **542 clicks, 32K impressions, ~1.7% CTR**
- Trajectory: the **last 7 days are clearly inflecting** — clicks roughly 4× the prior-3-weeks baseline, impressions ~3× the prior-3-weeks baseline.
- Read: something has just compounded — either Google has re-evaluated the site upward (algorithm tailwind), or the M3.6c content-audit work has started paying off, or one or more articles have caught a query trend.

**Whatever caused the inflection, it is fragile.** Migrations during inflections — even well-executed ones — risk:
- Disrupting the crawl pattern that's currently producing the impressions surge.
- Triggering Google's "site is changing rapidly, hold rankings" damping response.
- Introducing template / signal drift that re-evaluates the upward signals downward.

D39 (per `migration-runbook-v1.0.md` and `06-yalla-london-seo-preservation.md`) already defers the M9 cutover indefinitely. The screenshot is the strongest evidence to keep it deferred. Specifically:

> **Recommendation (this doc):** the M9 cutover stays D39-deferred until the curve flattens, where "flattens" means: clicks stabilize at a new level (any level) for 14+ consecutive days with ≤ 20% day-over-day variance. The 14-day stability check is the proxy for "the algorithm has accepted the new ranking; further work compounds normally."

If the curve compounds further (clicks 1000+/day), the no-merge case strengthens, not weakens. The bar to merge rises with traffic; consolidation is operator-efficiency territory and is dwarfed by even one quarter of traffic loss.

If the curve regresses (clicks fall back to ~25/day baseline within 14 days), the inflection was algorithm-noise; the merge calculus returns to status quo (D39 deferred unless an operator-driven trigger fires per `migration-runbook-v1.0.md` § Trigger candidates).

---

## What "merger" means in the current architecture

Disambiguate before sequencing. Three different things have been called "merger" in different conversations:

| Meaning | Source | SEO risk class |
|---|---|---|
| **M9 cutover** — yalla-london.com served from `zl-travel` Vercel project instead of YL legacy project | `docs/yl-migration/migration-runbook-v1.0.md` (canonical) | **Domain-stays; infrastructure changes.** Lowest-risk shape if executed correctly. |
| **Brand-system consolidation** — YL becomes a sibling under the Yalla brand-system parent (yalla.com/london instead of yalla-london.com) | CLAUDE.md Tenant Model §"Yalla brand-system dormant" | **Domain changes.** Highest-risk shape; requires full GSC Change of Address + 301 chain on every URL + 6-12 months of authority transfer. **Avoid this unless absolutely required.** |
| **Content / data merge** — YL articles + assets folded into ZL Travel DB | Already largely done (per migration-runbook §"What gets migrated": *"Yalla London tenant content already lives in the ZLT Supabase staging DB"*) | Zero SEO risk — content data layer doesn't affect serving. |

**This doc assumes "merger" = M9 cutover (yalla-london.com served from zl-travel project).** If the operator intends brand-system consolidation or anything domain-changing, that's a separate decision frame with much higher SEO risk; surface explicitly before scoping.

---

## Gating preconditions (must be green BEFORE any cutover scheduled)

These extend the `migration-runbook-v1.0.md § Pre-cutover prerequisites` (7 items there) with the SEO-equity-specific gates that the operator's screenshot makes urgent:

### Gate 1 — Live baseline + 30-day rolling capture

`scripts/yl-baseline-capture.ts` exists today as a stub (per `docs/inert-surface.md`: *"Real `fetchGscData` + `crawlSite` impls are stubs"*). **Before cutover, the real implementation must land + run weekly for 4 weeks.**

Required outputs (per `docs/yl-migration/baseline/`):
- **Per-URL CSV**: every URL with > 1 impression in the trailing 30d. Columns: URL, impressions, clicks, CTR, avg position. ~5-50 rows initially; grows as traffic grows.
- **Per-query CSV**: every query with > 1 impression in the trailing 30d. Same columns + query string.
- **Index-coverage JSON**: count of URLs in (Submitted, Indexed, Excluded - Crawled-not-indexed, Excluded - Discovered-not-indexed) buckets per GSC's Coverage report. The 22-indexed / 239-published split per the 2026-05-07 audit is the bar to beat post-cutover.
- **Backlink snapshot**: top 50 referring domains pointing at yalla-london.com (Ahrefs / SEMrush / Google Search Console "Top linking sites" — any one source is fine, single-source for v0.1).
- **Crawled-but-not-indexed list**: separate CSV — these URLs are at most risk during cutover because Google has them in queue but not yet ranked.

Implementation effort: ~1 dev-day to replace the stubs with real GSC API + a crawler. Operator-side: GSC API access (OAuth refresh token OR service-account JSON) pasted into Vault as `gsc.api_credentials_json`.

**Why 30-day rolling, not single snapshot:** the screenshot showed a 7-day inflection. A point-in-time snapshot taken pre-cutover would be a different baseline than the one taken 4 weeks pre-cutover. Rolling capture means we know whether the inflection compounded, plateaued, or reversed by the time the cutover window opens.

### Gate 2 — URL-for-URL parity proof on staging

Per the existing `migration-runbook-v1.0.md § T-3 days — staging dry run`, but extended:

- **Every URL that received > 1 impression in trailing 90d** must be hit on staging (`Host: yalla-london.com` against the `zl-travel` Vercel staging deployment). Pass criteria: HTTP 200, same canonical, same h1, same primary content, same JSON-LD blocks, same hreflang. Computed automatically via a comparison script:
  ```bash
  pnpm tsx scripts/yl-parity-check.ts \
    --baseline=docs/yl-migration/baseline/per-url-<date>.csv \
    --staging=https://yalla-london-staging.vercel.app
  ```
  (Script does not exist yet — write before cutover; estimate ~0.5 dev-day.)
- **Every URL in the 14 BLOG_REDIRECTS map** must redirect with 301 + correct target.
- **Every URL in the legacy non-www → www + ?lang=ar → /ar/ middleware chain** must still redirect (already handled by `lib/seo/redirect-map.ts` per the YL polish-monitoring runbook, but verify on staging not just in code).
- **The 24-pillar-URL sitemap fallback** must serve byte-identical XML.

**Gate criteria: 100% of URLs in scope pass. No exceptions, no "we'll fix that one after cutover."** A single URL with the wrong canonical can cascade into a duplicate-content penalty across the cluster it links.

### Gate 3 — Rollback rehearsal

The existing runbook documents rollback in concept; this gate makes it muscle-memory:

- **48 hours before cutover**, the operator (or a YL-repo Coding Agent session) executes the rollback procedure against a CLEAN staging copy of yalla-london.com. Measured outcomes:
  - Rollback decision → first byte of legacy site serving traffic again: **target < 30 min**.
  - DNS propagation 99th percentile: **target < 2h** (Cloudflare proxied — typically < 5 min).
  - GSC re-confirmation that the original site is the canonical one: **target < 72h** (Google's own re-crawl cadence).
- **Rollback script** lives at `scripts/yl-cutover-rollback.sh` (does not exist yet — write before cutover; estimate ~0.25 dev-day). Single command. Operator-tappable from iPhone via a dashboard button as well as CLI.

If the rehearsal can't hit < 30 min for first-byte-back, the gate fails and the merge isn't ready — period.

---

## Four tripwires during cutover + first 30 days post-cutover

Daily-monitored, surfaced to operator's dashboard. Any ONE firing = halt + investigate; TWO firing = rollback within 4 hours.

### Tripwire 1 — Impressions drop > 20% vs trailing-7-day baseline

Why: Google's first signal that something's wrong is impressions before clicks (the crawl + index loop runs ahead of the click loop). A 20% drop is well above day-to-day noise on YL's current scale (32K/28d).

Measurement: daily GSC export, compare against the rolling baseline captured in Gate 1.

Action on fire: pause any in-flight content publishing; do not touch routes; investigate via GSC URL Inspection on the 10 highest-impression URLs.

### Tripwire 2 — Index coverage drops > 5 URLs from baseline

Why: a URL falling out of the index = Google has decided that URL isn't worth ranking. Loss of indexed URLs is a permanent equity hit until re-indexed (which can take weeks).

Measurement: daily GSC Coverage API + the index-coverage JSON from Gate 1.

Action on fire: GSC URL Inspection on every dropped URL; if "Crawled - currently not indexed" with no clear reason, re-submit via GSC URL Inspection + double-check the URL serves identical content + canonical to pre-cutover.

### Tripwire 3 — Clicks drop > 30% vs trailing-7-day baseline

Why: clicks lag impressions but matter more for revenue. 30% threshold accounts for normal weekly variance + algorithm noise; anything beyond is real signal.

Measurement: daily GSC clicks export.

Action on fire: identify which queries lost the clicks; check those queries' landing-page rankings; investigate whether the cutover changed anything on those landing pages.

### Tripwire 4 — Any of the 14 BLOG_REDIRECTS or canonical-redirect chain returns ≠ 301

Why: redirects are the SEO equity bridges. A 200, 302, or 404 where 301 is expected silently bleeds equity for as long as it's wrong.

Measurement: synthetic monitoring — `scripts/yl-redirect-monitor.ts` (doesn't exist yet; estimate ~2 hrs to write). Runs hourly; alerts when any of the configured (from URL, to URL, 301) tuples fails.

Action on fire: page-handler diff against pre-cutover; restore the missing redirect immediately; backfill the synthetic monitor's check coverage if a new redirect was missed.

**Two tripwires firing = rollback initiated.** This is the engineering-rule discipline #5 (no silent failures) applied at SEO-equity scale: by the time TWO independent signals confirm regression, the time-to-rollback is already eating into the equity loss. 4-hour rollback target measured from second tripwire fire, not from cutover completion.

---

## 30/60/90 post-cutover monitoring schedule

If all four tripwires hold and the cutover lands clean:

**Day 1-7:** Daily tripwire checks; daily GSC URL Inspection on the top 10 URLs by impressions; daily Lighthouse on the 5 priority URLs from `06-yalla-london-seo-preservation.md`.

**Day 8-30:** Daily tripwire checks; weekly URL Inspection sweep on top 50 URLs by impressions; weekly Lighthouse on top 20 URLs.

**Day 31-60:** Daily tripwire checks; bi-weekly Lighthouse + URL Inspection sweep.

**Day 61-90:** Weekly tripwire summary; monthly full audit comparison against pre-cutover baseline.

**Day 90 review** — final go/no-go on declaring the cutover complete. Pass = traffic at or above pre-cutover trajectory; fail = continued investigation regardless of elapsed time.

---

## Hooks already in code (use these, don't rebuild)

| Existing artifact | Purpose | State |
|---|---|---|
| `lib/seo/redirect-map.ts` | `findRedirectForRequest` reads `Site.redirects_json`; honors per-tenant redirect maps | Substrate live; needs Edge-runtime KV-backed middleware migration for non-catch-all routes (`/yachts/[id]` etc.) per `docs/inert-surface.md` |
| `scripts/yl-baseline-capture.ts` | GSC + crawler baseline capture | **Stub** — real `fetchGscData` + `crawlSite` to be written before Gate 1 |
| `scripts/yl-audit-classify.ts` | Classifies every YL URL into keep / redirect / retire | Substrate live; operator runs the audit cycle when pre-cutover prep starts |
| `scripts/yl-audit-redirect-map.ts` | Produces `Site.redirects_json` from the classified audit | Substrate live; consumes the classify output |
| `docs/yl-migration/migration-runbook-v1.0.md` | Mechanical cutover playbook (T-7 → T+24h) | Complete; this doc layers SEO-specific gates on top |
| `21-public-site-prep-pack/06-yalla-london-seo-preservation.md` | In-place polish-monitoring SEO runbook | Complete; runs during polish work that does NOT cut over |
| `21-public-site-prep-pack/06b-yalla-london-m9-contingency.md` | Older M9 contingency (now superseded by migration-runbook-v1.0) | Historical |
| `docs/yalla-london-readiness.md` | Audit of readiness against the v1.0 runbook's 7 preconditions | Complete |

**New artifacts to add before cutover (estimate ~2.5 dev-days total):**
- `scripts/yl-baseline-capture.ts` — replace stubs with real GSC API + crawler (~1 day)
- `scripts/yl-parity-check.ts` — diff baseline against staging (~0.5 day)
- `scripts/yl-redirect-monitor.ts` — synthetic monitor for the 14 BLOG_REDIRECTS + middleware chain (~0.25 day)
- `scripts/yl-cutover-rollback.sh` — one-command rollback (~0.25 day)
- `lib/dashboard/tiles/yl-seo-tripwire.ts` — operator dashboard tile showing the 4 tripwires + traffic delta vs baseline (~0.5 day)

---

## What the operator does (and does not) need to do today

### Do today (low effort, high leverage):
1. **Acknowledge D39 + this doc's recommendation.** No merger scheduled while inflection compounds. The current YL polish + content-velocity surface continues per `migration-runbook-v1.0.md § Trigger candidates` (none currently green).
2. **Capture the 28-day GSC screenshot every Monday.** Single screenshot in the operator's notes; a non-engineering minimum-viable baseline until Gate 1 substrate lands. Build a 4-week visual baseline operator-side regardless of engineering pace on the automated capture.
3. **Decide on Gate 1 priority** (open question §1 below): when to schedule the ~1 dev-day to replace the baseline-capture stubs. Doesn't have to be immediate; weeks ahead of any scheduled cutover.

### Do NOT do today:
- Do not schedule M9 cutover.
- Do not switch DNS for yalla-london.com.
- Do not add yalla-london.com as a domain to the `zl-travel` Vercel project (R-13 reservation stays in place; adding it without cutover is reversible but creates two routes-to-content risk).
- Do not touch the YL legacy repo's redirect map, middleware chain, sitemap, or robots.txt. Polish-only work continues; redirect surface frozen per the polish-monitoring runbook.

---

## Open questions for explicit decision

1. **Gate 1 substrate timing.** When does the operator want the ~1 dev-day to land for the real GSC capture? My recommendation: schedule it now (next available window), even though there's no scheduled cutover. Having 4 weeks of automated baseline before the cutover decision becomes a "go" makes the decision data-driven instead of vibes-driven.
2. **"Merger" disambiguation.** Confirm "merger" = M9 cutover (yalla-london.com on zl-travel infrastructure, domain unchanged), NOT brand-system consolidation (domain change to yalla.com/london or similar). If brand-system consolidation is on the table for any reason, this entire doc's risk frame is too optimistic and a much heavier runbook is needed.
3. **Rollback rehearsal cadence.** Does the operator want a rollback rehearsal scheduled even without a cutover scheduled? My recommendation: yes, once, ~3 months from now, to validate the procedure exists as muscle memory before it's needed under pressure.
4. **Tripwire dashboard tile.** Want this on the operator's `/dashboard` even before the cutover? My recommendation: yes — the 4 tripwires double as ongoing SEO-health monitoring whether or not a cutover happens. Estimate ~0.5 dev-day; surfaces YL impressions / clicks / index-coverage / redirect-health every time you open the dashboard.

---

## One-line summary

Don't merge while traffic is inflecting; build the four-tripwire monitoring substrate now so when the curve flattens (14 days of stability) and the merger does fire, every URL has byte-parity proof, rollback is rehearsed, and any one of four daily-monitored signals halts the cutover before silent SEO bleed sets in.

---

## §Q — Questions to hand to the yalla-london repo session

This doc was built from ZL Travel-side substrate plus a public-audit handoff from 2026-05-07. **To make every gate, tripwire, and threshold precise, the next YL-repo Coding Agent session needs to answer this questionnaire in one read-only pass and report findings back here.** No code changes in YL during this pass — pure discovery.

The session prompt to hand to the YL-repo agent:

> Read-only YL-repo discovery for the merger SEO safeguard. ZL Travel has scoped a four-tripwire SEO-equity preservation playbook for the eventual M9 cutover (`docs/runbooks/yl-merger-seo-safeguard.md` in the ZL Travel repo). To make the playbook precise, answer the questionnaire in §Q of that doc. **No writes, no commits, no code changes.** Report findings as a single markdown file named `docs/yl-readiness-2026-05-13.md` in the YL repo + paste the report back as the session output so it can be folded back into the ZL Travel safeguard doc.

### §Q.1 — Routing + redirect inventory

| # | Question | Why it matters |
|---|---|---|
| Q1.1 | Paste the **complete contents** of `lib/seo/redirect-map.ts` (or wherever the 14 BLOG_REDIRECTS live). | Tripwire 4 needs the exact tuples to monitor. |
| Q1.2 | Paste `middleware.ts` (or whatever file implements the non-www → www + `?lang=ar` → `/ar/*` + `/privacy-policy` → `/privacy` chain). | Same. Plus we need to confirm the 301-vs-302 semantics on every rule. |
| Q1.3 | List **every Next.js route file** in `app/` — `page.tsx`, `route.ts`, and any `[...slug]` catch-alls. Include the route param shape (e.g., `app/blog/[slug]/page.tsx`). | Gate 2 URL-for-URL parity depends on knowing every emit-able route shape. |
| Q1.4 | Are there any **dynamic redirects** computed at request time (e.g., a `canonical_slug` lookup that issues a redirect when an article's slug changes)? Where? | These need to ship to the cutover deployment OR be backfilled into the static redirect map; otherwise old slugs 404 post-cutover. |
| Q1.5 | What does **`/robots.txt`** currently serve? Paste the literal output (or the `app/robots.ts` source). | Tripwire-adjacent: any disallow rule change is a coverage-loss vector. |
| Q1.6 | What does **`/sitemap.xml`** currently serve? Paste the first 50 URL entries + the implementation file. | Gate 2 parity baseline. |

### §Q.2 — Page-signal patterns per template

For each public template (home, blog index, article, about, privacy, terms, contact, any other indexable route surfaced in Q1.3):

| # | Question | Why it matters |
|---|---|---|
| Q2.1 | What's the `<title>` pattern? Paste the formula (e.g., `"{article_title} | Yalla London"`). | Title-pattern drift post-cutover = re-evaluation by Google = ranking churn. |
| Q2.2 | What's the `<meta name="description">` pattern? Static, dynamic from content, AI-generated? | Same. |
| Q2.3 | What's the `<link rel="canonical">` pattern? Always self? Sometimes points elsewhere? | Canonical drift is the single highest-risk page-signal regression — Google de-ranks the non-canonical aggressively. |
| Q2.4 | What `<link rel="alternate" hreflang="...">` tags emit? Which locale-pairs are linked? Is there a `x-default`? | YL has EN + AR per audit. Confirm the implementation matches. |
| Q2.5 | What JSON-LD `@type` blocks emit per template? (`Article`, `BlogPosting`, `BreadcrumbList`, `Organization`, `WebSite`, `FAQPage`?) Paste a sample for each template. | Structured-data drift is silent; takes 60+ days to manifest in rankings, hard to detect without baseline. |
| Q2.6 | What's the `<h1>` pattern? One per page? Ever multiple? Ever absent? | h1 changes shift relevance scoring; absent h1 is a soft SEO error Google tolerates inconsistently. |
| Q2.7 | What `<meta name="robots">` content emits? Default `index,follow`? Any pages currently `noindex`? Which? | `noindex` removal is fine; `noindex` addition is a tripwire-immediate event. |
| Q2.8 | What Open Graph + Twitter Card meta tags emit? | Social-CTR feeds back into rankings indirectly; preserve. |

### §Q.3 — GSC + analytics state

| # | Question | Why it matters |
|---|---|---|
| Q3.1 | Is there a GSC API service account or OAuth refresh token configured anywhere in the repo / env / Vault? If yes, where? If no, who owns the GSC property? | Gate 1 needs API access to automate baseline capture. |
| Q3.2 | What's the GSC-reported indexed URL count today? (Coverage report → Submitted/Indexed.) | Anchor for Tripwire 2. The 2026-05-07 audit reported 22 indexed / 239 published — confirm or correct. |
| Q3.3 | Top 20 URLs by impressions (28d). Paste from GSC. | Gate 1 priority-URL list for Lighthouse + parity checks. |
| Q3.4 | Top 50 URLs by impressions (90d). | Gate 2 URL-for-URL parity coverage scope. |
| Q3.5 | **The inflection investigation** — the operator captured a GSC screenshot 2026-05-13 19:05 showing clicks 4× and impressions 3× in the last 7 days. What changed? Recent deploys? Recent publishes? Recent external mentions? Specific URLs that jumped? | If we know what caused the inflection, we know what to preserve hardest. If the inflection is one new viral article, that article's URL becomes the highest-priority preservation candidate. |
| Q3.6 | Is GA4 installed? If yes, what's the property ID + measurement ID? Is Enhanced Measurement → Outbound Clicks toggled ON? Are `link_url`/`link_domain` registered as custom dimensions? (See `yl-affiliate-activation-brief.md` Appendix A for full context.) | Both this safeguard (per-article SEO health) and the affiliate brief (per-article attribution) need the answer. |
| Q3.7 | Is anything else analytics-shaped installed? (Plausible, Fathom, PostHog, Cloudflare Web Analytics?) | Alternative data sources for tripwire monitoring if GSC API access is unavailable. |

### §Q.4 — Backlink + referring-domain inventory

| # | Question | Why it matters |
|---|---|---|
| Q4.1 | Top 50 referring domains pointing at `yalla-london.com` (any of: GSC "Top linking sites", Ahrefs, SEMrush, Moz). Single source is fine; report which source. | Gate 1 backlink snapshot. Post-cutover, any HIGH-authority referrer whose linked URL 404s is an immediate equity bleed. |
| Q4.2 | Any specific HIGH-authority backlinks (DR 70+, or any government / educational / major media)? Which URLs do they point at? | These URLs become must-preserve targets in Gate 2 — non-negotiable 200 + canonical post-cutover. |
| Q4.3 | Any links you've explicitly built / earned in the last 90 days that GSC may not show yet? | Coverage for the "recently-earned authority not yet manifest" case. |

### §Q.5 — Infrastructure + DNS

| # | Question | Why it matters |
|---|---|---|
| Q5.1 | YL Vercel project ID + region + plan tier. | Cutover-day Vercel configuration must mirror or exceed. |
| Q5.2 | All domains currently attached to the YL Vercel project (apex + www + any subdomain). | Need to migrate ALL of them, not just the apex. |
| Q5.3 | DNS provider for `yalla-london.com`. Cloudflare? Cloudflare proxied (orange-cloud) or DNS-only? | Affects rollback speed — proxied DNS changes propagate within minutes; DNS-only propagates within hours. |
| Q5.4 | SSL cert provider + auto-renewal state. | Cutover risk: cert mismatch = HTTPS errors on first byte = de facto site outage. |
| Q5.5 | Any Cloudflare Workers, Cache Rules, Page Rules, Bot Management settings active on the YL zone? | These must port over or be replicated post-cutover; silent loss of any Bot-Management rule = scrape traffic spike, possible WAF impact. |
| Q5.6 | Cloudflare Web Analytics or any other Cloudflare data layer in use? | Alternative tripwire data source. |

### §Q.6 — Content + asset inventory

| # | Question | Why it matters |
|---|---|---|
| Q6.1 | Total published article count today (confirms or updates the 239 figure from 2026-05-07 audit). | Sanity-check anchor. |
| Q6.2 | Any articles currently in draft / scheduled-to-publish state that might publish during the projected cutover window? | Publishing-during-cutover is forbidden; need to identify these and pause the publishing queue. |
| Q6.3 | What's the image-hosting story today? Unsplash CDN? Self-hosted? Cloudinary? R2? | The 2026-05-07 audit's "remove Unsplash" fix is still pending per `06-yalla-london-seo-preservation.md`; image CDN changes affect Lighthouse scores. |
| Q6.4 | Are there any URLs intentionally `noindex` today (e.g., `/admin`, `/preview`)? Paste the full list. | Tripwire 2 reference; these should stay `noindex` post-cutover. |
| Q6.5 | Are there any URLs that legitimately return non-200 today (intentional 410s, 404s)? | Same reason. |
| Q6.6 | Is there a `/feed.xml` or RSS surface? If yes, the URL pattern + format. | RSS readers + republishers depend on this; loss = silent re-aggregation breakage. |

### §Q.7 — Performance baseline

| # | Question | Why it matters |
|---|---|---|
| Q7.1 | Current Lighthouse mobile scores (Performance / SEO / Accessibility / Best Practices) for: homepage + 4 highest-traffic articles (from Q3.3). | Gate 2 parity proof + Day 1-7 post-cutover monitoring baseline. |
| Q7.2 | Largest Contentful Paint (LCP) p50 + p75 from the same 5 URLs. | Core Web Vitals are direct ranking signals; regression = ranking risk. |
| Q7.3 | Current page weight (HTML + CSS + JS + first-paint images) p50 from the same 5 URLs. | Bundle-size baseline for the cutover deploy. |
| Q7.4 | Are images served via Next.js `<Image>` with automatic WebP/AVIF conversion? Or `<img>` tags directly? | Image-format drift is one of the most common cutover regressions. |

### §Q.8 — Pioneer + voice-contract state on the public surface

| # | Question | Why it matters |
|---|---|---|
| Q8.1 | Does YL display author bylines on articles? Pseudonymous "editorial team"? Specific Pioneer names? | CLAUDE.md non-negotiable #5 — real human authorship at schema level. Post-cutover, these need to map to ZL Travel `Contributor` rows or stay as opaque editorial bylines. |
| Q8.2 | Is there any structured author data (JSON-LD `Person` blocks, schema.org `author`)? | If yes, the author surface is a Google entity — preserve carefully. |
| Q8.3 | Are there public author profile pages (`/authors/[name]`)? | Same. Author pages with their own indexed status need URL preservation too. |

### §Q.9 — Anti-prerequisites (things that must be FALSE before cutover)

| # | Question | Why it matters |
|---|---|---|
| Q9.1 | Any in-flight content audit / republish / URL-restructure work currently happening in the YL repo? | Cutover must be applied to a stable surface; concurrent restructure = guaranteed regression. |
| Q9.2 | Any pending Google Search Console manual actions? Coverage warnings? Mobile usability issues? | Pre-existing GSC issues must be resolved before cutover or they'll be attributed to the migration. |
| Q9.3 | Any pending DMCA / takedown / legal issues that might affect a specific URL during the cutover window? | URL availability matters during the cutover specifically. |

### §Q.10 — Operator-facing rollback inputs

| # | Question | Why it matters |
|---|---|---|
| Q10.1 | What's the **fastest path to revert DNS** on `yalla-london.com` to the legacy YL Vercel project? Cloudflare API token in use? Where stored? | Gate 3 rollback rehearsal procedure. |
| Q10.2 | If the operator is on iPhone (no laptop access), what's the rollback-in-30-minutes path? Cloudflare app? Vercel app? Pre-staged rollback API endpoint? | ADHD-operator reality — rollback must be iPhone-tappable. |
| Q10.3 | Is there a "rollback button" surface anywhere today, or does this need building? | Probably need building; this answer just confirms what's missing. |

### Reporting format

The YL-repo agent's output should be a single markdown file `docs/yl-readiness-2026-05-13.md` in the YL repo, with one section per §Q.N. Each answer either resolves the question definitively, OR explicitly says "unable to answer — reason." The session also pastes the file's contents back into the ZL Travel session so this safeguard doc can be updated with the precise values.

**Estimated effort:** ~3-4 hours of read-only repo investigation + GSC dashboard inspection. No code changes. No commits beyond the single discovery doc.

---

## Open questions for explicit decision (operator)

1. **Gate 1 substrate timing.** When does the operator want the ~1 dev-day to land for the real GSC capture? My recommendation: schedule it now (next available window), even though there's no scheduled cutover. Having 4 weeks of automated baseline before the cutover decision becomes a "go" makes the decision data-driven instead of vibes-driven.
2. **"Merger" disambiguation.** Confirm "merger" = M9 cutover (yalla-london.com on zl-travel infrastructure, domain unchanged), NOT brand-system consolidation (domain change to yalla.com/london or similar). If brand-system consolidation is on the table for any reason, this entire doc's risk frame is too optimistic and a much heavier runbook is needed.
3. **Rollback rehearsal cadence.** Does the operator want a rollback rehearsal scheduled even without a cutover scheduled? My recommendation: yes, once, ~3 months from now, to validate the procedure exists as muscle memory before it's needed under pressure.
4. **Tripwire dashboard tile.** Want this on the operator's `/dashboard` even before the cutover? My recommendation: yes — the 4 tripwires double as ongoing SEO-health monitoring whether or not a cutover happens. Estimate ~0.5 dev-day; surfaces YL impressions / clicks / index-coverage / redirect-health every time you open the dashboard.
5. **Hand the §Q questionnaire to a YL-repo session?** My recommendation: yes, within the next 1-2 weeks. Read-only discovery is cheap; the precision it buys this safeguard doc is high-value, especially while the inflection is fresh.

---

## Cross-refs

- `docs/yl-migration/migration-runbook-v1.0.md` — mechanical cutover playbook
- `docs/yalla-london-readiness.md` — readiness audit against the 7 v1.0 preconditions
- `21-public-site-prep-pack/06-yalla-london-seo-preservation.md` — in-place polish SEO safeguards
- `lib/seo/redirect-map.ts` — implementation of the redirect-map machinery
- `scripts/yl-baseline-capture.ts` — baseline capture stubs (this doc's Gate 1 depends on real impls)
- `scripts/yl-audit-classify.ts` + `scripts/yl-audit-redirect-map.ts` — audit cycle
- D35 — two-repo indefinite
- D39 — cutover-direction reversed / deferred
- R-13 — multi-domain Vercel projects pattern

---

End of merger SEO safeguard doc.
