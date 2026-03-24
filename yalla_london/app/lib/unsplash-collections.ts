/**
 * Curated Unsplash search configs mapped to Yalla London content categories.
 * Used by components, API routes, and crons to find relevant imagery.
 */

export const UNSPLASH_COLLECTIONS = {
  hero: { query: "London skyline luxury", orientation: "landscape" as const },
  hotels: {
    query: "London luxury hotel interior",
    orientation: "landscape" as const,
  },
  dining: {
    query: "London fine dining restaurant",
    orientation: "landscape" as const,
  },
  experiences: {
    query: "London landmarks attractions",
    orientation: "landscape" as const,
  },
  shopping: {
    query: "London luxury shopping Mayfair",
    orientation: "landscape" as const,
  },
  nightlife: {
    query: "London night city lights",
    orientation: "landscape" as const,
  },
  parks: {
    query: "London royal parks gardens",
    orientation: "landscape" as const,
  },
  culture: {
    query: "London museum gallery art",
    orientation: "landscape" as const,
  },
  // Additional categories for content pipeline
  halal: {
    query: "halal restaurant Middle Eastern food",
    orientation: "landscape" as const,
  },
  afternoon_tea: {
    query: "London afternoon tea luxury",
    orientation: "landscape" as const,
  },
  river: {
    query: "Thames river London bridge",
    orientation: "landscape" as const,
  },
  markets: {
    query: "London market Borough Portobello",
    orientation: "landscape" as const,
  },
} as const;

export type UnsplashCollectionKey = keyof typeof UNSPLASH_COLLECTIONS;

/**
 * Get search config for a collection key
 */
export function getCollectionConfig(key: UnsplashCollectionKey) {
  return UNSPLASH_COLLECTIONS[key];
}

/**
 * Get all available collection keys
 */
export function getCollectionKeys(): UnsplashCollectionKey[] {
  return Object.keys(UNSPLASH_COLLECTIONS) as UnsplashCollectionKey[];
}
