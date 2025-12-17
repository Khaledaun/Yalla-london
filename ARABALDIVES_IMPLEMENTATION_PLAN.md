# Arabaldives Implementation Plan
## Arabic-Only Maldives Travel Blog - Multi-Tenant Architecture

**Document Version:** 1.0
**Date:** December 17, 2025
**Status:** Ready for Review

---

## Executive Summary

This document provides a comprehensive implementation plan for launching **Arabaldives** - an Arabic-only Maldives luxury travel blog - as a new tenant on the existing Yalla London platform. The analysis reveals that while multi-site models exist, **critical gaps in tenant isolation** must be addressed before safely launching a second tenant.

### Key Findings

| Area | Current State | Required Work |
|------|---------------|---------------|
| Multi-site Models | ✅ Site, SiteConfig, SiteTheme exist | Minor additions |
| Tenant Resolution | ❌ Missing middleware | Must implement |
| Content Isolation | ⚠️ Partial siteId support | Add to BlogPost, MediaAsset |
| RTL Support | ⚠️ Document-level only | Component-level fixes needed |
| Cron/Automation | ❌ Global operation | Must add tenant filtering |
| Feature Flags | ❌ Environment-based only | Add per-site config |

---

## Section 1: Technical Approach

### 1.1 Repository Strategy

**Recommendation: Single Repository, Multi-Tenant**

```
Pros:
✅ Shared codebase reduces maintenance burden
✅ Feature parity across sites
✅ Single CI/CD pipeline
✅ Unified dependency management

Cons:
⚠️ Requires careful tenant isolation
⚠️ Schema migrations affect all tenants
⚠️ Shared feature flags need per-site override

Decision: MONO-REPO with tenant isolation layer
```

### 1.2 Data Model Changes

#### Minimal Schema Delta (Prisma)

```prisma
// ============================================
// CHANGES TO EXISTING MODELS
// ============================================

// BlogPost - ADD site_id (currently missing)
model BlogPost {
  // ... existing fields ...
  site_id       String    @default("yalla-london")  // NEW
  site          Site?     @relation(fields: [site_id], references: [id])

  @@index([site_id])  // NEW
  @@index([site_id, status, published_at])  // NEW composite
}

// MediaAsset - ADD site_id (currently missing)
model MediaAsset {
  // ... existing fields ...
  site_id       String    @default("yalla-london")  // NEW
  site          Site?     @relation(fields: [site_id], references: [id])

  @@index([site_id])  // NEW
}

// TopicProposal - Already has site_id ✅

// ============================================
// NEW MODELS FOR ARABALDIVES
// ============================================

model Resort {
  id                    String    @id @default(cuid())
  site_id               String
  site                  Site      @relation(fields: [site_id], references: [id])

  // Basic Info
  name_ar               String
  name_en               String?   // Optional English fallback
  slug                  String    @unique
  description_ar        String    @db.Text
  description_en        String?   @db.Text

  // Location
  atoll                 String    // e.g., "North Malé", "Baa"
  island_name           String
  transfer_type         TransferType
  transfer_time_minutes Int

  // Classification
  star_rating           Int       @default(5)
  category              ResortCategory
  brand                 String?   // e.g., "Four Seasons", "Soneva"

  // Pricing
  price_range           PriceRange
  starting_price_usd    Decimal?  @db.Decimal(10, 2)
  all_inclusive         Boolean   @default(false)

  // Features
  villa_types           Json      // Array of villa configs
  restaurants_count     Int       @default(1)
  spa_available         Boolean   @default(true)
  diving_center         Boolean   @default(false)
  kids_club             Boolean   @default(false)
  adult_only            Boolean   @default(false)

  // Content
  featured_image_url    String?
  gallery_urls          Json      // Array of image URLs
  amenities             Json      // Array of amenity strings (Arabic)
  highlights_ar         Json      // Key selling points

  // SEO
  meta_title_ar         String?
  meta_description_ar   String?

  // Relations
  reviews               ResortReview[]
  offers                ResortOffer[]
  comparisons           ResortComparison[]

  // Tracking
  view_count            Int       @default(0)
  inquiry_count         Int       @default(0)

  // Timestamps
  created_at            DateTime  @default(now())
  updated_at            DateTime  @updatedAt
  published_at          DateTime?

  @@index([site_id])
  @@index([site_id, category])
  @@index([site_id, atoll])
  @@index([site_id, price_range])
  @@index([slug])
}

enum TransferType {
  SPEEDBOAT
  SEAPLANE
  DOMESTIC_FLIGHT_SPEEDBOAT
  DOMESTIC_FLIGHT_ONLY
}

enum ResortCategory {
  HONEYMOON
  FAMILY
  DIVING
  WELLNESS
  BUDGET_LUXURY
  ULTRA_LUXURY
  ALL_INCLUSIVE
}

enum PriceRange {
  ACCESSIBLE     // $500-800/night
  MODERATE       // $800-1500/night
  PREMIUM        // $1500-3000/night
  ULTRA_LUXURY   // $3000+/night
}

model ResortReview {
  id              String    @id @default(cuid())
  resort_id       String
  resort          Resort    @relation(fields: [resort_id], references: [id])

  reviewer_name   String
  review_text_ar  String    @db.Text
  rating          Int       // 1-5
  stay_date       DateTime?
  verified        Boolean   @default(false)

  created_at      DateTime  @default(now())

  @@index([resort_id])
}

model ResortOffer {
  id              String    @id @default(cuid())
  resort_id       String
  resort          Resort    @relation(fields: [resort_id], references: [id])

  title_ar        String
  description_ar  String    @db.Text
  discount_percent Int?
  valid_from      DateTime
  valid_until     DateTime
  promo_code      String?
  affiliate_url   String?

  is_active       Boolean   @default(true)
  created_at      DateTime  @default(now())

  @@index([resort_id])
  @@index([valid_until])
}

model ResortComparison {
  id              String    @id @default(cuid())
  site_id         String

  title_ar        String
  slug            String    @unique
  description_ar  String    @db.Text

  resort_ids      Json      // Array of resort IDs to compare
  comparison_data Json      // Structured comparison matrix

  published       Boolean   @default(false)
  view_count      Int       @default(0)

  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  @@index([site_id])
  @@index([slug])
}

model DigitalProduct {
  id              String    @id @default(cuid())
  site_id         String
  site            Site      @relation(fields: [site_id], references: [id])

  // Product Info
  name_ar         String
  slug            String    @unique
  description_ar  String    @db.Text
  product_type    DigitalProductType

  // Pricing
  price_usd       Decimal   @db.Decimal(10, 2)
  price_aed       Decimal?  @db.Decimal(10, 2)

  // Delivery
  file_url        String?   // Encrypted S3 URL
  file_size_mb    Decimal?  @db.Decimal(10, 2)

  // For Notion templates
  notion_template_id String?
  notion_duplicate_url String?

  // Tracking
  preview_url     String?
  thumbnail_url   String?
  sales_count     Int       @default(0)

  is_active       Boolean   @default(true)
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  @@index([site_id])
  @@index([slug])
  @@index([product_type])
}

enum DigitalProductType {
  NOTION_TEMPLATE
  PDF_GUIDE
  CHECKLIST
  ITINERARY
}

model DigitalPurchase {
  id              String    @id @default(cuid())
  product_id      String
  product         DigitalProduct @relation(fields: [product_id], references: [id])

  // Buyer Info
  buyer_email     String
  buyer_name      String?

  // Payment
  amount_usd      Decimal   @db.Decimal(10, 2)
  payment_provider String   // "stripe", "tap"
  payment_id      String    // External payment reference
  payment_status  PaymentStatus

  // Delivery
  download_token  String    @unique @default(cuid())
  download_count  Int       @default(0)
  max_downloads   Int       @default(5)
  expires_at      DateTime

  created_at      DateTime  @default(now())

  @@index([product_id])
  @@index([buyer_email])
  @@index([download_token])
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

// ============================================
// SITE FEATURE FLAGS (NEW)
// ============================================

model SiteFeatureFlag {
  id          String    @id @default(cuid())
  site_id     String
  site        Site      @relation(fields: [site_id], references: [id])

  flag_key    String    // e.g., "CONTENT_AUTOMATION", "AI_GENERATION"
  enabled     Boolean   @default(false)
  config      Json?     // Optional JSON config for the flag

  created_at  DateTime  @default(now())
  updated_at  DateTime  @updatedAt

  @@unique([site_id, flag_key])
  @@index([site_id])
}
```

### 1.3 Tenant Resolution Strategy

**Recommendation: Host-Header Based Resolution with Middleware**

```typescript
// lib/tenant/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Cache tenant config for 5 minutes
const tenantCache = new Map<string, { site: Site; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function resolveTenant(request: NextRequest): Promise<Site | null> {
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0]; // Remove port

  // Check cache
  const cached = tenantCache.get(hostname);
  if (cached && cached.expires > Date.now()) {
    return cached.site;
  }

  // Query database
  const site = await prisma.site.findFirst({
    where: {
      OR: [
        { domain: hostname },
        { subdomain: hostname.split('.')[0] },
      ],
      is_active: true,
    },
    include: {
      config: true,
      theme: true,
      premium: true,
      featureFlags: true,
    },
  });

  if (site) {
    tenantCache.set(hostname, { site, expires: Date.now() + CACHE_TTL });
  }

  return site;
}

// Domain mapping
const DOMAIN_MAP: Record<string, string> = {
  'yallalondon.com': 'yalla-london',
  'www.yallalondon.com': 'yalla-london',
  'arabaldives.com': 'arabaldives',
  'www.arabaldives.com': 'arabaldives',
  'localhost': 'yalla-london', // Default for dev
};
```

```typescript
// middleware.ts (root)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || 'localhost';
  const hostname = host.split(':')[0];

  // Determine site ID from host
  let siteId = 'yalla-london'; // default

  if (hostname.includes('arabaldives')) {
    siteId = 'arabaldives';
  }

  // Add site context to headers for downstream use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-site-id', siteId);
  requestHeaders.set('x-site-locale', siteId === 'arabaldives' ? 'ar' : 'en');
  requestHeaders.set('x-site-dir', siteId === 'arabaldives' ? 'rtl' : 'ltr');

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/health).*)',
  ],
};
```

### 1.4 Routing Architecture

```
Route Map for Arabaldives (arabaldives.com)
==========================================

Public Routes:
├── /                           → Homepage (Arabic)
├── /المنتجعات                   → Resort listing
│   ├── /[slug]                 → Resort detail
│   └── /مقارنة                  → Comparison tool
├── /المقالات                    → Blog listing
│   └── /[slug]                 → Blog post
├── /الأدلة                      → Guides section
│   ├── /دليل-شهر-العسل          → Honeymoon guide
│   └── /دليل-العائلات           → Family guide
├── /العروض                      → Special offers
├── /المنتجات                    → Digital products
│   └── /[slug]                 → Product detail
├── /عن-الموقع                   → About page
├── /تواصل-معنا                  → Contact page
└── /sitemap.xml                → Sitemap

Admin Routes (shared):
├── /admin                      → Dashboard (site-filtered)
├── /admin/resorts              → Resort management
├── /admin/content              → Content management
├── /admin/products             → Digital products
└── /admin/analytics            → Analytics (site-filtered)

API Routes:
├── /api/resorts               → Resort CRUD
├── /api/comparisons           → Comparison tool
├── /api/products              → Digital products
├── /api/purchases             → Purchase flow
└── /api/webhooks/stripe       → Payment webhooks
```

### 1.5 i18n Strategy

**Arabaldives: Arabic-Only with Simplified i18n**

```typescript
// lib/i18n/arabaldives-config.ts
export const ARABALDIVES_I18N = {
  defaultLocale: 'ar',
  locales: ['ar'], // Arabic only - no locale switching
  direction: 'rtl',

  // Date formatting
  dateFormat: {
    short: 'dd/MM/yyyy',
    long: 'dd MMMM yyyy',
    withDay: 'EEEE، dd MMMM yyyy',
  },

  // Number formatting
  numberFormat: {
    currency: 'USD', // Prices in USD
    currencyDisplay: 'symbol',
    useGrouping: true,
  },

  // Calendar
  calendar: 'gregory', // Use Gregorian, not Hijri

  // Common translations
  translations: {
    // Navigation
    'nav.home': 'الرئيسية',
    'nav.resorts': 'المنتجعات',
    'nav.articles': 'المقالات',
    'nav.guides': 'الأدلة',
    'nav.offers': 'العروض',
    'nav.products': 'المنتجات',
    'nav.contact': 'تواصل معنا',

    // Resort
    'resort.category.honeymoon': 'شهر عسل',
    'resort.category.family': 'عائلي',
    'resort.category.diving': 'غوص',
    'resort.category.wellness': 'استجمام',
    'resort.transfer.seaplane': 'طائرة مائية',
    'resort.transfer.speedboat': 'قارب سريع',

    // Actions
    'action.book_now': 'احجز الآن',
    'action.compare': 'قارن',
    'action.read_more': 'اقرأ المزيد',
    'action.download': 'تحميل',
    'action.buy_now': 'اشترِ الآن',

    // Common
    'common.price_from': 'يبدأ من',
    'common.per_night': '/ليلة',
    'common.reviews': 'تقييمات',
    'common.share': 'مشاركة',
  },
};
```

---

## Section 2: Operational Plan

### 2.1 Content Operations

```
Content Workflow for Arabaldives
================================

Phase 1: Manual Content (Weeks 1-4)
-----------------------------------
1. Resort Database Population
   - Source: Official resort websites + OTAs
   - Process: Manual data entry by Arabic content team
   - Target: 50 resorts minimum for launch

2. Editorial Content
   - Type: Curated guides, comparisons, reviews
   - Process: Human-written, AI-assisted
   - Target: 20 evergreen articles for launch

Phase 2: Assisted Content (Weeks 5-8)
-------------------------------------
1. AI Topic Generation (Manual Trigger)
   - Admin clicks "Generate Topics" in dashboard
   - AI suggests topics based on trending searches
   - Human reviews and approves

2. AI Draft Generation (Manual Trigger)
   - Human selects approved topic
   - AI generates draft in Arabic
   - Human edits and publishes

Phase 3: Semi-Automated (Month 3+)
----------------------------------
1. Scheduled topic generation (weekly)
2. Draft queue for human review
3. No auto-publish without approval
```

### 2.2 Automation Gating

**Per-Site Feature Flags Implementation:**

```typescript
// lib/features/site-features.ts
import { prisma } from '@/lib/db';

interface SiteFeatures {
  CONTENT_AUTOMATION: boolean;
  AI_GENERATION: boolean;
  AUTO_PUBLISH: boolean;
  CRON_ENABLED: boolean;
  DIGITAL_PRODUCTS: boolean;
}

const DEFAULTS: SiteFeatures = {
  CONTENT_AUTOMATION: false,
  AI_GENERATION: true,      // Manual trigger only
  AUTO_PUBLISH: false,      // Never auto-publish
  CRON_ENABLED: false,      // Disabled by default
  DIGITAL_PRODUCTS: true,
};

export async function getSiteFeatures(siteId: string): Promise<SiteFeatures> {
  const flags = await prisma.siteFeatureFlag.findMany({
    where: { site_id: siteId },
  });

  const features = { ...DEFAULTS };

  for (const flag of flags) {
    if (flag.flag_key in features) {
      features[flag.flag_key as keyof SiteFeatures] = flag.enabled;
    }
  }

  return features;
}

export async function isFeatureEnabled(
  siteId: string,
  feature: keyof SiteFeatures
): Promise<boolean> {
  const features = await getSiteFeatures(siteId);
  return features[feature];
}
```

**Tenant-Safe Cron Implementation:**

```typescript
// lib/cron/tenant-safe-runner.ts
import { prisma } from '@/lib/db';
import { isFeatureEnabled } from '@/lib/features/site-features';

export async function runForAllSites<T>(
  jobName: string,
  processor: (siteId: string) => Promise<T>
): Promise<Map<string, T | Error>> {
  const results = new Map<string, T | Error>();

  // Get all active sites with cron enabled
  const sites = await prisma.site.findMany({
    where: { is_active: true },
    select: { id: true, name: true },
  });

  for (const site of sites) {
    // Check if this site has cron enabled
    const cronEnabled = await isFeatureEnabled(site.id, 'CRON_ENABLED');

    if (!cronEnabled) {
      console.log(`[${jobName}] Skipping ${site.name} - cron disabled`);
      continue;
    }

    try {
      console.log(`[${jobName}] Processing ${site.name}...`);
      const result = await processor(site.id);
      results.set(site.id, result);
    } catch (error) {
      console.error(`[${jobName}] Error for ${site.name}:`, error);
      results.set(site.id, error as Error);
    }
  }

  return results;
}
```

### 2.3 QA Plan

```
QA Checklist for Arabaldives Launch
===================================

Functional Testing:
□ Tenant isolation - content from yalla-london not visible
□ RTL rendering - all components display correctly
□ Arabic text - proper rendering of all Unicode
□ Image lazy loading - works with RTL scroll
□ Form validation - Arabic error messages
□ Search - Arabic full-text search works
□ Filters - Resort filtering works

Performance Testing:
□ Lighthouse score > 90 on mobile
□ Core Web Vitals passing
□ Arabic font loading < 100ms
□ Initial page load < 2s on 3G

SEO Testing:
□ Arabic meta tags rendering
□ hreflang tags correct
□ Sitemap includes all Arabic URLs
□ Structured data valid (JSON-LD)
□ Open Graph tags in Arabic

Security Testing:
□ Tenant data isolation verified
□ Admin routes protected
□ API routes check siteId
□ File uploads scoped to tenant

Cross-Browser Testing:
□ Chrome (latest)
□ Safari (latest)
□ Firefox (latest)
□ Samsung Internet
□ iOS Safari
```

### 2.4 Release Plan

```
Arabaldives Launch Timeline
===========================

Week 1-2: Infrastructure
------------------------
□ Prisma schema migration
□ Tenant resolution middleware
□ RTL component fixes
□ Site seed data (arabaldives site record)

Week 3-4: Core Features
-----------------------
□ Resort model + admin UI
□ Resort listing page
□ Resort detail page
□ Basic comparison tool

Week 5-6: Content & UX
----------------------
□ Blog integration with siteId
□ Arabic content entry
□ Home page design
□ Navigation + footer

Week 7-8: Polish & Launch
-------------------------
□ Digital products integration
□ Analytics setup
□ Performance optimization
□ QA testing
□ Soft launch (beta)
□ Public launch

Post-Launch (Month 2):
---------------------
□ Monitor analytics
□ User feedback integration
□ Enable AI-assisted content
□ Expand resort database
```

### 2.5 Monitoring

```typescript
// lib/monitoring/site-metrics.ts
export interface SiteMetrics {
  siteId: string;
  period: 'hour' | 'day' | 'week';

  // Traffic
  pageViews: number;
  uniqueVisitors: number;
  avgSessionDuration: number;
  bounceRate: number;

  // Content
  publishedPosts: number;
  pendingDrafts: number;

  // Conversions
  resortInquiries: number;
  digitalSales: number;
  affiliateClicks: number;

  // Performance
  avgResponseTime: number;
  errorRate: number;
}

// Dashboard alerts
export const SITE_ALERTS = {
  HIGH_ERROR_RATE: {
    threshold: 0.05, // 5%
    message_ar: 'معدل أخطاء مرتفع - يرجى التحقق',
  },
  LOW_TRAFFIC: {
    threshold: 100, // per day
    message_ar: 'حركة مرور منخفضة',
  },
  CONTENT_STALE: {
    days: 7,
    message_ar: 'لم يتم نشر محتوى جديد منذ أسبوع',
  },
};
```

---

## Section 3: Design System & UX Patterns

### 3.1 RTL-First Component Fixes

**Current Issues Found:**

```typescript
// PROBLEM: Hardcoded directional classes
<div className="ml-4 pl-2 text-left border-l-2">

// SOLUTION: Use logical properties
<div className="ms-4 ps-2 text-start border-s-2">
```

**Tailwind RTL Configuration:**

```javascript
// tailwind.config.js
module.exports = {
  // Enable RTL variants
  plugins: [
    require('tailwindcss-rtl'),
  ],

  theme: {
    extend: {
      // Logical property aliases
      spacing: {
        // These work with RTL automatically
      },
    },
  },
};
```

**Component Migration Guide:**

| Old Class | New Class | Behavior |
|-----------|-----------|----------|
| `ml-*` | `ms-*` | Margin start |
| `mr-*` | `me-*` | Margin end |
| `pl-*` | `ps-*` | Padding start |
| `pr-*` | `pe-*` | Padding end |
| `left-*` | `start-*` | Position start |
| `right-*` | `end-*` | Position end |
| `text-left` | `text-start` | Text align |
| `text-right` | `text-end` | Text align |
| `border-l-*` | `border-s-*` | Border start |
| `border-r-*` | `border-e-*` | Border end |
| `rounded-l-*` | `rounded-s-*` | Border radius |
| `rounded-r-*` | `rounded-e-*` | Border radius |

**Radix UI RTL Fixes:**

```typescript
// components/ui/dialog-rtl.tsx
import * as DialogPrimitive from '@radix-ui/react-dialog';

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2",
        // RTL-aware close button position
        "[&>button]:absolute [&>button]:top-4 [&>button]:end-4",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
```

### 3.2 Arabic Typography System

```css
/* styles/arabic-typography.css */
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap');

:root {
  --font-arabic: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif;

  /* Arabic-optimized line heights */
  --line-height-tight: 1.4;
  --line-height-normal: 1.7;
  --line-height-relaxed: 2;

  /* Arabic-optimized letter spacing */
  --letter-spacing-arabic: 0.01em;
}

[dir="rtl"] {
  font-family: var(--font-arabic);
  line-height: var(--line-height-normal);
  letter-spacing: var(--letter-spacing-arabic);
}

/* Arabic heading styles */
[dir="rtl"] h1 { font-size: 2.5rem; font-weight: 700; line-height: 1.3; }
[dir="rtl"] h2 { font-size: 2rem; font-weight: 600; line-height: 1.4; }
[dir="rtl"] h3 { font-size: 1.5rem; font-weight: 600; line-height: 1.4; }

/* Arabic body text */
[dir="rtl"] p {
  font-size: 1.125rem;
  line-height: 1.8;
  text-align: justify;
  text-justify: inter-word;
}
```

### 3.3 Top 10 Conversion UI Components

```typescript
// 1. ResortCard - Main listing card
interface ResortCardProps {
  resort: Resort;
  variant: 'grid' | 'list' | 'featured';
  showPrice: boolean;
  showCompareButton: boolean;
  onCompare: (id: string) => void;
  onInquire: (id: string) => void;
}

// 2. PriceDisplay - Formatted pricing with currency
interface PriceDisplayProps {
  amount: number;
  currency: 'USD' | 'AED';
  period: 'night' | 'package';
  originalAmount?: number; // For discounts
  size: 'sm' | 'md' | 'lg';
}

// 3. ComparisonTable - Side-by-side resort comparison
interface ComparisonTableProps {
  resorts: Resort[];
  maxResorts: 3 | 4;
  features: ComparisonFeature[];
  onRemove: (id: string) => void;
  onInquire: (ids: string[]) => void;
}

// 4. InquiryForm - Lead capture form
interface InquiryFormProps {
  resortId: string;
  variant: 'inline' | 'modal' | 'sticky';
  fields: ('name' | 'email' | 'phone' | 'dates' | 'budget' | 'notes')[];
  onSubmit: (data: InquiryData) => Promise<void>;
}

// 5. FilterSidebar - Resort filtering
interface FilterSidebarProps {
  filters: {
    category: ResortCategory[];
    priceRange: PriceRange[];
    atoll: string[];
    transferType: TransferType[];
    amenities: string[];
  };
  activeFilters: ActiveFilters;
  onChange: (filters: ActiveFilters) => void;
  resultsCount: number;
}

// 6. StickyBookingBar - Persistent CTA bar
interface StickyBookingBarProps {
  resort: Resort;
  visible: boolean;
  price: number;
  onBook: () => void;
  onInquire: () => void;
}

// 7. ImageGallery - Resort photo gallery
interface ImageGalleryProps {
  images: GalleryImage[];
  variant: 'grid' | 'carousel' | 'masonry';
  enableZoom: boolean;
  enableFullscreen: boolean;
  rtl: boolean;
}

// 8. ReviewCard - User review display
interface ReviewCardProps {
  review: ResortReview;
  showResortLink: boolean;
  variant: 'compact' | 'full';
}

// 9. OfferBanner - Promotional banner
interface OfferBannerProps {
  offer: ResortOffer;
  variant: 'card' | 'inline' | 'floating';
  countdown: boolean;
  onClaim: () => void;
}

// 10. ProductCard - Digital product display
interface ProductCardProps {
  product: DigitalProduct;
  variant: 'grid' | 'featured';
  showPreview: boolean;
  onPurchase: () => void;
}
```

### 3.4 Component Implementation Examples

```typescript
// components/arabaldives/resort-card.tsx
'use client';

import { Resort } from '@prisma/client';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Plane, Ship, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ResortCardProps {
  resort: Resort;
  variant?: 'grid' | 'list' | 'featured';
  showCompareButton?: boolean;
  onCompare?: (id: string) => void;
}

const TRANSFER_ICONS = {
  SEAPLANE: Plane,
  SPEEDBOAT: Ship,
  DOMESTIC_FLIGHT_SPEEDBOAT: Plane,
  DOMESTIC_FLIGHT_ONLY: Plane,
};

const CATEGORY_LABELS: Record<string, string> = {
  HONEYMOON: 'شهر عسل',
  FAMILY: 'عائلي',
  DIVING: 'غوص',
  WELLNESS: 'استجمام',
  BUDGET_LUXURY: 'فخامة معقولة',
  ULTRA_LUXURY: 'فخامة فائقة',
  ALL_INCLUSIVE: 'شامل',
};

export function ResortCard({
  resort,
  variant = 'grid',
  showCompareButton = true,
  onCompare,
}: ResortCardProps) {
  const TransferIcon = TRANSFER_ICONS[resort.transfer_type];

  return (
    <article
      className={cn(
        "group bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-sm",
        "hover:shadow-lg transition-shadow duration-300",
        "border border-gray-200 dark:border-gray-800",
        variant === 'list' && "flex flex-row",
        variant === 'featured' && "col-span-2 row-span-2"
      )}
    >
      {/* Image */}
      <div className={cn(
        "relative overflow-hidden",
        variant === 'grid' && "aspect-[4/3]",
        variant === 'list' && "w-1/3 min-h-[200px]",
        variant === 'featured' && "aspect-[16/9]"
      )}>
        <Image
          src={resort.featured_image_url || '/images/placeholder-resort.jpg'}
          alt={resort.name_ar}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Category Badge */}
        <Badge className="absolute top-3 end-3 bg-primary text-primary-foreground">
          {CATEGORY_LABELS[resort.category]}
        </Badge>

        {/* Rating Stars */}
        <div className="absolute bottom-3 start-3 flex gap-0.5">
          {Array.from({ length: resort.star_rating }).map((_, i) => (
            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className={cn(
        "p-4 flex flex-col",
        variant === 'list' && "flex-1"
      )}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          {resort.name_ar}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 text-sm mb-2">
          <MapPin className="w-4 h-4" />
          <span>جزر المالديف - {resort.atoll}</span>
        </div>

        {/* Transfer Info */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
          <TransferIcon className="w-4 h-4" />
          <span>{resort.transfer_time_minutes} دقيقة</span>
        </div>

        {/* Price */}
        {resort.starting_price_usd && (
          <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-baseline gap-1">
              <span className="text-sm text-gray-500">يبدأ من</span>
              <span className="text-xl font-bold text-primary">
                ${Number(resort.starting_price_usd).toLocaleString()}
              </span>
              <span className="text-sm text-gray-500">/ليلة</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <Button asChild className="flex-1">
            <Link href={`/المنتجعات/${resort.slug}`}>
              التفاصيل
            </Link>
          </Button>

          {showCompareButton && onCompare && (
            <Button
              variant="outline"
              onClick={() => onCompare(resort.id)}
            >
              قارن
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
```

---

## Section 4: Concrete Implementation Tasks

### 4.1 PR Checklist

```
PR #1: Multi-Tenant Infrastructure
==================================
Files:
□ prisma/schema.prisma (add siteId to BlogPost, MediaAsset)
□ prisma/migrations/YYYYMMDD_add_tenant_isolation/
□ lib/tenant/middleware.ts (NEW)
□ lib/tenant/context.ts (NEW)
□ middleware.ts (UPDATE)
□ lib/features/site-features.ts (NEW)

Tests:
□ __tests__/tenant/isolation.test.ts
□ __tests__/tenant/middleware.test.ts

PR #2: Resort Data Model
========================
Files:
□ prisma/schema.prisma (add Resort, ResortReview, ResortOffer, etc.)
□ prisma/migrations/YYYYMMDD_add_resort_model/
□ lib/resorts/index.ts (NEW)
□ app/api/resorts/route.ts (NEW)
□ app/api/resorts/[id]/route.ts (NEW)

Tests:
□ __tests__/resorts/crud.test.ts

PR #3: RTL Component Fixes
==========================
Files:
□ tailwind.config.js (add RTL plugin)
□ components/ui/*.tsx (update directional classes)
□ styles/arabic-typography.css (NEW)
□ components/providers/direction-provider.tsx (NEW)

Tests:
□ __tests__/rtl/components.test.tsx

PR #4: Arabaldives Site Seed
============================
Files:
□ prisma/seed/arabaldives.ts (NEW)
□ prisma/seed/sample-resorts.ts (NEW)

PR #5: Resort UI Components
===========================
Files:
□ components/arabaldives/resort-card.tsx (NEW)
□ components/arabaldives/resort-list.tsx (NEW)
□ components/arabaldives/resort-detail.tsx (NEW)
□ components/arabaldives/comparison-table.tsx (NEW)
□ components/arabaldives/filter-sidebar.tsx (NEW)
□ app/[locale]/resorts/page.tsx (NEW)
□ app/[locale]/resorts/[slug]/page.tsx (NEW)

PR #6: Digital Products
=======================
Files:
□ prisma/schema.prisma (add DigitalProduct, DigitalPurchase)
□ app/api/products/route.ts (NEW)
□ app/api/purchases/route.ts (NEW)
□ app/api/webhooks/stripe/route.ts (NEW)
□ lib/payments/stripe.ts (NEW)
□ lib/delivery/digital-products.ts (NEW)

PR #7: Tenant-Safe Cron Jobs
============================
Files:
□ lib/cron/tenant-safe-runner.ts (NEW)
□ lib/content-pipeline.ts (UPDATE - add siteId filtering)
□ lib/cron/*.ts (UPDATE all cron jobs)
□ app/api/cron/*.ts (UPDATE all cron endpoints)

PR #8: Admin UI Updates
=======================
Files:
□ components/admin/site-selector.tsx (NEW)
□ components/admin/resort-manager.tsx (NEW)
□ app/admin/resorts/page.tsx (NEW)
□ app/admin/resorts/[id]/page.tsx (NEW)
```

### 4.2 File-Level Implementation Pointers

```
Tenant Resolution Implementation
================================
Location: lib/tenant/
Reference: Next.js 14 Middleware docs

Key patterns:
1. Use headers to pass site context (avoids async context issues)
2. Cache resolved tenants in memory (5 min TTL)
3. Domain mapping for production, query param for dev (?site=arabaldives)


Resort CRUD Implementation
==========================
Location: lib/resorts/, app/api/resorts/
Reference: Existing TopicProposal API pattern

Key patterns:
1. All queries must include where: { site_id: siteId }
2. Use Prisma transactions for multi-table operations
3. Implement soft delete (is_active flag)


RTL Implementation
==================
Location: components/ui/, styles/
Reference: tailwindcss-rtl plugin docs

Key patterns:
1. Never use l/r directional classes directly
2. Use logical properties (start/end)
3. Test every component in RTL mode


Digital Product Delivery
========================
Location: lib/delivery/
Reference: Stripe Payment Links + S3 signed URLs

Key patterns:
1. Generate time-limited download URLs
2. Track download count per purchase
3. Email delivery confirmation
```

### 4.3 Database Migration Sequence

```sql
-- Migration 1: Add siteId to existing content tables
ALTER TABLE "BlogPost" ADD COLUMN "site_id" TEXT DEFAULT 'yalla-london';
ALTER TABLE "MediaAsset" ADD COLUMN "site_id" TEXT DEFAULT 'yalla-london';

CREATE INDEX "BlogPost_site_id_idx" ON "BlogPost"("site_id");
CREATE INDEX "MediaAsset_site_id_idx" ON "MediaAsset"("site_id");

-- Migration 2: Add Resort and related tables
-- (Full SQL from Prisma migration)

-- Migration 3: Add SiteFeatureFlag
CREATE TABLE "SiteFeatureFlag" (
  "id" TEXT NOT NULL,
  "site_id" TEXT NOT NULL,
  "flag_key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "config" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SiteFeatureFlag_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SiteFeatureFlag_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "Site"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "SiteFeatureFlag_site_id_flag_key_key"
  ON "SiteFeatureFlag"("site_id", "flag_key");

-- Migration 4: Seed Arabaldives site
INSERT INTO "Site" (id, name, domain, subdomain, is_active, created_at, updated_at)
VALUES ('arabaldives', 'Arabaldives', 'arabaldives.com', 'arabaldives', true, NOW(), NOW());

INSERT INTO "SiteConfig" (id, site_id, default_language, supported_languages, timezone, created_at, updated_at)
VALUES (gen_random_uuid(), 'arabaldives', 'ar', '["ar"]', 'Asia/Dubai', NOW(), NOW());

INSERT INTO "SiteFeatureFlag" (id, site_id, flag_key, enabled, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'arabaldives', 'CONTENT_AUTOMATION', false, NOW(), NOW()),
  (gen_random_uuid(), 'arabaldives', 'AI_GENERATION', true, NOW(), NOW()),
  (gen_random_uuid(), 'arabaldives', 'AUTO_PUBLISH', false, NOW(), NOW()),
  (gen_random_uuid(), 'arabaldives', 'CRON_ENABLED', false, NOW(), NOW()),
  (gen_random_uuid(), 'arabaldives', 'DIGITAL_PRODUCTS', true, NOW(), NOW());
```

### 4.4 Test Plan

```typescript
// __tests__/tenant/isolation.test.ts
describe('Tenant Isolation', () => {
  it('should not return content from other sites', async () => {
    // Create post for site A
    const postA = await createPost({ siteId: 'yalla-london', title: 'Test A' });

    // Query as site B
    const posts = await getPostsForSite('arabaldives');

    expect(posts).not.toContainEqual(expect.objectContaining({ id: postA.id }));
  });

  it('should resolve correct tenant from hostname', async () => {
    const req = new Request('https://arabaldives.com/api/test');
    const site = await resolveTenant(req);

    expect(site?.id).toBe('arabaldives');
  });
});

// __tests__/rtl/components.test.tsx
describe('RTL Components', () => {
  it('should render ResortCard correctly in RTL', () => {
    render(
      <DirectionProvider direction="rtl">
        <ResortCard resort={mockResort} />
      </DirectionProvider>
    );

    // Check text alignment
    const title = screen.getByRole('heading');
    expect(title).toHaveStyle({ textAlign: 'start' });

    // Check badge position
    const badge = screen.getByText('شهر عسل');
    expect(badge).toHaveClass('end-3'); // Not right-3
  });
});

// __tests__/cron/tenant-safety.test.ts
describe('Tenant-Safe Cron', () => {
  it('should only process sites with cron enabled', async () => {
    // Disable cron for arabaldives
    await setSiteFeature('arabaldives', 'CRON_ENABLED', false);

    const processed: string[] = [];
    await runForAllSites('test-job', async (siteId) => {
      processed.push(siteId);
    });

    expect(processed).not.toContain('arabaldives');
  });
});
```

---

## Section 5: Answers to Specific Questions

### Q1: What is the minimal delta to launch Arabaldives as a tenant?

**Minimal Delta (2-week MVP):**

1. **Schema changes:** Add `site_id` to BlogPost, MediaAsset (2 columns + indexes)
2. **New models:** Resort, ResortReview (2 tables)
3. **Middleware:** Tenant resolution (~100 lines)
4. **RTL fixes:** Directional class replacements (~50 files, mostly find/replace)
5. **UI components:** ResortCard, ResortList, FilterSidebar (3 components)
6. **Seed data:** Arabaldives site record + 20 sample resorts

**NOT required for MVP:**
- Digital products (Phase 2)
- Comparison tool (Phase 2)
- AI content automation (Phase 2)
- Full admin UI (use existing with site filter)

### Q2: Best tenant resolution for Next.js 14 App Router?

**Recommendation: Middleware + Headers**

```typescript
// middleware.ts - runs on edge
export function middleware(request: NextRequest) {
  const siteId = resolveSiteFromHost(request.headers.get('host'));

  const headers = new Headers(request.headers);
  headers.set('x-site-id', siteId);

  return NextResponse.next({ request: { headers } });
}

// In any server component or API route
const siteId = headers().get('x-site-id');
```

**Why this approach:**
- Works with App Router (no async context issues)
- Runs on edge (fast)
- Simple to implement
- Easy to test (just set header)

### Q3: RTL implementation for Radix UI components?

**Key fixes needed:**

1. **Dialog close button:** Change `right-4` to `end-4`
2. **Dropdown menu alignment:** Use `align="end"` which respects RTL
3. **Sheet animations:** Add RTL variants for slide-in animations
4. **Toast positioning:** Change `right-0` to `end-0`

Most Radix components work out-of-box because they use logical properties internally. The issues are mainly in our custom styling.

### Q4: Resort model recommendation

**Recommendation: Separate Resort model (not derived from POI)**

**Reasons:**
1. Resorts have unique attributes (transfer type, villa types, all-inclusive status)
2. Different pricing model (per-night vs. one-time)
3. Different relationships (offers, comparisons)
4. Different content structure

**Schema provided above** with full Resort model.

### Q5: Tenant-safe automation implementation

**Three-layer approach:**

1. **Per-site feature flags:** Database-stored flags per site
2. **Cron job wrapper:** `runForAllSites()` that checks flags before processing
3. **Query filtering:** All content queries include `site_id` in WHERE clause

**Key code provided above** in Section 2.2.

### Q6: Digital product delivery (PDF/Notion)

**Architecture:**

```
Purchase Flow:
1. User clicks "Buy" → Stripe Checkout
2. Stripe webhook confirms payment
3. Generate download token (UUID)
4. Store purchase record with max_downloads=5, expires_at=+30 days
5. Send email with download link
6. On download: verify token, increment count, serve file

For Notion templates:
- Store Notion template ID
- Generate duplicate link on purchase
- User duplicates to their workspace
```

**Payment providers:** Stripe (primary), Tap (GCC fallback)

### Q7: Top 10 conversion UI components

1. **ResortCard** - Main listing display
2. **PriceDisplay** - Formatted pricing with discount
3. **ComparisonTable** - Side-by-side comparison
4. **InquiryForm** - Lead capture (modal + inline variants)
5. **FilterSidebar** - Resort filtering
6. **StickyBookingBar** - Persistent CTA on scroll
7. **ImageGallery** - Resort photos with zoom
8. **ReviewCard** - Social proof display
9. **OfferBanner** - Promotional with countdown
10. **ProductCard** - Digital product display

**Props interfaces provided above** in Section 3.3.

---

## Section 6: Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Tenant data leak | Critical | Low | Comprehensive test suite + code review |
| RTL rendering bugs | Medium | Medium | Visual regression tests + QA checklist |
| SEO penalty for duplicate content | Medium | Low | Ensure unique Arabic content |
| Payment processing issues | High | Low | Use established Stripe flow |
| Performance degradation | Medium | Medium | Monitor Vercel analytics, set alerts |
| Arabic content quality | Medium | High | Human review all AI-generated content |
| Domain DNS issues | Low | Medium | Verify DNS before launch |

---

## Appendix A: Environment Variables

```env
# Add to .env for Arabaldives support

# Multi-tenant
NEXT_PUBLIC_DEFAULT_SITE=yalla-london
ARABALDIVES_DOMAIN=arabaldives.com

# Arabic-specific
ARABIC_FONT_URL=https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic

# Feature flags (defaults)
ARABALDIVES_CONTENT_AUTOMATION=false
ARABALDIVES_CRON_ENABLED=false

# Payment (Arabaldives)
STRIPE_ARABALDIVES_SECRET_KEY=sk_live_xxx
STRIPE_ARABALDIVES_WEBHOOK_SECRET=whsec_xxx
TAP_ARABALDIVES_SECRET_KEY=sk_live_xxx
```

---

## Appendix B: Deployment Checklist

```
Pre-Launch:
□ DNS configured for arabaldives.com
□ SSL certificate provisioned
□ Vercel project configured for multi-domain
□ Database migration applied
□ Seed data loaded
□ Analytics configured (separate property)
□ Error monitoring configured (Sentry tag)

Launch Day:
□ Switch DNS to Vercel
□ Verify SSL working
□ Test all critical paths
□ Monitor error rates
□ Monitor response times

Post-Launch:
□ Submit sitemap to Google Search Console
□ Set up Google Analytics goals
□ Configure uptime monitoring
□ Schedule first content review
```

---

*Document prepared for Khaledaun/Yalla-london project*
*Implementation branch: claude/investigate-website-activity-lmBIY*
