/**
 * Health Audit — Content Quality Checks
 *
 * 3 checks: internalLinkDensity, imageOptimization, contentStructure.
 */

import {
  type AuditConfig,
  type CheckResult,
  makeResult,
  runCheck,
} from "@/lib/health-audit/types";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function countWords(text: string): number {
  const stripped = stripHtml(text);
  if (!stripped) return 0;
  return stripped.split(/\s+/).filter((w) => w.length > 0).length;
}

async function fetchPageHtml(
  url: string,
  signal?: AbortSignal
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: signal ?? controller.signal,
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function getRandomPublishedSlugs(
  siteId: string,
  count: number
): Promise<string[]> {
  const { prisma } = await import("@/lib/db");
  const total = await prisma.blogPost.count({
    where: { published: true, siteId, deletedAt: null },
  });
  if (total === 0) return [];

  const skip = Math.max(0, Math.floor(Math.random() * Math.max(total - count, 0)));
  const posts = await prisma.blogPost.findMany({
    where: { published: true, siteId, deletedAt: null },
    select: { slug: true },
    skip,
    take: count,
    orderBy: { created_at: "desc" },
  });
  return posts.map((p) => p.slug);
}

/* ------------------------------------------------------------------ */
/* 1. Internal link density                                            */
/* ------------------------------------------------------------------ */
async function internalLinkDensity(
  config: AuditConfig
): Promise<CheckResult> {
  const slugs = await getRandomPublishedSlugs(config.siteId, 5);

  if (slugs.length === 0) {
    return makeResult("skip", { reason: "No published articles found" }) as CheckResult;
  }

  const siteHost = new URL(config.siteUrl).host;
  const internalLinkPattern = new RegExp(
    `href=["'](?:https?://${siteHost.replace(/\./g, "\\.")})?/blog/[^"']+["']`,
    "gi"
  );
  const placeholderPattern = /TOPIC_SLUG|PLACEHOLDER|TODO_LINK/i;

  let totalLinks = 0;
  let placeholdersFound = 0;
  const perArticle: { slug: string; internalLinks: number; hasPlaceholder: boolean }[] = [];

  for (const slug of slugs) {
    const html = await fetchPageHtml(`${config.siteUrl}/blog/${slug}`, config.signal);
    if (!html) {
      perArticle.push({ slug, internalLinks: 0, hasPlaceholder: false });
      continue;
    }

    const matches = html.match(internalLinkPattern) ?? [];
    const hasBadPlaceholder = placeholderPattern.test(html);
    if (hasBadPlaceholder) placeholdersFound++;

    totalLinks += matches.length;
    perArticle.push({ slug, internalLinks: matches.length, hasPlaceholder: hasBadPlaceholder });
  }

  const avg = slugs.length > 0 ? Math.round((totalLinks / slugs.length) * 10) / 10 : 0;

  const details: Record<string, unknown> = {
    articlesChecked: slugs.length,
    totalInternalLinks: totalLinks,
    avgInternalLinks: avg,
    placeholdersFound,
    perArticle,
  };

  if (placeholdersFound > 0) {
    return makeResult("fail", details, {
      error: `${placeholdersFound} article(s) contain broken link placeholders`,
      action: "Remove TOPIC_SLUG / PLACEHOLDER strings from published content.",
    }) as CheckResult;
  }

  if (avg === 0) {
    return makeResult("fail", details, {
      error: "No internal links found across sampled articles",
      action: "Add internal links to articles. Minimum 3 per article per quality gate.",
    }) as CheckResult;
  }

  if (avg < 3) {
    return makeResult("warn", details, {
      action: `Average internal links: ${avg}. Target is 3+ per article.`,
    }) as CheckResult;
  }

  return makeResult("pass", details) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 2. Image optimization                                               */
/* ------------------------------------------------------------------ */
async function imageOptimization(
  config: AuditConfig
): Promise<CheckResult> {
  const slugs = await getRandomPublishedSlugs(config.siteId, 3);

  if (slugs.length === 0) {
    return makeResult("skip", { reason: "No published articles found" }) as CheckResult;
  }

  const imgTagPattern = /<img\s[^>]*>/gi;
  const altPattern = /\balt\s*=\s*["'][^"']+["']/i;
  const optimizedSrcPattern = /\/_next\/image|\/images\/|\.webp|\.avif/i;

  let totalImages = 0;
  let imagesWithAlt = 0;
  let imagesOptimized = 0;
  const perArticle: { slug: string; images: number; withAlt: number; optimized: number }[] = [];

  for (const slug of slugs) {
    const html = await fetchPageHtml(`${config.siteUrl}/blog/${slug}`, config.signal);
    if (!html) {
      perArticle.push({ slug, images: 0, withAlt: 0, optimized: 0 });
      continue;
    }

    const imgTags = html.match(imgTagPattern) ?? [];
    let withAlt = 0;
    let optimized = 0;

    for (const tag of imgTags) {
      if (altPattern.test(tag)) withAlt++;
      if (optimizedSrcPattern.test(tag)) optimized++;
    }

    totalImages += imgTags.length;
    imagesWithAlt += withAlt;
    imagesOptimized += optimized;
    perArticle.push({ slug, images: imgTags.length, withAlt, optimized });
  }

  const details: Record<string, unknown> = {
    articlesChecked: slugs.length,
    totalImages,
    imagesWithAlt,
    imagesOptimized,
    altCoveragePercent: totalImages > 0 ? Math.round((imagesWithAlt / totalImages) * 100) : 100,
    perArticle,
  };

  if (totalImages === 0) {
    return makeResult("warn", details, {
      action: "No images found in sampled articles. Images improve engagement and SEO.",
    }) as CheckResult;
  }

  const altPct = (imagesWithAlt / totalImages) * 100;

  if (altPct < 50) {
    return makeResult("fail", details, {
      error: `Only ${Math.round(altPct)}% of images have alt text`,
      action: "Add descriptive alt text to all images for accessibility and SEO.",
    }) as CheckResult;
  }

  if (altPct < 100) {
    return makeResult("warn", details, {
      action: `${totalImages - imagesWithAlt} image(s) missing alt text. All images should have descriptive alt.`,
    }) as CheckResult;
  }

  return makeResult("pass", details) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 3. Content structure (DB-driven)                                    */
/* ------------------------------------------------------------------ */
async function contentStructure(
  config: AuditConfig
): Promise<CheckResult> {
  const { prisma } = await import("@/lib/db");

  const posts = await prisma.blogPost.findMany({
    where: { published: true, siteId: config.siteId, deletedAt: null },
    select: { slug: true, content_en: true },
    take: 5,
    orderBy: { created_at: "desc" },
  });

  if (posts.length === 0) {
    return makeResult("skip", { reason: "No published articles found" }) as CheckResult;
  }

  const h2Pattern = /<h2[\s>]/gi;
  const h3Pattern = /<h3[\s>]/gi;

  let shortCount = 0;
  let lowH2Count = 0;
  const perArticle: { slug: string; wordCount: number; h2Count: number; h3Count: number }[] = [];

  for (const post of posts) {
    const content = post.content_en ?? "";
    const words = countWords(content);
    const h2s = (content.match(h2Pattern) ?? []).length;
    const h3s = (content.match(h3Pattern) ?? []).length;

    if (words < 1000) shortCount++;
    if (h2s < 3) lowH2Count++;

    perArticle.push({ slug: post.slug, wordCount: words, h2Count: h2s, h3Count: h3s });
  }

  const details: Record<string, unknown> = {
    articlesChecked: posts.length,
    belowWordMinimum: shortCount,
    belowH2Minimum: lowH2Count,
    perArticle,
  };

  if (shortCount > 1 || lowH2Count > 1) {
    return makeResult("fail", details, {
      error: `${shortCount} article(s) below 1000 words, ${lowH2Count} below 3 H2s`,
      action: "Expand thin articles and add heading structure. Quality gate requires 1000+ words and 3+ H2 headings.",
    }) as CheckResult;
  }

  if (shortCount > 0 || lowH2Count > 0) {
    return makeResult("warn", details, {
      action: `Some articles are below content standards: ${shortCount} thin, ${lowH2Count} low-H2. Review and improve.`,
    }) as CheckResult;
  }

  return makeResult("pass", details) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* Export runner                                                        */
/* ------------------------------------------------------------------ */
export async function runContentQualityChecks(
  config: AuditConfig
): Promise<Record<string, CheckResult>> {
  const [links, images, structure] = await Promise.all([
    runCheck("internalLinkDensity", internalLinkDensity, config, 45000),
    runCheck("imageOptimization", imageOptimization, config, 30000),
    runCheck("contentStructure", contentStructure, config, 15000),
  ]);

  return {
    internalLinkDensity: links,
    imageOptimization: images,
    contentStructure: structure,
  };
}
