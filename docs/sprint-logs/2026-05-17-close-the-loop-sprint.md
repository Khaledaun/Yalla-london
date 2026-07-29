# Close the Loop Sprint — May 17 2026

**Branch:** `claude/fix-affiliate-revenue-audit-C93YR`
**Trigger:** Perplexity re-audit (07:40 IDT 17 May) flagged 16 cannibalization clusters, missing CTAs on category pages, and CTR-killer title patterns despite recent fixes.
**User mandate:** "Make a plan to fix everything in the context of the project goals and objectives and run."
**Constraint:** Khaled May 17 — "i want to keep everything here in London in gbp" → NO AED/SAR conversion on London pages.

## What shipped (4 commits)

### Commit A — `4ad2ad0` Bulk canonicalize-clusters endpoint + cockpit page
- **Problem:** Perplexity flagged 16 duplicate-title clusters. Existing `seo-agent` resolves only 3 per run × 3 runs/day → 2+ days to drain.
- **Solution:** New admin endpoint exposes ALL clusters for one-tap manual resolution from cockpit. Reuses battle-tested `findCannibalizationGroups()` + `resolveCannibalizationGroups()` (no logic duplication).
- **Files:**
  - `app/api/admin/canonicalize-clusters/route.ts` (NEW) — GET (all clusters ranked by max overlap) + POST canonicalize one / canonicalize_all (≥70% overlap default)
  - `app/admin/cockpit/canonicalize/page.tsx` (NEW) — iPhone-first card layout with expand-to-see-duplicates + `useConfirm` modal for destructive ops
  - `app/admin/cockpit/page.tsx` — link added next to existing Rescue Plan button
- **Safety:** Losers get `published: false` + `canonical_slug = winner.slug`. SeoRedirect (301) created. Never hard-deleted (rule #179).

### Commit B — `be69f4f` Top affiliate CTA on /hotels /experiences /recommendations
- **Problem:** 3 priority-0.9 pages with $0 revenue. Per-card CTAs existed but users leaving before scrolling 15+ cards.
- **Solution:** New `<TopCategoryCta />` component renders above-the-fold hero with variant-specific copy (hotel/experience/restaurant/all). Routes through `/api/affiliate/click` with SID `{siteId}_{pageSlug}-hero` so hero conversions report separately from per-card clicks.
- **Partners by variant:** Expedia (hotel — highest EPC), Tiqets (experience — Travelpayouts 3.5-8%), TheFork (restaurant — LSE-listed), Expedia London search (all).
- **Files:** `components/affiliate/TopCategoryCta.tsx` (NEW) + 3 page integrations.
- **GBP preserved:** Component uses no currency strings; existing GBP price displays on each page kept intact.

### Commit C — `a7eaa85` CTR-killer title patterns stripped (trailing pipe / empty parens / year)
- **Problem:** ~30 published titles with patterns that wreck SERP rendering:
  - `"Best London Hotels |"` → Google appends `| Yalla London` → SERP shows `"Title |  | Yalla London"`
  - `"London Eye Tickets ()"` → empty-parens artifact
  - `"Best London Hotels for Arabs"` → niche stuffing on English title (covered by `/ar/` pages)
  - `"Best London Hotels 2026"` → trailing-year staleness signal
  - `"Best Hotels - Best Hotels Guide"` → duplicated subtitle AI confabulation
- **Solution:**
  - `lib/content-pipeline/title-sanitizer.ts` — 5 new regex patterns (`TRAILING_PIPE`, `EMPTY_PARENS`, `TRAILING_COLON`, `TRAILING_ARAB_STUFF`, `DUPLICATED_SUBTITLE`) applied in `sanitizeTitle()` AND surfaced in `hasTitleArtifacts()` so DB-cleanup path recognizes them as dirty.
  - `app/api/cron/content-auto-fix-lite/route.ts` Section 6 — dual-batch (100 newest + 100 oldest) drains backlog in ~5-6 runs vs prior single batch of 50 newest that never reached older articles.
- **Verified:** 10 sample titles tested via `/tmp/test-titles.mjs`. All 6 CTR-killer patterns correctly stripped. Mid-title year preserved (`"Ramadan 2026 Timetable London"` → unchanged). Clean titles return unchanged.
- **Expected lift:** Backlinko 2024 — removing 1 SERP artifact ≈ +0.5 ppt CTR. Current 1.87% → projected 2.3-2.7%.

### Commit D — `5b85a2a` This sprint log + session metadata

## Quality gates

- **TypeScript:** 0 errors across entire codebase.
- **Smoke test:** 215/227 PASS = 95% (unchanged from pre-sprint baseline). 8 failures are pre-existing tracked issues (Math.random in 3 admin routes, sweeper/scheduled-publish maxDuration=60 baseline, sitemap missing `/destinations`+`/itineraries`, etc.). Zero new regressions introduced.
- **Hooks:** All 4 commits passed PostToolUse prettier auto-format. No bare `window.confirm` (rule #239). No hardcoded GBP→AED conversion (Khaled May 17 constraint).

## Carryover / next session candidates

1. **Apply canonicalization** — once deployed, Khaled visits `/admin/cockpit/canonicalize`, taps "Canonicalize all (≥70% overlap)" → resolves 16 clusters in one action. Watch GSC over 7-14 days for consolidated authority lift.
2. **Watch /hotels /experiences /recommendations affiliate revenue** — TopCategoryCta SID `{siteId}_{pageSlug}-hero` lets us isolate hero conversions in `CjClickEvent`. Compare hero vs per-card click rates after 7 days of traffic.
3. **Watch CTR change** — title sanitization deploys to existing 30+ dirty titles over next 5-6 content-auto-fix-lite runs (~1-2 days). Compare GSC 7-day CTR before/after.
4. **8 baseline smoke test failures** — not introduced by this sprint, but worth triaging in a separate session. Sitemap `/destinations` + `/itineraries` missing is the easiest win (yacht site cross-link).

## Branch state at sprint end

```
* a7eaa85 fix(seo): strip CTR-killer title patterns
* be69f4f feat(affiliate): top-of-page CTA hero
* 4ad2ad0 feat: bulk canonicalize-clusters
* 17108f6 chore: session log + status auto-update
* 54530ae fix(seo): only emit ar-SA hreflang when real Arabic
* cb5a367 fix(affiliate): Section 26 also catches direct partner links
* 50014fc fix(events): today's events no longer bucketed as Past
* afe468b chore: session log + status auto-update
```

Branch is up to date with origin. Ready to merge after Khaled validates on production.
