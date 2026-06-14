# Yalla London — Admin Dashboard Design Spec for Google Stitch

> **Purpose:** Upload this document to [Google Stitch](https://stitch.withgoogle.com) to generate interactive dashboard prototypes. This is a read-only design reference — no code will be affected.
>
> **How to use:** Copy-paste this entire document (or upload as a file) into Stitch's prompt area. Ask Stitch to generate a mobile-first admin dashboard based on this spec. Iterate freely — nothing here touches production code.

---

## 1. Product Context

**Product:** Admin cockpit for a multi-website content engine that auto-generates, publishes, and monetizes travel blog articles via affiliate links.

**Primary User:** Solo operator (Khaled). Non-technical, ADHD, works exclusively from iPhone. If he can't see it on screen, it doesn't exist to him.

**Core Job:** Monitor and control an autonomous content-to-revenue pipeline from a phone — like an airline pilot's cockpit, not a developer's IDE.

**Sites Managed:**
| Site | Domain | Color Accent |
|------|--------|-------------|
| Yalla London | yalla-london.com | Red #C8322B + Gold #C49A2A |
| Arabaldives | arabaldives.com | Turquoise #0891B2 + Coral #F97316 |
| Yalla Riviera | yallariviera.com | Navy #1E3A5F + Champagne #D4AF37 |
| Yalla Istanbul | yallaistanbul.com | Burgundy #7C2D36 + Copper #B87333 |
| Yalla Thailand | yallathailand.com | Emerald #059669 + Golden Amber #D97706 |
| Zenitha Yachts | zenithayachts.com | Navy #0F172A + Gold #D4AF37 + Aegean #2563EB |

---

## 2. Design Principles

1. **iPhone-first:** Design at 375px width. Everything must work with one thumb.
2. **Glanceable:** Status visible in < 2 seconds. No scrolling to find "is everything OK?"
3. **Action-oriented:** Every data point leads to a one-tap action. No dead displays.
4. **Dark mode:** Dark zinc/slate backgrounds. Easier on eyes, looks premium, better for OLED.
5. **Traffic light system:** Green = good, Amber = needs attention, Red = broken. Universally.
6. **No jargon:** Labels say "Articles Published Today" not "BlogPost count where status=published".
7. **Generous tap targets:** Minimum 44x44px for all interactive elements (Apple HIG).

---

## 3. Color System

### Base Palette (Dark Theme)
```
--bg-primary:     #09090B   (zinc-950 — page background)
--bg-card:        #18181B   (zinc-900 — card surfaces)
--bg-card-hover:  #27272A   (zinc-800 — hover/active states)
--bg-elevated:    #3F3F46   (zinc-700 — modals, dropdowns)
--border:         #27272A   (zinc-800 — card borders)
--border-subtle:  #3F3F46   (zinc-700 — dividers)

--text-primary:   #FAFAFA   (zinc-50 — headings, numbers)
--text-secondary: #A1A1AA   (zinc-400 — labels, descriptions)
--text-muted:     #71717A   (zinc-500 — timestamps, metadata)
```

### Semantic Colors
```
--success:        #10B981   (emerald-500 — published, healthy, OK)
--success-bg:     #064E3B   (emerald-900/50 — success badges)
--warning:        #F59E0B   (amber-500 — in-progress, attention)
--warning-bg:     #78350F   (amber-900/50 — warning badges)
--error:          #EF4444   (red-500 — failed, critical, broken)
--error-bg:       #7F1D1D   (red-900/50 — error badges)
--info:           #3B82F6   (blue-500 — pending, submitted, neutral)
--info-bg:        #1E3A5F   (blue-900/50 — info badges)
--purple:         #A855F7   (purple-500 — indexed, premium)
--purple-bg:      #581C87   (purple-900/50 — purple badges)
```

### Brand Accent (Yalla London default)
```
--brand-primary:  #C8322B   (London Red)
--brand-gold:     #C49A2A   (Gold)
--brand-accent:   #3B7EA1   (Thames Blue)
```

---

## 4. Typography

```
--font-heading:   "Inter", system-ui, sans-serif   (700 weight)
--font-body:      "Inter", system-ui, sans-serif   (400 weight)
--font-mono:      "JetBrains Mono", monospace       (for numbers, code)

--text-xs:   0.75rem / 1rem      (12px — timestamps, metadata)
--text-sm:   0.875rem / 1.25rem  (14px — labels, body)
--text-base: 1rem / 1.5rem      (16px — primary content)
--text-lg:   1.125rem / 1.75rem  (18px — section titles)
--text-xl:   1.25rem / 1.75rem  (20px — page title)
--text-2xl:  1.5rem / 2rem      (24px — hero numbers)
--text-3xl:  1.875rem / 2.25rem (30px — big stat numbers)
```

---

## 5. Component Library

### 5.1 Stat Card
```
┌─────────────────────┐
│  Label (text-muted)  │
│  42  (text-3xl bold) │
│  ↑12% (trend color)  │
└─────────────────────┘

Variants:
- Default:  bg-card, border
- Success:  left-border emerald-500, number in emerald
- Warning:  left-border amber-500, number in amber
- Error:    left-border red-500, number in red
- Clickable: hover:bg-card-hover, cursor-pointer, subtle arrow icon
```

### 5.2 Status Badge
```
[ ● Label ]

Variants:
- published:  bg-emerald-900/50 text-emerald-300, dot emerald-400
- draft:      bg-zinc-800 text-zinc-300, dot zinc-400
- reservoir:  bg-blue-900/50 text-blue-300, dot blue-400
- rejected:   bg-red-900/50 text-red-300, dot red-400
- stuck:      bg-orange-900/50 text-orange-300, dot orange-400 (pulse animation)
- indexed:    bg-purple-900/50 text-purple-300, dot purple-400
- scoring:    bg-purple-900/50 text-purple-300, dot purple-400
```

### 5.3 Alert Banner
```
┌──────────────────────────────────────┐
│ 🚨 [CRITICAL] Title                  │
│ Description text explaining issue     │
│ 💡 Suggested fix                      │
│              [ Fix Now Button ]        │
└──────────────────────────────────────┘

Severity backgrounds:
- critical: bg-red-950 border-red-800
- warning:  bg-amber-950 border-amber-800
- info:     bg-blue-950 border-blue-800
```

### 5.4 Action Button
```
[ 🚀  Label ]

Variants:
- Primary:  bg-emerald-600 hover:bg-emerald-500 text-white (large, full-width for main CTA)
- Default:  bg-zinc-800 hover:bg-zinc-700 text-zinc-200
- Danger:   bg-red-900/40 hover:bg-red-800 text-red-300
- Warning:  bg-amber-900/40 hover:bg-amber-800 text-amber-300
- Ghost:    bg-transparent hover:bg-zinc-800 text-zinc-400

States:
- Loading:  opacity-70, spinner icon replaces emoji, "Running..." text
- Disabled: opacity-50, cursor-not-allowed
- Success:  brief green flash + checkmark before reverting
```

### 5.5 Pipeline Flow Bar
```
Topics ──→ Building ──→ Reservoir ──→ Published
  12          4            8            156

Visual: Horizontal connected nodes with counts inside circles.
Active nodes glow/pulse slightly. Each node is tappable.
```

### 5.6 Progress Segments Bar
```
████████████░░░░░░░░░░░░░

Segments (left to right, proportional width):
- Emerald:  Indexed (65%)
- Blue:     Submitted (10%)
- Amber:    Discovered (5%)
- Red:      Errors (2%)
- Gray:     Never submitted (18%)

Below bar: legend with colored dots + counts
Height: 8px, rounded-full
```

### 5.7 Cron Job Card
```
┌──────────────────────────────────────┐
│ ● weekly-topics          3h 12m ago  │
│   Last: ✅ 14 items · 8.2s           │
│   "Found 14 topics for yalla-london"  │
│                        [ Run Now ▶ ]  │
└──────────────────────────────────────┘

Status dot:
- Green ●: Last run succeeded (< 24h ago)
- Red ●:   Last run failed
- Gray ●:  Never run / no data
- Amber ●: Running now (pulse)
```

### 5.8 Article Row (Content Matrix)
```
┌──────────────────────────────────────┐
│ Best Halal Restaurants in Mayfair    │
│ [Published] SEO:82 Words:1,847 🟢    │
│ GSC: 12 clicks · 340 impressions     │
│          [ Expand ▼ ]                │
└──────────────────────────────────────┘

Expanded (tapped):
┌──────────────────────────────────────┐
│ Gate Check Results:                  │
│ ✅ Route exists                       │
│ ✅ Arabic route                       │
│ ✅ Meta title (54 chars)              │
│ ✅ Word count (1,847)                 │
│ ❌ Internal links (1 — need 3)       │
│ ⚠️ Affiliate links (1 — want 2)     │
│                                      │
│ [Publish] [Re-queue] [Delete]        │
└──────────────────────────────────────┘
```

### 5.9 Site Summary Card
```
┌──────────────────────────────────────┐
│ 🇬🇧 Yalla London                     │
│ yalla-london.com              [Active]│
│                                      │
│ Articles: 156  Published: 142        │
│ Reservoir: 8   Pipeline: 4          │
│ SEO Avg: 74    Index: 89%           │
│                                      │
│ Last published: 2h ago               │
│ [ View Site ] [ Publish Ready (3) ]  │
└──────────────────────────────────────┘
```

---

## 6. Page Layouts

### 6.1 Mission Control (Default Tab — Most Important)

**Mobile Layout (375px):**

```
┌─────────────────────────────────┐
│  ☰  COCKPIT    🔄 ⏸  site ▼   │  ← Header: hamburger, title, refresh toggle, site picker
├─────────────────────────────────┤
│ [Mission] [Content] [Pipeline]  │  ← Tab bar (horizontally scrollable)
│ [Crons] [Sites] [AI] [Settings]│
├─────────────────────────────────┤
│                                 │
│ ┌─ System Status ─────────────┐│
│ │ DB ● 12ms  AI ●  Index ●   ││  ← Green/red dots, inline
│ │ GSC ●  Cron ●  Email ●     ││
│ └─────────────────────────────┘│
│                                 │
│ ┌─ Alert ─────────────────────┐│  ← Only if alerts exist
│ │ 🚨 No articles published     ││
│ │    today. Pipeline may be    ││
│ │    stuck.                    ││
│ │    💡 Check Crons tab        ││
│ └─────────────────────────────┘│
│                                 │
│ ┌─ Pipeline Flow ─────────────┐│
│ │                              ││
│ │  (12)→(4)→(8)→(156)         ││
│ │  Topics Build Res. Pub'd    ││
│ │                              ││
│ │ ┌──┬──┬──┬──┬──┬──┬──┬──┐  ││  ← 8-cell phase grid
│ │ │R3│O2│D1│A0│I0│S1│Q1│R8│  ││
│ │ └──┴──┴──┴──┴──┴──┴──┴──┘  ││
│ └─────────────────────────────┘│
│                                 │
│ ┌──────┐┌──────┐┌──────┐      │  ← 3-col stat cards
│ │Pub'd ││Index ││Crons │      │
│ │  2   ││ 89%  ││ OK ✅│      │
│ │today ││      ││      │      │
│ └──────┘└──────┘└──────┘      │
│                                 │
│ ┌─ Indexing Health ───────────┐│
│ │ ████████████░░░░░░          ││  ← Segmented bar
│ │ ● 142 indexed  ● 6 pending ││
│ │ ● 3 errors    ● 5 new      ││
│ │                              ││
│ │ Velocity: 2.1/day ↑         ││
│ │ Avg time to index: 3.2 days ││
│ │                              ││
│ │ GSC 7d: 89 clicks · 2.4k imp││
│ └─────────────────────────────┘│
│                                 │
│ ┌─ Revenue & Costs (7d) ──────┐│
│ │ ┌────┐ ┌────┐ ┌────┐       ││
│ │ │ 23 │ │  4 │ │$12 │       ││
│ │ │clks│ │conv│ │rev │       ││
│ │ └────┘ └────┘ └────┘       ││
│ │ AI cost this week: $2.34    ││
│ └─────────────────────────────┘│
│                                 │
│ ┌─ Quick Actions ─────────────┐│
│ │ ┌───────────────────────┐   ││
│ │ │  🚀 LAUNCH — Publish  │   ││  ← Full-width, large, emerald
│ │ │     Everything Ready   │   ││
│ │ └───────────────────────┘   ││
│ │ ┌──────────┐┌──────────┐   ││  ← 2-col grid
│ │ │🔬 Topics ││✍️ Build  │   ││
│ │ └──────────┘└──────────┘   ││
│ │ ┌──────────┐┌──────────┐   ││
│ │ │📤 Force  ││🔍 Submit │   ││
│ │ │  Publish ││ to Google│   ││
│ │ └──────────┘└──────────┘   ││
│ │ ┌──────────┐┌──────────┐   ││
│ │ │📡 Sync   ││🩺 System │   ││
│ │ │  GSC     ││ Validator│   ││
│ │ └──────────┘└──────────┘   ││
│ └─────────────────────────────┘│
│                                 │
│ ┌─ Recent Activity ───────────┐│
│ │ ✅ content-builder  · 3 items││
│ │    2m ago · 8.2s             ││
│ │ ✅ seo-agent · 5 items       ││
│ │    15m ago · 12.1s           ││
│ │ ❌ weekly-topics · 0 items   ││
│ │    1h ago · "Timeout at 53s" ││
│ │ ✅ content-selector · 1 item ││
│ │    2h ago · 3.4s             ││
│ └─────────────────────────────┘│
│                                 │
│ ┌─ Stuck Drafts (2) ─────────┐│  ← Only if stuck drafts exist
│ │ ⚠️ "halal food mayfair"     ││
│ │    12h stuck in assembly     ││
│ │    Error: AI timeout         ││
│ │ ⚠️ "luxury hotels chelsea"  ││
│ │    8h stuck in seo phase     ││
│ │           [ ⚡ Fix All (2) ] ││
│ └─────────────────────────────┘│
│                                 │
└─────────────────────────────────┘
```

### 6.2 Content Matrix Tab

```
┌─────────────────────────────────┐
│  ☰  COCKPIT    🔄 ⏸  site ▼   │
├─────────────────────────────────┤
│ [Mission] [Content] [Pipeline]  │
├─────────────────────────────────┤
│                                 │
│ [📄 Articles] [🔬 Research]    │  ← Sub-view toggle
│                                 │
│ ┌─ Filters ───────────────────┐│
│ │ [All 156] [Published 142]   ││
│ │ [Draft 2] [Reservoir 8]     ││
│ │ [Rejected 3] [Stuck 1]     ││
│ │                              ││
│ │ 🔍 Search articles...       ││
│ └─────────────────────────────┘│
│                                 │
│ ┌─ Quick Actions ─────────────┐│
│ │ [▶ Run Pipeline] [📤 Pub]   ││
│ │ [🔄 Refresh]                ││
│ └─────────────────────────────┘│
│                                 │
│ ┌─ Article ───────────────────┐│
│ │ Best Halal Restaurants in    ││
│ │ Mayfair 2026                 ││
│ │ [Published] SEO:82  1,847w  ││
│ │ 🟢 Indexed · 12 clicks      ││
│ │              [ ▼ Details ]   ││
│ └─────────────────────────────┘│
│                                 │
│ ┌─ Article ───────────────────┐│
│ │ Top 10 Luxury Hotels in      ││
│ │ Kensington                   ││
│ │ [Reservoir] SEO:71  1,203w  ││
│ │ 📝 Needs expansion (1,203w) ││
│ │ Why not published:           ││
│ │  · Internal links: 1 (need 3)│
│ │              [ ▼ Details ]   ││
│ └─────────────────────────────┘│
│                                 │
│ ┌─ Article ───────────────────┐│
│ │ Weekend in Shoreditch         ││
│ │ [⚠️ Stuck] SEO:-- 412w      ││
│ │ ⚠️ 8h stuck in assembly     ││
│ │ Error: AI timeout             ││
│ │     [ Re-queue ] [ Delete ]  ││
│ └─────────────────────────────┘│
│                                 │
│ ... more articles (scroll)      │
└─────────────────────────────────┘
```

### 6.3 Research & Create Sub-View

```
┌─────────────────────────────────┐
│ [📄 Articles] [🔬 Research]    │
├─────────────────────────────────┤
│                                 │
│ ┌─ Topic Research ────────────┐│
│ │ Focus area (optional):       ││
│ │ ┌─────────────────────────┐ ││
│ │ │ ramadan london          │ ││
│ │ └─────────────────────────┘ ││
│ │         [ 🔬 Research Topics]││
│ └─────────────────────────────┘│
│                                 │
│ ┌─ Results: 20 topics ────────┐│
│ │ Selected: 3 of 5 max        ││
│ │                              ││
│ │ ┌─ Topic Card ─────────────┐││
│ │ │ ☑ #1                      │││
│ │ │ "ramadan iftar london     │││
│ │ │  restaurants 2026"        │││
│ │ │                            │││
│ │ │ Vol: HIGH  Trend: 📈      │││
│ │ │ Competition: LOW 🟢       │││
│ │ │ Relevance: 94/100         │││
│ │ │ Type: listicle             │││
│ │ │                            │││
│ │ │ Long-tails:                │││
│ │ │ · best iftar deals london │││
│ │ │ · ramadan buffet mayfair  │││
│ │ │                            │││
│ │ │ Angle: "Insider guide to   │││
│ │ │ the best iftar spots..."  │││
│ │ └──────────────────────────┘││
│ │                              ││
│ │ ┌─ Topic Card ─────────────┐││
│ │ │ ☐ #2                      │││
│ │ │ "luxury spa hotels        │││
│ │ │  london with pool"        │││
│ │ │ Vol: MED   Trend: ➡️      │││
│ │ │ Competition: MED 🟡       │││
│ │ └──────────────────────────┘││
│ │                              ││
│ │ ... more topic cards         ││
│ │                              ││
│ │ ┌───────────────────────┐   ││
│ │ │ ✍️ Create 3 Articles   │   ││  ← Emerald, prominent
│ │ └───────────────────────┘   ││
│ └─────────────────────────────┘│
└─────────────────────────────────┘
```

### 6.4 Departures Board

```
┌─────────────────────────────────┐
│  ☰  ✈️ DEPARTURES    🔄 site▼  │
├─────────────────────────────────┤
│ [All] [⏰ Overdue] [✅ Ready]   │
│ [🔄 Cron] [📄 Pub] [📝 Content]│
├─────────────────────────────────┤
│                                 │
│ ┌─ OVERDUE ───────────────────┐│  ← Red pulse indicator
│ │ 🔴 weekly-topics             ││
│ │    Scheduled: Mon 4:00 UTC   ││
│ │    ⏱ 2d 3h overdue          ││
│ │    Last: ❌ failed (timeout)  ││
│ │              [ ▶ Do Now ]    ││
│ └─────────────────────────────┘│
│                                 │
│ ┌─ NEXT UP ───────────────────┐│
│ │ 🟡 content-builder           ││
│ │    Next: in 12 minutes       ││
│ │    Every 15 min              ││
│ │    Last: ✅ 3 items · 8s     ││
│ │              [ ▶ Do Now ]    ││
│ ├─────────────────────────────┤│
│ │ 🟡 seo-agent                 ││
│ │    Next: in 47 minutes       ││
│ │    3x daily (7, 13, 20 UTC)  ││
│ │    Last: ✅ 5 items · 12s    ││
│ │              [ ▶ Do Now ]    ││
│ ├─────────────────────────────┤│
│ │ 🟣 "Best Halal Restaurants"  ││
│ │    Scheduled: Today 16:00    ││
│ │    ⏱ in 3h 22m              ││
│ │    Type: Scheduled Publish   ││
│ │              [ ▶ Do Now ]    ││
│ ├─────────────────────────────┤│
│ │ 💜 8 articles in reservoir   ││
│ │    Ready to publish now      ││
│ │    Avg SEO: 76               ││
│ │         [ ▶ Publish All ]    ││
│ └─────────────────────────────┘│
│                                 │
│ ... more departures (scroll)    │
└─────────────────────────────────┘
```

### 6.5 AI Costs Page

```
┌─────────────────────────────────┐
│  ☰  AI COSTS    [Today ▼]      │
├─────────────────────────────────┤
│                                 │
│ ┌──────┐┌──────┐┌──────┐      │
│ │$2.34 ││ 847  ││  42  │      │
│ │ cost ││calls ││tasks │      │
│ │ 7d   ││ 7d   ││ 7d   │      │
│ └──────┘└──────┘└──────┘      │
│                                 │
│ ┌─ Spend by Provider ─────────┐│
│ │ Grok    ████████████ $1.82  ││
│ │ Claude  ████         $0.34  ││
│ │ OpenAI  ██           $0.12  ││
│ │ Gemini  █            $0.06  ││
│ └─────────────────────────────┘│
│                                 │
│ ┌─ Spend by Task ─────────────┐│
│ │ Content Gen ██████████ $1.45││
│ │ SEO Audit   ████      $0.42││
│ │ Topic Resrch ███      $0.28││
│ │ Translations ██       $0.12││
│ │ Other        █        $0.07││
│ └─────────────────────────────┘│
│                                 │
│ ┌─ Daily Trend (30d) ─────────┐│
│ │  $                           ││
│ │  │    ╱╲                     ││
│ │  │   ╱  ╲  ╱╲╱╲             ││
│ │  │──╱────╲╱────╲──          ││
│ │  │╱              ╲          ││
│ │  └────────────────────→ day ││
│ └─────────────────────────────┘│
│                                 │
│ ┌─ Recent Calls ──────────────┐│
│ │ content-builder · grok       ││
│ │ 1,247 tok · $0.003 · 2m ago ││
│ │ seo-agent · claude           ││
│ │ 823 tok · $0.008 · 5m ago   ││
│ │ ... live feed                ││
│ └─────────────────────────────┘│
└─────────────────────────────────┘
```

---

## 7. Navigation Structure

### Sidebar (Desktop — hidden on mobile, revealed by hamburger ☰)

```
COCKPIT                          ← Group header
  🏠 Mission Control             ← Primary, always first
  ✈️ Departures Board
  💰 AI Costs

CONTENT                          ← Group header
  📄 Articles
  🔬 Topics & Pipeline
  ✍️ Editor
  📊 Content Engine

SEO                              ← Group header
  🔍 SEO Audits
  🛡️ Master Audit
  📈 Analytics

MEDIA & DESIGN                   ← Group header
  🖼️ Media Library
  🎨 Design Hub
  📧 Email Campaigns
  📅 Social Calendar

YACHT MANAGEMENT                 ← Only visible for zenitha-yachts-med
  🚢 Fleet Inventory
  📋 Inquiries
  🗺️ Destinations
  🧭 Itineraries
  🤝 Brokers

SYSTEM                           ← Group header
  ⚙️ Settings
  🤖 Automation Hub
  🧠 Prompts
```

### Mobile Tab Bar (bottom, sticky — visible on all pages)
```
┌──────┬──────┬──────┬──────┬──────┐
│  🏠  │  📄  │  ✈️  │  💰  │  ☰  │
│ Home │ Content│ Deps│ Costs│ Menu│
└──────┴──────┴──────┴──────┴──────┘
```

---

## 8. Interaction Patterns

### Pull-to-Refresh
On mobile, pulling down triggers data reload. Shows a brief "Refreshing..." banner with spinner.

### Auto-Refresh
- Default: ON (60-second interval)
- Pause button (⏸) in header toggles off
- Visual indicator: subtle rotating icon when auto-refresh is active

### Toast Notifications
After actions (publish, run cron, delete), show a toast:
```
┌──────────────────────────┐
│ ✅ Published 3 articles   │  ← Success: emerald bg
│    to yalla-london.com    │
└──────────────────────────┘

┌──────────────────────────┐
│ ❌ Pipeline failed:       │  ← Error: red bg
│    AI provider timeout    │
└──────────────────────────┘
```
Duration: 4 seconds. Appears at bottom of screen. Stackable (max 3).

### Loading States
- Skeleton cards (pulsing zinc-800 blocks) for initial load
- Spinner overlay on buttons when action is running
- "Running..." text replaces button label during execution
- Never show blank white screens

### Empty States
When a section has no data:
```
┌─────────────────────────────────┐
│                                 │
│         📭                      │
│   No articles in reservoir      │
│                                 │
│   Articles land here after      │
│   passing all quality checks.   │
│                                 │
│   [ 🔬 Research Topics ]        │
│                                 │
└─────────────────────────────────┘
```

---

## 9. Data Shape Reference

When Stitch asks what data to populate, use these realistic sample values:

### Pipeline Numbers
```json
{
  "topicsReady": 12,
  "draftsActive": 4,
  "reservoir": 8,
  "publishedToday": 2,
  "publishedTotal": 156,
  "byPhase": {
    "research": 1, "outline": 1, "drafting": 1, "assembly": 0,
    "images": 0, "seo": 1, "scoring": 0, "reservoir": 8
  }
}
```

### Indexing Numbers
```json
{
  "total": 156, "indexed": 142, "submitted": 6, "discovered": 3,
  "neverSubmitted": 5, "errors": 2, "rate": 89,
  "velocity7d": 2.1, "avgTimeToIndexDays": 3.2,
  "gscTotalClicks7d": 89, "gscTotalImpressions7d": 2400,
  "gscClicksTrend": 12, "gscImpressionsTrend": -3
}
```

### Revenue Numbers
```json
{
  "affiliateClicksToday": 23,
  "affiliateClicksWeek": 156,
  "conversionsWeek": 4,
  "revenueWeekUsd": 12.50,
  "topPartner": "HalalBooking",
  "aiCostWeekUsd": 2.34
}
```

### Sample Articles
```json
[
  {
    "title": "Best Halal Restaurants in Mayfair 2026",
    "status": "published",
    "seoScore": 82,
    "wordCount": 1847,
    "indexingStatus": "indexed",
    "gscClicks": 12,
    "gscImpressions": 340,
    "publishedAt": "2026-03-04T09:00:00Z"
  },
  {
    "title": "Top 10 Luxury Hotels in Kensington",
    "status": "reservoir",
    "seoScore": 71,
    "wordCount": 1203,
    "indexingStatus": "not_submitted",
    "whyNotPublished": ["Internal links: 1 (need 3)"],
    "stuckLabel": "Needs expansion (1,203w)"
  },
  {
    "title": "Weekend in Shoreditch: Street Art & Food Guide",
    "status": "stuck",
    "seoScore": null,
    "wordCount": 412,
    "phase": "assembly",
    "hoursStuck": 8,
    "error": "AI timeout after 53 seconds"
  }
]
```

### Sample Cron Jobs
```json
[
  { "name": "content-builder", "status": "success", "items": 3, "duration": "8.2s", "ago": "2m" },
  { "name": "seo-agent", "status": "success", "items": 5, "duration": "12.1s", "ago": "15m" },
  { "name": "weekly-topics", "status": "failed", "items": 0, "duration": "53s", "ago": "1h", "error": "Timeout at 53s budget guard" },
  { "name": "content-selector", "status": "success", "items": 1, "duration": "3.4s", "ago": "2h" },
  { "name": "content-auto-fix", "status": "success", "items": 2, "duration": "6.7s", "ago": "3h" }
]
```

---

## 10. Design Variations to Explore in Stitch

Try asking Stitch to generate these variations:

1. **"Generate a mobile-first dark dashboard matching this spec"** — baseline
2. **"Make the pipeline flow more visual — use a Kanban board instead of a flow bar"**
3. **"Add a large hero stat at the top showing daily revenue with a sparkline"**
4. **"Make the departures board look more like an actual airport departure screen with flip-clock countdown timers"**
5. **"Try a card-heavy layout where each section is a swipeable card carousel"**
6. **"Make the Quick Actions section a floating action button (FAB) with radial menu"**
7. **"Add a 'health score' ring chart (0-100) as the first thing visible on Mission Control"**
8. **"Try splitting Mission Control into 2 halves: left = status, right = actions"**
9. **"Design a notification center slide-out panel for alerts and cron failures"**
10. **"Create a compact 'widget' version of Mission Control that fits in one screen without scrolling"**

---

## 11. Constraints for Stitch

When prompting Stitch, include these constraints:

- **Viewport:** 375px width (iPhone SE/13 Mini), 390px (iPhone 14), 430px (iPhone 14 Pro Max)
- **Safe area:** Respect iOS safe area insets (top notch, bottom home indicator)
- **Touch targets:** Minimum 44x44px per Apple HIG
- **Max scroll depth:** Most important info in first 600px of viewport
- **No hover-only interactions:** Everything must work with tap
- **Font minimum:** 12px (nothing smaller on mobile)
- **Contrast ratio:** Minimum 4.5:1 for text (WCAG AA)
- **Animation:** Subtle only — no distracting motion. Respect prefers-reduced-motion.
- **Color blindness safe:** Don't rely on color alone — always pair with icons/text

---

*This spec is a snapshot of the Yalla London admin dashboard as of March 6, 2026. Generated for design exploration in Google Stitch — no code or database connectivity required.*
