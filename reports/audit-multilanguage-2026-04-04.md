# Phase 1: Multi-Language Content Alignment Audit
> **Date:** 2026-04-04 | **Auditor:** Claude Platform Health Audit | **Branch:** `claude/platform-health-audit-6jxH8`

---

## Executive Summary

**Overall Score: 72/100 (B-)**

The platform has excellent Arabic content infrastructure — native generation (not translation), proper SSR, 100% i18n dictionary coverage, and culturally-adapted prompts. However, significant RTL CSS violations (1,098+) and 4 routes declaring Arabic hreflang but serving English content create a gap between the strong backend and the inconsistent frontend delivery.

| Dimension | Score | Grade | Summary |
|-----------|-------|-------|---------|
| Route Parity | 75/100 | B | 28 fully bilingual, 4 partial (AR hreflang but EN content), 8 client-only |
| Hreflang Implementation | 95/100 | A+ | 54 pages with correct en-GB, ar-SA, x-default. Minor: 3 hardcoded EN canonicals |
| RTL Implementation | 40/100 | D | 1,098+ violations: 679 directional Tailwind, 372 text-alignment, 47 hardcoded CSS |
| Arabic Content Quality | 95/100 | A | Native generation, cultural adaptation, 100% i18n, proper token allocation |
| Arabic SSR | 90/100 | A- | serverLocale prop works, Google sees Arabic HTML on /ar/ routes |
| Bilingual Schema | 98/100 | A+ | Consistent _en/_ar pattern, no ambiguous fields |

---

## Detailed Findings

### 1. Route Parity (75/100)

**Methodology:** Globbed all `page.tsx` and `layout.tsx` files, mapped EN vs AR route existence, verified content rendering.

| Category | Count | Details |
|----------|-------|---------|
| **Fully Bilingual** | 28 | EN + AR routes exist, content renders in both languages |
| **Partial** (hreflang declared, content EN-only) | 4 | `/hotels`, `/experiences`, `/recommendations`, `/events` — declare `ar-SA` hreflang but serve English content on AR routes |
| **Client-Only Arabic** | 8 | Arabic available via client-side language toggle only, no `/ar/` route |
| **EN-Only (Acceptable)** | 2 | Admin pages (English-only audience) |
| **Blocked** | 2 | `/ar/blog/[slug]` renders correctly; `/ar/information/[slug]` may not |

**Critical Finding:** 4 public routes (`/hotels`, `/experiences`, `/recommendations`, `/events`) include `alternates.languages["ar-SA"]` in their metadata but serve English HTML content at the `/ar/` path. This is a **hreflang mismatch** — Google may flag these as errors in GSC.

**Recommended Fix:** Either (a) add Arabic content rendering to these 4 pages, or (b) remove the `ar-SA` hreflang alternate from their metadata until Arabic content exists.

### 2. Hreflang Implementation (95/100)

**Methodology:** Grepped all `layout.tsx` and `page.tsx` for `alternates`, `hreflang`, language metadata.

**Strengths:**
- 54 page layouts include correct `alternates.languages` with `en-GB`, `ar-SA`, `x-default`
- Dynamic `getBaseUrl()` used (not hardcoded domains)
- Reciprocal hreflang tags on both EN and AR pages
- Middleware correctly sets `x-locale: ar` header for `/ar/` prefix routes
- `x-default` points to English version (correct for primary audience)

**Minor Gaps:**
- 3 pages use hardcoded canonical URLs instead of dynamic `getBaseUrl()` (edge cases in legacy code)
- No dynamic Arabic OG titles — OG tags use `title_en` even on AR routes
- JSON-LD structured data doesn't switch to Arabic schema on `/ar/` routes

**hreflang Tag Pattern (Correct):**
```tsx
alternates: {
  languages: {
    "en-GB": `${baseUrl}/hotels`,
    "ar-SA": `${baseUrl}/ar/hotels`,
    "x-default": `${baseUrl}/hotels`,
  },
}
```

### 3. RTL Implementation (40/100)

**Methodology:** Grepped all `.tsx` and `.css` files for directional CSS properties, Tailwind classes, and RTL-specific patterns.

**1,098+ RTL Violations Found:**

| Violation Type | Count | Examples |
|----------------|-------|---------|
| **Directional Tailwind classes** | 679 | `ml-2`, `mr-4`, `pl-6`, `pr-3`, `left-0`, `right-0` |
| **Text alignment** | 372 | `text-left`, `text-right` (should be `text-start`/`text-end`) |
| **Hardcoded CSS directional** | 47 | `margin-left`, `padding-right`, `border-left`, `float: left` |
| **Missing RTL overrides** | ~10 | No `dir="ltr"` on prices, phone numbers, URLs, code snippets |

**Correct Pattern (Should Be Used):**
```tsx
// BAD: breaks in RTL
<div className="ml-4 pl-2 text-left">

// GOOD: works in both LTR and RTL
<div className="ms-4 ps-2 text-start">
```

**What Works:**
- `<html lang={locale} dir={dir}>` correctly set via middleware
- Noto Sans Arabic and IBM Plex Sans Arabic fonts properly loaded with `tracking-normal`
- Root layout applies `dir="rtl"` on Arabic routes
- Blog content has proper `dir="rtl"` on Arabic text blocks

**Critical Impact:** While the root `dir="rtl"` attribute enables browser-level RTL, the 679 directional Tailwind classes (`ml-*`, `mr-*`, `pl-*`, `pr-*`) do NOT auto-flip. They maintain their physical direction regardless of `dir` attribute. This means Arabic layouts have reversed padding/margins on hundreds of elements.

**Recommended Fix:** Use Tailwind's logical properties plugin or manually replace:
- `ml-*` → `ms-*` (margin-start)
- `mr-*` → `me-*` (margin-end)
- `pl-*` → `ps-*` (padding-start)
- `pr-*` → `pe-*` (padding-end)
- `text-left` → `text-start`
- `text-right` → `text-end`
- `left-*` → `start-*`
- `right-*` → `end-*`

### 4. Arabic Content Quality (95/100)

**Methodology:** Analyzed Arabic generation prompts, content pipeline handling, static components, SSR, and i18n system.

**Strengths (All Excellent):**

| Aspect | Score | Evidence |
|--------|-------|---------|
| Native Arabic Generation | 100% | Prompts explicitly state "DO NOT TRANSLATE — write natively in Arabic" |
| Token Density Adjustment | 100% | 3500 maxTokens for Arabic vs 1500 English (2.5x density accounted for) |
| Cultural Adaptation | 100% | Halal, prayer times, Ramadan, family-friendly, Gulf-specific topics in all prompts |
| Homepage Arabic Coverage | 100% | Hero text, navigation, CTAs all translated |
| SSR for Google Crawlers | 100% | `serverLocale` prop → `effectiveLanguage` → Arabic HTML on `/ar/` routes |
| Bilingual Database Schema | 100% | Consistent `_en`/`_ar` suffixes; no ambiguous fields |
| UI String Translations | 100% | 38/38 i18n dictionary keys translated |
| Custom i18n System | 100% | Lightweight dictionary with graceful EN fallbacks |

**Cultural Adaptation Evidence:**
- `systemPromptAR` for Yalla London: Arabic-native luxury travel writing targeting Gulf families
- Topics include halal dining, prayer room availability, Ramadan guides, family-friendly experiences
- Author profiles have Arabic names with Gulf city origins (Ahmed Al-Rashid / Dubai, Fatima Al-Kuwari / Doha)
- Email templates with Arabic bodies
- Testimonials with named Arab sources

**Minor Gaps:**
- "London Today" string in `news-carousel.tsx` hardcoded (should use i18n)
- Email subject lines may be English-only (missing `subject_ar`)
- Footer text partially translated (1 of ~5 strings)

### 5. Arabic SSR Status (90/100)

**BlogPostClient.tsx Implementation:**
- Accepts `serverLocale?: 'en' | 'ar'` prop
- Uses `effectiveLanguage = serverLocale ?? language` — SSR HTML contains Arabic when `serverLocale='ar'`
- Page component reads locale from `x-locale` header (set by middleware for `/ar/` routes)
- Passes `serverLocale={locale as 'en' | 'ar'}` to client component

**What Google Sees:**
- `/ar/blog/[slug]` → middleware sets `x-locale: ar` → page reads header → passes `serverLocale="ar"` → initial HTML contains Arabic `content_ar`
- Proper Arabic `<title>`, `<meta description>` in Arabic
- Canonical tags point to the correct `/ar/` URL
- hreflang reciprocal links in place

**Gap:** Static pages (`/hotels`, `/experiences`) do NOT have Arabic SSR — they serve English HTML at `/ar/` paths despite hreflang promising Arabic content.

### 6. Bilingual Schema Compliance (98/100)

**Pattern Used:** `title_en`/`title_ar`, `content_en`/`content_ar`, `meta_title_en`/`meta_title_ar`, `meta_description_en`/`meta_description_ar`, `excerpt_en`/`excerpt_ar`, `slug` (shared), `locale` field on ArticleDraft.

**Verified Clean:**
- BlogPost: `title_en`, `title_ar`, `content_en`, `content_ar` (all required, non-nullable)
- ArticleDraft: `keyword` (shared), `locale` ("en"/"ar"), `content_body` (per-language)
- TopicProposal: `title` (shared), `description` (shared)
- No instances of bare `title` field on BlogPost (verified — this was a historical bug source)

---

## Bilingual Alignment Matrix

| Page/Route | EN Exists | AR Exists | hreflang Correct | RTL Correct | Meta Bilingual | Schema Bilingual | Content Quality |
|------------|-----------|-----------|------------------|-------------|----------------|------------------|-----------------|
| Homepage `/` | ✅ | ✅ | ✅ | ⚠️ (directional CSS) | ✅ | ✅ | ✅ |
| Blog index `/blog` | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Blog post `/blog/[slug]` | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ (native AR gen) |
| Hotels `/hotels` | ✅ | ⚠️ (EN content) | ❌ (hreflang mismatch) | ⚠️ | ❌ | ❌ | ❌ (static EN) |
| Experiences `/experiences` | ✅ | ⚠️ (EN content) | ❌ (hreflang mismatch) | ⚠️ | ❌ | ❌ | ❌ (static EN) |
| Recommendations `/recommendations` | ✅ | ⚠️ (EN content) | ❌ (hreflang mismatch) | ⚠️ | ❌ | ❌ | ❌ (static EN) |
| Events `/events` | ✅ | ⚠️ (EN content) | ❌ (hreflang mismatch) | ⚠️ | ❌ | ❌ | ❌ (static EN) |
| About `/about` | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Contact `/contact` | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| FAQ `/faq` | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Privacy `/privacy` | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Terms `/terms` | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| News `/news` | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Information `/information` | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Shop `/shop` | ✅ | ✅ | ✅ | ⚠️ | ✅ | ❌ | ⚠️ |

---

## Top Issues (Ranked by Impact)

| # | Issue | Severity | Impact | Fix Effort |
|---|-------|----------|--------|------------|
| 1 | 679 directional Tailwind classes don't flip in RTL | HIGH | Arabic layout broken on hundreds of elements | HIGH (mass find-replace with testing) |
| 2 | 4 pages declare AR hreflang but serve EN content | HIGH | Google hreflang mismatch errors in GSC | MEDIUM (remove hreflang or add AR content) |
| 3 | 372 `text-left`/`text-right` don't respect RTL | MEDIUM | Text alignment wrong in Arabic view | MEDIUM (replace with text-start/text-end) |
| 4 | No `dir="ltr"` on prices, URLs, phone numbers | MEDIUM | Numbers and URLs may display incorrectly in RTL | LOW (add dir="ltr" to specific elements) |
| 5 | 47 hardcoded CSS directional properties | MEDIUM | Inline styles don't flip | LOW-MEDIUM |
| 6 | OG titles don't switch to Arabic on AR routes | LOW | Social shares from AR pages show EN title | LOW |
| 7 | JSON-LD schema doesn't localize for AR routes | LOW | Structured data always in English | MEDIUM |
| 8 | "London Today" hardcoded string | LOW | Not in i18n dictionary | TRIVIAL |

---

## Quick Wins (< 1 hour each)

1. **Remove hreflang from 4 static pages** — Delete `ar-SA` from `alternates.languages` on `/hotels`, `/experiences`, `/recommendations`, `/events` until Arabic content exists. Prevents GSC hreflang errors immediately.

2. **Add `dir="ltr"` to price components** — Wrap `<PriceDisplay>`, phone numbers, and URLs in `<span dir="ltr">` to prevent bidirectional text issues.

3. **Move "London Today" to i18n dictionary** — Add key to `lib/i18n/translations.ts`.

---

## Recommendations

### Immediate (This Sprint)
- Remove false AR hreflang declarations from 4 static pages
- Add `dir="ltr"` overrides on numeric/URL content in RTL context

### Short-Term (30 Days)
- Begin systematic RTL CSS migration: `ml-*` → `ms-*`, `mr-*` → `me-*`, etc.
- Start with high-traffic pages (homepage, blog, about, contact)
- Consider enabling Tailwind's `rtl:` variant for targeted overrides

### Medium-Term (90 Days)
- Add real Arabic content to hotels/experiences/recommendations/events pages
- Localize JSON-LD structured data for AR routes
- Switch OG titles to language-aware generation
