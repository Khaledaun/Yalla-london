# Full SEO Audit

Run a comprehensive SEO audit across all 5 sites using the SEO Growth Agent pipeline.

## Steps

1. **Technical Audit** — Use `roier-seo` to run Lighthouse/PageSpeed on each site
2. **On-Page SEO** — Use `seo-audit` to check meta tags, headers, canonical, hreflang
3. **Schema Validation** — Use `schema-markup` to verify JSON-LD on all page types
4. **Core Web Vitals** — Use `core-web-vitals` to measure LCP, INP, CLS
5. **Sitemap Health** — Verify all sitemap URLs return 200 (reference `live-site-auditor.ts`)
6. **robots.txt** — Check for conflicts, AI crawler rules
7. **Internal Links** — Verify link graph health and orphan pages
8. **Performance** — Use `web-performance-optimization` to check bundle size and caching
9. **Accessibility** — Use `accessibility` for WCAG 2.1 compliance check
10. **Rendering** — Use `playwright-skill` to verify SSR across sites

## Output

Produce a prioritized report with:
- Health score (0-100) per site
- Critical issues (blocking indexation or ranking)
- Warnings (impacting performance or UX)
- Opportunities (quick wins for traffic growth)
- Action items ranked by impact × effort

## Sites to Audit
$ARGUMENTS (default: all sites — yalla-london, arabaldives, dubai, istanbul, thailand)
