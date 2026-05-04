/**
 * Charter Index API Client — Stub for future integration
 *
 * Charter Index aggregates yacht availability from multiple charter companies.
 * API docs: https://www.charterindex.com/api (requires commercial license)
 *
 * Current status: STUB — returns empty/mock data. Wire real API when license obtained.
 *
 * Prisma models used:
 *   - Yacht (source: CHARTER_INDEX, externalId for dedup)
 *   - YachtSyncLog (source: CHARTER_INDEX, tracks sync history)
 *
 * Env vars:
 *   - CHARTER_INDEX_API_KEY — required to enable real API calls
 *   - CHARTER_INDEX_BASE_URL — optional, defaults to https://api.charterindex.com/v2
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Yacht record returned by Charter Index search endpoint */
export interface CharterIndexYacht {
  externalId: string;
  name: string;
  type: "MOTOR_YACHT" | "SAILING_YACHT" | "CATAMARAN" | "GULET" | "SUPERYACHT";
  lengthMeters: number;
  cabins: number;
  berths: number;
  crewSize: number;
  yearBuilt: number;
  builder: string;
  pricePerWeekEur: number;
  currency: string;
  homePort: string;
  cruisingArea: string;
  images: string[];
  features: string[];
  /** ISO 8601 timestamp */
  lastUpdated: string;
}

/** Weekly availability slot for a specific yacht */
export interface CharterIndexAvailability {
  yachtExternalId: string;
  /** ISO 8601 date (YYYY-MM-DD) */
  startDate: string;
  /** ISO 8601 date (YYYY-MM-DD) */
  endDate: string;
  status: "available" | "booked" | "option" | "maintenance";
  priceEur: number;
  currency: string;
  /** Embarkation port */
  embarks: string;
  /** Disembarkation port */
  disembarks: string;
}

/** Parameters for the yacht search endpoint */
export interface CharterIndexSearchParams {
  destination?: string;
  /** ISO 8601 date (YYYY-MM-DD) */
  startDate?: string;
  /** ISO 8601 date (YYYY-MM-DD) */
  endDate?: string;
  minLength?: number;
  maxLength?: number;
  minCabins?: number;
  maxPricePerWeek?: number;
  type?: string;
  /** 1-based page number */
  page?: number;
  /** Results per page (max 100) */
  limit?: number;
}

/** Paginated search result */
export interface CharterIndexSearchResult {
  yachts: CharterIndexYacht[];
  total: number;
  page: number;
}

/** Summary returned after a fleet sync operation */
export interface CharterIndexSyncSummary {
  synced: number;
  created: number;
  updated: number;
  errors: number;
  message: string;
}

/** Current sync status for a site */
export interface CharterIndexSyncStatus {
  lastSyncAt: string | null;
  status: "synced" | "never_synced" | "error";
  totalYachts: number;
}

/** Internal config resolved from env vars */
interface CharterIndexConfig {
  apiKey: string;
  baseUrl: string;
  /** Request timeout in milliseconds */
  timeout: number;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Check whether Charter Index credentials are configured.
 * Returns `true` when `CHARTER_INDEX_API_KEY` is set in the environment.
 */
export function isCharterIndexConfigured(): boolean {
  return !!process.env.CHARTER_INDEX_API_KEY;
}

/**
 * Resolve config from environment. Returns `null` when the API key is missing.
 */
function getConfig(): CharterIndexConfig | null {
  const apiKey = process.env.CHARTER_INDEX_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl:
      process.env.CHARTER_INDEX_BASE_URL ||
      "https://api.charterindex.com/v2",
    timeout: 15_000,
  };
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * Search yachts by destination, dates, size, and price.
 *
 * **Stub** — returns empty results until real API is wired.
 *
 * Future implementation notes:
 * ```
 * GET ${baseUrl}/yachts/search?destination=...&startDate=...
 * Headers: { "X-Api-Key": apiKey }
 * ```
 */
export async function searchYachts(
  params: CharterIndexSearchParams,
): Promise<CharterIndexSearchResult> {
  const config = getConfig();
  if (!config) {
    console.warn(
      "[charter-index] Not configured — CHARTER_INDEX_API_KEY not set",
    );
    return { yachts: [], total: 0, page: 1 };
  }

  // TODO: Implement real API call when license obtained
  // const url = new URL(`${config.baseUrl}/yachts/search`);
  // if (params.destination) url.searchParams.set('destination', params.destination);
  // if (params.startDate) url.searchParams.set('startDate', params.startDate);
  // if (params.endDate) url.searchParams.set('endDate', params.endDate);
  // if (params.minLength) url.searchParams.set('minLength', String(params.minLength));
  // if (params.maxLength) url.searchParams.set('maxLength', String(params.maxLength));
  // if (params.minCabins) url.searchParams.set('minCabins', String(params.minCabins));
  // if (params.maxPricePerWeek) url.searchParams.set('maxPricePerWeek', String(params.maxPricePerWeek));
  // if (params.type) url.searchParams.set('type', params.type);
  // url.searchParams.set('page', String(params.page ?? 1));
  // url.searchParams.set('limit', String(params.limit ?? 20));
  // const response = await fetch(url.toString(), {
  //   headers: { 'X-Api-Key': config.apiKey },
  //   signal: AbortSignal.timeout(config.timeout),
  // });
  // if (!response.ok) throw new Error(`Charter Index API ${response.status}`);
  // return response.json();

  console.log(
    "[charter-index] searchYachts called (stub) — returning empty results",
  );
  return { yachts: [], total: 0, page: params.page ?? 1 };
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

/**
 * Fetch weekly availability slots for a specific yacht.
 *
 * **Stub** — returns empty array until real API is wired.
 *
 * Future implementation notes:
 * ```
 * GET ${baseUrl}/yachts/${externalId}/availability?startDate=...&endDate=...
 * Headers: { "X-Api-Key": apiKey }
 * ```
 */
export async function getYachtAvailability(
  externalId: string,
  startDate?: string,
  endDate?: string,
): Promise<CharterIndexAvailability[]> {
  const config = getConfig();
  if (!config) {
    console.warn(
      "[charter-index] Not configured — CHARTER_INDEX_API_KEY not set",
    );
    return [];
  }

  // TODO: Implement real API call when license obtained
  // const url = new URL(`${config.baseUrl}/yachts/${encodeURIComponent(externalId)}/availability`);
  // if (startDate) url.searchParams.set('startDate', startDate);
  // if (endDate) url.searchParams.set('endDate', endDate);
  // const response = await fetch(url.toString(), {
  //   headers: { 'X-Api-Key': config.apiKey },
  //   signal: AbortSignal.timeout(config.timeout),
  // });
  // if (!response.ok) throw new Error(`Charter Index API ${response.status}`);
  // return response.json();

  console.log(
    `[charter-index] getYachtAvailability(${externalId}) called (stub) — returning empty`,
  );
  return [];
}

// ---------------------------------------------------------------------------
// Fleet Sync
// ---------------------------------------------------------------------------

/**
 * Sync fleet from Charter Index to local Prisma `Yacht` table.
 *
 * **Stub** — returns zero-count summary until real API is wired.
 *
 * Future implementation plan:
 * 1. Fetch paginated yacht list from Charter Index API
 * 2. For each yacht, upsert into Prisma `Yacht` model using `externalId` + `source: CHARTER_INDEX`
 * 3. Map Charter Index types to Prisma `YachtType` enum
 * 4. Deactivate local yachts no longer present in API response
 * 5. Write `YachtSyncLog` record with summary
 *
 * @param siteId - The site to sync yachts for (e.g. "zenitha-yachts-med")
 */
export async function syncFleet(
  siteId: string,
): Promise<CharterIndexSyncSummary> {
  const config = getConfig();
  if (!config) {
    return {
      synced: 0,
      created: 0,
      updated: 0,
      errors: 0,
      message:
        "Charter Index not configured — set CHARTER_INDEX_API_KEY env var",
    };
  }

  // TODO: Implement real sync when license obtained
  // 1. Fetch all yachts: GET ${config.baseUrl}/yachts?limit=100 (paginate)
  // 2. For each yacht, upsert into Prisma Yacht model:
  //    prisma.yacht.upsert({
  //      where: { externalId_source: { externalId: yacht.externalId, source: 'CHARTER_INDEX' } },
  //      create: { siteId, source: 'CHARTER_INDEX', externalId: yacht.externalId, name: yacht.name, ... },
  //      update: { name: yacht.name, ... },
  //    })
  // 3. Write YachtSyncLog:
  //    prisma.yachtSyncLog.create({ data: { siteId, source: 'CHARTER_INDEX', syncType: 'full', status: 'COMPLETED', ... } })

  console.log(
    `[charter-index] syncFleet(${siteId}) called (stub) — no sync performed`,
  );
  return {
    synced: 0,
    created: 0,
    updated: 0,
    errors: 0,
    message: "Charter Index sync not yet implemented (stub)",
  };
}

// ---------------------------------------------------------------------------
// Sync Status
// ---------------------------------------------------------------------------

/**
 * Check the most recent sync status for a site by querying `YachtSyncLog`.
 *
 * Unlike other methods, this queries real DB data (not stubbed) so the admin
 * dashboard can show accurate "last synced" information once real syncs start.
 *
 * @param siteId - The site to check (e.g. "zenitha-yachts-med")
 */
export async function getSyncStatus(
  siteId: string,
): Promise<CharterIndexSyncStatus> {
  try {
    const { prisma } = await import("@/lib/db");

    const [lastSync, totalYachts] = await Promise.all([
      prisma.yachtSyncLog.findFirst({
        where: { siteId, source: "CHARTER_INDEX" },
        orderBy: { syncedAt: "desc" },
      }),
      prisma.yacht.count({
        where: { siteId, source: "CHARTER_INDEX" },
      }),
    ]);

    return {
      lastSyncAt: lastSync?.syncedAt?.toISOString() ?? null,
      status: lastSync ? "synced" : "never_synced",
      totalYachts,
    };
  } catch (err) {
    console.warn(
      "[charter-index] getSyncStatus error:",
      err instanceof Error ? err.message : String(err),
    );
    return { lastSyncAt: null, status: "error", totalYachts: 0 };
  }
}
