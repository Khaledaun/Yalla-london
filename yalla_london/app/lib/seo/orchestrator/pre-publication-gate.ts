/**
 * Pre-Publication Gate
 *
 * A safety gate that runs BEFORE content is published to verify the
 * target URL will actually work. This prevents the system from publishing
 * content to 404 routes (like Arabic content to /ar/* when no routes exist).
 *
 * This directly addresses DISCOVERY.md Gap #8: "No pre-publication gate —
 * content publishes without verifying routes work."
 */

export interface GateResult {
  allowed: boolean;
  checks: GateCheck[];
  blockers: string[];
  warnings: string[];
}

export interface GateCheck {
  name: string;
  passed: boolean;
  message: string;
  severity: "blocker" | "warning" | "info";
}

/**
 * Run all pre-publication checks for a piece of content.
 *
 * @param targetUrl - The URL where this content will be published (e.g. /blog/my-post)
 * @param content - The content being published
 * @param siteUrl - The base site URL (e.g. https://www.yalla-london.com)
 */
export async function runPrePublicationGate(
  targetUrl: string,
  content: {
    title_en?: string;
    title_ar?: string;
    meta_title_en?: string;
    meta_description_en?: string;
    content_en?: string;
    content_ar?: string;
    locale?: string;
    tags?: string[];
    seo_score?: number;
    author_id?: string;
    keywords_json?: unknown;
    structured_data_json?: unknown;
  },
  siteUrl?: string
): Promise<GateResult> {
  const checks: GateCheck[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];
  let baseUrl = siteUrl || process.env.NEXT_PUBLIC_SITE_URL;
  if (!baseUrl) {
    try {
      const { getSiteDomain, getDefaultSiteId } = await import("@/config/sites");
      baseUrl = getSiteDomain(getDefaultSiteId());
    } catch {
      baseUrl = "https://www.yalla-london.com";
    }
  }

  // ── 1. Route existence check ────────────────────────────────────────
  // Verify the target URL will actually resolve (not return 404)
  try {
    const fullUrl = targetUrl.startsWith("http")
      ? targetUrl
      : `${baseUrl}${targetUrl}`;

    // For new content, we can't check the exact URL (it doesn't exist yet).
    // Instead, check the parent route pattern.
    const parentPath = getParentRoute(targetUrl);
    if (parentPath) {
      const parentUrl = `${baseUrl}${parentPath}`;
      const res = await fetch(parentUrl, {
        method: "HEAD",
        headers: { "User-Agent": "YallaLondon-PrePubGate/1.0" },
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      });

      if (res.status === 404) {
        const check: GateCheck = {
          name: "Route Existence",
          passed: false,
          message: `Parent route ${parentPath} returns 404 — content at ${targetUrl} will be unreachable`,
          severity: "blocker",
        };
        checks.push(check);
        blockers.push(check.message);
      } else {
        checks.push({
          name: "Route Existence",
          passed: true,
          message: `Parent route ${parentPath} returns ${res.status}`,
          severity: "info",
        });
      }
    }
  } catch (e) {
    warnings.push(
      `Could not verify route existence: ${(e as Error).message}`
    );
  }

  // ── 2. Arabic route check ───────────────────────────────────────────
  // If publishing Arabic content, verify /ar/ routes work
  if (content.locale === "ar" || targetUrl.startsWith("/ar/")) {
    try {
      const arTestUrl = `${baseUrl}/ar`;
      const res = await fetch(arTestUrl, {
        method: "HEAD",
        headers: { "User-Agent": "YallaLondon-PrePubGate/1.0" },
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      });

      if (res.status === 404) {
        const check: GateCheck = {
          name: "Arabic Routes",
          passed: false,
          message:
            "Arabic routes (/ar/) return 404 — Arabic content will be unreachable. Fix i18n routing first.",
          severity: "blocker",
        };
        checks.push(check);
        blockers.push(check.message);
      } else {
        checks.push({
          name: "Arabic Routes",
          passed: true,
          message: "Arabic routes are accessible",
          severity: "info",
        });
      }
    } catch {
      warnings.push("Could not verify Arabic route status");
    }
  }

  // ── 3. SEO minimum requirements ────────────────────────────────────
  if (!content.title_en || content.title_en.length < 10) {
    checks.push({
      name: "Title (EN)",
      passed: false,
      message: `English title missing or too short (${content.title_en?.length || 0} chars, min 10)`,
      severity: "blocker",
    });
    blockers.push("English title is missing or too short");
  } else {
    checks.push({
      name: "Title (EN)",
      passed: true,
      message: `English title: ${content.title_en.length} chars`,
      severity: "info",
    });
  }

  // Meta title: Google displays ~60 chars. Min 30 for meaningful title.
  if (!content.meta_title_en || content.meta_title_en.length < 30) {
    checks.push({
      name: "Meta Title",
      passed: false,
      message: `Meta title missing or too short (${content.meta_title_en?.length || 0} chars, min 30, optimal 50-60)`,
      severity: "warning",
    });
    warnings.push("Meta title should be 30-60 characters for optimal SERP display");
  }

  // Meta description: Google displays 120-160 chars. Min 70 for useful snippet.
  if (
    !content.meta_description_en ||
    content.meta_description_en.length < 70
  ) {
    checks.push({
      name: "Meta Description",
      passed: false,
      message: `Meta description missing or too short (${content.meta_description_en?.length || 0} chars, min 70, optimal 120-160)`,
      severity: "warning",
    });
    warnings.push("Meta description should be 70-160 characters for optimal SERP display");
  }

  if (!content.content_en || content.content_en.length < 300) {
    checks.push({
      name: "Content Length",
      passed: false,
      message: `English content too short (${content.content_en?.length || 0} chars, min 300)`,
      severity: "blocker",
    });
    blockers.push("Content is too short for indexing");
  }

  // ── 4. SEO score check (2025 standards: 60+ for quality content) ───
  if (content.seo_score !== undefined && content.seo_score < 60) {
    checks.push({
      name: "SEO Score",
      passed: false,
      message: `SEO score ${content.seo_score} is below minimum threshold (60)`,
      severity: "warning",
    });
    warnings.push(`Low SEO score: ${content.seo_score}/100`);
  }

  // ── 5. Heading hierarchy check (AIO optimization) ─────────────────
  if (content.content_en && content.content_en.length > 300) {
    const headingResult = validateHeadingHierarchy(content.content_en);
    checks.push(headingResult.check);
    if (!headingResult.check.passed) {
      if (headingResult.check.severity === "blocker") {
        blockers.push(headingResult.check.message);
      } else {
        warnings.push(headingResult.check.message);
      }
    }
  }

  // ── 6. Word count check (2025 standards: 800+ min, 1200+ target) ──
  if (content.content_en) {
    const wordCount = countWords(content.content_en);
    if (wordCount < 1200) {
      const check: GateCheck = {
        name: "Word Count",
        passed: false,
        message: `Content has ${wordCount} words (target 1,200+ for indexing quality, ${wordCount < 800 ? "below 800 minimum" : "close to target"})`,
        severity: wordCount < 800 ? "blocker" : "warning",
      };
      checks.push(check);
      if (wordCount < 800) {
        blockers.push(check.message);
      } else {
        warnings.push(check.message);
      }
    } else {
      checks.push({
        name: "Word Count",
        passed: true,
        message: `Content has ${wordCount} words (meets 1,200 target)`,
        severity: "info",
      });
    }
  }

  // ── 7. Internal links check ───────────────────────────────────────
  if (content.content_en) {
    const internalLinkCount = countInternalLinks(content.content_en);
    if (internalLinkCount < 3) {
      checks.push({
        name: "Internal Links",
        passed: false,
        message: `Content has ${internalLinkCount} internal links (minimum 3 required)`,
        severity: "warning",
      });
      warnings.push(`Only ${internalLinkCount} internal links (need at least 3)`);
    } else {
      checks.push({
        name: "Internal Links",
        passed: true,
        message: `Content has ${internalLinkCount} internal links`,
        severity: "info",
      });
    }
  }

  // ── 8. Readability check (Flesch-Kincaid approximation) ───────────
  if (content.content_en && content.content_en.length > 500) {
    const readability = estimateReadability(content.content_en);
    if (readability.gradeLevel > 12) {
      checks.push({
        name: "Readability",
        passed: false,
        message: `Reading level too high (grade ${readability.gradeLevel.toFixed(1)}, target ≤12). Simplify sentences for better AI extraction.`,
        severity: "warning",
      });
      warnings.push(`High reading level: grade ${readability.gradeLevel.toFixed(1)}`);
    } else {
      checks.push({
        name: "Readability",
        passed: true,
        message: `Reading level: grade ${readability.gradeLevel.toFixed(1)} (good for AI + human readability)`,
        severity: "info",
      });
    }
  }

  // ── 9. Image alt text check ───────────────────────────────────────
  if (content.content_en) {
    const imgResult = checkImageAltText(content.content_en);
    if (imgResult.totalImages > 0 && imgResult.missingAlt > 0) {
      checks.push({
        name: "Image Alt Text",
        passed: false,
        message: `${imgResult.missingAlt}/${imgResult.totalImages} images missing alt text (accessibility + SEO)`,
        severity: "warning",
      });
      warnings.push(`${imgResult.missingAlt} images missing alt text`);
    } else if (imgResult.totalImages > 0) {
      checks.push({
        name: "Image Alt Text",
        passed: true,
        message: `All ${imgResult.totalImages} images have alt text`,
        severity: "info",
      });
    }
  }

  // ── 10. E-E-A-T: Author attribution check ────────────────────────
  // Google's 2025 Quality Rater Guidelines emphasize: author credentials,
  // first-hand experience, and trustworthiness are increasingly weighted.
  if (content.author_id) {
    checks.push({
      name: "Author Attribution",
      passed: true,
      message: "Article has author attribution (E-E-A-T signal)",
      severity: "info",
    });
  } else {
    checks.push({
      name: "Author Attribution",
      passed: false,
      message: "No author attributed — E-E-A-T requires identifiable authorship for quality content",
      severity: "warning",
    });
    warnings.push("Missing author attribution (E-E-A-T signal)");
  }

  // ── 11. Structured data presence check ──────────────────────────
  // JSON-LD is Google's recommended format. Articles without it miss rich results.
  if (content.structured_data_json || content.keywords_json) {
    checks.push({
      name: "Structured Data",
      passed: true,
      message: "Article has structured data for rich results",
      severity: "info",
    });
  } else {
    checks.push({
      name: "Structured Data",
      passed: false,
      message: "No structured data (JSON-LD) — reduces rich snippet and AI Overview citation eligibility",
      severity: "warning",
    });
    warnings.push("Missing structured data/keywords");
  }

  return {
    allowed: blockers.length === 0,
    checks,
    blockers,
    warnings,
  };
}

/**
 * Validate HTML heading hierarchy for SEO and AI readability.
 * Rules:
 * - Must have exactly one H1 (or none if it's in the page template)
 * - Headings must not skip levels (h2 → h4 without h3)
 * - Should have at least 2 H2s for structured content
 */
function validateHeadingHierarchy(html: string): { check: GateCheck } {
  const headingRegex = /<h([1-6])[^>]*>/gi;
  const headings: number[] = [];
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    headings.push(parseInt(match[1]));
  }

  if (headings.length === 0) {
    return {
      check: {
        name: "Heading Hierarchy",
        passed: false,
        message: "No headings found in content. Add H2/H3 headings for SEO structure and AI readability.",
        severity: "warning",
      },
    };
  }

  const h1Count = headings.filter((h) => h === 1).length;
  const h2Count = headings.filter((h) => h === 2).length;

  if (h1Count > 1) {
    return {
      check: {
        name: "Heading Hierarchy",
        passed: false,
        message: `Multiple H1 tags found (${h1Count}). Only one H1 per page for SEO.`,
        severity: "warning",
      },
    };
  }

  // Check for skipped levels (e.g., h2 → h4 without h3)
  const skippedLevels: string[] = [];
  for (let i = 1; i < headings.length; i++) {
    if (headings[i] > headings[i - 1] + 1) {
      skippedLevels.push(`H${headings[i - 1]} → H${headings[i]}`);
    }
  }

  if (skippedLevels.length > 0) {
    return {
      check: {
        name: "Heading Hierarchy",
        passed: false,
        message: `Heading levels skipped: ${skippedLevels.join(", ")}. This hurts AI content extraction.`,
        severity: "warning",
      },
    };
  }

  if (h2Count < 2) {
    return {
      check: {
        name: "Heading Hierarchy",
        passed: false,
        message: `Only ${h2Count} H2 heading(s). Add more H2 sections for better structure.`,
        severity: "warning",
      },
    };
  }

  return {
    check: {
      name: "Heading Hierarchy",
      passed: true,
      message: `Good heading structure: ${h2Count} H2s, ${headings.length} total headings`,
      severity: "info",
    },
  };
}

/**
 * Count words in HTML content (strips tags first).
 */
function countWords(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Count internal links in HTML content.
 * Dynamically builds regex from configured sites — no hardcoded domains.
 */
function countInternalLinks(html: string): number {
  let domainPattern = "yalla-london|arabaldives|yallariviera|yallaistanbul|yallathailand";
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { SITES } = require("@/config/sites");
    const domains = Object.values(SITES)
      .map((s: any) => s.domain?.replace(/\./g, "\\."))
      .filter(Boolean);
    if (domains.length > 0) {
      // Match domain slugs (e.g. yalla-london) and full domains (yalla-london.com)
      const slugs = Object.keys(SITES);
      domainPattern = [...new Set([...slugs, ...domains])].join("|");
    }
  } catch {
    // Fall back to static list if config import fails
  }
  const linkRegex = new RegExp(
    `<a[^>]+href=["'](?:\\/|https?:\\/\\/(?:www\\.)?(?:${domainPattern}))[^"']*["'][^>]*>`,
    "gi"
  );
  const matches = html.match(linkRegex);
  return matches ? matches.length : 0;
}

/**
 * Simplified Flesch-Kincaid Grade Level estimation.
 * Lower grade = easier to read. Target: 8-12 for travel content.
 */
function estimateReadability(html: string): { gradeLevel: number; readingEase: number } {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 5);
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);

  if (sentences.length === 0 || words.length === 0) {
    return { gradeLevel: 0, readingEase: 100 };
  }

  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;

  // Flesch-Kincaid Grade Level
  const gradeLevel = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
  // Flesch Reading Ease
  const readingEase = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;

  return {
    gradeLevel: Math.max(0, gradeLevel),
    readingEase: Math.max(0, Math.min(100, readingEase)),
  };
}

/**
 * Approximate syllable count for a word.
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  const vowelGroups = word.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 1;
  if (word.endsWith("e") && !word.endsWith("le")) count--;
  if (word.endsWith("ed") && !word.endsWith("ted") && !word.endsWith("ded")) count--;
  return Math.max(1, count);
}

/**
 * Check for images missing alt text.
 */
function checkImageAltText(html: string): { totalImages: number; missingAlt: number } {
  const imgRegex = /<img[^>]*>/gi;
  const images = html.match(imgRegex) || [];
  let missingAlt = 0;
  for (const img of images) {
    if (!img.includes("alt=") || /alt=["']\s*["']/.test(img)) {
      missingAlt++;
    }
  }
  return { totalImages: images.length, missingAlt };
}

/**
 * Extract the parent route from a target URL.
 * e.g. /blog/my-post → /blog
 * e.g. /ar/blog/my-post → /ar/blog
 * e.g. /blog/category/restaurants → /blog
 */
function getParentRoute(url: string): string | null {
  const segments = url.split("/").filter(Boolean);
  if (segments.length <= 1) return null;
  return "/" + segments.slice(0, -1).join("/");
}
