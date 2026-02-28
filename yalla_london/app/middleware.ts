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
  // Yalla Riviera (French Riviera)
  "yallariviera.com": {
    siteId: "french-riviera",
    siteName: "Yalla Riviera",
    locale: "en",
  },
  "www.yallariviera.com": {
    siteId: "french-riviera",
    siteName: "Yalla Riviera",
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
  // Zenitha Yachts (Mediterranean)
  "zenithayachts.com": {
    siteId: "zenitha-yachts-med",
    siteName: "Zenitha Yachts",
    locale: "en",
  },
  "www.zenithayachts.com": {
    siteId: "zenitha-yachts-med",
    siteName: "Zenitha Yachts",
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
    siteId: "french-riviera",
    siteName: "Yalla Riviera",
    locale: "ar",
  },
  "www.luxuryescapes.me": {
    siteId: "french-riviera",
    siteName: "Yalla Riviera",
    locale: "ar",
  },
  // Development
  "localhost:3000": {
    siteId: "yalla-london",
    siteName: "Yalla London",
    locale: "en",
  },
};

// Default site when hostname is not in DOMAIN_TO_SITE (e.g. Vercel preview URLs).
// Falls back to localhost mapping, which points to yalla-london as primary active site.
const DEFAULT_SITE = DOMAIN_TO_SITE["localhost:3000"] || {
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
  "https://zenithayachts.com",
  "https://www.zenithayachts.com",
  "https://arabaldives.com",
  "https://www.arabaldives.com",
  "https://yallariviera.com",
  "https://www.yallariviera.com",
  "https://yallaistanbul.com",
  "https://www.yallaistanbul.com",
  "https://yallathailand.com",
  "https://www.yallathailand.com",
  "http://localhost:3000",
]);

const isProduction = process.env.NODE_ENV === "production";

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // ── Arabic locale detection from URL prefix ────────────────────────
  // Detect FIRST so all subsequent checks use effectivePathname.
  // /ar and /ar/* routes serve Arabic content by rewriting to the
  // English route with an x-locale: ar header. Pages read this header
  // (via LanguageProvider initialLocale) to render Arabic content.
  const isArabicRoute = pathname.startsWith("/ar/") || pathname === "/ar";
  const locale = isArabicRoute ? "ar" : "en";
  const effectivePathname = isArabicRoute
    ? pathname.replace(/^\/ar\/?/, "/") || "/"
    : pathname;

  // Skip excluded paths — use effectivePathname so /ar/_next, /ar/api etc.
  // are correctly excluded (the /ar/ prefix is stripped before matching).
  if (EXCLUDED_PATHS.some((path) => effectivePathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Block internal-only pages from public access → redirect to admin login
  const BLOCKED_PUBLIC_PATHS = ["/brand-guidelines", "/brand-showcase"];
  if (BLOCKED_PUBLIC_PATHS.some((path) => effectivePathname.startsWith(path))) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url, 302);
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
  // Use effectivePathname so /ar/api/* requests are also protected.
  const method = request.method.toUpperCase();
  if (
    ["POST", "PUT", "DELETE", "PATCH"].includes(method) &&
    effectivePathname.startsWith("/api/")
  ) {
    const origin = request.headers.get("origin");
    // Allow cron/webhook/auth/admin-auth routes without strict Origin check
    const isInternalRoute =
      effectivePathname.startsWith("/api/cron/") ||
      effectivePathname.startsWith("/api/webhooks/") ||
      effectivePathname.startsWith("/api/internal/") ||
      effectivePathname.startsWith("/api/auth/") ||
      effectivePathname === "/api/admin/login" ||
      effectivePathname === "/api/admin/setup" ||
      effectivePathname === "/api/admin/migrate" ||
      effectivePathname === "/api/admin/session";
    // Requests with Bearer token auth (e.g. test-connections.html using
    // CRON_SECRET) are validated by route-level requireAdminOrCron /
    // withAdminAuth — no Origin check needed.
    const hasBearerAuth = (request.headers.get("authorization") || "").startsWith("Bearer ");
    if (!isInternalRoute && !hasBearerAuth) {
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

  // Create response — rewrite for Arabic routes, next for English
  const response = isArabicRoute
    ? (() => {
        const url = request.nextUrl.clone();
        url.pathname = effectivePathname;
        return NextResponse.rewrite(url);
      })()
    : NextResponse.next();

  // Add tenant context headers
  response.headers.set("x-site-id", tenant.siteId);
  response.headers.set("x-site-name", tenant.siteName);
  response.headers.set("x-site-locale", tenant.locale);
  response.headers.set("x-hostname", hostname);
  // Locale headers for i18n — read by LanguageProvider via layout
  response.headers.set("x-locale", locale);
  response.headers.set("x-direction", locale === "ar" ? "rtl" : "ltr");

  // Cloudflare CDN: Vary by site for correct multi-tenant caching
  // Without this, Cloudflare may serve Site A's cached page to Site B
  // Use effectivePathname so /ar/api and /ar/admin are correctly excluded.
  if (!effectivePathname.startsWith("/api/") && !effectivePathname.startsWith("/admin")) {
    response.headers.set("Vary", "Accept-Encoding, x-site-id");
  }

  // Home page: short edge cache for dynamic content
  // Use effectivePathname so /ar (Arabic homepage) also gets cache headers.
  if (effectivePathname === "/") {
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
