# Create New Website — Operational Workflow

**Document Version:** 1.0
**Date:** February 16, 2026
**Author:** Claude (CTO Agent) for Zenitha.Luxury LLC

---

## Overview

This document provides the complete end-to-end workflow for launching a new website in the Zenitha Content Network. It covers everything from reviewing site research to fully operational autonomous content generation.

**Prerequisites:**
- Site research document completed (in `docs/site-research/`)
- Domain registered and DNS configured
- Vercel Pro plan active
- Supabase database accessible

---

## Phase 1: Research Review & Planning (Day 1)

### 1.1 Review Site Research Document

Read the comprehensive research report for the target site:
```
docs/site-research/02-arabaldives.md    — Arabaldives
docs/site-research/03-yalla-riviera.md  — Yalla Riviera
docs/site-research/04-yalla-thailand.md — Yalla Thailand
docs/site-research/05-yalla-istanbul.md — Yalla Istanbul
```

**Verify the report includes:**
- [ ] Design & Visual Identity (colors, typography, gradients)
- [ ] Content Strategy & Information Sources
- [ ] Profitable Affiliate Programs (Tier 1/2/3)
- [ ] Website Layout & Must-Have Sections
- [ ] Content Engine Integration plan

### 1.2 Validate Configuration Files

**Check `config/sites.ts`:**
- [ ] Site entry exists with correct `id`, `domain`, `locale`, `direction`
- [ ] Status is `"planned"` (will change to `"development"` then `"active"`)
- [ ] `destination` and `country` fields match research
- [ ] `systemPromptEN` and `systemPromptAR` are site-specific
- [ ] `topicsEN` and `topicsAR` arrays have 7 topics each
- [ ] `affiliateCategories` match research report
- [ ] `primaryKeywordsEN` and `primaryKeywordsAR` populated

**Check `config/entity.ts`:**
- [ ] Site ID appears in `contentArm.sites[]` array

**Check `lib/design/destination-themes.ts`:**
- [ ] Theme entry exists with correct colors, gradients, typography
- [ ] Colors match the research report's brand identity section
- [ ] Both EN and AR typography are specified

**Check `middleware.ts`:**
- [ ] Domain mapping exists (both root and www)
- [ ] Legacy domain mappings if any

### 1.3 Create Development Plan

Based on the research, create a prioritized implementation plan:

| Priority | Task | Estimated Effort |
|----------|------|-----------------|
| P0 | Config validation + site status → development | Quick |
| P0 | Environment variables per-site | Quick |
| P1 | Homepage design + branding | Medium |
| P1 | Content pipeline activation (topics) | Quick |
| P2 | Affiliate link configuration | Medium |
| P2 | GA4 + GSC per-site setup | Medium |
| P3 | Social media design templates | Low |

---

## Phase 2: Infrastructure Setup (Day 1-2)

### 2.1 Environment Variables

Set per-site environment variables (in Vercel dashboard or `.env`):

```env
# Google Analytics 4 (per-site)
GA4_PROPERTY_ID_{SITE_ID_UPPER}=<property-id>
GA4_MEASUREMENT_ID_{SITE_ID_UPPER}=<measurement-id>

# Google Search Console (per-site)
GSC_SITE_URL_{SITE_ID_UPPER}=sc-domain:<domain>

# IndexNow (per-site)
INDEXNOW_KEY_{SITE_ID_UPPER}=<key>

# AWS S3 folder prefix (per-site, auto-defaults to site_id/)
AWS_FOLDER_PREFIX_{SITE_ID_UPPER}=<site-id>/
```

Example for Arabaldives:
```env
GA4_PROPERTY_ID_ARABALDIVES=123456789
GA4_MEASUREMENT_ID_ARABALDIVES=G-XXXXXXXXXX
GSC_SITE_URL_ARABALDIVES=sc-domain:arabaldives.com
INDEXNOW_KEY_ARABALDIVES=<generated-key>
```

### 2.2 Database Credential Vault

Alternatively, store per-site credentials in the encrypted Credential table via the admin dashboard:
1. Go to Admin → Command Center → Settings → API Keys
2. Select the target site
3. Add keys: `GA4_PROPERTY_ID`, `GSC_SITE_URL`, `INDEXNOW_KEY`
4. Values are AES-256-GCM encrypted at rest

### 2.3 Domain Configuration

1. **DNS Setup:**
   - A record: `@` → Vercel IP
   - CNAME: `www` → `cname.vercel-dns.com`

2. **Vercel Domain:**
   - Add domain in Vercel project settings
   - Enable automatic SSL

3. **Verify in middleware.ts:**
   - Domain → siteId mapping exists for both root and www

### 2.4 Change Site Status to Development

Update `config/sites.ts`:
```typescript
status: "development",  // Was "planned"
```

This allows testing without running cron jobs or generating real content.

---

## Phase 3: Design & Branding (Day 2-3)

### 3.1 Verify Theme Configuration

Test theme rendering:
1. Access the site via localhost with appropriate domain header
2. Verify colors match the research document
3. Check gradient rendering on hero sections
4. Verify Arabic typography (Cairo or equivalent)
5. Test animation presets

### 3.2 Homepage Design

1. Access Admin → Design → Homepage
2. Select layout template appropriate for the destination
3. Configure homepage blocks:
   - Hero section with destination imagery
   - Featured articles grid
   - Category navigation
   - Newsletter signup
   - Affiliate CTA blocks

### 3.3 Brand Assets

1. Upload logo SVG (primary + white variant) to media library
2. Upload favicon (ICO + PNG)
3. Configure Open Graph default image (1200x630px)
4. Set brand colors in site theme

### 3.4 Verification Checklist

- [ ] Homepage renders with correct theme colors
- [ ] Arabic (`/ar/`) layout is RTL
- [ ] Logo displays correctly
- [ ] Favicon shows in browser tab
- [ ] OG image set for social sharing

---

## Phase 4: Content Pipeline Activation (Day 3-4)

### 4.1 Seed Initial Topics

Option A — Via Admin Dashboard:
1. Go to Admin → Topics → Add Topic
2. Create 10-15 initial topics from the research document's content strategy
3. Set status to "ready"

Option B — Automatically via Cron:
1. Change site status to `"active"` in `config/sites.ts`
2. Run the weekly-topics cron: Admin → Run All Crons (or trigger `/api/cron/weekly-topics`)
3. Topics will be generated using AI with site-specific prompts

### 4.2 Test Content Builder

1. Trigger content builder: `/api/cron/content-builder`
2. Monitor ArticleDraft table for phase progression:
   - research → outline → drafting → assembly → images → seo → scoring → reservoir
3. Verify drafts have correct `site_id`
4. Check that bilingual pairing works (EN ↔ AR via `paired_draft_id`)

### 4.3 Test Content Selector

1. Wait for drafts to reach "reservoir" phase with quality_score ≥ 70
2. Trigger content selector: `/api/cron/content-selector`
3. Verify BlogPost records are created with correct `siteId`
4. Check that both `content_en` and `content_ar` are populated

### 4.4 Test Pre-Publication Gate

The enhanced gate now checks:
- [ ] Route existence (parent URL returns 200)
- [ ] Title presence and length
- [ ] Meta title and description
- [ ] Content length (≥1,200 words)
- [ ] Heading hierarchy (H1/H2/H3 structure)
- [ ] Readability score (grade level ≤12)
- [ ] Internal links count (≥3)
- [ ] Image alt text
- [ ] SEO score (≥40)

### 4.5 Test Publishing

1. Trigger scheduled publish: `/api/cron/scheduled-publish`
2. Verify the article is accessible at `https://www.<domain>/blog/<slug>`
3. Check Arabic version at `https://www.<domain>/ar/blog/<slug>`
4. Verify JSON-LD schema markup in page source
5. Verify hreflang tags in `<head>`

---

## Phase 5: SEO & Indexing (Day 4-5)

### 5.1 Submit to Search Engines

1. **Google Search Console:**
   - Add property: `sc-domain:<domain>`
   - Verify ownership via DNS TXT record
   - Submit sitemap: `https://www.<domain>/sitemap.xml`

2. **Bing Webmaster Tools:**
   - Import from GSC or add manually
   - Submit sitemap

3. **IndexNow:**
   - Generate IndexNow key
   - Place key file at `/<key>.txt` (handled by `[indexnow]` route)
   - Set `INDEXNOW_KEY_{SITE}` env var

### 5.2 Verify SEO Infrastructure

- [ ] Sitemap accessible at `/sitemap.xml` (returns site-specific URLs)
- [ ] Robots.txt allows all AI crawlers
- [ ] llms.txt serves site-specific content
- [ ] JSON-LD schema on all published pages
- [ ] hreflang tags for EN/AR variants
- [ ] Canonical URLs set correctly
- [ ] Meta titles ≤60 chars, meta descriptions 120-160 chars

### 5.3 Run SEO Agent

1. Trigger: `/api/cron/seo-agent`
2. Verify it processes the new site
3. Check for IndexNow submissions
4. Review SEO report in admin dashboard

---

## Phase 6: Affiliate Configuration (Day 5-6)

### 6.1 Set Up Affiliate Links

1. Go to Admin → Affiliate Pool
2. Add affiliate programs from the research report:
   - Tier 1 (highest commission): HalalBooking, Booking.com, etc.
   - Tier 2 (medium): GetYourGuide, Viator, etc.
   - Tier 3 (supplementary): Amazon Associates, etc.

### 6.2 Configure Injection Rules

1. Map affiliate categories to content types
2. Set injection frequency (1-3 links per article)
3. Test affiliate injection: `/api/cron/affiliate-injection`
4. Verify links appear in published articles

---

## Phase 7: Go Live (Day 6-7)

### 7.1 Pre-Launch Checklist

**Infrastructure:**
- [ ] Domain resolves correctly (www and root)
- [ ] SSL certificate active
- [ ] Middleware routes to correct site ID
- [ ] All environment variables configured

**Content:**
- [ ] At least 5 published articles
- [ ] Homepage renders with real content
- [ ] Blog listing page shows articles
- [ ] Arabic content accessible
- [ ] Affiliate links present in articles

**SEO:**
- [ ] Sitemap returns site-specific URLs
- [ ] Google Search Console verified
- [ ] IndexNow key configured
- [ ] Schema markup on all pages
- [ ] llms.txt serving correct site data

**Dashboard:**
- [ ] Site appears in Admin → Command Center → Sites
- [ ] Cron logs show activity for new site
- [ ] Health check includes new site

### 7.2 Activate Site

Update `config/sites.ts`:
```typescript
status: "active",  // Was "development"
```

Deploy to Vercel. From this moment:
- All cron jobs will include the new site
- Content pipeline generates articles automatically
- SEO agent monitors and indexes content
- Trends monitor feeds relevant topics

### 7.3 Post-Launch Monitoring (Week 1)

**Daily checks via dashboard:**
- [ ] Content pipeline producing articles (target: 1/day minimum)
- [ ] Articles being indexed (check Indexing tab)
- [ ] No cron job failures (check Health Monitoring)
- [ ] Affiliate links injected (check articles)

**Weekly review:**
- [ ] Google Search Console: pages indexed, crawl errors
- [ ] GA4: traffic baseline established
- [ ] Content quality: average SEO score ≥70
- [ ] Pipeline health: all 8 phases advancing

---

## Phase 8: Scale & Optimize (Ongoing)

### 8.1 Content Velocity

- Week 1: 1 article/day
- Week 2-4: Increase to 2 articles/day
- Month 2+: Target 3 articles/day

### 8.2 SEO Optimization

- Monitor CTR in GSC (target: 3%+ at 30 days)
- Low-CTR articles auto-queued for rewrite (via SEO agent feedback loop)
- Internal linking between articles grows organically

### 8.3 Revenue Tracking

- Track affiliate clicks in dashboard
- Monitor conversion rates per affiliate program
- Optimize link placement based on click data

---

## Troubleshooting

### Common Issues

**Articles not being generated:**
1. Check site status is `"active"` in `config/sites.ts`
2. Verify `getActiveSiteIds()` returns the new site ID
3. Check cron logs for errors
4. Ensure AI API keys are configured

**Content not appearing on site:**
1. Check `siteId` on BlogPost records matches the site
2. Verify middleware sets correct `x-site-id` header
3. Check domain mapping in middleware.ts

**SEO agent not processing site:**
1. Verify site is in `getActiveSiteIds()` response
2. Check SEO agent cron logs for errors
3. Ensure `INDEXNOW_KEY` is set for the site

**Arabic content not rendering:**
1. Check `/ar/` routes are accessible
2. Verify `content_ar` is populated on BlogPost
3. Check middleware locale detection

---

## File Reference

| File | Purpose |
|------|---------|
| `config/sites.ts` | Site configuration (status, domain, topics, prompts) |
| `config/entity.ts` | Parent entity (Zenitha.Luxury LLC) |
| `lib/design/destination-themes.ts` | Per-site visual theme |
| `middleware.ts` | Domain → site routing |
| `prisma/schema.prisma` | Database models (95 models) |
| `app/api/cron/*` | 20 cron job routes |
| `app/llms.txt/route.ts` | Per-site AI information file |
| `app/robots.ts` | Per-site robots.txt with AI crawler rules |
| `app/sitemap.ts` | Per-site XML sitemap |

---

## Site Launch Order

Per CLAUDE.md priority:
1. **Yalla London** — Active (primary)
2. **Arabaldives** — Next (Arabic-first Maldives)
3. **Yalla Riviera** — After Arabaldives
4. **Yalla Istanbul** — Highest revenue ceiling
5. **Yalla Thailand** — Largest tourist market

---

*This workflow is designed for Khaled's launch-and-forget philosophy. Once a site is activated, the autonomous agents handle content generation, SEO optimization, and indexing. Dashboard monitoring is the only ongoing requirement.*
