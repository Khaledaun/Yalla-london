# New Website Deployment Roadmap

> **How to use this document:** Give this file to Claude Code with the instruction:
> "Follow the roadmap in `NEW-SITE-DEPLOYMENT.md`, execute Phase X" — replacing X with the phase you want done.
> Each phase is self-contained. Complete them in order. At the end, you only need to add env vars and test.

---

## Quick Reference: Arabaldives Example

| Field | Value |
|-------|-------|
| Site ID | `arabaldives` |
| Display Name | Arabaldives |
| Domain | `arabaldives.com` |
| Default Locale | `ar` |
| Direction | `rtl` |
| Niche | `travel` (Maldives luxury travel for Arab tourists) |
| Primary Color | `#0C4A6E` (ocean blue) |
| Secondary Color | `#0EA5E9` (sky blue) |
| Locales | `ar`, `en` |
| AI Tone | Luxury Maldives resort travel writer for Arab travelers |

---

## Phase 1: Site Configuration & Database Setup

**Goal:** Register the new site in the database and configuration system.

### 1.1 Create Site Record in Prisma Seed

Create or update file: `scripts/seed-site-arabaldives.ts`

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seedArabaldives() {
  // 1. Create or update the Site record
  const site = await prisma.site.upsert({
    where: { slug: 'arabaldives' },
    update: {},
    create: {
      name: 'Arabaldives',
      slug: 'arabaldives',
      domain: 'arabaldives.com',
      default_locale: 'ar',
      direction: 'rtl',
      is_active: true,
      primary_color: '#0C4A6E',
      secondary_color: '#0EA5E9',
      logo_url: '/sites/arabaldives/logo.png',
      favicon_url: '/sites/arabaldives/favicon.ico',
      settings_json: {
        niche: 'travel',
        subNiche: 'maldives-luxury',
        targetAudience: 'Arab travelers seeking luxury Maldives experiences',
        supportedLocales: ['ar', 'en'],
        currency: 'USD',
        timezone: 'Indian/Maldives',
        socialLinks: {
          instagram: '',  // ADD YOUR HANDLES
          twitter: '',
          facebook: '',
          tiktok: '',
        },
        contact: {
          email: '',      // ADD YOUR EMAIL
          phone: '',
        },
      },
      features_json: {
        contentGeneration: true,
        seoAgent: true,
        affiliateInjection: true,
        pdfGuides: true,
        events: false,      // Maldives doesn't have event tickets
        shop: true,
        newsletter: true,
        analytics: true,
      },
      homepage_json: {
        sections: ['hero', 'featured-resorts', 'latest-articles', 'newsletter', 'partners'],
      },
    },
  });

  // 2. Create Domain records
  await prisma.domain.upsert({
    where: { hostname: 'arabaldives.com' },
    update: {},
    create: {
      site_id: site.id,
      hostname: 'arabaldives.com',
      is_primary: true,
      verified: false,  // Will verify after DNS setup
    },
  });

  await prisma.domain.upsert({
    where: { hostname: 'www.arabaldives.com' },
    update: {},
    create: {
      site_id: site.id,
      hostname: 'www.arabaldives.com',
      is_primary: false,
      verified: false,
    },
  });

  // 3. Create SiteConfig for homepage
  await prisma.siteConfig.upsert({
    where: { site_id: 'arabaldives' },
    update: {},
    create: {
      site_id: 'arabaldives',
      hero_headline: 'اكتشف جنة المالديف',
      hero_subheadline: 'دليلك الشامل للسفر الفاخر إلى المالديف',
      hero_cta_label: 'استكشف المنتجعات',
      hero_cta_href: '/resorts',
      theme_config: {
        primaryColor: '#0C4A6E',
        secondaryColor: '#0EA5E9',
        accentColor: '#06B6D4',
        fontFamily: 'cairo',
        borderRadius: '12px',
      },
    },
  });

  // 4. Create default categories for this site's niche
  const categories = [
    { name_en: 'Luxury Resorts', name_ar: 'منتجعات فاخرة', slug: 'luxury-resorts' },
    { name_en: 'Water Villas', name_ar: 'فلل مائية', slug: 'water-villas' },
    { name_en: 'Diving & Snorkeling', name_ar: 'غوص وسنوركل', slug: 'diving-snorkeling' },
    { name_en: 'Halal Dining', name_ar: 'مطاعم حلال', slug: 'halal-dining' },
    { name_en: 'Honeymoon', name_ar: 'شهر العسل', slug: 'honeymoon' },
    { name_en: 'Family Travel', name_ar: 'سفر عائلي', slug: 'family-travel' },
    { name_en: 'Budget Maldives', name_ar: 'المالديف بميزانية', slug: 'budget-maldives' },
    { name_en: 'Travel Tips', name_ar: 'نصائح سفر', slug: 'travel-tips' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: `arabaldives-${cat.slug}` },
      update: {},
      create: {
        ...cat,
        slug: `arabaldives-${cat.slug}`,
        description_en: `${cat.name_en} content for Arabaldives`,
        description_ar: `محتوى ${cat.name_ar} لعرب المالديف`,
      },
    });
  }

  // 5. Create system user for AI-generated content
  await prisma.user.upsert({
    where: { email: 'system@arabaldives.com' },
    update: {},
    create: {
      email: 'system@arabaldives.com',
      name: 'Arabaldives AI',
      role: 'editor',
    },
  });

  console.log('Arabaldives site seeded successfully');
}

seedArabaldives().catch(console.error).finally(() => prisma.$disconnect());
```

### 1.2 Run the Seed

```bash
npx tsx scripts/seed-site-arabaldives.ts
```

### 1.3 Verify in Admin

Navigate to `/admin/command-center/sites/` — Arabaldives should appear in the sites portfolio.

---

## Phase 2: Middleware & Domain Routing

**Goal:** Make the app serve Arabaldives content when accessed from `arabaldives.com`.

### 2.1 Update Middleware Domain Map

File: `middleware.ts`

The static `DOMAIN_TO_SITE` map already has Arabaldives entries. Verify these exist:

```typescript
const DOMAIN_TO_SITE: Record<string, { siteId: string; siteName: string; locale: string }> = {
  // ... existing entries
  'arabaldives.com': { siteId: 'arabaldives', siteName: 'Arabaldives', locale: 'ar' },
  'www.arabaldives.com': { siteId: 'arabaldives', siteName: 'Arabaldives', locale: 'ar' },
};
```

### 2.2 Add to CORS / CSRF Allowed Origins

In `middleware.ts`, verify `ALLOWED_ORIGINS` includes:

```typescript
const ALLOWED_ORIGINS = [
  // ... existing
  'https://arabaldives.com',
  'https://www.arabaldives.com',
];
```

### 2.3 Add to next.config.js Image Domains

File: `next.config.js`

```javascript
images: {
  domains: [
    // ... existing
    'arabaldives.com',
  ],
}
```

### 2.4 Add to Security Headers CORS

In `next.config.js`, add the domain to the `Access-Control-Allow-Origin` header value.

### 2.5 Future: Dynamic Domain Resolution

**RECOMMENDED UPGRADE:** Instead of the static `DOMAIN_TO_SITE` map, query the database:

```typescript
// In middleware.ts - replace static map with DB lookup (cached)
import { getSiteByHostname } from '@/lib/sites/resolver';

// getSiteByHostname queries the Domain table and caches for 5 minutes
const site = await getSiteByHostname(hostname);
```

Create `lib/sites/resolver.ts`:

```typescript
const cache = new Map<string, { site: any; expiry: number }>();

export async function getSiteByHostname(hostname: string) {
  const cached = cache.get(hostname);
  if (cached && cached.expiry > Date.now()) return cached.site;

  const { prisma } = await import('@/lib/db');
  const domain = await prisma.domain.findUnique({
    where: { hostname },
    include: { site: true },
  });

  if (domain?.site) {
    cache.set(hostname, { site: domain.site, expiry: Date.now() + 300000 });
    return domain.site;
  }

  return null; // Falls back to default site
}
```

This eliminates the need to redeploy when adding new domains.

---

## Phase 3: Brand Template & Theming

**Goal:** Create Arabaldives-specific visual identity.

### 3.1 Create Brand Template

File: `config/brand-templates.ts`

Add a new template entry:

```typescript
'maldives-luxury': {
  id: 'maldives-luxury',
  name: 'Maldives Luxury',
  colors: {
    primary: '#0C4A6E',
    secondary: '#0EA5E9',
    accent: '#06B6D4',
    background: '#F0FDFA',
    surface: '#FFFFFF',
    text: '#0F172A',
    muted: '#64748B',
  },
  navigation: [
    { label_en: 'Home', label_ar: 'الرئيسية', href: '/' },
    { label_en: 'Resorts', label_ar: 'المنتجعات', href: '/resorts' },
    { label_en: 'Guides', label_ar: 'الأدلة', href: '/blog' },
    { label_en: 'Water Villas', label_ar: 'الفلل المائية', href: '/water-villas' },
    { label_en: 'Plan Trip', label_ar: 'خطط رحلتك', href: '/plan' },
  ],
  categories: [
    { name_en: 'Luxury Resorts', name_ar: 'منتجعات فاخرة', slug: 'luxury-resorts', icon: '🏝️' },
    { name_en: 'Water Villas', name_ar: 'فلل مائية', slug: 'water-villas', icon: '🏠' },
    { name_en: 'Diving', name_ar: 'غوص', slug: 'diving', icon: '🤿' },
    { name_en: 'Halal Dining', name_ar: 'حلال', slug: 'halal-dining', icon: '🍽️' },
  ],
  fonts: {
    heading: 'cairo',
    body: 'cairo',
  },
  locale: 'ar',
  direction: 'rtl',
}
```

### 3.2 Create Tailwind Theme Extension

File: `tailwind.config.ts` — add Arabaldives color palette:

```typescript
ocean: {
  50: '#F0FDFA',
  100: '#CCFBF1',
  200: '#99F6E4',
  300: '#5EEAD4',
  400: '#2DD4BF',
  500: '#0EA5E9',
  600: '#0891B2',
  700: '#0C4A6E',
  800: '#164E63',
  900: '#134E4A',
  950: '#042F2E',
},
```

### 3.3 Create Site Assets Directory

```
public/sites/arabaldives/
├── logo.png           # Main logo
├── logo-white.png     # Logo for dark backgrounds
├── favicon.ico        # Favicon
├── og-default.jpg     # Default OpenGraph image (1200x630)
├── hero-poster.jpg    # Hero section poster image
└── hero-video.mp4     # Optional hero video
```

**Note:** Add placeholder images initially. Replace with real assets before launch.

### 3.4 Test Theme Switching

In the admin panel, use the site selector dropdown to switch to Arabaldives.
Verify the brand colors, navigation labels, and RTL direction render correctly.

---

## Phase 4: Content Generation Pipeline (Site-Specific)

**Goal:** Configure the daily content generator to produce Arabaldives-specific articles.

### 4.1 Create Site-Specific Topic Bank

File: `lib/content/topic-banks/arabaldives.ts`

```typescript
export function getArabaldivesTopicsEN() {
  return [
    {
      keyword: 'best luxury water villas Maldives 2026',
      longtails: ['overwater bungalow Maldives with private pool', 'all-inclusive water villa Maldives'],
      questions: ['Which Maldives resort has the best water villas?', 'Are water villas in Maldives worth it?'],
      pageType: 'list',
    },
    {
      keyword: 'halal-friendly resorts Maldives complete guide',
      longtails: ['halal food Maldives resorts', 'Muslim-friendly Maldives hotels'],
      questions: ['Which Maldives resorts serve halal food?', 'Is Maldives good for Muslim travelers?'],
      pageType: 'guide',
    },
    {
      keyword: 'Maldives honeymoon planning guide for couples',
      longtails: ['romantic Maldives resorts', 'Maldives honeymoon packages all-inclusive'],
      questions: ['How much does a Maldives honeymoon cost?', 'Best time to visit Maldives for honeymoon?'],
      pageType: 'guide',
    },
    {
      keyword: 'best diving spots Maldives beginners and pros',
      longtails: ['Maldives diving season', 'whale shark diving Maldives'],
      questions: ['Where are the best dive sites in Maldives?', 'Can beginners dive in Maldives?'],
      pageType: 'guide',
    },
    {
      keyword: 'Maldives family vacation with kids guide',
      longtails: ['kid-friendly Maldives resorts', 'Maldives with toddlers tips'],
      questions: ['Which Maldives resorts have kids clubs?', 'Is Maldives safe for children?'],
      pageType: 'guide',
    },
    {
      keyword: 'Maldives on a budget tips and tricks',
      longtails: ['cheap Maldives guesthouses', 'local island Maldives experience'],
      questions: ['Can you visit Maldives on a budget?', 'How to save money in Maldives?'],
      pageType: 'guide',
    },
    {
      keyword: 'private island resorts Maldives exclusive review',
      longtails: ['one island one resort Maldives', 'most exclusive Maldives resort'],
      questions: ['Which Maldives resort is the most private?', 'Can you rent a private island in Maldives?'],
      pageType: 'list',
    },
  ];
}

export function getArabaldivesTopicsAR() {
  return [
    {
      keyword: 'أفضل فلل مائية فاخرة في المالديف 2026',
      longtails: ['فلل فوق الماء بمسبح خاص المالديف', 'منتجعات شاملة فلل مائية'],
      questions: ['ما هو أفضل منتجع فلل مائية في المالديف؟', 'هل تستحق الفلل المائية في المالديف؟'],
      pageType: 'list',
    },
    {
      keyword: 'منتجعات حلال في المالديف دليل شامل',
      longtails: ['طعام حلال منتجعات المالديف', 'فنادق المالديف صديقة للمسلمين'],
      questions: ['أي منتجعات المالديف تقدم طعام حلال؟', 'هل المالديف مناسبة للمسافرين المسلمين؟'],
      pageType: 'guide',
    },
    {
      keyword: 'دليل شهر العسل في المالديف للأزواج',
      longtails: ['منتجعات رومانسية المالديف', 'باقات شهر عسل المالديف شاملة'],
      questions: ['كم تكلفة شهر العسل في المالديف؟', 'أفضل وقت لزيارة المالديف لشهر العسل؟'],
      pageType: 'guide',
    },
    {
      keyword: 'أفضل مواقع الغوص في المالديف للمبتدئين والمحترفين',
      longtails: ['موسم الغوص المالديف', 'غوص مع أسماك القرش الحوتية المالديف'],
      questions: ['أين أفضل مواقع الغوص في المالديف؟', 'هل يمكن للمبتدئين الغوص في المالديف؟'],
      pageType: 'guide',
    },
    {
      keyword: 'إجازة عائلية في المالديف مع الأطفال',
      longtails: ['منتجعات المالديف المناسبة للأطفال', 'نصائح السفر للمالديف مع أطفال صغار'],
      questions: ['أي منتجعات المالديف بها نوادي أطفال؟', 'هل المالديف آمنة للأطفال؟'],
      pageType: 'guide',
    },
    {
      keyword: 'المالديف بميزانية محدودة نصائح وحيل',
      longtails: ['بيوت ضيافة رخيصة المالديف', 'تجربة الجزر المحلية المالديف'],
      questions: ['هل يمكن زيارة المالديف بميزانية محدودة؟', 'كيف توفر المال في المالديف؟'],
      pageType: 'guide',
    },
    {
      keyword: 'منتجعات جزر خاصة في المالديف مراجعة حصرية',
      longtails: ['جزيرة واحدة منتجع واحد المالديف', 'أكثر منتجع حصري في المالديف'],
      questions: ['ما هو أكثر منتجع خاص في المالديف؟', 'هل يمكنك استئجار جزيرة خاصة في المالديف؟'],
      pageType: 'list',
    },
  ];
}
```

### 4.2 Create Site-Specific Affiliate Rules

File: `lib/affiliates/rules/arabaldives.ts`

```typescript
export function getArabaldivesAffiliateRules() {
  return [
    {
      keywords: ['resort', 'villa', 'hotel', 'accommodation', 'booking', 'منتجع', 'فيلا', 'فندق', 'حجز', 'إقامة'],
      affiliates: [
        { name: 'Booking.com', url: 'https://www.booking.com/country/mv.html', param: '?aid=AFFILIATE_ID', category: 'resort' },
        { name: 'Agoda', url: 'https://www.agoda.com/maldives', param: '?cid=AFFILIATE_ID', category: 'resort' },
      ],
    },
    {
      keywords: ['diving', 'snorkeling', 'excursion', 'tour', 'activity', 'غوص', 'سنوركل', 'جولة', 'نشاط', 'رحلة'],
      affiliates: [
        { name: 'GetYourGuide', url: 'https://www.getyourguide.com/maldives-l97/', param: '?partner_id=AFFILIATE_ID', category: 'activity' },
        { name: 'Viator', url: 'https://www.viator.com/Maldives/d6023', param: '?pid=AFFILIATE_ID', category: 'activity' },
      ],
    },
    {
      keywords: ['flight', 'airline', 'seaplane', 'transfer', 'airport', 'طيران', 'طائرة', 'مطار', 'نقل', 'تحويل'],
      affiliates: [
        { name: 'Skyscanner', url: 'https://www.skyscanner.com/flights-to/mv/', param: '?associateid=AFFILIATE_ID', category: 'flights' },
        { name: 'Kiwi.com', url: 'https://www.kiwi.com/en/search/anywhere/maldives', param: '?affiliate=AFFILIATE_ID', category: 'flights' },
      ],
    },
    {
      keywords: ['insurance', 'travel insurance', 'safety', 'protection', 'تأمين', 'تأمين سفر', 'حماية', 'أمان'],
      affiliates: [
        { name: 'Allianz Travel', url: 'https://www.allianztravelinsurance.com', param: '?utm_source=arabaldives', category: 'insurance' },
      ],
    },
  ];
}
```

### 4.3 Update Daily Content Generator to Be Multi-Site

File: `app/api/cron/daily-content-generate/route.ts`

**Key change:** Instead of hardcoded Yalla London topics, load per-site:

```typescript
// At the top of generateDailyContent():
const { prisma } = await import('@/lib/db');
const activeSites = await prisma.site.findMany({
  where: { is_active: true, features_json: { path: ['contentGeneration'], equals: true } },
});

for (const site of activeSites) {
  await generateDailyContentForSite(site, prisma);
}
```

### 4.4 Update SEO Agent to Be Multi-Site

Same pattern — iterate over active sites, scope all queries by `site_id` or `siteId`.

---

## Phase 5: SEO Configuration

**Goal:** Sitemap, robots.txt, meta tags, and IndexNow all work for Arabaldives.

### 5.1 Update Sitemap Generator

File: `app/sitemap.ts`

The sitemap must include Arabaldives URLs when accessed from `arabaldives.com`:

```typescript
// Use the request hostname to determine which site's URLs to include
// Each site gets its own sitemap with its own domain prefix
```

### 5.2 Update robots.txt

File: `app/robots.ts`

```typescript
// Serve site-specific robots.txt with the correct sitemap URL
// arabaldives.com/robots.txt → Sitemap: https://arabaldives.com/sitemap.xml
```

### 5.3 Create IndexNow Verification File

File: `public/sites/arabaldives/[key].txt`

Generate a new IndexNow key for this domain. Store in env as `ARABALDIVES_INDEXNOW_KEY`
or use the shared `INDEXNOW_KEY` if submitting from the same server.

### 5.4 Google Search Console

- Add `arabaldives.com` as a property in GSC
- Verify via DNS TXT record or HTML file
- Submit sitemap URL

### 5.5 GA4 Property

- Create a new GA4 property for Arabaldives (or use a single property with site_id dimension)
- Add the Measurement ID to env: `ARABALDIVES_GA4_ID`

---

## Phase 6: PDF Guides & Digital Products

**Goal:** Maldives-specific PDF travel guides ready for generation and sale.

### 6.1 Create Arabaldives PDF Templates

The existing PDF generator at `lib/pdf/generator.ts` already supports multi-locale and templates.
Create Maldives-specific guide configurations:

```typescript
// Seed digital products
const guides = [
  {
    name_en: 'Ultimate Maldives Luxury Resort Guide',
    name_ar: 'دليل المنتجعات الفاخرة في المالديف',
    slug: 'maldives-luxury-resort-guide',
    price: 999,  // $9.99
    template: 'luxury',
  },
  {
    name_en: 'Maldives on a Budget: Complete Guide',
    name_ar: 'المالديف بميزانية محدودة: دليل شامل',
    slug: 'maldives-budget-guide',
    price: 499,  // $4.99
    template: 'budget',
  },
  {
    name_en: 'Maldives Honeymoon Planning Guide',
    name_ar: 'دليل التخطيط لشهر العسل في المالديف',
    slug: 'maldives-honeymoon-guide',
    price: 799,  // $7.99
    template: 'honeymoon',
  },
  {
    name_en: 'Maldives Family Vacation Guide',
    name_ar: 'دليل الإجازة العائلية في المالديف',
    slug: 'maldives-family-guide',
    price: 699,  // $6.99
    template: 'family',
  },
];
```

### 6.2 Stripe Product Setup

For each guide, create a Stripe product and price. Store the `price_id` in the DigitalProduct record.

---

## Phase 7: Vercel Deployment & DNS

**Goal:** Arabaldives live on its own domain.

### 7.1 Vercel Domain Configuration

**Option A: Same Vercel Project (recommended for shared crons)**

```bash
# Add domains to your existing Vercel project
vercel domains add arabaldives.com
vercel domains add www.arabaldives.com
```

**Option B: Separate Vercel Project (if you want isolated deployments)**

```bash
vercel link --project arabaldives
vercel env add SITE_ID    # = "arabaldives"
vercel env add NEXT_PUBLIC_SITE_URL  # = "https://arabaldives.com"
```

### 7.2 DNS Configuration

At your domain registrar (e.g., Namecheap, Cloudflare):

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 76.76.21.21 (Vercel) | 300 |
| CNAME | www | cname.vercel-dns.com | 300 |
| TXT | @ | (Google Search Console verification) | 300 |

### 7.3 SSL Certificate

Vercel auto-provisions SSL. Verify at: Vercel Dashboard > Settings > Domains.

### 7.4 Environment Variables for Arabaldives

Add to Vercel (or `.env`):

```env
# ARABALDIVES-SPECIFIC (add alongside existing Yalla London vars)
# Only needed if using separate Vercel projects:
# SITE_ID=arabaldives
# NEXT_PUBLIC_SITE_URL=https://arabaldives.com

# Shared across all sites (already set for Yalla London):
# DATABASE_URL=postgresql://...
# INDEXNOW_KEY=your-key
# ADMIN_EMAILS=your-email@domain.com
# OPENAI_API_KEY=...
# ABACUSAI_API_KEY=...
```

---

## Phase 8: Admin Dashboard Scoping

**Goal:** All admin pages respect the selected site.

### 8.1 Site Selector Integration

The site selector component already exists at `components/admin/site-selector.tsx`.
It stores the selected site in localStorage.

**Verify these admin pages scope by site_id:**

| Admin Page | API Route | Needs Scoping |
|------------|-----------|---------------|
| Articles | `/api/admin/content/articles` | Filter by `siteId` |
| Categories | `/api/admin/categories` | Filter by site-specific categories |
| Media | `/api/media` | Filter by site |
| Affiliates | `/api/affiliates/inject` | Load site-specific rules |
| SEO Reports | `/api/seo/health` | Filter by site |
| Analytics | `/api/admin/analytics` | Filter by site |
| Leads | `/api/admin/leads` | Filter by `site_id` |
| PDF Guides | `/api/products/pdf/generate` | Use site-specific branding |

### 8.2 Pass Site ID to All API Calls

Every admin API call should include the selected site:

```typescript
// In admin components:
const { currentSite } = useSite();
const response = await fetch(`/api/admin/articles?siteId=${currentSite.id}`);
```

---

## Phase 9: Testing & Verification Checklist

**Goal:** Verify everything works before launch.

### 9.1 Pre-Launch Checklist

```
[ ] Database: Site record exists (check /admin/command-center/sites/)
[ ] Database: Categories created for the niche
[ ] Database: System user created
[ ] Domain: DNS configured and propagated
[ ] Domain: SSL certificate issued by Vercel
[ ] Domain: Accessing arabaldives.com shows the correct site
[ ] Middleware: x-site-id header is "arabaldives"
[ ] Branding: Correct colors, logo, and RTL direction
[ ] Navigation: Links work and show Arabic labels
[ ] Content: At least 5 seed articles published
[ ] Sitemap: /sitemap.xml lists arabaldives.com URLs
[ ] Robots: /robots.txt has correct sitemap URL
[ ] SEO: Meta titles and descriptions in Arabic
[ ] SEO: OG images generated
[ ] IndexNow: Key verification file accessible
[ ] GSC: Property added and sitemap submitted
[ ] GA4: Property created, tracking code installed
[ ] Content Gen: Cron produces Arabaldives articles (test manually first)
[ ] SEO Agent: Cron audits Arabaldives posts
[ ] Affiliates: Rules loaded for Maldives niche
[ ] PDF Guides: Can generate a Maldives guide
[ ] Admin: Site selector shows Arabaldives
[ ] Admin: Switching to Arabaldives scopes all data
[ ] Newsletter: Subscription form works for arabaldives site_id
[ ] Performance: Page loads under 3 seconds
[ ] Mobile: RTL layout works on mobile
```

### 9.2 Manual API Tests

```bash
# Test content generation for Arabaldives
curl -X POST https://arabaldives.com/api/cron/daily-content-generate \
  -H "Authorization: Bearer $CRON_SECRET"

# Test SEO agent
curl -X POST https://arabaldives.com/api/cron/seo-agent \
  -H "Authorization: Bearer $CRON_SECRET"

# Test affiliate matching
curl "https://arabaldives.com/api/affiliates/inject?content=luxury+resort+maldives+diving" \
  -H "Cookie: your-admin-session"

# Test PDF generation
curl -X POST https://arabaldives.com/api/products/pdf/generate \
  -H "Content-Type: application/json" \
  -d '{"destination":"Maldives","template":"luxury","locale":"ar","free":true}'
```

---

## Phase 10: Launch & Monitoring

### 10.1 Post-Launch

1. Submit sitemap to Google Search Console
2. Submit URLs via IndexNow
3. Monitor Vercel function logs for errors
4. Check SEO agent reports in admin dashboard
5. Verify first auto-generated articles are published correctly

### 10.2 Ongoing Operations

| Task | Frequency | Automated? |
|------|-----------|-----------|
| Content generation | Daily (5am UTC) | Yes - cron |
| SEO audit | 3x daily (7am/1pm/8pm) | Yes - cron |
| Indexing submission | With each new article | Yes - in content gen |
| Affiliate injection | On demand | Admin triggers |
| PDF guide creation | On demand | Admin/customer triggers |
| Performance monitoring | Continuous | Vercel analytics |

---

## Adding a NON-TRAVEL Website (Template)

This same system works for **any niche**. Here's the minimum you need to change:

### Variables to Replace

| Variable | Travel Example | Tech Blog Example | Food Blog Example |
|----------|---------------|-------------------|-------------------|
| `site.id` | `arabaldives` | `tech-hub-me` | `halal-eats-london` |
| `site.name` | `Arabaldives` | `Tech Hub ME` | `Halal Eats London` |
| `site.domain` | `arabaldives.com` | `techhubme.com` | `halaleats.co.uk` |
| `site.niche` | `travel` | `technology` | `food` |
| `site.locale` | `ar` | `en` | `en` |
| Categories | Resorts, Villas, Diving | AI, Cloud, Startups | Restaurants, Recipes, Reviews |
| Topic bank | Maldives travel topics | Tech industry topics | Food & restaurant topics |
| Affiliate rules | Booking, Agoda, flights | Amazon, hosting, SaaS | OpenTable, Uber Eats, recipe boxes |
| AI system prompt | "luxury travel writer" | "tech journalist" | "food critic & recipe writer" |
| PDF templates | Travel guides | Tech whitepapers | Recipe collections |

### Files to Create Per New Site

```
1. scripts/seed-site-{site-id}.ts         — Database seed
2. lib/content/topic-banks/{site-id}.ts    — 7 EN + 7 AR topic banks
3. lib/affiliates/rules/{site-id}.ts       — Affiliate matching rules
4. public/sites/{site-id}/logo.png         — Brand assets
5. public/sites/{site-id}/og-default.jpg   — Default OG image
```

### Files to Update (One-Time Framework Changes)

```
1. middleware.ts                           — Add domain to DOMAIN_TO_SITE (or use DB resolver)
2. config/brand-templates.ts               — Add brand template
3. app/api/cron/daily-content-generate     — Load site-specific topics
4. app/api/cron/seo-agent                  — Scope by site_id
5. app/api/affiliates/inject               — Load site-specific rules
```

Once the framework changes (Phase 4.3, 4.4) are done to make the crons multi-site-aware,
adding a new site is **only** steps 1-5 from "Files to Create" above + DNS setup.

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    SINGLE NEXT.JS REPO                    │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ arabaldives │  │ yalla-london│  │ tech-hub-me │ ... │
│  │   .com      │  │   .com      │  │   .com      │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                │                │              │
│         ▼                ▼                ▼              │
│  ┌──────────────────────────────────────────────┐       │
│  │              MIDDLEWARE                       │       │
│  │  hostname → site_id → headers                │       │
│  └──────────────────────┬───────────────────────┘       │
│                         │                                │
│  ┌──────────────────────▼───────────────────────┐       │
│  │           TENANT CONTEXT                      │       │
│  │  x-site-id, x-site-name, x-site-locale      │       │
│  └──────────────────────┬───────────────────────┘       │
│                         │                                │
│  ┌──────────┬───────────┴────────────┬──────────┐       │
│  ▼          ▼                        ▼          ▼       │
│ Pages    API Routes              Crons      Admin       │
│ (SSR)    (scoped by             (iterate    (site       │
│          site_id)               all sites)  selector)   │
│                                                          │
│  ┌──────────────────────────────────────────────┐       │
│  │              SHARED DATABASE                  │       │
│  │  All tables have site_id for scoping         │       │
│  └──────────────────────────────────────────────┘       │
│                                                          │
│  ┌──────────────────────────────────────────────┐       │
│  │           AUTONOMOUS SYSTEMS                  │       │
│  │  • Daily content gen (per site)              │       │
│  │  • SEO agent (per site)                      │       │
│  │  • Affiliate injection (per site rules)      │       │
│  │  • PDF generation (per site branding)        │       │
│  └──────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────┘
```

---

## Estimated Work Per Phase

| Phase | Description | Claude Code Executable? | Manual Steps? |
|-------|-------------|------------------------|---------------|
| 1 | Database setup | Yes - create seed script & run it | None |
| 2 | Middleware routing | Yes - edit middleware.ts | None |
| 3 | Brand template | Yes - create theme config | Add logo/images manually |
| 4 | Content pipeline | Yes - create topic banks & rules | None |
| 5 | SEO config | Partially - code changes | GSC/GA4 setup manual |
| 6 | PDF guides | Yes - seed products | Stripe setup manual |
| 7 | Vercel/DNS | No | All manual (Vercel dashboard + DNS) |
| 8 | Admin scoping | Yes - update API queries | None |
| 9 | Testing | Partially - API tests | Visual verification manual |
| 10 | Launch | No | Manual monitoring |

**Claude Code can fully execute Phases 1-4 and 8.** Phases 5-7 and 9-10 need your input for external service credentials and DNS.
