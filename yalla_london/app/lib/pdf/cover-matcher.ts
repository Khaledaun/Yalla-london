/**
 * Cover Matcher — automatically selects the best PDF cover from uploaded library.
 *
 * When a PDF guide is generated, this module:
 * 1. Reads all MediaAsset records with category "pdf-cover"
 * 2. Scores each cover against the guide's metadata (title, destination, topic, template)
 * 3. Returns the best match (or null if no covers uploaded)
 *
 * Covers are matched by filename convention: cover-[category]-[detail].png
 * Categories: destination, hotels, restaurants, nightlife, shopping, afternoon-tea,
 *             family, romantic, ramadan, weekend-break, spring, summer, autumn, winter,
 *             eid, new-year, transport, first-time, budget-luxury, prayer-guide,
 *             day-trips, packing
 */

/** Keyword → cover filename patterns (order = priority) */
const TOPIC_MATCHERS: Array<{ keywords: string[]; coverPatterns: string[] }> = [
  // Specific topics (highest priority)
  { keywords: ["halal", "halal dining", "halal restaurant"], coverPatterns: ["restaurants-halal", "restaurants"] },
  { keywords: ["fine dining", "michelin", "restaurant", "food", "eat", "dining"], coverPatterns: ["restaurants-fine-dining", "restaurants-halal", "restaurants"] },
  { keywords: ["nightlife", "bar", "club", "entertainment", "night"], coverPatterns: ["nightlife"] },
  { keywords: ["hotel", "stay", "accommodation", "resort", "luxury hotel"], coverPatterns: ["hotels-luxury", "hotels"] },
  { keywords: ["shopping", "shop", "harrods", "boutique", "market"], coverPatterns: ["shopping"] },
  { keywords: ["afternoon tea", "tea", "high tea"], coverPatterns: ["afternoon-tea"] },
  { keywords: ["family", "kids", "children", "child-friendly"], coverPatterns: ["family"] },
  { keywords: ["romantic", "couple", "honeymoon", "anniversary", "date"], coverPatterns: ["romantic"] },
  { keywords: ["ramadan", "iftar", "suhoor", "fasting"], coverPatterns: ["ramadan"] },
  { keywords: ["eid", "eid al-fitr", "eid al-adha", "celebrate"], coverPatterns: ["eid"] },
  { keywords: ["prayer", "mosque", "masjid", "salah"], coverPatterns: ["prayer-guide"] },
  { keywords: ["weekend", "48 hours", "short break", "quick"], coverPatterns: ["weekend-break"] },
  { keywords: ["transport", "tube", "underground", "taxi", "getting around"], coverPatterns: ["transport"] },
  { keywords: ["first time", "beginner", "first visit", "everything you need"], coverPatterns: ["first-time"] },
  { keywords: ["budget", "cheap", "affordable", "save money"], coverPatterns: ["budget-luxury"] },
  { keywords: ["day trip", "oxford", "bath", "cotswold", "windsor", "stonehenge"], coverPatterns: ["day-trips"] },
  { keywords: ["packing", "pack", "luggage", "suitcase", "what to bring"], coverPatterns: ["packing"] },
  { keywords: ["new year", "nye", "firework", "countdown"], coverPatterns: ["new-year"] },

  // Seasonal
  { keywords: ["spring", "cherry blossom", "march", "april", "may", "garden"], coverPatterns: ["spring"] },
  { keywords: ["summer", "june", "july", "august", "festival", "rooftop"], coverPatterns: ["summer"] },
  { keywords: ["autumn", "fall", "october", "november", "golden", "cosy"], coverPatterns: ["autumn"] },
  { keywords: ["winter", "christmas", "december", "festive", "market"], coverPatterns: ["winter"] },

  // Neighbourhood / destination specific
  { keywords: ["mayfair", "knightsbridge"], coverPatterns: ["destination-mayfair", "destination-london"] },
  { keywords: ["soho", "covent garden", "west end"], coverPatterns: ["destination-soho", "destination-london"] },
  { keywords: ["south bank", "borough", "waterloo"], coverPatterns: ["destination-south-bank", "destination-london"] },
  { keywords: ["kensington", "chelsea", "royal"], coverPatterns: ["destination-kensington", "destination-london"] },
  { keywords: ["shoreditch", "east london", "brick lane", "hackney"], coverPatterns: ["destination-east-london", "destination-london"] },

  // Generic fallback
  { keywords: ["london", "travel", "guide", "city"], coverPatterns: ["destination-london", "destination-generic"] },
];

export interface CoverMatch {
  assetId: string;
  url: string;
  filename: string;
  score: number;
  matchedPattern: string;
}

/**
 * Find the best cover for a guide based on its metadata.
 *
 * @param title - Guide title (e.g. "Nightlife & Entertainment Guide")
 * @param destination - Destination (e.g. "London", "Mayfair")
 * @param templateId - Template ID (e.g. "city-travel-guide", "hotel-review")
 * @param siteId - Site ID for scoping
 * @returns Best matching cover or null if no covers exist
 */
export async function findBestCover(
  title: string,
  destination: string,
  templateId?: string,
  siteId?: string,
): Promise<CoverMatch | null> {
  const { prisma } = await import("@/lib/db");

  // Load all uploaded covers
  const covers = await prisma.mediaAsset.findMany({
    where: {
      category: "pdf-cover",
      ...(siteId ? { OR: [{ siteId }, { siteId: null }] } : {}),
    },
    select: { id: true, url: true, filename: true, originalFilename: true, tags: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  if (covers.length === 0) return null;

  // Build search text from all metadata
  const searchText = [title, destination, templateId || ""]
    .join(" ")
    .toLowerCase();

  // Score each cover
  let bestMatch: CoverMatch | null = null;
  let bestScore = 0;

  for (const cover of covers) {
    const coverName = (cover.originalFilename || cover.filename || "").toLowerCase();
    const coverTags = Array.isArray(cover.tags) ? (cover.tags as string[]).join(" ").toLowerCase() : "";
    const coverText = `${coverName} ${coverTags}`;

    let score = 0;
    let matchedPattern = "";

    // Check each topic matcher
    for (const matcher of TOPIC_MATCHERS) {
      // Does the guide metadata match this topic's keywords?
      const keywordMatch = matcher.keywords.some((kw) => searchText.includes(kw));
      if (!keywordMatch) continue;

      // Does the cover filename/tags match this topic's cover patterns?
      for (let i = 0; i < matcher.coverPatterns.length; i++) {
        const pattern = matcher.coverPatterns[i];
        if (coverText.includes(pattern)) {
          // Higher score for first pattern (most specific match)
          const patternScore = 100 - i * 20;
          if (patternScore > score) {
            score = patternScore;
            matchedPattern = pattern;
          }
        }
      }
    }

    // Bonus: exact destination match in filename
    if (destination && coverText.includes(destination.toLowerCase())) {
      score += 30;
    }

    // Bonus: template ID match in filename
    if (templateId && coverText.includes(templateId.toLowerCase().replace(/-/g, " "))) {
      score += 20;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        assetId: cover.id,
        url: cover.url,
        filename: cover.originalFilename || cover.filename,
        score,
        matchedPattern,
      };
    }
  }

  // If no topic match found, return the most recently uploaded cover as fallback
  if (!bestMatch) {
    const fallback = covers[0];
    return {
      assetId: fallback.id,
      url: fallback.url,
      filename: fallback.originalFilename || fallback.filename,
      score: 1,
      matchedPattern: "fallback-newest",
    };
  }

  return bestMatch;
}

/**
 * Get all covers grouped by category for the cover picker UI.
 */
export async function getCoversByCategory(siteId?: string): Promise<Record<string, CoverMatch[]>> {
  const { prisma } = await import("@/lib/db");

  const covers = await prisma.mediaAsset.findMany({
    where: {
      category: "pdf-cover",
      ...(siteId ? { OR: [{ siteId }, { siteId: null }] } : {}),
    },
    select: { id: true, url: true, filename: true, originalFilename: true, tags: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const groups: Record<string, CoverMatch[]> = {};

  for (const cover of covers) {
    const name = (cover.originalFilename || cover.filename || "").toLowerCase();

    // Extract category from filename convention: cover-[category]-[detail].png
    const catMatch = name.match(/cover-([a-z-]+?)(?:-\d+)?\.png/);
    const category = catMatch?.[1] || "uncategorized";

    if (!groups[category]) groups[category] = [];
    groups[category].push({
      assetId: cover.id,
      url: cover.url,
      filename: cover.originalFilename || cover.filename,
      score: 0,
      matchedPattern: category,
    });
  }

  return groups;
}
