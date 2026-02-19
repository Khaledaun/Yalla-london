# SEO Implementation Matrix

**Date:** 2026-02-19
**Version:** 1.0
**Scope:** All 5 Zenitha Network sites

## Summary

| Priority | Total | Fixed | Remaining |
|----------|-------|-------|-----------|
| P0 (Critical) | 4 | 4 | 0 |
| P1 (High) | 5 | 5 | 0 |
| P2 (Medium) | 3 | 1 | 2 |
| P3 (Low) | 2 | 0 | 2 |
| **Total** | **14** | **10** | **4** |

---

## P0 — Critical (Blocking Indexation or Producing Invalid Output)

### P0-001: StructuredData hardcoded to "Yalla London"
- **File:** `components/structured-data.tsx`
- **Issue:** 6+ hardcoded "Yalla London" references in Organization, WebSite, Article schema. All sites produce Yalla London identity.
- **Impact:** Schema mismatch for all non-primary sites; Google may ignore/penalize conflicting identity signals.
- **Fix:** Added `siteId` prop, resolved `siteName`, `siteSlug`, `siteDomain`, `siteCountry`, `siteDestination` dynamically from `config/sites.ts`.
- **Status:** ✅ FIXED

### P0-002: FAQPage schema still generated (deprecated Aug 2023)
- **File:** `components/structured-data.tsx`
- **Issue:** FAQPage schema type was deprecated by Google in August 2023. Generating it produces warnings in Search Console and wastes crawl budget.
- **Impact:** Invalid structured data warnings; no rich results generated from FAQPage for non-gov/health sites.
- **Fix:** Changed `faq` page type to generate `Article` schema instead.
- **Status:** ✅ FIXED

### P0-003: Sitemap hreflang codes incorrect
- **File:** `app/sitemap.ts`
- **Issue:** Used `en`/`ar` language codes instead of `en-GB`/`ar-SA`. Missing `x-default` alternate entirely.
- **Impact:** Google may not correctly associate language variants; missing x-default means no fallback for unmatched locales.
- **Fix:** Created centralized `hreflang()` helper with `en-GB`, `ar-SA`, `x-default`. Applied to ALL page categories.
- **Status:** ✅ FIXED

### P0-004: HreflangTags hardcoded base URL
- **File:** `components/hreflang-tags.tsx`
- **Issue:** Fallback URL hardcoded to `https://www.yalla-london.com`. All non-primary sites produce wrong hreflang URLs.
- **Impact:** Hreflang signals point all sites to yalla-london.com; Google may ignore hreflang or create canonicalization confusion.
- **Fix:** Changed fallback to `getSiteDomain(getDefaultSiteId())` from config.
- **Status:** ✅ FIXED

---

## P1 — High (Incorrect but Not Immediately Blocking)

### P1-001: Sitemap missing 6+ static pages
- **File:** `app/sitemap.ts`
- **Issue:** Pages `/experiences`, `/hotels`, `/privacy`, `/terms`, `/affiliate-disclosure`, `/shop` not included in sitemap.
- **Impact:** These pages may not be discovered/indexed without sitemap inclusion.
- **Fix:** Added all 6 pages with proper hreflang alternates. Added London by Foot hub (conditional on yalla-london).
- **Status:** ✅ FIXED

### P1-002: Events missing hreflang alternates
- **File:** `app/sitemap.ts`
- **Issue:** Event pages in sitemap had no hreflang language alternates.
- **Impact:** Arabic event pages not linked to English counterparts; potential duplicate content.
- **Fix:** Applied `hreflang()` helper to events section.
- **Status:** ✅ FIXED

### P1-003: Blog hub uses non-standard "Blog" schema type
- **File:** `app/blog/page.tsx`
- **Issue:** Used `@type: "Blog"` which is not a Google-supported rich result type.
- **Impact:** No structured data benefits from blog listing page.
- **Fix:** Changed to `@type: "ItemList"` with `ListItem` elements (Google-supported).
- **Status:** ✅ FIXED

### P1-004: Blog hub metadata hardcoded
- **File:** `app/blog/page.tsx`
- **Issue:** Title, description, keywords, OG, Twitter card all hardcoded to "Yalla London" and "London".
- **Impact:** All sites show London-specific metadata regardless of destination.
- **Fix:** Resolved `siteId` from headers, loaded site config, made all metadata dynamic.
- **Status:** ✅ FIXED

### P1-005: Transactional pages indexable
- **Files:** `app/shop/download/layout.tsx`, `app/shop/purchases/layout.tsx`
- **Issue:** Download and purchases pages had no robots directive. Thin/transactional pages waste crawl budget.
- **Impact:** Crawl budget waste; thin content may dilute site quality signals.
- **Fix:** Created layout files with `robots: { index: false, follow: false }`.
- **Status:** ✅ FIXED

---

## P2 — Medium (Suboptimal but Functional)

### P2-001: Root layout PWA meta tags hardcoded
- **File:** `app/layout.tsx`
- **Issue:** `theme-color` and `apple-mobile-web-app-title` hardcoded to Yalla London values.
- **Impact:** PWA appearance incorrect on non-primary sites. Minor SEO impact.
- **Fix:** Changed to read from `getSiteConfig(getDefaultSiteId())`.
- **Status:** ✅ FIXED

### P2-002: No `font-display: swap` on Google Fonts
- **File:** `app/layout.tsx`
- **Issue:** Google Fonts loaded via preconnect but no explicit `font-display: swap`.
- **Impact:** Potential FOIT (Flash of Invisible Text) affecting CLS.
- **Fix:** Noted in performance baseline. Requires CSS change or next/font migration.
- **Status:** ⏳ DEFERRED (non-blocking)

### P2-003: Hero images missing `priority` prop
- **Files:** Blog post featured images, homepage hero
- **Issue:** Above-fold images may not have `priority` on `next/image`, causing LCP wait for lazy load trigger.
- **Impact:** LCP may exceed 2.5s target.
- **Fix:** Requires per-component audit of `next/image` usage.
- **Status:** ⏳ DEFERRED (non-blocking)

---

## P3 — Low (Optimization Opportunities)

### P3-001: Scroll depth tracking inline
- **File:** `app/layout.tsx`
- **Issue:** Scroll depth tracking runs as inline `<script>` via dangerouslySetInnerHTML.
- **Impact:** Minimal (~30 lines), but technically render-blocking.
- **Fix:** Consider moving to `afterInteractive` Script component.
- **Status:** ⏳ DEFERRED

### P3-002: ItemList schema on other listing pages
- **Files:** Category pages, info hub, experiences, hotels
- **Issue:** Blog hub now has ItemList schema, but other listing pages don't.
- **Impact:** Missed rich result opportunities on listing pages.
- **Fix:** Add ItemList schema generation to category and hub pages.
- **Status:** ⏳ DEFERRED

---

## Files Changed

| File | Change Type | Lines Changed |
|------|-------------|---------------|
| `app/sitemap.ts` | Modified | ~80 lines |
| `components/structured-data.tsx` | Modified | ~40 lines |
| `components/hreflang-tags.tsx` | Modified | ~10 lines |
| `app/layout.tsx` | Modified | ~8 lines |
| `app/blog/page.tsx` | Modified | ~60 lines |
| `app/shop/download/layout.tsx` | New | 15 lines |
| `app/shop/purchases/layout.tsx` | New | 15 lines |
| `scripts/seo-audit.ts` | New | ~650 lines |
| `docs/seo/MAX_SEO_SPEC.md` | New | ~1230 lines |
| `docs/seo/QA_LEDGER.md` | New | ~207 lines |
| `docs/seo/CHANGELOG.md` | New | ~120 lines |
| `docs/seo/IMPLEMENTATION_MATRIX.md` | New | This file |
| `docs/seo/baseline/*.json` | New | 4 files |
| `docs/seo/baseline/perf_notes.md` | New | ~77 lines |

---

## Verification Checklist

- [x] All P0 issues resolved
- [x] All P1 issues resolved
- [x] No new TypeScript errors introduced
- [x] Sitemap includes all public pages with correct hreflang
- [x] StructuredData component works for all 5 sites
- [x] HreflangTags component uses dynamic base URL
- [x] FAQPage schema no longer generated
- [x] Blog hub uses ItemList schema
- [x] Transactional pages have noindex
- [x] Root layout metadata is multi-site aware
- [ ] SEO audit script passes all checks
- [ ] Build compiles successfully
