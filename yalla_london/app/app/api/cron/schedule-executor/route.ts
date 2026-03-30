export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Schedule Executor — Processes ContentScheduleRule records
 *
 * Reads active ContentScheduleRules from the database and, based on their
 * frequency_hours, min_hours_between, and max_posts_per_day settings,
 * queues new ArticleDraft creation via the content pipeline.
 *
 * This closes the gap where ContentScheduleRule records existed in the DB
 * (configurable via admin) but no cron ever read or acted on them.
 *
 * Schedule: Every 2 hours (vercel.json)
 * Budget: 53s with 7s buffer
 */

import { NextRequest, NextResponse } from "next/server";
import { sanitizeKeyword } from "@/lib/content-pipeline/constants";
const BUDGET_MS = 280_000;

async function handleScheduleExecutor(request: NextRequest) {
  const cronStart = Date.now();
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Feature flag guard
  const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
  const flagResponse = await checkCronEnabled("schedule-executor");
  if (flagResponse) return flagResponse;

  // Healthcheck mode
  if (request.nextUrl.searchParams.get("healthcheck") === "true") {
    try {
      const { prisma } = await import("@/lib/db");
      const activeRules = await prisma.contentScheduleRule.count({
        where: { is_active: true },
      });
      return NextResponse.json({
        status: "healthy",
        endpoint: "schedule-executor",
        activeRules,
        timestamp: new Date().toISOString(),
      });
    } catch {
      return NextResponse.json({
        status: "healthy",
        endpoint: "schedule-executor",
        timestamp: new Date().toISOString(),
      });
    }
  }

  const results = {
    rulesProcessed: 0,
    draftsQueued: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds, getDefaultSiteId } = await import("@/config/sites");
    const activeSiteIds = getActiveSiteIds();
    const defaultSiteId = getDefaultSiteId();

    // Fetch all active schedule rules
    const rules = await prisma.contentScheduleRule.findMany({
      where: { is_active: true },
      orderBy: { created_at: "asc" },
    });

    if (rules.length === 0) {
      // Auto-seed a default schedule rule for 4 articles/day (2 EN + 2 AR)
      // This ensures the pipeline starts producing content immediately after deployment
      // without requiring manual DB inserts from a non-technical owner.
      try {
        const seededRule = await prisma.contentScheduleRule.create({
          data: {
            name: "Daily Content (4 articles: 2 EN + 2 AR)",
            content_type: "blog_post",
            language: "both",
            frequency_hours: 6,         // Check every 6 hours (4x/day)
            min_hours_between: 4,        // At least 4h between batch creations
            max_posts_per_day: 4,        // Hard cap: 4 articles/day
            auto_publish: false,         // Publish via content-selector (quality gated)
            preferred_times: ["05:00", "11:00", "17:00", "23:00"],
            is_active: true,
          },
        });
        rules.push(seededRule);
        console.log(`[schedule-executor] Auto-seeded default schedule rule: ${seededRule.id}`);
      } catch (seedErr) {
        console.warn("[schedule-executor] Failed to seed default rule:", (seedErr as Error).message);
        const durationMs = Date.now() - cronStart;
        const { logCronExecution: logCron1 } = await import("@/lib/cron-logger");
        await logCron1("schedule-executor", "completed", {
          durationMs,
          itemsProcessed: 0,
          resultSummary: { message: "No active schedule rules found, seed failed" },
        }).catch((err: Error) => console.warn("[schedule-executor] log failed:", err.message));

        return NextResponse.json({
          success: true,
          message: "No active schedule rules",
          ...results,
          durationMs,
        });
      }
    }

    // Check reservoir cap BEFORE processing rules — if reservoir is full,
    // creating more drafts wastes AI budget on articles that will sit idle.
    // (Bug found March 22, 2026: schedule-executor was creating drafts even with 65 in reservoir)
    const reservoirCount = await prisma.articleDraft.count({
      where: { current_phase: "reservoir", site_id: { in: activeSiteIds } },
    });
    if (reservoirCount >= 80) {
      const durationMs = Date.now() - cronStart;
      const { logCronExecution: logReservoir } = await import("@/lib/cron-logger");
      await logReservoir("schedule-executor", "completed", {
        durationMs,
        itemsProcessed: 0,
        resultSummary: { message: `Reservoir full (${reservoirCount}/80) — skipping draft creation`, reservoirCount },
      }).catch((err: Error) => console.warn("[schedule-executor] log failed:", err.message));

      return NextResponse.json({
        success: true,
        message: `Reservoir full (${reservoirCount}/80)`,
        ...results,
        reservoirCount,
        durationMs,
      });
    }

    for (const rule of rules) {
      if (Date.now() - cronStart > BUDGET_MS) {
        results.errors.push("Budget exhausted before processing all rules");
        break;
      }

      results.rulesProcessed++;

      try {
        // Check if we've already hit max_posts_per_day for this rule's content type
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);

        // Count only drafts created by schedule-executor today, not ALL drafts.
        // content-builder-create independently creates drafts every 30 min — counting
        // those too means the daily cap is always hit early, causing schedule-executor
        // to skip for the rest of the day. (Bug found March 21, 2026)
        const schedulerRunsToday = await prisma.cronJobLog.count({
          where: {
            job_name: "schedule-executor",
            started_at: { gte: todayStart },
            status: "completed",
            items_succeeded: { gt: 0 },
          },
        });
        // Each successful run creates ~2 drafts (1 EN + 1 AR), so multiply by 2
        const estimatedDraftsToday = schedulerRunsToday * 2;

        if (estimatedDraftsToday >= rule.max_posts_per_day) {
          results.skipped++;
          continue;
        }

        // Check frequency: when did schedule-executor itself last create drafts?
        // CRITICAL: Must check schedule-executor's OWN production history, not ALL drafts.
        // content-builder-create independently creates drafts every 30 min — checking all
        // ArticleDrafts means hoursSince is always < 1h, which is always < min_hours_between (4h),
        // causing the rule to ALWAYS be skipped. (Bug found March 16, 2026)
        const lastSuccessfulRun = await prisma.cronJobLog.findFirst({
          where: {
            job_name: "schedule-executor",
            status: "completed",
            items_succeeded: { gt: 0 },
          },
          orderBy: { started_at: "desc" },
          select: { started_at: true },
        });

        if (lastSuccessfulRun) {
          const hoursSince = (Date.now() - lastSuccessfulRun.started_at.getTime()) / (60 * 60 * 1000);
          if (hoursSince < rule.min_hours_between) {
            results.skipped++;
            continue;
          }
        }

        // Determine which languages to generate for
        const languages = rule.language === "both" ? ["en", "ar"] : [rule.language];

        for (const lang of languages) {
          if (Date.now() - cronStart > BUDGET_MS) break;

          // Find a topic proposal to use
          // Status alignment: weekly-topics creates "ready", admin creates "queued"/"planned"/"proposed"
          // Must match content-builder-create's query to consume topics from all sources
          const CONSUMABLE_STATUSES = ["ready", "queued", "planned", "proposed"];
          const topic = await prisma.topicProposal.findFirst({
            where: {
              status: { in: CONSUMABLE_STATUSES },
              site_id: { in: activeSiteIds },
            },
            orderBy: { created_at: "asc" },
          });

          if (!topic) {
            results.errors.push(`No consumable topics available for ${lang} (checked statuses: ${CONSUMABLE_STATUSES.join(", ")})`);
            continue;
          }

          // Claim the topic atomically
          const claimed = await prisma.topicProposal.updateMany({
            where: { id: topic.id, status: { in: CONSUMABLE_STATUSES } },
            data: { status: "generating" as string },
          });

          if (claimed.count === 0) {
            continue; // Another process claimed it
          }

          // Dedup guard: check if a draft already exists for this topic+language
          // Prevents duplicate drafts when topic status update fails after draft creation
          const existingDraft = await prisma.articleDraft.findFirst({
            where: { topic_proposal_id: topic.id, locale: lang },
            select: { id: true },
          });
          if (existingDraft) {
            console.log(`[schedule-executor] Draft already exists for topic "${topic.title}" (${lang}), skipping`);
            // Still mark topic as consumed so it's not re-claimed endlessly
            await prisma.topicProposal.update({
              where: { id: topic.id },
              data: { status: "generated" },
            }).catch(() => {});
            continue;
          }

          // Create an ArticleDraft in "research" phase
          await prisma.articleDraft.create({
            data: {
              topic_proposal_id: topic.id,
              site_id: topic.site_id || defaultSiteId,
              locale: lang,
              keyword: sanitizeKeyword(topic.title) || topic.title,
              topic_title: topic.title,
              current_phase: "research",
              phase_attempts: 0,
              seo_meta: {},
              research_data: {},
              outline_data: {},
            },
          });

          // Mark topic as consumed — "generated" is a valid TopicProposal status
          // ("used" was invalid and caused silent Prisma crashes — see rule #144)
          try {
            await prisma.topicProposal.update({
              where: { id: topic.id },
              data: { status: "generated" },
            });
          } catch (statusErr) {
            console.warn(`[schedule-executor] Topic status update failed for "${topic.title}":`, (statusErr as Error).message);
            // Draft was created — topic stays in "generating" until diagnostic-agent cleans it
          }

          results.draftsQueued++;
        }
      } catch (ruleErr) {
        results.errors.push(`Rule ${rule.name}: ${(ruleErr as Error).message}`);
      }
    }

    const durationMs = Date.now() - cronStart;

    // "No consumable topics" is a normal condition (topic pool exhausted), NOT a failure.
    // Only log as "failed" when there's an actual exception in the catch block.
    // Logging "failed" here triggers diagnostic-agent, CEO Inbox, and failure hooks
    // unnecessarily, creating alert fatigue. (Bug found March 22, 2026)
    const { logCronExecution: logCron2 } = await import("@/lib/cron-logger");
    await logCron2("schedule-executor", "completed", {
      durationMs,
      itemsProcessed: results.draftsQueued,
      itemsSucceeded: results.draftsQueued, // draftsQueued IS the success count — they were created in DB
      resultSummary: results,
    }).catch((err: Error) => console.warn("[schedule-executor] log failed:", err.message));

    return NextResponse.json({
      success: true,
      ...results,
      durationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const durationMs = Date.now() - cronStart;
    const error = err as Error;

    const { logCronExecution: logCron3 } = await import("@/lib/cron-logger");
    await logCron3("schedule-executor", "failed", {
      durationMs,
      itemsProcessed: 0,
      errorMessage: error.message,
    }).catch((logErr: Error) => console.warn("[schedule-executor] log failed:", logErr.message));

    return NextResponse.json(
      { success: false, error: "Schedule executor failed", ...results, durationMs },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleScheduleExecutor(request);
}

export async function POST(request: NextRequest) {
  return handleScheduleExecutor(request);
}
