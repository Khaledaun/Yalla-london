/**
 * Pinterest API v5 Client — OAuth2 + Pin Management
 *
 * Handles:
 * - OAuth2 Authorization Code flow (no PKCE — Pinterest uses standard code grant)
 * - Token exchange, refresh, and encrypted storage via Credential model
 * - Board listing and creation
 * - Pin creation (manual + auto from EtsyListingDraft)
 *
 * Env vars (set in Vercel):
 *   PINTEREST_APP_ID        — Pinterest app ID (= OAuth2 client_id)
 *   PINTEREST_APP_SECRET    — Pinterest app secret
 *   PINTEREST_ACCESS_TOKEN  — Optional: static access token (bypasses OAuth for dev/testing)
 *
 * Pinterest API v5 docs: https://developers.pinterest.com/docs/api/v5/
 */

import crypto from "crypto";

// ─── Constants ──────────────────────────────────────────

const PINTEREST_API_BASE = "https://api.pinterest.com/v5";
const PINTEREST_AUTH_URL = "https://www.pinterest.com/oauth/";
const PINTEREST_TOKEN_URL = "https://api.pinterest.com/v5/oauth/token";

/** Scopes required for pin and board management */
const REQUIRED_SCOPES = [
  "pins:read",
  "pins:write",
  "boards:read",
  "boards:write",
];

/** Pinterest API rate limit: 1000 requests per minute per user token */
const RATE_LIMIT_RETRY_AFTER_MS = 60_000;

// ─── Config helpers ─────────────────────────────────────

export function getPinterestConfig() {
  return {
    appId: process.env.PINTEREST_APP_ID ?? "",
    appSecret: process.env.PINTEREST_APP_SECRET ?? "",
    accessToken: process.env.PINTEREST_ACCESS_TOKEN ?? "",
    redirectUri:
      process.env.PINTEREST_REDIRECT_URI ??
      `${process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.yalla-london.com"}/api/auth/pinterest/callback`,
  };
}

export function isPinterestConfigured(): boolean {
  const cfg = getPinterestConfig();
  // Configured if we have either: (a) app credentials for OAuth, or (b) a static access token
  return !!(cfg.appId && cfg.appSecret) || !!cfg.accessToken;
}

// ─── OAuth2 Flow ────────────────────────────────────────

/** Generate a random state token to prevent CSRF */
export function generateState(): string {
  return crypto.randomBytes(24).toString("hex");
}

/**
 * Build the Pinterest authorization URL.
 * The caller must persist `state` (e.g. in a cookie) for CSRF verification in the callback.
 */
export function buildAuthorizationUrl(state: string): string {
  const cfg = getPinterestConfig();

  const params = new URLSearchParams({
    client_id: cfg.appId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: REQUIRED_SCOPES.join(","),
    state,
  });

  return `${PINTEREST_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange the authorization code for access + refresh tokens.
 * Pinterest uses HTTP Basic auth (client_id:client_secret) for token exchange.
 */
export async function exchangeCodeForTokens(
  code: string,
): Promise<PinterestTokenResponse> {
  const cfg = getPinterestConfig();

  const basicAuth = Buffer.from(`${cfg.appId}:${cfg.appSecret}`).toString(
    "base64",
  );

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: cfg.redirectUri,
  });

  const res = await fetch(PINTEREST_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `[pinterest] Token exchange failed (${res.status}): ${text}`,
    );
  }

  return res.json() as Promise<PinterestTokenResponse>;
}

/**
 * Refresh an expired access token using the refresh token.
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<PinterestTokenResponse> {
  const cfg = getPinterestConfig();

  const basicAuth = Buffer.from(`${cfg.appId}:${cfg.appSecret}`).toString(
    "base64",
  );

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch(PINTEREST_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `[pinterest] Token refresh failed (${res.status}): ${text}`,
    );
  }

  return res.json() as Promise<PinterestTokenResponse>;
}

// ─── Token Persistence (Credential model) ───────────────

/**
 * Store OAuth tokens encrypted in the Credential table.
 * Uses a similar pattern to etsy-api.ts but without a dedicated config model —
 * tokens are stored as Credential rows keyed by name + site_id.
 */
export async function storeTokens(
  siteId: string,
  tokens: PinterestTokenResponse,
): Promise<void> {
  const { prisma } = await import("@/lib/db");
  const { encrypt } = await import("@/lib/encryption");

  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 0) * 1000);

  // Find existing credentials for this site
  const existingAccess = await prisma.credential.findFirst({
    where: { site_id: siteId, name: "Pinterest Access Token", type: "oauth_token" },
  });

  const existingRefresh = await prisma.credential.findFirst({
    where: { site_id: siteId, name: "Pinterest Refresh Token", type: "oauth_token" },
  });

  // Upsert access token
  if (existingAccess) {
    await prisma.credential.update({
      where: { id: existingAccess.id },
      data: {
        encrypted_value: encrypt(tokens.access_token),
        last_used_at: new Date(),
        status: "active",
      },
    });
  } else {
    await prisma.credential.create({
      data: {
        site_id: siteId,
        name: "Pinterest Access Token",
        type: "oauth_token",
        encrypted_value: encrypt(tokens.access_token),
        status: "active",
      },
    });
  }

  // Upsert refresh token (if provided — Pinterest may not always return one)
  if (tokens.refresh_token) {
    if (existingRefresh) {
      await prisma.credential.update({
        where: { id: existingRefresh.id },
        data: {
          encrypted_value: encrypt(tokens.refresh_token),
          last_used_at: new Date(),
          status: "active",
        },
      });
    } else {
      await prisma.credential.create({
        data: {
          site_id: siteId,
          name: "Pinterest Refresh Token",
          type: "oauth_token",
          encrypted_value: encrypt(tokens.refresh_token),
          status: "active",
        },
      });
    }
  }

  // Store token expiry and connection metadata
  const existingMeta = await prisma.credential.findFirst({
    where: { site_id: siteId, name: "Pinterest Connection Meta", type: "oauth_meta" },
  });

  const metaValue = JSON.stringify({
    connectedAt: new Date().toISOString(),
    tokenExpiresAt: expiresAt.toISOString(),
    scopes: tokens.scope ?? REQUIRED_SCOPES.join(","),
  });

  if (existingMeta) {
    await prisma.credential.update({
      where: { id: existingMeta.id },
      data: {
        encrypted_value: encrypt(metaValue),
        last_used_at: new Date(),
        status: "active",
      },
    });
  } else {
    await prisma.credential.create({
      data: {
        site_id: siteId,
        name: "Pinterest Connection Meta",
        type: "oauth_meta",
        encrypted_value: encrypt(metaValue),
        status: "active",
      },
    });
  }

  console.log(`[pinterest] Tokens stored for site "${siteId}", expires ${expiresAt.toISOString()}`);
}

/**
 * Get a valid access token for a site.
 * Priority: 1) DB-stored OAuth token (auto-refreshed), 2) env var static token
 */
export async function getAccessToken(siteId: string): Promise<string> {
  const cfg = getPinterestConfig();

  // Try DB-stored token first
  try {
    const { prisma } = await import("@/lib/db");
    const { decrypt } = await import("@/lib/encryption");

    const accessCred = await prisma.credential.findFirst({
      where: { site_id: siteId, name: "Pinterest Access Token", type: "oauth_token", status: "active" },
    });

    if (accessCred) {
      // Check if expired via meta
      const metaCred = await prisma.credential.findFirst({
        where: { site_id: siteId, name: "Pinterest Connection Meta", type: "oauth_meta" },
      });

      let isExpired = false;
      if (metaCred) {
        try {
          const meta = JSON.parse(decrypt(metaCred.encrypted_value));
          const expiresAt = new Date(meta.tokenExpiresAt);
          // 5-minute buffer
          isExpired = expiresAt.getTime() < Date.now() + 5 * 60 * 1000;
        } catch (parseErr) {
          console.warn("[pinterest] Failed to parse connection meta:", parseErr instanceof Error ? parseErr.message : parseErr);
        }
      }

      if (!isExpired) {
        return decrypt(accessCred.encrypted_value);
      }

      // Token expired — try refresh
      const refreshCred = await prisma.credential.findFirst({
        where: { site_id: siteId, name: "Pinterest Refresh Token", type: "oauth_token", status: "active" },
      });

      if (refreshCred) {
        console.log("[pinterest] Access token expired, refreshing...");
        const refreshToken = decrypt(refreshCred.encrypted_value);
        const newTokens = await refreshAccessToken(refreshToken);
        await storeTokens(siteId, newTokens);
        return newTokens.access_token;
      }

      // No refresh token — return expired access token and let the API call fail
      // (better than throwing here, as the token might still work if expiry meta was stale)
      return decrypt(accessCred.encrypted_value);
    }
  } catch (dbErr) {
    console.warn("[pinterest] DB token lookup failed, falling back to env var:", dbErr instanceof Error ? dbErr.message : dbErr);
  }

  // Fallback: static access token from env
  if (cfg.accessToken) {
    return cfg.accessToken;
  }

  throw new Error(
    `[pinterest] No access token for site "${siteId}". Connect via OAuth first or set PINTEREST_ACCESS_TOKEN.`,
  );
}

// ─── API Helpers ────────────────────────────────────────

/**
 * Make an authenticated request to the Pinterest API v5.
 * Handles rate limiting with a single retry after the specified wait time.
 */
async function pinterestFetch(
  path: string,
  accessToken: string,
  options: RequestInit = {},
  retryOnRateLimit = true,
): Promise<Response> {
  const url = `${PINTEREST_API_BASE}${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    ...(options.headers as Record<string, string> ?? {}),
  };

  // Set Content-Type for JSON bodies unless caller overrides
  if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  // Handle rate limiting (429)
  if (res.status === 429 && retryOnRateLimit) {
    const retryAfter = parseInt(res.headers.get("Retry-After") ?? "60", 10);
    const waitMs = Math.min(retryAfter * 1000, RATE_LIMIT_RETRY_AFTER_MS);
    console.warn(`[pinterest] Rate limited. Waiting ${waitMs}ms before retry...`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return pinterestFetch(path, accessToken, options, false);
  }

  return res;
}

// ─── Board Operations ───────────────────────────────────

/**
 * List boards for the authenticated user.
 */
export async function getBoards(
  siteId: string,
): Promise<PinterestBoard[]> {
  const accessToken = await getAccessToken(siteId);

  const boards: PinterestBoard[] = [];
  let bookmark: string | undefined;

  // Paginate through all boards
  do {
    const qs = bookmark ? `?bookmark=${encodeURIComponent(bookmark)}` : "";
    const res = await pinterestFetch(`/boards${qs}`, accessToken);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`[pinterest] getBoards failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as PinterestPaginatedResponse<PinterestBoard>;
    boards.push(...data.items);
    bookmark = data.bookmark ?? undefined;
  } while (bookmark);

  return boards;
}

/**
 * Create a new board.
 */
export async function createBoard(
  siteId: string,
  params: { name: string; description?: string; privacy?: "PUBLIC" | "PROTECTED" },
): Promise<PinterestBoard> {
  const accessToken = await getAccessToken(siteId);

  const body = JSON.stringify({
    name: params.name,
    description: params.description ?? "",
    privacy: params.privacy ?? "PUBLIC",
  });

  const res = await pinterestFetch("/boards", accessToken, {
    method: "POST",
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[pinterest] createBoard failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<PinterestBoard>;
}

// ─── Pin Operations ─────────────────────────────────────

/**
 * Create a pin on a board.
 */
export async function createPin(
  siteId: string,
  params: {
    boardId: string;
    title: string;
    description: string;
    link?: string;
    imageUrl: string;
    altText?: string;
  },
): Promise<PinterestPin> {
  const accessToken = await getAccessToken(siteId);

  // Pinterest v5 pin creation payload
  const payload: Record<string, unknown> = {
    board_id: params.boardId,
    title: params.title.slice(0, 100), // Pinterest title max 100 chars
    description: params.description.slice(0, 500), // Pinterest description max 500 chars
    media_source: {
      source_type: "image_url",
      url: params.imageUrl,
    },
  };

  if (params.link) {
    payload.link = params.link;
  }

  if (params.altText) {
    payload.alt_text = params.altText.slice(0, 500);
  }

  const body = JSON.stringify(payload);

  const res = await pinterestFetch("/pins", accessToken, {
    method: "POST",
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[pinterest] createPin failed (${res.status}): ${text}`);
  }

  const pin = (await res.json()) as PinterestPin;

  console.log(`[pinterest] Pin created: ${pin.id} on board ${params.boardId} for site "${siteId}"`);

  return pin;
}

// ─── Listing-to-Pin Pipeline ────────────────────────────

/**
 * Auto-create a Pinterest pin from an EtsyListingDraft.
 *
 * - Uses the listing title (truncated to 100 chars for Pinterest)
 * - First 500 chars of description
 * - Link to the Etsy listing URL
 * - First preview image from the draft's previewImages JSON
 * - Tags derived from the draft's tags array (appended to description as hashtags)
 *
 * Requires a boardId — will throw if not provided.
 */
export async function pinFromListing(
  siteId: string,
  draftId: string,
  boardId: string,
): Promise<{ pin: PinterestPin; draftTitle: string }> {
  const { prisma } = await import("@/lib/db");

  // Load the draft
  const draft = await prisma.etsyListingDraft.findUnique({
    where: { id: draftId },
  });

  if (!draft) {
    throw new Error(`[pinterest] EtsyListingDraft "${draftId}" not found`);
  }

  if (draft.siteId !== siteId) {
    throw new Error(`[pinterest] Draft "${draftId}" belongs to site "${draft.siteId}", not "${siteId}"`);
  }

  // Extract first preview image
  let imageUrl: string | null = null;
  if (draft.previewImages) {
    try {
      const images = Array.isArray(draft.previewImages)
        ? draft.previewImages
        : JSON.parse(String(draft.previewImages));
      if (Array.isArray(images) && images.length > 0) {
        imageUrl = typeof images[0] === "string" ? images[0] : images[0]?.url ?? null;
      }
    } catch (imgErr) {
      console.warn("[pinterest] Failed to parse previewImages for draft", draftId, ":", imgErr instanceof Error ? imgErr.message : imgErr);
    }
  }

  if (!imageUrl) {
    throw new Error(
      `[pinterest] Draft "${draftId}" has no preview images. A pin requires at least one image.`,
    );
  }

  // Build description: first 500 chars of listing description + hashtags from tags
  let description = (draft.description ?? "").slice(0, 450);
  if (draft.tags && draft.tags.length > 0) {
    const hashtags = draft.tags
      .slice(0, 10)
      .map((tag) => `#${tag.replace(/\s+/g, "")}`)
      .join(" ");
    // Ensure total description fits within 500 chars
    const remaining = 500 - description.length - 2; // 2 for "\n\n"
    if (remaining > 0) {
      description += "\n\n" + hashtags.slice(0, remaining);
    }
  }

  // The link goes to the Etsy listing if published, otherwise omit
  const link = draft.etsyUrl ?? undefined;

  const pin = await createPin(siteId, {
    boardId,
    title: draft.title.slice(0, 100),
    description,
    link,
    imageUrl,
    altText: `${draft.title} - available on Etsy`,
  });

  // Fire an alert about the cross-post
  try {
    const { createAlert } = await import("./alert-engine");
    await createAlert({
      siteId,
      type: "listing_status",
      severity: "success",
      title: "Pin Created on Pinterest",
      message: `"${draft.title.slice(0, 60)}" has been pinned to Pinterest.`,
      actionUrl: `https://www.pinterest.com/pin/${pin.id}/`,
    });
  } catch (alertErr) {
    console.warn("[pinterest] Failed to create cross-post alert:", alertErr instanceof Error ? alertErr.message : alertErr);
  }

  return { pin, draftTitle: draft.title };
}

// ─── Connection Test ────────────────────────────────────

/**
 * Test the Pinterest connection by fetching the authenticated user's account info.
 */
export async function testConnection(
  siteId: string,
): Promise<{ connected: boolean; username?: string; boardCount?: number; error?: string }> {
  try {
    const accessToken = await getAccessToken(siteId);

    const res = await pinterestFetch("/user_account", accessToken);

    if (!res.ok) {
      return { connected: false, error: `Pinterest API returned ${res.status}` };
    }

    const user = (await res.json()) as { username?: string; account_type?: string };

    // Count boards
    let boardCount = 0;
    try {
      const boards = await getBoards(siteId);
      boardCount = boards.length;
    } catch (boardErr) {
      console.warn("[pinterest] Failed to count boards:", boardErr instanceof Error ? boardErr.message : boardErr);
    }

    console.log(`[pinterest] Connection test passed for site "${siteId}": user=${user.username}, boards=${boardCount}`);

    return {
      connected: true,
      username: user.username,
      boardCount,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn(`[pinterest] Connection test failed for site "${siteId}":`, message);
    return { connected: false, error: message };
  }
}

/**
 * Disconnect Pinterest for a site by deactivating stored credentials.
 */
export async function disconnect(siteId: string): Promise<void> {
  const { prisma } = await import("@/lib/db");

  await prisma.credential.updateMany({
    where: {
      site_id: siteId,
      name: { in: ["Pinterest Access Token", "Pinterest Refresh Token", "Pinterest Connection Meta"] },
    },
    data: { status: "inactive" },
  });

  console.log(`[pinterest] Disconnected for site "${siteId}"`);
}

// ─── Types ──────────────────────────────────────────────

export interface PinterestTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds (usually 2592000 = 30 days)
  refresh_token: string;
  refresh_token_expires_in?: number;
  scope: string;
}

export interface PinterestBoard {
  id: string;
  name: string;
  description: string;
  privacy: "PUBLIC" | "PROTECTED" | "SECRET";
  pin_count?: number;
  follower_count?: number;
  owner?: { username?: string };
  created_at?: string;
}

export interface PinterestPin {
  id: string;
  title: string;
  description: string;
  link: string;
  board_id: string;
  media?: {
    media_type?: string;
    images?: Record<string, { url: string; width: number; height: number }>;
  };
  created_at?: string;
}

interface PinterestPaginatedResponse<T> {
  items: T[];
  bookmark: string | null;
}
