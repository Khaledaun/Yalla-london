/**
 * Nager.Date Public Holidays API — Free, no auth
 * https://date.nager.at/api/v3
 */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface PublicHoliday {
  date: string;
  name: string;
  localName: string;
  countryCode: string;
  types: string[];
}

interface HolidayCache {
  holidays: PublicHoliday[];
  fetchedAt: number;
}

const holidayCache = new Map<string, HolidayCache>();

// GCC source markets + destination countries
export const GCC_COUNTRY_CODES = ["AE", "SA", "KW", "BH", "QA", "OM"];
export const DESTINATION_COUNTRY_CODES = ["GB", "MV", "FR", "TR", "TH"];

export async function getPublicHolidays(
  countryCode: string,
  year?: number
): Promise<PublicHoliday[]> {
  const y = year || new Date().getFullYear();
  const cacheKey = `${countryCode}-${y}`;
  const cached = holidayCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.holidays;
  }

  try {
    const res = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${y}/${countryCode}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) throw new Error(`Nager.Date ${res.status}`);
    const data: PublicHoliday[] = await res.json();
    holidayCache.set(cacheKey, { holidays: data, fetchedAt: Date.now() });
    return data;
  } catch (err) {
    console.warn("[holidays] Nager.Date failed:", err instanceof Error ? err.message : String(err));
    return cached?.holidays || [];
  }
}

/**
 * Get upcoming GCC holidays across all Gulf countries (next N days)
 * These drive booking peaks — content should be published 2-4 weeks BEFORE
 */
export async function getUpcomingGCCHolidays(daysAhead: number = 90): Promise<PublicHoliday[]> {
  const now = new Date();
  const cutoff = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  const year = now.getFullYear();

  const allHolidays: PublicHoliday[] = [];
  for (const cc of GCC_COUNTRY_CODES) {
    const holidays = await getPublicHolidays(cc, year);
    // Also fetch next year if we're within 90 days of year end
    if (now.getMonth() >= 9) {
      const nextYear = await getPublicHolidays(cc, year + 1);
      holidays.push(...nextYear);
    }
    allHolidays.push(...holidays);
  }

  return allHolidays
    .filter((h) => {
      const d = new Date(h.date);
      return d >= now && d <= cutoff;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Key GCC holidays that drive travel bookings
 */
export const BOOKING_PEAK_HOLIDAYS = [
  "Eid al-Fitr",
  "Eid al-Adha",
  "National Day", // UAE Dec 2, Saudi Sep 23, Kuwait Feb 25, Qatar Dec 18
  "Ramadan",
  "Islamic New Year",
];

export function isBookingPeakHoliday(holiday: PublicHoliday): boolean {
  return BOOKING_PEAK_HOLIDAYS.some(
    (peak) =>
      holiday.name.toLowerCase().includes(peak.toLowerCase()) ||
      holiday.localName.toLowerCase().includes(peak.toLowerCase())
  );
}
