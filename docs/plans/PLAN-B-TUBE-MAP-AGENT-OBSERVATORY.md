# Plan B: London Underground Agent Observatory
## Interactive Tube Map for Pipeline Visualization & Content Control

**Prerequisite:** Plan A must be completed first. Plan B reuses: `ArticleDetailDrawer`, `article-actions.ts`, `ContentItem` types, `operations-feed` API, and the `status-dropdown` component.

---

## Vision

A stylized London Underground map where:
- **Each Tube line = a pipeline** (Content, SEO, Affiliate, Indexing)
- **Each station = a phase/step** in that pipeline  
- **Articles are "trains"** — animated dots moving along lines
- **Stations are interactive** — tap to see articles, take actions, view stats
- **Real-time updates** — trains move when crons run, stations flash on errors
- **Full control** — every station and train is actionable (publish, edit, enhance, delete)

This is NOT a static diagram. It's a **live operations dashboard** that replaces the need to check 5 different tabs.

---

## The Map Layout

### Lines (8 Pipelines)

```
CONTENT LINE (Blue) ═══════════════════════════════════════════════════
  Topics → Research → Outline → Drafting → Assembly → Images → SEO → Scoring → Reservoir → Published

SEO LINE (Green) ══════════════════════════════════════════════════════
  Published ──→ Meta Check ──→ Link Injection ──→ Schema ──→ IndexNow ──→ Indexed ──→ Performing

AFFILIATE LINE (Gold) ═════════════════════════════════════════════════
  Published ──→ Link Discovery ──→ Injection ──→ Tracked ──→ Clicked ──→ Converted

QUALITY LINE (Red) ════════════════════════════════════════════════════
  Published ──→ Auto-Fix Scan ──→ Thin Content ──→ Broken Links ──→ Duplicate Check ──→ Clean

SOCIAL MEDIA LINE (Purple) ════════════════════════════════════════════
  Published ──→ Repurpose ──→ Script ──→ Schedule ──→ Posted (Twitter) ──→ Posted (Instagram) ──→ Engagement

PDF LINE (Teal) ═══════════════════════════════════════════════════════
  Published ──→ Select for Guide ──→ Cover Design ──→ PDF Render ──→ Library ──→ Downloaded

COMMERCE LINE (Copper) ════════════════════════════════════════════════
  Product Idea ──→ Design Created ──→ Listing Draft ──→ Etsy Published ──→ Selling ──→ Fulfilled

KPI LINE (White/Silver — CEO Dashboard) ═══════════════════════════════
  Content Velocity ──→ Indexing Rate ──→ Traffic Growth ──→ CTR ──→ Affiliate Clicks ──→ Revenue ──→ Goal
```

### Line Details

**SOCIAL MEDIA LINE** tracks content repurposing:
- "Repurpose" = AI selects best-performing articles for social content
- "Script" = Content Engine Scripter generates platform-specific posts
- "Schedule" = Social Calendar queues posts
- "Posted (Twitter/Instagram)" = auto-published or marked manual
- "Engagement" = tracks likes/shares/reach (when platform APIs connected)
- Data source: `ScheduledContent` table + social cron logs

**PDF LINE** tracks guide generation:
- "Select for Guide" = articles chosen for PDF compilation
- "Cover Design" = PDF cover generated (6 branded templates exist)
- "PDF Render" = Puppeteer renders HTML → PDF
- "Library" = stored in MediaAsset / PdfGuide table
- "Downloaded" = tracked via PdfDownload table
- Data source: `PdfGuide`, `PdfDownload`, `MediaAsset` tables

**COMMERCE LINE** tracks Etsy product lifecycle:
- "Product Idea" = content/design identified for merchandise
- "Design Created" = artwork generated via Design Studio
- "Listing Draft" = product title, description, tags, pricing prepared
- "Etsy Published" = listing live on Etsy store
- "Selling" = active with views/favorites
- "Fulfilled" = orders shipped
- Data source: Future `EtsyListing`, `EtsyOrder` models (schema exists but not populated)
- Note: Etsy API integration is future work — this line shows placeholder stations until connected

**KPI LINE** (CEO Progress Tracker):
- NOT article-based — trains on this line are KPI metrics, not content
- Each station = a business metric with target vs actual
- "Content Velocity" = articles published/day (target: 4, actual: current)
- "Indexing Rate" = % of published pages indexed (target: 90%)
- "Traffic Growth" = sessions week-over-week change (target: +10%/week)
- "CTR" = Google Search CTR (target: 3.0%)
- "Affiliate Clicks" = clicks/day (target: 50)
- "Revenue" = monthly affiliate revenue (target: $500/month → $2000/month)
- "Goal" = financial freedom milestone (configurable)
- Stations are GREEN when target met, AMBER when within 80%, RED when below 50%
- Powered by: `kpi-manager.ts` targets + GA4/GSC/CJ real data
- This line is always visible at the top of the map as a "progress bar"
```

### Interchange Stations (Where Lines Connect)
- **"Published" is the central interchange** — 6 lines pass through it (like Bank/Monument): Content, SEO, Affiliate, Quality, Social Media, PDF
- **"Reservoir → Published"** is the key transfer (Content Line → all other lines)
- **"Indexed → Performing"** connects to Affiliate Line (articles need indexing before earning)
- **"Published → Repurpose"** connects Content to Social Media Line (published articles feed social)
- **"Published → Select for Guide"** connects Content to PDF Line (published articles become PDF guides)
- **"Design Created"** on Commerce Line connects to Design Studio assets
- **"Revenue"** on KPI Line reflects aggregate from Affiliate Line's "Converted" station + Commerce Line's "Selling" station

---

## Multi-Site Architecture (Hermetic Separation)

Every site gets its **own complete Tube Map** with its own branded visual identity. Sites NEVER share trains, station counts, or data. The map is fully multi-tenant.

### Site Selector & Map Switching

```
┌─────────────────────────────────────────────────────────┐
│  [🟦 Yalla London ▾]  ←── tap to switch site map       │
│                                                         │
│  ● Yalla London        (navy + gold)       110 articles │
│  ● Zenitha Yachts      (navy + aegean)      4 articles  │
│  ● Arabaldives         (turquoise + coral)   0 articles │
│  ● Yalla Riviera       (navy + champagne)    0 articles │
│  ● Yalla Istanbul      (burgundy + copper)   0 articles │
│  ● Yalla Thailand      (emerald + amber)     0 articles │
│  ─────────────────────────────────────────               │
│  ◉ All Sites (overview)                    114 total    │
└─────────────────────────────────────────────────────────┘
```

### Per-Site Visual Branding

Each site's Tube Map uses that site's brand colors from `getBrandProfile(siteId)`:

| Site | Line Colors | Map Background | Station Style |
|------|------------|----------------|--------------|
| **Yalla London** | Navy blue, Forest green, Gold, Crimson red | #0F1419 (dark navy) | White circles, gold accent |
| **Zenitha Yachts** | Aegean blue, Navy, Gold, Teal | #0A1628 (deep navy) | White circles, aegean accent |
| **Arabaldives** | Turquoise, Coral, Sand, Deep sea | #0D1B2A (ocean dark) | White circles, turquoise accent |
| **Yalla Riviera** | Mediterranean navy, Champagne, Lavender, Rose | #1A1A2E (midnight) | Cream circles, champagne accent |
| **Yalla Istanbul** | Burgundy, Copper, Ottoman gold, Deep teal | #1A0F0F (dark burgundy) | Ivory circles, copper accent |
| **Yalla Thailand** | Emerald, Golden amber, Teak, Lotus pink | #0F1A0F (forest dark) | White circles, emerald accent |

Colors loaded dynamically from `lib/design/brand-provider.ts` → `getBrandProfile(siteId).colors`.

### Per-Site Line Availability

Not all lines apply to all sites:

| Line | Yalla London | Zenitha Yachts | Arabaldives | Yalla Riviera | Yalla Istanbul | Yalla Thailand |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| Content | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SEO | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Affiliate | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Quality | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Social Media | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| PDF | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Commerce (Etsy) | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| KPI | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Zenitha Yachts skips PDF and Commerce lines (yacht charter ≠ merchandise). Lines with no data show as dimmed/inactive on the map.

### "All Sites" Overview Mode

Selecting "All Sites" shows a simplified **network map** — one node per site, each showing:
- Site name + logo
- Total articles (published / pipeline / reservoir)
- KPI health bar (green/amber/red)
- Last activity timestamp
- Quick tap → switches to that site's full Tube Map

```
     ┌──────────┐         ┌──────────┐
     │  Yalla   │────────│ Zenitha  │
     │ London   │        │  Yachts  │
     │ 110 📄   │        │   4 📄   │
     │ ████░ 78%│        │ ██░░ 40% │
     └────┬─────┘        └──────────┘
          │
     ┌────┴─────┐    ┌──────────┐    ┌──────────┐
     │  Arab    │────│  Yalla   │────│  Yalla   │
     │ aldives  │    │ Riviera  │    │ Istanbul │
     │   0 📄   │    │   0 📄   │    │   0 📄   │
     │ ░░░░ 0%  │    │ ░░░░ 0%  │    │ ░░░░ 0%  │
     └──────────┘    └──────────┘    └──────────┘
                          │
                     ┌────┴─────┐
                     │  Yalla   │
                     │ Thailand │
                     │   0 📄   │
                     │ ░░░░ 0%  │
                     └──────────┘
```

### Hermetic Data Separation Rules

**MANDATORY — enforced in every API call and component render:**

1. **Every API query includes `siteId` in WHERE clause** — no global queries ever
2. **Tube Map state is keyed by siteId** — switching sites resets all station counts, trains, animations
3. **KPI targets are per-site** — each site has its own targets in `kpi-manager.ts`
4. **Operations feed is filtered by site** — shows only that site's cron activity
5. **Article actions are scoped** — publish/edit/delete only affects the selected site's content
6. **Brand colors never bleed** — site switch triggers full CSS variable swap
7. **No cross-site trains** — an article from Yalla London NEVER appears on Zenitha Yachts' map
8. **Commerce Line is per-site** — Etsy products are tied to specific site branding
9. **Social Media Line is per-site** — each site has its own social accounts and posting schedule
10. **PDF Line is per-site** — guides are branded per-site with correct colors/logos

### Implementation Pattern

```typescript
// Every Tube Map component receives siteId as a required prop
interface TubeMapProps {
  siteId: string;           // REQUIRED — hermetic separation
  brandProfile: BrandProfile; // from getBrandProfile(siteId)
}

// Every data fetch includes siteId
const fetchStationData = async (siteId: string) => {
  const res = await fetch(`/api/admin/content-matrix?siteId=${encodeURIComponent(siteId)}&limit=500`);
  // ...
};

// Every action includes siteId
const publishArticle = async (articleId: string, siteId: string) => {
  // siteId validated server-side against article's actual siteId
  // Server rejects if article.siteId !== request.siteId
};
```

### Visual Design
- **Background:** Dark navy (#0F1419) matching cockpit
- **Lines:** Colored paths with rounded corners (actual Tube map style)
- **Stations:** Circles on lines — white fill when empty, colored fill when articles present
- **Station labels:** Below/above station circles, small text
- **Trains:** Small colored dots that animate along lines when activity detected
- **Status glow:** Green halo = healthy, Amber pulse = delayed, Red flash = error

---

## Station Detail Panel (Tap Any Station)

When you tap a station (e.g., "Drafting"), a bottom sheet slides up showing:

### Header
```
📍 DRAFTING STATION                    Content Line
   8 articles currently here           Avg time: 4.2h
```

### Articles at This Station (Scrollable List)
```
┌──────────────────────────────────────────────────────┐
│ 🟢🔴 Best Halal Restaurants Kensington    3h 12m    │
│      SEO: 68  Words: 1,247  Section 5/8 ████████░░  │
│      [Continue Building] [Skip to Assembly] [Delete] │
├──────────────────────────────────────────────────────┤
│ 🟢🟢 Luxury Spas London Guide            6h 45m ⚠️  │
│      SEO: —   Words: 890   Section 3/6 █████░░░░░   │
│      [Retry] [Force Raw Assembly] [View Error]       │
├──────────────────────────────────────────────────────┤
│ 🟢⚪ Thames River Cruise Tips             45m        │
│      SEO: —   Words: 420   Section 2/7 ███░░░░░░░   │
│      [Continue Building]                              │
└──────────────────────────────────────────────────────┘
```

### Station Actions (Bottom Bar)
```
[Run This Phase] [Skip All to Next] [Reject Stuck (>6h)]
```

### Station Stats
```
Today:  12 arrived, 8 departed, 4 remaining
This week: 67 total throughput
Avg dwell time: 2.8h (target: <4h)
Bottleneck: No ✅
```

---

## Train Detail Panel (Tap Any Train/Article)

Opens the `ArticleDetailDrawer` (from Plan A) with additional Tube Map context:

### Journey Timeline (NEW — added to drawer for Plan B)
```
JOURNEY: "Best Halal Restaurants Kensington"

  ● Topics          Apr 2, 04:10    Generated by weekly-topics
  │  30m
  ● Research         Apr 2, 04:40    Grok researched 5 competitors
  │  1h 15m
  ● Outline          Apr 2, 05:55    8 sections planned, 1,500w target
  │  45m
  ● Drafting         Apr 2, 06:40    Section 5/8 complete (currently here)
  │  ⏳ 3h 12m (in progress)
  ○ Assembly         —               Waiting
  ○ Images           —               Waiting  
  ○ SEO              —               Waiting
  ○ Scoring          —               Waiting
  ○ Reservoir        —               Waiting
  ○ Published        —               Waiting
```

### Enhanced Actions (Tube Map Context)
Beyond Plan A's standard actions, the train detail adds:

**Content Enhancement Actions:**
- 📷 **Add Photo** — opens Unsplash search, attaches to article's `images_data`
- 🔗 **Add Link** — input URL + anchor text, injects into article HTML
- 🎬 **Add Video** — paste YouTube/Vimeo URL, embeds in article
- 📱 **Add Social Embed** — paste Instagram/TikTok/Twitter URL, embeds in article
- ✏️ **Edit Content** — opens full editor for this article

**Pipeline Control Actions:**
- ⏭️ **Skip to Next Phase** — advances article past current phase
- 🔄 **Reset Phase** — restarts current phase (clears errors)
- ⏸️ **Pause** — holds article at current station (exempt from auto-advancement)
- 🚫 **Remove from Pipeline** — rejects article with reason

**Quality Actions:**
- 🔍 **Run Gate Check** — executes all 16 pre-publication checks
- 📊 **SEO Preview** — shows predicted SEO score breakdown
- 🌐 **Preview Live** — renders article as it would appear on the site

---

## Real-Time Activity Feed (Map Overlay)

A semi-transparent overlay at the bottom of the map showing live operations:

```
┌─────────────────────────────────────────────────────┐
│ LIVE ACTIVITY                              ▼ hide   │
├─────────────────────────────────────────────────────┤
│ 🏗️ Builder    2m ago   Advanced 3 trains to Assembly │
│ 🔍 SEO Agent  15m ago  Injected links on 5 articles │
│ 💰 Affiliate  1h ago   Vrbo links added to 4 trains │
│ 📊 GSC Sync   3h ago   34 clicks today (+12%)       │
└─────────────────────────────────────────────────────┘
```

Powered by the `operations-feed` API from Plan A Phase 3.2.

---

## Map Controls

### Top Bar
```
[Yalla London ▾]  [All Lines ▾]  [Live 🟢]  [24h ⏰]
```

- **Site selector** — switches entire map to different site
- **Line filter** — show only Content Line, only SEO Line, etc.
- **Live toggle** — enables/disables auto-refresh (30s interval)
- **Time range** — show trains from last 24h / 7d / 30d

### Floating Action Buttons
```
                                          [+ New Article]
                                          [▶ Run Pipeline]
                                          [📊 Stats]
```

### Stats Overlay (Tap 📊)
```
┌────────────────────────────────────────┐
│ TODAY'S STATS                          │
│                                        │
│ 🚂 Trains moving:     23              │
│ 📍 At stations:       89              │
│ ✅ Arrived (Published): 5             │
│ 🔍 Indexed by Google:  94             │
│ 💰 Affiliate clicks:   12             │
│ 💵 AI cost today:      $0.14          │
│                                        │
│ BOTTLENECK: Drafting (8 trains, 4.2h) │
│ [Fix Bottleneck]                       │
└────────────────────────────────────────┘
```

---

## Animations

### Train Movement
When `operations-feed` returns a new entry where an article changed phase:
1. The train dot at the old station shrinks slightly (departure animation, 200ms)
2. A new dot appears at the old station and animates along the line to the new station (600ms ease-in-out)
3. The new station's count increments, the old decrements
4. A subtle "ding" haptic feedback on iPhone (navigator.vibrate if supported)

### Station Alerts
When a station has stuck articles (>6h):
1. Station circle gets a pulsing amber ring (CSS animation, 2s cycle)
2. Station label gets an ⚠️ prefix

When a station has errors:
1. Station circle gets a red flash (CSS animation, 1s cycle)  
2. A small red badge with count appears above the station

### Line Health
Each line segment between stations changes color based on throughput:
- Green: articles flowing normally (at least 1 in last 4h)
- Amber: slow (no movement in 4-8h)
- Gray: no recent activity (>8h)
- Red: blocked (station at capacity or errors)

### Published Station Celebration
When an article reaches "Published":
1. Brief confetti/sparkle animation at the Published station (300ms)
2. Train dot turns green and stays visible for 10 seconds before fading
3. Counter at Published station increments with a bounce animation

---

## Technical Architecture

### Component Structure
```
app/admin/cockpit/components/tube-map/
├── tube-map.tsx                # Main container + layout
├── tube-line.tsx               # Single line (path + stations)
├── tube-station.tsx            # Station circle + label + count
├── tube-train.tsx              # Animated train dot
├── station-detail-panel.tsx    # Bottom sheet for station tap
├── train-journey-timeline.tsx  # Article journey visualization
├── activity-overlay.tsx        # Live feed overlay
├── map-controls.tsx            # Top bar controls
├── stats-overlay.tsx           # Stats popup
├── tube-map-data.ts            # Line/station definitions
├── tube-map-hooks.ts           # Data fetching + animation state
└── tube-map-animations.css     # CSS keyframes + transitions
```

### Data Flow
```
operations-feed API ─────┐
                         │
content-matrix API ──────┼──→ tube-map-hooks.ts ──→ tube-map.tsx ──→ render
                         │         │
queue-monitor API ───────┘         │
                                   ↓
                          Animation state manager
                          (tracks which trains moved since last fetch)
```

### Map Definition (tube-map-data.ts)
```typescript
interface TubeStation {
  id: string;
  label: string;
  position: { x: number; y: number };  // % of container
  phase?: string;        // maps to ArticleDraft.current_phase
  lineIds: string[];     // which lines pass through
  actions: StationAction[];
}

interface TubeLine {
  id: string;
  name: string;
  color: string;
  stations: string[];    // ordered station IDs
  dataSource: "pipeline" | "seo" | "affiliate" | "quality";
}

interface TubeTrain {
  articleId: string;
  title: string;
  currentStation: string;
  nextStation: string | null;
  dwellTimeMs: number;
  status: "moving" | "stopped" | "stuck" | "error";
  localeDots: { en: boolean; ar: boolean };
}
```

### API Requirements
All data comes from existing APIs (no new endpoints needed beyond Plan A's operations-feed):

| Data | Source API | Used For |
|------|-----------|----------|
| Articles by phase | `/api/admin/content-matrix?status=all` | Train positions |
| Phase counts | `/api/admin/cockpit` → pipeline.byPhase | Station counts |
| Recent activity | `/api/admin/operations-feed` | Train movement animations |
| Pipeline health | `/api/admin/queue-monitor` | Station alerts |
| Indexing status | `/api/admin/cockpit` → indexing | SEO Line station states |
| Affiliate coverage | `/api/admin/affiliate-hq` | Affiliate Line station states |
| Article details | Plan A's ArticleDetailDrawer | Train tap detail |

### Content Enhancement API Endpoints (New)

For the "Add Photo / Link / Video / Social Embed" actions on trains:

**POST `/api/admin/article-enhance`**
```typescript
{
  action: "add_photo" | "add_link" | "add_video" | "add_social_embed";
  articleId: string;
  articleType: "published" | "draft";
  // For add_photo:
  query?: string;          // Unsplash search query
  photoId?: string;        // specific Unsplash photo ID
  position?: "featured" | "inline" | "after_h2";
  // For add_link:
  url?: string;
  anchorText?: string;
  rel?: "sponsored" | "nofollow" | "";
  position?: "end" | "after_first_h2" | "related_section";
  // For add_video:
  embedUrl?: string;       // YouTube/Vimeo URL
  position?: "after_intro" | "before_conclusion" | "inline";
  // For add_social_embed:
  platform?: "instagram" | "tiktok" | "twitter" | "facebook";
  postUrl?: string;
  position?: "inline" | "sidebar" | "after_content";
}
```

Returns: `{ success: boolean; message: string; previewHtml?: string }`

This endpoint:
1. Fetches the article's current HTML content
2. Inserts the media at the specified position
3. Updates BlogPost or ArticleDraft with new content
4. Logs to enhancement_log
5. Returns preview snippet of what was added

---

## Mobile Layout

The Tube Map must work on a 375px iPhone screen. The layout adapts:

### Desktop (>768px)
Full map visible with all 4 lines, stations labeled, trains animated.

### Mobile (375px)
- Map is horizontally scrollable (pinch to zoom)
- Default zoom shows Content Line (primary line) fitting screen width
- Tap a line name in the top filter → map scrolls to that line
- Station labels rotate 45° to fit
- Station detail panel is full-screen bottom sheet (like ArticleDetailDrawer)
- Activity overlay shows last 3 entries (expandable)

### Touch Interactions
- **Tap station** → station detail panel
- **Tap train dot** → article detail drawer
- **Long-press station** → quick actions menu (Run Phase, View All)
- **Swipe up on activity overlay** → expand to full feed
- **Pinch** → zoom in/out on map
- **Pan** → scroll map area

---

## Implementation Phases

### Phase B.1: Static Map + Data — Core 4 Lines (3-4 sessions)
- Define all 8 lines, stations, and positions in `tube-map-data.ts`
- Render SVG/CSS map with Content + SEO + Affiliate + Quality lines first
- Load brand colors from `getBrandProfile(siteId)` — map is site-branded from day 1
- Fetch real data and display station counts (per-site filtered)
- Tap station → show article list (no detail panel yet)
- Site selector at top — switching site reloads entire map with new colors + data
- No animations yet — static snapshot
- KPI Line rendered as horizontal progress bar at map top

### Phase B.2: Interactive Stations + Multi-Site (2-3 sessions)
- Station detail panel (bottom sheet)
- Station actions (Run Phase, Skip, Reject)
- Train dots at stations (sized by count)
- Tap train → opens ArticleDetailDrawer (with siteId context)
- Station status indicators (healthy/warning/error)
- "All Sites" overview map showing one node per site with health bar
- Tap site node → switches to that site's full Tube Map
- Every action passes siteId — server validates article belongs to that site

### Phase B.3: Train Animations + Activity Feed (2-3 sessions)
- Poll operations-feed every 30s (filtered by siteId)
- Detect article phase changes → animate train movement
- Activity overlay at bottom (per-site activity only)
- Line health coloring (green/amber/gray/red)
- Published station celebration animation

### Phase B.4: Content Enhancement Actions (2 sessions)
- Build `/api/admin/article-enhance` endpoint (siteId required)
- Add Photo (Unsplash integration — site-specific search queries from `SITE_IMAGE_QUERIES`)
- Add Link (URL + anchor input — site-specific affiliate partners)
- Add Video (YouTube/Vimeo embed)
- Add Social Embed (Instagram/TikTok/Twitter)
- All available from train detail panel
- All enhancements logged to `enhancement_log` with siteId

### Phase B.5: Journey Timeline + Stats (1-2 sessions)
- Article journey timeline in train detail (per-article, not cross-site)
- Stats overlay (per-site stats with site name + brand colors)
- Map controls (site selector, line filter, time range)
- KPI station detail — tap any KPI node to see target vs actual + trend chart
- Performance polish (reduce re-renders, optimize animations)

### Phase B.6: Social Media + PDF + Commerce + KPI Lines (3-4 sessions)
- **Social Media Line:**
  - Connect to `ScheduledContent` table for post scheduling data
  - Connect to social cron logs for posting status
  - Station detail shows: platform breakdown, scheduled vs posted, engagement (when available)
  - Action: "Create Social Post from Article" → opens Content Engine Scripter
  - Per-site social accounts (from SiteSettings `social` category)

- **PDF Line:**
  - Connect to `PdfGuide` + `PdfDownload` tables
  - Station detail shows: available guides, download count, cover preview
  - Action: "Create PDF Guide" → selects articles + generates cover + renders PDF
  - Uses per-site branded PDF cover templates (6 templates × site brand colors)

- **Commerce Line (Etsy):**
  - Initially shows placeholder stations (Etsy API not yet connected)
  - "Product Idea" station → pulls from Design Studio assets
  - "Listing Draft" → form for title, description, tags, pricing
  - Future: connect to Etsy API for auto-publishing and order tracking
  - Per-site Etsy store (each site can have its own Etsy shop)

- **KPI Line Enhancement:**
  - Tap any KPI station → full detail panel with:
    - Current value vs target (big number)
    - 30-day sparkline chart
    - Week-over-week trend arrow
    - "Set New Target" button (writes to `kpi-manager.ts`)
    - Plain-English diagnosis: "You're at 34 clicks/day. Target is 50. Gap: 16 clicks. Suggested action: improve meta titles on high-impression articles."
  - CEO Agent auto-generates weekly KPI summary email using this data
  - KPI targets configurable per-site (Yalla London has different targets than Zenitha Yachts)

---

## Success Criteria

The Tube Map is successful when Khaled can:

**Core Operations (from his iPhone):**
1. ✅ Open cockpit → see entire pipeline health in 2 seconds (visual scan)
2. ✅ Tap any station → see every article there + take action
3. ✅ Tap any article → see full details + edit title/meta + add media
4. ✅ See trains move in real-time when crons run
5. ✅ Identify bottlenecks visually (amber/red stations)
6. ✅ Add a photo/link/video/social embed to any article without leaving the map
7. ✅ Publish an article from the Reservoir station with one tap
8. ✅ See the full journey of any article from topic to revenue
9. ✅ Know "what happened overnight" from the activity feed
10. ✅ Manage everything from his iPhone without scrolling through tables

**Multi-Site (hermetic separation):**
11. ✅ Switch between sites → map rebrands instantly (colors, data, KPIs)
12. ✅ See "All Sites" overview → one node per site with health status
13. ✅ Never see another site's content on the wrong map
14. ✅ Each site has independent KPI targets and progress tracking

**Extended Lines:**
15. ✅ See social media posts flowing from Published → Repurpose → Scheduled → Posted
16. ✅ See PDF guides being generated from Published → Cover → Render → Library
17. ✅ Track Etsy product lifecycle from idea to sale
18. ✅ Monitor KPI progress at a glance — green/amber/red per metric
19. ✅ Tap any KPI station → see target vs actual with trend and suggested action
20. ✅ CEO Agent weekly report pulls from KPI Line data automatically

---

## Design References

- **Visual style:** TfL (Transport for London) official Tube map — clean lines, Johnston typeface style, circle stations
- **Color palette:** Use site brand colors for lines (navy, gold, green, red)
- **Animation style:** Smooth CSS transitions (ease-in-out), not janky requestAnimationFrame
- **Mobile pattern:** Apple Maps transit view — scrollable map with bottom sheet details
- **Activity feed:** Slack-style messages with agent avatars

---

## Relationship to Plan A

| Plan A Component | How Plan B Uses It |
|---|---|
| `article-actions.ts` | All station + train actions use these functions |
| `ArticleDetailDrawer` | Train tap opens this drawer (extended with journey timeline) |
| `status-dropdown.tsx` | Station detail uses same status change dropdown |
| `priority-inbox.tsx` | Map overlay shows priority items on affected stations |
| `content-calendar.tsx` | Calendar becomes an alternative map view (timeline mode) |
| `pipeline-kanban.tsx` | Kanban columns = Tube stations (same data, different viz) |
| `operations-feed` API | Powers train movement animations + activity overlay |
| `ContentItem` types | Trains are ContentItems rendered as dots on a map |
| `locale-dots.tsx` | Trains show EN/AR completion dots |
| `named-views.tsx` | Map overlays (highlight unindexed, highlight thin content) |
