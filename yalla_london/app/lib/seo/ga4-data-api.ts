/**
 * GA4 Data API Client
 *
 * Fetches real analytics data from Google Analytics 4 using the
 * Google Analytics Data API v1beta with service account authentication.
 *
 * Required env vars:
 *   GA4_PROPERTY_ID - numeric GA4 property ID (e.g. "123456789")
 *   GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL or GSC_CLIENT_EMAIL - service account email
 *   GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY or GSC_PRIVATE_KEY - service account private key
 *
 * The service account must have "Viewer" role on the GA4 property.
 */

const GA4_API_BASE = "https://analyticsdata.googleapis.com/v1beta/properties";

interface GA4Credentials {
  clientEmail: string;
  privateKey: string;
  propertyId: string;
}

export interface GA4Metrics {
  sessions: number;
  totalUsers: number;
  newUsers: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
  engagementRate: number;
}

export interface GA4TopPage {
  path: string;
  pageViews: number;
  sessions: number;
  avgEngagementTime: number;
}

export interface GA4TopQuery {
  query: string;
  sessions: number;
}

export interface GA4Report {
  metrics: GA4Metrics;
  topPages: GA4TopPage[];
  topSources: Array<{ source: string; sessions: number }>;
  dateRange: { startDate: string; endDate: string };
  fetchedAt: string;
}

function getCredentials(): GA4Credentials | null {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientEmail =
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL ||
    process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL ||
    process.env.GSC_CLIENT_EMAIL;
  const privateKey =
    process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY ||
    process.env.GOOGLE_ANALYTICS_PRIVATE_KEY ||
    process.env.GSC_PRIVATE_KEY;

  if (!propertyId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    propertyId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, "\n"),
  };
}

async function createJWT(
  clientEmail: string,
  privateKey: string,
  scope: string,
): Promise<string> {
  const crypto = await import("crypto");
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
    "base64url",
  );
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signatureInput);
  const signature = sign.sign(privateKey, "base64url");

  return `${signatureInput}.${signature}`;
}

async function getAccessToken(
  clientEmail: string,
  privateKey: string,
): Promise<string | null> {
  try {
    const jwt = await createJWT(
      clientEmail,
      privateKey,
      "https://www.googleapis.com/auth/analytics.readonly",
    );

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[GA4] Token exchange failed: HTTP ${response.status} - ${errorText}`,
      );
      return null;
    }

    const data = await response.json();
    return data.access_token || null;
  } catch (error) {
    console.error("[GA4] Failed to get access token:", error);
    return null;
  }
}

async function runReport(
  propertyId: string,
  token: string,
  body: Record<string, unknown>,
): Promise<any> {
  const url = `${GA4_API_BASE}/${propertyId}:runReport`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GA4 API error: HTTP ${response.status} - ${errorText}`);
  }

  return response.json();
}

function extractMetricValue(
  row: any,
  metricIndex: number,
  fallback: number = 0,
): number {
  const val = row?.metricValues?.[metricIndex]?.value;
  return val ? parseFloat(val) : fallback;
}

/**
 * Fetch core site metrics from GA4 for a given date range.
 */
export async function fetchGA4Metrics(
  startDate: string = "30daysAgo",
  endDate: string = "today",
): Promise<GA4Report | null> {
  const creds = getCredentials();
  if (!creds) {
    console.warn(
      "[GA4] Missing credentials (GA4_PROPERTY_ID + service account). Skipping GA4 fetch.",
    );
    return null;
  }

  const token = await getAccessToken(creds.clientEmail, creds.privateKey);
  if (!token) {
    return null;
  }

  try {
    // 1. Fetch aggregate metrics
    const metricsReport = await runReport(creds.propertyId, token, {
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "newUsers" },
        { name: "screenPageViews" },
        { name: "bounceRate" },
        { name: "averageSessionDuration" },
        { name: "engagementRate" },
      ],
    });

    const metricsRow = metricsReport?.rows?.[0];
    const metrics: GA4Metrics = {
      sessions: extractMetricValue(metricsRow, 0),
      totalUsers: extractMetricValue(metricsRow, 1),
      newUsers: extractMetricValue(metricsRow, 2),
      pageViews: extractMetricValue(metricsRow, 3),
      bounceRate: Math.round(extractMetricValue(metricsRow, 4) * 10000) / 100, // Convert to percentage
      avgSessionDuration: Math.round(extractMetricValue(metricsRow, 5)),
      engagementRate:
        Math.round(extractMetricValue(metricsRow, 6) * 10000) / 100,
    };

    // 2. Fetch top pages
    const pagesReport = await runReport(creds.propertyId, token, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "pagePath" }],
      metrics: [
        { name: "screenPageViews" },
        { name: "sessions" },
        { name: "averageSessionDuration" },
      ],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 20,
    });

    const topPages: GA4TopPage[] = (pagesReport?.rows || []).map(
      (row: any) => ({
        path: row.dimensionValues?.[0]?.value || "/",
        pageViews: extractMetricValue(row, 0),
        sessions: extractMetricValue(row, 1),
        avgEngagementTime: Math.round(extractMetricValue(row, 2)),
      }),
    );

    // 3. Fetch top traffic sources
    const sourcesReport = await runReport(creds.propertyId, token, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "sessionSource" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 10,
    });

    const topSources = (sourcesReport?.rows || []).map((row: any) => ({
      source: row.dimensionValues?.[0]?.value || "(direct)",
      sessions: extractMetricValue(row, 0),
    }));

    return {
      metrics,
      topPages,
      topSources,
      dateRange: { startDate, endDate },
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[GA4] Failed to fetch metrics:", error);
    return null;
  }
}

/**
 * Check if GA4 credentials are properly configured.
 */
export function isGA4Configured(): boolean {
  return getCredentials() !== null;
}

/**
 * Debug GA4 configuration - returns status without exposing secrets.
 */
export function getGA4ConfigStatus(): {
  configured: boolean;
  propertyId: boolean;
  clientEmail: boolean;
  privateKey: boolean;
} {
  return {
    configured: isGA4Configured(),
    propertyId: !!process.env.GA4_PROPERTY_ID,
    clientEmail: !!(
      process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL ||
      process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL ||
      process.env.GSC_CLIENT_EMAIL
    ),
    privateKey: !!(
      process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY ||
      process.env.GOOGLE_ANALYTICS_PRIVATE_KEY ||
      process.env.GSC_PRIVATE_KEY
    ),
  };
}
