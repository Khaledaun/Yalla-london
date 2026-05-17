/**
 * Design Asset Folder System
 *
 * Organizes MediaAsset records into a structured virtual folder hierarchy:
 *   /{siteId}/{platform}/{designType}/{occasion}
 *
 * Uses the existing MediaAsset.folder, .category, .tags, and .site_id fields —
 * no new Prisma models needed.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: "camera" },
  { id: "facebook", label: "Facebook", icon: "thumbs-up" },
  { id: "twitter", label: "X (Twitter)", icon: "twitter" },
  { id: "tiktok", label: "TikTok", icon: "video" },
  { id: "pinterest", label: "Pinterest", icon: "pin" },
  { id: "whatsapp", label: "WhatsApp", icon: "message-circle" },
  { id: "blog", label: "Blog", icon: "book-open" },
  { id: "email", label: "Email", icon: "mail" },
] as const;

export const DESIGN_TYPES = [
  { id: "post", label: "Post", dimensions: "1080x1080" },
  { id: "story", label: "Story", dimensions: "1080x1920" },
  { id: "reel", label: "Reel/Video", dimensions: "1080x1920" },
  { id: "cover", label: "Cover Photo", dimensions: "1640x924" },
  { id: "banner", label: "Banner", dimensions: "1200x628" },
  { id: "ad", label: "Advertisement", dimensions: "1080x1080" },
  { id: "thumbnail", label: "Thumbnail", dimensions: "1280x720" },
  { id: "template", label: "Template", dimensions: "varies" },
] as const;

export const OCCASIONS = [
  { id: "ramadan", label: "Ramadan", emoji: "🌙", months: [2, 3] },
  { id: "eid-al-fitr", label: "Eid al-Fitr", emoji: "🎉", months: [3, 4] },
  { id: "eid-al-adha", label: "Eid al-Adha", emoji: "🐑", months: [6, 7] },
  { id: "christmas", label: "Christmas", emoji: "🎄", months: [12] },
  { id: "new-year", label: "New Year", emoji: "🎆", months: [1, 12] },
  { id: "valentines", label: "Valentine's Day", emoji: "💕", months: [2] },
  { id: "summer", label: "Summer", emoji: "☀️", months: [6, 7, 8] },
  { id: "winter", label: "Winter", emoji: "❄️", months: [12, 1, 2] },
  { id: "spring", label: "Spring", emoji: "🌸", months: [3, 4, 5] },
  { id: "autumn", label: "Autumn", emoji: "🍂", months: [9, 10, 11] },
  { id: "black-friday", label: "Black Friday", emoji: "🏷️", months: [11] },
  { id: "mothers-day", label: "Mother's Day", emoji: "🌷", months: [3, 5] },
  { id: "national-day", label: "National Day", emoji: "🏴", months: [9, 12] },
  { id: "evergreen", label: "Evergreen", emoji: "🌿", months: [] },
] as const;

// ---------------------------------------------------------------------------
// Folder Path Builder
// ---------------------------------------------------------------------------

export function buildFolderPath(
  siteId: string,
  platform?: string,
  designType?: string,
  occasion?: string,
): string {
  const parts = [siteId];
  if (platform) parts.push(platform);
  if (designType) parts.push(designType);
  if (occasion) parts.push(occasion);
  return parts.join("/");
}

/**
 * Parse a folder path back into components.
 */
export function parseFolderPath(path: string): {
  siteId: string;
  platform?: string;
  designType?: string;
  occasion?: string;
} {
  const parts = path.split("/");
  return {
    siteId: parts[0] || "",
    platform: parts[1],
    designType: parts[2],
    occasion: parts[3],
  };
}

/**
 * Auto-generate tags based on folder location.
 */
export function generateFolderTags(
  siteId: string,
  platform?: string,
  designType?: string,
  occasion?: string,
): string[] {
  const tags: string[] = [`site:${siteId}`];
  if (platform) tags.push(`platform:${platform}`);
  if (designType) tags.push(`type:${designType}`);
  if (occasion) tags.push(`occasion:${occasion}`);
  return tags;
}

// ---------------------------------------------------------------------------
// Folder Tree Structure (for UI)
// ---------------------------------------------------------------------------

export interface FolderNode {
  id: string;
  name: string;
  path: string;
  type: "site" | "platform" | "designType" | "occasion";
  count: number;
  children?: FolderNode[];
}

/**
 * Build a folder tree structure with counts from DB data.
 * Used by the asset library UI to render the folder sidebar.
 */
export function buildFolderTree(
  counts: { folder: string; count: number }[],
  siteIds: string[],
): FolderNode[] {
  const countMap = new Map<string, number>();
  for (const c of counts) {
    countMap.set(c.folder, c.count);
  }

  // Helper to sum all descendant counts
  function sumCounts(prefix: string): number {
    let total = 0;
    for (const [path, count] of countMap) {
      if (path.startsWith(prefix)) total += count;
    }
    return total;
  }

  return siteIds.map((siteId) => ({
    id: siteId,
    name: siteId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    path: siteId,
    type: "site" as const,
    count: sumCounts(siteId),
    children: PLATFORMS.map((p) => ({
      id: `${siteId}/${p.id}`,
      name: p.label,
      path: `${siteId}/${p.id}`,
      type: "platform" as const,
      count: sumCounts(`${siteId}/${p.id}`),
      children: DESIGN_TYPES.map((dt) => ({
        id: `${siteId}/${p.id}/${dt.id}`,
        name: dt.label,
        path: `${siteId}/${p.id}/${dt.id}`,
        type: "designType" as const,
        count: sumCounts(`${siteId}/${p.id}/${dt.id}`),
        children: OCCASIONS.map((o) => ({
          id: `${siteId}/${p.id}/${dt.id}/${o.id}`,
          name: o.label,
          path: `${siteId}/${p.id}/${dt.id}/${o.id}`,
          type: "occasion" as const,
          count: countMap.get(`${siteId}/${p.id}/${dt.id}/${o.id}`) || 0,
        })).filter((n) => n.count > 0),
      })).filter((n) => n.count > 0 || n.children!.length > 0),
    })).filter((n) => n.count > 0 || n.children!.length > 0),
  }));
}

/**
 * Get the current season/occasion based on date.
 */
export function getCurrentOccasions(): string[] {
  const month = new Date().getMonth() + 1;
  return OCCASIONS
    .filter((o) => (o.months as readonly number[]).includes(month))
    .map((o) => o.id);
}
