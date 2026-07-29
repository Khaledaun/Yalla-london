#!/usr/bin/env npx tsx
/**
 * Full Site Audit Script
 *
 * Connects to Supabase via Prisma, fetches ALL published BlogPosts,
 * and produces a comprehensive quality/SEO/content audit.
 *
 * Run from yalla_london/app/:
 *   DATABASE_URL="postgresql://..." npx tsx ../../scripts/full-site-audit.ts
 *
 * Or if .env.local is configured:
 *   cd yalla_london/app && npx tsx ../../scripts/full-site-audit.ts
 */

// Use require with explicit path resolution since this script lives outside
// the Next.js app directory. tsx resolves modules relative to the script file,
// not the cwd, so we must point to the app's node_modules explicitly.
import * as fs from "fs";
import * as path from "path";

const APP_DIR = path.resolve(__dirname, "../yalla_london/app");

// Load .env.local if it exists and DATABASE_URL is not already set
const envLocalPath = path.join(APP_DIR, ".env.local");
const envPath = path.join(APP_DIR, ".env");
if (!process.env.DATABASE_URL) {
  for (const ep of [envLocalPath, envPath]) {
    if (fs.existsSync(ep)) {
      const content = fs.readFileSync(ep, "utf-8");
      const match = content.match(/^DATABASE_URL\s*=\s*["']?([^\s"']+)/m);
      if (match) {
        process.env.DATABASE_URL = match[1];
        console.log(`Loaded DATABASE_URL from ${path.basename(ep)}`);
        break;
      }
    }
  }
}

// Dynamic require for PrismaClient from the app's node_modules
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require(path.join(APP_DIR, "node_modules/@prisma/client")) as {
  PrismaClient: new (opts?: any) => any;
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface BlogPostRow {
  id: string;
  slug: string;
  title_en: string;
  title_ar: string;
  content_en: string;
  content_ar: string;
  meta_title_en: string | null;
  meta_title_ar: string | null;
  meta_description_en: string | null;
  meta_description_ar: string | null;
  seo_score: number | null;
  category_id: string;
  siteId: string | null;
  created_at: Date;
  updated_at: Date;
  published: boolean;
  featured_image: string | null;
  tags: string[];
  locale?: string | null;
  page_type: string | null;
  excerpt_en: string | null;
  excerpt_ar: string | null;
}

type IssueSeverity = "critical" | "high" | "medium" | "low";

interface Issue {
  type: string;
  severity: IssueSeverity;
  detail: string;
}

type Action = "OK" | "FIX" | "DELETE";

interface PostAudit {
  auditId: string;
  id: string;
  slug: string;
  title_en: string;
  title_ar: string;
  siteId: string;
  wordCountEn: number;
  wordCountAr: number;
  issues: Issue[];
  action: Action;
  duplicateCluster?: string;
}

interface DuplicateCluster {
  clusterId: string;
  titles: string[];
  slugs: string[];
  postIds: string[];
}

interface AuditResult {
  generatedAt: string;
  totalPosts: number;
  publishedPosts: number;
  byAction: { OK: number; FIX: number; DELETE: number };
  byIssueType: Record<string, number>;
  bySite: Record<string, number>;
  duplicateClusters: DuplicateCluster[];
  posts: PostAudit[];
}

// ─── Utility Functions ─────────────────────────────────────────────────────

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(text: string): number {
  const plain = stripHtml(text);
  if (!plain) return 0;
  return plain.split(/\s+/).filter((w) => w.length > 0).length;
}

/** Filler/stop words to strip before comparing titles */
const STOP_WORDS = new Set([
  "best", "top", "guide", "london", "luxury", "halal",
  "ultimate", "complete", "comprehensive", "definitive",
  "travel", "for", "the", "a", "an", "in", "to", "of",
  "and", "your", "our", "with", "from", "arab", "arabic",
  "travelers", "travellers", "visitors", "2024", "2025", "2026",
  "new", "updated", "review", "reviews", "comparison",
]);

function normalizeTitle(title: string): string[] {
  if (!title) return [];
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\b20\d{2}\b/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  if (union === 0) return 0;
  return intersection / union;
}

function countArabicChars(text: string): number {
  const matches = text.match(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g);
  return matches ? matches.length : 0;
}

function countLatinChars(text: string): number {
  const matches = text.match(/[a-zA-Z]/g);
  return matches ? matches.length : 0;
}

function extractInternalLinks(html: string): string[] {
  if (!html) return [];
  const links: string[] = [];
  const regex = /href=["']\/blog\/([^"'#?]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    links.push(match[1].replace(/\/$/, ""));
  }
  return links;
}

function hasTitleArtifacts(title: string): string[] {
  const artifacts: string[] = [];
  if (/\(\d+\s*(chars?|characters?)\)/i.test(title)) artifacts.push("char count artifact");
  if (/^title:\s*/i.test(title)) artifacts.push("'Title:' prefix");
  if (/\bv\d+\b/i.test(title)) artifacts.push("version suffix");
  if (/^["'].*["']$/.test(title.trim())) artifacts.push("wrapped in quotes");
  if (/under \d+ char/i.test(title)) artifacts.push("'under X chars' note");
  if (/^\s*$/.test(title)) artifacts.push("empty title");
  return artifacts;
}

function checkSlugIssues(slug: string): string[] {
  const issues: string[] = [];
  if (/--/.test(slug)) issues.push("consecutive hyphens");
  if (slug.length > 80) issues.push(`slug too long (${slug.length} chars)`);
  if (/^\d+(-\d+)*$/.test(slug)) issues.push("numbers-only slug");
  if (/[A-Z]/.test(slug)) issues.push("uppercase in slug");
  return issues;
}

function determineContentType(post: BlogPostRow): string {
  if (post.page_type === "news" || post.slug.startsWith("news-")) return "news";
  if (post.page_type === "guide") return "guide";
  return "blog";
}

// ─── Main Audit Logic ──────────────────────────────────────────────────────

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error(
      "ERROR: DATABASE_URL is not set.\n" +
      "Run with: DATABASE_URL=\"postgresql://...\" npx tsx ../../scripts/full-site-audit.ts\n" +
      "Or create yalla_london/app/.env.local with DATABASE_URL=..."
    );
    process.exit(1);
  }

  console.log("Connecting to database...");
  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
    log: ["error"],
  });

  try {
    await prisma.$connect();
    console.log("Connected successfully.");

    // Fetch ALL published BlogPosts
    console.log("Fetching published BlogPosts...");
    const posts: BlogPostRow[] = await prisma.blogPost.findMany({
      where: { published: true },
      select: {
        id: true,
        slug: true,
        title_en: true,
        title_ar: true,
        content_en: true,
        content_ar: true,
        meta_title_en: true,
        meta_title_ar: true,
        meta_description_en: true,
        meta_description_ar: true,
        seo_score: true,
        category_id: true,
        siteId: true,
        created_at: true,
        updated_at: true,
        published: true,
        featured_image: true,
        tags: true,
        page_type: true,
        excerpt_en: true,
        excerpt_ar: true,
      },
    }) as unknown as BlogPostRow[];

    console.log(`Found ${posts.length} published posts.`);

    // Build slug set for internal link checking
    const slugSet = new Set(posts.map((p) => p.slug));

    // Pre-compute normalized titles for duplicate detection
    const normalizedTitles = posts.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title_en,
      normalized: normalizeTitle(p.title_en),
    }));

    // ── Duplicate cluster detection ────────────────────────────────────
    console.log("Detecting duplicate title clusters...");
    const visited = new Set<string>();
    const clusters: DuplicateCluster[] = [];
    let clusterIdx = 0;

    for (let i = 0; i < normalizedTitles.length; i++) {
      if (visited.has(normalizedTitles[i].id)) continue;

      const clusterMembers = [normalizedTitles[i]];
      visited.add(normalizedTitles[i].id);

      for (let j = i + 1; j < normalizedTitles.length; j++) {
        if (visited.has(normalizedTitles[j].id)) continue;

        const sim = jaccardSimilarity(
          normalizedTitles[i].normalized,
          normalizedTitles[j].normalized
        );
        if (sim > 0.7) {
          clusterMembers.push(normalizedTitles[j]);
          visited.add(normalizedTitles[j].id);
        }
      }

      if (clusterMembers.length > 1) {
        clusterIdx++;
        clusters.push({
          clusterId: `CLUSTER-${String(clusterIdx).padStart(3, "0")}`,
          titles: clusterMembers.map((m) => m.title),
          slugs: clusterMembers.map((m) => m.slug),
          postIds: clusterMembers.map((m) => m.id),
        });
      }
    }

    // Build a quick lookup: postId -> clusterId
    const postClusterMap = new Map<string, string>();
    for (const c of clusters) {
      for (const pid of c.postIds) {
        postClusterMap.set(pid, c.clusterId);
      }
    }

    console.log(`Found ${clusters.length} duplicate clusters.`);

    // ── Per-post audit ─────────────────────────────────────────────────
    console.log("Auditing each post...");
    const auditResults: PostAudit[] = [];
    const siteCounters: Record<string, number> = {};

    // Also detect duplicate slugs
    const slugCounts = new Map<string, number>();
    for (const p of posts) {
      slugCounts.set(p.slug, (slugCounts.get(p.slug) || 0) + 1);
    }

    for (const post of posts) {
      const siteId = post.siteId || "unknown";
      const sitePrefix = siteId === "zenitha-yachts-med" ? "ZY" : "YL";
      siteCounters[sitePrefix] = (siteCounters[sitePrefix] || 0) + 1;
      const auditId = `${sitePrefix}-${String(siteCounters[sitePrefix]).padStart(3, "0")}`;

      const issues: Issue[] = [];
      const wcEn = wordCount(post.content_en);
      const wcAr = wordCount(post.content_ar);
      const contentType = determineContentType(post);
      const minWords = contentType === "news" ? 100 : 300;

      // a. Duplicate titles (handled via clusters)
      if (postClusterMap.has(post.id)) {
        issues.push({
          type: "DUPLICATE_TITLE",
          severity: "high",
          detail: `In ${postClusterMap.get(post.id)!}`,
        });
      }

      // b. Thin content
      if (wcEn > 0 && wcEn < minWords) {
        issues.push({
          type: "THIN_CONTENT_EN",
          severity: wcEn < 100 ? "critical" : "high",
          detail: `${wcEn} words EN (min ${minWords} for ${contentType})`,
        });
      }
      if (wcAr > 0 && wcAr < minWords) {
        issues.push({
          type: "THIN_CONTENT_AR",
          severity: wcAr < 100 ? "critical" : "high",
          detail: `${wcAr} words AR (min ${minWords} for ${contentType})`,
        });
      }

      // c. Missing Arabic
      const plainEn = stripHtml(post.content_en);
      const plainAr = stripHtml(post.content_ar);
      if (plainEn.length > 50 && (!plainAr || plainAr.length < 50)) {
        issues.push({
          type: "MISSING_ARABIC",
          severity: "medium",
          detail: "Has EN content but AR is empty/very short",
        });
      }
      // Also check if AR is just a copy of EN
      if (
        plainEn.length > 100 &&
        plainAr.length > 100 &&
        plainEn === plainAr
      ) {
        issues.push({
          type: "ARABIC_IS_ENGLISH_COPY",
          severity: "high",
          detail: "content_ar is identical to content_en",
        });
      }

      // d. Missing English
      if (plainAr.length > 50 && (!plainEn || plainEn.length < 50)) {
        issues.push({
          type: "MISSING_ENGLISH",
          severity: "medium",
          detail: "Has AR content but EN is empty/very short",
        });
      }

      // e. Arabic on English page (Arabic unicode blocks > 50 chars in EN content)
      const arabicInEn = countArabicChars(post.content_en);
      if (arabicInEn > 50) {
        issues.push({
          type: "ARABIC_IN_ENGLISH",
          severity: "high",
          detail: `${arabicInEn} Arabic chars found in content_en`,
        });
      }

      // f. English on Arabic page (content_ar has < 30% Arabic chars)
      if (plainAr.length > 100) {
        const arabicCharsInAr = countArabicChars(post.content_ar);
        const totalCharsAr = plainAr.replace(/\s/g, "").length;
        const arabicRatio = totalCharsAr > 0 ? arabicCharsInAr / totalCharsAr : 0;
        if (arabicRatio < 0.3) {
          issues.push({
            type: "LOW_ARABIC_RATIO",
            severity: "high",
            detail: `Only ${(arabicRatio * 100).toFixed(1)}% Arabic chars in content_ar`,
          });
        }
      }

      // g. Broken internal links
      const internalLinks = extractInternalLinks(post.content_en);
      const brokenLinks = internalLinks.filter((slug) => !slugSet.has(slug));
      if (brokenLinks.length > 0) {
        issues.push({
          type: "BROKEN_INTERNAL_LINKS",
          severity: "medium",
          detail: `${brokenLinks.length} broken: ${brokenLinks.slice(0, 5).join(", ")}${brokenLinks.length > 5 ? "..." : ""}`,
        });
      }

      // h. Missing meta
      if (!post.meta_title_en || post.meta_title_en.trim().length === 0) {
        issues.push({
          type: "MISSING_META_TITLE_EN",
          severity: "medium",
          detail: "meta_title_en is empty",
        });
      }
      if (!post.meta_description_en || post.meta_description_en.trim().length === 0) {
        issues.push({
          type: "MISSING_META_DESC_EN",
          severity: "medium",
          detail: "meta_description_en is empty",
        });
      }

      // i. Meta too long
      if (post.meta_title_en && post.meta_title_en.length > 70) {
        issues.push({
          type: "META_TITLE_TOO_LONG",
          severity: "low",
          detail: `meta_title_en is ${post.meta_title_en.length} chars (max 70)`,
        });
      }
      if (post.meta_description_en && post.meta_description_en.length > 170) {
        issues.push({
          type: "META_DESC_TOO_LONG",
          severity: "low",
          detail: `meta_description_en is ${post.meta_description_en.length} chars (max 170)`,
        });
      }

      // j. Missing featured image
      if (!post.featured_image || post.featured_image.trim().length === 0) {
        issues.push({
          type: "MISSING_FEATURED_IMAGE",
          severity: "low",
          detail: "No featured image set",
        });
      }

      // k. SEO score
      if (post.seo_score !== null && post.seo_score < 30) {
        issues.push({
          type: "LOW_SEO_SCORE",
          severity: "high",
          detail: `SEO score: ${post.seo_score}/100`,
        });
      }

      // l. Slug issues
      const slugIssues = checkSlugIssues(post.slug);
      for (const si of slugIssues) {
        issues.push({
          type: "SLUG_ISSUE",
          severity: "low",
          detail: si,
        });
      }

      // m. Duplicate slugs
      if ((slugCounts.get(post.slug) || 0) > 1) {
        issues.push({
          type: "DUPLICATE_SLUG",
          severity: "critical",
          detail: `Slug "${post.slug}" appears ${slugCounts.get(post.slug)} times`,
        });
      }

      // n. Title artifacts
      const enArtifacts = hasTitleArtifacts(post.title_en);
      for (const a of enArtifacts) {
        issues.push({
          type: "TITLE_ARTIFACT_EN",
          severity: "medium",
          detail: a,
        });
      }
      const arArtifacts = hasTitleArtifacts(post.title_ar);
      for (const a of arArtifacts) {
        issues.push({
          type: "TITLE_ARTIFACT_AR",
          severity: "medium",
          detail: a,
        });
      }

      // Extra: zero word counts for both languages
      if (wcEn === 0 && wcAr === 0) {
        issues.push({
          type: "NO_CONTENT",
          severity: "critical",
          detail: "Both content_en and content_ar are empty",
        });
      }

      // ── Determine action ────────────────────────────────────────────
      let action: Action = "OK";
      const hasCritical = issues.some((i) => i.severity === "critical");
      const hasHigh = issues.some((i) => i.severity === "high");

      if (hasCritical || (wcEn === 0 && wcAr === 0)) {
        action = "DELETE";
      } else if (hasHigh || issues.length > 0) {
        action = "FIX";
      }

      // Posts with ONLY low-severity issues are OK
      if (action === "FIX" && issues.every((i) => i.severity === "low")) {
        action = "OK";
      }

      auditResults.push({
        auditId,
        id: post.id,
        slug: post.slug,
        title_en: post.title_en,
        title_ar: post.title_ar,
        siteId,
        wordCountEn: wcEn,
        wordCountAr: wcAr,
        issues,
        action,
        duplicateCluster: postClusterMap.get(post.id),
      });
    }

    // ── Build summary ──────────────────────────────────────────────────
    const byAction = { OK: 0, FIX: 0, DELETE: 0 };
    const byIssueType: Record<string, number> = {};
    const bySite: Record<string, number> = {};

    for (const a of auditResults) {
      byAction[a.action]++;
      bySite[a.siteId] = (bySite[a.siteId] || 0) + 1;
      for (const issue of a.issues) {
        byIssueType[issue.type] = (byIssueType[issue.type] || 0) + 1;
      }
    }

    const result: AuditResult = {
      generatedAt: new Date().toISOString(),
      totalPosts: posts.length,
      publishedPosts: posts.length,
      byAction,
      byIssueType,
      bySite,
      duplicateClusters: clusters,
      posts: auditResults,
    };

    // ── Write JSON ─────────────────────────────────────────────────────
    const outDir = path.resolve(__dirname, "../docs/audit-results");
    fs.mkdirSync(outDir, { recursive: true });

    const jsonPath = path.join(outDir, "full-site-audit.json");
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
    console.log(`JSON written to ${jsonPath}`);

    // ── Write Markdown ─────────────────────────────────────────────────
    const md: string[] = [];
    md.push("# Full Site Audit Report");
    md.push("");
    md.push(`Generated: ${result.generatedAt}`);
    md.push("");
    md.push("## Summary");
    md.push("");
    md.push(`| Metric | Value |`);
    md.push(`|--------|-------|`);
    md.push(`| Total Published Posts | ${result.totalPosts} |`);
    md.push(`| OK (clean) | ${byAction.OK} |`);
    md.push(`| FIX (fixable issues) | ${byAction.FIX} |`);
    md.push(`| DELETE (critical/useless) | ${byAction.DELETE} |`);
    md.push(`| Duplicate Clusters | ${clusters.length} |`);
    md.push("");

    // Issues by type table
    md.push("## Issues by Type");
    md.push("");
    md.push("| Issue Type | Count |");
    md.push("|-----------|-------|");
    const sortedIssues = Object.entries(byIssueType).sort((a, b) => b[1] - a[1]);
    for (const [type, count] of sortedIssues) {
      md.push(`| ${type} | ${count} |`);
    }
    md.push("");

    // Posts by site
    md.push("## Posts by Site");
    md.push("");
    md.push("| Site ID | Count |");
    md.push("|---------|-------|");
    for (const [site, count] of Object.entries(bySite)) {
      md.push(`| ${site} | ${count} |`);
    }
    md.push("");

    // ── DELETE posts table ──────────────────────────────────────────────
    const deletePosts = auditResults.filter((a) => a.action === "DELETE");
    if (deletePosts.length > 0) {
      md.push("## Posts Recommended for DELETION");
      md.push("");
      md.push("| ID | Slug | Title (EN) | WC EN | WC AR | Issues |");
      md.push("|-----|------|-----------|-------|-------|--------|");
      for (const p of deletePosts) {
        const issueStr = p.issues.map((i) => `${i.type}: ${i.detail}`).join("; ");
        const titleShort = p.title_en.length > 50 ? p.title_en.slice(0, 47) + "..." : p.title_en;
        md.push(`| ${p.auditId} | ${p.slug.slice(0, 40)} | ${titleShort} | ${p.wordCountEn} | ${p.wordCountAr} | ${issueStr} |`);
      }
      md.push("");
    }

    // ── FIX posts table ────────────────────────────────────────────────
    const fixPosts = auditResults.filter((a) => a.action === "FIX");
    if (fixPosts.length > 0) {
      md.push("## Posts Needing FIXES");
      md.push("");
      md.push("| ID | Slug | Title (EN) | WC EN | WC AR | Issues |");
      md.push("|-----|------|-----------|-------|-------|--------|");
      for (const p of fixPosts) {
        const issueStr = p.issues.map((i) => `${i.type}: ${i.detail}`).join("; ");
        const titleShort = p.title_en.length > 50 ? p.title_en.slice(0, 47) + "..." : p.title_en;
        md.push(`| ${p.auditId} | ${p.slug.slice(0, 40)} | ${titleShort} | ${p.wordCountEn} | ${p.wordCountAr} | ${issueStr} |`);
      }
      md.push("");
    }

    // ── OK posts table ─────────────────────────────────────────────────
    const okPosts = auditResults.filter((a) => a.action === "OK");
    md.push("## Clean Posts (OK)");
    md.push("");
    md.push(`${okPosts.length} posts passed all checks.`);
    md.push("");
    if (okPosts.length > 0) {
      md.push("| ID | Slug | Title (EN) | WC EN | WC AR | SEO Score |");
      md.push("|-----|------|-----------|-------|-------|-----------|");
      for (const p of okPosts) {
        const post = posts.find((pp) => pp.id === p.id);
        const seoScore = post?.seo_score ?? "N/A";
        const titleShort = p.title_en.length > 50 ? p.title_en.slice(0, 47) + "..." : p.title_en;
        md.push(`| ${p.auditId} | ${p.slug.slice(0, 40)} | ${titleShort} | ${p.wordCountEn} | ${p.wordCountAr} | ${seoScore} |`);
      }
      md.push("");
    }

    // ── Duplicate clusters ─────────────────────────────────────────────
    if (clusters.length > 0) {
      md.push("## Duplicate Title Clusters");
      md.push("");
      md.push("These groups of articles have Jaccard title similarity > 0.7 after normalizing (stripping years, stop words).");
      md.push("They likely cannibalize each other in search results.");
      md.push("");
      for (const c of clusters) {
        md.push(`### ${c.clusterId} (${c.slugs.length} articles)`);
        md.push("");
        for (let i = 0; i < c.slugs.length; i++) {
          md.push(`- **${c.slugs[i]}** -- "${c.titles[i]}"`);
        }
        md.push("");
      }
    }

    // ── Full numbered table ────────────────────────────────────────────
    md.push("## Full Audit Table (All Posts)");
    md.push("");
    md.push("| # | ID | Slug | Title (EN) | WC EN | WC AR | Issues Found | Action |");
    md.push("|---|-----|------|-----------|-------|-------|-------------|--------|");
    for (let idx = 0; idx < auditResults.length; idx++) {
      const a = auditResults[idx];
      const titleShort = a.title_en.length > 40 ? a.title_en.slice(0, 37) + "..." : a.title_en;
      const issueCount = a.issues.length;
      const issueSummary = issueCount === 0
        ? "None"
        : a.issues.slice(0, 3).map((i) => i.type).join(", ") + (issueCount > 3 ? ` +${issueCount - 3} more` : "");
      md.push(`| ${idx + 1} | ${a.auditId} | ${a.slug.slice(0, 35)} | ${titleShort} | ${a.wordCountEn} | ${a.wordCountAr} | ${issueSummary} | **${a.action}** |`);
    }
    md.push("");

    // ── Recommended Action Plan ────────────────────────────────────────
    md.push("## Recommended Action Plan");
    md.push("");
    md.push("### Immediate (Critical)");
    md.push("");
    if (deletePosts.length > 0) {
      md.push(`1. **Delete/unpublish ${deletePosts.length} critically broken posts** — these have no content, critical issues, or are duplicates causing harm.`);
    }
    const noContent = auditResults.filter((a) => a.issues.some((i) => i.type === "NO_CONTENT"));
    if (noContent.length > 0) {
      md.push(`2. **${noContent.length} posts have ZERO content** in both languages — immediate unpublish.`);
    }
    md.push("");

    md.push("### Short-term (This Week)");
    md.push("");
    const thinEn = auditResults.filter((a) => a.issues.some((i) => i.type === "THIN_CONTENT_EN"));
    if (thinEn.length > 0) {
      md.push(`1. **Expand ${thinEn.length} thin English articles** to at least 500 words.`);
    }
    if (clusters.length > 0) {
      md.push(`2. **Consolidate ${clusters.length} duplicate clusters** — merge or differentiate titles to avoid keyword cannibalization.`);
    }
    const missingMeta = auditResults.filter((a) =>
      a.issues.some((i) => i.type === "MISSING_META_TITLE_EN" || i.type === "MISSING_META_DESC_EN")
    );
    if (missingMeta.length > 0) {
      md.push(`3. **Add meta titles/descriptions to ${missingMeta.length} posts** — critical for CTR in search results.`);
    }
    md.push("");

    md.push("### Medium-term (This Month)");
    md.push("");
    const missingAr = auditResults.filter((a) => a.issues.some((i) => i.type === "MISSING_ARABIC"));
    if (missingAr.length > 0) {
      md.push(`1. **Generate Arabic content for ${missingAr.length} posts** — hreflang promises Arabic but delivers nothing.`);
    }
    const brokenLinks = auditResults.filter((a) => a.issues.some((i) => i.type === "BROKEN_INTERNAL_LINKS"));
    if (brokenLinks.length > 0) {
      md.push(`2. **Fix broken internal links in ${brokenLinks.length} posts** — link equity is leaking to 404s.`);
    }
    const arabicInEn = auditResults.filter((a) => a.issues.some((i) => i.type === "ARABIC_IN_ENGLISH"));
    if (arabicInEn.length > 0) {
      md.push(`3. **Clean Arabic text from ${arabicInEn.length} English articles** — confuses crawlers and readers.`);
    }
    md.push("");

    md.push("---");
    md.push("");
    md.push(`*Audit completed at ${result.generatedAt}*`);

    const mdPath = path.join(outDir, "FULL-SITE-AUDIT.md");
    fs.writeFileSync(mdPath, md.join("\n"));
    console.log(`Markdown written to ${mdPath}`);

    // ── Console summary ────────────────────────────────────────────────
    console.log("\n═══════════════════════════════════════════════════");
    console.log("  FULL SITE AUDIT COMPLETE");
    console.log("═══════════════════════════════════════════════════");
    console.log(`  Total published posts: ${result.totalPosts}`);
    console.log(`  OK:     ${byAction.OK}`);
    console.log(`  FIX:    ${byAction.FIX}`);
    console.log(`  DELETE: ${byAction.DELETE}`);
    console.log(`  Duplicate clusters: ${clusters.length}`);
    console.log("");
    console.log("  Top issues:");
    for (const [type, count] of sortedIssues.slice(0, 10)) {
      console.log(`    ${type}: ${count}`);
    }
    console.log("═══════════════════════════════════════════════════");

  } finally {
    await prisma.$disconnect();
    console.log("Database disconnected.");
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
