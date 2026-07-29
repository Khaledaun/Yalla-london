#!/usr/bin/env tsx
/**
 * DB Artifact Scan + Duplicate Article Consolidation
 *
 * Two-phase script:
 *   Phase 1: Find & fix title/meta artifacts in existing BlogPosts
 *   Phase 2: Find & consolidate duplicate articles (by title similarity, slug overlap, content overlap)
 *
 * Usage:
 *   npx tsx scripts/db-artifact-dedup.ts                          # dry-run scan (default)
 *   npx tsx scripts/db-artifact-dedup.ts --apply                  # apply fixes
 *   npx tsx scripts/db-artifact-dedup.ts --site=yalla-london      # specific site
 *   npx tsx scripts/db-artifact-dedup.ts --phase=artifacts        # only phase 1
 *   npx tsx scripts/db-artifact-dedup.ts --phase=duplicates       # only phase 2
 *   npx tsx scripts/db-artifact-dedup.ts --similarity=0.7         # lower similarity threshold (default 0.75)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes("--apply");
const SITE_ID =
  process.argv.find((a) => a.startsWith("--site="))?.split("=")[1] ||
  "yalla-london";
const PHASE_FILTER =
  process.argv.find((a) => a.startsWith("--phase="))?.split("=")[1] || "all";
const SIMILARITY_THRESHOLD = parseFloat(
  process.argv.find((a) => a.startsWith("--similarity="))?.split("=")[1] ||
    "0.75"
);

// ─── Title Sanitizer (inline to avoid Next.js import issues in scripts) ───

const CHAR_COUNT_PATTERN =
  /\s*\((?:under\s+)?\d+(?:\s*[-–]\s*\d+)?\s*(?:chars?|characters?)\)/gi;
const CHAR_SUFFIX_PATTERN = /\s*[-–]\s*(?:under\s+)?\d+\s*chars?$/i;
const INSTRUCTION_ECHOES = [
  /\bSEO[- ]optimized\b/gi,
  /\bincluding keyword\b/gi,
  /\bwith keyword and CTA\b/gi,
  /\bMeta description\s+\d+[-–]\d+\s*chars?\b/gi,
  /\bSEO title\b/gi,
];
const TRAILING_YEAR = /\s+20[2-3]\d$/;
const SLUG_ARTIFACT_PATTERN = /-[0-9a-f]{4,}$|-\d+-chars$/;

function sanitizeTitle(title: string): string {
  if (!title) return title;
  let cleaned = title;
  cleaned = cleaned.replace(CHAR_COUNT_PATTERN, "");
  cleaned = cleaned.replace(CHAR_SUFFIX_PATTERN, "");
  for (const pattern of INSTRUCTION_ECHOES) {
    cleaned = cleaned.replace(pattern, "");
  }
  cleaned = cleaned.replace(TRAILING_YEAR, "");
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  cleaned = cleaned.replace(/\s*[|–-]\s*$/, "").trim();
  if (cleaned.length > 60) {
    const truncated = cleaned.substring(0, 57);
    const lastSpace = truncated.lastIndexOf(" ");
    cleaned = lastSpace > 20 ? truncated.substring(0, lastSpace) : truncated;
  }
  return cleaned;
}

function sanitizeMetaDescription(desc: string): string {
  if (!desc) return desc;
  let cleaned = desc;
  cleaned = cleaned.replace(CHAR_COUNT_PATTERN, "");
  for (const pattern of INSTRUCTION_ECHOES) {
    cleaned = cleaned.replace(pattern, "");
  }
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  if (cleaned.length > 160) {
    const truncated = cleaned.substring(0, 155);
    const lastSpace = truncated.lastIndexOf(" ");
    cleaned = lastSpace > 80 ? truncated.substring(0, lastSpace) : truncated;
    if (
      !cleaned.endsWith(".") &&
      !cleaned.endsWith("!") &&
      !cleaned.endsWith("?")
    ) {
      cleaned += "...";
    }
  }
  return cleaned;
}

function hasTitleArtifacts(title: string): boolean {
  if (!title) return false;
  // Reset lastIndex for global regexes
  CHAR_COUNT_PATTERN.lastIndex = 0;
  CHAR_SUFFIX_PATTERN.lastIndex = 0;
  const hasCharCount = CHAR_COUNT_PATTERN.test(title);
  CHAR_COUNT_PATTERN.lastIndex = 0;
  const hasCharSuffix = CHAR_SUFFIX_PATTERN.test(title);
  CHAR_SUFFIX_PATTERN.lastIndex = 0;
  const hasInstructionEcho = INSTRUCTION_ECHOES.some((p) => {
    p.lastIndex = 0;
    const result = p.test(title);
    p.lastIndex = 0;
    return result;
  });
  return hasCharCount || hasCharSuffix || hasInstructionEcho;
}

// ─── Similarity Utilities ───

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "can",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "your",
  "our",
  "their",
  "my",
  "from",
  "into",
  "best",
  "top",
  "guide",
  "complete",
]);

function extractKeywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function normalizeSlug(slug: string): string {
  return slug
    .replace(SLUG_ARTIFACT_PATTERN, "") // strip hash suffixes
    .replace(/-20\d{2}(-\d{2}(-\d{2})?)?/g, "") // strip date components
    .replace(/-+/g, "-") // collapse dashes
    .replace(/^-|-$/g, ""); // trim dashes
}

// ─── Stats & Reporting ───

interface Stats {
  titleArtifactsFound: number;
  titleArtifactsFixed: number;
  metaArtifactsFound: number;
  metaArtifactsFixed: number;
  metaOverlength: number;
  metaOverlengthFixed: number;
  duplicateClusters: number;
  duplicateArticles: number;
  duplicatesUnpublished: number;
  redirectsGenerated: number;
}

const stats: Stats = {
  titleArtifactsFound: 0,
  titleArtifactsFixed: 0,
  metaArtifactsFound: 0,
  metaArtifactsFixed: 0,
  metaOverlength: 0,
  metaOverlengthFixed: 0,
  duplicateClusters: 0,
  duplicateArticles: 0,
  duplicatesUnpublished: 0,
  redirectsGenerated: 0,
};

const reportLines: string[] = [];
const redirectMap: Record<string, string> = {};

function log(msg: string) {
  console.log(`${DRY_RUN ? "[DRY-RUN] " : ""}${msg}`);
  reportLines.push(msg);
}

// ─── Phase 1: Artifact Scan & Fix ───

async function phase1_artifacts() {
  log("\n╔══════════════════════════════════════════════════╗");
  log("║  Phase 1: Title & Meta Artifact Scan             ║");
  log("╚══════════════════════════════════════════════════╝");

  const posts = await prisma.blogPost.findMany({
    where: { siteId: SITE_ID, deletedAt: null },
    select: {
      id: true,
      slug: true,
      title_en: true,
      title_ar: true,
      meta_title_en: true,
      meta_title_ar: true,
      meta_description_en: true,
      meta_description_ar: true,
      published: true,
    },
    orderBy: { created_at: "desc" },
  });

  log(`\n  Scanning ${posts.length} articles for artifacts...\n`);

  // 1a. Title artifacts
  log("  ── Title Artifacts ──");
  for (const post of posts) {
    const pub = post.published ? "PUB" : "DRAFT";

    // Check title_en
    if (hasTitleArtifacts(post.title_en)) {
      const cleaned = sanitizeTitle(post.title_en);
      log(
        `  [${pub}] ${post.slug}`
      );
      log(`    title_en: "${post.title_en}"`);
      log(`    cleaned:  "${cleaned}"`);
      stats.titleArtifactsFound++;

      if (!DRY_RUN && cleaned !== post.title_en) {
        await prisma.blogPost.update({
          where: { id: post.id },
          data: { title_en: cleaned },
        });
        stats.titleArtifactsFixed++;
      }
    }

    // Check meta_title_en
    if (post.meta_title_en && hasTitleArtifacts(post.meta_title_en)) {
      const cleaned = sanitizeTitle(post.meta_title_en);
      log(
        `  [${pub}] ${post.slug}`
      );
      log(`    meta_title_en: "${post.meta_title_en}"`);
      log(`    cleaned:       "${cleaned}"`);
      stats.metaArtifactsFound++;

      if (!DRY_RUN && cleaned !== post.meta_title_en) {
        await prisma.blogPost.update({
          where: { id: post.id },
          data: { meta_title_en: cleaned },
        });
        stats.metaArtifactsFixed++;
      }
    }

    // Check meta_description_en overlength (>160 chars)
    if (
      post.meta_description_en &&
      post.meta_description_en.length > 160
    ) {
      const cleaned = sanitizeMetaDescription(post.meta_description_en);
      log(
        `  [${pub}] ${post.slug}`
      );
      log(
        `    meta_desc_en: ${post.meta_description_en.length} chars → ${cleaned.length} chars`
      );
      stats.metaOverlength++;

      if (!DRY_RUN) {
        await prisma.blogPost.update({
          where: { id: post.id },
          data: { meta_description_en: cleaned },
        });
        stats.metaOverlengthFixed++;
      }
    }

    // Check meta_description_ar overlength
    if (
      post.meta_description_ar &&
      post.meta_description_ar.length > 160
    ) {
      const cleaned = sanitizeMetaDescription(post.meta_description_ar);
      log(
        `  [${pub}] ${post.slug}`
      );
      log(
        `    meta_desc_ar: ${post.meta_description_ar.length} chars → ${cleaned.length} chars`
      );
      stats.metaOverlength++;

      if (!DRY_RUN) {
        await prisma.blogPost.update({
          where: { id: post.id },
          data: { meta_description_ar: cleaned },
        });
        stats.metaOverlengthFixed++;
      }
    }
  }

  // 1b. Also scan ArticleDrafts in the pipeline
  log("\n  ── ArticleDraft Title Artifacts ──");
  const drafts = await prisma.articleDraft.findMany({
    where: { site_id: SITE_ID },
    select: {
      id: true,
      keyword: true,
      current_phase: true,
      seo_meta: true,
    },
    orderBy: { created_at: "desc" },
    take: 200,
  });

  let draftArtifacts = 0;
  for (const draft of drafts) {
    const seoMeta = draft.seo_meta as Record<string, unknown> | null;
    if (!seoMeta) continue;

    const metaTitle = seoMeta.metaTitle as string | undefined;
    const metaDesc = seoMeta.metaDescription as string | undefined;

    if (metaTitle && hasTitleArtifacts(metaTitle)) {
      const cleaned = sanitizeTitle(metaTitle);
      log(
        `  [DRAFT phase:${draft.current_phase}] ${draft.keyword}`
      );
      log(`    metaTitle: "${metaTitle}" → "${cleaned}"`);
      draftArtifacts++;

      if (!DRY_RUN) {
        await prisma.articleDraft.update({
          where: { id: draft.id },
          data: {
            seo_meta: { ...seoMeta, metaTitle: cleaned },
          },
        });
      }
    }

    if (metaDesc && (metaDesc.length > 160 || hasTitleArtifacts(metaDesc))) {
      const cleaned = sanitizeMetaDescription(metaDesc);
      log(
        `  [DRAFT phase:${draft.current_phase}] ${draft.keyword}`
      );
      log(
        `    metaDesc: ${metaDesc.length} chars → ${cleaned.length} chars`
      );
      draftArtifacts++;

      if (!DRY_RUN) {
        await prisma.articleDraft.update({
          where: { id: draft.id },
          data: {
            seo_meta: { ...seoMeta, metaDescription: cleaned },
          },
        });
      }
    }
  }

  log(`\n  ── Phase 1 Summary ──`);
  log(`  Title artifacts found:        ${stats.titleArtifactsFound}`);
  log(`  Title artifacts fixed:        ${DRY_RUN ? "(dry run)" : stats.titleArtifactsFixed}`);
  log(`  Meta title artifacts found:   ${stats.metaArtifactsFound}`);
  log(`  Meta title artifacts fixed:   ${DRY_RUN ? "(dry run)" : stats.metaArtifactsFixed}`);
  log(`  Meta descriptions overlength: ${stats.metaOverlength}`);
  log(`  Meta descriptions trimmed:    ${DRY_RUN ? "(dry run)" : stats.metaOverlengthFixed}`);
  log(`  Draft artifacts found:        ${draftArtifacts}`);
}

// ─── Phase 2: Duplicate Detection & Consolidation ───

interface ArticleForDedup {
  id: string;
  slug: string;
  title_en: string;
  published: boolean;
  seo_score: number | null;
  content_en: string;
  created_at: Date;
  published_at: Date | null;
  meta_description_en: string | null;
}

interface DuplicateCluster {
  canonical: ArticleForDedup;
  duplicates: Array<{
    article: ArticleForDedup;
    reason: string;
    similarity: number;
  }>;
}

async function phase2_duplicates() {
  log("\n╔══════════════════════════════════════════════════╗");
  log("║  Phase 2: Duplicate Detection & Consolidation    ║");
  log("╚══════════════════════════════════════════════════╝");
  log(`  Similarity threshold: ${SIMILARITY_THRESHOLD}`);

  const posts = await prisma.blogPost.findMany({
    where: { siteId: SITE_ID, deletedAt: null },
    select: {
      id: true,
      slug: true,
      title_en: true,
      published: true,
      seo_score: true,
      content_en: true,
      created_at: true,
      published_at: true,
      meta_description_en: true,
    },
    orderBy: { created_at: "asc" },
  });

  log(`\n  Analyzing ${posts.length} articles for duplicates...\n`);

  const clusters: DuplicateCluster[] = [];
  const assignedIds = new Set<string>();

  // Strategy 1: Slug-based duplicates (same base slug with hash suffix)
  log("  ── Strategy 1: Slug-based duplicates ──");
  const slugGroups = new Map<string, ArticleForDedup[]>();
  for (const post of posts) {
    const normalizedSlug = normalizeSlug(post.slug);
    if (!slugGroups.has(normalizedSlug)) {
      slugGroups.set(normalizedSlug, []);
    }
    slugGroups.get(normalizedSlug)!.push(post);
  }

  for (const [baseSlug, group] of slugGroups) {
    if (group.length < 2) continue;

    // Pick canonical: prefer published, then highest SEO score, then earliest
    const sorted = [...group].sort((a, b) => {
      if (a.published !== b.published) return a.published ? -1 : 1;
      if ((a.seo_score || 0) !== (b.seo_score || 0))
        return (b.seo_score || 0) - (a.seo_score || 0);
      return a.created_at.getTime() - b.created_at.getTime();
    });

    const canonical = sorted[0];
    const dups = sorted.slice(1).map((d) => ({
      article: d,
      reason: `slug variant of "${baseSlug}"`,
      similarity: 1.0,
    }));

    if (dups.length > 0) {
      clusters.push({ canonical, duplicates: dups });
      for (const d of dups) assignedIds.add(d.article.id);
      assignedIds.add(canonical.id);
    }
  }

  log(`  Found ${clusters.length} slug-based duplicate clusters`);

  // Strategy 2: Title keyword similarity
  log("\n  ── Strategy 2: Title keyword similarity ──");
  const unassigned = posts.filter((p) => !assignedIds.has(p.id));
  const titleKeywords = unassigned.map((p) => ({
    post: p,
    keywords: extractKeywords(p.title_en),
  }));

  for (let i = 0; i < titleKeywords.length; i++) {
    if (assignedIds.has(titleKeywords[i].post.id)) continue;

    const clusterMembers: Array<{
      article: ArticleForDedup;
      reason: string;
      similarity: number;
    }> = [];

    for (let j = i + 1; j < titleKeywords.length; j++) {
      if (assignedIds.has(titleKeywords[j].post.id)) continue;

      const sim = jaccardSimilarity(
        titleKeywords[i].keywords,
        titleKeywords[j].keywords
      );

      if (sim >= SIMILARITY_THRESHOLD) {
        clusterMembers.push({
          article: titleKeywords[j].post,
          reason: `title similarity ${(sim * 100).toFixed(0)}%`,
          similarity: sim,
        });
        assignedIds.add(titleKeywords[j].post.id);
      }
    }

    if (clusterMembers.length > 0) {
      // Pick canonical from cluster
      const all = [titleKeywords[i].post, ...clusterMembers.map((m) => m.article)];
      const sorted = [...all].sort((a, b) => {
        if (a.published !== b.published) return a.published ? -1 : 1;
        if ((a.seo_score || 0) !== (b.seo_score || 0))
          return (b.seo_score || 0) - (a.seo_score || 0);
        const aWords = a.content_en.replace(/<[^>]*>/g, "").split(/\s+/).length;
        const bWords = b.content_en.replace(/<[^>]*>/g, "").split(/\s+/).length;
        if (aWords !== bWords) return bWords - aWords; // longer content preferred
        return a.created_at.getTime() - b.created_at.getTime();
      });

      const canonical = sorted[0];
      const dups = clusterMembers.filter(
        (m) => m.article.id !== canonical.id
      );
      // If canonical changed, add the original post as a duplicate too
      if (canonical.id !== titleKeywords[i].post.id) {
        const origSim = jaccardSimilarity(
          extractKeywords(canonical.title_en),
          titleKeywords[i].keywords
        );
        dups.push({
          article: titleKeywords[i].post,
          reason: `title similarity ${(origSim * 100).toFixed(0)}%`,
          similarity: origSim,
        });
      }

      if (dups.length > 0) {
        clusters.push({ canonical, duplicates: dups });
        assignedIds.add(canonical.id);
      }
    }
  }

  // Strategy 3: Exact meta description duplicates
  log("\n  ── Strategy 3: Meta description duplicates ──");
  const metaGroups = new Map<string, ArticleForDedup[]>();
  for (const post of posts) {
    if (!post.meta_description_en || assignedIds.has(post.id)) continue;
    const normalizedMeta = post.meta_description_en.trim().toLowerCase();
    if (normalizedMeta.length < 30) continue;
    if (!metaGroups.has(normalizedMeta)) {
      metaGroups.set(normalizedMeta, []);
    }
    metaGroups.get(normalizedMeta)!.push(post);
  }

  for (const [, group] of metaGroups) {
    if (group.length < 2) continue;

    const sorted = [...group].sort((a, b) => {
      if (a.published !== b.published) return a.published ? -1 : 1;
      if ((a.seo_score || 0) !== (b.seo_score || 0))
        return (b.seo_score || 0) - (a.seo_score || 0);
      return a.created_at.getTime() - b.created_at.getTime();
    });

    const canonical = sorted[0];
    const dups = sorted.slice(1).map((d) => ({
      article: d,
      reason: "identical meta description",
      similarity: 1.0,
    }));

    clusters.push({ canonical, duplicates: dups });
    for (const d of dups) assignedIds.add(d.article.id);
    assignedIds.add(canonical.id);
  }

  // ── Display & Act on Clusters ──
  log(`\n  ══ Found ${clusters.length} duplicate clusters total ══\n`);
  stats.duplicateClusters = clusters.length;

  for (let ci = 0; ci < clusters.length; ci++) {
    const cluster = clusters[ci];
    const canonicalWords = cluster.canonical.content_en
      .replace(/<[^>]*>/g, "")
      .split(/\s+/).length;

    log(`  ┌─ Cluster ${ci + 1} ─────────────────────────────────`);
    log(
      `  │ KEEP: "${cluster.canonical.title_en}"`
    );
    log(
      `  │       slug: ${cluster.canonical.slug} | ${cluster.canonical.published ? "published" : "draft"} | ${canonicalWords}w | SEO:${cluster.canonical.seo_score || "?"}`
    );

    for (const dup of cluster.duplicates) {
      const dupWords = dup.article.content_en
        .replace(/<[^>]*>/g, "")
        .split(/\s+/).length;

      log(
        `  │ DUP:  "${dup.article.title_en}"`
      );
      log(
        `  │       slug: ${dup.article.slug} | ${dup.article.published ? "published" : "draft"} | ${dupWords}w | SEO:${dup.article.seo_score || "?"} | ${dup.reason}`
      );

      stats.duplicateArticles++;

      // Action: unpublish duplicate, add redirect
      if (dup.article.published) {
        if (!DRY_RUN) {
          await prisma.blogPost.update({
            where: { id: dup.article.id },
            data: { published: false },
          });
          stats.duplicatesUnpublished++;
        } else {
          stats.duplicatesUnpublished++;
        }
        log(`  │       → ${DRY_RUN ? "WOULD" : "WILL"} unpublish`);
      }

      // Generate redirect from dup slug to canonical slug
      redirectMap[`/blog/${dup.article.slug}`] =
        `/blog/${cluster.canonical.slug}`;
      stats.redirectsGenerated++;
    }
    log(`  └──────────────────────────────────────────────`);
  }

  log(`\n  ── Phase 2 Summary ──`);
  log(`  Duplicate clusters found:    ${stats.duplicateClusters}`);
  log(`  Duplicate articles total:    ${stats.duplicateArticles}`);
  log(
    `  Duplicates unpublished:      ${stats.duplicatesUnpublished}${DRY_RUN ? " (dry run)" : ""}`
  );
  log(`  Redirects generated:         ${stats.redirectsGenerated}`);
}

// ─── Output Generation ───

async function generateOutputs() {
  log("\n╔══════════════════════════════════════════════════╗");
  log("║  Output Generation                               ║");
  log("╚══════════════════════════════════════════════════╝");

  const summary = {
    date: new Date().toISOString(),
    site: SITE_ID,
    mode: DRY_RUN ? "DRY_RUN" : "APPLIED",
    stats,
    redirects: redirectMap,
  };

  // Console summary
  log(`\n  ═══════════════ FINAL SUMMARY ═══════════════`);
  log(`  Title artifacts:           ${stats.titleArtifactsFound} found, ${DRY_RUN ? "(dry run)" : stats.titleArtifactsFixed + " fixed"}`);
  log(`  Meta title artifacts:      ${stats.metaArtifactsFound} found, ${DRY_RUN ? "(dry run)" : stats.metaArtifactsFixed + " fixed"}`);
  log(`  Meta desc overlength:      ${stats.metaOverlength} found, ${DRY_RUN ? "(dry run)" : stats.metaOverlengthFixed + " fixed"}`);
  log(`  Duplicate clusters:        ${stats.duplicateClusters}`);
  log(`  Duplicate articles:        ${stats.duplicateArticles}`);
  log(`  Duplicates unpublished:    ${stats.duplicatesUnpublished}${DRY_RUN ? " (would be)" : ""}`);
  log(`  Redirects:                 ${stats.redirectsGenerated}`);
  log(
    `\n  Mode: ${DRY_RUN ? "DRY RUN — no changes applied. Run with --apply to execute." : "APPLIED — changes committed to database."}`
  );

  // Write files
  if (!DRY_RUN) {
    const fs = await import("fs");
    const path = await import("path");

    const outputDir = path.join(process.cwd(), "docs", "seo");
    fs.mkdirSync(outputDir, { recursive: true });

    // Redirect map (append to existing if present)
    const redirectPath = path.join(outputDir, "redirect-map.json");
    let existingRedirects: Record<string, string> = {};
    try {
      existingRedirects = JSON.parse(
        fs.readFileSync(redirectPath, "utf-8")
      );
    } catch {
      // no existing file
    }
    const mergedRedirects = { ...existingRedirects, ...redirectMap };
    fs.writeFileSync(redirectPath, JSON.stringify(mergedRedirects, null, 2));
    log(`  → Redirect map written to docs/seo/redirect-map.json (${Object.keys(mergedRedirects).length} total entries)`);

    // Dedup report
    const reportPath = path.join(outputDir, "dedup-report.md");
    fs.writeFileSync(
      reportPath,
      `# DB Artifact & Dedup Report\n\nDate: ${new Date().toISOString()}\nSite: ${SITE_ID}\nMode: ${DRY_RUN ? "DRY RUN" : "APPLIED"}\nSimilarity Threshold: ${SIMILARITY_THRESHOLD}\n\n## Summary\n\n| Metric | Count |\n|--------|-------|\n| Title artifacts found | ${stats.titleArtifactsFound} |\n| Title artifacts fixed | ${stats.titleArtifactsFixed} |\n| Meta title artifacts | ${stats.metaArtifactsFound} |\n| Meta desc overlength | ${stats.metaOverlength} |\n| Duplicate clusters | ${stats.duplicateClusters} |\n| Duplicate articles | ${stats.duplicateArticles} |\n| Duplicates unpublished | ${stats.duplicatesUnpublished} |\n| Redirects generated | ${stats.redirectsGenerated} |\n\n## Detail Log\n\n\`\`\`\n${reportLines.join("\n")}\n\`\`\`\n`
    );
    log(`  → Report written to docs/seo/dedup-report.md`);

    // JSON summary
    fs.writeFileSync(
      path.join(outputDir, "dedup-summary.json"),
      JSON.stringify(summary, null, 2)
    );
    log(`  → Summary written to docs/seo/dedup-summary.json`);
  }
}

// ─── Main ───

async function main() {
  log(`\n╔══════════════════════════════════════════════════╗`);
  log(`║  DB Artifact Scan + Duplicate Consolidation       ║`);
  log(`║  Site: ${SITE_ID.padEnd(41)}║`);
  log(
    `║  Mode: ${(DRY_RUN ? "DRY RUN" : "⚠️  APPLY").padEnd(41)}║`
  );
  log(
    `║  Phase: ${PHASE_FILTER.padEnd(40)}║`
  );
  log(`╚══════════════════════════════════════════════════╝`);

  try {
    if (PHASE_FILTER === "all" || PHASE_FILTER === "artifacts") {
      await phase1_artifacts();
    }
    if (PHASE_FILTER === "all" || PHASE_FILTER === "duplicates") {
      await phase2_duplicates();
    }
    await generateOutputs();
  } catch (error) {
    console.error(
      "Script failed:",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
