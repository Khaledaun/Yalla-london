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
import { BLOG_REDIRECTS } from "@/lib/seo/redirect-map";

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
  // Zenitha.Luxury (Parent Brand)
  "zenitha.luxury": {
    siteId: "zenitha-luxury",
    siteName: "Zenitha.Luxury",
    locale: "en",
  },
  "www.zenitha.luxury": {
    siteId: "zenitha-luxury",
    siteName: "Zenitha.Luxury",
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

// In-memory rate limit store (resets on cold start — acceptable for serverless)
const rateLimitStore: Record<string, { count: number; resetTime: number }> = {};
let rateLimitCheckCount = 0;

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
    // SEO-critical paths (/sitemap.xml, /robots.txt) need tenant context
    // headers so they generate correct per-site content. All other excluded
    // paths (static assets, _next, etc.) pass through without headers.
    const SEO_PATHS = ["/sitemap.xml", "/robots.txt"];
    if (SEO_PATHS.includes(effectivePathname)) {
      const hostname = request.headers.get("host") || "localhost:3000";
      const tenant = DOMAIN_TO_SITE[hostname] || DEFAULT_SITE;
      const response = NextResponse.next();
      response.headers.set("x-site-id", tenant.siteId);
      response.headers.set("x-hostname", hostname);
      return response;
    }
    return NextResponse.next();
  }

  // ── Legacy path redirects (301) ──────────────────────────────────
  const LEGACY_REDIRECTS: Record<string, string> = {
    "/privacy-policy": "/privacy",
  };
  const legacyTarget = LEGACY_REDIRECTS[effectivePathname];
  if (legacyTarget) {
    const url = request.nextUrl.clone();
    url.pathname = isArabicRoute ? `/ar${legacyTarget}` : legacyTarget;
    return NextResponse.redirect(url, 301);
  }

  // ── ?lang=ar → /ar/ 301 redirect ─────────────────────────────────
  // Legacy ?lang=ar query parameters should 301 to /ar/ prefix.
  // These URLs were indexed by Google and must permanently redirect.
  if (searchParams.get("lang") === "ar") {
    const url = request.nextUrl.clone();
    url.pathname = `/ar${pathname === "/" ? "" : pathname}`;
    url.searchParams.delete("lang");
    return NextResponse.redirect(url, 301);
  }

  // ── Blog duplicate 301 redirects ────────────────────────────────
  // Consolidate duplicate article clusters (hash-suffix variants, date variants)
  // to their canonical URL, preserving link equity.
  const blogRedirect = BLOG_REDIRECTS[effectivePathname];
  if (blogRedirect) {
    const url = request.nextUrl.clone();
    url.pathname = isArabicRoute ? `/ar${blogRedirect}` : blogRedirect;
    return NextResponse.redirect(url, 301);
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

  // HTTP method — used by both rate limiting and CSRF protection below.
  const method = request.method.toUpperCase();

  // ── Rate limiting for public API endpoints ─────────────────────────
  // In-memory per-IP rate limiting. Resets on cold start (fine for serverless).
  // Only applies to non-admin, non-cron API paths.
  if (effectivePathname.startsWith("/api/") &&
      !effectivePathname.startsWith("/api/admin/") &&
      !effectivePathname.startsWith("/api/cron/") &&
      !effectivePathname.startsWith("/api/webhooks/") &&
      !effectivePathname.startsWith("/api/internal/")) {
    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    // Determine rate limit tier based on path and method
    const isMutation = ["POST", "PUT", "DELETE", "PATCH"].includes(method);
    const isHeavy = effectivePathname.includes("/recommend") ||
                    effectivePathname.includes("/generate") ||
                    effectivePathname.includes("/auto-generate") ||
                    effectivePathname.includes("/optimize");
    const isAuth = effectivePathname === "/api/admin/login" ||
                   effectivePathname === "/api/admin/setup" ||
                   effectivePathname === "/api/signup";

    let windowMs: number;
    let maxRequests: number;

    if (isAuth) {
      windowMs = 15 * 60 * 1000; maxRequests = 5;    // 5 per 15min (login)
    } else if (isHeavy) {
      windowMs = 60 * 1000; maxRequests = 3;          // 3 per minute (AI-heavy)
    } else if (isMutation) {
      windowMs = 60 * 1000; maxRequests = 20;         // 20 per minute (writes)
    } else {
      windowMs = 60 * 1000; maxRequests = 60;         // 60 per minute (reads)
    }

    const rateKey = `rl:${ip}:${isAuth ? "auth" : isHeavy ? "heavy" : isMutation ? "mut" : "read"}`;
    const now = Date.now();
    let entry = rateLimitStore[rateKey];

    if (!entry || entry.resetTime < now) {
      entry = rateLimitStore[rateKey] = { count: 0, resetTime: now + windowMs };
    }
    entry.count++;

    // Cleanup every 200 requests to prevent memory leak
    rateLimitCheckCount++;
    if (rateLimitCheckCount % 200 === 0) {
      for (const key of Object.keys(rateLimitStore)) {
        if (rateLimitStore[key].resetTime < now) delete rateLimitStore[key];
      }
    }

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return NextResponse.json(
        { error: "Too many requests", retryAfter },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
            "X-RateLimit-Limit": maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
  }

  // SECURITY: CSRF protection for mutating requests
  // Use effectivePathname so /ar/api/* requests are also protected.
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
  // Pathname header — used by root layout to detect admin routes and skip public chrome
  response.headers.set("x-pathname", effectivePathname);

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
