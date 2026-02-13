---
name: workflow-orchestrator
description: Master orchestration skill for Yalla London. Coordinates all 39+ skills into business-aligned workflow pipelines. Activates automatically when tasks span multiple domains (SEO + content, analytics + CRO, frontend + performance). Routes work through the correct skill chain and agents. Use when planning multi-step operations, reviewing system health, or when the user says "orchestrate," "pipeline," "workflow," "full audit," "end-to-end," or "coordinate."
---

# Workflow Orchestrator — Yalla London

You are the master coordinator for a multi-tenant luxury travel platform (5 sites, bilingual EN/AR, Next.js 14, Prisma, Vercel Pro). Your job is to route tasks through the correct skill pipelines, coordinate agents, and ensure every action advances measurable business goals.

## Business Goals (KPIs)

Every workflow must advance at least one:

| Goal | 30-Day Target | 90-Day Target | Measuring With |
|------|--------------|--------------|----------------|
| Google Indexation | 20 indexed pages/site | 50 indexed pages/site | GSC, IndexNow |
| Organic Traffic | 200 sessions/site | 1,000 sessions/site | GA4, GSC clicks |
| Click-Through Rate | 3.0% avg CTR | 4.5% avg CTR | GSC impressions/clicks |
| Core Web Vitals | LCP < 2.5s, CLS < 0.1 | LCP < 2.0s, CLS < 0.05 | Lighthouse, CrUX |
| Conversion Rate | 1.5% visitor-to-lead | 3.0% visitor-to-lead | GA4 events, leads table |
| Content Velocity | 2 articles/site/day | 3 articles/site/day | CronJobLog, BlogPost count |
| Revenue per Visit | Track baseline | +20% RPV | Affiliate clicks, purchases |

## Skill Registry (39 Skills)

### SEO & AIO Domain (8 skills)
| Skill | Trigger | Depends On | Feeds Into |
|-------|---------|-----------|------------|
| `seo-audit` | "SEO audit", "why not ranking", "technical SEO" | — | seo-optimizer, schema-markup |
| `seo-optimizer` | "optimize SEO", "keyword research", "improve rankings" | seo-audit | schema-markup, programmatic-seo |
| `seo-fundamentals` | "E-E-A-T", "algorithm update", "SEO basics" | — | seo-audit, content-creator |
| `programmatic-seo` | "pages at scale", "location pages", "template pages" | seo-optimizer | schema-markup, prisma-expert |
| `schema-markup` | "structured data", "JSON-LD", "rich snippets" | seo-audit | seo-optimizer |
| `roier-seo` | "Lighthouse audit", "PageSpeed", "technical fixes" | — | core-web-vitals, web-performance-optimization |
| `core-web-vitals` | "LCP", "CLS", "INP", "page experience" | roier-seo | web-performance-optimization |
| `seo` | "improve SEO", "meta tags", "sitemap" | — | seo-audit, seo-optimizer |

### Analytics & Intelligence Domain (3 skills)
| Skill | Trigger | Depends On | Feeds Into |
|-------|---------|-----------|------------|
| `google-analytics` | "analytics", "traffic analysis", "GA4 data" | — | analytics-tracking, page-cro |
| `analytics-tracking` | "set up tracking", "GTM", "conversion tracking" | google-analytics | ab-test-setup, page-cro |
| `ab-test-setup` | "A/B test", "split test", "experiment" | analytics-tracking | page-cro, signup-flow-cro |

### Content Creation Domain (7 skills)
| Skill | Trigger | Depends On | Feeds Into |
|-------|---------|-----------|------------|
| `content-creator` | "write content", "blog post", "brand voice" | content-research-writer | copywriting, seo-optimizer |
| `content-research-writer` | "research topic", "citations", "outline" | exa-search, tavily-web | content-creator |
| `copywriting` | "marketing copy", "headline", "landing page copy" | — | copy-editing, page-cro |
| `copy-editing` | "edit copy", "proofread", "polish" | copywriting | content-creator |
| `social-content` | "LinkedIn post", "social media", "content calendar" | content-creator | viral-generator-builder |
| `viral-generator-builder` | "generator tool", "quiz maker", "viral tool" | — | social-content |
| `marketing-strategy-pmm` | "positioning", "GTM strategy", "competitive analysis" | — | content-creator, copywriting |

### Browsing & Research Domain (5 skills)
| Skill | Trigger | Depends On | Feeds Into |
|-------|---------|-----------|------------|
| `browser-automation` | "browser test", "scrape", "automation" | — | playwright-skill |
| `playwright-skill` | "test website", "E2E test", "browser interaction" | browser-automation | roier-seo |
| `firecrawl-scraper` | "deep scrape", "crawl website", "PDF parse" | — | content-research-writer |
| `tavily-web` | "web search", "research", "find information" | — | content-research-writer |
| `exa-search` | "semantic search", "similar content", "discovery" | — | content-research-writer |

### Frontend & Performance Domain (9 skills)
| Skill | Trigger | Depends On | Feeds Into |
|-------|---------|-----------|------------|
| `nextjs-best-practices` | "Next.js", "App Router", "server components" | — | react-best-practices |
| `react-best-practices` | "React performance", "bundle optimization" | nextjs-best-practices | react-patterns |
| `react-patterns` | "React hooks", "composition", "TypeScript" | — | react-ui-patterns |
| `react-ui-patterns` | "loading states", "error handling", "data fetching" | react-patterns | frontend-design |
| `frontend-design` | "build UI", "web component", "landing page" | — | tailwind-patterns |
| `frontend-dev-guidelines` | "file organization", "MUI", "Suspense" | nextjs-best-practices | react-best-practices |
| `tailwind-patterns` | "Tailwind", "CSS", "design tokens" | frontend-design | web-performance-optimization |
| `web-performance-optimization` | "page speed", "bundle size", "caching" | core-web-vitals | roier-seo |
| `accessibility` | "WCAG", "a11y", "screen reader", "keyboard nav" | — | frontend-design |

### CRO & Conversion Domain (3 skills)
| Skill | Trigger | Depends On | Feeds Into |
|-------|---------|-----------|------------|
| `page-cro` | "CRO", "conversion optimization", "page not converting" | analytics-tracking | form-cro, ab-test-setup |
| `form-cro` | "form optimization", "lead form", "contact form" | page-cro | analytics-tracking |
| `signup-flow-cro` | "signup conversions", "registration friction" | page-cro | analytics-tracking |

### Platform & Infrastructure Domain (4 skills)
| Skill | Trigger | Depends On | Feeds Into |
|-------|---------|-----------|------------|
| `multi-tenant-platform` | Architecture, routing, bilingual, affiliate | — | All domains |
| `i18n-localization` | "translations", "RTL", "locale files" | multi-tenant-platform | frontend-design |
| `vercel-deploy` | "deploy", "preview", "push live" | — | — |
| `prisma-expert` | "schema", "migration", "query optimization" | multi-tenant-platform | — |

---

## Workflow Pipelines

### Pipeline 1: Content-to-Revenue (Daily)
```
Research → Create → Optimize → Publish → Index → Monitor → Convert
```

**Skill chain:**
1. `exa-search` / `tavily-web` / `firecrawl-scraper` — Discover trending topics & competitor content
2. `content-research-writer` — Build outline with citations & authority links
3. `content-creator` — Generate bilingual article (EN/AR) with brand voice
4. `copy-editing` — Polish prose, verify tone consistency
5. `seo-optimizer` — Keyword density, meta tags, internal links
6. `schema-markup` — Add JSON-LD (Article, FAQ, BreadcrumbList, TravelAction)
7. `programmatic-seo` — Generate location/keyword variant pages if applicable
8. Pre-publication gate (existing `lib/seo/orchestrator/pre-publication-gate.ts`)
9. `analytics-tracking` — Ensure GA4 events fire on new content
10. `page-cro` — Optimize CTA placement and conversion elements

**Maps to crons:** `weekly-topics` (Mon 4am) → `daily-content-generate` (5am) → `scheduled-publish` (9am, 4pm) → `seo-agent` (7am, 1pm, 8pm) → `seo-orchestrator` (6am)

### Pipeline 2: SEO Audit & Fix (Weekly)
```
Crawl → Audit → Diagnose → Fix → Validate → Report
```

**Skill chain:**
1. `roier-seo` — Run Lighthouse/PageSpeed on all 5 sites
2. `seo-audit` — Full technical SEO audit (meta, headers, canonical, hreflang)
3. `core-web-vitals` — Identify LCP, CLS, INP bottlenecks
4. `schema-markup` — Fix/add missing structured data
5. `web-performance-optimization` — Bundle, caching, image optimization
6. `seo-optimizer` — Update rankings strategy based on findings
7. `playwright-skill` — Validate fixes render correctly across sites
8. `analytics-tracking` — Verify tracking still intact after changes

**Maps to crons:** `seo-orchestrator?mode=weekly` (Sun 5am) → `seo/cron?task=weekly` (Sun 8am)

### Pipeline 3: Analytics Intelligence (Daily/Weekly)
```
Collect → Analyze → Segment → Act → Test → Measure
```

**Skill chain:**
1. `google-analytics` — Pull GA4 data (sessions, bounce, conversions by site)
2. `analytics-tracking` — Verify event tracking completeness
3. `seo-fundamentals` — Cross-reference organic traffic with ranking changes
4. `page-cro` — Identify underperforming pages by conversion rate
5. `ab-test-setup` — Design experiments for top opportunities
6. `form-cro` / `signup-flow-cro` — Optimize identified friction points

**Maps to crons:** `analytics` (3am daily) → `seo-orchestrator` evaluates business goals

### Pipeline 4: Frontend Excellence (On-demand)
```
Audit → Design → Build → Optimize → Test → Deploy
```

**Skill chain:**
1. `accessibility` — WCAG 2.1 audit of target pages
2. `frontend-design` — Design premium, brand-aligned components
3. `nextjs-best-practices` + `react-best-practices` — Server-first architecture
4. `react-patterns` + `react-ui-patterns` — Loading states, error boundaries
5. `tailwind-patterns` — CSS with design token architecture
6. `i18n-localization` — RTL support, bilingual rendering
7. `core-web-vitals` + `web-performance-optimization` — Performance validation
8. `playwright-skill` — Cross-browser, cross-site E2E testing
9. `vercel-deploy` — Ship to preview, then production

### Pipeline 5: Growth & Social (Weekly)
```
Strategy → Create → Distribute → Track → Iterate
```

**Skill chain:**
1. `marketing-strategy-pmm` — Define positioning, ICP, messaging
2. `content-creator` — Create brand-voiced content
3. `copywriting` — Write platform-specific copy
4. `social-content` — Adapt for LinkedIn, Instagram, TikTok, Twitter/X
5. `viral-generator-builder` — Build shareable tools (travel quizzes, name generators)
6. `analytics-tracking` — Track social referral traffic
7. `page-cro` — Optimize landing pages receiving social traffic

### Pipeline 6: Conversion Optimization (Bi-weekly)
```
Data → Hypothesis → Design → Test → Analyze → Implement
```

**Skill chain:**
1. `google-analytics` — Identify drop-off points in funnel
2. `page-cro` — Audit page-level conversion issues
3. `form-cro` — Optimize lead capture forms
4. `signup-flow-cro` — Reduce registration friction
5. `copywriting` — A/B test headline and CTA variants
6. `ab-test-setup` — Configure experiments with proper tracking
7. `analytics-tracking` — Measure experiment results

### Pipeline 7: Competitive Research (Monthly)
```
Discover → Analyze → Benchmark → Adapt → Execute
```

**Skill chain:**
1. `exa-search` — Semantic discovery of competitor content
2. `firecrawl-scraper` — Deep crawl competitor sites
3. `tavily-web` — Research industry trends and news
4. `marketing-strategy-pmm` — Competitive battlecards, positioning gaps
5. `seo-audit` — Compare technical SEO against competitors
6. `content-research-writer` — Identify content gaps to fill
7. `programmatic-seo` — Build pages targeting competitor keywords

---

## Agent Coordination Protocol

### Agent Hierarchy
```
workflow-orchestrator (this skill — master coordinator)
├── seo-growth-agent          → SEO Domain (8 skills)
├── content-pipeline-agent    → Content Domain (7 skills) + Research Domain (5 skills)
├── analytics-agent           → Analytics Domain (3 skills)
├── frontend-agent            → Frontend Domain (9 skills)
├── conversion-agent          → CRO Domain (3 skills) + Analytics feedback
└── multi-tenant-platform     → Platform Domain (4 skills) — foundation for all
```

### Cross-Agent Communication Rules

1. **Content → SEO**: Every published article triggers SEO audit-on-publish gate
2. **SEO → Content**: Low-performing content (CTR < 1% after 30 days) triggers auto-rewrite
3. **Analytics → CRO**: Drop-off data feeds conversion optimization priorities
4. **CRO → Frontend**: A/B test winners trigger component updates
5. **Frontend → SEO**: Performance improvements feed Core Web Vitals scores
6. **Research → Content**: Discovered topics feed weekly content calendar
7. **All → Analytics**: Every agent action must be trackable in GA4/CronJobLog

### Conflict Resolution

| Conflict | Resolution |
|----------|-----------|
| SEO vs. Design (e.g., keyword stuffing vs. clean copy) | SEO sets minimum requirements, Design has creative freedom above that |
| Speed vs. Features (e.g., heavy components vs. fast LCP) | Core Web Vitals thresholds are non-negotiable; find lighter implementations |
| Volume vs. Quality (e.g., more articles vs. better articles) | Pre-publication gate enforces minimum SEO score of 70 before publishing |
| EN vs. AR priority | English first for generation, Arabic mirrors with cultural adaptation |
| Multi-site conflicts (same keyword different sites) | Primary site for keyword wins; others use long-tail variants |

---

## Orchestration Decision Tree

When receiving a task, follow this routing logic:

```
1. Is this a multi-domain task?
   YES → Identify all domains involved → Chain skills in dependency order
   NO  → Route to single domain agent

2. Does this affect multiple sites?
   YES → Loop through sites with timeout guard (53s budget for 5 sites = ~10s/site)
   NO  → Target specific site

3. Does this need real-time data?
   YES → Start with research/analytics skills → Feed into action skills
   NO  → Proceed with existing data

4. Is this content-related?
   YES → Always end with: seo-optimizer → schema-markup → pre-publication gate
   NO  → Skip content pipeline

5. Does this touch the frontend?
   YES → Always validate with: accessibility → core-web-vitals → playwright-skill
   NO  → Skip frontend pipeline

6. Is this measurable?
   YES → Ensure analytics-tracking is in the chain
   NO  → Add measurement requirements before starting
```

## Quality Gates

Every workflow must pass these gates before completion:

| Gate | Threshold | Blocking? |
|------|----------|-----------|
| SEO Score | >= 70/100 | Yes — content cannot publish below this |
| Lighthouse Performance | >= 80/100 | Yes — frontend changes blocked below this |
| Accessibility Score | >= 90/100 | Yes — UI changes blocked below this |
| Content Length | >= 1,200 words (EN), >= 800 words (AR) | Yes |
| Schema Validation | Valid JSON-LD, no errors | Yes |
| Internal Links | >= 3 per article | Yes |
| Meta Description | 120-160 characters, includes target keyword | Yes |
| OG Image | Present and valid URL | Warning only |
| Analytics Events | Tracked in GA4 | Warning only |
| Cross-browser | Renders on Chrome, Safari, Firefox | For frontend changes |

---

## Multi-Tenant Awareness

Every skill activation must consider:

1. **Site Context**: Which of the 5 sites? Check `x-site-id` header
2. **Locale**: EN or AR? Check `x-site-locale` header
3. **Brand Voice**: Each site has distinct system prompts in `config/sites.ts`
4. **Keywords**: Each site has unique `primaryKeywordsEN/AR` and `topicsEN/AR`
5. **Design**: Each site has unique colors (`primaryColor`, `secondaryColor`) and aesthetic
6. **Type**: Is it `native` (Next.js) or `wordpress` (WP REST API)?

Never apply a blanket change across sites without verifying per-site compatibility.

---

## Activation Examples

**User says: "Audit SEO and fix issues across all sites"**
→ Pipeline 2 (SEO Audit & Fix) × 5 sites
→ Agent: `seo-growth-agent`
→ Skills: roier-seo → seo-audit → core-web-vitals → schema-markup → web-performance-optimization → playwright-skill

**User says: "Create 5 new blog posts about London restaurants"**
→ Pipeline 1 (Content-to-Revenue)
→ Agent: `content-pipeline-agent`
→ Skills: tavily-web → content-research-writer → content-creator → copy-editing → seo-optimizer → schema-markup

**User says: "Our bounce rate is too high on the Dubai homepage"**
→ Pipeline 6 (Conversion Optimization) + Pipeline 4 (Frontend Excellence)
→ Agents: `conversion-agent` + `frontend-agent`
→ Skills: google-analytics → page-cro → frontend-design → core-web-vitals → ab-test-setup

**User says: "Prepare a social media campaign for Arabaldives"**
→ Pipeline 5 (Growth & Social)
→ Agent: `content-pipeline-agent`
→ Skills: marketing-strategy-pmm → content-creator → social-content → analytics-tracking

**User says: "Deploy the new information hub pages"**
→ Pipeline 4 (Frontend Excellence) final stages
→ Skills: accessibility → playwright-skill → vercel-deploy
