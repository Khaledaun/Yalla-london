/**
 * PDF Guide Template Registry
 *
 * 20 best-selling travel PDF guide types based on Etsy/market research.
 * Each template has: metadata, AI generation prompt, Canva cover prompt,
 * and required user inputs.
 *
 * Sources: Etsy best sellers, Frommer's, Rough Guides, Lonely Planet categories,
 * Gravitymore travel digital products analysis, Issuu hospitality content guide.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GuideTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** What the user fills in before generating */
  inputs: GuideInput[];
  /** Section types this guide produces */
  sectionTypes: string[];
  /** Estimated page count */
  pageEstimate: [number, number];
  /** Price suggestion in USD */
  suggestedPrice: number;
  /** Tags for search/filter */
  tags: string[];
  /** Category grouping */
  category: "destination" | "planning" | "niche" | "food" | "experience";
}

export interface GuideInput {
  key: string;
  label: string;
  type: "text" | "select" | "number" | "textarea";
  placeholder?: string;
  required: boolean;
  options?: string[];
}

// ─── Template Registry ────────────────────────────────────────────────────────

export const GUIDE_TEMPLATES: GuideTemplate[] = [
  // ── TOP 10: Highest sellers ──────────────────────────────────────────────

  {
    id: "city-guide",
    name: "City Travel Guide",
    icon: "🏙️",
    description: "Complete city guide with neighborhoods, attractions, dining, transport, and insider tips. The #1 best-selling travel PDF format.",
    inputs: [
      { key: "city", label: "City", type: "text", placeholder: "e.g., London", required: true },
      { key: "days", label: "Trip Length (days)", type: "number", placeholder: "5", required: true },
      { key: "audience", label: "Target Audience", type: "select", required: true, options: ["General Luxury", "Arab & Muslim Travelers", "Families", "Couples", "Solo Travelers", "Budget Travelers"] },
      { key: "season", label: "Best Season", type: "select", required: false, options: ["Spring", "Summer", "Autumn", "Winter", "Year-round"] },
    ],
    sectionTypes: ["intro", "neighborhoods", "attractions", "dining", "transport", "tips", "budget"],
    pageEstimate: [25, 40],
    suggestedPrice: 9.99,
    tags: ["city", "destination", "comprehensive"],
    category: "destination",
  },
  {
    id: "day-by-day-itinerary",
    name: "Day-by-Day Itinerary",
    icon: "📅",
    description: "Hour-by-hour itinerary with maps, restaurant reservations, transport links, and booking tips. Travelers' favorite planning tool.",
    inputs: [
      { key: "destination", label: "Destination", type: "text", placeholder: "e.g., Istanbul", required: true },
      { key: "days", label: "Number of Days", type: "number", placeholder: "7", required: true },
      { key: "pace", label: "Travel Pace", type: "select", required: true, options: ["Relaxed (2-3 activities/day)", "Moderate (4-5 activities/day)", "Packed (6+ activities/day)"] },
      { key: "interests", label: "Key Interests", type: "text", placeholder: "e.g., history, food, shopping", required: false },
    ],
    sectionTypes: ["intro", "itinerary", "tips", "packing", "budget"],
    pageEstimate: [15, 30],
    suggestedPrice: 7.99,
    tags: ["itinerary", "planning", "daily"],
    category: "planning",
  },
  {
    id: "restaurant-food-guide",
    name: "Restaurant & Food Guide",
    icon: "🍽️",
    description: "Curated restaurant recommendations by cuisine, price range, and neighborhood. Includes halal options, booking tips, and local food markets.",
    inputs: [
      { key: "city", label: "City", type: "text", placeholder: "e.g., London", required: true },
      { key: "cuisineTypes", label: "Cuisine Focus", type: "text", placeholder: "e.g., halal, Michelin, street food, afternoon tea", required: false },
      { key: "budgetRange", label: "Budget Range", type: "select", required: true, options: ["Budget-friendly", "Mid-range", "Fine dining", "All ranges"] },
      { key: "dietaryNeeds", label: "Dietary Needs", type: "text", placeholder: "e.g., halal, vegetarian, gluten-free", required: false },
    ],
    sectionTypes: ["intro", "dining", "tips"],
    pageEstimate: [20, 35],
    suggestedPrice: 6.99,
    tags: ["food", "restaurants", "halal", "dining"],
    category: "food",
  },
  {
    id: "packing-checklist",
    name: "Ultimate Packing Checklist",
    icon: "🧳",
    description: "Categorized packing lists by trip type, climate, and duration. Printable checkboxes. The highest-conversion travel PDF on Etsy.",
    inputs: [
      { key: "tripType", label: "Trip Type", type: "select", required: true, options: ["Beach & Resort", "City Break", "Adventure & Hiking", "Business Travel", "Winter Sports", "Cruise", "Backpacking", "Family Vacation"] },
      { key: "climate", label: "Climate", type: "select", required: true, options: ["Tropical", "Mediterranean", "Cold/Winter", "Desert", "Temperate", "Mixed"] },
      { key: "duration", label: "Trip Duration", type: "select", required: true, options: ["Weekend (2-3 days)", "Short trip (4-7 days)", "Two weeks", "Long trip (3+ weeks)"] },
      { key: "extras", label: "Special Items", type: "text", placeholder: "e.g., baby gear, photography equipment, prayer items", required: false },
    ],
    sectionTypes: ["intro", "packing", "tips"],
    pageEstimate: [8, 15],
    suggestedPrice: 3.99,
    tags: ["packing", "checklist", "printable", "planning"],
    category: "planning",
  },
  {
    id: "luxury-hotel-guide",
    name: "Luxury Hotel & Resort Guide",
    icon: "🏨",
    description: "Curated selection of the best luxury hotels and resorts with honest reviews, price comparisons, and booking strategies.",
    inputs: [
      { key: "destination", label: "Destination", type: "text", placeholder: "e.g., Maldives", required: true },
      { key: "hotelCount", label: "Number of Hotels", type: "number", placeholder: "15", required: true },
      { key: "features", label: "Must-Have Features", type: "text", placeholder: "e.g., private pool, halal dining, kids club, spa", required: false },
      { key: "priceRange", label: "Price Range per Night", type: "select", required: true, options: ["$200-500", "$500-1000", "$1000-2000", "$2000+", "All ranges"] },
    ],
    sectionTypes: ["intro", "resorts", "tips", "budget"],
    pageEstimate: [20, 35],
    suggestedPrice: 8.99,
    tags: ["hotels", "luxury", "resorts", "accommodation"],
    category: "destination",
  },
  {
    id: "budget-travel-guide",
    name: "Budget Travel Guide",
    icon: "💰",
    description: "How to visit a destination affordably — cheap flights, free attractions, budget hotels, money-saving transport hacks, and daily cost breakdowns.",
    inputs: [
      { key: "destination", label: "Destination", type: "text", placeholder: "e.g., Thailand", required: true },
      { key: "dailyBudget", label: "Target Daily Budget", type: "text", placeholder: "e.g., $50/day, £80/day", required: true },
      { key: "days", label: "Trip Length (days)", type: "number", placeholder: "10", required: false },
    ],
    sectionTypes: ["intro", "budget", "tips", "activities", "dining"],
    pageEstimate: [18, 28],
    suggestedPrice: 5.99,
    tags: ["budget", "affordable", "savings", "backpacking"],
    category: "planning",
  },
  {
    id: "halal-muslim-travel",
    name: "Halal & Muslim Travel Guide",
    icon: "🕌",
    description: "Essential guide for Muslim travelers — halal restaurants, prayer facilities, modest-friendly activities, and cultural tips. Our unique niche advantage.",
    inputs: [
      { key: "destination", label: "Destination", type: "text", placeholder: "e.g., London", required: true },
      { key: "focus", label: "Focus Areas", type: "text", placeholder: "e.g., halal food, mosques, family activities", required: false },
      { key: "familySize", label: "Traveling As", type: "select", required: true, options: ["Solo", "Couple", "Family with kids", "Group of friends", "Extended family"] },
    ],
    sectionTypes: ["intro", "dining", "activities", "tips"],
    pageEstimate: [20, 35],
    suggestedPrice: 8.99,
    tags: ["halal", "muslim", "islamic", "prayer", "modest"],
    category: "niche",
  },
  {
    id: "family-travel-guide",
    name: "Family Travel Guide",
    icon: "👨‍👩‍👧‍👦",
    description: "Kid-friendly attractions, family hotels, stroller-accessible routes, rainy day activities, and age-appropriate restaurant recommendations.",
    inputs: [
      { key: "destination", label: "Destination", type: "text", placeholder: "e.g., London", required: true },
      { key: "childAges", label: "Children's Ages", type: "text", placeholder: "e.g., 3 and 7", required: true },
      { key: "days", label: "Trip Length (days)", type: "number", placeholder: "5", required: false },
      { key: "interests", label: "Family Interests", type: "text", placeholder: "e.g., museums, parks, shows, animals", required: false },
    ],
    sectionTypes: ["intro", "activities", "dining", "tips", "packing"],
    pageEstimate: [22, 35],
    suggestedPrice: 7.99,
    tags: ["family", "kids", "children", "stroller", "activities"],
    category: "niche",
  },
  {
    id: "honeymoon-romantic",
    name: "Honeymoon & Romantic Guide",
    icon: "💕",
    description: "Romantic restaurants, couples' experiences, honeymoon suites, sunset spots, and proposal-worthy locations.",
    inputs: [
      { key: "destination", label: "Destination", type: "text", placeholder: "e.g., Maldives", required: true },
      { key: "budget", label: "Budget Level", type: "select", required: true, options: ["Luxury (no limit)", "Premium ($300-500/day)", "Mid-range ($150-300/day)", "Affordable (<$150/day)"] },
      { key: "duration", label: "Trip Duration", type: "select", required: true, options: ["Long weekend", "1 week", "10 days", "2 weeks"] },
      { key: "interests", label: "Couple's Interests", type: "text", placeholder: "e.g., spa, dining, adventure, beach", required: false },
    ],
    sectionTypes: ["intro", "resorts", "dining", "activities", "tips"],
    pageEstimate: [22, 35],
    suggestedPrice: 8.99,
    tags: ["honeymoon", "romantic", "couples", "anniversary"],
    category: "niche",
  },
  {
    id: "shopping-guide",
    name: "Shopping & Souvenirs Guide",
    icon: "🛍️",
    description: "Best shopping districts, luxury boutiques, local markets, tax-free tips, and what to buy where. Includes bargaining strategies.",
    inputs: [
      { key: "city", label: "City", type: "text", placeholder: "e.g., Istanbul", required: true },
      { key: "shoppingStyle", label: "Shopping Style", type: "select", required: true, options: ["Luxury brands", "Local markets & souvenirs", "Fashion & clothing", "All types"] },
      { key: "budget", label: "Shopping Budget", type: "text", placeholder: "e.g., $500, £1000", required: false },
    ],
    sectionTypes: ["intro", "activities", "tips", "budget"],
    pageEstimate: [15, 25],
    suggestedPrice: 5.99,
    tags: ["shopping", "souvenirs", "markets", "luxury", "fashion"],
    category: "experience",
  },

  // ── NEXT 10: Strong sellers ──────────────────────────────────────────────

  {
    id: "adventure-outdoor",
    name: "Adventure & Outdoor Guide",
    icon: "🏔️",
    description: "Hiking trails, water sports, adventure activities, safety tips, and gear recommendations for thrill-seeking travelers.",
    inputs: [
      { key: "destination", label: "Destination", type: "text", placeholder: "e.g., Swiss Alps", required: true },
      { key: "activities", label: "Activities", type: "text", placeholder: "e.g., hiking, diving, skiing, kayaking", required: true },
      { key: "fitnessLevel", label: "Fitness Level", type: "select", required: true, options: ["Beginner-friendly", "Moderate fitness", "Advanced/Athletic"] },
    ],
    sectionTypes: ["intro", "activities", "packing", "tips", "budget"],
    pageEstimate: [18, 30],
    suggestedPrice: 6.99,
    tags: ["adventure", "outdoor", "hiking", "sports", "nature"],
    category: "experience",
  },
  {
    id: "spa-wellness",
    name: "Spa & Wellness Retreat Guide",
    icon: "🧖",
    description: "Best spas, hammams, wellness retreats, yoga studios, and self-care experiences. Includes booking tips and treatment glossaries.",
    inputs: [
      { key: "destination", label: "Destination", type: "text", placeholder: "e.g., Bali, Istanbul", required: true },
      { key: "wellnessType", label: "Wellness Focus", type: "select", required: true, options: ["Luxury spa", "Traditional hammam", "Yoga & meditation", "Thermal baths", "All types"] },
      { key: "budget", label: "Budget Level", type: "select", required: true, options: ["Budget-friendly", "Mid-range", "Luxury", "Ultra-luxury"] },
    ],
    sectionTypes: ["intro", "resorts", "activities", "tips", "budget"],
    pageEstimate: [18, 28],
    suggestedPrice: 6.99,
    tags: ["spa", "wellness", "hammam", "yoga", "relaxation"],
    category: "experience",
  },
  {
    id: "nightlife-entertainment",
    name: "Nightlife & Entertainment Guide",
    icon: "🌃",
    description: "Best bars, clubs, rooftop lounges, live music venues, shows, and evening experiences. Includes dress codes and reservation tips.",
    inputs: [
      { key: "city", label: "City", type: "text", placeholder: "e.g., London", required: true },
      { key: "scene", label: "Scene Preference", type: "select", required: true, options: ["Rooftop bars & lounges", "Live music & shows", "Clubs & dancing", "Cultural evenings", "All of the above"] },
      { key: "nonAlcoholic", label: "Include Non-Alcoholic Options", type: "select", required: false, options: ["Yes", "No"] },
    ],
    sectionTypes: ["intro", "activities", "dining", "tips"],
    pageEstimate: [15, 25],
    suggestedPrice: 5.99,
    tags: ["nightlife", "bars", "entertainment", "shows", "clubs"],
    category: "experience",
  },
  {
    id: "photography-spots",
    name: "Instagram & Photography Spots Guide",
    icon: "📸",
    description: "Most photogenic locations, best times for lighting, camera settings, outfit inspiration, and hidden gems that look amazing on camera.",
    inputs: [
      { key: "destination", label: "Destination", type: "text", placeholder: "e.g., Santorini", required: true },
      { key: "spotCount", label: "Number of Spots", type: "number", placeholder: "20", required: true },
      { key: "style", label: "Photography Style", type: "select", required: true, options: ["Landscape & architecture", "Street & people", "Fashion & lifestyle", "Food photography", "All styles"] },
    ],
    sectionTypes: ["intro", "activities", "tips"],
    pageEstimate: [20, 35],
    suggestedPrice: 7.99,
    tags: ["photography", "instagram", "photogenic", "social media"],
    category: "experience",
  },
  {
    id: "weekend-break",
    name: "Weekend Break Planner",
    icon: "✈️",
    description: "Compact 2-3 day itinerary maximizing a short trip — what to see, where to eat, how to get around, all timed perfectly.",
    inputs: [
      { key: "destination", label: "Destination", type: "text", placeholder: "e.g., Paris", required: true },
      { key: "arrivalDay", label: "Arrival Day", type: "select", required: true, options: ["Friday evening", "Saturday morning", "Thursday evening"] },
      { key: "interests", label: "Top Priorities", type: "text", placeholder: "e.g., food, museums, shopping, nightlife", required: true },
    ],
    sectionTypes: ["intro", "itinerary", "dining", "tips", "budget"],
    pageEstimate: [10, 18],
    suggestedPrice: 4.99,
    tags: ["weekend", "short trip", "city break", "quick"],
    category: "planning",
  },
  {
    id: "beach-island",
    name: "Beach & Island Guide",
    icon: "🏝️",
    description: "Best beaches ranked, island-hopping routes, water activities, beach clubs, and seasonal weather guides.",
    inputs: [
      { key: "destination", label: "Destination / Region", type: "text", placeholder: "e.g., Maldives, Greek Islands, Thai Islands", required: true },
      { key: "tripStyle", label: "Trip Style", type: "select", required: true, options: ["Luxury resort", "Island hopping", "Beach & party", "Family beach", "Secluded & romantic"] },
      { key: "duration", label: "Trip Duration", type: "select", required: true, options: ["3-5 days", "1 week", "10-14 days", "2+ weeks"] },
    ],
    sectionTypes: ["intro", "resorts", "activities", "dining", "tips", "packing"],
    pageEstimate: [22, 35],
    suggestedPrice: 7.99,
    tags: ["beach", "island", "tropical", "resort", "ocean"],
    category: "destination",
  },
  {
    id: "cultural-heritage",
    name: "Cultural & Heritage Trail Guide",
    icon: "🏛️",
    description: "Historical sites, museums, cultural experiences, local traditions, and heritage walking routes with rich storytelling.",
    inputs: [
      { key: "destination", label: "Destination", type: "text", placeholder: "e.g., Istanbul", required: true },
      { key: "period", label: "Historical Focus", type: "text", placeholder: "e.g., Ottoman, Roman, Islamic Golden Age", required: false },
      { key: "interests", label: "Cultural Interests", type: "text", placeholder: "e.g., architecture, art, religious sites, crafts", required: false },
    ],
    sectionTypes: ["intro", "activities", "tips"],
    pageEstimate: [20, 35],
    suggestedPrice: 7.99,
    tags: ["culture", "heritage", "history", "museums", "architecture"],
    category: "experience",
  },
  {
    id: "yacht-charter",
    name: "Yacht Charter Planning Guide",
    icon: "⛵",
    description: "How to charter a yacht — routes, costs, what to expect, packing for yachts, itinerary planning, and crew tipping etiquette.",
    inputs: [
      { key: "region", label: "Sailing Region", type: "text", placeholder: "e.g., French Riviera, Greek Islands, Turkey", required: true },
      { key: "yachtType", label: "Yacht Type", type: "select", required: true, options: ["Motor yacht", "Sailing yacht", "Catamaran", "Gulet", "Superyacht"] },
      { key: "groupSize", label: "Group Size", type: "number", placeholder: "8", required: true },
      { key: "duration", label: "Charter Duration", type: "select", required: true, options: ["Day charter", "Weekend", "1 week", "2 weeks"] },
    ],
    sectionTypes: ["intro", "itinerary", "tips", "packing", "budget"],
    pageEstimate: [25, 40],
    suggestedPrice: 12.99,
    tags: ["yacht", "charter", "sailing", "luxury", "maritime"],
    category: "niche",
  },
  {
    id: "travel-planner-bundle",
    name: "Complete Travel Planner Bundle",
    icon: "📋",
    description: "All-in-one printable planner: pre-trip checklist, budget tracker, daily itinerary pages, packing list, contact sheet, and trip journal.",
    inputs: [
      { key: "tripType", label: "Trip Type", type: "select", required: true, options: ["International vacation", "Domestic road trip", "Business trip", "Cruise", "Backpacking"] },
      { key: "duration", label: "Max Trip Duration", type: "select", required: true, options: ["Weekend", "1 week", "2 weeks", "1 month"] },
    ],
    sectionTypes: ["intro", "itinerary", "packing", "budget", "tips"],
    pageEstimate: [30, 50],
    suggestedPrice: 11.99,
    tags: ["planner", "bundle", "printable", "journal", "tracker"],
    category: "planning",
  },
  {
    id: "seasonal-event",
    name: "Seasonal & Event Guide",
    icon: "🎄",
    description: "Destination guide for a specific season or event — Ramadan travel, Christmas markets, cherry blossom season, Carnival, New Year's Eve.",
    inputs: [
      { key: "destination", label: "Destination", type: "text", placeholder: "e.g., London", required: true },
      { key: "event", label: "Season / Event", type: "text", placeholder: "e.g., Ramadan, Christmas markets, cherry blossoms, NYE", required: true },
      { key: "dates", label: "Approximate Dates", type: "text", placeholder: "e.g., Dec 15-Jan 2", required: false },
    ],
    sectionTypes: ["intro", "activities", "dining", "tips", "packing"],
    pageEstimate: [18, 30],
    suggestedPrice: 6.99,
    tags: ["seasonal", "event", "ramadan", "christmas", "festival"],
    category: "niche",
  },
];

// ─── Prompt Generators ────────────────────────────────────────────────────────

/**
 * Generate the AI content prompt for a specific guide template + user inputs.
 */
export function buildGenerationPrompt(
  templateId: string,
  userInputs: Record<string, string>,
  locale: "en" | "ar",
  siteName: string,
): string {
  const template = GUIDE_TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    return `Create a comprehensive travel guide about ${userInputs.destination || userInputs.city || "the destination"}.`;
  }

  const inputSummary = Object.entries(userInputs)
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const isArabic = locale === "ar";

  const baseInstructions = isArabic
    ? `أنت كاتب سفر محترف تعمل لدى ${siteName}. اكتب بالعربية الفصحى الحديثة.`
    : `You are a professional travel writer for ${siteName}. Write in engaging, first-person style as if you've personally visited.`;

  const sectionList = template.sectionTypes
    .map((s) => `- ${s.charAt(0).toUpperCase() + s.slice(1)}`)
    .join("\n");

  const promptMap: Record<string, string> = {
    "city-guide": `
${baseInstructions}

Create a COMPLETE CITY TRAVEL GUIDE with the following details:
${inputSummary}

REQUIRED SECTIONS (create each as a separate section with ## heading):
${sectionList}

CONTENT RULES:
- Write ${template.pageEstimate[0]}-${template.pageEstimate[1]} pages worth of content (2,500-5,000 words)
- Include SPECIFIC venue names, addresses, and price ranges (use realistic examples)
- Add insider tips that only a local would know
- Include 2-3 "money-saving secrets" per section
- Mention halal dining options naturally where relevant
- Add a "Don't Miss" callout box per neighborhood
- End with a "Quick Reference Card" (emergency numbers, useful phrases, tipping customs)
- Include affiliate-ready hotel and restaurant recommendations with why each is recommended

FORMAT: Use ## for section headers, ### for subsections, bullet points for lists, > for tips/callouts.`,

    "day-by-day-itinerary": `
${baseInstructions}

Create a DETAILED DAY-BY-DAY ITINERARY:
${inputSummary}

STRUCTURE:
For EACH day, provide:
## Day X: [Theme Name]
### Morning (9:00-12:00)
- Activity with specific venue, address, estimated time, and cost
- Transport instructions to next stop

### Afternoon (12:00-17:00)
- Lunch recommendation (name, cuisine, price range, booking tip)
- Afternoon activities with timing

### Evening (17:00-22:00)
- Dinner recommendation
- Evening activity or relaxation suggestion

### Day X Tips
- Best time to visit key attractions
- Money-saving alternatives

ALSO INCLUDE:
- Pre-trip preparation checklist
- Packing list tailored to this itinerary
- Daily budget breakdown
- Map reference suggestions
- Booking timeline (what to book in advance vs. day-of)`,

    "restaurant-food-guide": `
${baseInstructions}

Create a COMPREHENSIVE RESTAURANT & FOOD GUIDE:
${inputSummary}

STRUCTURE:
## Introduction to [City]'s Food Scene
- Food culture overview, meal timing, tipping customs

## Fine Dining (5-8 restaurants)
For each: Name, cuisine, price range ($$-$$$$), must-order dish, booking tip, atmosphere, address

## Casual & Mid-Range (8-10 restaurants)
Same format, focus on value-for-money

## Street Food & Markets (5-8 spots)
Same format, include market hours and best stalls

## Halal Dining Options (5-8 restaurants)
Certified halal or Muslim-owned, grouped by cuisine type

## Cafes & Afternoon Tea (5 spots)
Best for coffee, pastries, and the classic afternoon tea experience

## Food Experiences
Cooking classes, food tours, market tours — with booking links and prices

## Dietary Guide
How to navigate menus for halal/vegetarian/vegan/gluten-free
Useful phrases in local language

## Price Guide & Tips
Average meal costs, reservation apps, best food neighborhoods`,

    "packing-checklist": `
${baseInstructions}

Create the ULTIMATE PACKING CHECKLIST:
${inputSummary}

FORMAT: Use checkbox-style lists (- [ ] Item) for easy printing.

SECTIONS:
## Essential Documents & Money
- [ ] Passport, visa, travel insurance, copies...

## Clothing
Tailored to the trip type and climate specified.
Include quantities (e.g., "5 t-shirts" not just "t-shirts").

## Toiletries & Health
Include prescription reminders, sunscreen SPF recommendation for climate.

## Electronics & Gadgets
Adapter type for destination, portable charger capacity recommendation.

## Travel Comfort
Neck pillow, eye mask, compression socks for flights...

## Destination-Specific Items
Items unique to this trip type (e.g., prayer mat, snorkel gear, hiking poles).

## Carry-On Essentials
What to keep in hand luggage for the flight.

## Pre-Trip Checklist
- [ ] Home prep (stop mail, water plants...)
- [ ] Digital prep (download maps offline, save hotel confirmations...)

## Packing Tips
Rolling vs folding, compression bags, weight limits by airline.`,

    "luxury-hotel-guide": `
${baseInstructions}

Create a LUXURY HOTEL & RESORT GUIDE:
${inputSummary}

For EACH hotel/resort, provide:
### [Hotel Name] ⭐⭐⭐⭐⭐
- **Location:** Specific area and what's nearby
- **Why We Love It:** 2-3 sentences of personal recommendation
- **Room Types:** Suite categories with price ranges
- **Standout Features:** Private pools, butler service, unique amenities
- **Dining:** On-site restaurant highlights, halal options
- **Best For:** Honeymoon / Family / Business / Solo
- **Booking Tip:** Best time to book, loyalty programs, upgrade strategies
- **Price Range:** Per night in high/low season

ALSO INCLUDE:
## How to Choose the Right Hotel
Decision framework based on priorities.

## Booking Strategies
Best platforms, price match guarantees, direct vs OTA.

## Loyalty Programs Worth Joining
Top 3 hotel loyalty programs with benefits breakdown.`,

    "halal-muslim-travel": `
${baseInstructions}

Create a HALAL & MUSLIM-FRIENDLY TRAVEL GUIDE:
${inputSummary}

CRITICAL: This is our competitive advantage. Write with genuine expertise about Muslim travel needs.

SECTIONS:
## Welcome — Why [Destination] is Muslim-Friendly
Overview of Muslim community presence, general friendliness score.

## Halal Dining Guide
- Certified halal restaurants (10+) by neighborhood
- Muslim-owned restaurants
- Supermarkets with halal sections
- Apps and websites for finding halal food locally

## Prayer Facilities
- Major mosques with addresses, Jummah times
- Prayer room locations (airports, malls, hotels)
- Qibla direction tip for the city
- Wudu facilities

## Modest-Friendly Activities
Activities comfortable for modest dress — indoor attractions, nature, family parks.

## Accommodation
Hotels with prayer mats, halal breakfast, female-only spa hours.

## Practical Islamic Travel Tips
- Best areas to stay (proximity to mosques and halal food)
- Ramadan travel considerations
- Eid celebration events if applicable
- Airport prayer rooms

## Cultural Tips
Local customs, appropriate dress, social norms.

## Emergency Contacts
Embassy, Islamic centers, halal certification bodies.`,
  };

  // Fallback for templates without custom prompts
  const customPrompt = promptMap[templateId] || `
${baseInstructions}

Create a comprehensive ${template.name} with the following details:
${inputSummary}

SECTIONS TO INCLUDE:
${sectionList}

Write ${template.pageEstimate[0]}-${template.pageEstimate[1]} pages worth of engaging, practical content.
Include specific names, prices, and actionable tips.
Add insider knowledge and first-hand experience markers.
End each section with a practical tip or recommendation.`;

  return customPrompt.trim();
}

/**
 * Generate a Canva cover design prompt for a specific guide.
 */
export function buildCoverPrompt(
  templateId: string,
  userInputs: Record<string, string>,
  brandColors: { primary: string; secondary: string; accent?: string },
): string {
  const template = GUIDE_TEMPLATES.find((t) => t.id === templateId);
  const destination = userInputs.destination || userInputs.city || userInputs.region || "Travel";
  const guideName = template?.name || "Travel Guide";

  return `CANVA COVER DESIGN BRIEF — ${guideName}

SIZE: A4 Portrait (210mm × 297mm) — PDF cover page

TITLE: "${destination} ${guideName}"
SUBTITLE: "Your Complete Guide by Yalla London"

VISUAL STYLE:
- Clean, modern, luxury travel aesthetic
- Primary color: ${brandColors.primary} (use for title bar or overlay)
- Secondary color: ${brandColors.secondary} (use for accents and subtitle)
- Full-bleed hero photograph of ${destination} as background (60-70% of cover)
- Semi-transparent gradient overlay (bottom 40%) fading from black/dark to transparent
- Title in large, bold serif or elegant sans-serif font (white text on dark overlay)
- Subtitle in lighter weight, slightly smaller
- Small Yalla London logo at bottom center or bottom right

COVER ELEMENTS:
${template?.icon || "🌍"} Icon or decorative element near the title
- "TRAVEL GUIDE" label in small caps above the main title
- Optional: "${template?.pageEstimate?.[0] || 20}+ Pages" badge in corner
- Optional: "2026 Edition" small text

MOOD: ${getMoodForTemplate(templateId)}

DO NOT:
- Use clip art or cartoon elements
- Make it look like a PowerPoint slide
- Use more than 3 fonts
- Crowd the cover — leave breathing room

CANVA SEARCH TERMS FOR BACKGROUND IMAGE:
${getImageSearchTerms(templateId, destination)}`;
}

function getMoodForTemplate(templateId: string): string {
  const moods: Record<string, string> = {
    "city-guide": "Sophisticated urban energy, golden hour cityscape",
    "day-by-day-itinerary": "Organized elegance, clean lines, wanderlust",
    "restaurant-food-guide": "Warm, appetizing, intimate dining atmosphere",
    "packing-checklist": "Clean, organized, satisfying minimalism",
    "luxury-hotel-guide": "Opulent, aspirational, five-star grandeur",
    "budget-travel-guide": "Adventurous, authentic, vibrant street scenes",
    "halal-muslim-travel": "Welcoming, culturally respectful, beautiful Islamic architecture",
    "family-travel-guide": "Warm, joyful, colorful family moments",
    "honeymoon-romantic": "Dreamy, intimate, golden sunset romance",
    "shopping-guide": "Glamorous, vibrant, luxury retail",
    "adventure-outdoor": "Epic, breathtaking, wild natural landscapes",
    "spa-wellness": "Serene, calming, zen-like tranquility",
    "nightlife-entertainment": "Moody, electric, neon-lit sophistication",
    "photography-spots": "Stunning visual composition, golden hour colors",
    "weekend-break": "Spontaneous, exciting, compact city energy",
    "beach-island": "Tropical paradise, turquoise waters, white sand",
    "cultural-heritage": "Rich, historical, architectural grandeur",
    "yacht-charter": "Nautical luxury, azure sea, deck lifestyle",
    "travel-planner-bundle": "Organized, premium stationery, planning aesthetic",
    "seasonal-event": "Festive, atmospheric, seasonal magic",
  };
  return moods[templateId] || "Premium travel, aspirational luxury";
}

function getImageSearchTerms(templateId: string, destination: string): string {
  const terms: Record<string, string> = {
    "city-guide": `"${destination} skyline", "${destination} aerial view", "${destination} landmark golden hour"`,
    "day-by-day-itinerary": `"${destination} street scene", "travel planning flat lay", "${destination} map"`,
    "restaurant-food-guide": `"${destination} restaurant", "fine dining table setting", "${destination} food market"`,
    "packing-checklist": `"luxury suitcase flat lay", "travel packing aesthetic", "passport and luggage"`,
    "luxury-hotel-guide": `"luxury hotel lobby", "${destination} resort pool", "five star hotel room"`,
    "budget-travel-guide": `"${destination} backpacking", "${destination} street market", "budget travel adventure"`,
    "halal-muslim-travel": `"${destination} mosque", "Islamic architecture ${destination}", "halal food ${destination}"`,
    "family-travel-guide": `"family vacation ${destination}", "kids travel", "${destination} family activities"`,
    "honeymoon-romantic": `"${destination} sunset couple", "romantic ${destination}", "honeymoon tropical"`,
    "shopping-guide": `"${destination} shopping street", "luxury boutique", "${destination} market"`,
    "adventure-outdoor": `"${destination} hiking", "adventure travel", "${destination} nature landscape"`,
    "spa-wellness": `"luxury spa", "wellness retreat", "hammam interior"`,
    "nightlife-entertainment": `"${destination} nightlife", "rooftop bar city", "neon lights city"`,
    "photography-spots": `"${destination} photography", "golden hour ${destination}", "instagram ${destination}"`,
    "weekend-break": `"${destination} weekend", "city break", "train station travel"`,
    "beach-island": `"${destination} beach aerial", "tropical island", "turquoise water"`,
    "cultural-heritage": `"${destination} historical", "ancient architecture", "museum interior"`,
    "yacht-charter": `"yacht Mediterranean", "sailing ${destination}", "luxury boat deck"`,
    "travel-planner-bundle": `"travel journal flat lay", "planner notebook", "wanderlust desk"`,
    "seasonal-event": `"${destination} ${destination}", "festive travel", "seasonal celebration"`,
  };
  return terms[templateId] || `"${destination} travel", "${destination} tourism", "luxury travel"`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getTemplate(id: string): GuideTemplate | undefined {
  return GUIDE_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: GuideTemplate["category"]): GuideTemplate[] {
  return GUIDE_TEMPLATES.filter((t) => t.category === category);
}

export function getAllTemplateIds(): string[] {
  return GUIDE_TEMPLATES.map((t) => t.id);
}
