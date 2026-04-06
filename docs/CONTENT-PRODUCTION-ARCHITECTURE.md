# Zenitha Content Production Architecture

## Three Engines — Clear Boundaries

Every visual asset produced by the Zenitha platform is created by exactly ONE of three engines. No overlap, no ambiguity.

---

## ENGINE 1: SYSTEM (Next.js / Vercel)

**When:** Automatic — fires on every publish event, no human input.
**Where:** Runs on Vercel serverless functions.
**Cost:** Free (CPU-rendered via `ImageResponse` / HTML).

### What it produces

| Asset | Trigger | Size | Route |
|-------|---------|------|-------|
| OG image | Article published | 1200×630 | `/api/og?siteId=X&title=Y` |
| Email header | Newsletter sent | 600×200 | Inline in React Email template |
| Blog layout | Page request | Responsive | `app/blog/[slug]` |
| Structured data | Page request | JSON-LD | `<StructuredData>` component |
| Sitemap | Cache refresh (4h) | XML | `app/sitemap.ts` |
| IndexNow submission | After publish | POST | `lib/seo/indexing-service.ts` |
| Affiliate injection | Cron (daily) | HTML inject | `content-auto-fix` cron |
| Featured image | Cron (4h) | Unsplash URL | `image-pipeline` / `content-auto-fix-lite` |
| Meta tags | Page request | HTML `<head>` | `generateMetadata()` |

### Brand enforcement (automatic)

```
Article publish event
  → getSiteConfig(siteId)
  → getBrandDefaults(siteId)
  → OG image uses site primaryColor + secondaryColor
  → Email uses site logo + brand colors
  → JSON-LD uses site name + domain
  → Sitemap uses site domain
  → IndexNow uses site-specific key
  → Affiliate injection uses site-specific partner rules
```

### System NEVER produces

- Custom designs requiring visual editing
- Video content
- Print materials
- Editable social post images (use Canva)

---

## ENGINE 2: CANVA (MCP or Manual)

**When:** On-demand — triggered from dashboard button or Claude MCP prompt.
**Where:** Canva cloud (canva.com). Accessed via MCP tools or browser.
**Cost:** Canva Pro subscription.

### What it produces

| Asset | How to trigger | Templates available |
|-------|---------------|-------------------|
| Social story (1080×1920) | Dashboard "Generate Social" or MCP prompt | YL: 1 template, WTME: 5 EN + 5 AR |
| Instagram post (1080×1350) | Dashboard "Generate Social" or MCP prompt | YL: 1 template, WTME: 2 EN + 2 AR |
| Etsy listing (1200×800) | Dashboard "One-Tap Create" | 1 per brand (3 total) |
| PDF cover (1200×1600) | Dashboard PDF workshop | 6 per brand (18 total) |
| Email header (600×200) | Dashboard "One-Tap Create" | 1 per brand (3 total) |
| Brand kit export (ZIP) | `/api/admin/brand-kit` | Auto-generated |
| Custom design | Canva editor directly | Brand kit colors/fonts |
| Print materials | Canva editor directly | Brand kit colors/fonts |

### Template registry

| Brand | Canva Folder | Templates | Social Frames |
|-------|-------------|-----------|---------------|
| Yalla London | `FAHGA4ZPMR8` | 10 (covers, social, etsy, email) | 2 (square + story) |
| Zenitha.Luxury | `FAHGBAIduP0` | 10 | 2 |
| Zenitha Yachts | `FAHGBDx0oO8` | 10 | 2 |
| WTME | `FAHGEYMPxtQ` | 14 social frames (7 EN + 7 AR) | 14 |

### Canva MCP workflow

```
1. Dashboard: user taps "Generate Social" on an article
2. API returns: Canva design ID + edit URL + suggested content
3. User opens Canva URL OR Claude MCP customizes the template:
   - Replaces placeholder title with article title
   - Replaces placeholder photo with article featured image
   - Exports as PNG
4. PNG saved to MediaAsset DB via upload or API
5. Ready for social calendar scheduling
```

### Canva NEVER produces

- Anything automatic (always requires a trigger)
- Video content with animation/motion (use Remotion)
- Structured data, sitemaps, or SEO assets (use System)

---

## ENGINE 3: REMOTION (Local Machine)

**When:** On-demand — triggered from CLI (`npm run studio`) or future dashboard button.
**Where:** Local machine with Node.js + ffmpeg. NOT on Vercel.
**Cost:** Free (open source). Requires compute for rendering.

### What it produces

| Asset | Composition | Duration | Use case |
|-------|------------|----------|----------|
| Brand intro | `BrandIntro` | 3s | Start of any video |
| Brand outro | `BrandOutro` | 3s | End of any video |
| Content post | `ContentPost` | 15s | Top 5 lists, tips, guides |
| Promo sale | `PromoSale` | 15s | Flash sales, offers |
| Photo feature | `PhotoFeature` | 15s | Destination highlights |
| Event ticket | `EventTicket` | 15s | Event announcements |
| Story overlay | `StoryOverlay` | Variable | ProRes 4444 alpha overlay |
| Branded video | `VideoWithBranding` | Variable | Intro + footage + outro |

### Multi-brand support

```typescript
// tokens.ts — getBrandTokens(siteId) returns correct colors for any brand
const tokens = getBrandTokens("worldtme");
// → skyBlue #07A4F2, green #03AD62, Gilroy font, WTME logo
```

### Remotion workflow

```
1. User runs: npm run studio (interactive CLI menu)
2. Picks composition (e.g., ContentPost)
3. Enters props (title, items, optional: auto-photo from library)
4. Remotion renders MP4 to out/ folder
5. User uploads to Instagram/TikTok/YouTube
```

### Remotion NEVER produces

- Static images (use System or Canva)
- Anything that needs to run on Vercel serverless
- Real-time/on-demand content (rendering takes 30-120s)

---

## Decision Matrix: Which Engine?

```
Is it a VIDEO with motion/animation?
  YES → REMOTION
  NO ↓

Is it generated AUTOMATICALLY on every publish?
  YES → SYSTEM
  NO ↓

Does it need CUSTOM VISUAL EDITING (drag elements, adjust layout)?
  YES → CANVA
  NO ↓

Is it a standard format (OG, email header, meta tags)?
  YES → SYSTEM
  NO → CANVA
```

---

## Auto-Generation Pipeline (on article publish)

When `content-selector` promotes an article from reservoir to BlogPost:

```
BlogPost.create({ published: true })
  │
  ├─ [SYSTEM] OG image generated via /api/og (automatic)
  ├─ [SYSTEM] Featured image set from Unsplash (if missing)
  ├─ [SYSTEM] JSON-LD structured data rendered on page load
  ├─ [SYSTEM] IndexNow submitted to 3 engines
  ├─ [SYSTEM] sitemap-cache rebuilt
  │
  ├─ [DB FLAG] social_content_needed = true
  │   └─ Dashboard shows "Generate Social" button next to article
  │       ├─ WTME: links to 14 Canva frame templates
  │       ├─ YL/ZL/ZY: renders image from CDN template
  │       └─ Video option: shows Remotion composition picker
  │
  └─ [DB FLAG] email_digest_queued = true
      └─ Next subscriber-emails cron includes this article
          └─ Email rendered with per-site brand colors + logo
```

---

## Brand Color Quick Reference

| Brand | Primary | Accent | Highlight | Dark | Cream |
|-------|---------|--------|-----------|------|-------|
| Yalla London | `#C8322B` red | `#C49A2A` gold | `#4A7BA8` blue | `#1C1917` | `#FAF8F4` |
| Zenitha.Luxury | `#C49A2A` gold | `#D4AF6A` soft gold | `#C9A84C` warm gold | `#0C0C0C` | `#F0EBE1` |
| Zenitha Yachts | `#B8923E` gold | `#D4B254` light gold | `#101F31` navy | `#101F31` | `#FBF2E3` |
| WTME | `#07A4F2` sky blue | `#03AD62` green | `#FFC417` gold | `#000000` | `#FFFFFF` |

---

## Canva MCP Prompt Templates

### For Claude sessions with Canva MCP connected:

#### Generate social post for a Yalla London article

```
Using the Canva MCP, customize the Yalla London social story template:

1. Start editing: design ID from the Canva template registry for yalla-london social-story
2. Replace the title text with: "[ARTICLE TITLE]"
3. Replace the subtitle with: "[ARTICLE CATEGORY]"
4. If an image is available, upload it and replace the placeholder photo
5. Export as PNG (1080x1920)
6. Save the exported image URL

Brand rules:
- Red #C8322B is the ONLY red
- Tricolor bar: red | gold | blue (flat, never gradient)
- Font: Anybody for headings, Source Serif 4 for body
- Logo: stamp seal, always round, always bottom-left
```

#### Generate social post for a WTME article

```
Using the Canva MCP, customize a WTME social frame:

Template folder: FAHGEYMPxtQ
For English story: use design DAHGEb-N6hw (Photo Feature)
For Arabic story: use design DAHGEQNCbnA (Photo Feature)

1. Start editing transaction on the appropriate design
2. Find and replace placeholder title with: "[ARTICLE TITLE]"
3. Find and replace placeholder subtitle with: "[DESTINATION]"
4. Upload the article's hero image and replace the placeholder photo
5. Commit the editing transaction
6. Export as PNG

Brand rules:
- Sky Blue #07A4F2 + Green #03AD62 are the signature pair
- The diagonal blue-to-green wave transition is WTME's signature
- Arabic text: NEVER letter-space. Use Shamel Family Sans or Noto Sans Arabic
- Every design must include: zenitha.luxury | worldtme.com
- Logo: circular badge with nature/travel illustration
```

#### Generate social post for Zenitha Yachts

```
Using the Canva MCP, customize the Zenitha Yachts social template:

Template: from Canva folder FAHGBDx0oO8 (social-story or social-square)

1. Start editing the template
2. Replace title with: "[ARTICLE TITLE]"
3. Replace subtitle with: "[YACHT REGION / DESTINATION]"
4. Export as PNG

Brand rules:
- Navy #101F31 is the primary dark
- Gold #B8923E is the accent — gold rules 1.5px height, 48-56px width
- Font: Cormorant Garamond for display, Inter for body
- No stock photos in materials — use yacht/maritime imagery only
```

---

## Remotion Prompt Templates

### For rendering videos from the CLI:

#### Content Post (Top 5 list)

```bash
node render.mjs
# Select: 📋 Content Post (Tips/List)
# Kicker: INSIDER TIP
# Headline: Top 5 Halal\nRestaurants\nin Mayfair
# Items: The Montagu — Michelin-starred,Rüya — Ottoman-Turkish,Novikov — Russian-Asian,Hakkasan — Cantonese,Sexy Fish — Japanese
# Output: content-post-halal-mayfair.mp4
```

#### Photo Feature with auto-photo

```bash
node render.mjs
# Select: 📸 Photo Feature
# Photo source: 🔍 Auto-select from library
# Topic: greenwich royal observatory
# Kicker: DESTINATION SPOTLIGHT
# Headline: The Royal\nObservatory\nGreenwich
# Body: Stand on the Prime Meridian and explore 400 years of astronomy.
# Output: photo-greenwich.mp4
```

#### Brand a raw video

```bash
node render.mjs
# Select: 🎬 Brand a Video
# Footage: footage/london-walk.mp4
# → Auto adds: BrandIntro (3s) + StoryOverlay + BrandOutro (3s)
# Output: branded-london-walk.mp4
```
