/**
 * Click Aggregator — Unified click-query helpers across CjClickEvent and AuditLog.
 *
 * The affiliate-injection cron wraps all partner URLs through `/api/affiliate/click`.
 * That endpoint has two write paths:
 *
 *   1. CjLink-based (id= param)    → writes to `cj_click_events` with linkId FK
 *   2. Direct URL (url= param)     → writes to `audit_log` with action=AFFILIATE_CLICK_DIRECT
 *                                     (direct URLs have no CjLink record; the FK forbids it)
 *
 * Historically, every dashboard queried `cj_click_events` only, so all Travelpayouts,
 * Vrbo fallback, Welcome Pickups, Tiqets, TicketNetwork, and static-rule clicks were
 * invisible despite being recorded.
 *
 * This module unifies the two sources. Use it wherever a dashboard needs a click count.
 */

// Narrow where-clause types — we avoid importing the Prisma namespace
// (not exported from @prisma/client in this codebase's version) and instead
// rely on Prisma's runtime accepting these plain object shapes.
type CjEventWhere = {
  OR?: Array<{ siteId?: string | null }>;
  createdAt?: { gte: Date };
};
type AuditWhere = {
  action: string;
  timestamp?: { gte: Date };
  details?: { path: string[]; equals: string };
};

export type ClickFilters = {
  siteId?: string;
  since?: Date;
  articleSlug?: string;
  partner?: string;
};

export type ClickSummary = {
  cjClicks: number;
  directClicks: number;
  total: number;
};

export type ClickFeedItem = {
  id: string;
  source: "cj" | "direct";
  partner: string;
  articleSlug: string | null;
  pageUrl: string | null;
  device: string | null;
  country: string | null;
  timestamp: Date;
  sessionId: string | null;
};

// ── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Build a Prisma `where` filter for CjClickEvent using the OR-null pattern.
 * Includes records scoped to this site OR legacy records with null siteId.
 */
function cjSiteFilter(siteId?: string): CjEventWhere {
  return siteId ? { OR: [{ siteId }, { siteId: null }] } : {};
}

/**
 * Build a Prisma `where` filter for AuditLog direct affiliate clicks.
 * Uses JSONB path operators to filter on `details.siteId`.
 */
function auditSiteFilter(siteId?: string): AuditWhere {
  const base: AuditWhere = { action: "AFFILIATE_CLICK_DIRECT" };
  if (!siteId) return base;
  return {
    ...base,
    details: { path: ["siteId"], equals: siteId },
  };
}

/** Parse article slug from an AuditLog details.sessionId (format: "siteId_articleSlug"). */
function parseSlugFromSession(sessionId: unknown): string | null {
  if (typeof sessionId !== "string" || !sessionId.includes("_")) return null;
  return sessionId.split("_").slice(1).join("_") || null;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Total click count summary for the given filters.
 * Runs both queries in parallel.
 */
export async function getClickSummary(filters: ClickFilters = {}): Promise<ClickSummary> {
  const { prisma } = await import("@/lib/db");

  const cjWhere: CjEventWhere = { ...cjSiteFilter(filters.siteId) };
  if (filters.since) cjWhere.createdAt = { gte: filters.since };

  const auditWhere: AuditWhere = { ...auditSiteFilter(filters.siteId) };
  if (filters.since) auditWhere.timestamp = { gte: filters.since };

  const [cjClicks, directClicks] = await Promise.all([
    prisma.cjClickEvent.count({ where: cjWhere }),
    prisma.auditLog.count({ where: auditWhere }),
  ]);

  return { cjClicks, directClicks, total: cjClicks + directClicks };
}

/**
 * Clicks grouped by article slug. Returns Map<slug, count>.
 * Parses slug from pageUrl OR sessionId (CjClickEvent) and sessionId (AuditLog).
 */
export async function getClicksByArticle(filters: ClickFilters = {}): Promise<Map<string, number>> {
  const { prisma } = await import("@/lib/db");

  const cjWhere: CjEventWhere = { ...cjSiteFilter(filters.siteId) };
  if (filters.since) cjWhere.createdAt = { gte: filters.since };

  const auditWhere: AuditWhere = { ...auditSiteFilter(filters.siteId) };
  if (filters.since) auditWhere.timestamp = { gte: filters.since };

  const [cjClicks, auditClicks] = await Promise.all([
    prisma.cjClickEvent.findMany({
      where: cjWhere,
      select: { pageUrl: true, sessionId: true },
      take: 5000,
    }),
    prisma.auditLog.findMany({
      where: auditWhere,
      select: { details: true },
      take: 5000,
    }),
  ]);

  const byArticle = new Map<string, number>();

  const bump = (slug: string | null) => {
    if (!slug || slug === "unknown") return;
    byArticle.set(slug, (byArticle.get(slug) || 0) + 1);
  };

  for (const c of cjClicks) {
    const fromUrl = c.pageUrl?.match(/\/blog\/([^/?#]+)/)?.[1] || null;
    bump(fromUrl || parseSlugFromSession(c.sessionId));
  }

  for (const c of auditClicks) {
    const details = (c.details ?? {}) as Record<string, unknown>;
    bump(parseSlugFromSession(details.sessionId));
  }

  return byArticle;
}

/**
 * Clicks grouped by partner name. Returns Map<partner, count>.
 * Requires a CjLink lookup for CJ clicks (advertiser name) and
 * reads `details.partner` from AuditLog.
 */
export async function getClicksByPartner(filters: ClickFilters = {}): Promise<Map<string, number>> {
  const { prisma } = await import("@/lib/db");

  const cjWhere: CjEventWhere = { ...cjSiteFilter(filters.siteId) };
  if (filters.since) cjWhere.createdAt = { gte: filters.since };

  const auditWhere: AuditWhere = { ...auditSiteFilter(filters.siteId) };
  if (filters.since) auditWhere.timestamp = { gte: filters.since };

  const [cjClicks, auditClicks] = await Promise.all([
    prisma.cjClickEvent.findMany({
      where: cjWhere,
      select: { linkId: true },
      take: 5000,
    }),
    prisma.auditLog.findMany({
      where: auditWhere,
      select: { details: true },
      take: 5000,
    }),
  ]);

  const byPartner = new Map<string, number>();

  // Resolve CJ link IDs → advertiser names
  const linkIds = [...new Set<string>(cjClicks.map((c) => c.linkId))];
  if (linkIds.length > 0) {
    const links = await prisma.cjLink.findMany({
      where: { id: { in: linkIds } },
      select: { id: true, advertiserName: true, advertiser: { select: { name: true } } },
    });
    const linkToPartner = new Map<string, string>(
      links.map((l) => [l.id, l.advertiserName || l.advertiser?.name || "CJ (unknown)"]),
    );
    for (const c of cjClicks) {
      const partner = linkToPartner.get(c.linkId) || "CJ (unknown)";
      byPartner.set(partner, (byPartner.get(partner) || 0) + 1);
    }
  }

  for (const c of auditClicks) {
    const details = (c.details ?? {}) as Record<string, unknown>;
    const partner = (typeof details.partner === "string" ? details.partner : null) || "direct (unknown)";
    byPartner.set(partner, (byPartner.get(partner) || 0) + 1);
  }

  return byPartner;
}

/**
 * Per-day click buckets for the last N days.
 * Returns [{ date: "YYYY-MM-DD", count }] with zero-filled missing days.
 */
export async function getClicksByDay(
  filters: ClickFilters = {},
  days: number,
): Promise<Array<{ date: string; count: number }>> {
  const { prisma } = await import("@/lib/db");

  const since = filters.since ?? new Date(Date.now() - days * 86400_000);
  const cjWhere: CjEventWhere = {
    ...cjSiteFilter(filters.siteId),
    createdAt: { gte: since },
  };
  const auditWhere: AuditWhere = {
    ...auditSiteFilter(filters.siteId),
    timestamp: { gte: since },
  };

  const [cjClicks, auditClicks] = await Promise.all([
    prisma.cjClickEvent.findMany({
      where: cjWhere,
      select: { createdAt: true },
      take: 10000,
    }),
    prisma.auditLog.findMany({
      where: auditWhere,
      select: { timestamp: true },
      take: 10000,
    }),
  ]);

  const buckets = new Map<string, number>();
  for (const c of cjClicks) {
    const day = c.createdAt.toISOString().slice(0, 10);
    buckets.set(day, (buckets.get(day) || 0) + 1);
  }
  for (const c of auditClicks) {
    const day = c.timestamp.toISOString().slice(0, 10);
    buckets.set(day, (buckets.get(day) || 0) + 1);
  }

  // Zero-fill missing days
  const result: Array<{ date: string; count: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    result.push({ date: d, count: buckets.get(d) || 0 });
  }
  return result;
}

/**
 * Recent click feed — merges CJ and direct clicks, sorted by timestamp desc.
 */
export async function getRecentClickFeed(filters: ClickFilters = {}, limit: number = 20): Promise<ClickFeedItem[]> {
  const { prisma } = await import("@/lib/db");

  const cjWhere: CjEventWhere = { ...cjSiteFilter(filters.siteId) };
  if (filters.since) cjWhere.createdAt = { gte: filters.since };

  const auditWhere: AuditWhere = { ...auditSiteFilter(filters.siteId) };
  if (filters.since) auditWhere.timestamp = { gte: filters.since };

  // Fetch 2x limit from each so the merged result has enough entries post-sort
  const [cjClicks, auditClicks] = await Promise.all([
    prisma.cjClickEvent.findMany({
      where: cjWhere,
      orderBy: { createdAt: "desc" },
      take: limit * 2,
      select: {
        id: true,
        linkId: true,
        pageUrl: true,
        sessionId: true,
        device: true,
        country: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.findMany({
      where: auditWhere,
      orderBy: { timestamp: "desc" },
      take: limit * 2,
      select: {
        id: true,
        details: true,
        timestamp: true,
      },
    }),
  ]);

  const linkIds = [...new Set<string>(cjClicks.map((c) => c.linkId))];
  const links = linkIds.length
    ? await prisma.cjLink.findMany({
        where: { id: { in: linkIds } },
        select: { id: true, advertiserName: true, advertiser: { select: { name: true } } },
      })
    : [];
  const linkPartner = new Map(links.map((l) => [l.id, l.advertiserName || l.advertiser?.name || "CJ (unknown)"]));

  const cjFeed: ClickFeedItem[] = cjClicks.map((c) => ({
    id: c.id,
    source: "cj" as const,
    partner: linkPartner.get(c.linkId) || "CJ (unknown)",
    articleSlug: parseSlugFromSession(c.sessionId),
    pageUrl: c.pageUrl,
    device: c.device ?? null,
    country: c.country ?? null,
    timestamp: c.createdAt,
    sessionId: c.sessionId,
  }));

  const directFeed: ClickFeedItem[] = auditClicks.map((a) => {
    const d = (a.details ?? {}) as Record<string, unknown>;
    return {
      id: a.id,
      source: "direct" as const,
      partner: typeof d.partner === "string" ? d.partner : "direct (unknown)",
      articleSlug: parseSlugFromSession(d.sessionId),
      pageUrl: typeof d.pageUrl === "string" ? d.pageUrl : null,
      device: typeof d.device === "string" ? d.device : null,
      country: typeof d.country === "string" ? d.country : null,
      timestamp: a.timestamp,
      sessionId: typeof d.sessionId === "string" ? d.sessionId : null,
    };
  });

  return [...cjFeed, ...directFeed].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
}
