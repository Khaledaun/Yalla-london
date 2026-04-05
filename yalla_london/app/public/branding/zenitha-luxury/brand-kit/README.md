# Zenitha · Luxury — Brand Identity

**Zenitha.Luxury LLC** | Delaware, USA

The parent company and holding entity for all Zenitha travel experiences.

---

## Brand Positioning

> The Art of Exceptional Travel

Zenitha.Luxury is not a product. It is a promise — that every experience bearing the Zenitha name meets the same uncompromising standard. Corporate-luxury tone: authoritative, refined, timeless. No exclamation marks.

---

## Portfolio

| Brand | Sector | Domain |
|-------|--------|--------|
| Yalla London | Luxury travel editorial | yalla-london.com |
| Zenitha Yachts | Private yacht charters | zenithayachts.com |
| *(more to come)* | | |

---

## Brand Mark

The **Diamond Mark** — a precise four-pointed star enclosed in concentric diamonds. Represents the intersection of all Zenitha experiences: East meets West, land meets sea, tradition meets modernity.

**Do:**
- Use the diamond mark at minimum 32px
- Maintain the gold color on all backgrounds
- Keep clear space equal to 1× the mark height on all sides

**Don't:**
- Rotate or distort the mark
- Change the gold color to any other accent
- Place on mid-tone backgrounds (use dark or light only)

---

## Color Palette

| Role | Name | Hex |
|------|------|-----|
| Primary dark bg | Obsidian | `#0A0A0A` |
| Elevated dark surface | Midnight | `#141414` |
| Dark cards | Charcoal | `#2A2A2A` |
| Secondary text | Mist | `#8A8A8A` |
| Light borders | Platinum | `#D6D0C4` |
| Light background | Cream | `#F5F0E8` |
| Near-white | Ivory | `#FDFCF9` |
| **Primary accent** | **Gold** | **`#C4A96C`** |
| Soft gold | Champagne | `#EAD9BB` |

---

## Typography

| Role | Font | Fallback |
|------|------|---------|
| Display / Headlines | Cormorant Garamond | Playfair Display, Georgia |
| UI / Labels / Nav | DM Sans | Helvetica Neue, Arial |
| Long-form body | Source Serif 4 | Georgia |
| Arabic | IBM Plex Sans Arabic | Noto Sans Arabic, Tahoma |

**Signature style:** ZENITHA in 0.08em tracked serif caps. `· LUXURY ·` in 0.55em tracked sans at 40% the headline size.

---

## Files in This Kit

```
01-logos-svg/
  zenitha-luxury-primary-dark.svg     ← Header/footer on dark
  zenitha-luxury-primary-light.svg    ← Header/footer on light
  zenitha-luxury-symbol.svg           ← Icon-only mark
  zenitha-luxury-wordmark-dark.svg    ← Text lockup, no mark

05-color-palette/
  palette.css                         ← Swatch definitions + contrast notes

06-design-tokens/
  zenitha-luxury-tokens.css           ← Full CSS custom property system

ZenithaLuxuryBrandKit.tsx             ← React logo components (for website)
README.md                             ← This file
```

---

## React Usage

```tsx
import {
  LogoPrimary,
  LogoLight,
  LogoDark,
  LogoStacked,
  LogoSymbol,
  DiamondElement,
  GoldRule,
  TaglineLockup,
} from '@/public/branding/zenitha-luxury/brand-kit/ZenithaLuxuryBrandKit';

// Header (dark nav)
<LogoLight scale={0.5} />

// Footer (dark background)
<LogoLight scale={0.45} />

// Light page header
<LogoDark scale={0.5} />

// Hero section decorative diamond
<DiamondElement size={80} />

// Section divider
<GoldRule width={200} />
```

---

*Zenitha.Luxury LLC · Wilmington, Delaware · zenitha.luxury*
