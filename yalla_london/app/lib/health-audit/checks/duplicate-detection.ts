/**
 * Health Audit — Duplicate Detection Checks
 *
 * 3 checks: duplicateMetaDescriptions, orphanPages, brokenInternalLinks.
 */

import {
  type AuditConfig,
  type CheckResult,
  makeResult,
  runCheck,
} from "@/lib/health-audit/types";

/* ------------------------------------------------------------------ */
/* 1. Duplicate meta descriptions                                      */
/* ------------------------------------------------------------------ */
async function duplicateMetaDescriptions(
  config: AuditConfig
): Promise<CheckResult> {
  const { prisma } = await import("@/lib/db");

  const posts = await prisma.blogPost.findMany({
    where: {
      published: true,
      siteId: config.siteId,
      deletedAt: null,
      meta_description_en: { not: "" },
    },
    select: { id: true, slug: true, meta_description_en: true },
  });

  if (posts.length === 0) {
    return makeResult("skip", { reason: "No published articles with meta descriptions found" }) as CheckResult;
  }

  // Group by exact meta_description_en
  const groups = new Map<string, { id: string; slug: string }[]>();
  for (const post of posts) {
    const desc = (post.meta_description_en ?? "").trim();
    if (!desc) continue;
    const existing = groups.get(desc) ?? [];
    existing.push({ id: post.id, slug: post.slug });
    groups.set(desc, existing);
  }

  const duplicateGroups: { metaDescription: string; slugs: string[] }[] = [];
  for (const [desc, members] of groups) {
    if (members.length > 1) {
      duplicateGroups.push({
        metaDescription: desc.length > 80 ? desc.slice(0, 80) + "..." : desc,
        slugs: members.map((m) => m.slug),
      });
    }
  }

  const totalDuplicates = duplicateGroups.length;

  const details: Record<string, unknown> = {
    totalArticlesChecked: posts.length,
    duplicateGroupCount: totalDuplicates,
    duplicateGroups: duplicateGroups.slice(0, 10), // limit output
  };

  if (totalDuplicates === 0) {
    return makeResult("pass", details) as CheckResult;
  }

  if (totalDuplicates <= 3) {
    return makeResult("warn", details, {
      action: `${totalDuplicates} group(s) of articles share identical meta descriptions. Rewrite them to be unique for better CTR.`,
    }) as CheckResult;
  }

  return makeResult("fail", details, {
    error: `${totalDuplicates} groups of duplicate meta descriptions found`,
    action: "Multiple articles share identical meta descriptions. This hurts SEO — each page needs a unique meta description.",
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 2. Orphan pages (no inbound internal links)                         */
/* ------------------------------------------------------------------ */
async function orphanPages(
  config: AuditConfig
): Promise<CheckResult> {
  const { prisma } = await import("@/lib/db");

  const posts = await prisma.blogPost.findMany({
    where: { published: true, siteId: config.siteId, deletedAt: null },
    select: { slug: true, content_en: true },
    take: 50,
    orderBy: { created_at: "desc" },
  });

  if (posts.length === 0) {
    return makeResult("skip", { reason: "No published articles found" }) as CheckResult;
  }

  // Build a set of all slugs
  const slugList = posts.map((p) => p.slug);
  const allSlugs = new Set<string>(slugList);

  // For each slug, check if any other article links to it
  const inboundCounts = new Map<string, number>();
  for (const slug of slugList) {
    inboundCounts.set(slug, 0);
  }

  // Scan every article's content_en for href="/blog/{slug}" references
  const linkPattern = /href=["'](?:\/blog\/|\/ar\/blog\/)([a-z0-9-]+)/gi;

  for (const post of posts) {
    const content = post.content_en ?? "";
    let match: RegExpExecArray | null;
    const seen = new Set<string>(); // avoid counting multiple links to same target in one article

    // Reset lastIndex
    linkPattern.lastIndex = 0;
    while ((match = linkPattern.exec(content)) !== null) {
      const targetSlug = match[1];
      if (targetSlug !== post.slug && allSlugs.has(targetSlug) && !seen.has(targetSlug)) {
        seen.add(targetSlug);
        inboundCounts.set(targetSlug, (inboundCounts.get(targetSlug) ?? 0) + 1);
      }
    }
  }

  const orphans = Array.from(inboundCounts.entries())
    .filter(([, count]) => count === 0)
    .map(([slug]) => slug);

  const details: Record<string, unknown> = {
    totalArticlesChecked: posts.length,
    orphanCount: orphans.length,
    orphanSlugs: orphans.slice(0, 15), // limit output
  };

  if (orphans.length <= 2) {
    return makeResult("pass", details) as CheckResult;
  }

  if (orphans.length <= 5) {
    return makeResult("warn", details, {
      action: `${orphans.length} articles have no inbound internal links (orphans). Add links from related articles to improve discoverability.`,
    }) as CheckResult;
  }

  return makeResult("fail", details, {
    error: `${orphans.length} orphan articles found (no inbound internal links)`,
    action: "Many articles are unreachable via internal links. Add contextual internal links from related content to fix crawl isolation.",
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 3. Broken internal links                                            */
/* ------------------------------------------------------------------ */
async function brokenInternalLinks(
  config: AuditConfig
): Promise<CheckResult> {
  const { prisma } = await import("@/lib/db");

  // Get 5 random published articles
  const total = await prisma.blogPost.count({
    where: { published: true, siteId: config.siteId, deletedAt: null },
  });

  if (total === 0) {
    return makeResult("skip", { reason: "No published articles found" }) as CheckResult;
  }

  const skip = Math.max(0, Math.floor(Math.random() * Math.max(total - 5, 0)));
  const posts = await prisma.blogPost.findMany({
    where: { published: true, siteId: config.siteId, deletedAt: null },
    select: { slug: true, content_en: true },
    skip,
    take: 5,
    orderBy: { created_at: "desc" },
  });

  // Extract all /blog/{slug} links from each article
  const linkPattern = /href=["']\/blog\/([a-z0-9-]+)["']/gi;
  const brokenLinks: { sourceSlug: string; targetSlug: string }[] = [];
  let totalLinksChecked = 0;

  for (const post of posts) {
    const content = post.content_en ?? "";
    const targetSlugs = new Set<string>();

    linkPattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = linkPattern.exec(content)) !== null) {
      targetSlugs.add(match[1]);
    }

    if (targetSlugs.size === 0) continue;

    totalLinksChecked += targetSlugs.size;

    // Batch check which target slugs exist as published posts
    const existingPosts = await prisma.blogPost.findMany({
      where: {
        slug: { in: Array.from(targetSlugs) },
        published: true,
        siteId: config.siteId,
        deletedAt: null,
      },
      select: { slug: true },
    });

    const existingSlugs = new Set(existingPosts.map((p) => p.slug));

    for (const targetSlug of targetSlugs) {
      if (!existingSlugs.has(targetSlug)) {
        brokenLinks.push({ sourceSlug: post.slug, targetSlug });
      }
    }
  }

  const details: Record<string, unknown> = {
    articlesChecked: posts.length,
    totalLinksChecked,
    brokenLinkCount: brokenLinks.length,
    brokenLinks: brokenLinks.slice(0, 20), // limit output
  };

  if (brokenLinks.length === 0) {
    return makeResult("pass", details) as CheckResult;
  }

  if (brokenLinks.length <= 3) {
    return makeResult("warn", details, {
      action: `${brokenLinks.length} broken internal link(s) found. Update or remove links to non-existent articles: ${brokenLinks.map((b) => `${b.sourceSlug} → ${b.targetSlug}`).join(", ")}`,
    }) as CheckResult;
  }

  return makeResult("fail", details, {
    error: `${brokenLinks.length} broken internal links detected`,
    action: "Multiple internal links point to non-existent articles. This creates dead ends for users and crawlers. Fix or remove broken links.",
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* Export runner                                                        */
/* ------------------------------------------------------------------ */
export async function runDuplicateDetectionChecks(
  config: AuditConfig
): Promise<Record<string, CheckResult>> {
  const [dupes, orphans, broken] = await Promise.all([
    runCheck("duplicateMetaDescriptions", duplicateMetaDescriptions, config, 15000),
    runCheck("orphanPages", orphanPages, config, 20000),
    runCheck("brokenInternalLinks", brokenInternalLinks, config, 20000),
  ]);

  return {
    duplicateMetaDescriptions: dupes,
    orphanPages: orphans,
    brokenInternalLinks: broken,
  };
}
