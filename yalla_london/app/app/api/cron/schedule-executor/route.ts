export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
const BUDGET_MS = 53_000;

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

        const postsToday = await prisma.articleDraft.count({
          where: {
            created_at: { gte: todayStart },
            site_id: { in: activeSiteIds },
            // Match content type (blog drafts are the main type)
          },
        });

        if (postsToday >= rule.max_posts_per_day) {
          results.skipped++;
          continue;
        }

        // Check frequency: when was the last draft created by this rule?
        const lastCreated = await prisma.articleDraft.findFirst({
          where: {
            site_id: { in: activeSiteIds },
            created_at: { gte: new Date(Date.now() - rule.frequency_hours * 60 * 60 * 1000) },
          },
          orderBy: { created_at: "desc" },
          select: { created_at: true },
        });

        if (lastCreated) {
          const hoursSince = (Date.now() - lastCreated.created_at.getTime()) / (60 * 60 * 1000);
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
          const topic = await prisma.topicProposal.findFirst({
            where: {
              status: "approved",
              site_id: { in: activeSiteIds },
            },
            orderBy: { created_at: "asc" },
          });

          if (!topic) {
            results.errors.push(`No approved topics available for ${lang}`);
            continue;
          }

          // Claim the topic atomically
          const claimed = await prisma.topicProposal.updateMany({
            where: { id: topic.id, status: "approved" },
            data: { status: "generating" as string },
          });

          if (claimed.count === 0) {
            continue; // Another process claimed it
          }

          // Create an ArticleDraft in "research" phase
          const slug = topic.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .slice(0, 80);

          await prisma.articleDraft.create({
            data: {
              topic_id: topic.id,
              site_id: topic.site_id || defaultSiteId,
              locale: lang,
              title: topic.title,
              slug: `${slug}-${lang}`,
              current_phase: "research",
              phase_attempts: 0,
              quality_score: 0,
              seo_score: 0,
              seo_meta: {},
              research_data: {},
              outline_data: {},
            },
          });

          // Mark topic as used
          await prisma.topicProposal.update({
            where: { id: topic.id },
            data: { status: "used" },
          });

          results.draftsQueued++;
        }
      } catch (ruleErr) {
        results.errors.push(`Rule ${rule.name}: ${(ruleErr as Error).message}`);
      }
    }

    const durationMs = Date.now() - cronStart;

    const { logCronExecution: logCron2 } = await import("@/lib/cron-logger");
    await logCron2("schedule-executor", results.errors.length > 0 && results.draftsQueued === 0 ? "failed" : "completed", {
      durationMs,
      itemsProcessed: results.draftsQueued,
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
