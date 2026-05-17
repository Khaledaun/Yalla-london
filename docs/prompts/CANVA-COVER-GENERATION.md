# Canva MCP — PDF Cover Generation Prompt

> **Purpose:** Give this entire file to Claude (with Canva MCP connected) to generate 30 branded PDF covers, export them as PNG, and upload them to the Yalla London platform.
>
> **Prerequisites:**
> 1. Canva MCP server connected to your Claude session (via Claude Desktop or Claude Code)
> 2. Canva account logged in with your Yalla London Brand Kit loaded
> 3. Yalla London admin dashboard accessible at `https://www.yalla-london.com`

---

## STEP 1: Verify Canva Connection

Before generating anything, verify access:

```
Use the Canva MCP to:
1. Call fetch_current_user_details — confirm you're connected to the right Canva account
2. Call access_user_specific_brand_templates_list — list any existing brand templates
3. Call list_folder_items — check if a "PDF Covers" folder already exists in my Canva projects
```

If no "PDF Covers" folder exists, create one:
```
Call create_user_or_sub_folder with name "PDF Covers"
```

---

## STEP 2: Brand Identity Reference

Every cover MUST use these exact brand elements. This is the Yalla London brand kit:

### Colors
| Name | Hex | Usage |
|------|-----|-------|
| London Red | `#C8322B` | Primary accent, logos, CTAs |
| London Red Dark | `#8b1f1c` | Darker variant for gradients |
| Gold | `#C49A2A` | Secondary accent, luxury feel |
| Gold Light | `#d9b938` | Hover states, highlights |
| Thames Blue | `#3B7EA1` | Tertiary accent |
| Charcoal | `#1C1917` | Dark backgrounds, body text |
| Cream | `#FAF8F4` | Light backgrounds |
| Sand | `#D6D0C4` | Borders, dividers |
| Stone | `#78716C` | Muted text |

### Typography
| Use | Font | Weight |
|-----|------|--------|
| Headings (EN) | Anybody | 700 (Bold) |
| Body (EN) | Source Serif 4 | 300-400 |
| Labels/Codes | IBM Plex Mono | 500-600 |
| Arabic | IBM Plex Sans Arabic | 400-700 |

### Logo Elements
- **Wordmark:** "YALLA" in Anybody 800 + tilted "[LDN]" badge in Thames Blue border
- **Tricolor stripe:** Three segments — Red (#C8322B) | Gold (#C49A2A) | Blue (#3B7EA1)
- **Stamp seal:** Double circle with "YALLA LONDON" curved text, "LDN" center, "GATE Y · 1st CLASS" bottom, three accent dots (red, blue, gold)
- **Boarding pass metadata:** GATE Y · CLASS 1st · TO LONDON

### Design Concept
> "London Red meets Gold & Thames Blue — boarding-pass luxury with editorial warmth"

The boarding pass motif is our core visual identity. Every cover should feel like a premium airline boarding pass or luxury travel document.

---

## STEP 3: Generate All 30 Covers

### Design Specifications
- **Size:** 1200 x 1600 pixels (PDF A4 cover ratio — portrait)
- **Format:** Export as PNG (highest quality)
- **File naming:** `cover-[category]-[detail].png` (this naming convention is critical — our system uses it to auto-match covers to guides)

### Required Elements on EVERY Cover
1. The YALLA logo (wordmark or stamp variant) — top or bottom area
2. The tricolor stripe (Red | Gold | Blue) — as a divider or accent
3. Guide title — large, prominent, readable
4. Subtitle — smaller, descriptive
5. "yalla-london.com" — bottom area
6. One of: boarding pass metadata (GATE Y · CLASS 1st · TO [DESTINATION]) OR stamp seal as watermark

### Style Variations
Alternate between these 4 background styles across the 30 covers:
- **Dark Charcoal** (#1C1917) — gold and white text, luxury feel
- **Cream** (#FAF8F4) — dark text, red/gold accents, editorial feel
- **Red Gradient** (#C8322B → #8b1f1c) — white/gold text, bold feel
- **Thames Blue** (#0a1628 → #3B7EA1) — gold text, sophisticated feel

---

### CATEGORY 1: Destination Guides (8 covers)

Generate these designs one by one using `create_canva_design_with_optional_asset`:

| # | Filename | Title | Subtitle | Background |
|---|----------|-------|----------|------------|
| 1 | `cover-destination-london-01` | London | The Complete Luxury Guide | Dark Charcoal, gold accents |
| 2 | `cover-destination-london-02` | London | The Complete Luxury Guide | Cream, red accents |
| 3 | `cover-destination-mayfair` | Mayfair & Knightsbridge | London's Most Exclusive Neighbourhoods | Cream, elegant gold borders |
| 4 | `cover-destination-soho` | Soho & Covent Garden | Dining, Theatre & Nightlife | Dark, vibrant red accents |
| 5 | `cover-destination-south-bank` | South Bank & Borough | Culture, Markets & Thames Views | Thames Blue gradient |
| 6 | `cover-destination-kensington` | Kensington & Chelsea | Royal London at Its Finest | Gold-heavy, cream background |
| 7 | `cover-destination-east-london` | Shoreditch & East London | Street Art, Markets & Hidden Gems | Dark, modern feel |
| 8 | `cover-destination-generic` | [Leave blank for custom] | [Leave blank for custom] | Dark Charcoal, stamp seal centered |

### CATEGORY 2: Topic Guides (10 covers)

| # | Filename | Title | Subtitle | Background |
|---|----------|-------|----------|------------|
| 9 | `cover-hotels-luxury` | Luxury Hotels | Where to Stay in London | Dark with gold accents |
| 10 | `cover-restaurants-halal` | Halal Dining Guide | London's Best Halal Restaurants | Warm cream, food-inspired |
| 11 | `cover-restaurants-fine-dining` | Fine Dining | Michelin Stars & Hidden Gems | Dark Charcoal, sophisticated |
| 12 | `cover-nightlife` | Nightlife & Entertainment | Bars, Clubs & Late-Night London | Dark, moody, red accent |
| 13 | `cover-shopping` | Shopping Guide | From Harrods to Hidden Boutiques | Cream, luxury retail feel |
| 14 | `cover-afternoon-tea` | Afternoon Tea | London's Finest Tea Experiences | Cream, delicate gold accents |
| 15 | `cover-family` | Family Guide | London with Kids | Bright cream, warm & welcoming |
| 16 | `cover-romantic` | Romantic London | For Couples & Honeymooners | Dark, intimate, red/gold |
| 17 | `cover-ramadan` | Ramadan in London | Iftar, Suhoor & Prayer Spaces | Deep green (#2D5A3D) + gold |
| 18 | `cover-weekend-break` | Weekend Break | 48 Hours in London | Energetic, red gradient |

### CATEGORY 3: Seasonal Guides (6 covers)

| # | Filename | Title | Subtitle | Background |
|---|----------|-------|----------|------------|
| 19 | `cover-spring` | Spring in London | Cherry Blossoms & Garden Escapes | Light cream, soft pink + brand red |
| 20 | `cover-summer` | Summer in London | Festivals, Parks & Rooftop Bars | Warm bright, gold dominant |
| 21 | `cover-autumn` | Autumn in London | Golden Leaves & Cosy Retreats | Warm amber + brand red |
| 22 | `cover-winter` | Winter in London | Christmas Markets & Festive Luxury | Dark Charcoal, gold sparkle |
| 23 | `cover-eid` | Eid in London | Celebrate in Style | Green (#2D5A3D) + gold, festive |
| 24 | `cover-new-year` | New Year's in London | Ring in the New Year | Dark, gold firework feel |

### CATEGORY 4: Practical Guides (6 covers)

| # | Filename | Title | Subtitle | Background |
|---|----------|-------|----------|------------|
| 25 | `cover-transport` | Getting Around London | Transport, Taxis & Tips | Thames Blue, clean |
| 26 | `cover-first-time` | First Time in London | Everything You Need to Know | Cream, welcoming |
| 27 | `cover-budget-luxury` | Luxury on a Budget | Smart Spending in London | Gold + cream, smart feel |
| 28 | `cover-prayer-guide` | Prayer & Mosque Guide | Finding Peace in London | Serene green + gold |
| 29 | `cover-day-trips` | Day Trips from London | Oxford, Bath, Cotswolds & More | Cream, countryside hints + brand colors |
| 30 | `cover-packing` | Packing Guide | What to Bring for Every Season | Clean cream, practical feel |

---

## STEP 4: Export All Covers as PNG

After all 30 designs are created, export each one:

```
For each design created in Step 3:
1. Call initiates_canva_design_export_job with format "png" and quality "pro" (or "regular" if not on Pro plan)
2. Call get_export_job_result to get the download URL
3. Save the download URL — we'll need it in Step 5
```

Export settings:
- Format: PNG
- Quality: Highest available
- Size: 1200 x 1600 px (should match the design size)

---

## STEP 5: Upload to Yalla London Platform

For each exported PNG, upload it to the Yalla London media library:

```
For each exported cover PNG:
1. Download the PNG from the Canva export URL
2. Upload to https://www.yalla-london.com/api/admin/media/upload
   - Method: POST
   - Body: multipart/form-data with:
     - file: the PNG file
     - category: "pdf-cover"
   - Auth: requires admin session cookie
3. Verify the upload succeeded (response has asset.id)
```

**Alternative if direct upload isn't possible:**
Save all 30 export URLs to a file. Khaled can then:
1. Open each URL on his iPhone
2. Save the image to camera roll
3. Go to PDF Workshop → tap "Upload from Canva" → select from camera roll

---

## STEP 6: Organize in Canva

Move all 30 designs into the "PDF Covers" folder created in Step 1:

```
For each design:
  Call move_item to move it into the "PDF Covers" folder
```

This keeps Khaled's Canva workspace organized. He can edit any cover later in Canva and re-export.

---

## How the Auto-Matching Works

Once covers are uploaded to the platform with the correct filenames, the system automatically picks the right cover when generating a PDF guide:

| Guide title contains... | System picks cover named... |
|---|---|
| "nightlife", "bar", "club" | `cover-nightlife` |
| "halal", "halal dining" | `cover-restaurants-halal` |
| "hotel", "stay", "luxury hotel" | `cover-hotels-luxury` |
| "afternoon tea", "high tea" | `cover-afternoon-tea` |
| "ramadan", "iftar" | `cover-ramadan` |
| "Mayfair", "Knightsbridge" | `cover-destination-mayfair` |
| "spring", "cherry blossom" | `cover-spring` |
| "winter", "christmas" | `cover-winter` |
| "family", "kids" | `cover-family` |
| "romantic", "honeymoon" | `cover-romantic` |
| "shopping", "Harrods" | `cover-shopping` |
| "prayer", "mosque" | `cover-prayer-guide` |
| "transport", "tube" | `cover-transport` |
| (anything else about London) | `cover-destination-london` |

The matching logic is in `lib/pdf/cover-matcher.ts`. It scores each cover against the guide's title, destination, and template type, then picks the highest score. If no match, it uses the most recently uploaded cover.

**You can always override** — if you manually select a cover in the PDF Workshop, the auto-matcher is skipped.

---

## Updating Covers Later

To update a cover design:
1. Open the design in Canva → edit it
2. Re-export as PNG (same filename)
3. Upload to the platform again via PDF Workshop
4. The new version replaces the old one in the auto-matcher (newest upload wins for same-named files)

---

## Canva MCP Setup Reference

To connect Canva MCP to Claude:
1. Go to [canva.com/help/mcp-agent-setup](https://www.canva.com/help/mcp-agent-setup/)
2. In Canva: Settings → AI Connector → Generate connection URL
3. Add the MCP server to your Claude config (Claude Desktop settings or `.claude/settings.json`)
4. Restart Claude — Canva tools should appear

Sources:
- [Canva MCP Setup Guide](https://www.canva.com/help/mcp-agent-setup/)
- [Canva MCP Actions Reference](https://www.canva.com/help/mcp-canva-usage/)
- [Canva Connect API Docs](https://www.canva.dev/docs/connect/)
- [Canva AI Connector](https://www.canva.com/ai-connector/)
