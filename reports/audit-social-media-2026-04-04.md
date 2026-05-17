# Phase 6: Social Media Management System Audit
> **Date:** 2026-04-04 | **Auditor:** Claude Platform Health Audit | **Branch:** `claude/platform-health-audit-6jxH8`

---

## Executive Summary

**Overall Score: 75/100 (B)**

The platform has excellent foundational social media infrastructure — 100% OG meta tag coverage, complete Twitter Card implementation, a functional social scheduler with calendar UI, and auto-repurposing via the Content Engine Scripter agent. However, actual social posting is not yet connected (cron marked "not yet connected"), engagement tracking returns null, and the footer/social links are hardcoded for Yalla London only.

| Dimension | Score | Grade | Summary |
|-----------|-------|-------|---------|
| OG Meta Tags | 100/100 | A+ | Every public page has correct og:title, og:description, og:image, og:url |
| Twitter Cards | 100/100 | A+ | summary_large_image on all pages, twitter:site configured |
| Social Scheduler | 80/100 | A- | Calendar UI works, cron scheduled, but publish flow "not yet connected" |
| Social Profile Links | 60/100 | C | Footer hardcoded for Yalla London, no dynamic per-site profiles |
| Engagement Tracking | 30/100 | D | Returns null — platform APIs not connected |
| Content Repurposing | 75/100 | B | Content Engine Scripter generates social posts; no auto-distribution |

---

## Detailed Findings

### 1. OG Meta Tags (100/100)

**Methodology:** Grepped all `page.tsx` and `layout.tsx` files for Open Graph metadata.

**Strengths:**
- All public page layouts include `openGraph` in `generateMetadata()`
- Dynamic `getBaseUrl()` for og:url (no hardcoded domains)
- Per-site OG images via `/api/og?siteId={siteId}` (Next.js ImageResponse)
- og:type correctly set to "website" for pages, "article" for blog posts
- og:locale switches between en_GB and ar_SA based on route

**Coverage:** 100% of public routes have OG tags.

### 2. Twitter Cards (100/100)

**Methodology:** Grepped for `twitter` metadata across all layouts.

**Strengths:**
- `twitter:card = "summary_large_image"` on all pages
- `twitter:site` configured per site
- `twitter:title` and `twitter:description` properly set
- Same dynamic image as OG (consistent sharing experience)

### 3. Social Scheduler (80/100)

**Architecture:**
- `lib/social/scheduler.ts` — full lifecycle: create, schedule, publish, reschedule, delete
- `app/admin/social-calendar/page.tsx` — week/month view with platform-colored cards
- `app/api/cron/social/route.ts` — scheduled every 15 min, processes due posts

**What Works:**
- Post creation and scheduling to `ScheduledContent` table
- Calendar UI with drag-to-reschedule
- Platform detection (Twitter, Instagram, Facebook, LinkedIn, TikTok)
- Content Engine Scripter generates platform-specific social posts
- Manual "Mark Published" flow for non-API platforms

**Gaps:**
- Twitter auto-publish code exists but env vars (`TWITTER_API_KEY` etc.) not set
- Instagram/TikTok/LinkedIn require platform partnerships (not a code issue)
- Social cron status shows "not yet connected" in operations dashboard
- No bulk scheduling (one post at a time)

### 4. Social Profile Links (60/100)

**Finding:** Footer component has hardcoded Yalla London social URLs. No dynamic per-site social profile configuration.

**What's Needed:**
- Social profile URLs in `config/sites.ts` per site
- Footer dynamically reads social profiles from site config
- Schema.org `sameAs` property populated from real profile URLs

### 5. Engagement Tracking (30/100)

**Finding:** All engagement metrics (likes, shares, reach, comments) return `null` across the dashboard. This is correct behavior — platform APIs are not connected, and the codebase properly returns null instead of fake data (mock data was purged in February 2026 audits).

**To Enable:**
- Twitter API keys (4 env vars) — enables real engagement data for Twitter/X
- Other platforms require OAuth app review (3-6 months)

### 6. Content Repurposing (75/100)

**What Works:**
- Content Engine Scripter agent (`lib/content-engine/scripter.ts`) generates platform-specific versions of blog articles
- Generates: tweet threads, Instagram captions, LinkedIn posts, short-form video scripts
- Bilingual (EN/AR) output supported

**Gap:** No automatic distribution — generated social content must be manually scheduled via the calendar UI.

---

## Top Issues (Ranked by Impact)

| # | Issue | Severity | Impact | Fix Effort |
|---|-------|----------|--------|------------|
| 1 | Social posting not connected (env vars missing) | HIGH | Zero social distribution | LOW (add 4 Twitter env vars) |
| 2 | Footer social links hardcoded for Yalla London | MEDIUM | Wrong links on other sites | LOW |
| 3 | No engagement tracking from any platform | MEDIUM | Can't measure social ROI | MEDIUM (Twitter), HIGH (others) |
| 4 | No TikTok configuration in site config | LOW | Missing fastest-growing platform | MEDIUM |
| 5 | No auto-distribution from Content Engine to scheduler | LOW | Manual step required | MEDIUM |

---

## Recommendations

### Immediate (This Week)
1. Add 4 Twitter env vars to Vercel to enable auto-posting
2. Move social profile URLs from hardcoded footer to `config/sites.ts`

### Short-Term (30 Days)
3. Build auto-distribution: Content Engine Scripter → Social Scheduler (eliminate manual step)
4. Add UTM parameters to all social-shared URLs for GA4 attribution

### Medium-Term (90 Days)
5. Apply for Instagram Basic Display API (requires business account + app review)
6. Build social engagement dashboard once Twitter data flows
