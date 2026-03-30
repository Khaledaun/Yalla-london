import { NextRequest, NextResponse } from "next/server";
import { getUpcomingEvents, formatEventPrice, formatEventDate } from "@/lib/apis/events";
import { getActiveSiteIds } from "@/config/sites";

export const maxDuration = 60;

const BUDGET_MS = 53_000;

/**
 * Events Sync Cron — fetches real events from Ticketmaster and writes to Event table.
 * Schedule: Weekly Monday 6:45 UTC
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const results: Record<string, { synced: number; skipped: number; error?: string }> = {};

  // Sites with Ticketmaster coverage (exclude yacht site which doesn't use events pipeline)
  const TICKETMASTER_SITES = new Set(["yalla-london", "yalla-istanbul"]);
  const eventSites = getActiveSiteIds().filter(id => TICKETMASTER_SITES.has(id));

  for (const siteId of eventSites) {
    if (Date.now() - startTime > BUDGET_MS) {
      results[siteId] = { synced: 0, skipped: 0, error: "Budget exceeded" };
      break;
    }

    let synced = 0;
    let skipped = 0;

    try {
      const tmEvents = await getUpcomingEvents(siteId, { limit: 20 });

      if (tmEvents.length > 0) {
        const { prisma } = await import("@/lib/db");

        for (const tm of tmEvents.slice(0, 15)) {
          if (Date.now() - startTime > BUDGET_MS) break;

          try {
            // Check if we already have this Ticketmaster event
            const existing = await prisma.event.findFirst({
              where: { affiliateTag: `tm-${tm.id}`, siteId },
            });

            if (existing) {
              // Update price/image if changed
              await prisma.event.update({
                where: { id: existing.id },
                data: {
                  price: formatEventPrice(tm),
                  image: tm.imageUrl || existing.image,
                  soldOut: false,
                  updated_at: new Date(),
                },
              });
              skipped++;
              continue;
            }

            const dateInfo = formatEventDate(tm.date);

            await prisma.event.create({
              data: {
                title_en: tm.name,
                title_ar: tm.name, // TODO: AI translate
                description_en: `${tm.name} at ${tm.venue}, ${tm.city}. ${tm.category} event.`,
                description_ar: `${tm.name} في ${tm.venue}. فعالية ${tm.category}.`,
                date: new Date(tm.date + "T00:00:00Z"),
                time: tm.time || "19:00",
                venue: tm.venue,
                category: mapCategory(tm.segment || tm.category),
                price: formatEventPrice(tm),
                image: tm.imageUrl || null,
                rating: 0,
                bookingUrl: tm.url,
                affiliateTag: `tm-${tm.id}`,
                ticketProvider: "Ticketmaster",
                vipAvailable: false,
                soldOut: false,
                featured: false,
                published: true,
                siteId,
              },
            });
            synced++;
          } catch (upsertErr) {
            console.warn(`[events-sync] Event upsert failed:`, upsertErr instanceof Error ? upsertErr.message : String(upsertErr));
          }
        }

        // Mark past events as unpublished
        try {
          await prisma.event.updateMany({
            where: {
              siteId,
              date: { lt: new Date() },
              published: true,
            },
            data: { published: false },
          });
        } catch (cleanupErr) {
          console.warn("[events-sync] Cleanup failed:", cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr));
        }
      }

      results[siteId] = { synced, skipped };
    } catch (err) {
      results[siteId] = { synced, skipped, error: err instanceof Error ? err.message : String(err) };
    }
  }

  const totalSynced = Object.values(results).reduce((sum, r) => sum + r.synced, 0);

  return NextResponse.json({
    success: true,
    results,
    totalSynced,
    durationMs: Date.now() - startTime,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}

function mapCategory(tmCategory: string): string {
  const lower = tmCategory.toLowerCase();
  if (lower.includes("music") || lower.includes("concert")) return "Music";
  if (lower.includes("sport")) return "Sports";
  if (lower.includes("art") || lower.includes("theatre") || lower.includes("theater")) return "Theatre";
  if (lower.includes("family") || lower.includes("child")) return "Family";
  if (lower.includes("comedy")) return "Comedy";
  if (lower.includes("festival")) return "Festival";
  return "Experience";
}
