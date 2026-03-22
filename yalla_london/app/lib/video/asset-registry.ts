/**
 * Video Asset Registry — Central catalog of all video assets across Canva collections.
 *
 * This is the source of truth for the initial import. Each clip from Canva gets:
 * - A unique VID-XXX code
 * - Auto-tagged based on text overlay content analysis
 * - Mapped to appropriate sites based on location/content
 *
 * Self-captured videos get VID-SC-XXX codes and higher authenticity priority.
 */

// ============================================================
// CANVA COLLECTION DEFINITIONS
// ============================================================

export interface CanvaCollection {
  id: string;
  name: string;
  slug: string;
  pageCount: number;
  format: "vertical" | "horizontal" | "square";
  width: number;
  height: number;
  contentType: "reel-template" | "raw-footage" | "text-overlay" | "b-roll";
  description: string;
  /** Older duplicate design ID (skip during import) */
  duplicateOf?: string;
}

export const CANVA_COLLECTIONS: CanvaCollection[] = [
  {
    id: "DAHD7UYNWZ0",
    name: "60 Luxury Travel Videos",
    slug: "60-luxury-travel",
    pageCount: 61,
    format: "vertical",
    width: 1080,
    height: 1920,
    contentType: "text-overlay",
    description: "Themed reels with text overlays — destinations, travel tips, bucket lists, solo travel guides. High production value.",
  },
  {
    id: "DAHD7W0opAg",
    name: "50 Travel Aesthetic Reels",
    slug: "50-aesthetic-reels",
    pageCount: 50,
    format: "vertical",
    width: 1080,
    height: 1920,
    contentType: "reel-template",
    description: "Template reels with editable text boxes — POV formats, aesthetic vibes, morning routines, travel tips lists. Perfect for daily social posting.",
  },
  {
    id: "DAHD7Yn_DTs",
    name: "300+ Beach Clips",
    slug: "300-beach-clips",
    pageCount: 314,
    format: "vertical",
    width: 1080,
    height: 1920,
    contentType: "raw-footage",
    description: "Raw beach and ocean footage — waves, sunsets, tropical scenes, underwater, aerial. B-roll for any travel content.",
  },
  {
    id: "DAHD7YqkCZ4",
    name: "Faceless IG eBook & Templates",
    slug: "faceless-ig-templates",
    pageCount: 52,
    format: "vertical",
    width: 1080,
    height: 1920,
    contentType: "reel-template",
    description: "Social media post/story templates — tips, lists, quotes. Rebrandable for any site.",
  },
  // Duplicate (older) copies — skip during import
  {
    id: "DAGwg1bEguM",
    name: "60 Luxury Travel Videos (old copy)",
    slug: "60-luxury-travel-old",
    pageCount: 61,
    format: "vertical",
    width: 1080,
    height: 1920,
    contentType: "text-overlay",
    description: "Older copy — use DAHD7UYNWZ0 instead",
    duplicateOf: "DAHD7UYNWZ0",
  },
  {
    id: "DAGwg3CI_zM",
    name: "50 Travel Aesthetic Reels (old copy)",
    slug: "50-aesthetic-reels-old",
    pageCount: 50,
    format: "vertical",
    width: 1080,
    height: 1920,
    contentType: "reel-template",
    description: "Older copy — use DAHD7W0opAg instead",
    duplicateOf: "DAHD7W0opAg",
  },
  {
    id: "DAGM4P7gK-s",
    name: "300+ Beach Clips (old copy)",
    slug: "300-beach-clips-old",
    pageCount: 314,
    format: "vertical",
    width: 1080,
    height: 1920,
    contentType: "raw-footage",
    description: "Older copy — use DAHD7Yn_DTs instead",
    duplicateOf: "DAHD7Yn_DTs",
  },
];

/** Only the primary (non-duplicate) collections for import */
export const PRIMARY_COLLECTIONS = CANVA_COLLECTIONS.filter(c => !c.duplicateOf);

// ============================================================
// TAGGING TAXONOMY
// ============================================================

export const TAG_TAXONOMY = {
  location: [
    "london", "dubai", "paris", "europe", "turkey", "istanbul",
    "bali", "greece", "maldives", "egypt", "venice", "new-york",
    "bahamas", "ibiza", "cappadocia", "alaska", "mexico",
    "french-riviera", "thailand", "beach-generic", "city-generic",
    "tropical-generic", "mountain-generic",
  ],
  scene: [
    "hotel", "resort", "restaurant", "beach", "ocean", "pool",
    "city-skyline", "aerial", "sunset", "sunrise", "nightlife",
    "spa", "yacht", "shopping", "market", "mosque", "temple",
    "museum", "garden", "villa", "rooftop", "underwater",
    "street-scene", "food", "cocktail", "interior",
  ],
  mood: [
    "luxury", "adventure", "romantic", "peaceful", "vibrant",
    "aesthetic", "cozy", "dramatic", "playful", "inspirational",
    "mysterious", "elegant", "energetic", "serene",
  ],
  season: [
    "summer", "winter", "spring", "autumn", "ramadan",
    "christmas", "new-year", "eid", "year-round",
  ],
  siteAffinity: [
    "yalla-london",
    "zenitha-yachts-med",
    "arabaldives",
    "french-riviera",
    "istanbul",
    "thailand",
    "all-sites",
  ],
} as const;

export type LocationTag = typeof TAG_TAXONOMY.location[number];
export type SceneTag = typeof TAG_TAXONOMY.scene[number];
export type MoodTag = typeof TAG_TAXONOMY.mood[number];
export type SeasonTag = typeof TAG_TAXONOMY.season[number];
export type SiteAffinityTag = typeof TAG_TAXONOMY.siteAffinity[number];

// ============================================================
// TEXT-TO-TAG MAPPING (auto-tag from Canva text overlays)
// ============================================================

/** Maps keywords found in video text overlays to tags */
export const TEXT_TO_LOCATION_MAP: Record<string, LocationTag> = {
  "london": "london", "uk": "london", "british": "london",
  "dubai": "dubai", "uae": "dubai",
  "paris": "paris", "france": "paris", "french": "paris",
  "europe": "europe", "european": "europe",
  "turkey": "turkey", "turkish": "turkey", "istanbul": "istanbul",
  "bali": "bali", "indonesia": "bali",
  "greece": "greece", "greek": "greece", "santorini": "greece",
  "maldives": "maldives",
  "egypt": "egypt", "pyramid": "egypt", "cairo": "egypt",
  "venice": "venice", "gondola": "venice",
  "new york": "new-york", "ny": "new-york", "manhattan": "new-york",
  "bahama": "bahamas", "bahamas": "bahamas",
  "ibiza": "ibiza",
  "cappadocia": "cappadocia", "capadocia": "cappadocia",
  "alaska": "alaska",
  "mexico": "mexico",
  "riviera": "french-riviera", "côte d'azur": "french-riviera",
  "thailand": "thailand", "thai": "thailand",
  "beach": "beach-generic", "ocean": "beach-generic", "sea": "beach-generic",
  "tropical": "tropical-generic",
};

export const TEXT_TO_SCENE_MAP: Record<string, SceneTag> = {
  "hotel": "hotel", "resort": "resort", "airbnb": "villa",
  "restaurant": "restaurant", "eat": "restaurant", "food": "food", "dining": "restaurant",
  "beach": "beach", "ocean": "ocean", "sea": "ocean", "wave": "ocean",
  "pool": "pool", "swim": "pool",
  "sunset": "sunset", "sunrise": "sunrise",
  "nightlife": "nightlife", "night": "nightlife", "bar": "nightlife",
  "spa": "spa", "wellness": "spa", "relax": "spa",
  "yacht": "yacht", "boat": "yacht", "sail": "yacht",
  "shopping": "shopping", "shop": "shopping", "market": "market",
  "rooftop": "rooftop",
  "cocktail": "cocktail",
  "pyramid": "museum",
};

export const TEXT_TO_MOOD_MAP: Record<string, MoodTag> = {
  "luxury": "luxury", "luxurious": "luxury", "premium": "luxury",
  "adventure": "adventure", "explore": "adventure", "discover": "adventure",
  "romantic": "romantic", "couples": "romantic", "love": "romantic",
  "peaceful": "peaceful", "tranquil": "peaceful", "serene": "serene",
  "vibrant": "vibrant", "energetic": "energetic",
  "aesthetic": "aesthetic", "dreamy": "aesthetic",
  "cozy": "cozy",
  "inspirational": "inspirational", "inspire": "inspirational",
  "elegant": "elegant",
};

// ============================================================
// LOCATION → SITE MAPPING
// ============================================================

export const LOCATION_TO_SITE: Record<string, SiteAffinityTag[]> = {
  "london": ["yalla-london"],
  "dubai": ["yalla-london"], // Arab travelers from Dubai visiting London
  "paris": ["french-riviera", "yalla-london"],
  "europe": ["yalla-london", "french-riviera", "istanbul"],
  "turkey": ["istanbul"],
  "istanbul": ["istanbul"],
  "bali": ["thailand"],
  "greece": ["zenitha-yachts-med", "french-riviera"],
  "maldives": ["arabaldives"],
  "egypt": ["yalla-london"],
  "venice": ["french-riviera", "zenitha-yachts-med"],
  "new-york": ["yalla-london"],
  "bahamas": ["arabaldives"],
  "ibiza": ["zenitha-yachts-med", "french-riviera"],
  "cappadocia": ["istanbul"],
  "alaska": ["yalla-london"],
  "mexico": ["yalla-london"],
  "french-riviera": ["french-riviera"],
  "thailand": ["thailand"],
  "beach-generic": ["arabaldives", "zenitha-yachts-med", "all-sites"],
  "city-generic": ["all-sites"],
  "tropical-generic": ["arabaldives", "thailand"],
  "mountain-generic": ["all-sites"],
};

// ============================================================
// AUTO-TAGGING ENGINE
// ============================================================

export interface AutoTagResult {
  locationTags: string[];
  sceneTags: string[];
  moodTags: string[];
  seasonTags: string[];
  siteAffinity: string[];
}

/**
 * Analyzes text overlay content and returns auto-generated tags.
 * Used during initial Canva import to pre-tag all 477 clips.
 */
export function autoTagFromText(textContent: string): AutoTagResult {
  const lower = textContent.toLowerCase();
  const locations = new Set<string>();
  const scenes = new Set<string>();
  const moods = new Set<string>();
  const seasons = new Set<string>();
  const sites = new Set<string>();

  // Location tags
  for (const [keyword, tag] of Object.entries(TEXT_TO_LOCATION_MAP)) {
    if (lower.includes(keyword)) {
      locations.add(tag);
      // Map location → site
      const sitesForLocation = LOCATION_TO_SITE[tag];
      if (sitesForLocation) {
        sitesForLocation.forEach(s => sites.add(s));
      }
    }
  }

  // Scene tags
  for (const [keyword, tag] of Object.entries(TEXT_TO_SCENE_MAP)) {
    if (lower.includes(keyword)) scenes.add(tag);
  }

  // Mood tags
  for (const [keyword, tag] of Object.entries(TEXT_TO_MOOD_MAP)) {
    if (lower.includes(keyword)) moods.add(tag);
  }

  // Season tags (keyword-based)
  if (lower.includes("summer") || lower.includes("sunny")) seasons.add("summer");
  if (lower.includes("winter") || lower.includes("snow") || lower.includes("christmas")) seasons.add("winter");
  if (lower.includes("ramadan") || lower.includes("eid")) seasons.add("ramadan");
  if (lower.includes("christmas")) seasons.add("christmas");
  if (lower.includes("new year")) seasons.add("new-year");

  // Default to year-round if no season detected
  if (seasons.size === 0) seasons.add("year-round");

  // Default mood if none detected
  if (moods.size === 0) moods.add("luxury");

  // Default site affinity if no location mapped
  if (sites.size === 0) sites.add("all-sites");

  return {
    locationTags: [...locations],
    sceneTags: [...scenes],
    moodTags: [...moods],
    seasonTags: [...seasons],
    siteAffinity: [...sites],
  };
}

// ============================================================
// ASSET CODE GENERATOR
// ============================================================

/**
 * Generates unique asset codes:
 * - Canva purchased: VID-LUX-001, VID-AES-001, VID-BCH-001, VID-TPL-001
 * - Self-captured: VID-SC-001
 * - AI-generated: VID-AI-001
 */
export function generateAssetCode(
  source: "canva-purchased" | "self-captured" | "ai-generated" | "stock",
  collectionSlug: string | null,
  index: number
): string {
  const padded = String(index).padStart(3, "0");

  if (source === "self-captured") return `VID-SC-${padded}`;
  if (source === "ai-generated") return `VID-AI-${padded}`;

  // Collection-based prefix for Canva
  const prefixMap: Record<string, string> = {
    "60-luxury-travel": "LUX",
    "50-aesthetic-reels": "AES",
    "300-beach-clips": "BCH",
    "faceless-ig-templates": "TPL",
  };

  const prefix = (collectionSlug && prefixMap[collectionSlug]) || "STK";
  return `VID-${prefix}-${padded}`;
}

// ============================================================
// PRE-ANALYZED TEXT OVERLAYS (from Canva content scan)
// ============================================================

/**
 * Text content extracted from each page of the 60 Luxury Travel Videos.
 * Used for auto-tagging. Index = page number (1-based).
 */
export const LUXURY_TRAVEL_PAGE_TEXT: Record<number, string> = {
  1: "Travel how to in Style",
  2: "Essential Tips for Luxury Destinations",
  3: "Where to go this summer? Best luxury destinations for couples.",
  4: "Your Dream vacation Luxury",
  5: "Top 10 Luxury Resorts",
  6: "couples luxury destinations Most Romantic",
  7: "Luxury Travel Hacks",
  8: "Sauntering Solo",
  9: "Best Travel Destinations for first time travellers",
  10: "Essential Travel Items",
  11: "How to Find Fun Activities When Traveling",
  12: "My Travel Diary",
  13: "What to do and where to stay in Paris",
  14: "My Best Europe Itinerary",
  15: "guide to a luxury travel to new york",
  16: "Bucket List 7-Day Itinerary In Europe",
  17: "In the mood to travel? Join us.",
  18: "Dubai Travel Guide",
  19: "Luxury Trip Turkey Travel",
  20: "if you can dream it, you can do it. Stop dreaming and start doing. start traveling",
  21: "Journey Travel Vlog #01",
  22: "travel guide best instagram activities in bali",
  23: "3 tips For Solo Travellers Socialize Explore Plan",
  24: "bucket list vacation",
  25: "Find your dream trip to greece",
  26: "HOW TO START a travel blog",
  27: "travel guide Bahama Islands",
  28: "things to do in Dubai 7",
  29: "Enjoy My New Adventure! The Charm of The City of A Thousand Lights",
  30: "Top 3 Travel Destinations In Europe For 2024",
  31: "5 Things to do in Europe Travel My vlog",
  32: "Download The Free Europe Travel Guide On Our Website",
  33: "travel diary Solo Travel Mistakes",
  34: "travel guide Bahama Islands",
  35: "how to become a travel influencer",
  36: "top 10 places to eat in dubai",
  37: "Travel Journey",
  38: "Relax. Recharge. Reconnect.",
  39: "See the pyramids in egypt ride a gondola in venice go diving in mexico walk the great wall of china SEE THE NORTHERN LIGHTS IN ALASKA RIDE A BALLOON IN CAPADOCIA Travel bucketlist",
  40: "TravelSmart Essential Tips for the Modern Explorer",
  41: "Hello summer Paradise Welcome to Summer Vacation",
  42: "My top 5 most stunning beaches",
  43: "Vitamine Sea Where's your favorite beach escape?",
  44: "Travel TIME TO LETS TRAVEL Can I just teleport here forever?",
  45: "Discover tranquility. Prepared to be enveloped in a haven of tranquility and indulgence.",
  46: "Tropical Paradise Dreaming of our next beach vacation. #TravelDreams",
  47: "Luxury airbnb houses for rent in ibiza",
  48: "adventure awaits Swipe up to grab my travel guide!",
  49: "3 Tips for solo travelers Because adventures await, but so does the unexpected.",
  50: "top summer destinations",
  51: "Summer Travel Vlog Beach Resorts in the World 10 Best",
  52: "My Summer Vacation vlog",
  53: "travel Tips",
  54: "Bucket list summer: starting now. Join me on this sunny quest.",
  55: "summer in paradise Top 5 Beach Destinations",
  56: "travel",
  57: "travel",
  58: "travel",
  59: "travel",
  60: "travel",
  61: "travel",
};

/**
 * Text content for the 50 Aesthetic Reels (template-style, mostly editable text boxes).
 */
export const AESTHETIC_REELS_PAGE_TEXT: Record<number, string> = {
  1: "All you need is a little travelling in life!",
  2: "Its time to travel and share your travel stories with your followers",
  3: "pov: Here is your TRAVEL reel",
  4: "A perfect text box here for your travel reel",
  5: "Your travel reel is here You just needed to travel",
  6: "Lets Go POV: text here",
  7: "live laugh travel its time to travel a lot",
  8: "Good Morning Here your text box",
  9: "Travel lots this is your text box",
  10: "book that trip!",
  11: "3 Reasons Why I Love To Travel",
  12: "travel is everything when its done with friends and family",
  13: "time to enjoy text box here",
  14: "Hello there vacation My travel aesthetics",
  15: "Just keep travelling",
  16: "positive vibes only Creating one memory at a time!",
  17: "travel inspo or some great thoughts!",
  18: "Travelling tips for girls",
  19: "Travel dreamy this here is your travel reel",
  20: "travel vlog here is my cute little",
  21: "Share some wisdom or inspo share some inspirational thoughts",
  22: "Catch flights not feelings",
  23: "wherever she went love and joy always followed",
  24: "travel vibes for the rest of the year are just here",
  25: "Loading Here is the text box Travel morning routine",
  26: "happy travels to you",
  27: "rec time to put do not disturb mode on",
  28: "Believe in the magic of the season",
  29: "Time to travel and more!",
  30: "travel", 31: "travel", 32: "travel", 33: "travel", 34: "travel",
  35: "travel", 36: "travel", 37: "travel", 38: "travel", 39: "travel",
  40: "travel", 41: "travel", 42: "travel", 43: "travel", 44: "travel",
  45: "travel", 46: "travel", 47: "travel", 48: "travel", 49: "travel", 50: "travel",
};
