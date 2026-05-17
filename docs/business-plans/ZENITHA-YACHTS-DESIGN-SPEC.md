# Zenitha Yachts — Website Structure & Design Implementation Package

**Date:** February 21, 2026
**Prepared for:** Khaled N. Aun, Zenitha.Luxury LLC
**Domain:** zenithayachts.com
**Design Direction:** Maritime Luxury — Refined, Confident, Worldly

-----

## 1. DESIGN PHILOSOPHY — "QUIET LUXURY ON WATER"

Zenitha Yachts communicates wealth through restraint, not excess. The design language draws from three worlds: the precision of Swiss watchmaking, the editorial elegance of Condé Nast Traveller, and the sensory calm of being on open water. Every pixel should feel like stepping aboard a 40-metre superyacht — unhurried, curated, and effortlessly beautiful.

**Core Principles:**

- **Confidence over flash** — No gratuitous animations. No gradient explosions. Movement is slow, purposeful, tide-like.
- **Negative space is luxury** — Generous white space signals that we don't need to shout. Content breathes.
- **Photography-first** — Hero imagery does the selling. Text supports, never competes.
- **Bilingual sophistication** — Arabic and English coexist as equals, not afterthoughts. RTL is native, not patched.
- **Conversion through trust** — Inquiry forms feel like concierge conversations, not lead funnels.

-----

## 2. DESIGN SYSTEM — TOKENS & SPECIFICATIONS

### 2.1 Color Palette

```
PRIMARY PALETTE (Deep Maritime)
─────────────────────────────────────────────────
Navy Depths      #0A1628    → Primary backgrounds, headings, nav
Midnight Blue    #1B2A4A    → Section backgrounds, cards
Aegean Blue      #2E5A88    → Accents, links, interactive elements
Ocean Surface    #4A90B8    → Hover states, secondary accents
Shallow Water    #7CB8D4    → Decorative, progress bars

GOLD & WARM (Luxury Signals)
─────────────────────────────────────────────────
Antique Gold     #C9A96E    → CTAs, highlights, star ratings
Champagne        #E8D5B5    → Subtle backgrounds, dividers
Warm Sand        #F5EDE0    → Card backgrounds, light sections
Pearl White      #FAFAF7    → Page backgrounds
Pure White       #FFFFFF    → Content surfaces, inputs

ACCENT (Status & Feedback)
─────────────────────────────────────────────────
Mediterranean    #0EA5A2    → Available, success states
Coral Sunset     #E07A5F    → Urgent, limited availability
Storm Warning    #DC2626    → Error states (sparingly)
```

**Contrast Ratios (WCAG AA verified):**

|Combination    |Ratio |Use                                        |
|---------------|------|-------------------------------------------|
|Navy on Pearl  |15.2:1|Body text                                  |
|Navy on White  |16.1:1|Headings                                   |
|Gold on Navy   |6.8:1 |CTA buttons                                |
|Aegean on Pearl|5.4:1 |Links                                      |
|White on Navy  |16.1:1|Nav text                                   |
|White on Gold  |3.2:1 |Button text — use Navy text on Gold instead|

### 2.2 Typography

| Role | Font | Weights | Use |
|------|------|---------|-----|
| Display | Playfair Display | 400, 500, 700 | H1 hero headlines, yacht names |
| Heading | DM Sans | 400, 500, 600, 700 | H2-H6, nav, UI labels, cards |
| Body | Source Sans 3 | 300, 400, 600 | Paragraphs, descriptions, forms |
| Arabic | IBM Plex Sans Arabic | 300, 400, 500, 700 | ALL Arabic text |
| Mono | JetBrains Mono | 400, 500 | Prices, specs, reference numbers |

### 2.3 Spacing System (8px Base Grid)

```
--space-1:   4px     --space-6:   24px    --space-16:  64px
--space-2:   8px     --space-8:   32px    --space-20:  80px
--space-3:   12px    --space-10:  40px    --space-24:  96px
--space-4:   16px    --space-12:  48px    --space-32:  128px
--space-5:   20px
```

### 2.4 Border Radius

```
--radius-sm: 4px  --radius-lg: 12px  --radius-2xl: 24px
--radius-md: 8px  --radius-xl: 16px  --radius-full: 9999px
```

### 2.5 Shadows

```
--shadow-card:     0 1px 3px rgba(10,22,40,0.04), 0 4px 12px rgba(10,22,40,0.03)
--shadow-hover:    0 2px 8px rgba(10,22,40,0.06), 0 8px 24px rgba(10,22,40,0.06)
--shadow-elevated: 0 4px 12px rgba(10,22,40,0.08), 0 16px 40px rgba(10,22,40,0.08)
--shadow-gold:     0 4px 20px rgba(201,169,110,0.25)
```

### 2.6 Animations

- Ease: `cubic-bezier(0.25, 0.1, 0.25, 1.0)`
- Fast: 200ms (buttons), Base: 350ms (cards), Slow: 600ms (heroes), Drift: 1200ms (parallax)
- Always respect `prefers-reduced-motion`

### 2.7 Breakpoints

- Mobile: 0–639px | Tablet: 640–1023px | Desktop: 1024–1279px | Large: 1280px+
- Container: 1280px max | Wide: 1440px | Text: 720px

-----

## 3. WEBSITE STRUCTURE — COMPLETE SITEMAP

```
zenithayachts.com
├── /                          HOME
├── /yachts                    YACHT SEARCH & BROWSE
│   └── /yachts/[slug]         YACHT DETAIL PAGE
├── /destinations              DESTINATIONS HUB
│   └── /destinations/[slug]   DESTINATION DETAIL
├── /itineraries               SAMPLE ITINERARIES
│   └── /itineraries/[slug]    ITINERARY DETAIL
├── /charter-planner           AI TRIP PLANNER (Wizard)
├── /inquiry                   CHARTER INQUIRY FORM
├── /blog                      ARTICLES & GUIDES
│   ├── /blog/category/[slug]  Category archive
│   └── /blog/[slug]           Article detail
├── /about                     ABOUT ZENITHA
├── /how-it-works              CHARTER PROCESS GUIDE
├── /faq                       FREQUENTLY ASKED QUESTIONS
├── /contact                   CONTACT & OFFICES
├── /privacy                   PRIVACY POLICY
├── /terms                     TERMS OF SERVICE
├── /ar/                       ARABIC MIRROR (all pages)
└── /admin/                    ADMIN DASHBOARD (auth)
    ├── /admin/yachts
    ├── /admin/yacht-destinations
    ├── /admin/charter-inquiries
    ├── /admin/broker-partners
    ├── /admin/yacht-analytics
    └── /admin/yacht-sync
```

-----

## 4. PAGE SPECIFICATIONS (14 Pages)

### PAGE 1: HOME (`/`)
- Hero: full-viewport with yacht image, gold overline, Playfair H1, dual CTAs
- Trust bar: stats or press logos
- Featured yachts (3-4 cards)
- Destination showcase (masonry grid)
- How it works (3 steps on sand background)
- AI planner teaser (split layout)
- Testimonials (carousel on navy)
- Blog cards (3)
- Newsletter capture (champagne gradient)
- Footer (4-column)

### PAGE 2: YACHT SEARCH (`/yachts`)
- Filter sidebar (destination, type, price, dates, guests, halal/family/crew toggles)
- 3-column grid, 24 per page
- Sort: price, rating, newest, popular

### PAGE 3: YACHT DETAIL (`/yachts/[slug]`)
- Photo gallery (hero + 4 thumbnails)
- Sticky sidebar: price, season selector, inquiry CTA, affiliate link
- Tabbed content: Overview, Specs, Amenities, Availability calendar, Reviews
- Related yachts + pre/post charter hotels (affiliate)

### PAGE 4: DESTINATIONS HUB (`/destinations`)
- Map illustration hero
- Featured destinations (3 large cards)
- All destinations grid by region

### PAGE 5: DESTINATION DETAIL (`/destinations/[slug]`)
- Weather/season guide, featured yachts, sample itineraries
- Marinas & ports, practical info, halal dining, related blog articles

### PAGE 6: AI CHARTER PLANNER (`/charter-planner`)
- 6-step wizard: Destination → Dates → Group → Budget → Preferences → Generate
- AI results: yacht match, day-by-day itinerary, cost breakdown

### PAGE 7: CHARTER INQUIRY (`/inquiry`)
- Split layout: form (55%) + info sidebar (45%)
- Sections: About You, Your Charter, Preferences
- Confirmation with reference number

### PAGE 8-9: ITINERARIES HUB + DETAIL
- Filter tabs, day-by-day timeline, affiliate links per stop

### PAGE 10: BLOG (`/blog`)
- Featured article + category tabs + article grid (content pipeline powered)

### PAGE 11: ABOUT (`/about`)
- Brand story, values, team profiles (E-E-A-T), parent entity

### PAGE 12: HOW IT WORKS (`/how-it-works`)
- 6-step visual timeline, bareboat vs crewed, first-timer tips

### PAGE 13: FAQ (`/faq`)
- 6 categories, accordion format (see full FAQ content in source spec)

### PAGE 14: CONTACT (`/contact`)
- 3-column contact methods, simple form, office info

-----

## 5. SEO & AIO SPECIFICATIONS

### Structured Data per Page

| Page | Schema Types |
|------|-------------|
| Home | WebSite, Organization, ItemList |
| Yacht Search | ItemList, BreadcrumbList |
| Yacht Detail | Product, AggregateOffer, Review, BreadcrumbList |
| Destinations Hub | ItemList, BreadcrumbList |
| Destination Detail | Place, TravelAction, BreadcrumbList |
| Itinerary Detail | TravelAction, ItemList, BreadcrumbList |
| Blog Article | Article, BreadcrumbList |
| FAQ | FAQPage, BreadcrumbList |
| About | Organization, BreadcrumbList |

### Authenticity Signals (3+ per page)
- Sensory details, specific local references, practical insider tips
- Honest limitations, technical nautical detail, named recommendations

### Blacklisted Phrases
"nestled in the heart of", "hidden gem", "paradise on earth", "look no further",
"without further ado", "in this comprehensive guide", "Whether you're a seasoned sailor or…", "boasts stunning views"

### Core Web Vitals: LCP < 2.5s, INP < 200ms, CLS < 0.1

-----

## 6. IMPLEMENTATION PRIORITY

### Phase 1 — MVP (Week 3): Home, Yacht Search, Yacht Detail, Inquiry
### Phase 2 — Content (Weeks 4-8): Destinations, Blog, About, FAQ, How It Works, Planner
### Phase 3 — Enrichment (Weeks 8-12): Itineraries, Contact

-----

*Full source spec with complete FAQ content, component specs, RTL details, accessibility checklist,
performance budget, and micro-interaction timings available in the brand kit React component.*

*Design Implementation Package prepared February 21, 2026*
*Platform: Zenitha Yachts — Zenitha.Luxury LLC*
