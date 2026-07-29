#!/usr/bin/env tsx
/**
 * Production SEO Cleanup Script
 *
 * Single script with --dry-run (default) and --apply modes.
 * Fixes duplicate articles, empty content, internal tags, slug artifacts,
 * and generates redirect map + cleanup report.
 *
 * Usage:
 *   npx tsx scripts/production-seo-cleanup.ts              # dry-run (default)
 *   npx tsx scripts/production-seo-cleanup.ts --apply       # apply changes
 *   npx tsx scripts/production-seo-cleanup.ts --site=yalla-london  # specific site
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes("--apply");
const SITE_ID =
  process.argv.find((a) => a.startsWith("--site="))?.split("=")[1] ||
  "yalla-london";

// Internal tags that should never appear in public article meta
const INTERNAL_TAGS = new Set([
  "auto-generated",
  "reservoir-pipeline",
  "needs-review",
  "needs-expansion",
]);
const INTERNAL_TAG_PREFIXES = ["site-", "primary-", "missing-"];

// Slug patterns indicating pipeline artifacts
const SLUG_ARTIFACT_PATTERN = /-[0-9a-f]{4,}$|-\d+-chars$/;

// Duplicate clusters: non-canonical → canonical slug
const DUPLICATE_CLUSTERS: Record<string, string> = {
  "best-halal-fine-dining-restaurants-london-2025-comparison-79455678":
    "best-halal-fine-dining-restaurants-london-2025-comparison",
  "best-halal-fine-dining-restaurants-london-2025-comparison-9088893f":
    "best-halal-fine-dining-restaurants-london-2025-comparison",
  "best-halal-fine-dining-restaurants-london-2025-comparison-fasz":
    "best-halal-fine-dining-restaurants-london-2025-comparison",
  "best-halal-fine-dining-restaurants-london-2025-comparison-sily":
    "best-halal-fine-dining-restaurants-london-2025-comparison",
  "best-luxury-spas-london-2026-women-friendly-halal-1xfb":
    "best-luxury-spas-london-2026-women-friendly-halal",
  "best-luxury-spas-london-women-friendly-halal":
    "best-luxury-spas-london-2026-women-friendly-halal",
  "luxury-spas-london-arabic":
    "best-luxury-spas-london-2026-women-friendly-halal",
  "london-transport-guide-tourists-2026-tube-bus-taxi-1pwq":
    "london-transport-guide-tourists-2026-tube-bus-taxi",
  "edgware-road-london-complete-guide-arab-area-c4f47971":
    "edgware-road-london-complete-guide-arab-area",
  "london-islamic-heritage-gems-2026-02-19-0e0828e5":
    "london-islamic-heritage-gems-2026-02-19-0d2d371b",
  "halal-restaurants-london-luxury-2024-guide-2026-02-20":
    "halal-restaurants-london-luxury-2024-guide",
  "luxury-hotels-london-arab-families-2025-comparison":
    "luxury-hotels-london-arab-families",
  "muslim-friendly-hotels-london-2026-prayer-facilities-halal":
    "luxury-hotels-london-arab-families",
};

interface CleanupStats {
  internalTagsStripped: number;
  emptyArticlesUnpublished: number;
  duplicatesUnpublished: number;
  slugArtifactsFixed: number;
  staleDatedFlagged: number;
  thinFlagged: number;
  redirectsGenerated: number;
}

const stats: CleanupStats = {
  internalTagsStripped: 0,
  emptyArticlesUnpublished: 0,
  duplicatesUnpublished: 0,
  slugArtifactsFixed: 0,
  staleDatedFlagged: 0,
  thinFlagged: 0,
  redirectsGenerated: 0,
};

const redirectMap: Record<string, string> = {};
const reportLines: string[] = [];

function log(msg: string) {
  console.log(`${DRY_RUN ? "[DRY-RUN] " : ""}${msg}`);
  reportLines.push(msg);
}

async function step1_stripInternalTags() {
  log("\n═══ Step 1: Strip internal tags from BlogPost.tags ═══");

  const posts = await prisma.blogPost.findMany({
    where: { siteId: SITE_ID },
    select: { id: true, slug: true, tags: true },
  });

  for (const post of posts) {
    const cleanTags = post.tags.filter(
      (t) =>
        !INTERNAL_TAGS.has(t) &&
        !INTERNAL_TAG_PREFIXES.some((prefix) => t.startsWith(prefix))
    );

    if (cleanTags.length !== post.tags.length) {
      const removed = post.tags.filter((t) => !cleanTags.includes(t));
      log(`  ${post.slug}: removing tags [${removed.join(", ")}]`);
      stats.internalTagsStripped++;

      if (!DRY_RUN) {
        await prisma.blogPost.update({
          where: { id: post.id },
          data: { tags: cleanTags },
        });
      }
    }
  }

  log(`  → ${stats.internalTagsStripped} posts had internal tags stripped`);
}

async function step2_unpublishEmptyArticles() {
  log("\n═══ Step 2: Unpublish empty/thin articles ═══");

  const posts = await prisma.blogPost.findMany({
    where: { siteId: SITE_ID, published: true },
    select: { id: true, slug: true, content_en: true },
  });

  for (const post of posts) {
    const textContent = post.content_en.replace(/<[^>]*>/g, "").trim();
    if (textContent.length < 100) {
      log(
        `  ${post.slug}: content_en only ${textContent.length} chars → unpublish`
      );
      stats.emptyArticlesUnpublished++;

      if (!DRY_RUN) {
        await prisma.blogPost.update({
          where: { id: post.id },
          data: { published: false },
        });
      }
    }
  }

  log(
    `  → ${stats.emptyArticlesUnpublished} empty articles ${DRY_RUN ? "would be" : "were"} unpublished`
  );
}

async function step3_resolveDuplicateClusters() {
  log("\n═══ Step 3: Resolve duplicate article clusters ═══");

  for (const [nonCanonicalSlug, canonicalSlug] of Object.entries(
    DUPLICATE_CLUSTERS
  )) {
    const post = await prisma.blogPost.findFirst({
      where: { slug: nonCanonicalSlug, siteId: SITE_ID },
      select: { id: true, published: true },
    });

    if (post) {
      if (post.published) {
        log(`  ${nonCanonicalSlug} → unpublish (canonical: ${canonicalSlug})`);
        stats.duplicatesUnpublished++;

        if (!DRY_RUN) {
          await prisma.blogPost.update({
            where: { id: post.id },
            data: { published: false },
          });
        }
      }

      redirectMap[`/blog/${nonCanonicalSlug}`] = `/blog/${canonicalSlug}`;
      stats.redirectsGenerated++;
    } else {
      log(`  ${nonCanonicalSlug}: not found in DB (may already be removed)`);
    }
  }

  log(
    `  → ${stats.duplicatesUnpublished} duplicates ${DRY_RUN ? "would be" : "were"} unpublished`
  );
  log(`  → ${stats.redirectsGenerated} redirects generated`);
}

async function step4_fixSlugArtifacts() {
  log("\n═══ Step 4: Fix slug artifacts ═══");

  const posts = await prisma.blogPost.findMany({
    where: { siteId: SITE_ID, published: true },
    select: { id: true, slug: true },
  });

  for (const post of posts) {
    if (SLUG_ARTIFACT_PATTERN.test(post.slug)) {
      // Check if clean version exists
      const cleanSlug = post.slug.replace(SLUG_ARTIFACT_PATTERN, "");
      const cleanPost = await prisma.blogPost.findFirst({
        where: { slug: cleanSlug, siteId: SITE_ID },
      });

      if (cleanPost) {
        log(`  ${post.slug}: clean counterpart exists → unpublish this one`);
        stats.slugArtifactsFixed++;
        redirectMap[`/blog/${post.slug}`] = `/blog/${cleanSlug}`;

        if (!DRY_RUN) {
          await prisma.blogPost.update({
            where: { id: post.id },
            data: { published: false },
          });
        }
      } else {
        log(
          `  ${post.slug}: no clean counterpart — renaming slug to ${cleanSlug}`
        );
        stats.slugArtifactsFixed++;

        if (!DRY_RUN) {
          try {
            await prisma.blogPost.update({
              where: { id: post.id },
              data: { slug: cleanSlug },
            });
          } catch (e) {
            log(
              `    ⚠ Rename failed (slug collision?): ${e instanceof Error ? e.message : e}`
            );
          }
        }
      }
    }
  }

  log(`  → ${stats.slugArtifactsFixed} slug artifacts fixed`);
}

async function step5_flagStaleDated() {
  log("\n═══ Step 5: Flag stale-dated articles ═══");

  const posts = await prisma.blogPost.findMany({
    where: {
      siteId: SITE_ID,
      published: true,
      OR: [
        { title_en: { contains: "2024" } },
        { title_en: { contains: "2025" } },
      ],
    },
    select: { id: true, slug: true, title_en: true, tags: true },
  });

  for (const post of posts) {
    if (!post.tags.includes("needs-date-refresh")) {
      log(`  ${post.slug}: "${post.title_en}" → flagging needs-date-refresh`);
      stats.staleDatedFlagged++;

      if (!DRY_RUN) {
        await prisma.blogPost.update({
          where: { id: post.id },
          data: { tags: [...post.tags, "needs-date-refresh"] },
        });
      }
    }
  }

  log(
    `  → ${stats.staleDatedFlagged} stale-dated articles flagged for refresh`
  );
}

async function step6_flagThinStrategicArticles() {
  log("\n═══ Step 6: Flag thin strategic articles for rewrite ═══");

  const strategicSlugs = [
    "ramadan-london-2026-complete-guide-iftar-suhoor",
    "best-halal-restaurants-central-london-2025",
    "best-halal-fine-dining-restaurants-london-2025-comparison",
    "best-halal-luxury-restaurants-london",
  ];

  for (const slug of strategicSlugs) {
    const post = await prisma.blogPost.findFirst({
      where: { slug, siteId: SITE_ID },
      select: { id: true, content_en: true, tags: true },
    });

    if (post) {
      const wordCount = post.content_en
        .replace(/<[^>]*>/g, "")
        .split(/\s+/).length;
      if (wordCount < 1200 && !post.tags.includes("needs-rewrite")) {
        log(
          `  ${slug}: ${wordCount} words (needs 1,200+) → flagging needs-rewrite`
        );
        stats.thinFlagged++;

        if (!DRY_RUN) {
          await prisma.blogPost.update({
            where: { id: post.id },
            data: { tags: [...post.tags, "needs-rewrite"] },
          });
        }
      }
    }
  }

  log(`  → ${stats.thinFlagged} strategic articles flagged for rewrite`);
}

async function step7_generateOutputs() {
  log("\n═══ Step 7: Generate outputs ═══");

  // Redirect map
  const redirectMapJson = JSON.stringify(redirectMap, null, 2);
  log(`  Redirect map: ${Object.keys(redirectMap).length} entries`);

  if (!DRY_RUN) {
    const fs = await import("fs");
    const path = await import("path");

    const outputDir = path.join(process.cwd(), "docs", "seo");
    fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(
      path.join(outputDir, "redirect-map.json"),
      redirectMapJson
    );
    log(`  → Written to docs/seo/redirect-map.json`);

    fs.writeFileSync(
      path.join(outputDir, "cleanup-report.md"),
      `# SEO Cleanup Report\n\nDate: ${new Date().toISOString()}\nSite: ${SITE_ID}\nMode: ${DRY_RUN ? "DRY RUN" : "APPLIED"}\n\n## Summary\n\n| Metric | Count |\n|--------|-------|\n| Internal tags stripped | ${stats.internalTagsStripped} |\n| Empty articles unpublished | ${stats.emptyArticlesUnpublished} |\n| Duplicates unpublished | ${stats.duplicatesUnpublished} |\n| Slug artifacts fixed | ${stats.slugArtifactsFixed} |\n| Stale-dated flagged | ${stats.staleDatedFlagged} |\n| Thin strategic flagged | ${stats.thinFlagged} |\n| Redirects generated | ${stats.redirectsGenerated} |\n\n## Detail Log\n\n${reportLines.join("\n")}\n`
    );
    log(`  → Written to docs/seo/cleanup-report.md`);
  }

  // Summary
  log("\n═══ SUMMARY ═══");
  log(`  Internal tags stripped:     ${stats.internalTagsStripped}`);
  log(`  Empty articles unpublished: ${stats.emptyArticlesUnpublished}`);
  log(`  Duplicates unpublished:     ${stats.duplicatesUnpublished}`);
  log(`  Slug artifacts fixed:       ${stats.slugArtifactsFixed}`);
  log(`  Stale-dated flagged:        ${stats.staleDatedFlagged}`);
  log(`  Thin strategic flagged:     ${stats.thinFlagged}`);
  log(`  Redirects generated:        ${stats.redirectsGenerated}`);
  log(
    `\n  Mode: ${DRY_RUN ? "DRY RUN — no changes applied. Run with --apply to execute." : "APPLIED — changes committed to database."}`
  );
}

async function main() {
  log(`\n╔══════════════════════════════════════════════════╗`);
  log(`║  Production SEO Cleanup — ${SITE_ID}`);
  log(`║  Mode: ${DRY_RUN ? "DRY RUN" : "⚠️  APPLY (changes will be committed)"}`);
  log(`╚══════════════════════════════════════════════════╝`);

  try {
    await step1_stripInternalTags();
    await step2_unpublishEmptyArticles();
    await step3_resolveDuplicateClusters();
    await step4_fixSlugArtifacts();
    await step5_flagStaleDated();
    await step6_flagThinStrategicArticles();
    await step7_generateOutputs();
  } catch (error) {
    console.error(
      "Cleanup failed:",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
