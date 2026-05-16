/**
 * Event start-time + freshness helpers.
 *
 * The Event Prisma model stores `date` as a DateTime (day-precision) and
 * `time` as a string like "15:00". To enforce "hide events 15 min before
 * start" (Khaled's May 16 ask), we need to combine date + time + UK
 * timezone into a single UTC instant.
 *
 * London ↔ UTC offset depends on DST:
 *   - BST (last Sun Mar → last Sun Oct): UTC+1
 *   - GMT (last Sun Oct → last Sun Mar): UTC+0
 *
 * We compute the offset for the event's specific date so an event in
 * July (BST) and one in December (GMT) both resolve correctly. Other
 * sites in this codebase (zenitha-yachts Mediterranean, Thailand,
 * Istanbul) use different time zones — for now this helper assumes UK
 * for yalla-london events because that's where Khaled is seeding from.
 *
 * Future: accept a per-site IANA tz like "Europe/London" / "Asia/Bangkok"
 * once we support events outside London.
 */

/** Returns true if the given UTC date falls within British Summer Time. */
function isBst(d: Date): boolean {
  // BST: last Sunday of March 01:00 UTC → last Sunday of October 01:00 UTC
  const y = d.getUTCFullYear();
  const lastSunOfMarch = lastSundayOfMonth(y, 2); // March (0-indexed)
  const lastSunOfOctober = lastSundayOfMonth(y, 9); // October
  // BST transitions happen at 01:00 UTC on those Sundays.
  const bstStart = Date.UTC(y, 2, lastSunOfMarch, 1, 0, 0);
  const bstEnd = Date.UTC(y, 9, lastSunOfOctober, 1, 0, 0);
  const t = d.getTime();
  return t >= bstStart && t < bstEnd;
}

function lastSundayOfMonth(year: number, monthIndex: number): number {
  // Day 0 of next month = last day of current month
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0));
  const dayOfWeek = lastDay.getUTCDay(); // 0 = Sunday
  return lastDay.getUTCDate() - dayOfWeek;
}

/**
 * Combine the Event.date (DateTime) and Event.time ("HH:MM") into a precise
 * UTC instant the user actually sees the show at. Falls back to the raw
 * event date at midnight UTC if `time` is malformed (defensive — DB might
 * have legacy rows).
 */
export function eventStartUtc(date: Date, time: string | null | undefined): Date {
  const match = typeof time === "string" ? time.match(/^(\d{1,2}):(\d{2})$/) : null;
  if (!match) {
    return new Date(date.getTime()); // best effort — use stored date as-is
  }
  const hh = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  const mm = Math.min(59, Math.max(0, parseInt(match[2], 10)));

  // The `date` from Prisma is the calendar day. Build a UK-local instant
  // (yyyy-mm-dd HH:MM London time) and convert to UTC via the BST/GMT offset.
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  // London-local representation as UTC ms (will be off by +0 or +1 hour vs real UTC)
  const localAsUtc = Date.UTC(y, m, d, hh, mm, 0);
  // BST → subtract 1 hour to get real UTC; GMT → no offset
  const offsetHours = isBst(new Date(localAsUtc)) ? 1 : 0;
  return new Date(localAsUtc - offsetHours * 60 * 60 * 1000);
}

/** Pre-set buffer before event start when the event should disappear. */
export const EVENT_ERASE_BUFFER_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Returns true if the event is still "live" — i.e. its start time is more
 * than EVENT_ERASE_BUFFER_MS in the future. Used as a filter for the public
 * /events page and as the criterion for the weekly validator to archive
 * stale events.
 */
export function isEventStillVisible(date: Date, time: string | null | undefined, now = Date.now()): boolean {
  const startMs = eventStartUtc(date, time).getTime();
  return startMs - EVENT_ERASE_BUFFER_MS > now;
}
