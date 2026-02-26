/**
 * Etsy API v3 Client — OAuth2 PKCE + Listing Management
 *
 * Handles:
 * - OAuth2 Authorization Code flow with PKCE
 * - Token exchange, refresh, and encrypted storage via Credential model
 * - Shop lookup (name → numeric ID)
 * - Listing CRUD (create, update, activate)
 * - Digital file upload
 * - Image upload
 *
 * Env vars (set in Vercel):
 *   ETSY_API_KEY        — Etsy app "key string" (= OAuth2 client_id)
 *   ETSY_SHARED_SECRET  — Etsy app "shared secret"
 *   ETSY_SHOP_ID        — Numeric shop ID (or shop name — resolved via API)
 *   ETSY_REDIRECT_URI   — OAuth callback URL (defaults to {NEXTAUTH_URL}/api/auth/etsy/callback)
 */

import crypto from "crypto";

// ─── Constants ──────────────────────────────────────────

const ETSY_API_BASE = "https://openapi.etsy.com/v3";
const ETSY_AUTH_URL = "https://www.etsy.com/oauth/connect";
const ETSY_TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token";

/** Scopes required for listing management + shop read */
const REQUIRED_SCOPES = [
  "listings_r",
  "listings_w",
  "listings_d",
  "shops_r",
  "shops_w",
  "transactions_r",
  "profile_r",
];

// ─── Config helpers ─────────────────────────────────────

export function getEtsyConfig() {
  return {
    clientId: process.env.ETSY_API_KEY ?? "",
    sharedSecret: process.env.ETSY_SHARED_SECRET ?? "",
    shopId: process.env.ETSY_SHOP_ID ?? "",
    redirectUri:
      process.env.ETSY_REDIRECT_URI ??
      `${process.env.NEXTAUTH_URL ?? "https://yalla-london.com"}/api/auth/etsy/callback`,
  };
}

export function isEtsyConfigured(): boolean {
  const cfg = getEtsyConfig();
  return !!(cfg.clientId && cfg.sharedSecret);
}

// ─── PKCE Helpers ───────────────────────────────────────

/** Generate a 43-128 char code verifier per RFC 7636 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(64).toString("base64url").slice(0, 128);
}

/** SHA256 hash → base64url = code challenge */
export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

/** Random state token to prevent CSRF */
export function generateState(): string {
  return crypto.randomBytes(24).toString("hex");
}

/**
 * Etsy access tokens are prefixed with the user's numeric ID:
 * e.g. "12345678.abcdef..." → user_id is 12345678
 */
function extractUserIdFromToken(token: string): string | null {
  const dotIndex = token.indexOf(".");
  if (dotIndex > 0) {
    const prefix = token.slice(0, dotIndex);
    if (/^\d+$/.test(prefix)) return prefix;
  }
  return null;
}

// ─── OAuth2 Flow ────────────────────────────────────────

/**
 * Build the Etsy authorization URL.
 * The caller must persist `codeVerifier` and `state` (e.g. in a short-lived cookie or DB row)
 * so the callback route can use them.
 */
export function buildAuthorizationUrl(
  codeVerifier: string,
  state: string,
): string {
  const cfg = getEtsyConfig();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    scope: REQUIRED_SCOPES.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `${ETSY_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange the authorization code for access + refresh tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
): Promise<EtsyTokenResponse> {
  const cfg = getEtsyConfig();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    code,
    code_verifier: codeVerifier,
  });

  const res = await fetch(ETSY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Etsy token exchange failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<EtsyTokenResponse>;
}

/**
 * Refresh an expired access token using the refresh token.
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<EtsyTokenResponse> {
  const cfg = getEtsyConfig();

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: cfg.clientId,
    refresh_token: refreshToken,
  });

  const res = await fetch(ETSY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Etsy token refresh failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<EtsyTokenResponse>;
}

// ─── Token Persistence (Credential model) ───────────────

/**
 * Store OAuth tokens encrypted in the Credential table and update EtsyShopConfig.
 */
export async function storeTokens(
  siteId: string,
  tokens: EtsyTokenResponse,
): Promise<void> {
  const { prisma } = await import("@/lib/db");
  const { encrypt } = await import("@/lib/encryption");

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  // Upsert access token credential
  const accessCred = await prisma.credential.upsert({
    where: {
      id:
        (
          await prisma.etsyShopConfig.findUnique({
            where: { siteId },
            select: { accessTokenCredentialId: true },
          })
        )?.accessTokenCredentialId ?? "new-access",
    },
    create: {
      site_id: siteId,
      name: "Etsy Access Token",
      type: "oauth_token",
      encrypted_value: encrypt(tokens.access_token),
      status: "active",
    },
    update: {
      encrypted_value: encrypt(tokens.access_token),
      last_used_at: new Date(),
      status: "active",
    },
  });

  // Upsert refresh token credential
  const refreshCred = await prisma.credential.upsert({
    where: {
      id:
        (
          await prisma.etsyShopConfig.findUnique({
            where: { siteId },
            select: { refreshTokenCredentialId: true },
          })
        )?.refreshTokenCredentialId ?? "new-refresh",
    },
    create: {
      site_id: siteId,
      name: "Etsy Refresh Token",
      type: "oauth_token",
      encrypted_value: encrypt(tokens.refresh_token),
      status: "active",
    },
    update: {
      encrypted_value: encrypt(tokens.refresh_token),
      last_used_at: new Date(),
      status: "active",
    },
  });

  // Upsert EtsyShopConfig
  await prisma.etsyShopConfig.upsert({
    where: { siteId },
    create: {
      siteId,
      accessTokenCredentialId: accessCred.id,
      refreshTokenCredentialId: refreshCred.id,
      scopes: REQUIRED_SCOPES,
      tokenExpiresAt: expiresAt,
      connectionStatus: "connected",
      lastTestedAt: new Date(),
    },
    update: {
      accessTokenCredentialId: accessCred.id,
      refreshTokenCredentialId: refreshCred.id,
      scopes: REQUIRED_SCOPES,
      tokenExpiresAt: expiresAt,
      connectionStatus: "connected",
      lastTestedAt: new Date(),
    },
  });
}

/**
 * Get a valid access token for a site.
 * Automatically refreshes if expired.
 */
export async function getAccessToken(siteId: string): Promise<string> {
  const { prisma } = await import("@/lib/db");
  const { decrypt } = await import("@/lib/encryption");

  const config = await prisma.etsyShopConfig.findUnique({
    where: { siteId },
  });

  if (!config || !config.accessTokenCredentialId) {
    throw new Error(`No Etsy connection for site "${siteId}". Connect via OAuth first.`);
  }

  // Check if token is expired (with 5-minute buffer)
  const isExpired =
    config.tokenExpiresAt &&
    config.tokenExpiresAt.getTime() < Date.now() + 5 * 60 * 1000;

  if (!isExpired) {
    // Token still valid — decrypt and return
    const cred = await prisma.credential.findUnique({
      where: { id: config.accessTokenCredentialId },
    });
    if (!cred) throw new Error("Access token credential not found");
    return decrypt(cred.encrypted_value);
  }

  // Token expired — refresh
  if (!config.refreshTokenCredentialId) {
    throw new Error("No refresh token available. Re-authenticate via OAuth.");
  }

  const refreshCred = await prisma.credential.findUnique({
    where: { id: config.refreshTokenCredentialId },
  });
  if (!refreshCred) throw new Error("Refresh token credential not found");

  const refreshToken = decrypt(refreshCred.encrypted_value);
  const newTokens = await refreshAccessToken(refreshToken);

  // Store the new tokens
  await storeTokens(siteId, newTokens);

  return newTokens.access_token;
}

// ─── API Helpers ────────────────────────────────────────

/**
 * Make an authenticated request to the Etsy API v3.
 */
async function etsyFetch(
  path: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<Response> {
  const cfg = getEtsyConfig();
  const url = `${ETSY_API_BASE}${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "x-api-key": cfg.clientId,
    ...(options.headers as Record<string, string> ?? {}),
  };

  // Do NOT set Content-Type for FormData (multipart) — let fetch set boundary
  // For URLSearchParams or string bodies, the caller sets Content-Type explicitly

  const res = await fetch(url, {
    ...options,
    headers,
  });

  return res;
}

// ─── Shop Operations ────────────────────────────────────

/**
 * Resolve a shop name to a numeric shop ID via the Etsy API.
 * Also works if ETSY_SHOP_ID is already numeric.
 */
export async function resolveShopId(
  siteId: string,
): Promise<{ shopId: number; shopName: string; shopUrl: string }> {
  const cfg = getEtsyConfig();
  const accessToken = await getAccessToken(siteId);

  // If ETSY_SHOP_ID is already numeric, fetch shop directly
  if (/^\d+$/.test(cfg.shopId)) {
    const res = await etsyFetch(
      `/application/shops/${cfg.shopId}`,
      accessToken,
    );
    if (!res.ok) {
      throw new Error(`Failed to fetch shop ${cfg.shopId}: ${res.status}`);
    }
    const shop = (await res.json()) as EtsyShop;
    return {
      shopId: shop.shop_id,
      shopName: shop.shop_name,
      shopUrl: shop.url,
    };
  }

  // Try resolving via the authenticated user's shops (most reliable after OAuth)
  const userId = extractUserIdFromToken(accessToken);
  if (userId) {
    try {
      const userShopRes = await etsyFetch(
        `/application/users/${userId}/shops`,
        accessToken,
      );
      if (userShopRes.ok) {
        const userShop = (await userShopRes.json()) as EtsyShop;
        if (userShop.shop_id) {
          return {
            shopId: userShop.shop_id,
            shopName: userShop.shop_name,
            shopUrl: userShop.url,
          };
        }
      }
    } catch {
      // Fall through to name-based search
    }
  }

  // Fallback: search by shop name
  const res = await etsyFetch(
    `/application/shops?shop_name=${encodeURIComponent(cfg.shopId)}`,
    accessToken,
  );

  if (!res.ok) {
    throw new Error(`Failed to search shop "${cfg.shopId}": ${res.status}`);
  }

  const data = (await res.json()) as { count: number; results: EtsyShop[] };

  if (data.count === 0 || data.results.length === 0) {
    throw new Error(`No Etsy shop found with name "${cfg.shopId}"`);
  }

  const shop = data.results[0];
  return {
    shopId: shop.shop_id,
    shopName: shop.shop_name,
    shopUrl: shop.url,
  };
}

/**
 * Get the numeric shop ID — cached in EtsyShopConfig.shopId after first resolution.
 */
export async function getShopId(siteId: string): Promise<number> {
  const { prisma } = await import("@/lib/db");

  // Check if we already have a numeric shop ID cached
  const config = await prisma.etsyShopConfig.findUnique({
    where: { siteId },
    select: { shopId: true },
  });

  if (config?.shopId && /^\d+$/.test(config.shopId)) {
    return parseInt(config.shopId, 10);
  }

  // Resolve and cache
  const resolved = await resolveShopId(siteId);

  await prisma.etsyShopConfig.update({
    where: { siteId },
    data: {
      shopId: String(resolved.shopId),
      shopName: resolved.shopName,
      shopUrl: resolved.shopUrl,
    },
  });

  return resolved.shopId;
}

// ─── Listing Operations ─────────────────────────────────

/**
 * Create a new digital listing on Etsy.
 * Returns the Etsy listing ID and URL.
 */
export async function createListing(
  siteId: string,
  draft: {
    title: string;
    description: string;
    tags: string[];
    price: number; // cents
    quantity: number;
    materials?: string[];
    taxonomyId?: number; // Etsy taxonomy category (default: 69)
  },
): Promise<{ listingId: number; url: string; state: string }> {
  const accessToken = await getAccessToken(siteId);
  const shopId = await getShopId(siteId);

  // Etsy API requires application/x-www-form-urlencoded for listing creation
  const params = new URLSearchParams();
  params.set("title", draft.title);
  params.set("description", draft.description);
  params.set("price", String(draft.price / 100)); // Etsy wants dollars, not cents
  params.set("quantity", String(draft.quantity));
  params.set("who_made", "i_did");
  params.set("when_made", "2020_2024");
  params.set("taxonomy_id", String(draft.taxonomyId ?? 69)); // 69 = common digital category
  params.set("type", "download");
  params.set("is_supply", "false");
  params.set("should_auto_renew", "true");

  // Tags: up to 13, comma-separated in the form body
  for (const tag of draft.tags.slice(0, 13)) {
    params.append("tags[]", tag);
  }

  // Materials
  if (draft.materials?.length) {
    for (const mat of draft.materials.slice(0, 13)) {
      params.append("materials[]", mat);
    }
  }

  const res = await etsyFetch(
    `/application/shops/${shopId}/listings`,
    accessToken,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      },
      body: params.toString(),
    },
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Etsy createListing failed (${res.status}): ${errorText}`);
  }

  const listing = (await res.json()) as EtsyListing;

  return {
    listingId: listing.listing_id,
    url: listing.url ?? `https://www.etsy.com/listing/${listing.listing_id}`,
    state: listing.state,
  };
}

/**
 * Update an existing Etsy listing.
 */
export async function updateListing(
  siteId: string,
  listingId: number,
  updates: Partial<{
    title: string;
    description: string;
    tags: string[];
    price: number; // cents
    quantity: number;
    state: "active" | "inactive" | "draft";
  }>,
): Promise<EtsyListing> {
  const accessToken = await getAccessToken(siteId);
  const shopId = await getShopId(siteId);

  const body: Record<string, unknown> = {};
  if (updates.title !== undefined) body.title = updates.title;
  if (updates.description !== undefined) body.description = updates.description;
  if (updates.tags !== undefined) body.tags = updates.tags.slice(0, 13);
  if (updates.price !== undefined) body.price = updates.price / 100;
  if (updates.quantity !== undefined) body.quantity = updates.quantity;
  if (updates.state !== undefined) body.state = updates.state;

  // Etsy API v3 uses PATCH for updates (PUT is deprecated and returns 404)
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(body)) {
    if (val !== undefined) {
      if (Array.isArray(val)) {
        for (const item of val) params.append(`${key}[]`, String(item));
      } else {
        params.set(key, String(val));
      }
    }
  }

  const res = await etsyFetch(
    `/application/shops/${shopId}/listings/${listingId}`,
    accessToken,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      },
      body: params.toString(),
    },
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Etsy updateListing failed (${res.status}): ${errorText}`);
  }

  return res.json() as Promise<EtsyListing>;
}

/**
 * Get a listing by ID.
 */
export async function getListing(
  siteId: string,
  listingId: number,
): Promise<EtsyListing> {
  const accessToken = await getAccessToken(siteId);

  const res = await etsyFetch(
    `/application/listings/${listingId}`,
    accessToken,
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Etsy getListing failed (${res.status}): ${errorText}`);
  }

  return res.json() as Promise<EtsyListing>;
}

/**
 * Upload an image to an Etsy listing.
 * `imageData` can be a Buffer or ReadableStream.
 */
export async function uploadListingImage(
  siteId: string,
  listingId: number,
  imageBuffer: Buffer,
  fileName: string,
  rank: number = 1,
): Promise<{ listing_image_id: number }> {
  const accessToken = await getAccessToken(siteId);
  const shopId = await getShopId(siteId);

  const formData = new FormData();
  formData.append("image", new Blob([imageBuffer]), fileName);
  formData.append("rank", String(rank));

  const res = await etsyFetch(
    `/application/shops/${shopId}/listings/${listingId}/images`,
    accessToken,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `Etsy uploadListingImage failed (${res.status}): ${errorText}`,
    );
  }

  return res.json() as Promise<{ listing_image_id: number }>;
}

/**
 * Upload a digital file to an Etsy listing.
 */
export async function uploadDigitalFile(
  siteId: string,
  listingId: number,
  fileBuffer: Buffer,
  fileName: string,
  rank: number = 1,
): Promise<{ listing_file_id: number }> {
  const accessToken = await getAccessToken(siteId);
  const shopId = await getShopId(siteId);

  const formData = new FormData();
  formData.append("file", new Blob([fileBuffer]), fileName);
  formData.append("rank", String(rank));

  const res = await etsyFetch(
    `/application/shops/${shopId}/listings/${listingId}/files`,
    accessToken,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `Etsy uploadDigitalFile failed (${res.status}): ${errorText}`,
    );
  }

  return res.json() as Promise<{ listing_file_id: number }>;
}

/**
 * Activate a draft listing (make it live on Etsy).
 */
export async function activateListing(
  siteId: string,
  listingId: number,
): Promise<EtsyListing> {
  return updateListing(siteId, listingId, { state: "active" });
}

/**
 * Get all active listings for the shop.
 */
export async function getShopListings(
  siteId: string,
  options: { state?: string; limit?: number; offset?: number } = {},
): Promise<{ count: number; results: EtsyListing[] }> {
  const accessToken = await getAccessToken(siteId);
  const shopId = await getShopId(siteId);

  const params = new URLSearchParams();
  if (options.state) params.set("state", options.state);
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset) params.set("offset", String(options.offset));

  const qs = params.toString() ? `?${params.toString()}` : "";

  const res = await etsyFetch(
    `/application/shops/${shopId}/listings${qs}`,
    accessToken,
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `Etsy getShopListings failed (${res.status}): ${errorText}`,
    );
  }

  return res.json() as Promise<{ count: number; results: EtsyListing[] }>;
}

/**
 * Test the Etsy connection by fetching shop info.
 * Returns shop name and listing count if successful.
 */
export async function testConnection(
  siteId: string,
): Promise<{ connected: boolean; shopName?: string; listingCount?: number; error?: string }> {
  try {
    const accessToken = await getAccessToken(siteId);
    const shopId = await getShopId(siteId);

    const res = await etsyFetch(
      `/application/shops/${shopId}`,
      accessToken,
    );

    if (!res.ok) {
      return { connected: false, error: `API returned ${res.status}` };
    }

    const shop = (await res.json()) as EtsyShop;

    // Update EtsyShopConfig with latest info
    const { prisma } = await import("@/lib/db");
    await prisma.etsyShopConfig.update({
      where: { siteId },
      data: {
        shopName: shop.shop_name,
        shopUrl: shop.url,
        connectionStatus: "connected",
        lastTestedAt: new Date(),
      },
    });

    return {
      connected: true,
      shopName: shop.shop_name,
      listingCount: shop.listing_active_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    // Mark connection as errored
    try {
      const { prisma } = await import("@/lib/db");
      await prisma.etsyShopConfig.update({
        where: { siteId },
        data: {
          connectionStatus: "error",
          lastTestedAt: new Date(),
        },
      });
    } catch {
      // If config doesn't exist yet, that's fine
    }

    return { connected: false, error: message };
  }
}

// ─── Full Publish Pipeline ──────────────────────────────

/**
 * Publish an EtsyListingDraft to Etsy:
 * 1. Create listing on Etsy (draft state)
 * 2. Activate listing (make live)
 * 3. Update local DB record with Etsy IDs
 *
 * Optional: upload images and digital files if URLs are provided.
 */
export async function publishDraft(
  draftId: string,
): Promise<{
  etsyListingId: number;
  etsyUrl: string;
  etsyState: string;
}> {
  const { prisma } = await import("@/lib/db");

  // Load the draft
  const draft = await prisma.etsyListingDraft.findUnique({
    where: { id: draftId },
    include: { brief: true },
  });

  if (!draft) throw new Error(`EtsyListingDraft ${draftId} not found`);
  if (draft.etsyListingId) {
    throw new Error(
      `Draft ${draftId} already published (Etsy ID: ${draft.etsyListingId})`,
    );
  }

  // Update status to "publishing"
  await prisma.etsyListingDraft.update({
    where: { id: draftId },
    data: { status: "publishing" },
  });

  try {
    // 1. Create listing on Etsy
    const result = await createListing(draft.siteId, {
      title: draft.title,
      description: draft.description ?? "",
      tags: draft.tags,
      price: draft.price,
      quantity: draft.quantity,
      materials: draft.materials,
    });

    // 2. Activate the listing
    let finalState = result.state;
    if (result.state === "draft") {
      const activated = await activateListing(draft.siteId, result.listingId);
      finalState = activated.state;
    }

    // 3. Update local DB
    await prisma.etsyListingDraft.update({
      where: { id: draftId },
      data: {
        etsyListingId: String(result.listingId),
        etsyUrl: result.url,
        etsyState: finalState,
        status: "published",
        publishedAt: new Date(),
        lastSyncAt: new Date(),
        errorMessage: null,
      },
    });

    // Update brief status to "listed"
    if (draft.briefId) {
      await prisma.productBrief.update({
        where: { id: draft.briefId },
        data: { status: "listed" },
      });
    }

    // Fire alert
    try {
      const { createAlert } = await import("./alert-engine");
      await createAlert({
        siteId: draft.siteId,
        type: "listing_status",
        severity: "success",
        title: "Listing Published on Etsy",
        message: `"${draft.title}" is now live on Etsy.`,
        actionUrl: result.url,
      });
    } catch {
      console.warn("[etsy-api] Failed to create publish alert");
    }

    return {
      etsyListingId: result.listingId,
      etsyUrl: result.url,
      etsyState: finalState,
    };
  } catch (err) {
    // Mark draft as failed
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.etsyListingDraft.update({
      where: { id: draftId },
      data: {
        status: "draft",
        errorMessage: message,
      },
    });

    throw err;
  }
}

// ─── Types ──────────────────────────────────────────────

export interface EtsyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds (usually 3600)
  refresh_token: string;
}

interface EtsyShop {
  shop_id: number;
  shop_name: string;
  url: string;
  listing_active_count: number;
  num_favorers: number;
  title: string;
  icon_url_fullxfull: string | null;
  currency_code: string;
}

interface EtsyListing {
  listing_id: number;
  title: string;
  description: string;
  state: string; // "active", "inactive", "draft", "expired", "removed"
  url: string;
  price: { amount: number; divisor: number; currency_code: string };
  tags: string[];
  quantity: number;
  views: number;
  num_favorers: number;
  is_digital: boolean;
  taxonomy_id: number;
}
