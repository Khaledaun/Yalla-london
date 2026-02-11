/**
 * Multi-Tenant Middleware
 *
 * Resolves the current tenant (site) based on the hostname and adds
 * tenant context to the request headers for use in API routes and pages.
 *
 * SECURITY:
 * - Cookies set with httpOnly, secure (in production), and sameSite flags
 * - Visitor/session IDs generated with crypto.randomUUID() (not Math.random)
 * - CSRF protection via Origin header validation on mutating requests
 */

import { NextRequest, NextResponse } from "next/server";

// Static domain to site mapping
const DOMAIN_TO_SITE: Record<
  string,
  { siteId: string; siteName: string; locale: string }
> = {
  // Yalla London (UK)
  "yalla-london.com": {
    siteId: "yalla-london",
    siteName: "Yalla London",
    locale: "en",
  },
  "www.yalla-london.com": {
    siteId: "yalla-london",
    siteName: "Yalla London",
    locale: "en",
  },
  // Arabaldives (Maldives)
  "arabaldives.com": {
    siteId: "arabaldives",
    siteName: "Arabaldives",
    locale: "ar",
  },
  "www.arabaldives.com": {
    siteId: "arabaldives",
    siteName: "Arabaldives",
    locale: "ar",
  },
  // Yalla Dubai (UAE)
  "yalladubai.com": { siteId: "dubai", siteName: "Yalla Dubai", locale: "en" },
  "www.yalladubai.com": {
    siteId: "dubai",
    siteName: "Yalla Dubai",
    locale: "en",
  },
  // Yalla Istanbul (Turkey)
  "yallaistanbul.com": {
    siteId: "istanbul",
    siteName: "Yalla Istanbul",
    locale: "en",
  },
  "www.yallaistanbul.com": {
    siteId: "istanbul",
    siteName: "Yalla Istanbul",
    locale: "en",
  },
  // Yalla Thailand
  "yallathailand.com": {
    siteId: "thailand",
    siteName: "Yalla Thailand",
    locale: "en",
  },
  "www.yallathailand.com": {
    siteId: "thailand",
    siteName: "Yalla Thailand",
    locale: "en",
  },
  // Legacy/deprecated domains (redirect to main brands)
  "gulfmaldives.com": {
    siteId: "arabaldives",
    siteName: "Arabaldives",
    locale: "en",
  },
  "www.gulfmaldives.com": {
    siteId: "arabaldives",
    siteName: "Arabaldives",
    locale: "en",
  },
  "arabbali.com": {
    siteId: "thailand",
    siteName: "Yalla Thailand",
    locale: "ar",
  },
  "www.arabbali.com": {
    siteId: "thailand",
    siteName: "Yalla Thailand",
    locale: "ar",
  },
  "luxuryescapes.me": {
    siteId: "dubai",
    siteName: "Yalla Dubai",
    locale: "ar",
  },
  "www.luxuryescapes.me": {
    siteId: "dubai",
    siteName: "Yalla Dubai",
    locale: "ar",
  },
  // Development
  "localhost:3000": {
    siteId: "yalla-london",
    siteName: "Yalla London",
    locale: "en",
  },
};

const DEFAULT_SITE = {
  siteId: "yalla-london",
  siteName: "Yalla London",
  locale: "en",
};

const EXCLUDED_PATHS = [
  "/api/health",
  "/api/webhooks",
  "/_next",
  "/favicon.ico",
  "/favicon.png",
  "/favicon.svg",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.json",
  "/og-image.jpg",
  "/icons/",
  "/images/",
  "/branding/",
  "/screenshots/",
];

// SECURITY: Allowed origins for CSRF protection
const ALLOWED_ORIGINS = new Set([
  "https://yallalondon.com",
  "https://www.yallalondon.com",
  "https://yalla-london.com",
  "https://www.yalla-london.com",
  "https://arabaldives.com",
  "https://www.arabaldives.com",
  "https://yalladubai.com",
  "https://www.yalladubai.com",
  "https://yallaistanbul.com",
  "https://www.yallaistanbul.com",
  "https://yallathailand.com",
  "https://www.yallathailand.com",
  // Legacy domains
  "https://gulfmaldives.com",
  "https://arabbali.com",
  "https://luxuryescapes.me",
  "http://localhost:3000",
]);

const isProduction = process.env.NODE_ENV === "production";

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Skip excluded paths
  if (EXCLUDED_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Get hostname from request (used for redirect + tenant resolution)
  const hostname = request.headers.get("host") || "localhost:3000";

  // SEO: Redirect non-www to www for production domains (consolidate ranking power)
  if (isProduction && !hostname.startsWith("www.") && !hostname.includes("localhost")) {
    const wwwHost = `www.${hostname}`;
    if (DOMAIN_TO_SITE[wwwHost]) {
      const url = request.nextUrl.clone();
      url.host = wwwHost;
      return NextResponse.redirect(url, 301);
    }
  }

  // SECURITY: CSRF protection for mutating requests
  const method = request.method.toUpperCase();
  if (
    ["POST", "PUT", "DELETE", "PATCH"].includes(method) &&
    pathname.startsWith("/api/")
  ) {
    const origin = request.headers.get("origin");
    // Allow cron/webhook routes without Origin (server-to-server calls)
    const isInternalRoute =
      pathname.startsWith("/api/cron/") ||
      pathname.startsWith("/api/webhooks/") ||
      pathname.startsWith("/api/internal/");
    if (!isInternalRoute) {
      if (!origin || !ALLOWED_ORIGINS.has(origin)) {
        return NextResponse.json(
          { error: "Forbidden: Invalid origin" },
          { status: 403 },
        );
      }
    }
  }

  // Resolve tenant from hostname
  const tenant = DOMAIN_TO_SITE[hostname] || DEFAULT_SITE;

  // Create response with tenant headers
  const response = NextResponse.next();

  // Add tenant context headers
  response.headers.set("x-site-id", tenant.siteId);
  response.headers.set("x-site-name", tenant.siteName);
  response.headers.set("x-site-locale", tenant.locale);
  response.headers.set("x-hostname", hostname);

  // Cloudflare CDN: Vary by site for correct multi-tenant caching
  // Without this, Cloudflare may serve Site A's cached page to Site B
  if (!pathname.startsWith("/api/") && !pathname.startsWith("/admin")) {
    response.headers.set("Vary", "Accept-Encoding, x-site-id");
  }

  // Home page: short edge cache for dynamic content
  if (pathname === "/") {
    response.headers.set(
      "Cache-Control",
      "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
    );
    response.headers.set("CDN-Cache-Control", "max-age=300");
  }

  // Preserve UTM parameters in a cookie for attribution
  const utmParams = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
  ];
  const utmData: Record<string, string> = {};

  utmParams.forEach((param) => {
    const value = searchParams.get(param);
    if (value) {
      // SECURITY: Only allow alphanumeric, hyphens, underscores in UTM values
      utmData[param] = value.replace(/[^a-zA-Z0-9_-]/g, "");
    }
  });

  if (Object.keys(utmData).length > 0) {
    response.cookies.set("utm_data", JSON.stringify(utmData), {
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: isProduction,
    });
  }

  // SECURITY: Generate cryptographically secure visitor/session IDs
  const visitorId = request.cookies.get("visitor_id")?.value;
  if (!visitorId) {
    response.cookies.set("visitor_id", crypto.randomUUID(), {
      maxAge: 365 * 24 * 60 * 60,
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: isProduction,
    });
  }

  const sessionId = request.cookies.get("session_id")?.value;
  if (!sessionId) {
    response.cookies.set("session_id", crypto.randomUUID(), {
      maxAge: 30 * 60,
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: isProduction,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|favicon\\.png|favicon\\.svg|og-image\\.jpg|icons/|images/|branding/|screenshots/|public/).*)",
  ],
};
