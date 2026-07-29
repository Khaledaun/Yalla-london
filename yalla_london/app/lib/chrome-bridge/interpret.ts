/**
 * Claude Chrome Bridge — Data Interpretation Layer.
 *
 * Pure functions that convert raw GSC/GA4/indexing/log data into prescriptive
 * findings + interpreted actions. Used by:
 *  - Bridge endpoints for server-side pre-flagging
 *  - Playbook.md as the reference rule set for Claude Chrome's reasoning
 *
 * All functions are pure (no DB access). They take typed data in, return
 * typed findings/actions out. No I/O, no side effects.
 *
 * Thresholds reference lib/seo/standards.ts where possible. When they diverge,
 * that's intentional (interpretation lens differs from quality gate lens).
 */

import type { Finding, InterpretedAction, Severity } from "./types";

// ---------------------------------------------------------------------------
// CTR vs Position interpretation
// ---------------------------------------------------------------------------

/**
 * Compute expected CTR for a given Google SERP position.
 * Based on Advanced Web Ranking 2024 aggregate data.
 */
const EXPECTED_CTR_BY_POSITION: Record<number, number> = {
  1: 0.275,
  2: 0.155,
  3: 0.105,
  4: 0.075,
  5: 0.053,
  6: 0.040,
  7: 0.030,
  8: 0.024,
  9: 0.020,
  10: 0.017,
};

function expectedCtrAtPosition(position: number): number {
  const rounded = Math.round(position);
  if (rounded <= 0) return 0.275;
  if (rounded >= 10) {
    // 11-20 range: exponential decay
    return Math.max(0.005, 0.017 * Math.pow(0.8, rounded - 10));
  }
  return EXPECTED_CTR_BY_POSITION[rounded] ?? 0.017;
}

export interface GSCPageMetrics {
  url: string;
  clicks: number;
  impressions: number;
  ctr: number; // 0-1 range
  position: number;
}

/**
 * Interpret GSC metrics for a single page.
 * Flags CTR significantly below expected for its position + generates
 * prescriptive title/meta rewrite actions.
 */
export function interpretCTRvsPosition(metrics: GSCPageMetrics): {
  findings: Finding[];
  actions: InterpretedAction[];
} {
  const findings: Finding[] = [];
  const actions: InterpretedAction[] = [];

  // Not enough data
  if (metrics.impressions < 50) {
    return { findings, actions };
  }

  const expected = expectedCtrAtPosition(metrics.position);
  const actual = metrics.ctr; // 0-1
  const gap = expected - actual;
  const gapRatio = expected > 0 ? gap / expected : 0;

  // CTR significantly below expected
  if (gapRatio > 0.4 && metrics.impressions >= 100) {
    const severity: Severity = gapRatio > 0.7 ? "critical" : "warning";
    findings.push({
      pillar: "on_page",
      issue: `CTR ${(actual * 100).toFixed(2)}% is ${(gapRatio * 100).toFixed(0)}% below expected (${(expected * 100).toFixed(1)}%) for position ${metrics.position.toFixed(1)}`,
      severity,
      evidence: `${metrics.impressions} impressions, ${metrics.clicks} clicks, avg position ${metrics.position.toFixed(1)}`,
      metric: {
        name: "ctr_gap",
        value: `${(actual * 100).toFixed(2)}%`,
        benchmark: `${(expected * 100).toFixed(1)}%`,
      },
    });

    actions.push({
      action: "Rewrite title tag for emotional hook + benefit + number (e.g. '7 Best X for Y in 2026'). Target CTR +" + (gap * 100).toFixed(1) + "pp.",
      priority: severity === "critical" ? "high" : "medium",
      autoFixable: false,
      expectedImpact: `+${Math.round(gap * metrics.impressions)} clicks/mo at current impressions`,
      estimatedEffort: "small",
    });

    actions.push({
      action: "Rewrite meta description with explicit value proposition + CTA (target 140-160 chars). Include primary keyword near start.",
      priority: "medium",
      autoFixable: false,
      estimatedEffort: "small",
    });
  }

  // Position 11-20 (page 2) with decent impressions — opportunity to push to page 1
  if (metrics.position > 10 && metrics.position <= 20 && metrics.impressions >= 200) {
    findings.push({
      pillar: "on_page",
      issue: `Page 2 ranking (position ${metrics.position.toFixed(1)}) with ${metrics.impressions} impressions — close to page 1 breakthrough`,
      severity: "warning",
      evidence: `Position ${metrics.position.toFixed(1)}, ${metrics.impressions} impressions`,
      metric: { name: "position", value: metrics.position, benchmark: "≤10" },
    });
    actions.push({
      action: "Expand content by 300-500 words covering long-tail variations. Add 2-3 inbound internal links from topical cluster pages.",
      priority: "high",
      autoFixable: false,
      expectedImpact: "Target move from page 2 to bottom of page 1 (5-8x CTR)",
      estimatedEffort: "medium",
      relatedKG: "KG-058",
    });
  }

  // High impressions, zero clicks — title invisible or unappealing
  if (metrics.impressions >= 100 && metrics.clicks === 0) {
    findings.push({
      pillar: "on_page",
      issue: `Zero clicks despite ${metrics.impressions} impressions — title tag is invisible in SERP`,
      severity: "critical",
      evidence: `${metrics.impressions} impressions, 0 clicks, position ${metrics.position.toFixed(1)}`,
      metric: { name: "click_rate", value: 0, benchmark: ">0" },
    });
    actions.push({
      action: "EMERGENCY rewrite: title may be missing, truncated, or identical to competitors. Check <title> tag renders correctly + is unique vs competing pages.",
      priority: "critical",
      autoFixable: false,
      estimatedEffort: "trivial",
    });
  }

  return { findings, actions };
}

// ---------------------------------------------------------------------------
// GA4 Engagement interpretation
// ---------------------------------------------------------------------------

export interface GA4PageMetrics {
  url: string;
  sessions?: number;
  pageViews?: number;
  bounceRate?: number; // 0-1 range
  avgEngagementTime?: number; // seconds
  engagementRate?: number; // 0-1 range
}

/**
 * Interpret GA4 engagement signals.
 * High bounce + low engagement time = content mismatch or slow page or weak hook.
 */
export function interpretGA4Engagement(metrics: GA4PageMetrics): {
  findings: Finding[];
  actions: InterpretedAction[];
} {
  const findings: Finding[] = [];
  const actions: InterpretedAction[] = [];

  if ((metrics.sessions ?? 0) < 20) {
    return { findings, actions };
  }

  const bounceRate = metrics.bounceRate ?? undefined;
  const avgTime = metrics.avgEngagementTime ?? undefined;

  // Very high bounce + very low engagement time — hook fails immediately
  if (bounceRate !== undefined && bounceRate > 0.8 && avgTime !== undefined && avgTime < 20) {
    findings.push({
      pillar: "ux",
      issue: `High bounce (${(bounceRate * 100).toFixed(0)}%) + short avg engagement (${avgTime.toFixed(0)}s) — first screen fails the reader`,
      severity: "critical",
      evidence: `${metrics.sessions} sessions, bounce ${(bounceRate * 100).toFixed(0)}%, avg engagement ${avgTime.toFixed(0)}s`,
      metric: {
        name: "first_screen_failure",
        value: `bounce ${(bounceRate * 100).toFixed(0)}%, ${avgTime.toFixed(0)}s`,
        benchmark: "bounce <60%, ≥60s",
      },
    });
    actions.push({
      action: "Rewrite first 80 words to deliver a direct answer to the query. Add answer capsule immediately after H1. Move conclusion to intro.",
      priority: "high",
      autoFixable: false,
      expectedImpact: "Reduce bounce by 20-30pp, improve AIO citation eligibility",
      estimatedEffort: "small",
      relatedKG: "KG-058",
    });
    actions.push({
      action: "Check LCP + CLS via PageSpeed. Slow or janky first paint drives bounce spike.",
      priority: "medium",
      autoFixable: true,
      estimatedEffort: "medium",
    });
  } else if (bounceRate !== undefined && bounceRate > 0.7) {
    findings.push({
      pillar: "ux",
      issue: `Elevated bounce rate ${(bounceRate * 100).toFixed(0)}%`,
      severity: "warning",
      evidence: `${metrics.sessions} sessions, bounce ${(bounceRate * 100).toFixed(0)}%`,
      metric: { name: "bounce_rate", value: `${(bounceRate * 100).toFixed(0)}%`, benchmark: "<60%" },
    });
    actions.push({
      action: "Add 1-2 inline internal links in first third of article + a 'Key Takeaways' callout box near top.",
      priority: "medium",
      autoFixable: false,
      estimatedEffort: "small",
    });
  }

  // Low engagement time for a content page
  if (avgTime !== undefined && avgTime < 30 && (metrics.sessions ?? 0) >= 50) {
    findings.push({
      pillar: "ux",
      issue: `Avg engagement time ${avgTime.toFixed(0)}s is below minimum for content depth — reader not consuming article`,
      severity: "warning",
      evidence: `${metrics.sessions} sessions, ${avgTime.toFixed(0)}s avg`,
      metric: { name: "engagement_time", value: `${avgTime.toFixed(0)}s`, benchmark: "≥60s" },
    });
  }

  return { findings, actions };
}

// ---------------------------------------------------------------------------
// Indexing Failure interpretation
// ---------------------------------------------------------------------------

export interface IndexingStatus {
  url: string;
  status: string; // discovered | submitted | indexed | deindexed | error
  coverageState?: string | null;
  indexingState?: string | null;
  submissionAttempts?: number | null;
  lastSubmittedAt?: Date | null;
  lastError?: string | null;
}

/**
 * Interpret indexing status and produce actionable findings.
 */
export function interpretIndexingFailures(status: IndexingStatus): {
  findings: Finding[];
  actions: InterpretedAction[];
} {
  const findings: Finding[] = [];
  const actions: InterpretedAction[] = [];

  if (status.status === "indexed") {
    return { findings, actions };
  }

  if (status.status === "deindexed") {
    findings.push({
      pillar: "technical",
      issue: "Page was indexed, now deindexed — quality gate failure or manual action",
      severity: "critical",
      evidence: `coverage_state: ${status.coverageState ?? "unknown"}`,
    });
    actions.push({
      action: "Investigate deindexing cause. Check robots.txt, meta robots, canonical. If thin content was unpublished, accept. Otherwise re-submit via IndexNow + inspect in GSC.",
      priority: "critical",
      autoFixable: false,
      estimatedEffort: "medium",
    });
    return { findings, actions };
  }

  const attempts = status.submissionAttempts ?? 0;
  if (attempts >= 15) {
    findings.push({
      pillar: "technical",
      issue: `Chronic indexing failure: ${attempts} IndexNow submission attempts without indexing`,
      severity: "critical",
      evidence: `Last error: ${status.lastError ?? "none"}`,
      metric: { name: "submission_attempts", value: attempts, benchmark: "<5" },
    });
    actions.push({
      action: "Manually inspect URL in GSC. Check 'Crawled - currently not indexed' status — indicates Google quality assessment. Expand content, add E-E-A-T signals, improve internal linking.",
      priority: "high",
      autoFixable: false,
      estimatedEffort: "medium",
      relatedKG: "KG-058",
    });
  } else if (attempts >= 5 && status.status !== "indexed") {
    findings.push({
      pillar: "technical",
      issue: `Repeated IndexNow rejection (${attempts} attempts)`,
      severity: "warning",
      evidence: `Status: ${status.status}, last error: ${status.lastError ?? "none"}`,
    });
    actions.push({
      action: "Verify IndexNow key file is reachable at /:key.txt (plain text, not HTML). Check middleware bypass is in place.",
      priority: "medium",
      autoFixable: true,
      estimatedEffort: "trivial",
    });
  }

  if (status.status === "discovered" && attempts === 0) {
    findings.push({
      pillar: "technical",
      issue: "Page discovered but never submitted to IndexNow",
      severity: "warning",
      evidence: `coverage_state: ${status.coverageState ?? "unknown"}`,
    });
    actions.push({
      action: "Trigger process-indexing-queue cron, or submit manually via /api/admin/indexing/submit.",
      priority: "medium",
      autoFixable: true,
      estimatedEffort: "trivial",
    });
  }

  return { findings, actions };
}

// ---------------------------------------------------------------------------
// Page content quality interpretation
// ---------------------------------------------------------------------------

export interface PageContentSignals {
  url: string;
  wordCount: number;
  internalLinkCount: number;
  affiliateLinkCount: number;
  hasAffiliates: boolean;
  seoScore?: number | null;
  pageType?: string | null; // blog | news | information | guide
  hasMetaDescription: boolean;
  metaDescriptionLength?: number;
}

const MIN_WORDS_BY_TYPE: Record<string, number> = {
  blog: 500,
  news: 150,
  information: 300,
  guide: 400,
  comparison: 600,
  review: 800,
};

/**
 * Interpret page content quality signals.
 * Cross-references lib/seo/standards.ts per-content-type thresholds.
 */
export function interpretPageContent(signals: PageContentSignals): {
  findings: Finding[];
  actions: InterpretedAction[];
} {
  const findings: Finding[] = [];
  const actions: InterpretedAction[] = [];

  const type = signals.pageType ?? "blog";
  const minWords = MIN_WORDS_BY_TYPE[type] ?? 500;

  // Thin content
  if (signals.wordCount < minWords) {
    const severity: Severity = signals.wordCount < minWords * 0.6 ? "critical" : "warning";
    findings.push({
      pillar: "on_page",
      issue: `Thin content: ${signals.wordCount} words (${type} minimum: ${minWords})`,
      severity,
      metric: { name: "word_count", value: signals.wordCount, benchmark: minWords },
    });
    actions.push({
      action: `Expand article to at least ${minWords} words. Add sections covering long-tail variations, FAQ block, practical examples.`,
      priority: severity === "critical" ? "high" : "medium",
      autoFixable: false,
      estimatedEffort: "medium",
    });
  }

  // Missing affiliates on blog/guide (monetization gap)
  if ((type === "blog" || type === "guide") && !signals.hasAffiliates) {
    findings.push({
      pillar: "affiliate",
      issue: "No affiliate/booking links in article — monetization gap",
      severity: "warning",
      evidence: `${signals.wordCount} words, 0 affiliate references`,
    });
    actions.push({
      action: "Run /api/cron/affiliate-injection for this article, or manually insert 2+ affiliate CTAs near high-intent sections.",
      priority: "medium",
      autoFixable: true,
      estimatedEffort: "trivial",
      relatedKG: "KG-054",
    });
  }

  // Weak internal linking
  if (signals.internalLinkCount < 3) {
    findings.push({
      pillar: "on_page",
      issue: `Only ${signals.internalLinkCount} internal links — below 3-link minimum for topical authority`,
      severity: "warning",
      metric: { name: "internal_links", value: signals.internalLinkCount, benchmark: "≥3" },
    });
    actions.push({
      action: "Add 2-3 contextual internal links to related articles in the same cluster. Use descriptive anchor text, not 'click here'.",
      priority: "medium",
      autoFixable: true,
      estimatedEffort: "small",
    });
  }

  // Missing or wrong-length meta description
  if (!signals.hasMetaDescription) {
    findings.push({
      pillar: "on_page",
      issue: "Missing meta description",
      severity: "warning",
    });
    actions.push({
      action: "Generate meta description (120-160 chars) with primary keyword + value prop + CTA.",
      priority: "medium",
      autoFixable: true,
      estimatedEffort: "trivial",
    });
  } else if (
    signals.metaDescriptionLength !== undefined &&
    (signals.metaDescriptionLength < 120 || signals.metaDescriptionLength > 160)
  ) {
    findings.push({
      pillar: "on_page",
      issue: `Meta description length ${signals.metaDescriptionLength} chars outside optimal 120-160 range`,
      severity: "info",
      metric: {
        name: "meta_description_length",
        value: signals.metaDescriptionLength,
        benchmark: "120-160",
      },
    });
  }

  // Low SEO score from internal scoring engine
  if (signals.seoScore !== undefined && signals.seoScore !== null && signals.seoScore < 50) {
    findings.push({
      pillar: "on_page",
      issue: `Internal SEO score ${signals.seoScore}/100 — below quality threshold`,
      severity: "warning",
      metric: { name: "seo_score", value: signals.seoScore, benchmark: "≥70" },
    });
    actions.push({
      action: "Run seo-deep-review cron for this article to fix meta, headings, internal links, affiliates in one pass.",
      priority: "medium",
      autoFixable: true,
      estimatedEffort: "trivial",
    });
  }

  return { findings, actions };
}

// ---------------------------------------------------------------------------
// Action log clustering
// ---------------------------------------------------------------------------

export interface ActionLogEntry {
  jobName: string;
  status: string;
  errorMessage?: string | null;
  startedAt: Date;
}

/**
 * Cluster action log failures by job name + error pattern.
 * Produces findings + remediation actions with cross-references to known gaps.
 */
export function interpretActionLogs(logs: ActionLogEntry[]): {
  findings: Finding[];
  actions: InterpretedAction[];
} {
  const findings: Finding[] = [];
  const actions: InterpretedAction[] = [];

  const failuresByJob: Record<string, ActionLogEntry[]> = {};
  for (const log of logs) {
    if (log.status === "failed" || log.status === "timed_out") {
      if (!failuresByJob[log.jobName]) failuresByJob[log.jobName] = [];
      failuresByJob[log.jobName].push(log);
    }
  }

  for (const [jobName, jobFailures] of Object.entries(failuresByJob)) {
    if (jobFailures.length < 2) continue; // isolated failures are transient

    const errorTexts = jobFailures.map((f) => (f.errorMessage ?? "").toLowerCase());
    const joined = errorTexts.join(" ");

    // Pattern: connection/pool exhaustion
    if (joined.includes("pool") || joined.includes("econnrefused") || joined.includes("can't reach database")) {
      findings.push({
        pillar: "technical",
        issue: `${jobName} failing from Supabase connection pool exhaustion (${jobFailures.length} failures)`,
        severity: "critical",
        evidence: errorTexts[0]?.slice(0, 200),
      });
      actions.push({
        action: "Check Supabase compute tier. Stagger cron schedules by 5+ min. Verify DATABASE_URL uses pooler (port 6543).",
        priority: "critical",
        autoFixable: false,
        estimatedEffort: "medium",
      });
      continue;
    }

    // Pattern: AI timeout
    if (joined.includes("timeout") || joined.includes("timed out") || joined.includes("aborted")) {
      findings.push({
        pillar: "technical",
        issue: `${jobName} timing out repeatedly (${jobFailures.length} failures)`,
        severity: "warning",
        evidence: errorTexts[0]?.slice(0, 200),
      });
      actions.push({
        action: "Check vercel.json maxDuration for this cron. Verify AI provider budget allocation in lib/ai/provider.ts.",
        priority: "high",
        autoFixable: false,
        estimatedEffort: "small",
      });
      continue;
    }

    // Pattern: auth / 401 / 403
    if (joined.includes("401") || joined.includes("403") || joined.includes("unauthorized") || joined.includes("forbidden")) {
      findings.push({
        pillar: "technical",
        issue: `${jobName} auth failures (${jobFailures.length}x)`,
        severity: "warning",
        evidence: errorTexts[0]?.slice(0, 200),
      });
      actions.push({
        action: "Verify CRON_SECRET env var matches in Vercel. Check requireAdminOrCron() usage on target route.",
        priority: "high",
        autoFixable: false,
        estimatedEffort: "trivial",
      });
      continue;
    }

    // Pattern: Prisma field / schema error
    if (joined.includes("unknown field") || joined.includes("unknown arg") || joined.includes("validation")) {
      findings.push({
        pillar: "technical",
        issue: `${jobName} Prisma schema mismatch (${jobFailures.length} failures)`,
        severity: "critical",
        evidence: errorTexts[0]?.slice(0, 300),
      });
      actions.push({
        action: "Run npx prisma migrate deploy. Verify schema.prisma field names match Prisma client generated types.",
        priority: "critical",
        autoFixable: false,
        estimatedEffort: "trivial",
      });
      continue;
    }

    // Generic recurring failure
    findings.push({
      pillar: "technical",
      issue: `${jobName} failing repeatedly (${jobFailures.length} failures in window)`,
      severity: jobFailures.length >= 5 ? "critical" : "warning",
      evidence: errorTexts[0]?.slice(0, 200) ?? "no error message",
    });
    actions.push({
      action: `Review CEO Inbox entries for ${jobName}. Check if JOB_FIX_MAP auto-fix is wired in lib/ops/ceo-inbox.ts.`,
      priority: "medium",
      autoFixable: false,
      estimatedEffort: "small",
    });
  }

  return { findings, actions };
}

// ---------------------------------------------------------------------------
// Unified interpreter
// ---------------------------------------------------------------------------

/**
 * Run all interpreters on a page snapshot and merge results.
 * Used by Chrome Bridge's /page/[id] for automated pre-flagging.
 */
export function interpretPage(snapshot: {
  url: string;
  gsc?: GSCPageMetrics;
  ga4?: GA4PageMetrics;
  indexing?: IndexingStatus;
  content?: PageContentSignals;
}): {
  findings: Finding[];
  actions: InterpretedAction[];
} {
  const findings: Finding[] = [];
  const actions: InterpretedAction[] = [];

  if (snapshot.gsc) {
    const r = interpretCTRvsPosition(snapshot.gsc);
    findings.push(...r.findings);
    actions.push(...r.actions);
  }
  if (snapshot.ga4) {
    const r = interpretGA4Engagement(snapshot.ga4);
    findings.push(...r.findings);
    actions.push(...r.actions);
  }
  if (snapshot.indexing) {
    const r = interpretIndexingFailures(snapshot.indexing);
    findings.push(...r.findings);
    actions.push(...r.actions);
  }
  if (snapshot.content) {
    const r = interpretPageContent(snapshot.content);
    findings.push(...r.findings);
    actions.push(...r.actions);
  }

  return { findings, actions };
}
