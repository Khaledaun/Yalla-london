/**
 * Canva Video Asset Registry
 *
 * Static registry of all purchased Canva video assets, deduplicated.
 * Only the newest copy of each collection is included in CANVA_VIDEO_COLLECTIONS.
 * Older duplicate design IDs are tracked in CANVA_DUPLICATE_IDS for reference.
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface CanvaVideoAsset {
  canvaDesignId: string;
  collectionTitle: string;
  pageIndex: number;
  width: number;
  height: number;
  format: "reel" | "mobile" | "landscape";
  category: string;
  tags: string[];
  suitableFor: string[];
}

export interface CanvaVideoCollection {
  canvaDesignId: string;
  title: string;
  pageCount: number;
  width: number;
  height: number;
  format: "reel" | "mobile" | "landscape";
  category: string;
  tags: string[];
  suitableFor: string[];
  canvaEditUrl: string;
  canvaViewUrl: string;
  createdAt: string;
}

// ─── Collections (deduplicated — newest copies only) ────────────────

export const CANVA_VIDEO_COLLECTIONS: CanvaVideoCollection[] = [
  {
    canvaDesignId: "DAHD7UYNWZ0",
    title: "60 Luxury Travel Videos",
    pageCount: 61,
    width: 1080,
    height: 1920,
    format: "reel",
    category: "luxury-travel",
    tags: ["luxury", "travel", "hotel", "resort", "lifestyle", "aesthetic"],
    suitableFor: [
      "instagram-reel",
      "tiktok",
      "youtube-short",
      "article-hero",
      "social-story",
    ],
    canvaEditUrl: "https://www.canva.com/d/koaJ71F-AecBwEP",
    canvaViewUrl: "https://www.canva.com/d/iBoN0oeiuz9snO4",
    createdAt: "2026-03-12",
  },
  {
    canvaDesignId: "DAHD7W0opAg",
    title: "50 Travel Aesthetic Instagram Reels",
    pageCount: 50,
    width: 1080,
    height: 1920,
    format: "reel",
    category: "travel-aesthetic",
    tags: ["travel", "aesthetic", "instagram", "reel", "cinematic", "social"],
    suitableFor: ["instagram-reel", "tiktok", "social-story"],
    canvaEditUrl: "https://www.canva.com/d/bTuPmYF4mibAtIb",
    canvaViewUrl: "https://www.canva.com/d/85YzJte76aGvBfr",
    createdAt: "2026-03-12",
  },
  {
    canvaDesignId: "DAHD7Yn_DTs",
    title: "300+ Beach Clips",
    pageCount: 314,
    width: 1080,
    height: 1920,
    format: "reel",
    category: "beach-clips",
    tags: [
      "beach",
      "ocean",
      "tropical",
      "summer",
      "sand",
      "waves",
      "palm",
      "sunset",
    ],
    suitableFor: [
      "instagram-reel",
      "tiktok",
      "youtube-short",
      "article-hero",
      "background-loop",
      "social-story",
    ],
    canvaEditUrl: "https://www.canva.com/d/SwKhNZ7b6ojx7PV",
    canvaViewUrl: "https://www.canva.com/d/bpeaS9oQm8ycAfA",
    createdAt: "2026-03-12",
  },
  {
    canvaDesignId: "DAGITnnkzVQ",
    title: "10 Years in Business (Mobile Video)",
    pageCount: 8,
    width: 1080,
    height: 1920,
    format: "mobile",
    category: "brand-promo",
    tags: ["business", "anniversary", "brand", "corporate", "milestone"],
    suitableFor: ["social-story", "brand-intro", "about-page"],
    canvaEditUrl: "https://www.canva.com/d/4-Tgc-OrjYxD8Su",
    canvaViewUrl: "https://www.canva.com/d/otDWt4-bN9gGGqk",
    createdAt: "2024-06-16",
  },
];

// ─── Duplicate IDs (older copies — skip during seed) ────────────────

export const CANVA_DUPLICATE_IDS: string[] = [
  "DAGwg1bEguM", // older copy of DAHD7UYNWZ0 (Aug 19, 2025)
  "DAGwg3CI_zM", // older copy of DAHD7W0opAg (Aug 19, 2025)
  "DAGM4P7gK-s", // older copy of DAHD7Yn_DTs (Aug 4, 2025)
];

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Flattens all collections into individual per-page video assets.
 */
export function getAllVideoAssets(): CanvaVideoAsset[] {
  const assets: CanvaVideoAsset[] = [];
  for (const collection of CANVA_VIDEO_COLLECTIONS) {
    for (let i = 0; i < collection.pageCount; i++) {
      assets.push({
        canvaDesignId: collection.canvaDesignId,
        collectionTitle: collection.title,
        pageIndex: i,
        width: collection.width,
        height: collection.height,
        format: collection.format,
        category: collection.category,
        tags: collection.tags,
        suitableFor: collection.suitableFor,
      });
    }
  }
  return assets;
}

/**
 * Returns all video assets matching a specific category.
 */
export function getVideosByCategory(category: string): CanvaVideoAsset[] {
  return getAllVideoAssets().filter((a) => a.category === category);
}

/**
 * Returns all video assets suitable for a specific platform/use-case.
 */
export function getVideosBySuitability(platform: string): CanvaVideoAsset[] {
  return getAllVideoAssets().filter((a) => a.suitableFor.includes(platform));
}

/**
 * Returns total count of individual video pages across all collections.
 */
export function getTotalVideoCount(): number {
  return CANVA_VIDEO_COLLECTIONS.reduce((sum, c) => sum + c.pageCount, 0);
}
