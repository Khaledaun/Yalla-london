# YALLA LONDON — Remotion Video Build Plan

## Status: COMPLETE ✅

## Phase 1: Project Setup ✅
- [x] Scaffold project manually (npm init + deps)
- [x] Install: remotion 4.x, @remotion/cli, @remotion/player, @remotion/google-fonts, zod, chalk, inquirer
- [x] Directory structure: src/brand/, src/compositions/, public/footage/, out/
- [x] Brand assets: public/yalla-stamp-500.png, public/yalla-watermark-500.png (need manual download — see README files)
- [x] src/brand/tokens.ts — all brand constants
- [x] src/brand/fonts.ts — @remotion/google-fonts (Anybody, Source Serif 4, IBM Plex Mono)
- [x] tsconfig.json + remotion.config.ts

## Phase 2: Brand Components ✅
- [x] TricolorBar.tsx — 3-segment wipe-in animation
- [x] GoldRule.tsx — expand from center with spring
- [x] Wordmark.tsx — stamp scale + text fade, sm/md/lg sizes, dark/light variants
- [x] Kicker.tsx — gold mono text, fade + slide up
- [x] Footer.tsx — URL fade in
- [x] SwipeUp.tsx — bouncing chevron loop

## Phase 3: Compositions ✅
- [x] BrandIntro.tsx (90 frames / 3s) — navy bg, tricolor → stamp → wordmark → gold rule → glow hold
- [x] BrandOutro.tsx (90 frames / 3s) — fade to navy → center logo → URL → tricolor
- [x] StoryOverlay.tsx (variable) — persistent overlay, alpha-ready (ProRes 4444)
- [x] ContentPost.tsx (450 frames / 15s) — navy bg, watermark, numbered list stagger
- [x] PromoSale.tsx (450 frames / 15s) — red gradient, headline slam, date badge, CTA
- [x] PhotoFeature.tsx (450 frames / 15s) — photo top 55%, gradient overlay, content bottom
- [x] EventTicket.tsx (450 frames / 15s) — cream ticket card slide-up with event details
- [x] VideoWithBranding.tsx (variable) — BrandIntro → footage + overlay → BrandOutro

## Phase 4: Root.tsx ✅
- [x] All 8 compositions registered with Zod schemas
- [x] defaultProps on all compositions
- [x] calculateMetadata for variable-duration compositions

## Phase 5: CLI Tool ✅
- [x] render.mjs — interactive inquirer menu
- [x] Per-composition prompts (ContentPost, PromoSale, PhotoFeature, EventTicket, VideoWithBranding)
- [x] Simple prompts for BrandIntro, BrandOutro, StoryOverlay
- [x] --all flag for batch rendering
- [x] Preview in browser option

## Phase 6: Package Scripts ✅
- [x] npm run preview — opens Remotion Studio
- [x] npm run studio — interactive CLI
- [x] npm run render:intro/outro/overlay — individual renders
- [x] npm run render:all — batch all

## TypeScript: ZERO ERRORS ✅

---

## Manual Steps Required

1. **Download brand assets** (network-restricted during build):
   ```bash
   curl -L -o public/yalla-stamp-500.png "https://www.yalla-london.com/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-stamp-500px.png"
   curl -L -o public/yalla-watermark-500.png "https://www.yalla-london.com/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-watermark-500px.png"
   ```

2. **For VideoWithBranding**, place footage in `public/footage/` (e.g., `public/footage/sample.mp4`)

---

## Design Rules Followed
- ALL colors from BRAND.colors — zero hardcoded hex in components
- ALL fonts via @remotion/google-fonts
- Tricolor bar: 3 flat segments, NEVER gradient
- Red #C8322B is the ONLY red
- Stamp: border-radius 50%, object-fit cover
- Springs: damping 12-20 for luxury feel
- All component props include `[key: string]: unknown` for Remotion Composition compatibility
