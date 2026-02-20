# Design System Overhaul — Development Plan

**Date:** February 20, 2026
**Status:** In Progress
**Branch:** `claude/audit-design-features-o62v0`

## Mission

Transform disconnected, partially-built design tools into a **unified, production-ready Design System** that creates, edits, persists, and distributes visual content across all 5 websites.

---

## Phase 1: Fix Critical Breakages

### 1.1 — Prisma Models (DONE)
- [x] Added 8 new models to `prisma/schema.prisma`:
  - `Design` — Canvas designs (social graphics, headers, covers)
  - `PdfGuide` — Generated travel PDF guides
  - `PdfDownload` — PDF download tracking for analytics
  - `EmailTemplate` — Reusable email templates
  - `EmailCampaign` — Email campaigns with stats
  - `VideoProject` — Video compositions (Remotion-based)
  - `ContentPipeline` — AI content engine pipeline runs
  - `ContentPerformance` — Performance tracking for pipeline outputs
- [x] Created migration SQL: `prisma/migrations/20260220170000_add_design_system_models/migration.sql`
- [x] Generated Prisma client with new models

### 1.2 — Puppeteer PDF Generation (DONE)
- [x] Created `lib/pdf/html-to-pdf.ts` — HTML → PDF buffer via Puppeteer
- [x] Exports `generatePdfFromHtml()` with format, landscape, margin options
- [x] Exports `generatePdfAndUpload()` helper
- [x] Retry logic and 30s timeout included

### 1.3 — Design Persistence (DONE)
- [x] Created `api/admin/designs/route.ts` — CRUD for designs (GET, POST, PATCH, DELETE)
- [x] Created `api/admin/designs/[id]/route.ts` — Single design operations
- [x] Supports filtering by site, type, status, isTemplate
- [x] Pagination support
- [x] All routes protected with requireAdmin

### 1.4 — NPM Packages Installed (DONE)
- [x] juice (CSS inlining for emails)
- [x] qrcode (QR code generation)
- [x] jszip (ZIP file generation)
- [x] @tiptap/react + extensions (rich text editor)
- [x] unsplash-js (free stock images)
- [x] @remotion/bundler (video bundling)
- [x] @types/nodemailer (email types)

---

## Phase 2: Connect the Ecosystem

### 2.1 — Unified Brand Provider (DONE)
- [x] Created `lib/design/brand-provider.ts`
- [x] `getBrandProfile(siteId)` merges config/sites.ts + destination-themes.ts
- [x] `getAllBrandProfiles()` returns all sites
- [x] Returns colors, fonts, logo, social, designTokens

### 2.2 — Unified Media Picker (DONE)
- [x] Created `components/shared/media-picker.tsx`
- [x] 3 tabs: Media Library, Upload New, Unsplash
- [x] Drag-drop upload via react-dropzone
- [x] Unsplash search (requires NEXT_PUBLIC_UNSPLASH_ACCESS_KEY)
- [x] Returns selected URL + metadata to calling component

### 2.3 — Brand Context Provider (IN PROGRESS)
- [ ] `components/shared/brand-context.tsx` — React context + useBrand() hook

### 2.4 — Design Distribution Pipeline (DONE)
- [x] Created `lib/design/distribution.ts`
- [x] `distributeDesign(designId, targets)` — routes designs to social/email/blog/pdf/homepage
- [x] Supports 6 target types

### 2.5 — SVG Exporter (IN PROGRESS)
- [ ] `lib/design/svg-exporter.ts` — Konva → SVG conversion

---

## Phase 3: Build Missing Core Tools

### 3.1 — Email System (DONE)
- [x] `lib/email/renderer.ts` — Block JSON → email-safe HTML (table layout, inline styles)
- [x] `lib/email/sender.ts` — Multi-provider email sending (SMTP, Resend, SendGrid)
- [x] Email builder component (IN PROGRESS)
- [ ] Email templates API routes
- [ ] Email campaigns API routes + send endpoint

### 3.2 — Video System (IN PROGRESS)
- [ ] `lib/video/prompt-to-video.ts` — AI prompt → Remotion composition
- [ ] `lib/video/render-engine.ts` — Server-side MP4 rendering
- [ ] `lib/video/video-templates/destination-highlight.tsx`
- [ ] `lib/video/video-templates/hotel-showcase.tsx`
- [ ] Video studio render API route

### 3.3 — PDF System Enhancement (IN PROGRESS)
- [x] `lib/pdf/html-to-pdf.ts` created
- [ ] Fix 3 broken PDF API routes to use new PdfGuide model
- [ ] Wire PDF engine with S3 upload

---

## Phase 4: Enhance Existing Tools

### 4.1 — Design Studio Enhancements
- [ ] Social post Quick Create presets (Instagram, Twitter, LinkedIn, TikTok sizes)
- [ ] Layer management drag-to-reorder
- [ ] SVG export
- [ ] QR code generation
- [ ] MediaPicker integration for image insertion

### 4.2 — Article Editor (IN PROGRESS)
- [ ] `components/admin/tiptap-editor.tsx` — Tiptap rich text editor

### 4.3 — Homepage Builder Modules (IN PROGRESS)
- [ ] Testimonials module
- [ ] Image gallery module
- [ ] Video hero module
- [ ] CTA banner module
- [ ] Stats counter module

---

## Phase 5: AI Content Engine

### 5.1 — Agent 1: Researcher (DONE)
- [x] `lib/content-engine/researcher.ts`
- [x] Trend discovery, audience analysis, keyword mining, competitor audit
- [x] AI-powered with fallback mock data

### 5.2 — Agent 2: Ideator (DONE)
- [x] `lib/content-engine/ideator.ts`
- [x] Topic → multi-angle content ideas with cross-platform maps
- [x] 7-day content calendar generation

### 5.3 — Agent 3: Scripter (IN PROGRESS)
- [ ] `lib/content-engine/scripter.ts`
- [ ] Platform-specific scripts + asset generation

### 5.4 — Agent 4: Analyst (IN PROGRESS)
- [ ] `lib/content-engine/analyst.ts`
- [ ] Performance grading, pattern recognition, feed-forward recommendations

### 5.5 — Content Engine API Routes (IN PROGRESS)
- [x] Pipeline CRUD routes
- [x] Research route
- [ ] Ideate, Script, Analyze, Publish routes
- [ ] Performance tracking routes

---

## Phase 6: Admin Pages

### 6.1 — Design Hub Dashboard (IN PROGRESS)
- [ ] `/admin/design/page.tsx` — Quick Create, Recent Designs, Brand Status, Asset Stats

### 6.2 — Content Engine Page (IN PROGRESS)
- [ ] `/admin/content-engine/page.tsx` — Pipeline visualization, history, quick actions

### 6.3 — Email Campaigns Page (IN PROGRESS)
- [ ] `/admin/email-campaigns/page.tsx` — Templates, Campaigns, Sent tabs

### 6.4 — Social Calendar Page (IN PROGRESS)
- [ ] `/admin/social-calendar/page.tsx` — Week/Month view, Publish Assistant

---

## Phase 7: Infrastructure & Polish

### 7.1 — Brand Kit Generation (IN PROGRESS)
- [ ] `lib/design/brand-kit-generator.ts` — Color palettes, typography, logo SVGs
- [ ] ZIP export via jszip
- [ ] Brand kit API route

### 7.2 — Social Scheduler (IN PROGRESS)
- [ ] `lib/social/scheduler.ts` — Auto-publish and manual publish assistant

---

## Testing Protocol

After all development:
1. **Audit** — Check all files for TypeScript errors, missing imports, broken references
2. **Connectivity** — Verify all API routes are accessible, all imports resolve
3. **Functionality** — Trace data flow end-to-end (create → save → load → distribute)
4. **Fix** — Resolve all found issues
5. **Log** — Document all issues found and fixed
6. **Push** — Commit and push to branch
7. **Repeat** — Deeper audit until 100% functional

---

## Files Created

### Library Files
| File | Purpose | Status |
|------|---------|--------|
| `lib/design/brand-provider.ts` | Unified brand data access | Done |
| `lib/design/distribution.ts` | Design-to-destination pipeline | Done |
| `lib/design/svg-exporter.ts` | Konva → SVG conversion | In Progress |
| `lib/design/brand-kit-generator.ts` | Brand kit ZIP generation | In Progress |
| `lib/pdf/html-to-pdf.ts` | Puppeteer HTML → PDF | Done |
| `lib/email/renderer.ts` | Block JSON → email HTML | Done |
| `lib/email/sender.ts` | Multi-provider email sending | Done |
| `lib/video/prompt-to-video.ts` | AI → Remotion composition | In Progress |
| `lib/video/render-engine.ts` | Server-side MP4 rendering | In Progress |
| `lib/video/video-templates/*.tsx` | Pre-built video templates | In Progress |
| `lib/content-engine/researcher.ts` | Agent 1: Trend discovery | Done |
| `lib/content-engine/ideator.ts` | Agent 2: Content angles | Done |
| `lib/content-engine/scripter.ts` | Agent 3: Platform scripts | In Progress |
| `lib/content-engine/analyst.ts` | Agent 4: Performance analysis | In Progress |
| `lib/social/scheduler.ts` | Social post scheduling | In Progress |

### Component Files
| File | Purpose | Status |
|------|---------|--------|
| `components/shared/media-picker.tsx` | Unified media selection modal | Done |
| `components/shared/brand-context.tsx` | Brand React context + hook | In Progress |
| `components/admin/email-builder/*.tsx` | Email template builder | In Progress |
| `components/admin/tiptap-editor.tsx` | Rich text article editor | In Progress |
| `components/admin/homepage-builder/modules/*.tsx` | New homepage modules | In Progress |

### API Routes
| File | Purpose | Status |
|------|---------|--------|
| `api/admin/designs/route.ts` | Design CRUD | Done |
| `api/admin/designs/[id]/route.ts` | Single design ops | Done |
| `api/admin/email-templates/route.ts` | Email template CRUD | In Progress |
| `api/admin/email-campaigns/route.ts` | Campaign CRUD | In Progress |
| `api/admin/email-campaigns/send/route.ts` | Send campaigns | In Progress |
| `api/admin/video-studio/render/route.ts` | Video rendering | In Progress |
| `api/admin/brand-kit/route.ts` | Brand kit download | In Progress |
| `api/admin/content-engine/pipeline/route.ts` | Pipeline CRUD | Done |
| `api/admin/content-engine/research/route.ts` | Run researcher | Done |
| `api/admin/content-engine/ideate/route.ts` | Run ideator | In Progress |
| `api/admin/content-engine/script/route.ts` | Run scripter | In Progress |
| `api/admin/content-engine/analyze/route.ts` | Run analyst | In Progress |
| `api/admin/content-engine/publish/route.ts` | Execute publish | In Progress |
| `api/admin/content-engine/performance/route.ts` | Performance data | In Progress |

### Admin Pages
| File | Purpose | Status |
|------|---------|--------|
| `app/admin/design/page.tsx` | Design Hub dashboard | In Progress |
| `app/admin/content-engine/page.tsx` | Content Engine command center | In Progress |
| `app/admin/email-campaigns/page.tsx` | Email campaign manager | In Progress |
| `app/admin/social-calendar/page.tsx` | Social media calendar | In Progress |

### Schema & Migration
| File | Purpose | Status |
|------|---------|--------|
| `prisma/schema.prisma` | 8 new models added | Done |
| `prisma/migrations/20260220170000_*/migration.sql` | Migration SQL | Done |
