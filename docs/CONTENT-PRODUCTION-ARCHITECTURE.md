# Zenitha Content Production Architecture

## Three Engines — Clear Boundaries

Every visual asset is created by exactly ONE engine. No overlap.

---

## ENGINE 1: SYSTEM (Auto-Pilot)

**Runs:** Automatically on every publish. No human input ever.
**Where:** Vercel serverless.
**Owner's role:** None — it just works.

### What it produces automatically

| Asset | When | How |
|-------|------|-----|
| OG image (1200×630) | Article published | `/api/og` — site colors + title |
| Featured image | Article published (if missing) | Unsplash search by title → `image-pipeline` cron |
| Email newsletter branding | Digest cron fires | Per-site logo, colors, fonts via `getBrand(siteId)` |
| JSON-LD structured data | Page loads | `<StructuredData>` component reads site config |
| Sitemap XML | Every 4h cache rebuild | `sitemap.ts` per-site |
| IndexNow submission | After publish | 3 engines: Bing, Yandex, api.indexnow.org |
| Affiliate link injection | Daily cron | Per-site partner rules, only approved partners |
| Meta tags (title, desc, canonical) | Page loads | `generateMetadata()` per-site |
| Arabic URL tracking | After publish | Auto-tracks `/ar/blog/{slug}` variant |
| Tweet auto-queue | After publish (if Twitter keys set) | Per-site hashtags |
| Bad image replacement | Every 4h | Detects wrong/missing photos, replaces via Unsplash |
| Unapproved partner cleanup | Every 4h | Strips partner blocks where env var is empty |

### System NEVER asks you to do anything

If you see a System-generated asset that's wrong (wrong photo, bad title), the auto-fix crons catch it within 4 hours. If it persists, flag it in the cockpit.

---

## ENGINE 2: CANVA (Your Design Studio)

**Runs:** When you want custom visuals. Semi-manual — you design, it exports.
**Where:** Canva app or browser. Templates stored in 4 brand folders.
**Owner's role:** Pick template → customize → export → upload to dashboard.

### Your Canva template library

| Brand | Folder | Templates | What's there |
|-------|--------|-----------|-------------|
| **Yalla London** | `FAHGA4ZPMR8` | 10 | 6 PDF covers, 1 Etsy, 1 social square, 1 social story, 1 email header |
| **Zenitha.Luxury** | `FAHGBAIduP0` | 10 | Same set — navy/gold brand |
| **Zenitha Yachts** | `FAHGBDx0oO8` | 10 | Same set — maritime brand |
| **WTME** | `FAHGEYMPxtQ` | 14 | 7 EN frames + 7 AR frames (stories + IG posts) |

### Canva workflow (from your iPhone)

```
1. Open Canva app
2. Go to Brand Hub → pick brand kit
3. Pick a template (e.g., WTME Photo Feature Story)
4. Replace title text, swap photo
5. Tap "Share" → Download as PNG/MP4
6. Upload to dashboard media library
```

### When to use Canva (not System)

- Custom social posts with specific photos you chose
- Etsy product listing images
- PDF guide covers with custom titles
- Presentation slides
- Print materials (business cards, flyers)
- Any design that needs visual editing

### Canva designs stay in Canva

Your Canva templates are your visual toolkit. They don't need to be "imported" into the platform — they live in Canva, you export what you need. The platform's template registry (Canva asset IDs) exists so that Claude MCP sessions can reference and customize them programmatically when you ask.

---

## ENGINE 3: REMOTION (Monthly Video Batch)

**Runs:** From your PC, once a month (or whenever you want video content).
**Where:** Your local machine with Node.js installed.
**Owner's role:** Run the CLI, answer prompts, get MP4s. Upload to dashboard.

### How you'll use it

```
Monthly video production session (2-3 hours):

1. Open terminal on your PC
2. cd yalla-video
3. npm run studio

4. Render 5-10 ContentPost videos (Top 5 lists, tips)
5. Render 5-10 PhotoFeature videos (destination highlights)
6. Render 2-3 PromoSale videos (seasonal offers)
7. Render 2-3 EventTicket videos (upcoming events)
8. Brand 5-10 raw Canva footage clips (BrandIntro + overlay + BrandOutro)

Output: 20-30 MP4 files in the out/ folder
```

### What happens to the rendered videos

```
After rendering on your PC:

1. Upload all MP4s to dashboard: /admin/media (drag & drop)
2. Each video appears in your media library with thumbnail
3. From Social Calendar: pick a video → schedule for Instagram/TikTok
4. Videos drip-publish over 2-4 weeks from your phone
```

### 8 compositions available

| Composition | Duration | Best for |
|------------|----------|----------|
| BrandIntro | 3s | Start of any video |
| BrandOutro | 3s | End of any video |
| ContentPost | 15s | "Top 5 halal restaurants in Mayfair" |
| PromoSale | 15s | Flash sales, seasonal offers |
| PhotoFeature | 15s | Destination spotlights |
| EventTicket | 15s | Event announcements |
| StoryOverlay | Variable | Transparent overlay for footage |
| VideoWithBranding | Variable | Raw footage → branded video |

### Using Canva footage in Remotion

```
1. Download clips from your Canva video library (433 clips available)
2. Place MP4 files in yalla-video/public/footage/
3. Run: npm run studio → "Brand a Video"
4. Select footage file → auto-adds BrandIntro + StoryOverlay + BrandOutro
5. Output: professionally branded video ready for social
```

---

## The Complete Flow

```
CONTENT PUBLISHED (article goes live)
  │
  ├── SYSTEM (instant, automatic)
  │   ├── OG image generated
  │   ├── Featured image queued
  │   ├── IndexNow submitted
  │   ├── Tweet queued (if enabled)
  │   └── Sitemap updated
  │
  ├── YOU DECIDE: Want social posts for this article?
  │   │
  │   ├── Quick → System One-Tap Create (basic branded image)
  │   │
  │   └── Custom → Open Canva → pick WTME/YL/ZL frame
  │       → customize with article photo + title
  │       → export PNG → upload to dashboard
  │       → schedule in Social Calendar
  │
  └── Monthly: Want video content?
      │
      └── PC session → Remotion CLI → render batch
          → upload to dashboard → schedule over 2-4 weeks
```

---

## Brand Enforcement Rules (ALL engines)

| Rule | System | Canva | Remotion |
|------|--------|-------|---------|
| Colors from brand config | `getBrandDefaults(siteId)` | Brand Kit in Canva | `getBrandTokens(siteId)` |
| Fonts per site | CSS tokens | Brand Kit fonts | `@remotion/google-fonts` |
| Logo per site | `/branding/{site}/logo/` | Brand Kit logos | `staticFile()` in public/ |
| Arabic: no letter-spacing | CSS rule | Canva template constraint | Component rule |
| Ownership footer | Auto in email/structured data | Manual in Canva design | Footer component |
| Site separation | `siteId` in every DB query | Separate Canva folders | `getBrandTokens(siteId)` |

---

## Brand Reference

| Brand | Primary | Accent | Dark | Cream | Display Font | Body Font |
|-------|---------|--------|------|-------|-------------|-----------|
| Yalla London | `#C8322B` | `#C49A2A` | `#1C1917` | `#FAF8F4` | Anybody | Source Serif 4 |
| Zenitha.Luxury | `#C49A2A` | `#D4AF6A` | `#0C0C0C` | `#F0EBE1` | Cormorant Garamond | Inter |
| Zenitha Yachts | `#B8923E` | `#D4B254` | `#101F31` | `#FBF2E3` | Cormorant Garamond | Inter |
| WTME | `#07A4F2` | `#03AD62` | `#000000` | `#FFFFFF` | Gilroy | Montserrat |
