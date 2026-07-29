# Zenitha Yachts — Technical Development Plan

**Date:** February 21, 2026
**Prepared for:** Khaled N. Aun, Zenitha.Luxury LLC
**Based on:** Product Readiness Report + Skippers Business Plan + Platform Architecture
**Status:** BUILT — PENDING DEPLOY
**Domain:** `zenithayachts.com` (purchased, DNS on Cloudflare)

---

## EXECUTIVE SUMMARY

**What this document is:** The technical blueprint for building a yacht charter platform on top of the existing Yalla London infrastructure. Every section maps yacht features to real platform components — what we reuse, what we build new.

**What we reuse (80%):** Content pipeline, SEO engine, affiliate injection, admin dashboard patterns, multi-site architecture, middleware, cron infrastructure, brand system, design system.

**What we build new (20%):** Yacht data models, API sync adapters (NauSYS/MMK/Charter Index), yacht search page, AI matchmaker, charter inquiry CRM, destination pages.

**Platform Mapping — Reuse vs New:**

| Yacht Requirement | Existing Component | File Path | Strategy |
|---|---|---|---|
| Yacht content articles | 8-phase content pipeline | `lib/content-pipeline/phases.ts` | Reuse — adapt system prompts |
| SEO for yacht pages | 13-check pre-pub gate | `lib/seo/orchestrator/pre-publication-gate.ts` | Reuse — add yacht schema types |
| Yacht affiliate links | Affiliate injection system | `lib/content-pipeline/select-runner.ts` | Reuse — add yacht partners |
| Multi-site yacht sites | Site config | `config/sites.ts` | Reuse — add yacht site entries |
| Yacht admin pages | Admin dashboard (59 pages) | `app/admin/` | Reuse patterns — new pages |
| Brand themes | Destination themes | `config/destination-themes.ts` | Reuse — add yacht themes |
| Domain routing | Middleware | `middleware.ts` | Reuse — add yacht domains |
| Cron jobs | Budget-guarded crons (22 jobs) | `app/api/cron/` | Reuse patterns — new sync crons |
| Bilingual EN/AR | Existing i18n system | All models have `_en`/`_ar` fields | Direct reuse |
| Yacht search & browse | **No equivalent** | NEW | Build from scratch |
| AI yacht matchmaker | **No equivalent** | NEW | Build from scratch |
| AI trip planner | **No equivalent** | NEW | Build from scratch |
| Yacht data sync (APIs) | **No equivalent** | NEW | Build from scratch |
| Charter inquiry CRM | **No equivalent** | NEW | Build from scratch |
| Yacht availability | **No equivalent** | NEW | Build from scratch |

**Score: 15 components reused, 6 new components needed.**

---

## 0. PRE-BUILD CHECKLIST — DOMAIN & GOOGLE PLATFORM SETUP

**What Khaled sets up (from iPhone):**

### 0.1 Domain Purchase & DNS — DONE

| Step | Action | Status |
|------|--------|--------|
| 1 | Purchase domain `zenithayachts.com` | **DONE** — Cloudflare registrar |
| 2 | Point DNS to Vercel: In Cloudflare DNS, add CNAME record `www` → `cname.vercel-dns.com` (proxy OFF / DNS only) | **NEXT** |
| 3 | Add root (`@`) A record → `76.76.21.21` (Vercel's IP) OR CNAME `@` → `cname.vercel-dns.com` | **NEXT** |
| 4 | In Vercel project: Settings → Domains → Add `zenithayachts.com` and `www.zenithayachts.com` | **Claude Code does this** |

**Cloudflare DNS note:** Vercel requires the CNAME proxy to be **OFF** (DNS only / grey cloud icon) for SSL certificate provisioning. Cloudflare's orange cloud proxy conflicts with Vercel's edge SSL. After Vercel confirms the domain, you can optionally turn proxy back on.

### 0.2 Google Search Console (per site)

| Step | Action | Time |
|------|--------|------|
| 1 | Go to [search.google.com/search-console](https://search.google.com/search-console) | 1 min |
| 2 | Click "Add property" → choose "Domain" → enter `zenithayachts.com` | 1 min |
| 3 | Copy the DNS TXT record Google gives you → add it in **Cloudflare DNS** panel (type: TXT, name: `@`) | 3 min |
| 4 | Wait for verification (usually instant, max 48h) | 0 min |
| 5 | Add the **existing Google service account email** as a user with "Full" permission | 2 min |

**Same service account** used across all sites — no new Google Cloud project needed.

### 0.3 Google Analytics 4 (per site)

| Step | Action | Time |
|------|--------|------|
| 1 | Go to [analytics.google.com](https://analytics.google.com) → Admin | 1 min |
| 2 | Click "Create" → "Property" → name it "Zenitha Yachts" | 1 min |
| 3 | Add a "Web" data stream → enter `https://www.zenithayachts.com` | 1 min |
| 4 | Copy the **Measurement ID** (starts with `G-`) | 0 min |
| 5 | Copy the **Property ID** (numeric, found in Property Settings) | 0 min |
| 6 | In GA4 Admin → Property → Property Access Management → add the same service account with "Viewer" role | 2 min |

### 0.4 Vercel Environment Variables (Claude Code does this)

Add 3 env vars per site in Vercel Dashboard → Settings → Environment Variables:

```bash
# Pattern: {VAR_NAME}_{SITE_ID_UPPER}
# Site ID "zenitha-yachts-med" → suffix "_ZENITHA_YACHTS_MED"

GSC_SITE_URL_ZENITHA_YACHTS_MED=sc-domain:zenithayachts.com
GA4_PROPERTY_ID_ZENITHA_YACHTS_MED=123456789
GA4_MEASUREMENT_ID_ZENITHA_YACHTS_MED=G-XXXXXXX
```

These are read by `getSiteSeoConfig()` in `config/sites.ts:1352-1381` which does a 3-layer lookup:
1. **Per-site env var** (e.g., `GSC_SITE_URL_ZENITHA_YACHTS_MED`)
2. **Global fallback** (e.g., `GSC_SITE_URL` — shared with Yalla London)
3. **Intelligent default** (e.g., `sc-domain:zenithayachts.com` from site config)

### 0.5 IndexNow Key

Shared across all sites by default. One `INDEXNOW_KEY` env var covers all domains. The verification file is served dynamically by the app at `/{key}.txt`.

### 0.6 What You Do NOT Need Per Site

- No new Supabase project (shared DB, `site_id` column separates data)
- No new Vercel project (shared deployment, middleware routes by domain)
- No new Google Cloud project (same service account across all properties)
- No new cron jobs (they loop all active sites automatically)
- No new IndexNow key (shared)

### 0.7 Post-Setup: Site Activation (Claude Code, 2 minutes)

```typescript
// config/sites.ts — change status from "planned" to "active"
"zenitha-yachts-med": {
  status: "active",  // ← This single change activates everything
  // ...
}
```

Once active: cron jobs generate content, SEO agent submits to IndexNow, affiliate injection runs, sitemap includes yacht pages — all automatic.

---

## 0.5 PLATFORM UPDATES SINCE PLAN CREATION (Feb 21, 2026)

> **Last updated: April 4, 2026** — 40+ audit rounds completed since initial build.

### Critical Production Bugs Fixed (Feb–Mar 2026)

These fixes on the main platform directly benefit the yacht site from day one:

| Bug | Impact on Yacht Site | Fix | Date |
|-----|---------------------|-----|------|
| **Blog pages timing out** (11+ seconds) | Yacht articles would timeout too | `React.cache()` dedup, `withTimeout()` fallback, Prisma `select` optimization, Suspense for related articles | Feb 2026 |
| **robots.txt blocking ALL AI crawlers** | Zero AI Overview citations for yacht content | Explicit `disallow: []` for AI bots (ClaudeBot, ChatGPT-User, etc.) | Feb 2026 |
| **Duplicate slugs creating ghost 404s** | Yacht articles could collide with travel articles | `startsWith` slug dedup, per-site scoping, compound `@@index([siteId, slug])` on BlogPost | Feb 2026 |
| **Cross-site IndexNow contamination** | Istanbul URLs submitted under yalla-london.com key | SEO cron now loops per-site with correct domain | Feb 2026 |
| **Indexing pipeline dead ends** | Submitted yacht URLs never advancing from "discovered" | `trackSubmittedUrls()` writes results to DB, GSC format fixed to `sc-domain:` | Feb 2026 |
| **URLIndexingStatus unique constraint crash** | Yacht page indexing would crash on duplicate submissions | All 4 `.create()` calls converted to atomic `.upsert()` with compound key `site_id_url` | Apr 4, 2026 |
| **Arabic Unicode keyword dedup** | Arabic yacht content false-flagged as duplicate | Unicode ranges `\u0600-\u06FF`, `\u0750-\u077F`, `\uFB50-\uFDFF`, `\uFE70-\uFEFF` preserved in normalization | Apr 4, 2026 |
| **Stuck drafts blocking pipeline forever** | Failed yacht drafts would block all content production | `GATE_REJECTION_THRESHOLD=5` permanently rejects stuck drafts after 5 gate failures | Apr 4, 2026 |
| **Cannibalization threshold too aggressive** | Different yacht articles blocked ("Greek charter" vs "Bodrum rental") | Jaccard threshold raised from 60% to 85%, site-common stop words stripped | Mar 22, 2026 |
| **Content-selector frozen pipeline** | Zero articles published for days when all overlap | Force-publish fallback: best candidate published regardless of overlap | Mar 23, 2026 |
| **GSC sync 7x overcounting** | Inaccurate traffic numbers | Per-day storage with `dimensions: ["page", "date"]` instead of aggregated | Mar 9, 2026 |
| **IndexNow key rejected by all engines** | Yacht pages never submitted for indexing | 3-layer fix: dedicated API route + Vercel rewrite + middleware bypass | Mar 24, 2026 |
| **Assembly phase infinite loop** | Drafts cycling timeout → fallback → reset forever | Raw fallback preserves attempt count, sweeper skips assembly timeout drafts | Mar 16, 2026 |
| **Quality gate scoring post-publish features** | All articles rejected at 70 threshold | Gate lowered to 40, post-publish features (affiliates, internal links) scored separately | Mar 18, 2026 |
| **Title dedup too strict** | Near-identical titles with different years blocked | Normalized dedup strips years, filler words, punctuation before comparing | Mar 27, 2026 |

### Major Platform Additions Since Feb 21 (Benefit Yacht Site)

| Feature | Impact on Yacht Site | Date |
|---------|---------------------|------|
| **CEO Agent + CTO Agent** | WhatsApp inquiry auto-handling, CRM auto-creation, AI yacht recommendations | Mar 27, 2026 |
| **Resend Email System** | Welcome emails, inquiry confirmations, booking confirmations ready | Mar 24, 2026 |
| **Foundation APIs** | Currency conversion (GBP→AED/SAR), weather for charter destinations, Ticketmaster events | Mar 23, 2026 |
| **CJ + Travelpayouts Affiliates** | Auto-injected affiliate links in yacht articles (Boatbookings, charter operators) | Mar 10-23, 2026 |
| **GEO/AIO Optimization** | Stats, citations, citability in all generated content for AI search visibility | Mar 10, 2026 |
| **Per-content-type Quality Gates** | Yacht news (150w min), guides (400w min), blog (500w min) — not all forced to 1000w | Feb 26, 2026 |
| **Optimistic Concurrency** | Prevents data corruption on concurrent BlogPost writes (24 crons use OCC wrapper) | Mar 18, 2026 |
| **Formal State Machine** | VALID_TRANSITIONS prevents illegal pipeline phase changes | Mar 18, 2026 |
| **Queue Monitor** | 6-rule pipeline health with auto-fix | Mar 17, 2026 |
| **CEO Inbox** | Automated cron failure detection → diagnosis → auto-fix → retest → email alert | Mar 15, 2026 |
| **Centralized Constants** | Single source of truth for all retry caps, budget values, thresholds | Mar 17, 2026 |
| **Circuit Breaker + Last-Defense** | AI provider resilience: 3-failure trip, 5-min cooldown, fallback probe | Mar 5, 2026 |
| **Named Author Profiles** | E-E-A-T compliance with per-site author rotation | Mar 5, 2026 |
| **Admin Clean Light Design System** | Unified responsive admin UI across 50+ pages | Mar 15, 2026 |
| **Unsplash SDK** | Legal travel photos with caching and bilingual attribution | Mar 24, 2026 |
| **PDF Cover Generator** | 6 branded templates for charter proposals and marketing materials | Mar 20, 2026 |

### Analytics Multi-Site Gap — STATUS UPDATE

The analytics cron (`/api/cron/analytics`) has been updated to loop through all active sites using `getActiveSiteIds()`. The infrastructure (`getSiteSeoConfig()`, per-site env vars) is fully ready. **This is no longer a blocker.** Just set the 3 per-site env vars (`GA4_PROPERTY_ID_ZENITHA_YACHTS_MED`, `GA4_MEASUREMENT_ID_ZENITHA_YACHTS_MED`, `GSC_SITE_URL_ZENITHA_YACHTS_MED`) after creating the GA4/GSC properties.

### Pre-Publication Gate (16 Checks — All Apply to Yacht Content)

Every yacht article passes through the same 16-check quality gate before publishing:
1. Route existence, 2. Arabic route, 3. SEO minimums, 4. SEO score (blocks <30), 5. Heading hierarchy, 6. Word count (500 blocker), 7. Internal links (3+), 8. Readability (Flesch-Kincaid ≤12), 9. Image alt text, 10. Author attribution (E-E-A-T), 11. Structured data, 12. Authenticity signals (Jan 2026 Google update), 13. Affiliate links, 14. AIO readiness (AI Overview citation signals), 15. Internal link ratio, 16. Citability / GEO (stats, attributions, self-contained paragraphs)

### Current Platform Status: PAUSED — Ready to Activate

Site config at `config/sites.ts` line 1571: `status: "paused"`. Change to `"active"` to enable all automated systems. See the full activation checklist in the updated Execution Plan (`Uploads/Execution Plan`).

---

## 1. DATABASE SCHEMA — PRISMA MODELS

### 8 New Models + 2 New Enums

Add to `prisma/schema.prisma`:

```prisma
// ─── ENUMS ──────────────────────────────────────────────────

enum YachtType {
  SAILBOAT
  CATAMARAN
  MOTOR_YACHT
  GULET
  SUPERYACHT
  POWER_CATAMARAN
}

enum YachtSource {
  NAUSYS
  MMK
  CHARTER_INDEX
  MANUAL
}

enum InquiryStatus {
  NEW
  CONTACTED
  QUALIFIED
  SENT_TO_BROKER
  BOOKED
  LOST
}

enum AvailabilityStatus {
  AVAILABLE
  BOOKED
  HOLD
  MAINTENANCE
}

enum ReviewStatus {
  PENDING
  APPROVED
  REJECTED
}

enum DestinationRegion {
  MEDITERRANEAN
  ARABIAN_GULF
  RED_SEA
  INDIAN_OCEAN
  CARIBBEAN
  SOUTHEAST_ASIA
}

enum SyncStatus {
  RUNNING
  COMPLETED
  FAILED
}

enum ItineraryDifficulty {
  EASY
  MODERATE
  ADVANCED
}

// ─── MODEL 1: Yacht ─────────────────────────────────────────

model Yacht {
  id                    String              @id @default(cuid())
  externalId            String?             // ID from NauSYS/MMK/Charter Index
  source                YachtSource         @default(MANUAL)
  name                  String
  slug                  String
  type                  YachtType           @default(SAILBOAT)

  // Specs
  length                Decimal?            @db.Decimal(6,2)
  beam                  Decimal?            @db.Decimal(5,2)
  draft                 Decimal?            @db.Decimal(4,2)
  yearBuilt             Int?
  builder               String?
  model                 String?

  // Capacity
  cabins                Int                 @default(0)
  berths                Int                 @default(0)
  bathrooms             Int                 @default(0)
  crewSize              Int                 @default(0)

  // Pricing
  pricePerWeekLow       Decimal?            @db.Decimal(10,2)
  pricePerWeekHigh      Decimal?            @db.Decimal(10,2)
  currency              String              @default("EUR")

  // Content
  description_en        String?             @db.Text
  description_ar        String?             @db.Text
  features              Json?               // amenities, equipment list
  images                Json?               // array of image URLs
  waterSports           Json?               // available water sports

  // GCC Differentiators
  halalCateringAvailable Boolean            @default(false)
  familyFriendly        Boolean             @default(false)
  crewIncluded          Boolean             @default(false)

  // Location
  homePort              String?
  cruisingArea          String?

  // Ratings
  rating                Decimal?            @db.Decimal(3,2)
  reviewCount           Int                 @default(0)

  // Status
  status                String              @default("active") // active, inactive, pending_review
  featured              Boolean             @default(false)

  // Multi-site
  siteId                String
  destinationId         String?

  // Sync
  lastSyncedAt          DateTime?
  syncHash              String?             // hash for dedup

  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  // Relations
  destination           YachtDestination?   @relation(fields: [destinationId], references: [id])
  reviews               YachtReview[]
  inquiries             CharterInquiry[]
  availability          YachtAvailability[]

  @@unique([externalId, source])
  @@index([siteId])
  @@index([destinationId])
  @@index([type])
  @@index([status, siteId])
  @@index([slug, siteId])
  @@index([pricePerWeekLow])
  @@index([halalCateringAvailable])
}

// ─── MODEL 2: YachtDestination ──────────────────────────────

model YachtDestination {
  id                    String              @id @default(cuid())
  name                  String
  slug                  String
  region                DestinationRegion
  country               String?

  description_en        String?             @db.Text
  description_ar        String?             @db.Text

  seasonStart           String?             // "May"
  seasonEnd             String?             // "October"
  bestMonths            Json?               // ["June", "July", "August"]

  heroImage             String?
  galleryImages         Json?

  averagePricePerWeek   Decimal?            @db.Decimal(10,2)
  highlights            Json?               // key attractions
  weatherInfo           Json?
  marinas               Json?               // marina list with coords

  siteId                String
  status                String              @default("active")

  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  // Relations
  yachts                Yacht[]
  itineraries           CharterItinerary[]

  @@unique([slug, siteId])
  @@index([siteId])
  @@index([region])
}

// ─── MODEL 3: CharterInquiry ────────────────────────────────

model CharterInquiry {
  id                    String              @id @default(cuid())
  firstName             String
  lastName              String
  email                 String
  phone                 String?
  whatsappNumber        String?

  destination           String?
  preferredDates        Json?               // { start, end, flexible }
  guestCount            Int                 @default(2)
  childrenCount         Int                 @default(0)
  budget                Decimal?            @db.Decimal(10,2)
  budgetCurrency        String              @default("EUR")

  yachtTypePreference   YachtType?
  preferences           Json?               // { halal, crew, watersports, privacy }
  experienceLevel       String              @default("first_time") // first_time, some, experienced
  languagePreference    String              @default("en")

  status                InquiryStatus       @default(NEW)
  brokerAssigned        String?
  brokerNotes           String?             @db.Text

  // Attribution
  source                String?             // organic, paid, whatsapp, referral
  utmSource             String?
  utmMedium             String?
  utmCampaign           String?

  // Links
  yachtId               String?
  siteId                String

  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  // Relations
  yacht                 Yacht?              @relation(fields: [yachtId], references: [id])

  @@index([siteId])
  @@index([status])
  @@index([email])
}

// ─── MODEL 4: YachtAvailability ─────────────────────────────

model YachtAvailability {
  id                    String              @id @default(cuid())
  yachtId               String
  startDate             DateTime
  endDate               DateTime
  status                AvailabilityStatus  @default(AVAILABLE)
  priceForPeriod        Decimal?            @db.Decimal(10,2)
  currency              String              @default("EUR")
  source                YachtSource
  lastCheckedAt         DateTime            @default(now())

  createdAt             DateTime            @default(now())

  // Relations
  yacht                 Yacht               @relation(fields: [yachtId], references: [id], onDelete: Cascade)

  @@index([yachtId])
  @@index([startDate, endDate])
  @@index([status])
}

// ─── MODEL 5: YachtReview ───────────────────────────────────

model YachtReview {
  id                    String              @id @default(cuid())
  yachtId               String
  authorName            String
  authorEmail           String?
  rating                Int                 // 1-5
  title                 String?
  content_en            String?             @db.Text
  content_ar            String?             @db.Text
  charterDate           DateTime?
  destination           String?
  verified              Boolean             @default(false)
  status                ReviewStatus        @default(PENDING)
  siteId                String

  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  // Relations
  yacht                 Yacht               @relation(fields: [yachtId], references: [id], onDelete: Cascade)

  @@index([yachtId])
  @@index([siteId])
  @@index([status])
}

// ─── MODEL 6: CharterItinerary ──────────────────────────────

model CharterItinerary {
  id                    String              @id @default(cuid())
  title_en              String
  title_ar              String?
  slug                  String
  destinationId         String
  duration              Int                 // days
  difficulty            ItineraryDifficulty @default(EASY)

  description_en        String?             @db.Text
  description_ar        String?             @db.Text

  stops                 Json                // [{ day, port, lat, lng, activities, restaurants, notes }]
  recommendedYachtTypes Json?               // ["CATAMARAN", "SAILBOAT"]
  estimatedCost         Decimal?            @db.Decimal(10,2)
  currency              String              @default("EUR")
  bestSeason            String?
  heroImage             String?

  siteId                String
  status                String              @default("active")

  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  // Relations
  destination           YachtDestination    @relation(fields: [destinationId], references: [id])

  @@unique([slug, siteId])
  @@index([siteId])
  @@index([destinationId])
}

// ─── MODEL 7: BrokerPartner ────────────────────────────────

model BrokerPartner {
  id                    String              @id @default(cuid())
  companyName           String
  contactName           String?
  email                 String
  phone                 String?
  website               String?
  commissionRate        Decimal?            @db.Decimal(5,2)
  destinations          Json?               // regions they cover
  status                String              @default("active")
  totalLeadsSent        Int                 @default(0)
  totalBookings         Int                 @default(0)
  siteId                String

  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  @@index([siteId])
}

// ─── MODEL 8: YachtSyncLog ─────────────────────────────────

model YachtSyncLog {
  id                    String              @id @default(cuid())
  source                YachtSource
  syncType              String              @default("incremental") // full, incremental
  startedAt             DateTime            @default(now())
  completedAt           DateTime?
  yachtsProcessed       Int                 @default(0)
  yachtsCreated         Int                 @default(0)
  yachtsUpdated         Int                 @default(0)
  yachtsDeactivated     Int                 @default(0)
  errors                Json?
  status                SyncStatus          @default(RUNNING)
  siteId                String

  @@index([siteId])
  @@index([source])
  @@index([startedAt])
}
```

### Migration Command
```bash
npx prisma migrate dev --name add_yacht_charter_models
```

### Index Strategy
- **Yacht table** (10K-50K rows): Indexed on siteId, destinationId, type, status, slug, price, halal flag
- **YachtAvailability** (100K+ rows): Composite index on (startDate, endDate) for date range queries
- **CharterInquiry**: Indexed on status for CRM pipeline views

---

## 2. API ROUTES — COMPLETE ENDPOINT SPECIFICATION

### 2.1 Public Yacht API (6 routes)

**GET `/api/yachts`** — Search with filters
- Auth: Public
- Query params: `destination`, `type`, `minPrice`, `maxPrice`, `guests`, `halal`, `family`, `crew`, `dates`, `sort`, `page`, `limit`
- Response: `{ yachts: Yacht[], total: number, page: number, pages: number }`
- Pattern: Prisma `findMany` with dynamic `where` clause + pagination
- Index: Uses composite index on (siteId, status, type, pricePerWeekLow)

**GET `/api/yachts/[id]`** — Yacht detail with availability
- Auth: Public
- Response: `{ yacht: Yacht, availability: YachtAvailability[], similarYachts: Yacht[], reviews: YachtReview[] }`
- Pattern: Prisma `findUnique` with includes + separate availability query
- Cache: ISR with 1-hour revalidation

**GET `/api/yachts/recommend`** — AI recommendations
- Auth: Public (rate limited: 10/hr per IP)
- Query: `destination`, `budget`, `guests`, `preferences`
- Response: `{ recommendations: { yacht, matchScore, explanation_en, explanation_ar, bookingUrl }[] }`
- Pattern: Pre-filter with Prisma → send top 20 to AI → return top 5

**GET `/api/destinations`** — All destinations
- Auth: Public
- Response: `{ destinations: YachtDestination[] }` with yacht counts
- Pattern: Prisma `findMany` with `_count: { yachts: true }`

**GET `/api/destinations/[slug]`** — Destination detail
- Auth: Public
- Response: `{ destination: YachtDestination, yachts: Yacht[], itineraries: CharterItinerary[], articles: BlogPost[] }`
- Pattern: Prisma `findFirst` by slug+siteId with includes

**POST `/api/charter-inquiry`** — Lead capture
- Auth: Public (CSRF + rate limit: 5/hr per IP)
- Body (Zod validated): `{ firstName, lastName, email, phone?, destination?, dates?, guestCount, budget?, preferences?, yachtId? }`
- Response: `{ success: true, inquiryId: string }`
- Side effects: Email confirmation to user, notification to admin
- XSS: All text fields sanitized before DB write

### 2.2 Admin Yacht API (8 routes)

All require `withAdminAuth`.

**GET/POST `/api/admin/yachts`**
- GET: List yachts with filters, pagination, search
- POST: Create/update yacht manually, bulk status changes

**GET/POST `/api/admin/yacht-destinations`**
- GET: List destinations with yacht counts
- POST: CRUD operations on destinations

**GET/POST `/api/admin/charter-inquiries`**
- GET: CRM pipeline view (filterable by status, date, destination)
- POST: Update status, assign broker, add notes

**GET/POST `/api/admin/broker-partners`**
- GET: Partner directory with performance stats
- POST: Add/edit/deactivate broker partners

**GET `/api/admin/yacht-analytics`**
- Response: Top yachts by views/inquiries, conversion funnel, revenue per destination

**GET `/api/admin/yacht-sync-status`**
- Response: Per-source sync health (last run, records, errors)

**POST `/api/admin/yacht-sync/trigger`**
- Body: `{ source: "nausys" | "mmk" | "charter_index" }`
- Triggers manual sync run

**GET/POST `/api/admin/charter-itineraries`**
- CRUD for pre-built itineraries

### 2.3 Cron/Sync API (5 routes)

All follow CRON_SECRET auth pattern (allow if unset, reject if set and doesn't match).

**POST `/api/cron/sync-nausys`** — NauSYS yacht sync (hourly)
**POST `/api/cron/sync-mmk`** — MMK sync (hourly, offset 30min)
**POST `/api/cron/sync-charter-index`** — Charter Index GraphQL (every 4h)
**POST `/api/cron/yacht-availability-refresh`** — Availability check (every 15min)
**POST `/api/cron/charter-inquiry-followup`** — Auto-followup emails (daily 10am)

### 2.4 AI API (3 routes)

**POST `/api/ai/yacht-matchmaker`** — AI-powered yacht matching
- Rate limit: 10/hr per IP
- Input: preferences (destination, dates, guests, budget, halal, etc.)
- Process: Prisma pre-filter → AI scoring → ranked results
- Budget guard: 15s timeout on AI call
- Fallback: if AI fails, return Prisma results sorted by relevance

**POST `/api/ai/trip-planner`** — Complete itinerary generation
- Rate limit: 5/hr per IP
- Input: destination, dates, guests, budget, dietary, interests
- Output: yacht recommendation + day-by-day route + cost breakdown + booking links
- Budget guard: 25s timeout

**POST `/api/ai/yacht-content`** — Yacht-specific content generation
- Auth: withAdminAuth
- Uses yacht system prompts from config/sites.ts

---

## 3. CONTENT PIPELINE EXTENSION

### 3.1 Yacht System Prompt (English)

Add to `config/sites.ts` for the yacht site:

```
You are a senior luxury yacht charter journalist with extensive Mediterranean
sailing experience. You write for Zenitha Yachts, a premium yacht charter
platform serving international luxury travelers and Gulf Arab families.

CONTENT REQUIREMENTS:
- Word count: 1,500–2,000 words minimum
- Heading hierarchy: 1 H1 (article title), 4-6 H2 sections, H3 subsections as needed
- No heading level skips (H1 → H2 → H3, never H1 → H3)
- Write a "Key Takeaways" summary section near the end
- End with a clear call-to-action (charter inquiry or booking link)

INTERNAL LINKS (3+ required):
- Link to other destination guides on the platform
- Link to yacht type comparison articles
- Link to relevant itinerary pages
- Use descriptive anchor text (not "click here")

AFFILIATE/BOOKING LINKS (2+ required):
- Include Boatbookings charter links for specific yachts mentioned
- Include HalalBooking links for pre/post charter hotels near marinas
- Include GetYourGuide/Viator links for shore excursions at ports
- Include travel insurance links (World Nomads)

FIRST-HAND EXPERIENCE (Google Jan 2026 — #1 ranking signal):
- Describe specific marina approaches ("entering Hvar harbor, the Fortica
  fortress looms on your port side")
- Include practical skipper advice (mooring tips, wind patterns, currents)
- Reference specific restaurants at each port by name
- Mention seasonal weather conditions honestly
- Include 2+ insider tips only someone who's sailed there would know
- Describe a limitation or challenge honestly — imperfection signals authenticity

NEVER USE THESE PHRASES:
- "nestled in the heart of"
- "look no further"
- "hidden gem"
- "paradise on earth"
- "without further ado"
- "in this comprehensive guide"
- "Whether you're a seasoned sailor or..."

META TAGS:
- Meta title: 50-60 characters, focus keyword at the start
- Meta description: 120-160 characters with keyword and call-to-action
- Focus keyword in: title, first paragraph, at least one H2

SEO:
- Target 1 primary keyword + 2-3 secondary keywords per article
- Use keyword naturally — no stuffing
- Include alt text on all images
- Content types: yacht reviews, destination guides, sailing itineraries,
  best-of listicles, first-timer guides, seasonal guides, Arab traveler guides
```

### 3.2 Yacht System Prompt (Arabic)

```
أنت صحفي متخصص في تأجير اليخوت الفاخرة مع خبرة واسعة في الإبحار بالبحر المتوسط
والخليج العربي. تكتب لمنصة "زينيثا يخوت"، منصة رائدة لتأجير اليخوت تخدم المسافرين
العرب والعائلات الخليجية.

متطلبات المحتوى:
- الحد الأدنى: ١٥٠٠-٢٠٠٠ كلمة
- تسلسل العناوين: عنوان H1 واحد، ٤-٦ عناوين H2، عناوين H3 فرعية حسب الحاجة
- اكتب قسم "أهم النقاط" قبل الخاتمة
- اختم بدعوة واضحة للعمل (حجز يخت أو استفسار)

الروابط الداخلية (٣ على الأقل):
- روابط لأدلة الوجهات الأخرى على المنصة
- روابط لمقالات مقارنة أنواع اليخوت
- استخدم نص ربط وصفي

روابط الحجز (٢ على الأقل):
- روابط حجز يخوت عبر Boatbookings
- روابط فنادق حلال عبر HalalBooking بالقرب من المراسي
- روابط رحلات شاطئية عبر GetYourGuide

التجربة الشخصية (تحديث جوجل يناير ٢٠٢٦):
- وصف مداخل المراسي بدقة
- نصائح عملية للإبحار (الرياح، التيارات، الرسو)
- ذكر مطاعم محددة في كل ميناء
- ذكر ٢+ نصائح لا يعرفها إلا من أبحر هناك
- الصدق حول التحديات والقيود

تجنب العبارات التالية:
- "جوهرة مخفية"
- "في قلب"
- "لا مزيد من البحث"
- "جنة على الأرض"
```

### 3.3 Topic Research Extension

The `weekly-topics` cron already loops all active sites. For yacht sites:
- Keyword sources: yacht charter + destination combinations
- Seasonal rotation: Mediterranean topics May-Oct, Gulf/Red Sea topics Nov-Apr
- Content types rotated: reviews → guides → itineraries → best-of → first-timer

### 3.4 Affiliate Injection Extension

Add to `select-runner.ts` affiliate rules for yacht sites:

```typescript
'zenitha-yachts-med': [
  {
    keywords: ["yacht", "charter", "sailing", "catamaran", "boat", "يخت", "إبحار"],
    affiliates: [
      { name: "Boatbookings", url: "https://www.boatbookings.com/", param: "?aid=ZENITHA", category: "charter" },
      { name: "Viravira", url: "https://www.viravira.co/", param: "?ref=zenitha", category: "charter" },
    ],
  },
  {
    keywords: ["hotel", "marina", "accommodation", "stay", "فندق", "إقامة"],
    affiliates: [
      { name: "HalalBooking", url: "https://www.halalbooking.com/", param: "?ref=zenitha", category: "hotel" },
      { name: "Booking.com", url: "https://www.booking.com/", param: "?aid=ZENITHA", category: "hotel" },
    ],
  },
  {
    keywords: ["excursion", "tour", "activity", "experience", "رحلة", "نشاط"],
    affiliates: [
      { name: "GetYourGuide", url: "https://www.getyourguide.com/", param: "?partner_id=ZENITHA", category: "activity" },
      { name: "Viator", url: "https://www.viator.com/", param: "?pid=ZENITHA", category: "activity" },
    ],
  },
  {
    keywords: ["insurance", "travel insurance", "تأمين"],
    affiliates: [
      { name: "World Nomads", url: "https://www.worldnomads.com/", param: "?affiliate=zenitha", category: "insurance" },
    ],
  },
]
```

### 3.5 Quality Gate — Yacht Additions

The existing 13-check pre-pub gate applies as-is. No yacht-specific additions needed — the gate already checks for:
- Affiliate links (check 13) — yacht booking links satisfy this
- Internal links (check 7) — yacht cross-links satisfy this
- Authenticity signals (check 12) — sailing experience markers satisfy this

---

## 4. YACHT DATA API INTEGRATIONS

### 4.1 File Structure

```
lib/yacht-sync/
├── types.ts                    — Shared TypeScript interfaces
├── normalizer.ts               — Unified schema mapping from all sources
├── deduplicator.ts             — Cross-source yacht matching
├── nausys-adapter.ts           — NauSYS REST API client
├── mmk-adapter.ts              — MMK/Booking Manager API client
├── charter-index-adapter.ts    — Charter Index GraphQL client
├── sync-orchestrator.ts        — Coordinates sync across all sources
└── availability-checker.ts     — Real-time availability queries
```

### 4.2 NauSYS Integration (P0 — Launch)

- **API:** REST API, partner authentication
- **Inventory:** 9,000 yachts, 900 fleets, 5,000 agencies
- **Cost:** Free for partners (apply for partner status)
- **Sync:** Hourly incremental (using lastModified timestamp)
- **Budget guard:** Process in batches of 100, check `Date.now() - startTime < 53_000` between batches

```typescript
// lib/yacht-sync/nausys-adapter.ts — Key interface
interface NauSYSYacht {
  yacht_id: number;
  yacht_name: string;
  yacht_type: string;        // "Sailboat" | "Catamaran" | "Motor Yacht"
  yacht_model: string;
  length_m: number;
  cabins: number;
  berths: number;
  wc: number;
  year: number;
  builder: string;
  home_base: string;
  sailing_area: string;
  price_from: number;
  price_to: number;
  currency: string;
  equipment: string[];
  images: { url: string; caption: string }[];
  last_modified: string;     // ISO 8601
}

function mapNauSYSToYacht(raw: NauSYSYacht, siteId: string): Prisma.YachtCreateInput {
  return {
    externalId: String(raw.yacht_id),
    source: "NAUSYS",
    name: raw.yacht_name,
    slug: slugify(raw.yacht_name),
    type: mapYachtType(raw.yacht_type),
    length: raw.length_m,
    cabins: raw.cabins,
    berths: raw.berths,
    bathrooms: raw.wc,
    yearBuilt: raw.year,
    builder: raw.builder,
    model: raw.yacht_model,
    homePort: raw.home_base,
    cruisingArea: raw.sailing_area,
    pricePerWeekLow: raw.price_from,
    pricePerWeekHigh: raw.price_to,
    currency: raw.currency,
    features: { equipment: raw.equipment },
    images: raw.images,
    siteId,
    syncHash: hashFields(raw),
    lastSyncedAt: new Date(),
  };
}
```

### 4.3 MMK/Booking Manager Integration (P0 — Launch)

- **API:** REST API, well-documented
- **Inventory:** 12,000 yachts, 1,300 operators, 500 destinations
- **Cost:** Contact-based (partner model)
- **Sync:** Hourly, offset 30min from NauSYS to avoid DB contention
- **Dedup:** When same yacht appears in both NauSYS and MMK, prefer NauSYS data but merge MMK-only fields (availability, operator info)

### 4.4 Charter Index Integration (P1 — Month 2)

- **API:** GraphQL
- **Inventory:** Luxury/superyacht segment
- **Cost:** $500/month
- **Sync:** Every 4 hours (luxury yachts change less frequently)
- **Value:** Enriches listing with luxury-specific data (crew bios, wine lists, spa facilities)

### 4.5 Deduplication Strategy

```typescript
// lib/yacht-sync/deduplicator.ts
function findDuplicate(incoming: YachtCreateInput): string | null {
  // Priority 1: Exact match on name + builder + year
  // Priority 2: Fuzzy match on name + similar length (±1m)
  // Priority 3: If match found, merge data (keep richest source)
  // Returns existing yacht ID if duplicate found, null if new
}
```

### 4.6 Availability Architecture

- **Search page:** Real-time API call to NauSYS/MMK for date-specific availability
- **Listing page:** Use cached data from YachtAvailability table (refreshed every 15min for popular yachts)
- **Stale data:** Show "Check Availability" button if data older than 4 hours
- **API down:** Show "Contact Us for Availability" with inquiry form link

---

## 5. PUBLIC PAGES & FRONTEND

### 5.1 Page Specifications

| Page | Route | Component | Data | Schema Markup |
|------|-------|-----------|------|---------------|
| Yacht Search | `/yachts` | Server + Client hybrid | Prisma query with filters | ItemList + Product |
| Yacht Detail | `/yachts/[slug]` | Server Component | Prisma findFirst + includes | Product + AggregateOffer + Review |
| Destinations | `/destinations` | Server Component | Prisma findMany + counts | ItemList |
| Destination Detail | `/destinations/[slug]` | Server Component | Prisma findFirst + includes | Place + TravelAction |
| AI Trip Planner | `/charter-planner` | Client Component | API calls (wizard form) | None (interactive) |
| Charter Inquiry | `/inquiry` | Client Component | Form → POST API | None |
| Itineraries | `/itineraries` | Server Component | Prisma findMany | ItemList |
| Itinerary Detail | `/itineraries/[slug]` | Server Component | Prisma findFirst | TravelAction + ItemList |

### 5.2 Yacht Search Page (`/yachts`)

- **Filters (sidebar/bottom sheet on mobile):**
  - Destination dropdown (from YachtDestination)
  - Yacht type multi-select (Sailboat, Catamaran, Motor Yacht, Gulet, Superyacht)
  - Price range slider (min/max per week)
  - Date picker (start/end)
  - Guest count (adults + children)
  - Toggles: Halal catering, Family friendly, Crew included
  - Sort: Price low→high, Price high→low, Rating, Newest

- **Results:** Grid of yacht cards (24 per page)
  - Each card: hero image, name, type badge, price range, rating stars, cabin/berth count, halal badge, CTA button

- **SEO:** `generateMetadata()` with canonical, hreflang (en-GB, ar-SA), OG image
- **Mobile:** Filters as bottom sheet, swipeable card layout

### 5.3 Yacht Detail Page (`/yachts/[slug]`)

- Photo gallery (carousel with lightbox)
- Specs table (length, cabins, berths, crew, year, builder)
- Description (bilingual tabs EN/AR)
- Features & amenities grid with icons
- Availability calendar (from YachtAvailability)
- Pricing section (seasonal rates table)
- Reviews section (from YachtReview)
- Similar yachts (same type/destination/price range, 4 cards)
- Sticky CTA on mobile: "Inquire About This Yacht" + Boatbookings affiliate link

### 5.4 AI Trip Planner (`/charter-planner`)

Step-by-step wizard:
1. Destination (dropdown or "Surprise me")
2. Dates (calendar picker + "I'm flexible" toggle)
3. Group (adults, children, composition)
4. Budget range (slider with currency selector)
5. Preferences (halal, watersports, crew, luxury level)
6. Experience level (first-time / some / experienced)
→ Submit → Loading animation → AI-generated trip plan with yacht recommendation + day-by-day itinerary + cost breakdown + booking links

---

## 6. ADMIN DASHBOARD EXTENSIONS

### 6.1 New Admin Pages (6)

| Page | Route | Purpose |
|------|-------|---------|
| Yacht Management | `/admin/yachts` | Yacht CRUD, search, filters, sync status |
| Destinations | `/admin/yacht-destinations` | Destination CRUD, yacht counts |
| Charter Inquiries | `/admin/charter-inquiries` | CRM pipeline (kanban: New→Contacted→Qualified→Broker→Booked→Lost) |
| Broker Partners | `/admin/broker-partners` | Partner directory, performance, lead assignment |
| Yacht Analytics | `/admin/yacht-analytics` | Top yachts, conversions, revenue per destination |
| Sync Control | `/admin/yacht-sync` | Per-source sync status, manual triggers, error logs |

### 6.2 Main Dashboard Modifications

Add to existing dashboard:
- **Yacht Summary Cards:** Total Yachts, Active Listings, Pending Inquiries, This Week's Bookings
- **Yacht Pipeline:** Synced → Listed → Viewed → Inquired → Booked (funnel visualization)

### 6.3 Sidebar Navigation Update

Add "Yacht Management" section to admin sidebar:
```
📊 Dashboard
📝 Content Hub
🔍 SEO Hub
⛵ Yacht Management    ← NEW SECTION
   ├── Yachts
   ├── Destinations
   ├── Inquiries (CRM)
   ├── Brokers
   ├── Analytics
   └── Sync Status
🎨 Design Hub
⚙️ Settings
```

---

## 7. MULTI-SITE CONFIGURATION

### 7.1 New Site Entry (config/sites.ts)

```typescript
{
  id: "zenitha-yachts-med",
  name: "Zenitha Yachts",
  slug: "zenitha-yachts-med",
  domain: "zenithayachts.com",          // CONFIRMED — purchased Feb 21, 2026
  locale: "en",
  direction: "ltr",
  status: "active",
  destination: "Mediterranean",
  country: "International",
  currency: "EUR",
  primaryColor: "#1B2A4A",              // Deep navy
  secondaryColor: "#C9A96E",            // Gold
  accentColor: "#2E86AB",               // Ocean blue
  systemPromptEN: "...",                // Full prompt from Section 3.1
  systemPromptAR: "...",                // Full prompt from Section 3.2
  primaryKeywordsEN: [
    "luxury yacht charter Mediterranean",
    "catamaran rental Greece",
    "private yacht charter with crew",
    "yacht charter prices",
    "halal yacht charter",
    "family yacht holiday Mediterranean"
  ],
  primaryKeywordsAR: [
    "تأجير يخوت فاخرة",
    "يخوت مع طاقم حلال",
    "رحلة إبحار البحر المتوسط"
  ],
  affiliateCategories: [
    "yacht-charter", "marina-hotel", "sailing-experience",
    "shore-excursion", "travel-insurance"
  ],
}
```

### 7.2 Additional Yacht Sites (Future)

| # | Site ID | Domain | Locale | Colors | Launch |
|---|---------|--------|--------|--------|--------|
| 2 | zenitha-yachts-gulf | zenithayachtsgulf.com | ar | Turquoise #0D9488 + pearl #F5F0EB | Month 3 |
| 3 | zenitha-yachts-greece | zenithayachtsgreece.com | en | Aegean #1E40AF + white + terracotta | Month 6 |
| 4 | zenitha-yachts-riviera | zenithayachtsriviera.com | en | Azure #0077B6 + champagne #F5E6CC | Month 6 |
| 5 | zenitha-yachts-turkey | zenithayachtsturkey.com | en | Burgundy #6B2737 + turquoise #40B5AD | Month 9 |

### 7.3 Middleware Updates

Add to `middleware.ts` domain mappings:
```typescript
"zenithayachts.com": "zenitha-yachts-med",
"www.zenithayachts.com": "zenitha-yachts-med",
"zenithayachtsgulf.com": "zenitha-yachts-gulf",
"www.zenithayachtsgulf.com": "zenitha-yachts-gulf",
// ... etc for all 5 yacht sites (10 new mappings)
```

### 7.4 Cross-Site Linking

```
Yacht Sites ↔ Yalla Riviera     (French Riviera destination overlap)
Yacht Sites ↔ Yalla Istanbul    (Turkish coast overlap)
Yacht Sites ↔ Arabaldives       (Maldives yacht + resort combo)
All Sites ↔ Yalla London        (pre/post charter London stays)
Yacht Med ↔ Yacht Greece         (sub-destination linking)
Yacht Med ↔ Yacht Riviera        (sub-destination linking)
```

---

## 8. CRON JOBS & AUTOMATION

### 8.1 New Cron Schedule

| Time (UTC) | Job | Route | Purpose |
|------------|-----|-------|---------|
| */60 min | sync-nausys | `/api/cron/sync-nausys` | NauSYS yacht data sync |
| */60 min (offset 30) | sync-mmk | `/api/cron/sync-mmk` | MMK yacht data sync |
| */4 hours | sync-charter-index | `/api/cron/sync-charter-index` | Charter Index luxury yachts |
| */15 min | yacht-availability | `/api/cron/yacht-availability-refresh` | Refresh popular yacht availability |
| 10:00 daily | inquiry-followup | `/api/cron/charter-inquiry-followup` | Auto-followup emails |

### 8.2 vercel.json Additions

```json
{
  "crons": [
    { "path": "/api/cron/sync-nausys", "schedule": "0 * * * *" },
    { "path": "/api/cron/sync-mmk", "schedule": "30 * * * *" },
    { "path": "/api/cron/sync-charter-index", "schedule": "0 */4 * * *" },
    { "path": "/api/cron/yacht-availability-refresh", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/charter-inquiry-followup", "schedule": "0 10 * * *" }
  ]
}
```

### 8.3 Budget Guards (All Crons)

Every yacht cron follows the existing pattern:
```typescript
const BUDGET_MS = 53_000;
const startTime = Date.now();

function hasBudget(): boolean {
  return Date.now() - startTime < BUDGET_MS;
}

// Process in batches, check budget between each
for (const batch of batches) {
  if (!hasBudget()) {
    await logPartialCompletion(processed, total);
    break;
  }
  await processBatch(batch);
}
```

### 8.4 Cron Chain Map

```
sync-nausys (hourly)           → Yacht table (upsert)
sync-mmk (hourly, +30min)     → Yacht table (upsert)
sync-charter-index (4h)       → Yacht table (upsert, luxury segment)
                                    ↓
yacht-availability-refresh     → YachtAvailability table
  (15min, popular yachts only)      ↓
                               → Search API (real-time)
                               → Detail page (cached)

yacht-content-generate (daily) → TopicProposal → ArticleDraft → BlogPost
  (reuses existing pipeline)        ↓
                               → Affiliate injection (daily 9am)
                               → SEO submission (3x daily)

inquiry-followup (daily 10am)  → CharterInquiry status updates
                               → Email notifications
                               → Admin dashboard alerts

All outputs → CronJobLog → Admin Dashboard
```

---

## 9. SECURITY & COMPLIANCE

### 9.1 Auth Requirements

| Route Pattern | Auth | Rate Limit |
|---------------|------|------------|
| GET /api/yachts/* | Public | 60/min per IP |
| GET /api/destinations/* | Public | 60/min per IP |
| POST /api/charter-inquiry | Public + CSRF | 5/hr per IP |
| POST /api/ai/yacht-matchmaker | Public | 10/hr per IP |
| POST /api/ai/trip-planner | Public | 5/hr per IP |
| /api/admin/yacht* | withAdminAuth | N/A |
| /api/cron/sync-* | CRON_SECRET | N/A |

### 9.2 Input Validation

All public endpoints use Zod schemas:
- Charter inquiry: sanitize all text fields with `sanitizeHtml()` before DB write
- Review submission: sanitize content, validate rating (1-5)
- Search params: validate enums, clamp numeric ranges

### 9.3 Data Protection

- CharterInquiry contains PII (email, phone, WhatsApp) — encrypt at rest
- GDPR: data deletion endpoint for inquiry forms
- No partner API keys in any response
- No credential logging

### 9.4 XSS Prevention

- All yacht descriptions rendered with `sanitizeHtml()` (data comes from external APIs)
- All user-submitted reviews sanitized before display
- No `dangerouslySetInnerHTML` without sanitization

---

## 10. TESTING & VALIDATION

### 10.1 New Smoke Tests (22 tests)

Add to `scripts/smoke-test.ts`:

**Yacht Pipeline (12):**
1. Yacht model exists in Prisma schema
2. YachtDestination model exists
3. CharterInquiry model exists
4. YachtAvailability model exists
5. YachtReview model exists
6. CharterItinerary model exists
7. BrokerPartner model exists
8. YachtSyncLog model exists
9. sync-nausys cron has budget guard (53s)
10. sync-mmk cron has budget guard
11. yacht-availability-refresh has budget guard
12. No hardcoded yacht URLs

**Yacht Security (6):**
13. All yacht admin routes have withAdminAuth
14. Charter inquiry has CSRF protection
15. AI matchmaker has rate limiting
16. Review content is sanitized
17. Sync crons follow CRON_SECRET pattern
18. No PII in error responses

**Yacht Multi-Site (4):**
19. Yacht queries scoped by siteId
20. Destination queries scoped by siteId
21. Inquiry queries scoped by siteId
22. Sync logs scoped by siteId

**Target: 100/100 (existing 78 + new 22)**

### 10.2 Integration Tests (Playwright)

1. Search → filter → view yacht → submit inquiry → confirmation page
2. Destination browse → yacht list → detail → booking link click tracked
3. AI trip planner wizard → complete → results display
4. Admin: view sync status → trigger manual sync → verify log
5. Admin: view inquiry → change status → assign broker

---

## 11. GCC & ARAB MARKET TECHNICAL REQUIREMENTS

### 11.1 Halal & Cultural Features

| Feature | Implementation |
|---------|---------------|
| Halal catering filter | `halalCateringAvailable` Boolean on Yacht + filter toggle on search |
| Family privacy | `familyFriendly` Boolean + privacy features in JSON |
| Ramadan content | Seasonal topic rotation in weekly-topics cron |
| WhatsApp inquiries | Click-to-WhatsApp deep link: `https://wa.me/NUMBER?text=...` |
| Prayer times | External API for coordinates → display in itinerary planner |
| Arabic content | Full RTL with `direction: rtl`, `_ar` fields on all content models |

### 11.2 Currency Display

Multi-currency: EUR (default), USD, GBP, AED, SAR
- Use `Intl.NumberFormat` with locale-aware formatting
- Arabic numerals: `new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'AED' })`

---

## 12. ENVIRONMENT VARIABLES

### Google Platform Credentials (Per-Site — See Section 0.4)

The platform uses a naming convention for per-site Google credentials. One service account is shared; only the property IDs differ.

| Variable | Purpose | Example Value |
|----------|---------|---------------|
| `GSC_SITE_URL_ZENITHA_YACHTS_MED` | GSC property for yacht site | `sc-domain:zenithayachts.com` |
| `GA4_PROPERTY_ID_ZENITHA_YACHTS_MED` | GA4 property ID for yacht site | `123456789` |
| `GA4_MEASUREMENT_ID_ZENITHA_YACHTS_MED` | GA4 measurement ID (browser tracking) | `G-XXXXXXX` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Client-side GA4 (shared or overridden per deployment) | `G-XXXXXXX` |

**Shared credentials (already configured, no action needed):**
- `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL` / `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY` — same service account for all sites
- `GOOGLE_ANALYTICS_CLIENT_EMAIL` / `GOOGLE_ANALYTICS_PRIVATE_KEY` — same service account for all sites
- `INDEXNOW_KEY` — shared across all sites (verification file served dynamically)

**Lookup logic** (`config/sites.ts:getSiteSeoConfig()`):
```
Per-site env var  →  Global env var  →  Intelligent default
GSC_SITE_URL_ZENITHA_YACHTS_MED  →  GSC_SITE_URL  →  sc-domain:zenithayachts.com
```

### Must Have (Launch Blockers)

| Variable | Purpose |
|----------|---------|
| `GSC_SITE_URL_ZENITHA_YACHTS_MED` | Google Search Console property URL |
| `GA4_PROPERTY_ID_ZENITHA_YACHTS_MED` | Google Analytics 4 property ID |
| `GA4_MEASUREMENT_ID_ZENITHA_YACHTS_MED` | GA4 measurement ID for browser tracking |
| `NAUSYS_API_KEY` | NauSYS partner API access |
| `NAUSYS_PARTNER_ID` | NauSYS partner identifier |
| `MMK_API_KEY` | MMK Booking Manager API |
| `MMK_PARTNER_ID` | MMK partner identifier |
| `BOATBOOKINGS_AFFILIATE_ID` | Boatbookings 20% commission tracking |

### Should Have (Revenue Features)

| Variable | Purpose |
|----------|---------|
| `CHARTER_INDEX_API_KEY` | Charter Index GraphQL ($500/mo) |
| `WHATSAPP_BUSINESS_TOKEN` | WhatsApp Business API for GCC inquiries |
| `SENDGRID_API_KEY` | Inquiry confirmation + followup emails |
| `HALALBOOKING_AFFILIATE_ID` | HalalBooking hotel affiliate |
| `GETYOURGUIDE_AFFILIATE_ID` | Shore excursion affiliate |

### Optional (Enhancement)

| Variable | Purpose |
|----------|---------|
| `GOOGLE_MAPS_KEY` | Map views on destination pages |
| `CURRENCY_API_KEY` | Real-time exchange rates |
| `UNSPLASH_API_KEY` | Stock yacht imagery (already exists) |

---

## 13. PHASED IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Weeks 0-4) — MVP Launch

**Week 0: Domain & Google Setup (Khaled — from iPhone, 30 min total)**
- [x] Purchase domain `zenithayachts.com` — **DONE** (Cloudflare, Feb 21 2026)
- [ ] Point DNS to Vercel in Cloudflare (CNAME `www` → `cname.vercel-dns.com`, proxy OFF)
- [ ] Add root A record `@` → `76.76.21.21` in Cloudflare DNS
- [ ] Add domain as GSC property (domain verification via DNS TXT record in Cloudflare)
- [ ] Create GA4 property + web data stream, copy Measurement ID + Property ID
- [ ] Grant existing service account access to both GA4 and GSC
- [ ] Share GA4 Property ID and GA4 Measurement ID with Claude Code
- [ ] Apply for NauSYS partner access (can take 1-2 weeks — start early)
- [ ] Apply for Boatbookings affiliate account (instant-1 week)

**Week 1: Schema & Config (Claude Code — once domain is confirmed)**
- Add domain to Vercel project
- Add 3 per-site env vars to Vercel (GSC_SITE_URL, GA4_PROPERTY_ID, GA4_MEASUREMENT_ID)
- Add 8 Prisma models + run migration
- Configure yacht site entry in config/sites.ts (with domain)
- Add destination theme to config/destination-themes.ts
- Update middleware.ts with yacht domain mappings
- Create lib/yacht-sync/ directory structure
- Fix analytics cron to loop all active sites (known gap)

**Week 2: API & Sync**
- Build NauSYS adapter + sync cron
- Build normalizer + deduplicator
- Build yacht search API (GET /api/yachts)
- Build yacht detail API (GET /api/yachts/[id])
- Build destination API routes
- Build charter inquiry API (POST)
- Build admin yacht management page
- Build admin sync status page

**Week 3: Frontend**
- Build /yachts search page with filters
- Build /yachts/[slug] detail page
- Build /destinations + /destinations/[slug]
- Build /inquiry charter form
- Mobile optimization (bottom sheet filters, sticky CTA)

**Week 4: Content & Launch**
- Configure yacht content system prompts
- Extend affiliate injection for yacht partners
- Generate first batch of yacht articles (10+)
- SEO: sitemap, robots, schema markup, generateMetadata
- Admin dashboard yacht cards
- Deploy to Vercel, configure domains
- **LAUNCH**

### Phase 2: Intelligence (Weeks 5-8)
- MMK API integration (12K more yachts)
- AI yacht matchmaker (chat interface)
- AI trip planner (wizard + itinerary generation)
- Arabic content activation (RTL yacht pages)
- Review system (submit + display)
- Pre-built itinerary templates (10+)
- CRM pipeline on admin dashboard (kanban)

### Phase 3: Scale (Weeks 9-16)
- Charter Index API integration ($500/mo luxury segment)
- Site #2: Zenitha Yachts Gulf (Arabian Gulf + Red Sea)
- Lead generation: qualified inquiry routing to brokers
- Advanced analytics per yacht/destination/affiliate
- Sites #3-4: Greece + Riviera
- Sponsored content system (charter company profiles)

### Phase 4: Optimize (Weeks 17-24)
- A/B test yacht page layouts and CTA placement
- WhatsApp Business integration (automated responses)
- Site #5: Turkey
- Concierge premium tier (high-touch matching, $50K+ charters)
- Performance tuning (Core Web Vitals)

### Phase Verification Checklist (After Each Phase)

- [ ] All new Prisma models have `siteId`
- [ ] All admin routes have `withAdminAuth`
- [ ] All cron routes have budget guards (53s)
- [ ] All cron routes follow CRON_SECRET pattern
- [ ] All public endpoints validate input (Zod)
- [ ] All catch blocks log with context (no empty catches)
- [ ] All yacht queries scoped by siteId
- [ ] No hardcoded URLs (use `getBaseUrl()`/`getSiteDomain()`)
- [ ] No `Math.random()` for IDs or metrics
- [ ] No `dangerouslySetInnerHTML` without `sanitizeHtml()`
- [ ] Smoke tests pass (78 existing + 22 yacht = 100)
- [ ] TypeScript: ZERO errors

---

## 14. FILE DIRECTORY — ALL NEW FILES

```
lib/yacht-sync/                         (8 files)
├── types.ts
├── normalizer.ts
├── deduplicator.ts
├── nausys-adapter.ts
├── mmk-adapter.ts
├── charter-index-adapter.ts
├── sync-orchestrator.ts
└── availability-checker.ts

app/api/yachts/                         (3 files)
├── route.ts
├── [id]/route.ts
└── recommend/route.ts

app/api/destinations/                   (2 files)
├── route.ts
└── [slug]/route.ts

app/api/charter-inquiry/route.ts        (1 file)

app/api/ai/                             (3 files)
├── yacht-matchmaker/route.ts
├── trip-planner/route.ts
└── yacht-content/route.ts

app/api/admin/                          (8 files)
├── yachts/route.ts
├── yacht-destinations/route.ts
├── charter-inquiries/route.ts
├── broker-partners/route.ts
├── yacht-analytics/route.ts
├── yacht-sync-status/route.ts
├── yacht-sync/trigger/route.ts
└── charter-itineraries/route.ts

app/api/cron/                           (5 files)
├── sync-nausys/route.ts
├── sync-mmk/route.ts
├── sync-charter-index/route.ts
├── yacht-availability-refresh/route.ts
└── charter-inquiry-followup/route.ts

app/(public)/yachts/                    (3 files)
├── page.tsx
├── [slug]/page.tsx
└── layout.tsx

app/(public)/destinations/              (3 files)
├── page.tsx
├── [slug]/page.tsx
└── layout.tsx

app/(public)/charter-planner/           (2 files)
├── page.tsx
└── layout.tsx

app/(public)/inquiry/                   (2 files)
├── page.tsx
└── layout.tsx

app/(public)/itineraries/               (3 files)
├── page.tsx
├── [slug]/page.tsx
└── layout.tsx

app/admin/                              (6 files)
├── yachts/page.tsx
├── yacht-destinations/page.tsx
├── charter-inquiries/page.tsx
├── broker-partners/page.tsx
├── yacht-analytics/page.tsx
└── yacht-sync/page.tsx

config/sites/                           (1 file)
└── zenitha-yachts-med.audit.json

test/yacht/                             (4 files)
├── yacht-sync.spec.ts
├── yacht-api.spec.ts
├── yacht-security.spec.ts
└── yacht-multisite.spec.ts
```

**Total: ~54 new files**

---

## 15. COST-BENEFIT SUMMARY

| Investment | Monthly Cost | Revenue Potential | Break-Even |
|-----------|-------------|-------------------|------------|
| Vercel Pro | $0 (existing) | — | — |
| Supabase | $0 (shared DB) | — | — |
| Domains (5) | ~$5/mo | — | — |
| NauSYS API | $0 (partner) | 9,000 yacht listings | Immediate |
| MMK API | TBD | 12,000 yacht listings | Month 1 |
| Charter Index | $500/mo (Month 2+) | Luxury segment | 1 booking covers it |
| AI API costs | $50-150/mo | Content + matchmaker | — |
| **Total Month 1** | **~$55-200** | | **1 booking** |
| **Total Month 3+** | **~$555-850** | | **2-3 bookings** |

**Key insight:** Average yacht charter = $6,000-30,000. At 20% Boatbookings commission (their commission, not ours — we get ~3% of charter value), one booking = $180-900. Through direct broker deals: $1,500-3,000 per booking. Break-even requires 1-3 bookings per month against a sub-$1,000 cost base.

---

## 16. SUCCESS METRICS

### 30-Day KPIs

| Metric | Target | Where to Check |
|--------|--------|---------------|
| Yacht listings in DB | 1,000+ | /admin/yacht-sync |
| Published yacht articles | 40+ | /admin/content |
| Indexed pages | 30+ | /admin/content?tab=indexing |
| Destinations covered | 10+ | /admin/yacht-destinations |
| Active affiliate accounts | 4+ | Manual verification |
| Charter inquiries | 10+ | /admin/charter-inquiries |
| LCP | <2.5s | Lighthouse |

### 90-Day KPIs

| Metric | Target |
|--------|--------|
| Organic sessions/month | 2,000+ |
| Arabic organic sessions | 500+ |
| Published articles (total) | 150+ |
| Yacht listings | 5,000+ (NauSYS + MMK) |
| Charter bookings | 5+ |
| Affiliate revenue | $1,000+/month |
| Inquiries/month | 50+ |

### 12-Month KPIs

| Metric | Target |
|--------|--------|
| Organic sessions/month | 20,000+ |
| Active sites | 3+ |
| Yacht listings | 10,000+ |
| Monthly revenue | $5,000-15,000 |
| Bookings/month | 15+ |
| Broker partnerships | 5+ |

---

## 17. KNOWN PLATFORM GAPS TO FIX BEFORE YACHT LAUNCH

These exist in the current Yalla London platform and must be resolved before the yacht site goes live. They are not yacht-specific but affect all sites.

| Gap | Impact | Fix Effort | Blocking? |
|-----|--------|------------|-----------|
| Analytics cron syncs default site only | No GA4/GSC data for yacht site on dashboard | 1 hour — add `getActiveSiteIds()` loop | Yes |
| `AnalyticsSnapshot` table missing `site_id` | Can't separate traffic data per site | Migration + 1 query update | Yes |
| Admin analytics API returns global config only | Dashboard shows wrong credentials status | 2 hours — add siteId param | No (cosmetic) |
| Per-site OG images don't exist yet | Social shares look broken | Need 1 branded image per site | No (soft launch ok) |
| Author profiles are generic "Editorial" | Hurts E-E-A-T ranking signal | Create yacht expert persona | No (can add post-launch) |
| No cookie consent banner | EU legal requirement | Half-day implementation | No (UK/GCC traffic first) |
| 13+ dead admin buttons | Confusing UX for Khaled | Wire handlers as encountered | No |

**All other multi-site infrastructure is production-ready** — content pipeline, SEO engine, affiliate injection, cron jobs, middleware routing, brand themes, slug dedup, IndexNow per-site submission.

---

## 18. IMPLEMENTATION STATUS (April 4, 2026)

**Status: BUILT — PENDING DEPLOY**

The entire Zenitha Yachts platform has been built as the second site on the multi-tenant engine. 68+ files created across 6 build phases. Zero TypeScript errors.

### What Was Built

**Database (Phase 0):**
- All 8 Prisma models implemented: `Yacht`, `YachtDestination`, `CharterItinerary`, `CharterInquiry`, `BrokerPartner`, `YachtAvailability`, `YachtAmenity`, `YachtImage`
- 8 enums: `YachtType`, `YachtSource`, `InquiryStatus`, `InquiryPriority`, `ItineraryDifficulty`, `BrokerTier`, `AvailabilityType`, `AmenityCategory`
- Migration SQL created: `prisma/migrations/20260221_add_yacht_charter_models/`

**Site Shell + Core Pages (Phase 1):**
- `components/site-shell.tsx` — hermetic site separation (detects siteId, renders ZenithaHeader/Footer vs DynamicHeader/Footer)
- `components/zenitha/zenitha-header.tsx` — responsive nav with mobile hamburger
- `components/zenitha/zenitha-footer.tsx` — multi-column footer
- `components/zenitha/zenitha-homepage.tsx` — hero, featured yachts, destinations, trust signals
- `app/zenitha-tokens.css` — full CSS custom property design system

**Public Pages (14 total):**
- Homepage, Yacht Search (filters, grid/list, pagination), Yacht Detail (gallery, specs, pricing, inquiry CTA, Product JSON-LD), Destinations Hub, Destination Detail (Place JSON-LD), Itineraries Hub, Itinerary Detail (Trip JSON-LD), Charter Planner (AI multi-step), Inquiry Form (multi-step with validation), FAQ (FAQPage JSON-LD), How It Works, About, Contact

**Admin Dashboard (Phase 3):**
- 8 admin pages: Fleet Inventory, Add Yacht, Inquiries CRM, Destinations, Itineraries, Brokers, Analytics, Sync & Imports
- 7+ API routes: all with `withAdminAuth`, siteId scoping, proper error handling
- Public API routes for yacht search, detail, destinations, itineraries, recommend, inquiry

**SEO/AIO Compliance (Phase 4):**
- All `[slug]` pages have `generateMetadata()` with canonical, hreflang, Open Graph, Twitter cards
- All layout pages have BreadcrumbList structured data
- Product, Place, Trip, FAQPage JSON-LD on appropriate pages
- Sitemap updated with yacht, destination, itinerary URLs
- `llms.txt` updated with Zenitha Yachts content
- IndexNow integration for yacht pages

**Dashboard Integration (Phase 5):**
- Admin sidebar updated with "Yacht Management" section (8 items)
- CommandCenter updated with YachtPlatformCard
- test-connections updated with 10 yacht API test routes

### Deployment Requirements

To deploy Zenitha Yachts:
1. Run `npx prisma migrate deploy` on Supabase for 8 new models
2. Add Vercel env vars: `GA4_MEASUREMENT_ID_ZENITHA_YACHTS_MED`, `GSC_SITE_URL_ZENITHA_YACHTS_MED`, `GA4_PROPERTY_ID_ZENITHA_YACHTS_MED`
3. Point DNS for `zenithayachts.com` to Vercel (CNAME to `cname.vercel-dns.com`, proxy OFF in Cloudflare)
4. Add domain in Vercel project settings
5. Change site status to `"active"` in `config/sites.ts`

### Multi-Site Independence

The multi-site independence work (documented in `docs/plans/MULTI-SITE-INDEPENDENCE-PLAN.md`) ensures Zenitha Yachts operates independently from Yalla London:
- Per-site feature flags allow disabling crons for yacht site only (Phase 1 — COMPLETED)
- Per-site reservoir caps prevent yacht content from starving London pipeline (Phase 2 — COMPLETED)
- Per-site AI budget isolation prevents cascade failures across sites (Phase 3 — COMPLETED)
- Per-site dashboard & alerts: cockpit, departures, cycle health, CEO Inbox all scoped by siteId (Phase 4 — ~80% complete, aggregated report remaining)
- All DB queries scoped by siteId — no cross-site data leakage
- SiteShell component provides hermetic header/footer separation
- Yacht-specific pages excluded from content pipeline TopicProposal generation (`trends-monitor` skips `zenitha-yachts-med`)

### Known Platform Gaps Resolved Since Plan Creation

Many gaps listed in Section 17 have been resolved:
- Per-site OG images: **DONE** — dynamic OG at `/api/og/route.tsx`
- Author profiles: **DONE** — named author rotation via `lib/content-pipeline/author-rotation.ts`
- Cookie consent: **DONE** — bilingual EN/AR, 4 categories
- Analytics cron multi-site: **DONE** — all crons loop `getActiveSiteIds()`
- Pre-publication gate: expanded from 13 to 16 checks

---

*Technical Development Plan prepared February 21, 2026*
*Updated: February 21, 2026 — Added domain/Google setup process, per-site GA4/GSC credential patterns, platform bug fixes, analytics gap documentation*
*Updated: April 4, 2026 — Added Section 18 implementation status, deployment requirements, multi-site independence context*
*Platform: Zenitha Yachts — Zenitha.Luxury LLC*
*Stack: Next.js 14 + Prisma + Supabase + Vercel Pro (reusing Yalla London infrastructure)*
