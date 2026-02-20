# Design Features Audit — Comprehensive Report

**Date:** February 20, 2026
**Scope:** All design, visual editing, branding, PDF, email, video, and media tools across the Yalla London platform
**Audited By:** Claude (5 parallel deep-exploration agents)

---

## Executive Summary

The platform has **7 design-related admin pages** and a substantial codebase of design components and libraries. However, the gap between **UI that exists** and **features that work end-to-end** is significant. The biggest wins are in the **Design Studio** (canvas editor is real and working) and **Media Library** (S3-backed, functional). The biggest gaps are in **PDF generation** (HTML only, no binary PDF), **email design** (no visual builder), and **video export** (browser preview only, no server-side rendering).

### Readiness Scorecard

| Feature Area | UI Exists | Backend Works | End-to-End | Score |
|---|---|---|---|---|
| Design Studio (Canvas Editor) | Yes | Yes | Partial (export = PNG only) | **75%** |
| Media Library | Yes | Yes | Yes (S3 upload/manage) | **90%** |
| Brand Assets | Yes | Partial | Partial (London only) | **60%** |
| PDF Generation | Yes | Partial | No (HTML only, no binary PDF) | **30%** |
| Video Studio | Yes | Partial | No (browser preview only) | **40%** |
| Email Design/Builder | No | Partial | No (notifications only) | **15%** |
| Social Post Design | Yes | Yes | Partial (no platform publish) | **50%** |
| Homepage Builder | Yes | Yes | Partial (basic modules) | **55%** |
| Article Editor | Yes | Partial | Partial (rich text, no visual) | **50%** |
| Photo Pool | Yes | Partial | Partial (mock fallback) | **55%** |

---

## 1. Design Studio (Canva-Like Editor)

### Status: FUNCTIONAL — Core canvas editor works, template system works

### What Exists

**Admin Page:** `/admin/design-studio` (1,291 lines)
5 tabs: Templates, Visual Editor, Similar Design (AI), Media Pool, Preview

**Canvas Components** (4 files in `components/design-studio/`):

| Component | File | Lines | Status |
|---|---|---|---|
| DesignCanvas | `design-canvas.tsx` | 799 | Working — Konva.js interactive canvas |
| EditorToolbar | `editor-toolbar.tsx` | 320 | Working — add elements, text formatting, zoom, export |
| LayersPanel | `layers-panel.tsx` | 117 | Working (basic) — layer selection, no reorder |
| PropertiesPanel | `properties-panel.tsx` | 296 | Working — position, opacity, rotation, text/shape props |

**Backend** (3 API routes):
- `GET/POST /api/admin/design-studio` — List/generate templates
- `POST /api/admin/design-studio/analyze` — AI vision design analysis (Claude + OpenAI fallback)
- `GET/POST/PATCH/DELETE /api/admin/design-studio/media-pool` — Media asset CRUD

**Library** (`lib/pdf/brand-design-system.ts`, 627 lines):
- 8 template categories: travel-guide, social-post, flyer, menu, itinerary, infographic, poster, brochure
- Per-site brand profiles with colors, fonts, domain
- Format support: A4, A5, letter, all social media sizes (Instagram, Facebook, Twitter, LinkedIn, TikTok, YouTube, Pinterest)
- `renderDesignToHTML()` for server-side preview

**AI Design Analyzer** (`lib/pdf/design-analyzer.ts`, 443 lines):
- Upload reference image -> Claude Vision API analyzes layout, colors, typography, mood
- `generateDesignFromAnalysis()` creates brand-adapted template from analysis
- Falls back to OpenAI Vision, then default analysis

**Dependencies installed:** `konva` (10.2.0), `react-konva` (19.2.2)

### What Works
- Browse and generate brand-aware templates (all 8 categories, all 5 sites)
- Interactive canvas editing: drag, resize, rotate elements
- 6 element types: text, image, shape, divider, logo, QR code
- Double-click text to edit inline
- Undo/redo with keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)
- Multi-page document support with page switcher
- Text formatting: font, size, color, alignment, line height
- Shape properties: fill, stroke, border radius
- Bilingual support (EN/AR with RTL direction detection)
- Export to PNG (2x pixel ratio)
- AI "Similar Design" — upload image, get brand-adapted template
- Media pool integration with upload, AI enrichment, search, filter

### What's Missing or Broken

| Gap | Severity | Description |
|---|---|---|
| No SVG/PDF export | HIGH | Canvas only exports PNG. No vector format export. |
| No save/load designs | HIGH | Designs exist only in browser state. No persistence to database. Closing the tab loses everything. |
| No design history/gallery | HIGH | No way to see previously created designs. |
| No layer reorder | MEDIUM | Layers panel shows layers but cannot drag to reorder. |
| No layer visibility toggle | MEDIUM | Eye icon exists but not functional. |
| No layer lock/unlock | LOW | Lock indicator shows but no toggle action. |
| No image upload to canvas | MEDIUM | Can add image element but must provide URL. No direct file upload into canvas. |
| No QR code generation | MEDIUM | QR element type defined but no QR rendering library installed. |
| No template preview thumbnails | LOW | Templates list shows names but no visual preview. |
| No collaborative editing | LOW | Single-user only. |
| No design versioning | LOW | No undo history persistence across sessions. |

---

## 2. PDF Generation

### Status: STUBBED — HTML generation works, no binary PDF output

### What Exists

**Admin Pages (2):**
- `/admin/pdf-generator` — Simple 5-template PDF generator (mock progress, no real generation)
- `/admin/command-center/products/pdf` — Multi-step wizard with pricing options (lead capture, paid)

**API Routes (4):**

| Route | Status | Issue |
|---|---|---|
| `/api/admin/command-center/products/pdf` | WILL CRASH | Uses `prisma.pdfGuide` — model does NOT exist in schema |
| `/api/admin/command-center/products/pdf/generate` | WILL CRASH | Same — `prisma.pdfGuide` not in schema |
| `/api/admin/command-center/products/pdf/download` | WILL CRASH | Uses `prisma.pdfDownload` — not in schema |
| `/api/products/pdf/generate` | PARTIAL | Uses real models (DigitalProduct, Purchase, Lead). Returns HTML, not PDF binary. |

**Library** (`lib/pdf/generator.ts`, 621 lines):
- AI content generation via Claude API (with mock fallback)
- 5 template styles: luxury, budget, family, adventure, honeymoon
- Bilingual HTML rendering with RTL Arabic support
- `generatePDFContent()` — creates content sections via AI
- `generatePDFHTML()` — renders to responsive HTML string
- Section types: intro, resorts/hotels, activities, dining, travel tips, packing list, affiliate box

**Dependencies:** `puppeteer` (24.22.0) is installed but NOT USED anywhere in the codebase.

### What Works
- AI-generated content for travel guide sections (Claude API with fallback)
- HTML rendering with proper branding, colors, typography
- RTL Arabic layout support
- 5 style templates with different color schemes
- Content section structuring (intro, activities, dining, etc.)

### What's Missing or Broken

| Gap | Severity | Description |
|---|---|---|
| No binary PDF generation | CRITICAL | HTML is generated but never converted to PDF. Puppeteer is installed but unused. |
| PdfGuide model missing from Prisma | CRITICAL | 3 API routes reference `prisma.pdfGuide` / `prisma.pdfDownload` which don't exist. All will crash at runtime. |
| PDF generator page is mock | HIGH | `/admin/pdf-generator` simulates progress with `setTimeout`, generates fake sections locally. Never calls backend. |
| No download endpoint | HIGH | No route serves actual PDF binary for download. |
| No PDF preview | MEDIUM | No way to preview generated PDF in browser. |
| No PDF templates library | MEDIUM | Templates are code-defined, not visual. Cannot edit template layout. |
| No lead gating works | MEDIUM | Download tracking requires PdfDownload model that doesn't exist. |

---

## 3. Video Studio

### Status: PARTIAL — Browser preview works, no server-side video rendering

### What Exists

**Admin Page:** `/admin/video-studio` (625 lines)
4 tabs: Create, Preview, Templates, Settings

**Components (2):**
- `components/video-studio/video-composition.tsx` — Remotion composition with scenes
- `components/video-studio/video-player.tsx` — Browser-based video player

**Library:**
- `lib/video/brand-video-engine.ts` — Video template generation, scene creation
- `lib/design/video-presets.ts` — Format presets and category definitions

**API Route:** `GET /api/admin/video-studio` — Generate video config

**Dependencies installed:** `remotion` (4.0.420), `@remotion/cli`, `@remotion/player`, `@remotion/renderer`

### What Works
- 10 video categories (destination highlight, blog promo, hotel showcase, etc.)
- 10 video formats (Instagram Reel/Post/Story, YouTube Short/Video, TikTok, etc.)
- All 5 sites supported with brand-specific styling
- Bilingual video content (EN/AR)
- Browser-based video preview via Remotion Player
- Scene-by-scene configuration with titles, subtitles, images
- Duration and FPS customization

### What's Missing or Broken

| Gap | Severity | Description |
|---|---|---|
| No server-side MP4 rendering | CRITICAL | Videos can only be previewed in browser. Cannot export to MP4 file. Requires Remotion Lambda or Cloud Run. |
| No video download | HIGH | No endpoint to download rendered video file. |
| No video library/gallery | HIGH | Created videos not saved. No way to browse past creations. |
| No scene editor | MEDIUM | Scenes are auto-generated from template. Cannot visually edit individual scenes. |
| No audio/music support | MEDIUM | No background music or audio track capabilities. |
| No text animation options | MEDIUM | Text appears statically. No entrance/exit animations configurable. |
| No image/media picker integration | LOW | Must paste image URLs manually. Not connected to media library. |
| No batch video generation | LOW | Can only create one video at a time. |

---

## 4. Email Design & Builder

### Status: MINIMAL — Notification system works, no visual email builder exists

### What Exists

**Notification System** (`lib/email-notifications.ts`):
- Sends HTML notification emails on article publish
- Supports 3 providers: Resend, SendGrid, SMTP/Nodemailer
- Responsive, mobile-friendly HTML email template
- Unsubscribe link with email & site params
- Fallback to console logging when no provider configured

**Email Marketing Integration** (`lib/integrations/email-marketing.ts`):
- Provider-agnostic wrapper: Mailchimp, ConvertKit, SendGrid
- Subscriber management with bilingual support
- Welcome email templates (EN/AR) with hardcoded HTML
- Campaign creation interfaces defined but not fully implemented

**Components:**
- `components/newsletter-signup.tsx` — Bilingual signup form (working, posts to API)
- `components/marketing/email-capture.tsx` — Email capture component
- `components/admin/homepage-builder/modules/newsletter-module-preview.tsx` — Homepage newsletter section preview

### What Works
- Article publish notifications sent to confirmed subscribers
- Multi-provider email sending (Resend, SendGrid, SMTP)
- Newsletter signup form on public site
- Welcome email template (basic HTML)

### What's COMPLETELY Missing

| Gap | Severity | Description |
|---|---|---|
| No visual email builder | CRITICAL | No drag-and-drop or WYSIWYG email designer. All emails are hardcoded HTML strings. |
| No email template library | CRITICAL | Cannot browse, select, or customize email templates. |
| No email campaign manager | HIGH | Cannot create, schedule, or track email campaigns from dashboard. |
| No email preview | HIGH | Cannot preview how email looks before sending. |
| No A/B testing for emails | MEDIUM | Cannot test subject lines or content variants. |
| No email analytics | MEDIUM | No open rate, click rate, or bounce tracking visible in dashboard. |
| No email sequence/drip | MEDIUM | No automated email sequences (welcome series, nurture, etc.). |
| No admin page for emails | HIGH | No `/admin/email` or `/admin/campaigns` page exists. |
| No provider configuration UI | MEDIUM | Email providers must be configured via env vars only. |
| No email design for PDF delivery | LOW | Purchase confirmation emails are basic HTML, not branded. |

**Note:** `nodemailer`, `resend`, and `@sendgrid/mail` are NOT in `package.json`. The email-notifications code references them but they would need to be installed.

---

## 5. Social Post Design & Management

### Status: PARTIAL — Post scheduling works, no visual post designer

### What Exists

**Admin Page:** `/admin/command-center/social` (social media command center)
3 tabs: Posts, Connected Accounts, Analytics

**Features that work:**
- Create text posts with platform selection (Twitter, Instagram, Facebook, LinkedIn, TikTok)
- Schedule posts for future publication
- Post status management (draft, scheduled, published, failed)
- Character counter (280 limit)
- Delete posts
- DB-backed via `ScheduledContent` table

**Social Embeds Manager** (`components/admin/social-embeds-manager.tsx`):
- Add social media embed URLs
- Extract platform and embed info
- Preview embeds in grid
- Copy embed code
- DB-backed via `SocialEmbed` table

### What's Missing

| Gap | Severity | Description |
|---|---|---|
| No visual post designer | HIGH | Cannot design social images/graphics. Text-only post creation. |
| No platform publishing | HIGH | Posts are saved to DB but never actually published to social platforms. No API integration with Twitter, Instagram, etc. |
| "Generate with AI" button is dead | MEDIUM | Button exists but has no handler. |
| No image/graphic attachment | MEDIUM | Media upload UI exists but no visual design tools for post graphics. |
| No connected accounts actually work | MEDIUM | Account connection UI shown but no OAuth flows implemented. |
| No analytics from platforms | MEDIUM | Analytics tab shows empty state. No platform API integration. |
| No content repurposing | LOW | No tool to convert blog posts to social media content automatically. |

---

## 6. Brand Assets & Logo Management

### Status: PARTIAL — Yalla London complete, other 4 sites missing

### What Exists

**Admin Page:** `/admin/brand-assets` (wrapper + component)
**Component:** `components/admin/brand-assets-library.tsx` (590 lines)
4 tabs: Colors, Typography, Logos, Design System

**Features that work:**
- 6 brand colors displayed with HEX/RGB codes (copy to clipboard)
- 4 SVG logo variations generated dynamically (Primary Dark/Light, Icon Dark/Light)
- Typography showcase with Google Fonts links (Anybody EN, Cairo AR)
- Design elements with CSS snippets (shadows, gradients, border radius)
- Uses site context from `useSite()` hook for dynamic colors

**Brand Design System** (`lib/pdf/brand-design-system.ts`, 627 lines):
- Per-site brand profiles (colors, fonts, domain) for all 5 sites
- Template generation with brand-specific styling
- Format-aware dimensions (print, social, generic)

**Destination Themes** (`config/destination-themes.ts`):
- Complete theme definitions for all 5 sites
- Colors, fonts, textures, patterns, mood descriptors

### What's Missing

| Gap | Severity | Description |
|---|---|---|
| Only Yalla London brand assets complete | HIGH | Other 4 sites have config but no admin assets page content. (KG-027) |
| No logo design/generation tool | HIGH | Logos are SVG templates with color swaps only. No AI logo generation. |
| No brand kit export | MEDIUM | Cannot download complete brand kit (ZIP with all assets). Download button exists but no handler. |
| No brand guidelines PDF | MEDIUM | "Download Brand Guidelines" button exists but generates nothing. |
| No custom color picker | LOW | Colors are from site config only. Cannot customize in UI. |
| No font upload | LOW | Limited to pre-configured fonts. |

---

## 7. Homepage Builder

### Status: BASIC — Module system works, limited customization

### What Exists

**Admin Page:** `/admin/design/homepage` (132 lines)
**Components (8 files)** in `components/admin/homepage-builder/`:
- `homepage-builder.tsx` — Main builder with drag-reorder
- `module-library.tsx` — Available module templates
- `homepage-preview.tsx` — Live preview
- `hero-section-editor.tsx` — Hero section configuration
- `popup-deal-editor.tsx` — Popup deal configuration
- `appearance-customizer.tsx` — Theme/appearance settings
- `publishing-workflow.tsx` — Publish flow
- `modules/` — Module preview components

**Available Modules:** Hero, Article Grid, Featured Deals, Location Map, Newsletter

### What's Missing

| Gap | Severity | Description |
|---|---|---|
| No module configuration dialogs | MEDIUM | Settings/gear icons on modules have no click handlers. |
| Only 5 modules available | MEDIUM | Need more: testimonials, image gallery, video hero, partner logos, CTA banner, etc. |
| No responsive preview | LOW | Cannot preview mobile vs desktop layout. |
| No per-site homepage | LOW | Same builder for all sites. |

---

## 8. Article/Content Editor

### Status: PARTIAL — Rich text editor exists, not visual design

### What Exists

**Admin Page:** `/admin/editor` — Article editor page
**Component:** `components/admin/article-editor.tsx` — Rich text editing

**Features:** Title, slug, category, content body, meta fields, featured image URL

### What's Missing

| Gap | Severity | Description |
|---|---|---|
| No visual article designer | HIGH | Text-only editor. No inline image placement, pull quotes, callout boxes, etc. |
| No block-based editing | MEDIUM | Not like Notion/WordPress Gutenberg. Simple textarea/rich text. |
| No article template selection | MEDIUM | Cannot choose from visual templates for article layout. |
| No in-editor image upload | MEDIUM | Must paste image URLs. Not connected to media library. |
| No SEO sidebar | LOW | No live SEO score preview while editing. |

---

## 9. Photo Pool

### Status: PARTIAL — Upload works, falls back to mock data

### What Exists

**Admin Page:** `/admin/photo-pool`
**Component:** `components/admin/photo-pool-manager.tsx`

**Features:** 8 categories (Events, Hotels, Restaurants, Attractions, Shopping, Experiences, Guides, Blog), upload, search, filter, grid/list views

### What's Missing

| Gap | Severity | Description |
|---|---|---|
| Falls back to mock data | MEDIUM | Shows hardcoded samples when API fails. |
| No AI auto-tagging | LOW | Tags are manual only. |
| No image editing (crop, resize) | LOW | Upload only, no manipulation. |

---

## Cross-Cutting Gaps (Affect Multiple Features)

| # | Gap | Severity | Affects | Description |
|---|---|---|---|---|
| X1 | No design persistence | CRITICAL | Design Studio, Video | Designs are lost when closing browser. No save/load from DB. |
| X2 | No design gallery | HIGH | Design Studio, Video, PDF | Cannot browse or reuse past creations. |
| X3 | Media library not integrated | HIGH | Design Studio, Video, Email, Article Editor | Must paste URLs instead of picking from media library. |
| X4 | No multi-site brand assets | HIGH | Brand Assets, Design Studio | Only Yalla London has complete assets. (KG-027) |
| X5 | No export variety | HIGH | Design Studio (PNG only), PDF (HTML only), Video (browser only) | Each tool stuck at one export format. |
| X6 | PdfGuide/PdfDownload models missing | CRITICAL | PDF system | 3 API routes crash because Prisma models don't exist. |
| X7 | No email builder at all | CRITICAL | Email | No visual email design tool. All emails are hardcoded HTML. |
| X8 | No social platform APIs | HIGH | Social Posts | Posts saved to DB but never published to actual platforms. |

---

## Installed Design Dependencies

| Package | Version | Used? | Purpose |
|---|---|---|---|
| `konva` | 10.2.0 | YES | 2D canvas rendering engine |
| `react-konva` | 19.2.2 | YES | React bindings for Konva |
| `remotion` | 4.0.420 | YES | Video composition framework |
| `@remotion/cli` | 4.0.420 | NO | CLI for Remotion (server render) |
| `@remotion/player` | 4.0.420 | YES | Browser video player |
| `@remotion/renderer` | 4.0.420 | NO | Server-side video rendering (unused) |
| `puppeteer` | 24.22.0 | NO | HTML-to-PDF conversion (installed, never called) |
| `isomorphic-dompurify` | installed | YES | HTML sanitization |

**Not Installed but Needed:**
- `nodemailer` — SMTP email sending (referenced in code, not in package.json)
- `@sendgrid/mail` — SendGrid integration (referenced, not installed)
- `resend` — Resend email API (referenced, not installed)
- `qrcode` or `qrcode.react` — QR code rendering for design studio
- `html2canvas` or `dom-to-image` — Additional export options

---

## Prioritized Action Plan

### Phase 1: Fix What's Broken (Critical)
1. **Add PdfGuide + PdfDownload models to Prisma schema** — 3 API routes currently crash
2. **Wire puppeteer for HTML-to-PDF** — Library is installed but unused. Add conversion step.
3. **Add design persistence** — Save/load designs to DB so work isn't lost on page close

### Phase 2: Complete Core Features (High)
4. **PDF binary generation** — Use puppeteer to convert HTML to downloadable PDF
5. **Video MP4 export** — Use @remotion/renderer for server-side rendering (or Remotion Lambda)
6. **Design Studio save/gallery** — Persist designs, add gallery view for past creations
7. **Connect media library to design tools** — Picker component that inserts from media library
8. **Multi-site brand assets** — Generate complete brand kits for all 5 sites
9. **Social platform API integration** — At minimum Twitter/X and Instagram publishing

### Phase 3: Build Missing Tools (High)
10. **Email template builder** — Visual drag-and-drop email designer with templates
11. **Email campaign manager** — Schedule, send, track campaigns from dashboard
12. **Social post graphic designer** — Visual tool to create social images (integrate with Design Studio)
13. **Install email libraries** — Add nodemailer, resend, or @sendgrid/mail to package.json

### Phase 4: Enhance & Polish (Medium)
14. **Design Studio: layer reorder, visibility, lock**
15. **Design Studio: SVG export, PDF export**
16. **Article editor: block-based editing or visual templates**
17. **Homepage builder: more modules, mobile preview**
18. **Video Studio: scene editor, audio tracks**
19. **QR code generation in Design Studio**
20. **AI content-to-social repurposing pipeline**

### Phase 5: Advanced (Low/Future)
21. **AI logo generation** (DALL-E / Stable Diffusion integration)
22. **Collaborative editing** (multi-user real-time)
23. **Brand kit auto-generation** from config for new sites
24. **Design version history**
25. **Email A/B testing**
26. **Video batch generation** from blog content

---

## File Inventory (All Design-Related Files)

### Admin Pages (10)
```
app/admin/design-studio/page.tsx          # Canvas editor + templates (1,291 lines)
app/admin/media/page.tsx                  # Media library (702 lines)
app/admin/brand-assets/page.tsx           # Brand assets (22 lines, wrapper)
app/admin/photo-pool/page.tsx             # Photo categories (22 lines, wrapper)
app/admin/design/homepage/page.tsx        # Homepage builder (132 lines)
app/admin/video-studio/page.tsx           # Video creator (625 lines)
app/admin/pdf-generator/page.tsx          # PDF generator (22 lines, wrapper)
app/admin/command-center/products/pdf/page.tsx  # PDF guide manager
app/admin/command-center/social/page.tsx  # Social post manager
app/admin/editor/page.tsx                 # Article editor
```

### Design Components (15)
```
components/design-studio/design-canvas.tsx      # Konva canvas (799 lines)
components/design-studio/editor-toolbar.tsx      # Canvas toolbar (320 lines)
components/design-studio/layers-panel.tsx        # Layer management (117 lines)
components/design-studio/properties-panel.tsx    # Element properties (296 lines)
components/video-studio/video-composition.tsx    # Remotion composition
components/video-studio/video-player.tsx         # Video preview player
components/admin/brand-assets-library.tsx        # Brand assets UI (590 lines)
components/admin/photo-pool-manager.tsx          # Photo management
components/admin/article-editor.tsx              # Article rich text editor
components/admin/pdf-generator.tsx               # PDF generator UI (448 lines)
components/admin/homepage-builder/homepage-builder.tsx
components/admin/homepage-builder/hero-section-editor.tsx
components/admin/homepage-builder/module-library.tsx
components/admin/homepage-builder/homepage-preview.tsx
components/admin/social-embeds-manager.tsx        # Social embed management
```

### Libraries (7)
```
lib/pdf/generator.ts                    # PDF content + HTML generation (621 lines)
lib/pdf/brand-design-system.ts          # Brand-aware design templates (627 lines)
lib/pdf/design-analyzer.ts              # AI vision design analysis (443 lines)
lib/pdf/index.ts                        # Module exports
lib/video/brand-video-engine.ts         # Video template engine
lib/design/video-presets.ts             # Video format presets
lib/email-notifications.ts             # Email notification sender
lib/integrations/email-marketing.ts    # Email marketing provider wrapper
```

### API Routes (10)
```
api/admin/design-studio/route.ts            # Templates CRUD
api/admin/design-studio/analyze/route.ts    # AI design analysis
api/admin/design-studio/media-pool/route.ts # Media assets CRUD
api/admin/video-studio/route.ts             # Video generation
api/admin/command-center/products/pdf/route.ts          # PDF guide CRUD (BROKEN)
api/admin/command-center/products/pdf/generate/route.ts # PDF generation (BROKEN)
api/admin/command-center/products/pdf/download/route.ts # PDF downloads (BROKEN)
api/products/pdf/generate/route.ts          # Public PDF generation (partial)
api/admin/command-center/social/posts/route.ts    # Social posts CRUD
api/admin/command-center/social/accounts/route.ts # Social accounts
```

### Config
```
config/destination-themes.ts            # All 5 site theme definitions
config/sites.ts                         # Site branding config (colors, fonts, domains)
```
