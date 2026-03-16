# Yalla London — Brand Kit
## يلّا لندن · المملكة المتحدة

**Version:** 2.0 — Phase 2 Complete  
**Owner:** Khaled Aun, CEO & Founder  
**Company:** Zenitha.Luxury LLC  
**Website:** yalla-london.com  
**Canva Source:** https://www.canva.com/design/DAHEH2wrVgg/edit

---

## Quick Start

1. Open `yalla-london-brand-portfolio.html` in any browser — this is the complete interactive portfolio
2. Import `tokens/yalla-tokens.css` into your project root
3. Import `animations/yalla-animations.css` for motion effects
4. Import `mobile/mobile-optimization.css` for responsive behavior
5. Copy `mobile/meta-tags.html` into your page `<head>`

---

## Directory Structure

```
yalla-brand-kit/
├── yalla-london-brand-portfolio.html    ← Interactive portfolio (open in browser)
├── README.md                            ← This file
│
├── logos/
│   ├── yalla-stamp-1000px.png           ← Full resolution (print)
│   ├── yalla-stamp-500px.png            ← Web / retina
│   ├── yalla-stamp-200px.png            ← Thumbnails
│   ├── yalla-stamp-100px.png            ← Small UI
│   ├── yalla-stamp-64px.png             ← Avatar / small
│   ├── yalla-stamp-32px-favicon.png     ← Browser favicon
│   ├── yalla-icon-512.png               ← PWA icon (navy bg)
│   ├── yalla-icon-192.png               ← Android icon
│   ├── yalla-icon-apple-touch.png       ← iOS home screen
│   └── yalla-watermark-500px.png        ← 8% opacity watermark
│
├── tokens/
│   └── yalla-tokens.css                 ← All CSS variables
│
├── animations/
│   └── yalla-animations.css             ← Full motion library
│
├── mobile/
│   ├── mobile-optimization.css          ← Responsive breakpoints
│   └── meta-tags.html                   ← PWA / OG / favicon meta
│
├── social/                              ← (templates in portfolio HTML)
├── print/                               ← (templates in portfolio HTML)
└── video/                               ← (templates in portfolio HTML)
```

---

## Brand Colors

| Name          | Hex       | Usage                              |
|---------------|-----------|-------------------------------------|
| Heritage Red  | `#C8322B` | Primary accent, CTAs, Big Ben       |
| Gold          | `#C49A2A` | Premium, focus rings, KPI data      |
| Stamp Blue    | `#4A7BA8` | Info, links, tri-bar third segment  |
| Charcoal      | `#1C1917` | Body text on light backgrounds      |
| Parchment     | `#EDE9E1` | Light backgrounds, text on dark     |
| Warm Cream    | `#F5F0E8` | Alternative light bg                |
| Navy          | `#1A2332` | Stamp fill, card backgrounds        |
| Dark Navy     | `#0F1621` | Deepest background layer            |

### Tri-Color Bar
Always three equal segments: Red → Gold → Blue  
Height: 3px (default), never omit.

---

## Typography

| Role     | Font             | Weight | Usage                        |
|----------|------------------|--------|------------------------------|
| Heading  | Anybody           | 700    | Titles, hero text, numbers   |
| Body     | Source Serif 4    | 400    | Editorial, descriptions      |
| Data     | IBM Plex Mono     | 400    | Nav, labels, pricing, meta   |
| Arabic   | Noto Sans Arabic  | 600    | All Arabic text               |

### Critical Rule
**Arabic text must NEVER have letter-spacing.** Always apply:
```css
[dir="rtl"], [lang="ar"] { letter-spacing: 0 !important; }
```

---

## Logo Usage

The stamp logo is a vintage passport seal featuring:
- Scalloped navy outer edge with weathered texture
- "YALLA LONDON" curved along the top arc
- Big Ben illustration in Heritage Red
- "يلّا لندن" in Arabic below Big Ben
- "المملكة المتحدة" (United Kingdom) as subtitle

### Variants Available
- **Primary Light** — Navy stamp on parchment/white backgrounds
- **Primary Dark** — Parchment stamp on dark backgrounds
- **Mono Red** — White stamp on red background
- **Mono Gold** — Dark stamp on gold background
- **App Icon** — Stamp on navy rounded square
- **Watermark** — 8% opacity for backgrounds
- **Social Circle** — Circular crop for profile photos

### Minimum Size
Never display the stamp smaller than 32px width.

---

## Animations

### Signature Motion: Stamp-In
The brand's signature animation. Use for page loads, confirmations, and video intros.
```css
animation: yl-stampIn 0.6s var(--yl-ease) both;
```

### Passport Multi-Stamp
Sequential stamp drops for immersive experiences. See portfolio Section 07B.
```css
animation: yl-stampDrop 0.5s var(--yl-ease) forwards;
/* Set per-stamp delay and rotation via CSS variables */
```

### Video Motion Specs
| Element       | Duration | Notes                              |
|---------------|----------|------------------------------------|
| Intro         | 2–3s     | Stamp-in + title fade              |
| Outro         | 3–5s     | Logo + tri-bar + URL               |
| Lower Third   | 5–8s     | Slide from left, hold, slide right |
| Stamp Sound   | 0.3s     | Deep thud + paper texture          |
| Easing        | cubic-bezier(0.25, 0.46, 0.45, 0.94) |          |

---

## Mobile Optimization

### Breakpoints
| Device            | Width        | Key Changes                       |
|-------------------|--------------|-----------------------------------|
| iPhone SE/Mini    | ≤390px       | Smaller headings, tighter padding |
| iPhone Standard   | 391–430px    | Default mobile layout              |
| iPhone Plus/Max   | 431–480px    | Slightly larger headings           |
| iPad Mini         | 481–768px    | 3-col logos, 5-col icons           |
| iPad              | 769–1024px   | 4-col logos, side-by-side social   |
| Desktop           | 1025px+      | Full layout, max-width 1200px      |

### Accessibility
- All touch targets ≥ 44×44px
- `prefers-reduced-motion` disables all animations
- Print stylesheet hides non-essential elements
- Color contrast: Charcoal on Parchment = 12.8:1 (WCAG AAA)

---

## Portfolio Sections

The interactive HTML portfolio contains:

1. **Logo System** — 8 variants with your actual Canva-exported stamp
2. **Color Palette** — All swatches with hex codes + tri-bar spec
3. **Typography** — 4 typeface specimens (EN + AR)
4. **Social Media Kit** — Instagram, Story, FB/LinkedIn, YouTube, X/Twitter
5. **UI Components** — Buttons, tags, toasts, inputs, toggles, progress, nav, cards
6. **Icon Suite** — 20 custom SVG icons in brand colors
7. **Animation Tokens** — Pulse, float, spin, bounce, tri-slide, gold wipe, stamp-in
7B. **Passport Stamping** — Multi-stamp page with 5 sequential stamps + 4 motion tokens
7C. **Video & Motion** — YouTube intro, Reel/TikTok, lower third, watermark, Pinterest, WhatsApp
8. **Print** — Business card + animated email signature
9. **Website Elements** — Hero, newsletter, footer (matching yalla-london.com)
10. **CSS Token Reference** — Copy-paste variable table

---

## Canva Assets

- **Stamp Logo:** https://www.canva.com/design/DAHEH2wrVgg/edit
- Edit directly in Canva for high-res exports (PNG, SVG, PDF)

---

## Contact

Khaled Aun · CEO & Founder  
hello@yalla-london.com  
yalla-london.com  

© 2025–2026 Zenitha.Luxury LLC. All rights reserved.
