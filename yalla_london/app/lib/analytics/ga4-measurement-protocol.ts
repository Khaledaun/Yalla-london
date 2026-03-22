/**
 * GA4 Measurement Protocol — Server-Side Event Tracking
 *
 * Fires events to GA4 from the backend (API routes, cron jobs) without
 * requiring client-side JavaScript. Uses the GA4 Measurement Protocol.
 *
 * Required env vars:
 *   GA4_MEASUREMENT_ID — GA4 measurement ID (e.g., "G-XXXXXXXXXX")
 *                        Falls back to NEXT_PUBLIC_GA_MEASUREMENT_ID
 *   GA4_API_SECRET     — Measurement Protocol API secret
 *                        (Create at: GA4 Admin → Data Streams → your stream → Measurement Protocol API secrets)
 *
 * Usage:
 *   await fireGA4Event("affiliate_click", { affiliate_partner: "booking.com" }, "client-123");
 */

const GA4_MP_ENDPOINT = "https://www.google-analytics.com/mp/collect";

interface GA4EventParams {
  [key: string]: string | number | boolean | undefined;
}

function getConfig(): { measurementId: string; apiSecret: string } | null {
  const measurementId =
    process.env.GA4_MEASUREMENT_ID ||
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
    "";
  const apiSecret = process.env.GA4_API_SECRET || "";

  if (!measurementId || measurementId === "G-XXXXX" || !apiSecret) {
    return null;
  }

  return { measurementId, apiSecret };
}

/**
 * Fire a single event to GA4 via Measurement Protocol.
 * Fire-and-forget — never throws, never blocks caller.
 */
export async function fireGA4Event(
  eventName: string,
  params: GA4EventParams,
  clientId?: string
): Promise<boolean> {
  const config = getConfig();
  if (!config) return false;

  // GA4 requires a client_id — use provided or generate a server-side one
  const cid = clientId || `server-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const url = `${GA4_MP_ENDPOINT}?measurement_id=${config.measurementId}&api_secret=${config.apiSecret}`;

    // Strip undefined values from params
    const cleanParams: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) cleanParams[k] = v;
    }

    const body = {
      client_id: cid,
      events: [
        {
          name: eventName,
          params: {
            ...cleanParams,
            engagement_time_msec: 100, // Required for events to show in reports
          },
        },
      ],
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000), // 5s timeout — never block the redirect
    });

    // GA4 MP returns 204 on success, 2xx on validation mode
    return res.status >= 200 && res.status < 300;
  } catch (err) {
    console.warn(
      "[ga4-mp] Failed to fire event:",
      err instanceof Error ? err.message : String(err)
    );
    return false;
  }
}

/**
 * Fire an affiliate click event to GA4.
 */
export async function fireAffiliateClickEvent(opts: {
  partner: string;
  linkId: string;
  pageUrl: string;
  affiliateUrl: string;
  siteId?: string;
  articleSlug?: string;
  device?: string;
  country?: string;
  clientId?: string;
}): Promise<boolean> {
  return fireGA4Event(
    "affiliate_click",
    {
      affiliate_partner: opts.partner,
      affiliate_link_id: opts.linkId,
      page_location: opts.pageUrl,
      affiliate_url: opts.affiliateUrl,
      site_id: opts.siteId,
      article_slug: opts.articleSlug,
      device_category: opts.device,
      country: opts.country,
      content_group: "monetization",
    },
    opts.clientId
  );
}

/**
 * Check if GA4 Measurement Protocol is configured.
 */
export function isGA4MPConfigured(): boolean {
  return getConfig() !== null;
}
