# Yalla London — Brand Identity Kit v2.0

> Complete design system for web, mobile, social, and print.

## Font Stack

| Role     | Family               | Weights      | Usage                              |
|----------|----------------------|--------------|-------------------------------------|
| Display  | Anybody              | 400-800      | Headlines, wordmark, hero text      |
| Editorial| Source Serif 4       | 300-700      | Body copy, descriptions, pricing    |
| System   | IBM Plex Mono        | 400-600      | Labels, metadata, captions, badges  |
| Arabic   | IBM Plex Sans Arabic | 400-700      | All RTL content (NO letter-spacing) |

## Color Palette

| Name        | Hex       | Usage                            |
|-------------|-----------|----------------------------------|
| London Red  | #C8322B   | Primary CTA, urgency, heritage   |
| Gold        | #C49A2A   | Premium, highlights, star ratings|
| Thames Blue | #3B7EA1   | Links, info, location            |
| Stamp Blue  | #4A7BA8   | LDN stamp, interactive elements  |
| Charcoal    | #1C1917   | Dark mode bg, primary text       |
| Graphite    | #3D3835   | Dark mode borders, cards         |
| Stone       | #78716C   | Secondary text, metadata         |
| Sand        | #D6D0C4   | Light mode borders, dividers     |
| Cream       | #FAF8F4   | Light mode background            |
| Forest      | #2D6B4F   | Success states, trust badges     |

## Folder Structure

01-logos-svg/          — 12 logo SVG variants (light/dark/mono)
02-logos-transparent/  — 14 transparent-bg variants
03-social-icons/       — 6 social media icons (thumb/avatar/favicon)
04-brand-elements/     — Stamp seal + tri-color bar
05-animations/         — Complete CSS animation library (20+ animations)
06-design-tokens/      — CSS custom properties (colors, type, spacing)
07-component-specs/    — COMPONENT-SPECS.md + PAGE-LAYOUTS.md

## Quick Start

1. Import: yalla-tokens.css + yalla-animations.css
2. Set theme: class="yalla-dark" or "yalla-light"
3. Use tokens: var(--yalla-font-display), var(--yalla-london), etc.
4. Animate: class="yalla-fade-up" or "yalla-stamp-in"
5. Arabic: class="yalla-rtl" — NEVER add letter-spacing

## Critical Rules

- Arabic text: NO letter-spacing (breaks ligatures)
- Tri-color bar: London Red → Gold → Sky Blue (left to right)
- LDN stamps: Apply feTurbulence filter for ink texture
- Buttons: IBM Plex Mono, uppercase, 1.5px letter-spacing
- Boarding pass metaphor: Gate Y = gateway, 1st Class = premium

Yalla London Brand Kit v2.0 — 34 SVGs + animations + tokens + specs
