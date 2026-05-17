# Dashboard Redesign & Cleanup Plan

## Mission
Unify the admin panel from 3 competing design systems (neumorphic, shadcn/ui, raw Tailwind) into one clean light system. Clean dead pages. Unify information sources. Keep connectivity and safety as first principle.

## Scope & Safety Rules

**TOUCH:** JSX/TSX presentation layer, CSS classes, Tailwind classes, page wrappers, card components, badges, buttons, loading/empty states
**NEVER TOUCH:** API routes (`app/api/`), `lib/`, `hooks/`, `config/`, `prisma/`, `middleware.ts`, any `route.ts`, fetch() URLs, useState/useEffect data logic, form onSubmit handlers, auth checks, Next.js metadata exports

---

## Phase 0: Foundation (CSS + Shared Components)

### 0A. Add admin CSS classes to `globals.css`
- Add the clean light system classes at the bottom (`.admin-page`, `.admin-card`, `.admin-card-elevated`, `.admin-card-inset`, `.admin-filter-pill`, `.admin-table`, `.admin-input`, `.admin-select`, `.admin-sticky-bar`, `.admin-section-divider`, score helpers, phase bar)
- Do NOT remove any existing CSS

### 0B. Create `components/admin/admin-ui.tsx`
- AdminCard, AdminPageHeader, AdminSectionLabel, AdminStatusBadge, AdminKPICard, AdminButton, AdminLoadingState, AdminEmptyState, AdminAlertBanner
- All using the design tokens from globals.css

---

## Phase 1: Dead Page Cleanup (30+ pages removed)

### 1A. Dead affiliate pages (replaced by `/admin/affiliate-hq`)
- DELETE: `/admin/affiliate/` directory (9 sub-pages: networks, advertisers, links, deals, offers, analytics, commissions, placements, settings)
- DELETE: `/admin/affiliates/` (wrapper page)
- DELETE: `/admin/affiliate-links/` (old)
- DELETE: `/admin/affiliate-marketing/` (old)
- DELETE: `/admin/affiliate-pool/` (old)

### 1B. Dead command-center pages (replaced by main pages)
- DELETE: `/admin/command-center/content/` (replaced by /admin/content-engine)
- DELETE: `/admin/command-center/affiliates/` (replaced by /admin/affiliate-hq)
- DELETE: `/admin/command-center/analytics/` (replaced by cockpit)
- DELETE: `/admin/command-center/autopilot/` (placeholder)
- DELETE: `/admin/command-center/social/` (replaced by /admin/social-calendar)
- DELETE: `/admin/command-center/products/` (pdf stub)
- DELETE: `/admin/command-center/settings/` (api-keys stub)
- KEEP: `/admin/command-center/sites/` (active in nav — linked from Sites section)

### 1C. Dead SEO duplicates
- DELETE: `/admin/seo/` (old generic SEO, replaced by seo-audits + cockpit indexing tab)
- DELETE: `/admin/seo-audit-public/` (unlinked, unused)
- DELETE: `/admin/seo-command/` (overlaps with seo-audits)

### 1D. Dead cockpit duplicates
- DELETE: `/admin/cockpit/design/` (duplicate of /admin/design)
- DELETE: `/admin/cockpit/email/` (duplicate of /admin/email-campaigns)

### 1E. Other dead/legacy pages
- DELETE: `/admin/ops/` (17-line wrapper duplicating /admin/operations)
- DELETE: `/admin/site/` (legacy, replaced by command-center/sites)
- DELETE: `/admin/site-control/` (legacy)
- DELETE: `/admin/content/articles/` + `/admin/content/articles/new/` (duplicate of /admin/articles)
- DELETE: `/admin/automation-test/` (test page)
- DELETE: `/admin/sync-test/` (test page)
- DELETE: `/admin/sync-status/` (legacy)
- DELETE: `/admin/topics/` (redirects to topics-pipeline)
- DELETE: `/admin/variable-vault/` (legacy)
- DELETE: `/admin/wordpress/` (deferred feature, unused)

### 1F. Verify nav connectivity after cleanup
- Confirm all nav links in mophy-admin-layout.tsx still resolve to existing pages
- Confirm no imports reference deleted pages

---

## Phase 2: Priority 1 Page Redesigns (Highest Impact — Shadcn → Clean Light)

### Approach per page:
1. Read entire file
2. Identify all data/logic code (fetch, useState, useEffect, handlers) — mark as DO NOT TOUCH
3. Replace Shadcn Card/CardContent/CardHeader/CardTitle → AdminCard
4. Replace Shadcn Button → AdminButton (keep same onClick)
5. Replace Badge → AdminStatusBadge (for statuses) or styled span (for counts)
6. Add AdminPageHeader at top
7. Replace bg-white/bg-gray-50 page wrapper → admin-page class
8. Replace loading spinners → AdminLoadingState
9. Replace empty states → AdminEmptyState
10. Make filter bars sticky with admin-sticky-bar
11. Commit after each file

### Pages (in order):
1. `/admin/articles/page.tsx` — article list (shadcn heavy)
2. `/admin/pipeline-phases/page.tsx` — pipeline view (raw Tailwind)
3. `/admin/seo-audits/page.tsx` — SEO audit list (shadcn)
4. `/admin/topics-pipeline/page.tsx` — topics management (shadcn)
5. `/admin/master-audit/page.tsx` — master audit (raw Tailwind)
6. `/admin/media/page.tsx` — media library (shadcn)
7. `/admin/automation-hub/page.tsx` — automation jobs (shadcn)
8. `/admin/email-campaigns/page.tsx` — email campaigns (shadcn)
9. `/admin/social-calendar/page.tsx` — social calendar (shadcn)
10. `/admin/content-types/page.tsx` — content types (shadcn)
11. `/admin/prompts/page.tsx` — prompt templates (shadcn)

---

## Phase 3: Priority 2 Redesigns (Already Neumorphic — Cleanup)

1. `/admin/cron-monitor/page.tsx` — fix active state, group by category
2. `/admin/settings/page.tsx` — add sub-tab organization
3. `/admin/cockpit/page.tsx` — reorder sections, merge error banners, tab overflow on mobile

---

## Phase 4: Navigation Sidebar Polish

File: `components/admin/mophy/mophy-admin-layout.tsx`
- Section header visual separators (IBM Plex Mono, uppercase, letterspacing)
- Active item: change from blue to Yalla red (`rgba(200,50,43,0.06)`, color `#C8322B`)
- Improve item spacing
- Fix mobile bottom nav Crons link → `/admin/cron-monitor` if needed

---

## Phase 5: Connectivity Verification

After all changes:
- Verify every nav link resolves to an existing page
- Verify no import references deleted files
- Run TypeScript check (0 errors)
- Verify build compiles
- Spot-check key data flows (articles fetch, cockpit data, cron monitor)

---

## Information Source Unification Notes

These pages show overlapping data that should be unified (during redesign, consolidate display — don't change data sources):

| Indicator | Sources | Keep |
|-----------|---------|------|
| Indexing status | cockpit tab, seo-audits, content hub indexing tab, per-page-audit | Cockpit (primary), per-page-audit (detail) |
| Pipeline status | cockpit pipeline tab, pipeline-phases, content-matrix | Cockpit (overview), pipeline-phases (detail) |
| Cron health | cockpit crons tab, cron-monitor, departures | Departures (canonical), cockpit (summary) |
| Article list | articles page, cockpit content tab, content-matrix | Articles (canonical), cockpit (summary) |
| Affiliate revenue | cockpit revenue card, affiliate-hq | Affiliate-HQ (canonical), cockpit (card) |
| SEO scores | seo-audits, cockpit, per-page-audit | SEO-audits (canonical), cockpit (summary) |
| AI costs | ai-costs page, cockpit AI tab | AI-costs (canonical), cockpit (summary) |

---

## Estimated Changes
- ~30 pages deleted (dead code)
- ~15 pages redesigned (visual layer only)
- 1 new shared component file (admin-ui.tsx)
- CSS additions to globals.css
- Navigation sidebar polish
- 0 API/logic/config changes
