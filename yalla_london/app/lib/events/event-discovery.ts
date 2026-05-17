/**
 * Event Discovery — Auto-discovers London events via Grok web search
 * and creates Event records with Tiqets/TicketNetwork affiliate links.
 *
 * Called by london-news cron (daily at 06:40 UTC).
 * Does NOT require partner APIs — uses Grok to find events,
 * then builds affiliate search links using Travelpayouts marker.
 *
 * Critical Rules:
 * - Rule #97: Grok allowed_domains only accepts ROOT domains
 * - Rule #157: Travelpayouts uses marker-based tracking
 */

const EVENT_SOURCES = [
  "visitlondon.com",
  "timeout.com",
  "londontheatre.co.uk",
  "skiddle.com",
  "eventbrite.co.uk",
];

interface DiscoveredEvent {
  title_en: string;
  title_ar: string;
  description_en: string;
  venue: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  category: string; // Football, Theatre, Festival, Exhibition, Experience, Concert, Attraction
  price_hint: string; // "From £XX" or "Free"
}

// Map event categories to affiliate partners + URL patterns
function buildAffiliateLink(event: DiscoveredEvent, siteId: string): {
  bookingUrl: string;
  affiliateTag: string;
  ticketProvider: string;
} {
  const marker = process.env.TRAVELPAYOUTS_MARKER || "";
  const tp = (url: string) =>
    marker
      ? `${url}${url.includes("?") ? "&" : "?"}marker=${marker}&utm_source=${siteId}`
      : url;

  const titleSlug = event.title_en
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const cat = event.category.toLowerCase();

  // Sports, concerts, theatre → TicketNetwork (6-12.5% commission, 45d cookie)
  if (
    ["football", "concert", "theatre", "musical", "comedy", "sport"].includes(cat)
  ) {
    return {
      bookingUrl: tp(`https://www.ticketnetwork.com/tickets/${titleSlug}-tickets`),
      affiliateTag: "ticketnetwork",
      ticketProvider: "TicketNetwork",
    };
  }

  // Attractions, exhibitions, experiences → Tiqets (3.5-8% commission, 30d cookie)
  return {
    bookingUrl: tp(
      `https://www.tiqets.com/en/london-c824706/?q=${encodeURIComponent(event.title_en)}`
    ),
    affiliateTag: "tiqets",
    ticketProvider: "Tiqets",
  };
}

/**
 * Discover upcoming London events via Grok web search.
 * Returns structured events ready for DB insertion.
 */
export async function discoverEvents(
  budgetMs: number,
  siteId: string,
): Promise<{
  events: Array<DiscoveredEvent & { bookingUrl: string; affiliateTag: string; ticketProvider: string }>;
  status: "success" | "unavailable" | "failed";
  error?: string;
}> {
  const start = Date.now();

  try {
    const { isGrokSearchAvailable, searchWeb } = await import(
      "@/lib/ai/grok-live-search"
    );

    if (!isGrokSearchAvailable()) {
      return { events: [], status: "unavailable", error: "XAI_API_KEY not configured" };
    }

    if (Date.now() - start > budgetMs - 5000) {
      return { events: [], status: "failed", error: "Not enough budget" };
    }

    const today = new Date().toISOString().split("T")[0];
    const prompt = `Search for upcoming London events, shows, exhibitions, concerts, football matches, and theatre performances happening in the next 30 days (from ${today}).

Return ONLY a JSON array of events. Each event must have these fields:
- title_en: Event name in English
- title_ar: Event name in Arabic
- description_en: 1-2 sentence description in English
- venue: Venue name and area (e.g. "O2 Arena, Greenwich")
- date: Date in YYYY-MM-DD format (must be in the future)
- time: Start time in HH:MM format (24h)
- category: One of: Football, Theatre, Concert, Festival, Exhibition, Experience, Comedy
- price_hint: Approximate price like "From £35" or "Free"

Rules:
- Return 5-8 events maximum
- Only include events with confirmed dates
- Mix categories: at least 1 sport, 1 theatre/musical, 1 exhibition or experience
- Prioritise events that tourists would attend
- Do NOT include past events

Return ONLY the JSON array, no other text.`;

    const result = await searchWeb(prompt, {
      allowedDomains: EVENT_SOURCES,
      timeoutMs: Math.min(25000, budgetMs - (Date.now() - start) - 3000),
    });

    // Parse JSON response
    let jsonStr = result.content.trim();
    if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
    if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      return { events: [], status: "failed", error: "Grok returned non-array" };
    }

    // Validate and enrich with affiliate links
    const enriched = parsed
      .filter(
        (e: any) =>
          e.title_en &&
          e.venue &&
          e.date &&
          e.category &&
          new Date(e.date) > new Date(),
      )
      .slice(0, 8)
      .map((e: DiscoveredEvent) => ({
        ...e,
        time: e.time || "19:00",
        price_hint: e.price_hint || "Check website",
        ...buildAffiliateLink(e, siteId),
      }));

    console.log(
      `[event-discovery] Discovered ${enriched.length} events (${result.usage.totalTokens} tokens)`,
    );

    return { events: enriched, status: "success" };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.warn("[event-discovery] Failed:", errMsg);
    return { events: [], status: "failed", error: errMsg };
  }
}

/**
 * Save discovered events to DB as NewsItem records (news_category: "events").
 * Uses the existing NewsItem model — no schema migration needed.
 * Skips duplicates by checking headline_en + event_start_date.
 */
export async function saveDiscoveredEvents(
  events: Array<
    DiscoveredEvent & { bookingUrl: string; affiliateTag: string; ticketProvider: string }
  >,
  siteId: string,
): Promise<{ created: number; skipped: number }> {
  const { prisma } = await import("@/lib/db");

  let created = 0;
  let skipped = 0;

  for (const evt of events) {
    try {
      // Dedup by headline + event date + site
      const slug = evt.title_en
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);

      const eventDate = new Date(evt.date);
      const dateSlug = `${slug}-${evt.date}`;

      const existing = await prisma.newsItem.findFirst({
        where: {
          OR: [
            { slug: dateSlug },
            {
              headline_en: evt.title_en,
              event_start_date: eventDate,
              siteId,
            },
          ],
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Set expiry to day after event
      const expiresAt = new Date(eventDate);
      expiresAt.setDate(expiresAt.getDate() + 1);

      await prisma.newsItem.create({
        data: {
          slug: dateSlug,
          status: "published",
          headline_en: evt.title_en,
          headline_ar: evt.title_ar || evt.title_en,
          summary_en: `${evt.description_en} Venue: ${evt.venue}. ${evt.price_hint}.`,
          summary_ar: evt.title_ar || evt.title_en,
          announcement_en: `${evt.category}: ${evt.title_en}`,
          announcement_ar: evt.title_ar || evt.title_en,
          source_name: evt.ticketProvider,
          source_url: evt.bookingUrl,
          news_category: "events",
          relevance_score: 75,
          is_major: false,
          urgency: "normal",
          event_start_date: eventDate,
          expires_at: expiresAt,
          tags: [evt.category.toLowerCase(), "event", "auto-discovered", evt.affiliateTag],
          keywords: [evt.title_en, evt.venue, evt.category],
          agent_source: "event-discovery",
          agent_notes: `Auto-discovered via Grok. Venue: ${evt.venue}. Time: ${evt.time}. Ticket partner: ${evt.ticketProvider}.`,
          siteId,
          published_at: new Date(),
        },
      });
      created++;
    } catch (err) {
      console.warn(
        `[event-discovery] Failed to save "${evt.title_en}":`,
        err instanceof Error ? err.message : err,
      );
      skipped++;
    }
  }

  return { created, skipped };
}
