/**
 * Health Audit — Indexing System Checks
 *
 * 4 checks: IndexNow config, submission history,
 * GSC connectivity, indexing coverage.
 */

import {
  type AuditConfig,
  type CheckResult,
  makeResult,
  runCheck,
} from "@/lib/health-audit/types";

/* ------------------------------------------------------------------ */
/* 1. IndexNow configuration                                           */
/* ------------------------------------------------------------------ */
async function indexNowConfig(config: AuditConfig): Promise<CheckResult> {
  const key = process.env.INDEXNOW_KEY;

  if (!key) {
    return makeResult("fail", { keyConfigured: false, keyFileAccessible: false }, {
      error: "INDEXNOW_KEY environment variable is not set",
      action: "Add INDEXNOW_KEY to Vercel environment variables. Generate a key at https://www.indexnow.org/.",
    }) as CheckResult;
  }

  // Verify the key file is accessible at /{key}.txt
  const keyFileUrl = `${config.siteUrl}/${key}.txt`;
  let keyFileAccessible = false;
  let keyFileContent: string | null = null;
  let httpStatus: number | null = null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    if (config.signal) {
      config.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    try {
      const res = await fetch(`${keyFileUrl}?_audit=1&t=${Date.now()}`, {
        signal: controller.signal,
        headers: { "User-Agent": "ZenithaHealthAudit/1.0" },
      });
      httpStatus = res.status;

      if (res.ok) {
        keyFileContent = (await res.text()).trim();
        keyFileAccessible = keyFileContent === key;
      }
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return makeResult("warn", {
      keyConfigured: true,
      keyFileAccessible: false,
      keyFileUrl,
    }, {
      error: `Could not verify key file: ${msg}`,
      action: "Ensure the IndexNow key file is served via a rewrite in vercel.json or a route handler.",
    }) as CheckResult;
  }

  if (!keyFileAccessible) {
    return makeResult("fail", {
      keyConfigured: true,
      keyFileAccessible: false,
      keyFileUrl,
      httpStatus,
      contentMatchesKey: keyFileContent === key,
    }, {
      error: `IndexNow key file not accessible or content mismatch at ${keyFileUrl}`,
      action: "Add a Vercel rewrite or route handler to serve the IndexNow key file at /{key}.txt.",
    }) as CheckResult;
  }

  return makeResult("pass", {
    keyConfigured: true,
    keyFileAccessible: true,
    keyFileUrl,
    keyLength: key.length,
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 2. Submission history (last 7 days)                                 */
/* ------------------------------------------------------------------ */
async function submissionHistory(config: AuditConfig): Promise<CheckResult> {
  const { prisma } = await import("@/lib/db");
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);

  // Count URL indexing statuses by status
  const statusCounts = await prisma.uRLIndexingStatus.groupBy({
    by: ["status"],
    where: {
      site_id: config.siteId,
      last_submitted_at: { gte: sevenDaysAgo },
    },
    _count: { id: true },
  });

  const byStatus: Record<string, number> = {
    pending: 0,
    submitted: 0,
    indexed: 0,
    error: 0,
  };
  for (const row of statusCounts) {
    byStatus[row.status] = row._count.id;
  }

  const totalSubmissions = byStatus.submitted + byStatus.indexed + byStatus.pending;

  // Check for days with published articles but no submissions
  const recentPosts = await prisma.blogPost.findMany({
    where: {
      site_id: config.siteId,
      published: true,
      deletedAt: null,
      created_at: { gte: sevenDaysAgo },
    },
    select: { id: true, slug: true, created_at: true },
  });

  // Find posts with no matching URLIndexingStatus
  const recentSlugs = recentPosts.map((p) => p.slug);
  let unsubmittedCount = 0;

  if (recentSlugs.length > 0) {
    const trackedUrls = await prisma.uRLIndexingStatus.findMany({
      where: {
        site_id: config.siteId,
        url: {
          in: recentSlugs.map((s) => `${config.siteUrl}/blog/${s}`),
        },
      },
      select: { url: true },
    });

    const trackedSet = new Set(trackedUrls.map((u) => u.url));
    unsubmittedCount = recentSlugs.filter(
      (s) => !trackedSet.has(`${config.siteUrl}/blog/${s}`)
    ).length;
  }

  const errorCount = byStatus.error;

  let status: "pass" | "warn" | "fail";
  if (totalSubmissions === 0 && recentPosts.length > 0) {
    status = "fail";
  } else if (unsubmittedCount > 0 || errorCount > 0) {
    status = "warn";
  } else {
    status = "pass";
  }

  return makeResult(status, {
    period: "last7days",
    byStatus,
    totalSubmissions,
    recentlyPublished: recentPosts.length,
    unsubmittedArticles: unsubmittedCount,
    errorCount,
  }, {
    ...(status === "fail" && {
      error: `No IndexNow submissions in the last 7 days despite ${recentPosts.length} published article(s)`,
      action: "Check that seo-agent and seo/cron are running. Verify IndexNow submission pipeline in CronJobLog.",
    }),
    ...(status === "warn" && unsubmittedCount > 0 && {
      action: `${unsubmittedCount} recently published article(s) have no IndexNow submission. The seo-agent may need a manual run.`,
    }),
    ...(status === "warn" && errorCount > 0 && unsubmittedCount === 0 && {
      action: `${errorCount} IndexNow submission error(s) in the last 7 days. Check URLIndexingStatus.last_error for details.`,
    }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 3. Google Search Console connectivity                               */
/* ------------------------------------------------------------------ */
async function gscConnectivity(config: AuditConfig): Promise<CheckResult> {
  const hasEmail = !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const hasKey = !!process.env.GOOGLE_PRIVATE_KEY;

  if (!hasEmail && !hasKey) {
    return makeResult("skip", {
      configured: false,
      hasServiceAccountEmail: false,
      hasPrivateKey: false,
      reason: "Google Search Console credentials not configured",
    }, {
      action: "To enable GSC integration, add GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY env vars.",
    }) as CheckResult;
  }

  if (!hasEmail || !hasKey) {
    return makeResult("warn", {
      configured: false,
      hasServiceAccountEmail: hasEmail,
      hasPrivateKey: hasKey,
    }, {
      error: "Partial GSC configuration — one credential is missing",
      action: `Missing: ${!hasEmail ? "GOOGLE_SERVICE_ACCOUNT_EMAIL" : "GOOGLE_PRIVATE_KEY"}. Add it to complete GSC setup.`,
    }) as CheckResult;
  }

  // Both present — report as configured without making expensive API call
  return makeResult("pass", {
    configured: true,
    hasServiceAccountEmail: true,
    hasPrivateKey: true,
    note: "Credentials present. GSC API connectivity not tested (too expensive for health check).",
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 4. Indexing coverage                                                */
/* ------------------------------------------------------------------ */
async function indexingCoverage(config: AuditConfig): Promise<CheckResult> {
  const { prisma } = await import("@/lib/db");

  const [publishedCount, indexedCount, totalTracked] = await Promise.all([
    prisma.blogPost.count({
      where: { siteId: config.siteId, published: true, deletedAt: null },
    }),
    prisma.uRLIndexingStatus.count({
      where: { site_id: config.siteId, status: "indexed" },
    }),
    prisma.uRLIndexingStatus.count({
      where: { site_id: config.siteId },
    }),
  ]);

  if (publishedCount === 0) {
    return makeResult("skip", {
      publishedArticles: 0,
      indexedUrls: 0,
      coveragePercent: 0,
      reason: "No published articles to measure coverage against",
    }) as CheckResult;
  }

  const coveragePercent = Math.round((indexedCount / publishedCount) * 100);

  let status: "pass" | "warn" | "fail";
  if (coveragePercent > 80) {
    status = "pass";
  } else if (coveragePercent >= 50) {
    status = "warn";
  } else {
    status = "fail";
  }

  return makeResult(status, {
    publishedArticles: publishedCount,
    indexedUrls: indexedCount,
    totalTrackedUrls: totalTracked,
    coveragePercent,
  }, {
    ...(status === "warn" && {
      action: `Only ${coveragePercent}% of published articles are indexed. Run seo-agent to submit pending URLs.`,
    }),
    ...(status === "fail" && {
      error: `Indexing coverage critically low at ${coveragePercent}%`,
      action: "Most published articles are not indexed. Check IndexNow config, seo-agent schedule, and URLIndexingStatus errors.",
    }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* Exported runner                                                     */
/* ------------------------------------------------------------------ */
export async function runIndexingSystemChecks(
  config: AuditConfig
): Promise<Record<string, CheckResult>> {
  const checks: Record<string, (c: AuditConfig) => Promise<CheckResult>> = {
    indexNowConfig,
    submissionHistory,
    gscConnectivity,
    indexingCoverage,
  };

  const results: Record<string, CheckResult> = {};
  for (const [name, fn] of Object.entries(checks)) {
    results[name] = await runCheck(name, fn, config);
  }
  return results;
}
