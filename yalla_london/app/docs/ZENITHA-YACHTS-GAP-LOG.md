# Zenitha Yachts — Comprehensive Gap Log

> Tracks ALL gaps found and fixed throughout the entire Zenitha Yachts build (zenithayachts.com, siteId: `zenitha-yachts-med`).
> Created: 2026-02-22 | Last Updated: 2026-02-22
> Cross-references: `docs/AUDIT-LOG.md` (platform-wide), `docs/FUNCTIONING-ROADMAP.md` (phase plan)

---

## Summary

| Severity | Total Found | Fixed | Open |
|----------|-------------|-------|------|
| CRITICAL | 5 | 5 | 0 |
| HIGH | 2 | 2 | 0 |
| MEDIUM | 10 | 0 | 10 |
| LOW | 8 | 0 | 8 |
| **TOTAL** | **25** | **7** | **18** |

**Current Posture:** All CRITICAL and HIGH gaps resolved. 18 remaining items are MEDIUM (UX/polish) and LOW (documentation artifacts, minor a11y). None block launch or revenue generation.

---

## Table of Contents

1. [Critical Gaps (Fixed)](#1-critical-gaps-fixed)
2. [High Gaps (Fixed)](#2-high-gaps-fixed)
3. [Medium Gaps (Open)](#3-medium-gaps-open)
4. [Low Gaps (Open)](#4-low-gaps-open)
5. [Previously Resolved Platform Gaps (KG-001 through KG-052)](#5-previously-resolved-platform-gaps)
6. [Audit Session Cross-Reference](#6-audit-session-cross-reference)

---

## 1. Critical Gaps (Fixed)

These were pipeline-breaking or data-contamination issues that would have caused cross-site pollution or missing test coverage.

| ID | Area | Severity | Description | Status | Fix Applied | File(s) Affected |
|----|------|----------|-------------|--------|-------------|-----------------|
| ZY-C01 | Content Pipeline | CRITICAL | Yacht site included in blog content pipeline (`daily-content-generate`) — would generate unwanted blog articles for the yacht charter site, polluting its content with travel blog posts instead of charter-relevant content | FIXED | Added `isYachtSite()` exclusion check to skip yacht sites during blog content generation loop | `app/api/cron/daily-content-generate/route.ts` |
| ZY-C02 | Content Pipeline | CRITICAL | Yacht site included in `weekly-topics` cron — would generate blog-style TopicProposals for the yacht site, filling its topic queue with irrelevant travel blog topics | FIXED | Added `isYachtSite()` exclusion check to skip yacht sites during topic generation loop | `app/api/cron/weekly-topics/route.ts` |
| ZY-C03 | Test Coverage | CRITICAL | Missing test for `GET /api/yachts/[id]` in test-connections.html — yacht detail endpoint had zero integration test coverage, meaning broken detail pages would go undetected | FIXED | Added yacht detail test with dynamic ID lookup (fetches list first, then tests detail with first result's ID) | `public/test-connections.html` |
| ZY-C04 | Test Coverage | CRITICAL | Missing test for `POST /api/yachts/recommend` in test-connections.html — AI recommendation endpoint had zero test coverage | FIXED | Added AI recommendation endpoint test with sample preference payload | `public/test-connections.html` |
| ZY-C05 | Test Coverage | CRITICAL | Missing test for `POST /api/admin/yachts/sync` in test-connections.html — admin sync endpoint had zero test coverage | FIXED | Added admin sync test with manual refresh action payload | `public/test-connections.html` |

---

## 2. High Gaps (Fixed)

These were user-facing issues that would degrade the admin experience or SEO performance.

| ID | Area | Severity | Description | Status | Fix Applied | File(s) Affected |
|----|------|----------|-------------|--------|-------------|-----------------|
| ZY-H01 | Admin UX | HIGH | Yacht admin pages returned empty data on 401/403 auth failure with no error message — admin would see blank pages with no indication of what went wrong, violating "no silent failures" rule | FIXED | Added explicit error messages and error state UI for auth failures across all 6 yacht admin pages | `app/admin/yachts/page.tsx`, `app/admin/yachts/inquiries/page.tsx`, `app/admin/yachts/destinations/page.tsx`, `app/admin/yachts/analytics/page.tsx`, `app/admin/yachts/brokers/page.tsx`, `app/admin/yachts/itineraries/page.tsx` |
| ZY-H02 | SEO | HIGH | FAQ page missing `generateMetadata()` — no SEO metadata (title, description, canonical, hreflang, Open Graph, Twitter cards) on the FAQ page, meaning it would appear poorly in search results and social shares | FIXED | Added full `generateMetadata()` with site-aware title, description, canonical URL, hreflang alternates (en-GB, ar-SA, x-default), Open Graph tags, and Twitter card metadata | `app/faq/page.tsx` |

---

## 3. Medium Gaps (Open)

These are UX polish, feature completeness, and design consistency items. None block launch or revenue. Prioritized for post-launch iteration.

| ID | Area | Severity | Description | Status | Fix Applied | File(s) Affected |
|----|------|----------|-------------|--------|-------------|-----------------|
| ZY-M01 | Design System | MEDIUM | Yacht admin pages use hardcoded Tailwind color classes (e.g., `bg-blue-600`, `text-gray-700`) instead of Zenitha design tokens (`var(--z-navy)`, `var(--z-gold)`). Creates visual inconsistency between public yacht pages and admin yacht pages | OPEN | — | `app/admin/yachts/*.tsx` (all 8 admin pages) |
| ZY-M02 | Responsive Design | MEDIUM | Homepage hero section has no `max-width` constraint — on ultra-wide monitors (2560px+), content stretches edge-to-edge without readable line length limits | OPEN | — | `components/zenitha/zenitha-homepage.tsx` |
| ZY-M03 | Responsive Design | MEDIUM | Destination page grid uses `grid-cols-3` without responsive breakpoints — on mobile devices, 3-column grid forces horizontal scroll or tiny cards instead of stacking to 1-2 columns | OPEN | — | `app/destinations/page.tsx` |
| ZY-M04 | Responsive Design | MEDIUM | Itineraries sticky filter bar overflows on small phones (< 375px width) — filter buttons wrap incorrectly and overlap content | OPEN | — | `app/itineraries/page.tsx` |
| ZY-M05 | UX Polish | MEDIUM | Homepage yacht cards missing hover states — no visual feedback (shadow lift, border glow, scale transform) when user hovers over featured yacht cards, reducing perceived interactivity | OPEN | — | `components/zenitha/zenitha-homepage.tsx` |
| ZY-M06 | UX Polish | MEDIUM | Navigation items have no active state indicator — current page not visually distinguished in header nav, leaving users without location awareness | OPEN | — | `components/zenitha/zenitha-header.tsx` |
| ZY-M07 | Schema Consistency | MEDIUM | Design system field naming inconsistency — some models and APIs use `site` (string) while others use `siteId` (string). Both refer to the same concept but create confusion in API contracts | OPEN | — | Multiple API routes and Prisma models |
| ZY-M08 | CRM Feature | MEDIUM | Broker assignment UI missing in inquiries CRM — CharterInquiry table has a broker relationship field but the admin inquiries page has no dropdown/selector to assign a broker to an inquiry | OPEN | — | `app/admin/yachts/inquiries/page.tsx` |
| ZY-M09 | Content | MEDIUM | No content produced yet for yacht site — fleet inventory, destinations, and itineraries need manual seeding or import from external sources (NauSYS, MMK, Charter Index) before the site has meaningful content | OPEN | — | Database (Yacht, YachtDestination, CharterItinerary tables) |
| ZY-M10 | i18n | MEDIUM | Arabic route handling not optimized for yacht site — `/ar/` prefix routing works but yacht-specific content (fleet specs, itinerary descriptions, inquiry forms) has no Arabic translation pipeline or bilingual field population strategy | OPEN | — | `middleware.ts`, yacht page components |

---

## 4. Low Gaps (Open)

These are documentation artifacts, unused schema elements, and minor accessibility items. No impact on functionality or revenue.

| ID | Area | Severity | Description | Status | Fix Applied | File(s) Affected |
|----|------|----------|-------------|--------|-------------|-----------------|
| ZY-L01 | Prisma Schema | LOW | `YachtAmenity` model declared in Prisma schema but yacht amenities are stored as a JSON field on the `Yacht` model instead — model exists but is never queried or populated | OPEN | — | `prisma/schema.prisma` |
| ZY-L02 | Prisma Schema | LOW | `YachtImage` model declared in Prisma schema but yacht images are stored as a JSON array field on the `Yacht` model instead — model exists but is never queried or populated | OPEN | — | `prisma/schema.prisma` |
| ZY-L03 | Prisma Schema | LOW | `InquiryPriority` enum declared but CharterInquiry uses a simple string field for priority — enum exists in schema but is not referenced by any model | OPEN | — | `prisma/schema.prisma` |
| ZY-L04 | Prisma Schema | LOW | `BrokerTier` enum declared but BrokerPartner uses `commissionRate` (Float) for tier differentiation instead — enum exists in schema but is not referenced by any model | OPEN | — | `prisma/schema.prisma` |
| ZY-L05 | Prisma Schema | LOW | `AmenityCategory` enum declared but no model references it — intended for `YachtAmenity` model which is itself unused (see ZY-L01) | OPEN | — | `prisma/schema.prisma` |
| ZY-L06 | SEO | LOW | FAQ page uses FAQPage JSON-LD schema which Google deprecated for rich results in August 2023 — however, it remains valid for AI Overview comprehension and does not generate Search Console errors, so it is kept intentionally | OPEN | — | `app/faq/page.tsx` |
| ZY-L07 | Responsive Design | LOW | Missing responsive padding adjustments across several public yacht pages — content sits too close to screen edges on tablet-sized viewports (768px-1024px) | OPEN | — | `app/yachts/page.tsx`, `app/destinations/page.tsx`, `app/itineraries/page.tsx` |
| ZY-L08 | Accessibility | LOW | Missing ARIA attributes on some interactive elements — yacht card grids lack `role="list"`, filter dropdowns lack `aria-label`, image galleries lack `aria-roledescription="carousel"` | OPEN | — | `components/zenitha/zenitha-homepage.tsx`, `app/yachts/page.tsx`, `app/yachts/[slug]/page.tsx` |

---

## 5. Previously Resolved Platform Gaps

The Zenitha Yachts build sits on top of the shared multi-tenant platform. Before the yacht site was built, 14 audit rounds (Audits #1–#14, Feb 16–18, 2026) identified and resolved 400+ platform-wide issues tracked as KG-001 through KG-052 in `docs/AUDIT-LOG.md`.

### Key Platform Fixes That Directly Benefit Zenitha Yachts

| KG ID | Area | Description | Resolution | Audit # |
|-------|------|-------------|------------|---------|
| KG-019 | SEO | Duplicate IndexNow submission (seo-agent + seo/cron both submitting) | seo-agent discovers, seo/cron submits with backoff | #11 |
| KG-021 | Config | ~30 hardcoded URL fallbacks across API routes and lib files | Replaced with `getSiteDomain(getDefaultSiteId())` | #5, #7 |
| KG-022 | Config | 25+ hardcoded email addresses in 9 files | Dynamic `hello@${domain}` from site config | #11 |
| KG-023 | Security | XSS via `dangerouslySetInnerHTML` without sanitization | All 9 instances sanitized with `isomorphic-dompurify` | #10, #11 |
| KG-025 | Pipeline | Race conditions in topic claiming across concurrent cron runs | Atomic `updateMany` claiming with "generating" status | #12 |
| KG-028 | Auth | CRON_SECRET bypass — crons returned 401/503 when env var unset | Standard pattern: allow if unset, reject only if set and wrong | #9 |
| KG-030 | Pipeline | Build-runner processed only first active site | Loops ALL active sites with per-site budget guard | #9 |
| KG-033 | Content | Related articles were static-only, never queried DB | Async DB query + static merge, DB results prioritized | #11 |
| KG-034 | Affiliates | Affiliate injection had London-only destination URLs | Per-site destination URLs for all 5 sites | #10 |
| KG-040 | Security | 7 database API routes had no authentication | `requireAdmin` added to all handlers | #12 |
| KG-041 | Security | Admin setup endpoint allowed password reset after first admin created | Returns 403 when admin already exists | #12 |
| KG-042 | Security | 7 public mutation APIs had no authentication | `requireAdmin` added to all routes | #12 |
| KG-043 | Observability | 34 empty catch blocks across codebase | Central + per-file contextual logging added | #12 |
| KG-044 | SEO | 5 pages had static `metadata` instead of `generateMetadata()` | Converted to dynamic with `getBaseUrl()` utility | #12 |
| KG-048 | Security | Analytics API exposed raw `client_secret`, `client_id`, `private_key` | Replaced with boolean `_configured` indicators | #13 |
| KG-049 | Pipeline | `content-generator.ts` crash — missing required `category_id` field | Find-or-create default "General" category + system user | #13 |
| KG-050 | Security | 4 remaining XSS vectors in admin tools | Sanitized with `sanitizeHtml()` / `sanitizeSvg()` | #13 |
| KG-052 | SEO | Meta description minimum mismatch (70 in gate vs 120 in standards) | Aligned to 120 chars in pre-publication gate | #20 |

### Platform Gaps Still Open (Affecting All Sites Including Zenitha Yachts)

These are tracked in `docs/AUDIT-LOG.md` and `docs/FUNCTIONING-ROADMAP.md`. They are platform-level issues, not yacht-specific.

| KG ID | Area | Severity | Description | Status |
|-------|------|----------|-------------|--------|
| KG-020 | Prisma Schema | LOW | 16+ Prisma models never referenced in code (orphans) | Open — Phase 8 |
| KG-024 | Security | MEDIUM | No rate limiting on admin login endpoint | Open — Phase 1 |
| KG-027 | Templates | MEDIUM | Only Yalla London brand template exists | Open — Phase 7 |
| KG-032 | SEO | MEDIUM | No Arabic SSR — hreflang mismatch for AR pages | Open — Phase 8 |
| KG-035 | Analytics | MEDIUM | GA4 not connected — dashboard returns 0s for traffic | Open — Phase 6 |
| KG-036 | Alerts | MEDIUM | No push/email alerts for cron failures | Open — Phase 4 |
| KG-045 | Dashboard | HIGH | 13+ admin pages still show mock/placeholder data | Open — Phase 5 |
| KG-046 | Dashboard | HIGH | 14+ admin buttons dead (no handlers) | Open — Phase 5 |
| KG-047 | Navigation | HIGH | Broken sidebar links to /admin/news, /admin/facts | Open — Phase 5 |

---

## 6. Audit Session Cross-Reference

The following audit sessions from `docs/AUDIT-LOG.md` specifically touched Zenitha Yachts code or had direct impact on the yacht site:

| Audit # | Date | Scope | Yacht-Relevant Findings |
|---------|------|-------|------------------------|
| #15 (this log) | 2026-02-22 | Zenitha Yachts deep audit | 25 yacht-specific gaps (7 fixed, 18 open) |
| #17 | 2026-02-22 | Zenitha Yachts API mismatches, cross-site security, lightbox a11y, DB fields | 31 issues (19 fixed, 12 documented) |
| #18 | 2026-02-22 | Zenitha Yachts DB/pipeline/dashboard: weekly topics, blog siteId, yacht affiliates | 11 reported (3 fixed, 7 false positives, 1 doc-only) |
| #19-24 | 2026-02-22 | Yacht public pages: contact placeholders, newsletter, a11y, YachtReview schema | 12 issues (12 fixed) |
| #25 | 2026-02-22 | Multi-site pipeline: healthcheck scoping, Calendly fallback, domain regex, affiliates | 7 issues (7 fixed) |
| #26 | 2026-02-22 | Admin API auth comprehensive audit (162 routes) — confirmed 100% auth coverage including yacht routes | 0 issues |
| #27 | 2026-02-22 | Cron chain integrity: seo/cron budget guards, orphan routes, GET handlers | 4 issues (3 fixed) |
| #28 | 2026-02-22 | Middleware + public routes: newsletter siteId, blog API site scoping | 2 issues (2 fixed) |

### Build Sessions (Pre-Audit)

| Session | Date | Scope | Key Deliverables |
|---------|------|-------|-----------------|
| Zenitha Yachts Full Build | 2026-02-21 | Phase 0-6: DB models through deep audit | 68+ files, 8 Prisma models, 14 public pages, 8 admin pages, 13 API routes |
| Design System Overhaul | 2026-02-20 | 47 files, 8 Prisma models, 6 phases | Unified brand provider, media picker, email builder, video studio, content engine |
| Multi-Website Infra Prep | 2026-02-16 | Config-driven multi-site, 7 hardcoded removals | `getDefaultSiteId()`, `getDefaultSiteName()`, multi-site cron loops |

---

## Appendix A: Yacht-Specific Architecture

### Database Models (8 models, 8 enums)

| Model | Purpose | Status |
|-------|---------|--------|
| `Yacht` | Fleet inventory — specs, pricing, images (JSON), amenities (JSON) | Active |
| `YachtDestination` | Charter destinations with seasons and pricing | Active |
| `CharterItinerary` | Day-by-day route plans | Active |
| `CharterInquiry` | Customer inquiry CRM | Active |
| `BrokerPartner` | Partner brokers with commission tracking | Active |
| `YachtAvailability` | Calendar availability slots | Active |
| `YachtAmenity` | Individual amenity records | Unused (see ZY-L01) |
| `YachtImage` | Individual image records | Unused (see ZY-L02) |

### Public Pages (14)

| Page | Route | SEO | Structured Data |
|------|-------|-----|----------------|
| Homepage | `/` | generateMetadata | Organization, WebSite |
| Yacht Search | `/yachts` | generateMetadata | BreadcrumbList |
| Yacht Detail | `/yachts/[slug]` | generateMetadata | Product, BreadcrumbList |
| Destinations Hub | `/destinations` | generateMetadata | BreadcrumbList |
| Destination Detail | `/destinations/[slug]` | generateMetadata | Place, BreadcrumbList |
| Itineraries Hub | `/itineraries` | generateMetadata | BreadcrumbList |
| Itinerary Detail | `/itineraries/[slug]` | generateMetadata | Trip, BreadcrumbList |
| Charter Planner | `/charter-planner` | generateMetadata | BreadcrumbList |
| Inquiry Form | `/inquiry` | generateMetadata | BreadcrumbList |
| FAQ | `/faq` | generateMetadata | FAQPage, BreadcrumbList |
| How It Works | `/how-it-works` | generateMetadata | BreadcrumbList |
| About | `/about` | generateMetadata (site-aware) | Organization, BreadcrumbList |
| Contact | `/contact` | generateMetadata (site-aware) | BreadcrumbList |
| Blog | `/blog` | generateMetadata | Article (per post) |

### Admin Pages (8)

| Page | Route | Auth |
|------|-------|------|
| Fleet Inventory | `/admin/yachts` | withAdminAuth |
| Add Yacht | `/admin/yachts/new` | withAdminAuth |
| Inquiries CRM | `/admin/yachts/inquiries` | withAdminAuth |
| Destinations | `/admin/yachts/destinations` | withAdminAuth |
| Itineraries | `/admin/yachts/itineraries` | withAdminAuth |
| Brokers | `/admin/yachts/brokers` | withAdminAuth |
| Analytics | `/admin/yachts/analytics` | withAdminAuth |
| Sync & Imports | `/admin/yachts/sync` | withAdminAuth |

### API Routes (13+ endpoints)

| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/admin/yachts` | GET, POST | withAdminAuth | Fleet CRUD |
| `/api/admin/yachts/destinations` | GET, POST, PUT, DELETE | withAdminAuth | Destinations CRUD |
| `/api/admin/yachts/inquiries` | GET, PUT | withAdminAuth | Inquiry management |
| `/api/admin/yachts/itineraries` | GET, POST, PUT, DELETE | withAdminAuth | Itineraries CRUD |
| `/api/admin/yachts/brokers` | GET, POST, PUT, DELETE | withAdminAuth | Broker management |
| `/api/admin/yachts/analytics` | GET | withAdminAuth | KPI dashboard data |
| `/api/admin/yachts/sync` | POST | withAdminAuth | External source sync |
| `/api/yachts` | GET | Public | Fleet search + filter |
| `/api/yachts/[id]` | GET | Public | Yacht detail |
| `/api/yachts/destinations` | GET | Public | Destination listing |
| `/api/yachts/itineraries` | GET | Public | Itinerary listing |
| `/api/yachts/recommend` | POST | Public | AI yacht matcher |
| `/api/inquiry` | POST | Public (rate-limited) | Charter inquiry submission |

---

## Appendix B: Deployment Checklist

Before Zenitha Yachts goes live, ensure:

- [ ] Run `npx prisma migrate deploy` (or `npx prisma db push`) on Supabase for 8 new models
- [ ] Add Vercel env vars: `GA4_MEASUREMENT_ID_ZENITHA_YACHTS_MED`, `GSC_SITE_URL_ZENITHA_YACHTS_MED`, `GA4_PROPERTY_ID_ZENITHA_YACHTS_MED`, `GOOGLE_SITE_VERIFICATION_ZENITHA_YACHTS_MED`
- [ ] Point `zenithayachts.com` DNS to Vercel
- [ ] Add `zenithayachts.com` + `www.zenithayachts.com` to Vercel project domains
- [ ] Verify middleware domain mapping routes to `zenitha-yachts-med` siteId
- [ ] Seed initial fleet data (at least 5-10 yachts for launch)
- [ ] Seed initial destinations (Mediterranean regions)
- [ ] Create at least 2-3 sample itineraries
- [ ] Generate per-site OG image (`zenitha-yachts-med-og.jpg`)
- [ ] Verify IndexNow key file serves correctly for yacht domain
- [ ] Submit sitemap to Google Search Console
- [ ] Confirm blog content pipeline excludes yacht site (ZY-C01, ZY-C02 fixes deployed)
- [ ] Test all admin pages with auth (ZY-H01 fix deployed)
- [ ] Verify FAQ page metadata in view-source (ZY-H02 fix deployed)

---

*This document is the single source of truth for Zenitha Yachts gaps. For platform-wide gaps, see `docs/AUDIT-LOG.md`. For the 8-phase remediation roadmap, see `docs/FUNCTIONING-ROADMAP.md`.*
