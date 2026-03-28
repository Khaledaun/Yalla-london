/**
 * CEO Inbox — Automated Incident Response System
 *
 * When any cron job fails (after retries), this module:
 * 1. Creates an inbox alert with plain-English diagnosis + fix instructions
 * 2. Attempts auto-fix immediately
 * 3. Schedules a retest 2 minutes later (via separate serverless invocation)
 * 4. Updates the alert with success/failure result
 * 5. Sends email notification to admin
 *
 * Storage: CronJobLog with job_name="ceo-inbox" (no new Prisma models needed).
 * UI: Cockpit Mission Control tab shows inbox alerts at top.
 */

import { interpretError, type InterpretedError } from "@/lib/error-interpreter";
import { ESCALATION_POLICY } from "@/lib/content-pipeline/constants";

// ─── Fix Strategy Mapping ──────────────────────────────────────────────────

interface FixStrategy {
  /** Cron path to call for auto-fix */
  path: string;
  /** Human-readable label */
  label: string;
  /** Optional pre-step (run before main fix) */
  prePath?: string;
  /** Plain-English instructions for the CEO if auto-fix fails */
  manualInstructions: string;
}

const JOB_FIX_MAP: Record<string, FixStrategy> = {
  "content-builder-create": {
    path: "/api/cron/sweeper",
    label: "Clear stuck drafts",
    manualInstructions: "Go to Cockpit → Pipeline tab → tap 'Run Sweeper' to clear stuck drafts blocking creation.",
  },
  "content-builder": {
    path: "/api/cron/diagnostic-sweep",
    label: "Run diagnostic agent",
    manualInstructions: "Go to Cockpit → Pipeline tab → tap 'Run Diagnostics' to fix stuck pipeline drafts.",
  },
  "content-selector": {
    path: "/api/cron/content-selector",
    label: "Retry content selection",
    manualInstructions: "Go to Cockpit → Pipeline tab → tap 'Publish Ready' to push reservoir articles.",
  },
  "seo-agent": {
    path: "/api/cron/seo-agent",
    label: "Retry SEO agent",
    manualInstructions: "Go to Cockpit → Crons tab → find SEO Agent → tap 'Run'. Usually a transient timeout.",
  },
  "sync-commissions": {
    path: "/api/affiliate/cron/sync-commissions",
    prePath: "/api/affiliate/cron/sync-advertisers",
    label: "Sync advertisers first, then commissions",
    manualInstructions: "Go to Affiliate HQ → Actions tab → tap 'Full Sync'. If it fails, check CJ API token in Settings.",
  },
  "sync-advertisers": {
    path: "/api/affiliate/cron/sync-advertisers",
    label: "Retry advertiser sync",
    manualInstructions: "Go to Affiliate HQ → Actions tab → tap 'Sync Advertisers'. Check CJ_API_TOKEN env var if it fails.",
  },
  "gsc-sync": {
    path: "/api/cron/gsc-sync",
    label: "Retry GSC sync",
    manualInstructions: "Go to Cockpit → Crons tab → find GSC Sync → tap 'Run'. Check Google credentials if it keeps failing.",
  },
  "content-auto-fix": {
    path: "/api/cron/content-auto-fix",
    label: "Retry content auto-fix",
    manualInstructions: "Go to Cockpit → Crons tab → find Content Auto-Fix → tap 'Run'.",
  },
  "weekly-topics": {
    path: "/api/cron/weekly-topics",
    label: "Retry topic generation",
    manualInstructions: "Go to Cockpit → Content tab → tap 'Research Topics' to generate fresh topics.",
  },
  "diagnostic-sweep": {
    path: "/api/cron/diagnostic-sweep",
    label: "Retry diagnostic sweep",
    manualInstructions: "Go to Cockpit → Crons tab → find Diagnostic Sweep → tap 'Run'.",
  },
  "scheduled-publish": {
    path: "/api/cron/scheduled-publish",
    label: "Retry scheduled publish",
    manualInstructions: "Go to Cockpit → Crons tab → find Scheduled Publish → tap 'Run'.",
  },
  "affiliate-injection": {
    path: "/api/cron/affiliate-injection",
    label: "Retry affiliate injection",
    manualInstructions: "Go to Affiliate HQ → Actions tab → tap 'Inject Links'.",
  },

  // ─── Content & Pipeline ────────────────────────────────────────────────────
  "daily-content-generate": {
    path: "/api/cron/daily-content-generate",
    label: "Retry daily content generation",
    manualInstructions: "Go to Cockpit → Content tab → tap 'Generate Content'. Usually an AI provider timeout — check AI Config tab.",
  },
  "content-auto-fix-lite": {
    path: "/api/cron/content-auto-fix-lite",
    label: "Retry lite auto-fix",
    manualInstructions: "Go to Cockpit → Crons tab → find Content Auto-Fix Lite → tap 'Run'.",
  },
  "reserve-publisher": {
    path: "/api/cron/reserve-publisher",
    label: "Retry reserve publisher",
    manualInstructions: "Go to Cockpit → Crons tab → find Reserve Publisher → tap 'Run'. Ensures at least 1 article/day.",
  },
  "schedule-executor": {
    path: "/api/cron/schedule-executor",
    label: "Retry schedule executor",
    manualInstructions: "Go to Cockpit → Crons tab → find Schedule Executor → tap 'Run'. Creates drafts from schedule rules.",
  },
  "content-freshness": {
    path: "/api/cron/content-freshness",
    label: "Retry content freshness check",
    manualInstructions: "Go to Cockpit → Crons tab → find Content Freshness → tap 'Run'.",
  },
  "sweeper": {
    path: "/api/cron/sweeper",
    label: "Retry sweeper",
    prePath: "/api/cron/diagnostic-sweep",
    manualInstructions: "Go to Cockpit → Pipeline tab → tap 'Run Sweeper'. If stuck drafts persist, run Diagnostics first.",
  },
  "campaign-executor": {
    path: "/api/cron/campaign-executor",
    label: "Retry campaign executor",
    manualInstructions: "Go to Cockpit → Crons tab → find Campaign Executor → tap 'Run'. Check AI Config if timeout.",
  },
  "london-news": {
    path: "/api/cron/london-news",
    label: "Retry London news fetch",
    manualInstructions: "Go to Cockpit → Crons tab → find London News → tap 'Run'. Check Grok API key if failing.",
  },
  "trends-monitor": {
    path: "/api/cron/trends-monitor",
    label: "Retry trends monitor",
    manualInstructions: "Go to Cockpit → Crons tab → find Trends Monitor → tap 'Run'.",
  },
  "image-pipeline": {
    path: "/api/cron/image-pipeline",
    label: "Retry image pipeline",
    manualInstructions: "Go to Cockpit → Crons tab → find Image Pipeline → tap 'Run'. Check UNSPLASH_ACCESS_KEY if failing.",
  },

  // ─── SEO & Indexing ────────────────────────────────────────────────────────
  "seo-deep-review": {
    path: "/api/cron/seo-deep-review",
    label: "Retry SEO deep review",
    manualInstructions: "Go to Cockpit → Crons tab → find SEO Deep Review → tap 'Run'. Usually a timeout — AI expansion is heavy.",
  },
  "seo-orchestrator": {
    path: "/api/cron/seo-orchestrator",
    label: "Retry SEO orchestrator",
    manualInstructions: "Go to Cockpit → Crons tab → find SEO Orchestrator → tap 'Run'. Handles both daily and weekly modes.",
  },
  "seo-audit-runner": {
    path: "/api/cron/seo-audit-runner",
    label: "Retry SEO audit runner",
    manualInstructions: "Go to Cockpit → Crons tab → find SEO Audit Runner → tap 'Run'.",
  },
  "daily-seo-audit": {
    path: "/api/cron/daily-seo-audit",
    label: "Retry daily SEO audit",
    manualInstructions: "Go to Cockpit → Crons tab → find Daily SEO Audit → tap 'Run'.",
  },
  "pipeline-health": {
    path: "/api/cron/pipeline-health",
    label: "Retry pipeline health check",
    manualInstructions: "Go to Cockpit → Crons tab → find Pipeline Health → tap 'Run'.",
  },
  "verify-indexing": {
    path: "/api/cron/verify-indexing",
    label: "Retry indexing verification",
    manualInstructions: "Go to Cockpit → Crons tab → find Verify Indexing → tap 'Run'.",
  },
  "process-indexing-queue": {
    path: "/api/cron/process-indexing-queue",
    label: "Retry IndexNow queue",
    manualInstructions: "Go to Cockpit → Crons tab → find Process Indexing Queue → tap 'Run'. Check INDEXNOW_KEY if rejections.",
  },
  "google-indexing": {
    path: "/api/cron/google-indexing",
    label: "Retry Google indexing",
    manualInstructions: "Go to Cockpit → Crons tab → find Google Indexing → tap 'Run'.",
  },
  "discovery-monitor": {
    path: "/api/cron/discovery-monitor",
    label: "Retry discovery monitor",
    manualInstructions: "Go to Cockpit → Crons tab → find Discovery Monitor → tap 'Run'.",
  },

  // ─── Analytics & Intelligence ──────────────────────────────────────────────
  "analytics": {
    path: "/api/cron/analytics",
    label: "Retry analytics sync",
    manualInstructions: "Go to Cockpit → Crons tab → find Analytics → tap 'Run'. Check GA4 credentials if failing.",
  },
  "ceo-intelligence": {
    path: "/api/cron/ceo-intelligence",
    label: "Retry CEO intelligence report",
    manualInstructions: "Go to Cockpit → Crons tab → find CEO Intelligence → tap 'Run'.",
  },
  "site-health-check": {
    path: "/api/cron/site-health-check",
    label: "Retry site health check",
    manualInstructions: "Go to Cockpit → Crons tab → find Site Health Check → tap 'Run'.",
  },

  // ─── Affiliate (CJ path) ──────────────────────────────────────────────────
  "discover-deals": {
    path: "/api/affiliate/cron/discover-deals",
    label: "Retry deal discovery",
    manualInstructions: "Go to Affiliate HQ → Actions tab → tap 'Discover Deals'. Check CJ API token if failing.",
  },
  "refresh-links": {
    path: "/api/affiliate/cron/refresh-links",
    label: "Retry link refresh",
    manualInstructions: "Go to Affiliate HQ → Actions tab → tap 'Refresh Links'.",
  },

  // ─── Social & Email ────────────────────────────────────────────────────────
  "social": {
    path: "/api/cron/social",
    label: "Retry social posting",
    manualInstructions: "Go to Cockpit → Crons tab → find Social → tap 'Run'. Check Twitter API keys if failing.",
  },
  "subscriber-emails": {
    path: "/api/cron/subscriber-emails",
    label: "Retry subscriber emails",
    manualInstructions: "Go to Cockpit → Crons tab → find Subscriber Emails → tap 'Run'. Check RESEND_API_KEY if failing.",
  },
  "retention-executor": {
    path: "/api/cron/retention-executor",
    label: "Retry retention sequences",
    manualInstructions: "Go to Cockpit → Crons tab → find Retention Executor → tap 'Run'.",
  },
  "followup-executor": {
    path: "/api/cron/followup-executor",
    label: "Retry follow-up executor",
    manualInstructions: "Go to Cockpit → Crons tab → find Follow-up Executor → tap 'Run'.",
  },

  // ─── Perplexity & AI ──────────────────────────────────────────────────────
  "perplexity-scheduler": {
    path: "/api/cron/perplexity-scheduler",
    label: "Retry Perplexity scheduler",
    manualInstructions: "Go to Cockpit → Crons tab → find Perplexity Scheduler → tap 'Run'.",
  },
  "perplexity-executor": {
    path: "/api/cron/perplexity-executor",
    label: "Retry Perplexity executor",
    manualInstructions: "Go to Cockpit → Crons tab → find Perplexity Executor → tap 'Run'.",
  },

  // ─── Data & Events ────────────────────────────────────────────────────────
  "data-refresh": {
    path: "/api/cron/data-refresh",
    label: "Retry data refresh",
    manualInstructions: "Go to Cockpit → Crons tab → find Data Refresh → tap 'Run'.",
  },
  "events-sync": {
    path: "/api/cron/events-sync",
    label: "Retry events sync",
    manualInstructions: "Go to Cockpit → Crons tab → find Events Sync → tap 'Run'. Check TICKETMASTER_API_KEY if failing.",
  },

  // ─── Agent Maintenance ────────────────────────────────────────────────────
  "agent-maintenance": {
    path: "/api/cron/agent-maintenance",
    label: "Retry CTO agent maintenance",
    manualInstructions: "Go to Agent HQ → CTO tab → tap 'Run Maintenance'. Weekly scan/propose/execute cycle.",
  },
};

// ─── Core Functions ────────────────────────────────────────────────────────

export interface InboxAlert {
  id: string;
  originalJob: string;
  error: string;
  diagnosis: InterpretedError;
  fixStrategy: FixStrategy | null;
  fixResult: { attempted: boolean; success: boolean; message: string } | null;
  retestResult: { attempted: boolean; success: boolean; message: string } | null;
  status: "new" | "fixing" | "retesting" | "resolved" | "failed";
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Main entry point — called by onCronFailure when a cron job fails.
 * Creates inbox alert, attempts fix, schedules retest.
 */
export async function handleCronFailureNotice(
  jobName: string,
  errorMsg: string,
  baseUrl?: string,
): Promise<string | null> {
  try {
    const { prisma } = await import("@/lib/db");
    const diagnosis = interpretError(errorMsg);
    const fixStrategy = getFixStrategy(jobName);

    // ── Escalation Policy: daily alert limit ──
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayAlertCount = await prisma.cronJobLog.count({
      where: {
        job_name: "ceo-inbox",
        job_type: "alert",
        started_at: { gte: todayStart },
      },
    });

    if (todayAlertCount >= ESCALATION_POLICY.MAX_DAILY_CEO_ALERTS) {
      console.log(
        `[ceo-inbox] Daily alert limit reached (${todayAlertCount}/${ESCALATION_POLICY.MAX_DAILY_CEO_ALERTS}). ` +
        `Batching "${jobName}" failure into digest instead of new alert.`
      );
      // Still attempt auto-fix, just don't create another alert
      if (fixStrategy) {
        await attemptAutoFix(jobName, fixStrategy, baseUrl).catch(
          (err) => console.warn("[ceo-inbox] Silent auto-fix failed:", err instanceof Error ? err.message : err)
        );
      }
      return null;
    }

    // ── Escalation Policy: cooldown check for same job ──
    const cooldownTime = new Date(Date.now() - ESCALATION_POLICY.ALERT_COOLDOWN_MINUTES * 60_000);
    const recentSameJob = await prisma.cronJobLog.count({
      where: {
        job_name: "ceo-inbox",
        job_type: "alert",
        started_at: { gte: cooldownTime },
        error_message: { startsWith: `[${jobName}]` },
      },
    });
    if (recentSameJob > 0) {
      console.log(`[ceo-inbox] Cooldown active for "${jobName}" — skipping duplicate alert (${ESCALATION_POLICY.ALERT_COOLDOWN_MINUTES}min window)`);
      return null;
    }

    // 1. Create inbox alert entry
    const entry = await prisma.cronJobLog.create({
      data: {
        job_name: "ceo-inbox",
        job_type: "alert",
        status: "running",
        started_at: new Date(),
        items_processed: 0,
        items_succeeded: 0,
        items_failed: 1,
        error_message: `[${jobName}] ${diagnosis.plain}`,
        error_stack: `Fix: ${diagnosis.fix}${fixStrategy ? `\n\nManual: ${fixStrategy.manualInstructions}` : ""}`,
        result_summary: {
          type: "ceo_inbox",
          originalJob: jobName,
          error: errorMsg.substring(0, 500),
          diagnosis: { plain: diagnosis.plain, fix: diagnosis.fix, severity: diagnosis.severity },
          fixStrategy: fixStrategy ? { path: fixStrategy.path, label: fixStrategy.label } : null,
          fixResult: null,
          retestResult: null,
          status: "new",
          read: false,
        } as Record<string, unknown>,
      },
    });

    console.log(`[ceo-inbox] Alert created for "${jobName}" (id=${entry.id}): ${diagnosis.plain}`);

    // 2. Check queue health for context-aware diagnosis
    // The queue monitor knows about known gaps and past fixes — its snapshot helps
    // the auto-fix choose the right strategy (e.g., backlog vs stuck vs stalled).
    try {
      const { getQueueSnapshot } = await import("@/lib/content-pipeline/queue-monitor");
      const snapshot = await getQueueSnapshot();
      if (snapshot.overallHealth === "critical" || snapshot.overallHealth === "stalled") {
        console.log(`[ceo-inbox] Queue health: ${snapshot.overallHealth} — ${snapshot.totalActive} active drafts, rules: ${snapshot.healthRules.map(r => r.id).join(", ")}`);
        // Run auto-fixes from queue monitor first (clears backlog before retrying the failed cron)
        const { autoFixAll } = await import("@/lib/content-pipeline/queue-monitor");
        const queueFixes = await autoFixAll();
        const totalFixed = queueFixes.reduce((s, r) => s + r.affectedCount, 0);
        if (totalFixed > 0) {
          console.log(`[ceo-inbox] Queue auto-fix cleared ${totalFixed} stuck drafts before retrying "${jobName}"`);
        }
      }
    } catch (queueErr) {
      console.warn("[ceo-inbox] Queue health check failed (non-fatal):", queueErr instanceof Error ? queueErr.message : queueErr);
    }

    // 3. Email notifications — rate-limited (1 per condition per hour)
    sendAlertEmail(jobName, diagnosis, fixStrategy).catch(
      (err) => console.warn("[ceo-inbox] Email send failed (non-fatal):", err instanceof Error ? err.message : err),
    );

    // 4. Attempt auto-fix
    let fixResult: { attempted: boolean; success: boolean; message: string } | null = null;
    if (fixStrategy) {
      fixResult = await attemptAutoFix(jobName, fixStrategy, baseUrl);
      // Update entry with fix result
      await updateInboxEntry(entry.id, {
        status: fixResult.success ? "retesting" : "failed",
        fixResult,
      }).catch((err) => console.warn("[ceo-inbox] Fix result update failed:", err instanceof Error ? err.message : err));
    }

    // 4. Schedule retest (fire-and-forget — new serverless invocation)
    const resolvedBaseUrl = baseUrl || getBaseUrlFromEnv();
    if (resolvedBaseUrl) {
      fetch(`${resolvedBaseUrl}/api/admin/ceo-inbox`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delayed-retest",
          entryId: entry.id,
          jobName,
          cronPath: fixStrategy?.path || `/api/cron/${jobName}`,
          delayMs: 120_000,
        }),
      }).catch((err) => console.warn("[ceo-inbox] Retest schedule failed:", err instanceof Error ? err.message : err));
    }

    return entry.id;
  } catch (err) {
    console.error("[ceo-inbox] Failed to create failure notice:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Execute auto-fix for a failed cron job.
 */
async function attemptAutoFix(
  jobName: string,
  strategy: FixStrategy,
  baseUrl?: string,
): Promise<{ attempted: boolean; success: boolean; message: string }> {
  const resolvedUrl = baseUrl || getBaseUrlFromEnv();
  if (!resolvedUrl) {
    return { attempted: false, success: false, message: "No base URL available for auto-fix" };
  }

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.CRON_SECRET) {
      headers["Authorization"] = `Bearer ${process.env.CRON_SECRET}`;
    }

    // Run pre-step if needed (e.g., sync-advertisers before sync-commissions)
    if (strategy.prePath) {
      console.log(`[ceo-inbox] Running pre-step for "${jobName}": ${strategy.prePath}`);
      const preRes = await fetch(`${resolvedUrl}${strategy.prePath}`, {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(30_000),
      });
      if (!preRes.ok) {
        console.warn(`[ceo-inbox] Pre-step failed (${preRes.status}) — continuing anyway`);
      }
    }

    // Run main fix
    console.log(`[ceo-inbox] Auto-fixing "${jobName}": ${strategy.path}`);
    const res = await fetch(`${resolvedUrl}${strategy.path}`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(45_000),
    });
    const body = await res.json().catch(() => ({}));
    const success = res.ok && body.success !== false;

    return {
      attempted: true,
      success,
      message: success
        ? `Auto-fix succeeded: ${strategy.label}`
        : `Auto-fix failed (${res.status}): ${JSON.stringify(body).substring(0, 200)}`,
    };
  } catch (err) {
    return {
      attempted: true,
      success: false,
      message: `Auto-fix error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Retest the original cron job after auto-fix.
 * Called by the delayed-retest endpoint after 2-minute wait.
 */
export async function retestCronJob(
  entryId: string,
  jobName: string,
  cronPath: string,
  baseUrl: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.CRON_SECRET) {
      headers["Authorization"] = `Bearer ${process.env.CRON_SECRET}`;
    }

    console.log(`[ceo-inbox] Retesting "${jobName}" at ${cronPath}`);
    const res = await fetch(`${baseUrl}${cronPath}`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(55_000),
    });
    const body = await res.json().catch(() => ({}));
    const success = res.ok && body.success !== false;

    const retestResult = {
      attempted: true,
      success,
      message: success
        ? `Retest PASSED — "${jobName}" is working again`
        : `Retest FAILED — "${jobName}" still broken (${res.status})`,
    };

    // Update inbox entry with final result
    await updateInboxEntry(entryId, {
      status: success ? "resolved" : "failed",
      retestResult,
    });

    // Follow-up email DISABLED per Khaled's instruction.
    // sendRetestEmail(jobName, retestResult).catch(
    //   (err) => console.warn("[ceo-inbox] Retest email failed:", err instanceof Error ? err.message : err),
    // );

    return retestResult;
  } catch (err) {
    const retestResult = {
      attempted: true,
      success: false,
      message: `Retest error: ${err instanceof Error ? err.message : String(err)}`,
    };
    await updateInboxEntry(entryId, { status: "failed", retestResult }).catch((e) => console.warn("[ceo-inbox] Retest update failed:", e instanceof Error ? e.message : e));
    return retestResult;
  }
}

/**
 * Get all inbox alerts for the dashboard.
 */
export async function getInboxAlerts(limit = 20): Promise<InboxAlert[]> {
  try {
    const { prisma } = await import("@/lib/db");
    const entries = await prisma.cronJobLog.findMany({
      where: { job_name: "ceo-inbox" },
      orderBy: { started_at: "desc" },
      take: limit,
    });

    return entries.map((e) => {
      const summary = (e.result_summary || {}) as Record<string, unknown>;
      return {
        id: e.id,
        originalJob: (summary.originalJob as string) || "unknown",
        error: (summary.error as string) || e.error_message || "",
        diagnosis: (summary.diagnosis as InterpretedError) || { plain: e.error_message || "", fix: "", severity: "warning" },
        fixStrategy: (summary.fixStrategy as FixStrategy) || null,
        fixResult: (summary.fixResult as InboxAlert["fixResult"]) || null,
        retestResult: (summary.retestResult as InboxAlert["retestResult"]) || null,
        status: (summary.status as InboxAlert["status"]) || (e.status === "completed" ? "resolved" : "new"),
        read: (summary.read as boolean) || false,
        createdAt: e.started_at?.toISOString() || new Date().toISOString(),
        updatedAt: e.completed_at?.toISOString() || e.started_at?.toISOString() || new Date().toISOString(),
      };
    });
  } catch (err) {
    console.warn("[ceo-inbox] Failed to fetch alerts:", err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * Mark an alert as read or dismissed.
 */
export async function dismissAlert(entryId: string): Promise<boolean> {
  return updateInboxEntry(entryId, { status: "resolved", read: true });
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getFixStrategy(jobName: string): FixStrategy | null {
  // Direct match
  if (JOB_FIX_MAP[jobName]) return JOB_FIX_MAP[jobName];
  // Partial match (e.g., "content-builder" matches "content-builder-create")
  for (const [key, strategy] of Object.entries(JOB_FIX_MAP)) {
    if (jobName.includes(key) || key.includes(jobName)) return strategy;
  }
  return null;
}

async function updateInboxEntry(
  entryId: string,
  updates: Partial<{ status: string; fixResult: unknown; retestResult: unknown; read: boolean }>,
): Promise<boolean> {
  try {
    const { prisma } = await import("@/lib/db");
    const existing = await prisma.cronJobLog.findUnique({
      where: { id: entryId },
      select: { result_summary: true },
    });
    const currentSummary = (existing?.result_summary || {}) as Record<string, unknown>;
    const merged = { ...currentSummary, ...updates };

    await prisma.cronJobLog.update({
      where: { id: entryId },
      data: {
        status: updates.status === "resolved" ? "completed" : updates.status === "failed" ? "failed" : "running",
        completed_at: updates.status === "resolved" || updates.status === "failed" ? new Date() : undefined,
        duration_ms: updates.status === "resolved" || updates.status === "failed"
          ? Math.max(0, Date.now() - (existing ? new Date().getTime() : Date.now()))
          : undefined,
        result_summary: merged,
      },
    });
    return true;
  } catch (err) {
    console.warn("[ceo-inbox] Update failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

function getBaseUrlFromEnv(): string | null {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  // Prefer production domain over VERCEL_URL — deployment-specific URLs
  // (e.g., yalla-london-abc123.vercel.app) are blocked by Vercel deployment
  // protection, returning 401 before the request reaches Next.js.
  try {
    const { getSiteDomain } = require("@/config/sites");
    const { getDefaultSiteId } = require("@/config/sites");
    const domain = getSiteDomain(getDefaultSiteId());
    if (domain) return `https://www.${domain}`;
  } catch {
    // Config not available — fall through
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return null;
}

// Rate limiter: max 1 email per job per hour
const emailRateMap = new Map<string, number>();
const EMAIL_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

async function sendAlertEmail(
  jobName: string,
  diagnosis: InterpretedError,
  fixStrategy: FixStrategy | null,
): Promise<void> {
  try {
    // Rate limit: 1 email per job per hour
    const lastSent = emailRateMap.get(jobName) || 0;
    if (Date.now() - lastSent < EMAIL_COOLDOWN_MS) {
      console.log(`[ceo-inbox] Skipping email for "${jobName}" — sent ${Math.round((Date.now() - lastSent) / 60000)}m ago (cooldown: 60m)`);
      return;
    }
    emailRateMap.set(jobName, Date.now());

    const { sendEmail } = await import("@/lib/email/sender");
    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim()).filter(Boolean);
    if (adminEmails.length === 0) {
      console.warn("[ceo-inbox] No ADMIN_EMAILS configured — skipping email");
      return;
    }

    const { getSiteDomain, getDefaultSiteId } = await import("@/config/sites");
    const baseUrl = getBaseUrlFromEnv() || `https://www.${getSiteDomain(getDefaultSiteId())}`;

    await sendEmail({
      to: adminEmails[0],
      subject: `🚨 [${diagnosis.severity.toUpperCase()}] ${jobName} failed`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#C8322B;margin-bottom:8px;">Cron Job Failed: ${jobName}</h2>
          <div style="background:#FEF2F2;border-left:4px solid #C8322B;padding:16px;border-radius:8px;margin:16px 0;">
            <p style="font-size:16px;margin:0 0 8px;font-weight:600;">${diagnosis.plain}</p>
            <p style="font-size:14px;color:#666;margin:0;">${diagnosis.fix}</p>
          </div>
          ${fixStrategy ? `
            <div style="background:#F0FDF4;border-left:4px solid #2D5A3D;padding:16px;border-radius:8px;margin:16px 0;">
              <p style="font-weight:600;margin:0 0 8px;">Auto-fix attempted: ${fixStrategy.label}</p>
              <p style="font-size:14px;color:#666;margin:0;">Retest will run in 2 minutes. You'll get another email with the result.</p>
            </div>
          ` : ""}
          <div style="margin-top:20px;">
            <a href="${baseUrl}/admin/cockpit" style="display:inline-block;background:#C8322B;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
              Open Cockpit
            </a>
          </div>
          ${fixStrategy ? `
            <p style="font-size:13px;color:#999;margin-top:16px;">
              <strong>If auto-fix fails:</strong> ${fixStrategy.manualInstructions}
            </p>
          ` : ""}
        </div>
      `,
    });
    console.log(`[ceo-inbox] Alert email sent for "${jobName}" to ${adminEmails[0]}`);
  } catch (err) {
    // Email is best-effort — inbox entry is the primary notification
    console.warn("[ceo-inbox] Email send failed:", err instanceof Error ? err.message : err);
  }
}

async function sendRetestEmail(
  jobName: string,
  result: { success: boolean; message: string },
): Promise<void> {
  try {
    const { sendEmail } = await import("@/lib/email/sender");
    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim()).filter(Boolean);
    if (adminEmails.length === 0) return;

    const { getSiteDomain, getDefaultSiteId } = await import("@/config/sites");
    const baseUrl = getBaseUrlFromEnv() || `https://www.${getSiteDomain(getDefaultSiteId())}`;
    const emoji = result.success ? "✅" : "❌";
    const color = result.success ? "#2D5A3D" : "#C8322B";
    const bgColor = result.success ? "#F0FDF4" : "#FEF2F2";

    await sendEmail({
      to: adminEmails[0],
      subject: `${emoji} Retest: ${jobName} ${result.success ? "FIXED" : "STILL FAILING"}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:${color};">Retest Result: ${jobName}</h2>
          <div style="background:${bgColor};border-left:4px solid ${color};padding:16px;border-radius:8px;margin:16px 0;">
            <p style="font-size:16px;margin:0;">${result.message}</p>
          </div>
          <div style="margin-top:20px;">
            <a href="${baseUrl}/admin/cockpit" style="display:inline-block;background:${color};color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
              Open Cockpit
            </a>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.warn("[ceo-inbox] Retest email send failed:", err instanceof Error ? err.message : err);
  }
}
