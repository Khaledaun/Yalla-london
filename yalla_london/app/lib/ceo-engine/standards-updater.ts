/**
 * CEO Intelligence Engine — Standards Updater
 *
 * Weekly check for Google algorithm changes and SEO standard adjustments.
 * NEVER auto-applies changes — stores proposals for human review.
 * Storage: SiteSettings with category "ceo-standards-proposals".
 */

const PROPOSALS_CATEGORY = "ceo-standards-proposals";

export interface StandardsProposal {
  id: string;
  date: string;
  source: string;
  currentValue: string;
  proposedValue: string;
  reason: string;
  impact: "low" | "medium" | "high";
  status: "pending" | "approved" | "rejected";
}

export interface StandardsReport {
  checkedAt: string;
  proposals: StandardsProposal[];
  summary: string;
}

/**
 * Ask AI to review current SEO standards against latest algorithm context
 * and propose any threshold adjustments.
 */
export async function checkForStandardsUpdates(
  siteId: string,
  budgetMs: number = 20000,
): Promise<StandardsReport> {
  const startTime = Date.now();

  // Import current standards
  let currentContext = "";
  try {
    const standards = await import("@/lib/seo/standards");
    currentContext = JSON.stringify({
      version: standards.STANDARDS_VERSION,
      algorithmContext: standards.ALGORITHM_CONTEXT,
      contentQuality: standards.CONTENT_QUALITY,
      coreWebVitals: standards.CORE_WEB_VITALS,
    }, null, 2);
  } catch (err) {
    console.warn("[standards-updater] Could not import standards.ts:", err instanceof Error ? err.message : String(err));
    return {
      checkedAt: new Date().toISOString(),
      proposals: [],
      summary: "Could not read current standards",
    };
  }

  if (Date.now() - startTime > budgetMs - 5000) {
    return {
      checkedAt: new Date().toISOString(),
      proposals: [],
      summary: "Skipped — insufficient budget",
    };
  }

  const { generateCompletion } = await import("@/lib/ai/provider");

  const result = await generateCompletion(
    [
      {
        role: "user",
        content: `You are a Google algorithm expert monitoring search quality changes for a luxury travel content platform.

Current SEO standards (last updated ${currentContext.substring(0, 100)}...):
${currentContext.substring(0, 3000)}

Today's date: ${new Date().toISOString().split("T")[0]}

Task:
1. Based on your knowledge of Google algorithm updates through early 2026, identify any standards that should be adjusted
2. Consider: Helpful Content system, AI content policies, E-E-A-T updates, Core Web Vitals thresholds, structured data changes, spam policy changes
3. For each proposed change, provide: what to change, current value, proposed value, reason, and impact level

Rules:
- Only propose changes backed by real Google announcements or documented best practices
- Do NOT invent fictional algorithm updates
- If no changes needed, say so
- Respond with JSON: { "summary": "...", "proposals": [{ "source": "...", "currentValue": "...", "proposedValue": "...", "reason": "...", "impact": "low|medium|high" }] }

Respond ONLY with JSON, no markdown.`,
      },
    ],
    {
      maxTokens: 1500,
      temperature: 0.2,
      taskType: "ceo-standards-review",
      calledFrom: "standards-updater",
      siteId,
      timeoutMs: Math.min(budgetMs - (Date.now() - startTime) - 2000, 20000),
    },
  );

  let proposals: StandardsProposal[] = [];
  let summary = "No changes proposed";

  try {
    const parsed = JSON.parse(result.content) as {
      summary: string;
      proposals: Array<{
        source: string;
        currentValue: string;
        proposedValue: string;
        reason: string;
        impact: "low" | "medium" | "high";
      }>;
    };
    summary = parsed.summary || summary;
    proposals = (parsed.proposals || []).map((p, i) => ({
      id: `prop-${Date.now()}-${i}`,
      date: new Date().toISOString(),
      source: p.source,
      currentValue: p.currentValue,
      proposedValue: p.proposedValue,
      reason: p.reason,
      impact: p.impact || "medium",
      status: "pending" as const,
    }));
  } catch (err) {
    console.warn("[standards-updater] Failed to parse AI standards review:", err instanceof Error ? err.message : String(err));
    summary = "AI response could not be parsed";
  }

  const report: StandardsReport = {
    checkedAt: new Date().toISOString(),
    proposals,
    summary,
  };

  // Store proposals in DB for dashboard review (never auto-apply)
  if (proposals.length > 0) {
    try {
      const { prisma } = await import("@/lib/db");
      const existing = await prisma.siteSettings.findFirst({
        where: { siteId, category: PROPOSALS_CATEGORY },
      });

      const existingProposals: StandardsProposal[] = [];
      if (existing?.config && typeof existing.config === "object") {
        const cfg = existing.config as Record<string, unknown>;
        if (Array.isArray(cfg.proposals)) {
          existingProposals.push(...(cfg.proposals as StandardsProposal[]));
        }
      }

      // Keep last 20 proposals max
      const merged = [...proposals, ...existingProposals].slice(0, 20);

      await prisma.siteSettings.upsert({
        where: { siteId_category: { siteId, category: PROPOSALS_CATEGORY } },
        update: { config: { proposals: merged, lastChecked: report.checkedAt } as unknown as Record<string, unknown> },
        create: {
          siteId,
          category: PROPOSALS_CATEGORY,
          config: { proposals: merged, lastChecked: report.checkedAt } as unknown as Record<string, unknown>,
        },
      });
    } catch (err) {
      console.warn("[standards-updater] Failed to store proposals:", err instanceof Error ? err.message : err);
    }
  }

  return report;
}
