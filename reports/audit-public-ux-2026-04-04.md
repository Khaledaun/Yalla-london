# Phase 9: Public User Experience & Intuitive Design Audit
> **Date:** 2026-04-04 | **Auditor:** Claude Platform Health Audit | **Branch:** `claude/platform-health-audit-6jxH8`

---

## Executive Summary

**Overall Score: 68/100 (C+)** *(Revised from 82 after mobile UX deep-dive)*

The public website delivers a clear luxury travel value proposition with professional design, bilingual support, and well-placed affiliate CTAs. However, a deep mobile UI/UX audit (validated against source code) revealed **critical mobile-specific issues**: a scroll-locking hero that blocks all touch interaction for 3 seconds, both primary CTAs completely hidden on mobile (inside hamburger menu only), 25+ instances of illegible sub-10px typography, and raw `<img>` tags causing CLS. The language toggle is subtle, there are no breadcrumbs, and no global error boundary exists.

| Dimension | Score | Grade | Summary |
|-----------|-------|-------|---------|
| Value Proposition | 90/100 | A | Clear luxury travel positioning, bilingual hero, trust signals |
| Navigation | 55/100 | D+ | Both CTAs hidden on mobile (`hidden lg:flex`); no bottom tab bar; 3+ taps to content |
| Affiliate CTA Visibility | 85/100 | A- | Well-integrated in articles; category pages lack CTAs |
| Mobile UX | 45/100 | D | **Scroll-lock hero blocks touch for 3s**; 25+ sub-10px font instances; no persistent CTA |
| Trust Signals | 85/100 | A- | About, contact, privacy, terms all present; missing physical address |
| Error Handling | 65/100 | C+ | Blog 404 works; no global error boundary |
| Bilingual Experience | 80/100 | B+ | URL-based switching, proper RTL root; language toggle visibility low |
| Image Optimization | 50/100 | D | Raw `<img>` watermarks (3x); hero `width=1920` no srcset; 4% lazy loading |

---

## Detailed Findings

### 1. Value Proposition (90/100)

**Homepage (`/`):**
- Hero section with luxury destination imagery and bilingual tagline
- "Your definitive Arabic guide to London's finest experiences" — clear positioning
- Featured content grid showcasing latest articles
- Live Ticketmaster events section with "Live" badge (real data)
- News side banner with London-specific content
- Trust signals: About link, Contact, branded footer

**Assessment:** A first-time visitor immediately understands: luxury travel + London + Arabic-speaking audience. The dual-language positioning is clear without being exclusionary.

### 2. Navigation (80/100)

**Desktop:**
- Clean header with logo, main nav (Blog, Hotels, Experiences, Events, About, Contact)
- Language toggle in header (EN/AR)
- Footer with comprehensive link grid

**Mobile:**
- Hamburger menu with full navigation
- Bottom navigation not present on public pages (admin only)
- Path to content: tap hamburger → tap category → tap article = 3 taps minimum
- No "sticky" CTA or shortcut to popular content

**Gap:** No breadcrumbs on any inner pages. A visitor on `/blog/best-luxury-hotels-london` has no visual path context.

### 3. Affiliate CTA Visibility (85/100)

**In Articles (Good):**
- Affiliate links woven into content naturally
- `affiliate-cta-block` and `affiliate-recommendation` CSS classes for styled CTAs
- `rel="sponsored"` on all affiliate links (FTC compliant)
- SID tracking via `/api/affiliate/click` redirect

**On Category Pages (Gap):**
- `/hotels`, `/experiences`, `/recommendations`, `/events` — contain Stay22 auto-monetization but no explicit affiliate CTAs
- No `<AffiliateDisclosure>` component on category pages (noted in Phase 3 audit)

### 4. Mobile UX (45/100) — REVISED AFTER CODE VALIDATION

**Critical Issues (Code-Validated):**

**4a. Scroll-Locking Hero — P0 CRITICAL** (`components/home/scroll-expand-hero.tsx`)
- Lines 111-113: `passive: false` touch listeners with `e.preventDefault()` on `touchmove`
- **Blocks ALL native scroll** while the expansion animation runs (~3 seconds)
- Directly violates Google's INP metric (target: <200ms) — touch interactions produce no response
- Hero image hardcoded at `width={1920} height={1080}` with no `srcset` or `<picture>` element

**4b. Both Primary CTAs Hidden on Mobile** (`components/dynamic-header.tsx`)
- Lines 97, 108: "Shop" and "Book Now" use `hidden lg:flex` — invisible below 1024px
- Only accessible inside hamburger drawer → 3 taps to reach
- No bottom tab bar, no floating action button, no persistent mobile CTA

**4c. 25+ Sub-10px Typography Instances** (Multiple components)
- `text-[9px]`: category badges, event month, hotel category, live badges, weather labels (14+ instances)
- `text-[10px]`: trending label, article meta, testimonials, book buttons (8+ instances)  
- `text-[11px]`: nav labels, view links, hotel CTA (3+ instances)
- WCAG minimum for body text is 16px; these are illegible on mobile without zooming

**4d. Raw Watermark Images Causing CLS** (`components/home/yalla-homepage.tsx`)
- Lines 564, 733, 773: Three raw `<img>` tags (not Next.js `<Image>`)
- No `width`/`height` attributes → layout shift
- Opacity 0.03 (invisible to users) but fires HTTP requests and causes CLS

**4e. NewsSideBanner Renders Unconditionally** (`components/home/yalla-homepage.tsx`)
- Line 476: `<NewsSideBanner />` with no `hidden lg:block` wrapper
- On mobile, renders a sidebar element that overlaps or wastes viewport space

**4f. Trending Bar — Dead Tap Zones** (`components/home/yalla-homepage.tsx`)
- Lines 552-556: Trending items are non-linked `<span>` elements with `cursor-pointer`
- Look clickable but navigate nowhere — frustrating UX

**4g. WeatherStrip — No Loading State** (`components/home/yalla-homepage.tsx`)
- Line 876: `<WeatherStrip />` with no Suspense boundary or skeleton
- Returns `null` until API fetch completes → layout shift on load

**4h. Information Hub Grid Too Tight** (`components/home/yalla-homepage.tsx`)
- Line 698: `grid-cols-2 md:grid-cols-3 lg:grid-cols-6`
- On 320-360px screens, 2-column grid with icon+heading+description cards is extremely cramped

**Strengths (unchanged):**
- Responsive layout foundation exists
- Next.js Image optimization on most (non-watermark) images
- No horizontal overflow on standard pages

### 5. Trust Signals (85/100)

| Signal | Status | Notes |
|--------|--------|-------|
| About page | ✅ Present | Company information, team |
| Contact page | ✅ Present | Contact form with confirmation email |
| Privacy policy | ✅ Present | Zenitha.Luxury LLC, GDPR compliant |
| Terms of service | ✅ Present | Complete legal terms |
| Cookie consent | ✅ Present | Bilingual, 4 categories |
| SSL certificate | ✅ Active | HTTPS enforced |
| Author attribution | ✅ Present | Named author profiles on articles |
| Physical address | ❌ Missing | Delaware LLC — no office address displayed |
| Phone number | ❌ Missing | No public phone number |

### 6. Error Handling (65/100)

**What Works:**
- Blog post 404: proper `notFound()` with branded 404 page
- Blog post with no content: gradient placeholder for featured image
- API errors in public endpoints: generic error messages (no info disclosure)

**Missing:**
- No root-level `error.tsx` — unhandled errors show Next.js default
- No `not-found.tsx` at root level for non-blog 404s
- No offline detection or "you seem disconnected" banner
- Category pages with zero items show empty state but it's unstyled

### 7. Bilingual Experience (80/100)

**Strengths:**
- URL-based language switching (`/ar/` prefix)
- Root `<html>` has correct `lang` and `dir` attributes
- Arabic content natively generated (not translated)
- i18n dictionary covers all UI strings
- SSR Arabic content on blog pages via `serverLocale` prop

**Gaps:**
- Language toggle positioned in header — subtle, no flag icon or prominent indicator
- 4 pages (`/hotels`, `/experiences`, `/recommendations`, `/events`) declare AR hreflang but serve English content
- No "also available in Arabic" banner for EN visitors
- RTL CSS violations (1,098+) cause layout issues in Arabic view

---

## User Journey Analysis

### EN Visitor Journey (Homepage → Content → Affiliate Click)

| Step | Experience | Score |
|------|-----------|-------|
| 1. Land on homepage | Clear value proposition, luxury imagery | A |
| 2. Browse categories | Clean navigation, category pages exist | B+ |
| 3. Find article | Blog grid with cards, search available | B+ |
| 4. Read article | Good typography, proper heading hierarchy | A- |
| 5. See affiliate CTA | In-content links, styled recommendation blocks | A- |
| 6. Click affiliate link | Smooth redirect via tracking endpoint, SID attribution | A |

### AR Visitor Journey

| Step | Experience | Score |
|------|-----------|-------|
| 1. Find language toggle | Small, in header, easy to miss | C |
| 2. Switch to Arabic | URL changes to /ar/, RTL activates | B+ |
| 3. Browse Arabic content | Native Arabic, culturally adapted | A |
| 4. Read Arabic article | SSR Arabic, proper font loading | A- |
| 5. RTL layout | Root dir="rtl" works, but 679 Tailwind classes don't flip | C+ |

---

## Top Issues (Ranked by Impact)

| # | Issue | Severity | Impact | Fix Effort |
|---|-------|----------|--------|------------|
| 1 | **Scroll-lock hero blocks touch for 3s** (`scroll-expand-hero.tsx`) | **CRITICAL** | INP violation; users can't scroll on mobile | LOW |
| 2 | **Both CTAs hidden on mobile** (`dynamic-header.tsx`) | **CRITICAL** | Zero conversion path without opening hamburger | MEDIUM |
| 3 | **25+ sub-10px font instances** (multiple components) | HIGH | Illegible text, WCAG violation | MEDIUM |
| 4 | **Raw watermark `<img>` tags** (`yalla-homepage.tsx`) | HIGH | CLS, extra HTTP requests for invisible images | LOW |
| 5 | **NewsSideBanner no mobile guard** (`yalla-homepage.tsx`) | HIGH | Layout overlap/waste on mobile | LOW |
| 6 | No global error boundary (error.tsx) | HIGH | Ugly error pages for visitors | LOW |
| 7 | Language toggle hard to find on mobile | MEDIUM | Arabic visitors may not discover AR content | LOW-MEDIUM |
| 8 | No breadcrumbs on inner pages | MEDIUM | No navigation context for deep pages | MEDIUM |
| 9 | Trending bar items are dead tap zones | MEDIUM | User frustration — look clickable but do nothing | LOW |
| 10 | WeatherStrip no Suspense/skeleton | MEDIUM | Layout shift on slow connections | LOW |
| 11 | `role="marquee"` deprecated ARIA role | LOW | Screen reader inconsistency | LOW |
| 12 | 1,098+ RTL CSS violations | HIGH | Arabic layout broken on hundreds of elements | HIGH |

---

## Recommendations

### P0 — Critical (This Week)
1. **Remove scroll-lock on mobile** (`scroll-expand-hero.tsx`): Skip scroll animation on mobile — auto-expand hero immediately. Restores native scrolling, fixes INP.
2. **Add bottom tab bar** (`dynamic-header.tsx`): 5 items — Guides, Dining, Events, Shop, Book. Add `pb-16` to body to prevent overlap.
3. **Guard NewsSideBanner on mobile** (`yalla-homepage.tsx`): Wrap in `<div className="hidden lg:block">`.
4. **Create root `error.tsx`** with branded error page.

### P1 — High (Next 2 Weeks)
5. **Fix watermark images** (`yalla-homepage.tsx`): Replace 3 raw `<img>` with Next.js `<Image loading="lazy" aria-hidden="true">` with explicit width/height.
6. **Fix sub-10px typography**: Set minimum 11px (`text-[11px]`) across all 25+ instances. Long-term: add Tailwind plugin to prevent `text-[9px]`/`text-[10px]`.
7. **Add links to trending bar items** (`yalla-homepage.tsx`): Replace `<span>` with `<Link href>`.
8. **Make language toggle prominent** — flag icons, larger hit target, "العربية" label visible.

### P2 — Medium (30 Days)
9. **Fix `role="marquee"`** → `role="region"` with `aria-label` and `sr-only` accessible list.
10. **Add Suspense skeleton to WeatherStrip** — prevent layout shift on slow connections.
11. **Add breadcrumbs** to all inner pages.
12. **Single-column grid on 320px** for Information Hub (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3`).

### P3 — Enhancement (90 Days)
13. **Hero `<picture>` with srcset** — serve 640/1024/1920 breakpoints with AVIF/WebP.
14. **Systematic RTL CSS migration** (ms-*/me-*/ps-*/pe-*/text-start/text-end).
15. **Fluid typography** with `clamp()` in Tailwind config.
16. **"Also available in Arabic"** banner for GCC IP visitors.

---

## Mobile UI/UX Audit Source

This section incorporates findings from a validated external Mobile UI/UX Evaluation. Every claim was verified against the live source code with exact file paths and line numbers. The external report identified 12 issues, all confirmed in code. 5 additional issues were found during validation (WeatherStrip, Information Hub grid, `role="marquee"`, watermark CLS, NewsSideBanner mobile guard).
