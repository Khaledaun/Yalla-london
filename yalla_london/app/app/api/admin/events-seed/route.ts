/**
 * Events Seed + Refresh
 *
 * GET  /api/admin/events-seed?dryRun=true
 *      Previews the 50 events that WOULD be seeded (no DB writes).
 *
 * POST /api/admin/events-seed
 *      Body: { siteId?: string, target?: number = 50, replace?: boolean = false }
 *      Fetches up to `target` upcoming events from Ticketmaster, transforms
 *      each into an Event row with SportsEvents365 affiliate URL by category.
 *      Idempotent — dedups by Ticketmaster id (stored in affiliateTag as
 *      "tm-<id>"). If `replace=true`, archives all previous TM-seeded events
 *      first so the page always shows the freshest 50.
 *
 * Khaled's ask: "fill the events page with offers and links and articles
 * and launch it. Make it compelling with 50 updated events."
 *
 * The category-to-SE365 mapping ensures every event card has a working
 * tracked affiliate link:
 *   Sports / Football → /football/england/premier-league
 *   Music / Concerts  → /concerts/london
 *   Arts / Theatre    → /london (general events catalog)
 *   Family            → /london
 *   Default           → /london
 *
 * Auto-erase rule (per Khaled's May 16 ask) is enforced by the public
 * /api/events GET handler via isEventStillVisible() — this endpoint
 * just populates the catalog; freshness filtering is read-side.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

const DEFAULT_TARGET = 50;
const BUDGET_MS = 100_000;

// Category → SportsEvents365 path. The a_aid is appended by the deep link
// helper. Categories without a strong SE365 match fall back to general London.
const CATEGORY_TO_SE365_PATH: Record<string, string> = {
  sports: "/football/england/premier-league",
  football: "/football/england/premier-league",
  soccer: "/football/england/premier-league",
  music: "/concerts/london",
  concerts: "/concerts/london",
  arts: "/london",
  theatre: "/london",
  comedy: "/london",
  family: "/london",
  miscellaneous: "/london",
  film: "/london",
};

function buildSe365Url(category: string, aid: string): string {
  const cat = (category || "").toLowerCase();
  const path = CATEGORY_TO_SE365_PATH[cat] || "/london";
  return `https://www.sportsevents365.com${path}?a_aid=${aid}`;
}

function normalizeCategory(tmCategory: string): string {
  const c = (tmCategory || "").toLowerCase();
  if (c.includes("sport") || c.includes("football") || c.includes("soccer")) return "Football";
  if (c.includes("music") || c.includes("concert")) return "Concerts";
  if (c.includes("art") || c.includes("theatre") || c.includes("theater")) return "Theatre";
  if (c.includes("comedy")) return "Comedy";
  if (c.includes("family")) return "Family";
  return "Experience";
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const url = request.nextUrl;
  const { getDefaultSiteId } = await import("@/config/sites");
  const siteId = url.searchParams.get("siteId") || getDefaultSiteId();
  const target = Math.min(parseInt(url.searchParams.get("target") || String(DEFAULT_TARGET), 10), 100);
  const dryRun = url.searchParams.get("dryRun") === "true";

  const aid = process.env.SPORTSEVENTS365_AID || "";
  const tmKey = process.env.TICKETMASTER_API_KEY || "";

  if (!tmKey) {
    return NextResponse.json(
      { success: false, error: "TICKETMASTER_API_KEY not configured — cannot fetch events" },
      { status: 503 },
    );
  }

  const { getUpcomingEvents, formatEventPrice } = await import("@/lib/apis/events");
  const tmEvents = await getUpcomingEvents(siteId, { limit: target });

  if (tmEvents.length === 0) {
    return NextResponse.json({
      success: false,
      message: "Ticketmaster returned 0 events for this site",
      siteId,
    });
  }

  const transformed = tmEvents.map((e) => {
    const category = normalizeCategory(e.category);
    return {
      ticketmasterId: e.id,
      title_en: e.name,
      title_ar: null as string | null, // populated by content-auto-fix Section 16b
      description_en: `${e.name} at ${e.venue}, ${e.city}.`,
      description_ar: null as string | null,
      date: e.date,
      time: e.time || "19:00",
      venue: e.venue,
      category,
      price: formatEventPrice(e),
      image: e.imageUrl,
      bookingUrl: buildSe365Url(category, aid || "MISSING_AID"),
      affiliateTag: `tm-${e.id}`,
      ticketProvider: "SportsEvents365",
      sourceUrl: e.url, // keep TM URL for human verification
    };
  });

  if (dryRun) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      siteId,
      aidPresent: !!aid,
      target,
      ticketmasterReturned: tmEvents.length,
      categoryBreakdown: Object.fromEntries(
        Object.entries(
          transformed.reduce<Record<string, number>>((acc, e) => {
            acc[e.category] = (acc[e.category] || 0) + 1;
            return acc;
          }, {}),
        ),
      ),
      sample: transformed.slice(0, 5),
    });
  }

  return NextResponse.json({
    success: true,
    siteId,
    message: "Use POST to actually write to DB",
    target,
    ticketmasterReturned: tmEvents.length,
  });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const startTime = Date.now();
  const body = await request.json().catch(() => ({}));
  const { getDefaultSiteId } = await import("@/config/sites");
  const siteId = (body.siteId as string) || getDefaultSiteId();
  const target = Math.min((body.target as number) || DEFAULT_TARGET, 100);
  const replace = !!body.replace;

  const aid = process.env.SPORTSEVENTS365_AID;
  if (!aid) {
    return NextResponse.json(
      {
        success: false,
        error:
          "SPORTSEVENTS365_AID env var not set. Add it to Vercel from aff.sportsevents365.com/affiliates/panel.php and redeploy.",
      },
      { status: 503 },
    );
  }

  const tmKey = process.env.TICKETMASTER_API_KEY;
  if (!tmKey) {
    return NextResponse.json({ success: false, error: "TICKETMASTER_API_KEY not configured" }, { status: 503 });
  }

  const { prisma } = await import("@/lib/db");
  const { getUpcomingEvents, formatEventPrice } = await import("@/lib/apis/events");

  // 1. If `replace`, mark existing TM-seeded events as unpublished. We don't
  // hard-delete because the Event.id may be referenced elsewhere (audit logs,
  // analytics events). published=false is enough for the public page filter.
  let archived = 0;
  if (replace) {
    const archiveResult = await prisma.event.updateMany({
      where: {
        siteId,
        published: true,
        affiliateTag: { startsWith: "tm-" },
      },
      data: { published: false },
    });
    archived = archiveResult.count;
  }

  // 2. Fetch upcoming events from Ticketmaster
  const tmEvents = await getUpcomingEvents(siteId, { limit: target });
  if (tmEvents.length === 0) {
    return NextResponse.json({
      success: false,
      message: "Ticketmaster returned 0 events",
      siteId,
      archived,
    });
  }

  // 3. Per event, dedup by affiliateTag (Ticketmaster id) → create or update
  // (re-publish if previously archived).
  let created = 0;
  let updated = 0;
  let failed = 0;
  const sample: Array<{ title: string; date: string; category: string; bookingUrl: string }> = [];

  for (const e of tmEvents) {
    if (Date.now() - startTime > BUDGET_MS - 5_000) break;

    const category = normalizeCategory(e.category);
    const affiliateTag = `tm-${e.id}`;
    const bookingUrl = buildSe365Url(category, aid);
    const eventDate = new Date(e.date);
    if (isNaN(eventDate.getTime())) {
      failed++;
      continue;
    }

    try {
      const existing = await prisma.event.findFirst({
        where: { siteId, affiliateTag },
        select: { id: true },
      });

      if (existing) {
        await prisma.event.update({
          where: { id: existing.id },
          data: {
            title_en: e.name,
            description_en: `${e.name} at ${e.venue}, ${e.city}.`,
            date: eventDate,
            time: e.time || "19:00",
            venue: e.venue,
            category,
            price: formatEventPrice(e),
            image: e.imageUrl,
            bookingUrl,
            ticketProvider: "SportsEvents365",
            published: true,
          },
        });
        updated++;
      } else {
        await prisma.event.create({
          data: {
            title_en: e.name,
            description_en: `${e.name} at ${e.venue}, ${e.city}.`,
            date: eventDate,
            time: e.time || "19:00",
            venue: e.venue,
            category,
            price: formatEventPrice(e),
            image: e.imageUrl,
            bookingUrl,
            affiliateTag,
            ticketProvider: "SportsEvents365",
            siteId,
            published: true,
            featured: false,
          },
        });
        created++;
      }

      if (sample.length < 10) {
        sample.push({
          title: e.name.slice(0, 70),
          date: eventDate.toISOString().slice(0, 10),
          category,
          bookingUrl,
        });
      }
    } catch (err) {
      failed++;
      console.warn(`[events-seed] failed for "${e.name}" (${e.id}):`, err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({
    success: true,
    siteId,
    archived,
    created,
    updated,
    failed,
    totalPublished: created + updated,
    durationMs: Date.now() - startTime,
    sample,
  });
}
