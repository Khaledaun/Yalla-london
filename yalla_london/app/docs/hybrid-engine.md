# Yalla Cockpit — Hybrid Commerce Engine

> Architecture, operations, and per-tenant configuration guide.
> Last updated: February 26, 2026

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Model](#2-data-model)
3. [Product Ontology](#3-product-ontology)
4. [7 Modules](#4-seven-modules)
5. [TrendRun Weekly Engine](#5-trendrun-weekly-engine)
6. [Etsy API Integration](#6-etsy-api-integration)
7. [CSV Import System](#7-csv-import-system)
8. [Payout Profile](#8-payout-profile)
9. [API Routes](#9-api-routes)
10. [Cron Jobs](#10-cron-jobs)
11. [Feature Flags](#11-feature-flags)
12. [Per-Tenant Configuration](#12-per-tenant-configuration)
13. [Operator Playbooks](#13-operator-playbooks)
14. [Compliance Guardrails](#14-compliance-guardrails)
15. [Alerts System](#15-alerts-system)
16. [Dashboards](#16-dashboards)

---

## 1. Architecture Overview

The Hybrid Commerce Engine is a multi-tenant digital product pipeline built into the Yalla platform. It combines:

- **Etsy as acquisition channel** — high-visibility marketplace for product discovery
- **Website shop as profit engine** — direct sales with zero marketplace fees
- **AI-powered trend research** — weekly niche discovery and product ideation
- **Automated pipeline** — from ideation → design → listing → launch → monitoring

### Key Principles

1. **Multi-tenant isolation**: Every record has `siteId` or `tenantId`. No cross-tenant data leakage.
2. **Operator approval gates**: No auto-publish to Etsy. Human reviews every listing before it goes live.
3. **Secure secrets**: API keys in encrypted `Credential` model, never in git.
4. **No ToS-violating scraping**: Only official APIs or manual exports.
5. **Budget-guarded crons**: 53s budget with 7s buffer (Vercel Pro 60s limit).

### System Flow

```
TrendRun (Weekly AI Research)
    ↓
NicheOpportunity[] (scored 0-100)
    ↓
ProductBrief (awaits operator approval)
    ↓
EtsyListingDraft (SEO-optimized title/tags/description)
    ↓
[APPROVAL GATE — operator must approve]
    ↓
Etsy API → Published Listing
    ↓
CommerceCampaign (30-day marketing plan)
    ↓
CommerceOrder / Purchase tracking
    ↓
Payout → Mercury bank account
```

---

## 2. Data Model

### Core Commerce Models (Prisma)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **Tenant** | Website/tenant config | domain, siteId, locale, currency, destination |
| **TenantIntegration** | Per-tenant API integrations | tenantId, integrationType, isEnabled, credentialIds |
| **DistributionAsset** | Owned media channels | assetType, name, url, size, growthRate |
| **CommerceSettings** | Per-tenant commerce config | etsyEnabled, autoPublishToEtsy, pricingBandsJson |
| **TrendRun** | Weekly AI research run | nichesJson, trendsJson, opportunitiesJson, cost |
| **ProductBrief** | Product concept document | title, productType, tier, ontologyCategory, status |
| **EtsyListingDraft** | Staging area for Etsy listings | title, titleVariants, tags, description, price |
| **EtsyShopConfig** | OAuth2 connection state | shopId, accessTokenCredentialId, connectionStatus |
| **DigitalProduct** | Master product record | name, slug, price, sku, version, file_url |
| **ProductPack** | Bundle of products | productIds, price, compare_price |
| **CommerceCampaign** | 30-day marketing plan | tasksJson, couponCode, utmCampaign |
| **CommerceAlert** | Notifications | type, severity, title, message |
| **CommerceOrder** | Unified order record | channel, grossAmount, platformFees, netAmount |
| **Payout** | Bank payout tracking | source, grossAmount, fees, netAmount, status |
| **PayoutProfileTemplate** | Banking configuration | legalEntityName, domesticRoutingAba, intlSwiftBic |
| **TrendSignal** | Individual trend data points | keyword, source, metric, value, confidence |
| **KeywordCluster** | Grouped keywords | primaryKeyword, secondaryKeywords, intent |
| **CommerceTask** | Ops checklist items | title, category, priority, status, dependsOn |
| **Purchase** | Website/Etsy transactions | amount, channel, gross_amount, platform_fees, net_amount |

### Enums

- **ProductType**: `TEMPLATE`, `PDF_GUIDE`, `EBOOK`, `WALL_ART`, `PLANNER`, `SOCIAL_TEMPLATE`, `PRESET`, `JOURNAL`, `STICKER`, `WORKSHEET`, `SEASONAL_GUIDE`

---

## 3. Product Ontology

### Tier 1 — Highest Profit / Best Alignment

| Category | Price Range | Channels | Notes |
|----------|-----------|----------|-------|
| Itinerary Templates | $4.99–$19.99 | Website + Etsy | Editable in Canva |
| Travel Guide eBooks | $7.99–$29.99 | Website + Etsy | 50–100 page flagships |
| Agent Tools Bundle | $19.99–$49.99 | Website only (B2B) | Proposals, intake forms, social kits |

### Tier 2 — Complementary

| Category | Price Range | Channels |
|----------|-----------|----------|
| Vintage Travel Posters | $2.99–$14.99 | Website + Etsy |
| Trip Planner Bundles | $4.99–$14.99 | Website + Etsy |
| Social Media Templates | $2.99–$9.99 | Website + Etsy |

### Tier 3 — Seasonal / Niche

| Category | Price Range | Channels |
|----------|-----------|----------|
| Lightroom Presets | $2.99–$9.99 | Website + Etsy |
| Travel Journal Templates | $2.99–$7.99 | Website + Etsy |
| GoodNotes Stickers | $1.99–$4.99 | Website + Etsy |
| Educational Worksheets | $2.99–$9.99 | Website + Etsy |
| Seasonal Event Guides | $4.99–$14.99 | Website + Etsy |

Each category maps to an Etsy taxonomy path (e.g., "Paper & Party Supplies > Planners").

---

## 4. Seven Modules

### Module 1: Niche Goldmine Finder

**Tab**: `?tab=trends` | **API**: `/api/admin/commerce/trends`
**Lib**: `lib/commerce/trend-engine.ts`

- Weekly identifies 5+ low-competition, high-demand micro-niches per tenant
- Output: niches + 3 product ideas each + personas + reasons + keywords
- Scores opportunities 0–100 using 7-dimension algorithm
- Persists to `TrendRun` + `ProductBrief` records

### Module 2: Product Ideation & Validation

**Tab**: `?tab=briefs` | **API**: `/api/admin/commerce/briefs`
**Libs**: `trend-engine.ts`, `bulk-creator.ts`, `quick-create.ts`

- Generates ProductBrief records from scored opportunities
- Theme-based bulk ideation (e.g., "London neighborhoods" → 10 briefs)
- Quick Create: one-line product concept → AI brief → listing draft
- Approval workflow: draft → approved → in_production → listed

### Module 3: Branding & Store Identity Builder

**Tab**: `?tab=branding` | **API**: `/api/admin/commerce/etsy`
**Lib**: `lib/design/brand-provider.ts`

- Shop identity per tenant: palette, typography, voice, about copy, shop policies
- Brand asset specs (banner 760x100, icon 500x500, listing 2000x2000)
- Canva brief generation
- Per-site brand tokens from `config/sites.ts` + `destination-themes.ts`

### Module 4: Winning Product Design Assistant

**Tab**: `?tab=design` | **APIs**: `generate-product`, `mockup-images`
**Libs**: `product-file-generator.ts`, `image-generator.ts`

- AI-generates PDF product files (itineraries, guides, planners)
- AI-generates mockup image prompts for Etsy listing photos
- Branded HTML templates with per-site fonts/colors
- SVG cover art generation
- Puppeteer PDF rendering (via `@sparticuz/chromium` for Vercel)

### Module 5: Etsy SEO & Listing Optimizer

**Tab**: `?tab=etsy` | **API**: `/api/admin/commerce/listings`
**Libs**: `listing-generator.ts`, `etsy-api.ts`

- Generates listing pack: title variants, 13 tags, structured description
- Validates against Etsy limits (140-char title, 13 tags, 65K description)
- 10-image preview storyboard via mockup generator
- Export JSON/CSV
- Stores as `EtsyListingDraft` → publish with approval gate

### Module 6: Marketing & Sales Machine (30-day Launch)

**Tab**: `?tab=campaigns` | **API**: `/api/admin/commerce/campaigns`
**Lib**: `campaign-generator.ts`

- AI-generates 30-day launch plan with daily tasks
- 5 channels: Pinterest, Instagram, email, blog, Etsy
- UTM tracking on every link
- Coupon codes: YALLA-{SITE}-{RANDOM6}
- Campaign calendar with task completion tracking

### Module 7: Growth Blueprint ($5k/mo Mode)

**Tab**: `?tab=growth` | **API**: `/api/admin/commerce/stats`

- Unlocked by KPI thresholds: ≥50 sales/month OR ≥$1,000 revenue
- Feature-flagged via `CommerceSettings.growthBlueprintUnlocked`
- Complementary product roadmap
- Optional POD track (mugs, totes, prints)
- Automation workflows and SOPs

---

## 5. TrendRun Weekly Engine

### Schedule

- **Cron**: `commerce-trends` — Monday 4:30 UTC (`30 4 * * 1`)
- **Manual trigger**: POST `/api/admin/commerce/trends` with `{ action: "run" }`

### Pipeline

1. **Discover niches** via AI (Grok → Claude → OpenAI → Gemini fallback)
2. **Score opportunities** with 7-dimension algorithm:
   - Buyer Intent: 0.20 weight
   - Competition Gap: 0.20 weight
   - Authority Fit: 0.15 weight
   - Bundle Potential: 0.15 weight
   - Trend Velocity: 0.10 weight
   - Production Ease: 0.10 weight
   - Seasonal Timing: 0.10 weight
3. **Generate ProductBriefs** for top-5 scoring ≥50
4. **Create TrendRun record** with all research data
5. **Auto-generate listing packs** for top-2 opportunities

### Global Rollup

**API**: `/api/admin/commerce/global-rollup`

- Aggregates across all active tenants
- Identifies cross-tenant winning patterns
- Proposes "templated cloning" to other tenants with localization
- Available when 2+ sites have TrendRun data

---

## 6. Etsy API Integration

### OAuth2 PKCE Flow

**Lib**: `lib/commerce/etsy-api.ts` (918 lines)

- RFC 7636 PKCE (code_verifier + code_challenge with S256)
- Scopes: `listings_r`, `listings_w`, `listings_d`, `shops_r`, `shops_w`, `transactions_r`, `profile_r`
- Token storage: encrypted via `Credential` model
- Auto-refresh on expiry

### Available Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| Create Listing | POST `/v3/application/shops/{shop_id}/listings` | Create draft listing |
| Update Listing | PATCH | Update title/description/price/tags |
| Activate Listing | POST state transition | Set ACTIVE/INACTIVE |
| Upload Image | POST multipart | Preview images (up to 10) |
| Upload Digital File | POST multipart | Product files (max 20MB) |
| Get Shop by Name | GET `/v3/application/shops` | Resolve shop_id |
| Get Listings | GET `/v3/application/shops/{shop_id}/listings` | Sync listing data |
| Get Transactions | GET `/v3/application/shops/{shop_id}/transactions` | Pull orders |

### What Is NOT Available (Requires Fallback)

- **Shop stats** (views, favorites, conversion rate) — No API endpoint. Use CSV import.
- **Analytics** — No stats API. Manual "Weekly Snapshot" or CSV import.
- **Batch operations** — Must iterate one-by-one with rate limiting.

### Environment Variables

```
ETSY_API_KEY        — Etsy app "key string" (OAuth2 client_id)
ETSY_SHARED_SECRET  — Etsy app "shared secret"
ETSY_SHOP_ID        — Numeric shop ID (or shop name for resolution)
ETSY_REDIRECT_URI   — OAuth callback URL (defaults to {NEXTAUTH_URL}/api/auth/etsy/callback)
```

---

## 7. CSV Import System

**Lib**: `lib/commerce/etsy-csv-import.ts` | **API**: `/api/admin/commerce/csv-import`

### Etsy Orders CSV

Expected columns: Sale Date, Item Name, Buyer, Quantity, Price, Discount Amount, Shipping, Sales Tax, Order Total, Status, Transaction ID, Listing ID

- Creates `Purchase` records with `channel: "etsy"`
- Deduplication by Transaction ID
- Matches listing ID → DigitalProduct via EtsyListingDraft bridge
- Updates `EtsyShopConfig.lastCsvImportAt`

### Etsy Stats CSV

Expected columns: Date, Views, Visits, Orders, Revenue, Conversion Rate

- Aggregates by date range
- Stores in `EtsyShopConfig.statsJson`

### CSV Parser

Hand-written RFC 4180 parser (no external dependencies). Handles:
- Quoted fields with embedded commas
- Missing optional columns
- Empty rows

---

## 8. Payout Profile

### Mercury — Zenitha.Luxury LLC

| Field | Value |
|-------|-------|
| **Legal Entity** | Zenitha.Luxury LLC |
| **Entity Type** | Delaware LLC |
| **Address** | 16192 Coastal Highway, Lewes, DE 19958, USA |

#### US ACH / Domestic

| Field | Value |
|-------|-------|
| Bank Name | Choice Financial Group |
| Routing (ABA) | 091311229 |
| Account Type | Checking |
| Account | ****9197 |
| Bank Address | 4501 23rd Avenue S, Fargo, ND 58104 |

#### International Wire (USD)

| Field | Value |
|-------|-------|
| SWIFT/BIC | CHFGUS44021 |
| ABA | 091311229 |
| Account | ****9197 |

#### International Wire (Non-USD via Intermediary)

| Field | Value |
|-------|-------|
| Intermediary | JPMorgan Chase Bank N.A., New York |
| SWIFT | CHASUS33XXX |
| ABA | 021000021 |
| Beneficiary Account | 707567692 |
| Wire Reference | /FFC/202503669197/Zenitha.Luxury LLC/Lewes, USA |

### Validation

The Settings tab includes a payout profile validation panel that checks all fields against this template and highlights mismatches. An Etsy onboarding checklist tracks 10 setup steps.

---

## 9. API Routes

All routes under `/api/admin/commerce/` require `requireAdmin` authentication.

| Route | Methods | Purpose |
|-------|---------|---------|
| `/trends` | GET, POST | TrendRun history + manual trigger |
| `/briefs` | GET, POST, PUT | ProductBrief CRUD + approve/reject |
| `/listings` | GET, POST, PUT, DELETE | EtsyListingDraft CRUD + publish |
| `/campaigns` | GET, POST, PUT | CommerceCampaign CRUD |
| `/alerts` | GET, PUT | CommerceAlert list + read/unread |
| `/stats` | GET | Revenue/product/campaign aggregates |
| `/quick-create` | POST | One-form product creation |
| `/bulk-create` | POST | Batch listing generation |
| `/generate-product` | POST | AI product file generation |
| `/csv-import` | POST | Etsy CSV upload (orders/stats) |
| `/reports` | GET, POST | Revenue/performance reports |
| `/etsy` | GET, POST | Etsy connection + OAuth + publish |
| `/packs` | GET, POST, PUT, DELETE | ProductPack CRUD |
| `/assets` | GET, POST, PUT, DELETE | DistributionAsset CRUD |
| `/mockup-images` | POST | AI mockup image generation |
| `/pinterest` | POST | Pinterest pin creation |
| `/revenue` | GET | Revenue breakdown by channel |
| `/global-rollup` | GET | Cross-tenant aggregation |
| `/tasks` | GET, POST | CommerceTask CRUD |
| `/orders` | GET, POST | CommerceOrder CRUD |
| `/payouts` | GET, POST | Payout tracking |

---

## 10. Cron Jobs

| Cron | Schedule | Purpose |
|------|----------|---------|
| `commerce-trends` | Monday 4:30 UTC | Weekly AI research — discovers niches, generates briefs |
| `trends-monitor` | Daily 6:00 UTC | Monitors trending topics, creates TopicProposals |

Both crons:
- Multi-site loop (all active sites, skips yacht site)
- 53s budget guard with 7s buffer
- Standard cron auth (allow if CRON_SECRET unset)
- Log to CronJobLog table

---

## 11. Feature Flags

| Flag | Purpose | Default |
|------|---------|---------|
| `COMMERCE_ENGINE` | Enable entire commerce system | Enabled |
| `COMMERCE_TREND_CRON` | Enable weekly TrendRun cron | Enabled |
| `COMMERCE_ETSY_INTEGRATION` | Enable Etsy OAuth + API | Disabled (per-site) |

Per-tenant flags in `CommerceSettings`:
- `etsyEnabled` — Enable Etsy connection for this site
- `websiteShopEnabled` — Enable website digital product sales
- `pinterestEnabled` — Enable Pinterest auto-pinning
- `autoPublishToEtsy` — **DANGER**: Bypass approval gate (default: false)
- `growthBlueprintUnlocked` — Unlock Growth Blueprint ($5k/mo mode)

---

## 12. Per-Tenant Configuration

### Adding a New Tenant

1. Add site to `config/sites.ts` with siteId, domain, locale, currency
2. Create `Tenant` record in DB with matching siteId
3. Create `CommerceSettings` for the tenant
4. Configure `EtsyShopConfig` with shop credentials
5. Add `TenantIntegration` records for enabled services
6. Set feature flags
7. Run first TrendRun manually

### Etsy Shop Setup Per Tenant

1. Create Etsy developer app at developers.etsy.com
2. Set `ETSY_API_KEY` and `ETSY_SHARED_SECRET` in Vercel env
3. Navigate to Commerce HQ → Etsy tab → "Connect Etsy Shop"
4. Complete OAuth flow
5. Import historical data via CSV

### Rotating API Keys

1. Generate new key in Etsy developer dashboard
2. Update env var in Vercel
3. Redeploy (env vars take effect on next deploy)
4. Old tokens auto-refresh; manual reconnect if expired

---

## 13. Operator Playbooks

### A. First Product Launch

1. Go to Commerce HQ → Niche Goldmine tab
2. Click "Run Now" to trigger TrendRun
3. Wait for completion (~30s) → review discovered niches
4. Switch to Ideation tab → approve best briefs
5. Switch to Design tab → generate product file (PDF)
6. Switch to Design tab → generate mockup images
7. Switch to Etsy SEO tab → review listing draft
8. Edit title/tags/description if needed
9. Click "Publish to Etsy" → listing goes live after approval
10. Switch to Marketing tab → launch 30-day campaign

### B. Weekly TrendRun Review

1. TrendRun fires automatically Monday 4:30 UTC
2. Check Commerce HQ → TrendRun Engine tab for results
3. Review top 5 opportunities with scores
4. Approve promising briefs → they enter production pipeline
5. Reject weak briefs with a note

### C. CSV Import (Weekly)

1. Download Orders CSV from Etsy seller dashboard
2. Go to Commerce HQ → Etsy tab
3. Click "Import CSV" → upload the file
4. System deduplicates by transaction ID
5. Revenue dashboard updates automatically

### D. Campaign Setup

1. Approve a ProductBrief
2. Go to Marketing tab → click "New 30-Day Campaign"
3. AI generates daily tasks across 5 channels
4. Check off tasks daily in the campaign calendar
5. Monitor milestones at 25%, 50%, 75%, 100%

---

## 14. Compliance Guardrails

- **No copyrighted maps**: Do not use official transit maps, logos, or trademarks
- **No ToS-violating scraping**: Use official APIs or manual exports only
- **Clear license terms**: Every digital product must include personal-use license
- **Business-use terms**: Optional for agent templates (B2B tier)
- **Email capture**: Only via explicit opt-in (GDPR/CAN-SPAM compliant)
- **No "official affiliation"**: Never claim affiliation with London Underground, etc.

---

## 15. Alerts System

### Alert Types

| Type | Trigger | Severity |
|------|---------|----------|
| `sale` | New purchase detected | info |
| `trend_spike` | TrendRun finds high-score opportunity | info |
| `campaign_milestone` | Campaign reaches 25/50/75/100% | info |
| `weekly_report` | Weekly summary generated | info |
| `listing_status` | Etsy listing state change | warning |
| `brief_approved` | Operator approves a brief | info |
| `brief_rejected` | Operator rejects a brief | warning |
| `conversion_drop` | Conversion drops >30% WoW | critical |
| `low_margin` | Net margin below threshold | critical |
| `payout_mismatch` | Payout profile checklist incomplete | warning |

---

## 16. Dashboards

### Per-Tenant Dashboard (Commerce HQ — 12 tabs)

| Tab | Content |
|-----|---------|
| Overview | Revenue cards, pipeline stats, alerts, quick actions |
| Niche Goldmine | TrendRun history, niche cards, manual trigger |
| Ideation | ProductBrief table, approve/reject, filtering |
| Products | DigitalProduct inventory with tier/category |
| Etsy SEO | Connection status, listing drafts, publish buttons |
| Marketing | Campaign calendar, task tracking, UTM links |
| Branding | Shop identity, brand voice, policy templates |
| Design | Mockup/file generation for approved briefs |
| Growth | $5k/mo blueprint (locked until threshold met) |
| TrendRun | Engine history, scoring algorithm details |
| Assets | Distribution assets, UTM builder, quick links |
| Settings | Feature flags, secrets vault, payout checklist |

### Global Dashboard

**API**: `/api/admin/commerce/global-rollup`

- Revenue by tenant (30-day)
- Top products across all sites
- Cross-tenant pattern detection
- TrendRun summary across sites

---

## Key Files Reference

```
lib/commerce/
├── types.ts                # Shared TypeScript interfaces
├── constants.ts            # Product ontology, Etsy limits, payout profile
├── trend-engine.ts         # TrendRun execution + scoring
├── etsy-api.ts             # OAuth2 PKCE + Etsy API client
├── etsy-csv-import.ts      # CSV parsers for orders + stats
├── product-file-generator.ts  # AI PDF generation
├── image-generator.ts      # AI mockup prompts
├── campaign-generator.ts   # 30-day campaign AI
├── listing-generator.ts    # Brief → EtsyListingDraft
├── bulk-creator.ts         # Batch listing creation
├── quick-create.ts         # One-form product creation
├── alert-engine.ts         # Alert management
├── report-generator.ts     # Revenue reports
├── utm-engine.ts           # UTM + coupon utilities
├── asset-manager.ts        # Distribution asset CRUD
└── pinterest-client.ts     # Pinterest API v5

app/api/admin/commerce/     # 21 API routes
app/api/cron/commerce-trends/  # Weekly cron
app/api/auth/etsy/          # OAuth flow
app/admin/cockpit/commerce/ # Main cockpit page + 5 sub-pages

test/commerce/              # 6 test files, 187 tests
scripts/commerce-smoke-test.ts  # 100 smoke tests
```
