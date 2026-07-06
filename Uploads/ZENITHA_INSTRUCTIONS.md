# CLAUDE.md — Zenitha Yachts Project Instructions

## Project Identity

Zenitha Yachts is a MENA-focused digital yacht charter and sales brokerage platform. The stack is Next.js / TypeScript / Vercel. The platform is deployment-ready and targets Arab and Israeli HNWIs for Mediterranean, Red Sea, and Gulf yacht charters. It supports three languages: Arabic (RTL), Hebrew (RTL), and English (LTR).

## Business Context

Read `EXECUTION_PLAN.md` in this repo before starting any task. It contains the full 90-day launch plan with phased action items, KPIs, and priorities. Every technical task you perform should map back to a specific action item in that plan.

### Core Business Model

- 15% charter commission on net base charter fee (owner-pays, industry standard)
- 10% yacht sales commission
- White-label hotel concierge partnerships
- Concierge add-on services (€500–2,000 per charter)
- Break-even: ~9 charters/year at ~€33K annual operating cost

### Target Users

1. **Charter clients (HNWI):** Gulf Arab UHNWIs (WhatsApp-driven, €50K–300K), Israeli tech entrepreneurs (€25K–80K), Arab diaspora luxury travelers (€20K–60K)
1. **Yacht owners/operators:** Turkey, Greece, Croatia, UAE fleet operators listing vessels
1. **B2B partners:** Luxury hotel concierge teams, travel agencies, corporate event planners

### Key Differentiators

- Only Arabic-language yacht charter platform in existence
- 288,000-member Arab travel Facebook community as warm audience
- Trilingual Arabic/Hebrew/English with proper RTL support
- Red Sea/Sindalah positioning for Gulf winter season

## Technical Standards

### Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **Deployment:** Vercel
- **i18n:** Next.js built-in i18n routing with RTL support for Arabic and Hebrew

### Code Conventions

- Use `src/` directory structure
- Components in `src/components/`, pages in `src/app/`
- All components must support RTL: use logical CSS properties (`ms-`, `me-`, `ps-`, `pe-`, `start`, `end`) instead of `left`/`right` where applicable
- Every user-facing string must be internationalized — no hardcoded English text in components
- Use Arabic-native fonts: Cairo, Tajawal, or Almarai (Google Fonts) for Arabic, not system defaults
- Mobile-first responsive design — the platform must be fully functional on 390px iPhone screens
- Images must use Next.js `<Image>` component with proper `alt` text in all three languages

### RTL Requirements (Critical)

RTL is not cosmetic — it requires genuine engineering:

- Mirrored navigation and layout flow
- RTL form fields and input direction
- Right-aligned CTA buttons in Arabic/Hebrew
- Mirrored icons (arrows, chevrons, navigation)
- Arabic-native font rendering with proper ligatures
- Test every component in both LTR and RTL before committing

### Performance Targets

- Lighthouse Performance: 90+
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Core Web Vitals: all green
- Image optimization: WebP format, lazy loading, proper srcset

## Feature Priorities (Mapped to Execution Plan)

When building features, follow this priority order. Each maps to a phase in `EXECUTION_PLAN.md`:

### P0 — Launch Blockers (Phase 0, Days 1–10)

- [ ] Production deployment pipeline (Vercel, DNS, SSL)
- [ ] Google Analytics 4 integration with event tracking
- [ ] Sitemap generation and Google Search Console submission
- [ ] Inquiry form that submits to CRM (HubSpot or Pipedrive API)
- [ ] WhatsApp Business deep link integration on all listing pages
- [ ] Payment integration (Stripe) for charter deposits (€5K–15K range)
- [ ] Basic SEO: meta tags, Open Graph, structured data (JSON-LD for Product/Service)

### P1 — Listing Infrastructure (Phase 1, Days 11–30)

- [ ] Yacht listing data model: specs (length, year, guests, cabins, crew), pricing (base rate + APA), availability calendar, photos (10+ per listing), crew profiles, insurance status, verified badge
- [ ] Listing detail page with: hero image gallery (swipeable on mobile), specs card above the fold, transparent pricing range, crew profiles section, verified badge, dual CTA (inquiry form + WhatsApp button), reviews section
- [ ] Admin panel for managing listings (add/edit/remove yachts, upload photos, set availability)
- [ ] Charter Index GraphQL API integration for pulling yacht data
- [ ] Listing search/filter: by destination, dates, guest count, yacht type, budget range
- [ ] 60-second walk-through video embed support on listing pages

### P2 — Client Experience (Phase 2, Days 31–50)

- [ ] Personalized yacht proposal PDF generation (branded, bilingual, with 2–3 yacht options, pricing breakdown, itinerary, crew profiles)
- [ ] Inquiry pipeline tracking (client-facing status updates via WhatsApp or email)
- [ ] Destination guide pages (SEO-optimized, Arabic + English): Greece, Turkey, Croatia, Red Sea, Dubai
- [ ] Arabic Yachting Glossary page (yacht types, charter terms, pricing explainers)

### P3 — Revenue Features (Phase 3, Days 51–90)

- [ ] Charter agreement e-signature flow (DocuSign or equivalent integration)
- [ ] Deposit payment and confirmation workflow
- [ ] Client testimonials/reviews display on listing pages and homepage
- [ ] Blog/content CMS for Arabic and Hebrew SEO articles (minimum 1,500 words each)
- [ ] Google Ads conversion tracking pixel integration

### P4 — Scale Features (Months 4–6)

- [ ] White-label booking portal (co-branded for hotel concierge partners)
- [ ] Halal-certified charter landing page and filter
- [ ] Referral program: unique referral links, 5% rebate tracking
- [ ] Corporate charter landing page for Gulf events
- [ ] A/B testing framework for inquiry flow (form vs. WhatsApp CTA)
- [ ] Fractional ownership information/inquiry pages

## Content & SEO Rules

### Arabic SEO (Highest Priority)

- Target zero-competition Arabic keywords: إيجار يخت اليونان, تأجير يخت فاخر, رحلة يخت البحر المتوسط, يخت البحر الأحمر
- Every article must be 1,500+ words, properly structured with H1/H2/H3
- Internal linking between destination guides, glossary, and listing pages
- Schema markup (Article, FAQPage, Product) on all content pages

### Hebrew SEO

- Target: השכרת יאכטה ביוון, יאכטה פרטית לוגה, שכירת יאכטה בים התיכון
- 3+ articles by Day 70

### Image SEO

- All yacht images must have descriptive alt text in the page’s active language
- File names should be descriptive (not IMG_001.jpg)
- Compress all images; serve WebP with JPEG fallback

## Testing Checklist (Before Every PR)

- [ ] Component renders correctly in English (LTR)
- [ ] Component renders correctly in Arabic (RTL)
- [ ] Component renders correctly in Hebrew (RTL)
- [ ] Mobile responsive (test at 390px width)
- [ ] Lighthouse score maintained at 90+
- [ ] No hardcoded strings — all text internationalized
- [ ] Forms submit correctly and data reaches CRM
- [ ] WhatsApp deep links open correctly on mobile
- [ ] Images optimized and lazy-loaded
- [ ] Accessibility: proper ARIA labels, keyboard navigation, contrast ratios

## Environment Variables

```
NEXT_PUBLIC_GA_ID=           # Google Analytics 4 measurement ID
NEXT_PUBLIC_WHATSAPP_NUMBER= # WhatsApp Business number
STRIPE_SECRET_KEY=           # Stripe secret key
STRIPE_PUBLISHABLE_KEY=     # Stripe publishable key
HUBSPOT_API_KEY=             # HubSpot CRM API key (or Pipedrive)
CHARTER_INDEX_API_KEY=       # Charter Index GraphQL API key
```

## Commit & PR Conventions

- Prefix commits with the execution plan action ID when applicable: `[0.1] Deploy platform to production`
- Use conventional commits: `feat:`, `fix:`, `content:`, `chore:`, `seo:`
- Every PR must include which execution plan phase and action item it addresses
- Keep PRs small and focused — one action item per PR when possible

## Key Files

- `EXECUTION_PLAN.md` — Full 90-day launch plan with action items and KPIs
- `src/app/[locale]/` — Locale-aware routing (en, ar, he)
- `src/i18n/` — Translation files
- `src/components/listings/` — Yacht listing components
- `src/components/inquiry/` — Inquiry and booking flow
- `public/` — Static assets, sitemap, robots.txt

## When in Doubt

1. Read `EXECUTION_PLAN.md` — every technical decision should serve a specific business action
1. Prioritize revenue-generating features (inquiry flow, WhatsApp, payments) over nice-to-haves
1. Mobile-first, Arabic-first — if it doesn’t work beautifully in Arabic on an iPhone, it’s not done
1. Ship fast, iterate later — 80% execution today beats 100% next month
1. The 60/30/10 rule: 60% of engineering time on revenue features, 30% on marketing/SEO infrastructure, 10% on admin/tooling
