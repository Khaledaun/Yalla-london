/**
 * Ticketmaster Discovery API — Real events data
 * Auth: API Key (free, 5,000 calls/day)
 * https://app.ticketmaster.com/discovery/v2/events
 */

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface TicketmasterEvent {
  id: string;
  name: string;
  date: string; // ISO date
  time?: string;
  venue: string;
  city: string;
  imageUrl: string;
  priceMin?: number;
  priceMax?: number;
  currency: string;
  url: string;
  category: string; // sports, music, arts, family, etc.
  segment?: string;
}

interface EventCache {
  events: TicketmasterEvent[];
  fetchedAt: number;
}

const eventCache = new Map<string, EventCache>();

// Ticketmaster city IDs / DMA IDs for our destinations
const SITE_TM_CONFIG: Record<string, { city: string; countryCode: string; dmaId?: string }> = {
  "yalla-london": { city: "London", countryCode: "GB", dmaId: "602" },
  "yalla-istanbul": { city: "Istanbul", countryCode: "TR" },
};

export async function getUpcomingEvents(
  siteId: string,
  options: { limit?: number; category?: string } = {}
): Promise<TicketmasterEvent[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    console.warn("[events] TICKETMASTER_API_KEY not configured");
    return [];
  }

  const config = SITE_TM_CONFIG[siteId];
  if (!config) return []; // Only London and Istanbul have Ticketmaster coverage

  const { limit = 12, category } = options;
  const cacheKey = `${siteId}-${limit}-${category || "all"}`;
  const cached = eventCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.events;
  }

  try {
    const now = new Date().toISOString().split(".")[0] + "Z";
    const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split(".")[0] + "Z";

    const params = new URLSearchParams({
      apikey: apiKey,
      city: config.city,
      countryCode: config.countryCode,
      startDateTime: now,
      endDateTime: endDate,
      size: String(limit),
      sort: "date,asc",
    });

    if (config.dmaId) params.set("dmaId", config.dmaId);
    if (category) params.set("classificationName", category);

    const res = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?${params}`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!res.ok) {
      if (res.status === 429) console.warn("[events] Ticketmaster rate limited");
      throw new Error(`Ticketmaster API ${res.status}`);
    }

    const data = await res.json();
    const rawEvents = data._embedded?.events || [];

    const events: TicketmasterEvent[] = rawEvents.map((e: Record<string, unknown>) => {
      const dates = e.dates as Record<string, unknown> | undefined;
      const start = dates?.start as Record<string, string> | undefined;
      const venues = (e._embedded as Record<string, unknown>)?.venues as Array<Record<string, unknown>> | undefined;
      const venue = venues?.[0];
      const prices = e.priceRanges as Array<{ min?: number; max?: number; currency?: string }> | undefined;
      const price = prices?.[0];
      const images = e.images as Array<{ url: string; ratio?: string; width?: number }> | undefined;
      const classifications = e.classifications as Array<{ segment?: { name?: string }; genre?: { name?: string } }> | undefined;
      // Pick the best image — prefer 16:9 ratio, large width
      const bestImage = images?.find((img) => img.ratio === "16_9" && (img.width || 0) >= 640)
        || images?.find((img) => img.ratio === "16_9")
        || images?.[0];

      return {
        id: e.id as string,
        name: e.name as string,
        date: start?.localDate || "",
        time: start?.localTime,
        venue: (venue?.name as string) || config.city,
        city: ((venue?.city as Record<string, string> | undefined)?.name) || config.city,
        imageUrl: bestImage?.url || "",
        priceMin: price?.min,
        priceMax: price?.max,
        currency: price?.currency || (siteId === "yalla-london" ? "GBP" : "USD"),
        url: e.url as string || "",
        category: classifications?.[0]?.genre?.name || classifications?.[0]?.segment?.name || "Event",
        segment: classifications?.[0]?.segment?.name,
      };
    });

    eventCache.set(cacheKey, { events, fetchedAt: Date.now() });
    return events;
  } catch (err) {
    console.warn("[events] Ticketmaster failed:", err instanceof Error ? err.message : String(err));
    return cached?.events || [];
  }
}

/**
 * Format event date for display
 */
export function formatEventDate(dateStr: string): { day: string; month: string; monthFull: string } {
  const d = new Date(dateStr + "T00:00:00");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return {
    day: String(d.getDate()).padStart(2, "0"),
    month: months[d.getMonth()],
    monthFull: monthsFull[d.getMonth()],
  };
}

export function formatEventPrice(event: TicketmasterEvent): string {
  if (!event.priceMin) return "See prices";
  const sym = event.currency === "GBP" ? "£" : event.currency === "EUR" ? "€" : "$";
  if (event.priceMax && event.priceMax !== event.priceMin) {
    return `${sym}${Math.round(event.priceMin)} – ${sym}${Math.round(event.priceMax)}`;
  }
  return `From ${sym}${Math.round(event.priceMin)}`;
}
