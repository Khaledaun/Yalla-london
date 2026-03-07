/**
 * DB Adapter — Persistence layer for the SEO audit system.
 *
 * Bridges the master-audit engine (file-based) with the database.
 * Handles: creating runs, saving results, issue fingerprinting, cross-run dedup.
 */

import type { AuditRunResult, MasterAuditIssue } from './types';
import type { AuditRunStatus, AuditTriggeredBy, SiteHealthOverview } from './types';
import { createIssueFingerprint } from './issue-fingerprint';
import { computeHealthScore, computeHealthTrend } from './health-score';

// ---------------------------------------------------------------------------
// Create / Update Audit Run
// ---------------------------------------------------------------------------

/**
 * Creates a new AuditRun record in the database.
 */
export async function createAuditRun(
  siteId: string,
  mode: string = 'full',
  triggeredBy: AuditTriggeredBy = 'scheduled'
): Promise<string> {
  const { prisma } = await import('@/lib/db');

  const run = await prisma.auditRun.create({
    data: {
      siteId,
      status: 'pending',
      mode,
      triggeredBy,
    },
  });

  return run.id;
}

/**
 * Updates an AuditRun's status and progress.
 */
export async function updateAuditRunStatus(
  runId: string,
  updates: {
    status?: AuditRunStatus;
    totalUrls?: number;
    processedUrls?: number;
    currentBatch?: number;
    totalBatches?: number;
    urlInventory?: string[];
    crawlResults?: Record<string, unknown>;
    sitemapXml?: string;
    errorMessage?: string;
    completedAt?: Date;
  }
): Promise<void> {
  const { prisma } = await import('@/lib/db');

  const data: Record<string, unknown> = {};

  if (updates.status !== undefined) data.status = updates.status;
  if (updates.totalUrls !== undefined) data.totalUrls = updates.totalUrls;
  if (updates.processedUrls !== undefined) data.processedUrls = updates.processedUrls;
  if (updates.currentBatch !== undefined) data.currentBatch = updates.currentBatch;
  if (updates.totalBatches !== undefined) data.totalBatches = updates.totalBatches;
  if (updates.urlInventory !== undefined) data.urlInventory = updates.urlInventory;
  if (updates.crawlResults !== undefined) data.crawlResults = updates.crawlResults;
  if (updates.sitemapXml !== undefined) data.sitemapXml = updates.sitemapXml;
  if (updates.errorMessage !== undefined) data.errorMessage = updates.errorMessage;
  if (updates.completedAt !== undefined) data.completedAt = updates.completedAt;

  await prisma.auditRun.update({
    where: { id: runId },
    data,
  });
}

/**
 * Gets an active (in-progress) audit run for a site, if any.
 */
export async function getActiveAuditRun(siteId: string) {
  const { prisma } = await import('@/lib/db');

  return prisma.auditRun.findFirst({
    where: {
      siteId,
      status: { in: ['pending', 'inventory', 'crawling', 'validating'] },
    },
    orderBy: { startedAt: 'desc' },
  });
}

/**
 * Gets a specific audit run by ID, optionally scoped by siteId.
 */
export async function getAuditRun(runId: string, siteId?: string) {
  const { prisma } = await import('@/lib/db');

  if (siteId) {
    return prisma.auditRun.findFirst({
      where: { id: runId, siteId },
    });
  }

  return prisma.auditRun.findUnique({
    where: { id: runId },
  });
}

// ---------------------------------------------------------------------------
// Save Audit Results (after validation step completes)
// ---------------------------------------------------------------------------

/**
 * Saves the final audit results to the database.
 * Creates AuditIssue records with fingerprints and handles cross-run dedup.
 */
export async function saveAuditResults(
  runId: string,
  siteId: string,
  result: AuditRunResult,
  reportMarkdown: string,
  fixPlanMarkdown: string,
  configSnapshot: unknown
): Promise<void> {
  const { prisma } = await import('@/lib/db');

  // 1. Compute health score
  const healthResult = computeHealthScore(
    result.issues.map((i) => ({
      severity: i.severity,
      category: i.category,
    }))
  );

  // 2. Count by severity
  const p0Count = result.issues.filter((i) => i.severity === 'P0').length;
  const p1Count = result.issues.filter((i) => i.severity === 'P1').length;
  const p2Count = result.issues.filter((i) => i.severity === 'P2').length;

  // 3. Prepare issue records with fingerprints
  const issueRecords = result.issues.map((issue) => ({
    siteId,
    url: issue.url,
    category: issue.category,
    severity: issue.severity,
    title: issue.message, // master-audit uses 'message', we store as 'title'
    description: issue.message,
    evidence: issue.evidence ?? null,
    suggestedFix: issue.suggestedFix ?? null,
    fingerprint: createIssueFingerprint(siteId, issue.url, issue.category, issue.message),
    status: 'open',
    firstDetectedAt: new Date(),
    lastDetectedAt: new Date(),
    detectionCount: 1,
  }));

  // 4. Deduplicate: check for existing issues with same fingerprint
  await deduplicateAndSaveIssues(runId, siteId, issueRecords);

  // 5. Update the run record with results
  const hardGatesPassed = result.hardGates.every((g) => g.passed);

  await prisma.auditRun.update({
    where: { id: runId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      totalIssues: result.issues.length,
      p0Count,
      p1Count,
      p2Count,
      healthScore: healthResult.score,
      hardGatesPassed,
      hardGatesJson: result.hardGates as unknown as Record<string, unknown>[],
      softGatesJson: result.softGates as unknown as Record<string, unknown>[],
      reportMarkdown,
      fixPlanMarkdown,
      configSnapshot: configSnapshot as Record<string, unknown>,
    },
  });
}

// ---------------------------------------------------------------------------
// Issue Deduplication
// ---------------------------------------------------------------------------

/**
 * For each new issue, check if an issue with the same fingerprint exists
 * from a previous run. If so, update detection tracking instead of creating duplicates.
 */
async function deduplicateAndSaveIssues(
  runId: string,
  siteId: string,
  newIssues: Array<{
    siteId: string;
    url: string;
    category: string;
    severity: string;
    title: string;
    description: string;
    evidence: unknown;
    suggestedFix: unknown;
    fingerprint: string;
    status: string;
    firstDetectedAt: Date;
    lastDetectedAt: Date;
    detectionCount: number;
  }>
): Promise<void> {
  const { prisma } = await import('@/lib/db');

  // Get all fingerprints from the most recent previous completed run
  const previousRun = await prisma.auditRun.findFirst({
    where: {
      siteId,
      status: 'completed',
      id: { not: runId },
    },
    orderBy: { completedAt: 'desc' },
    select: { id: true },
  });

  // Build a map of existing fingerprints → issue data from previous run
  const existingMap = new Map<
    string,
    { firstDetectedAt: Date; detectionCount: number }
  >();

  if (previousRun) {
    const previousIssues = await prisma.auditIssue.findMany({
      where: { auditRunId: previousRun.id },
      select: {
        fingerprint: true,
        firstDetectedAt: true,
        detectionCount: true,
      },
    });

    for (const pi of previousIssues) {
      existingMap.set(pi.fingerprint, {
        firstDetectedAt: pi.firstDetectedAt,
        detectionCount: pi.detectionCount,
      });
    }
  }

  // Create all issues for this run, preserving firstDetectedAt and incrementing count
  if (newIssues.length > 0) {
    await prisma.auditIssue.createMany({
      data: newIssues.map((issue) => {
        const existing = existingMap.get(issue.fingerprint);
        return {
          auditRunId: runId,
          siteId: issue.siteId,
          url: issue.url,
          category: issue.category,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          evidence: issue.evidence as Record<string, unknown> | null,
          suggestedFix: issue.suggestedFix as Record<string, unknown> | null,
          fingerprint: issue.fingerprint,
          status: 'open',
          firstDetectedAt: existing?.firstDetectedAt ?? new Date(),
          lastDetectedAt: new Date(),
          detectionCount: existing ? existing.detectionCount + 1 : 1,
        };
      }),
    });
  }

  // Mark issues from previous run that are NO LONGER present as "fixed"
  if (previousRun) {
    const newFingerprints = new Set(newIssues.map((i) => i.fingerprint));
    const resolvedFingerprints: string[] = [];

    for (const [fp] of existingMap) {
      if (!newFingerprints.has(fp)) {
        resolvedFingerprints.push(fp);
      }
    }

    if (resolvedFingerprints.length > 0) {
      await prisma.auditIssue.updateMany({
        where: {
          auditRunId: previousRun.id,
          fingerprint: { in: resolvedFingerprints },
          status: 'open',
        },
        data: {
          status: 'fixed',
          fixedAt: new Date(),
          fixedInRunId: runId,
        },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Query Helpers
// ---------------------------------------------------------------------------

/**
 * Get site health overview for the dashboard.
 */
export async function getSiteHealthOverview(
  siteId: string
): Promise<SiteHealthOverview> {
  const { prisma } = await import('@/lib/db');

  // Latest completed run
  const latestRun = await prisma.auditRun.findFirst({
    where: { siteId, status: 'completed' },
    orderBy: { completedAt: 'desc' },
  });

  // Previous completed run (for trend)
  const previousRun = latestRun
    ? await prisma.auditRun.findFirst({
        where: {
          siteId,
          status: 'completed',
          id: { not: latestRun.id },
        },
        orderBy: { completedAt: 'desc' },
        select: { healthScore: true },
      })
    : null;

  // Check for active run
  const activeRun = await prisma.auditRun.findFirst({
    where: {
      siteId,
      status: { in: ['pending', 'inventory', 'crawling', 'validating'] },
    },
  });

  // Open issue counts from latest run
  let openIssues = { total: 0, p0: 0, p1: 0, p2: 0 };
  let issuesByCategory: Record<string, number> = {};

  if (latestRun) {
    const issues = await prisma.auditIssue.findMany({
      where: { auditRunId: latestRun.id, status: 'open' },
      select: { severity: true, category: true },
    });

    openIssues = {
      total: issues.length,
      p0: issues.filter((i) => i.severity === 'P0').length,
      p1: issues.filter((i) => i.severity === 'P1').length,
      p2: issues.filter((i) => i.severity === 'P2').length,
    };

    issuesByCategory = {};
    for (const issue of issues) {
      issuesByCategory[issue.category] =
        (issuesByCategory[issue.category] ?? 0) + 1;
    }
  }

  return {
    siteId,
    latestRun: latestRun
      ? {
          id: latestRun.id,
          siteId: latestRun.siteId,
          status: latestRun.status as AuditRunStatus,
          mode: latestRun.mode,
          triggeredBy: latestRun.triggeredBy,
          totalUrls: latestRun.totalUrls,
          processedUrls: latestRun.processedUrls,
          currentBatch: latestRun.currentBatch,
          totalBatches: latestRun.totalBatches,
          totalIssues: latestRun.totalIssues,
          p0Count: latestRun.p0Count,
          p1Count: latestRun.p1Count,
          p2Count: latestRun.p2Count,
          healthScore: latestRun.healthScore,
          hardGatesPassed: latestRun.hardGatesPassed,
          startedAt: latestRun.startedAt.toISOString(),
          completedAt: latestRun.completedAt?.toISOString() ?? null,
          errorMessage: latestRun.errorMessage,
        }
      : null,
    healthScore: latestRun?.healthScore ?? null,
    healthTrend: computeHealthTrend(
      latestRun?.healthScore ?? null,
      previousRun?.healthScore ?? null
    ),
    previousHealthScore: previousRun?.healthScore ?? null,
    openIssues,
    issuesByCategory,
    lastAuditAt: latestRun?.completedAt?.toISOString() ?? null,
    isRunning: !!activeRun,
  };
}

/**
 * Get recent audit runs for a site (for history timeline).
 */
export async function getAuditRunHistory(
  siteId: string,
  limit: number = 10
) {
  const { prisma } = await import('@/lib/db');

  const runs = await prisma.auditRun.findMany({
    where: { siteId },
    orderBy: { startedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      siteId: true,
      status: true,
      mode: true,
      triggeredBy: true,
      totalUrls: true,
      processedUrls: true,
      currentBatch: true,
      totalBatches: true,
      totalIssues: true,
      p0Count: true,
      p1Count: true,
      p2Count: true,
      healthScore: true,
      hardGatesPassed: true,
      startedAt: true,
      completedAt: true,
      errorMessage: true,
    },
  });

  // Normalize dates to ISO strings for consistent JSON output
  return runs.map((run) => ({
    ...run,
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
  }));
}

/**
 * Get issues for a specific run with pagination and filtering.
 */
export async function getAuditIssues(params: {
  siteId: string;
  runId?: string;
  severity?: string;
  category?: string;
  status?: string;
  urlSearch?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const { prisma } = await import('@/lib/db');

  const page = params.page ?? 1;
  const limit = Math.min(params.limit ?? 50, 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { siteId: params.siteId };

  if (params.runId) where.auditRunId = params.runId;
  if (params.severity) where.severity = params.severity;
  if (params.category) where.category = params.category;
  if (params.status) where.status = params.status;
  if (params.urlSearch) where.url = { contains: params.urlSearch };

  // Determine sort
  const sortBy = params.sortBy ?? 'severity';
  const sortOrder = params.sortOrder ?? 'asc';
  const orderBy: Record<string, unknown> =
    sortBy === 'severity'
      ? { severity: sortOrder } // P0 < P1 < P2 alphabetically works for asc
      : { [sortBy]: sortOrder };

  const [rawIssues, total] = await Promise.all([
    prisma.auditIssue.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        severity: true,
        category: true,
        url: true,
        title: true,
        description: true,
        evidence: true,
        suggestedFix: true,
        status: true,
        fingerprint: true,
        firstDetectedAt: true,
        lastDetectedAt: true,
        detectionCount: true,
      },
    }),
    prisma.auditIssue.count({ where }),
  ]);

  // Normalize dates to ISO strings
  const issues = rawIssues.map((issue) => ({
    ...issue,
    firstDetectedAt: issue.firstDetectedAt.toISOString(),
    lastDetectedAt: issue.lastDetectedAt.toISOString(),
  }));

  return {
    issues,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Update an issue's lifecycle status, scoped by siteId for safety.
 */
export async function updateIssueStatus(
  issueId: string,
  newStatus: 'open' | 'ignored' | 'fixed' | 'wontfix',
  siteId?: string,
  userId?: string
): Promise<void> {
  const { prisma } = await import('@/lib/db');

  // Verify issue belongs to the expected site if siteId provided
  if (siteId) {
    const issue = await prisma.auditIssue.findFirst({
      where: { id: issueId, siteId },
      select: { id: true },
    });
    if (!issue) {
      throw new Error(`Issue ${issueId} not found for site ${siteId}`);
    }
  }

  const data: Record<string, unknown> = { status: newStatus };

  if (newStatus === 'ignored') {
    data.ignoredAt = new Date();
    data.ignoredBy = userId ?? 'admin';
  } else if (newStatus === 'fixed') {
    data.fixedAt = new Date();
  }

  await prisma.auditIssue.update({
    where: { id: issueId },
    data,
  });
}
