# Admin System Upgrade Plan — March 31, 2026

**Status:** In Progress
**Branch:** `claude/admin-system-upgrade-eoubN`
**Scope:** 8 phases covering design system, affiliate HQ, public SEO audit, website builder, Kaspo B2B, Canva MCP, storage safety, and notifications

---

## Pre-Implementation Audit Findings

### What Already Exists (No Work Needed)
- **Phase 1B (Component Library):** `admin-ui.tsx` already exports: `ConfirmModal`, `useConfirm`, `AdminToast`, `AdminSkeletonLoader`, `AdminProgressBar`, `AdminEmptyState`, `AdminStatusBadge`, `AdminKPICard`, `AdminCard`, `AdminPageHeader`, `AdminSectionLabel`, `AdminButton`, `AdminLoadingState`, `AdminAlertBanner`, `AdminTabs`
- **Phase 1C (Admin Layout):** `MophyAdminLayout` with 15-section sidebar (120+ navigation items) already built
- **Phase 1D (Admin Landing):** `/admin` already redirects to `/admin/cockpit` (mission control)
- **Phase 2A (Replace window.confirm):** `useConfirm` hook already used in 21+ files across the admin

### What Needs Building
| Phase | Feature | Priority | Status |
|-------|---------|----------|--------|
| 7A | Safe Storage Utility (`lib/safe-storage.ts`) | P0 | DONE |
| 1A | CSS Variable Token System | P1 | DONE |
| 3A | Public SEO Audit Tool (`/tools/seo-audit`) | P1 | DONE |
| 8 | Notification System (API + bell icon) | P1 | DONE |
| 5A | Kaspo B2B Admin Section | P2 | DONE |
| 1A+ | CSS variable migration (remaining hardcoded values) | P2 | PARTIAL (core components done) |
| 7B | Replace direct sessionStorage calls | P2 | DONE (already migrated) |
| 2B | Affiliate HQ Revenue Attribution Table | P3 | DONE |
| 2C | Affiliate HQ Link Health Monitor | P3 | DONE |
| 2D | Affiliate HQ Rollback Mechanism | P3 | DONE |
| 3B | Admin Audit Drill-Down Enhancement | P3 | DONE |
| 4A | Website Builder Visual Preview | P3 | DONE |
| 4B | Block Template Library | P3 | DONE |
| 4C | SEO Metadata Editor | P3 | TODO |
| 5B | B2B Content Tagging | P3 | TODO |
| 5C | Kaspo Intelligence Widget | P3 | TODO |
| 6A | Canva Service Layer | P3 | TODO |
| 6B | Auto-Asset Generation Pipeline | P3 | TODO |
| 6C | Publish Pipeline Orchestration | P3 | TODO |

---

## Phase 1: Design System Foundation

### 1A — CSS Variable Token System
Create CSS custom properties in globals.css for admin theming:
- `--admin-bg`, `--admin-surface`, `--admin-border`, `--admin-text`, `--admin-text-muted`
- `--admin-primary` (#C8322B), `--admin-success` (#2D5A3D), `--admin-warning` (#C49A2A), `--admin-error`, `--admin-info` (#3B7EA1)
- Light mode values matching existing stone/warm palette (`bg-[#FAF8F4]` = `--admin-bg`)
- Dark mode under `[data-theme="dark"]` selector
- Replace ALL hardcoded `bg-[#FAF8F4]`, `text-stone-700`, `border-stone-200` with CSS variables

### 1B — Component Library: ALREADY DONE
All 15 components exist in `components/admin/admin-ui.tsx`.

### 1C — Admin Layout: ALREADY DONE
`MophyAdminLayout` with 15-section sidebar exists.

### 1D — Admin Root: ALREADY DONE
Redirects to `/admin/cockpit`.

---

## Phase 2: Affiliate HQ Overhaul

### 2A — Replace window.confirm: ALREADY DONE
`useConfirm` hook used in 21+ files.

### 2B — Revenue Attribution Table
Add "Performance" tab to Affiliate HQ with sortable revenue data per program.

### 2C — Link Health Monitor
Add "Link Health" tab showing URL status (active/redirect/dead) with re-check and replace actions.

### 2D — Rollback Mechanism
Auto-snapshot before injection, 24h undo capability.

---

## Phase 3: Public SEO Audit Tool

### 3A — Public Audit Page
New public page at `/tools/seo-audit` (no auth required):
- URL input field for any website
- Composite score (0-100) with animated circular progress
- Letter grade (A/B/C/D/F) with color coding
- Four sub-scores: Technical, Content, Performance, Links
- Issues list grouped by severity (Critical/Warning/Info)
- "Export PDF Report" button
- Lead capture: "Want monthly monitoring?" email signup

### 3B — Admin Audit Drill-Down
Enhance Intelligence page Audit tab with sub-score breakdown, category filters, sort controls, historical comparison.

---

## Phase 4: Website Builder Enhancement

### 4A — Visual Preview Panel
Right-side iframe preview in site-control with mobile/desktop toggle.

### 4B — Block Template Library
12 pre-built block templates (Hero, Destination Grid, Testimonials, etc.).

### 4C — SEO Metadata Editor
Page Title, Meta Description, OG Image, Canonical URL, SERP preview.

### 4D — Consolidate Duplicate Routes
Redirect `/admin/site` and `/admin/sites` to `/admin/site-control`.

---

## Phase 5: Kaspo B2B Layer

### 5A — Kaspo Admin Section
New `/admin/kaspo` with: agent overview, agent table, invite button, content access settings.

### 5B — B2B Content Tagging
Add "Visibility" field (Public / Kaspo Only / Both) to article editor.

### 5C — Kaspo Intelligence Widget
KPI section in Intelligence page: Active Agents, PDF Downloads, Top Guide, New Signups.

---

## Phase 6: Canva MCP Integration

### 6A — Canva Service Layer
`lib/canva-mcp.ts` wrapper for createDesign, exportDesign, listTemplates, duplicateDesign.

### 6B — Auto-Asset Generation Pipeline
Admin page for bulk asset generation from articles using Canva templates.

### 6C — Publish Pipeline Orchestration
Unified publish action: CMS → GSC → affiliates → Canva → social → email.

---

## Phase 7: sessionStorage Safety

### 7A — Safe Storage Utilities: DONE
Created `lib/safe-storage.ts` with session/local storage wrappers + JSON helpers.

### 7B — Replace Direct Calls
Replace all direct `sessionStorage`/`localStorage` calls with safe-storage utilities.

---

## Phase 8: Notification System

### 8A — Global Notification Provider
Bell icon in admin header with unread badge, slide-over panel, mark as read.

### 8B — Notification API
`/api/admin/notifications` — GET (unread), POST (create), PATCH (mark read).
Types: cron failure, bulk op error, GSC alert, Kaspo signup, affiliate health.

---

## Implementation Notes
- NO `window.confirm()`, `window.prompt()`, or `window.alert()` anywhere in admin
- All API calls must include `res.ok` guards
- All storage calls use safe-storage utilities
- All new pages use AdminKPICard / AdminCard component system
- All destructive actions use ConfirmModal
- All empty states use AdminEmptyState
- Build must pass before every push (`npx tsc --noEmit`)

---

## Execution Log

### Phase 7A — Safe Storage Utility (March 31, 2026)
- Created `lib/safe-storage.ts` with 8 functions: safeSessionGet/Set/Remove, safeLocalGet/Set/Remove, safeSessionGetJSON/SetJSON, safeLocalGetJSON/SetJSON
- SSR-safe (checks `typeof window`), catches quota/restriction errors silently

### Phase 1A — CSS Variable Token System (March 31, 2026)
- Added hover variants (`--admin-red-hover`, `--admin-green-hover`, `--admin-gold-hover`, `--admin-blue-hover`) to globals.css
- Added status badge semantic tokens (`--status-green-bg`, `--status-gold-bg/text`, `--status-blue-bg/text`, `--status-red-bg/text`, `--status-purple/bg/text`)
- Updated `--admin-shadow-sm` and `--admin-shadow-lg` with compound shadow values
- Added complete `[data-theme="dark"]` block with all admin + status variables for dark mode
- Migrated `admin-ui.tsx` — highest-leverage file propagating to all admin consumers:
  - `accentBorders` map: 4 hardcoded hex → CSS vars
  - `AdminCard` border + shadows → CSS vars
  - All 16 `STATUS_CONFIG` entries → status semantic tokens
  - `AdminKPICard` border/shadow/trend colors → CSS vars
  - `VARIANT_CLASSES` button variants → CSS vars
  - `AdminLoadingState` spinner → CSS var
  - `ALERT_CONFIG` all 3 severities → CSS vars
  - `AdminTabs` active state → CSS vars
  - `ConfirmModal` dialog border → CSS var

### Phase 3A — Public SEO Audit Tool (March 31, 2026)
- Created `app/tools/seo-audit/page.tsx` (843 lines) — public lead-gen page (no auth)
  - URL input + "Run Audit" button
  - Animated circular progress ring (SVG) with composite score 0-100
  - Letter grade (A/B/C/D/F) with color coding
  - 4 sub-scores with progress bars: Technical, Content, Performance, Links
  - Issues grouped by severity (Critical/Warning/Info) with expandable details
  - Lead capture: email signup for monthly monitoring
- Created `app/api/tools/seo-audit/route.ts` (496 lines) — real lightweight audit
  - Fetches URL with 10s timeout, checks meta tags, headings, word count, schema, robots.txt
  - Returns structured scores + issues
- Created `app/tools/seo-audit/layout.tsx` — SEO metadata (title, description, OG)

### Phase 8 — Notification System (March 31, 2026)
- Created `lib/integrations/notifications.ts` (245 lines) — notification service
  - Types: cron failure, bulk op error, GSC alert, Kaspo signup, affiliate health
  - `createNotification()`, `getUnreadNotifications()`, `markAsRead()`, `markAllAsRead()`
- Created `app/api/admin/notifications/route.ts` (430 lines) — full CRUD API
  - GET: unread notifications with pagination
  - POST: create notification
  - PATCH: mark as read / mark all as read
- Created `components/admin/notification-bell.tsx` (461 lines) — bell icon + slide-over panel
  - Unread count badge, slide-over panel with notification list
  - Mark as read, dismiss, click-to-navigate actions
  - Auto-refresh via polling
  - Integrated into `MophyAdminLayout` header

### Phase 2B — Revenue Attribution Table (March 31, 2026)
- Added "Performance" tab to Affiliate HQ with sortable revenue data per program
- Revenue KPI cards: total commission, clicks, EPC, conversion rate (30-day window)
- Per-advertiser table with commission, clicks, CTR, average order value
- Top articles by affiliate clicks with revenue attribution
- 30-day sparkline chart for revenue trend visualization

### Phase 2C — Link Health Monitor (March 31, 2026)
- Added "Link Health" tab to Affiliate HQ showing URL status per affiliate link
- Per-link rows: URL, partner, status (active/redirect/dead), last checked, clicks
- "Run Health Audit" button in Actions tab — 6-check audit per link (liveness, tracking, relevance, freshness, SID attribution, partner detection)
- Audit results panel with per-link issue list and severity badges (critical/warning/info)
- Copy Full JSON + Show Full Report buttons for diagnostics

### Phase 2D — Rollback Mechanism (March 31, 2026)
- Created `lib/affiliate/snapshot.ts` — auto-snapshot service using AuditLog table
  - `createSnapshot()` saves content_en/content_ar before affiliate injection
  - `listSnapshots()` returns non-expired snapshots (24h TTL) with cronRunId grouping
  - `restoreSnapshot()` restores single article content from snapshot
  - `restoreCronRunSnapshots()` bulk-restores all articles from a specific injection run
  - `cleanExpiredSnapshots()` removes expired snapshots
- Modified `affiliate-injection/route.ts` to call `createSnapshot()` before each injection with cronRunId
- Added 3 API actions to `affiliate-hq/route.ts`: `list_snapshots`, `restore_snapshot`, `restore_cron_run`
- Added Rollback UI panel in Affiliate HQ Actions tab:
  - "Load Snapshots" button fetches available rollback points
  - Batch rollback grouped by cronRunId (undo entire injection run)
  - Per-article snapshot list with title, slug, partners, expiry countdown
  - All destructive actions go through ConfirmModal
  - Status messages with success/error coloring

### Phase 5A — Kaspo B2B Admin Section (March 31, 2026)
- Created `app/admin/kaspo/page.tsx` (968 lines) — full B2B agent management page
  - 3 tabs: Agents, Content Access, Activity
  - KPI cards: Active Agents, PDF Downloads, Top Guide, New This Month
  - Agent table with desktop/mobile views, status badges, actions (Activate/Suspend/Reset)
  - Invite Agent modal with email, name, company fields
  - Content Access tab: 6 toggles (guides, hotel reviews, restaurant guides, event calendar, exclusive deals, custom itineraries)
  - Activity feed with per-type icons and timestamps
  - Uses admin-ui components throughout, CSS variables, `res.ok` guards
- Created `app/api/admin/kaspo/route.ts` (385 lines) — CRUD API
  - GET: agents, KPIs, contentAccessSettings, activityFeed
  - POST: invite_agent, update_status, update_access
  - Uses Lead model with `lead_source = "kaspo"` as agent proxy
  - SiteSettings for content access persistence
  - Protected with `requireAdmin`
- Added "Kaspo B2B" link to sidebar navigation in `premium-admin-nav.tsx` under Commerce section

### Phase 1A+ — CSS Variable Migration: Core Components (March 31, 2026)
- Migrated 5 highest-leverage shared component files (propagate CSS vars to all admin consumers):
  - `admin-ui.tsx` — 22 stone-class replacements + AdminProgressBar default color `#C8322B` → `var(--admin-red)`
  - `CommandCenter.tsx` — all hardcoded hex/stone classes → CSS variables
  - `RichArticleList.tsx` — all hardcoded hex/stone classes → CSS variables
  - `notification-bell.tsx` — all hardcoded hex/stone classes → CSS variables
  - `pdf-workshop.tsx` — 18 replacements + Cover Design section `#FAF8F4`/`#D6D0C4` → `var(--admin-bg)`/`var(--admin-border)`
- Mapping applied: `#C8322B` → `var(--admin-red)`, `#2D5A3D` → `var(--admin-green)`, `#C49A2A` → `var(--admin-gold)`, `#3B7EA1` → `var(--admin-blue)`, `#FAF8F4` → `var(--admin-bg)`, `#D6D0C4` → `var(--admin-border)`, `text-stone-700` → `text-[var(--admin-text)]`, `text-stone-500/600` → `text-[var(--admin-text-muted)]`, `border-stone-200` → `border-[var(--admin-border)]`
- Remaining: ~1,526 occurrences across 91 admin page files — tracked for incremental migration

### Phase 7B — Replace Direct sessionStorage/localStorage Calls (March 31, 2026)
- Audit confirmed: ALL direct `sessionStorage`/`localStorage` calls already routed through `lib/safe-storage.ts`
- 8 consumer files verified using `safeLocal*`/`safeSession*` imports: premium-admin-nav.tsx, theme/page.tsx, global-search.tsx, cookie-consent-banner.tsx, language-provider.tsx, site-provider.tsx, exit-intent-popup.tsx, intelligence/page.tsx
- Zero bare `localStorage.getItem/setItem/removeItem` or `sessionStorage.*` calls found outside safe-storage.ts
- Phase was already completed by prior sessions — marked DONE

### Phase 3B — Admin Audit Drill-Down Enhancement (March 31, 2026)
- Enhanced Intelligence page Audit tab (`app/admin/intelligence/page.tsx`) with full drill-down capabilities:
  - Overall Score/Grade/Total Issues KPI cards from aggregated report data
  - 6 sub-score breakdown cards (SEO Audit, Discovery, Indexing, Content Velocity, Operations, Public Website) with progress bars color-coded by threshold (green ≥80, gold ≥50, red <50) and weight percentages
  - Severity filter dropdown (All/Critical/High/Medium/Low)
  - Category filter dropdown (dynamically populated from unique issue categories)
  - Sort controls (by severity/category/title) with active state highlighting
  - Enhanced issue list with AdminStatusBadge, category tag, title, detail, rootCause, fixAction, and copy-to-clipboard
  - Show all / Collapse toggle for issue lists exceeding 15 items
  - Historical comparison section with trend delta display (score change + findings change with TrendingUp/TrendingDown icons)
  - History table with Date, Score (color-coded), Findings, C/H/M/L breakdown, Trigger columns
  - Refresh history button with loading state
- Created `app/api/admin/audit-history/route.ts` — GET endpoint returning historical SeoAuditReport records
  - Fields: id, healthScore, totalFindings, criticalCount, highCount, mediumCount, lowCount, summary, triggeredBy, createdAt
  - Protected with `requireAdmin`, uses `getDefaultSiteId()` fallback, configurable limit (max 50)
- Fixed bug: old code referenced `auditResult.synthesizedIssues` but aggregated-report API returns `issues`
- Uses CSS variable design system throughout, all API calls have `res.ok` guards, AdminEmptyState for empty data

### Phase 4A — Website Builder Visual Preview (March 31, 2026)
- Enhanced `app/admin/site-control/page.tsx` with right-side iframe preview panel
  - Preview toggle button with CSS variable styling (`var(--admin-red)` when active)
  - Device selector: Desktop (50% width), Tablet (768px), Mobile (375px) with Monitor/Tablet/Smartphone icons
  - Refresh button increments `previewKey` to force iframe remount
  - Browser chrome header with traffic light dots, URL display (from `getSiteDomain()`), page selector dropdown
  - 8 preview paths: Homepage, Blog, About, Contact, Hotels, Experiences, Recommendations, Events
  - "Open in new tab" button with ExternalLink icon
  - Iframe uses `sandbox="allow-scripts allow-same-origin allow-popups"` for security
  - Device-appropriate viewport heights: Desktop 600px, Tablet 1024px, Mobile 667px
  - Preview footer showing resolution and device name
  - Flex layout: main content area + sticky preview panel side-by-side when preview mode active
  - All new UI uses CSS variable design system (`--admin-bg`, `--admin-border`, `--admin-text-muted`, `--admin-red`)

### Phase 4B — Block Template Library (March 31, 2026)
- Enhanced `app/admin/site-control/page.tsx` with full 12-template block library
  - Defined `BlockType` union type with 12 block types: hero, featured, events, testimonials, blog-grid, cta, destination-grid, newsletter, features, gallery, partners, stats
  - Created `HomepageBlock` interface with type, title, content, enabled, and type-specific config fields
  - Created `BlockTemplate` interface with type, label, icon, description, color, defaultConfig
  - Built `BLOCK_TEMPLATES` constant array with 12 pre-built templates, each with icon, description, color-coded border, and sensible defaults
  - `getTemplateColorClasses()` utility mapping template type → border/text/bg Tailwind classes
  - Replaced 3 simple "Add Block" buttons with single "Add Block" toggle button opening collapsible template library
  - Template library: 3-column responsive grid, each card shows icon + label + description with color-coded left border
  - `handleAddBlock()` auto-populates new blocks with template defaults (maxItems, layout, columns, style, etc.)
  - Added template-specific editor fields for all 12 block types:
    - `cta`: buttonText, buttonUrl, style (gradient/solid/outline)
    - `destination-grid`: columns (2/3/4), showMap checkbox
    - `newsletter`: placeholder, submitText, showIncentive checkbox
    - `features`: layout (grid/list/cards), itemsPerRow (2/3/4), showIcons checkbox
    - `gallery`: layout (masonry/grid/carousel), maxImages input, lightbox checkbox
    - `partners`: displayStyle (scroll/grid/carousel), grayscale checkbox
    - `stats`: columns (2/3/4), animate checkbox, background (dark/light/brand)
    - `blog-grid`/`testimonials`/`events`/`featured`: shared maxItems input
  - All UI uses CSS variable design system, no `window.confirm/alert/prompt`
