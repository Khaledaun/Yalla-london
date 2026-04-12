# YALLA LONDON — Full Brand Kit Adoption
## Claude Code Implementation Prompt

---

You are performing a complete design system migration for **yalla-london.com**, a bilingual (EN/AR) luxury London travel platform for Arab visitors. The site runs on **Next.js 14 App Router + TypeScript + Tailwind CSS** deployed on **Vercel**.

A new brand kit has been finalized. Your job is to adopt it across the ENTIRE website — every page, every component, every layout — and delete all old/irrelevant design assets.

---

## PHASE 0 — SETUP (do this first, before any code changes)

1. **Copy the brand kit into the project:**
   - Unzip `yalla-london-brand-kit-v2.zip` into `/public/branding/yalla-london/brand-kit-v2/`
   - The kit contains: `/logos/`, `/tokens/`, `/animations/`, `/mobile/`, and `README.md`

2. **Import the token files at the project root:**
   ```
   /src/styles/yalla-tokens.css    ← copy from kit /tokens/yalla-tokens.css
   /src/styles/yalla-animations.css ← copy from kit /animations/yalla-animations.css
   /src/styles/yalla-mobile.css    ← copy from kit /mobile/mobile-optimization.css
   ```
   Import all three in `globals.css` or `layout.tsx` BEFORE Tailwind:
   ```css
   @import './yalla-tokens.css';
   @import './yalla-animations.css';
   @import './yalla-mobile.css';
   ```

3. **Update `tailwind.config.ts`** to map all brand tokens:
   ```ts
   theme: {
     extend: {
       colors: {
         'yl-red': '#C8322B',
         'yl-gold': '#C49A2A',
         'yl-blue': '#4A7BA8',
         'yl-charcoal': '#1C1917',
         'yl-parchment': '#EDE9E1',
         'yl-cream': '#F5F0E8',
         'yl-navy': '#1A2332',
         'yl-dark-navy': '#0F1621',
         'yl-gray': {
           100: '#F7F5F2', 200: '#E8E3DB', 300: '#D4CFC5',
           400: '#A09A8E', 500: '#7A746A', 600: '#5A5449',
         },
       },
       fontFamily: {
         heading: ['Anybody', 'sans-serif'],
         body: ['Source Serif 4', 'Georgia', 'serif'],
         mono: ['IBM Plex Mono', 'monospace'],
         arabic: ['Noto Sans Arabic', 'sans-serif'],
       },
       borderRadius: {
         'yl-sm': '6px', 'yl-md': '10px', 'yl-lg': '14px', 'yl-xl': '20px',
       },
       transitionTimingFunction: {
         'yl': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
       },
     },
   }
   ```

4. **Update `layout.tsx` meta tags** using the snippet from kit `/mobile/meta-tags.html`:
   - Set `viewport` with `viewport-fit=cover`
   - Add apple-mobile-web-app-capable, theme-color `#0F1621`
   - Point favicon to `/branding/yalla-london/brand-kit-v2/logos/yalla-stamp-32px-favicon.png`
   - Point apple-touch-icon to `/branding/yalla-london/brand-kit-v2/logos/yalla-icon-apple-touch.png`
   - Set OG image to `/branding/yalla-london/brand-kit-v2/logos/yalla-icon-512.png`

5. **Load Google Fonts** — ensure these are loaded (via next/font or link tag):
   - Anybody (400, 600, 700, 800)
   - Source Serif 4 (400, 600, 700, italic 400)
   - IBM Plex Mono (300, 400, 500)
   - Noto Sans Arabic (400, 500, 600, 700)

---

## PHASE 1 — GLOBAL COMPONENTS (update these first, they cascade everywhere)

### 1.1 Tri-Color Bar Component
Create `<TriBar />` component used site-wide:
```tsx
// 3 equal segments: Red → Gold → Blue. Height: 3px default.
<div className="flex h-[3px] w-full">
  <span className="flex-1 bg-yl-red" />
  <span className="flex-1 bg-yl-gold" />
  <span className="flex-1 bg-yl-blue" />
</div>
```
Place at: top of page (fixed, z-101), footer divider, section separators, business card bottom.

### 1.2 Navigation Bar
- Brand text: `font-heading font-bold tracking-wider` — "YALLA" in parchment, "LONDON" in yl-red
- Nav links: `font-mono text-[10px] tracking-[1.5px] uppercase text-yl-gray-400`
- Hover: gold underline animation (width 0→100%, `transition-all duration-300 ease-yl`)
- Background: `bg-yl-dark-navy/95 backdrop-blur-xl`
- CTA button: `bg-yl-red text-white font-mono text-[11px] tracking-wider uppercase`
- Mobile: use dropdown `<select>` for sections (no hamburger menu)
- Sticky with tri-bar above it

### 1.3 Footer
- 4-column grid on desktop → 2-column on mobile → stacked on phone
- Sections must match the website: Explore (Info Hub, London Stories, Events & Tickets, London by Foot, Recommendations), Categories (Food & Dining, Travel & Explore, Culture & Art, Style & Shopping, Lifestyle), Connect (email, social links), About (The Founder, Contact)
- Tri-bar above copyright
- Copyright: `© 2025–2026 Zenitha.Luxury LLC. All rights reserved.`
- Arabic: `يلّا لندن` on the right

### 1.4 Button System
Create variants:
- **Primary:** `bg-yl-red text-white hover:bg-[#a82924] hover:-translate-y-0.5 shadow-lg`
- **Outline:** `border border-yl-gray-500 text-yl-parchment hover:border-yl-gold hover:text-yl-gold`
- **Ghost:** `text-yl-gray-400 hover:text-yl-parchment`
- **Gold:** `bg-yl-gold text-yl-charcoal hover:bg-[#b08a24]`
- All: `font-mono text-[11px] tracking-wider uppercase rounded-lg transition-all duration-300 ease-yl`
- Sizes: sm (py-2 px-4 text-[9px]), md (py-3 px-5), lg (py-4 px-8 text-[13px])

### 1.5 Tag/Badge System
- Red: `bg-yl-red/15 text-yl-red`
- Gold: `bg-yl-gold/15 text-yl-gold`
- Blue: `bg-yl-blue/15 text-yl-blue`
- All: `font-mono text-[9px] tracking-wider uppercase rounded-full px-3 py-1`

### 1.6 Toast/Notification System
- Success: green border/bg, ✓ prefix
- Error: red border/bg, ✕ prefix
- Info: blue border/bg, ℹ prefix
- All: `font-mono text-[11px] rounded-xl`

### 1.7 Input Fields
- `bg-white/4 border border-white/10 rounded-lg text-yl-parchment font-body`
- Focus: `border-yl-gold ring-2 ring-yl-gold/15`
- Arabic inputs: `dir="rtl" font-arabic`

### 1.8 Content Cards
- Background: `bg-yl-dark-navy rounded-[14px] border border-white/5`
- Hover: `hover:-translate-y-1 hover:border-yl-gold/20 hover:shadow-lg transition-all duration-400 ease-yl`
- Category label: `font-mono text-[9px] tracking-widest uppercase text-yl-red`
- Title: `font-heading font-semibold text-lg`
- Excerpt: `text-yl-gray-400 text-sm font-body`

---

## PHASE 2 — PAGE-BY-PAGE MIGRATION

Go through EVERY page in the app and apply the brand. Check each one:

### 2.1 Home Page (`/`)
- Hero: dark navy gradient bg, heading in `font-heading font-extrabold`, "Experience London" in parchment + "Your Way" in yl-red
- Subtitle: `font-mono text-[10px] tracking-widest uppercase text-yl-gold`
- Body text: `font-body text-yl-gray-400`
- CTA buttons using the button system above
- Featured cards using the card system above
- Stamp logo watermark at 8% opacity on hero background (use `/logos/yalla-watermark-500px.png`)

### 2.2 Information Hub (`/information`)
- Section headers: `font-heading font-bold` with gold label above (`font-mono text-[10px] tracking-widest`)
- Article list using content cards
- Breadcrumbs: `font-mono text-[10px] text-yl-gray-500`

### 2.3 Blog / London Stories (`/blog`)
- Article cards with image, category tag, title, excerpt
- Category filters using tag system
- Featured article: larger card with overlay gradient

### 2.4 Recommendations (`/recommendations`)
- Grid of recommendation cards
- Rating stars in yl-gold
- Price display in `font-mono`

### 2.5 Events & Tickets (`/events`)
- Event cards with date badge
- Date: `font-heading font-bold text-yl-red`
- Booking CTA: primary button

### 2.6 London by Foot (`/london-by-foot`)
- Route cards with route number
- Map integration styling
- Walking time in `font-mono`

### 2.7 About / The Founder (`/about`)
- Editorial layout with `font-body`
- Pull quotes with gold left border
- Photo styling: `rounded-yl-lg shadow-lg`

### 2.8 Contact (`/contact`)
- Form using input field system
- Submit button: primary
- Bilingual labels (EN above, AR below)

### 2.9 Arabic versions (`/ar/*`)
- ALL Arabic pages: `dir="rtl" lang="ar"`
- Font: `font-arabic` (Noto Sans Arabic)
- **CRITICAL: `letter-spacing: 0 !important` on ALL Arabic text — no exceptions**
- Mirror all layouts (padding, margins, alignment)
- Navigation items flip to RTL order

### 2.10 Shop (`/shop`)
- Product cards
- Price in `font-mono font-heading`
- Add to cart: primary button

---

## PHASE 3 — CLEANUP

### 3.1 Delete old design files
Search for and remove:
- Any CSS files with old color values (look for old purples, blues, or any non-brand colors)
- Old logo files (anything NOT from the brand-kit-v2)
- Unused font imports (especially Inter, Roboto, Arial, system fonts)
- Old icon libraries if replaced by brand SVG icons
- Stale design tokens or theme files that conflict

### 3.2 Audit for stragglers
Run these checks:
```bash
# Find any hardcoded colors that aren't in the brand
grep -rn '#[0-9a-fA-F]\{6\}' src/ --include='*.tsx' --include='*.css' --include='*.ts' | grep -v 'node_modules' | grep -v '.next'

# Find old font references
grep -rn 'Inter\|Roboto\|Arial\|system-ui' src/ --include='*.tsx' --include='*.css' --include='*.ts'

# Find any inline styles with non-brand colors
grep -rn 'color:\|background:\|border:' src/ --include='*.tsx' | grep -v 'yl-'

# Find any non-brand border-radius values
grep -rn 'rounded-' src/ --include='*.tsx' | head -50
```

### 3.3 Verify RTL
For every Arabic page:
```bash
# Check all /ar/ routes have dir="rtl"
grep -rn 'dir=' src/app/ar/ --include='*.tsx'

# Verify no letter-spacing on Arabic text
grep -rn 'letter-spacing\|tracking-' src/ --include='*.tsx' | grep -i 'arab\|rtl\|ar'
```

---

## PHASE 4 — QUALITY CHECK

Go through every page one more time and verify:

- [ ] Tri-bar at top of every page
- [ ] Navigation uses brand fonts and colors
- [ ] All headings use `font-heading` (Anybody)
- [ ] All body text uses `font-body` (Source Serif 4)
- [ ] All labels/nav/metadata use `font-mono` (IBM Plex Mono)
- [ ] All Arabic text uses `font-arabic` (Noto Sans Arabic) with `letter-spacing: 0`
- [ ] All buttons follow the button system (primary/outline/ghost/gold)
- [ ] All cards follow the card system (dark-navy bg, rounded-[14px], border, hover)
- [ ] Heritage Red `#C8322B` is the only red used site-wide
- [ ] Gold `#C49A2A` is the only gold/yellow
- [ ] No purple, no bright blue, no non-brand colors anywhere
- [ ] Footer has correct structure with tri-bar
- [ ] OG images and favicons point to brand kit
- [ ] Mobile breakpoints work (test at 390px, 430px, 768px, 1024px)
- [ ] Touch targets ≥ 44px on mobile
- [ ] `prefers-reduced-motion` disables animations
- [ ] No horizontal scroll on any mobile page
- [ ] Stamp watermark appears on hero/empty states at 8% opacity
- [ ] All transitions use `ease-yl` timing function
- [ ] All hover animations are smooth (translateY, border-color, shadow)

---

## HARD RULES — NEVER BREAK THESE

1. **Arabic = NO letter-spacing, EVER.** Apply `letter-spacing: 0 !important` in `[dir="rtl"]` globally.
2. **Tri-color bar = 3 equal segments.** Red → Gold → Blue. No gradient. Three flat fills. Height: 3px.
3. **Heritage Red #C8322B only.** Never use any other red.
4. **Anybody for headings only.** Never use it for body text.
5. **Source Serif 4 for editorial body only.** Never use it for nav/labels.
6. **IBM Plex Mono for data/nav/labels only.** Never use it for long-form text.
7. **No Inter, no Roboto, no Arial, no system fonts anywhere.**
8. **All transitions: `transition-all duration-300 ease-yl`** unless specified otherwise.
9. **Stamp logo minimum size: 32px.** Never display smaller.
10. **Red on gold = NEVER.** These two colors must not be adjacent without a neutral separator.

---

## EXECUTION ORDER

1. Phase 0 (setup tokens + fonts + meta)
2. Phase 1 (global components — nav, footer, buttons, cards, inputs, tags, toasts, tri-bar)
3. Phase 2 (page by page — home → info → blog → recommendations → events → london-by-foot → about → contact → arabic → shop)
4. Phase 3 (cleanup old files + audit for stragglers)
5. Phase 4 (quality check every page against the checklist)

After each phase, run `npm run build` to ensure no TypeScript errors or build failures.

Start with Phase 0 now.
