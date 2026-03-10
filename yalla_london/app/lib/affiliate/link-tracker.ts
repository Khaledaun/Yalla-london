/**
 * CJ Affiliate Click Tracking
 *
 * Tracks clicks on affiliate links, records to CjClickEvent,
 * and generates internal tracking redirect URLs.
 */

// ---------------------------------------------------------------------------
// Click Tracking
// ---------------------------------------------------------------------------

/**
 * Record an affiliate link click event.
 */
export async function trackClick(opts: {
  linkId: string;
  pageUrl: string;
  userAgent?: string;
  sessionId?: string;
  country?: string;
}): Promise<string | null> {
  try {
    const { prisma } = await import("@/lib/db");

    const device = detectDevice(opts.userAgent || "");

    await prisma.cjClickEvent.create({
      data: {
        linkId: opts.linkId,
        pageUrl: opts.pageUrl,
        userAgent: opts.userAgent || null,
        sessionId: opts.sessionId || null,
        country: opts.country || null,
        device,
      },
    });

    // Update click count on the link
    await prisma.cjLink.update({
      where: { id: opts.linkId },
      data: {
        clicks: { increment: 1 },
        lastClickAt: new Date(),
      },
    });

    // Get the affiliate URL for redirect
    const link = await prisma.cjLink.findUnique({
      where: { id: opts.linkId },
      select: { affiliateUrl: true },
    });

    return link?.affiliateUrl || null;
  } catch (err) {
    console.warn("[link-tracker] Failed to track click:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

/**
 * Generate an internal tracking URL that wraps the CJ affiliate URL.
 * When clicked, it tracks the click then 302 redirects to the CJ URL.
 */
export function generateTrackingUrl(linkId: string, baseUrl?: string): string {
  const base = baseUrl || "";
  return `${base}/api/affiliate/click?id=${encodeURIComponent(linkId)}`;
}

/**
 * Record an impression for affiliate links shown on a page.
 */
export async function trackImpressions(linkIds: string[]): Promise<void> {
  if (linkIds.length === 0) return;

  try {
    const { prisma } = await import("@/lib/db");

    // Batch update impressions
    await prisma.cjLink.updateMany({
      where: { id: { in: linkIds } },
      data: { impressions: { increment: 1 } },
    });
  } catch (err) {
    console.warn("[link-tracker] Failed to track impressions:", err instanceof Error ? err.message : String(err));
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectDevice(userAgent: string): "DESKTOP" | "MOBILE" | "TABLET" {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|kindle|playbook/i.test(ua)) return "TABLET";
  if (/mobile|iphone|ipod|android.*mobile|opera mini|opera mobi/i.test(ua)) return "MOBILE";
  return "DESKTOP";
}
