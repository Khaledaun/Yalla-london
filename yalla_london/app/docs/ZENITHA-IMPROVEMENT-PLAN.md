# Zenitha Yachts — Comprehensive Improvement Plan

> Generated: 2026-02-24
> Purpose: Track all completed, in-progress, and future improvements for zenithayachts.com
> This document serves as the canonical roadmap for ongoing development and auditing.

---

## Table of Contents

1. [Completed Work (This Session)](#1-completed-work-this-session)
2. [Design & UX Improvements](#2-design--ux-improvements)
3. [SEO & AIO Enhancements](#3-seo--aio-enhancements)
4. [Content Strategy](#4-content-strategy)
5. [Lead Capture & Conversion](#5-lead-capture--conversion)
6. [Technical Infrastructure](#6-technical-infrastructure)
7. [Multi-Language & Localisation](#7-multi-language--localisation)
8. [Performance & Core Web Vitals](#8-performance--core-web-vitals)
9. [Analytics & Tracking](#9-analytics--tracking)
10. [Audit Checklist](#10-audit-checklist)

---

## 1. Completed Work (This Session)

### Phase 1: Shell, Layout, Navigation, Footer
| Item | Status | File(s) |
|------|--------|---------|
| Zenitha header rewrite — global nav, mobile hamburger, yacht-specific links | DONE | `components/zenitha/zenitha-header.tsx` |
| Zenitha footer rewrite — multi-column, destination links, social, global brand copy | DONE | `components/zenitha/zenitha-footer.tsx` |

### Phase 3: SEO Foundations
| Item | Status | File(s) |
|------|--------|---------|
| `/fleet` landing page — 4 yacht types, trust signals, ItemList JSON-LD | DONE | `app/fleet/page.tsx` |
| `/journal` index page — article hub, DB-first with static fallback, ItemList JSON-LD | DONE | `app/journal/page.tsx`, `app/journal/layout.tsx` |
| `/journal/[slug]` article template — Article JSON-LD, BreadcrumbList, sanitized HTML | DONE | `app/journal/[slug]/page.tsx` |
| Sitemap updated with `/fleet` and `/journal` | DONE | `app/sitemap.ts` |

### Phase 4: AIO / Answer Engine Optimization
| Item | Status | File(s) |
|------|--------|---------|
| `llms.txt` updated with `/fleet`, `/journal`, `/journal/[slug]` | DONE | `app/llms.txt/route.ts` |
| FAQPage JSON-LD added to `/how-it-works` with 6 charter-specific questions | DONE | `app/how-it-works/page.tsx` |

### Phase 5: Organic Content Structure
| Item | Status | File(s) |
|------|--------|---------|
| Journal hub with featured articles grid + category filter UI | DONE | `app/journal/page.tsx` |
| Journal article template with author byline, read time, internal CTAs | DONE | `app/journal/[slug]/page.tsx` |

### Phase 6: Lead Capture
| Item | Status | File(s) |
|------|--------|---------|
| Contact form: added country of residence (14 countries) | DONE | `components/zenitha/zenitha-contact.tsx` |
| Contact form: added preferred contact method (Email/WhatsApp/Phone) | DONE | `components/zenitha/zenitha-contact.tsx` |

### Phase 7: Cleanup
| Item | Status | File(s) |
|------|--------|---------|
| Removed `font-mono` from destination card price displays | DONE | `app/destinations/page.tsx` |
| Updated homepage CTAs from `/yachts` to `/fleet` | DONE | `components/zenitha/zenitha-homepage.tsx` |

---

## 2. Design & UX Improvements

### HIGH Priority
| Item | Description | Effort |
|------|------------|--------|
| **Yacht type pages** | Create dedicated pages for `/fleet/motor-yachts`, `/fleet/sailing-yachts`, `/fleet/catamarans`, `/fleet/gulets` with detailed content, specs, and DB-driven yacht listings per type | Large |
| **Image optimisation** | Replace Unsplash placeholder URLs with self-hosted, optimised WebP images. Add blur placeholders. Implement `next/image` with proper `sizes` attributes | Medium |
| **Dark/light mode** | Zenitha tokens already support dark navy — add user-preference toggle for pages like journal articles | Small |
| **Micro-interactions** | Add subtle hover states on yacht cards (parallax tilt, image zoom), smooth scroll-reveal on all sections | Medium |
| **Mobile UX audit** | Test all pages on iPhone 14/15 Pro — verify touch targets ≥48px, no horizontal scroll, all CTAs reachable with one hand | Small |
| **Loading states** | Add skeleton loaders for yacht search results, journal articles, and destination listings | Small |

### MEDIUM Priority
| Item | Description | Effort |
|------|------------|--------|
| **Destination landing page sections** | Add "Typical Itineraries", "Best Time to Visit", "Local Cuisine" structured sections to each destination detail page | Large |
| **Gallery component** | Lightbox gallery for yacht detail pages — swipe on mobile, keyboard nav on desktop | Medium |
| **Comparison tool** | "Compare Yachts" feature — side-by-side specs, pricing, amenities for up to 3 yachts | Large |
| **Print-friendly charter planner** | Allow users to print/export their charter plan from `/charter-planner` as PDF | Medium |

---

## 3. SEO & AIO Enhancements

### HIGH Priority
| Item | Description | Files |
|------|------------|-------|
| **Per-destination JSON-LD** | Add `TouristDestination` schema to each destination detail page | `app/destinations/[slug]/page.tsx` |
| **Breadcrumbs on all pages** | Verify BreadcrumbList structured data renders correctly on every yacht, destination, and itinerary page | All layout.tsx files |
| **hreflang implementation** | Confirm ar-SA alternates work end-to-end — Arabic routes must return actual Arabic content, not just English with RTL styling | All pages |
| **Canonical tags audit** | Ensure no duplicate content between `/yachts/[slug]` and `/fleet` pages | All yacht pages |
| **Internal linking strategy** | Every journal article should link to ≥2 destination pages and ≥1 yacht type page. Every destination page should link to related itineraries and journal articles | Content pipeline |
| **OG images** | Create branded OG images for each page template (fleet, journal, destination, yacht detail) — not generic fallback | `public/images/` |

### MEDIUM Priority
| Item | Description | Files |
|------|------------|-------|
| **Video schema** | Add `VideoObject` JSON-LD when yacht detail pages contain video tours | Schema generator |
| **Review schema** | Once real reviews exist, add `AggregateRating` to yacht detail pages | Yacht detail page |
| **SiteNavigationElement** | Add structured data for site navigation to improve sitelinks | Root layout |
| **FAQ expansion** | Add FAQPage JSON-LD to `/faq`, `/charter-planner`, each destination page | Multiple pages |
| **Image SEO** | Add descriptive `alt` text, proper `title` attributes, and image filenames containing keywords | All pages |
| **Search console** | Set up GSC property for zenithayachts.com, submit sitemap, monitor index coverage | External |

### AIO-Specific
| Item | Description | Priority |
|------|------------|----------|
| **llms.txt expansion** | Add yacht type details, per-destination summaries, pricing ranges, and FAQ content to llms.txt | HIGH |
| **Structured FAQ on every content page** | Google AI Overviews heavily pull from FAQ-structured content — add to destinations and yacht pages | HIGH |
| **Citation-ready content** | Every journal article should include specific facts, figures, and dates that AI systems can cite accurately | MEDIUM |
| **robots.txt for AI crawlers** | Add explicit `User-agent: GPTBot`, `User-agent: ClaudeBot` etc. with `Allow: /` directives | MEDIUM |

---

## 4. Content Strategy

### Journal Content Calendar (First 30 Days)
| Week | Article Topics | Category |
|------|---------------|----------|
| 1 | "Your First Charter: A Complete Beginner's Guide" | Charter Guides |
| 1 | "Greek Islands: A 7-Day Cyclades Sailing Itinerary" | Itineraries |
| 2 | "Halal Catering on Mediterranean Charters: What to Expect" | Charter Experience |
| 2 | "Motor Yacht vs Catamaran: Which Is Right for Your Group?" | Charter Guides |
| 3 | "Croatian Coast: Dubrovnik to Split in 5 Days" | Itineraries |
| 3 | "Family-Friendly Charter Destinations for Summer 2026" | Destinations |
| 4 | "The Blue Cruise: Turkey's Best-Kept Sailing Secret" | Destinations |
| 4 | "What Does a Yacht Charter Actually Cost? A Transparent Breakdown" | Charter Guides |

### Content Types to Build
| Type | Description | Priority |
|------|------------|----------|
| **Destination guides** | In-depth 2,000+ word guides for each destination (Greek Islands, Croatian Coast, Turkish Riviera, French Riviera, Amalfi Coast, Arabian Gulf) | HIGH |
| **Yacht comparison articles** | "Best Catamarans for Large Groups", "Top Motor Yachts Under €30,000/week" | HIGH |
| **Seasonal content** | "Best Time to Charter in the Mediterranean", "Off-Season Charter Deals" | HIGH |
| **Experience articles** | "A Day in the Life on a Charter Yacht", "What to Pack for a Mediterranean Charter" | MEDIUM |
| **Local guides** | Port-specific guides: "Best Restaurants Near Piraeus Marina", "Provisioning in Dubrovnik" | MEDIUM |
| **Video content** | Drone footage compilations, captain interviews, yacht walkthroughs | LOW (future) |

### Authenticity Signals (Google Jan 2026 Compliance)
- Every article MUST include ≥3 first-hand experience markers (sensory details, insider tips, personal observations)
- No AI-generic phrases: "nestled in the heart of", "In conclusion", "Whether you're a"
- Author bylines with verifiable digital footprint
- Original photography preferred over stock images
- Include at least one "honest limitation" per article (imperfection signals authenticity)

---

## 5. Lead Capture & Conversion

### HIGH Priority
| Item | Description | Effort |
|------|------------|--------|
| **Newsletter signup** | Add email capture component to journal pages, footer, and homepage. Integrate with email service (Resend/SendGrid) | Medium |
| **Exit-intent popup** | On desktop, show charter consultation offer when mouse moves to close tab — mobile: show after 60s on page | Medium |
| **WhatsApp floating button** | Add WhatsApp click-to-chat button on all pages — opens pre-filled message with page context | Small |
| **Lead scoring** | Score inquiries based on: country (GCC = high), timeline (< 3 months = high), yacht type preference, budget range | Medium |
| **CRM integration** | Pipe CharterInquiry records to a CRM (HubSpot Free, Pipedrive, or custom admin pipeline) | Large |

### MEDIUM Priority
| Item | Description | Effort |
|------|------------|--------|
| **Charter planner email** | After completing the AI charter planner, email the plan to the user as a branded PDF | Medium |
| **Social proof** | Show "X inquiries this month" or "Y charters booked" counter (real data only, no fakes) | Small |
| **Testimonial collection** | Post-charter email flow requesting reviews — feed into review schema on yacht pages | Large |
| **Retargeting pixels** | Add Meta Pixel, Google Ads tag, LinkedIn Insight for retargeting charter page visitors | Small |

### Conversion Tracking
| Event | Where | Priority |
|-------|-------|----------|
| `form_submit` | Contact form, Inquiry form, Charter planner | HIGH |
| `newsletter_signup` | Footer, Journal pages | HIGH |
| `whatsapp_click` | Floating button, Contact page | HIGH |
| `yacht_view` | Yacht detail page | MEDIUM |
| `itinerary_save` | Charter planner | MEDIUM |
| `destination_explore` | Destination detail page | LOW |

---

## 6. Technical Infrastructure

### HIGH Priority
| Item | Description | Effort |
|------|------------|--------|
| **Database seeding** | Create seed script for yacht inventory (10-20 sample yachts), destinations, and itineraries — essential for development and demo | Medium |
| **API endpoint for journal articles** | Public API route for fetching journal articles by category, destination tag, pagination | Small |
| **Image CDN** | Set up Cloudflare Images or Vercel Image Optimization for yacht photos — proper srcset, WebP, blur placeholders | Medium |
| **Error monitoring** | Set up Sentry or equivalent for runtime error tracking — critical for catching crashes Khaled can't see | Medium |
| **Automated backups** | Daily Supabase database backup with 30-day retention | Small |

### MEDIUM Priority
| Item | Description | Effort |
|------|------------|--------|
| **NauSYS/MMK integration** | Connect to yacht listing APIs for real-time inventory — currently manual admin entry only | Large |
| **Email transactional** | Inquiry confirmation emails, charter planner results, newsletter welcome sequence | Medium |
| **Rate limiting** | Implement rate limiting on public form endpoints (inquiry, contact) — currently no protection | Small |
| **Search functionality** | Add search to yacht listings, journal articles — possibly Algolia or client-side fuzzy search | Medium |
| **Caching strategy** | ISR for yacht detail pages (revalidate: 3600), static for fleet/destinations, dynamic for search | Medium |

---

## 7. Multi-Language & Localisation

### HIGH Priority
| Item | Description | Effort |
|------|------------|--------|
| **Arabic content for yacht pages** | All yacht, destination, and itinerary content needs `content_ar` fields populated | Large |
| **RTL layout testing** | Full RTL pass on all Zenitha pages — especially forms, cards, and navigation | Medium |
| **Arabic journal articles** | Content pipeline should produce bilingual journal articles (EN + AR) | Medium |
| **Locale-specific pricing** | Show prices in local currency based on user's country (€ for Europe, $ for US, ر.س for Saudi Arabia) | Medium |

### MEDIUM Priority
| Item | Description | Effort |
|------|------------|--------|
| **French/German landing pages** | High-intent markets — create targeted landing pages in French and German | Large |
| **Locale-specific CTAs** | "WhatsApp Us" prominent for GCC visitors, "Email Us" for European visitors | Small |
| **Date formatting** | Use locale-appropriate date formats (DD/MM for UK, MM/DD for US, Hijri option for GCC) | Small |

---

## 8. Performance & Core Web Vitals

### Targets
| Metric | Target | Current |
|--------|--------|---------|
| LCP (Largest Contentful Paint) | ≤ 2.5s | Needs measurement |
| INP (Interaction to Next Paint) | ≤ 200ms | Needs measurement |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | Needs measurement |
| Total Bundle Size | < 200KB (first load JS) | Needs measurement |
| Time to First Byte | < 600ms | Needs measurement |

### Action Items
| Item | Priority | Effort |
|------|----------|--------|
| Run Lighthouse audit on all Zenitha pages | HIGH | Small |
| Implement `next/image` with proper `sizes` on all yacht/destination images | HIGH | Medium |
| Lazy-load below-fold sections (testimonials, FAQ, newsletter) | HIGH | Small |
| Preload critical fonts (Playfair Display, DM Sans) | MEDIUM | Small |
| Move inline styles to CSS custom properties where repeated | MEDIUM | Medium |
| Add `loading="lazy"` to all non-critical images | MEDIUM | Small |
| Implement route-level code splitting for admin vs public pages | LOW | Large |

---

## 9. Analytics & Tracking

### Setup Required
| Item | Priority | Status |
|------|----------|--------|
| GA4 property for zenithayachts.com | HIGH | Not started |
| Google Search Console verification | HIGH | Not started |
| Conversion goals in GA4 (inquiry submit, newsletter signup, WhatsApp click) | HIGH | Not started |
| UTM parameter tracking for social/email campaigns | MEDIUM | Not started |
| Custom dimensions: country, preferred_contact, inquiry_subject | MEDIUM | Not started |
| Real-time dashboard for Khaled (Looker Studio or admin page) | MEDIUM | Not started |

---

## 10. Audit Checklist

Run this checklist before every major deployment:

### SEO
- [ ] All pages have unique `<title>` and `<meta name="description">`
- [ ] All pages have canonical tags
- [ ] hreflang alternates present and reciprocal
- [ ] JSON-LD validates (test at schema.org/validator)
- [ ] Sitemap includes all public URLs
- [ ] robots.txt allows indexing of all public pages
- [ ] No broken internal links (run `npm run audit:master`)
- [ ] OG images render correctly when shared on social media

### Content Quality
- [ ] All published articles ≥ 1,000 words
- [ ] All articles contain ≥ 3 internal links
- [ ] All articles contain ≥ 2 affiliate/booking links
- [ ] All articles have author attribution
- [ ] All articles pass authenticity signals check (≥ 3 experience markers)
- [ ] No AI-generic phrases in published content
- [ ] Meta titles 30-60 characters
- [ ] Meta descriptions 120-160 characters

### Technical
- [ ] Zero TypeScript errors
- [ ] All admin API routes have `withAdminAuth`
- [ ] All DB queries scoped by `siteId`
- [ ] No hardcoded domain URLs (use `getBaseUrl()`)
- [ ] No `dangerouslySetInnerHTML` without `sanitizeHtml()`
- [ ] All forms have CSRF protection
- [ ] No sensitive data in public API responses
- [ ] Budget guards on all cron jobs (53s limit)

### Performance
- [ ] Lighthouse Performance ≥ 80
- [ ] LCP ≤ 2.5s on mobile
- [ ] CLS ≤ 0.1
- [ ] INP ≤ 200ms
- [ ] No render-blocking resources
- [ ] Images optimised (WebP, proper sizes)

### Accessibility
- [ ] All images have descriptive alt text
- [ ] Colour contrast ratio ≥ 4.5:1 for text
- [ ] All interactive elements keyboard-accessible
- [ ] Form fields have associated labels
- [ ] Focus states visible on all interactive elements
- [ ] Screen reader tested (VoiceOver on iOS)

---

## Priority Matrix

| Priority | Items | Timeframe |
|----------|-------|-----------|
| **P0 — Launch Blockers** | Database seeding, GA4 setup, GSC verification, OG images | Before first traffic |
| **P1 — First 30 Days** | Journal content calendar (8 articles), newsletter signup, WhatsApp button, Lighthouse audit | Days 1-30 |
| **P2 — First 90 Days** | Destination guides, yacht type pages, Arabic content, CRM integration, image CDN | Days 30-90 |
| **P3 — Optimisation** | Comparison tool, video content, NauSYS integration, A/B testing, retargeting | Days 90+ |

---

## Notes for Future Auditors

1. **Always run `npm run audit:master -- --site=zenitha-yachts-med`** before declaring any page "SEO ready"
2. **Check the 13-point pre-publication gate** in `lib/seo/orchestrator/pre-publication-gate.ts` — it catches most content quality issues
3. **Use the smoke test suite** (`npx tsx scripts/smoke-test.ts`) — currently 78+ tests, should be expanded for yacht-specific routes
4. **Reference `lib/seo/standards.ts`** for all threshold values — this is the single source of truth
5. **Never hardcode zenithayachts.com** — always use `getBaseUrl()` or `getSiteDomain()`
6. **All yacht DB queries must include `siteId: 'zenitha-yachts-med'`** — never query globally
7. **The contact form now captures country + preferred contact** — use this data for lead scoring and locale-specific follow-up
