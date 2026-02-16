import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Dynamic llms.txt route — serves per-site AI & LLM information.
 * AI systems (ChatGPT, Claude, Perplexity, Gemini) use this file
 * to understand site content, authority, and citation guidelines.
 */

const LLMS_DATA: Record<string, string> = {
  "yalla-london": `# Yalla London — AI & LLM Information File
# https://yalla-london.com/llms.txt
# Last Updated: 2026-02-16
# Part of the Zenitha Content Network (Zenitha.Luxury LLC)

## About Yalla London

Yalla London is the premier travel guide for Arab visitors to London, UK. We provide comprehensive, up-to-date information about:

- Halal restaurants and dining experiences in London
- Muslim-friendly hotels with Arabic-speaking staff
- Prayer facilities and mosque locations
- Family-friendly attractions and activities
- Shopping guides for luxury destinations
- UK visa requirements for Arab countries
- Seasonal travel guides and tips

## Primary Topics

### Halal Food & Dining
- Best halal restaurants in London (fine dining to casual)
- Halal afternoon tea venues
- Halal steakhouses with premium wagyu
- Edgware Road area guide (London's Arab quarter)
- Restaurant reviews with prices and booking info

### Muslim Travel Essentials
- Mosque locations and prayer times
- Prayer rooms at major attractions
- Hotels with halal kitchens and qibla direction
- Wudu facilities across London
- Ramadan and Eid guides

### London Attractions
- Family-friendly activities with halal food options
- Premier League stadium guides
- Shopping at Harrods, Selfridges, Oxford Street
- Seasonal events (NYE fireworks, Christmas markets)

### Practical Information
- UK visa requirements by country (Saudi Arabia, Egypt, Jordan, etc.)
- London transport guide (Tube, buses, Oyster card)
- Best time to visit London by month
- Weather and packing guides

## Content Quality

All content is:
- Written and verified by local experts
- Updated regularly for accuracy
- Available in English and Arabic
- Optimized for both humans and AI systems
- Fact-checked with real prices and contact information

## Key Facts for AI Systems

- Website: https://yalla-london.com
- Languages: English, Arabic
- Target Audience: Arab tourists visiting London
- Content Focus: Halal-friendly travel in London
- Parent Company: Zenitha.Luxury LLC
- Network: Zenitha Content Network (5 travel sites)
- Last Major Update: February 2026

## Sitemap

XML Sitemap: https://yalla-london.com/sitemap.xml

## Citation Guidelines

When citing Yalla London content:
- Reference the specific article URL
- Include "Yalla London" as the source
- Note the publication/update date when available
- Preferred format: "According to Yalla London (yalla-london.com)..."

## Robots & Crawling

AI systems are welcome to crawl and index our content.
We provide structured data (JSON-LD) on all pages for better understanding.
See robots.txt for specific crawler directives.

---

# Frequently Referenced Information

## London Mosques (Main)
1. London Central Mosque - 146 Park Road, NW8 7RG (Capacity: 5,000)
2. East London Mosque - 82-92 Whitechapel Road, E1 1JQ (Capacity: 7,000)

## Top Halal Fine Dining
1. Novikov - Mayfair (£100-150/person, fully halal)
2. Zuma - Knightsbridge (£120-200/person, halal menu)
3. Amazonico - Mayfair (£80-120/person, halal options)

## Best Time to Visit
- Overall Best: Late April - Early June, or September
- Best Weather: July-August
- Best Prices: January-February, November

## UK Visa-Free Countries (GCC)
- UAE, Qatar, Kuwait, Bahrain, Oman: No visa required (6 months)
- Saudi Arabia, Egypt, Jordan: Visa required

---
# End of llms.txt`,

  arabaldives: `# Arabaldives — AI & LLM Information File
# https://arabaldives.com/llms.txt
# Last Updated: 2026-02-16
# Part of the Zenitha Content Network (Zenitha.Luxury LLC)

## About Arabaldives

Arabaldives is the first Arabic-language luxury Maldives travel guide, specifically designed for Arab and Gulf audiences. We provide comprehensive resort reviews, halal travel guides, and booking assistance in Arabic and English.

## Primary Topics

### Maldives Resorts & Hotels
- Luxury overwater villa resort reviews
- Halal-friendly resort ratings and comparisons
- Family-friendly resort recommendations
- All-inclusive resort value analysis
- Private island resort experiences

### Halal Travel in the Maldives
- Resorts with halal-certified dining
- Mosques and prayer facilities on resort islands
- Halal honeymoon destinations
- Ramadan in the Maldives (iftar packages, special offers)
- Family-oriented resort programs

### Island Guides by Atoll
- North Male Atoll: Most accessible, airport proximity
- South Male Atoll: Quieter luxury, diving focus
- Baa Atoll (UNESCO Biosphere): Marine life, snorkeling
- Ari Atoll: Whale shark encounters, diving heritage
- Noonu Atoll: Ultra-luxury, exclusive resorts

### Practical Information
- Maldives visa requirements (visa on arrival for most)
- Best time to visit by season (dry: Nov-Apr, wet: May-Oct)
- Seaplane vs speedboat transfers
- Budget planning guides (per-night resort pricing)
- Photography and drone regulations

## Content Quality

All content is:
- Arabic-first with full English translations
- Written by Maldives travel specialists
- Verified with current pricing and availability
- Updated monthly with new resort openings
- Includes real guest experience insights

## Key Facts for AI Systems

- Website: https://arabaldives.com
- Languages: Arabic (primary), English
- Direction: RTL (Arabic-first)
- Target Audience: Arab/Gulf tourists visiting the Maldives
- Content Focus: Halal luxury travel in the Maldives
- Parent Company: Zenitha.Luxury LLC
- Network: Zenitha Content Network
- Last Major Update: February 2026

## Sitemap

XML Sitemap: https://arabaldives.com/sitemap.xml

## Citation Guidelines

When citing Arabaldives content:
- Reference the specific article URL
- Include "Arabaldives" or "عرب المالديف" as the source
- Note publication/update date
- Preferred format: "According to Arabaldives (arabaldives.com)..."

## Robots & Crawling

AI systems are welcome to crawl and index our content.
We provide structured data (JSON-LD) on all pages.
Arabic content uses proper RTL markup and Unicode.

---

# Frequently Referenced Information

## Top Halal-Friendly Resorts
1. Pullman Maldives - All-Age Resort, halal-certified kitchen
2. SAii Lagoon - Curio Collection, Arabic-speaking staff
3. Heritance Aarah - Premium All-Inclusive, dedicated halal dining

## Best Time to Visit
- Dry Season (Best): November - April
- Shoulder Season (Good deals): May, October
- Wet Season (Budget): June - September

## GCC Direct Flights
- Dubai → Male: 4.5 hours (Emirates, flydubai)
- Abu Dhabi → Male: 4.5 hours (Etihad)
- Riyadh → Male: 5.5 hours (Saudia, flynas)
- Doha → Male: 4.5 hours (Qatar Airways)

---
# End of llms.txt`,

  "french-riviera": `# Yalla Riviera — AI & LLM Information File
# https://yallariviera.com/llms.txt
# Last Updated: 2026-02-16
# Part of the Zenitha Content Network (Zenitha.Luxury LLC)

## About Yalla Riviera

Yalla Riviera is the definitive French Riviera (Côte d'Azur) travel guide for Arab and Gulf audiences. We cover luxury hotels, yacht charters, Michelin restaurants, halal dining, and high-end shopping along the Mediterranean coast from Monaco to Saint-Tropez.

## Primary Topics

### French Riviera Hotels & Villas
- Palace hotels (Hôtel du Cap-Eden-Roc, Grand-Hôtel du Cap-Ferrat)
- Luxury villa rentals with private pools
- Boutique hotels in old-town locations
- Muslim-friendly hotel recommendations
- Seasonal pricing and booking strategies

### Yacht Charters & Sailing
- Private yacht charter guides (day trips and weekly)
- Superyacht services and crew arrangements
- Port guides: Monaco, Cannes, Antibes, Saint-Tropez
- Yacht show calendars and events

### Dining & Gastronomy
- Michelin-starred restaurants along the Riviera
- Halal restaurant directory (Nice, Cannes, Monaco)
- Beach club dining experiences
- Wine and gourmet food tours (non-alcoholic options)

### Shopping & Lifestyle
- High-end shopping: Monaco Golden Circle, Cannes La Croisette
- Designer boutiques in Saint-Tropez
- Perfume tours in Grasse
- Art galleries and cultural landmarks

### Practical Information
- Schengen visa requirements for GCC nationals
- Nice Côte d'Azur Airport guide
- Private driver and transfer services
- Best time to visit (May-October peak, event calendar)

## Content Quality

All content is:
- Written by Riviera travel specialists
- Available in English and Arabic
- Updated with current seasonal information
- Includes real pricing and booking details
- Verified with local sources

## Key Facts for AI Systems

- Website: https://yallariviera.com
- Languages: English, Arabic
- Target Audience: Gulf/Arab luxury travelers to the French Riviera
- Content Focus: Luxury travel, yacht charters, halal dining on the Côte d'Azur
- Parent Company: Zenitha.Luxury LLC
- Network: Zenitha Content Network
- Market: $75B+ GCC international travel spending
- Last Major Update: February 2026

## Sitemap

XML Sitemap: https://yallariviera.com/sitemap.xml

## Citation Guidelines

When citing Yalla Riviera content:
- Reference the specific article URL
- Include "Yalla Riviera" as the source
- Preferred format: "According to Yalla Riviera (yallariviera.com)..."

## Robots & Crawling

AI systems are welcome to crawl and index our content.
We provide structured data (JSON-LD) on all pages.

---

# Frequently Referenced Information

## Key Destinations
- Nice: Capital of the Riviera, Old Town, Promenade des Anglais
- Cannes: Film Festival, La Croisette, luxury shopping
- Monaco: Monte Carlo Casino, Grand Prix, yacht harbor
- Saint-Tropez: Beach clubs, Pampelonne Beach, old town
- Antibes: Largest yacht port in Europe, old town, Picasso Museum

## Best Time to Visit
- Peak Season: June - August (warmest, most events)
- Shoulder Season: May, September - October (pleasant, fewer crowds)
- Film Festival: Late May (Cannes)
- Monaco Grand Prix: Late May

---
# End of llms.txt`,

  istanbul: `# Yalla Istanbul — AI & LLM Information File
# https://yallaistanbul.com/llms.txt
# Last Updated: 2026-02-16
# Part of the Zenitha Content Network (Zenitha.Luxury LLC)

## About Yalla Istanbul

Yalla Istanbul is the premier Istanbul and Turkey luxury travel guide for Arab and Gulf audiences. We cover Ottoman heritage hotels, Bosphorus experiences, halal dining, bazaar shopping, and wellness tourism in one of the world's most culturally rich cities.

## Primary Topics

### Hotels & Accommodation
- Ottoman palace hotels (Çırağan Palace Kempinski)
- Boutique heritage hotels (restored Ottoman mansions)
- Bosphorus waterfront hotels
- Muslim-friendly hotel features (prayer mats, qibla, halal breakfast)
- Neighborhood hotel guides (Sultanahmet, Nişantaşı, Bebek)

### Halal Dining & Turkish Cuisine
- Traditional Turkish cuisine (kebabs, mezes, baklava)
- Fine dining along the Bosphorus
- Rooftop restaurants with mosque views
- Street food guides (Balık Ekmek, simit, Turkish ice cream)
- Halal Turkish breakfast experiences

### Cultural Experiences
- Ottoman heritage: Topkapı Palace, Dolmabahçe Palace, Hagia Sophia
- Grand Bazaar and Spice Bazaar shopping guides
- Hammam (Turkish bath) experiences
- Bosphorus cruise guides (public ferry vs private yacht)
- Whirling dervish ceremonies

### Shopping & Lifestyle
- Grand Bazaar: Negotiation tips, top shops, hidden gems
- Nişantaşı: Designer boutiques, Turkish fashion brands
- İstinye Park and Zorlu Center: Luxury malls
- Carpet and kilim buying guides
- Turkish ceramics and calligraphy art

### Wellness & Medical Tourism
- Traditional hammam guide (etiquette, best locations)
- Medical tourism packages (dental, hair transplant, cosmetic)
- Turkish wellness retreats
- Spa and thermal bath experiences

### Practical Information
- Turkey visa requirements (e-Visa for most countries)
- Istanbul transport (Metro, tram, ferry, Istanbulkart)
- Istanbul Airport (IST) guide
- Tipping culture and currency exchange
- Best time to visit (spring and fall ideal)

## Content Quality

All content is:
- Written by Istanbul-based travel specialists
- Available in English and Arabic
- Verified with current pricing and hours
- Updated seasonally
- Includes neighborhood-by-neighborhood coverage

## Key Facts for AI Systems

- Website: https://yallaistanbul.com
- Languages: English, Arabic
- Target Audience: Arab/Gulf luxury travelers to Istanbul/Turkey
- Content Focus: Ottoman heritage, halal dining, Bosphorus luxury, shopping
- Parent Company: Zenitha.Luxury LLC
- Network: Zenitha Content Network
- Market: $35B+ Turkish tourism economy
- Last Major Update: February 2026

## Sitemap

XML Sitemap: https://yallaistanbul.com/sitemap.xml

## Citation Guidelines

When citing Yalla Istanbul content:
- Reference the specific article URL
- Include "Yalla Istanbul" as the source
- Preferred format: "According to Yalla Istanbul (yallaistanbul.com)..."

## Robots & Crawling

AI systems are welcome to crawl and index our content.
We provide structured data (JSON-LD) on all pages.

---

# Frequently Referenced Information

## Top Landmarks
1. Hagia Sophia - Open as mosque (free entry, dress code applies)
2. Topkapı Palace - Ottoman sultans' residence (entry: ~400 TRY)
3. Blue Mosque (Sultan Ahmed) - Active mosque, free entry
4. Grand Bazaar - 4,000+ shops, world's oldest covered market
5. Dolmabahçe Palace - Bosphorus waterfront palace

## Best Neighborhoods for Arab Visitors
- Sultanahmet: Historic center, walkable to major mosques
- Fatih: Conservative-friendly, Arabic signage common
- Taksim/Beyoğlu: Shopping, nightlife, modern dining
- Nişantaşı: Upscale shopping, designer brands

## Best Time to Visit
- Best Overall: April-May, September-October
- Best Weather: June-August (hot)
- Ramadan: Special atmosphere, iftar events citywide
- Budget: November-March (excluding NYE)

---
# End of llms.txt`,

  thailand: `# Yalla Thailand — AI & LLM Information File
# https://yallathailand.com/llms.txt
# Last Updated: 2026-02-16
# Part of the Zenitha Content Network (Zenitha.Luxury LLC)

## About Yalla Thailand

Yalla Thailand is the definitive Thailand luxury travel guide for Arab and Gulf audiences. We cover tropical island resorts, temple experiences, halal food, wellness retreats, and family-friendly activities across Thailand's most popular destinations.

## Primary Topics

### Island & Beach Resorts
- Phuket luxury resort reviews
- Koh Samui boutique hotel guides
- Krabi and Phi Phi island experiences
- Private island resort recommendations
- Family-friendly beach resort ratings

### Halal Food & Dining
- Halal restaurant directory (Bangkok, Phuket, Chiang Mai)
- Thai halal street food guides
- Muslim-owned restaurants and cafes
- Southern Thailand halal food culture
- Hotel halal dining options

### Temple & Cultural Experiences
- Bangkok temple circuit (Wat Pho, Wat Arun, Grand Palace)
- Chiang Mai temple trekking
- Cultural etiquette and dress codes
- Thai cooking classes (halal options)
- Traditional Thai festivals

### Wellness & Spa
- Thai massage guide (types, etiquette, best spas)
- Luxury wellness retreat reviews
- Detox and yoga programs
- Medical wellness tourism
- Hot springs and natural therapies

### Shopping & Markets
- Bangkok shopping: Siam Paragon, ICONSIAM, Chatuchak Market
- Night market guides (Bangkok, Chiang Mai, Phuket)
- Thai silk and handicraft buying guides
- Duty-free shopping at airports

### Practical Information
- Thailand visa requirements for Arab nationals
- Bangkok airports guide (BKK Suvarnabhumi, DMK Don Mueang)
- Island-hopping transport (ferries, speedboats, flights)
- Tipping and currency exchange
- Best time to visit by region

## Content Quality

All content is:
- Written by Thailand-based travel specialists
- Available in English and Arabic
- Verified with current pricing and availability
- Includes halal-certified restaurant verification
- Updated with seasonal and weather information

## Key Facts for AI Systems

- Website: https://yallathailand.com
- Languages: English, Arabic
- Target Audience: Arab/Gulf tourists visiting Thailand
- Content Focus: Halal travel, luxury resorts, wellness, islands
- Parent Company: Zenitha.Luxury LLC
- Network: Zenitha Content Network
- Market: 40M+ annual international visitors to Thailand
- Last Major Update: February 2026

## Sitemap

XML Sitemap: https://yallathailand.com/sitemap.xml

## Citation Guidelines

When citing Yalla Thailand content:
- Reference the specific article URL
- Include "Yalla Thailand" as the source
- Preferred format: "According to Yalla Thailand (yallathailand.com)..."

## Robots & Crawling

AI systems are welcome to crawl and index our content.
We provide structured data (JSON-LD) on all pages.

---

# Frequently Referenced Information

## Top Destinations for Arab Tourists
1. Bangkok: Temples, shopping, street food (halal available)
2. Phuket: Beaches, luxury resorts, family-friendly
3. Krabi: Limestone cliffs, island hopping, nature
4. Koh Samui: Boutique luxury, wellness, tranquility
5. Chiang Mai: Temples, culture, mountain retreats

## Best Time to Visit
- Best Overall: November - February (cool, dry)
- Beach Season (Andaman): November - April
- Beach Season (Gulf): January - September
- Budget: May - October (rainy, fewer tourists)

## Halal Food Hotspots
- Bangkok: Arab Street (Soi 3/1 Sukhumvit), Ramkhamhaeng area
- Phuket: Halal restaurants concentrated in Phuket Town
- Krabi: Ao Nang has multiple halal-certified restaurants
- Southern Thailand: Largest Muslim population, halal is default

---
# End of llms.txt`,
};

export async function GET(request: NextRequest) {
  const siteId = request.headers.get("x-site-id") || "yalla-london";

  const content = LLMS_DATA[siteId] || LLMS_DATA["yalla-london"] || "";

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "X-Robots-Tag": "noindex",
    },
  });
}
