# Maximum SEO Compliance Specification

**Platform:** Zenitha Content Network (Zenitha.Luxury LLC)
**Version:** 1.0.0
**Date:** 2026-02-19
**Scope:** All 5 branded sites under the Zenitha Content Network
**Standards Source:** Google Search Central (Feb 2026), Quality Rater Guidelines (Sept 2025), Schema.org V29.4, CrUX data, confirmed algorithm updates through Feb 2026

---

## Table of Contents

1. [URL & Indexation Policy](#1-url--indexation-policy)
2. [International SEO (EN/AR)](#2-international-seo-enar)
3. [Page Type Template Contracts](#3-page-type-template-contracts)
4. [Internal Link Graph Rules](#4-internal-link-graph-rules)
5. [Technical SEO Requirements](#5-technical-seo-requirements)
6. [Structured Data Requirements](#6-structured-data-requirements)
7. [AI Search / AIO Readiness](#7-ai-search--aio-readiness)
8. [Performance / CWV Guardrails](#8-performance--cwv-guardrails)

**Appendix:**
- [A. Site Domain Registry](#appendix-a-site-domain-registry)
- [B. Pre-Publication Gate Checklist](#appendix-b-pre-publication-gate-checklist)
- [C. Deprecated Schema Types](#appendix-c-deprecated-schema-types)
- [D. Measurement & Enforcement](#appendix-d-measurement--enforcement)

---

## 1. URL & Indexation Policy

### 1.1 Canonical URL Format

Every page on every site MUST have a canonical URL that follows this exact pattern:

```
https://www.{domain}/{path}
```

**Rules:**

| Rule | Value | Enforced By |
|------|-------|-------------|
| Protocol | Always `https://` | Middleware redirect (non-HTTPS -> HTTPS) |
| Subdomain | Always `www.` | Middleware redirect (bare domain -> www) |
| Trailing slash | Never (Next.js default) | Next.js config `trailingSlash: false` |
| Case | Always lowercase | Middleware normalization |
| Encoding | UTF-8, percent-encoded where required | Standard URL encoding |

**Examples:**

```
CORRECT:   https://www.yalla-london.com/blog/luxury-hotels-mayfair
WRONG:     https://yalla-london.com/blog/luxury-hotels-mayfair      (missing www)
WRONG:     https://www.yalla-london.com/blog/luxury-hotels-mayfair/  (trailing slash)
WRONG:     http://www.yalla-london.com/blog/luxury-hotels-mayfair    (HTTP)
WRONG:     https://www.yalla-london.com/Blog/Luxury-Hotels-Mayfair   (mixed case)
```

### 1.2 Query Parameter Handling

| Parameter Type | Action | Example |
|---------------|--------|---------|
| Tracking params (utm_*, fbclid, gclid, ref) | Strip from canonical, pass through for analytics | `?utm_source=twitter` stripped from `<link rel="canonical">` |
| Pagination (`?page=N`) | Include in canonical for page 1 only; page 2+ gets `noindex` | `/blog?page=2` -> `noindex, follow` |
| Sort/filter params | Strip from canonical; content is same regardless of sort | `?sort=date` stripped from canonical |
| Search params (`?q=`) | `noindex` on all search result pages | `/search?q=hotels` -> `noindex` |

### 1.3 Pagination Rules

When content is paginated (blog listing, category pages, search results):

1. **Page 1:** Index normally. Self-referencing canonical without `?page=1`.
2. **Page 2+:** Add `<meta name="robots" content="noindex, follow">`. Include `rel="next"` and `rel="prev"` link elements.
3. **`rel="next"` / `rel="prev"`:** Include in `<head>` on all paginated pages. Google has officially deprecated these signals but Bing and other engines still use them.
4. **Canonical on paginated pages:** Self-referencing (each page is its own canonical). Do NOT point page 2 canonical to page 1.

```html
<!-- Page 1 of blog listing -->
<link rel="canonical" href="https://www.yalla-london.com/blog" />
<link rel="next" href="https://www.yalla-london.com/blog?page=2" />

<!-- Page 2 of blog listing -->
<meta name="robots" content="noindex, follow" />
<link rel="canonical" href="https://www.yalla-london.com/blog?page=2" />
<link rel="prev" href="https://www.yalla-london.com/blog" />
<link rel="next" href="https://www.yalla-london.com/blog?page=3" />
```

### 1.4 Index / Noindex Rules by Page Type

| Page Type | Index Status | Canonical | Notes |
|-----------|-------------|-----------|-------|
| Homepage (`/`) | INDEX | Self | Priority 1.0 in sitemap |
| Blog listing (`/blog`) | INDEX | Self | Priority 0.9 |
| Blog articles (`/blog/*`) | INDEX | Self | Priority 0.8, revenue pages |
| Blog categories (`/blog/category/*`) | INDEX | Self | Priority 0.7 |
| Information hub (`/information`) | INDEX | Self | Priority 0.9 |
| Information articles (`/information/articles/*`) | INDEX | Self | Priority 0.8 |
| Information sections (`/information/{section}`) | INDEX | Self | Priority 0.8 |
| News listing (`/news`) | INDEX | Self | Priority 0.8 |
| News articles (`/news/*`) | INDEX | Self | Priority 0.7 |
| Events listing (`/events`) | INDEX | Self | Priority 0.8 |
| Event pages (`/events/*`) | INDEX | Self | Priority 0.7 |
| About (`/about`) | INDEX | Self | Priority 0.7 |
| Contact (`/contact`) | INDEX | Self | Priority 0.6 |
| Recommendations (`/recommendations`) | INDEX | Self | Priority 0.9 |
| Recommendation items (`/recommendations/*`) | INDEX | Self | Priority 0.8 |
| London by Foot (`/london-by-foot/*`) | INDEX | Self | Priority 0.7 |
| Shop (`/shop`, `/shop/*`) | INDEX | Self | Priority 0.7 |
| Arabic mirrors (`/ar/*`) | INDEX | Self + hreflang | See Section 2 |
| Admin pages (`/admin/*`) | NOINDEX | None needed | robots.txt disallow + noindex |
| API routes (`/api/*`) | NOINDEX | None needed | robots.txt disallow + noindex |
| Search results (`/search*`) | NOINDEX | None | `noindex, follow` |
| Paginated results (page > 1) | NOINDEX | Self | `noindex, follow` |
| 404 / Error pages | NOINDEX | None | HTTP 404 status code |
| Offline page (`/offline`) | NOINDEX | None | Service worker fallback |
| Auth pages (`/login`, `/register`) | NOINDEX | None | `noindex, nofollow` |
| Preview/draft pages | NOINDEX | None | `noindex, nofollow` |
| Privacy policy (`/privacy`) | INDEX | Self | Priority 0.3 (E-E-A-T trust signal) |
| Terms of service (`/terms`) | INDEX | Self | Priority 0.3 (E-E-A-T trust signal) |

### 1.5 Duplicate Prevention

| Method | Purpose | Implementation |
|--------|---------|---------------|
| Self-referencing canonical | Prevent parameter-based duplicates | On every indexable page |
| Hreflang tags | Prevent EN/AR duplicate content | Bidirectional on all indexable pages |
| 301 redirects | Consolidate non-www, HTTP, legacy URLs | Middleware layer |
| Consistent internal linking | Always link to canonical form | Code convention |

### 1.6 URL Change Protocol

When any URL is changed or removed:

1. **Create a 301 redirect** from old URL to new URL in the redirect map.
2. **Update the sitemap** to reflect the new URL.
3. **Update all internal links** pointing to the old URL.
4. **Maintain the redirect for at least 12 months** (per Google guidance).
5. **Submit the new URL** to IndexNow for accelerated discovery.
6. **Log the change** in the redirect map file for audit trail.

---

## 2. International SEO (EN/AR)

### 2.1 Hreflang Configuration

Every indexable page MUST declare hreflang tags for both English and Arabic versions. This applies to ALL 5 sites, including sites where the primary locale is Arabic (Arabaldives).

**Required hreflang values:**

| Language | Hreflang Value | URL Pattern |
|----------|---------------|-------------|
| English (GB) | `en-GB` | `https://www.{domain}/{path}` |
| Arabic (SA) | `ar-SA` | `https://www.{domain}/ar/{path}` |
| Default | `x-default` | Points to English version |

**Implementation locations (BOTH required):**

1. **HTML `<head>` tags** (primary):
```html
<link rel="alternate" hreflang="en-GB" href="https://www.yalla-london.com/blog/luxury-hotels" />
<link rel="alternate" hreflang="ar-SA" href="https://www.yalla-london.com/ar/blog/luxury-hotels" />
<link rel="alternate" hreflang="x-default" href="https://www.yalla-london.com/blog/luxury-hotels" />
```

2. **XML Sitemap** (secondary confirmation):
```xml
<url>
  <loc>https://www.yalla-london.com/blog/luxury-hotels</loc>
  <xhtml:link rel="alternate" hreflang="en-GB" href="https://www.yalla-london.com/blog/luxury-hotels"/>
  <xhtml:link rel="alternate" hreflang="ar-SA" href="https://www.yalla-london.com/ar/blog/luxury-hotels"/>
</url>
```

### 2.2 Hreflang Validation Rules

These MUST be validated automatically (pre-publication gate or cron audit):

| Rule | Description | Severity |
|------|-------------|----------|
| Bidirectional | Every `en-GB` page lists `ar-SA` counterpart AND vice versa | BLOCKER |
| Self-referencing | Each page includes hreflang pointing to itself | BLOCKER |
| x-default present | Every hreflang set includes `x-default` pointing to EN | WARNING |
| Absolute URLs | All hreflang href values are absolute (not relative) | BLOCKER |
| Canonical alignment | hreflang URL matches the page's canonical URL | BLOCKER |
| Consistency | hreflang in HTML head matches hreflang in sitemap | WARNING |
| Return tag | AR page's hreflang set points back to the EN page that points to it | BLOCKER |
| 200 status | All hreflang URLs return HTTP 200 (not 404, not redirect) | WARNING |

### 2.3 RTL Rendering Requirements

For Arabic (`/ar/*`) pages:

| Requirement | Implementation | Validation |
|-------------|---------------|------------|
| `dir="rtl"` on `<html>` | Set by locale detection in root layout | Check in rendered HTML |
| `lang="ar"` on `<html>` | Set by locale detection in root layout | Check in rendered HTML |
| Arabic font loaded | IBM Plex Sans Arabic via Google Fonts | Verify font-face in CSS |
| Content direction | All text content flows RTL | Visual inspection |
| Numbers remain LTR | Embedded numbers/phone numbers display LTR | Visual inspection |
| Navigation mirrored | Nav elements mirror for RTL context | Visual inspection |
| Breadcrumbs RTL | Breadcrumb separator direction reversed | Visual inspection |
| Image captions | Aligned to match text direction | Visual inspection |

### 2.4 Per-Site Locale Configuration

| Site ID | Primary Locale | Direction | EN Pages | AR Pages |
|---------|---------------|-----------|----------|----------|
| yalla-london | en | LTR | `/{path}` | `/ar/{path}` |
| arabaldives | ar | RTL | `/en/{path}` | `/{path}` |
| french-riviera | en | LTR | `/{path}` | `/ar/{path}` |
| istanbul | en | LTR | `/{path}` | `/ar/{path}` |
| thailand | en | LTR | `/{path}` | `/ar/{path}` |

**Note:** Arabaldives is Arabic-first. Its primary content is at the root (`/`) in Arabic, with English at `/en/`. All other sites are English-first with Arabic at `/ar/`.

### 2.5 Content Parity Requirements

| Content Type | EN Required | AR Required | Enforcement |
|-------------|-------------|-------------|-------------|
| Blog articles | YES (blocker) | YES (warning, target 100%) | Pre-publication gate |
| Static pages (about, contact, privacy, terms) | YES | YES | Deploy checklist |
| Navigation labels | YES | YES | i18n config |
| Meta titles/descriptions | YES | YES (for AR pages) | Pre-publication gate |
| Schema markup | YES | Language-appropriate | Schema generator |
| Sitemap entries | YES | YES (with hreflang) | Sitemap generator |

---

## 3. Page Type Template Contracts

Each page type MUST include exactly the blocks listed below. "REQUIRED" blocks are blockers for publishing. "RECOMMENDED" blocks are quality signals that trigger warnings if missing.

### 3.1 Blog Article (HIGHEST PRIORITY -- Revenue Pages)

This is the most important page type. Blog articles carry affiliate links and drive revenue.

```
+--------------------------------------------------+
|  Breadcrumbs (Home > Blog > [Category] > Title)  |  REQUIRED
+--------------------------------------------------+
|  H1: Article Title                                |  REQUIRED (exactly 1)
+--------------------------------------------------+
|  Published Date | Updated Date | Author           |  REQUIRED (visible to users)
+--------------------------------------------------+
|  TL;DR / Quick Answer Block                       |  REQUIRED (50-70 words)
|  (Direct answer to the main query. First visible  |
|   content block. Optimized for AI citation.)      |
+--------------------------------------------------+
|  Table of Contents (auto-generated from H2s)      |  RECOMMENDED (if 3+ H2s)
+--------------------------------------------------+
|  Content Body                                     |  REQUIRED
|  - Minimum 800 words (blocker)                    |
|  - Target 1,500 words                             |
|  - Maximum 1 H1                                   |
|  - Minimum 2 H2 sections                          |
|  - Target 6 H2 sections                           |
|  - No heading level skips (H2 -> H4 forbidden)    |
|  - Minimum 3 internal links                       |
|  - Target 5 internal links                        |
|  - Affiliate CTA embedded in relevant context     |
|  - Images with alt text                           |
|  - Short paragraphs (max 3-4 sentences)           |
|  - Bullets/tables for scannable data              |
+--------------------------------------------------+
|  FAQ Block (3-5 Q&A pairs)                        |  RECOMMENDED
|  - Semantic Q&A format (NOT FAQPage schema)       |
|  - H2: "Frequently Asked Questions"               |
|  - Each Q in <strong> or H3                       |
|  - Each A in <p>, 2-4 sentences                   |
+--------------------------------------------------+
|  Related Content Block (3-6 internal links)       |  REQUIRED
|  - Contextually relevant articles                 |
|  - Mix of blog + information hub articles         |
|  - DB-sourced first, static fallback              |
+--------------------------------------------------+
|  Conversion Block                                 |  REQUIRED
|  - Primary: Affiliate CTA (booking link)          |
|  - Secondary: Newsletter signup                   |
+--------------------------------------------------+
|  Author Attribution Block                         |  REQUIRED (E-E-A-T)
|  - Organization name + link                       |
|  - "Written by [Site] Team" minimum               |
+--------------------------------------------------+

Structured Data:  Article + BreadcrumbList JSON-LD (REQUIRED)
Meta:             og:title, og:description, og:image, og:type=article,
                  twitter:card=summary_large_image
Canonical:        Self-referencing absolute URL
Hreflang:         en-GB + ar-SA bidirectional
```

**Blog Article Quality Thresholds:**

| Metric | Blocker | Warning | Target |
|--------|---------|---------|--------|
| Word count | < 800 | 800-1,199 | >= 1,500 |
| H1 count | != 1 | -- | = 1 |
| H2 count | < 1 | 1 | >= 2 (target 6) |
| Internal links | < 1 | 1-2 | >= 3 (target 5) |
| Meta title length | < 30 chars | 30-49 chars | 50-60 chars |
| Meta description length | < 70 chars | 70-119 chars | 120-160 chars |
| SEO score | < 60 | -- | >= 60 |
| Readability (FK grade) | > 16 | 13-16 | <= 12 (target 10) |
| Image alt text | > 50% missing | Any missing | 100% present |
| Author attribution | Missing | -- | Present |

### 3.2 Information Hub Article

Same as Blog Article with these additions:

```
+--------------------------------------------------+
|  Section-Based Navigation                         |  REQUIRED
|  (Jump links to major sections within the page)   |
+--------------------------------------------------+
|  Place/Attraction Details Block (when applicable) |  RECOMMENDED
|  - Address, opening hours, price range            |
|  - Map embed or link                              |
|  - Contact information                            |
+--------------------------------------------------+

Structured Data:  Article + BreadcrumbList JSON-LD (REQUIRED)
                  + TouristAttraction / Hotel / Restaurant (when applicable)
```

### 3.3 Hub / Index Pages (Blog Listing, Information Hub, Categories)

```
+--------------------------------------------------+
|  Breadcrumbs (Home > [Section])                   |  REQUIRED
+--------------------------------------------------+
|  H1: Hub Title                                    |  REQUIRED (exactly 1)
+--------------------------------------------------+
|  Hub Description (2-3 sentences)                  |  RECOMMENDED
+--------------------------------------------------+
|  Category Navigation / Filters                    |  REQUIRED (if categories exist)
+--------------------------------------------------+
|  Content Grid / List                              |  REQUIRED
|  - Paginated (12-24 items per page)               |
|  - Each item: title, excerpt, image, date         |
|  - Links to all child pages                       |
+--------------------------------------------------+
|  Pagination Controls                              |  REQUIRED (if > 1 page)
|  - rel="next"/"prev" in head                      |
|  - Page 2+ is noindex                             |
+--------------------------------------------------+

Structured Data:  BreadcrumbList (REQUIRED)
                  + ItemList (RECOMMENDED for structured lists)
Canonical:        Self-referencing (each page number is its own canonical)
```

### 3.4 Static Pages (About, Contact, Privacy, Terms)

```
+--------------------------------------------------+
|  Breadcrumbs (Home > [Page Title])                |  REQUIRED
+--------------------------------------------------+
|  H1: Page Title                                   |  REQUIRED (exactly 1)
+--------------------------------------------------+
|  Content Body                                     |  REQUIRED
|  - Clear, readable text                           |
|  - Contact info visible (for contact page)        |
|  - Company entity info (for legal pages)          |
+--------------------------------------------------+

Structured Data:  BreadcrumbList (REQUIRED)
                  No additional schema beyond sitewide Organization + WebSite
Canonical:        Self-referencing absolute URL
Hreflang:         en-GB + ar-SA bidirectional
```

**Legal pages (Privacy, Terms) are E-E-A-T trust signals.** They MUST:
- Display the entity name: "Zenitha.Luxury LLC"
- Be accessible from the footer on every page
- Include the data controller statement
- Be available in both EN and AR

### 3.5 News Pages

```
+--------------------------------------------------+
|  Breadcrumbs (Home > News > [Article Title])      |  REQUIRED
+--------------------------------------------------+
|  H1: News Headline                                |  REQUIRED (exactly 1)
+--------------------------------------------------+
|  Published Date (prominent, human-readable)       |  REQUIRED
|  "Last updated" if edited after publication       |  REQUIRED (when applicable)
+--------------------------------------------------+
|  TL;DR / Quick Summary (2-3 sentences)            |  RECOMMENDED
+--------------------------------------------------+
|  Content Body                                     |  REQUIRED
|  - Minimum 400 words                              |
|  - Date freshness emphasized in first paragraph   |
|  - Source attribution where applicable             |
+--------------------------------------------------+
|  Related News Block (2-4 links)                   |  RECOMMENDED
+--------------------------------------------------+

Structured Data:  Article (subtype NewsArticle) + BreadcrumbList JSON-LD (REQUIRED)
Meta:             og:type=article, article:published_time, article:modified_time
Canonical:        Self-referencing absolute URL
```

**News freshness rules:**
- `datePublished` MUST be the actual publication date.
- `dateModified` MUST only be updated when substantive content changes occur (not cosmetic edits).
- News articles older than 30 days MAY be moved to an archive section.
- Google's freshness system penalizes fake date manipulation -- never update dates without real content changes.

### 3.6 Event Pages

```
+--------------------------------------------------+
|  Breadcrumbs (Home > Events > [Event Title])      |  REQUIRED
+--------------------------------------------------+
|  H1: Event Title                                  |  REQUIRED (exactly 1)
+--------------------------------------------------+
|  Event Details Block                              |  REQUIRED
|  - Date/time (start + end)                        |
|  - Location (venue name + address)                |
|  - Price/tickets (if applicable)                  |
|  - Status (scheduled/postponed/cancelled)         |
+--------------------------------------------------+
|  Event Description                                |  REQUIRED
|  - What the event is, who it's for                |
|  - Minimum 200 words                              |
+--------------------------------------------------+
|  Booking / Ticket CTA                             |  RECOMMENDED (affiliate opportunity)
+--------------------------------------------------+
|  Related Events Block (2-4 links)                 |  RECOMMENDED
+--------------------------------------------------+

Structured Data:  Event + BreadcrumbList JSON-LD (REQUIRED)
                  - startDate, endDate in ISO 8601
                  - location with address
                  - offers (if ticketed)
                  - eventStatus
                  - eventAttendanceMode
Canonical:        Self-referencing absolute URL
```

---

## 4. Internal Link Graph Rules

### 4.1 Zero Orphan Pages

Every indexable page MUST be reachable from at least 2 other pages within the same site. An orphan page is invisible to search crawlers that follow links.

**Verification method:** Run a crawl simulation monthly. Any page in the sitemap that is not discovered via internal links is an orphan and must be linked.

### 4.2 Minimum Inbound Link Targets

| Page Type | Minimum Inbound Links | Source |
|-----------|----------------------|--------|
| Homepage | N/A (linked from every page via logo/nav) | -- |
| Hub pages (blog, information, recommendations) | >= 10 | Header nav, footer, article CTAs, sidebar |
| Blog articles | >= 3 | Related articles block, category pages, other articles |
| Information articles | >= 3 | Section pages, related articles, blog cross-links |
| Category pages | >= 5 | Hub page, articles in category, footer, sidebar |
| Static pages (about, contact) | >= 2 | Header nav, footer |
| Legal pages (privacy, terms) | >= 2 | Footer (every page) |
| News articles | >= 2 | News listing, related news |
| Event pages | >= 2 | Events listing, related events |

### 4.3 Hub-to-Child Linking

Hub pages MUST link to ALL their children:

| Hub Page | Must Link To |
|----------|-------------|
| `/blog` | Every published blog article (paginated) |
| `/blog/category/{slug}` | Every article in that category |
| `/information` | Every information section |
| `/information/{section}` | Every article in that section |
| `/news` | Every published news article (paginated) |
| `/events` | Every published event |
| `/recommendations` | Every recommendation page |

### 4.4 Anchor Text Rules

| Rule | Threshold | Rationale |
|------|-----------|-----------|
| Exact-match anchor text | Max 30% of all inbound links to a page | Over-optimization penalty risk |
| Varied anchors | Min 70% of inbound links use natural variation | Appears editorial, not manipulative |
| Generic anchors ("click here", "read more") | Max 10% | Waste of anchor text signal |
| Keyword in anchor | At least 1 link per article uses a relevant keyword | SEO signal |
| No naked URLs as anchor text | 0% (except in citations) | Poor UX and SEO |

### 4.5 Cross-Content-Type Linking

Actively encouraged linking patterns:

| From | To | Purpose |
|------|----|---------|
| Blog article about hotels | Information hub article about the neighborhood | Topical depth |
| Information hub article | Blog review of a specific hotel/restaurant | Revenue page boost |
| Blog article (any) | Recommendations page | Affiliate conversion |
| News article | Relevant blog article | Link equity to evergreen content |
| Blog article | Related blog article | Internal PageRank distribution |

### 4.6 Navigation-Level Links

**Header:** Must include links to top-level hubs:
- Home, Blog, Information, Recommendations, Events, News, About, Contact

**Footer:** Must provide baseline links to:
- All major sections (same as header)
- Legal pages (Privacy Policy, Terms of Service)
- Entity disclosure ("Zenitha.Luxury LLC")
- Cross-site links to other Zenitha Content Network sites (when active)

**Related Articles Module:**
- Present on every article page (blog, information, news)
- 3-6 contextually relevant links
- DB-sourced articles prioritized, static content as fallback
- Mix of same-type and cross-type links

### 4.7 Cross-Site Network Links

When multiple sites are active, each site's footer SHOULD include links to sister sites in the Zenitha Content Network. This builds topical authority across the network.

```
Zenitha Content Network:
- Yalla London  (yalla-london.com)
- Arabaldives   (arabaldives.com)
- Yalla Riviera (yallariviera.com)
- Yalla Istanbul (yallaistanbul.com)
- Yalla Thailand (yallathailand.com)
```

These cross-site links use `rel="noopener"` but NOT `rel="nofollow"` (they are editorial links between owned properties).

---

## 5. Technical SEO Requirements

### 5.1 XML Sitemap

**Implementation:** Single `sitemap.ts` file using Next.js App Router convention.

| Requirement | Specification | Status |
|-------------|--------------|--------|
| Format | XML Sitemap protocol 0.9 | Implemented |
| Location | `https://www.{domain}/sitemap.xml` | Implemented |
| Scope | All indexable pages per site (scoped by `siteId`) | Implemented |
| Hreflang in sitemap | `xhtml:link` alternates for EN/AR on every entry | Implemented |
| `lastModified` | Actual date from DB or static data; NOT `new Date()` for unchanged content | VIOLATION: currently uses `currentDate` for static pages |
| `changeFrequency` | Honest estimate per page type | Implemented |
| `priority` | Set per page type (see Section 1.4) | Implemented |
| Max URLs per file | 50,000 (Google limit) | Enforced |
| Max file size | 50MB uncompressed | Standard |
| Sitemap index | Use when any single site exceeds 10,000 URLs | Future |
| Update frequency | Regenerated on every request (ISR/dynamic) | Implemented |

**lastModified correction needed:**
- Static pages (about, contact, etc.) currently use `new Date().toISOString()`. This MUST be changed to a fixed date representing the last actual content edit. Google penalizes false freshness signals.
- DB-sourced content correctly uses `updated_at` from the database.

### 5.2 robots.txt

**Implementation:** `robots.ts` in the App Router.

```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

User-agent: Googlebot
Allow: /
Disallow: /admin/
Disallow: /api/

User-agent: Google-Extended
Allow: /

User-agent: GPTBot
Allow: /
Disallow: /admin/
Disallow: /api/

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Bingbot
Allow: /
Disallow: /admin/
Disallow: /api/

User-agent: FacebookBot
Allow: /

User-agent: Applebot
Allow: /

User-agent: cohere-ai
Allow: /

Sitemap: https://www.{domain}/sitemap.xml
```

**Key decisions:**
- ALL AI crawlers explicitly allowed. This maximizes AI Overview and AI search citation.
- `/admin/` and `/api/` disallowed for all crawlers.
- robots.txt is NOT an indexing control. Use `<meta name="robots" content="noindex">` for indexing prevention.

### 5.3 Canonical Tags

| Rule | Implementation |
|------|---------------|
| Self-referencing | Every indexable page includes `<link rel="canonical" href="{self}">` |
| Absolute URL | Always full URL including protocol and domain |
| Single canonical | Exactly one canonical tag per page |
| Match hreflang | Canonical URL matches the self-referencing hreflang URL |
| No canonical on noindex pages | Pages with `noindex` do not need canonical (but it doesn't hurt) |

### 5.4 OpenGraph & Twitter Card Tags

Every public page MUST include:

```html
<!-- OpenGraph -->
<meta property="og:title" content="{page title}" />
<meta property="og:description" content="{meta description}" />
<meta property="og:url" content="{canonical URL}" />
<meta property="og:site_name" content="{site name}" />
<meta property="og:locale" content="en_GB" />  <!-- or ar_SA -->
<meta property="og:locale:alternate" content="ar_SA" />  <!-- or en_GB -->
<meta property="og:image" content="{featured image URL, 1200x630}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:type" content="website" />  <!-- or "article" for articles -->

<!-- Article-specific (for blog, news, information articles) -->
<meta property="article:published_time" content="{ISO 8601 date}" />
<meta property="article:modified_time" content="{ISO 8601 date}" />
<meta property="article:section" content="{category}" />
<meta property="article:tag" content="{tag1}" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{page title}" />
<meta name="twitter:description" content="{meta description}" />
<meta name="twitter:image" content="{featured image URL}" />
```

### 5.5 HTTP Status Codes

| Scenario | Status Code | Implementation |
|----------|-------------|---------------|
| Normal page | 200 | Default |
| Page not found | 404 | `notFound()` in page component (implemented) |
| Permanent redirect (URL change) | 301 | Middleware or `next.config.js` redirects |
| Temporary redirect | 307 | Middleware |
| Non-www to www | 301 | Middleware |
| HTTP to HTTPS | 301 | Vercel platform |
| Server error | 500 | Error boundary |

### 5.6 Redirect Map

A redirect map MUST be maintained for all URL changes. Format:

```
/old-path -> /new-path (301, added YYYY-MM-DD, reason)
```

Redirects are implemented in `next.config.js` or middleware. Key redirect chains:

| From | To | Type |
|------|----|------|
| `http://{domain}/*` | `https://www.{domain}/*` | 301 (platform) |
| `https://{domain}/*` (no www) | `https://www.{domain}/*` | 301 (middleware) |
| Any legacy/renamed URL | Current canonical URL | 301 (config) |

**Redirect chain limit:** Maximum 2 hops. A -> B -> C is acceptable. A -> B -> C -> D is not.

### 5.7 HTTP Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | Configured in `next.config.js` | XSS prevention |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing prevention |
| `X-Frame-Options` | `DENY` | Clickjacking prevention |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Privacy + analytics |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | HTTPS enforcement |
| `Cache-Control` | Per resource type (see Performance section) | Performance |

---

## 6. Structured Data Requirements

### 6.1 Sitewide Schema (Every Page)

Two schemas MUST be present on every page across the site, injected once in the root layout:

**Organization schema (one per site):**
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://www.{domain}#organization",
  "name": "{site name}",
  "url": "https://www.{domain}",
  "logo": {
    "@type": "ImageObject",
    "url": "https://www.{domain}/images/logo.svg",
    "width": 300,
    "height": 100
  },
  "description": "{site description}",
  "contactPoint": [{
    "@type": "ContactPoint",
    "contactType": "Customer Support",
    "email": "hello@{domain}",
    "availableLanguage": ["English", "Arabic"]
  }],
  "sameAs": ["{social media URLs}"],
  "parentOrganization": {
    "@type": "Organization",
    "name": "Zenitha.Luxury LLC",
    "url": "https://zenitha.luxury"
  }
}
```

**WebSite schema (one per site):**
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://www.{domain}#website",
  "name": "{site name}",
  "url": "https://www.{domain}",
  "publisher": { "@id": "https://www.{domain}#organization" },
  "inLanguage": ["en", "ar"],
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://www.{domain}/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

### 6.2 Per-Page-Type Schema

| Page Type | Required Schema | Optional Schema |
|-----------|----------------|-----------------|
| Blog article | Article + BreadcrumbList | Review (if review content detected) |
| Information article | Article + BreadcrumbList | TouristAttraction, Hotel, Restaurant |
| News article | Article (NewsArticle variant) + BreadcrumbList | -- |
| Event page | Event + BreadcrumbList | -- |
| Category/hub page | BreadcrumbList | ItemList |
| Recommendation page | BreadcrumbList | Restaurant, Hotel, TouristAttraction |
| Static page | BreadcrumbList | -- |

### 6.3 Supported Schema Types (2025-2026)

These types are actively supported by Google and generate rich results:

| Schema Type | Use Case in This Platform |
|-------------|--------------------------|
| Article | Blog posts, information articles, news |
| BreadcrumbList | All pages with navigation path |
| Organization | Sitewide (root layout) |
| WebSite | Sitewide (root layout) |
| Event | Event pages |
| Restaurant | Recommendation/review pages |
| Hotel | Recommendation/review pages |
| TouristAttraction | Information hub articles about places |
| Review | Articles with review content |
| VideoObject | Pages with embedded video |
| Person | Author attribution |
| ItemList | Hub/listing pages |

### 6.4 Deprecated Schema Types -- DO NOT USE

These types no longer generate rich results. The codebase MUST NOT generate them:

| Schema Type | Deprecated Date | Reason |
|-------------|----------------|--------|
| FAQPage | August 2023 | Restricted to authoritative government/health sites only |
| HowTo | September 2023 | Fully deprecated, no rich results |
| CourseInfo | June 2025 | Deprecated |
| ClaimReview | June 2025 | Fact Check deprecated |
| EstimatedSalary | June 2025 | Deprecated |
| LearningVideo | June 2025 | Deprecated |
| SpecialAnnouncement | June 2025 | Deprecated |
| VehicleListing | June 2025 | Deprecated |
| PracticeProblems | November 2025 | Deprecated |
| SitelinksSearchBox | October 2024 | Deprecated |

**For content that would have used FAQPage:** Use semantic Q&A formatting in the HTML (H3 for questions, paragraphs for answers) without FAQPage schema markup. This still helps AI extraction.

**For content that would have used HowTo:** Use numbered steps in HTML without HowTo schema markup. The content pattern is still useful for readers; only the schema is deprecated.

### 6.5 Schema Validation Rules

| Rule | Severity | Description |
|------|----------|-------------|
| No empty required fields | BLOCKER | `headline`, `datePublished`, `author` must all have values |
| Absolute URLs | BLOCKER | All `url`, `@id`, `image` fields must be absolute URLs |
| Valid dates | BLOCKER | All dates in ISO 8601 format |
| No deprecated types | BLOCKER | See Section 6.4 |
| Matching canonical | WARNING | `url` field matches page canonical |
| Per-site branding | BLOCKER | Organization name, domain, logo use site-specific values (not hardcoded) |
| Valid JSON-LD | BLOCKER | Must parse without errors |
| Single `@context` | WARNING | Use `@context` only at top level, not nested |
| `@id` consistency | WARNING | Cross-references between schemas use matching `@id` values |

### 6.6 Multi-Site Schema Isolation

Each site MUST use its own branding in all schema markup:

| Field | Source |
|-------|--------|
| Organization `name` | `SITES[siteId].name` from `config/sites.ts` |
| Organization `url` | `getSiteDomain(siteId)` |
| Organization `logo` | `{siteUrl}/images/{site-specific logo}` |
| Organization `email` | `hello@{SITES[siteId].domain}` |
| WebSite `name` | `SITES[siteId].name` |
| Article `publisher` | References site-specific Organization `@id` |

Never hardcode "Yalla London" or "yalla-london.com" in schema generation code. Always derive from the site configuration.

---

## 7. AI Search / AIO Readiness

### 7.1 Algorithm Context

As of February 2026:
- **AI Overviews:** Live for 1.5B+ monthly users across 200+ countries, 40+ languages
- **~92% of domains cited in AI Overviews** rank in the top 10 organic results
- **Question-based queries** are 84% more likely to trigger AI Overviews
- **Helpful Content System** absorbed into core ranking (March 2024)
- **Information gain** is rewarded: unique information not found elsewhere

### 7.2 Answer-First Content Pattern

Every blog article and information article MUST start with a direct answer:

**Structure:**
```
H1: [Article Title - often a question or query-focused]

[TL;DR Block: 50-70 words that directly answer the main query]
[This block should be extractable by AI as a standalone answer]
[It should name specific entities: who, what, where]

[Rest of the article provides depth, detail, and evidence]
```

**Requirements:**

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Direct answer in first 50-70 words | 100% of articles | Pre-publication check |
| Main entity named in first paragraph | 100% of articles | Manual + automated check |
| Question answered without requiring scroll | 100% of articles | Manual review |
| Answer self-contained (no "as mentioned above") | 100% of articles | Content review |

### 7.3 Entity Naming

Every article MUST clearly establish entities in the first paragraph:

| Entity Type | Example | Where |
|-------------|---------|-------|
| WHO | "Arab travelers", "Gulf families" | First paragraph |
| WHAT | "luxury boutique hotels", "halal dining" | Title + first paragraph |
| WHERE | "Mayfair, London", "Maldives" | Title + first paragraph |
| WHEN | "2026", "Ramadan season" | Title or first paragraph (when relevant) |

### 7.4 Scannable Formatting

Content MUST be formatted for AI extraction and human scanning:

| Element | Rule | Purpose |
|---------|------|---------|
| Paragraphs | Max 3-4 sentences each | AI can extract discrete chunks |
| Bullet lists | Use for 3+ comparable items | Tables/lists are preferred by AI Overviews |
| Tables | Use for comparisons (price, rating, features) | Structured data AI can parse |
| H2/H3 hierarchy | Clear, descriptive headings | AI uses headings as section identifiers |
| Bold text | Key terms/names bolded on first mention | Entity emphasis |
| Short sentences | Target avg 15-20 words per sentence | Readability + extraction |

### 7.5 FAQ Sections (Semantic, Not Schema)

Every blog article SHOULD include a FAQ section:

```html
<h2>Frequently Asked Questions</h2>

<h3>Which boutique hotels in Mayfair offer Arabic-speaking staff?</h3>
<p>Several luxury hotels in Mayfair provide Arabic-speaking concierge
services, including The Connaught, Claridge's, and The Dorchester.
All three have dedicated Arabic-speaking guest relations teams.</p>

<h3>What is the best area to stay in London for Arab families?</h3>
<p>Knightsbridge and Mayfair are the most popular areas for Arab
families visiting London, offering proximity to Harrods, halal
dining options, and luxury hotels with family-friendly amenities.</p>
```

**Rules:**
- 3-5 Q&A pairs per article
- Questions derived from "People Also Ask" and topic research
- Answers are 2-4 sentences, self-contained
- NO `FAQPage` schema markup (deprecated for travel)
- Use H3 for questions (under an H2 section heading)

### 7.6 Multi-Language Parity for AIO

Key articles (highest traffic, highest revenue potential) MUST have equivalent Arabic content:

| Requirement | Implementation |
|-------------|---------------|
| AR content equivalent quality | Not a machine translation dump; editorially reviewed |
| AR content same structure | Same H2 sections, same FAQ questions (translated) |
| AR meta tags complete | `og:locale=ar_SA`, Arabic meta title/description |
| AR hreflang correct | Points back to EN version bidirectionally |

### 7.7 Content Freshness Signals

| Signal | Implementation | Validation |
|--------|---------------|------------|
| `datePublished` visible | Displayed on article page, in Article schema | Pre-pub gate |
| `dateModified` visible | "Last updated: {date}" when content has been edited | Pre-pub gate |
| `dateModified` honest | Only updated on real content changes, not cosmetic edits | Manual review |
| Evergreen content review | Articles older than 6 months flagged for freshness review | Cron audit |
| News articles dated | Published date prominent, within hours of event | Cron-generated |

### 7.8 llms.txt

Each site serves a machine-readable `llms.txt` file for AI crawler context:

- **URL:** `https://www.{domain}/llms.txt`
- **Content:** Per-site description, topics, quality assurances, citation guidelines
- **Implementation:** Dynamic route at `/app/llms.txt/route.ts`, reads `x-site-id` header
- **Status:** Implemented for all 5 sites

### 7.9 AI Crawler Access

All AI crawlers are explicitly allowed in robots.txt (see Section 5.2). The following crawlers are individually specified:

| Crawler | Owner | Purpose |
|---------|-------|---------|
| Google-Extended | Google | Gemini, AI Overviews |
| GPTBot | OpenAI | ChatGPT, AI search |
| ChatGPT-User | OpenAI | ChatGPT browsing |
| ClaudeBot | Anthropic | Claude AI |
| anthropic-ai | Anthropic | Claude AI |
| PerplexityBot | Perplexity | Perplexity AI search |
| Bingbot | Microsoft | Copilot, Bing AI |
| FacebookBot | Meta | Meta AI |
| Applebot | Apple | Siri, Apple Intelligence |
| cohere-ai | Cohere | Cohere AI |

---

## 8. Performance / CWV Guardrails

### 8.1 Core Web Vitals Targets

| Metric | Good | Needs Improvement | Poor | Our Target |
|--------|------|-------------------|------|------------|
| LCP (Largest Contentful Paint) | <= 2.5s | 2.5s - 4.0s | > 4.0s | <= 2.5s |
| INP (Interaction to Next Paint) | <= 200ms | 200ms - 500ms | > 500ms | <= 200ms |
| CLS (Cumulative Layout Shift) | <= 0.1 | 0.1 - 0.25 | > 0.25 | <= 0.1 |
| TTFB (Time to First Byte) | <= 600ms | 600ms - 1200ms | > 1200ms | <= 600ms |

**Note:** INP replaced FID as a Core Web Vital in March 2024. FID is no longer measured.

### 8.2 Image Optimization

| Rule | Implementation | Enforcement |
|------|---------------|-------------|
| Use `next/image` component | All images use Next.js Image component | Code review |
| Lazy loading | Default for below-fold images (Next.js default) | Automatic |
| Eager loading for LCP | Hero image / featured image uses `priority={true}` | Manual per page |
| Format | AVIF with WebP fallback (Next.js auto) | `next.config.js` |
| Explicit dimensions | `width` and `height` props always set | Code review (CLS prevention) |
| Responsive sizes | `sizes` prop set appropriately | Code review |
| Alt text | Descriptive alt text on all images | Pre-publication gate |
| Max file size | < 200KB for hero images after optimization | Build-time check |

```jsx
// CORRECT: LCP hero image
<Image
  src="/images/hero.jpg"
  alt="Luxury hotel lobby in Mayfair, London"
  width={1200}
  height={630}
  priority={true}
  sizes="100vw"
/>

// CORRECT: Below-fold content image
<Image
  src="/images/restaurant.jpg"
  alt="Halal fine dining at The Connaught, Mayfair"
  width={800}
  height={450}
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

### 8.3 Script Loading

| Script | Loading Strategy | Reason |
|--------|-----------------|--------|
| Google Analytics (GA4) | `afterInteractive` (Next.js Script) | Non-blocking, analytics not critical for render |
| Google Tag Manager | `afterInteractive` | Same as GA4 |
| Affiliate tracking pixels | `lazyOnload` | Lowest priority, only needed for conversion tracking |
| Third-party embeds | `lazyOnload` or dynamic import | Load only when visible |
| First-party JS | Bundled by Next.js | Tree-shaken and code-split |

**Forbidden:**
- No `<script>` tags in `<head>` without `async` or `defer`
- No render-blocking third-party scripts
- No synchronous loading of analytics

### 8.4 Font Loading

| Rule | Implementation |
|------|---------------|
| Preconnect to Google Fonts | `<link rel="preconnect" href="https://fonts.googleapis.com">` |
| Preconnect crossorigin | `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` |
| Font display | `font-display: swap` (prevents FOIT) |
| English font | System font stack or optimized web font |
| Arabic font | IBM Plex Sans Arabic (preloaded for AR pages) |
| Font subsetting | Use `&display=swap&subset=arabic` for Arabic pages |
| Font preload | Preload critical font files for above-fold text |

### 8.5 Layout Stability (CLS Prevention)

| Source of CLS | Prevention Method |
|---------------|-------------------|
| Images without dimensions | Always set `width` and `height` on `<Image>` |
| Dynamic content insertion | Reserve space with CSS `min-height` |
| Web font loading | Use `font-display: swap` + preload |
| Ads / embeds | Reserve fixed-dimension containers |
| Navigation changes | Fixed header height |
| Cookie banners | Overlay pattern (not layout-shifting) |

### 8.6 Mobile-Specific Requirements

Since July 5, 2024, Google uses mobile-first indexing for 100% of sites. Mobile is the primary rendering context.

| Element | Mobile Rule | Breakpoint |
|---------|-----------|------------|
| Breadcrumbs | Truncate with ellipsis or horizontal scroll | < 768px |
| Table of Contents | Collapsible/accordion | < 768px |
| Navigation | Hamburger menu | < 1024px |
| Tables | Horizontal scroll wrapper | < 768px |
| Images | 100vw on mobile | < 768px |
| Affiliate CTAs | Full-width tap targets (min 48x48px) | < 768px |
| Font size | Min 16px body text | All mobile |
| Tap targets | Min 48x48px, 8px spacing | All mobile |
| Viewport | `<meta name="viewport" content="width=device-width, initial-scale=1">` | All |

### 8.7 Caching Strategy

| Resource Type | Cache-Control | CDN Cache |
|--------------|---------------|-----------|
| Static pages (SSG) | `s-maxage=3600, stale-while-revalidate=86400` | 1 hour |
| Dynamic pages (SSR) | `s-maxage=60, stale-while-revalidate=300` | 1 minute |
| API responses | `no-store` or `s-maxage=60` | Varies |
| Static assets (JS/CSS) | `public, max-age=31536000, immutable` | 1 year |
| Images (optimized) | `public, max-age=2592000` | 30 days |
| Sitemap | `s-maxage=3600` | 1 hour |
| robots.txt | `s-maxage=86400` | 24 hours |

### 8.8 Vercel Pro Timeout Budget

All server-side operations run on Vercel Pro with a 60-second function timeout:

| Operation | Budget | Buffer | Implementation |
|-----------|--------|--------|---------------|
| Cron jobs | 53s | 7s | `BUDGET_MS = 53000` constant, checked before each expensive operation |
| SSR pages | 10s | N/A | Pages should render in < 5s; 10s absolute max |
| API routes | 10s | N/A | Database queries + response; timeout at 10s |
| ISR revalidation | 10s | N/A | Background regeneration |

---

## Appendix A: Site Domain Registry

| Site ID | Site Name | Domain | Canonical Base URL |
|---------|-----------|--------|--------------------|
| yalla-london | Yalla London | yalla-london.com | `https://www.yalla-london.com` |
| arabaldives | Arabaldives | arabaldives.com | `https://www.arabaldives.com` |
| french-riviera | Yalla Riviera | yallariviera.com | `https://www.yallariviera.com` |
| istanbul | Yalla Istanbul | yallaistanbul.com | `https://www.yallaistanbul.com` |
| thailand | Yalla Thailand | yallathailand.com | `https://www.yallathailand.com` |

All utility functions (`getSiteDomain()`, `getBaseUrl()`, `getBaseUrlForSite()`) return URLs in the format `https://www.{domain}`. Never construct URLs manually.

---

## Appendix B: Pre-Publication Gate Checklist

The pre-publication gate (`lib/seo/orchestrator/pre-publication-gate.ts`) runs these 11 checks before any content is published. This appendix maps each check to this spec.

| # | Check | Severity | Spec Reference |
|---|-------|----------|---------------|
| 1 | Route Existence | BLOCKER | Section 1.4 (indexable pages only) |
| 2 | Arabic Routes | BLOCKER | Section 2.1 (hreflang targets must resolve) |
| 3 | Title (EN) >= 10 chars | BLOCKER | Section 3.1 (H1 required) |
| 4 | Meta Title 30-60 chars | WARNING | Section 3.1 (quality threshold table) |
| 5 | Meta Description 70-160 chars | WARNING | Section 3.1 (quality threshold table) |
| 6 | Content Length >= 300 chars | BLOCKER | Section 3.1 (min 800 words) |
| 7 | SEO Score >= 60 | WARNING | Section 3.1 (quality gate score) |
| 8 | Heading Hierarchy (1 H1, no skips, 2+ H2) | WARNING | Section 3.1 (content body rules) |
| 9 | Word Count >= 800 (blocker), >= 1200 (target) | BLOCKER/WARNING | Section 3.1 (word count thresholds) |
| 10 | Internal Links >= 3 | WARNING | Section 4.2 (minimum inbound links) |
| 11 | Readability FK Grade <= 12 | WARNING | Section 7.4 (scannable formatting) |
| 12 | Image Alt Text 100% | WARNING | Section 8.2 (image optimization) |
| 13 | Author Attribution present | WARNING | Section 3.1 (E-E-A-T) |
| 14 | Structured Data / keywords present | WARNING | Section 6 (per-page schema) |

**Gate behavior:** If ANY check with severity BLOCKER fails, the content is NOT published. WARNING checks are logged and visible on the dashboard but do not block publishing.

---

## Appendix C: Deprecated Schema Types

Full registry of schema types that MUST NOT be generated by any code in the platform. Source: `lib/seo/standards.ts`.

| Type | Deprecated Date | Reason | What To Use Instead |
|------|----------------|--------|---------------------|
| FAQPage | August 2023 | Restricted to government/health sites | Semantic Q&A in HTML (H3 + p) |
| HowTo | September 2023 | Fully deprecated | Numbered steps in HTML |
| CourseInfo | June 2025 | Deprecated | Article |
| ClaimReview | June 2025 | Fact Check deprecated | Article |
| EstimatedSalary | June 2025 | Deprecated | N/A (not relevant) |
| LearningVideo | June 2025 | Deprecated | VideoObject |
| SpecialAnnouncement | June 2025 | Deprecated | Article |
| VehicleListing | June 2025 | Deprecated | N/A (not relevant) |
| PracticeProblems | November 2025 | Deprecated | N/A (not relevant) |
| SitelinksSearchBox | October 2024 | Deprecated | WebSite with SearchAction |

The helper function `isSchemaDeprecated(type)` in `lib/seo/standards.ts` checks against this registry. All schema generation code MUST call this function before emitting any schema type.

---

## Appendix D: Measurement & Enforcement

### Automated Enforcement (Currently Active)

| Check | Enforced By | Frequency | Blocking? |
|-------|-------------|-----------|-----------|
| Pre-publication gate (11 checks) | `runPrePublicationGate()` | Every publish attempt | Yes (blockers) |
| Schema type validation | `isSchemaDeprecated()` | Every schema generation | Yes |
| SEO score >= 60 | Phase 7 quality gate in content pipeline | Every draft advancement | Yes |
| Word count >= 800 | Pre-publication gate | Every publish attempt | Yes |
| Internal links >= 3 | Pre-publication gate | Every publish attempt | No (warning) |
| Heading hierarchy | Pre-publication gate | Every publish attempt | No (warning) |

### Automated Enforcement (Required -- Not Yet Active)

| Check | Spec Section | Implementation Needed |
|-------|-------------|----------------------|
| lastModified uses real dates (not currentDate) | 5.1 | Fix `sitemap.ts` static page dates |
| Hreflang bidirectional validation | 2.2 | Automated hreflang audit cron |
| Orphan page detection | 4.1 | Internal crawl simulation cron |
| Anchor text diversity audit | 4.4 | Link graph analysis cron |
| CWV monitoring | 8.1 | CrUX API integration or Lighthouse CI |
| Meta title 50-60 char optimization | 3.1 | Upgrade from WARNING to stronger signal |
| AR content parity check | 2.5 | Audit cron comparing EN/AR article counts |

### Manual Enforcement (Periodic Review)

| Check | Frequency | Responsible |
|-------|-----------|-------------|
| Content quality review (readability, accuracy) | Monthly | Content review |
| Affiliate link validity check | Weekly | Affiliate injection cron |
| Visual mobile rendering audit | Monthly | Manual QA |
| Competitor content gap analysis | Monthly | Research intelligence agent |
| Cross-site network link audit | Quarterly | Manual review |
| Legal page accuracy review | Quarterly | Manual review |

### Key Metrics to Track

| Metric | Source | Target | Dashboard Location |
|--------|--------|--------|-------------------|
| Indexed pages per site | Google Search Console | 20 (30-day), 50 (90-day) | Content Hub > Indexing tab |
| Organic sessions per site | GA4 | 200 (30-day), 1000 (90-day) | Analytics dashboard |
| Average CTR | Google Search Console | 3.0% (30-day), 4.5% (90-day) | SEO dashboard |
| LCP (p75) | CrUX / Lighthouse | <= 2.5s | Performance dashboard |
| INP (p75) | CrUX / Lighthouse | <= 200ms | Performance dashboard |
| CLS (p75) | CrUX / Lighthouse | <= 0.1 | Performance dashboard |
| Content velocity | BlogPost count per day | 2/site/day (30-day), 3/site/day (90-day) | Content Hub |
| Pre-pub gate pass rate | CronJobLog | > 90% | Cron logs |
| Articles with AR translation | BlogPost query | > 80% | Content Hub |
| Orphan pages | Internal crawl audit | 0 | SEO audit |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-19 | Initial comprehensive specification |

---

**This specification is the single source of truth for SEO compliance across all Zenitha Content Network sites. Every content pipeline change, schema update, frontend modification, or infrastructure change that affects public-facing pages MUST be validated against this document.**

**Code-level enforcement lives in:**
- `lib/seo/standards.ts` -- Threshold constants and deprecated type registry
- `lib/seo/orchestrator/pre-publication-gate.ts` -- 11-check gate before publishing
- `lib/seo/schema-generator.ts` -- Structured data generation
- `app/sitemap.ts` -- XML sitemap with hreflang
- `app/robots.ts` -- Crawler access control
- `app/llms.txt/route.ts` -- AI crawler information
- `config/sites.ts` -- Per-site domain, locale, and branding configuration
