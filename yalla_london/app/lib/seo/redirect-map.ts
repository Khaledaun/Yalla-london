/**
 * Blog Redirect Map — 301 redirects for duplicate article clusters.
 *
 * Each key is a non-canonical slug that should redirect to the canonical version.
 * Used by middleware.ts to issue 301 redirects before any page rendering.
 *
 * Clusters identified from production SEO audit (March 2026):
 * - Hash-suffix duplicates from content pipeline slug collision recovery
 * - Date-stamped variants of the same topic
 * - Near-identical articles that dilute ranking power
 */

export const BLOG_REDIRECTS: Record<string, string> = {
  // ── Halal Fine Dining cluster ──────────────────────────────────────
  "/blog/best-halal-fine-dining-restaurants-london-2025-comparison-79455678":
    "/blog/best-halal-fine-dining-restaurants-london-2025-comparison",
  "/blog/best-halal-fine-dining-restaurants-london-2025-comparison-9088893f":
    "/blog/best-halal-fine-dining-restaurants-london-2025-comparison",
  "/blog/best-halal-fine-dining-restaurants-london-2025-comparison-fasz":
    "/blog/best-halal-fine-dining-restaurants-london-2025-comparison",
  "/blog/best-halal-fine-dining-restaurants-london-2025-comparison-sily":
    "/blog/best-halal-fine-dining-restaurants-london-2025-comparison",

  // ── Luxury Spas cluster ────────────────────────────────────────────
  "/blog/best-luxury-spas-london-2026-women-friendly-halal-1xfb":
    "/blog/best-luxury-spas-london-2026-women-friendly-halal",
  "/blog/best-luxury-spas-london-women-friendly-halal":
    "/blog/best-luxury-spas-london-2026-women-friendly-halal",
  "/blog/luxury-spas-london-arabic":
    "/blog/best-luxury-spas-london-2026-women-friendly-halal",

  // ── London Transport cluster ───────────────────────────────────────
  "/blog/london-transport-guide-tourists-2026-tube-bus-taxi-1pwq":
    "/blog/london-transport-guide-tourists-2026-tube-bus-taxi",

  // ── Edgware Road cluster ───────────────────────────────────────────
  "/blog/edgware-road-london-complete-guide-arab-area-c4f47971":
    "/blog/edgware-road-london-complete-guide-arab-area",

  // ── Islamic Heritage cluster ───────────────────────────────────────
  "/blog/london-islamic-heritage-gems-2026-02-19-0e0828e5":
    "/blog/london-islamic-heritage-gems-2026-02-19-0d2d371b",

  // ── Halal Restaurants (date variant) ───────────────────────────────
  "/blog/halal-restaurants-london-luxury-2024-guide-2026-02-20":
    "/blog/halal-restaurants-london-luxury-2024-guide",

  // ── Luxury Hotels cluster ──────────────────────────────────────────
  "/blog/luxury-hotels-london-arab-families-2025-comparison":
    "/blog/luxury-hotels-london-arab-families",
  "/blog/muslim-friendly-hotels-london-2026-prayer-facilities-halal":
    "/blog/luxury-hotels-london-arab-families",
};
