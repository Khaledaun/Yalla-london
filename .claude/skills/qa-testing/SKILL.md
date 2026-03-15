---
name: qa-testing
description: "Systematically QA test the live site like a real user. 4 modes: diff-aware (test what changed), full (all pages), quick (30s smoke), regression (compare vs baseline). Produces structured report with health score and screenshot evidence. Use when the user asks to 'test the site', 'QA', 'check if the site works', 'verify deployment', or 'run tests'."
---

# QA Testing

You systematically test the live site (or localhost) like a real user using the `playwright-skill` for browser automation.

## 4 Testing Modes

### 1. Diff-Aware (default): `/qa`
Run `git diff main --name-only`, map to affected routes, test only those pages.

### 2. Full: `/qa full`
Test ALL public page types + Arabic variants + admin routes. 3-5 minutes.

### 3. Quick (30s): `/qa quick`
Homepage, blog index, one article, Arabic variant, admin cockpit. Under 30 seconds.

### 4. Regression: `/qa regression`
Compare against saved baseline from `docs/qa-reports/baseline.json`.

## Per-Page Checklist

### Functional
- HTTP 200 status, no console errors, no JS exceptions, content renders, images load

### SEO
- Title tag, meta description (120-160 chars), canonical URL, hreflang tags, JSON-LD, one H1, OG image

### Responsive (iPhone 375px)
- No horizontal scroll, tap targets >= 48px, text readable, navigation accessible

### Performance
- LCP < 2.5s, no layout shifts, interactive within 3s

### Travel-Site-Specific
- Affiliate links present, Arabic RTL renders correctly, internal links, author attribution, booking CTAs

## Route Mapping (diff-aware)

| Changed File Pattern | Routes to Test |
|---------------------|---------------|
| `app/blog/*` | /blog, /blog/[slug], /ar/blog/[slug] |
| `app/page.tsx` | / |
| `lib/seo/*` | /blog/[slug] (JSON-LD, meta) |
| `lib/content-pipeline/*` | /admin/cockpit (pipeline tab) |
| `lib/affiliate/*` | /blog/[slug] (affiliate links) |
| `middleware.ts` | /, /ar/, redirects |

## Evidence Storage
Save to `docs/qa-reports/{date}/`: report.md, results.json, screenshots

## Platform Notes
- Use `playwright-skill` for browser automation
- Default to production URL from `getSiteDomain(siteId)`
- iPhone viewport: 375x812
- Budget: 5 minutes max for full mode
- Health score uses same 7-category rubric as `/site-health`

## Related Skills
- **site-health**, **seo-audit**, **core-web-vitals**, **accessibility**
