/**
 * Health Audit — Analytics Checks
 *
 * 3 checks: GA4 config validation, GA4 data connectivity,
 * GA4 tracking tag presence on public pages.
 */

import {
  type AuditConfig,
  type CheckResult,
  makeResult,
  runCheck,
} from "@/lib/health-audit/types";

const GA4_ID_PATTERN = /^G-[A-Z0-9]{6,12}$/;

/* ------------------------------------------------------------------ */
/* 1. GA4 config — env var validation                                  */
/* ------------------------------------------------------------------ */
async function ga4Config(config: AuditConfig): Promise<CheckResult> {
  const measurementId =
    process.env.GA4_MEASUREMENT_ID ||
    process.env.GA_MEASUREMENT_ID ||
    "";

  const apiSecret =
    process.env.GA4_API_SECRET ||
    process.env.GA_API_SECRET ||
    "";

  const idPresent = measurementId.length > 0;
  const idValid = GA4_ID_PATTERN.test(measurementId);
  const secretPresent = apiSecret.length > 0;

  const status =
    !idPresent || !idValid ? "fail" :
    !secretPresent ? "warn" :
    "pass";

  return makeResult(status, {
    measurementIdPresent: idPresent,
    measurementIdValid: idValid,
    measurementIdPreview: idPresent ? measurementId.slice(0, 4) + "..." : null,
    apiSecretPresent: secretPresent,
  }, {
    ...(!idPresent && {
      error: "GA4_MEASUREMENT_ID env var is missing",
      action: "Add GA4_MEASUREMENT_ID (format: G-XXXXXXXXXX) to Vercel environment variables.",
    }),
    ...(idPresent && !idValid && {
      error: `GA4_MEASUREMENT_ID format invalid: expected G-XXXXXXXXXX, got "${measurementId.slice(0, 6)}..."`,
      action: "Fix GA4_MEASUREMENT_ID to match G-XXXXXXXXXX pattern in Vercel env vars.",
    }),
    ...(idValid && !secretPresent && {
      action: "GA4_API_SECRET not set. Measurement Protocol events (server-side) will not work. Add it from GA4 Admin > Data Streams > Measurement Protocol.",
    }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 2. GA4 data connectivity — property ID check                        */
/* ------------------------------------------------------------------ */
async function ga4DataConnectivity(config: AuditConfig): Promise<CheckResult> {
  const propertyId =
    process.env.GA4_PROPERTY_ID ||
    "";

  if (!propertyId) {
    return makeResult("skip", {
      propertyIdConfigured: false,
    }, {
      action: "GA4_PROPERTY_ID not set. Dashboard traffic metrics will return zeros. Add the numeric property ID from GA4 Admin > Property Settings.",
    }) as CheckResult;
  }

  const isNumeric = /^\d{6,12}$/.test(propertyId);

  return makeResult(isNumeric ? "pass" : "warn", {
    propertyIdConfigured: true,
    propertyIdPreview: propertyId.slice(0, 4) + "...",
    formatValid: isNumeric,
  }, {
    ...(!isNumeric && {
      action: `GA4_PROPERTY_ID should be a numeric ID (e.g., 123456789), got "${propertyId.slice(0, 6)}...". Check GA4 Admin > Property Settings.`,
    }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 3. GA4 tracking tag — verify gtag.js on public pages                */
/* ------------------------------------------------------------------ */
async function ga4TrackingTag(config: AuditConfig): Promise<CheckResult> {
  const measurementId =
    process.env.GA4_MEASUREMENT_ID ||
    process.env.GA_MEASUREMENT_ID ||
    "";

  const urls = [
    config.siteUrl, // homepage
  ];

  // Try to find a published article for the second URL
  try {
    const { prisma } = await import("@/lib/db");
    const article = await prisma.blogPost.findFirst({
      where: { siteId: config.siteId, published: true, deletedAt: null },
      select: { slug: true },
      orderBy: { created_at: "desc" },
    });
    if (article?.slug) {
      urls.push(`${config.siteUrl}/blog/${article.slug}`);
    }
  } catch {
    // If DB lookup fails, just check homepage
  }

  const results: { url: string; found: boolean; method: string | null }[] = [];
  let foundCount = 0;

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        signal: config.signal,
        headers: { "User-Agent": "Zenitha-HealthAudit/1.0" },
        redirect: "follow",
      });

      if (!res.ok) {
        results.push({ url, found: false, method: null });
        continue;
      }

      const html = await res.text();

      // Check for gtag.js script or inline GA measurement ID
      const hasGtag = html.includes("gtag.js") || html.includes("googletagmanager.com/gtag");
      const hasMeasurementId = measurementId ? html.includes(measurementId) : false;
      const hasGaScript = html.includes("google-analytics.com") || html.includes("analytics.js");

      const found = hasGtag || hasMeasurementId || hasGaScript;
      const method = hasGtag ? "gtag.js" : hasMeasurementId ? "measurement-id" : hasGaScript ? "analytics.js" : null;

      results.push({ url, found, method });
      if (found) foundCount++;
    } catch (err) {
      results.push({
        url,
        found: false,
        method: null,
      });
    }
  }

  const totalChecked = results.length;

  const status =
    totalChecked === 0 ? "skip" :
    foundCount === totalChecked ? "pass" :
    foundCount > 0 ? "warn" :
    "fail";

  return makeResult(status, {
    pagesChecked: totalChecked,
    pagesWithTag: foundCount,
    results,
  }, {
    ...(status === "fail" && {
      error: "GA4 tracking tag not found on any checked page",
      action: "Add gtag.js snippet to root layout or verify Google Tag Manager is installed. Check app/layout.tsx for GA script.",
    }),
    ...(status === "warn" && {
      action: `GA4 tag found on ${foundCount}/${totalChecked} pages. Some pages may be missing the tracking script.`,
    }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* Exported runner                                                     */
/* ------------------------------------------------------------------ */
export async function runAnalyticsChecks(
  config: AuditConfig
): Promise<Record<string, CheckResult>> {
  const checks: Record<string, (c: AuditConfig) => Promise<CheckResult>> = {
    ga4Config: ga4Config,
    ga4DataConnectivity: ga4DataConnectivity,
    ga4TrackingTag: ga4TrackingTag,
  };

  const results: Record<string, CheckResult> = {};
  for (const [name, fn] of Object.entries(checks)) {
    results[name] = await runCheck(name, fn, config);
  }
  return results;
}
