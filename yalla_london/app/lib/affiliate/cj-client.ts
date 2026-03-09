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
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
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

function extractAllElements(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, "gi");
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
    advertiserId: extractXmlText(xml, "cid"),
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
  const totalMatched = extractXmlNumber(xml, "total-matched") || 0;
  const recordsReturned = extractXmlNumber(xml, "records-returned") || 0;
  const pageNumber = extractXmlNumber(xml, "page-number") || 1;
  const elements = extractAllElements(xml, elementTag);
  const records = elements.map(parser);

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

const CJ_PUBLISHER_CID = "7895467";
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

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
  return process.env.CJ_PUBLISHER_CID || CJ_PUBLISHER_CID;
}

async function cjFetch(
  url: string,
  params: Record<string, string> = {},
  retryCount = 0
): Promise<string> {
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
      signal: AbortSignal.timeout(15_000), // 15s timeout per request
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
      throw createCjError(
        "CJ API authentication failed — check CJ_API_TOKEN",
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

    return await response.text();
  } catch (err) {
    if (err && typeof err === "object" && "isRateLimit" in err) throw err;
    if (err && typeof err === "object" && "isAuth" in err) throw err;

    // Network error — retry
    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_BASE_MS * Math.pow(2, retryCount);
      console.warn(
        `[cj-client] Network error, retrying in ${delay}ms: ${err instanceof Error ? err.message : String(err)}`
      );
      await new Promise((r) => setTimeout(r, delay));
      return cjFetch(url, params, retryCount + 1);
    }
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

  if (opts.joined !== undefined) {
    params["joined"] = opts.joined ? "true" : "false";
  }
  if (opts.advertiserIds?.length) {
    params["advertiser-ids"] = opts.advertiserIds.join(",");
  }
  if (opts.keywords) {
    params["keywords"] = opts.keywords;
  }
  params["page-number"] = String(opts.pageNumber || 1);
  params["records-per-page"] = String(opts.recordsPerPage || 100);

  const xml = await cjFetch(ADVERTISER_LOOKUP_URL, params);
  return parsePaginatedResponse(xml, "advertiser", parseAdvertiser);
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
 * Check if CJ API credentials are configured.
 */
export function isCjConfigured(): boolean {
  return !!(process.env.CJ_API_TOKEN);
}

/**
 * Get the CJ network record ID used for seeded data.
 */
export const CJ_NETWORK_ID = "cj-network-001";
