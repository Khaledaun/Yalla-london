/**
 * Health Audit — Security & Performance Checks
 *
 * 4 checks: adminAuth, securityHeaders, httpsAndSsl, responseTime.
 */

import {
  type AuditConfig,
  type CheckResult,
  makeResult,
  runCheck,
} from "@/lib/health-audit/types";

/* ------------------------------------------------------------------ */
/* 1. Admin auth environment variables                                 */
/* ------------------------------------------------------------------ */
async function adminAuth(config: AuditConfig): Promise<CheckResult> {
  const adminPw = process.env.ADMIN_PASSWORD ?? "";
  const nextSecret = process.env.NEXTAUTH_SECRET ?? "";
  const cronSecret = process.env.CRON_SECRET ?? "";

  const issues: string[] = [];
  const details: Record<string, unknown> = {
    adminPasswordSet: adminPw.length > 0,
    adminPasswordStrong: adminPw.length >= 12,
    nextAuthSecretSet: nextSecret.length > 0,
    nextAuthSecretStrong: nextSecret.length >= 12,
    cronSecretSet: cronSecret.length > 0,
  };

  if (!adminPw) issues.push("ADMIN_PASSWORD is not set");
  else if (adminPw.length < 12) issues.push("ADMIN_PASSWORD is shorter than 12 characters");

  if (!nextSecret) issues.push("NEXTAUTH_SECRET is not set");
  else if (nextSecret.length < 12) issues.push("NEXTAUTH_SECRET is shorter than 12 characters");

  if (!cronSecret) issues.push("CRON_SECRET is not set");

  details.issues = issues;

  if (!adminPw || !nextSecret) {
    return makeResult("fail", details, {
      error: "Critical auth env vars missing",
      action: "Set ADMIN_PASSWORD and NEXTAUTH_SECRET in Vercel env vars immediately.",
    }) as CheckResult;
  }

  if (issues.length > 0) {
    return makeResult("warn", details, {
      action: issues.join(". ") + ".",
    }) as CheckResult;
  }

  return makeResult("pass", details) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 2. Security headers                                                 */
/* ------------------------------------------------------------------ */
async function securityHeaders(config: AuditConfig): Promise<CheckResult> {
  const requiredHeaders = [
    "x-frame-options",
    "x-content-type-options",
    "strict-transport-security",
    "content-security-policy",
    "referrer-policy",
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(config.siteUrl, {
      method: "GET",
      signal: config.signal ?? controller.signal,
      redirect: "follow",
    });

    const present: string[] = [];
    const missing: string[] = [];

    for (const h of requiredHeaders) {
      if (res.headers.has(h)) {
        present.push(h);
      } else {
        missing.push(h);
      }
    }

    const details: Record<string, unknown> = {
      checked: requiredHeaders.length,
      present,
      missing,
      responseStatus: res.status,
    };

    if (missing.length === 0) {
      return makeResult("pass", details) as CheckResult;
    }

    if (present.length === 0) {
      return makeResult("fail", details, {
        error: "No security headers found on homepage",
        action: "Configure security headers in next.config.js or middleware.",
      }) as CheckResult;
    }

    return makeResult("warn", details, {
      action: `Missing security headers: ${missing.join(", ")}. Add them in next.config.js.`,
    }) as CheckResult;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return makeResult("fail", { checked: requiredHeaders.length }, {
      error: `Failed to fetch homepage: ${msg}`,
      action: "Ensure the site is reachable to verify security headers.",
    }) as CheckResult;
  } finally {
    clearTimeout(timeout);
  }
}

/* ------------------------------------------------------------------ */
/* 3. HTTPS and SSL                                                    */
/* ------------------------------------------------------------------ */
async function httpsAndSsl(config: AuditConfig): Promise<CheckResult> {
  const isHttps = config.siteUrl.startsWith("https://");

  if (!isHttps) {
    return makeResult("fail", { protocol: "http", hstsPresent: false }, {
      error: "Site URL is not using HTTPS",
      action: "Configure HTTPS on your domain. All production sites must use HTTPS.",
    }) as CheckResult;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(config.siteUrl, {
      method: "HEAD",
      signal: config.signal ?? controller.signal,
      redirect: "follow",
    });

    const hsts = res.headers.get("strict-transport-security");
    const details: Record<string, unknown> = {
      protocol: "https",
      hstsPresent: !!hsts,
      hstsValue: hsts ?? null,
    };

    if (hsts) {
      return makeResult("pass", details) as CheckResult;
    }

    return makeResult("warn", details, {
      action: "HTTPS is active but Strict-Transport-Security header is missing. Add HSTS in next.config.js.",
    }) as CheckResult;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return makeResult("warn", { protocol: "https", hstsPresent: false }, {
      error: `Could not verify HSTS: ${msg}`,
      action: "Site uses HTTPS but HSTS header check failed. Verify manually.",
    }) as CheckResult;
  } finally {
    clearTimeout(timeout);
  }
}

/* ------------------------------------------------------------------ */
/* 4. Response time (TTFB)                                             */
/* ------------------------------------------------------------------ */
async function responseTime(config: AuditConfig): Promise<CheckResult> {
  const { prisma } = await import("@/lib/db");

  const endpoints: { label: string; url: string }[] = [
    { label: "homepage", url: config.siteUrl },
    { label: "blog", url: `${config.siteUrl}/blog` },
  ];

  // Find a random published article to test
  try {
    const randomPost = await prisma.blogPost.findFirst({
      where: { published: true, siteId: config.siteId, deletedAt: null },
      select: { slug: true },
      orderBy: { created_at: "desc" },
      skip: Math.floor(Math.random() * 5),
    });
    if (randomPost?.slug) {
      endpoints.push({
        label: "article",
        url: `${config.siteUrl}/blog/${randomPost.slug}`,
      });
    }
  } catch {
    // If DB fails, continue with homepage + blog only
  }

  const timings: { label: string; ttfbMs: number; status: number }[] = [];

  for (const ep of endpoints) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const t0 = Date.now();
      const res = await fetch(ep.url, {
        method: "GET",
        signal: config.signal ?? controller.signal,
        redirect: "follow",
      });
      const ttfbMs = Date.now() - t0;
      timings.push({ label: ep.label, ttfbMs, status: res.status });
    } catch {
      timings.push({ label: ep.label, ttfbMs: 99999, status: 0 });
    } finally {
      clearTimeout(timeout);
    }
  }

  const avgTtfb = timings.length > 0
    ? Math.round(timings.reduce((s, t) => s + t.ttfbMs, 0) / timings.length)
    : 99999;
  const maxTtfb = Math.max(...timings.map((t) => t.ttfbMs));

  const details: Record<string, unknown> = {
    timings,
    avgTtfbMs: avgTtfb,
    maxTtfbMs: maxTtfb,
    endpointCount: timings.length,
  };

  if (maxTtfb > 2000) {
    return makeResult("fail", details, {
      error: `Slowest response: ${maxTtfb}ms (avg: ${avgTtfb}ms)`,
      action: "Response time exceeds 2s. Check Vercel function regions, DB latency, and heavy API calls.",
    }) as CheckResult;
  }

  if (maxTtfb > 800) {
    return makeResult("warn", details, {
      action: `Slowest response: ${maxTtfb}ms. Consider caching, ISR, or optimizing DB queries.`,
    }) as CheckResult;
  }

  return makeResult("pass", details) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* Export runner                                                        */
/* ------------------------------------------------------------------ */
export async function runSecurityChecks(
  config: AuditConfig
): Promise<Record<string, CheckResult>> {
  const [auth, headers, https, timing] = await Promise.all([
    runCheck("adminAuth", adminAuth, config),
    runCheck("securityHeaders", securityHeaders, config, 12000),
    runCheck("httpsAndSsl", httpsAndSsl, config, 12000),
    runCheck("responseTime", responseTime, config, 30000),
  ]);

  return {
    adminAuth: auth,
    securityHeaders: headers,
    httpsAndSsl: https,
    responseTime: timing,
  };
}
