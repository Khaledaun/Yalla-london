# Zenitha Yachts — Brand Kit

**Site:** zenithayachts.com
**Site ID:** zenitha-yachts-med
**Status:** Awaiting brand assets from Khaled

## Folder Structure

Upload your design and branding files into these folders:

```
brand-kit/
├── 01-logos-svg/          ← Logo files (SVG preferred, PNG accepted)
│                            Primary logo, wordmark, icon, stacked, mono variants
│                            Light + dark background versions
│
├── 02-logos-transparent/  ← Transparent background versions of all logos
│
├── 03-social-icons/       ← Social media avatars, favicons
│                            Sizes: 16x16, 32x32, 180x180, 512x512
│
├── 04-brand-elements/     ← Patterns, textures, decorative elements
│                            Watermarks, stamps, dividers
│
├── 05-color-palette/      ← Color swatches, palette exports
│                            Primary, secondary, accent colors
│                            HEX, RGB, HSL values
│
├── 06-typography/         ← Font files or font references
│                            Heading font, body font, display font
│                            Arabic font if different from English
│
├── 07-design-tokens/      ← CSS variables, Tailwind config overrides
│                            Spacing, border-radius, shadows
│
└── 08-component-specs/    ← UI mockups, wireframes, page layouts
                             Hero sections, card designs, navigation
                             Any Figma/Sketch exports
```

## What To Upload

At minimum, we need:

1. **Logo** (any format — SVG is ideal, PNG works)
2. **Brand colors** (primary, secondary, accent — even just a screenshot from your brand guide)
3. **Font preferences** (name of the fonts, or "same as Yalla London" if reusing)
4. **Mood/aesthetic direction** (nautical luxury? modern minimalist? classic yacht club?)

Everything else can be built from these foundations.

## After Upload

Once files are here, Claude Code will:
- Generate CSS design tokens
- Create the destination theme in `destination-themes.ts`
- Configure the site in `config/sites.ts`
- Wire up middleware domain routing
- Build the public-facing pages with your brand identity
