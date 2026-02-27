/**
 * Content Pipeline Diagnostics
 *
 * Tests: topics, drafts, phases, reservoir, publishing flow.
 * Traces the critical path: Topics → Drafts → Reservoir → Published.
 */

import type { DiagnosticResult } from "../types";

const SECTION = "pipeline";

function pass(id: string, name: string, detail: string, explanation: string): DiagnosticResult {
  return { id: `${SECTION}-${id}`, section: SECTION, name, status: "pass", detail, explanation };
}
function warn(id: string, name: string, detail: string, explanation: string, diagnosis?: string, fixAction?: DiagnosticResult["fixAction"]): DiagnosticResult {
  return { id: `${SECTION}-${id}`, section: SECTION, name, status: "warn", detail, explanation, diagnosis, fixAction };
}
function fail(id: string, name: string, detail: string, explanation: string, diagnosis?: string, fixAction?: DiagnosticResult["fixAction"]): DiagnosticResult {
  return { id: `${SECTION}-${id}`, section: SECTION, name, status: "fail", detail, explanation, diagnosis, fixAction };
}

const pipelineSection = async (
  siteId: string,
  _budgetMs: number,
  _startTime: number,
): Promise<DiagnosticResult[]> => {
  const results: DiagnosticResult[] = [];

  try {
    const { prisma } = await import("@/lib/db");

    // ── 1. Topic Proposals ─────────────────────────────────────────────
    try {
      const [totalTopics, pendingTopics, approvedTopics, recentTopics] = await Promise.all([
        prisma.topicProposal.count({ where: { site_id: siteId } }),
        prisma.topicProposal.count({ where: { site_id: siteId, status: "pending" } }),
        prisma.topicProposal.count({ where: { site_id: siteId, status: "approved" } }),
        prisma.topicProposal.count({
          where: {
            site_id: siteId,
            created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

      results.push(pass("topics-total", "Total Topics", `${totalTopics} topic proposals for this site`, "Counts all topic proposals generated for this site. Topics are the starting point of the content pipeline — no topics = no articles."));

      if (pendingTopics > 0) {
        results.push(pass("topics-pending", "Pending Topics", `${pendingTopics} topics waiting to be built`, "Pending topics are queued for the content builder. Having topics in the queue means the pipeline has fuel to generate new articles."));
      } else {
        results.push(warn("topics-pending", "Pending Topics", "0 pending topics — pipeline will stall", "Pending topics are queued for the content builder. When this hits zero, no new articles can be generated.", "The topic queue is empty. Run weekly topics to generate new ones.", {
          id: "fix-no-topics",
          label: "Generate Topics Now",
          api: "/api/cron/weekly-topics",
          rerunGroup: "pipeline",
        }));
      }

      if (recentTopics > 0) {
        results.push(pass("topics-recent", "Recent Topic Generation", `${recentTopics} topics created this week`, "Checks that the weekly topic generator is producing new topics. If this stops, the pipeline runs dry within a week."));
      } else {
        results.push(warn("topics-recent", "Recent Topic Generation", "No topics generated this week", "Checks that the weekly topic generator is producing new topics.", "The weekly topic cron may not be running. Check the departures board.", {
          id: "fix-weekly-topics",
          label: "Run Weekly Topics",
          api: "/api/cron/weekly-topics",
          rerunGroup: "pipeline",
        }));
      }

      if (approvedTopics > 0) {
        results.push(pass("topics-approved", "Approved Topics", `${approvedTopics} approved topics`, "Approved topics have passed quality checks and are ready for content building."));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("P2021") || msg.includes("does not exist")) {
        results.push(fail("topics-table", "TopicProposal Table", "Table missing", "The TopicProposal table stores generated content topics.", "Database schema needs updating.", {
          id: "fix-topics-table",
          label: "Fix Database Schema",
          api: "/api/admin/diagnostics/fix",
          payload: { fixType: "db_push" },
          rerunGroup: "pipeline",
        }));
      } else {
        results.push(warn("topics-check", "Topic Check", `Error: ${msg}`, "Checks topic proposal status."));
      }
    }

    // ── 2. Article Drafts (Pipeline Phases) ────────────────────────────
    try {
      const phases = ["research", "outline", "drafting", "assembly", "images", "seo", "scoring", "reservoir"];
      const phaseCounts: Record<string, number> = {};
      let totalDrafts = 0;

      for (const phase of phases) {
        const count = await prisma.articleDraft.count({
          where: { site_id: siteId, phase },
        });
        phaseCounts[phase] = count;
        totalDrafts += count;
      }

      results.push(pass("drafts-total", "Total Article Drafts", `${totalDrafts} drafts across all phases`, "Article drafts are content pieces moving through the 8-phase pipeline: research → outline → drafting → assembly → images → SEO → scoring → reservoir."));

      // Check each phase
      const reservoirCount = phaseCounts["reservoir"] || 0;
      if (reservoirCount > 0) {
        results.push(pass("reservoir", "Reservoir", `${reservoirCount} articles ready to publish`, "The reservoir holds fully-built articles waiting to be published. This is the pipeline's output buffer — articles here are complete and quality-checked."));
      } else {
        results.push(warn("reservoir", "Reservoir", "Empty — no articles ready to publish", "The reservoir holds fully-built articles waiting to be published.", "Run the content builder to move drafts through the pipeline.", {
          id: "fix-empty-reservoir",
          label: "Run Content Builder",
          api: "/api/cron/content-builder",
          rerunGroup: "pipeline",
        }));
      }

      // Check for stuck drafts (>6 hours in same phase)
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      const stuckDrafts = await prisma.articleDraft.count({
        where: {
          site_id: siteId,
          phase: { notIn: ["reservoir", "completed", "failed"] },
          updated_at: { lt: sixHoursAgo },
        },
      });

      if (stuckDrafts === 0) {
        results.push(pass("stuck-drafts", "Stuck Drafts", "No stuck drafts detected", "Checks for drafts that haven't progressed in 6+ hours. Stuck drafts indicate a pipeline blockage — the content builder may be crashing or timing out."));
      } else {
        results.push(warn("stuck-drafts", "Stuck Drafts", `${stuckDrafts} draft(s) stuck for 6+ hours`, "Checks for drafts that haven't progressed in 6+ hours.", `${stuckDrafts} draft(s) haven't moved phases in over 6 hours. The content builder may need a restart.`, {
          id: "fix-stuck-drafts",
          label: "Restart Content Builder",
          api: "/api/cron/content-builder",
          rerunGroup: "pipeline",
        }));
      }

      // Phase distribution summary
      const phaseBreakdown = phases.map(p => `${p}: ${phaseCounts[p] || 0}`).join(", ");
      results.push(pass("phase-breakdown", "Phase Distribution", phaseBreakdown, "Shows how many drafts are in each pipeline phase. A healthy pipeline has drafts moving through all phases, not clumped in one."));

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("P2021") || msg.includes("does not exist")) {
        results.push(fail("drafts-table", "ArticleDraft Table", "Table missing", "The ArticleDraft table is the core of the content pipeline.", "Run prisma db push to create the table.", {
          id: "fix-drafts-table",
          label: "Fix Database Schema",
          api: "/api/admin/diagnostics/fix",
          payload: { fixType: "db_push" },
          rerunGroup: "pipeline",
        }));
      } else {
        results.push(warn("drafts-check", "Draft Check", `Error: ${msg}`, "Checks article draft pipeline."));
      }
    }

    // ── 3. Published Articles (Pipeline Output) ────────────────────────
    try {
      const [publishedToday, publishedThisWeek, totalPublished] = await Promise.all([
        prisma.blogPost.count({
          where: {
            siteId,
            status: "published",
            published_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        }),
        prisma.blogPost.count({
          where: {
            siteId,
            status: "published",
            published_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
        prisma.blogPost.count({
          where: { siteId, status: "published" },
        }),
      ]);

      results.push(pass("published-today", "Published Today", `${publishedToday} article(s) published today`, "Tracks daily publishing output. Target: 2 articles per site per day for steady content growth."));

      if (publishedThisWeek >= 7) {
        results.push(pass("published-week", "Published This Week", `${publishedThisWeek} articles this week`, "Weekly publishing velocity. Target: 14/week (2/day). Consistent publishing signals freshness to Google."));
      } else if (publishedThisWeek > 0) {
        results.push(warn("published-week", "Published This Week", `${publishedThisWeek} articles (target: 14)`, "Weekly publishing velocity. Consistent publishing signals freshness to Google.", "Publishing rate is below target. Check the content pipeline and cron schedule."));
      } else {
        results.push(fail("published-week", "Published This Week", "0 articles published this week", "Weekly publishing velocity.", "No articles published this week. The content pipeline may be stalled.", {
          id: "fix-no-publishing",
          label: "Run Content Selector",
          api: "/api/cron/content-selector",
          rerunGroup: "pipeline",
        }));
      }

      results.push(pass("published-total", "Total Published", `${totalPublished} articles total`, "Total published article count for this site. More content = more indexed pages = more traffic opportunities."));

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push(warn("published-check", "Publishing Check", `Error: ${msg}`, "Checks publishing output."));
    }

    // ── 4. Scheduled Content ───────────────────────────────────────────
    try {
      const scheduledCount = await prisma.scheduledContent.count({
        where: {
          site_id: siteId,
          status: "scheduled",
          scheduled_time: { gte: new Date() },
        },
      });

      if (scheduledCount > 0) {
        results.push(pass("scheduled", "Scheduled Publications", `${scheduledCount} article(s) scheduled`, "Counts articles queued for future publication. Scheduled publishing ensures consistent daily output without manual intervention."));
      } else {
        results.push(warn("scheduled", "Scheduled Publications", "No upcoming scheduled publications", "Scheduled publishing ensures consistent daily output.", "The content selector should be scheduling articles for publication. Check the cron schedule.", {
          id: "fix-no-scheduled",
          label: "Run Content Selector",
          api: "/api/cron/content-selector",
          rerunGroup: "pipeline",
        }));
      }
    } catch {
      results.push(warn("scheduled", "Scheduled Publications", "Could not check scheduled content", "Checks scheduled publication queue."));
    }

    // ── 5. Content Quality (sample check) ──────────────────────────────
    try {
      const recentPosts = await prisma.blogPost.findMany({
        where: { siteId, status: "published" },
        orderBy: { published_at: "desc" },
        take: 5,
        select: { id: true, slug: true, seo_score: true, word_count_en: true, meta_description_en: true },
      });

      if (recentPosts.length > 0) {
        const avgSeoScore = Math.round(recentPosts.reduce((sum, p) => sum + (p.seo_score || 0), 0) / recentPosts.length);
        const avgWordCount = Math.round(recentPosts.reduce((sum, p) => sum + (p.word_count_en || 0), 0) / recentPosts.length);

        if (avgSeoScore >= 70) {
          results.push(pass("quality-seo", "Average SEO Score", `${avgSeoScore}/100 (last 5 articles)`, "Average SEO score of recent articles. Target: 70+. Higher scores mean better search ranking potential."));
        } else {
          results.push(warn("quality-seo", "Average SEO Score", `${avgSeoScore}/100 — below 70 target`, "Average SEO score of recent articles.", "Recent articles are scoring below the 70-point quality gate. Check meta tags, word count, and internal links.", {
            id: "fix-low-seo",
            label: "Run SEO Agent",
            api: "/api/cron/seo-agent",
            rerunGroup: "pipeline",
          }));
        }

        if (avgWordCount >= 1000) {
          results.push(pass("quality-words", "Average Word Count", `${avgWordCount} words (last 5 articles)`, "Average word count of recent articles. Target: 1,000+ minimum. Google favors comprehensive, in-depth content."));
        } else {
          results.push(warn("quality-words", "Average Word Count", `${avgWordCount} words — below 1,000 target`, "Average word count of recent articles.", "Recent articles are too thin. The content builder should produce 1,500-2,000 word articles.", {
            id: "fix-thin-content",
            label: "Run Content Auto-Fix",
            api: "/api/cron/content-auto-fix",
            rerunGroup: "pipeline",
          }));
        }
      }
    } catch {
      results.push(warn("quality-check", "Content Quality", "Could not check quality metrics", "Samples recent articles for quality metrics."));
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push(fail("pipeline-db", "Pipeline Database", `Database error: ${msg}`, "The content pipeline requires database access to check all stages."));
  }

  return results;
};

export default pipelineSection;
