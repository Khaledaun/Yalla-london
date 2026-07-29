# Platform Health Audit Plan
> **Created:** 2026-04-04 | **Status:** AWAITING APPROVAL | **Branch:** `claude/platform-health-audit-6jxH8`

---

## Project Inventory (Pre-Audit Scan Results)

### Architecture Summary

| Dimension | Count | Notes |
|-----------|-------|-------|
| **Public pages** | 51 | Blog, hotels, experiences, destinations, itineraries, FAQ, etc. |
| **Admin pages** | 132 | Cockpit, Affiliate HQ, Design Hub, Agent HQ, etc. |
| **API routes** | 488 | Admin, public, webhook, integration endpoints |
| **Cron jobs** | 43 | Scheduled in vercel.json, all with feature flag guards |
| **Prisma models** | 162 | 5,067-line schema |
| **Library files** | 355+ | Under yalla_london/app/lib/ |
| **Custom agents** | 11 | .claude/agents/ |
| **Skills** | 47 | .claude/skills/ |
| **Commands** | 17 | .claude/commands/ |
| **MCP servers** | 3 | Google Analytics/GSC, CJ Affiliate, Platform Control |
| **Hooks** | 3 | SessionStart, PostToolUse (format), Stop |

### Configured Sites (7 total)

| Site | Domain | Status | Locale | Direction |
|------|--------|--------|--------|-----------|
| Yalla London | yalla-london.com | Active (primary) | en | LTR |
| Arabaldives | arabaldives.com | Active | ar | RTL |
| Yalla Riviera | french-riviera.com | Active | en | LTR |
| Yalla Istanbul | yalla-istanbul.com | Active | ar | RTL |
| Yalla Thailand | yalla-thailand.com | Active | ar | RTL |
| Zenitha Yachts | zenitha-yachts.com | Active | en | LTR |
| Zenitha.Luxury | zenitha.luxury | Active | en | LTR |

### External Integrations (22 total)

| # | Service | Category | Status | Env Var(s) |
|---|---------|----------|--------|-----------|
| 1 | Supabase + Prisma | Database | ACTIVE | DATABASE_URL, SUPABASE_* |
| 2 | Vercel (Pro) | Hosting | ACTIVE | VERCEL_* |
| 3 | Resend | Email | ACTIVE | RESEND_API_KEY |
| 4 | SendGrid | Email (fallback) | AVAILABLE | SENDGRID_API_KEY |
| 5 | Stripe | Payments | ACTIVE | STRIPE_SECRET_KEY |
| 6 | GA4 | Analytics | ACTIVE | GA4_MEASUREMENT_ID, GA4_API_SECRET |
| 7 | Google Search Console | SEO | ACTIVE | GSC_* credentials |
| 8 | xAI Grok | AI (primary) | ACTIVE | XAI_API_KEY |
| 9 | Anthropic Claude | AI (secondary) | ACTIVE | ANTHROPIC_API_KEY |
| 10 | OpenAI | AI (fallback) | DEGRADED (quota) | OPENAI_API_KEY |
| 11 | Perplexity | AI (research) | ACTIVE | PERPLEXITY_API_KEY |
| 12 | CJ Affiliate | Monetization | ACTIVE | CJ_API_TOKEN, CJ_PUBLISHER_CID |
| 13 | Travelpayouts | Monetization | ACTIVE | TRAVELPAYOUTS_MARKER |
| 14 | Stay22 | Monetization (auto) | ACTIVE | NEXT_PUBLIC_STAY22_AID |
| 15 | Unsplash | Images | ACTIVE | UNSPLASH_ACCESS_KEY |
| 16 | Ticketmaster | Events | ACTIVE | TICKETMASTER_API_KEY |
| 17 | IndexNow | SEO (3 engines) | ACTIVE | INDEXNOW_KEY |
| 18 | Frankfurter | Currency | ACTIVE | None (free) |
| 19 | Open-Meteo | Weather | ACTIVE | None (free) |
| 20 | Sentry | Error tracking | ACTIVE | SENTRY_DSN |
| 21 | Gemini | AI | STALE (frozen) | GEMINI_API_KEY |
| 22 | Mercury | Banking | STALE (stub) | MERCURY_API_KEY |

### Content Pipeline (8-Phase)
```
research → outline → drafting → assembly → images → seo → scoring → reservoir
    ↓                                                                    ↓
 Topics                                                          content-selector
    ↑                                                                    ↓
weekly-topics                                                    BlogPost (published)
                                                                         ↓
                                                                 seo-agent (IndexNow)
```

### Key Config Files
- `CLAUDE.md` — 3,800+ lines of project instructions and 238 critical rules
- `DESIGN.md` — 9-section design system (Google Stitch format)
- `config/sites.ts` — 30K+ lines, all 7 site configurations
- `config/entity.ts` — Zenitha.Luxury LLC legal entity
- `lib/content-pipeline/constants.ts` — Single source of truth for pipeline
- `lib/seo/standards.ts` — SEO compliance thresholds (v2026-03-10)
- `vercel.json` — 43 crons, function configs, rewrites

---

## Audit Plan: 10 Phases

### Phase 1: Multi-Language Content Alignment
**What it means:** Every page should exist in both EN and AR with correct hreflang tags, proper RTL implementation, and culturally adapted (not mechanically translated) content.

**Why it matters:** Google penalizes hreflang mismatches. Arabic readers bounce from poor RTL. Missing AR versions mean 50% of the target audience (Gulf HNW travelers) sees incomplete content. Jan 2026 Authenticity Update makes cultural depth a ranking signal.

**Healthy vs Broken:**
- **Healthy:** Every EN page has an AR mirror with `hreflang="ar-SA"`, `dir="rtl"`, Arabic-native content, and bilingual meta/schema. Sitemap includes both variants.
- **Broken:** AR pages are English with Google Translate, missing RTL, no hreflang reciprocity, EN-only meta tags, AR pages missing from sitemap.

**Benchmarks:** Google's hreflang specification (reciprocal, x-default required), WCAG 2.1 SC 1.3.2 (meaningful sequence for RTL), W3C i18n best practices.

**What I'll check:**
- Glob all page.tsx files, map EN vs AR route existence
- Grep for `hreflang` in all layout.tsx and page.tsx files
- Grep for `dir="rtl"`, Noto Sans Arabic, logical CSS properties
- Check middleware.ts for `/ar/` routing
- Check sitemap.ts for bilingual URL inclusion
- Sample AR blog posts for translation quality signals
- Check meta/OG/schema for bilingual coverage

**Tools:** Glob, Grep, Read, Agent (Explore)

---

### Phase 2: Content Health & Indexing
**What it means:** Every published page should be indexable, substantial, unique, internally linked, and actually appearing in Google's index.

**Why it matters:** Thin content triggers Google's Helpful Content system demotion (site-wide). Orphaned pages waste crawl budget. Stale seasonal content harms topical authority. This is the direct pipeline from content to revenue.

**Healthy vs Broken:**
- **Healthy:** All published pages >500 words, <5% thin content, all pages in sitemap, all important pages indexed, internal linking mesh >3 links/page, canonical tags on every page.
- **Broken:** 20%+ thin pages, stale 2025 seasonal content, orphaned articles with 0 inbound links, pages in sitemap returning 404, noindex on important pages, high crawl error rate.

**Benchmarks:** Google Search Quality Evaluator Guidelines (E-E-A-T), Helpful Content System requirements, Core Web Vitals thresholds.

**What I'll check:**
- Query BlogPost table for word counts, published dates, SEO scores
- Check sitemap.ts output vs actual published routes
- Grep for `noindex` in page metadata
- Check robots.ts for blocked paths
- Analyze internal linking via content HTML
- Check for duplicate/near-duplicate titles (cannibalization)
- Review content-auto-fix logs for thin content actions

**Tools:** Grep, Read, Agent (Explore), Bash (Prisma queries via scripts)

---

### Phase 3: Affiliate Management System
**What it means:** Every affiliate link should work, track properly, attribute revenue, and comply with FTC disclosure requirements.

**Why it matters:** Broken affiliate links = $0 revenue from that click. Missing tracking = revenue you can't attribute. Missing disclosure = FTC violation risk. This is the ONLY current revenue mechanism.

**Healthy vs Broken:**
- **Healthy:** All affiliate links resolve to valid merchant pages, SID tracking on every click, affiliate disclosure visible on every monetized page, 80%+ article coverage, CJ + Travelpayouts + Stay22 all active.
- **Broken:** Dead affiliate links (404/redirect loops), missing SID parameters, no disclosure text, affiliate links only in EN not AR, coverage <30%, no click tracking.

**Benchmarks:** FTC Endorsement Guides (16 CFR 255), CJ Publisher best practices, IAB affiliate compliance standards.

**What I'll check:**
- Grep all affiliate URL patterns across published content
- Check CJ sync status and advertiser approvals
- Verify `/api/affiliate/click` tracking endpoint
- Check affiliate disclosure component placement
- Verify affiliate injection cron output
- Check monitor.ts coverage calculations
- Verify affiliate links in AR content
- Review affiliate-hq API responses

**Tools:** Grep, Read, Agent (Explore)

---

### Phase 4: Design & Production Management System
**What it means:** The visual implementation should match DESIGN.md specifications across all pages, components, and breakpoints.

**Why it matters:** Inconsistent design undermines the luxury brand perception. Off-brand colors or typography signal unprofessionalism to HNW visitors. Accessibility failures exclude users and risk legal compliance.

**Healthy vs Broken:**
- **Healthy:** All colors from DESIGN.md palette, correct font stack loaded, consistent component patterns, WCAG AA contrast, responsive at all breakpoints, Clean Light admin system consistent.
- **Broken:** Random hex colors, missing font loads, competing button styles, broken mobile layouts, no focus states, accessibility score <70.

**Benchmarks:** WCAG 2.1 AA, Google Lighthouse (Performance >80, Accessibility >90), DESIGN.md v1.0 specifications.

**What I'll check:**
- Scan all CSS/TSX for hex colors not in DESIGN.md palette
- Verify font imports in layout.tsx
- Check component patterns for consistency
- Grep for hardcoded spacing not on scale
- Check responsive breakpoint usage
- Run brand-guardian agent for compliance check
- Check image optimization (WebP, lazy loading, alt text)

**Tools:** Grep, Read, Agent (brand-guardian), Glob

---

### Phase 5: Content Diversity, Quality & Seasonality
**What it means:** The content portfolio should cover the full luxury London travel journey with seasonal relevance, topic diversity, and audience-appropriate quality.

**Why it matters:** Topic concentration limits organic reach. Missing seasonal content means losing traffic during peak booking windows (Ramadan, summer, Christmas). Funnel gaps mean traffic without conversion.

**Healthy vs Broken:**
- **Healthy:** Content across all funnel stages, seasonal pieces for Ramadan/Eid/summer/Christmas, diverse topics (hotels, dining, shopping, culture, family, wellness), 60-70% general + 30-40% niche mix.
- **Broken:** All content is hotel reviews, no seasonal content, no comparison/booking content, all articles target the same keyword cluster.

**Benchmarks:** HubSpot content audit framework, topic cluster methodology, CLAUDE.md business KPIs (2/site/day velocity).

**What I'll check:**
- Categorize all BlogPost content by topic cluster
- Map content against customer journey stages
- Check for seasonal content (Ramadan, Eid, Christmas, summer)
- Analyze topic diversity distribution
- Check content type mix (guide, listicle, review, comparison)
- Evaluate word count distribution and quality scores
- Identify high-potential content gaps

**Tools:** Read, Grep, Agent (Explore)

---

### Phase 6: Social Media Management System
**What it means:** Social media infrastructure should support content distribution, brand presence, and traffic acquisition.

**Why it matters:** Social signals amplify content reach. Proper OG tags ensure shared content looks professional. Social media is a significant traffic source for luxury travel audiences.

**Healthy vs Broken:**
- **Healthy:** OG tags on every page with correct images/titles, social profiles linked, content calendar active, UTM tracking on social links, social sharing buttons functional.
- **Broken:** Missing or broken OG images, dead social profile links, no content calendar, social embeds returning errors, no UTM tracking.

**What I'll check:**
- Grep for OG meta tags across all page layouts
- Check social profile links in footer/config
- Verify social media API integrations status
- Check content calendar/scheduler infrastructure
- Verify UTM parameter implementation
- Check social proof components for real vs mock data

**Tools:** Grep, Read, Glob

---

### Phase 7: Content Generation Consistency & Resilience
**What it means:** The automated content pipeline should produce consistent, quality content reliably with proper fallbacks when components fail.

**Why it matters:** This is a "launch-and-forget" content engine. If the pipeline breaks silently, content velocity drops to zero and revenue stops growing. Pipeline reliability IS revenue reliability.

**Healthy vs Broken:**
- **Healthy:** Pipeline produces 2-4 articles/day, all pass 16-check pre-pub gate, AI fallback chain works, diagnostic agent catches stuck drafts, CEO Inbox alerts on failures, <10% rejection rate.
- **Broken:** Pipeline stalled for days, 50%+ rejection rate, no alerts on failures, stuck drafts accumulating, quality gate bypassed, no fallback when primary AI provider fails.

**What I'll check:**
- Review pipeline constants and phase configurations
- Check pre-publication gate (16 checks) implementation
- Verify circuit breaker and fallback chain
- Check diagnostic agent and CEO Inbox wiring
- Review content-auto-fix cron coverage
- Verify queue monitor health rules
- Check pipeline resilience patterns (atomic claiming, state machine, optimistic concurrency)

**Tools:** Read, Grep, Agent (Explore)

---

### Phase 8: Dashboard & Website Design Management
**What it means:** Internal dashboards should show accurate real-time data, and the public website should be fast, accessible, and well-structured.

**Why it matters:** Khaled operates from his iPhone. If dashboards show stale/fake data, he can't make decisions. If the public site is slow, users bounce before seeing affiliate links.

**Healthy vs Broken:**
- **Healthy:** Cockpit shows real pipeline/revenue data, all dashboard buttons functional, no mock data, mobile-optimized, public site Lighthouse >80 on all metrics.
- **Broken:** Dashboard showing placeholder data, dead buttons, broken on mobile, public site LCP >4s, missing 404 page, no loading/error states.

**What I'll check:**
- Audit cockpit API for data accuracy
- Check for remaining mock/placeholder data in admin pages
- Verify all dashboard action buttons are wired
- Check public site information architecture
- Verify error/loading/empty states
- Check 404 page existence and branding

**Tools:** Read, Grep, Glob, Agent (Explore)

---

### Phase 9: Public User Experience & Intuitive Design
**What it means:** A first-time visitor should be able to understand the site, find content, and reach an affiliate link with zero friction.

**Why it matters:** Every friction point reduces affiliate click probability. The luxury audience has high expectations for polish. Poor mobile UX on a mobile-first audience = immediate bounce.

**Healthy vs Broken:**
- **Healthy:** Clear value proposition on homepage, intuitive navigation, affiliate CTAs visible and compelling, mobile tap targets >44px, page speed <2.5s LCP, language toggle obvious.
- **Broken:** Confusing homepage, buried affiliate links, tiny tap targets, slow mobile loading, no clear path from content to conversion.

**What I'll check:**
- Simulate EN user journey (homepage → content → affiliate click)
- Simulate AR user journey (verify RTL polish)
- Check mobile UX patterns (tap targets, readability)
- Verify CTA placement and visibility
- Check trust signals (about, contact, privacy, SSL)
- Assess emotional design quality (luxury feel)

**Tools:** Read, Grep, Agent (frontend-optimization-agent)

---

### Phase 10: MCP Orchestration & API Health
**What it means:** Every external service dependency should be connected, healthy, and gracefully degrading when unavailable.

**Why it matters:** A single broken integration can cascade: broken CJ sync → no affiliate links → $0 revenue. Expired API keys → silent failures. No monitoring → issues discovered days later.

**Healthy vs Broken:**
- **Healthy:** All 22 integrations showing ACTIVE, error handling on every external call, monitoring/alerting configured, API keys valid and not near expiration, graceful degradation when services fail.
- **Broken:** Multiple DEGRADED/BROKEN integrations, no error handling (empty catch blocks), no monitoring, expired API keys, hard crash when external service is down.

**What I'll check:**
- Verify all 3 MCP server configurations
- Check env var presence and validity patterns
- Review error handling on external API calls
- Check circuit breaker implementations
- Verify webhook endpoints are configured
- Check rate limiting compliance
- Review integration health endpoints

**Tools:** Read, Bash, Grep, Agent (Explore)

---

## Additional Audit Dimensions (Beyond the 10 Requested)

### A. Security Posture
- Admin auth on all sensitive routes
- CSRF protection in middleware
- XSS sanitization on user input
- Rate limiting on public endpoints
- No credentials in code or logs

### B. Performance & Scalability
- Database query performance (compound indexes)
- Cron job scheduling conflicts
- Connection pool management
- Bundle size and code splitting

### C. Legal & Compliance
- GDPR cookie consent
- Privacy policy accuracy
- Affiliate disclosure compliance
- Data retention policies

### D. Revenue Pipeline Integrity
- End-to-end: content → traffic → affiliate click → commission attribution
- Revenue tracking visibility
- Affiliate partner diversification

These will be noted as cross-cutting concerns throughout the 10 main phases.

---

## Execution Protocol

For each phase:
1. **Research** — Run tools, read files, gather data
2. **Analyze** — Score findings against benchmarks
3. **Report** — Save detailed findings to `reports/audit-{area}-2026-04-04.md`
4. **Update this file** — Add phase score and top findings below

---

## Phase Results (Updated After Execution)

| Phase | Area | Score | Status | Top Finding |
|-------|------|-------|--------|-------------|
| 1 | Multi-Language | 72/100 (B-) | DONE | 1,098+ RTL CSS violations; 4 pages with hreflang mismatch (declare AR, serve EN); Arabic content quality excellent (95/100) |
| 2 | Content Health | 72/100 (B-) | DONE | Sitemap take:500 truncation risk Q3 2026; GEO citability WARNING-only should be BLOCKER; post-publish enhancement dependency |
| 3 | Affiliate Management | 78/100 (B+) | DONE | FTC disclosure missing on category pages; CJ circuit breaker opens silently; Travelpayouts injection not tracked |
| 4 | Design & Production | 66/100 (C+) | DONE | 591 hardcoded hex colors bypass design system; WCAG contrast 48/100; image lazy loading only 4% coverage |
| 5 | Content Diversity | 78/100 (B+) | DONE | Seasonal content 11% vs 40% optimal; 71% guides (should be 40%); funnel imbalance 43% awareness / 17% decision |
| 6 | Social Media | 75/100 (B) | DONE | OG/Twitter 100%; social posting not connected; footer social links hardcoded; engagement tracking returns null |
| 7 | Content Generation | 87/100 (A-) | DONE | 8-phase pipeline excellent; multi-layered recovery; Gemini frozen reduces fallback chain; diagnostic agent 2h delay |
| 8 | Dashboard & Website | 92/100 (A) | DONE | 10-tab cockpit, 3-wave sequential DB, zero mock data; missing root error.tsx and loading.tsx |
| 9 | Public UX | 68/100 (C+) | DONE | **REVISED**: scroll-lock hero blocks touch 3s; both CTAs hidden on mobile; 25+ sub-10px fonts; raw `<img>` CLS; NewsSideBanner no mobile guard |
| 10 | MCP & API Health | 78/100 (B+) | DONE | Resend has no circuit breaker; rate limiting per-instance only; no API key rotation; 19/22 services ACTIVE |
| — | **EXECUTIVE SUMMARY** | **78/100 (B+)** | DONE | See `reports/platform-health-executive-summary-2026-04-04.md` |
