import { NextRequest, NextResponse } from "next/server";
import { getExchangeRates, SITE_BASE_CURRENCIES } from "@/lib/apis/currency";
import { getWeatherForecast, SITE_DESTINATIONS } from "@/lib/apis/weather";
import { getUpcomingGCCHolidays } from "@/lib/apis/holidays";
import { getDestinationInfo, DESTINATION_CODES } from "@/lib/apis/countries";
import { logCronExecution } from "@/lib/cron-logger";

export const maxDuration = 60;

const BUDGET_MS = 53_000;

/**
 * Daily Data Refresh Cron — refreshes all free API data caches.
 * Runs at 6:30 UTC daily. All APIs are free and require no auth.
 *
 * Refreshes:
 * 1. Currency exchange rates (Frankfurter)
 * 2. Weather forecasts (Open-Meteo)
 * 3. GCC holidays (Nager.Date)
 * 4. Country info (REST Countries)
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const results: Record<string, { success: boolean; error?: string }> = {};

  // 1. Currency rates
  try {
    const currencies = [...new Set<string>(Object.values(SITE_BASE_CURRENCIES))];
    for (const base of currencies) {
      if (Date.now() - startTime > BUDGET_MS) break;
      await getExchangeRates(base);
    }
    results.currency = { success: true };
  } catch (err) {
    results.currency = { success: false, error: err instanceof Error ? err.message : String(err) };
  }

  // 2. Weather forecasts
  try {
    for (const siteId of Object.keys(SITE_DESTINATIONS)) {
      if (Date.now() - startTime > BUDGET_MS) break;
      await getWeatherForecast(siteId, 7);
    }
    results.weather = { success: true };
  } catch (err) {
    results.weather = { success: false, error: err instanceof Error ? err.message : String(err) };
  }

  // 3. GCC holidays
  try {
    if (Date.now() - startTime < BUDGET_MS) {
      const holidays = await getUpcomingGCCHolidays(90);
      results.holidays = { success: true };

      // Log upcoming booking peaks
      const peaks = holidays.filter((h) =>
        ["eid", "ramadan", "national day"].some((k) =>
          h.name.toLowerCase().includes(k)
        )
      );
      if (peaks.length > 0) {
        console.log(`[data-refresh] Upcoming GCC booking peaks: ${peaks.map((p) => `${p.name} (${p.date})`).join(", ")}`);
      }
    }
  } catch (err) {
    results.holidays = { success: false, error: err instanceof Error ? err.message : String(err) };
  }

  // 4. Country info
  try {
    for (const code of Object.values(DESTINATION_CODES)) {
      if (Date.now() - startTime > BUDGET_MS) break;
      await getDestinationInfo(code);
    }
    results.countries = { success: true };
  } catch (err) {
    results.countries = { success: false, error: err instanceof Error ? err.message : String(err) };
  }

  const allSuccess = Object.values(results).every((r) => r.success);
  const durationMs = Date.now() - startTime;
  const itemsProcessed = Object.keys(results).length;
  const itemsSucceeded = Object.values(results).filter((r) => r.success).length;

  try {
    await logCronExecution("data-refresh", allSuccess ? "completed" : "failed", {
      durationMs,
      itemsProcessed,
      itemsSucceeded,
      itemsFailed: itemsProcessed - itemsSucceeded,
      resultSummary: results,
    });
  } catch (logErr) {
    console.warn("[data-refresh] CronJobLog write failed:", logErr instanceof Error ? logErr.message : logErr);
  }

  return NextResponse.json({
    success: allSuccess,
    results,
    durationMs,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
