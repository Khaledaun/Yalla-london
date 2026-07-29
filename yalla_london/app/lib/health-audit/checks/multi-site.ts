/**
 * Health Audit — Multi-Site Checks
 *
 * 2 checks: allSitesReachability, crossSiteConfig.
 */

import {
  type AuditConfig,
  type CheckResult,
  makeResult,
  runCheck,
} from "@/lib/health-audit/types";
import { SITES, getActiveSiteIds, getSiteDomain } from "@/config/sites";

/* ------------------------------------------------------------------ */
/* 1. All sites reachability                                           */
/* ------------------------------------------------------------------ */
async function allSitesReachability(
  config: AuditConfig
): Promise<CheckResult> {
  const activeSiteIds = getActiveSiteIds();

  if (activeSiteIds.length === 0) {
    return makeResult("skip", { reason: "No active sites configured" }) as CheckResult;
  }

  const results: {
    siteId: string;
    domain: string;
    status: number;
    reachable: boolean;
    responseMs: number;
  }[] = [];

  for (const siteId of activeSiteIds) {
    const domain = getSiteDomain(siteId);
    const url = `https://${domain}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const t0 = Date.now();
      const res = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
      });
      const responseMs = Date.now() - t0;

      results.push({
        siteId,
        domain,
        status: res.status,
        reachable: res.ok,
        responseMs,
      });
    } catch {
      results.push({
        siteId,
        domain,
        status: 0,
        reachable: false,
        responseMs: 5000,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  const unreachable = results.filter((r) => !r.reachable);
  const slow = results.filter((r) => r.reachable && r.responseMs > 3000);

  const details: Record<string, unknown> = {
    totalSites: activeSiteIds.length,
    reachable: results.filter((r) => r.reachable).length,
    unreachable: unreachable.length,
    slow: slow.length,
    perSite: results,
  };

  if (unreachable.length > 0) {
    return makeResult("fail", details, {
      error: `${unreachable.length} site(s) unreachable: ${unreachable.map((u) => u.domain).join(", ")}`,
      action: "Check DNS, Vercel deployment, and domain configuration for unreachable sites.",
    }) as CheckResult;
  }

  if (slow.length > 0) {
    return makeResult("warn", details, {
      action: `${slow.length} site(s) responded slowly (>3s): ${slow.map((s) => s.domain).join(", ")}. Check Vercel function region.`,
    }) as CheckResult;
  }

  return makeResult("pass", details) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 2. Cross-site configuration completeness                            */
/* ------------------------------------------------------------------ */
async function crossSiteConfig(
  config: AuditConfig
): Promise<CheckResult> {
  const activeSiteIds = getActiveSiteIds();

  if (activeSiteIds.length === 0) {
    return makeResult("skip", { reason: "No active sites configured" }) as CheckResult;
  }

  const requiredFields = ["name", "domain", "slug", "systemPromptEN"] as const;

  const perSite: {
    siteId: string;
    missingConfig: string[];
    missingEnvVars: string[];
    healthy: boolean;
  }[] = [];

  let totalMissingConfig = 0;
  let totalMissingEnv = 0;

  for (const siteId of activeSiteIds) {
    const siteConfig = Object.prototype.hasOwnProperty.call(SITES, siteId) ? SITES[siteId as keyof typeof SITES] : undefined;
    const missingConfig: string[] = [];
    const missingEnvVars: string[] = [];

    if (!siteConfig) {
      perSite.push({
        siteId,
        missingConfig: ["entire config object"],
        missingEnvVars: [],
        healthy: false,
      });
      totalMissingConfig++;
      continue;
    }

    for (const field of requiredFields) {
      const value = (siteConfig as unknown as Record<string, unknown>)[field];
      if (!value || (typeof value === "string" && value.trim().length === 0)) {
        missingConfig.push(field);
      }
    }

    // Check site-specific GA4 env var
    const siteIdUpper = siteId.replace(/-/g, "_").toUpperCase();
    const ga4Key = `GA4_MEASUREMENT_ID_${siteIdUpper}`;
    const envVars: Record<string, string | undefined> = process.env;
    if (!envVars[ga4Key]) {
      missingEnvVars.push(ga4Key);
    }

    totalMissingConfig += missingConfig.length;
    totalMissingEnv += missingEnvVars.length;

    perSite.push({
      siteId,
      missingConfig,
      missingEnvVars,
      healthy: missingConfig.length === 0 && missingEnvVars.length === 0,
    });
  }

  const details: Record<string, unknown> = {
    totalSites: activeSiteIds.length,
    fullyConfigured: perSite.filter((s) => s.healthy).length,
    totalMissingConfig,
    totalMissingEnvVars: totalMissingEnv,
    perSite,
  };

  if (totalMissingConfig > 0) {
    const broken = perSite.filter((s) => s.missingConfig.length > 0);
    return makeResult("fail", details, {
      error: `${broken.length} site(s) have missing required config fields`,
      action: `Fix config in config/sites.ts: ${broken.map((s) => `${s.siteId} (missing: ${s.missingConfig.join(", ")})`).join("; ")}`,
    }) as CheckResult;
  }

  if (totalMissingEnv > 0) {
    return makeResult("warn", details, {
      action: `${totalMissingEnv} site-specific env var(s) not set. Add GA4 measurement IDs in Vercel for full analytics.`,
    }) as CheckResult;
  }

  return makeResult("pass", details) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* Export runner                                                        */
/* ------------------------------------------------------------------ */
export async function runMultiSiteChecks(
  config: AuditConfig
): Promise<Record<string, CheckResult>> {
  const [reachability, configCheck] = await Promise.all([
    runCheck("allSitesReachability", allSitesReachability, config, 30000),
    runCheck("crossSiteConfig", crossSiteConfig, config),
  ]);

  return {
    allSitesReachability: reachability,
    crossSiteConfig: configCheck,
  };
}
