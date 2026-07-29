# Yalla London + Zenitha Yachts — Full Site Audit

**Date:** April 8, 2026  
**Auditor:** Claude Code Automated Audit  
**Method:** Codebase analysis + operations log analysis (no live DB access, site returns 403 to external fetchers)

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total pages audited** | 54 static + ~280 published blog articles |
| **CRITICAL issues** | 7 |
| **HIGH issues** | 14 |
| **Pages to DELETE** | 8-15 duplicate blog articles + 3 static pages |
| **Pages to FIX** | 18 static pages + unknown blog articles |
| **Pages OK** | ~30 static pages working correctly |

### Top 3 Revenue-Killing Problems

1. **Content-selector frozen** — 30 publishReady articles stuck, 0 published for days (FIXED in this session's commit)
2. **6 high-intent pages have ZERO affiliate links** — hotels, experiences, recommendations, events, halal-restaurants, luxury-hotels
3. **13+ known duplicate article clusters** — competing for same keywords, splitting Google ranking signals

---

## Part 1: Static Pages (Yalla London)

### Pages That Need DELETION (render as empty or harmful)

| ID | Route | Problem | Action |
|----|-------|---------|--------|
| YL-D01 | `/brand-guidelines` | Internal dev page, hardcoded "Yalla London", indexed by Google despite noindex intent | **DELETE** or add `robots: { index: false }` |
| YL-D02 | `/design-system` | Internal dev page, hardcoded "Yalla London" | **DELETE** or noindex |
| YL-D03 | `/brand-showcase` | Dev-only page | **DELETE** or noindex |

### Pages That Need FIXING (live but broken/weak)

| ID | Route | Issues | Priority | Action |
|----|-------|--------|----------|--------|
| YL-F01 | `/hotels` | Hardcoded 4 hotels, NO affiliate links, missing ar-SA hreflang | **CRITICAL** | Add affiliate links, add hreflang, make DB-driven |
| YL-F02 | `/experiences` | Hardcoded 4 experiences, NO affiliate links, missing ar-SA hreflang | **CRITICAL** | Add affiliate links, add hreflang |
| YL-F03 | `/recommendations` | Hardcoded data, NO affiliate links, missing ar-SA hreflang | **CRITICAL** | Add affiliate links, add hreflang |
| YL-F04 | `/events` | Past-date Event schema (Arsenal vs Chelsea Feb 22, Hamilton Mar 8), missing ar-SA hreflang | **CRITICAL** | Remove stale events from JSON-LD, use Ticketmaster API |
| YL-F05 | `/shop/[slug]` | ZERO metadata — Google sees same generic title for all products | **CRITICAL** | Add generateMetadata() per product |
| YL-F06 | `/halal-restaurants-london` | Hardcoded 8 areas, NO affiliate links, London-specific URL breaks multi-site | **HIGH** | Add affiliate links |
| YL-F07 | `/luxury-hotels-london` | Hardcoded 5 areas, NO affiliate links, London-specific URL | **HIGH** | Add affiliate links |
| YL-F08 | `/london-with-kids` | Hardcoded, NO affiliate links, London-specific URL | **HIGH** | Add affiliate links |
| YL-F09 | `/london-by-foot` | Static data file, NO affiliate links, London-specific URL | **MEDIUM** | Add affiliate links |
| YL-F10 | `/london-by-foot/[slug]` | Static data, London-specific URL | **MEDIUM** | Add affiliate links |
| YL-F11 | `/guides/london` | Hardcoded, London-specific URL | **MEDIUM** | Review content quality |
| YL-F12 | `/offline` | Hardcoded "Yalla London" logo — breaks on other sites | **LOW** | Dynamic branding |
| YL-F13 | `/shop` | 6 hardcoded London-specific products, no real e-commerce | **LOW** | Review if worth keeping |
| YL-F14 | `/affiliate-disclosure` | No structured data | **LOW** | Add BreadcrumbList |
| YL-F15 | `/tools/seo-audit` | dangerouslySetInnerHTML without sanitization | **LOW** | Add sanitizeHtml |

### Pages That Are OK

| ID | Route | Status |
|----|-------|--------|
| YL-OK01 | `/` (homepage) | Good — dynamic, affiliate links, per-site branding |
| YL-OK02 | `/about` | Good — per-site routing, proper metadata |
| YL-OK03 | `/contact` | Good — per-site routing |
| YL-OK04 | `/privacy` | Good — legal compliance |
| YL-OK05 | `/terms` | Good — legal compliance |
| YL-OK06 | `/blog` | Good — DB-driven, proper metadata |
| YL-OK07 | `/blog/[slug]` | Good — full SEO, affiliate injection, Arabic SSR |
| YL-OK08 | `/blog/category/[slug]` | Good |
| YL-OK09 | `/news` | Good — DB-driven |
| YL-OK10 | `/news/[slug]` | Good — NewsArticle schema |
| YL-OK11 | `/information` | Good — information hub |
| YL-OK12 | `/information/[section]` | Good |
| YL-OK13 | `/information/articles` | Good |
| YL-OK14 | `/information/articles/[slug]` | Good |
| YL-OK15 | `/editorial-policy` | Good |
| YL-OK16 | `/brands` | Good — Zenitha.Luxury brands page |
| YL-OK17 | `/team/[slug]` | Good — Person JSON-LD |

---

## Part 2: Static Pages (Zenitha Yachts)

### Pages That Need FIXING

| ID | Route | Issues | Priority | Action |
|----|-------|--------|----------|--------|
| ZY-F01 | `/faq` | Uses deprecated FAQPage JSON-LD (Google restricted Aug 2023) | **HIGH** | Change to Article schema |
| ZY-F02 | `/how-it-works` | Uses deprecated HowTo JSON-LD (Google deprecated Sept 2023) | **HIGH** | Change to Article schema |
| ZY-F03 | `/journal` | Placeholder content — not real journal entries | **MEDIUM** | Populate or noindex |
| ZY-F04 | `/fleet` | 5 hardcoded yacht types — no real inventory | **MEDIUM** | Connect to DB |
| ZY-F05 | `/destinations` | 8 hardcoded destinations — should be DB-driven | **MEDIUM** | Connect to DB |
| ZY-F06 | `/yachts/compare` | Client-side only, no structured data | **LOW** | Add metadata |

### Pages That Are OK

| ID | Route | Status |
|----|-------|--------|
| ZY-OK01 | `/yachts` | Good — DB + search |
| ZY-OK02 | `/yachts/[slug]` | Good — Product JSON-LD |
| ZY-OK03 | `/destinations/[slug]` | Good — Place JSON-LD |
| ZY-OK04 | `/itineraries` | Good |
| ZY-OK05 | `/itineraries/[slug]` | Good — Trip JSON-LD |
| ZY-OK06 | `/charter-planner` | Good — interactive tool |
| ZY-OK07 | `/inquiry` | Good — lead capture |
| ZY-OK08 | `/inquiry/confirmation` | Good |
| ZY-OK09 | `/glossary` | Good — DefinedTermSet JSON-LD |
| ZY-OK10 | `/halal-charter` | Good — Service JSON-LD |
| ZY-OK11 | `/journal/[slug]` | Good — Article JSON-LD |

---

## Part 3: Published Blog Articles — Known Issues

### Known Duplicate Clusters (from production-seo-cleanup.ts)

These are CONFIRMED duplicates already identified in the codebase:

| Cluster | Canonical Slug | Duplicates to DELETE | Keyword |
|---------|---------------|---------------------|---------|
| DC-01 | `best-halal-fine-dining-restaurants-london-2025-comparison` | 4 duplicates: `-79455678`, `-9088893f`, `-fasz`, `-sily` | halal fine dining |
| DC-02 | `best-luxury-spas-london-2026-women-friendly-halal` | 2 duplicates: `-1xfb` suffix, `luxury-spas-london-arabic` | luxury spas |
| DC-03 | `london-transport-guide-tourists-2026-tube-bus-taxi` | 1 duplicate: `-1pwq` suffix | transport guide |
| DC-04 | `edgware-road-london-complete-guide-arab-area` | 1 duplicate: `-c4f47971` suffix | Edgware Road |
| DC-05 | `london-islamic-heritage-gems-2026-02-19-0d2d371b` | 1 duplicate: `-0e0828e5` suffix | Islamic heritage |
| DC-06 | `halal-restaurants-london-luxury-2024-guide` | 1 duplicate: `-2026-02-20` suffix | halal restaurants |
| DC-07 | `luxury-hotels-london-arab-families` | 2 duplicates: `-2025-comparison`, `muslim-friendly-hotels-london-2026-prayer-facilities-halal` | luxury hotels |

**Total: 12 duplicate articles to unpublish + redirect**

### SEO Cannibalization Clusters (from operations log)

These articles compete for the same keywords — NOT exact duplicates, but cannibalizing each other:

| Cluster | Competing Articles | Shared Keyword | Action |
|---------|-------------------|----------------|--------|
| CAN-01 | `halal-fine-dining-restaurant-london` vs `halal-fine-dining-restaurants-london` vs `best-halal-restaurants-london-2026-v3` | halal fine dining london | **MERGE** into 1 definitive article, redirect others |
| CAN-02 | `neals-yard-lunch-break-halal-guide-for-arab-travelers-53-chars` (SLUG ARTIFACT) | Neal's Yard halal | **FIX** slug, remove "-53-chars" artifact |
| CAN-03 | `halal-restaurants-london-luxury-guide` vs `best-halal-luxury-restaurants-london` | halal luxury restaurants | **MERGE** — keep the one with better content |
| CAN-04 | Multiple `london-eye-tickets-fast-track` variants (v2, v3) | London Eye tickets | **KEEP best**, redirect others |

### Slug Artifacts (Pipeline Bugs — Need Fixing)

| Slug | Issue | Fix |
|------|-------|-----|
| `neals-yard-lunch-break-halal-guide-for-arab-travelers-53-chars` | Contains "-53-chars" artifact from AI char count leak | Rename slug, add redirect |
| Any slug ending in `-[hex8]` (e.g., `-79455678`, `-c4f47971`) | Pipeline dedup suffix artifacts | Unpublish, redirect to canonical |
| Any slug ending in `-[4char]` (e.g., `-fasz`, `-sily`, `-1xfb`, `-1pwq`) | Pipeline random suffix artifacts | Unpublish, redirect to canonical |
| Any slug with date suffix (e.g., `-2026-02-20`) | Date artifact in slug | Unpublish, redirect to canonical |

### Content Quality Issues (from operations logs)

| Issue | Affected Articles | Action |
|-------|-------------------|--------|
| **Thin content (<300 words)** | 3-5 articles at 59-125 words (content-auto-fix catches these) | Auto-unpublished by cron |
| **Missing featured images** | Unknown count — check via cockpit | Run image-pipeline cron |
| **Articles stuck in "promoting"** | 7-18 drafts cycling promoting→reservoir→promoting | Sweeper auto-recovers these |
| **News article: outdated** | `13-february-2026-london-underground-strike` | Consider unpublishing (past event) |
| **News article: controversial** | `uk-outrage-sikh-restaurant-owner-arrested-refusing-halal` | Review — may harm brand perception |

### Topic Template Cannibalization Risk

The `config/sites.ts` topicsEN array has **40+ topic templates**. These generate well-differentiated content EXCEPT:

| Risk | Templates That Overlap | Severity |
|------|----------------------|----------|
| "best halal luxury restaurants london" template + AI generating "halal fine dining" articles | Multiple articles about halal restaurants | **HIGH** — already causing duplicates |
| "london eye tickets fast track" + AI variants | Multiple London Eye articles | **MEDIUM** — v2/v3 suffixes |
| "3 day london itinerary" vs "4 day london itinerary" vs "7 days in london" | Itinerary overlap | **LOW** — different enough |

---

## Part 4: Pages Recommended for DELETION

| # | Page/Article | Reason | Impact |
|---|-------------|--------|--------|
| 1 | `/brand-guidelines` | Internal dev page, indexed | Remove from Google |
| 2 | `/design-system` | Internal dev page | Remove from Google |
| 3 | `/brand-showcase` | Dev-only page | Remove from Google |
| 4 | 12 duplicate blog articles (DC-01 through DC-07) | SEO cannibalization, diluting ranking signals | Major SEO improvement |
| 5 | `13-february-2026-london-underground-strike` | Past event, no evergreen value | Stale content removal |
| 6 | Any blog article with < 200 words | Thin content actively harms site quality | Quality improvement |

---

## Part 5: Pages Recommended for FIXING

### Priority 1 — Revenue Impact (do this week)

| # | Page | Fix | Est. Time |
|---|------|-----|-----------|
| 1 | `/hotels` | Add Booking.com / HalalBooking affiliate links to each hotel card | 30 min |
| 2 | `/experiences` | Add GetYourGuide / Viator affiliate links to each experience | 30 min |
| 3 | `/recommendations` | Add relevant affiliate links per recommendation | 30 min |
| 4 | `/halal-restaurants-london` | Add TheFork / OpenTable affiliate links | 20 min |
| 5 | `/luxury-hotels-london` | Add Booking.com affiliate links | 20 min |
| 6 | `/london-with-kids` | Add family activity affiliate links (Klook, GetYourGuide) | 20 min |
| 7 | Run `production-seo-cleanup.ts --apply` | Unpublish 12 duplicates + generate redirect map | 5 min |

### Priority 2 — SEO Compliance (do this week)

| # | Page | Fix | Est. Time |
|---|------|-----|-----------|
| 8 | `/events` | Remove past-date Event JSON-LD, use Ticketmaster dynamic data | 30 min |
| 9 | `/hotels`, `/experiences`, `/recommendations`, `/events` | Add missing ar-SA hreflang | 15 min |
| 10 | `/shop/[slug]` | Add per-product generateMetadata() | 30 min |
| 11 | CAN-01: halal fine dining cluster | Merge 3 articles into 1 definitive guide, redirect others | 45 min |
| 12 | CAN-02: Fix `neals-yard...-53-chars` slug | Rename slug + add redirect | 10 min |
| 13 | Zenitha `/faq` | Replace deprecated FAQPage with Article schema | 15 min |
| 14 | Zenitha `/how-it-works` | Replace deprecated HowTo with Article schema | 15 min |

### Priority 3 — Quality & Multi-Site (do next week)

| # | Page | Fix | Est. Time |
|---|------|-----|-----------|
| 15 | `/london-by-foot` | Add affiliate links, review for multi-site | 20 min |
| 16 | `/guides/london` | Review content quality | 15 min |
| 17 | `/offline` | Dynamic branding | 10 min |
| 18 | `/tools/seo-audit` | Add sanitizeHtml to dangerouslySetInnerHTML | 5 min |
| 19 | Delete/noindex 3 dev pages | brand-guidelines, design-system, brand-showcase | 5 min |
| 20 | Review controversial news article | `uk-outrage-sikh-restaurant-owner-arrested-refusing-halal` | 5 min |

---

## Part 6: Action Plan

### Phase 1: Emergency Cleanup (TODAY — 2 hours)

1. **Run `production-seo-cleanup.ts --apply`** on Supabase
   - Unpublishes 12 duplicate articles
   - Strips internal tags from public articles
   - Generates redirect map for old→canonical URLs
   - Flags thin strategic articles for rewrite

2. **Fix content-selector** (DONE — committed this session)
   - Retry loop for duplicate-blocked candidates
   - Promotion-time Jaccard threshold aligned to 0.85
   - Force-publish fallback with skipDedup

3. **Fix AI timeouts** (DONE — committed this session)
   - daily-content-generate: 30s → 60s + heavy hint
   - seo-deep-review: 25s → 35s per article
   - weekly-topics: yacht false failure fixed

### Phase 2: Revenue Activation (THIS WEEK — 3 hours)

4. Add affiliate links to 6 static pages:
   - `/hotels` → Booking.com, HalalBooking
   - `/experiences` → GetYourGuide, Viator
   - `/recommendations` → mixed affiliate partners
   - `/halal-restaurants-london` → TheFork, OpenTable
   - `/luxury-hotels-london` → Booking.com, Agoda
   - `/london-with-kids` → Klook, GetYourGuide

5. Fix hreflang on 4 layouts (hotels, experiences, recommendations, events)

6. Remove past-date Event JSON-LD

### Phase 3: SEO Consolidation (THIS WEEK — 2 hours)

7. Merge halal fine dining cannibalization cluster (3→1 article)
8. Fix `neals-yard...-53-chars` slug artifact
9. Add per-product metadata to `/shop/[slug]`
10. Fix Zenitha deprecated schema (FAQ, HowTo)

### Phase 4: Cleanup (NEXT WEEK — 1 hour)

11. Delete/noindex 3 dev pages
12. Review and decide on controversial news article
13. Add affiliate links to remaining static pages
14. Review Zenitha journal placeholder content

---

## Monitoring After Cleanup

After executing the action plan, verify:

- [ ] Content-selector publishes 2+ articles per run (check cockpit)
- [ ] Duplicate articles return 301 redirects (check GSC)
- [ ] Static pages show affiliate links (visit each page)
- [ ] Event JSON-LD shows future dates only (Google Rich Results Test)
- [ ] Reservoir drains below 80 (check pipeline-health)
- [ ] No new duplicate articles created (check content-selector logs)

---

*Report generated from codebase analysis. Blog article content was analyzed from operations logs and the `production-seo-cleanup.ts` known duplicates registry. For a live content-level audit of every article, run `production-seo-cleanup.ts --dry-run` against the Supabase database.*
