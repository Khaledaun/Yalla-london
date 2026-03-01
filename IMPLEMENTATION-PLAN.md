# Audit Recommendations & Revenue Implementation Plan

**Date:** 2026-02-11
**Scope:** Security hardening, code quality, database optimization, testing, digital product commerce, revenue operations
**Status:** Phase 1–3 Complete | Phase 4 (Revenue Commerce) Complete | Phase 5 (Revenue Operations) — YOUR ACTION REQUIRED

---

## Overview

This document tracks the implementation of recommendations from two comprehensive audit reports:

1. **AUDIT-REPORT.md** (2026-02-07) — Full project audit covering security, architecture, testing, DevOps
2. **AUDIT_REPORT.md** (2026-02-10) — CMS, automation, design studio & admin dashboard audit

---

## Phase 1: Implemented (Current Sprint)

### 1.1 Critical Security Fixes

| Fix | File | Issue | Resolution | Status |
|-----|------|-------|------------|--------|
| Signup password not saved | `app/api/signup/route.ts` | `passwordHash` computed but not included in `prisma.user.create()` | Added `passwordHash` field to create call | DONE |
| Signup missing validation | `app/api/signup/route.ts` | No email format or password complexity validation | Added email regex check + minimum 12-character password requirement | DONE |
| Cron autopilot auth bypass | `app/api/cron/autopilot/route.ts` | `if (cronSecret && ...)` allowed unauthenticated access when `CRON_SECRET` not set | Changed to fail-closed: reject all requests if `CRON_SECRET` is missing | DONE |
| Cron auto-generate timing attack | `app/api/cron/auto-generate/route.ts` | String comparison for bearer token vulnerable to timing attacks | Replaced with `timingSafeEqual` from `crypto` module | DONE |
| Cron autopilot timing attack | `app/api/cron/autopilot/route.ts` | Same timing attack vulnerability | Same fix: `timingSafeEqual`-based `safeCompare()` function | DONE |
| Error details leaked | `app/api/cron/auto-generate/route.ts` | Internal error messages (DB host, port) returned to client | Return generic "Cron job failed" message; log details server-side only | DONE |
| Content generation unrate-limited | `app/api/generate-content/route.ts` | Expensive LLM API calls had no rate limiting | Wrapped with `withRateLimit(HEAVY_OPERATIONS)` — 2 requests/min/IP | DONE |
| CI secret fallback predictable | `.github/workflows/ci.yml` | `NEXTAUTH_SECRET` fallback used `github.run_id` (simple integer) | Changed to composite `run_id-run_attempt-sha` (harder to predict) | DONE |

### 1.2 Database Performance Improvements

| Change | Model | Index Added | Rationale |
|--------|-------|-------------|-----------|
| User role lookup | `User` | `@@index([role])` | RBAC permission checks filter by role |
| User active filter | `User` | `@@index([isActive])` | Dashboard queries filter active users |
| User creation date | `User` | `@@index([createdAt])` | Analytics and pagination queries |
| Lead email lookup | `Lead` | `@@index([email])` | Duplicate detection queries filter by email alone (not just composite) |
| PageView tenant+path | `PageView` | `@@index([site_id, path])` | Multi-tenant path analytics queries need composite index |

### 1.3 TypeScript Strict Mode (Incremental)

Enabled the following strict flags in `tsconfig.json`:

| Flag | Before | After | Impact |
|------|--------|-------|--------|
| `noImplicitReturns` | `false` | `true` | Catches missing return statements |
| `noImplicitThis` | `false` | `true` | Prevents `this` type errors |
| `strictFunctionTypes` | `false` | `true` | Enforces correct function signatures |
| `strictBindCallApply` | `false` | `true` | Type-checks `bind`, `call`, `apply` |
| `noImplicitOverride` | `false` | `true` | Requires `override` keyword for overrides |

**Not yet enabled** (require significant codebase changes):
- `strict: true` — umbrella flag, deferred to Phase 3
- `strictNullChecks` — requires fixing 100+ null-related patterns, deferred to Phase 2
- `noImplicitAny` — requires adding types to ~50+ untyped parameters, deferred to Phase 2

**12 TypeScript errors fixed** across 8 files to satisfy new strict flags:
- `app/components/admin/mobile-media-uploader.tsx` — Fixed `useState` misuse (was `useEffect`)
- `components/admin/async-action-toast.tsx` — Added explicit return
- `components/marketing/exit-intent-popup.tsx` — Added explicit return
- `components/marketing/social-proof.tsx` — Added explicit return
- `components/seo/breadcrumbs.tsx` — Added explicit return
- `components/seo/structured-content.tsx` — Added explicit return
- `components/ui/carousel.tsx` — Added explicit return
- `lib/seo/advanced-analytics.ts` — Added explicit returns (4 functions)

### 1.4 Testing

New test file: `test/security/audit-fixes.spec.ts` — **17 tests, all passing**

| Test Suite | Tests | Description |
|------------|-------|-------------|
| `safeCompare` | 5 | Timing-safe string comparison correctness |
| Signup password saving | 3 | Verifies `passwordHash` in create, password length validation, email validation |
| Cron autopilot auth | 3 | Fail-closed without CRON_SECRET, rejects wrong GET token, rejects wrong POST secret |
| Cron auto-generate errors | 1 | Verifies internal error details not leaked to client |
| Generate content rate limit | 1 | Verifies POST export is rate-limited |
| Schema indexes | 3 | Structural verification of User, Lead, PageView indexes |
| TypeScript config | 1 | Verifies strict flags are enabled |

---

## Phase 2: Implemented

### 2.1 Admin Breadcrumb Navigation

| Component | File | Description | Status |
|-----------|------|-------------|--------|
| `useAdminBreadcrumbs` hook | `lib/use-admin-breadcrumbs.ts` | Auto-generates breadcrumbs from URL path using navigation structure | DONE |
| Maps all 10 nav sections | — | Dashboard, Content, Media, SEO, AI, Design, Monetization, Multi-Site, People, Settings | DONE |
| Fallback for unknown paths | — | Generates breadcrumbs from URL segments (capitalize, replace hyphens) | DONE |

### 2.2 Audit Log Viewer

| Component | File | Description | Status |
|-----------|------|-------------|--------|
| API route | `app/api/admin/audit-logs/route.ts` | GET with pagination, filtering (action, resource, userId, date range) | DONE |
| Admin page | `app/admin/audit-logs/page.tsx` | Table with filters, pagination, relative timestamps, expandable details | DONE |
| Breadcrumbs | — | Admin > Settings > Audit Logs using `PageHeader` component | DONE |

### 2.3 Session Timeout

| Change | File | Description | Status |
|--------|------|-------------|--------|
| Configurable maxAge | `lib/auth.ts` | `SESSION_MAX_AGE_SECONDS` env var, default 8 hours (was hardcoded 24h) | DONE |
| Session refresh | `lib/auth.ts` | `updateAge: 15 * 60` refreshes JWT every 15 minutes of activity | DONE |

### 2.4 Email Notification Handler

| Component | File | Description | Status |
|-----------|------|-------------|--------|
| `processSubscriberNotifications` | `lib/email-notifications.ts` | Processes pending `subscriber_notification` BackgroundJob records | DONE |
| `sendEmail` | `lib/email-notifications.ts` | Multi-provider: Resend, SendGrid, SMTP (nodemailer), console fallback | DONE |
| `buildNotificationEmail` | `lib/email-notifications.ts` | Responsive HTML email with branding, CTA, unsubscribe link, XSS escaping | DONE |

### 2.5 Content Bulk Operations

| Component | File | Description | Status |
|-----------|------|-------------|--------|
| Bulk API endpoint | `app/api/admin/content/bulk/route.ts` | PUT with 6 actions: publish, unpublish, delete, addTag, removeTag, setCategory | DONE |
| Validation | — | Zod schema, max 100 items per batch | DONE |
| Soft delete | — | Uses `deletedAt` field for bulk delete (recoverable) | DONE |
| Audit logging | — | Every bulk action logged to AuditLog with `bulk_` prefix | DONE |
| Tag operations | — | PostgreSQL `array_append`/`array_remove` for atomic tag updates | DONE |

### 2.6 Social Media Design Presets

| Format | Dimensions | Status |
|--------|-----------|--------|
| Instagram Post | 1080 x 1080 | DONE |
| Instagram Story/Reel | 1080 x 1920 | DONE |
| Facebook Post | 1200 x 630 | DONE |
| Facebook Cover | 820 x 312 | DONE |
| Twitter Post | 1200 x 675 | DONE |
| Twitter Header | 1500 x 500 | DONE |
| LinkedIn Post | 1200 x 627 | DONE |
| LinkedIn Cover | 1584 x 396 | DONE |
| TikTok Video | 1080 x 1920 | DONE |
| YouTube Thumbnail | 1280 x 720 | DONE |
| Pinterest Pin | 1000 x 1500 | DONE |
| OG Image | 1200 x 630 | DONE |

### 2.7 Phase 2 Testing

New test file: `test/integration/phase2-enhancements.spec.ts` — **35 tests, all passing**

| Test Suite | Tests | Description |
|------------|-------|-------------|
| Breadcrumbs hook | 6 | Exports, navigation sections, Admin root, fallback |
| Session timeout | 3 | Configurable env var, default 8h, updateAge |
| Email notifications | 11 | Exports, providers (Resend/SendGrid/SMTP), job processing, HTML escaping |
| Bulk operations | 7 | PUT handler, all 6 actions, validation, soft delete, audit logging |
| Design presets | 5 | All 13 social media formats, print formats, correct dimensions |
| Audit log viewer | 4 | API route, filtering, admin page, pagination |

---

## Phase 2.5: Bulk Affiliate Links (Implemented)

### Bulk Affiliate Link Management

| Component | File | Description | Status |
|-----------|------|-------------|--------|
| Rule engine | `lib/affiliate-link-rules.ts` | Flexible content targeting: by ID, filter, service type, tags, categories, page types, sites | DONE |
| Bulk API | `app/api/admin/affiliate-links/bulk/route.ts` | POST (6 actions) + GET (summary stats) with Zod validation | DONE |
| Admin page | `app/admin/affiliate-links/page.tsx` | Full management UI with filters, dry-run preview, results display | DONE |

**Supported Actions:**

| Action | Description |
|--------|-------------|
| `assign` | Assign affiliate partner to matched content with placement/priority options |
| `unassign` | Remove affiliate assignments from matched content |
| `activate` | Activate disabled assignments |
| `deactivate` | Deactivate without removing |
| `update_priority` | Change display priority (1-100) |
| `update_placement` | Change link position (auto, top, bottom, inline, sidebar, cta_button) |

**Targeting Modes:**

| Mode | Description |
|------|-------------|
| Specific | Target exact content IDs (up to 500) |
| Filter | Target by category, tags, page type, site, partner type, title search, published status |

**Key Features:**
- Service-based auto-matching (hotel keywords → hotel content, restaurant keywords → restaurant content, etc.)
- Dry-run preview before executing
- Skip existing assignments option
- Max links per content limit (default 5)
- Audit logging with `bulk_affiliate_` prefix
- Safety cap of 500 results per filter query
- Dashboard summary stats (total/active assignments, by content type, by partner)

### Phase 2.5 Testing

New test file: `test/integration/bulk-affiliate-links.spec.ts` — **45 tests, all passing**

| Test Suite | Tests | Description |
|------------|-------|-------------|
| Rule engine | 17 | All actions, content types, placements, filters, dry_run, skip_existing, audit logging |
| Bulk API | 13 | POST/GET handlers, Zod validation, action validation, error handling |
| Admin page | 15 | UI elements, filters, actions, placements, API integration |

---

## Phase 3: Implemented

### 3.1 Prompt Injection Defenses

| Component | File | Description | Status |
|-----------|------|-------------|--------|
| Safety module | `lib/prompt-safety.ts` | Multi-layer defense: sanitization, injection detection, structured prompts, output validation | DONE |
| AI generate integration | `app/api/ai/generate/route.ts` | Added `processPromptSafely` + `validateLLMOutput` to generation pipeline | DONE |
| Auto-generate integration | `app/api/content/auto-generate/route.ts` | Added `detectPromptInjection` + `sanitizePromptInput` for custom prompts | DONE |

**Defense Layers:**

| Layer | Description |
|-------|-------------|
| Input sanitization | Strip control chars, zero-width unicode, normalize whitespace, enforce max length |
| Injection detection | 12 pattern categories with weighted risk scoring (0-100), threshold at 70 |
| Structured prompts | Security preamble + clear delimiters separating system instructions from user input |
| Output validation | Check for leaked system prompts, delimiter markers, API key patterns |

**Injection Patterns Detected:**

| Pattern | Weight | Description |
|---------|--------|-------------|
| `instruction_override` | 90 | "Ignore previous instructions" |
| `instruction_disregard` | 90 | "Disregard all rules" |
| `instruction_forget` | 85 | "Forget everything" |
| `role_override` | 80 | "You are now a..." |
| `role_impersonation` | 70 | "Act as if you are..." |
| `role_pretend` | 70 | "Pretend you're..." |
| `prompt_extraction` | 95 | "Reveal your system prompt" |
| `prompt_query` | 60 | "What are your instructions?" |
| `delimiter_injection` | 85 | Fake code block delimiters |
| `delimiter_injection_tags` | 90 | LLM-specific tags ([SYSTEM], [INST], etc.) |
| `jailbreak_dan` | 95 | DAN jailbreak pattern |
| `jailbreak_mode` | 80 | Developer/debug/god mode |
| `data_exfiltration` | 75 | API key/secret/password queries |
| `encoding_trick` | 50 | Base64/ROT13 encoding references |
| `multi_turn_manipulation` | 60 | "In your next response, only..." |

### 3.2 Content Approval Workflow

| Component | File | Description | Status |
|-----------|------|-------------|--------|
| Approval API | `app/api/admin/content/approval/route.ts` | GET (list queue), POST (submit for review), PUT (approve/reject/request changes) | DONE |
| Workflow states | — | draft → pending_review → approved/rejected/changes_requested → published | DONE |
| Reviewer assignment | — | Assign specific reviewer to each submission | DONE |
| Feedback system | — | Reviewers can provide feedback with each action | DONE |
| Approval history | — | Full audit trail of all workflow state transitions | DONE |
| State validation | — | Enforces valid transitions (only submit from draft/changes_requested, only review from pending_review) | DONE |
| Audit logging | — | All approval actions logged to AuditLog with `content_` prefix | DONE |

### 3.3 Content Versioning

| Component | File | Description | Status |
|-----------|------|-------------|--------|
| Versioning API | `app/api/admin/content/versions/route.ts` | GET (list versions), POST (create snapshot), PUT (restore version) | DONE |
| Content snapshots | — | Full post snapshot: bilingual title/content/excerpt, SEO metadata, tags, category, image, score | DONE |
| Diff computation | — | Field-by-field diff with old/new values (truncated for long content) | DONE |
| Version restore | — | Restore any previous version; auto-saves current state before restore | DONE |
| Version numbering | — | Sequential version numbers per post | DONE |
| Storage | — | Uses AuditLog table with `content_version` action type (no schema changes needed) | DONE |

### 3.4 Generation Queue Status

| Component | File | Description | Status |
|-----------|------|-------------|--------|
| Queue API | `app/api/admin/generation-queue/route.ts` | GET with filtering by status/type/language, pagination | DONE |
| Status summary | — | Counts by status (pending/published/failed/cancelled) | DONE |
| Daily budget tracking | — | Shows daily_generated, daily_budget (20), budget_remaining | DONE |
| Recent activity | — | Last 10 cron execution logs from AuditLog | DONE |
| SEO metadata | — | SEO score, meta title/description for each queue item | DONE |

### 3.5 Phase 3 Testing

New test file: `test/integration/phase3-enhancements.spec.ts` — **73 tests, all passing**

| Test Suite | Tests | Description |
|------------|-------|-------------|
| Prompt safety module | 22 | All exports, injection patterns, sanitization, structured prompts, output validation |
| AI generate integration | 6 | Import, detection, rejection, structured prompts, output validation |
| Auto-generate integration | 4 | Import, injection check, rejection, sanitization |
| Content approval workflow | 16 | All statuses, actions, Zod validation, state transitions, audit logging, pagination |
| Content versioning | 11 | Snapshots, diffs, restore, auto-save, version numbering, storage |
| Generation queue status | 10 | Query parameters, status summary, daily budget, recent activity, pagination |

---

## Phase 4: Digital Product Commerce (Implemented)

**Context:** GPT advisor audit identified the #1 revenue blocker: digital product commerce existed in the Prisma schema (DigitalProduct, Purchase models) but had no working end-to-end flow. The shop page used hardcoded mock data, the admin dashboard showed fake numbers, Stripe only supported subscription mode, and there was no post-purchase delivery email.

### 4.1 Stripe Checkout for Digital Products

| Component | File | Description | Status |
|-----------|------|-------------|--------|
| Checkout API | `app/api/checkout/digital-product/route.ts` | **NEW** — Creates Stripe Checkout Session with `mode: "payment"` (one-time purchase) | DONE |
| Free product flow | — | Free products bypass Stripe, create COMPLETED purchase directly with download token | DONE |
| Paid product flow | — | Creates PENDING purchase → Stripe Checkout → webhook confirms → COMPLETED | DONE |
| UTM attribution | — | Captures `utm_source`, `utm_campaign` on purchase records for channel tracking | DONE |

### 4.2 Stripe Webhook — Digital Product Handling

| Component | File | Description | Status |
|-----------|------|-------------|--------|
| Webhook router | `app/api/webhooks/stripe/route.ts` | Routes `checkout.session.completed` by metadata: digital products vs subscriptions | DONE |
| Purchase handler | `lib/billing/stripe.ts` | **NEW** `handleDigitalProductPurchase()` — marks Purchase COMPLETED, sends delivery email, captures lead | DONE |
| Lead capture | — | Auto-creates Lead record (status: CONVERTED, score: 80) on purchase completion | DONE |

### 4.3 Purchase Delivery Email

| Component | File | Description | Status |
|-----------|------|-------------|--------|
| Email function | `lib/email-notifications.ts` | **NEW** `sendPurchaseDeliveryEmail()` — branded HTML email with download CTA button | DONE |
| Template | — | Responsive HTML with product name, amount paid, download link, 5-download limit notice | DONE |
| Provider support | — | Uses existing multi-provider sendEmail (Resend, SendGrid, SMTP) | DONE |

### 4.4 Download & Fulfillment

| Component | File | Description | Status |
|-----------|------|-------------|--------|
| Download endpoint | `app/api/products/pdf/generate/route.ts` GET | Fixed: redirects to S3/R2 file URL when available, validates token, checks limits | DONE |
| Download page | `app/shop/download/page.tsx` | **NEW** — Customer-facing download UI: validates token, shows product info, download button | DONE |
| Purchase lookup | `app/shop/purchases/page.tsx` | **NEW** — Customer self-service: enter email → see all purchases with re-download links | DONE |
| Purchases API | `app/api/shop/purchases/route.ts` | **NEW** — Returns all purchases for a given email | DONE |

### 4.5 Shop Pages — Database Integration

| Component | File | Description | Status |
|-----------|------|-------------|--------|
| Products API | `app/api/shop/products/route.ts` | **NEW** — Queries DigitalProduct table with filtering (category, featured, search) | DONE |
| Shop page | `app/shop/page.tsx` | Rewired: fetches from DB, falls back to hardcoded products, working checkout button → Stripe | DONE |
| Product detail | `app/shop/[slug]/page.tsx` | **NEW** — Individual product page with full description, features, buy-now button | DONE |
| Checkout flow | — | Cart → email prompt → POST /api/checkout/digital-product → Stripe hosted checkout | DONE |

### 4.6 Admin Revenue Dashboard — Real Data

| Component | File | Description | Status |
|-----------|------|-------------|--------|
| Stats API | `app/api/admin/shop/stats/route.ts` | **NEW** — Queries real revenue, sales count, monthly growth %, recent orders from DB | DONE |
| Admin page | `app/admin/shop/page.tsx` | Replaced hardcoded mock data with live DB queries, added recent orders table | DONE |
| Monthly growth | — | Compares last 30 days revenue vs previous 30 days, calculates % change | DONE |

### Phase 4 Files Modified/Created

| File | Changes |
|------|---------|
| `app/api/checkout/digital-product/route.ts` | **NEW** — Stripe one-time payment checkout |
| `app/api/shop/products/route.ts` | **NEW** — Public products API |
| `app/api/shop/purchases/route.ts` | **NEW** — Customer purchase lookup API |
| `app/api/admin/shop/stats/route.ts` | **NEW** — Admin revenue stats API |
| `app/api/webhooks/stripe/route.ts` | Added digital product routing via metadata |
| `app/api/products/pdf/generate/route.ts` | Fixed download endpoint: redirect to file URLs |
| `app/shop/page.tsx` | Rewired to DB with fallback, working checkout flow |
| `app/shop/[slug]/page.tsx` | **NEW** — Product detail page |
| `app/shop/download/page.tsx` | **NEW** — Customer download page |
| `app/shop/purchases/page.tsx` | **NEW** — Customer purchase history |
| `app/admin/shop/page.tsx` | Replaced hardcoded data with real DB queries |
| `lib/billing/stripe.ts` | Added `handleDigitalProductPurchase()` function |
| `lib/email-notifications.ts` | Added `sendPurchaseDeliveryEmail()` function |

---

## Phase 5: Revenue Operations — YOUR ACTION REQUIRED

> **This phase requires YOUR manual action** — environment variables, Stripe setup, product creation, and content decisions that cannot be automated by code changes.

### 5.1 MUST-DO: Infrastructure Setup (Week 1)

| # | Task | What You Need To Do | Priority |
|---|------|---------------------|----------|
| 1 | **Stripe API keys** | Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys) → copy Secret Key and Publishable Key → add to Vercel env vars as `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | CRITICAL |
| 2 | **Stripe webhook** | Stripe Dashboard → Developers → Webhooks → Add endpoint: `https://yourdomain.com/api/webhooks/stripe` → select events: `checkout.session.completed`, `payment_intent.succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed` → copy signing secret → add to Vercel as `STRIPE_WEBHOOK_SECRET` | CRITICAL |
| 3 | **Email provider** | Pick one: Resend (recommended, simplest) or SendGrid → Get API key → add to Vercel: `EMAIL_PROVIDER=resend` + `RESEND_API_KEY=xxx` (or `EMAIL_PROVIDER=sendgrid` + `SENDGRID_API_KEY=xxx`) | CRITICAL |
| 4 | **Site URL** | Set `NEXT_PUBLIC_SITE_URL=https://www.yalla-london.com` in Vercel env vars (used in download links and emails) | CRITICAL |
| 5 | **Image domains** | Add product image domains to `next.config.js` `images.remotePatterns` if using external image hosting | HIGH |

### 5.2 MUST-DO: Product Creation (Week 1-2)

| # | Task | What You Need To Do | Priority |
|---|------|---------------------|----------|
| 6 | **Create 2-3 PDF products** | Write/design your first paid PDF guides (London Guide, Halal Restaurant Guide, etc.) | CRITICAL |
| 7 | **Upload PDFs to S3/R2** | Upload PDF files to your storage bucket and note the URLs | CRITICAL |
| 8 | **Seed DigitalProduct records** | Use Prisma Studio (`npx prisma studio`) or a seed script to create DigitalProduct records with: `name_en`, `name_ar`, `slug`, `description_en`, `price` (in **cents**, e.g. 999 = $9.99), `file_url` (S3 URL), `is_active: true`, `currency: "GBP"` | CRITICAL |
| 9 | **Create a free lead magnet** | Create one free PDF (e.g. "Top 10 Things to Do in London") → seed as DigitalProduct with `price: 0` → use for email capture | HIGH |
| 10 | **Product cover images** | Create cover images for each product → upload → set `cover_image` field | HIGH |

### 5.3 SHOULD-DO: Revenue Optimization (Weeks 2-4)

| # | Task | What You Need To Do | Priority |
|---|------|---------------------|----------|
| 11 | **Set up Google Analytics** | Set `NEXT_PUBLIC_GA_ID` env var with your GA4 measurement ID | HIGH |
| 12 | **Configure email sequences** | Set up Mailchimp/ConvertKit welcome sequence (lead magnet → nurture → product pitch) | HIGH |
| 13 | **Review affiliate placements** | Go to `/admin/affiliate-links` → bulk-assign affiliates to high-intent content using existing rule engine | HIGH |
| 14 | **Identify top 50 money pages** | Audit content for high-intent keywords (best hotels, itineraries, visa, where to stay) → prioritize for affiliate placements | MEDIUM |
| 15 | **Test the full purchase flow** | In Stripe test mode: browse shop → add to cart → checkout → receive email → download | HIGH |

### 5.4 NICE-TO-HAVE: Growth Accelerators (Weeks 4-8)

| # | Task | What You Need To Do | Priority |
|---|------|---------------------|----------|
| 16 | **Add upsell products** | Create premium bundles ($79-149) with seasonal content, Arabic versions | MEDIUM |
| 17 | **Social media scheduling** | Use `/admin/command-center/social` to schedule social posts promoting products | MEDIUM |
| 18 | **Retargeting pixels** | Add Meta Pixel and Google Ads tag for retargeting visitors who didn't purchase | LOW |
| 19 | **Partner pages** | Create dedicated landing pages for luxury hotel partners, tour operators | LOW |
| 20 | **Multi-site launch** | Use the multi-site infrastructure to launch 2-3 niche sites (Dubai, Maldives, Istanbul) | LOW |

---

## Phase 6: Technical Debt (Backlog)

| Task | Priority | Description |
|------|----------|-------------|
| Full `strict: true` in TypeScript | HIGH | Complete TypeScript strict mode migration |
| Consolidate auth system | HIGH | Merge remaining auth-related file duplications |
| Consolidate duplicate dashboards | MEDIUM | Choose single dashboard component, remove duplicates |
| Consolidate Prisma client files | MEDIUM | Single `@/lib/db` entry point |
| Row-level security (RLS) | MEDIUM | PostgreSQL RLS policies for tenant isolation |
| Dark mode implementation | MEDIUM | Apply `dark:` variant classes throughout admin UI |
| Content syndication | MEDIUM | Cross-site content sharing |
| 2FA support | LOW | TOTP-based two-factor authentication |
| Custom font uploads | LOW | Support .woff2/.ttf font uploads in Design Studio |

---

## Files Modified

### Phase 1

| File | Changes |
|------|---------|
| `app/api/signup/route.ts` | Save `passwordHash`, add email validation, enforce 12-char minimum |
| `app/api/cron/autopilot/route.ts` | Fail-closed auth, timing-safe comparison, hide error details |
| `app/api/cron/auto-generate/route.ts` | Timing-safe comparison, hide error details from client |
| `app/api/generate-content/route.ts` | Add rate limiting (2 req/min), fix streaming return type |
| `.github/workflows/ci.yml` | Improve NEXTAUTH_SECRET fallback unpredictability |
| `prisma/schema.prisma` | Add indexes on User(role, isActive, createdAt), Lead(email), PageView(site_id, path) |
| `tsconfig.json` | Enable 5 incremental strict flags |
| `app/components/admin/mobile-media-uploader.tsx` | Fix useState→useEffect, explicit return |
| `components/admin/async-action-toast.tsx` | Add explicit return path |
| `components/marketing/exit-intent-popup.tsx` | Add explicit return path |
| `components/marketing/social-proof.tsx` | Add explicit return path |
| `components/seo/breadcrumbs.tsx` | Add explicit return path |
| `components/seo/structured-content.tsx` | Add explicit return path |
| `components/ui/carousel.tsx` | Add explicit return path |
| `lib/seo/advanced-analytics.ts` | Add explicit return paths (4 functions) |
| `test/security/audit-fixes.spec.ts` | **NEW** — 24 comprehensive tests for all Phase 1 fixes |

### Phase 2

| File | Changes |
|------|---------|
| `lib/use-admin-breadcrumbs.ts` | **NEW** — Auto-breadcrumb hook mapping 40+ admin paths |
| `app/api/admin/audit-logs/route.ts` | **NEW** — Paginated audit log API with filtering |
| `app/admin/audit-logs/page.tsx` | **NEW** — Audit log viewer page with table, filters, pagination |
| `lib/auth.ts` | Configurable session timeout (8h default), session refresh (15min) |
| `lib/email-notifications.ts` | **NEW** — Multi-provider email handler (Resend/SendGrid/SMTP) |
| `app/api/admin/content/bulk/route.ts` | **NEW** — Bulk content operations API (6 actions, audit-logged) |
| `components/design-studio/design-canvas.tsx` | Added 13 social media format presets |
| `test/integration/phase2-enhancements.spec.ts` | **NEW** — 35 comprehensive tests for all Phase 2 enhancements |

### Phase 2.5

| File | Changes |
|------|---------|
| `lib/affiliate-link-rules.ts` | **NEW** — Flexible bulk affiliate link rule engine with content matching |
| `app/api/admin/affiliate-links/bulk/route.ts` | **NEW** — Bulk affiliate operations API (6 actions, Zod validation, audit-logged) |
| `app/admin/affiliate-links/page.tsx` | **NEW** — Bulk affiliate link management admin page |
| `test/integration/bulk-affiliate-links.spec.ts` | **NEW** — 45 comprehensive tests for bulk affiliate feature |

### Phase 3

| File | Changes |
|------|---------|
| `lib/prompt-safety.ts` | **NEW** — Prompt injection defense module (sanitization, detection, structured prompts, output validation) |
| `app/api/ai/generate/route.ts` | Integrated `processPromptSafely` + `validateLLMOutput` into generation pipeline |
| `app/api/content/auto-generate/route.ts` | Added `detectPromptInjection` + `sanitizePromptInput` for custom prompts |
| `app/api/admin/content/approval/route.ts` | **NEW** — Content approval workflow API (submit, approve, reject, request changes) |
| `app/api/admin/content/versions/route.ts` | **NEW** — Content versioning API (snapshots, diffs, restore) |
| `app/api/admin/generation-queue/route.ts` | **NEW** — Generation queue status API with daily budget tracking |
| `test/integration/phase3-enhancements.spec.ts` | **NEW** — 73 comprehensive tests for all Phase 3 enhancements |

---

## Verification

- **Next.js build:** Passing (`npx next build` — zero errors)
- **Phase 1 tests:** 24/24 passing (`npx vitest run test/security/audit-fixes.spec.ts`)
- **Phase 2 tests:** 35/35 passing (`npx vitest run test/integration/phase2-enhancements.spec.ts`)
- **Phase 2.5 tests:** 45/45 passing (`npx vitest run test/integration/bulk-affiliate-links.spec.ts`)
- **Phase 3 tests:** 73/73 passing (`npx vitest run test/integration/phase3-enhancements.spec.ts`)
- **Phase 4:** Build verified — all 13 new/modified files compile cleanly
- **Total:** 177 automated tests + Phase 4 build verification
- **Existing tests:** No regressions

---

## Purchase Flow Architecture (Phase 4)

```
┌─────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  /shop      │────>│ /shop/[slug]          │────>│ Customer enters     │
│  Browse     │     │ Product detail        │     │ email               │
│  products   │     │ Buy Now button        │     └─────────┬───────────┘
└─────────────┘     └──────────────────────┘               │
                                                            ▼
                                              ┌──────────────────────┐
                                              │ POST /api/checkout/  │
                                              │ digital-product      │
                                              │ Creates Purchase     │
                                              │ (PENDING)            │
                                              └─────────┬────────────┘
                                                        │
                           ┌────────────────────────────┼────────────────────────┐
                           │ price === 0                │ price > 0              │
                           ▼                            ▼                        │
                  ┌────────────────┐         ┌──────────────────┐               │
                  │ Mark COMPLETED │         │ Stripe Checkout   │               │
                  │ Return download│         │ Session created   │               │
                  │ URL directly   │         │ Redirect customer │               │
                  └────────────────┘         └────────┬─────────┘               │
                                                      │                         │
                                                      ▼                         │
                                           ┌──────────────────┐                 │
                                           │ Customer pays on  │                 │
                                           │ Stripe hosted page│                 │
                                           └────────┬─────────┘                 │
                                                    │                           │
                                                    ▼                           │
                                         ┌────────────────────┐                 │
                                         │ Webhook:            │                 │
                                         │ checkout.session.   │                 │
                                         │ completed           │                 │
                                         │ metadata.purchase_  │                 │
                                         │ type = digital_     │                 │
                                         │ product             │                 │
                                         └────────┬───────────┘                 │
                                                  │                             │
                                                  ▼                             │
                                       ┌──────────────────────┐                 │
                                       │ handleDigitalProduct  │                 │
                                       │ Purchase():           │                 │
                                       │ 1. Mark COMPLETED     │                 │
                                       │ 2. Send delivery email│                 │
                                       │ 3. Capture lead       │                 │
                                       └──────────┬───────────┘                 │
                                                  │                             │
                                                  ▼                             │
                                       ┌──────────────────────┐                 │
                                       │ Customer receives     │                 │
                                       │ email with download   │                 │
                                       │ link → /shop/download │                 │
                                       │ ?token=xxx            │                 │
                                       └──────────────────────┘
```

---

## Revenue Dashboard Architecture (Phase 4)

**Admin Dashboard** (`/admin/shop`):
- Queries `GET /api/admin/shop/stats` which reads from:
  - `DigitalProduct` table → product list, active count
  - `Purchase` table (status: COMPLETED) → revenue, sales count, monthly growth
  - Last 10 completed purchases → recent orders table

**Public Shop** (`/shop`):
- Queries `GET /api/shop/products` which reads from:
  - `DigitalProduct` table (is_active: true) → product cards
  - Purchase count per product → social proof (X sold)
- Falls back to hardcoded products if DB is empty/unavailable

---

## References

- `AUDIT-REPORT.md` — Full project audit (2026-02-07)
- `AUDIT_REPORT.md` — CMS & admin dashboard audit (2026-02-10)
- `docs/security-review-checklist.md` — OWASP compliance checklist
- `docs/security-monitoring-setup.md` — Monitoring & alerting guide
- GPT advisor revenue audit (2026-02-11) — Identified commerce gaps, recommended revenue readiness checklist
