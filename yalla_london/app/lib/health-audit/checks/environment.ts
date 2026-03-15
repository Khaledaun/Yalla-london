/**
 * Health Audit — Environment Checks
 *
 * 5 checks: required env vars, Next.js config, site configuration,
 * Prisma schema sync, deployment environment.
 */

import {
  type AuditConfig,
  type CheckResult,
  makeResult,
  runCheck,
} from "@/lib/health-audit/types";

/* ------------------------------------------------------------------ */
/* Env var definitions                                                 */
/* ------------------------------------------------------------------ */
interface EnvVarDef {
  name: string;
  critical: boolean;
}

const ENV_VARS: EnvVarDef[] = [
  { name: "DATABASE_URL", critical: true },
  { name: "NEXTAUTH_SECRET", critical: true },
  { name: "NEXTAUTH_URL", critical: true },
  { name: "XAI_API_KEY", critical: false },
  { name: "OPENAI_API_KEY", critical: false },
  { name: "ANTHROPIC_API_KEY", critical: false },
  { name: "PERPLEXITY_API_KEY", critical: false },
  { name: "INDEXNOW_KEY", critical: false },
  { name: "CRON_SECRET", critical: false },
  { name: "NEXT_PUBLIC_SITE_URL", critical: false },
];

/* ------------------------------------------------------------------ */
/* 1. Required env vars                                                */
/* ------------------------------------------------------------------ */
async function requiredEnvVarsCheck(config: AuditConfig): Promise<CheckResult> {
  const present: string[] = [];
  const missingCritical: string[] = [];
  const missingOptional: string[] = [];

  for (const v of ENV_VARS) {
    if (process.env[v.name]) {
      present.push(v.name);
    } else if (v.critical) {
      missingCritical.push(v.name);
    } else {
      missingOptional.push(v.name);
    }
  }

  const status =
    missingCritical.length > 0 ? "fail" :
    missingOptional.length > 3 ? "warn" : "pass";

  return makeResult(status, {
    total: ENV_VARS.length,
    present: present.length,
    missingCritical,
    missingOptional,
  }, {
    ...(missingCritical.length > 0 && {
      error: `Critical env vars missing: ${missingCritical.join(", ")}`,
      action: "Add missing critical environment variables in Vercel dashboard.",
    }),
    ...(missingCritical.length === 0 && missingOptional.length > 3 && {
      action: `${missingOptional.length} optional env vars not set: ${missingOptional.join(", ")}. Some features may be limited.`,
    }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 2. Next.js config signals                                           */
/* ------------------------------------------------------------------ */
async function nextConfigCheck(config: AuditConfig): Promise<CheckResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "";
  const nodeEnv = process.env.NODE_ENV || "unknown";

  const details: Record<string, unknown> = {
    nodeEnv,
    siteUrl: siteUrl ? "(set)" : "(not set)",
    nextTelemetryDisabled: !!process.env.NEXT_TELEMETRY_DISABLED,
    analyzeBundle: !!process.env.ANALYZE,
  };

  // If NEXT_PUBLIC_SITE_URL is set, report its host for image domain awareness
  if (siteUrl) {
    try {
      const host = new URL(siteUrl).hostname;
      details.configuredHost = host;
    } catch {
      details.configuredHost = "invalid URL";
    }
  }

  const status = siteUrl ? "pass" : "warn";
  return makeResult(status, details, {
    ...(status === "warn" && { action: "Set NEXT_PUBLIC_SITE_URL for canonical URL generation." }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 3. Site configuration (config/sites.ts)                             */
/* ------------------------------------------------------------------ */
async function siteConfigurationCheck(config: AuditConfig): Promise<CheckResult> {
  try {
    const { SITES } = await import("@/config/sites");

    if (!SITES || Object.keys(SITES).length === 0) {
      return makeResult("fail", { sitesCount: 0 }, {
        error: "No sites configured in config/sites.ts",
        action: "Add at least one site to the SITES object.",
      }) as CheckResult;
    }

    const siteResults: Record<string, { valid: boolean; missingFields: string[] }> = {};
    const requiredFields = ["name", "domain", "slug", "systemPromptEN"];

    for (const [id, site] of Object.entries(SITES)) {
      const s = site as unknown as Record<string, unknown>;
      const missing = requiredFields.filter(f => !s[f]);
      siteResults[id] = { valid: missing.length === 0, missingFields: missing };
    }

    const invalidCount = Object.values(siteResults).filter(s => !s.valid).length;
    const status = invalidCount === 0 ? "pass" : invalidCount < Object.keys(SITES).length ? "warn" : "fail";

    return makeResult(status, {
      sitesCount: Object.keys(SITES).length,
      sites: siteResults,
    }, {
      ...(invalidCount > 0 && { action: `${invalidCount} site(s) have missing config fields. Check config/sites.ts.` }),
    }) as CheckResult;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return makeResult("fail", {}, {
      error: `Could not import config/sites.ts: ${msg}`,
      action: "Verify config/sites.ts exists and exports SITES.",
    }) as CheckResult;
  }
}

/* ------------------------------------------------------------------ */
/* 4. Prisma schema sync                                               */
/* ------------------------------------------------------------------ */
const SCHEMA_PROBE_TABLES = [
  { name: "BlogPost", query: () => import("@/lib/db").then(({ prisma }) => prisma.blogPost.findFirst({ select: { id: true }, take: 1 })) },
  { name: "ArticleDraft", query: () => import("@/lib/db").then(({ prisma }) => prisma.articleDraft.findFirst({ select: { id: true }, take: 1 })) },
  { name: "CronJobLog", query: () => import("@/lib/db").then(({ prisma }) => prisma.cronJobLog.findFirst({ select: { id: true }, take: 1 })) },
  { name: "ApiUsageLog", query: () => import("@/lib/db").then(({ prisma }) => prisma.apiUsageLog.findFirst({ select: { id: true }, take: 1 })) },
] as const;

async function prismaSchemaSync(config: AuditConfig): Promise<CheckResult> {
  const synced: string[] = [];
  const outOfSync: string[] = [];

  for (const table of SCHEMA_PROBE_TABLES) {
    try {
      await table.query();
      synced.push(table.name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      // P2021 = table not found, P2010 = raw query failed
      if (msg.includes("P2021") || msg.includes("does not exist")) {
        outOfSync.push(table.name);
      } else {
        // Query worked (table exists) but other error — still counts as synced
        synced.push(table.name);
      }
    }
  }

  const status = outOfSync.length === 0 ? "pass" : "fail";
  return makeResult(status, { synced, outOfSync, total: SCHEMA_PROBE_TABLES.length }, {
    ...(outOfSync.length > 0 && {
      error: `Tables missing from database: ${outOfSync.join(", ")}`,
      action: "Run `npx prisma migrate deploy` to apply pending migrations.",
    }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 5. Deployment environment (info only)                               */
/* ------------------------------------------------------------------ */
async function deploymentEnvironmentCheck(config: AuditConfig): Promise<CheckResult> {
  return makeResult("pass", {
    vercel: !!process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV || null,
    vercelRegion: process.env.VERCEL_REGION || null,
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA
      ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 8)
      : null,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* Exported runner                                                     */
/* ------------------------------------------------------------------ */
export async function runEnvironmentChecks(
  config: AuditConfig
): Promise<Record<string, CheckResult>> {
  const checks: Record<string, (c: AuditConfig) => Promise<CheckResult>> = {
    requiredEnvVars: requiredEnvVarsCheck,
    nextConfig: nextConfigCheck,
    siteConfiguration: siteConfigurationCheck,
    prismaSchemaSync: prismaSchemaSync,
    deploymentEnvironment: deploymentEnvironmentCheck,
  };

  const results: Record<string, CheckResult> = {};
  for (const [name, fn] of Object.entries(checks)) {
    results[name] = await runCheck(name, fn, config);
  }
  return results;
}
