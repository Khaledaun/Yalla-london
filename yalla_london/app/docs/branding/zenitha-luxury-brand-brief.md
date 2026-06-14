# Zenitha.Luxury — Full Branding Brief

> **Status:** Active brief, ready for design exploration.
> **Last updated:** April 25, 2026
> **Owner:** Khaled N. Aun
> **Purpose:** This document is the source spec for generating Zenitha.Luxury's visual identity. Sections 1–5 are LOCKED constraints. Sections 6–8 are OPEN — they list multiple distinct directions that should be explored in parallel, not collapsed into a single recommendation. Section 9 is the acceptance scorecard. Section 10 lists deliverables.
>
> **How to use:** Hand this brief to a fresh Claude session with the `frontend-design` skill enabled (or to a human designer). Ask for full deliverables across all three logo directions × three palettes × three type pairings. Do not pre-pick a winner.

---

## 1. The brand in one paragraph (locked)

Zenitha.Luxury is a Delaware-registered house of curated travel properties: a network of destination editorial sites (Yalla London, Arabaldives, Yalla Riviera, Yalla Istanbul, Yalla Thailand), a Mediterranean yacht charter platform (Zenitha Yachts), and a future SaaS arm (ZenithaOS). It is **not** a content farm and **not** a deal-aggregator. Its readers are Gulf and international high-net-worth travelers who already buy luxury — they want curation, not sales pressure. The parent brand sits behind every property as the credibility signal: *"This is run by someone with taste, not an algorithm."*

## 2. Audience (locked)

| Tier | Who | What they value |
|---|---|---|
| **A1** | Gulf HNW women, 28–55, curating family travel | Halal awareness, privacy, female-friendly venues, no clichés |
| **A2** | Gulf HNW men, 30–60, planning yachting / charter / business+leisure | Discretion, calendar fit, English+Arabic comms |
| **A3** | International luxury travelers, English-first, age 30+ | Editorial credibility, original POV, no listicle vibes |
| **B1** | Press / media (CNT, Robb Report, Wallpaper, FT How To Spend It) | Founder story, downloadable assets, fact-checkable claims |
| **B2** | Brand partners (hotels, charter ops, retailers) | Audience demographics, partnership terms, professionalism |

## 3. Brand attributes (locked)

**Five adjectives, in priority order:**
1. **Curated** — every choice is a choice, not a feed
2. **Restrained** — quiet luxury, not announced luxury
3. **Bilingual** — Arabic and English are both first-class
4. **Editorial** — magazine-grade voice and visuals
5. **Modern-classical** — old-world references, contemporary execution

**The five adjectives we are NOT:**
- Corporate
- Maximalist / blingy
- Lifestyle-influencer
- Tech-startup
- Tropical-vacation-vibes

## 4. Functional constraints (locked — non-negotiable)

| Constraint | Reason |
|---|---|
| Logo must be **legible at 24×24px** (favicon, OG corner watermark) | Used everywhere across the network |
| Logo must work on **dark, light, and photographic backgrounds** | Sites use varied hero photography |
| Wordmark must work in **English (Latin)** AND have an **Arabic equivalent** of the same visual weight | Arabic is not an afterthought — Arabaldives and 50% of audience use it |
| Color system must accommodate **6 child-brand palettes** (London navy/gold, Maldives turquoise/coral, Riviera navy/champagne/lavender, Istanbul burgundy/copper, Thailand emerald/amber, Yachts navy/aegean) without clashing | The parent must look right in every footer it appears in |
| Typography must support **EN serif/sans pairing** + **Arabic display + body** with comparable optical weight | Display headings appear in both languages on the same page |
| All logo + brand assets delivered as **SVG (vector)** + 4 PNG sizes (24, 64, 256, 1024) | Web + favicon + OG + print |
| Color tokens delivered as **CSS custom properties** matching the existing `--admin-*` / `--zh-*` pattern in the repo | Direct integration with `app/zenitha-luxury-tokens.css` |
| Must pass **WCAG AA** (4.5:1 contrast for body text on backgrounds) | Accessibility is a hard requirement |
| Must include a **monogram/crest** that works **standalone** (no wordmark) | Used as endorsement mark on Yalla sites |

## 5. What the brand must NOT be (locked anti-patterns)

- ❌ Generic "luxury travel" tropes (palm fronds, gold flourishes, scripty fonts, sunset gradients)
- ❌ Web3 / crypto / tech-bro aesthetics (geometric Z monograms with neon, cyber serifs, holographic gradients)
- ❌ Direct visual copy of Aman, Soho House, Mr & Mrs Smith, Condé Nast Traveler — Zenitha competes adjacent to these but must look distinct
- ❌ Hyperbole in voice ("THE BEST," "ULTIMATE," "PARADISE") — already enforced in the SEO content engine; extend to brand-side copy
- ❌ Color palettes that fight any of the 6 child brands (e.g., a primary green would clash with Thailand emerald; a primary burgundy would clash with Istanbul)

---

## 6. Logo — explore THREE distinct directions (open)

Generate options against **all three** so we can compare. Do not pre-pick a winner.

### Direction A — "The Imprint"
A serif wordmark treated like a publisher's imprint at the bottom of a book spine. Think *Faber & Faber*, *Phaidon*, *Penguin Classics*. Confident lettering, generous letter-spacing, no decorative element. Monogram = the letter Z set in the same serif, framed by a thin rule, used as the standalone mark.

**Reference mood (not to copy):** Phaidon book imprint, Aesop wordmark, Sant Ambroeus restaurant marks.

### Direction B — "The Emblem"
A custom monogram-first identity: stylized Z formed by overlapping or mirrored strokes, designed to feel like an old-world Mediterranean shipping house or a private members club crest, but executed with modern minimalism (single weight, no shading, no flourishes). Wordmark sits beneath the emblem in a clean serif.

**Reference mood:** Soho House crest (without the deer), Cipriani / Harry's Bar marks, antique luggage tags.

### Direction C — "The Editorial Mark"
A typographic-only identity. No mark, no monogram. The wordmark IS the brand — a custom serif drawn specifically for "Zenitha.Luxury" with one signature letterform detail (e.g., a unique terminal on the Z, a subtly tall ascender on the L). Used as full lockup or shortened to "Zenitha." for compactness.

**Reference mood:** Aesop, Le Labo, Officine Universelle Buly — brands that refuse to have a logo because the wordmark is the logo.

---

**For each of A, B, C, deliver:**
- Primary lockup (full wordmark, English)
- Arabic lockup (full wordmark, Arabic) — same direction translated, not a different identity
- Standalone mark / monogram (square 1:1 — used as favicon, footer, OG corner)
- Horizontal lockup (mark + wordmark on one line)
- Stacked lockup (mark above wordmark)
- All four in **dark mode (cream on charcoal)** and **light mode (charcoal on cream)** + a third version for **photographic backgrounds** (mark or wordmark in pure cream/champagne with subtle backdrop treatment)

---

## 7. Color — explore THREE distinct palettes (open)

All three must satisfy: WCAG AA, work on top of any of the 6 child-brand colors in a footer context, and avoid the anti-pattern of competing with child palettes.

### Palette 1 — "Townhouse" (charcoal + champagne)
Charcoal as primary surface, cream body, single warm metal accent. Most conservative direction — closest to a Mayfair townhouse / publishing-house feel.

```css
--zl-charcoal:  #1A1A1A;   /* primary surface, footer, headers */
--zl-cream:     #F8F4EC;   /* body background */
--zl-champagne: #D4AF7A;   /* accent — CTAs, links, crest stroke */
--zl-stone:     #6B6760;   /* body text on cream */
--zl-bronze:    #7A5430;   /* hover state, dividers */
--zl-ivory:     #FAFAF7;   /* card surface */
```

### Palette 2 — "Reading Room" (deep oxblood + ivory + brass)
Warmer, more editorial, library/reading-room aesthetic. Distinct from any child brand because no child uses oxblood as primary (Istanbul uses burgundy but in a more saturated direction).

```css
--zl-oxblood:   #4A1F23;   /* primary — used sparingly, mostly hero + footer */
--zl-ivory:     #F5EFE4;   /* body background */
--zl-brass:     #B8924A;   /* accent — slightly cooler than champagne */
--zl-graphite:  #2B2A28;   /* body text on ivory */
--zl-clay:      #C97D5C;   /* highlight — for callouts only, never CTAs */
--zl-paper:     #FBF7EE;   /* card surface */
```

### Palette 3 — "Atelier" (off-black + bone + single signature color)
Most modern direction. Off-black (not pure black), bone-white body, and ONE saturated signature color (proposal: deep ink-blue `#1C2A4A`) used only for hero accents and the crest. Most flexible across child brands because the signature color is rare on the page.

```css
--zl-jet:        #121212;   /* primary surface */
--zl-bone:       #F4EEE3;   /* body background */
--zl-ink:        #1C2A4A;   /* signature color — sparing use */
--zl-graphite:   #2E2C29;   /* body text on bone */
--zl-chalk:      #E8E2D5;   /* dividers, soft surfaces */
--zl-warm-white: #FBF8F1;   /* card surface */
```

**For each palette deliver:** color tokens (CSS variable format), 4 mock screenshots (homepage hero / journal article page / concierge form page / press kit page), contrast audit table.

---

## 8. Typography — explore THREE distinct pairings (open)

### Pairing X — "Magazine"
- Display: **Playfair Display** (700)
- Body: **Inter** (400/500)
- Arabic display: **Tajawal** (700)
- Arabic body: **Tajawal** (400)
- Vibe: Mainstream luxury magazine. Safe, readable, scalable.

### Pairing Y — "Couture"
- Display: **Didot** or **Bodoni Moda** (400 high-contrast)
- Body: **Söhne** or **Neue Haas Grotesk** (400)
- Arabic display: **Cairo** (700) with custom letter-spacing
- Arabic body: **IBM Plex Sans Arabic** (400)
- Vibe: High-fashion editorial. Riskier — Didot fails small.

### Pairing Z — "Library"
- Display: **GT Sectra** or **Tiempos Headline** (500)
- Body: **GT Pressura Mono** for eyebrows, **Tiempos Text** for body
- Arabic display: **GE SS Two** (Bold)
- Arabic body: **GE SS Two** (Light)
- Vibe: Independent publishing house. Most distinctive, hardest to license.

**For each pairing deliver:** type scale (mobile + desktop), specimen page (showing hero headline, body paragraph, eyebrow, pull-quote, button label, caption — in EN AND AR side-by-side).

---

## 9. Acceptance scorecard

Each direction (logo A/B/C × palette 1/2/3 × type X/Y/Z) gets scored against:

| # | Criterion | Pass condition |
|---|---|---|
| 1 | Audience fit | Tested against personas A1–A3 — does it feel made for them? |
| 2 | Anti-cliché | None of the 5 anti-patterns from §5 present |
| 3 | Multi-site harmony | Renders correctly in mock footers of all 6 child sites without clashing |
| 4 | EN+AR parity | Arabic version has equal visual weight, not a translation afterthought |
| 5 | Scale legibility | Wordmark + mark legible at 24px |
| 6 | Contrast | All text/background combos pass WCAG AA |
| 7 | Photographic backdrop | Logo readable on hero photography (charcoal mode + cream mode) |
| 8 | Distinctiveness | Distinct from Aman / Soho House / Mr & Mrs Smith / CNT |
| 9 | Voice match | Visual direction supports the 5 brand attributes from §3 |
| 10 | Implementation | Tokens map cleanly to CSS custom properties; SVG file weight <8KB |

**Each scored 0–2:** 0 = fails, 1 = acceptable, 2 = excellent. Minimum total to ship: **16/20**, with **no zeros** on criteria 4, 5, 6 (the hard constraints).

---

## 10. Deliverables checklist

- [ ] Logo direction A — full set (lockups + monogram, EN + AR, dark/light/photo, SVG + PNG)
- [ ] Logo direction B — full set
- [ ] Logo direction C — full set
- [ ] Palette 1 mock screenshots (4 pages) + token file
- [ ] Palette 2 mock screenshots (4 pages) + token file
- [ ] Palette 3 mock screenshots (4 pages) + token file
- [ ] Type pairing X specimen (EN + AR)
- [ ] Type pairing Y specimen (EN + AR)
- [ ] Type pairing Z specimen (EN + AR)
- [ ] Acceptance scorecard filled in for each direction
- [ ] Recommended 2 finalist combinations (e.g. A+1+X, B+2+Y) — with rationale, NOT a single locked answer

---

## 11. Brand architecture context (reference)

```
                    ZENITHA.LUXURY
              (parent — editorial voice)
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   CONTENT ARM     YACHT ARM       TECH ARM
   "Yalla X"       "Zenitha          "ZenithaOS"
                    Yachts"         (future)
        │              │
   ┌────┼────┐        │
   │    │    │        │
 London Maldives ... zenithayachts.com
```

**Endorsement model:** Each child brand carries a small `A ZENITHA PROPERTY` mark + crest in its footer. Yalla London stays Yalla London; the user discovers the parent only when they look closer. Zenitha Yachts is master-branded (carries the Zenitha name directly).

| Site | Domain | Site ID | Aesthetic | Status |
|------|--------|---------|-----------|--------|
| Yalla London | yalla-london.com | yalla-london | Deep navy + gold | Active |
| Arabaldives | arabaldives.com | arabaldives | Turquoise + coral | Planned |
| Yalla Riviera | yallariviera.com | french-riviera | Mediterranean navy + champagne + lavender | Planned |
| Yalla Istanbul | yallaistanbul.com | istanbul | Burgundy + copper | Planned |
| Yalla Thailand | yallathailand.com | thailand | Emerald + golden amber | Planned |
| Zenitha Yachts | zenithayachts.com | zenitha-yachts-med | Navy + gold + Aegean blue | Built — pending deploy |
| **Zenitha.Luxury** | **zenitha.luxury** | **zenitha-luxury** | **TBD by this brief** | **Not started** |

---

## 12. Questions to resolve before locking a finalist

1. **Photography source** — do we have shoots, or do we license editorial stock from Unsplash+ / Stocksy until shoots happen?
2. **`/concierge` scope** — is this a real service Khaled will fulfill, or aspirational? (If aspirational, hide the page until ready.)
3. **Press kit timing** — does press kit ship at launch or after the first 2–3 properties are live?
4. **Custom typography licensing** — is there budget for GT Sectra / Söhne / Tiempos (commercial licenses ~$1-3K/font), or do we stay on free Google Fonts (Playfair + Inter + Tajawal)?
5. **Logo creation timeline** — generate three directions now, or commission a designer for direction B (Emblem) since custom monograms benefit from human craft?

---

**Implementation handoff (after a finalist is locked):**

- Add `zenitha-luxury` to `config/sites.ts`
- Create `components/zenitha-luxury/` (header, footer, layout primitives — same pattern as Zenitha Yachts)
- Drop final assets into `public/branding/zenitha-luxury/`
- Add tokens to `app/zenitha-luxury-tokens.css`
- Add `parentOrganization` schema to all child sites pointing to `https://www.zenitha.luxury`
- Add `A ZENITHA PROPERTY` footer mark to all Yalla sites and Zenitha Yachts
