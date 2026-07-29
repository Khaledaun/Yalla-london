# MAX SEO / AIO Specification

> Master audit specification for the Zenitha Content Network.
> All thresholds, gates, and requirements in this document are the single
> source of truth for every audit run, pre-publication gate, and SEO agent
> scoring pass across all 5 sites.

| Field | Value |
|-------|-------|
| Version | 2026-02-20 |
| Status | Active |
| Maintainer | Claude Code (CTO role) |
| Authority Sources | Google Search Essentials, Google Spam Policies, Helpful Content System (absorbed into core ranking March 2024), Core Web Vitals documentation, Structured Data documentation, Search Console documentation |

---

## Table of Contents

1. [Search Essentials Fundamentals](#1-search-essentials-fundamentals)
2. [Spam Policy Alignment](#2-spam-policy-alignment)
3. [AIO (AI Overview) Readiness](#3-aio-ai-overview-readiness)
4. [Hard Gates](#4-hard-gates)
5. [Soft Gates](#5-soft-gates)
6. [Changelog](#6-changelog)

---

## 1. Search Essentials Fundamentals

These are non-negotiable baseline requirements drawn directly from Google Search
Essentials. Every indexable page on every Zenitha site must satisfy all of them.

### 1.1 Crawlability

| Requirement | Detail |
|-------------|--------|
| **robots.txt** | Must be served at `/robots.txt` with a 200 status. Must not block Googlebot from any page intended for indexing. Must reference the XML sitemap (`Sitemap: https://www.<domain>/sitemap.xml`). |
| **Meta robots** | Indexable pages must not carry `noindex`. Pages intentionally excluded (admin, API, checkout) must carry `noindex, nofollow`. No conflicting directives between `robots.txt` and meta robots tags. |
| **Canonical tags** | Every indexable page must include a `<link rel="canonical">` pointing to the preferred URL. Self-referencing canonicals are the default. Cross-domain canonicals are not permitted without explicit justification. Query parameters must not appear in canonical URLs unless they define unique content. |
| **XML Sitemap** | Served at `/sitemap.xml`. Must parse without errors. Must contain only indexable URLs (no `noindex`, no redirects, no 4xx/5xx). Maximum 50,000 URLs per sitemap file. `<lastmod>` recommended but not required. `<changefreq>` and `<priority>` are ignored by Google and optional. |
| **Internal linking** | Every indexable page must be reachable within 3 clicks from the homepage. Orphan pages (no inbound internal links) are flagged as warnings. |

### 1.2 Indexability

| Requirement | Detail |
|-------------|--------|
| **Unique titles** | Every indexable page must have a `<title>` element that is unique across the entire site. Duplicate titles across different URLs are flagged. |
| **Meta descriptions** | Every indexable page should have a unique `<meta name="description">`. While Google may rewrite descriptions, providing one is best practice and aids CTR. |
| **Content quality** | Pages must contain substantive, original content. Thin pages (fewer than 300 words of unique body text, excluding navigation and boilerplate) are flagged. Blog posts and articles must meet the higher word-count thresholds defined in Section 5. |
| **Rendering** | All critical content must be present in the initial HTML response or rendered within the first client-side paint. Content gated behind JavaScript interactions (tabs, accordions, "read more") is crawlable but may receive lower priority. |
| **HTTP status** | Indexable pages must return HTTP 200. Pages that return 3xx, 4xx, or 5xx are excluded from the index and flagged. Soft 404s (200 status with empty or error content) are treated as failures. |

### 1.3 Core Web Vitals

Google uses Core Web Vitals as a ranking signal within the page experience
system. Thresholds are assessed at the 75th percentile of real user data
(CrUX report).

| Metric | Good | Needs Improvement | Poor |
|--------|------|--------------------|------|
| **LCP** (Largest Contentful Paint) | <= 2.5 s | 2.5 - 4.0 s | > 4.0 s |
| **INP** (Interaction to Next Paint) | <= 200 ms | 200 - 500 ms | > 500 ms |
| **CLS** (Cumulative Layout Shift) | <= 0.1 | 0.1 - 0.25 | > 0.25 |

**Notes:**
- INP replaced FID (First Input Delay) as the responsiveness metric in March 2024.
- All Zenitha sites target the "Good" threshold for all three metrics.
- Synthetic testing (Lighthouse) provides lab data. Field data (CrUX) is what
  Google actually uses for ranking. Both should be monitored.

### 1.4 Mobile-First Indexing

Google completed the migration to mobile-first indexing in July 2024. All
crawling and indexing is performed using the mobile Googlebot user agent.

| Requirement | Detail |
|-------------|--------|
| **Responsive design** | All pages must render correctly on mobile viewports (360px minimum). |
| **Content parity** | Mobile and desktop versions must serve identical content. Hidden content on mobile (e.g., collapsed accordions) is crawlable but may receive reduced weighting. |
| **Viewport meta tag** | Every page must include `<meta name="viewport" content="width=device-width, initial-scale=1">`. |
| **Tap targets** | Interactive elements must be at least 48x48 CSS pixels with adequate spacing. |
| **Font size** | Base font size must be at least 16px to avoid "text too small" flags. |

### 1.5 HTTPS

| Requirement | Detail |
|-------------|--------|
| **TLS certificate** | All sites must be served over HTTPS with a valid, non-expired TLS certificate. |
| **HTTP redirect** | All HTTP requests must 301-redirect to HTTPS. |
| **Mixed content** | No HTTP resources (images, scripts, stylesheets, iframes) may be loaded on HTTPS pages. |
| **HSTS header** | `Strict-Transport-Security` header recommended with `max-age` of at least 31536000 (1 year). |

### 1.6 Structured Data

| Requirement | Detail |
|-------------|--------|
| **Format** | JSON-LD is the only supported format. Microdata and RDFa are not used. |
| **Validation** | Every JSON-LD block must parse as valid JSON and validate against the Schema.org vocabulary. Google Rich Results Test must show no errors. |
| **Required types** | See the `requiredTypes` mapping in the site-specific audit config for per-route requirements. At minimum: `Organization` + `WebSite` on the homepage, `Article` on blog posts. |
| **Deprecated types** | The following schema types must NOT be used. Google no longer generates rich results for them, and their presence may cause validation warnings: |

**Deprecated Schema Types (do not use):**

| Type | Deprecation Date | Reason |
|------|-----------------|--------|
| FAQPage | August 2023 | Restricted to government and health sites |
| HowTo | September 2023 | Rich results discontinued |
| CourseInfo | Deprecated | No longer generates rich results |
| ClaimReview | Deprecated | Restricted eligibility |
| EstimatedSalary | Deprecated | No longer generates rich results |
| LearningVideo | Deprecated | No longer generates rich results |
| SpecialAnnouncement | Deprecated | COVID-era, discontinued |
| VehicleListing | June 2025 | No longer generates rich results |
| PracticeProblems | November 2025 | No longer generates rich results |
| SitelinksSearchBox | October 2024 | Google ignores, may cause warnings |

---

## 2. Spam Policy Alignment

Google's spam policies define content patterns that can result in ranking
demotion or manual actions. These scanners detect patterns that correlate
with spam policy violations so they can be corrected before they cause harm.

### 2.1 Scaled Content Abuse

Google's scaled content abuse policy targets content produced at scale
(whether by AI, humans, or automation) that exists primarily to manipulate
search rankings rather than help users. The policy focuses on the quality
and purpose of content, not the production method.

**Detection heuristics:**

| Signal | Threshold | Action |
|--------|-----------|--------|
| **Near-duplicate clustering** | Two or more pages with cosine similarity >= 0.85 (after removing shared templates/navigation) | Flag for review. Pages may need consolidation, differentiation, or canonicalization. |
| **Thin content** | Body text fewer than 300 words (excluding navigation, footer, sidebar boilerplate) | Flag as thin. Blog posts and articles have a higher threshold (1,000 words) per Section 5. |
| **Low unique sections** | Fewer than 2 sections of content unique to the page (not shared with any other page on the site) | Flag for review. Indicates templatized content with insufficient differentiation. |
| **Entity coverage** | Page targets a named entity (hotel, restaurant, neighborhood) but contains no specific factual claims about it (address, price range, hours, distinguishing features) | Flag as potentially low-value. |
| **Boilerplate ratio** | More than 60% of page content is shared with 5+ other pages on the same site | Flag for review. High boilerplate ratios are correlated with scaled content patterns. |

**What this is NOT:**
- This scanner does not flag AI-generated content per se. Google's policy is
  about quality and purpose, not production method.
- This scanner does not flag pages that are intentionally similar by design
  (e.g., product category pages with different filters). Use exclusion patterns
  in the audit config to skip such pages.

### 2.2 Site Reputation Abuse

Google's site reputation abuse policy targets third-party content hosted on a
site primarily to exploit the host site's ranking signals, produced with
little or no host site editorial oversight.

**Detection heuristics:**

| Signal | Threshold | Action |
|--------|-----------|--------|
| **Unrelated topic detection** | Page topic has no semantic overlap with the site's primary topic cluster (luxury travel) | Flag for review. Could indicate third-party or sponsored content that lacks editorial integration. |
| **Missing editorial ownership** | Page lacks `author` attribution AND `datePublished` structured data | Flag. All content must demonstrate editorial oversight with clear authorship and publication dates. |
| **Outbound link dominance** | More than 60% of links on a page point to external domains (excluding social media profiles and citation links) | Flag for review. High outbound ratios with commercial intent may indicate affiliate-only content. |
| **Sponsored content labeling** | Sponsored or paid content must be clearly labeled and use `rel="sponsored"` on paid links | Check that any sponsored content is properly disclosed. |

**Applicability to Zenitha:**
- All Zenitha content is produced in-house (AI-assisted with editorial
  oversight). Site reputation abuse risk is low.
- Affiliate links are the primary monetization model. The scanner ensures
  affiliate content maintains a strong editorial-to-commercial ratio.

### 2.3 Expired Domain Abuse

Google's expired domain abuse policy targets the practice of purchasing
expired domains and repurposing them primarily to manipulate search rankings
by exploiting the previous domain's reputation.

**Detection heuristics:**

| Signal | Threshold | Action |
|--------|-----------|--------|
| **Topic pivot detection** | Current site topic has no overlap with the domain's historical topic (checked via Wayback Machine or WHOIS history) | Flag for review. |
| **Legacy orphan patterns** | Inbound links reference content topics that no longer exist on the site, and no redirects are in place | Flag. Orphaned backlink equity should be redirected or the content gap filled. |
| **Domain age vs. content age** | Domain registered 5+ years ago but all content is less than 6 months old | Flag for review. |

**Applicability to Zenitha:**
- All 5 Zenitha domains are newly registered for their stated purpose.
- This scanner is **disabled by default** and should only be enabled if
  the network acquires existing domains in the future.

---

## 3. AIO (AI Overview) Readiness

Google AI Overviews (launched May 2024, now serving over 1.5 billion users
globally) generate synthesized answers from web content. Content that is
clearly structured, demonstrates expertise, and provides direct answers is
more likely to be cited in AI Overviews.

### 3.1 Answer-First Content Blocks

| Requirement | Detail |
|-------------|--------|
| **Lead with the answer** | The first 2-3 sentences after the H1 should directly answer the page's primary query. Background and context come after. |
| **Concise summary** | Include a "Key Takeaways" or summary section (preferably near the top or end) with 3-5 bullet points that encapsulate the page's main value. |
| **Question-based headings** | Where natural, use H2 headings phrased as questions that match likely search queries (e.g., "What are the best halal restaurants in Mayfair?" rather than "Mayfair Dining"). |
| **Definition patterns** | When introducing a concept, use the pattern: "[Entity] is [definition]. [Elaboration]." This matches the extraction pattern AI Overviews use for definitional queries. |

### 3.2 Entity Clarity and Knowledge Graph Alignment

| Requirement | Detail |
|-------------|--------|
| **Named entity specificity** | Reference specific, verifiable entities (hotel names, restaurant names, neighborhood names, landmark names) rather than generic descriptions. |
| **Consistent naming** | Use the same entity name consistently throughout the article. Don't alternate between "The Ritz London," "Ritz Hotel," and "the Ritz" without establishing the full name first. |
| **Structured data alignment** | JSON-LD entity names must match the names used in body content. |
| **Disambiguation** | When an entity name is ambiguous (e.g., "The Ivy" could refer to multiple restaurants), provide disambiguating context (location, type) on first reference. |

### 3.3 Modular Structure for Extraction

| Requirement | Detail |
|-------------|--------|
| **Self-contained sections** | Each H2 section should be comprehensible on its own, without requiring the reader to have read previous sections. AI Overviews may extract individual sections. |
| **Lists and tables** | Use HTML lists (`<ul>`, `<ol>`) and tables (`<table>`) for structured information. These are preferred extraction targets for AI Overviews. |
| **Comparison format** | For comparison content, use consistent criteria across all compared items. Tables or structured lists are preferred over prose. |
| **Step-by-step format** | For procedural content, use numbered lists with clear action verbs at the start of each step. |

### 3.4 Cited Expertise Signals (E-E-A-T)

Google's quality rater guidelines define E-E-A-T as Experience, Expertise,
Authoritativeness, and Trustworthiness. While E-E-A-T is not a direct ranking
factor, it describes the qualities that Google's ranking systems are designed
to reward.

| Signal | Implementation |
|--------|---------------|
| **Experience** | Content should demonstrate genuine first-hand experience with the topic. For travel content: specific sensory details, practical tips that come from visiting, honest assessments including drawbacks, references to specific visits or stays. |
| **Expertise** | Content should demonstrate subject-matter knowledge beyond surface-level information. For travel content: historical context, cultural nuances, seasonal considerations, practical logistics that a non-expert wouldn't know. |
| **Authoritativeness** | The site and author should be recognized sources on the topic. Implementation: author bylines with bios, consistent topical focus (luxury travel), internal linking that demonstrates topical depth, cited sources for factual claims. |
| **Trustworthiness** | Content should be accurate, transparent, and honest. Implementation: clear affiliate disclosures, accurate factual claims, honest assessments (not everything is "the best"), publication and update dates, contact information, privacy policy. |

**First-hand experience markers (for content generation):**

These are concrete textual signals that indicate genuine experience rather
than repackaged information:

- Sensory details ("the lobby smells of oud and fresh roses")
- Specific practical tips ("ask for a room above the 5th floor for the best view")
- Personal observations ("the pool area gets crowded after 11am")
- Honest limitations ("the spa is excellent but overpriced for what you get")
- Temporal references ("when I visited in November, the terrace was closed")
- Insider knowledge ("the secret menu item is the Arabic coffee martini")
- Comparisons from experience ("unlike the Four Seasons, the Dorchester allows early check-in without a fee")

**Anti-patterns to avoid (signals of low-quality generated content):**

These phrases are commonly produced by language models and signal a lack of
genuine experience. Their presence in content should be minimized:

- "In conclusion" / "In summary" (formulaic essay structure)
- "It's worth noting" / "It's important to mention" (filler)
- "Whether you're a [X] or [Y]" (generic audience-covering)
- "Nestled in the heart of" (cliche)
- "Look no further" / "Without further ado" (clickbait filler)
- "In this comprehensive guide" (self-referential padding)
- "A hidden gem" (overused, non-specific)
- "Something for everyone" (non-committal)

### 3.5 Content That Demonstrates Genuine Value

| Requirement | Detail |
|-------------|--------|
| **Information gain** | Each page should contain at least one piece of information that a searcher is unlikely to find on competing pages. This could be a personal insight, a specific recommendation, a unique comparison, or original data. |
| **Topical depth** | Content clusters (groups of interlinked articles on related subtopics) signal topical authority. Prefer depth on fewer topics over breadth across many. |
| **Updated information** | Content should reflect current information. Prices, hours, availability, and seasonal details should be accurate. Include `dateModified` in structured data when content is updated. |
| **User intent alignment** | Content must match the dominant search intent for its target query. Informational queries need comprehensive answers. Transactional queries need clear CTAs and booking options. Navigational queries need direct paths. |

---

## 4. Hard Gates

Hard gates are pass/fail checks. If any hard gate fails, the audit run
reports a **FAIL** status. Hard gate failures indicate issues that can
directly cause indexing problems, search console errors, or spam policy
violations.

**A page, section, or site cannot pass the master audit if any hard gate
reports a non-zero count (or `true` for boolean gates).**

| # | Gate | Threshold | Scope | Rationale |
|---|------|-----------|-------|-----------|
| HG-01 | Broken internal links on indexable pages | 0 | Site-wide | Broken links waste crawl budget, create poor UX, and signal neglect to quality raters. |
| HG-02 | Indexable pages returning non-200 status | 0 | Site-wide | Pages in the sitemap or with inbound internal links must return 200. Any other status means content is inaccessible. |
| HG-03 | Missing canonical on indexable pages | 0 | Per-page | Missing canonicals risk duplicate content issues and diluted ranking signals. |
| HG-04 | Malformed JSON-LD on indexable pages | 0 | Per-page | Invalid structured data generates Search Console errors and prevents rich results. JSON must parse, and types must be valid Schema.org vocabulary. |
| HG-05 | Hreflang reciprocity failures | 0 | Per-page pair | If page A declares `hreflang="ar-SA"` pointing to page B, then page B must declare `hreflang="en-GB"` pointing back to page A. Unreciprocated hreflang is ignored by Google. Explicit exceptions (e.g., pages that exist in only one language) can be listed in the audit config. |
| HG-06 | Sitemap parse failure | false | Site-wide | The XML sitemap must parse without errors. A malformed sitemap prevents Google from discovering pages. |
| HG-07 | Non-indexable URLs in sitemap | 0 | Site-wide | The sitemap must contain only indexable URLs. Pages with `noindex`, pages that redirect, and pages returning 4xx/5xx must not appear in the sitemap. |

**Hard gate evaluation order:** Gates are evaluated in the order listed.
The audit report includes all gate results regardless of earlier failures,
so that a single run surfaces all issues.

---

## 5. Soft Gates

Soft gates are advisory checks. Failures are logged and reported but do not
cause the overall audit to fail. Soft gate violations are opportunities for
improvement and should be addressed in priority order during content
optimization passes.

| # | Gate | Threshold | Scope | Severity | Rationale |
|---|------|-----------|-------|----------|-----------|
| SG-01 | Title length | 30-60 characters | Per-page | Warning | Titles shorter than 30 chars underutilize SERP real estate. Titles longer than 60 chars may be truncated. |
| SG-02 | Meta description length | 120-160 characters | Per-page | Warning | Descriptions shorter than 120 chars miss CTR opportunities. Descriptions longer than 160 chars are truncated on mobile. |
| SG-03 | H1 count | Exactly 1 | Per-page | Warning | Multiple H1s dilute the page's primary topic signal. Zero H1s means no clear topic declaration. |
| SG-04 | H2 count | >= 2 | Per-page | Warning | Fewer than 2 H2s suggests insufficient content structure for both users and AI extraction. |
| SG-05 | Heading hierarchy | No skipped levels | Per-page | Warning | Jumping from H1 to H3 (skipping H2) creates accessibility issues and may confuse content parsers. |
| SG-06 | Word count | >= 1,000 words | Per blog post | Warning | Blog posts and articles under 1,000 words are unlikely to demonstrate sufficient topical depth. Target is 1,500-2,000 words. Non-article pages (homepage, category pages) are excluded. |
| SG-07 | Internal links | >= 3 per page | Per blog post | Warning | Fewer than 3 internal links misses opportunities for topical clustering and crawl path distribution. Links should be contextually relevant, not footer/sidebar boilerplate. |
| SG-08 | Structured data present | At least 1 JSON-LD block | Per-page | Warning | Pages without structured data cannot generate rich results. See the site audit config for per-route type requirements. |
| SG-09 | Structured data valid | Passes Google Rich Results Test | Per JSON-LD block | Warning | Structured data with errors (missing required fields, wrong types) may be ignored by Google. |
| SG-10 | Image alt text | All `<img>` elements have non-empty `alt` attributes | Per-page | Warning | Missing alt text is an accessibility violation (WCAG 2.1 Level A) and a missed SEO signal. Decorative images should use `alt=""`. |
| SG-11 | Author attribution | Author name present in content or structured data | Per blog post | Warning | Author attribution is a key E-E-A-T signal. Anonymous content receives lower quality ratings. |
| SG-12 | Affiliate link presence | >= 1 affiliate or booking link | Per blog post | Advisory | Blog posts without affiliate links miss monetization opportunities. This is a business requirement, not an SEO requirement. |
| SG-13 | Readability | Flesch-Kincaid grade level <= 12 | Per blog post | Advisory | Content above grade 12 readability may be too dense for general audiences. Travel content should aim for grade 8-10. |
| SG-14 | First-hand experience signals | >= 3 experience markers per blog post | Per blog post | Advisory | Content without experience markers may be assessed as lacking first-hand knowledge. See Section 3.4 for marker definitions. |
| SG-15 | Generic phrase density | <= 2 generic/filler phrases per blog post | Per blog post | Advisory | High density of generic phrases signals low editorial quality. See Section 3.4 for the anti-pattern list. |

**Soft gate severity levels:**
- **Warning**: Should be fixed. Frequent violations indicate systemic content quality issues.
- **Advisory**: Nice to have. Monitored for trends but individual violations are acceptable.

---

## 6. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2026-02-20 | 2026-02-20 | Initial specification. Covers Search Essentials fundamentals, spam policy alignment (scaled content, site reputation, expired domain), AIO readiness (answer-first blocks, entity clarity, modular structure, E-E-A-T signals), 7 hard gates, 15 soft gates. Based on Google Search Essentials, Spam Policies (updated March 2024), Helpful Content System (absorbed into core March 2024), Core Web Vitals (INP replaced FID March 2024), mobile-first indexing (complete July 2024), structured data deprecation timeline through November 2025. |

### Sources Referenced

- [Google Search Essentials](https://developers.google.com/search/docs/essentials) (crawling, indexing, ranking fundamentals)
- [Google Spam Policies](https://developers.google.com/search/docs/essentials/spam-policies) (scaled content abuse, site reputation abuse, expired domain abuse)
- [Google Search Quality Rater Guidelines](https://static.googleusercontent.com/media/guidelines.raterhub.com/en//searchqualityevaluatorguidelines.pdf) (E-E-A-T framework)
- [Core Web Vitals documentation](https://web.dev/articles/vitals) (LCP, INP, CLS thresholds)
- [Structured Data documentation](https://developers.google.com/search/docs/appearance/structured-data) (required/deprecated types)
- [Google Search Central Blog](https://developers.google.com/search/blog) (algorithm update announcements)
- [AI Overviews documentation](https://developers.google.com/search/docs/appearance/ai-overviews) (citation eligibility)
