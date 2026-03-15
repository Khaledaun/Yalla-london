/**
 * CJ Affiliate API Client
 *
 * Rate-limited, retry-aware client for CJ REST APIs.
 * CJ APIs return XML responses — we parse them to typed objects.
 *
 * Endpoints:
 * - Advertiser Lookup: GET https://advertiser-lookup.api.cj.com/v2/advertiser-lookup
 * - Link Search: GET https://link-search.api.cj.com/v2/link-search
 * - Product Search: GET https://product-search.api.cj.com/v2/product-search
 * - Commission Detail: GET https://commission-detail.api.cj.com/v3/commissions
 *
 * All require: Authorization: Bearer <CJ_API_TOKEN>, requestor-cid=7895467
 * Rate limit: 25 requests/minute
 *
 * CRITICAL RULES (see docs/CRITICAL-RULES-INDEX.md):
 * - Rule #38: CJ API has NO click/impression data — track clicks locally via CjClickEvent.
 * - Rule #39: Rate limit 25 req/min — always use the rate limiter. Circuit breaker opens after 3 failures.
 * - Rule #40: lookupAdvertisers({joined:true}) returns 0 for new accounts — fetch ALL, classify locally.
 * - Rule #41: Coverage detection must match ALL injection patterns (affiliate-recommendation, rel=sponsored, etc.)
 */

// ---------------------------------------------------------------------------
// Types — based on CJ REST API XML response shapes
// ---------------------------------------------------------------------------

export interface CjAdvertiserRecord {
  advertiserId: string;
  advertiserName: string;
  programUrl: string;
  relationshipStatus: string; // "joined", "notjoined", "pending"
  networkEarningsSevenDay: number;
  networkEarningsThreeMonth: number;
  sevenDayEpc: number;
  threeMonthEpc: number;
  cookieDuration: number;
  mobileTrackingCertified: boolean;
  actions?: { name: string; type: string; commission: string }[];
}

export interface CjLinkRecord {
  linkId: string;
  linkName: string;
  advertiserId: string;
  advertiserName: string;
  clickUrl: string;
  destinationUrl: string;
  linkType: string;
  category: string;
  language: string;
  description: string;
  creativeHeight: number;
  creativeWidth: number;
  promotionType: string;
  promotionStartDate: string;
  promotionEndDate: string;
}

export interface CjProductRecord {
  adId: string;
  advertiserId: string;
  advertiserName: string;
  buyUrl: string;
  catalogId: string;
  currency: string;
  description: string;
  imageUrl: string;
  inStock: boolean;
  manufacturerName: string;
  name: string;
  price: number;
  retailPrice: number;
  salePrice: number;
  sku: string;
}

export interface CjCommissionRecord {
  actionId: string;
  actionStatus: string; // "new", "extended", "closed", "locked"
  actionType: string; // "sale", "lead", "bonus"
  advertiserId: string;
  advertiserName: string;
  commissionAmount: number;
  saleAmount: number;
  currency: string;
  eventDate: string;
  lockingDate: string;
  publisherId: string;
  pubCommissionAmountUsd: number;
  original: boolean;
  shopperId: string;
  postingDate: string;
  orderId: string;
  sid: string; // Sub-ID / SID for tracking
}

export interface CjPaginatedResponse<T> {
  records: T[];
  totalMatched: number;
  recordsReturned: number;
  pageNumber: number;
}

export interface CjApiError {
  code: string;
  message: string;
  isRateLimit: boolean;
  isAuth: boolean;
  isNetwork: boolean;
  statusCode: number;
}

// ---------------------------------------------------------------------------
// XML Parser — Lightweight regex-based parser for CJ XML responses
// ---------------------------------------------------------------------------

function extractXmlText(xml: string, tag: string): string {
  // Use lookahead to ensure exact tag match (e.g., <advertiser-id> not <advertiser-idx>)
  const regex = new RegExp(`<${tag}(?=[\\s>])[^>]*>([^<]*)</${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

function extractXmlNumber(xml: string, tag: string): number {
  const text = extractXmlText(xml, tag);
  const num = parseFloat(text);
  return isNaN(num) ? 0 : num;
}

function extractXmlBoolean(xml: string, tag: string): boolean {
  return extractXmlText(xml, tag).toLowerCase() === "true";
}

/**
 * Extract an XML attribute value from the first element matching the tag.
 * e.g., extractXmlAttribute(xml, "advertisers", "total-matched") for <advertisers total-matched="5">
 */
function extractXmlAttribute(xml: string, tag: string, attr: string): string {
  const regex = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

function extractAllElements(xml: string, tag: string): string[] {
  // CRITICAL: Use lookahead (?=[\s>]) to prevent <advertiser> from matching <advertisers>
  // Without this, the regex captures the wrapper element instead of individual elements,
  // causing 0 parsed records despite valid API responses.
  const regex = new RegExp(`<${tag}(?=[\\s>])[^>]*>[\\s\\S]*?</${tag}>`, "gi");
  return xml.match(regex) || [];
}

function parseAdvertiser(xml: string): CjAdvertiserRecord {
  return {
    advertiserId: extractXmlText(xml, "advertiser-id"),
    advertiserName: extractXmlText(xml, "advertiser-name"),
    programUrl: extractXmlText(xml, "program-url"),
    relationshipStatus: extractXmlText(xml, "relationship-status"),
    networkEarningsSevenDay: extractXmlNumber(xml, "network-rank-seven-day"),
    networkEarningsThreeMonth: extractXmlNumber(xml, "network-rank-three-month"),
    sevenDayEpc: extractXmlNumber(xml, "seven-day-epc"),
    threeMonthEpc: extractXmlNumber(xml, "three-month-epc"),
    cookieDuration: extractXmlNumber(xml, "cookie-duration") || 30,
    mobileTrackingCertified: extractXmlBoolean(xml, "mobile-tracking-certified"),
  };
}

function parseLink(xml: string): CjLinkRecord {
  return {
    linkId: extractXmlText(xml, "link-id"),
    linkName: extractXmlText(xml, "link-name"),
    advertiserId: extractXmlText(xml, "advertiser-id"),
    advertiserName: extractXmlText(xml, "advertiser-name"),
    clickUrl: extractXmlText(xml, "clickUrl"),
    destinationUrl: extractXmlText(xml, "destination"),
    linkType: extractXmlText(xml, "link-type"),
    category: extractXmlText(xml, "category"),
    language: extractXmlText(xml, "language"),
    description: extractXmlText(xml, "description"),
    creativeHeight: extractXmlNumber(xml, "creative-height"),
    creativeWidth: extractXmlNumber(xml, "creative-width"),
    promotionType: extractXmlText(xml, "promotion-type"),
    promotionStartDate: extractXmlText(xml, "promotion-start-date"),
    promotionEndDate: extractXmlText(xml, "promotion-end-date"),
  };
}

function parseProduct(xml: string): CjProductRecord {
  return {
    adId: extractXmlText(xml, "ad-id"),
    advertiserId: extractXmlText(xml, "advertiser-id"),
    advertiserName: extractXmlText(xml, "advertiser-name"),
    buyUrl: extractXmlText(xml, "buy-url"),
    catalogId: extractXmlText(xml, "catalog-id"),
    currency: extractXmlText(xml, "currency"),
    description: extractXmlText(xml, "description"),
    imageUrl: extractXmlText(xml, "image-url"),
    inStock: extractXmlBoolean(xml, "in-stock"),
    manufacturerName: extractXmlText(xml, "manufacturer-name"),
    name: extractXmlText(xml, "name"),
    price: extractXmlNumber(xml, "price"),
    retailPrice: extractXmlNumber(xml, "retail-price"),
    salePrice: extractXmlNumber(xml, "sale-price"),
    sku: extractXmlText(xml, "sku"),
  };
}

function parseCommission(xml: string): CjCommissionRecord {
  return {
    actionId: extractXmlText(xml, "action-id") || extractXmlText(xml, "original-action-id"),
    actionStatus: extractXmlText(xml, "action-status"),
    actionType: extractXmlText(xml, "action-type"),
    advertiserId: extractXmlText(xml, "advertiser-cid") || extractXmlText(xml, "cid"),
    advertiserName: extractXmlText(xml, "advertiser-name"),
    commissionAmount: extractXmlNumber(xml, "commission-amount"),
    saleAmount: extractXmlNumber(xml, "sale-amount"),
    currency: extractXmlText(xml, "currency") || "USD",
    eventDate: extractXmlText(xml, "event-date"),
    lockingDate: extractXmlText(xml, "locking-date"),
    publisherId: extractXmlText(xml, "publisher-id"),
    pubCommissionAmountUsd: extractXmlNumber(xml, "pub-commission-amount-usd"),
    original: extractXmlBoolean(xml, "original"),
    shopperId: extractXmlText(xml, "shopper-id"),
    postingDate: extractXmlText(xml, "posting-date"),
    orderId: extractXmlText(xml, "order-id"),
    sid: extractXmlText(xml, "sid"),
  };
}

function parsePaginatedResponse<T>(
  xml: string,
  elementTag: string,
  parser: (el: string) => T
): CjPaginatedResponse<T> {
  // CJ API puts pagination info as ATTRIBUTES on the wrapper element, not child elements.
  // e.g., <advertisers total-matched="5" page-number="1" records-per-page="100">
  // Try attribute extraction first, fall back to child element extraction.
  const wrapperTag = elementTag + "s"; // "advertiser" → "advertisers", "link" → "links", etc.

  let totalMatched = parseInt(extractXmlAttribute(xml, wrapperTag, "total-matched"), 10) || 0;
  let recordsReturned = parseInt(extractXmlAttribute(xml, wrapperTag, "records-returned"), 10) || 0;
  let pageNumber = parseInt(extractXmlAttribute(xml, wrapperTag, "page-number"), 10) || 1;

  // Fallback: try child element extraction (some CJ endpoints may use this format)
  if (totalMatched === 0) {
    totalMatched = extractXmlNumber(xml, "total-matched") || 0;
  }
  if (recordsReturned === 0) {
    recordsReturned = extractXmlNumber(xml, "records-returned") || 0;
  }

  const elements = extractAllElements(xml, elementTag);
  const records = elements.map(parser);

  // If parser found records but recordsReturned was 0 (attribute extraction failed),
  // use the actual count
  if (records.length > 0 && recordsReturned === 0) {
    recordsReturned = records.length;
  }
  if (records.length > 0 && totalMatched === 0) {
    totalMatched = records.length;
  }

  // Diagnostic: warn if CJ says records exist but parser found none (tag mismatch)
  if (recordsReturned > 0 && records.length === 0) {
    console.warn(`[cj-client] XML tag mismatch? CJ says ${recordsReturned} records but parser found 0 <${elementTag}> elements. XML preview: ${xml.substring(0, 500)}`);
  }

  // Log parse results for debugging
  console.log(`[cj-client] parsePaginatedResponse<${elementTag}>: totalMatched=${totalMatched}, recordsReturned=${recordsReturned}, parsed=${records.length}, page=${pageNumber}`);

  return { records, totalMatched, recordsReturned, pageNumber };
}

// ---------------------------------------------------------------------------
// Rate Limiter — 25 requests/minute with queue
// ---------------------------------------------------------------------------

class RateLimiter {
  private timestamps: number[] = [];
  private queue: Array<{
    resolve: () => void;
    reject: (err: Error) => void;
  }> = [];

  constructor(
    private maxRequests: number = 25,
    private windowMs: number = 60_000
  ) {}

  async acquire(): Promise<void> {
    const now = Date.now();
    // Remove timestamps outside the window
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);

    if (this.timestamps.length < this.maxRequests) {
      this.timestamps.push(now);
      return;
    }

    // Need to wait — calculate delay
    const oldestInWindow = this.timestamps[0];
    const waitMs = oldestInWindow + this.windowMs - now + 100; // +100ms buffer

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.timestamps = this.timestamps.filter(
          (t) => Date.now() - t < this.windowMs
        );
        this.timestamps.push(Date.now());
        resolve();
      }, waitMs);

      this.queue.push({
        resolve: () => {
          clearTimeout(timer);
          resolve();
        },
        reject,
      });
    });
  }
}

// ---------------------------------------------------------------------------
// CJ API Client — Singleton
// ---------------------------------------------------------------------------

// Fallback CID — only used if CJ_PUBLISHER_CID env var is not set.
// In production, CJ_PUBLISHER_CID MUST be set in Vercel (configured March 10, 2026).
const CJ_PUBLISHER_CID_FALLBACK = "7895467";
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

// ---------------------------------------------------------------------------
// Circuit Breaker — opens after 3 consecutive failures, 5-min cooldown
// ---------------------------------------------------------------------------

const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

let _circuitFailures = 0;
let _circuitOpenedAt = 0;

function isCircuitOpen(): boolean {
  if (_circuitFailures < CIRCUIT_BREAKER_THRESHOLD) return false;
  // Check if cooldown has passed
  if (Date.now() - _circuitOpenedAt > CIRCUIT_BREAKER_COOLDOWN_MS) {
    // Half-open: allow one probe
    _circuitFailures = CIRCUIT_BREAKER_THRESHOLD - 1;
    return false;
  }
  return true;
}

function recordCjSuccess(): void {
  _circuitFailures = 0;
}

function recordCjFailure(): void {
  _circuitFailures++;
  if (_circuitFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    _circuitOpenedAt = Date.now();
    console.warn(`[cj-client] Circuit breaker OPEN after ${_circuitFailures} consecutive failures. Cooldown: ${CIRCUIT_BREAKER_COOLDOWN_MS / 1000}s`);
  }
}

/**
 * Get the current circuit breaker state for health checks.
 */
export function getCircuitBreakerState(): { failures: number; isOpen: boolean; openedAt: number } {
  return { failures: _circuitFailures, isOpen: isCircuitOpen(), openedAt: _circuitOpenedAt };
}

/**
 * Reset circuit breaker manually — allows retrying after fixing the root cause.
 */
export function resetCircuitBreaker(): void {
  _circuitFailures = 0;
  _circuitOpenedAt = 0;
  console.log("[cj-client] Circuit breaker manually reset");
}

let _rateLimiter: RateLimiter | null = null;

function getRateLimiter(): RateLimiter {
  if (!_rateLimiter) {
    _rateLimiter = new RateLimiter(25, 60_000);
  }
  return _rateLimiter;
}

function getApiToken(): string {
  const token = process.env.CJ_API_TOKEN;
  if (!token) {
    throw new Error(
      "[cj-client] CJ_API_TOKEN environment variable is not set"
    );
  }
  return token;
}

function getPublisherCid(): string {
  return process.env.CJ_PUBLISHER_CID || CJ_PUBLISHER_CID_FALLBACK;
}

async function cjFetch(
  url: string,
  params: Record<string, string> = {},
  retryCount = 0
): Promise<string> {
  // Circuit breaker check
  if (isCircuitOpen()) {
    throw createCjError("CJ API circuit breaker is OPEN — too many consecutive failures. Will retry after cooldown.", 503);
  }

  const limiter = getRateLimiter();
  await limiter.acquire();

  const token = getApiToken();
  const cid = getPublisherCid();

  // Build URL with query params
  const urlObj = new URL(url);
  urlObj.searchParams.set("requestor-cid", cid);
  for (const [key, value] of Object.entries(params)) {
    if (value) urlObj.searchParams.set(key, value);
  }

  try {
    const response = await fetch(urlObj.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/xml",
      },
      signal: AbortSignal.timeout(20_000), // 20s timeout per request (balance CJ slowness vs 53s budget)
    });

    if (response.status === 429) {
      // Rate limited — retry with backoff
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_BASE_MS * Math.pow(2, retryCount);
        console.warn(
          `[cj-client] Rate limited, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`
        );
        await new Promise((r) => setTimeout(r, delay));
        return cjFetch(url, params, retryCount + 1);
      }
      throw createCjError("Rate limit exceeded after retries", 429);
    }

    if (response.status === 401 || response.status === 403) {
      const authBody = await response.text().catch(() => "");
      console.error(`[cj-client] Auth failed (${response.status}): ${authBody.substring(0, 500)}`);
      throw createCjError(
        `CJ API auth failed (${response.status}): ${authBody.substring(0, 200) || "no details"}`,
        response.status
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      if (retryCount < MAX_RETRIES && response.status >= 500) {
        const delay = RETRY_BASE_MS * Math.pow(2, retryCount);
        console.warn(
          `[cj-client] Server error ${response.status}, retrying in ${delay}ms`
        );
        await new Promise((r) => setTimeout(r, delay));
        return cjFetch(url, params, retryCount + 1);
      }
      throw createCjError(
        `CJ API error: ${response.status} ${body.substring(0, 200)}`,
        response.status
      );
    }

    const text = await response.text();
    recordCjSuccess();

    // Log response format for debugging (first sync runs)
    const trimmed = text.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      console.warn(`[cj-client] CJ returned JSON instead of XML. First 300 chars: ${trimmed.substring(0, 300)}`);
    } else if (!trimmed.startsWith("<?xml") && !trimmed.startsWith("<")) {
      console.warn(`[cj-client] CJ returned unexpected format. First 300 chars: ${trimmed.substring(0, 300)}`);
    }

    return text;
  } catch (err) {
    if (err && typeof err === "object" && "isRateLimit" in err) { recordCjFailure(); throw err; }
    if (err && typeof err === "object" && "isAuth" in err) { recordCjFailure(); throw err; }

    // Network error — retry
    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_BASE_MS * Math.pow(2, retryCount);
      console.warn(
        `[cj-client] Network error, retrying in ${delay}ms: ${err instanceof Error ? err.message : String(err)}`
      );
      await new Promise((r) => setTimeout(r, delay));
      return cjFetch(url, params, retryCount + 1);
    }
    recordCjFailure();
    throw createCjError(
      `Network error after ${MAX_RETRIES} retries: ${err instanceof Error ? err.message : String(err)}`,
      0
    );
  }
}

function createCjError(message: string, statusCode: number): CjApiError {
  return {
    code: `CJ_${statusCode || "NETWORK"}`,
    message,
    isRateLimit: statusCode === 429,
    isAuth: statusCode === 401 || statusCode === 403,
    isNetwork: statusCode === 0,
    statusCode,
  };
}

// ---------------------------------------------------------------------------
// Public API Methods
// ---------------------------------------------------------------------------

const ADVERTISER_LOOKUP_URL =
  "https://advertiser-lookup.api.cj.com/v2/advertiser-lookup";
const LINK_SEARCH_URL =
  "https://link-search.api.cj.com/v2/link-search";
const PRODUCT_SEARCH_URL =
  "https://product-search.api.cj.com/v2/product-search";
const COMMISSION_DETAIL_URL =
  "https://commission-detail.api.cj.com/v3/commissions";

/**
 * Look up advertisers by status, keywords, or specific IDs.
 */
export async function lookupAdvertisers(opts: {
  joined?: boolean;
  advertiserIds?: string[];
  keywords?: string;
  pageNumber?: number;
  recordsPerPage?: number;
}): Promise<CjPaginatedResponse<CjAdvertiserRecord>> {
  const params: Record<string, string> = {};

  // NOTE: website-id is NOT a valid parameter for advertiser-lookup API.
  // CJ scopes results via requestor-cid (set in cjFetch).

  // CJ API uses `advertiser-ids` param for filtering. Special values:
  // - "joined" = all advertisers with active relationship
  // - "notjoined" = all advertisers without relationship
  // - comma-separated IDs = specific advertisers
  // NOTE: Empty requests (no advertiser-ids, no keywords) return ZERO results.
  if (opts.advertiserIds?.length) {
    params["advertiser-ids"] = opts.advertiserIds.join(",");
  } else if (opts.joined !== undefined) {
    // Legacy boolean interface — convert to advertiser-ids keyword
    params["advertiser-ids"] = opts.joined ? "joined" : "notjoined";
  }
  if (opts.keywords) {
    params["keywords"] = opts.keywords;
  }
  params["page-number"] = String(opts.pageNumber || 1);
  params["records-per-page"] = String(opts.recordsPerPage || 100);

  // Log request params for debugging
  console.log(`[cj-client] lookupAdvertisers request: advertiser-ids=${params["advertiser-ids"] || "NONE"}, keywords=${params["keywords"] || "none"}, page=${params["page-number"]}, cid=${getPublisherCid()?.substring(0, 4)}...`);

  const xml = await cjFetch(ADVERTISER_LOOKUP_URL, params);
  const result = parsePaginatedResponse(xml, "advertiser", parseAdvertiser);

  if (result.records.length === 0) {
    // Log first 800 chars of response to diagnose empty results
    console.warn(`[cj-client] Empty advertiser response. XML preview (800 chars): ${xml.substring(0, 800)}`);
  } else {
    // Log first advertiser found for confirmation
    const first = result.records[0];
    console.log(`[cj-client] First advertiser: ${first.advertiserName} (ID: ${first.advertiserId}, status: ${first.relationshipStatus})`);
  }

  return result;
}

/**
 * Search for affiliate links by advertiser, category, or keywords.
 */
export async function searchLinks(opts: {
  advertiserId?: string;
  linkType?: string;
  category?: string;
  language?: string;
  keywords?: string;
  promotionType?: string;
  pageNumber?: number;
  recordsPerPage?: number;
}): Promise<CjPaginatedResponse<CjLinkRecord>> {
  const params: Record<string, string> = {};

  if (opts.advertiserId) params["advertiser-ids"] = opts.advertiserId;
  if (opts.linkType) params["link-type"] = opts.linkType;
  if (opts.category) params["category"] = opts.category;
  if (opts.language) params["language"] = opts.language;
  if (opts.keywords) params["keywords"] = opts.keywords;
  if (opts.promotionType) params["promotion-type"] = opts.promotionType;
  const websiteId = getWebsiteId();
  if (websiteId) params["website-id"] = websiteId;
  params["page-number"] = String(opts.pageNumber || 1);
  params["records-per-page"] = String(opts.recordsPerPage || 100);

  const xml = await cjFetch(LINK_SEARCH_URL, params);
  return parsePaginatedResponse(xml, "link", parseLink);
}

/**
 * Search CJ product catalog (114M+ products).
 */
export async function searchProducts(opts: {
  advertiserIds?: string[];
  keywords?: string;
  lowPrice?: number;
  highPrice?: number;
  currency?: string;
  pageNumber?: number;
  recordsPerPage?: number;
}): Promise<CjPaginatedResponse<CjProductRecord>> {
  const params: Record<string, string> = {};

  if (opts.advertiserIds?.length) {
    params["advertiser-ids"] = opts.advertiserIds.join(",");
  }
  if (opts.keywords) params["keywords"] = opts.keywords;
  if (opts.lowPrice !== undefined) params["low-price"] = String(opts.lowPrice);
  if (opts.highPrice !== undefined)
    params["high-price"] = String(opts.highPrice);
  if (opts.currency) params["currency"] = opts.currency;
  const wsId = getWebsiteId();
  if (wsId) params["website-id"] = wsId;
  params["page-number"] = String(opts.pageNumber || 1);
  params["records-per-page"] = String(opts.recordsPerPage || 100);

  const xml = await cjFetch(PRODUCT_SEARCH_URL, params);
  return parsePaginatedResponse(xml, "product", parseProduct);
}

/**
 * Fetch commission/transaction details for a date range.
 */
export async function fetchCommissions(opts: {
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;
  advertiserIds?: string[];
  actionStatus?: string;
  actionType?: string;
  pageNumber?: number;
  recordsPerPage?: number;
}): Promise<CjPaginatedResponse<CjCommissionRecord>> {
  const params: Record<string, string> = {};

  params["date-type"] = "event";
  params["start-date"] = opts.dateFrom;
  params["end-date"] = opts.dateTo;
  if (opts.advertiserIds?.length) {
    params["advertiser-ids"] = opts.advertiserIds.join(",");
  }
  if (opts.actionStatus) params["action-status"] = opts.actionStatus;
  if (opts.actionType) params["action-type"] = opts.actionType;
  params["page-number"] = String(opts.pageNumber || 1);
  params["records-per-page"] = String(opts.recordsPerPage || 100);

  const xml = await cjFetch(COMMISSION_DETAIL_URL, params);
  return parsePaginatedResponse(xml, "commission", parseCommission);
}

/**
 * Get the CJ website ID for scoping API results.
 */
export function getWebsiteId(): string {
  return process.env.CJ_WEBSITE_ID || "";
}

/**
 * Check if CJ API credentials are configured.
 */
export function isCjConfigured(): boolean {
  return !!(process.env.CJ_API_TOKEN);
}

/**
 * Get the CJ network record ID used for seeded data.
 */
export const CJ_NETWORK_ID = "cj-network-001";
