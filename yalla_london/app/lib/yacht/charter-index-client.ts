/**
 * Charter Index API Client — Integration Stub
 *
 * Charter Index (charterindex.com) provides real-time yacht availability,
 * pricing, and booking across 4,000+ vessels in the Mediterranean.
 *
 * This stub defines the TypeScript interfaces and client structure for
 * future integration. Actual API calls require:
 *   - CHARTER_INDEX_API_KEY env var
 *   - CHARTER_INDEX_PARTNER_ID env var
 *   - Approved partnership agreement with Charter Index
 *
 * API docs: https://charterindex.com/api (requires partner login)
 *
 * @see Uploads/Execution Plan — Phase 1.1: Charter Index API integration
 */

// ─── Types ─────────────────────────────────────────────────

export interface CharterIndexYacht {
  id: string;
  name: string;
  type: 'motor' | 'sailing' | 'catamaran' | 'gulet';
  lengthMetres: number;
  cabins: number;
  guests: number;
  crew: number;
  yearBuilt: number;
  yearRefit?: number;
  builder?: string;
  flag: string;
  basePort: string;
  images: string[];
  amenities: string[];
  pricePerWeekEur: number;
  pricePerWeekUsd: number;
  currency: string;
}

export interface CharterIndexAvailability {
  yachtId: string;
  startDate: string; // ISO date
  endDate: string;   // ISO date
  status: 'available' | 'booked' | 'option' | 'maintenance';
  pricePerWeekEur: number;
  season: 'high' | 'low' | 'shoulder';
}

export interface CharterIndexSearchParams {
  destination?: string;
  startDate?: string;
  endDate?: string;
  minGuests?: number;
  maxGuests?: number;
  yachtType?: string;
  minBudgetEur?: number;
  maxBudgetEur?: number;
  minLength?: number;
  maxLength?: number;
  amenities?: string[];
  page?: number;
  limit?: number;
}

export interface CharterIndexSearchResult {
  yachts: CharterIndexYacht[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface CharterIndexConfig {
  apiKey: string;
  partnerId: string;
  baseUrl: string;
  timeout: number;
}

// ─── Client ────────────────────────────────────────────────

export function getCharterIndexConfig(): CharterIndexConfig | null {
  const apiKey = process.env.CHARTER_INDEX_API_KEY;
  const partnerId = process.env.CHARTER_INDEX_PARTNER_ID;

  if (!apiKey || !partnerId) return null;

  return {
    apiKey,
    partnerId,
    baseUrl: 'https://api.charterindex.com/v1',
    timeout: 10_000,
  };
}

export function isCharterIndexConfigured(): boolean {
  return getCharterIndexConfig() !== null;
}

/**
 * Search yachts on Charter Index.
 * STUB — returns empty result until API credentials are configured.
 */
export async function searchYachts(
  params: CharterIndexSearchParams
): Promise<CharterIndexSearchResult> {
  const config = getCharterIndexConfig();
  if (!config) {
    console.warn('[charter-index] Not configured — CHARTER_INDEX_API_KEY and CHARTER_INDEX_PARTNER_ID required');
    return { yachts: [], total: 0, page: 1, limit: 20, hasMore: false };
  }

  // TODO: Implement actual API call when partnership is approved
  // const url = new URL(`${config.baseUrl}/yachts/search`);
  // const response = await fetch(url.toString(), {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${config.apiKey}`,
  //     'X-Partner-ID': config.partnerId,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify(params),
  //   signal: AbortSignal.timeout(config.timeout),
  // });

  console.warn('[charter-index] searchYachts() stub called — awaiting API partnership approval');
  return { yachts: [], total: 0, page: params.page || 1, limit: params.limit || 20, hasMore: false };
}

/**
 * Get yacht availability calendar.
 * STUB — returns empty array until API credentials are configured.
 */
export async function getAvailability(
  yachtId: string,
  startDate: string,
  endDate: string
): Promise<CharterIndexAvailability[]> {
  const config = getCharterIndexConfig();
  if (!config) {
    console.warn('[charter-index] Not configured');
    return [];
  }

  // TODO: Implement actual API call
  console.warn(`[charter-index] getAvailability() stub called for yacht ${yachtId}`);
  return [];
}

/**
 * Get yacht details by Charter Index ID.
 * STUB — returns null until API credentials are configured.
 */
export async function getYachtDetails(
  yachtId: string
): Promise<CharterIndexYacht | null> {
  const config = getCharterIndexConfig();
  if (!config) {
    console.warn('[charter-index] Not configured');
    return null;
  }

  // TODO: Implement actual API call
  console.warn(`[charter-index] getYachtDetails() stub called for ${yachtId}`);
  return null;
}

/**
 * Sync yacht inventory from Charter Index into local Prisma DB.
 * STUB — returns 0 until API credentials are configured.
 *
 * When implemented, this will:
 * 1. Fetch all yachts from Charter Index matching our criteria
 * 2. Upsert into local Yacht table with source="charter_index"
 * 3. Update availability windows
 * 4. Return count of synced yachts
 */
export async function syncInventory(
  siteId: string
): Promise<{ synced: number; errors: number }> {
  const config = getCharterIndexConfig();
  if (!config) {
    console.warn('[charter-index] Not configured — skipping inventory sync');
    return { synced: 0, errors: 0 };
  }

  // TODO: Implement full sync pipeline
  console.warn('[charter-index] syncInventory() stub called');
  return { synced: 0, errors: 0 };
}
