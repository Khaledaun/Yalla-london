# DESIGN.md — Zenitha.Luxury Design System

> **Version:** 1.0 | **Updated:** 2026-04-03 | **Format:** Google Stitch 9-Section
>
> Single source of truth for all visual decisions across the Zenitha.Luxury network.
> AI agents, developers, and designers: reference this file before building any UI.

---

## Table of Contents

1. [Visual Theme & Atmosphere](#1-visual-theme--atmosphere)
2. [Color Palette & Roles](#2-color-palette--roles)
3. [Typography Rules](#3-typography-rules)
4. [Component Stylings](#4-component-stylings)
5. [Layout Principles](#5-layout-principles)
6. [Depth & Elevation](#6-depth--elevation)
7. [Do's and Don'ts](#7-dos-and-donts)
8. [Responsive Behavior](#8-responsive-behavior)
9. [Agent Prompt Guide](#9-agent-prompt-guide)

---

## 1. Visual Theme & Atmosphere

### Brand DNA

**Zenitha.Luxury** is a luxury travel content network. The visual language must feel like a curated travel magazine — editorial, warm, confident, never corporate or generic.

**Keywords:** Editorial luxury, warm minimalism, cultural richness, bilingual elegance, travel authority.

### Per-Site Mood

| Site | Mood | Aesthetic | Primary + Secondary |
|------|------|-----------|---------------------|
| **Yalla London** | Sophisticated city guide | Deep navy + warm gold, editorial serif typography, parchment textures | `#C8322B` + `#C49A2A` |
| **Arabaldives** | Tropical paradise | Turquoise waters, coral warmth, airy spacing | `#0891B2` + `#06B6D4` |
| **Yalla Riviera** | Mediterranean elegance | Navy + champagne gold, sun-drenched, lavender accents | `#1E3A5F` + `#D4AF37` |
| **Yalla Istanbul** | Ottoman grandeur meets modern | Rich burgundy + copper, mosaic patterns, bold contrasts | `#DC2626` + `#F97316` |
| **Yalla Thailand** | Serene tropical luxury | Emerald + golden amber, flowing motion, organic shapes | `#059669` + `#D97706` |
| **Zenitha Yachts** | Maritime luxury | Deep navy + antique gold, clean sans-serif, nautical precision | `#0A1628` + `#C9A96E` |
| **Zenitha.Luxury** | Parent brand | Pure obsidian + gold, ultra-minimal, prestige | `#0A0A0A` + `#C4A96C` |

### Signature Elements

- **Tri-color bar:** 3px horizontal stripe (red-gold-blue) on every Yalla London page. CSS: `.tricolor-bar` in `globals.css`.
- **LDN passport stamp:** Circular stamp motif used as watermark and interactive element. Color: `--yl-blue` / `#4A7BA8`.
- **Arabesque pattern:** Subtle geometric SVG overlay at 5% opacity for decorative sections. Defined in Tailwind `bg-pattern-arabesque`.
- **Gold accent lines:** Thin gold (`--yl-gold`) rules used as section dividers.

---

## 2. Color Palette & Roles

### 2.1 Shared Semantic Colors

These semantic mappings apply across ALL sites. The actual hex values change per site via CSS custom properties.

| Role | CSS Variable | Yalla London | Purpose |
|------|-------------|-------------|---------|
| Primary | `--color-primary` | `#C8322B` | CTAs, links, brand identity |
| Secondary | `--color-secondary` | `#C49A2A` | Accents, highlights, gold details |
| Accent | `--color-accent` | `#3B7EA1` | Info, interactive, Thames Blue |
| Background | `--color-background` | `#FAF8F4` | Page background (warm cream) |
| Text | `--color-text` | `#1C1917` | Primary body text (warm charcoal) |
| Muted | `--color-muted` | `#5C564F` | Secondary text, metadata |
| Cream | `--color-cream` | `#FAF8F4` | Light background |
| Sand | `--color-sand` | `#D6D0C4` | Borders, dividers |
| Forest | `--color-forest` | `#2D5A3D` | Success states |

### 2.2 Yalla London — Full Palette

**Token file:** `app/yalla-tokens.css` (CSS vars) + `tailwind.config.ts` (Tailwind classes)

| Token | Hex | Tailwind Class | Usage |
|-------|-----|---------------|-------|
| `--yl-red` | `#C8322B` | `text-yl-red`, `bg-london-600` | London Red — primary brand, CTAs |
| `--yl-gold` | `#C49A2A` | `text-yl-gold`, `bg-yalla-gold-500` | Gold — accents, highlights, dividers |
| `--yl-blue` | `#4A7BA8` | `text-yl-blue`, `bg-stamp-DEFAULT` | Stamp Blue — LDN stamp, interactive |
| `--yl-charcoal` | `#1C1917` | `text-yl-charcoal`, `bg-charcoal-DEFAULT` | Dark backgrounds, primary text |
| `--yl-parchment` | `#EDE9E1` | `text-yl-parchment` | Warm off-white surface |
| `--yl-cream` | `#F5F0E8` | `text-yl-cream`, `bg-cream-DEFAULT` | Light mode background |
| `--yl-navy` | `#1A2332` | `text-yl-navy` | Deep navy for hero sections |
| `--yl-dark-navy` | `#0F1621` | `text-yl-dark-navy` | Darkest background |

**Gray scale** (`--yl-gray-*`):

| Level | Hex | Usage |
|-------|-----|-------|
| 100 | `#F7F5F2` | Lightest surface |
| 200 | `#E8E3DB` | Card backgrounds |
| 300 | `#D4CFC5` | Borders |
| 400 | `#A09A8E` | Placeholder text |
| 500 | `#7A746A` | Secondary text |
| 600 | `#5A5449` | Strong secondary |

**Full scales** — `london/*` (50-950), `yalla-gold/*` (50-950), `thames/*` (50-950), `cream/*` (50-950) are available in Tailwind for fine-grained control. See `tailwind.config.ts`.

### 2.3 Zenitha Yachts — Maritime Palette

**Token file:** `app/zenitha-tokens.css` (scoped to `.zenitha-site` class)

| Token | Hex | Usage |
|-------|-----|-------|
| `--z-navy` | `#0A1628` | Primary background |
| `--z-midnight` | `#1B2A4A` | Card backgrounds |
| `--z-aegean` | `#2E5A88` | Links, interactive |
| `--z-ocean` | `#4A90B8` | Hover states |
| `--z-shallow` | `#7CB8D4` | Decorative, light accent |
| `--z-gold` | `#C9A96E` | Primary accent, CTAs |
| `--z-gold-dark` | `#8B6914` | WCAG AA safe gold on white (4.56:1) |
| `--z-champagne` | `#E8D5B5` | Borders, dividers |
| `--z-sand` | `#F5EDE0` | Light surface |
| `--z-pearl` | `#FAFAF7` | Background |
| `--z-mediterranean` | `#0EA5A2` | Success |
| `--z-coral` | `#E07A5F` | Warning, accent |
| `--z-storm` | `#DC2626` | Error, danger |

### 2.4 Zenitha.Luxury (Parent Brand)

**Tailwind prefix:** `zl-*`

| Token | Hex | Usage |
|-------|-----|-------|
| `zl-obsidian` | `#0A0A0A` | Primary background |
| `zl-midnight` | `#141414` | Card surface |
| `zl-charcoal` | `#2A2A2A` | Elevated surface |
| `zl-smoke` | `#4A4A4A` | Muted text |
| `zl-mist` | `#8A8A8A` | Secondary text |
| `zl-platinum` | `#D6D0C4` | Borders |
| `zl-cream` | `#F5F0E8` | Light surface |
| `zl-ivory` | `#FDFCF9` | Background |
| `zl-gold` | `#C4A96C` | Primary accent |
| `zl-gold-light` | `#E2CBA0` | Hover accent |
| `zl-gold-deep` | `#9A7A42` | Text-safe gold |

### 2.5 Admin Dashboard (Clean Light)

**Token file:** `globals.css` `:root` → `--admin-*`

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--admin-bg` | `#FAF8F4` | `#1C1917` | Page background |
| `--admin-card-bg` | `#FFFFFF` | `#292524` | Card surface |
| `--admin-border` | `rgba(214,208,196,0.6)` | `rgba(120,113,108,0.3)` | Borders |
| `--admin-text-primary` | `#1C1917` | `#F5F5F4` | Headings |
| `--admin-text-secondary` | `#57534e` | `#D6D3D1` | Body text |
| `--admin-text-muted` | `#a8a29e` | `#78716C` | Metadata |
| `--admin-red` | `#C8322B` | `#EF6461` | Brand red |
| `--admin-gold` | `#C49A2A` | `#E5B94E` | Brand gold |
| `--admin-blue` | `#3B7EA1` | `#5BA3C9` | Brand blue |
| `--admin-green` | `#2D5A3D` | `#4CAF6E` | Success |
| `--admin-shadow-sm` | `0 1px 3px rgba(28,25,23,0.04)` | `0 1px 3px rgba(0,0,0,0.2)` | Card shadow |
| `--admin-radius` | `12px` | `12px` | Card radius |

### 2.6 Status Colors (All Contexts)

| Status | Light BG | Text | Usage |
|--------|----------|------|-------|
| Success/Green | `rgba(45,90,61,0.08)` | `--admin-green` | Published, healthy |
| Warning/Gold | `rgba(196,154,42,0.08)` | `#6B4F0F` | In-progress, attention |
| Error/Red | `rgba(200,50,43,0.10)` | `#9B2520` | Failed, critical |
| Info/Blue | `rgba(59,126,161,0.08)` | `#1B5070` | Pending, submitted |
| Purple | `rgba(124,58,237,0.08)` | `#5B21B6` | Indexed, premium |

### 2.7 Gradients

| Name | Value | Tailwind | Usage |
|------|-------|---------|-------|
| Brand | `linear-gradient(135deg, #C8322B 0%, #8b1f1c 100%)` | `bg-gradient-luxury` | Hero sections |
| Gold | `linear-gradient(135deg, #C49A2A 0%, #d9b938 100%)` | `bg-gradient-gold` | Premium badges |
| Tricolor | `linear-gradient(90deg, #C8322B, #C49A2A, #3B7EA1)` | `bg-gradient-tricolor` | Decorative bars |

### 2.8 CSS Variable Naming Convention

```
Shared:    --color-{role}         (--color-primary, --color-background)
Yalla:     --yl-{name}           (--yl-red, --yl-gold, --yl-gray-300)
Zenitha:   --z-{name}            (--z-navy, --z-gold, --z-aegean)
Admin:     --admin-{name}        (--admin-bg, --admin-red)
Status:    --status-{color}-{bg|text}  (--status-green-bg)
```

---

## 3. Typography Rules

### 3.1 Font Stacks

| Role | Font | CSS Variable | Tailwind | Used For |
|------|------|-------------|---------|----------|
| Display | Anybody (400,600,700,800) | `--font-display` | `font-display` | Headlines, hero text |
| Editorial/Body | Source Serif 4 (400,600,700) | `--font-body` / `--font-editorial` | `font-body`, `font-editorial` | Body text, articles |
| System/Mono | IBM Plex Mono (300,400,500) | `--font-system` | `font-mono` | Code, data, admin UI |
| Arabic | Noto Sans Arabic (400,500,600,700) | `--font-arabic` | `font-arabic` | All Arabic text |
| Heading (alt) | Anybody | `--yl-font-heading` | `font-heading` | Section headings |

**Zenitha Yachts uses a different stack:**

| Role | Font | CSS Variable |
|------|------|-------------|
| Display | Playfair Display (400,500,700) | `--z-font-display` |
| Heading | DM Sans (400,500,600,700) | `--z-font-heading` |
| Body | Source Sans 3 (300,400,600) | `--z-font-body` |
| Arabic | IBM Plex Sans Arabic (300,400,500,700) | `--z-font-arabic` |
| Mono | JetBrains Mono (400,500) | `--z-font-mono` |

**Admin dashboard uses:**

| Role | Font | CSS Variable |
|------|------|-------------|
| UI | Space Grotesk | `--f-ui` / `font-zh-ui` |
| Mono | Space Mono | `--f-mono` / `font-zh-mono` |

### 3.2 Type Scale — Yalla London (Public Pages)

| Level | Size | Line Height | Weight | Font | Usage |
|-------|------|-------------|--------|------|-------|
| Hero | 40-48px | 1.1 | 800 | Anybody | Page hero headlines |
| H1 | 32-36px | 1.2 | 700 | Anybody | Page titles |
| H2 | 24-28px | 1.3 | 600 | Anybody | Section headers |
| H3 | 20px | 1.4 | 600 | Anybody | Subsection headers |
| H4 | 16-18px | 1.5 | 600 | Anybody | Card titles |
| Body Large | 18px | 1.7 | 400 | Source Serif 4 | Article body |
| Body | 16px | 1.6 | 400 | Source Serif 4 | Default text |
| Small | 14px | 1.5 | 400 | Source Serif 4 | Captions, metadata |
| Caption | 12px | 1.4 | 400 | IBM Plex Mono | Timestamps, labels |

### 3.3 Type Scale — Zenitha Yachts (Responsive via `clamp()`)

| Token | Range | Usage |
|-------|-------|-------|
| `--z-text-hero-display` | `clamp(2.75rem, 5vw+1rem, 5rem)` 44→80px | Hero display |
| `--z-text-display` | `clamp(2.25rem, 4vw+0.75rem, 3.75rem)` 36→60px | Display |
| `--z-text-title-lg` | `clamp(1.875rem, 3vw+0.5rem, 3rem)` 30→48px | Large title |
| `--z-text-title` | `clamp(1.5rem, 2.5vw+0.25rem, 2.25rem)` 24→36px | Title |
| `--z-text-subtitle` | `clamp(1.25rem, 2vw+0.25rem, 1.75rem)` 20→28px | Subtitle |

### 3.4 Type Scale — Admin Dashboard

| Level | Size | Weight | Font | Usage |
|-------|------|--------|------|-------|
| Page Header | 28px | 700 | `--font-display` | Page titles |
| Section Header | 20px | 600 | `--font-display` | Section labels |
| KPI Number | 24-30px | 700 | `--font-system` | Big statistics |
| Body | 14px | 400 | `--font-system` | Default text |
| Label | 12px | 500 | `--font-system` | Form labels, tags |
| Caption | 11px | 400 | `--font-system` | Timestamps, metadata |

### 3.5 Arabic Typography Rules

```css
[dir="rtl"], .type-ar, [lang="ar"] {
  letter-spacing: 0 !important;    /* Arabic NEVER uses letter-spacing */
  font-family: var(--font-arabic); /* Always switch to Arabic stack */
}
```

| Rule | Details |
|------|---------|
| **Letter spacing** | Always `0` — Arabic script has inherent connecting ligatures |
| **Minimum weight** | 400 — never use 300/light for Arabic (breaks readability) |
| **Line height** | Add +0.2 to English values (Arabic ascenders/descenders need more space) |
| **Text alignment** | Use `text-start`/`text-end` (logical), not `text-left`/`text-right` |
| **Font stack** | Noto Sans Arabic → IBM Plex Sans Arabic → Tahoma |
| **Number direction** | LTR within RTL context (CSS `unicode-bidi: embed` if needed) |
| **Heading size** | Same or 5% smaller than English equivalent |

### 3.6 Font Loading Strategy

Fonts are loaded via `<link rel="preload">` in `app/layout.tsx` (not CSS `@import`) for better Core Web Vitals. Strategy: `font-display: swap` with system font fallbacks.

```
Non-yacht sites: Anybody + Source Serif 4 + IBM Plex Mono + Noto Sans Arabic
Yacht site:      Playfair Display + DM Sans + Source Sans 3 + IBM Plex Sans Arabic + JetBrains Mono
Admin:           Space Mono + Space Grotesk (via next/font)
```

---

## 4. Component Stylings

### 4.1 Buttons

All buttons use `font-[var(--font-system)]`, `uppercase`, `tracking-[0.5px]`, `font-semibold`, `rounded-lg`, and `active:scale-[0.97]` for micro-interaction feedback.

| Variant | Background | Text | Border | Use Case |
|---------|-----------|------|--------|----------|
| **Primary** | `var(--admin-red)` `#C8322B` | White | None | Main CTA: Publish, Save, Create |
| **Secondary** | White `var(--admin-card-bg)` | `var(--admin-text)` | `var(--admin-border-hover)` | Cancel, Back, Filter |
| **Danger** | `var(--admin-red)` | White | None | Delete, Unpublish |
| **Success** | `var(--admin-green)` `#2D5A3D` | White | None | Approve, Publish Now |
| **Ghost** | Transparent | `var(--admin-text-muted)` | None | Tertiary actions, dismiss |

**Sizes:**

| Size | Padding | Font | Min Height |
|------|---------|------|------------|
| `sm` | `px-3 py-1.5` | 11px | 36px |
| `md` | `px-4 py-2` | 11px | 40px |
| `lg` | `px-5 py-2.5` | 12px | 44px (touch target) |

**States:** `disabled:opacity-50`, `disabled:pointer-events-none`. Loading: spinner replaces content (never hides button).

**Public site buttons** (Yalla London):

| Variant | Style | CSS Class |
|---------|-------|-----------|
| **Brand Primary** | `bg-london-600` rounded-lg, white text | `.btn-primary` or `bg-london-600 text-white` |
| **Gold Accent** | `bg-yalla-gold-500` rounded-lg, white text | `bg-yalla-gold-500 text-white` |
| **Outline** | Transparent, `border-london-600`, red text | `border border-london-600 text-london-600` |
| **Stamp** | `bg-stamp` (blue), white text, subtle rotation | Interactive passport stamp CTA |

### 4.2 Cards

**Admin Cards** (`AdminCard` component):

| Prop | Style | Use Case |
|------|-------|----------|
| Default | White bg, `border-[var(--admin-border)]`, `shadow-sm`, `rounded-xl`, `p-5` | Standard content container |
| `elevated` | + `shadow-lg` | Prominent/focused card |
| `accent` | + 3px colored top border (`red` / `gold` / `blue` / `green`) | KPI highlights, alerts |

**Public Cards:**

| Type | Background | Border | Shadow | Border Radius |
|------|-----------|--------|--------|---------------|
| Content Card | White | `border-sand` | `shadow-card` | `rounded-card` (16px) |
| Stat Card | White | `border-sand` | `shadow-md` | `rounded-xl` |
| Dark Card | `var(--yl-charcoal)` | `--yl-border-subtle` | `--yl-shadow-md` | `--yl-radius-lg` (14px) |
| Hover Card | White | `border-sand` | → `shadow-hover` on hover | `rounded-xl` |

### 4.3 Status Badges

Pill-shaped badges with dot indicator. All use `font-[var(--font-system)]`, `text-[11px]`, `font-semibold`, `rounded-full`, `px-2.5 py-1`.

| Status | Dot Color | Background | Text Color |
|--------|-----------|------------|------------|
| `published` / `success` / `indexed` / `active` | `var(--admin-green)` | `var(--status-green-bg)` | `var(--admin-green)` |
| `draft` / `pending` / `warning` | `var(--admin-gold)` | `var(--status-gold-bg)` | `var(--status-gold-text)` |
| `reservoir` / `promoting` | `var(--admin-blue)` | `var(--status-blue-bg)` | `var(--status-blue-text)` |
| `stuck` / `failed` / `error` / `rejected` | `var(--admin-red)` | `var(--status-red-bg)` | `var(--status-red-text)` |
| `running` / `generating` | `var(--status-purple)` | `var(--status-purple-bg)` | `var(--status-purple-text)` |
| `inactive` (default) | `stone-400` | `var(--admin-bg)` | `var(--admin-text-muted)` |

### 4.4 KPI Cards

Large numeric display with optional trend indicator.

```
┌─────────────────────────┐
│         42              │  ← font-display, extrabold, 28px, brand color
│        ↑ 15%            │  ← 11px, green (positive) or red (negative)
│   PUBLISHED TODAY       │  ← 11px, uppercase, tracking-[0.8px], muted
└─────────────────────────┘
```

Style: `bg-white rounded-xl p-4 text-center border border-[var(--admin-border)] shadow-sm`. Clickable variant adds `cursor-pointer hover:shadow-lg active:scale-[0.98]`.

### 4.5 Navigation

**Admin Sidebar:**
- Width: 240px desktop, slide-out on mobile (bottom sheet)
- Background: White (`var(--admin-card-bg)`)
- Items: `py-2 px-3`, 44px min height, `rounded-lg` hover
- Active state: `bg-[var(--admin-bg)]` with left border accent
- Section headers: `AdminSectionLabel` — 11px, uppercase, tracking-[1.2px], muted
- Tri-color bar at top: 3px stripe `(red-gold-blue)` branding

**Public Navigation:**
- Fixed top, transparent → `bg-[var(--yl-dark-navy)]/95 backdrop-blur` on scroll
- Logo: 40px height
- Desktop: horizontal link list, `flex gap-6`
- Mobile (≤768px): `nav ul { display: none }`, `nav select { display: block }` — native dropdown
- z-index: `var(--yl-z-nav)` (100)

### 4.6 Forms & Inputs

| Element | Style |
|---------|-------|
| Text Input | `bg-white border border-[var(--admin-border)] rounded-lg px-3 py-2`, 44px min height, focus: `ring-2 ring-[var(--admin-blue)]/20 border-[var(--admin-blue)]` |
| Select | Same as text input + chevron icon right |
| Textarea | Same as text input, `min-h-[100px]`, resizable vertical |
| Checkbox | Custom `w-5 h-5`, `accent-[var(--admin-red)]` or brand color |
| Label | `font-[var(--font-system)] text-[11px] font-semibold uppercase tracking-[0.8px]` |
| Error text | `text-[var(--admin-red)] text-[11px]` below input |
| Help text | `text-[var(--admin-text-muted)] text-[11px]` below input |

### 4.7 Alerts & Banners

`AdminAlertBanner` component with 4 severity levels:

| Severity | Icon | Left Border | Background | Text |
|----------|------|-------------|------------|------|
| `success` | CheckCircle | `var(--admin-green)` | `var(--status-green-bg)` | `var(--admin-green)` |
| `warning` | AlertTriangle | `var(--admin-gold)` | `var(--status-gold-bg)` | `var(--status-gold-text)` |
| `error` | XCircle | `var(--admin-red)` | `var(--status-red-bg)` | `var(--status-red-text)` |
| `info` | Info | `var(--admin-blue)` | `var(--status-blue-bg)` | `var(--status-blue-text)` |

Structure: `rounded-lg border-l-4 px-4 py-3` with icon + title + description. Optional dismiss button (X icon).

### 4.8 Tabs

`AdminTabs` component:

- Container: horizontal scroll, `gap-1`, `border-b border-[var(--admin-border)]`
- Tab button: `px-3 py-2`, `text-[11px]`, uppercase, `tracking-[0.5px]`
- Active: `border-b-2 border-[var(--admin-red)] text-[var(--admin-text)] font-bold`
- Inactive: `text-[var(--admin-text-muted)]`, hover: `text-[var(--admin-text)]`
- WAI-ARIA: container `role="tablist"`, buttons `role="tab"` + `aria-selected`

---

## 5. Layout Principles

### 5.1 Spacing System (8px Grid)

All spacing follows an 8px base grid with 4px subdivisions for fine adjustments.

| Token | Value | CSS Variable | Tailwind | Use Case |
|-------|-------|-------------|----------|----------|
| xs | 4px | `--yl-space-xs` | `gap-1`, `p-1` | Icon-to-text, badge padding |
| sm | 8px | `--yl-space-sm` | `gap-2`, `p-2` | Between related items |
| md | 16px | `--yl-space-md` | `gap-4`, `p-4` | Card padding, section gaps |
| lg | 24px | `--yl-space-lg` | `gap-6`, `p-6` | Between sections |
| xl | 32px | `--yl-space-xl` | `gap-8`, `p-8` | Major section padding |
| 2xl | 48px | `--yl-space-2xl` | `gap-12`, `p-12` | Page-level vertical rhythm |
| 3xl | 64px | `--yl-space-3xl` | `gap-16`, `p-16` | Hero spacing |

**Rule:** Component internal padding uses `md` (16px). Space between components uses `lg` (24px). Space between page sections uses `2xl` (48px) or `3xl` (64px).

### 5.2 Container Widths

| Breakpoint | Max Width | Padding | Tailwind |
|-----------|-----------|---------|----------|
| Mobile (≤768px) | 100% | 16-20px sides | `px-4` to `px-5` |
| Tablet (769–1024px) | 100% | 20-24px sides | `px-5` to `px-6` |
| Desktop (1025px+) | 1200px | Auto-centered | `max-w-[1200px] mx-auto` |
| Admin container | 1400px | 32px sides | `container` (Tailwind preset) |

### 5.3 Grid Systems

**Public site:**

| Grid | Mobile | Tablet | Desktop | CSS Class |
|------|--------|--------|---------|-----------|
| Logo grid | 2 cols | 3 cols | 4 cols | `.logo-grid` |
| Icon grid | 4 cols | 5 cols | 8 cols | `.icon-grid` |
| Animation grid | 2 cols | 3 cols | 3 cols | `.anim-grid` |
| Social stack | Stack | 2 cols | 3 cols | `.social-stack` |
| Swatch row | 2 cols | 2 cols | auto | `.swatch-row` |

**Admin pages:**
- Dashboard: single column mobile, 2-col grid `lg:grid-cols-2` desktop
- Tables: card view on mobile (≤768px), table view on desktop via `responsive-table.tsx`
- KPI row: `grid grid-cols-2 md:grid-cols-4 gap-3`

### 5.4 Section Padding

| Context | Mobile (≤390px) | Standard (391–430px) | Desktop (1025+) |
|---------|----------------|---------------------|-----------------|
| Page section | `40px 16px` | `48px 20px` | `64px auto` (1200px max) |
| Hero | `min-height: auto` (landscape) | `min-height: 80vh` | `min-height: 90vh` |
| Admin page | `p-4` (16px all sides) | `p-5` (20px) | `p-6` to `p-8` |

### 5.5 Bilingual / RTL Layout Rules

| Rule | Implementation |
|------|----------------|
| **Use logical properties** | `margin-inline-start` not `margin-left`; `text-start` not `text-left` |
| **Direction attribute** | Set `dir="rtl"` on `<html>` or section container, never individual elements |
| **Flexbox reversal** | Flex layouts auto-reverse with `dir="rtl"` — no CSS change needed |
| **Grid columns** | Grid does NOT auto-reverse — use `direction: rtl` on the grid container |
| **Icons** | Directional icons (arrows, chevrons) must flip: `[dir="rtl"] .icon-arrow { transform: scaleX(-1) }` |
| **Numbers** | Always LTR, even in RTL context. Use `unicode-bidi: embed` or `dir="ltr"` on number spans |
| **Inline gaps** | Use `gap` not `margin-right` — gap respects `dir` automatically |
| **Mixed content** | EN text in AR paragraph: wrap in `<span dir="ltr">` |
| **Padding** | Admin cards use `p-5` (all sides equal) — RTL-safe by default |

### 5.6 Z-Index Scale

| Layer | Value | CSS Variable | Use |
|-------|-------|-------------|-----|
| Base content | 0 | — | Default stacking |
| Elevated cards | 10 | — | Hover states, dropdowns |
| Navigation | 100 | `--yl-z-nav` | Fixed header |
| Tri-color bar | 101 | `--yl-z-tribar` | Above nav |
| Overlay/backdrop | 150 | — | Modal backdrops, drawers |
| Modal | 200 | `--yl-z-modal` | Dialog content |
| Toast/snackbar | 300 | `--yl-z-toast` | Notifications |
| Tooltip | 400 | — | Tooltip popover |

---

## 6. Depth & Elevation

### 6.1 Unified Shadow Scale

Three shadow systems exist in the codebase. This section unifies them into one reference.

| Level | CSS Variable | Value | Use |
|-------|-------------|-------|-----|
| **None** | — | `none` | Flat elements, inline content |
| **XS** | `--admin-shadow-sm` | `0 1px 2px rgba(28,25,23,0.04)` | Subtle lift: table rows, secondary cards |
| **SM** | `--yl-shadow-sm` / Tailwind `shadow-sm` | `0 2px 8px rgba(0,0,0,0.12)` | Default cards on dark bg |
| **MD** | `--yl-shadow-md` / Tailwind `shadow-md` | `0 8px 24px rgba(0,0,0,0.2)` | Elevated cards on dark bg |
| **Card** | Tailwind `shadow-card` | `0 2px 12px rgba(28,25,23,0.06)` | Light mode content cards |
| **Luxury** | Tailwind `shadow-luxury` | `0 4px 20px rgba(28,25,23,0.08)` | Premium content cards |
| **Elegant** | Tailwind `shadow-elegant` | `0 8px 40px rgba(28,25,23,0.12)` | Hero cards, featured content |
| **Hover** | Tailwind `shadow-hover` | `0 12px 32px rgba(28,25,23,0.15)` | Card hover state |
| **LG** | `--yl-shadow-lg` / `--admin-shadow-lg` | `0 20px 60px rgba(0,0,0,0.3)` | Modals, drawers, overlays |
| **XL** | Tailwind `shadow-xl` | `0 20px 60px rgba(28,25,23,0.16)` | Full-screen overlays |
| **Gold** | `--yl-shadow-gold` | `0 0 30px rgba(196,154,42,0.2)` | Premium highlight, gold accents |

### 6.2 Shadow Usage by Context

| Context | Light Background | Dark Background |
|---------|-----------------|-----------------|
| Admin card (default) | `--admin-shadow-sm` | N/A |
| Admin card (elevated) | `--admin-shadow-lg` | N/A |
| Public card | `shadow-card` or `shadow-luxury` | `--yl-shadow-sm` |
| Public card hover | → `shadow-hover` | → `--yl-shadow-md` |
| Modal / Dialog | `shadow-xl` | `--yl-shadow-lg` |
| Navigation (fixed) | `shadow-md` | `--yl-shadow-sm` |

### 6.3 Border Tokens

| Token | Value | Use |
|-------|-------|-----|
| `--admin-border` | `rgba(214,208,196,0.5)` | Admin card borders |
| `--admin-border-hover` | `rgba(214,208,196,0.8)` | Active/focus borders |
| `--yl-border-subtle` | `1px solid rgba(255,255,255,0.05)` | Dark bg subtle separator |
| `--yl-border-light` | `1px solid rgba(255,255,255,0.1)` | Dark bg visible separator |
| `--yl-border-gold` | `1px solid rgba(196,154,42,0.3)` | Gold accent border |
| `border-sand` (Tailwind) | `#D6D0C4` | Light mode dividers |

---

## 7. Do's and Don'ts

### 7.1 Color Rules

| DO | DON'T |
|----|-------|
| Use `--yl-charcoal` (#1C1917) for dark backgrounds | Use pure `#000000` black — too harsh |
| Use `--yl-cream` (#F5F0E8) for light backgrounds | Use pure `#FFFFFF` white for page bg — too clinical |
| White (#FFFFFF) is for cards ON cream backgrounds | White as page background |
| Use the `london/*` scale for reds (50–950) | Hardcode `#C8322B` — use the token |
| Use semantic status colors (green/gold/red/blue) | Invent new status colors |
| Use `--admin-*` tokens in admin pages | Use `--yl-*` dark-mode tokens in admin |
| Use `--yl-*` tokens on public dark-themed pages | Use `--admin-*` tokens on public pages |

### 7.2 Typography Rules

| DO | DON'T |
|----|-------|
| Use `var(--font-display)` / Anybody for headings | Use the body font for headings |
| Use `var(--font-body)` / Source Serif 4 for body text | Use the heading font for paragraphs |
| Use `var(--font-system)` for admin UI labels | Use serif fonts in admin UI |
| Use weight ≥ 400 for Arabic text | Use weight 300 (light) for Arabic |
| Set `letter-spacing: 0` on Arabic text | Apply letter-spacing to Arabic (breaks ligatures) |
| Use `text-start` / `text-end` | Use `text-left` / `text-right` in bilingual context |
| Use `font-display: swap` for all web fonts | Use `@import` for font loading (blocks render) |
| Keep body text 16-18px for readability | Set body text below 14px |

### 7.3 Spacing & Layout Rules

| DO | DON'T |
|----|-------|
| Use the 8px grid (`--yl-space-*` scale) | Use arbitrary pixel values (e.g., 13px, 37px) |
| Use `gap` for spacing flex/grid children | Use `margin-right` on children (breaks RTL) |
| Use logical properties (`margin-inline-start`) | Use physical properties (`margin-left`) in bilingual UI |
| Use `p-5` (20px) for admin card padding | Use `p-3` — too cramped on iPhone |
| Ensure 44px minimum touch targets on mobile | Allow 32px buttons on mobile |
| Contain content at 1200px on desktop | Let content stretch full-width past 1200px |

### 7.4 Component Rules

| DO | DON'T |
|----|-------|
| Use `AdminButton` variant prop for styling | Style buttons with raw Tailwind on admin pages |
| Use `AdminStatusBadge` for all status indicators | Create custom badge styles per page |
| Use `AdminCard` for admin content containers | Use raw `<div>` with manual shadow/border |
| Use `ConfirmModal` (useConfirm hook) for destructive actions | Use `window.confirm()` (breaks mobile Safari) |
| Use `sanitizeHtml()` for any `dangerouslySetInnerHTML` | Render unsanitized user/AI-generated HTML |
| Use `optimisticBlogPostUpdate()` for BlogPost writes | Use raw `prisma.blogPost.update()` in crons |

### 7.5 Brand Identity Rules

| DO | DON'T |
|----|-------|
| Include the tri-color bar on every Yalla London page | Omit the tri-color bar |
| Use warm, editorial photography (Unsplash with attribution) | Use stock photography with watermarks |
| Use the LDN passport stamp as a brand motif | Use generic icons where the stamp fits |
| Maintain luxury tone: confident, specific, expert | Use casual/generic language ("amazing", "awesome") |
| Show real data, honest empty states | Show fake data, Math.random() metrics |
| Use per-site brand colors from `getBrandProfile(siteId)` | Hardcode Yalla London colors on other sites |

### 7.6 Performance Rules

| DO | DON'T |
|----|-------|
| Use `next/image` with width/height for all images | Use raw `<img>` without dimensions (causes CLS) |
| Lazy-load below-fold images | Eager-load all images |
| Use CSS animations (`@keyframes`) for simple motion | Use JavaScript for simple transitions |
| Respect `prefers-reduced-motion` (see `yalla-mobile.css`) | Force animations on users who disabled them |
| Load fonts via `<link rel="preload">` in layout.tsx | Load fonts via CSS `@import` (render-blocking) |

---

## 8. Responsive Behavior

### 8.1 Breakpoints

| Name | Range | Devices | CSS Query |
|------|-------|---------|-----------|
| **xs** | ≤ 390px | iPhone SE, iPhone Mini | `@media (max-width: 390px)` |
| **sm** | 391–430px | iPhone 14/15/16 standard | `@media (min-width: 391px) and (max-width: 430px)` |
| **md** | 431–480px | iPhone Plus / Pro Max | `@media (min-width: 431px) and (max-width: 480px)` |
| **tablet-sm** | 481–768px | iPad Mini, small tablets | `@media (min-width: 481px) and (max-width: 768px)` |
| **tablet** | 769–1024px | iPad, tablets | `@media (min-width: 769px) and (max-width: 1024px)` |
| **desktop** | 1025px+ | Desktop, laptop | `@media (min-width: 1025px)` |

### 8.2 Typography Scaling Per Breakpoint

| Element | xs (≤390) | sm (391–430) | md (431–480) | Desktop (1025+) |
|---------|-----------|-------------|-------------|----------------|
| Hero H1 | 32px | 36px | 40px | 48–60px |
| Section title | 24px | 28px | 30px | 36px |
| Body show | 18px | — | — | — |
| Comp label | 8px | — | — | — |

### 8.3 Touch Targets

All interactive elements must meet **44×44px minimum** (Apple HIG standard):

```css
a, button, .btn, [role="button"],
input[type="submit"], .toggle, .nav-link {
  min-height: 44px;
  min-width: 44px;
  -webkit-tap-highlight-color: transparent;
}
```

### 8.4 Collapse Strategies

| Component | Mobile (≤768px) | Desktop (769px+) |
|-----------|----------------|-----------------|
| Navigation | Native `<select>` dropdown | Horizontal `<ul>` link list |
| Logo grid | 2 columns | 4 columns |
| Icon grid | 4 columns | 8 columns |
| Social stack | Vertical stack | 2–3 column grid |
| Swatch row | 2 columns | Auto flow |
| Print grid | Single column | Multi-column |
| Admin tables | Card view | Table view |
| Admin sidebar | Bottom sheet / slide-out | Fixed 240px sidebar |

### 8.5 Safe Areas (iPhone Notch / Dynamic Island)

```css
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
}

body {
  padding-top: var(--safe-top);
  padding-bottom: var(--safe-bottom);
}
```

For PWA fullscreen mode: `@media (display-mode: standalone) { nav { padding-top: var(--safe-top); } }`

### 8.6 Image Handling

- All images: `max-width: 100%; height: auto;`
- Use `next/image` with explicit `width` and `height` to prevent CLS
- Retina: embedded logos are 500px+ for 2x devices
- Landscape phone (max-height: 500px): hero `min-height: auto`, stamp/logo max 120px
- Print: hide animated elements, use `border: 1px solid #ccc` on cards

### 8.7 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  .yl-reveal { opacity: 1 !important; transform: none !important; }
  .pstamp { opacity: 0.85 !important; animation: none !important; }
}
```

### 8.8 Animation Library

All animations are defined in `yalla-animations.css`. Brand motion tokens:

| Category | Animations | Duration | Use Case |
|----------|-----------|----------|----------|
| **Micro** | `yl-pulse`, `yl-float`, `yl-spin`, `yl-shake`, `yl-bounce` | 0.3–1s | Button feedback, loading, notifications |
| **Page** | `yl-fadeUp`, `yl-slideRight`, `yl-slideLeft`, `yl-goldWipe` | 0.5–0.8s | Route transitions, section reveals |
| **Brand** | `yl-stampIn`, `yl-stampDrop`, `yl-inkSlam`, `yl-rockAndSet` | 0.6–1s | Passport stamp interactions |
| **Video** | `yl-lowerThirdIn`, `yl-lowerThirdOut` | 0.5s | Video overlays |
| **Celebration** | `yl-confetti1/2/3` | 1–1.5s | Booking confirmations |
| **Utility** | `yl-triSlide`, `yl-wobble`, `yl-inkFade` | 0.3–1s | Tri-color bar, email logo, ink effect |
| **Scroll** | `.yl-reveal` → `.yl-reveal.visible` | 0.8s | Scroll-triggered fade-up |

**Easing curves:**
- Standard: `var(--yl-ease)` = `cubic-bezier(0.25, 0.46, 0.45, 0.94)` — smooth deceleration
- Out: `var(--yl-ease-out)` = `cubic-bezier(0.0, 0.0, 0.2, 1.0)` — enter animations
- In: `var(--yl-ease-in)` = `cubic-bezier(0.4, 0.0, 1.0, 1.0)` — exit animations
- Tailwind: `ease-yl` maps to the standard curve

---

## 9. Agent Prompt Guide

### 9.1 Quick Color Reference

Copy-paste this table when building UI for a specific site:

**Yalla London:**
```
Primary Red:   #C8322B  →  bg-london-600 / var(--yl-red)
Gold:          #C49A2A  →  bg-yalla-gold-500 / var(--yl-gold)
Blue:          #4A7BA8  →  bg-stamp / var(--yl-blue)
Charcoal:      #1C1917  →  bg-charcoal / var(--yl-charcoal)
Cream:         #FAF8F4  →  bg-cream / var(--cream)
Parchment:     #EDE9E1  →  var(--yl-parchment)
Navy:          #1A2332  →  var(--yl-navy)
Dark Navy:     #0F1621  →  bg-yl-dark-navy / var(--yl-dark-navy)
```

**Zenitha Yachts:**
```
Navy:          #0A1628  →  bg-zh-navy / var(--z-navy)
Gold:          #C9A96E  →  var(--z-gold)
Aegean:        #2B6CB0  →  var(--z-aegean)
Pearl:         #F7F5F0  →  var(--z-pearl)
```

**Admin (Clean Light):**
```
Background:    #FAF8F4  →  bg-[var(--admin-bg)]
Card:          #FFFFFF  →  bg-white or bg-[var(--admin-card-bg)]
Border:        rgba(214,208,196,0.5) → border-[var(--admin-border)]
Text:          #1C1917  →  text-[var(--admin-text)]
Text Muted:    #78716C  →  text-[var(--admin-text-muted)]
Red:           #C8322B  →  text-[var(--admin-red)] / bg-[var(--admin-red)]
Gold:          #C49A2A  →  text-[var(--admin-gold)]
Blue:          #3B7EA1  →  text-[var(--admin-blue)]
Green:         #2D5A3D  →  text-[var(--admin-green)]
```

### 9.2 Common UI Patterns

**"Create an admin dashboard card":**
```tsx
<AdminCard accent accentColor="red">
  <AdminSectionLabel>PIPELINE STATUS</AdminSectionLabel>
  <AdminKPICard value={42} label="Published Today" color="var(--admin-green)" />
</AdminCard>
```

**"Create a status badge":**
```tsx
<AdminStatusBadge status="published" />
<AdminStatusBadge status="failed" />
<AdminStatusBadge status="pending" label="Awaiting Review" />
```

**"Create an action button":**
```tsx
<AdminButton variant="primary" size="lg" onClick={handlePublish}>
  Publish Now
</AdminButton>
<AdminButton variant="danger" loading={isDeleting}>
  Delete Article
</AdminButton>
```

**"Create a public page section":**
```tsx
<section className="py-16 px-5 max-w-[1200px] mx-auto">
  <h2 className="font-display text-3xl font-bold text-charcoal mb-8">
    Featured Hotels
  </h2>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {/* Cards */}
  </div>
</section>
```

**"Style for bilingual EN/AR":**
```tsx
<div dir={locale === 'ar' ? 'rtl' : 'ltr'}>
  <h1 className="font-display text-start">
    {locale === 'ar' ? titleAr : titleEn}
  </h1>
  <p className={`font-body text-start ${locale === 'ar' ? 'font-arabic leading-[1.9]' : 'leading-[1.7]'}`}>
    {locale === 'ar' ? contentAr : contentEn}
  </p>
</div>
```

### 9.3 Per-Site Lookup

When building UI for a specific site, use `getBrandProfile(siteId)` from `lib/design/brand-provider.ts`. This returns:

```typescript
interface BrandProfile {
  siteId: string
  name: string
  primaryColor: string      // hex
  secondaryColor: string    // hex
  accentColor: string       // hex
  backgroundColor: string   // hex
  textColor: string         // hex
  fontDisplay: string       // font family name
  fontBody: string          // font family name
  borderRadius: string      // e.g., '12px'
  // ... full brand data merged from sites.ts + destination-themes.ts
}
```

### 9.4 File Reference

| What | Where |
|------|-------|
| CSS custom properties (root) | `app/globals.css` |
| Yalla London tokens | `app/yalla-tokens.css` |
| Zenitha Yachts tokens | `app/zenitha-tokens.css` |
| Animation keyframes | `app/yalla-animations.css` |
| Mobile/responsive rules | `app/yalla-mobile.css` |
| Tailwind config (colors, shadows, fonts) | `tailwind.config.ts` |
| Per-site brand data | `config/sites.ts` + `config/destination-themes.ts` |
| Unified brand resolver | `lib/design/brand-provider.ts` |
| Admin components | `components/admin/admin-ui.tsx` |
| Admin dashboard spec | `docs/design/STITCH-DASHBOARD-SPEC.md` |

### 9.5 Naming Conventions

| Namespace | Prefix | Scope | Example |
|-----------|--------|-------|---------|
| Yalla London | `--yl-*` | Public site (dark theme) | `--yl-red`, `--yl-shadow-md` |
| Zenitha Yachts | `--z-*` | Yacht site (scoped to `.zenitha-site`) | `--z-navy`, `--z-gold` |
| Zenitha.Luxury Parent | `zl-*` (Tailwind only) | Parent brand | `bg-zl-obsidian` |
| Zenitha HQ (Admin Dark) | `zh-*` (Tailwind only) | Yacht admin dark theme | `bg-zh-navy` |
| Admin (Clean Light) | `--admin-*` | Admin dashboard | `--admin-bg`, `--admin-red` |
| Status badges | `--status-*` | Status indicators | `--status-green-bg` |
| Tailwind (full scale) | `london-*` / `yalla-gold-*` / `thames-*` / `cream-*` | Public site (Tailwind classes) | `bg-london-600`, `text-cream-400` |
| Tailwind (shorthand) | `yl-*` | Flat color aliases | `bg-yl-red`, `text-yl-gold` |
| Legacy (avoid) | `burgundy-*` / `gold-*` | Deprecated aliases — use `london-*` / `yalla-gold-*` instead | — |

---

> **End of DESIGN.md v1.0**
>
> This document is the single source of truth for all visual decisions.
> Update this file when tokens, components, or brand rules change.
> AI agents: read this file before generating any UI code.
