# Plan A: Content Management UX Overhaul
## 7 Features, 3 Phases — Foundation for Plan B (Tube Map)

**Objective:** Transform the cockpit Content tab from a data table into a full CMS workspace. Every feature built here becomes a reusable component for Plan B.

**Prerequisites:** Merge `claude/new-session-VI9d0` branch first (contains Article Detail Drawer, Quick Edit, date filter, pagination from April 5 session).

---

## Phase 1: Foundation Refactor (Do First)

### 1.1 Extract ContentTab into standalone component
**Why:** The cockpit page is 9000+ lines. Content tab is ~1200 lines embedded inside it. Every future change risks breaking other tabs.

**What:**
- Extract `ContentTab` function + all its state/handlers into `app/admin/cockpit/components/content-tab.tsx`
- Extract shared types (`ContentItem`, `ContentMatrixData`, `GateCheck`) into `app/admin/cockpit/types.ts`
- Extract `ArticleDetailDrawer` is already separate (done April 5)
- Cockpit page.tsx just imports and renders `<ContentTab />`

**Deliverable:** Same UI, zero visual changes, but content code is now in its own 1200-line file instead of buried in a 9000-line file.

**Plan B dependency:** The Tube Map will import `ContentItem` types and reuse `ArticleDetailDrawer`. Having them as standalone imports is essential.

---

### 1.2 Create shared action API helper
**Why:** Content tab, Article Detail Drawer, and Tube Map will all need to call the same actions (publish, unpublish, re-queue, delete, enhance). Currently each component has its own fetch logic.

**What:**
- Create `app/admin/cockpit/lib/article-actions.ts`
- Export typed functions: `publishArticle(id, locale, siteId)`, `unpublishArticle(id)`, `reQueueDraft(id)`, `deleteDraft(id)`, `deletePost(id)`, `submitToGoogle(slug)`, `runGateCheck(draftId)`, `quickEdit(id, title, metaDesc)`, `orderPhoto(id, query)`, `addLink(id, url, anchor)`, `addVideo(id, embedUrl)`, `addSocialEmbed(id, platform, postUrl)`
- Each function returns `{ success: boolean; message: string; data?: unknown }`
- All reuse the same error handling pattern (Safari-safe JSON parsing, res.ok check)

**Deliverable:** Single import for all article actions across all components.

**Plan B dependency:** Tube Map station detail panels will import these same action functions. Build once, use everywhere.

---

## Phase 2: Core UX Features (7 days)

### 2.1 Tappable Status Badge
**Priority:** P0 — eliminates the most navigation for Khaled

**What:** Tap the status pill on any article row → dropdown appears with contextual options:
- Published article: `Unpublish` | `Schedule Re-index` | `Run SEO Review`
- Reservoir draft: `Publish Now` | `Re-queue` | `Delete`
- Rejected draft: `Retry` | `Delete`
- Pipeline draft: `View Details` (opens Article Detail Drawer)

**Implementation:**
- New component: `components/cockpit/status-dropdown.tsx`
- Uses `article-actions.ts` functions
- Positioned below the badge (absolute positioning, portal for z-index)
- Click outside or Escape to close
- Shows loading spinner on action, success/error feedback inline

**UX pattern:** HubSpot inline status change — most common action requires zero navigation.

---

### 2.2 Priority Inbox
**Priority:** P0 — ADHD-friendly "what should I do next?"

**What:** Replaces the alert banners in Mission tab with a focused "Attention Needed" section at the top of Content tab. Max 5 items, ranked by revenue impact.

**Priority ranking:**
1. 🔴 Pipeline stalled (0 published today + reservoir full) — action: "Fix Pipeline"
2. 🔴 Cron failures affecting content — action: "View Failures"  
3. 🟡 Articles ready but not published (reservoir > 5) — action: "Publish Best 2"
4. 🟡 Thin articles under 500 words — action: "Expand Now"
5. 🔵 Never-submitted pages — action: "Submit to Google"
6. 🔵 High impressions, low CTR articles — action: "Improve Titles"

**Implementation:**
- New component: `components/cockpit/priority-inbox.tsx`
- Fetches from existing APIs: `/api/admin/cockpit` (alerts), `/api/admin/queue-monitor` (pipeline health), `/api/admin/content-matrix` (article stats)
- Each item: one sentence + one button + severity color
- Collapsible — tap header to show/hide
- Auto-refreshes every 60s

**Plan B dependency:** Priority Inbox will also appear as an overlay on the Tube Map when stations have problems.

---

### 2.3 "Changed" State
**Priority:** P1 — accurate pipeline state visibility

**What:** New status between "Published" and "Draft" — shows when a published article has been auto-enhanced by crons since its last manual review.

**Detection logic:**
```
IF published === true 
  AND enhancement_log has entries with timestamp > last manual edit timestamp
  THEN status = "Changed" (amber badge)
```

**Visual:** Amber pill badge saying "Enhanced" instead of green "Published". Tap → dropdown shows what changed (from enhancement_log).

**Implementation:**
- Modify `content-matrix/route.ts` GET to include `hasUnreviewedEnhancements` boolean
- Compare `enhancement_log` latest timestamp vs `updated_at` (manual edits update this)
- Status badge component checks this flag

**Plan B dependency:** Tube Map will show "Changed" trains with amber color instead of green, making it visually obvious which published articles have been auto-modified.

---

### 2.4 Multi-Locale Status Dots
**Priority:** P1 — bilingual visibility at a glance

**What:** Two small dots next to each article title:
- 🟢🟢 = EN complete + AR complete
- 🟢🔴 = EN complete + AR missing
- 🔴🟢 = EN missing + AR complete
- ⚪⚪ = Both drafts (word count < 100)

**Implementation:**
- `content-matrix/route.ts` already returns `wordCount` (EN) and `titleAr`
- Need to also return `wordCountAr` (add to API response from `content_ar` field)
- Component: two 6px circles with conditional coloring
- Tooltip on tap: "English: 1,247 words ✓ | Arabic: 0 words ✗"

**Plan B dependency:** Tube Map trains will show these dots, letting Khaled see bilingual completeness across the entire pipeline.

---

### 2.5 Named Filter Views
**Priority:** P2 — one-tap filtered views

**What:** Horizontal scrollable chip bar above the article table with pre-built filters:

| View Name | Filter Logic |
|---|---|
| All Articles | No filter |
| Needs Expansion | wordCount < 800 AND published |
| Not Indexed | indexingStatus !== "indexed" AND published |
| Arabic Missing | wordCountAr < 100 AND wordCountEn > 500 |
| High Impressions / Low CTR | gscImpressions > 50 AND gscClicks < 3 |
| Stuck > 6h | hoursInPhase > 6 AND type === "draft" |
| Revenue Earners | has affiliate clicks (from getRevenueByArticle) |

**Implementation:**
- Array of `{ label, filterFn }` objects
- Scrollable horizontal bar (overflow-x-auto, snap scroll)
- Active view highlighted
- Replaces current separate filter buttons (status, type, locale) — those become secondary filters within a view
- Persisted in localStorage so Khaled's last-used view stays active

**Plan B dependency:** Tube Map will have the same named views as "map overlays" — tap "Not Indexed" and unindexed trains glow red.

---

### 2.6 7-Day Strip Calendar
**Priority:** P2 — temporal content discovery

**What:** iOS Calendar-style strip showing 7 days + scrollable article list below.

**Layout:**
```
← [Mon 31] [Tue 1] [Wed 2] [Thu 3] [Fri 4] [Sat 5★] [Sun 6] →
      2        1       0       3       1       0        2     ← article counts

─── Today, Saturday April 5 ───────────────────
● Best Afternoon Tea London          09:15  ✅ Published  1,247w  SEO 72
● Luxury Hotels Mayfair              09:15  ✅ Published  1,089w  SEO 68

─── Yesterday, Friday April 4 ─────────────────
● Halal Restaurants Knightsbridge    09:00  ✅ Published  1,120w  SEO 75

─── Thursday April 3 ──────────────────────────
(no articles published)
```

**Implementation:**
- New component: `components/cockpit/content-calendar.tsx`
- Added as a view toggle in Content tab: `Articles | Calendar | Research`
- Fetches published articles with dates from content-matrix API
- Tap day dot → scrolls to that day
- Tap article → opens Article Detail Drawer
- Swipe left/right on strip to shift week
- Star icon on current day

**Plan B dependency:** The Tube Map will have a "timeline" mode that shows when trains arrived at each station (same data, different visualization).

---

### 2.7 Kanban Pipeline Board
**Priority:** P2 — visual pipeline health

**What:** Horizontal scrollable board with columns for each pipeline phase.

```
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│Research  │ │Outline  │ │Drafting │ │Assembly │ │Reservoir│
│    3     │ │    2    │ │    8    │ │    4    │ │   12    │
├─────────┤ ├─────────┤ ├─────────┤ ├─────────┤ ├─────────┤
│ Topic A  │ │ Topic D  │ │ Topic F  │ │ Topic J  │ │ Topic N  │
│ 2h ⚡    │ │ 1h      │ │ 5h ⚠️   │ │ 3h      │ │ Score:72 │
│          │ │ Topic E  │ │ Topic G  │ │         │ │ Topic O  │
│          │ │ 30m     │ │ 12h 🔴  │ │         │ │ Score:68 │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

**Implementation:**
- New component: `components/cockpit/pipeline-kanban.tsx`
- Added as a view toggle in Pipeline tab (replaces bar chart)
- Each column = pipeline phase, sorted by time-in-phase
- Card shows: topic/keyword (truncated), time in phase, warning if stuck
- Reservoir cards show quality score instead of time
- Tap card → opens Article Detail Drawer
- Color coding: green (< 2h), amber (2-6h), red (> 6h)
- Column headers show count + "Run [Phase]" button

**Plan B dependency:** This IS the simplified version of the Tube Map. The Kanban columns map directly to Tube stations. Building this first validates the data flow.

---

## Phase 3: API Enhancements (support for Plan B)

### 3.1 Expand content-matrix API response
Add fields needed by both UX features and Tube Map:
- `wordCountAr` — Arabic word count
- `hasUnreviewedEnhancements` — boolean for "Changed" state  
- `enhancementSummary` — last 3 enhancement_log entries (type + timestamp)
- `affiliateClicks7d` — from getRevenueByArticle()
- `affiliateRevenue30d` — from getRevenueByArticle()
- `ga4PageViews7d` — from fetchGA4PageMetrics() (if configured)
- `featuredImage` — URL for visual display in Kanban/Calendar/TubeMap

### 3.2 Create unified operations feed API
**Route:** `/api/admin/operations-feed`

Merges CronJobLog + AutoFixLog + AuditLog + enhancement_log into chronological feed with plain-English formatting. Returns:
```typescript
{
  entries: Array<{
    timestamp: string;
    agent: string;        // "Content Builder", "SEO Agent", etc.
    agentIcon: string;    // emoji
    action: string;       // plain English: "Published 2 articles"
    details: string[];    // bullet points of what changed
    articleIds: string[]; // linked article IDs (tappable)
    cost: number | null;  // AI cost in USD
    status: "success" | "warning" | "error";
  }>;
  summary: {
    totalActions: number;
    articlesPublished: number;
    articlesEnhanced: number;
    cronFailures: number;
    aiCostUsd: number;
  };
}
```

**Plan B dependency:** This API powers the Tube Map's activity animations. When a train moves between stations, it's because an operations-feed entry logged that transition.

---

## Testing Protocol

After each feature:
1. TypeScript check: `npx tsc --noEmit` — zero new errors
2. Visual check: component renders correctly in isolation
3. Mobile check: verify layout doesn't overflow on 375px width
4. Data check: verify API returns expected fields with real DB data
5. Action check: every button/tap actually calls the right API and shows feedback
6. Build check: `next build` passes before push

---

## File Structure (after Plan A)

```
app/admin/cockpit/
├── page.tsx                          # ~2000 lines (down from 9000)
├── types.ts                          # Shared types
├── lib/
│   └── article-actions.ts            # Shared action functions
├── components/
│   ├── mission-control.tsx           # HQ tab (existing)
│   ├── content-tab.tsx               # Content tab (extracted)
│   ├── article-detail-drawer.tsx     # Article detail (existing)
│   ├── status-dropdown.tsx           # Tappable status (new)
│   ├── priority-inbox.tsx            # Attention needed (new)
│   ├── content-calendar.tsx          # 7-day strip (new)
│   ├── pipeline-kanban.tsx           # Kanban board (new)
│   ├── named-views.tsx               # Filter chips (new)
│   ├── locale-dots.tsx               # EN/AR status dots (new)
│   ├── hero-bar.tsx                  # (existing)
│   ├── service-pills.tsx             # (existing)
│   ├── pipeline-track.tsx            # (existing)
│   ├── cron-table.tsx                # (existing)
│   └── portfolio-strip.tsx           # (existing)
```

This structure is deliberately designed so Plan B (Tube Map) can import any component from this directory.
