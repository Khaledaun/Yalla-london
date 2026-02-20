# Zenitha Content Network — Development Standards

**Document Version:** 1.0
**Date:** February 20, 2026
**Author:** Claude (CTO Agent) for Zenitha.Luxury LLC
**Applies to:** All 5 sites in the Zenitha Content Network
**Authority:** These standards are MANDATORY for all development. They override any conflicting defaults.

---

## Purpose

This document defines the **complete engineering, SEO, AIO, and operational standards** that Claude Code MUST follow when:

1. Building or modifying any website in the Zenitha Content Network
2. Validating existing systems against current standards
3. Launching new websites
4. Updating existing sites after algorithm changes

**Single Source of Truth:** All thresholds referenced in this document are codified in `lib/seo/standards.ts`. When standards.ts is updated (e.g., after algorithm changes), all enforcement code automatically picks up new values via dynamic imports. This document describes the intent and rules behind those values.

---

## Table of Contents

1. [SEO Standards](#1-seo-standards)
2. [AI Overview (AIO) Optimization](#2-ai-overview-aio-optimization)
3. [Content Quality Standards](#3-content-quality-standards)
4. [Technical SEO Requirements](#4-technical-seo-requirements)
5. [Structured Data Requirements](#5-structured-data-requirements)
6. [E-E-A-T Compliance](#6-e-e-a-t-compliance)
7. [Page Architecture Standards](#7-page-architecture-standards)
8. [Multi-Site Development Rules](#8-multi-site-development-rules)
9. [Content Pipeline Standards](#9-content-pipeline-standards)
10. [Affiliate & Revenue Integration](#10-affiliate--revenue-integration)
11. [Performance Standards](#11-performance-standards)
12. [Accessibility Standards](#12-accessibility-standards)
13. [Dashboard & Management Standards](#13-dashboard--management-standards)
14. [Standards Maintenance & Updates](#14-standards-maintenance--updates)
15. [Pre-Launch Checklist](#15-pre-launch-checklist)
16. [Anti-Patterns Registry](#16-anti-patterns-registry)

---

## 1. SEO Standards

### 1.1 The 13-Check Pre-Publication Gate

Every piece of content MUST pass the pre-publication gate before becoming publicly accessible. The gate is defined in `lib/seo/orchestrator/pre-publication-gate.ts` and runs these 13 checks:

| # | Check | Type | Threshold | Source |
|---|-------|------|-----------|--------|
| 1 | Route Existence | HTTP HEAD | Parent route ≠ 404 | Runtime check |
| 2 | Arabic Routes | HTTP HEAD | `/ar/` accessible if AR content | Runtime check |
| 3 | SEO Minimum Requirements | Data | Title >10 chars, meta title ≥30, meta desc ≥120, content >300 chars | `CONTENT_QUALITY` |
| 4 | SEO Score | Data | Blocks <50, warns <70 | `CONTENT_QUALITY.qualityGateScore` |
| 5 | Heading Hierarchy | HTML | 1 H1, ≥2 H2s, no skipped levels | `CONTENT_QUALITY.maxH1Count`, `minH2Count` |
| 6 | Word Count | Data | Blocks <1,000, warns <1,200 | `CONTENT_QUALITY.minWords`, `targetWords` |
| 7 | Internal Links | HTML | ≥3 links to site content | `CONTENT_QUALITY.minInternalLinks` |
| 8 | Readability | Algorithm | Flesch-Kincaid grade ≤12 | `CONTENT_QUALITY.readabilityMax` |
| 9 | Image Alt Text | HTML | All `<img>` tags must have `alt` | Accessibility + SEO |
| 10 | Author Attribution | Data | `author_id` must be set | `EEAT_REQUIREMENTS` |
| 11 | Structured Data | Data | `keywords_json` present (proxy for JSON-LD) | `EEAT_REQUIREMENTS` |
| 12 | Authenticity Signals | NLP | ≥3 experience markers, ≤1 AI-generic phrase | Jan 2026 Authenticity Update |
| 13 | Affiliate Links | HTML | ≥1 affiliate/booking link | Revenue requirement |

**Enforcement points (all fail-closed):**
- `lib/content-pipeline/select-runner.ts` — Content selector runs gate before promoting to BlogPost
- `app/api/cron/daily-content-generate/route.ts` — Daily generator runs gate after content creation
- `app/api/cron/scheduled-publish/route.ts` — Scheduled publisher runs gate, marks as "failed" on rejection
- `app/api/admin/content/publish/route.ts` — Manual dashboard publish also gated

### 1.2 Meta Tag Requirements

**Meta Title:**
- Minimum: 30 characters (blocker)
- Optimal range: 50-60 characters
- MUST contain primary focus keyword
- Format: `{Article Title} | {Site Name}`
- Source: `CONTENT_QUALITY.metaTitleMin`, `metaTitleOptimal`

**Meta Description:**
- Minimum: 120 characters (blocker)
- Optimal range: 120-160 characters
- MUST contain primary keyword and a call to action
- Source: `CONTENT_QUALITY.metaDescriptionMin`, `metaDescriptionOptimal`

**Canonical Tags:**
- Every page MUST have a self-referencing canonical tag
- Use absolute URLs (not relative)
- Source: `TECHNICAL_SEO.canonicalSelfReferencing`, `canonicalAbsoluteUrls`

**Hreflang Tags:**
- Bidirectional: en-GB ↔ ar-SA
- Include x-default pointing to English version
- MUST be present on every page that has a bilingual equivalent
- Source: `TECHNICAL_SEO.hreflangBidirectional`, `hreflangIncludeXDefault`

### 1.3 URL Structure

```
/{section}/{slug}          — English (default)
/ar/{section}/{slug}       — Arabic

Examples:
/blog/luxury-hotels-london
/ar/blog/luxury-hotels-london
/hotels
/experiences
/recommendations
/information/{section}
/news/{slug}
```

**Rules:**
- Lowercase only, hyphens for word separation
- No trailing slashes
- No query parameters for content pages
- Max 3 levels of depth from root
- Source: `TECHNICAL_SEO.maxClickDepth`

### 1.4 Indexing Strategy

**For blog/article content:**
1. Sitemap submission (auto-generated, ≤50,000 URLs per file)
2. IndexNow notification (within 7-day window of publication)
3. Google Search Console URL Inspection (manual for priority pages)

**NOT for blog content:**
- Google Indexing API (restricted to JobPosting/BroadcastEvent only)
- Source: `INDEXING_CONFIG.indexingApiLimitedTo`

**IndexNow submission window:** 7 days (extended from 24h to catch posts that miss initial submission)

---

## 2. AI Overview (AIO) Optimization

Google AI Overviews are live for 1.5B+ monthly users across 200+ countries. 60%+ of searches now feature AI Overviews. Our content must be structured for citation.

### 2.1 Answer-First Pattern

Every article MUST include a direct, concise answer (50-70 words) near the top of the content, immediately after the H1 heading and before any subheadings. This is the text most likely to be cited by AI Overviews.

```html
<h1>Best Halal Hotels in London</h1>
<p class="answer-first">
  London offers over 30 halal-friendly luxury hotels, with the best options
  concentrated in Mayfair, Kensington, and Knightsbridge. Top picks include
  The Dorchester (prayer mats and Quran in rooms), The Lanesborough (halal
  room service), and Jumeirah Carlton Tower (Arabic-speaking concierge).
  Prices range from £200-800/night depending on season and location.
</p>
```

Source: `AIO_OPTIMIZATION.bestPractices.answerFirstWordCount`

### 2.2 Structural Requirements for AIO Citation

- **Clear hierarchical structure:** H1 → H2 → H3, never skip levels
- **Scannable formatting:** Use bullet lists, numbered lists, tables, and short paragraphs (≤3 sentences)
- **Strong entity signals:** Explicitly name WHO (author, hotel, restaurant), WHAT (service, experience), WHERE (address, neighborhood), WHEN (season, time)
- **Question-based subheadings:** Use H2s phrased as questions readers actually ask (e.g., "What makes a hotel halal-friendly?")
- **Unique data/insights:** Include specific numbers, prices, personal observations — content that AI Overviews can't generate from its training data

### 2.3 AIO Citation Correlation

- 92% of cited domains rank in top 10 organic results → standard SEO still matters
- Question-based queries are 84% more likely to trigger AI Overviews → target these keywords
- Cited content must demonstrate genuine expertise (Jan 2026 Authenticity Update)
- Source: `AIO_OPTIMIZATION.bestPractices`

---

## 3. Content Quality Standards

### 3.1 Word Count

| Level | Words | Action |
|-------|-------|--------|
| Thin content | <300 | Blocked from indexing |
| Blocker threshold | <1,000 | Cannot publish |
| Warning threshold | <1,200 | Warning in audit |
| Target | 1,800 | Standard article |
| Ideal (deep-dive) | 2,000+ | Authority content |

Source: `CONTENT_QUALITY.thinContentThreshold`, `minWords`, `targetWords`, `idealWords`

### 3.2 Heading Structure

Every article MUST follow this heading hierarchy:

```
H1: Article Title (exactly 1 per page)
  H2: First major section (minimum 2, target 4-6)
    H3: Subsection (as needed)
    H3: Subsection
  H2: Second major section
    H3: Subsection
  H2: Key Takeaways (required — summary section)
```

**Rules:**
- Exactly 1 H1 per page
- Minimum 2 H2 headings, target 4-6
- Never skip levels (no H1 → H3)
- H1 and at least one H2 must contain the focus keyword
- Source: `CONTENT_QUALITY.maxH1Count`, `minH2Count`, `targetH2Count`

### 3.3 Readability

- Target: Flesch-Kincaid grade level ≤10
- Maximum: Grade level 12 (warning)
- Short paragraphs: ≤3 sentences
- Active voice preferred
- No jargon without explanation
- Source: `CONTENT_QUALITY.readabilityTarget`, `readabilityMax`

### 3.4 Keyword Strategy

- Maximum keyword density: 2.5% — favor semantic variation over repetition
- Focus keyword MUST appear in: H1 title, first paragraph, at least one H2
- Include long-tail variations naturally throughout
- Target PAA (People Also Ask) questions as H2 subheadings
- Source: `CONTENT_QUALITY.maxKeywordDensity`

### 3.5 Internal Linking

- Minimum 3 internal links per article (blocker)
- Target 5 internal links
- Use descriptive anchor text (never "click here" or "read more")
- Link to related articles, category pages, and pillar content
- Cross-link within Zenitha Content Network where relevant (e.g., London article links to Istanbul article)
- Source: `CONTENT_QUALITY.minInternalLinks`, `targetInternalLinks`

### 3.6 Image Requirements

- Every article must have a featured image
- All `<img>` tags MUST have descriptive `alt` text (not just article title)
- Alt text should describe the image content AND include a relevant keyword
- Prefer original photography over stock images (Jan 2026 Authenticity Update)
- Use WebP format, lazy loading for below-fold images
- Responsive sizes via `srcset`

---

## 4. Technical SEO Requirements

### 4.1 Redirects

- Use 301 for permanent redirects
- Maintain redirects for minimum 12 months
- Never chain more than 2 redirects
- Source: `TECHNICAL_SEO.permanentRedirectCode`, `redirectMinMonths`

### 4.2 Click Depth

- Important content must be reachable within 3 clicks from the homepage
- Blog articles: Home → Blog → Article (2 clicks)
- Category pages: Home → Category (1 click)
- Source: `TECHNICAL_SEO.maxClickDepth`

### 4.3 Robots.txt

- `robots.txt` is NOT an indexing control — use `noindex` meta tag for pages you don't want indexed
- Allow all crawlers by default
- Block only admin routes and API endpoints
- Source: `TECHNICAL_SEO.robotsTxtNotIndexingControl`

### 4.4 Sitemap

- Auto-generated via Next.js `sitemap.ts`
- Maximum 50,000 URLs per sitemap file
- Maximum 50MB per sitemap file
- Include `lastmod`, `changefreq`, `priority`
- Blog posts: priority 0.8, changefreq weekly
- Category pages: priority 0.6, changefreq monthly
- Source: `INDEXING_CONFIG.sitemapMaxUrls`, `sitemapMaxSizeMb`

### 4.5 Page Speed

All pages MUST meet Core Web Vitals thresholds:

| Metric | Good | Needs Improvement | Unit |
|--------|------|-------------------|------|
| LCP (Largest Contentful Paint) | ≤2,500 | ≤4,000 | ms |
| INP (Interaction to Next Paint) | ≤200 | ≤500 | ms |
| CLS (Cumulative Layout Shift) | ≤0.1 | ≤0.25 | score |
| TTFB (Time to First Byte) | ≤600 | ≤1,200 | ms |

**Note:** INP replaced FID as a Core Web Vital in March 2024.
Source: `CORE_WEB_VITALS`

---

## 5. Structured Data Requirements

### 5.1 Required Schema Types

Every page MUST include appropriate JSON-LD structured data:

| Page Type | Required Schema | Optional Schema |
|-----------|----------------|-----------------|
| Blog article | `Article` + `BreadcrumbList` | `Review`, `Person` (author) |
| Blog listing | `CollectionPage` + `ItemList` | `BreadcrumbList` |
| Hotel page | `Hotel` + `BreadcrumbList` | `Review`, `AggregateRating` |
| Restaurant page | `Restaurant` + `BreadcrumbList` | `Review`, `AggregateRating` |
| Experience page | `TouristAttraction` + `BreadcrumbList` | `Event`, `Review` |
| Shop product | `Product` + `BreadcrumbList` | `Review`, `AggregateRating` |
| About page | `Organization` + `BreadcrumbList` | `Person` |
| Homepage | `WebSite` + `Organization` | `SearchAction` |
| Event page | `Event` + `BreadcrumbList` | — |
| News article | `Article` (subtype: NewsArticle) + `BreadcrumbList` | — |

### 5.2 Deprecated Types — DO NOT USE

These schema types no longer generate rich results. Using them wastes crawl budget:

| Type | Deprecated Since | Reason |
|------|-----------------|--------|
| FAQPage | Aug 2023 | Restricted to government/health sites |
| HowTo | Sept 2023 | Fully deprecated |
| CourseInfo | June 2025 | Batch deprecation |
| ClaimReview | June 2025 | Fact Check deprecated |
| EstimatedSalary | June 2025 | Batch deprecation |
| LearningVideo | June 2025 | Batch deprecation |
| SpecialAnnouncement | June 2025 | Batch deprecation |
| VehicleListing | June 2025 | Batch deprecation |
| PracticeProblems | Nov 2025 | Deprecated |
| SitelinksSearchBox | Oct 2024 | Deprecated |

Source: `SCHEMA_TYPES.deprecated`

**If code encounters these types:** Generate `Article` schema as fallback instead. Never silently drop schema.

### 5.3 Travel-Recommended Types

For the Zenitha Content Network (luxury travel sites), prioritize these schema types:

`Article`, `BreadcrumbList`, `Organization`, `Person`, `Event`, `Restaurant`, `Hotel`, `TouristAttraction`, `VideoObject`, `Review`, `WebSite`

Source: `SCHEMA_TYPES.recommendedForTravel`

### 5.4 Implementation Rules

- Format: **JSON-LD** (Google's recommended format, never Microdata or RDFa)
- Place JSON-LD in `<script type="application/ld+json">` in `<head>` or `<body>`
- Every entity MUST have: `@context`, `@type`, `name`, and a unique `@id`
- Use absolute URLs for all URL fields
- Validate with Google's Rich Results Test before deploying
- Source: `TECHNICAL_SEO.preferredSchemaFormat`, `AUTHORITATIVE_SOURCES.richResultsTest`

---

## 6. E-E-A-T Compliance

### 6.1 Google's January 2026 "Authenticity Update"

This is the most significant algorithm change affecting our content. Key changes:

1. **Experience is now the dominant E-E-A-T signal** — content must prove the author lived it
2. **AI content not banned** but mass-produced unedited AI content actively demoted
3. **Stock photography penalized** — original media signals authenticity
4. **Anonymous content penalized** — every article needs an author byline with digital footprint
5. **Topical depth > publishing frequency** — content clusters and internal linking weighted higher
6. **"Second-hand knowledge" demoted** — repackaged summaries without original insights lose rank
7. **Scaled content abuse manual actions** active since June 2025
8. **AI Overview citations** now require demonstrated genuine expertise

Source: `ALGORITHM_CONTEXT` (all Jan 2026 flags)

### 6.2 Authenticity Signals in Content

Every article MUST include at least 3 of these first-hand experience markers:

- **Sensory details:** "The aroma of cardamom-infused Arabic coffee fills the lobby..."
- **Specific observations:** "The pool area gets crowded after 3pm but is nearly empty before 10am"
- **Insider tips:** "Ask for table 14 — it's the only one with a direct Bosphorus view"
- **Personal timelines:** "During my 4-night stay in February 2026..."
- **Honest limitations:** "The breakfast buffet is excellent but halal options are limited to 3 dishes"
- **Specific costs/details:** "A standard double room runs £285/night in peak season"

### 6.3 AI-Generic Phrases to AVOID

The pre-publication gate flags these phrases. Content with >1 triggers a warning:

- "In conclusion"
- "It's worth noting"
- "Whether you're a [X] or [Y]"
- "Nestled in the heart of"
- "Look no further"
- "Without further ado"
- "In this comprehensive guide"
- "A hidden gem"
- "Something for everyone"

### 6.4 Author Requirements

- Every article MUST have an assigned author (`author_id` in BlogPost)
- Authors MUST have a bio page accessible from the site
- Author bio should include: name, photo, credentials, expertise areas, social links
- Generic "Editorial Team" bylines are acceptable but weaker than named authors
- Source: `EEAT_REQUIREMENTS.requireAuthorAttribution`, `requireAuthorBio`, `requireAuthorDigitalFootprint`

### 6.5 Trust Signals

- HTTPS required on all pages
- Privacy policy and terms of use MUST be linked from footer
- Contact information MUST be accessible (email, physical location)
- Organization schema on about page
- Source: `EEAT_REQUIREMENTS.requireHttps`, `requireContactInfo`, `requireEditorialPolicy`

---

## 7. Page Architecture Standards

### 7.1 Server vs. Client Components

**Rule:** Every public-facing page MUST use Server Components for metadata. SEO metadata CANNOT be rendered client-side.

**Correct pattern:**
```
app/{route}/layout.tsx    → Server component, exports generateMetadata()
app/{route}/page.tsx      → Can be 'use client' for interactivity
```

**`generateMetadata()` MUST include:**
- Dynamic `title` with site name and destination
- `description` within 120-160 char range
- `alternates.canonical` — absolute URL
- `alternates.languages` — hreflang for en-GB, ar-SA, x-default
- `openGraph` — title, description, type, locale, images
- `twitter` — card type, title, description
- `robots` — index: true, follow: true, googleBot settings

### 7.2 Layout Metadata Template

```typescript
export async function generateMetadata(): Promise<Metadata> {
  const { headers } = await import("next/headers");
  const { getDefaultSiteId, getSiteConfig } = await import("@/config/sites");
  const { getBaseUrl } = await import("@/lib/url-utils");

  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const baseUrl = getBaseUrl();
  const siteName = siteConfig?.siteName || "Yalla London";
  const destination = siteConfig?.destination || "London";

  return {
    title: `Page Title — ${destination} | ${siteName}`,
    description: "120-160 char description with primary keyword and CTA",
    alternates: {
      canonical: `${baseUrl}/{route}`,
      languages: {
        "en-GB": `${baseUrl}/{route}`,
        "ar-SA": `${baseUrl}/ar/{route}`,
        "x-default": `${baseUrl}/{route}`,
      },
    },
    openGraph: {
      title: `Page Title | ${siteName}`,
      description: "Same or variant of meta description",
      type: "website",
      locale: "en_GB",
      siteName,
      images: [`${baseUrl}/images/${siteConfig?.slug || 'yalla-london'}-og.jpg`],
    },
    twitter: { card: "summary_large_image", title: "...", description: "..." },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
  };
}
```

### 7.3 Structured Data in Layouts

Every layout MUST include BreadcrumbList structured data:

```typescript
// In layout.tsx children wrapper
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
    { "@type": "ListItem", position: 2, name: "Page Name", item: `${baseUrl}/{route}` },
  ],
}) }} />
```

### 7.4 Required Page Elements

Every public page MUST include:

1. **Header navigation** with links to all major sections
2. **Footer** with: legal links (privacy, terms, affiliate disclosure), contact email, site description
3. **Breadcrumb navigation** (visible to users, not just in structured data)
4. **Arabic toggle** link/button (switches to `/ar/` equivalent)
5. **Mobile-responsive layout** — all content accessible on iPhone

---

## 8. Multi-Site Development Rules

### 8.1 Configuration-Driven, Never Hardcoded

**ABSOLUTE RULE:** No site-specific values (domains, names, emails, colors, content) may be hardcoded anywhere in the codebase. Everything MUST read from configuration.

**Where site config lives:**
- `config/sites.ts` — site entries (domain, locale, direction, topics, prompts, affiliates)
- `config/entity.ts` — parent entity (Zenitha.Luxury LLC)
- `lib/design/destination-themes.ts` — visual brand per site (colors, typography, gradients)

**Dynamic helpers to use:**
```typescript
import { getDefaultSiteId, getSiteDomain, getSiteConfig, getActiveSiteIds } from "@/config/sites";
import { getBaseUrl } from "@/lib/url-utils";
```

### 8.2 Site ID Resolution Pattern

Every API route and server component MUST resolve `siteId` using this pattern:

```typescript
const siteId =
  request.headers.get("x-site-id") ||          // From middleware
  request.nextUrl.searchParams.get("siteId") || // From query string
  getDefaultSiteId();                           // Fallback
```

### 8.3 Database Queries Must Be Site-Scoped

Every database query that returns user-facing data MUST include `siteId` in the where clause:

```typescript
// CORRECT
await prisma.blogPost.findMany({
  where: { siteId, published: true, deletedAt: null },
});

// WRONG — returns data from all sites
await prisma.blogPost.findMany({
  where: { published: true },
});
```

### 8.4 Email Generation

All contact emails MUST be dynamically generated from site domain:

```typescript
const { getSiteConfig } = await import("@/config/sites");
const config = getSiteConfig(siteId);
const email = `hello@${config?.domain || "yalla-london.com"}`;
```

### 8.5 Cron Jobs Must Loop All Active Sites

Every cron job MUST process all active sites, not just the first/default:

```typescript
const { getActiveSiteIds } = await import("@/config/sites");
const activeSites = getActiveSiteIds();
for (const siteId of activeSites) {
  if (Date.now() - budgetStart > 53_000) break; // Budget guard
  // ... process this site
}
```

---

## 9. Content Pipeline Standards

### 9.1 Pipeline Architecture

```
TopicProposal → ArticleDraft (8 phases) → Reservoir → BlogPost (published)
                                                          ↓
                                                    Pre-Publication Gate (13 checks)
                                                          ↓
                                                    IndexNow + Sitemap
```

### 9.2 Eight Content Phases

| Phase | Name | Description |
|-------|------|-------------|
| 1 | research | Topic research and keyword analysis |
| 2 | outline | Article outline with H2/H3 structure |
| 3 | drafting | Full content generation (1,500-2,000 words) |
| 4 | assembly | Merge EN + AR content, add metadata |
| 5 | images | Featured image and in-content images |
| 6 | seo | SEO scoring, internal links, keyword optimization |
| 7 | scoring | Quality gate (≥70 score to pass) |
| 8 | reservoir | Ready for selection and publication |

### 9.3 Quality Gate (Phase 7)

- Articles scoring <70 on the SEO quality gate are **rejected** (not published)
- Articles scoring ≥70 move to **reservoir** (waiting for selection)
- The quality gate score threshold comes from `CONTENT_QUALITY.qualityGateScore`
- Source: `lib/content-pipeline/phases.ts`, `lib/content-pipeline/select-runner.ts`

### 9.4 Content Generation Prompts

Every content generation prompt (in `config/sites.ts` systemPromptEN/AR) MUST specify:

1. **Word count:** 1,500-2,000 words minimum
2. **Heading hierarchy:** 1 H1, 4-6 H2s, H3 subsections
3. **Internal links:** 3+ with descriptive anchor text
4. **Affiliate links:** 2+ from site-specific platforms
5. **Meta title:** 50-60 chars with focus keyword
6. **Meta description:** 120-160 chars with keyword + CTA
7. **Focus keyword placement:** Title, first paragraph, one H2
8. **"Key Takeaways" section** at the end
9. **First-hand experience directives:** Sensory details, insider tips, honest limitations
10. **AI-generic phrase blacklist:** Must not use phrases from §6.3

### 9.5 Race Condition Prevention

Content pipeline uses atomic claiming to prevent duplicate processing:

```typescript
// Atomic claim — only one worker can grab a topic
const claimed = await prisma.topicProposal.updateMany({
  where: { id: topic.id, status: "approved" },
  data: { status: "generating" },
});
if (claimed.count === 0) continue; // Another worker got it
```

---

## 10. Affiliate & Revenue Integration

### 10.1 Every Article Must Monetize

Articles without affiliate/booking links fail check #13 of the pre-publication gate. This is a **warning** (not blocker) but should be treated as mandatory for revenue.

### 10.2 Site-Specific Affiliate Platforms

| Site | Primary Affiliates |
|------|--------------------|
| Yalla London | HalalBooking, Booking.com, GetYourGuide, Viator |
| Arabaldives | HalalBooking, Booking.com, Agoda |
| Yalla Riviera | Booking.com, Boatbookings, GetYourGuide, TheFork |
| Yalla Istanbul | HalalBooking, Booking.com, GetYourGuide, Viator |
| Yalla Thailand | HalalBooking, Booking.com, Agoda, Klook |

### 10.3 Affiliate Link Rules

- Use `rel="noopener sponsored"` on all affiliate links
- Use `target="_blank"` for external links
- Descriptive anchor text (e.g., "Book a halal-friendly room at The Dorchester") — never "click here"
- Disclose affiliate relationships on `/affiliate-disclosure` page
- Links must be contextually relevant to surrounding content

### 10.4 Auto-Fix Capability

The SEO compliance auto-fix system (`/api/admin/seo/article-compliance` POST `auto_fix`) can inject:
- Missing meta titles (generated from article title + site name)
- Missing meta descriptions (sentence-aware extraction from content)
- Missing authors (assigns default admin)
- Missing internal links (Related Articles section with 3 recent articles)
- Missing affiliate links (booking CTA with Booking.com, HalalBooking, GetYourGuide)
- Missing SEO scores (baseline from content completeness)

---

## 11. Performance Standards

### 11.1 Vercel Pro Constraints

- **Function timeout:** 60 seconds maximum
- **Budget guard:** Every cron job and long-running API uses 53s budget with 7s buffer
- **Edge functions:** Use for middleware (CSRF, routing, headers)
- **ISR:** Use for blog pages, revalidate every 3600s

### 11.2 Image Optimization

- Use Next.js `<Image>` component (auto WebP, lazy loading, srcset)
- Configure `remotePatterns` in `next.config.js` for all 5 site domains
- OG images: per-site branded (`{slug}-og.jpg`)
- Maximum recommended image size: 200KB for inline images, 500KB for hero

### 11.3 Bundle Optimization

- Use dynamic imports (`await import()`) for heavy libraries in API routes
- Never import Prisma at module level — always `const { prisma } = await import("@/lib/db")`
- Use `next/dynamic` for heavy client components (editors, charts)
- Code-split admin pages from public pages

### 11.4 Caching Strategy

- Static pages: `Cache-Control: public, max-age=3600, s-maxage=86400`
- API responses: `Cache-Control: private, no-cache` for admin, `s-maxage=60` for public
- Prisma query caching: Use `findFirst` with `select` to minimize data transfer

---

## 12. Accessibility Standards

### 12.1 WCAG 2.1 Level AA

All public pages must meet WCAG 2.1 Level AA:

- **Color contrast:** Minimum 4.5:1 for text, 3:1 for large text
- **Keyboard navigation:** All interactive elements must be keyboard-accessible
- **Focus indicators:** Visible focus state on all focusable elements
- **Alt text:** All images, all icons with meaning
- **ARIA labels:** On all interactive elements without visible text
- **Language attributes:** `lang="en"` on HTML element, `lang="ar" dir="rtl"` for Arabic sections
- **Skip navigation:** Hidden "Skip to content" link as first focusable element

### 12.2 RTL Support

Arabic (`ar`) pages MUST:
- Set `dir="rtl"` on the HTML element or containing div
- Mirror layout (navigation, content flow)
- Use Arabic typography from `destination-themes.ts`
- Support Arabic numerals where appropriate
- All links and buttons must work in RTL context

---

## 13. Dashboard & Management Standards

### 13.1 Everything Must Be Visible

**Rule:** If Khaled can't see it on the dashboard from his iPhone, it doesn't exist.

Every system MUST surface its status:
- Pipeline status → Content Hub
- Cron job results → Cron Log page
- SEO compliance → SEO Dashboard (Audit tab)
- Indexing status → Indexing Center
- Errors → Error alerts with plain-language descriptions
- Revenue → Affiliate clicks and conversions (when connected)

### 13.2 No Silent Failures

Every `catch` block MUST either:
1. Recover meaningfully (retry, fallback)
2. Log to `CronJobLog` or `console.warn` with module tag (e.g., `[seo-agent]`)
3. Surface the error to the dashboard

**FORBIDDEN:** `catch {}` — empty catch with no action

### 13.3 Button-Driven Operations

Every operation Khaled might need MUST be a single button tap:
- "Run SEO Agent" → triggers seo-agent cron
- "Publish Ready" → triggers content-selector
- "Generate Content" → triggers content-builder
- "Run Compliance Audit" → batched 13-check audit on all articles
- "Fix All Issues" → auto-remediate compliance failures

### 13.4 Mobile-First Dashboard Design

- All dashboard pages must be usable on iPhone SE (375px width)
- Touch targets: minimum 44x44px
- No horizontal scrolling on mobile
- Collapsible sections for complex data
- Summary cards at top, details below

---

## 14. Standards Maintenance & Updates

### 14.1 Weekly Standards Refresh

The weekly research agent (`lib/seo/orchestrator/weekly-research-agent.ts`) runs every Sunday at 5am UTC and:

1. Checks 12 trusted sources for algorithm updates:
   - Google Search Central Documentation Changelog
   - Google Search Status Dashboard
   - Google Search Blog
   - Search Engine Roundtable
   - Search Engine Land
   - Web.dev
   - Schema.org
   - (and 5 more)

2. Compares current `STANDARDS_VERSION` against latest findings
3. Flags staleness if >30 days since last update
4. Logs results to CronJobLog for dashboard visibility

### 14.2 Staleness Alerting

The SEO dashboard overview API includes a `standardsHealth` object:

```json
{
  "version": "2026-02-19",
  "ageInDays": 5,
  "isStale": false,
  "message": "Standards current (v2026-02-19, 5 days old)"
}
```

If `isStale: true` (>30 days), the dashboard shows a warning. This means `standards.ts` needs updating with the latest algorithm intelligence.

### 14.3 How to Update Standards

When algorithm changes are detected:

1. Update values in `lib/seo/standards.ts`
2. Bump `STANDARDS_VERSION` to current date
3. All enforcement points automatically pick up new values (dynamic imports)
4. Run compliance audit to assess impact on existing content
5. Use "Fix All Issues" to auto-remediate where possible

**Files that dynamically import from standards.ts:**
- `lib/seo/orchestrator/pre-publication-gate.ts` (all 13 checks)
- `lib/content-pipeline/phases.ts` (phase 7 quality gate)
- `lib/content-pipeline/select-runner.ts` (selection gate)
- `app/api/admin/content/publish/route.ts` (publish gate)
- `app/api/admin/seo/route.ts` (dashboard categories)
- `app/api/admin/seo-command/route.ts` (issue detection)
- `app/api/admin/content-indexing/route.ts` (indexing diagnostics)
- `app/api/admin/seo/article-compliance/route.ts` (compliance audit + auto-fix)

### 14.4 Authoritative Sources

Only use these sources for algorithm intelligence:

| Source | URL | Authority |
|--------|-----|-----------|
| Google Search Central | developers.google.com/search/docs | Primary |
| Google Search Blog | developers.google.com/search/blog | Primary |
| Documentation Changelog | developers.google.com/search/updates | Primary |
| Quality Rater Guidelines | guidelines.raterhub.com | Primary |
| Search Status Dashboard | status.search.google.com | Primary |
| Web.dev | web.dev | Google-maintained |
| Schema.org | schema.org | Standards body |
| Rich Results Test | search.google.com/test/rich-results | Validation |
| Schema Validator | validator.schema.org | Validation |

Source: `AUTHORITATIVE_SOURCES`

---

## 15. Pre-Launch Checklist

Before any new website goes live, verify ALL of the following:

### Configuration
- [ ] Site entry in `config/sites.ts` with status `"active"`
- [ ] Domain mapping in `middleware.ts` (root + www)
- [ ] Theme in `lib/design/destination-themes.ts`
- [ ] Site ID in `config/entity.ts` → `contentArm.sites[]`
- [ ] System prompts (EN + AR) are site-specific and comprehensive (see §9.4)
- [ ] Topics arrays populated (7+ topics each language)
- [ ] Affiliate categories match site research report

### SEO Foundation
- [ ] `generateMetadata()` on every public route layout
- [ ] Canonical tags with absolute URLs
- [ ] Hreflang tags (en-GB, ar-SA, x-default) bidirectional
- [ ] Open Graph and Twitter Card tags
- [ ] BreadcrumbList structured data on all page layouts
- [ ] Organization schema on about page
- [ ] WebSite schema on root layout
- [ ] `sitemap.ts` generates per-site sitemap
- [ ] `robots.txt` allows all crawlers
- [ ] IndexNow key file route configured

### Content Pipeline
- [ ] Weekly topics cron generates topics for this site
- [ ] Content builder processes this site's topics
- [ ] Content selector promotes this site's articles
- [ ] Pre-publication gate runs and blocks bad content
- [ ] Published articles are publicly accessible
- [ ] SEO agent picks up new articles for indexing

### Performance
- [ ] LCP ≤2.5s on homepage and key landing pages
- [ ] INP ≤200ms on interactive pages
- [ ] CLS ≤0.1 on all pages
- [ ] Images optimized (WebP, lazy loading, srcset)
- [ ] No layout shifts from dynamic content

### Revenue
- [ ] Affiliate links present in system prompts
- [ ] Published articles contain affiliate/booking links
- [ ] Affiliate disclosure page exists
- [ ] Contact page with site-specific email

### Security
- [ ] HTTPS enforced (redirect HTTP → HTTPS)
- [ ] CSP headers configured in `next.config.js`
- [ ] Admin routes protected with `requireAdmin`/`withAdminAuth`
- [ ] No credentials exposed in API responses
- [ ] XSS prevention: all `dangerouslySetInnerHTML` wrapped with `sanitizeHtml()`

### Dashboard
- [ ] Site appears in admin site selector
- [ ] Pipeline status shows for this site
- [ ] Cron jobs process this site
- [ ] SEO compliance audit covers this site's articles
- [ ] Content generation monitor shows this site's drafts

---

## 16. Anti-Patterns Registry

These patterns have caused bugs in this codebase. NEVER repeat them.

### AP-01: Hardcoded Site Values
```typescript
// WRONG
const domain = "yalla-london.com";
const email = "hello@yalla-london.com";
const siteName = "Yalla London";

// CORRECT
const { getSiteDomain, getSiteConfig, getDefaultSiteId } = await import("@/config/sites");
const config = getSiteConfig(siteId);
const domain = config?.domain;
const email = `hello@${domain}`;
const siteName = config?.siteName;
```

### AP-02: Module-Level Prisma Import
```typescript
// WRONG
import { prisma } from "@/lib/db";

// CORRECT
const { prisma } = await import("@/lib/db");
```

### AP-03: Empty Catch Blocks
```typescript
// WRONG
try { ... } catch {}

// CORRECT
try { ... } catch (err) {
  console.warn("[module-name] Description:", err instanceof Error ? err.message : err);
}
```

### AP-04: Hardcoded SEO Thresholds
```typescript
// WRONG
const MIN_QUALITY_SCORE = 70;
if (wordCount < 1000) { ... }

// CORRECT
const { CONTENT_QUALITY } = await import("@/lib/seo/standards");
const MIN_QUALITY_SCORE = CONTENT_QUALITY.qualityGateScore;
if (wordCount < CONTENT_QUALITY.minWords) { ... }
```

### AP-05: Unscoped Database Queries
```typescript
// WRONG — returns data from all sites
const posts = await prisma.blogPost.findMany({ where: { published: true } });

// CORRECT — scoped to current site
const posts = await prisma.blogPost.findMany({ where: { published: true, siteId } });
```

### AP-06: Math.random() for IDs or Metrics
```typescript
// WRONG — fake data, crypto-unsafe
const id = `item-${Math.random().toString(36).slice(2)}`;
const score = Math.floor(Math.random() * 100);

// CORRECT
const id = crypto.randomUUID();
// Don't fake metrics — show honest 0 or null
```

### AP-07: require() in ES Module Context
```typescript
// WRONG — breaks tree-shaking, needs @types/node
const { foo } = require("@/lib/bar");

// CORRECT
const { foo } = await import("@/lib/bar");
```

### AP-08: Publishing Without Gate
```typescript
// WRONG — bypasses all 13 quality checks
await prisma.blogPost.update({ where: { id }, data: { published: true } });

// CORRECT — gate-first, fail-closed
const gate = await runPrePublicationGate(url, content, siteUrl);
if (!gate.allowed) { /* reject */ return; }
await prisma.blogPost.update({ where: { id }, data: { published: true } });
```

### AP-09: Deprecated Schema Types
```typescript
// WRONG — generates schema Google ignores
if (pageType === "faq") return { "@type": "FAQPage", ... };
if (pageType === "howto") return { "@type": "HowTo", ... };

// CORRECT — use Article fallback for deprecated types
if (isSchemaDeprecated(pageType)) return { "@type": "Article", ... };
```

### AP-10: Single-Site Cron Processing
```typescript
// WRONG — only processes first active site
const siteId = getActiveSiteIds()[0];

// CORRECT — loop all active sites with budget guard
for (const siteId of getActiveSiteIds()) {
  if (Date.now() - budgetStart > 53_000) break;
  // ... process
}
```

### AP-11: Exposing Credentials in API Responses
```typescript
// WRONG
return NextResponse.json({ apiKey: process.env.GOOGLE_API_KEY, secret: config.clientSecret });

// CORRECT
return NextResponse.json({ apiKeyConfigured: !!process.env.GOOGLE_API_KEY });
```

### AP-12: Error Details in Public Responses
```typescript
// WRONG — exposes internal details to attackers
return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });

// CORRECT
console.error("[route-name] Error:", error);
return NextResponse.json({ error: "Operation failed" }, { status: 500 });
```

---

## Document Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-20 | Initial comprehensive standards document |

---

*This document is the authoritative reference for all development on the Zenitha Content Network. When in doubt, check `lib/seo/standards.ts` for current threshold values and this document for intent and rules.*
