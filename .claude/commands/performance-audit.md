# Performance Audit

Run a comprehensive frontend performance audit using the Frontend Optimization Agent.

## Steps

1. **Core Web Vitals** — Use `core-web-vitals` to measure LCP, INP, CLS on target pages
2. **Lighthouse** — Use `roier-seo` for full Lighthouse audit (performance, accessibility, best practices, SEO)
3. **Bundle Analysis** — Use `web-performance-optimization` to analyze JS/CSS bundle sizes
4. **Image Audit** — Check all images use Next.js `<Image>`, AVIF/WebP, proper sizing
5. **Caching** — Verify cache headers match `next.config.js` settings (immutable for static, SWR for content)
6. **Font Loading** — Check font-display, preload, and subsetting
7. **Third-party Scripts** — Audit GA4, Sentry, and other scripts for impact
8. **SSR Verification** — Use `playwright-skill` to verify server rendering
9. **Accessibility** — Use `accessibility` for WCAG 2.1 audit
10. **RTL Test** — Verify Arabic pages render correctly in RTL

## Input

$ARGUMENTS — URL, page type, or site to audit (default: homepage of all 5 sites)

## Output

- Performance score (0-100) per page
- Core Web Vitals breakdown with pass/fail
- Bundle size report with largest modules
- Actionable fixes prioritized by impact
- Before/after estimates for each fix
