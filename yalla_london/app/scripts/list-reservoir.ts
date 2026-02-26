#!/usr/bin/env tsx
/**
 * List Reservoir Articles
 *
 * Queries all ArticleDraft records in the "reservoir" phase for yalla-london,
 * ordered by quality_score DESC. Shows the top 10 best candidates for publishing.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json scripts/list-reservoir.ts
 *
 * Run from the app root: /home/user/Yalla-london/yalla_london/app/
 */

const SITE_ID = "yalla-london";
const TOP_N = 10;

function formatScore(score: number | null | undefined): string {
  if (score == null) return "  n/a";
  return score.toFixed(1).padStart(5);
}

function formatWordCount(
  wordCount: number | null | undefined,
  assembledHtml: string | null | undefined,
): string {
  if (wordCount != null) {
    return String(wordCount).padStart(6);
  }
  // Rough estimate: HTML length / 5
  if (assembledHtml) {
    const estimate = Math.round(assembledHtml.length / 5);
    return `~${String(estimate).padStart(5)} (est)`;
  }
  return "   n/a";
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "unknown";
  return date.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function truncate(str: string | null | undefined, max: number): string {
  if (!str) return "(none)";
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + "...";
}

async function main() {
  const { prisma } = await import("@/lib/db");

  console.log("=".repeat(72));
  console.log("  RESERVOIR ARTICLE CANDIDATES — " + SITE_ID);
  console.log("  Top " + TOP_N + " by quality_score (DESC)");
  console.log("=".repeat(72));
  console.log("");

  let drafts: Array<Record<string, unknown>> = [];

  try {
    drafts = await prisma.articleDraft.findMany({
      where: {
        site_id: SITE_ID,
        current_phase: "reservoir",
      },
      orderBy: [
        { quality_score: "desc" },
        { created_at: "asc" },
      ],
      take: TOP_N,
      select: {
        id: true,
        keyword: true,
        locale: true,
        quality_score: true,
        seo_score: true,
        word_count: true,
        assembled_html: true,
        topic_title: true,
        created_at: true,
        paired_draft_id: true,
        readability_score: true,
        generation_strategy: true,
        last_error: true,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("does not exist") || msg.includes("P2021")) {
      console.error(
        "ERROR: article_drafts table does not exist in the database.",
      );
      console.error(
        "       Run: npx prisma migrate deploy  (or npx prisma db push)",
      );
    } else {
      console.error("ERROR querying article_drafts:", msg);
    }
    process.exit(1);
  }

  // Also fetch total reservoir count for context
  let totalReservoir = 0;
  try {
    totalReservoir = await prisma.articleDraft.count({
      where: {
        site_id: SITE_ID,
        current_phase: "reservoir",
      },
    });
  } catch {
    // Non-fatal — count already failed above if table missing
  }

  if (drafts.length === 0) {
    console.log("No reservoir articles found for site: " + SITE_ID);
    console.log("");
    console.log(
      "This means either no articles have completed the 8-phase pipeline yet,",
    );
    console.log(
      "or all reservoir articles have already been promoted to published BlogPosts.",
    );
    console.log("");
    console.log(
      "To generate more: trigger the content-builder cron from the dashboard.",
    );
    await prisma.$disconnect();
    process.exit(0);
  }

  console.log(
    `Found ${totalReservoir} reservoir article(s) for "${SITE_ID}" — showing top ${drafts.length}:`,
  );
  console.log("");

  // Print each draft
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i] as {
      id: string;
      keyword: string;
      locale: string;
      quality_score: number | null;
      seo_score: number | null;
      word_count: number | null;
      assembled_html: string | null;
      topic_title: string | null;
      created_at: Date;
      paired_draft_id: string | null;
      readability_score: number | null;
      generation_strategy: string | null;
      last_error: string | null;
    };

    const rank = String(i + 1).padStart(2);
    const qualityBadge =
      d.quality_score != null
        ? d.quality_score >= 70
          ? "READY"
          : d.quality_score >= 60
            ? "MARGINAL"
            : "LOW"
        : "UNSCORED";

    console.log(`${rank}. [${qualityBadge}] ${truncate(d.topic_title || d.keyword, 60)}`);
    console.log(`    ID:           ${d.id}`);
    console.log(`    Keyword:      ${truncate(d.keyword, 60)}`);
    console.log(`    Locale:       ${d.locale}`);
    console.log(
      `    Quality:      ${formatScore(d.quality_score)}   SEO: ${formatScore(d.seo_score)}   Readability: ${formatScore(d.readability_score)}`,
    );
    console.log(
      `    Word count:   ${formatWordCount(d.word_count, d.assembled_html)}`,
    );
    console.log(`    Created:      ${formatDate(d.created_at)}`);
    console.log(
      `    Paired draft: ${d.paired_draft_id ?? "(none — unpaired)"}`,
    );
    if (d.generation_strategy) {
      console.log(`    Strategy:     ${d.generation_strategy}`);
    }
    if (d.last_error) {
      console.log(`    Last error:   ${truncate(d.last_error, 80)}`);
    }
    console.log("");
  }

  // Summary table (compact view)
  console.log("=".repeat(72));
  console.log("  SUMMARY TABLE");
  console.log("=".repeat(72));
  console.log(
    "  #  Quality  SEO  Words   Locale  Keyword",
  );
  console.log("  " + "-".repeat(68));
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i] as {
      keyword: string;
      locale: string;
      quality_score: number | null;
      seo_score: number | null;
      word_count: number | null;
      assembled_html: string | null;
    };
    const rank = String(i + 1).padStart(2);
    const q = formatScore(d.quality_score);
    const s = formatScore(d.seo_score);
    const wc =
      d.word_count != null
        ? String(d.word_count).padStart(6)
        : d.assembled_html
          ? ("~" + Math.round(d.assembled_html.length / 5)).padStart(6)
          : "   n/a";
    const locale = (d.locale || "en").padEnd(6);
    const kw = truncate(d.keyword, 38);
    console.log(`  ${rank}  ${q}  ${s}  ${wc}  ${locale}  ${kw}`);
  }
  console.log("");
  console.log(
    `Total reservoir (${SITE_ID}): ${totalReservoir} article(s)`,
  );
  console.log("");
  console.log(
    'To publish the best ones: trigger "Publish Ready" from the dashboard,',
  );
  console.log(
    "or run: npx tsx --tsconfig tsconfig.json scripts/list-reservoir.ts",
  );
  console.log("");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
