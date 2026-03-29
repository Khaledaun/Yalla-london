# Yalla London — Page Layout Specifications

> Full website page layouts leveraging the brand system.
> Use alongside COMPONENT-SPECS.md for element details.

---

## Page Architecture Overview

```
┌──────────────────────────────────────────┐
│ ■ London Red │ ■ Gold │ ■ Sky Blue       │ ← Tri-color bar (always top)
├──────────────────────────────────────────┤
│ YALLA [LDN]  Menu Items        [CTA]    │ ← Sticky nav
├──────────────────────────────────────────┤
│                                          │
│              PAGE CONTENT                │ ← Varies per page
│                                          │
├──────────────────────────────────────────┤
│ ■ London Red │ ■ Gold │ ■ Sky Blue       │ ← Footer divider
│              FOOTER                      │
└──────────────────────────────────────────┘
```

Max content width: 1100px, centered
Page padding: 60px horizontal (desktop), 20px (mobile)
Section vertical spacing: 80px

---

## 01. Hero Section

```
┌──────────────────────────────────────────────────────┐
│  [NAV - transparent bg, overlays hero]               │
├──────────────────────────────────────────────────────┤
│                                                      │
│   [Badge: Gate Y] [Badge: 1st Class]                │
│                                                      │
│   Your London,                    ┌────────────┐    │
│   Curated.                        │ Boarding    │    │
│     (Anybody 64px/800)            │ Pass Visual │    │
│                                   │ (animated)  │    │
│   Premium transfers...            │             │    │
│     (Source Serif 18px/300)       └────────────┘    │
│                                                      │
│   رحلتك إلى لندن تبدأ من هنا                         │
│     (IBM Plex Sans Arabic 16px)                      │
│                                                      │
│   [Book Experience] [View Services]                  │
│                                                      │
│   ■──── ■──── ■────                                  │
│                                                      │
│   500+         4.9         24/7                      │
│   Trips        Rating      Concierge                 │
│                                                      │
│   (stamp pattern bg at 2.5% opacity)                 │
└──────────────────────────────────────────────────────┘
```

| Property              | Value                                    |
|-----------------------|------------------------------------------|
| Min-height            | 520px                                    |
| Background            | bg color + stamp pattern SVG at 2.5%     |
| Layout                | CSS Grid: 1.2fr 0.8fr, gap 60px         |
| Headline animation    | fadeUp 0.6s ease                         |
| Boarding pass anim    | stampIn 0.8s ease 0.3s                   |
| Stagger delays        | 0s, 0.15s, 0.25s, 0.35s, 0.5s          |
| Stats grid            | flex, gap 40px                           |
| Stats number font     | Anybody 26px/800                         |
| Stats label font      | IBM Plex Mono 8px/500, tracking 1.5px   |

---

## 02. Services Grid

```
┌──────────────────────────────────────────────────────┐
│  [Badge: Services]                       خدماتنا     │
│  What We Offer                                       │
│    (Anybody 44px/800)                                │
│  Every service designed with...                      │
│    (Source Serif 16px/300)                            │
├──────────────────────────────────────────────────────┤
│  ┌────────┐  ┌────────┐  ┌────────┐                │
│  │■■■ bar │  │■■■ bar │  │■■■ bar │                │
│  │ [icon] │  │ [icon] │  │ [icon] │                │
│  │ Title  │  │ Title  │  │ Title  │                │
│  │ عربي   │  │ عربي   │  │ عربي   │                │
│  │ desc   │  │ desc   │  │ desc   │                │
│  │────────│  │────────│  │────────│                │
│  │ £85  → │  │ £195 → │  │ £150 → │                │
│  └────────┘  └────────┘  └────────┘                │
│  ┌────────┐  ┌────────┐  ┌────────┐                │
│  │ ...    │  │ ...    │  │ ...    │                │
│  └────────┘  └────────┘  └────────┘                │
└──────────────────────────────────────────────────────┘
```

| Property              | Value                                    |
|-----------------------|------------------------------------------|
| Background            | Alternating: #141110 / #F5F3EF          |
| Grid                  | 3 columns, gap 16px                      |
| Card icon box         | 44×44px, bordered, IBM Plex Mono 10px   |
| Card title            | Anybody 20px/700                         |
| Card Arabic title     | IBM Plex Sans Arabic 13px/500, RTL      |
| Card description      | Source Serif 13px/300, line-height 1.6   |
| Card price            | Anybody 18px/800                         |
| Card hover            | translateY(-4px), shadow-lg              |

---

## 03. Testimonials

| Property              | Value                                    |
|-----------------------|------------------------------------------|
| Header alignment      | Center                                   |
| Grid                  | 3 columns, gap 20px                      |
| Quote mark            | Source Serif 64px/700, London Red at 15% |
| Stars                 | Gold squares with star clip-path, 8px    |
| Quote text            | Source Serif 14px/400 italic             |
| Arabic subtext        | IBM Plex Sans Arabic 12px/500, Stamp    |
| Name font             | Anybody 13px/700                         |
| Location font         | IBM Plex Mono 9px, letter-spacing 1px   |
| Divider               | Tri-color bar between quote and name     |

---

## 04. About / Story Section

| Property              | Value                                    |
|-----------------------|------------------------------------------|
| Layout                | 2 columns: image (1fr) + text (1fr)     |
| Gap                   | 60px                                     |
| Image aspect ratio    | 4:5                                      |
| Image overlay         | Gradient bottom fade to 90% charcoal    |
| Floating stamp        | 100px seal, 12% opacity, rotated 12deg  |
| Section badge         | Stamp Blue "Our Story"                   |
| Headline              | Anybody 44px/800                         |
| Body                  | Source Serif 16px/300, line-height 1.8   |
| Arabic pull quote     | IBM Plex Sans Arabic 18px/600           |
| Value props           | 3px London Red left border + text       |

---

## 05. Pricing Tiers

```
┌──────────┐  ┌══════════════┐  ┌──────────┐
│ Essential│  ║  Premium     ║  │  Bespoke │
│ أساسي    │  ║  ممتاز       ║  │  حسب الطلب│
│          │  ║ MOST POPULAR ║  │          │
│ £85      │  ║  £195        ║  │  Custom  │
│ per xfer │  ║  per day     ║  │  tailored│
│ ──────── │  ║  ════════    ║  │ ──────── │
│ · feat 1 │  ║  · feat 1    ║  │ · feat 1 │
│ · feat 2 │  ║  · feat 2    ║  │ · feat 2 │
│          │  ║  · feat 3    ║  │ · feat 3 │
│ [CTA]    │  ║  [Gold CTA]  ║  │ [CTA]    │
└──────────┘  └══════════════┘  └──────────┘
```

| Property              | Value                                    |
|-----------------------|------------------------------------------|
| Featured tier         | 2px border (Gold), scale(1.03)          |
| "Most Popular" bar    | Gold bg, IBM Plex Mono 8px/600          |
| Tier name             | Anybody 22px/800                         |
| Arabic name           | IBM Plex Sans Arabic 14px/500           |
| Price                 | Anybody 32px/800                         |
| Period                | IBM Plex Mono 8px, letter-spacing 1px   |
| Feature bullet        | 5px dot in tier color                    |
| Feature text          | Source Serif 13px/400                    |

---

## 06. Gallery Grid

| Property              | Value                                    |
|-----------------------|------------------------------------------|
| Grid                  | 3 columns × 3 rows (160px each)        |
| Gap                   | 12px                                     |
| Items span            | Varies (featured items span 2 cols/rows)|
| Overlay               | Gradient from transparent to 85% charcoal|
| Tag                   | Badge with cream border                  |
| Title                 | Anybody 15px/700, cream                  |

---

## 07. Booking / CTA Section

| Property              | Value                                    |
|-----------------------|------------------------------------------|
| Layout                | 2 columns: form card + contact info     |
| Form card             | Tri-color bar top, 36px padding          |
| Form headline         | Anybody 28px/800                         |
| Arabic subtitle       | IBM Plex Sans Arabic 14px/500           |
| Input gap             | 14px                                     |
| Submit button         | Primary, large, full-width               |
| Microcopy             | IBM Plex Mono 8px, centered, Stone      |
| Contact icons         | 40×40px bordered box, 2-letter abbrev   |
| Trust badges          | Forest green badges                      |

---

## 08. 404 Error Page

| Property              | Value                                    |
|-----------------------|------------------------------------------|
| Background stamp      | 300px seal at 4% opacity                 |
| "404" display         | Anybody 120px/800 at 8% opacity         |
| Headline              | "Wrong Gate." — Anybody 36px/800        |
| Body                  | Source Serif 16px/300                    |
| Arabic                | IBM Plex Sans Arabic 15px/500           |
| CTA                   | "Back to Gate Y" — Primary, large       |

---

## 09. Enhanced Components

### Toast Notifications
- 4 types: success (Forest), info (Sky), warning (Gold), error (London)
- Left border accent: 4px solid type color
- Bilingual: English title + Arabic subtitle
- Animation: slideUp 0.3s ease

### Modal Dialog
- Tri-color bar top
- Max-width 420px, box-shadow xl
- Summary section: alternating bg
- Action buttons: right-aligned, secondary + primary

### Mobile Navigation
- Width: 320px (sidebar)
- Hamburger: 3 lines, 18px wide, 1.5px thick
- Menu items: Anybody 18px/600 with arrow indicator
- Full-width CTA at bottom
- Arabic wordmark + tri-bar below nav

### Skeleton Loading
- Shimmer animation: 1.5s infinite
- Shape: rounded rectangles matching component proportions
- Color: border color → skeleton highlight → border color

---

*Generated for Yalla London Brand System v2.0*
