# Yalla London — Component Specifications

> Design system reference for developers and designers.  
> All measurements in px. Use CSS tokens from `yalla-tokens.css`.

---

## 1. Buttons

| Property         | Primary        | Secondary      | Ghost          | Gold           | Dark           |
|------------------|----------------|----------------|----------------|----------------|----------------|
| Background       | #C8322B        | transparent    | transparent    | #C49A2A        | #1C1917        |
| Text Color       | #FAF8F4        | (inherits fg)  | #78716C        | #FAF8F4        | #FAF8F4        |
| Border           | none           | 1.5px solid fg | 1px solid bd   | none           | none           |
| Font             | IBM Plex Mono  | IBM Plex Mono  | IBM Plex Mono  | IBM Plex Mono  | IBM Plex Mono  |
| Weight           | 600            | 600            | 600            | 600            | 600            |
| Transform        | uppercase      | uppercase      | uppercase      | uppercase      | uppercase      |
| Letter-spacing   | 1.5px          | 1.5px          | 1.5px          | 1.5px          | 1.5px          |
| Hover            | darken 10%     | fill bg 5%     | fill bg 5%     | darken 10%     | lighten 5%     |
| Transition       | all 0.2s ease  | all 0.2s ease  | all 0.2s ease  | all 0.2s ease  | all 0.2s ease  |
| Disabled opacity | 0.4            | 0.4            | 0.4            | 0.4            | 0.4            |

### Button Sizes

| Size   | Padding (v × h) | Font Size |
|--------|------------------|-----------|
| Small  | 8px × 16px       | 9px       |
| Medium | 12px × 24px      | 10px      |
| Large  | 16px × 36px      | 11px      |

---

## 2. Badges / Tags

| Property       | Value                    |
|----------------|--------------------------|
| Font           | IBM Plex Mono            |
| Size           | 9px                      |
| Weight         | 600                      |
| Letter-spacing | 2px                      |
| Transform      | uppercase                |
| Padding        | 4px 10px                 |
| Border         | 1px solid (badge color)  |
| Background     | transparent              |
| Color          | (matches border)         |

Badge colors: Stamp Blue (#4A7BA8), London Red (#C8322B), Gold (#C49A2A), Sky (#3B7EA1), Forest (#2D5A3D)

---

## 3. Form Inputs

| Property       | English            | Arabic (RTL)             |
|----------------|--------------------|--------------------------|
| Font           | Source Serif 4     | IBM Plex Sans Arabic     |
| Size           | 14px               | 14px                     |
| Weight         | 400                | 400                      |
| Padding        | 12px 16px          | 12px 16px                |
| Border         | 1px solid (border) | 1px solid (border)       |
| Background     | transparent        | transparent              |
| Direction      | ltr                | rtl                      |
| Letter-spacing | 0                  | 0 (CRITICAL for Arabic)  |
| Focus border   | #C49A2A (gold)     | #C49A2A (gold)           |
| Focus shadow   | 0 0 0 3px gold/15% | 0 0 0 3px gold/15%      |

### Input Labels

| Property       | Value          |
|----------------|----------------|
| Font           | IBM Plex Mono  |
| Size           | 8px            |
| Weight         | 500            |
| Letter-spacing | 2px            |
| Transform      | uppercase      |
| Color          | Stone (#78716C)|
| Margin-bottom  | 6px            |

---

## 4. Service Cards

```
┌─────────────────────────────────────┐
│ ■ London Red │ ■ Gold │ ■ Sky Blue  │  ← 3px tri-color bar
├─────────────────────────────────────┤
│                                     │
│         [ Image / Photo ]           │  ← 140px height, gradient fallback
│   [Badge]              [Arabic]     │  ← Top-left badge, top-right Arabic
│                                     │
├─────────────────────────────────────┤
│  Title (Anybody 16px/700)    Price  │  ← Anybody 24px/800 London Red
│  Subtitle (Source Serif 12/300)     │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤  ← 1px border-top
│  GATE  CLASS           [Book Now]   │  ← Boarding pass metadata
│   Y     1st                         │
└─────────────────────────────────────┘
```

| Property          | Value                      |
|-------------------|----------------------------|
| Border            | 1px solid (border color)   |
| Image height      | 140px                      |
| Image fallback    | linear-gradient(135deg, graphite, #3a3530) |
| Content padding   | 20px                       |
| Title font        | Anybody 16px / 700         |
| Subtitle font     | Source Serif 4 12px / 300  |
| Price font        | Anybody 24px / 800         |
| Price color       | London Red                 |
| Metadata font     | IBM Plex Mono 7px / 500    |
| Metadata spacing  | 2px                        |
| Hover             | translateY(-4px), shadow-lg |

---

## 5. Navigation Bar

```
■ London Red  │  ■ Gold  │  ■ Sky Blue    ← 3px full-width tri-color bar
─────────────────────────────────────────
YALLA [LDN]   Experiences  Transfers  Guides  عربي  [Book Now]
```

| Element        | Font             | Size  | Weight | Spacing | Color   |
|----------------|------------------|-------|--------|---------|---------|
| Logo           | (SVG wordmark)   | 90px wide | -  | -       | fg      |
| Menu items     | IBM Plex Mono    | 10px  | 500    | 1.5px   | Stone   |
| Arabic toggle  | IBM Plex Sans Ar | 13px  | 500    | 0       | Stone   |
| CTA button     | (primary small)  | 9px   | 600    | 1.5px   | Cream   |
| Padding        | 14px × 28px      | -     | -      | -       | -       |
| Sticky z-index | 50               | -     | -      | -       | -       |

---

## 6. Footer

| Element         | Font              | Size  | Weight | Color    |
|-----------------|-------------------|-------|--------|----------|
| Background      | —                 | —     | —      | Charcoal |
| Logo            | (stacked SVG)     | scale 0.7 | - | Cream    |
| Description     | Source Serif 4    | 12px  | 300    | Stone    |
| Column header   | Anybody           | 12px  | 700    | Cream    |
| Column links    | Source Serif 4    | 11px  | 300    | Stone    |
| Divider         | Tri-color bar     | 3px   | —      | —        |
| Copyright       | IBM Plex Mono     | 8px   | 400    | Stone    |
| Arabic tagline  | IBM Plex Sans Ar  | 12px  | 400    | Stone    |
| Padding         | 32px × 28px       | —     | —      | —        |
| Column grid     | 2fr 1fr 1fr 1fr   | —     | —      | —        |

---

## 7. Toast Notifications

| Type    | Icon BG      | Border           | Background       |
|---------|-------------|------------------|------------------|
| Success | #2D5A3D     | #2D5A3D at 20%  | #2D5A3D at 3%   |
| Info    | #3B7EA1     | #3B7EA1 at 20%  | #3B7EA1 at 3%   |
| Warning | #C49A2A     | #C49A2A at 20%  | #C49A2A at 3%   |
| Error   | #C8322B     | #C8322B at 20%  | #C8322B at 3%   |

| Property    | Value                  |
|-------------|------------------------|
| Padding     | 12px 16px              |
| Icon size   | 24px circle            |
| Icon font   | IBM Plex Mono 11px/700 |
| Text font   | Source Serif 4 12px    |
| Animation   | slideUp 0.3s ease      |
| Dismiss     | IBM Plex Mono 9px "×"  |

---

## 8. Modal Dialog

```
■ London Red  │  ■ Gold  │  ■ Sky Blue    ← 3px tri-color bar
─────────────────────────────────────────
  Title (Anybody 18px/700)

  Body text (Source Serif 4 13px/400)
  Arabic (IBM Plex Sans Arabic 12px)

                    [Ghost]  [Primary]    ← Right-aligned actions
```

| Property       | Value                    |
|----------------|--------------------------|
| Background     | bg (theme)               |
| Border         | 1px solid (border)       |
| Max-width      | 440px                    |
| Padding        | 28px                     |
| Overlay        | black at 40% (dark) / 5% (light) |
| Z-index        | 200                      |

---

## 9. Tri-Color Bar Usage

The tri-color bar (London Red → Gold → Sky Blue) appears in these contexts:

| Context              | Height | Layout              |
|----------------------|--------|---------------------|
| Page top (nav)       | 3px    | Full-width, flex 1  |
| Card header          | 3px    | Full-width, flex 1  |
| Section divider      | 2px    | Centered, max 160px |
| Footer divider       | 3px    | Full-width, flex 1  |
| Logo accent          | 2.5px  | 3 segments, gap 4px |
| Button group divider | 2px    | Full-width          |

---

## 10. Spacing Scale Reference

| Token | Value | Usage                              |
|-------|-------|------------------------------------|
| 1     | 4px   | Inline element gaps, bar gaps      |
| 2     | 8px   | Badge padding, tight gaps          |
| 3     | 12px  | Input padding, card internal gaps  |
| 4     | 16px  | Card grid gaps, section padding    |
| 5     | 20px  | Component internal padding         |
| 6     | 24px  | Card content padding, section gaps |
| 8     | 32px  | Page margins, section spacing      |
| 10    | 40px  | Hero internal spacing              |
| 12    | 48px  | Hero padding, major sections       |
| 16    | 64px  | Page section gaps                  |
| 20    | 80px  | Hero vertical padding              |

---

## 11. Arabic / RTL Rules

**CRITICAL**: Arabic text must NEVER have `letter-spacing` applied. This breaks Arabic ligatures.

| Rule                    | Value                          |
|-------------------------|--------------------------------|
| Font                    | IBM Plex Sans Arabic           |
| Weights used            | 400, 500, 600, 700            |
| Direction               | rtl                            |
| unicode-bidi            | embed (in SVG contexts)        |
| Letter-spacing          | 0 (always!)                    |
| Line-height             | 1.5–1.65                       |
| Placement               | Below English equivalent       |
| Input direction         | rtl                            |
| Button text direction   | rtl                            |

---

*Generated for Yalla London Brand System v2.0*
