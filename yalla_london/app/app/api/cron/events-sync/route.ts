import { NextRequest, NextResponse } from "next/server";
import { getUpcomingEvents } from "@/lib/apis/events";
import { getDefaultSiteId } from "@/config/sites";

export const maxDuration = 60;

const BUDGET_MS = 53_000;

/**
 * Events Sync Cron — fetches real events from Ticketmaster for London & Istanbul.
 * Stores in DB for homepage display and content enrichment.
 * Schedule: Weekly Monday 6:30 UTC (or daily if Ticketmaster key is configured)
 */
export async function GET(request: NextRequest) {
  // Standard cron auth
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const results: Record<string, { count: number; error?: string }> = {};

  // Sites with Ticketmaster coverage
  const eventSites = ["yalla-london", "yalla-istanbul"];

  for (const siteId of eventSites) {
    if (Date.now() - startTime > BUDGET_MS) {
      results[siteId] = { count: 0, error: "Budget exceeded" };
      break;
    }

    try {
      const events = await getUpcomingEvents(siteId, { limit: 20 });
      results[siteId] = { count: events.length };

      // Store in DB if available
      if (events.length > 0) {
        try {
          const { prisma } = await import("@/lib/db");
          // Upsert events into CachedApiData table
          for (const event of events.slice(0, 15)) {
            await prisma.siteSettings.upsert({
              where: {
                siteId_category: {
                  siteId,
                  category: `event-${event.id}`,
                },
              },
              create: {
                siteId,
                category: `event-${event.id}`,
                settings: JSON.parse(JSON.stringify(event)),
              },
              update: {
                settings: JSON.parse(JSON.stringify(event)),
                updatedAt: new Date(),
              },
            });
          }
        } catch (dbErr) {
          console.warn(`[events-sync] DB store failed for ${siteId}:`, dbErr instanceof Error ? dbErr.message : String(dbErr));
        }
      }
    } catch (err) {
      results[siteId] = { count: 0, error: err instanceof Error ? err.message : String(err) };
    }
  }

  const totalEvents = Object.values(results).reduce((sum, r) => sum + r.count, 0);

  return NextResponse.json({
    success: true,
    results,
    totalEvents,
    durationMs: Date.now() - startTime,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
